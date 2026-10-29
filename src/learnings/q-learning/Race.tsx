import { useMemo } from 'react'
import { curves, lateWet, MORNINGS, RUNS } from './model'

const WIDTH = 640
const HEIGHT = 250
const LEFT = 44
const RIGHT = 560
const TOP = 16
const BOTTOM = 210
const LOW = -60

const x = (morning: number) => LEFT + (morning / (MORNINGS - 1)) * (RIGHT - LEFT)
const y = (total: number) => TOP + (Math.min(0, Math.max(LOW, total)) / LOW) * (BOTTOM - TOP)
const path = (totals: number[]) => totals.map((total, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(total).toFixed(1)}`).join(' ')
const percent = (share: number) => `${(share * 100).toFixed(1)}%`

// What each morning scored, averaged over many learners of each kind, still
// stepping at random one time in `epsilon`: minutes walked, and −100 for a
// morning that ends in the river
export default function Race({ epsilon }: { epsilon: number }) {
  const sarsa = useMemo(() => curves('sarsa', epsilon), [epsilon])
  const q = useMemo(() => curves('q', epsilon), [epsilon])
  const ends = { sarsa: y(sarsa.totals.at(-1)!), q: y(q.totals.at(-1)!) }
  const gap = Math.max(0, 14 - Math.abs(ends.sarsa - ends.q)) / 2
  const sarsaAbove = ends.sarsa <= ends.q

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`What each morning scored, averaged over ${RUNS} learners of each kind: Sarsa ends near ${Math.round(sarsa.totals.at(-1)!)}, Q-learning near ${Math.round(q.totals.at(-1)!)}`}
      >
        {[0, -20, -40, -60].map((total) => (
          <g key={total}>
            <line x1={LEFT} x2={RIGHT} y1={y(total)} y2={y(total)} className="stroke-zinc-200 dark:stroke-zinc-200/10" />
            <text x={LEFT - 8} y={y(total) + 4} textAnchor="end" className="fill-zinc-400 font-mono text-[11px]">
              {total === 0 ? 0 : `−${-total}`}
            </text>
          </g>
        ))}
        {[1, 100, 200, 300, 400, 500].map((morning) => (
          <text key={morning} x={x(morning - 1)} y={BOTTOM + 18} textAnchor="middle" className="fill-zinc-400 font-mono text-[11px]">
            {morning}
          </text>
        ))}
        <text x={LEFT} y={HEIGHT - 4} className="fill-zinc-400 font-mono text-[11px] uppercase tracking-widest">
          Morning
        </text>
        <path d={path(sarsa.totals)} fill="none" className="stroke-ink" strokeWidth={1.75} />
        <path d={path(q.totals)} fill="none" className="stroke-sage" strokeWidth={2} />
        <text x={RIGHT + 8} y={ends.sarsa + 4 + (sarsaAbove ? -gap : gap)} className="fill-ink font-mono text-[11px] uppercase tracking-widest">
          Sarsa
        </text>
        <text x={RIGHT + 8} y={ends.q + 4 + (sarsaAbove ? gap : -gap)} className="fill-sage font-mono text-[11px] uppercase tracking-widest">
          Q
        </text>
      </svg>

      <table className="mt-4 w-full text-left">
        <thead>
          <tr className="font-mono text-[0.8rem] uppercase tracking-widest">
            <th className="w-2/5 pb-1 font-normal" />
            <th className="pb-1 font-normal text-ink">Sarsa</th>
            <th className="pb-1 font-normal text-sage">Q-learning</th>
          </tr>
        </thead>
        <tbody className="font-serif text-3xl font-light tabular-nums">
          <tr>
            <th className="py-1 pr-2 align-middle font-mono text-[0.8rem] font-normal uppercase tracking-widest text-zinc-faded">
              Wet, last 100 mornings
            </th>
            <td className="py-1 text-ink">{percent(lateWet(sarsa.wet))}</td>
            <td className="py-1 text-sage">{percent(lateWet(q.wet))}</td>
          </tr>
          <tr>
            <th className="py-1 pr-2 align-middle font-mono text-[0.8rem] font-normal uppercase tracking-widest text-zinc-faded">
              Average score, last 100
            </th>
            <td className="py-1 text-ink">{(sarsa.totals.slice(-100).reduce((a, b) => a + b, 0) / 100).toFixed(1).replace('-', '−')}</td>
            <td className="py-1 text-sage">{(q.totals.slice(-100).reduce((a, b) => a + b, 0) / 100).toFixed(1).replace('-', '−')}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
