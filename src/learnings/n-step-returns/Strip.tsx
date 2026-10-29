import { seeded } from '../../components/explain/random'
import { COLUMNS, showN, STRIP_HIKES, STRIP_NS, TRUE } from './model'

const WIDTH = 460
const HEIGHT = 270
const LEFT = 44
const RIGHT = 450
const TOP = 14
const BOTTOM = 200
const LOWEST = 60
const HIGHEST = 330


const y = (minutes: number) => BOTTOM - ((Math.min(HIGHEST, Math.max(LOWEST, minutes)) - LOWEST) / (HIGHEST - LOWEST)) * (BOTTOM - TOP)
const column = (i: number) => LEFT + 30 + i * ((RIGHT - LEFT - 60) / (STRIP_NS.length - 1))
const signed = (value: number) => `${value < 0 ? '−' : '+'}${Math.abs(Math.round(value))}`

// The trailhead's n-step returns from 150 hikes for each n, as dots: the
// true value as a line, each n's average as a bar. One leg sits tight
// under the line; the whole way scatters around it.
export default function Strip() {
  const jitter = seeded(99)
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      role="img"
      aria-label={`Returns for the trailhead from ${STRIP_HIKES} hikes each, for n from 1 to all the way, with every chalk mark a fifth too low. ${COLUMNS.map((c) => `n ${showN(c.n)}: off by ${signed(c.mean - TRUE[0])}, spread ${Math.round(c.sd)}`).join('; ')}.`}
    >
      {[100, 150, 200, 250, 300].map((minutes) => (
        <g key={minutes}>
          <line x1={LEFT} x2={RIGHT} y1={y(minutes)} y2={y(minutes)} className="stroke-zinc-300 dark:stroke-zinc-200/25" strokeWidth={0.5} />
          <text x={LEFT - 6} y={y(minutes) + 3} textAnchor="end" className="fill-zinc-400 font-mono text-[10px]">
            {minutes}
          </text>
        </g>
      ))}

      {COLUMNS.map(({ n, returns, mean }, i) => (
        <g key={n}>
          {returns.map((value, k) => (
            <circle key={k} cx={column(i) + (jitter() - 0.5) * 26} cy={y(value)} r={2} className="fill-sage" opacity={0.45} />
          ))}
          <line x1={column(i) - 18} x2={column(i) + 18} y1={y(mean)} y2={y(mean)} className="stroke-ink" strokeWidth={2.5} />
        </g>
      ))}

      <line x1={LEFT} x2={RIGHT} y1={y(TRUE[0])} y2={y(TRUE[0])} className="stroke-ink" strokeDasharray="5 4" strokeWidth={1} />
      <text x={RIGHT} y={y(TRUE[0]) - 5} textAnchor="end" className="fill-ink font-mono text-[10px]">
        true {Math.round(TRUE[0])}
      </text>

      {/* Under each column: its n, how far off its average is, and its spread */}
      <text x={LEFT - 6} y={BOTTOM + 20} textAnchor="end" className="fill-zinc-400 font-mono text-[10px] uppercase">
        n
      </text>
      <text x={LEFT - 6} y={BOTTOM + 40} textAnchor="end" className="fill-zinc-400 font-mono text-[10px] uppercase">
        off
      </text>
      <text x={LEFT - 6} y={BOTTOM + 60} textAnchor="end" className="fill-zinc-400 font-mono text-[10px] uppercase">
        ±
      </text>
      {COLUMNS.map(({ n, mean, sd }, i) => (
        <g key={n} className="font-mono text-[11px] tabular-nums">
          <text x={column(i)} y={BOTTOM + 20} textAnchor="middle" className="fill-ink">
            {showN(n)}
          </text>
          <text x={column(i)} y={BOTTOM + 40} textAnchor="middle" className="fill-ink">
            {signed(mean - TRUE[0])}
          </text>
          <text x={column(i)} y={BOTTOM + 60} textAnchor="middle" className="fill-sage">
            {Math.round(sd)}
          </text>
        </g>
      ))}
    </svg>
  )
}
