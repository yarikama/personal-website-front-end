import { useRef, useState } from 'react'
import { useAnimationFrame } from 'motion/react'
import { Button, Controls, Readout, Slider } from '../../components/explain/figure'
import { usePrefersReducedMotion } from '../../hooks'
import type { Race } from './model'

const WIDTH = 640
const HEIGHT = 250
const LEFT = 40
const RIGHT = 620
const TOP = 16
const BOTTOM = 210
// Losses per 100 games at the top of the chart
const MOST_LOST = 40
// Real milliseconds per point of the run while it plays
const PLAYBACK = 90

const per100 = (share: number) => Math.round(share * 100)

// How often each learner loses as it plays more games: learning only from
// results (ink) against learning a value for every position (sage). Play it
// from the start, or drag through it.
export default function RaceChart({ run }: { run: Race }) {
  const reducedMotion = usePrefersReducedMotion()
  const last = run.games.length - 1
  const budget = run.games[last]
  const every = run.games[1]
  const [shown, setShown] = useState(last)
  const started = useRef<number | null>(null)

  useAnimationFrame((time) => {
    if (started.current === null) return
    const at = Math.min(last, Math.floor((time - started.current) / PLAYBACK))
    setShown(at)
    if (at === last) started.current = null
  })

  const play = () => {
    if (reducedMotion) return setShown(last)
    setShown(0)
    started.current = performance.now()
  }

  const x = (games: number) => LEFT + (games / budget) * (RIGHT - LEFT)
  const y = (lost: number) => BOTTOM - (Math.min(per100(lost), MOST_LOST) / MOST_LOST) * (BOTTOM - TOP)
  const line = (points: { lost: number }[]) =>
    points
      .slice(0, shown + 1)
      .map((point, i) => `${i ? 'L' : 'M'}${x(run.games[i]).toFixed(1)},${y(point.lost).toFixed(1)}`)
      .join(' ')

  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Games lost per 100 as each learner plays more games">
        <line x1={LEFT} x2={RIGHT} y1={BOTTOM} y2={BOTTOM} className="stroke-zinc-400" />
        {[0, 10, 20, 30, 40].map((tick) => (
          <g key={tick}>
            <line x1={LEFT} x2={RIGHT} y1={y(tick / 100)} y2={y(tick / 100)} className="stroke-zinc-200 dark:stroke-zinc-200/10" />
            <text x={LEFT - 8} y={y(tick / 100) + 3} textAnchor="end" className="fill-zinc-400 font-mono text-[10px]">
              {tick}
            </text>
          </g>
        ))}
        {[0, budget / 4, budget / 2, (budget * 3) / 4, budget].map((tick) => (
          <text key={tick} x={x(tick)} y={BOTTOM + 16} textAnchor="middle" className="fill-zinc-400 font-mono text-[10px]">
            {tick.toLocaleString('en-US')}
          </text>
        ))}
        <text x={(LEFT + RIGHT) / 2} y={HEIGHT - 4} textAnchor="middle" className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
          Games played
        </text>
        <text x={LEFT + 6} y={TOP - 4} className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
          Games lost, per 100
        </text>
        <text x={x(budget / 2)} y={y(run.results[Math.floor(last / 2)].lost) - 12} textAnchor="middle" className="fill-ink font-mono text-[10px] uppercase tracking-widest">
          Results only
        </text>
        <text x={x(budget / 2)} y={y(run.values[Math.floor(last / 2)].lost) - 10} textAnchor="middle" className="fill-sage font-mono text-[10px] uppercase tracking-widest">
          Value function
        </text>
        <path d={line(run.results)} fill="none" className="stroke-ink" strokeWidth={2} strokeLinejoin="round" />
        <path d={line(run.values)} fill="none" className="stroke-sage" strokeWidth={2} strokeLinejoin="round" />
        <circle cx={x(run.games[shown])} cy={y(run.results[shown].lost)} r={4.5} className="fill-ink" />
        <circle cx={x(run.games[shown])} cy={y(run.values[shown].lost)} r={4.5} className="fill-sage" />
      </svg>
      <div className="mt-4 grid grid-cols-3 gap-4">
        <Readout label="Games played" value={run.games[shown].toLocaleString('en-US')} />
        <Readout label="Results only: lost" value={`${per100(run.results[shown].lost)} / 100`} />
        <Readout label="Value function: lost" value={`${per100(run.values[shown].lost)} / 100`} accent />
      </div>
      <Controls>
        <Slider
          label="Games played"
          value={run.games[shown]}
          min={0}
          max={budget}
          step={every}
          onChange={(games) => {
            started.current = null
            setShown(Math.round(games / every))
          }}
          format={(games) => games.toLocaleString('en-US')}
        />
        <Button onClick={play}>Play from the start</Button>
      </Controls>
    </div>
  )
}
