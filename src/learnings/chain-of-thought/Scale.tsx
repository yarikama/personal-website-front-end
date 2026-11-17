import { PRIOR_SUPERVISED, SCALE } from './model'

// Each model Wei et al. tried, one row: the share of GSM8K word problems it
// solved answering at once (hollow) and writing a chain of thought first
// (sage), joined by the change.

const WIDTH = 600
const LEFT = 132
const RIGHT = 548
const TOP = 78
const ROW = 30
// A gap between the two families
const GAP = 14
const MOST = 60

const x = (share: number) => LEFT + (share / MOST) * (RIGHT - LEFT)
const rowY = (i: number) => TOP + i * ROW + (SCALE[i].family === 'PaLM' ? GAP : 0)
const HEIGHT = rowY(SCALE.length - 1) + 52
const label = 'fill-zinc-faded font-mono text-[11px] uppercase tracking-widest'

const signed = (change: number) => `${change >= 0 ? '+' : '−'}${Math.abs(change).toFixed(1)}`

export default function Scale() {
  const bottom = rowY(SCALE.length - 1) + 16
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      role="img"
      aria-label={`Share of grade-school word problems solved, answering at once and with a chain of thought: ${SCALE.map(
        (r) => `${r.family} ${r.size}, ${r.standard}% then ${r.cot}%`
      ).join('; ')}.`}
    >
      {/* Key */}
      <circle cx={LEFT + 6} cy={16} r={6} className="fill-paper stroke-ink" strokeWidth={1.5} />
      <text x={LEFT + 18} y={20} className={label}>
        Answer at once
      </text>
      <circle cx={LEFT + 196} cy={16} r={6} className="fill-sage" />
      <text x={LEFT + 208} y={20} className={label}>
        Chain of thought
      </text>

      {/* Scale */}
      {[0, 20, 40, 60].map((share) => (
        <g key={share}>
          <line x1={x(share)} x2={x(share)} y1={TOP - 14} y2={bottom} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
          <text x={x(share)} y={bottom + 16} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px]">
            {share}%
          </text>
        </g>
      ))}
      <line
        x1={x(PRIOR_SUPERVISED)}
        x2={x(PRIOR_SUPERVISED)}
        y1={TOP - 14}
        y2={bottom}
        className="stroke-ink"
        strokeOpacity={0.5}
        strokeDasharray="3 4"
      />
      <text x={x(PRIOR_SUPERVISED) + 8} y={TOP - 24} textAnchor="end" className={label}>
        Fine-tuned best {PRIOR_SUPERVISED}%
      </text>

      {SCALE.map((row, i) => {
        const y = rowY(i)
        const gain = row.cot > row.standard
        return (
          <g key={`${row.family}${row.size}`}>
            <text x={LEFT - 14} y={y + 4} textAnchor="end" className="fill-ink font-mono text-[12px]">
              {row.family} {row.size}
            </text>
            <line
              x1={x(row.standard)}
              x2={x(row.cot)}
              y1={y}
              y2={y}
              className={gain ? 'stroke-sage' : 'stroke-ink'}
              strokeOpacity={gain ? 1 : 0.5}
              strokeWidth={3}
            />
            <circle cx={x(row.standard)} cy={y} r={6} className="fill-paper stroke-ink" strokeWidth={1.5} />
            <circle cx={x(row.cot)} cy={y} r={6} className="fill-sage" />
            <text
              x={x(Math.max(row.standard, row.cot)) + 12}
              y={y + 4}
              className={`${gain ? 'fill-sage-ink' : 'fill-ink'} font-mono text-[11px]`}
            >
              {signed(row.cot - row.standard)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
