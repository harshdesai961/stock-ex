'use client';

import {
  NICKNAME_MAX,
  nicknameSchema,
  ROOM_CODE_LENGTH,
  roomCodeSchema,
  type RoomJoined,
} from '@stock-ex/shared';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import { connectGameSocket, rememberNickname } from '@/lib/game-socket';
import { ColourDice } from './colour-dice';

const NAMES = [
  'BullRun',
  'BearHug',
  'DalalDon',
  'ChaiTrader',
  'LakhPati',
  'TapeReader',
  'BlueChip',
  'RupeeRaja',
  'SmartLot',
  'MarketMia',
];
const QUICK_PLAY_SOON =
  'Quick play opens with public rooms and bots. For now, create a private game and share the code.';

/** `signedInAs`: the account name, when logged in; guests pick a nickname instead. */
export function RoomPanel({ signedInAs }: { signedInAs?: string | undefined }) {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const [rolls, setRolls] = useState(0);
  const [rolling, setRolling] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(
    () => () => {
      clearInterval(timer.current);
    },
    [],
  );

  const randomName = (avoid: string) =>
    NAMES.filter((n) => n !== avoid).at(Math.floor(Math.random() * (NAMES.length - 1))) ??
    'BullRun';

  // The dice tumbles while names flick past like a slot machine, then it settles on one.
  const rollName = () => {
    if (rolling) return;
    setRolls((count) => count + 1);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setNickname(randomName(nickname));
      return;
    }
    setRolling(true);
    let ticks = 0;
    let current = nickname;
    timer.current = setInterval(() => {
      current = randomName(current);
      setNickname(current);
      ticks += 1;
      if (ticks >= 8) {
        clearInterval(timer.current);
        setRolling(false);
      }
    }, 75);
  };

  /** Checks and saves the guest nickname; accounts play under their account name. */
  const nameReady = (): boolean => {
    if (signedInAs) return true;
    const result = nicknameSchema.safeParse(nickname);
    if (!result.success) {
      setMessage(result.error.issues[0]?.message ?? 'Pick a nickname first.');
      return false;
    }
    rememberNickname(result.data);
    return true;
  };

  const quickPlay = (event: SyntheticEvent) => {
    event.preventDefault();
    if (nameReady()) setMessage(QUICK_PLAY_SOON);
  };

  const createRoom = async () => {
    if (busy || !nameReady()) return;
    setBusy(true);
    setMessage('Opening your room…');
    try {
      const socket = await connectGameSocket();
      const reply = (await socket.timeout(8000).emitWithAck('room:create', { settings: {} })) as
        { ok: true; data: RoomJoined } | { ok: false; error: { message: string } };
      if (!reply.ok) {
        setMessage(reply.error.message);
        return;
      }
      router.push(`/room/${reply.data.room.code}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const joinRoom = (event: SyntheticEvent) => {
    event.preventDefault();
    const result = roomCodeSchema.safeParse(code);
    if (!result.success) {
      setMessage(
        code.length === ROOM_CODE_LENGTH
          ? 'That isn’t a room code. Check it with the host.'
          : `Room codes have ${ROOM_CODE_LENGTH} characters.`,
      );
      return;
    }
    if (!nameReady()) return;
    router.push(`/room/${result.data}`);
  };

  return (
    <div className="panel p-5">
      <form onSubmit={quickPlay}>
        {signedInAs ? (
          <p className="text-sm">
            Playing as <strong className="break-all">{signedInAs}</strong>
          </p>
        ) : (
          <label htmlFor="nickname" className="flex justify-between text-sm font-medium">
            <span>Your nickname</span>
            <span className="text-ink-300">
              {nickname.length}/{NICKNAME_MAX}
            </span>
          </label>
        )}
        <div className={signedInAs ? 'hidden' : 'mt-1 flex gap-2'}>
          <input
            id="nickname"
            value={nickname}
            maxLength={NICKNAME_MAX}
            autoComplete="off"
            placeholder="e.g. BullRun"
            key={rolling ? nickname : 'typed'}
            onChange={(event) => {
              setNickname(event.target.value);
            }}
            className={`min-w-0 flex-1 rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 placeholder:text-ink-300 ${rolling ? 'name-tick' : ''}`}
          />
          <button
            type="button"
            onClick={rollName}
            aria-label="Pick a random nickname"
            aria-disabled={rolling}
            className="btn-game btn-dark px-2.5"
          >
            <ColourDice key={rolls} className={`h-7 w-8 ${rolls > 0 ? 'dice-roll' : ''}`} />
          </button>
        </div>
        <button type="submit" className="btn-game btn-primary mt-3 w-full py-3 text-lg">
          Play
        </button>
      </form>

      <button
        type="button"
        onClick={() => void createRoom()}
        aria-disabled={busy}
        className="btn-game btn-ghost mt-2 w-full py-2"
      >
        {busy ? 'Opening…' : 'Create private game'}
      </button>

      <form onSubmit={joinRoom} className="mt-2 flex gap-2">
        <label htmlFor="room-code" className="sr-only">
          Room code
        </label>
        <input
          id="room-code"
          value={code}
          maxLength={ROOM_CODE_LENGTH}
          autoComplete="off"
          placeholder="Room code"
          onChange={(event) => {
            setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
          }}
          className="min-w-0 flex-1 rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 font-mono tracking-widest placeholder:font-sans placeholder:tracking-normal placeholder:text-ink-300"
        />
        <button type="submit" className="btn-game btn-ghost px-4">
          Join
        </button>
      </form>

      <p role="status" className="mt-3 min-h-10 text-sm text-accent-400">
        {message}
      </p>
    </div>
  );
}
