import { border, MAP_SIDE, type Point } from './model'

const SIZE = 300
const CELL = SIZE / MAP_SIDE
const toX = (x: number) => ((x + 1) / 2) * SIZE
const toY = (y: number) => ((1 - y) / 2) * SIZE

// The true border as a path across the square
const BORDER = Array.from({ length: 61 }, (_, i) => {
  const x = -1 + (i / 60) * 2
  return `${i === 0 ? 'M' : 'L'} ${toX(x).toFixed(1)} ${toY(border(x)).toFixed(1)}`
}).join(' ')

// A network's answer over the square: sage where it says the sage kind (the
// surer, the deeper), a faint ink wash where it says the other. The dashed
// line is the true border. Points, if given, are the training set: sage or
// ink by the label they were given, ringed when that label is wrong.
export default function Regions({ grid, points, label }: { grid: number[]; points?: Point[]; label: string }) {
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full rounded-xl" role="img" aria-label={label}>
      <rect width={SIZE} height={SIZE} className="fill-paper" />
      {grid.map((c, i) => {
        const sage = c > 0.5
        const sure = Math.abs(c - 0.5) * 2
        return (
          <rect
            key={i}
            x={(i % MAP_SIDE) * CELL}
            y={Math.floor(i / MAP_SIDE) * CELL}
            width={CELL}
            height={CELL}
            shapeRendering="crispEdges"
            className={sage ? 'fill-sage' : 'fill-ink'}
            fillOpacity={sage ? 0.12 + 0.43 * sure : 0.03 + 0.1 * sure}
          />
        )
      })}
      <path d={BORDER} className="fill-none stroke-ink" strokeOpacity={0.7} strokeWidth={1.5} strokeDasharray="5 4" />
      {points?.map((pt, i) => (
        <g key={i}>
          {pt.label !== pt.truth && <circle cx={toX(pt.x)} cy={toY(pt.y)} r={10} className="fill-none stroke-ink" strokeWidth={1.5} />}
          <circle
            cx={toX(pt.x)}
            cy={toY(pt.y)}
            r={5.5}
            className={`${pt.label ? 'fill-sage' : 'fill-ink'} stroke-paper`}
            strokeWidth={1.5}
          />
        </g>
      ))}
      <rect width={SIZE} height={SIZE} rx={12} className="fill-none stroke-zinc-300 dark:stroke-zinc-200/25" />
    </svg>
  )
}
