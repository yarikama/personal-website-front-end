import { useMemo } from 'react'
import { Readout } from '../../components/explain/figure'
import { usePlay } from '../../components/explain/useLoop'
import { actorAt, bestDial, criticAt, learn, LEARNER, missedBy, toDial, toUnit } from './model'

const WIDTH = 480
const HEIGHT = 262
const LEFT = 44
const RIGHT = 470
const TOP = 12
const BOTTOM = 236
const COLUMNS = 24
const ROWS = 20
// Milliseconds a snapshot while it plays
const PACE = 50

const x = (cold: number) => LEFT + cold * (RIGHT - LEFT)
const y = (dial: number) => BOTTOM - (dial / 100) * (BOTTOM - TOP)
const line = (dialAt: (cold: number) => number) =>
  Array.from({ length: 21 }, (_, i) => `${i ? 'L' : 'M'} ${x(i / 20).toFixed(1)} ${y(dialAt(i / 20)).toFixed(1)}`).join(' ')

// The learner across every kind of morning: across, how cold the morning
// is; up, the setting. Shading is the critic's guess (darker sage, better),
// the solid line the actor's habit, the dashed line the best setting, and
// dots the settings it tried lately. Plays once; give it a `key` per
// setting.
export default function Learner({ noise }: { noise: number }) {
  const run = useMemo(() => learn(noise), [noise])
  const at = Math.floor(usePlay(run.length - 1, PACE))
  const { theta, w, tried, shower } = run[at]

  // The critic over a grid, scaled so its best and worst span the shading
  const cells = useMemo(() => {
    const values = Array.from({ length: COLUMNS * ROWS }, (_, k) => {
      const cold = ((k % COLUMNS) + 0.5) / COLUMNS
      const dial = ((Math.floor(k / COLUMNS) + 0.5) / ROWS) * 100
      return criticAt(w, cold, toUnit(dial))
    })
    const low = Math.min(...values)
    const high = Math.max(...values)
    return values.map((v) => (high - low < 1e-9 ? 0 : (v - low) / (high - low)))
  }, [w])

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`After ${shower} showers the habit is ${missedBy(theta).toFixed(1)} settings from the best, on average`}
      >
        {cells.map((v, k) => {
          const column = k % COLUMNS
          const row = Math.floor(k / COLUMNS)
          const width = (RIGHT - LEFT) / COLUMNS
          const height = (BOTTOM - TOP) / ROWS
          return (
            <rect
              key={k}
              x={LEFT + column * width}
              y={BOTTOM - (row + 1) * height}
              width={width}
              height={height}
              className="fill-sage"
              fillOpacity={0.04 + 0.5 * v ** 2}
              shapeRendering="crispEdges"
            />
          )
        })}
        {[0, 50, 100].map((d) => (
          <text key={d} x={LEFT - 6} y={y(d) + 4} textAnchor="end" className="fill-zinc-400 font-mono text-[10px]">
            {d}
          </text>
        ))}
        <line x1={LEFT} x2={RIGHT} y1={BOTTOM} y2={BOTTOM} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
        {tried.map(([cold, dial], k) => (
          <circle key={k} cx={x(cold)} cy={y(dial)} r={2.5} className="fill-zinc-faded" />
        ))}
        <path d={line(bestDial)} className="fill-none stroke-ink" strokeDasharray="5 4" strokeWidth={1.5} />
        <path d={line((cold) => toDial(actorAt(theta, cold)))} className="fill-none stroke-ink" strokeWidth={3} />
        <text x={LEFT} y={HEIGHT - 8} className="fill-zinc-400 font-mono text-[10px] uppercase tracking-widest">
          mild
        </text>
        <text x={RIGHT} y={HEIGHT - 8} textAnchor="end" className="fill-zinc-400 font-mono text-[10px] uppercase tracking-widest">
          freezing
        </text>
        <text x={(LEFT + RIGHT) / 2} y={HEIGHT - 8} textAnchor="middle" className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
          the morning
        </text>
      </svg>
      <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
        <Readout label="Showers" value={`${shower} / ${LEARNER.showers}`} />
        <Readout label="Habit off the best" value={missedBy(theta).toFixed(1)} accent />
      </div>
    </div>
  )
}
