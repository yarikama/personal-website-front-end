import { useRef, useState } from 'react'
import { useAnimationFrame } from 'motion/react'
import { Button, Choice, Controls, Readout } from '../../components/explain/figure'
import { seeded } from '../../components/explain/random'
import { usePrefersReducedMotion } from '../../hooks'
import { blank, cellsOf, HOME, minutes, SHORTEST, START, STATION, TOWN, walk, type Method, type Table, type Walk } from './model'
import Town from './Town'

const ALPHA = 0.5
const FIRST = 30
const MORE = 20
// A morning every this many ms while it plays
const PACE = 120
const SHOWN = 60
const CAP = 60

const WIDTH = 320
const HEIGHT = 150
const LEFT = 26
const RIGHT = 314
const TOP = 10
const BOTTOM = 124

const TARGETS = ['taken', 'average'] as const
type Target = (typeof TARGETS)[number]
const METHOD: Record<Target, Method> = { taken: 'sarsa', average: 'expected' }
const EPSILONS = [0.05, 0.1, 0.3] as const

interface Run {
  table: Table
  walks: Walk[]
}

// The town, learned morning by morning by Sarsa (the next way's score is
// the way taken) or Expected Sarsa (the average over the ways you might
// take). It walks its first mornings by itself; then more on request.
export default function Trainer() {
  const reducedMotion = usePrefersReducedMotion()
  const [target, setTarget] = useState<Target>('taken')
  const [epsilon, setEpsilon] = useState<(typeof EPSILONS)[number]>(0.1)
  // The learner lives in refs, ahead of the render that shows it, so a
  // render never walks a morning twice
  const random = useRef(seeded(3))
  const table = useRef<Table>(blank(TOWN))
  const walks = useRef<Walk[]>([])
  const [run, setRun] = useState<Run>(() => ({ table: blank(TOWN), walks: [] }))
  const [goal, setGoal] = useState(FIRST)
  const last = useRef(0)
  // The settings the learner walks by, changed with it, never between
  const settings = useRef({ method: METHOD.taken, epsilon: 0.1 })

  const restart = (nextTarget: Target, nextEpsilon: number) => {
    random.current = seeded(3)
    table.current = blank(TOWN)
    walks.current = []
    setRun({ table: blank(TOWN), walks: [] })
    setGoal(FIRST)
    last.current = 0
    settings.current = { method: METHOD[nextTarget], epsilon: nextEpsilon }
    setTarget(nextTarget)
    setEpsilon(nextEpsilon as (typeof EPSILONS)[number])
  }

  const advance = (count: number) => {
    for (let i = 0; i < count; i++) {
      const steps = walk(
        TOWN,
        table.current,
        settings.current.method,
        { epsilon: settings.current.epsilon, alpha: ALPHA, gamma: 1 },
        START,
        random.current
      )
      walks.current = [...walks.current, { steps, total: -steps.length, bad: false }]
    }
    setRun({ table: table.current.map((row) => [...row]), walks: walks.current })
  }

  useAnimationFrame((time) => {
    const left = goal - walks.current.length
    if (left <= 0) return
    if (reducedMotion) return advance(left)
    if (time - last.current < PACE) return
    last.current = time
    advance(1)
  })

  const walked = run.walks.length
  const latest = run.walks.at(-1)
  const recent = run.walks.slice(-10)
  const average = recent.length ? recent.reduce((sum, w) => sum + minutes(w), 0) / recent.length : 0
  const shown = run.walks.slice(-SHOWN)
  const first = walked - shown.length
  const barWidth = (RIGHT - LEFT) / SHOWN
  const y = (value: number) => BOTTOM - (Math.min(value, CAP) / CAP) * (BOTTOM - TOP)

  return (
    <div>
      <div className="grid gap-6 md:grid-cols-[1fr_1fr] md:items-center">
        <Town
          world={TOWN}
          home={HOME}
          goal={STATION}
          goalLabel="top"
          label={`The town after ${walked} mornings: arrows for the best-scored way out of each corner, and the last walk.`}
          table={run.table}
          scores="arrows"
          routes={latest ? [{ cells: cellsOf(latest), tone: 'ink', faint: true }] : []}
        />
        <div>
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="w-full"
            role="img"
            aria-label={`Minutes each morning took, the last ${shown.length} mornings: the last took ${latest ? minutes(latest) : 0}, the shortest possible is ${SHORTEST}`}
          >
            {[0, 30, 60].map((value) => (
              <g key={value}>
                <line x1={LEFT} x2={RIGHT} y1={y(value)} y2={y(value)} className="stroke-zinc-200 dark:stroke-zinc-200/10" />
                <text x={LEFT - 6} y={y(value) + 4} textAnchor="end" className="fill-zinc-400 font-mono text-[11px]">
                  {value}
                </text>
              </g>
            ))}
            {shown.map((w, i) => (
              <rect
                key={first + i}
                x={LEFT + i * barWidth + 1}
                y={y(minutes(w))}
                width={barWidth - 2}
                height={BOTTOM - y(minutes(w))}
                className={minutes(w) === SHORTEST ? 'fill-sage' : 'fill-zinc-400'}
              />
            ))}
            <line x1={LEFT} x2={RIGHT} y1={y(SHORTEST)} y2={y(SHORTEST)} className="stroke-sage" strokeDasharray="4 4" />
            <text x={LEFT} y={HEIGHT - 6} className="fill-zinc-400 font-mono text-[11px] uppercase tracking-widest">
              Minutes, morning {first + 1} to {Math.max(walked, 1)}
            </text>
          </svg>
          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
            <Readout label="Mornings" value={walked} />
            <Readout label="Last 10, average" value={`${average.toFixed(1)} min`} accent />
            <Readout label="Shortest" value={`${SHORTEST} min`} />
          </div>
        </div>
      </div>
      <Controls>
        <Choice
          label="Next way’s score"
          options={TARGETS}
          value={target}
          onChange={(value) => restart(value, epsilon)}
          format={(value) => (value === 'taken' ? 'the one taken' : 'the average')}
        />
        <Choice
          label="Random turns"
          options={EPSILONS}
          value={epsilon}
          onChange={(value) => restart(target, value)}
          format={(value) => `1 in ${Math.round(1 / value)}`}
        />
        <div className="flex gap-3">
          <Button onClick={() => setGoal(walked + MORE)} disabled={goal > walked}>
            {MORE} more mornings
          </Button>
          <Button onClick={() => restart(target, epsilon)}>Start over</Button>
        </div>
      </Controls>
    </div>
  )
}
