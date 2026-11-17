import { leaves, nodes, type Box, type Node, type Point, type Tree } from './model'

export const PLANE_W = 400
export const PLANE_H = 300
const LEFT = 44
const RIGHT = 388
const TOP = 12
const BOTTOM = 258

interface Line {
  feature: number
  threshold: number
}

// Labelled points on two features, and what a tree makes of them: each
// leaf's box shaded by what it predicts (sage: the filled class), each
// question a line across the box it splits. The newest question in sage;
// `trying` a dashed line for one being tried.
export default function Plane({
  points,
  box,
  tree,
  newest,
  trying,
  ringed = [],
  names,
  ticks,
  curve,
  dot = 4,
  shade = true,
  drawn = 1,
  label,
}: {
  points: Point[]
  box: Box
  tree?: Tree
  newest?: Node[]
  trying?: Line
  ringed?: number[]
  names: [string, string]
  ticks: [number[], number[]]
  curve?: (x1: number) => number
  dot?: number
  shade?: boolean
  // How far the newest lines have drawn in, 0 to 1
  drawn?: number
  label: string
}) {
  const sx = (v: number) => LEFT + ((v - box[0][0]) / (box[0][1] - box[0][0])) * (RIGHT - LEFT)
  const sy = (v: number) => BOTTOM - ((v - box[1][0]) / (box[1][1] - box[1][0])) * (BOTTOM - TOP)
  const regions = shade && tree && tree.kind === 'node' ? leaves(tree) : []
  const questions = tree ? nodes(tree) : []
  const across = (line: Line, within: Box) =>
    line.feature === 0
      ? { x1: sx(line.threshold), x2: sx(line.threshold), y1: sy(within[1][0]), y2: sy(within[1][1]) }
      : { x1: sx(within[0][0]), x2: sx(within[0][1]), y1: sy(line.threshold), y2: sy(line.threshold) }
  const path =
    curve &&
    Array.from({ length: 101 }, (_, i) => {
      const v = box[0][0] + ((box[0][1] - box[0][0]) * i) / 100
      return `${i ? 'L' : 'M'}${sx(v).toFixed(1)},${sy(Math.min(box[1][1], curve(v))).toFixed(1)}`
    }).join(' ')

  return (
    <svg viewBox={`0 0 ${PLANE_W} ${PLANE_H}`} className="w-full" role="img" aria-label={label}>
      {regions.map(({ box: b, label: l }, i) => (
        <rect
          key={i}
          x={sx(b[0][0])}
          y={sy(b[1][1])}
          width={sx(b[0][1]) - sx(b[0][0])}
          height={sy(b[1][0]) - sy(b[1][1])}
          className={l === 1 ? 'fill-sage/20' : 'fill-zinc-400/20'}
        />
      ))}
      <rect x={LEFT} y={TOP} width={RIGHT - LEFT} height={BOTTOM - TOP} className="fill-none stroke-zinc-300 dark:stroke-zinc-200/25" />
      {ticks[0].map((v) => (
        <text key={`x${v}`} x={sx(v)} y={BOTTOM + 15} textAnchor="middle" className="fill-zinc-faded font-mono text-[10px]">
          {v}
        </text>
      ))}
      {ticks[1].map((v) => (
        <text key={`y${v}`} x={LEFT - 6} y={sy(v) + 3.5} textAnchor="end" className="fill-zinc-faded font-mono text-[10px]">
          {v}
        </text>
      ))}
      <text x={(LEFT + RIGHT) / 2} y={PLANE_H - 6} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
        {names[0]}
      </text>
      <text
        transform={`translate(12 ${(TOP + BOTTOM) / 2}) rotate(-90)`}
        textAnchor="middle"
        className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest"
      >
        {names[1]}
      </text>
      {path && <path d={path} className="fill-none stroke-zinc-400" strokeWidth={1.5} strokeDasharray="5 4" />}
      {questions.map((node, i) => {
        const fresh = newest?.includes(node)
        const { x1, y1, x2, y2 } = across(node.split, node.box)
        const k = fresh ? drawn : 1
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x1 + (x2 - x1) * k}
            y2={y1 + (y2 - y1) * k}
            className={fresh ? 'stroke-sage' : 'stroke-ink'}
            strokeWidth={fresh ? 2.5 : 1.5}
          />
        )
      })}
      {trying && <line {...across(trying, box)} className="stroke-ink" strokeWidth={1.5} strokeDasharray="4 4" />}
      {points.map((p, i) =>
        p.y === 1 ? (
          <circle key={i} cx={sx(p.x[0])} cy={sy(p.x[1])} r={dot} className="fill-sage stroke-paper" strokeWidth={1} />
        ) : (
          <circle key={i} cx={sx(p.x[0])} cy={sy(p.x[1])} r={dot - 0.6} className="fill-paper stroke-ink" strokeWidth={1.4} />
        ),
      )}
      {ringed.map((i) => (
        <circle
          key={`ring${i}`}
          cx={sx(points[i].x[0])}
          cy={sy(points[i].x[1])}
          r={dot + 6}
          className="fill-none stroke-sage"
          strokeWidth={2}
        />
      ))}
    </svg>
  )
}
