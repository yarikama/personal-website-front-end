import { usePlay } from '../../components/explain/useLoop'
import { DEPTH, size } from './model'

// How big each layer's outputs are in a 20-layer toy network, without batch
// normalization (ink) and with it (sage), on a scale where each gridline is
// ten times the one below. Layers draw in one after another.
const WIDTH = 460
const HEIGHT = 270
const LEFT = 44
const RIGHT = 330
const TOP = 30
const BOTTOM = 230
const LOW = -3 // 0.001
const HIGH = 2 // 100

const caps = 'font-mono text-[11px] uppercase tracking-widest'
const mono = 'font-mono text-[11px] tabular-nums'
const halo = { className: 'fill-ink stroke-paper', strokeWidth: 3, paintOrder: 'stroke' as const }

const xOf = (layer: number) => LEFT + ((layer - 1) / (DEPTH - 1)) * (RIGHT - LEFT)
const yOf = (value: number) => {
  const v = Math.max(LOW, Math.min(HIGH, Math.log10(value)))
  return BOTTOM - ((v - LOW) / (HIGH - LOW)) * (BOTTOM - TOP)
}
const DECADES = ['0.001', '0.01', '0.1', '1', '10', '100']

function Series({
  values,
  count,
  labelY,
  className,
  name,
}: {
  values: number[]
  count: number
  labelY: number
  className: { stroke: string; fill: string }
  name: string
}) {
  const points = values.slice(0, count).map((v, i) => `${xOf(i + 1)},${yOf(v)}`)
  const last = values[count - 1]
  return (
    <g>
      <polyline points={points.join(' ')} className={`fill-none ${className.stroke}`} strokeWidth={2} />
      {values.slice(0, count).map((v, i) => (
        <circle key={i} cx={xOf(i + 1)} cy={yOf(v)} r={3.5} className={className.fill} />
      ))}
      <text x={xOf(count) + 9} y={labelY + 4} {...halo} className={`${halo.className} ${mono}`}>
        {count === values.length ? `${name} ${size(last)}` : size(last)}
      </text>
    </g>
  )
}

export function Stack({ without, withNorm }: { without: number[]; withNorm: number[] }) {
  const shown = usePlay(DEPTH, 70)
  const count = Math.max(1, Math.min(DEPTH, Math.floor(shown)))
  // Keep the two end labels apart when the lines end close together
  let a = yOf(without[count - 1])
  let b = yOf(withNorm[count - 1])
  const apart = 14 - Math.abs(a - b)
  if (apart > 0) {
    const push = (apart / 2) * (a <= b ? 1 : -1)
    a -= push
    b += push
  }
  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="How big each layer's numbers are, layer by layer, with and without batch normalization">
      <text x={LEFT} y={16} className={`fill-zinc-faded ${caps}`}>
        Typical size of a layer’s outputs
      </text>
      {DECADES.map((label, i) => {
        const y = yOf(10 ** (LOW + i))
        return (
          <g key={label}>
            <line x1={LEFT} x2={RIGHT} y1={y} y2={y} className="stroke-zinc-300" strokeWidth={1} strokeDasharray={label === '1' ? undefined : '2 4'} />
            <text x={LEFT - 6} y={y + 4} textAnchor="end" className={`fill-zinc-faded ${mono}`}>
              {label}
            </text>
          </g>
        )
      })}
      {[1, 5, 10, 15, 20].map((layer) => (
        <text key={layer} x={xOf(layer)} y={BOTTOM + 18} textAnchor="middle" className={`fill-zinc-faded ${mono}`}>
          {layer}
        </text>
      ))}
      <text x={(LEFT + RIGHT) / 2} y={BOTTOM + 36} textAnchor="middle" className={`fill-zinc-faded ${caps}`}>
        Layer
      </text>
      <Series values={without} count={count} labelY={a} className={{ stroke: 'stroke-ink', fill: 'fill-ink' }} name="without" />
      <Series values={withNorm} count={count} labelY={b} className={{ stroke: 'stroke-sage', fill: 'fill-sage' }} name="with BN" />
    </svg>
  )
}
