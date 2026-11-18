import { show, SOLID, STRONGEST_EDGE, type Grid } from './model'

// A picture as a grid of cards (numbers rounded to whole; the readout has
// them exact): each cell fills with ink as its number
// grows (blank 0, solid 9). A signed output fills sage where the picture
// gets brighter to the right or down, ink where it gets darker, the more the
// stronger. `first` is where the grid's first cell sits in a full-size
// picture, so a shrunk output lines up under the window that made it.
export function Pixels({
  values,
  x,
  y,
  cell,
  side,
  first = 0,
  shown = Infinity,
  signed = false,
  numbers = false,
}: {
  values: Grid
  x: number
  y: number
  cell: number
  // The full picture's width in cells: positions no value reaches are drawn empty
  side: number
  first?: number
  // Only the first `shown` values, row by row, are drawn: the rest are still to come
  shown?: number
  signed?: boolean
  numbers?: boolean
}) {
  const cols = values[0]?.length ?? 0
  const slots = Array.from({ length: side * side }, (_, n) => [Math.floor(n / side), n % side] as const)
  return (
    <g>
      {slots.map(([i, j]) => {
        const r = i - first
        const c = j - first
        const has = r >= 0 && c >= 0 && r < values.length && c < cols
        const drawn = has && r * cols + c < shown
        const v = drawn ? values[r][c] : 0
        const cx = x + j * cell
        const cy = y + i * cell
        const strength = signed ? Math.min(1, Math.abs(v) / STRONGEST_EDGE) : Math.min(1, Math.max(0, v) / SOLID)
        return (
          <g key={`${i}-${j}`}>
            <rect
              x={cx + 1}
              y={cy + 1}
              width={cell - 2}
              height={cell - 2}
              rx={3}
              className={has ? 'fill-paper stroke-zinc-300 dark:stroke-zinc-200/25' : 'fill-none stroke-zinc-400'}
              strokeDasharray={has ? undefined : '3 3'}
              strokeWidth={1}
            />
            {drawn && strength > 0 && (
              <rect
                x={cx + 1}
                y={cy + 1}
                width={cell - 2}
                height={cell - 2}
                rx={3}
                className={signed && v > 0 ? 'fill-sage' : 'fill-ink'}
                fillOpacity={strength}
              />
            )}
            {numbers && drawn && (
              <text
                x={cx + cell / 2}
                y={cy + cell / 2 + 3.5}
                textAnchor="middle"
                className="fill-ink stroke-paper font-mono text-[10px]"
                strokeWidth={3}
                paintOrder="stroke"
              >
                {show(Math.round(v))}
              </text>
            )}
          </g>
        )
      })}
    </g>
  )
}

// The sage frame round the window and round the cell it writes to
export function Window({ x, y, cell, size = 3 }: { x: number; y: number; cell: number; size?: number }) {
  return <rect x={x - 1} y={y - 1} width={size * cell + 2} height={size * cell + 2} rx={5} className="fill-none stroke-sage" strokeWidth={2.5} />
}
