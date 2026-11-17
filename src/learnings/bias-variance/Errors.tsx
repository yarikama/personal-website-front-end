import { DEGREES, type Terms } from './model'

const WIDTH = 360
const HEIGHT = 250
const LEFT = 34
const RIGHT = 284
const TOP = 12
const BOTTOM = 206
const MOST = 0.7
const TICKS = [0, 0.2, 0.4, 0.6]
// Labels at the right-hand end may sit no closer than this
const GAP = 14

const x = (degree: number) => LEFT + (degree / (DEGREES.length - 1)) * (RIGHT - LEFT)
const y = (error: number) => BOTTOM - (Math.min(error, MOST) / MOST) * (BOTTOM - TOP)

interface Series {
  name: string
  value: (t: Terms) => number
  line: string
  text: string
  width: number
  dash?: string
}

const SERIES: Series[] = [
  { name: 'test', value: (t) => t.test, line: 'stroke-ink', text: 'fill-ink', width: 2.5 },
  { name: 'training', value: (t) => t.train, line: 'stroke-ink', text: 'fill-ink', width: 1.5, dash: '5 4' },
  { name: 'bias²', value: (t) => t.bias2, line: 'stroke-sage', text: 'fill-sage-ink', width: 2.5 },
  { name: 'variance', value: (t) => t.variance, line: 'stroke-sage', text: 'fill-sage-ink', width: 2, dash: '6 4' },
  { name: 'noise', value: (t) => t.noise, line: 'stroke-zinc-400', text: 'fill-zinc-faded', width: 1.5, dash: '1 4' },
]

// Spread the end labels apart: from the top down, then back up from the bottom
function dodge(ys: number[]) {
  const order = ys.map((_, i) => i).sort((a, b) => ys[a] - ys[b])
  const placed = [...ys]
  for (let k = 1; k < order.length; k++) placed[order[k]] = Math.max(placed[order[k]], placed[order[k - 1]] + GAP)
  const last = order.at(-1)!
  if (placed[last] > BOTTOM + 4) placed[last] = BOTTOM + 4
  for (let k = order.length - 2; k >= 0; k--) placed[order[k]] = Math.min(placed[order[k]], placed[order[k + 1]] - GAP)
  return placed
}

// The error on new points and on the sample's own, with bias², variance and
// noise, at every degree; the chosen degree is marked
export default function Errors({ terms, degree }: { terms: Terms[]; degree: number }) {
  const ends = SERIES.map((s) => y(s.value(terms[terms.length - 1])))
  const labels = dodge(ends)
  const now = terms[degree]
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      role="img"
      aria-label={`Errors against degree, 0 to 9. At degree ${degree}: error on new points ${now.test.toFixed(2)}, bias squared ${now.bias2.toFixed(2)}, variance ${now.variance.toFixed(2)}, training error ${now.train.toFixed(2)}.`}
    >
      {TICKS.map((tick) => (
        <g key={tick}>
          <line x1={LEFT} x2={RIGHT} y1={y(tick)} y2={y(tick)} className="stroke-zinc-300 dark:stroke-zinc-200/20" strokeWidth={tick === 0 ? 1.25 : 0.75} />
          <text x={LEFT - 6} y={y(tick) + 4} textAnchor="end" className="fill-zinc-faded font-mono text-[11px] tabular-nums">
            {tick === 0 ? '0' : tick.toFixed(1)}
          </text>
        </g>
      ))}
      {DEGREES.map((d) => (
        <text key={d} x={x(d)} y={BOTTOM + 17} textAnchor="middle" className={`font-mono text-[11px] tabular-nums ${d === degree ? 'fill-ink' : 'fill-zinc-faded'}`}>
          {d}
        </text>
      ))}
      <text x={(LEFT + RIGHT) / 2} y={BOTTOM + 38} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
        degree
      </text>
      <line x1={x(degree)} x2={x(degree)} y1={TOP} y2={BOTTOM} className="stroke-zinc-400" strokeWidth={1} />

      {SERIES.map((s, i) => (
        <g key={s.name}>
          <polyline
            points={terms.map((t, d) => `${x(d).toFixed(1)},${y(s.value(t)).toFixed(1)}`).join(' ')}
            fill="none"
            className={s.line}
            strokeWidth={s.width}
            strokeDasharray={s.dash}
            strokeLinejoin="round"
          />
          {Math.abs(labels[i] - ends[i]) > 3 && (
            <line x1={RIGHT + 2} x2={RIGHT + 8} y1={ends[i]} y2={labels[i]} className="stroke-zinc-400" strokeWidth={0.75} />
          )}
          <text x={RIGHT + 10} y={labels[i] + 4} className={`${s.text} font-mono text-[11px]`}>
            {s.name}
          </text>
        </g>
      ))}

      {SERIES.slice(0, 4).map((s) => (
        <circle
          key={s.name}
          cx={x(degree)}
          cy={y(s.value(now))}
          r={4}
          className={s.line === 'stroke-sage' ? 'fill-sage' : 'fill-ink'}
        />
      ))}
    </svg>
  )
}
