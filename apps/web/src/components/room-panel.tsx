'use client';

import { useState, type SyntheticEvent } from 'react';

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

  const rollName = () => {
    const name = NAMES.filter((n) => n !== nickname).at(Math.floor(Math.random() * 9));
    if (name) setNickname(name);
  };

  const tryRoom = (event?: SyntheticEvent) => {
    event?.preventDefault();
    setMessage(nickname.trim() ? COMING_SOON : 'Pick a nickname first (or roll the 🎲).');
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
    <div className="rounded-card border border-ink-700 bg-ink-900/90 p-5 shadow-xl shadow-windfall-500/10">
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
            onChange={(event) => {
              setNickname(event.target.value);
            }}
            className="min-w-0 flex-1 rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 placeholder:text-ink-300"
          />
          <button
            type="button"
            onClick={rollName}
            aria-label="Pick a random nickname"
            className="cursor-pointer rounded-lg border border-ink-700 bg-ink-800 px-3 text-lg hover:bg-ink-700"
          >
            🎲
          </button>
        </div>
        <button
          type="submit"
          className="mt-3 w-full cursor-pointer rounded-lg bg-windfall-400 py-3 text-lg font-bold text-ink-950 hover:bg-accent-400"
        >
          Play
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          tryRoom();
        }}
        className="mt-2 w-full cursor-pointer rounded-lg border border-ink-700 bg-ink-800 py-2 font-semibold hover:bg-ink-700"
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
        <button
          type="submit"
          className="cursor-pointer rounded-lg border border-ink-700 bg-ink-800 px-4 font-semibold hover:bg-ink-700"
        >
          Join
        </button>
      </form>

      <p role="status" className="mt-3 min-h-10 text-sm text-accent-400">
        {message}
      </p>
    </div>
  );
}
