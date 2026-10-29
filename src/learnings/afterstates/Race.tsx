import { useRef, useState } from 'react'
import { useAnimationFrame } from 'motion/react'
import Labelled from '../../components/explain/Labelled'
import { Button, Controls, Readout, Slider } from '../../components/explain/figure'
import { usePrefersReducedMotion } from '../../hooks'
import Notebook from './Notebook'
import { BEST_LOSS, DAYS, EVERY, PAIRS, policyOf, race, RUNS, SHELVES, storyRuns, tried, triedShelves } from './model'

const WIDTH = 640
const HEIGHT = 230
const LEFT = 40
const RIGHT = 560
const TOP = 36
const BOTTOM = 196
const MOST = 5
// Real milliseconds per day while it plays
const PLAYBACK = 40

const x = (day: number) => LEFT + (day / DAYS) * (RIGHT - LEFT)
const y = (lost: number) => BOTTOM - (Math.min(lost, MOST) / MOST) * (BOTTOM - TOP)
const fmt = (lost: number) => lost.toFixed(2)

// Two stallholders learning side by side: above, one of each kind and its
// notebook on the day shown; below, how many bottles a day each kind would
// lose if it stopped trying random amounts, averaged over many of each.
export default function Race() {
  const reducedMotion = usePrefersReducedMotion()
  const curves = race()
  const runs = storyRuns()
  const [day, setDay] = useState(DAYS)
  const started = useRef<number | null>(null)

  // Playing: started.current is when it started, on the animation clock
  // (-1 until the first frame after Play reads that clock)
  useAnimationFrame((time) => {
    if (started.current === null) return
    if (started.current < 0) started.current = time
    const at = Math.max(0, Math.min(DAYS, Math.floor((time - started.current) / PLAYBACK)))
    setDay(at)
    if (at === DAYS) started.current = null
  })

  const play = () => {
    if (reducedMotion) return setDay(DAYS)
    setDay(0)
    started.current = -1
  }

  // The curves are measured every EVERY days: up to the day shown
  const upTo = Math.floor(day / EVERY)
  const line = (points: number[]) =>
    points
      .slice(0, upTo + 1)
      .map((lost, i) => `${i ? 'L' : 'M'}${x(curves.days[i]).toFixed(1)},${y(lost).toFixed(1)}`)
      .join(' ')
  const now = { pairs: curves.pairs[upTo], shelf: curves.shelf[upTo] }

  return (
    <div>
      <Labelled
        left={`Tried ${tried(runs.pairs.counts[day])}/${PAIRS}`}
        right={`Tried ${triedShelves(runs.shelf.counts[day])}/${SHELVES}`}
      >
        <div className="grid grid-cols-2 gap-3 sm:gap-6">
          <Notebook
            kind="pairs"
            counts={runs.pairs.counts[day]}
            picks={policyOf(runs.pairs.tables[day])}
            label={`One pair notebook on day ${day}: it has learned from ${tried(runs.pairs.counts[day])} of its ${PAIRS} pairs.`}
          />
          <Notebook
            kind="shelf"
            counts={runs.shelf.counts[day]}
            picks={policyOf(runs.shelf.tables[day])}
            label={`One shelf notebook on day ${day}: it has learned from ${triedShelves(runs.shelf.counts[day])} of its ${SHELVES} shelves.`}
          />
        </div>
      </Labelled>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-8 w-full"
        role="img"
        aria-label={`Bottles lost a day, playing its best, averaged over ${RUNS} learners of each kind. On day ${day}: the pair notebook ${fmt(now.pairs)}, the shelf notebook ${fmt(now.shelf)}; the best there is, ${fmt(BEST_LOSS)}.`}
      >
        {[0, 1, 2, 3, 4, 5].map((lost) => (
          <g key={lost}>
            <line x1={LEFT} x2={RIGHT} y1={y(lost)} y2={y(lost)} className="stroke-zinc-200 dark:stroke-zinc-200/10" />
            <text x={LEFT - 8} y={y(lost) + 4} textAnchor="end" className="fill-zinc-400 font-mono text-[11px]">
              {lost}
            </text>
          </g>
        ))}
        {[0, 50, 100, 150, 200].map((d) => (
          <text key={d} x={x(d)} y={BOTTOM + 18} textAnchor="middle" className="fill-zinc-400 font-mono text-[11px]">
            {d === DAYS ? `${d} days` : d}
          </text>
        ))}
        <text x={LEFT - 30} y={18} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
          Bottles lost a day
        </text>
        <line x1={LEFT} x2={RIGHT} y1={y(BEST_LOSS)} y2={y(BEST_LOSS)} className="stroke-ink" strokeDasharray="4 4" />
        <text x={RIGHT + 8} y={y(BEST_LOSS) + 16} className="fill-ink font-mono text-[11px] uppercase tracking-widest">
          best
        </text>
        <path d={line(curves.pairs)} fill="none" className="stroke-ink" strokeWidth={1.75} strokeLinejoin="round" />
        <path d={line(curves.shelf)} fill="none" className="stroke-sage" strokeWidth={2.25} strokeLinejoin="round" />
        <circle cx={x(curves.days[upTo])} cy={y(now.pairs)} r={4.5} className="fill-ink" />
        <circle cx={x(curves.days[upTo])} cy={y(now.shelf)} r={4.5} className="fill-sage" />
        {[
          { name: 'Score per pair', tone: 'ink', at: TOP + 10 },
          { name: 'Score per shelf', tone: 'sage', at: TOP + 32 },
        ].map(({ name, tone, at }) => (
          <g key={name}>
            <line x1={250} x2={272} y1={at - 4} y2={at - 4} className={tone === 'sage' ? 'stroke-sage' : 'stroke-ink'} strokeWidth={2} />
            <text x={280} y={at} className={`${tone === 'sage' ? 'fill-sage' : 'fill-ink'} font-mono text-[11px] uppercase tracking-widest`}>
              {name}
            </text>
          </g>
        ))}
      </svg>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <Readout label="Day" value={day} />
        <Readout label="Pairs" value={fmt(now.pairs)} />
        <Readout label="Shelves" value={fmt(now.shelf)} accent />
      </div>
      <Controls>
        <Slider
          label="Day"
          value={day}
          min={0}
          max={DAYS}
          onChange={(d) => {
            started.current = null
            setDay(d)
          }}
        />
        <Button onClick={play}>Play from the start</Button>
      </Controls>
    </div>
  )
}
