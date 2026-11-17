import { useRef, useState } from 'react'
import { useAnimationFrame } from 'motion/react'
import { DotGrid, DotKey, type Tone } from '../../components/explain/DotGrid'
import { usePrefersReducedMotion } from '../../hooks'
import {
  ANSWERS,
  BLURTED,
  RIGHT,
  STORY_K,
  STORY_PROBLEMS,
  storyChains,
  storyRun,
  storySingleRight,
  storyTally,
  storyVoteRight,
  WORKED_STEPS,
} from './model'

export type Show = 'blurt' | 'worked' | 'many' | 'tally' | 'scale' | 'named'

const WIDTH = 600
const HEIGHT = 316

// Seconds a show takes to play out
const LENGTH: Record<Show, number> = { blurt: 1.2, worked: 3, many: 2, tally: 2.2, scale: 0, named: 0 }

const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t))
const label = 'fill-zinc-faded font-mono text-[11px] uppercase tracking-widest'

const HEADER: Record<Exclude<Show, 'scale'>, string> = {
  blurt: 'A friend, no paper',
  worked: 'A friend, with paper',
  many: `The same friend, asked on ${STORY_K} days`,
  tally: 'Count the answers',
  named: `A language model, ${STORY_K} sampled chains`,
}

// The story's word problem, the friend's paper, and the fifteen sheets.
// Plays by itself; with reduced motion it shows the end.
export default function Chains({ show }: { show: Show }) {
  const reducedMotion = usePrefersReducedMotion()
  const started = useRef<number | null>(null)
  const [time, setTime] = useState(reducedMotion ? Infinity : 0)
  const end = LENGTH[show]

  useAnimationFrame((now) => {
    if (time >= end) return
    started.current ??= now
    setTime((now - started.current) / 1000)
  })

  if (show === 'scale') return <Hundred />

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={labelOf(show)}>
      <text x={20} y={16} className={label}>
        {HEADER[show]}
      </text>
      <Problem />
      {show === 'blurt' && <Blurt time={time} />}
      {show === 'worked' && <Worked time={time} />}
      {(show === 'many' || show === 'tally' || show === 'named') && <Sheets show={show} time={time} />}
    </svg>
  )
}

function labelOf(show: Show): string {
  const tally = ANSWERS.map((a, i) => `${a.value}: ${storyTally[i]}`).join(', ')
  switch (show) {
    case 'blurt':
      return `A word problem, answered at once with ${BLURTED}, which is wrong`
    case 'worked':
      return `The same problem worked on paper: ${WORKED_STEPS.join(', ')}. The answer, ${RIGHT}, is right`
    case 'many':
      return `${STORY_K} sheets of working, ending on ${storyChains.join(', ')}`
    case 'tally':
      return `The ${STORY_K} sheets counted by answer: ${tally}. ${RIGHT} is the most common`
    case 'named':
      return `${STORY_K} chains of thought sampled from a language model, counted by answer: ${tally}. The vote picks ${RIGHT}`
    default:
      return ''
  }
}

// The problem, on a card along the top
function Problem() {
  return (
    <g>
      <rect x={20} y={26} width={WIDTH - 40} height={60} rx={12} className="fill-paper stroke-zinc-300 dark:stroke-zinc-200/25" />
      <text x={36} y={50} className="fill-ink font-mono text-[13px]">
        A baker bakes 4 trays of 12 rolls, sells 30,
      </text>
      <text x={36} y={72} className="fill-ink font-mono text-[13px]">
        then bakes 2 more trays. How many rolls are left?
      </text>
    </g>
  )
}

// No paper: an answer, at once, and wrong
function Blurt({ time }: { time: number }) {
  const shown = smooth((time - 0.3) / 0.4)
  const marked = smooth((time - 0.8) / 0.4)
  return (
    <g>
      <text x={WIDTH / 2} y={190} textAnchor="middle" opacity={shown} className="fill-ink font-serif text-[64px] font-light">
        {BLURTED}
      </text>
      <text x={WIDTH / 2} y={232} textAnchor="middle" opacity={marked} className={label}>
        Wrong: it’s {RIGHT}
      </text>
    </g>
  )
}

// Paper: one easy sum a line, then the answer
function Worked({ time }: { time: number }) {
  const answer = smooth((time - 2.4) / 0.4)
  return (
    <g>
      <rect x={20} y={102} width={330} height={196} rx={12} className="fill-paper stroke-zinc-300 dark:stroke-zinc-200/25" />
      {WORKED_STEPS.map((line, i) => (
        <text
          key={line}
          x={44}
          y={140 + i * 40}
          opacity={smooth((time - 0.2 - i * 0.5) / 0.3)}
          className="fill-ink font-mono text-[18px]"
        >
          {line}
        </text>
      ))}
      <text x={475} y={220} textAnchor="middle" opacity={answer} className="fill-sage-ink font-serif text-[64px] font-light">
        {RIGHT}
      </text>
      <text x={475} y={256} textAnchor="middle" opacity={answer} className={label}>
        Right
      </text>
    </g>
  )
}

