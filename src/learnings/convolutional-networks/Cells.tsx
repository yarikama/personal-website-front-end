import type { Grid } from './model'

// A grid of squares at (x, y), each `cell` wide. Ink grids are pictures
// (solid ink is the stroke); sage grids are maps (fuller sage, the stronger
// the stamp fired there). Values run from 0 to 1.
export function Cells({
  grid,
  x,
  y,
  cell,
  tone = 'ink',
  upTo = Infinity,
}: {
  grid: Grid
  x: number
  y: number
  cell: number
  tone?: 'ink' | 'sage'
  // Only the first `upTo` squares, row by row, are filled in
  upTo?: number
}) {
  const cols = grid[0].length
  return (
    <g>
      <rect x={x} y={y} width={cols * cell} height={grid.length * cell} className="fill-paper" />
      {grid.map((row, i) =>
        row.map((v, j) =>
          i * cols + j < upTo && v > 0 ? (
            <rect
              key={`${i}-${j}`}
              x={x + j * cell}
              y={y + i * cell}
              width={cell}
              height={cell}
              className={tone === 'ink' ? 'fill-ink' : 'fill-sage'}
              fillOpacity={tone === 'ink' ? Math.min(1, v) : 0.3 + 0.7 * Math.min(1, v)}
            />
          ) : null,
        ),
      )}
      {/* The lines between squares, drawn over the fills */}
      {Array.from({ length: cols + 1 }, (_, j) => (
        <line
          key={`v${j}`}
          x1={x + j * cell}
          x2={x + j * cell}
          y1={y}
          y2={y + grid.length * cell}
          className="stroke-zinc-300 dark:stroke-zinc-200/25"
          strokeWidth={0.75}
        />
      ))}
      {Array.from({ length: grid.length + 1 }, (_, i) => (
        <line
          key={`h${i}`}
          x1={x}
          x2={x + cols * cell}
          y1={y + i * cell}
          y2={y + i * cell}
          className="stroke-zinc-300 dark:stroke-zinc-200/25"
          strokeWidth={0.75}
        />
      ))}
    </g>
  )
}

// A filter's weights as squares: sage where it wants ink, in proportion to
// the weight; ink where ink counts against it
export function Weights({ filter, x, y, cell, numbers = false }: { filter: Grid; x: number; y: number; cell: number; numbers?: boolean }) {
  const most = Math.max(...filter.flat().map(Math.abs)) || 1
  return (
    <g>
      {filter.map((row, i) =>
        row.map((w, j) => (
          <g key={`${i}-${j}`}>
            <rect x={x + j * cell} y={y + i * cell} width={cell} height={cell} className="fill-paper" />
            <rect
              x={x + j * cell}
              y={y + i * cell}
              width={cell}
              height={cell}
              className={w >= 0 ? 'fill-sage' : 'fill-ink'}
              fillOpacity={(w >= 0 ? 0.9 : 0.45) * (Math.abs(w) / most)}
            />
            <rect
              x={x + j * cell}
              y={y + i * cell}
              width={cell}
              height={cell}
              className="fill-none stroke-zinc-400"
              strokeWidth={0.75}
            />
            {numbers && (
              <text
                x={x + (j + 0.5) * cell}
                y={y + (i + 0.5) * cell + 4}
                textAnchor="middle"
                className="fill-ink stroke-paper font-mono text-[11px] tabular-nums"
                strokeWidth={3}
                paintOrder="stroke"
              >
                {Math.abs(w) < 0.05 ? '0.0' : w.toFixed(1).replace('-', '−')}
              </text>
            )}
          </g>
        )),
      )}
    </g>
  )
}
