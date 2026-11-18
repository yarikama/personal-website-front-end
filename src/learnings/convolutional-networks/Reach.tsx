import { conv3, DEPTHS, reachByTracing } from './model'

const WIDTH = 560
const HEIGHT = 240
const ROW_GAP = 64
const BOTTOM = 214
const CELL = 30
const SQUARES = 9
const LEFT = (WIDTH - SQUARES * CELL) / 2 + 40

const caps = 'font-mono text-[11px] uppercase tracking-widest'

// Which squares of row `row` (0 is the input) one square at the top of an
// n-layer stack of 3 × 3s depends on, in one dimension
function touched(n: number, row: number): number[] {
  const width = reachByTracing(Array.from({ length: n - row }, () => conv3))
  const start = (SQUARES - width) / 2
  return Array.from({ length: width }, (_, i) => start + i)
}

// A side view of n stacked 3 × 3 layers: one square at the top, the three
// below it that it reads, the five below those, and so on to the input.
export default function Reach({ depth }: { depth: (typeof DEPTHS)[number] }) {
  const y = (row: number) => BOTTOM - row * ROW_GAP
  const cx = (i: number) => LEFT + (i + 0.5) * CELL
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      role="img"
      aria-label={`${depth} stacked 3 by 3 layers: one square at the top sees ${touched(depth, 0).length} squares of the input across.`}
    >
      {Array.from({ length: depth + 1 }, (_, row) => {
        const on = new Set(touched(depth, row))
        const top = row === depth
        return (
          <g key={row}>
            <text x={LEFT - 14} y={y(row) + 4} textAnchor="end" className={`fill-zinc-faded ${caps}`}>
              {row === 0 ? 'Input' : `Layer ${row}`}
            </text>
            {/* What each touched square reads from the row below */}
            {row > 0 &&
              [...on].map((i) =>
                [-1, 0, 1].map((d) => (
                  <line
                    key={`${i}:${d}`}
                    x1={cx(i)}
                    y1={y(row) + (CELL - 4) / 2}
                    x2={cx(i + d)}
                    y2={y(row - 1) - (CELL - 4) / 2}
                    className="stroke-sage"
                    strokeOpacity={0.7}
                    strokeWidth={1.25}
                  />
                )),
              )}
            {Array.from({ length: SQUARES }, (_, i) =>
              top && !on.has(i) ? null : (
                <rect
                  key={i}
                  x={LEFT + i * CELL + 2}
                  y={y(row) - (CELL - 4) / 2}
                  width={CELL - 4}
                  height={CELL - 4}
                  rx={5}
                  className={on.has(i) ? 'fill-sage stroke-sage' : 'fill-paper stroke-zinc-400'}
                  fillOpacity={on.has(i) ? (top ? 0.9 : 0.35) : 1}
                  strokeWidth={1.25}
                />
              ),
            )}
          </g>
        )
      })}
    </svg>
  )
}