// Where sheet i sits in the grid of fifteen, and in its answer's column
const GRID = { columns: 5, width: 100, height: 52, gapX: 15, gapY: 12, top: 104 }
const COLUMN = { width: 70, height: 24, gap: 3, base: 286 }
const columnX = (a: number) => 20 + ((WIDTH - 40) / ANSWERS.length) * (a + 0.5)

const sheets = (() => {
  const seen = new Array<number>(ANSWERS.length).fill(0)
  return storyChains.map((value, i) => {
    const a = ANSWERS.findIndex((answer) => answer.value === value)
    const level = seen[a]++
    const col = i % GRID.columns
    const row = Math.floor(i / GRID.columns)
    return {
      value,
      right: a === 0,
      grid: {
        x: 20 + col * (GRID.width + GRID.gapX),
        y: GRID.top + row * (GRID.height + GRID.gapY),
        w: GRID.width,
        h: GRID.height,
      },
      stack: {
        x: columnX(a) - COLUMN.width / 2,
        y: COLUMN.base - (level + 1) * (COLUMN.height + COLUMN.gap),
        w: COLUMN.width,
        h: COLUMN.height,
      },
    }
  })
})()

// The fifteen sheets: dealt into a grid, then counted into a column for
// each answer
function Sheets({ show, time: clock }: { show: 'many' | 'tally' | 'named'; time: number }) {
  // The reveal relabels the counted sheets; it doesn't count them again
  const time = show === 'named' ? Infinity : clock
  const counting = show !== 'many'
  const winner = storyTally.indexOf(Math.max(...storyTally))
  const settled = counting ? smooth((time - 1.6) / 0.5) : 0
  return (
    <g>
      {sheets.map((sheet, i) => {
        const dealt = counting ? 1 : smooth((time - i * 0.1) / 0.3)
        const move = counting ? smooth((time - 0.2 - i * 0.04) / 0.9) : 0
        const at = {
          x: sheet.grid.x + (sheet.stack.x - sheet.grid.x) * move,
          y: sheet.grid.y + (sheet.stack.y - sheet.grid.y) * move,
          w: sheet.grid.w + (sheet.stack.w - sheet.grid.w) * move,
          h: sheet.grid.h + (sheet.stack.h - sheet.grid.h) * move,
        }
        return (
          <g key={i} opacity={dealt}>
            <rect
              x={at.x}
              y={at.y}
              width={at.w}
              height={at.h}
              rx={8}
              className={sheet.right ? 'fill-sage stroke-sage' : 'fill-paper stroke-ink'}
              fillOpacity={sheet.right ? 0.3 : 1}
              strokeOpacity={sheet.right ? 1 : 0.55}
              strokeWidth={1.5}
            />
            <text
              x={at.x + at.w / 2}
              y={at.y + at.h / 2 + 6}
              textAnchor="middle"
              opacity={1 - move}
              className="fill-ink font-mono text-[18px]"
            >
              {sheet.value}
            </text>
          </g>
        )
      })}
      {counting && (
        <g opacity={settled}>
          <line x1={20} x2={WIDTH - 20} y1={COLUMN.base} y2={COLUMN.base} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
          {ANSWERS.map((answer, a) => {
            const top = COLUMN.base - storyTally[a] * (COLUMN.height + COLUMN.gap)
            return (
              <g key={answer.value}>
                <text
                  x={columnX(a)}
                  y={COLUMN.base + 22}
                  textAnchor="middle"
                  className={`${a === winner ? 'fill-sage-ink' : 'fill-ink'} font-mono text-[15px]`}
                >
                  {answer.value}
                </text>
                <text x={columnX(a)} y={top - 8} textAnchor="middle" className="fill-ink font-mono text-[13px]">
                  {storyTally[a]}
                </text>
              </g>
            )
          })}
          <text x={columnX(winner) + COLUMN.width / 2 + 10} y={COLUMN.base - 4 * (COLUMN.height + COLUMN.gap) - 2} className={label}>
            {show === 'named' ? '← Majority vote' : '← Most common'}
          </text>
        </g>
      )}
    </g>
  )
}

// A hundred problems: one sheet each, and the most common of fifteen
function Hundred() {
  const panels = [
    { title: 'One sheet each', right: storySingleRight, tones: storyRun.map((r): Tone => (r.single ? 'fine' : 'bad')) },
    { title: `Most common of ${STORY_K}`, right: storyVoteRight, tones: storyRun.map((r): Tone => (r.vote ? 'fine' : 'bad')) },
  ]
  return (
    <div>
      <div className="grid gap-8 sm:grid-cols-2">
        {panels.map((panel) => (
          <div key={panel.title}>
            <p className="font-mono text-[0.875rem] uppercase tracking-widest text-zinc-faded">{panel.title}</p>
            <p className="mt-1 font-serif text-3xl font-light">
              <span className="text-sage-ink">{panel.right}</span>
              <span className="text-zinc-faded"> of {STORY_PROBLEMS} right</span>
            </p>
            <div className="mt-4">
              <DotGrid tones={panel.tones} label={`${panel.right} of ${STORY_PROBLEMS} problems right`} run={panel.title} />
            </div>
          </div>
        ))}
      </div>
      <DotKey
        items={[
          ['fine', 'right answer'],
          ['bad', 'wrong answer'],
        ]}
      />
    </div>
  )
}
