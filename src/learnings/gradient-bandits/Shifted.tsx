import { meanOf } from '../../components/explain/bandit'
import { lateBest, MACHINES, percent, PULLS, shifted, smooth } from './model'

const WIDTH = 640
const HEIGHT = 260
const LEFT = 44
const RIGHT = 556
const TOP = 12
const BOTTOM = 216
// Pulls averaged together in the lines, so they show the trend
const WINDOW = 15

const x = (pull: number) => LEFT + (pull / (PULLS - 1)) * (RIGHT - LEFT)
const y = (share: number) => BOTTOM - share * (BOTTOM - TOP)

const line = (shares: number[]) =>
  smooth(shares, WINDOW)
    .map((share, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(share).toFixed(1)}`)
    .join(' ')

const endOf = (shares: number[]) => y(smooth(shares, WINDOW).at(-1)!)

// Many machines whose arms all pay about 4: for each pull, the share of
// machines on their best arm, for a learner with the baseline and one
// without, at step `alpha`
export default function Shifted({ alpha }: { alpha: number }) {
  const withBaseline = shifted(alpha, true)
  const without = shifted(alpha, false)
  const rows = [
    ['Best arm, pulls 91–110', (run: typeof without) => meanOf(run.best.slice(90, 110))],
    ['Best arm, last 100 pulls', lateBest],
  ] as const

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`Share of ${MACHINES} machines on their best arm, pull by pull, with and without a baseline`}
      >
        {[0, 0.2, 0.4, 0.6, 0.8, 1].map((share) => (
          <g key={share}>
            <line x1={LEFT} x2={RIGHT} y1={y(share)} y2={y(share)} className="stroke-zinc-200 dark:stroke-zinc-200/10" />
            <text x={LEFT - 8} y={y(share) + 3} textAnchor="end" className="fill-zinc-400 font-mono text-[10px]">
              {percent(share)}
            </text>
          </g>
        ))}
        {[1, 250, 500, 750, 1000].map((pull) => (
          <text key={pull} x={x(pull - 1)} y={BOTTOM + 16} textAnchor="middle" className="fill-zinc-400 font-mono text-[10px]">
            {pull}
          </text>
        ))}
        <text
          x={(LEFT + RIGHT) / 2}
          y={HEIGHT - 6}
          textAnchor="middle"
          className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest"
        >
          Pull
        </text>
        <path d={line(without.best)} fill="none" className="stroke-ink" strokeWidth={2} />
        <path d={line(withBaseline.best)} fill="none" className="stroke-sage" strokeWidth={2} />
        <text x={RIGHT + 8} y={endOf(withBaseline.best) + 3} className="fill-sage font-mono text-[10px] uppercase tracking-widest">
          Baseline
        </text>
        <text x={RIGHT + 8} y={endOf(without.best) + 3} className="fill-ink font-mono text-[10px] uppercase tracking-widest">
          None
        </text>
      </svg>

      <table className="mt-4 w-full text-left">
        <thead>
          <tr className="font-mono text-[0.8rem] uppercase tracking-widest">
            <th className="w-2/5 pb-1 font-normal" />
            <th className="pb-1 font-normal text-sage">Baseline</th>
            <th className="pb-1 font-normal text-ink">None</th>
          </tr>
        </thead>
        <tbody className="font-serif text-3xl font-light tabular-nums">
          {rows.map(([label, measure]) => (
            <tr key={label}>
              <th className="py-1 pr-2 align-middle font-mono text-[0.8rem] font-normal uppercase tracking-widest text-zinc-faded">
                {label}
              </th>
              <td className="py-1 text-sage">{percent(measure(withBaseline))}</td>
              <td className="py-1 text-ink">{percent(measure(without))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
