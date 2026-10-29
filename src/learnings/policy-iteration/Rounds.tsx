import { Readout } from '../../components/explain/figure'
import { signed } from '../../components/explain/ladders'
import { bestValues, judged, JUDGE, type Judge } from '../../components/explain/planning'

const WIDTH = 600
const HEIGHT = 250
const LEFT = 52
const RIGHT = 580
const TOP = 16
const BOTTOM = 214
const MOST = 80
const LOW = -10

const xOf = (sweeps: number) => LEFT + (Math.min(sweeps, MOST) / MOST) * (RIGHT - LEFT)
const yOf = (value: number) => TOP + (value / LOW) * (BOTTOM - TOP)

const name = (judge: Judge) => (judge === 'settled' ? 'until settled' : `${judge} sweep${judge === 1 ? '' : 's'}`)

// Square 1's value, sweep by sweep, as evaluation and improvement take
// turns: for each way of judging, a line; a dot wherever an improvement
// switched some square's move. The chosen way in green.
export default function Rounds({ judge }: { judge: Judge }) {
  const best = bestValues()[0]
  const chosen = judged(judge)
  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`Square 1's value over the sweeps, judging ${name(judge)} between improvements; every way ends on ${signed(best, 2)}`}
      >
        {[0, -2, -4, -6, -8, -10].map((value) => (
          <g key={value}>
            <line
              x1={LEFT}
              x2={RIGHT}
              y1={yOf(value)}
              y2={yOf(value)}
              className="stroke-zinc-200 dark:stroke-zinc-200/10"
            />
            <text x={LEFT - 8} y={yOf(value) + 4} textAnchor="end" className="fill-zinc-400 font-mono text-[11px]">
              {signed(value, 0)}
            </text>
          </g>
        ))}
        {[0, 20, 40, 60, 80].map((sweeps) => (
          <text
            key={sweeps}
            x={xOf(sweeps)}
            y={BOTTOM + 18}
            textAnchor="middle"
            className="fill-zinc-400 font-mono text-[11px]"
          >
            {sweeps}
          </text>
        ))}
        <text
          x={RIGHT}
          y={HEIGHT - 2}
          textAnchor="end"
          className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest"
        >
          sweeps
        </text>
        <line x1={LEFT} x2={RIGHT} y1={yOf(best)} y2={yOf(best)} className="stroke-ink" strokeDasharray="5 4" />
        <text x={RIGHT} y={yOf(best) - 6} textAnchor="end" className="fill-ink font-mono text-[11px]">
          best play, {signed(best, 2)}
        </text>
        {JUDGE.map((way) => {
          const { points } = judged(way)
          const mine = way === judge
          return (
            <g key={way}>
              <polyline
                points={points.map((p) => `${xOf(p.sweeps).toFixed(1)},${yOf(p.start).toFixed(1)}`).join(' ')}
                fill="none"
                className={mine ? 'stroke-sage' : 'stroke-zinc-400'}
                strokeWidth={mine ? 2.5 : 1.25}
                opacity={mine ? 1 : 0.6}
              />
              {mine &&
                points
                  .filter((p) => p.switched)
                  .map((p) => (
                    <circle key={p.sweeps} cx={xOf(p.sweeps)} cy={yOf(p.start)} r={4.5} className="fill-sage" />
                  ))}
            </g>
          )
        })}
      </svg>
      <div className="mt-4 flex flex-wrap gap-x-10 gap-y-3">
        <Readout label="Sweeps in all" value={chosen.sweeps} accent />
        <Readout label="Improvements that switched" value={chosen.switches} />
        <Readout label="Square 1 ends on" value={signed(chosen.points.at(-1)!.start, 2)} />
      </div>
    </div>
  )
}
