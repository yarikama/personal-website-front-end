import { useMemo } from 'react'
import { MACHINES, METHODS, played, STEPS, type Start } from './model'

const WIDTH = 520
const LEFT = 62
const RIGHT = 420
const REGRET = { top: 26, bottom: 186 }
const AVERAGE = { top: 236, bottom: 376 }
const HEIGHT = 400
const LOW = -0.2
const HIGH = 1.8

const xOf = (step: number) => LEFT + (step / STEPS) * (RIGHT - LEFT)

// How each method's line is drawn: UCB in green, the others in ink and grey
const STYLE = [
  { className: 'stroke-ink', dash: '5 4', text: 'fill-ink' },
  { className: 'stroke-ink', dash: undefined, text: 'fill-ink' },
  { className: 'stroke-zinc-400', dash: undefined, text: 'fill-zinc-faded' },
  { className: 'stroke-sage', dash: undefined, text: 'fill-sage' },
]

// Labels at the right end of lines, pushed apart so none overlap
function spread(ys: number[], gap = 18): number[] {
  const order = ys.map((y, i) => [y, i] as const).sort((a, b) => a[0] - b[0])
  const placed: number[] = []
  for (const [y] of order) placed.push(placed.length ? Math.max(y, placed[placed.length - 1] + gap) : y)
  const result = [...ys]
  order.forEach(([, i], k) => (result[i] = placed[k]))
  return result
}

// Four ways of exploring on the ten-armed testbed, averaged over many
// machines: the regret summed so far, and the average reward per step so
// far, which is the best arm's mean less regret per step
export default function Testbed({ start }: { start: Start }) {
  const runs = useMemo(() => METHODS.map((_, i) => played(i, start)), [start])
  const best = runs[0].best
  const top = Math.ceil(Math.max(...runs.map((run) => run.regret[STEPS - 1])) / 500) * 500
  const yRegret = (value: number) => REGRET.bottom - (value / top) * (REGRET.bottom - REGRET.top)
  const yAverage = (value: number) =>
    AVERAGE.bottom - ((Math.max(LOW, Math.min(HIGH, value)) - LOW) / (HIGH - LOW)) * (AVERAGE.bottom - AVERAGE.top)
  const every = 10
  const path = (values: number[], y: (value: number) => number) =>
    values
      .flatMap((value, i) =>
        i % every === every - 1 || i === 0 ? [`${i ? 'L' : 'M'}${xOf(i + 1).toFixed(1)},${y(value).toFixed(1)}`] : [],
      )
      .join(' ')
  const averages = runs.map((run) => run.regret.map((regret, i) => best - regret / (i + 1)))
  const regretEnds = spread(runs.map((run) => yRegret(run.regret[STEPS - 1])))
  const averageEnds = spread(averages.map((line) => yAverage(line[STEPS - 1])))
  const regretTicks = [0, top / 2, top]

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`Regret and average reward over ${STEPS} steps on ${MACHINES} ten-armed machines, every estimate starting at ${start}`}
      >
        <text x={LEFT} y={REGRET.top - 12} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
          Regret, summed
        </text>
        {regretTicks.map((value) => (
          <g key={value}>
            <line
              x1={LEFT}
              x2={RIGHT}
              y1={yRegret(value)}
              y2={yRegret(value)}
              className="stroke-zinc-200 dark:stroke-zinc-200/10"
            />
            <text x={LEFT - 8} y={yRegret(value) + 4} textAnchor="end" className="fill-zinc-400 font-mono text-[11px]">
              {value.toLocaleString('en')}
            </text>
          </g>
        ))}
        {runs.map((run, i) => (
          <g key={i}>
            <path
              d={path(run.regret, yRegret)}
              fill="none"
              className={STYLE[i].className}
              strokeDasharray={STYLE[i].dash}
              strokeWidth={i === 3 ? 2.25 : 1.75}
            />
            <text x={RIGHT + 8} y={regretEnds[i] + 4} className={`${STYLE[i].text} font-mono text-[11px]`}>
              {METHODS[i].name}
            </text>
          </g>
        ))}

        <text x={LEFT} y={AVERAGE.top - 12} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
          Average reward so far
        </text>
        {[0, 0.5, 1, 1.5].map((value) => (
          <g key={value}>
            <line
              x1={LEFT}
              x2={RIGHT}
              y1={yAverage(value)}
              y2={yAverage(value)}
              className="stroke-zinc-200 dark:stroke-zinc-200/10"
            />
            <text x={LEFT - 8} y={yAverage(value) + 4} textAnchor="end" className="fill-zinc-400 font-mono text-[11px]">
              {value}
            </text>
          </g>
        ))}
        <line
          x1={LEFT}
          x2={RIGHT}
          y1={yAverage(best)}
          y2={yAverage(best)}
          className="stroke-sage"
          strokeDasharray="2 4"
        />
        <text x={LEFT + 6} y={yAverage(best) - 6} className="fill-sage font-mono text-[11px]">
          best arm, {best.toFixed(2)}
        </text>
        {averages.map((line, i) => (
          <g key={i}>
            <path
              d={path(line, yAverage)}
              fill="none"
              className={STYLE[i].className}
              strokeDasharray={STYLE[i].dash}
              strokeWidth={i === 3 ? 2.25 : 1.75}
            />
            <text x={RIGHT + 8} y={averageEnds[i] + 4} className={`${STYLE[i].text} font-mono text-[11px]`}>
              {METHODS[i].name}
            </text>
          </g>
        ))}
        {[1, 500, 1000, 1500, 2000].map((step) => (
          <text
            key={step}
            x={xOf(step)}
            y={AVERAGE.bottom + 18}
            textAnchor="middle"
            className="fill-zinc-400 font-mono text-[11px]"
          >
            {step.toLocaleString('en')}
          </text>
        ))}
      </svg>

      <table className="mt-4 w-full text-left">
        <thead>
          <tr className="font-mono text-[0.8rem] uppercase tracking-widest text-zinc-faded">
            <th className="w-2/5 pb-1 font-normal" />
            <th className="pb-1 font-normal">Steps 1–1,000</th>
            <th className="pb-1 font-normal">1,001–2,000</th>
          </tr>
        </thead>
        <tbody className="font-serif text-2xl font-light tabular-nums">
          {runs.map((run, i) => (
            <tr key={i} className={i === 3 ? 'text-sage' : 'text-ink'}>
              <th className="py-0.5 pr-2 align-middle font-mono text-[0.8rem] font-normal normal-case tracking-widest text-zinc-faded">
                {METHODS[i].name}
              </th>
              <td className="py-0.5">{Math.round(run.regret[999])}</td>
              <td className="py-0.5">+{Math.round(run.regret[STEPS - 1] - run.regret[999])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
