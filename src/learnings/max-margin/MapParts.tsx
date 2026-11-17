import type { ReactNode } from 'react'
import { across, BOTTOM, HEIGHT, LEFT, RIGHT, segment, strip, TOP, WIDTH, X, Y } from './mapScale'
import { MAP, type Line, type Point } from './model'

// The map: a frame with a faint 10 m grid
export function MapFrame({ label, children, extra = 0 }: { label: string; children: ReactNode; extra?: number }) {
  const lines = []
  for (let x = 10; x < MAP.width; x += 10) lines.push(<line key={`x${x}`} x1={X(x)} x2={X(x)} y1={TOP} y2={BOTTOM} />)
  for (let y = 10; y < MAP.height; y += 10) lines.push(<line key={`y${y}`} x1={LEFT} x2={RIGHT} y1={Y(y)} y2={Y(y)} />)
  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT + extra}`} className="w-full" role="img" aria-label={label}>
      <rect x={LEFT} y={TOP} width={RIGHT - LEFT} height={BOTTOM - TOP} rx={12} className="fill-paper stroke-zinc-300 dark:stroke-zinc-200/25" />
      <g className="stroke-zinc-200 dark:stroke-zinc-200/10">{lines}</g>
      {children}
    </svg>
  )
}

// A point of either class: a sage dot for +1, an ink square for −1
export function Mark({ p, opacity = 1, size = 1 }: { p: Point; opacity?: number; size?: number }) {
  const r = 6.5 * size
  return p.label === 1 ? (
    <circle cx={X(p.x)} cy={Y(p.y)} r={r} className="fill-sage" opacity={opacity} />
  ) : (
    <rect x={X(p.x) - r * 0.9} y={Y(p.y) - r * 0.9} width={r * 1.8} height={r * 1.8} rx={2} className="fill-ink" opacity={opacity} />
  )
}

// A ring round a point: one the street rests on
export function Ring({ p }: { p: Point }) {
  return <circle cx={X(p.x)} cy={Y(p.y)} r={12} className="fill-none stroke-ink" strokeWidth={1.5} />
}

// The street around a line scaled so its edges are w·x + b = ±1, opened to
// `open` of the way (0 to 1): the band, the two edges, and the centre line
export function Street({ line, open = 1, centre = true }: { line: Line; open?: number; centre?: boolean }) {
  const up = segment(line, open)
  const down = segment(line, -open)
  const mid = segment(line, 0)
  return (
    <g>
      {open > 0 && <path d={strip(line, -open, open)} className="fill-sage/15" />}
      {open > 0 &&
        [up, down].map(
          (s, i) =>
            s && <line key={i} {...s} className="stroke-zinc-400 dark:stroke-zinc-200/50" strokeWidth={1.5} strokeDasharray="4 4" />,
        )}
      {centre && mid && <line {...mid} className="stroke-sage" strokeWidth={3} strokeLinecap="round" />}
    </g>
  )
}

// A plain line across the map, with a letter at its top or bottom end
export function Road({ line, name, faint = false, end = 'top' }: { line: Line; name?: string; faint?: boolean; end?: 'top' | 'bottom' }) {
  const s = segment(line, 0)
  if (!s) return null
  const upper = s.y1 < s.y2 ? { x: s.x1, y: s.y1 } : { x: s.x2, y: s.y2 }
  const lower = s.y1 < s.y2 ? { x: s.x2, y: s.y2 } : { x: s.x1, y: s.y1 }
  // On the side the line leans away from, so the letter clears it
  const at =
    end === 'top'
      ? { x: upper.x + (lower.x > upper.x + 1 ? -16 : 8), y: upper.y + 16 }
      : { x: lower.x + (upper.x < lower.x - 1 ? 8 : -16), y: lower.y - 8 }
  return (
    <g>
      <line
        {...s}
        className={faint ? 'stroke-zinc-300 dark:stroke-zinc-200/25' : 'stroke-ink'}
        strokeWidth={faint ? 1.5 : 2}
        strokeLinecap="round"
      />
      {name && (
        <text x={at.x} y={at.y} className="fill-ink font-mono text-[12px]">
          {name}
        </text>
      )}
    </g>
  )
}

// A double arrow across the street, edge to edge, with its width
export function Across({ line, half, text }: { line: Line; half: number; text?: string }) {
  const { at, unit } = across(line)
  const from = { x: at.x - unit.x * half, y: at.y - unit.y * half }
  const to = { x: at.x + unit.x * half, y: at.y + unit.y * half }
  // The label sits just past the arrow's +1 end
  const label = { x: to.x + unit.x * 2, y: to.y + unit.y * 2 }
  const angle = Math.atan2(-(to.y - from.y), to.x - from.x)
  const head = (p: { x: number; y: number }, dir: number) => {
    const a = angle + (dir < 0 ? Math.PI : 0)
    const tip = { x: X(p.x), y: Y(p.y) }
    const back = (da: number) => `${(tip.x - 7 * Math.cos(a + da)).toFixed(1)},${(tip.y - 7 * Math.sin(a + da)).toFixed(1)}`
    return <path d={`M${back(0.45)} L${tip.x.toFixed(1)},${tip.y.toFixed(1)} L${back(-0.45)}`} className="fill-none stroke-ink" strokeWidth={1.5} />
  }
  if (half < 0.3) return null
  return (
    <g>
      <line x1={X(from.x)} y1={Y(from.y)} x2={X(to.x)} y2={Y(to.y)} className="stroke-ink" strokeWidth={1.5} />
      {head(to, 1)}
      {head(from, -1)}
      {text && (
        <text x={X(label.x)} y={Y(label.y) + 4} textAnchor={unit.x >= 0 ? 'start' : 'end'} className="fill-ink font-mono text-[12px] tabular-nums">
          {text}
        </text>
      )}
    </g>
  )
}
