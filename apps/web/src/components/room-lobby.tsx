'use client';

import {
  MAX_SPECTATORS,
  NICKNAME_MAX,
  nicknameSchema,
  type Ack,
  type RoomJoined,
  type RoomMemberView,
  type RoomRole,
  type RoomView,
} from '@stock-ex/shared';
import { Armchair, Copy, Crown, Eye, Link2, LogOut, UserRound, WifiOff, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useSyncExternalStore, type SyntheticEvent } from 'react';
import { connectGameSocket, gameSocket, rememberNickname, savedNickname } from '@/lib/game-socket';

type Phase = 'joining' | 'name' | 'full' | 'in' | 'gone';

const SEAT_TILES = [
  'bg-bull-500 text-ink-950',
  'bg-tile-blue text-ink-100',
  'bg-tile-yellow text-ink-950',
  'bg-bear-500 text-ink-100',
  'bg-accent-400 text-ink-950',
  'bg-sand-300 text-ink-950',
] as const;

const noSubscription = () => () => undefined;

/** Connects if needed and asks to join; never throws, so callers only handle an Ack. */
async function requestJoin(code: string, as: RoomRole): Promise<Ack<RoomJoined>> {
  try {
    const socket = await connectGameSocket();
    return (await socket.timeout(8000).emitWithAck('room:join', { code, as })) as Ack<RoomJoined>;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Something went wrong.';
    return { ok: false, error: { code: 'internal', message } };
  }
}

/**
 * The room lobby (spec 10.4): code and invite link, seats with the host's crown, spectators,
 * read-only settings, and the host's controls. Everything shown comes from the server's
 * `room:state`; this component only sends intents.
 */
