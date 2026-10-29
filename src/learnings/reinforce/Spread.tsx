import { useMemo } from 'react'
import { Readout } from '../../components/explain/figure'
import { seeded } from '../../components/explain/random'
import { usePlay } from '../../components/explain/useLoop'
import { estimates, expected, fresh, gradient, mean, RIGHT, spread, SPREAD_SEED, TOP } from '../../components/explain/lunchHill'

const WIDTH = 560
const HEIGHT = 170
const LEFT = 24
const RIGHT_EDGE = 536
const LOW = -5
const HIGH = 5
const BAND = [34, 116]
export const DOTS = 120

const x = (value: number) => LEFT + ((Math.max(LOW, Math.min(HIGH, value)) - LOW) / (HIGH - LOW)) * (RIGHT_EDGE - LEFT)

// Many walks' estimates of one slope, at even habits: how J changes as the
// top fork's habit for turning right grows. Each dot is one estimate, from
// one walk or the average of ten, with or without the usual subtracted.
// The line is the true slope, from the policy gradient theorem.
export default function Spread({ baseline, each }: { baseline: boolean; each: number }) {
  const habits = useMemo(() => fresh(), [])
  const truth = gradient(habits)[TOP][RIGHT]
  const usual = expected(habits)
  const values = useMemo(() => estimates(habits, baseline ? usual : 0, DOTS, each, SPREAD_SEED), [habits, baseline, usual, each])
  const heights = useMemo(() => {
    const random = seeded(5)
    return values.map(() => BAND[0] + random() * (BAND[1] - BAND[0]))
  }, [values])
  const shown = Math.floor(usePlay(DOTS, 25))
  const seen = values.slice(0, Math.max(1, shown))

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`${DOTS} estimates of the slope at the top fork, ${baseline ? 'with' : 'without'} the usual subtracted, around the true slope`}
      >
        {[-4, -2, 0, 2, 4].map((tick) => (
          <g key={tick}>
            <line x1={x(tick)} x2={x(tick)} y1={BAND[0] - 8} y2={BAND[1] + 8} className="stroke-zinc-200 dark:stroke-zinc-200/10" />
            <text x={x(tick)} y={BAND[1] + 26} textAnchor="middle" className="fill-zinc-400 font-mono text-[12px]">
              {tick > 0 ? `+${tick}` : tick < 0 ? `−${-tick}` : '0'}
            </text>
          </g>
        ))}
        {seen.map((value, i) => (
          <circle key={i} cx={x(value)} cy={heights[i]} r={4} className="fill-ink" opacity={0.45} />
        ))}
        <line x1={x(truth)} x2={x(truth)} y1={BAND[0] - 16} y2={BAND[1] + 8} className="stroke-sage" strokeWidth={2.5} />
        <text x={x(truth)} y={BAND[0] - 21} textAnchor="middle" className="fill-sage font-mono text-[12px] uppercase tracking-widest">
          True slope
        </text>
        <text x={WIDTH / 2} y={HEIGHT - 4} textAnchor="middle" className="fill-zinc-faded font-mono text-[12px] uppercase tracking-widest">
          One estimate of the slope
        </text>
      </svg>
      <div className="mt-4 flex flex-wrap gap-x-10 gap-y-3">
        <Readout label="True slope" value={truth.toFixed(2)} accent />
        <Readout label={`Average of ${seen.length}`} value={mean(seen).toFixed(2)} />
        <Readout label="Spread" value={`±${spread(seen).toFixed(2)}`} />
      </div>
    </div>
  )
}
