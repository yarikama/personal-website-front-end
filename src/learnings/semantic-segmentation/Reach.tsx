import { seenOffsets, viewWidth } from './model'

// Wider than the widest view the figure offers (1, 2, 4 sees 15 across), so
// a ring of unseen squares always shows where the view ends
const SPAN = 17
const HALF = (SPAN - 1) / 2
const CELL = 20
const WIDTH = 360
const HEIGHT = SPAN * CELL + 40
const X = (WIDTH - SPAN * CELL) / 2
const Y = 30

// One output pixel (the centre, outlined) and what it sees of the input
// through a stack of 3 × 3 layers with the given dilations: the squares in
// sage, and the 9 squares its newest layer reads marked with dots.
export default function Reach({ dilations }: { dilations: number[] }) {
  const seen = new Set(seenOffsets(dilations))
  const last = dilations.at(-1) ?? 1
  const width = viewWidth(dilations)
  const taps = [-last, 0, last]

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="mx-auto w-full max-w-[24rem]"
      role="img"
      aria-label={`With dilations ${dilations.join(', ')}, the centre pixel sees ${width} by ${width} squares. Its newest layer reads squares ${last} apart.`}
    >
      <text x={X} y={18} className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
        Sees {width} × {width}
      </text>
      {Array.from({ length: SPAN }, (_, r) =>
        Array.from({ length: SPAN }, (_, c) => {
          const on = seen.has(r - HALF) && seen.has(c - HALF)
          return (
            <rect
              key={`${r}-${c}`}
              x={X + c * CELL + 1}
              y={Y + r * CELL + 1}
              width={CELL - 2}
              height={CELL - 2}
              rx={3}
              className={on ? 'fill-sage' : 'fill-paper stroke-zinc-300'}
              fillOpacity={on ? 0.45 : 1}
              strokeWidth={on ? 0 : 1}
            />
          )
        }),
      )}
      {taps.flatMap((dr) =>
        taps.map((dc) => (
          <circle
            key={`${dr}-${dc}`}
            cx={X + (HALF + dc) * CELL + CELL / 2}
            cy={Y + (HALF + dr) * CELL + CELL / 2}
            r={4}
            className="fill-ink"
          />
        )),
      )}
      <rect
        x={X + HALF * CELL - 2}
        y={Y + HALF * CELL - 2}
        width={CELL + 4}
        height={CELL + 4}
        rx={5}
        className="fill-none stroke-ink"
        strokeWidth={2}
      />
    </svg>
  )
}
