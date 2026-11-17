import type { ReactNode } from 'react'
import type { Frame } from './frames'
import type { Point } from './model'
import { HEIGHT, sx, sy, WIDTH } from './parkLayout'

// How each group is told apart, with only the site's colours: a filled
// dot, a ring, or a square, in sage or ink
const STYLES = [
  { shape: 'dot', className: 'fill-sage stroke-sage' },
  { shape: 'dot', className: 'fill-ink stroke-ink' },
  { shape: 'ring', className: 'fill-paper stroke-ink' },
  { shape: 'ring', className: 'fill-paper stroke-sage' },
  { shape: 'square', className: 'fill-sage stroke-sage' },
  { shape: 'square', className: 'fill-paper stroke-ink' },
] as const

function Mark({ at, group, size }: { at: Point; group: number | null; size: number }) {
  const [x, y] = [sx(at[0]), sy(at[1])]
  if (group === null) return <circle cx={x} cy={y} r={size} className="fill-zinc-400" />
  const style = STYLES[group % STYLES.length]
  const width = style.shape === 'dot' ? 0 : Math.max(1.6, size / 2.6)
  if (style.shape === 'square') {
    const half = size * 0.9
    return <rect x={x - half} y={y - half} width={2 * half} height={2 * half} rx={1.5} strokeWidth={width} className={style.className} />
  }
  return <circle cx={x} cy={y} r={style.shape === 'ring' ? size - width / 2 : size} strokeWidth={width} className={style.className} />
}

// The points, a line from each to its centre, and the centres: a large
// mark of the group's own kind, inside an ink ring
export default function Scatter({
  points,
  frame,
  label,
  children,
}: {
  points: readonly Point[]
  frame: Frame
  label: string
  children?: ReactNode
}) {
  const { centres, labels, ends, grown } = frame
  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={label}>
      {ends && (
        <g className="stroke-zinc-300 dark:stroke-zinc-200/25" strokeWidth={1}>
          {points.map((p, i) => (
            <line
              key={i}
              x1={sx(p[0])}
              y1={sy(p[1])}
              x2={sx(p[0] + (ends[i][0] - p[0]) * grown)}
              y2={sy(p[1] + (ends[i][1] - p[1]) * grown)}
            />
          ))}
        </g>
      )}
      {points.map((p, i) => (
        <Mark key={i} at={p} group={labels ? labels[i] : null} size={4.2} />
      ))}
      {centres.map((c, l) => (
        <g key={l}>
          <circle cx={sx(c[0])} cy={sy(c[1])} r={14} className="fill-paper stroke-ink" strokeWidth={2.5} />
          <Mark at={c} group={l} size={7} />
        </g>
      ))}
      {children}
    </svg>
  )
}
