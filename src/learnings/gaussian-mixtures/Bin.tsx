import type { ReactNode } from 'react'
import { lerp } from '../../components/explain/useLoop'
import { boundaries, density, type Component, type Mixture } from './model'

const WIDTH = 560
const HEIGHT = 292
const LEFT = 30
const RIGHT = 530
// The weights along the axis, in grams
const LOW = 50
const HIGH = 110
const AXIS = 236
// Bells and stacks stay below this; labels go above
const TOP = 58

const x = (grams: number) => LEFT + ((Math.max(LOW - 1, Math.min(HIGH + 1, grams)) - LOW) / (HIGH - LOW)) * (RIGHT - LEFT)
const COLUMN = (RIGHT - LEFT) / (HIGH - LOW)

// Each component's look, by its place in the mixture
const STROKE = ['stroke-sage', 'stroke-ink', 'stroke-zinc-400']
const FILL = ['fill-sage', 'fill-ink', 'fill-zinc-400']
const TEXT = ['fill-sage-ink', 'fill-ink', 'fill-zinc-faded']

// Where each point sits: its one-gram column and how high in the stack, in
// the order the points arrive. Worked out once per set of points.
const stacked = new WeakMap<number[], { column: number; level: number; tallest: number }[]>()
function stacksOf(xs: number[]) {
  let found = stacked.get(xs)
  if (!found) {
    const counts = new Map<number, number>()
    const placed = xs.map((v) => {
      const column = Math.floor(Math.max(LOW, Math.min(HIGH - 0.001, v)))
      const level = counts.get(column) ?? 0
      counts.set(column, level + 1)
      return { column, level, tallest: 0 }
    })
    const tallest = Math.max(...counts.values())
    found = placed.map((p) => ({ ...p, tallest }))
    stacked.set(xs, found)
  }
  return found
}

// A bell scaled to the stacks: how many points it expects in each one-gram
// column, times the height of one point
function bellPath(c: Component, n: number, unit: number) {
  const low = Math.max(LOW, c.mean - 4.5 * c.sd)
  const high = Math.min(HIGH, c.mean + 4.5 * c.sd)
  if (high <= low) return ''
  const steps = 160
  const points = Array.from({ length: steps + 1 }, (_, i) => {
    const g = low + ((high - low) * i) / steps
    const y = Math.max(TOP, AXIS - n * c.weight * density(g, c) * unit)
    return `L${x(g).toFixed(1)},${y.toFixed(1)}`
  })
  return `M${x(low).toFixed(1)},${AXIS} ${points.join(' ')} L${x(high).toFixed(1)},${AXIS}`
}

