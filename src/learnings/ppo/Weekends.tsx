import { usePlay } from '../../components/explain/useLoop'
import { BEST, shares, SHOWN_RUNS, WEEKENDS, type Summary } from './model'

const WIDTH = 560
const HEIGHT = 300
const LEFT = 52
const RIGHT = 540
const TOP = 38
const BOTTOM = 254

const x = (weekend: number) => LEFT + (weekend / WEEKENDS) * (RIGHT - LEFT)
const y = (share: number) => BOTTOM - share * (BOTTOM - TOP)

function path(values: number[], upTo: number) {
  const whole = Math.floor(upTo)
  const points = values.slice(0, whole + 1).map((v, w) => `${w ? 'L' : 'M'}${x(w).toFixed(1)},${y(v).toFixed(1)}`)
  if (whole < values.length - 1 && upTo > whole) {
    const v = values[whole] + (values[whole + 1] - values[whole]) * (upTo - whole)
    points.push(`L${x(upTo).toFixed(1)},${y(v).toFixed(1)}`)
  }
  return points.join(' ')
}

// Many busking runs, weekend by weekend: how much of each run's set is the
// waltz, the best song. Faint lines are single runs; the sage line is the
// average over all of them. It plays out once; give it a `key` to replay.
export default function Weekends({ summary }: { summary: Summary }) {
  const played = usePlay(WEEKENDS, 140)
  const runs = summary.runs.slice(0, SHOWN_RUNS).map((run) => run.setlists.map((prefs) => shares(prefs)[BEST]))
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      role="img"
      aria-label={`The waltz's share of the set over ${WEEKENDS} weekends, for ${SHOWN_RUNS} runs and their average, which ends at ${Math.round(100 * summary.waltz.at(-1)!)}%`}
    >
      {[0, 0.25, 0.5, 0.75, 1].map((share) => (
        <g key={share}>
          <line x1={LEFT} x2={RIGHT} y1={y(share)} y2={y(share)} className="stroke-zinc-300 dark:stroke-zinc-200/25" strokeDasharray={share === 0 ? undefined : '2 4'} />
          <text x={LEFT - 8} y={y(share) + 4} textAnchor="end" className="fill-zinc-400 font-mono text-[11px] tabular-nums">
            {Math.round(100 * share)}%
          </text>
        </g>
      ))}
      {[0, 5, 10, 15, 20].map((w) => (
        <text key={w} x={x(w)} y={BOTTOM + 18} textAnchor="middle" className="fill-zinc-400 font-mono text-[11px]">
          {w}
        </text>
      ))}
      <text x={(LEFT + RIGHT) / 2} y={BOTTOM + 40} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
        weekends
      </text>
      <text x={LEFT} y={14} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
        the waltz’s share of the set
      </text>

      {runs.map((values, i) => (
        <path key={i} d={path(values, played)} className="fill-none stroke-ink" strokeWidth={1} opacity={0.14} />
      ))}
      <path d={path(summary.waltz, played)} className="fill-none stroke-sage" strokeWidth={3} />
    </svg>
  )
}
