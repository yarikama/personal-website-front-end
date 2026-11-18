import { chanceReal, HEAVIEST, LIGHTEST, nudgeOf, type Cashier, type Loss } from './model'

// The line every figure on the page draws: the cashier's curve on top, the
// forger's fakes in sixteen lanes (one each, so a bunch of coins of one
// weight shows as a column), the axis, and the real coins stacked under it.
const WIDTH = 480
const HEIGHT = 362
const LEFT = 30
const PER_GRAM = 35
const CURVE_TOP = 22
const CURVE_BOTTOM = 108
const LANE_TOP = 136
const LANE = 8
const AXIS = 278
const STACK = 9
const RING = 4
// Arrows are drawn this many times as long as the nudge, to be seen
const ARROW_SCALE = 2.5

const xOf = (g: number) => LEFT + (g - LIGHTEST) * PER_GRAM
const yOf = (chance: number) => CURVE_BOTTOM - chance * (CURVE_BOTTOM - CURVE_TOP)

// The real coins as a dot plot: each in a bin of a dot's width, stacked down
function stacked(real: number[]) {
  const bin = (2 * RING + 1) / PER_GRAM
  const counts = new Map<number, number>()
  return real.map((g) => {
    const k = Math.round(g / bin)
    const row = counts.get(k) ?? 0
    counts.set(k, row + 1)
    return { x: xOf(k * bin), y: AXIS + 11 + row * STACK }
  })
}

function curvePath(cashier: Cashier) {
  const points: string[] = []
  for (let i = 0; i <= 120; i++) {
    const g = LIGHTEST + ((HEAVIEST - LIGHTEST) * i) / 120
    points.push(`${i === 0 ? 'M' : 'L'}${xOf(g).toFixed(1)},${yOf(chanceReal(cashier, g)).toFixed(1)}`)
  }
  return points.join(' ')
}

export type Names = 'coins' | 'gan'

export default function Coins({
  real,
  fakes,
  cashier,
  nudges,
  names = 'coins',
  label,
}: {
  real: number[]
  fakes: number[]
  // No cashier yet: the curve's panel stays empty
  cashier: Cashier | null
  // Draw each fake's next nudge under this loss
  nudges?: Loss
  names?: Names
  label: string
}) {
  const gan = names === 'gan'
  const ticks = [0, 2, 4, 6, 8, 10, 12]
  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={label}>
      {/* The cashier's panel */}
      <text x={LEFT} y={12} className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
        {gan ? 'Discriminator D(x): chance real' : 'Cashier: chance a coin is real'}
      </text>
      {[0, 0.5, 1].map((c) => (
        <g key={c}>
          <line
            x1={LEFT}
            x2={xOf(HEAVIEST)}
            y1={yOf(c)}
            y2={yOf(c)}
            className="stroke-zinc-300 dark:stroke-zinc-200/25"
            strokeDasharray={c === 0.5 ? '4 4' : undefined}
          />
          <text x={LEFT - 4} y={yOf(c) + 3.5} textAnchor="end" className="fill-zinc-faded font-mono text-[10px]">
            {c === 0.5 ? '½' : c}
          </text>
        </g>
      ))}
      {cashier && <path d={curvePath(cashier)} className="fill-none stroke-ink" strokeWidth={2} />}

      {/* The fakes, one lane each */}
      <text x={xOf(HEAVIEST)} y={LANE_TOP - 9} textAnchor="end" className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
        {gan ? 'Generator’s fakes G(z)' : 'Your fakes'}
      </text>
      {fakes.map((g, i) => {
        const x = xOf(g)
        const y = LANE_TOP + i * LANE
        const reach = cashier && nudges ? nudgeOf(cashier, g, nudges) * PER_GRAM * ARROW_SCALE : 0
        const head = Math.sign(reach) * 4
        return (
          <g key={i}>
            {Math.abs(reach) > 2 && (
              <path
                d={`M${x + Math.sign(reach) * RING},${y} L${x + reach},${y} M${x + reach - head},${y - 3} L${x + reach},${y} L${x + reach - head},${y + 3}`}
                className="fill-none stroke-ink"
                strokeWidth={1.3}
                strokeOpacity={0.75}
              />
            )}
            <circle cx={x} cy={y} r={RING} className="fill-paper stroke-ink" strokeWidth={1.5} />
          </g>
        )
      })}

      {/* The axis and the real coins under it */}
      <line x1={LEFT} x2={xOf(HEAVIEST)} y1={AXIS} y2={AXIS} className="stroke-zinc-400" />
      {stacked(real).map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={RING} className="fill-sage" />
      ))}
      <text x={LEFT} y={AXIS + 14} className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
        {gan ? 'Real data x' : 'Real coins'}
      </text>
      {ticks.map((g) => (
        <g key={g}>
          <line x1={xOf(g)} x2={xOf(g)} y1={AXIS - 3} y2={AXIS + 3} className="stroke-zinc-400" />
          <text x={xOf(g)} y={HEIGHT - 6} textAnchor="middle" className="fill-zinc-faded font-mono text-[10px]">
            {g === HEAVIEST ? `${g} g` : g}
          </text>
        </g>
      ))}
    </svg>
  )
}
