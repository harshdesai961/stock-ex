'use client';

import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
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
const NICKNAME_MAX = 10;
const CODE_LENGTH = 5;

const COMING_SOON =
  'Live rooms are being built and open soon. For now, warm up with Call the Market below.';

export function RoomPanel() {
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');

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

  const tryRoom = (event?: SyntheticEvent) => {
    event?.preventDefault();
    setMessage(nickname.trim() ? COMING_SOON : 'Pick a nickname first, or roll the dice for one.');
  };

  const tryJoin = (event: SyntheticEvent) => {
    event.preventDefault();
    if (code.length !== CODE_LENGTH) {
      setMessage(`Room codes have ${CODE_LENGTH} characters.`);
      return;
    }
    tryRoom();
  };

  return (
    <div className="panel p-5">
      <form onSubmit={tryRoom}>
        <label htmlFor="nickname" className="flex justify-between text-sm font-medium">
          <span>Your nickname</span>
          <span className="text-ink-300">
            {nickname.length}/{NICKNAME_MAX}
          </span>
        </label>
        <div className="mt-1 flex gap-2">
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
        onClick={() => {
          tryRoom();
        }}
        className="btn-game btn-ghost mt-2 w-full py-2"
      >
        Create private game
      </button>

      <form onSubmit={tryJoin} className="mt-2 flex gap-2">
        <label htmlFor="room-code" className="sr-only">
          Room code
        </label>
        <input
          id="room-code"
          value={code}
          maxLength={CODE_LENGTH}
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
