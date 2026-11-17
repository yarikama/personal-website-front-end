import { curbFoot, lineOf, type Point, type Road } from './model'
import { px, py, UNIT } from './fieldScale'

// The pieces the story and the lab are drawn with

// The street: a sage band between two curbs, its centre line dashed. Wider
// than any view, and clipped by the SVG's edges.
export function Street({ road }: { road: Road }) {
  if (road.half <= 0.001) return null
  const [nx, ny] = [Math.cos(road.angle), Math.sin(road.angle)]
  const x = px(road.offset * nx)
  const y = py(road.offset * ny)
  // Along the street, in the SVG, where up is down
  const turn = (Math.atan2(-nx, -ny) * 180) / Math.PI
  const half = road.half * UNIT
  return (
    <g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${turn.toFixed(3)})`} className="pointer-events-none">
      <rect x={-1200} y={-half} width={2400} height={2 * half} className="fill-sage/15" />
      <line x1={-1200} x2={1200} y1={-half} y2={-half} className="stroke-sage" strokeWidth={1.5} />
      <line x1={-1200} x2={1200} y1={half} y2={half} className="stroke-sage" strokeWidth={1.5} />
      <line x1={-1200} x2={1200} y1={0} y2={0} className="stroke-sage" strokeWidth={2} strokeDasharray="10 7" />
    </g>
  )
}

// A centre line on its own, dashed, for a line to compare against
export function Ghost({ road }: { road: Road }) {
  const [nx, ny] = [Math.cos(road.angle), Math.sin(road.angle)]
  const turn = (Math.atan2(-nx, -ny) * 180) / Math.PI
  return (
    <g
      transform={`translate(${px(road.offset * nx).toFixed(2)} ${py(road.offset * ny).toFixed(2)}) rotate(${turn.toFixed(3)})`}
      className="pointer-events-none"
    >
      <line x1={-1200} x2={1200} y1={0} y2={0} className="stroke-zinc-400" strokeWidth={1.5} strokeDasharray="3 5" />
    </g>
  )
}

// A house: hollow for West (−1), filled for East (+1)
export function House({ p, ring = false, grow = 1 }: { p: Point; ring?: boolean; grow?: number }) {
  return (
    <g transform={`translate(${px(p.x1).toFixed(2)} ${py(p.x2).toFixed(2)}) scale(${grow})`} className="pointer-events-none">
      {ring && <circle r={15} className="fill-none stroke-sage" strokeWidth={2} />}
      <path
        d="M-6.5,6.5 V-1 L0,-7.5 L6.5,-1 V6.5 Z"
        className={p.y === 1 ? 'fill-ink stroke-ink' : 'fill-paper stroke-ink'}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </g>
  )
}

// A point of the lab: a hollow or filled dot
export function Dot({ p, ring = false }: { p: Point; ring?: boolean }) {
  return (
    <g className="pointer-events-none">
      {ring && <circle cx={px(p.x1)} cy={py(p.x2)} r={13} className="fill-none stroke-sage" strokeWidth={2} />}
      <circle
        cx={px(p.x1)}
        cy={py(p.x2)}
        r={5.5}
        className={p.y === 1 ? 'fill-ink stroke-ink' : 'fill-paper stroke-ink'}
        strokeWidth={1.5}
      />
    </g>
  )
}

// A point's slack: a stroke from the point to the curb on its own side,
// with its size beside it, beyond the point
export function Toll({ road, p, label }: { road: Road; p: Point; label?: string }) {
  const [fx, fy] = curbFoot(lineOf(road), p)
  const x = px(p.x1)
  const y = py(p.x2)
  const dx = x - px(fx)
  const dy = y - py(fy)
  const length = Math.hypot(dx, dy)
  if (length < 0.5) return null
  // Beyond the point, clear of its ring, reading away from the stroke
  const lx = x + (dx / length) * 20
  const ly = y + (dy / length) * 20 + 4
  return (
    <g className="pointer-events-none">
      <line x1={x} y1={y} x2={px(fx)} y2={py(fy)} className="stroke-ink" strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={px(fx)} cy={py(fy)} r={3} className="fill-ink" />
      {label && (
        <text
          x={lx}
          y={ly}
          textAnchor={Math.abs(dx) < Math.abs(dy) ? 'middle' : dx > 0 ? 'start' : 'end'}
          className="fill-ink stroke-paper font-mono text-[12px] tabular-nums"
          strokeWidth={4}
          strokeLinejoin="round"
          style={{ paintOrder: 'stroke' }}
        >
          {label}
        </text>
      )}
    </g>
  )
}
