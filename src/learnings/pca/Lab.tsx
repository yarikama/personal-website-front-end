import { useRef, type PointerEvent } from 'react'
import { Readout } from '../../components/explain/figure'
import { covariance, eigen2, kept, mean, missed, total, unit, type Vec } from './model'

const WIDTH = 560
const HEIGHT = 330
const CX = 280
const CY = 165
const SCALE = 13
const REACH = 11.5

const one = (value: number) => value.toFixed(2)

// A cloud of points the reader stretches and tilts, a line through its
// middle they turn (drag anywhere on the drawing, or use the slider), each
// point's shadow on that line and its gap to it, and the first principal
// component, dashed, for comparison.
export default function Lab({ points, angle, onAngle }: { points: Vec[]; angle: number; onAngle: (angle: number) => void }) {
  const drawing = useRef<SVGSVGElement>(null)
  const middle = mean(points)
  const cov = covariance(points)
  const { values, angle: best } = eigen2(cov)
  const u = unit(angle)
  const v = unit(best)
  const keptNow = kept(points, u)
  const missedNow = missed(points, [u])
  const all = total(cov)

  const px = (p: Vec) => CX + SCALE * (p[0] - middle[0])
  const py = (p: Vec) => CY - SCALE * (p[1] - middle[1])
  const at = (dir: Vec, t: number): Vec => [middle[0] + t * dir[0], middle[1] + t * dir[1]]

  // Turn the line toward wherever the pointer is
  const aim = (event: PointerEvent<SVGSVGElement>) => {
    const svg = drawing.current
    const matrix = svg?.getScreenCTM()
    if (!svg || !matrix) return
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
    const dx = point.x - CX
    const dy = CY - point.y
    if (Math.hypot(dx, dy) < 6) return
    const degrees = (((Math.atan2(dy, dx) * 180) / Math.PI) % 180 + 180) % 180
    onAngle(Math.round(degrees))
  }

  return (
    <div>
      <svg
        ref={drawing}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full cursor-grab touch-none select-none"
        role="img"
        aria-label={`${points.length} points. Your line at ${Math.round(angle)} degrees keeps a variance of ${one(keptNow)} and misses ${one(missedNow)}, of ${one(all)} in all. The first principal component is at ${Math.round(best)} degrees and keeps ${one(values[0])}.`}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId)
          aim(event)
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) aim(event)
        }}
      >
        <rect width={WIDTH} height={HEIGHT} className="fill-transparent" />
        <line x1={CX - SCALE * REACH * 1.6} x2={CX + SCALE * REACH * 1.6} y1={CY} y2={CY} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
        <line x1={CX} x2={CX} y1={CY - SCALE * REACH} y2={CY + SCALE * REACH} className="stroke-zinc-300 dark:stroke-zinc-200/25" />

        {/* Each point's gap to its shadow */}
        {points.map((p, i) => {
          const t = (p[0] - middle[0]) * u[0] + (p[1] - middle[1]) * u[1]
          const foot = at(u, t)
          return <line key={i} x1={px(p)} y1={py(p)} x2={px(foot)} y2={py(foot)} className="stroke-zinc-400" strokeWidth={0.8} />
        })}

        {/* The first principal component */}
        <line x1={px(at(v, -REACH))} y1={py(at(v, -REACH))} x2={px(at(v, REACH))} y2={py(at(v, REACH))} className="stroke-sage" strokeWidth={1.5} strokeDasharray="6 5" />
        <text x={px(at(v, REACH)) + (v[0] >= 0 ? 6 : -6)} y={py(at(v, REACH)) - 6} textAnchor={v[0] >= 0 ? 'start' : 'end'} className="fill-sage-ink font-mono text-[11px] uppercase tracking-widest">
          PC 1
        </text>

        {/* Your line */}
        <line x1={px(at(u, -REACH))} y1={py(at(u, -REACH))} x2={px(at(u, REACH))} y2={py(at(u, REACH))} className="stroke-ink" strokeWidth={1.5} />
        <circle cx={px(at(u, REACH))} cy={py(at(u, REACH))} r={8} className="fill-paper stroke-ink" strokeWidth={1.5} />

        {points.map((p, i) => (
          <circle key={i} cx={px(p)} cy={py(p)} r={2.4} className="fill-ink" />
        ))}
        {points.map((p, i) => {
          const t = (p[0] - middle[0]) * u[0] + (p[1] - middle[1]) * u[1]
          const foot = at(u, t)
          return <circle key={i} cx={px(foot)} cy={py(foot)} r={2.2} className="fill-sage" />
        })}
      </svg>
      <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
        <Readout label="Kept" value={one(keptNow)} accent />
        <Readout label="Missed" value={one(missedNow)} />
        <Readout label="Total" value={one(all)} />
        <Readout label="PC 1 keeps" value={one(values[0])} />
      </div>
    </div>
  )
}
