import type { Board } from './model'

// A small tic-tac-toe board, drawn at (x, y) `size` wide. X is ours, in
// sage; O is the opponent's, in ink.
export function MiniBoard({ board, x, y, size }: { board: Board; x: number; y: number; size: number }) {
  const cell = size / 3
  const pad = cell * 0.24
  return (
    <g transform={`translate(${x} ${y})`}>
      {[1, 2].map((i) => (
        <g key={i} className="stroke-zinc-400 dark:stroke-zinc-200/40" strokeWidth={1.5}>
          <line x1={i * cell} y1={0} x2={i * cell} y2={size} />
          <line x1={0} y1={i * cell} x2={size} y2={i * cell} />
        </g>
      ))}
      {[...board].map((mark, i) => {
        const cx = (i % 3) * cell
        const cy = Math.floor(i / 3) * cell
        if (mark === 'X')
          return (
            <g key={i} className="stroke-sage" strokeWidth={2.5} strokeLinecap="round">
              <line x1={cx + pad} y1={cy + pad} x2={cx + cell - pad} y2={cy + cell - pad} />
              <line x1={cx + cell - pad} y1={cy + pad} x2={cx + pad} y2={cy + cell - pad} />
            </g>
          )
        if (mark === 'O')
          return (
            <circle
              key={i}
              cx={cx + cell / 2}
              cy={cy + cell / 2}
              r={cell / 2 - pad}
              className="fill-none stroke-ink"
              strokeWidth={2}
            />
          )
        return null
      })}
    </g>
  )
}