export function RoomLobby({ code, signedInAs }: { code: string; signedInAs?: string | undefined }) {
  const router = useRouter();
  // Read on the client only; the server render shows "Joining…" until it is known.
  const storedName = useSyncExternalStore(noSubscription, savedNickname, () => null);
  const [phase, setPhase] = useState<Phase>('joining');
  const [room, setRoom] = useState<RoomView | null>(null);
  const [you, setYou] = useState<RoomJoined['you'] | null>(null);
  const [status, setStatus] = useState('');
  const [nickname, setNickname] = useState('');
  const [offline, setOffline] = useState(false);
  const joined = useRef(false);
  const started = useRef(false);

  // A guest arriving by invite link, with no nickname yet in this tab, is asked for one first.
  const needsName = phase === 'name' || (phase === 'joining' && storedName === '' && !signedInAs);

  function apply(as: RoomRole, reply: Ack<RoomJoined>) {
    if (reply.ok) {
      joined.current = true;
      setRoom(reply.data.room);
      setYou(reply.data.you);
      setPhase('in');
      setStatus('');
      return;
    }
    const { code: problem, message } = reply.error;
    setStatus(message);
    if (problem === 'conflict' && message.includes('already called') && !signedInAs) {
      setPhase('name');
    } else if (problem === 'conflict' && as === 'player') {
      setPhase('full');
    } else {
      setPhase('gone');
    }
  }

  const enter = (as: RoomRole = 'player') =>
    requestJoin(code, as).then((reply) => {
      apply(as, reply);
    });

  // Join once we know who you are: an account, or a guest nickname saved in this tab.
  useEffect(() => {
    if (started.current || storedName === null || (!signedInAs && !storedName)) return;
    started.current = true;
    void requestJoin(code, 'player').then((reply) => {
      apply('player', reply);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once, when the name is known
  }, [storedName, signedInAs]);

  // Live updates. A reconnect (network blip, laptop sleep) re-joins and gets the same seat back.
  useEffect(() => {
    const socket = gameSocket();
    const onState = (next: RoomView) => {
      setRoom(next);
    };
    const onRemoved = ({ reason }: { reason: 'kicked' | 'closed' }) => {
      joined.current = false;
      setPhase('gone');
      setStatus(
        reason === 'kicked' ? 'The host removed you from this room.' : 'This room has closed.',
      );
    };
    const onConnect = () => {
      setOffline(false);
      if (joined.current) void enter(you?.role ?? 'player');
    };
    const onDisconnect = () => {
      if (joined.current) setOffline(true);
    };
    socket.on('room:state', onState);
    socket.on('room:removed', onRemoved);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    return () => {
      socket.off('room:state', onState);
      socket.off('room:removed', onRemoved);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- listeners bind once per page
  }, []);

  const send = async (event: 'room:takeSeat' | 'room:spectate') => {
    const reply = (await gameSocket().timeout(8000).emitWithAck(event, {})) as Ack<RoomJoined>;
    if (reply.ok) setYou(reply.data.you);
    else setStatus(reply.error.message);
  };

  const kick = async (member: RoomMemberView) => {
    const reply = (await gameSocket()
      .timeout(8000)
      .emitWithAck('room:kick', { memberId: member.memberId })) as Ack<null>;
    setStatus(reply.ok ? `${member.name} was removed from the room.` : reply.error.message);
  };

  const leave = async () => {
    joined.current = false;
    await gameSocket()
      .timeout(8000)
      .emitWithAck('room:leave', {})
      .catch(() => undefined);
    router.push('/');
  };

  const copy = (text: string, done: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setStatus(done);
      },
      () => {
        setStatus('Copying didn’t work here. Select the code and copy it yourself.');
      },
    );
  };

  const submitName = (event: SyntheticEvent) => {
    event.preventDefault();
    const result = nicknameSchema.safeParse(nickname);
    if (!result.success) {
      setStatus(result.error.issues[0]?.message ?? 'Pick a nickname.');
      return;
    }
    rememberNickname(result.data);
    setStatus('');
    setPhase('joining');
    void enter();
  };

  const statusLine = (
    <p role="status" className="mt-4 min-h-6 text-sm text-accent-400">
      {status}
    </p>
  );

  if (phase !== 'in' || !room || !you) {
    return (
      <div className="panel mx-auto max-w-md p-6">
        <p className="label text-sm uppercase">Room</p>
        <h1 className="mt-1 font-mono text-4xl tracking-widest">{code}</h1>
        {phase === 'joining' && !needsName ? (
          <p className="mt-3 text-ink-300">Finding your seat…</p>
        ) : null}
        {needsName ? (
          <form onSubmit={submitName} className="mt-4 space-y-3">
            <label htmlFor="room-nickname" className="block text-sm font-medium">
              Pick a nickname to join
            </label>
            <input
              id="room-nickname"
              value={nickname}
              maxLength={NICKNAME_MAX}
              autoComplete="off"
              placeholder="e.g. BullRun"
              onChange={(event) => {
                setNickname(event.target.value);
              }}
              className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 placeholder:text-ink-300"
            />
            <button type="submit" className="btn-game btn-primary w-full py-2">
              Join room
            </button>
          </form>
        ) : null}
        {phase === 'full' ? (
          <button
            type="button"
            onClick={() => void enter('spectator')}
            className="btn-game btn-primary mt-4 w-full py-2"
          >
            <Eye className="mr-2 inline h-4 w-4" aria-hidden="true" />
            Watch instead
          </button>
        ) : null}
        {statusLine}
        {phase === 'gone' || phase === 'full' ? (
          <Link href="/" className="text-sm text-ink-300 underline hover:text-accent-400">
            Back to the start
          </Link>
        ) : null}
      </div>
    );
  }

  const host = [...room.seats, ...room.spectators].find((m) => m?.isHost);
  const youAreHost = host?.memberId === you.memberId;
  const seated = room.seats.filter(Boolean).length;

  const memberRow = (member: RoomMemberView, tile: string) => (
    <>
      <span
        aria-hidden="true"
        className={`font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-ink-100 ${tile}`}
      >
        {member.name.charAt(0).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1 truncate">
        {member.name}
        {member.memberId === you.memberId ? <span className="text-ink-300"> (you)</span> : null}
      </span>
      {member.isHost ? (
        <span className="inline-flex items-center gap-1 text-xs text-tile-yellow">
          <Crown className="h-4 w-4" aria-hidden="true" />
          Host
        </span>
      ) : null}
      {member.connected ? null : (
        <span className="inline-flex items-center gap-1 text-xs text-ink-300">
          <WifiOff className="h-4 w-4" aria-hidden="true" />
          Offline
        </span>
      )}
      {youAreHost && member.memberId !== you.memberId ? (
        <button
          type="button"
          onClick={() => void kick(member)}
          aria-label={`Remove ${member.name} from the room`}
          title="Remove from room"
          className="btn-game btn-ghost p-1"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </>
  );

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label text-sm uppercase">
            {room.settings.visibility === 'private' ? 'Private room' : 'Public room'}
          </p>
          <h1 className="mt-1 font-mono text-4xl tracking-widest sm:text-5xl">{room.code}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              copy(room.code, 'Room code copied.');
            }}
            className="btn-game btn-ghost px-3 py-2"
          >
            <Copy className="mr-2 inline h-4 w-4" aria-hidden="true" />
            Copy code
          </button>
          <button
            type="button"
            onClick={() => {
              copy(`${window.location.origin}/room/${room.code}`, 'Invite link copied.');
            }}
            className="btn-game btn-primary px-3 py-2"
          >
            <Link2 className="mr-2 inline h-4 w-4" aria-hidden="true" />
            Copy invite link
          </button>
        </div>
      </div>

      {offline ? (
        <p className="panel panel-accent mt-4 p-3 text-sm">
          Connection lost. Reconnecting… your seat is kept for you.
        </p>
      ) : null}

      <div className="mt-6 grid gap-6 md:grid-cols-[2fr_1fr]">
        <section aria-labelledby="traders-heading" className="panel p-5">
          <h2 id="traders-heading" className="flex items-baseline justify-between text-xl">
            Traders
            <span className="text-sm text-ink-300">
              {seated} / {room.settings.maxSeats}
            </span>
          </h2>
          <ol className="mt-3 space-y-2">
            {room.seats.map((member, seat) => (
              <li
                // Seats are fixed positions, so their index is a stable key.
                key={seat}
                className="flex items-center gap-3 rounded-xl border-2 border-ink-100/20 bg-ink-950/60 px-3 py-2"
              >
                {member ? (
                  memberRow(member, SEAT_TILES.at(seat) ?? SEAT_TILES[0])
                ) : (
                  <span className="flex items-center gap-3 text-ink-300">
                    <Armchair className="h-9 w-9 p-1.5" aria-hidden="true" />
                    Open seat
                  </span>
                )}
              </li>
            ))}
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            {you.role === 'spectator' ? (
              <button
                type="button"
                onClick={() => void send('room:takeSeat')}
                className="btn-game btn-primary px-4 py-2"
              >
                <Armchair className="mr-2 inline h-4 w-4" aria-hidden="true" />
                Take a seat
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void send('room:spectate')}
                className="btn-game btn-ghost px-4 py-2"
              >
                <Eye className="mr-2 inline h-4 w-4" aria-hidden="true" />
                Watch instead
              </button>
            )}
            <button
              type="button"
              onClick={() => void leave()}
              className="btn-game btn-ghost px-4 py-2"
            >
              <LogOut className="mr-2 inline h-4 w-4" aria-hidden="true" />
              Leave room
            </button>
          </div>
        </section>

        <div className="space-y-6">
          <section aria-labelledby="settings-heading" className="panel p-5">
            <h2 id="settings-heading" className="text-xl">
              Table settings
            </h2>
            <dl className="mt-3 grid grid-cols-[1fr_auto] gap-y-1 text-sm">
              <dt className="text-ink-300">Seats</dt>
              <dd>{room.settings.maxSeats}</dd>
              <dt className="text-ink-300">Who can join</dt>
              <dd>{room.settings.visibility === 'private' ? 'Anyone with the code' : 'Anyone'}</dd>
              <dt className="text-ink-300">Players</dt>
              <dd>{room.settings.accountsOnly ? 'Logged-in only' : 'Guests welcome'}</dd>
            </dl>
          </section>

          <section aria-labelledby="spectators-heading" className="panel p-5">
            <h2 id="spectators-heading" className="flex items-baseline justify-between text-xl">
              Watching
              <span className="text-sm text-ink-300">
                {room.spectators.length} / {MAX_SPECTATORS}
              </span>
            </h2>
            {room.spectators.length === 0 ? (
              <p className="mt-3 text-sm text-ink-300">Nobody is watching yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {room.spectators.map((member) => (
                  <li key={member.memberId} className="flex items-center gap-3 text-sm">
                    {memberRow(member, 'bg-ink-700 text-ink-100')}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <section className="panel panel-accent mt-6 flex flex-wrap items-center justify-between gap-4 p-5">
        <p className="flex items-center gap-2">
          <UserRound className="h-5 w-5 text-accent-400" aria-hidden="true" />
          {youAreHost
            ? 'You’re the host. Share the code, then open the market when everyone is in.'
            : `Waiting for ${host?.name ?? 'the host'} to open the market…`}
        </p>
        {youAreHost ? (
          <button
            type="button"
            aria-disabled="true"
            title="Games start once the game engine is ready"
            className="btn-game btn-primary px-5 py-2 opacity-60"
          >
            Open the Market
          </button>
        ) : null}
      </section>
      {statusLine}
    </div>
  );
}
