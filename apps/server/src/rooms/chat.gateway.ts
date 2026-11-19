import { Inject, Logger } from '@nestjs/common';
import { SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { chatReportSchema, chatSendSchema, type Ack, type ChatMessage } from '@stock-ex/shared';
import { LIMITS, RateLimitService } from '../realtime/rate-limit.js';
import { badRequest, type GameServer, type GameSocket } from '../realtime/socket.gateway.js';
import { censorChat } from './chat-filter.js';
import { ChatStore, newChatMessageId } from './chat-store.js';
import { roomChannel } from './room.gateway.js';
import { RoomStore } from './room-store.js';

const NOT_IN_ROOM: Ack<never> = {
  ok: false,
  error: { code: 'not_found', message: 'Join a room to chat.' },
};

/**
 * Table chat (spec 6, 12.2): only room members can send, the server sets the sender's name,
 * 8 messages per 10 seconds per person, profanity masked, recent history kept for joiners.
 * Messages are plain text; the browser never renders them as HTML.
 */
@WebSocketGateway()
export class ChatGateway {
  private readonly logger = new Logger(ChatGateway.name);
  @WebSocketServer() private readonly server!: GameServer;

  constructor(
    @Inject(RoomStore) private readonly rooms: RoomStore,
    @Inject(ChatStore) private readonly chat: ChatStore,
    @Inject(RateLimitService) private readonly limits: RateLimitService,
  ) {}

  /** The caller's membership in their current room, looked up on the server every time. */
  private async member(socket: GameSocket) {
    const code = socket.data.roomCode;
    if (!code) return null;
    const room = await this.rooms.get(code);
    const member = room?.members.find((m) => m.identityId === socket.data.identity.id);
    return room && member ? { code, room, member } : null;
  }

  @SubscribeMessage('chat:send')
  async send(socket: GameSocket, payload: unknown): Promise<Ack<ChatMessage>> {
    const input = chatSendSchema.safeParse(payload ?? {});
    if (!input.success) {
      return badRequest(
        input.error.issues[0]?.message ?? 'That message wasn’t in the expected format.',
      );
    }
    const found = await this.member(socket);
    if (!found) return NOT_IN_ROOM;
    if (!(await this.limits.allow(`chat:user:${socket.data.identity.id}`, LIMITS.chatPerUser))) {
      return {
        ok: false,
        error: {
          code: 'rate_limited',
          message: 'Slow down a little: 8 messages every 10 seconds.',
        },
      };
    }
    const message: ChatMessage = {
      id: newChatMessageId(),
      memberId: found.member.memberId,
      name: found.member.name,
      text: censorChat(input.data.text),
      sentAt: Date.now(),
    };
    await this.chat.append(found.code, message);
    this.server.to(roomChannel(found.code)).emit('chat:message', message);
    return { ok: true, data: message };
  }

  @SubscribeMessage('chat:report')
  async report(socket: GameSocket, payload: unknown): Promise<Ack<null>> {
    const input = chatReportSchema.safeParse(payload ?? {});
    if (!input.success) return badRequest('That message can’t be reported.');
    const found = await this.member(socket);
    if (!found) return NOT_IN_ROOM;
    const message = await this.chat.find(found.code, input.data.messageId);
    if (!message) {
      return {
        ok: false,
        error: { code: 'not_found', message: 'That message is no longer available.' },
      };
    }
    if (message.memberId === found.member.memberId) {
      return badRequest('You can’t report your own message.');
    }
    const sender = found.room.members.find((m) => m.memberId === message.memberId);
    await this.chat.report({
      reportedAt: Date.now(),
      roomCode: found.code,
      message,
      senderIdentityId: sender?.identityId ?? null,
      reporterIdentityId: socket.data.identity.id,
    });
    // The message text stays in the report queue; logs carry only what's needed to find it.
    this.logger.warn(`chat message reported in room ${found.code} (${message.id})`);
    return { ok: true, data: null };
  }
}