// The bin of croissants: the weight axis, each croissant a small block
// stacked in its one-gram column, split left to right by its shares in the
// components (`shares`, faded in by `shading`), and the components' bells
// over them, labelled with `tags`. `hard` draws k-means instead: each
// centre as a line and the halfway boundaries between them, no bells.
// `shown` is how many croissants have arrived. `marker` picks out one
// weight and each bell's height over it.
export default function Bin({
  xs,
  shown = xs.length,
  shares,
  shading = 1,
  mixture,
  hard = false,
  tags = [],
  marker,
  label,
  children,
}: {
  xs: number[]
  shown?: number
  shares?: number[][] | null
  shading?: number
  mixture?: Mixture | null
  hard?: boolean
  tags?: string[]
  marker?: number | null
  label: string
  children?: ReactNode
}) {
  const stacks = stacksOf(xs)
  const tallest = stacks[0]?.tallest ?? 1
  const unit = Math.min(10, (AXIS - TOP - 16) / tallest)
  const n = xs.length

  // Labels in a band above the stacks, over each centre, a row higher when
  // two would meet
  const labels = (mixture ?? []).map((c, k) => ({ k, at: x(c.mean), y: TOP - 8 }))
  const order = [...labels].sort((a, b) => a.at - b.at)
  for (let i = 1; i < order.length; i++) {
    if (order[i].at - order[i - 1].at < 170 && order[i].y === order[i - 1].y) order[i].y = order[i - 1].y - 18
  }

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={label}>
      {/* The weights */}
      <line x1={LEFT} x2={RIGHT} y1={AXIS} y2={AXIS} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
      {Array.from({ length: (HIGH - LOW) / 10 + 1 }, (_, i) => LOW + 10 * i).map((g) => (
        <g key={g}>
          <line x1={x(g)} x2={x(g)} y1={AXIS} y2={AXIS + 5} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
          <text x={x(g)} y={AXIS + 19} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px] tabular-nums">
            {g}
          </text>
        </g>
      ))}
      <text x={(LEFT + RIGHT) / 2} y={AXIS + 40} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
        croissant weight, grams
      </text>

      {/* The croissants */}
      {xs.slice(0, Math.ceil(shown)).map((v, i) => {
        const { column, level } = stacks[i]
        const left = x(column) + 0.75
        const width = COLUMN - 1.5
        const top = AXIS - (level + 1) * unit + 0.5
        const height = Math.max(1, unit - 1)
        const arriving = i === Math.floor(shown) ? shown - i : 1
        const y = lerp(TOP - 20, top, Math.min(1, arriving * 1.4))
        const split = shares?.[i]
        let from = left
        return (
          <g key={i}>
            <rect x={left} y={y} width={width} height={height} rx={1} className="fill-ink" fillOpacity={0.25} />
            {split && shading > 0 &&
              split.map((s, k) => {
                const w = s * width
                const at = from
                from += w
                return w > 0.05 ? <rect key={k} x={at} y={y} width={w} height={height} className={FILL[k]} opacity={shading} /> : null
              })}
          </g>
        )
      })}

      {/* The bells, or k-means' centres and boundaries */}
      {mixture &&
        !hard &&
        mixture.map((c, k) => (
          <path key={k} d={bellPath(c, n, unit)} className={`fill-none ${STROKE[k]}`} strokeWidth={2.25} strokeLinejoin="round" />
        ))}
      {mixture && hard && (
        <g>
          {boundaries(mixture.map((c) => c.mean)).map((b, i) => (
            <line key={`b${i}`} x1={x(b)} x2={x(b)} y1={TOP} y2={AXIS} className="stroke-zinc-400" strokeDasharray="4 4" />
          ))}
          {mixture.map((c, k) => (
            <line key={k} x1={x(c.mean)} x2={x(c.mean)} y1={TOP} y2={AXIS} className={STROKE[k]} strokeWidth={2.25} />
          ))}
        </g>
      )}
      {mixture &&
        labels.map(({ k, at, y }) =>
          tags[k] ? (
            <text key={k} x={Math.max(LEFT + 50, Math.min(RIGHT - 50, at))} y={y} textAnchor="middle" className={`font-mono text-[12px] tabular-nums ${TEXT[k]}`}>
              {tags[k]}
            </text>
          ) : null,
        )}

      {/* One croissant picked out, and each bell's height over it */}
      {marker && (
        <g>
          <line x1={x(marker)} x2={x(marker)} y1={TOP + 4} y2={AXIS} className="stroke-zinc-400" strokeDasharray="2 3" />
          {(mixture ?? []).map((c, k) => (
            <circle key={k} cx={x(marker)} cy={AXIS - n * c.weight * density(marker, c) * unit} r={4.5} className={`${FILL[k]} ${STROKE[k]}`} />
          ))}
        </g>
      )}
      {children}
    </svg>
  )
}

// A line above the drawing: what it shows on the left, a number on the right
export function Header({ title, note }: { title: string; note?: ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-4 font-mono text-[0.875rem] uppercase tracking-widest">
      <span className="shrink-0 text-zinc-faded">{title}</span>
      {note && <span className="text-right text-zinc-faded">{note}</span>}
    </div>
  )
}
