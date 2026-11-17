import { Readout } from '../../components/explain/figure'
import { explained } from './model'

const WIDTH = 560
const HEIGHT = 230
const LEFT = 44
const RIGHT = 540
const TOP = 34
const BOTTOM = 190

function pct(share: number) {
  const whole = Math.round(100 * share)
  if (whole === 100 && share < 1 - 1e-12) return '≈100%'
  if (whole === 0 && share > 1e-12) return '<1%'
  return `${whole}%`
}

// How much of all the variance each component carries, largest first, and
// the running total, with the first k kept
// `error` shows what is missed as the sum of the dropped variances too
export default function Components({ values, keep, error }: { values: number[]; keep: number; error: boolean }) {
  const shares = explained(values)
  const slot = (RIGHT - LEFT) / values.length
  const y = (share: number) => BOTTOM - share * (BOTTOM - TOP)
  const keptShare = shares[keep - 1].cumulative
  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`The share of all the variance each of ${values.length} components carries: ${shares.map((s, i) => `component ${i + 1}, ${pct(s.share)}`).join('; ')}. Keeping ${keep} keeps ${pct(keptShare)}.`}
      >
        {[0, 0.5, 1].map((s) => (
          <g key={s}>
            <line x1={LEFT} x2={RIGHT} y1={y(s)} y2={y(s)} className="stroke-zinc-300 dark:stroke-zinc-200/25" strokeDasharray={s ? '2 4' : undefined} />
            <text x={LEFT - 8} y={y(s) + 4} textAnchor="end" className="fill-zinc-faded font-mono text-[11px]">
              {pct(s)}
            </text>
          </g>
        ))}
        {/* The running total */}
        <path
          d={shares.map((s, i) => `${i ? 'L' : 'M'}${(LEFT + slot * (i + 0.5)).toFixed(1)},${y(s.cumulative).toFixed(1)}`).join(' ')}
          className="fill-none stroke-zinc-400"
          strokeWidth={1.5}
        />
        {shares.map((s, i) => {
          const x = LEFT + slot * i
          const on = i < keep
          return (
            <g key={i}>
              <rect
                x={x + slot * 0.2}
                y={y(s.share)}
                width={slot * 0.6}
                height={Math.max(0, BOTTOM - y(s.share))}
                rx={4}
                className={on ? 'fill-sage' : 'fill-ink'} fillOpacity={on ? 1 : 0.15}
              />
              <circle cx={x + slot / 2} cy={y(s.cumulative)} r={3.5} className={on ? 'fill-ink' : 'fill-paper stroke-zinc-400'} strokeWidth={1.5} />
              <text x={x + slot / 2} y={y(s.cumulative) - 9} textAnchor="middle" className={`font-mono text-[11px] tabular-nums ${on ? 'fill-ink' : 'fill-zinc-faded'}`}>
                {pct(s.cumulative)}
              </text>
              <text x={x + slot / 2} y={BOTTOM + 18} textAnchor="middle" className={`font-mono text-[11px] uppercase tracking-widest ${on ? 'fill-ink' : 'fill-zinc-faded'}`}>
                PC {i + 1}
              </text>
              <text x={x + slot / 2} y={BOTTOM + 34} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px] tabular-nums">
                {pct(s.share)}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
        <Readout label={`Kept by ${keep}`} value={pct(keptShare)} accent />
        <Readout label="Missed" value={pct(1 - keptShare)} />
        {error && <Readout label="Error, Σ dropped" value={values.slice(keep).reduce((a, b) => a + b, 0).toFixed(2)} />}
      </div>
    </div>
  )
}
