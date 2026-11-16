// Two colourful dice for the random-nickname button: a red die showing five and a blue die
// showing three, in the board's tile colours. Original SVG.

const FIVE = [
  [6, 6],
  [14, 6],
  [10, 10],
  [6, 14],
  [14, 14],
] as const;
const THREE = [
  [6, 6],
  [10, 10],
  [14, 14],
] as const;

function Die({
  x,
  y,
  rotate,
  face,
  colour,
}: {
  x: number;
  y: number;
  rotate: number;
  face: 'five' | 'three';
  colour: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate} 10 10)`}>
      <rect
        width="20"
        height="20"
        rx="5"
        className={`${colour} stroke-ink-100`}
        strokeWidth="1.5"
      />
      {(face === 'five' ? FIVE : THREE).map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.9" className="fill-ink-100" />
      ))}
    </g>
  );
}

export function ColourDice({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 34 30" aria-hidden="true" className={className}>
      <Die x={12} y={1} rotate={14} face="three" colour="fill-tile-blue" />
      <Die x={1} y={8} rotate={-10} face="five" colour="fill-bear-500" />
    </svg>
  );
}
