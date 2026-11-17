import { tokenName, WIDTH } from './layout'
import { chanceOfHop, chanceText, fraction, oneIn, type Hop } from './model'

const ROW = 26
const TOP = 16
const BAR_X = 150
const BAR_W = 90

// One hop's label: "with → milk" in the story, P(milk | with) once named
function hopLabel(hop: Hop, named: boolean) {
  const next = tokenName(hop.next, named)
  if (!named) return `${hop.context.map((t) => tokenName(t, false)).join(' ')} → ${next}`
  return hop.context.length === 0 ? `P(${next})` : `P(${next} | ${hop.context.join(' ')})`
}

// A sentence, hop by hop: each next token's chance after its context, as a
// count over a count and a bar, then the whole sentence's chance, their
// product. `shown` hops are drawn so far (fractional while one grows).
export default function Hops({
  hops,
  shown = Infinity,
  named,
  label,
}: {
  hops: Hop[]
  shown?: number
  named: boolean
  label: string
}) {
  const height = TOP + hops.length * ROW + 44
  const done = shown >= hops.length
  const p = hops.reduce((q, hop) => q * chanceOfHop(hop), 1)
  const small = p > 0 && p < 0.001
  return (
    <svg viewBox={`0 0 ${WIDTH} ${height}`} className="w-full" role="img" aria-label={label}>
      {hops.map((hop, i) => {
        if (i >= Math.ceil(shown)) return null
        const grow = Math.min(1, shown - i)
        const y = TOP + i * ROW
        const q = chanceOfHop(hop)
        return (
          <g key={i}>
            <text x={0} y={y + 4} className="fill-ink font-mono text-[11px]">
              {hopLabel(hop, named)}
            </text>
            <rect x={BAR_X} y={y - 6} width={BAR_W} height={12} rx={3} className="fill-zinc-200 dark:fill-zinc-300" />
            <rect x={BAR_X} y={y - 6} width={BAR_W * q * grow} height={12} rx={3} className="fill-sage" />
            <text x={WIDTH} y={y + 4} textAnchor="end" className="fill-ink font-mono text-[11px] tabular-nums">
              {hop.count}/{hop.of}
            </text>
          </g>
        )
      })}
      {done && (
        <g>
          <text x={0} y={TOP + hops.length * ROW + 14} className="fill-ink font-mono text-[11px] uppercase tracking-widest">
            {named ? 'P(order)' : 'Whole order'}
          </text>
          <text
            x={WIDTH}
            y={TOP + hops.length * ROW + 14}
            textAnchor="end"
            className={`${p > 0 ? 'fill-sage-ink' : 'fill-ink'} font-mono text-[13px] tabular-nums`}
          >
            {p === 0 ? '0' : small ? chanceText(p) : `${fraction(p)} ≈ ${oneIn(p)}`}
          </text>
        </g>
      )}
    </svg>
  )
}
