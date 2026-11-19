'use client';

import { CHAT_MAX_LENGTH, type Ack, type ChatMessage } from '@stock-ex/shared';
import { Flag, Send, VolumeX } from 'lucide-react';
import { useEffect, useId, useRef, useState, type SyntheticEvent } from 'react';
import { gameSocket } from '@/lib/game-socket';

const TIME = new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' });

/**
 * Table chat (spec 6, 10.4). Messages are plain text: React escapes them, nothing is ever
 * rendered as HTML. Mute is just for you, on this page; Report sends the message to moderators.
 */
export function RoomChat({ messages, you }: { messages: ChatMessage[]; you: string }) {
  const ids = useId();
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [muted, setMuted] = useState<readonly { memberId: string; name: string }[]>([]);
  const [reported, setReported] = useState<readonly string[]>([]);
  const list = useRef<HTMLDivElement>(null);

  const visible = messages.filter((m) => !muted.some((x) => x.memberId === m.memberId));

  // Keep the newest message in view, unless you've scrolled up to read older ones.
  useEffect(() => {
    const element = list.current;
    if (!element) return;
    const nearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 120;
    if (nearBottom) element.scrollTop = element.scrollHeight;
  }, [visible.length]);

  const send = async (event: SyntheticEvent) => {
    event.preventDefault();
    if (busy || !draft.trim()) return;
    setBusy(true);
    try {
      const reply = (await gameSocket()
        .timeout(8000)
        .emitWithAck('chat:send', { text: draft })) as Ack<ChatMessage>;
      if (reply.ok) {
        setDraft('');
        setNote('');
      } else {
        setNote(reply.error.message);
      }
    } catch {
      setNote('Your message didn’t send. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const report = async (message: ChatMessage) => {
    const reply = (await gameSocket()
      .timeout(8000)
      .emitWithAck('chat:report', { messageId: message.id })
      .catch(() => null)) as Ack<null> | null;
    if (reply?.ok) {
      setReported((current) => [...current, message.id]);
      setNote('Thanks. The message was reported to the stock-ex team.');
    } else {
      setNote(reply ? reply.error.message : 'The report didn’t send. Try again.');
    }
  };

  return (
    <section aria-labelledby={`${ids}-heading`} className="panel flex flex-col p-5">
      <h2 id={`${ids}-heading`} className="text-xl">
        Table chat
      </h2>
      {/* The log role (announces new messages politely) sits on a wrapper, so the list
          inside keeps its list semantics. tabIndex lets keyboard users scroll it. */}
      <div
        ref={list}
        role="log"
        aria-label="Chat messages"
        tabIndex={0}
        className="mt-3 h-64 overflow-y-auto rounded-lg border border-ink-700 bg-ink-950/60 p-3 text-sm"
      >
        <ol className="space-y-2">
          {visible.length === 0 ? (
            <li className="text-ink-300">No messages yet. Say hello to the table.</li>
          ) : (
            visible.map((message) => {
              const mine = message.memberId === you;
              return (
                <li key={message.id} className="group">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-sand-300">{message.name}</span>
                    <time
                      className="text-xs text-ink-300"
                      dateTime={new Date(message.sentAt).toISOString()}
                    >
                      {TIME.format(message.sentAt)}
                    </time>
                    {mine ? null : (
                      <span className="ml-auto flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setMuted((current) => [
                              ...current,
                              { memberId: message.memberId, name: message.name },
                            ]);
                          }}
                          aria-label={`Mute ${message.name}`}
                          title={`Mute ${message.name}`}
                          className="rounded p-1.5 text-ink-300 hover:text-accent-400"
                        >
                          <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void report(message)}
                          aria-disabled={reported.includes(message.id)}
                          aria-label={`Report this message from ${message.name}`}
                          title={reported.includes(message.id) ? 'Reported' : 'Report message'}
                          className="rounded p-1.5 text-ink-300 hover:text-bear-400 aria-disabled:opacity-40"
                        >
                          <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </span>
                    )}
                  </div>
                  <p className="break-words whitespace-pre-wrap text-ink-100">{message.text}</p>
                </li>
              );
            })
          )}
        </ol>
      </div>

      {muted.length > 0 ? (
        <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-300">
          Muted:
          {muted.map((person) => (
            <button
              key={person.memberId}
              type="button"
              onClick={() => {
                setMuted((current) => current.filter((x) => x.memberId !== person.memberId));
              }}
              className="rounded border border-ink-700 px-1.5 py-0.5 underline hover:text-accent-400"
            >
              {person.name} (unmute)
            </button>
          ))}
        </p>
      ) : null}

      <form onSubmit={(event) => void send(event)} className="mt-3 flex gap-2">
        <label htmlFor={`${ids}-message`} className="sr-only">
          Message the table
        </label>
        <input
          id={`${ids}-message`}
          value={draft}
          maxLength={CHAT_MAX_LENGTH}
          autoComplete="off"
          placeholder="Message the table"
          aria-describedby={`${ids}-count`}
          onChange={(event) => {
            setDraft(event.target.value);
          }}
          className="min-w-0 flex-1 rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm placeholder:text-ink-300"
        />
        <button
          type="submit"
          aria-disabled={busy}
          aria-label="Send message"
          className="btn-game btn-primary px-3"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
      <p id={`${ids}-count`} className="mt-1 text-right text-xs text-ink-300">
        {draft.length}/{CHAT_MAX_LENGTH}
      </p>
      <p role="status" className="min-h-5 text-xs text-accent-400">
        {note}
      </p>
    </section>
  );
}
