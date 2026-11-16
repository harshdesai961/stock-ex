// The stock-ex loader: the red token hops along three board tiles. Pure SVG and CSS, so it is
// tiny, sharp, themed, and stops for people who prefer reduced motion. Swap the artwork here
// if a designed loader arrives later.

export function TokenLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" className="flex flex-col items-center gap-3">
      <svg viewBox="0 0 110 60" aria-hidden="true" className="h-16 w-28">
        <g>
          <rect
            x="6"
            y="38"
            width="26"
            height="18"
            rx="5"
            className="loader-tile fill-tile-blue stroke-ink-100"
            strokeWidth="2"
          />
          <rect
            x="42"
            y="38"
            width="26"
            height="18"
            rx="5"
            className="loader-tile fill-tile-yellow stroke-ink-100"
            strokeWidth="2"
          />
          <rect
            x="78"
            y="38"
            width="26"
            height="18"
            rx="5"
            className="loader-tile fill-bull-500 stroke-ink-100"
            strokeWidth="2"
          />
        </g>
        <g transform="translate(19 20)">
          <g className="loader-token">
            <path d="M-9 14 C-6 7 -3 1 -3 -3 H3 C3 1 6 7 9 14 Z" className="fill-bear-500" />
            <rect x="-5" y="-9" width="10" height="6" rx="2" className="fill-bear-500" />
            <rect x="-3.5" y="-14" width="7" height="5" rx="2" className="fill-bear-400" />
          </g>
        </g>
      </svg>
      <span className="label text-sm">{label}…</span>
    </div>
  );
}

/** A shimmering placeholder block. Size and shape come from className. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}
