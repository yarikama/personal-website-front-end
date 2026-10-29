import { useRef, useState } from 'react'
import { useAnimationFrame } from 'motion/react'
import { Button, Choice, Controls, Readout } from '../../components/explain/figure'
import { seeded } from '../../components/explain/random'
import { usePrefersReducedMotion } from '../../hooks'
import Averages from './Averages'
import { BEST, BEST_TURNS, blank, differ, fromStart, game, learn, planOf, ROLLING, type Table } from './model'

const SEED = 4
// Games it plays by itself, and how many a frame while it plays
const FIRST = 300
const BATCH = 6

const STARTS = ['square 1', 'anywhere'] as const
type Start = (typeof STARTS)[number]
const EPSILONS = [0, 0.05, 0.1, 1 / 3] as const
type Epsilon = (typeof EPSILONS)[number]

const WIDTH = 320
const HEIGHT = 170
const LEFT = 26
const RIGHT = 314
const TOP = 10
const BOTTOM = 140
const LOW = 6
const HIGH = 12

interface Run {
  table: Table
  // Turns from square 1 after each game: by the plan alone, and by the
  // plan with its random moves
  straight: number[]
  soft: number[]
}

const empty = (): Run => ({ table: blank(), straight: [], soft: [] })

const fmt = (turns: number) => (Number.isFinite(turns) ? turns.toFixed(1) : 'never ends')

// Learn the board yourself: games played by the averages, starting on
// square 1 or anywhere, with random moves as often as you choose. The board
// shows the averages and the move they pick, dashed where it is not yet the
// best play; the chart, how many turns the plan takes from square 1 after
// each game, worked out from the board's rules (which the learner never
// sees).
export default function Learner() {
  const reducedMotion = usePrefersReducedMotion()
  const [start, setStart] = useState<Start>('square 1')
  const [epsilon, setEpsilon] = useState<Epsilon>(0)
  // The learner lives in refs, ahead of the render that shows it, so a
  // render never plays a game twice
  const random = useRef(seeded(SEED))
  const learned = useRef<Run>(empty())
  const settings = useRef({ epsilon: 0, anywhere: false })
  const [run, setRun] = useState<Run>(empty)
  const [goal, setGoal] = useState(FIRST)

  const restart = (nextStart: Start, nextEpsilon: Epsilon) => {
    random.current = seeded(SEED)
    learned.current = empty()
    settings.current = { epsilon: nextEpsilon, anywhere: nextStart === 'anywhere' }
    setRun(empty())
    setGoal(FIRST)
    setStart(nextStart)
    setEpsilon(nextEpsilon)
  }

  const advance = (count: number) => {
    let { table, straight, soft } = learned.current
    straight = [...straight]
    soft = [...soft]
    for (let i = 0; i < count; i++) {
      table = learn(table, game(table, settings.current, random.current))
      const plan = planOf(table)
      straight.push(fromStart(plan))
      soft.push(fromStart(plan, settings.current.epsilon))
    }
    learned.current = { table, straight, soft }
    setRun(learned.current)
  }

  useAnimationFrame(() => {
    const left = goal - learned.current.straight.length
    if (left <= 0) return
    advance(reducedMotion ? left : Math.min(left, BATCH))
  })

  const played = run.straight.length
  const plan = planOf(run.table)
  const wrong = differ(plan, BEST)
  const now = played ? run.straight[played - 1] : ROLLING
  const exploring = played ? run.soft[played - 1] : fromStart(plan, epsilon)
  const busy = goal > played

  const span = Math.max(1000, played)
  const x = (i: number) => LEFT + (i / span) * (RIGHT - LEFT)
  const y = (turns: number) => BOTTOM - ((Math.min(HIGH, Math.max(LOW, turns)) - LOW) / (HIGH - LOW)) * (BOTTOM - TOP)
  // One point in every few, so a long run stays a light path
  const every = Math.max(1, Math.floor(played / 400))
  const path = (values: number[]) => {
    const kept: number[] = []
    for (let i = 0; i < values.length; i += every) kept.push(i)
    if (kept.at(-1) !== values.length - 1) kept.push(values.length - 1)
    return kept.map((i, j) => `${j ? 'L' : 'M'}${x(i + 1).toFixed(1)},${y(values[i]).toFixed(1)}`).join(' ')
  }

  return (
    <div>
      <div className="grid gap-6 md:grid-cols-[1fr_1fr] md:items-center">
        <Averages
          label={`After ${played} games: the two averages on every square and the move they pick; ${wrong.length} squares are not yet on the best move`}
          table={run.table}
          plan={plan}
          rung={wrong}
        />
        <div>
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="w-full"
            role="img"
            aria-label={`Turns from square 1 by the plan after each game: now ${fmt(now)}; rolling everywhere takes ${ROLLING.toFixed(1)} and the best play ${BEST_TURNS.toFixed(1)}`}
          >
            {[LOW, 8, 10, HIGH].map((value) => (
              <g key={value}>
                <line x1={LEFT} x2={RIGHT} y1={y(value)} y2={y(value)} className="stroke-zinc-200 dark:stroke-zinc-200/10" />
                <text x={LEFT - 6} y={y(value) + 4} textAnchor="end" className="fill-zinc-400 font-mono text-[11px]">
                  {value}
                </text>
              </g>
            ))}
            <line x1={LEFT} x2={RIGHT} y1={y(ROLLING)} y2={y(ROLLING)} className="stroke-zinc-400" strokeDasharray="2 3" />
            <text x={RIGHT} y={y(ROLLING) - 4} textAnchor="end" className="fill-zinc-400 font-mono text-[10px] uppercase tracking-widest">
              always roll
            </text>
            <line x1={LEFT} x2={RIGHT} y1={y(BEST_TURNS)} y2={y(BEST_TURNS)} className="stroke-sage" strokeDasharray="4 4" />
            <text x={RIGHT} y={y(BEST_TURNS) + 12} textAnchor="end" className="fill-sage font-mono text-[10px] uppercase tracking-widest">
              best play
            </text>
            {played > 0 && epsilon > 0 && (
              <path d={path(run.soft)} fill="none" className="stroke-ink" strokeWidth={1.2} opacity={0.45} />
            )}
            {played > 0 && <path d={path(run.straight)} fill="none" className="stroke-sage" strokeWidth={2} />}
            <text x={LEFT} y={HEIGHT - 8} className="fill-zinc-400 font-mono text-[11px] uppercase tracking-widest">
              Turns from square 1, games 1 to {span.toLocaleString('en-US')}
            </text>
          </svg>
          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
            <Readout label="Games" value={played.toLocaleString('en-US')} />
            <Readout label="The plan" value={fmt(now)} accent />
            {epsilon > 0 && <Readout label="With its random moves" value={fmt(exploring)} />}
            <Readout label="Best play" value={BEST_TURNS.toFixed(1)} />
          </div>
        </div>
      </div>
      <Controls>
        <Choice label="Each game starts" options={STARTS} value={start} onChange={(value) => restart(value, epsilon)} />
        <Choice
          label="Random moves"
          options={EPSILONS}
          value={epsilon}
          onChange={(value) => restart(start, value)}
          format={(value) => (value === 0 ? 'none' : `1 in ${Math.round(1 / value)}`)}
        />
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setGoal(played + 100)} disabled={busy}>
            100 more games
          </Button>
          <Button onClick={() => setGoal(played + 1000)} disabled={busy}>
            1,000 more
          </Button>
          <Button onClick={() => restart(start, epsilon)}>Start over</Button>
        </div>
      </Controls>
    </div>
  )
}
