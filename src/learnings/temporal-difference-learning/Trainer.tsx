import { useRef, useState } from 'react'
import { useAnimationFrame } from 'motion/react'
import { Button, Controls, Readout } from '../../components/explain/figure'
import { seeded } from '../../components/explain/random'
import { usePrefersReducedMotion } from '../../hooks'
import { newLearner, openingValues, playGame, train, winRates, type Learner, type Outcome } from './model'

const STEP = 0.1
const EXPLORE = 0.1
const FIRST_RUN = 3000
const BLOCK = 100
// Games trained per frame while it plays: about three seconds for the first run
const PER_FRAME = 16

const WIDTH = 460
const HEIGHT = 230
const LEFT = 36
const RIGHT = 450
const TOP = 12
const BOTTOM = 196

// How often it wins playing its best, with no random moves and no learning,
// over the same 500 games each time it is asked
function bestPlay(learner: Learner): number {
  const random = seeded(2024)
  const greedy = { ...learner, explore: 0 }
  let wins = 0
  for (let game = 0; game < 500; game++) if (playGame(greedy, random, false) === 'win') wins++
  return wins / 500
}

const NEVER_TRAINED = bestPlay(newLearner(0.1, 0))
const percent = (share: number) => `${Math.round(share * 100)}%`

interface Run {
  outcomes: Outcome[]
  opening: number[]
  best: number
}

const fresh = (): Run => ({ outcomes: [], opening: Array<number>(9).fill(0.5), best: NEVER_TRAINED })

// The learner playing game after game against the one-move-ahead opponent,
// learning as it goes. It plays its first 3,000 games by itself; then more
// on request, or all over again.
export default function Trainer() {
  const reducedMotion = usePrefersReducedMotion()
  const learner = useRef(newLearner(STEP, EXPLORE))
  const random = useRef(seeded(1))
  const [run, setRun] = useState<Run>(fresh)
  const [target, setTarget] = useState(FIRST_RUN)
  // Games played so far, ahead of the render that will show them
  const games = useRef(0)

  const advance = (count: number) => {
    const outcomes = train(learner.current, random.current, count)
    games.current += count
    const done = games.current >= target
    setRun((before) => ({
      outcomes: [...before.outcomes, ...outcomes],
      opening: openingValues(learner.current),
      best: done ? bestPlay(learner.current) : before.best,
    }))
  }

  useAnimationFrame(() => {
    const left = target - games.current
    if (left <= 0) return
    advance(reducedMotion ? left : Math.min(left, PER_FRAME))
  })

  const restart = () => {
    learner.current = newLearner(STEP, EXPLORE)
    random.current = seeded(1)
    games.current = 0
    setRun(fresh())
    setTarget(FIRST_RUN)
  }

  const played = run.outcomes.length
  const rates = winRates(run.outcomes, BLOCK)
  const span = Math.max(FIRST_RUN, target)
  const x = (games: number) => LEFT + (games / span) * (RIGHT - LEFT)
  const y = (share: number) => BOTTOM - share * (BOTTOM - TOP)
  const line = rates.map((rate, block) => `${block ? 'L' : 'M'} ${x((block + 0.5) * BLOCK)} ${y(rate)}`).join(' ')
  const recent = run.outcomes.slice(-BLOCK)
  const lately = recent.length ? recent.filter((outcome) => outcome === 'win').length / recent.length : 0

  return (
    <div>
      <div className="grid gap-6 sm:grid-cols-[1fr_9rem] sm:items-end">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full"
          role="img"
          aria-label={`Wins in each hundred games: from ${percent(rates[0] ?? NEVER_TRAINED)} at first to ${percent(rates.at(-1) ?? NEVER_TRAINED)} after ${played} games`}
        >
          {[0, 0.5, 1].map((share) => (
            <g key={share}>
              <line x1={LEFT} x2={RIGHT} y1={y(share)} y2={y(share)} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
              <text x={LEFT - 6} y={y(share) + 4} textAnchor="end" className="fill-zinc-400 font-mono text-[10px]">
                {percent(share)}
              </text>
            </g>
          ))}
          <line
            x1={LEFT}
            x2={RIGHT}
            y1={y(NEVER_TRAINED)}
            y2={y(NEVER_TRAINED)}
            className="stroke-ink"
            strokeDasharray="4 4"
            strokeWidth={1}
          />
          <text x={RIGHT} y={y(NEVER_TRAINED) - 6} textAnchor="end" className="fill-ink font-mono text-[10px]">
            never trained: {percent(NEVER_TRAINED)}
          </text>
          <path d={line} className="fill-none stroke-sage" strokeWidth={2.5} strokeLinejoin="round" />
          <text x={LEFT} y={HEIGHT - 8} className="fill-zinc-400 font-mono text-[10px] uppercase tracking-widest">
            0 games
          </text>
          <text x={RIGHT} y={HEIGHT - 8} textAnchor="end" className="fill-zinc-400 font-mono text-[10px] uppercase tracking-widest">
            {span.toLocaleString('en-US')} games
          </text>
        </svg>

        <div className="w-full max-w-[12rem] sm:max-w-none">
          <p className="mb-2 font-mono text-[0.7rem] uppercase tracking-widest text-zinc-faded">Its guess per first move</p>
          <div className="grid grid-cols-3 border-l border-t border-zinc-300 dark:border-zinc-200/20">
            {run.opening.map((value, cell) => (
              <div
                key={cell}
                className="relative flex aspect-square items-center justify-center border-b border-r border-zinc-300 dark:border-zinc-200/20"
              >
                <div className="absolute inset-0 bg-sage" style={{ opacity: Math.max(0, value - 0.3) * 0.9 }} />
                <span className="relative font-mono text-[0.75rem] tabular-nums text-ink">{percent(value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Controls>
        <Readout label="Games played" value={played.toLocaleString('en-US')} />
        <Readout label="Won, last 100" value={percent(lately)} />
        <Readout label="Playing its best" value={percent(run.best)} accent />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setTarget(played + 1000)} disabled={played < target}>
            1,000 more games
          </Button>
          <Button onClick={restart} disabled={played < target}>
            Start over
          </Button>
        </div>
      </Controls>
    </div>
  )
}
