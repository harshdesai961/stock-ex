import { TrendingUp } from 'lucide-react';

// Original board-game artwork, drawn as SVG: sharp at any size, tiny, and free of image rights.

const TILE_COLOURS = [
  'fill-tile-blue',
  'fill-bear-500',
  'fill-tile-orange',
  'fill-tile-yellow',
  'fill-bull-500',
  'fill-ink-100',
] as const;

// Tile labels are the game's own moves. White tiles get dark text, the rest get white.
const LABELS = ['BUY', 'SELL', 'PASS', 'BUY', 'SELL', '', 'REVEAL', 'BUY', 'PASS', 'SELL', 'BUY'];

/** Tile centres along a rising, zig-zagging market line, from bottom-left to top-right. */
const PATH: readonly (readonly [number, number])[] = [
  [40, 300],
  [92, 284],
  [140, 250],
  [186, 268],
  [234, 236],
  [282, 196],
  [330, 214],
  [378, 170],
  [424, 128],
  [470, 146],
  [516, 98],
];

/**
 * A stock chart drawn as a board-game track: coloured tiles climbing a rising line,
 * a red token on the way up and a trophy at the top.
 */
export function BoardPath({ className = '' }: { className?: string }) {
  const line = PATH.map(([x, y]) => `${x},${y}`).join(' ');
  const token = PATH[7] ?? [378, 170];
  return (
    <svg
      viewBox="0 0 580 340"
      role="img"
      aria-label="A game board track shaped like a rising stock chart"
      className={className}
    >
      {/* The rising market line under the tiles */}
      <polyline
        points={line}
        fill="none"
        strokeWidth="34"
        strokeLinejoin="round"
        strokeLinecap="round"
        className="stroke-ink-950"
      />
      <polyline
        points={line}
        fill="none"
        strokeWidth="4"
        strokeDasharray="2 10"
        strokeLinecap="round"
        className="stroke-ink-100/40"
      />

      <g className="board-tiles">
        {PATH.map(([x, y], index) => {
          const colour = TILE_COLOURS.at(index % TILE_COLOURS.length) ?? 'fill-ink-100';
          const label = LABELS.at(index) ?? '';
          const dark = colour === 'fill-ink-100' || colour === 'fill-tile-yellow';
          return (
            <g key={`${x}-${y}`} className="tile-pop">
              <rect
                x={x - 22}
                y={y - 22}
                width="44"
                height="44"
                rx="9"
                className={`${colour} stroke-ink-100`}
                strokeWidth="3"
              />
              {label ? (
                <text
                  x={x}
                  y={y + 4}
                  textAnchor="middle"
                  className={`font-display text-[11px] font-bold ${dark ? 'fill-ink-950' : 'fill-ink-100'}`}
                >
                  {label}
                </text>
              ) : null}
            </g>
          );
        })}
      </g>

      {/* Start flag */}
      <g transform="translate(10 314)">
        <rect width="60" height="22" rx="5" className="fill-ink-100" />
        <text
          x="30"
          y="15"
          textAnchor="middle"
          className="font-display fill-ink-950 text-[12px] font-bold"
        >
          START
        </text>
      </g>

      {/* Trophy at the top of the climb */}
      <g transform="translate(540 52)">
        <circle r="26" className="fill-tile-yellow stroke-ink-100" strokeWidth="3" />
        <path
          d="M-11 -11 H11 V-3 A11 11 0 0 1 -11 -3 Z M-3 7 H3 V12 H8 V16 H-8 V12 H-3 Z M-11 -9 H-17 A6 6 0 0 0 -11 1 M11 -9 H17 A6 6 0 0 1 11 1"
          className="fill-ink-950 stroke-ink-950"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </g>

      {/* The player's token, bobbing on its tile */}
      <g transform={`translate(${token[0]} ${token[1] - 34})`}>
        <g className="token-bob">
          <GameTokenShape />
        </g>
      </g>
    </svg>
  );
}

/** A solid red pawn, the stock-ex player token. Drawn at the origin, about 40 by 52 units. */
function GameTokenShape() {
  return (
    <g>
      <ellipse cx="0" cy="26" rx="20" ry="5" className="fill-ink-950/50" />
      <path d="M-18 24 C-12 10 -6 -2 -6 -10 H6 C6 -2 12 10 18 24 Z" className="fill-bear-500" />
      <path d="M-6 -10 C-6 -2 -9 8 -12 18 L0 20 L0 -10 Z" className="fill-bear-400/60" />
      <rect x="-10" y="-20" width="20" height="10" rx="3" className="fill-bear-500" />
      <rect x="-7" y="-28" width="14" height="9" rx="3" className="fill-bear-400" />
    </g>
  );
}

/** The red token on its own, for decoration. */
export function GameToken({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="-24 -32 48 66" aria-hidden="true" className={className}>
      <GameTokenShape />
    </svg>
  );
}

/** Logo mark: a rising line on a yellow board tile. */
export function LogoMark() {
  return (
    <span
      aria-hidden="true"
      className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-ink-100 bg-tile-yellow text-ink-950"
    >
      <TrendingUp className="h-5 w-5" strokeWidth={3} />
    </span>
  );
}
