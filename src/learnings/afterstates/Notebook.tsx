import { FRIDGE, range, type Notebook as Kind } from './model'

const CELL = 20
const LEFT = 26
const TOP = 44
const SIZE = (FRIDGE + 1) * CELL
const WIDTH = LEFT + SIZE + 6
const HEIGHT = TOP + SIZE + 6

const x = (open: number) => LEFT + open * CELL
const y = (left: number) => TOP + left * CELL

// How dark a score is drawn: by how many days it has learned from
const shade = (count: number) => (count ? 0.3 + 0.6 * Math.min(1, count / 10) : 0)

export interface Mark {
  left: number
  open: number
  text?: string
  // A dashed ring: a score still waiting to learn
  waiting?: boolean
}

// A stallholder's notebook as a triangle: a row for each number of bottles
// left, a column for each number to open with (only as many as are left, or
// more). The pair notebook keeps every cell apart; the shelf notebook keeps
// one score per column, drawn as the whole column. A cell is darker the
// more days it has learned from; a dot is what the row would open with,
// playing its best.
export default function Notebook({
  kind,
  counts,
  picks,
  marks = [],
  columns = 'open with',
  rows = 'left',
  faded = false,
  label,
}: {
  kind: Kind
  // How many days each pair (row by row, from open = left) has learned from;
  // for the shelf notebook, each pair reads its column's count
  counts: number[][]
  picks?: number[]
  marks?: Mark[]
  columns?: string
  rows?: string
  faded?: boolean
  label: string
}) {
  const cells = range(0, FRIDGE)
  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={label} opacity={faded ? 0.25 : 1}>
      <text x={LEFT + SIZE / 2} y={14} textAnchor="middle" className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
        {columns} →
      </text>
      <text x={LEFT + 3 * CELL} y={y(FRIDGE - 1) + CELL / 2 + 3.5} className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
        ← {rows}
      </text>
      {cells.map((n) => (
        <g key={n}>
          {n % 2 === 0 && (
            <text x={x(n) + CELL / 2} y={TOP - 6} textAnchor="middle" className="fill-zinc-400 font-mono text-[10px]">
              {n}
            </text>
          )}
          <text x={LEFT - 4} y={y(n) + CELL / 2 + 3.5} textAnchor="end" className="fill-zinc-400 font-mono text-[10px]">
            {n}
          </text>
        </g>
      ))}

      {kind === 'pairs'
        ? cells.map((left) =>
            range(left, FRIDGE).map((open) => {
              const count = counts[left][open - left]
              return (
                <g key={`${left}-${open}`}>
                  <rect
                    x={x(open) + 1}
                    y={y(left) + 1}
                    width={CELL - 2}
                    height={CELL - 2}
                    className="fill-paper stroke-zinc-300 dark:stroke-zinc-200/25"
                  />
                  {count > 0 && (
                    <rect x={x(open) + 1} y={y(left) + 1} width={CELL - 2} height={CELL - 2} className="fill-sage" opacity={shade(count)} />
                  )}
                </g>
              )
            })
          )
        : cells.map((open) => {
            // The shelf's one score, read by every row that can open with it
            const count = counts[0][open]
            return (
              <g key={open}>
                <rect
                  x={x(open) + 1}
                  y={y(0) + 1}
                  width={CELL - 2}
                  height={(open + 1) * CELL - 2}
                  className="fill-paper stroke-zinc-300 dark:stroke-zinc-200/25"
                />
                {count > 0 && (
                  <rect x={x(open) + 1} y={y(0) + 1} width={CELL - 2} height={(open + 1) * CELL - 2} className="fill-sage" opacity={shade(count)} />
                )}
              </g>
            )
          })}

      {picks?.map((open, left) => (
        <circle key={left} cx={x(open) + CELL / 2} cy={y(left) + CELL / 2} r={3.5} className="fill-ink" />
      ))}

      {marks.map((mark) => (
        <g key={`${mark.left}-${mark.open}`}>
          <rect
            x={x(mark.open) - 0.5}
            y={y(mark.left) - 0.5}
            width={CELL + 1}
            height={CELL + 1}
            className="fill-none stroke-ink"
            strokeWidth={1.75}
            strokeDasharray={mark.waiting ? '3 2.5' : undefined}
          />
          {mark.text && (
            <text x={x(mark.open) + CELL / 2} y={y(mark.left) + CELL / 2 + 3.5} textAnchor="middle" className="fill-ink font-mono text-[10px]">
              {mark.text}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}
