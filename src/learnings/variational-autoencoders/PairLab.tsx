import { Readout } from '../../components/explain/figure'
import { Glyph } from './Glyph'
import { decodePair, LINE, phi, REACH, STRIP, type Balance } from './model'

const WIDTH = 560
const HEIGHT = 230
const X0 = 30
const X1 = 530
const AXIS = 140
// Heights: a density of 1 stands 120 high; taller spikes are cut at the top
const TALL = 120
const CAP = 128
const zx = (z: number) => X0 + ((z + LINE) / (2 * LINE)) * (X1 - X0)
const hy = (density: number) => AXIS - Math.min(CAP, TALL * density)

function bell(mean: number, sd: number): string {
  const points: string[] = []
  for (let z = -LINE; z <= LINE + 1e-9; z += 0.02) points.push(`${points.length ? 'L' : 'M'}${zx(z).toFixed(1)},${hy(phi((z - mean) / sd) / sd).toFixed(1)}`)
  return points.join(' ')
}
const filled = (mean: number, sd: number) => `${bell(mean, sd)} L${zx(LINE)},${AXIS} L${zx(-LINE)},${AXIS} Z`

const two = (v: number) => v.toFixed(2)

// The lab: the bar's codes and the dash's on a line, as a VAE with the best
// decoder balances them for one weight on the KL term, and what the decoder
// draws along the line
export default function PairLab({ balance }: { balance: Balance }) {
  const { mean: m, sd: s } = balance
  const reach = REACH * s
  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`The bar's codes centred at minus ${two(m)} and the dash's at plus ${two(m)}, each with spread ${two(s)}, over the standard normal. Below, what the decoder draws at nine codes from minus 2.4 to 2.4.`}
      >
        <path d={bell(0, 1)} className="fill-none stroke-ink" strokeOpacity={0.6} strokeWidth={1.5} strokeDasharray="5 4" />
        <path d={filled(m, s)} className="fill-ink stroke-ink" fillOpacity={0.12} strokeWidth={1.5} />
        <path d={filled(-m, s)} className="fill-sage stroke-sage" fillOpacity={0.22} strokeWidth={2} />

        {/* Where the decoder has practised: within reach of either blob */}
        {[-m, m].map((c, i) => (
          <rect key={i} x={zx(Math.max(-LINE, c - reach))} y={AXIS - 3} width={zx(Math.min(LINE, c + reach)) - zx(Math.max(-LINE, c - reach))} height={6} rx={3} className="fill-sage" fillOpacity={0.55} />
        ))}
        <line x1={X0} x2={X1} y1={AXIS} y2={AXIS} className="stroke-zinc-300 dark:stroke-zinc-200/25" />

        <g className="font-mono text-[11px]">
          <text x={zx(1.9)} y={AXIS - 22} className="fill-ink stroke-paper" strokeWidth={3} paintOrder="stroke">
            N(0, 1)
          </text>
          <text x={X0} y={16} className="fill-sage-ink">
            bar’s codes
          </text>
          <text x={X1} y={16} textAnchor="end" className="fill-ink">
            dash’s codes
          </text>
          {[-4, 4].map((z) => (
            <text key={z} x={zx(z)} y={AXIS + 16} textAnchor={z < 0 ? 'start' : 'end'} className="fill-zinc-faded">
              {z < 0 ? 'z = −4' : 'z = 4'}
            </text>
          ))}
        </g>

        {/* What the decoder draws along the line */}
        {STRIP.map((z) => {
          const drawn = decodePair(z, m, s)
          return (
            <g key={z}>
              <line x1={zx(z)} x2={zx(z)} y1={AXIS + 3} y2={AXIS + 22} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
              <Glyph pixels={drawn.pixels} x={zx(z) - 15} y={AXIS + 26} cell={6} ring={drawn.practised} />
            </g>
          )
        })}
        <text x={(X0 + X1) / 2} y={HEIGHT - 6} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
          decoded at each code z
        </text>
      </svg>
      <div className="mt-4 flex flex-wrap gap-x-10 gap-y-3">
        <Readout label="Rebuild error" value={two(balance.rebuild)} />
        <Readout label="KL a sketch" value={two(balance.kl)} />
        <Readout label="N(0, 1) codes practised" value={`${Math.round(100 * balance.covered)}%`} accent />
      </div>
    </div>
  )
}
