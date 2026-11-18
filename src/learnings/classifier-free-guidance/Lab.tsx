import { Readout } from '../../components/explain/figure'
import { CENTRES, KINDS, measure, middle, nearest, TAU, type Kind, type Vec } from './model'

const WIDTH = 480
const HEIGHT = 404
const SCALE = 72
const CX = 240
// y = 2.95 at the top of the drawing, −2.3 at the bottom: room for every
// setting's pictures
const TOP = 2.95
const px = (p: Vec) => CX + SCALE * p[0]
const py = (p: Vec) => 12 + SCALE * (TOP - p[1])

const label = 'font-mono text-[11px] uppercase tracking-widest'
const pct = (share: number) => `${Math.round(100 * share)}%`
const signed = (value: number) => `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(2)}`

// Where each kind's name sits, outside its cloud
const NAME_AT: Record<Kind, { dx: number; dy: number; anchor: 'start' | 'end' | 'middle' }> = {
  cat: { dx: -2.3 * TAU * SCALE, dy: 2.3 * TAU * SCALE, anchor: 'start' },
  dog: { dx: 2.3 * TAU * SCALE, dy: 2.3 * TAU * SCALE, anchor: 'end' },
  owl: { dx: 2.2 * TAU * SCALE, dy: -1.6 * TAU * SCALE, anchor: 'start' },
}

// Pictures shrunk to points in the plane: three kinds, each a round cloud
// (rings at one and two spreads from its centre). The dots are the pictures
// the model generated when asked for `kind` at guidance scale `w`, sage when
// they look like that kind, ink when they look like another. The ring marks
// their middle.
export default function Lab({ kind, w, points }: { kind: Kind; w: number; points: Vec[] }) {
  const m = middle(points)
  const result = measure(kind, points)

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`Asked for ${kind} at guidance scale ${w}: ${pct(result.onTarget)} of ${points.length} pictures look like a ${kind}, spread ${result.spread.toFixed(2)} against the real ${kind}s' ${TAU}, and their middle sits ${result.past.toFixed(2)} past the ${kind}s' centre.`}
      >
        {KINDS.map((k) => {
          const c = CENTRES[k]
          const asked = k === kind
          const ring = asked ? 'stroke-sage' : 'stroke-zinc-400'
          const name = NAME_AT[k]
          return (
            <g key={k}>
              <circle cx={px(c)} cy={py(c)} r={TAU * SCALE} className={`fill-none ${ring}`} strokeWidth={1.2} strokeDasharray="3 4" />
              <circle cx={px(c)} cy={py(c)} r={2 * TAU * SCALE} className={`fill-none ${ring}`} strokeWidth={1.2} strokeDasharray="3 4" />
              <path d={`M ${px(c) - 6} ${py(c)} h 12 M ${px(c)} ${py(c) - 6} v 12`} className={asked ? 'stroke-sage' : 'stroke-zinc-400'} strokeWidth={1.5} />
              <text
                x={px(c) + name.dx}
                y={py(c) + name.dy}
                textAnchor={name.anchor}
                className={`${label} stroke-paper ${asked ? 'fill-sage-ink' : 'fill-zinc-faded'}`}
                strokeWidth={3}
                paintOrder="stroke"
              >
                {k}s
              </text>
            </g>
          )
        })}

        {points.map((p, i) => {
          const hit = nearest(p) === kind
          return <circle key={i} cx={px(p)} cy={py(p)} r={3} className={hit ? 'fill-sage' : 'fill-ink'} fillOpacity={hit ? 0.9 : 0.55} />
        })}

        {/* Their middle */}
        <circle cx={px(m)} cy={py(m)} r={8} className="fill-none stroke-ink" strokeWidth={2} />
        <text x={px(m) + 12} y={py(m) + 4} className="fill-ink stroke-paper font-mono text-[11px] uppercase tracking-widest" strokeWidth={3} paintOrder="stroke">
          middle
        </text>
      </svg>
      <div className="mt-4 grid grid-cols-3 gap-x-6 gap-y-4">
        <Readout label="On target" value={pct(result.onTarget)} accent />
        <Readout label="Spread" value={result.spread.toFixed(2)} />
        <Readout label="Past centre" value={signed(result.past)} />
      </div>
    </div>
  )
}
