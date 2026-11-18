import type { ReactNode } from 'react'
import type { Grid } from './model'

// A grid of grey tiles: each tile filled with ink as strongly as its value,
// so a fuller tile is a higher number
export function TileGrid({ grid, x, y, cell, lost = 1 }: { grid: Grid; x: number; y: number; cell: number; lost?: number }) {
  const n = grid.length
  return (
    <g>
      <rect x={x} y={y} width={n * cell} height={n * cell} className="fill-paper stroke-zinc-300 dark:stroke-zinc-200/25" />
      {grid.map((row, i) =>
        row.map((v, j) => (
          <rect
            key={`${i}-${j}`}
            x={x + j * cell}
            y={y + i * cell}
            width={cell + 0.3}
            height={cell + 0.3}
            className="fill-ink"
            fillOpacity={Math.min(1, v * lost)}
          />
        )),
      )}
    </g>
  )
}

// A label in the figure's small capitals
export function Tag({ x, y, children, anchor = 'middle', strong = false }: { x: number; y: number; children: ReactNode; anchor?: 'start' | 'middle' | 'end'; strong?: boolean }) {
  return (
    <text x={x} y={y} textAnchor={anchor} className={`${strong ? 'fill-ink' : 'fill-zinc-faded'} font-mono text-[11px] uppercase tracking-widest`}>
      {children}
    </text>
  )
}

// A short arrow from left to right, with its words above
export function Arrow({ x1, x2, y, label }: { x1: number; x2: number; y: number; label?: string }) {
  return (
    <g>
      <line x1={x1} x2={x2 - 6} y1={y} y2={y} className="stroke-zinc-400" strokeWidth={1.5} />
      <path d={`M ${x2} ${y} l -8 -4.5 v 9 z`} className="fill-zinc-400" />
      {label && (
        <text x={(x1 + x2) / 2} y={y - 8} textAnchor="middle" className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
          {label}
        </text>
      )}
    </g>
  )
}
