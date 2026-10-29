import { Readout } from '../../components/explain/figure'
import type { Order } from './board'
import { evaluation, ORDER_NAMES, ORDERS } from './model'

const WIDTH = 600
const HEIGHT = 250
const LEFT = 74
const RIGHT = 580
const TOP = 16
const BOTTOM = 214
const MOST = 40
// Biggest changes from 1 down to 0.0001, on a log scale
const HIGH = 0.2
const LOW = -4

const xOf = (sweep: number) => LEFT + (sweep / MOST) * (RIGHT - LEFT)
const yOf = (delta: number) => TOP + ((HIGH - Math.log10(Math.max(delta, 1e-4))) / (HIGH - LOW)) * (BOTTOM - TOP)

// The biggest change in each sweep, for the three ways of sweeping, each
// until it falls under θ; the chosen way drawn in green
export default function Deltas({ theta, order }: { theta: number; order: Order }) {
  const chosen = evaluation(theta, order)
  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`The biggest change in each sweep, falling on a log scale until it is under ${theta}, for three ways of sweeping`}
      >
        {[1, 0.1, 0.01, 0.001, 0.0001].map((delta) => (
          <g key={delta}>
            <line
              x1={LEFT}
              x2={RIGHT}
              y1={yOf(delta)}
              y2={yOf(delta)}
              className="stroke-zinc-200 dark:stroke-zinc-200/10"
            />
            <text x={LEFT - 8} y={yOf(delta) + 4} textAnchor="end" className="fill-zinc-400 font-mono text-[11px]">
              {delta < 0.001 ? '10⁻⁴' : delta}
            </text>
          </g>
        ))}
        {[0, 10, 20, 30, 40].map((sweep) => (
          <text
            key={sweep}
            x={xOf(sweep)}
            y={BOTTOM + 18}
            textAnchor="middle"
            className="fill-zinc-400 font-mono text-[11px]"
          >
            {sweep}
          </text>
        ))}
        <text
          x={RIGHT}
          y={HEIGHT - 2}
          textAnchor="end"
          className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest"
        >
          sweeps
        </text>
        <line x1={LEFT} x2={RIGHT} y1={yOf(theta)} y2={yOf(theta)} className="stroke-ink" strokeDasharray="5 4" />
        <text x={RIGHT} y={yOf(theta) - 6} textAnchor="end" className="fill-ink font-mono text-[11px]">
          θ = {theta}
        </text>
        {ORDERS.map((way) => {
          const { passes } = evaluation(theta, way)
          const points = passes.slice(1).map((pass, i) => `${xOf(i + 1).toFixed(1)},${yOf(pass.delta).toFixed(1)}`)
          const mine = way === order
          const end = passes.length - 1
          return (
            <g key={way}>
              <polyline
                points={points.join(' ')}
                fill="none"
                className={mine ? 'stroke-sage' : 'stroke-zinc-400'}
                strokeWidth={mine ? 2.5 : 1.25}
                opacity={mine ? 1 : 0.7}
              />
              <circle
                cx={xOf(end)}
                cy={yOf(passes[end].delta)}
                r={mine ? 4.5 : 3}
                className={mine ? 'fill-sage' : 'fill-zinc-400'}
              />
            </g>
          )
        })}
      </svg>
      <div className="mt-4 flex flex-wrap gap-x-10 gap-y-3">
        <Readout label={`${ORDER_NAMES[order]}: sweeps`} value={chosen.sweeps} accent />
        <Readout label="Furthest off, when it stops" value={chosen.error.toFixed(chosen.error < 0.01 ? 4 : 3)} />
      </div>
    </div>
  )
}
