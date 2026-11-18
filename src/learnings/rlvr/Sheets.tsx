import { useRef, useState } from 'react'
import { useAnimationFrame } from 'motion/react'
import { usePrefersReducedMotion } from '../../hooks'
import { GROUP, signed, STORY, storyRewards, storyScored } from './model'

// What a story step shows: problem 1 built up a stage at a time, then the
// hard and the easy problem played whole, then the hard one relabelled
export type Show = 'book' | 'tries' | 'checked' | 'compared' | 'hard' | 'easy' | 'named'

const WIDTH = 400
const HEIGHT = 360
const SIDE = 12
const PITCH = (WIDTH - 2 * SIDE) / GROUP
const SHEET = PITCH - 5
const SHEET_TOP = 106
const SHEET_H = 70
const MARK_Y = 194
const BAND_Y = 224
const ZERO = 292
const UNIT = 22 // pixels per unit of advantage

const label = 'fill-zinc-faded font-mono text-[12px] uppercase tracking-widest'
const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t))
const sheetX = (i: number) => SIDE + i * PITCH + 2.5

// Which problem a show draws, and how far it has got: 0 blank, 1 tried,
// 2 checked, 3 compared
const PROBLEM: Record<Show, number> = { book: 0, tries: 0, checked: 0, compared: 0, hard: 1, easy: 2, named: 1 }
const STAGE: Record<Show, number> = { book: 0, tries: 1, checked: 2, compared: 3, hard: 3, easy: 3, named: 3 }
// The first stage that plays rather than standing already drawn
const FROM: Record<Show, number> = { book: 1, tries: 1, checked: 2, compared: 3, hard: 1, easy: 1, named: 4 }

// When each stage plays, in seconds after the step is shown
function timing(show: Show) {
  const quick = FROM[show] === 1 && STAGE[show] === 3
  const tryAt = (i: number) => (quick ? 0.1 + 0.08 * i : 0.2 + 0.22 * i)
  const tryFor = quick ? 0.4 : 0.6
  const checkAt = (i: number) => (quick ? 1.2 : 0.4) + 0.08 * i
  const compareAt = quick ? 2 : 0.2
  return { tryAt, tryFor, checkAt, compareAt }
}

const LENGTH = 3.2

// A contest book with only the answers at the back: eight tries at one
// problem, checked against the back, and each one's distance from the day's
// average. Plays by itself; with reduced motion it shows the end.
export default function Sheets({ show }: { show: Show }) {
  const reducedMotion = usePrefersReducedMotion()
  const started = useRef<number | null>(null)
  const [time, setTime] = useState(reducedMotion ? Infinity : 0)
  useAnimationFrame((now) => {
    if (reducedMotion || time >= LENGTH) return
    started.current ??= now
    setTime((now - started.current) / 1000)
  })

  const p = PROBLEM[show]
  const problem = STORY[p]
  const rewards = storyRewards(problem)
  const { advantages } = storyScored[p]
  const stage = STAGE[show]
  const named = show === 'named'
  const { tryAt, tryFor, checkAt, compareAt } = timing(show)
  // How far stage s has got for sheet i, from 0 to 1
  const at = (s: number, i: number) => {
    if (stage < s) return 0
    if (s < FROM[show]) return 1
    if (s === 1) return smooth((time - tryAt(i)) / tryFor)
    if (s === 2) return smooth((time - checkAt(i)) / 0.3)
    return smooth((time - compareAt) / 1)
  }
  const keyShown = stage < 2 ? 0 : FROM[show] <= 2 ? smooth((time - (FROM[show] === 2 ? 0 : checkAt(0) - 0.4)) / 0.4) : 1

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mx-auto block w-full max-w-xl" role="img" aria-label={describe(show)}>
      <text x={SIDE} y={14} className={label}>
        {named ? 'A prompt, eight sampled answers' : p === 0 ? 'Problem 1, eight tries' : p === 1 ? 'Problem 2, hard' : 'Problem 3, easy'}
      </text>
      <rect x={SIDE} y={24} width={WIDTH - 2 * SIDE} height={56} rx={12} className="fill-paper stroke-zinc-300 dark:stroke-zinc-200/25" />
      {problem.text.map((line, j) => (
        <text key={j} x={SIDE + 14} y={problem.text.length === 1 ? 57 : 47 + j * 20} className="fill-ink font-mono text-[13px]">
          {line}
        </text>
      ))}
      <text x={SIDE} y={98} className="fill-ink font-mono text-[13px]">
        {named ? 'Verifier’s key: ' : 'Back of the book: '}
        <tspan className="fill-sage-ink" opacity={keyShown}>
          {problem.key}
        </tspan>
        {keyShown === 0 && <tspan className="fill-zinc-faded">?</tspan>}
      </text>

      {problem.answers.map((answer, i) => {
        const tried = at(1, i)
        const checked = at(2, i)
        const x = sheetX(i)
        const right = rewards[i] === 1
        return (
          <g key={i}>
            <rect
              x={x}
              y={SHEET_TOP}
              width={SHEET}
              height={SHEET_H}
              rx={6}
              className={`fill-paper ${checked > 0.5 && right ? 'stroke-sage' : 'stroke-zinc-300 dark:stroke-zinc-200/25'}`}
              strokeWidth={checked > 0.5 && right ? 1.5 : 1}
            />
            {/* The working, as scribbles */}
            {[0.8, 0.6, 0.7].map((w, line) => (
              <rect
                key={line}
                x={x + 6}
                y={SHEET_TOP + 10 + line * 9}
                width={(SHEET - 12) * w * smooth(tried * 1.6 - line * 0.25)}
                height={3}
                rx={1.5}
                className="fill-ink"
                fillOpacity={0.25}
              />
            ))}
            <text
              x={x + SHEET / 2}
              y={SHEET_TOP + 58}
              textAnchor="middle"
              opacity={smooth(tried * 2 - 1)}
              className="fill-ink font-serif text-[18px]"
            >
              {answer}
            </text>
            {checked > 0 && <Mark x={x + SHEET / 2} y={MARK_Y} right={right} shown={checked} />}
          </g>
        )
      })}

      {stage >= 3 && (
        <g>
          <text x={SIDE} y={BAND_Y} className={label}>
            {named ? 'Advantage, against the group mean' : 'Above or below your average'}
          </text>
          <line x1={SIDE} x2={WIDTH - SIDE} y1={ZERO} y2={ZERO} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
          {advantages.map((a, i) => {
            const grown = at(3, i)
            const h = Math.abs(a) * UNIT * grown
            const x = sheetX(i)
            const up = a > 0
            return (
              <g key={i}>
                {a === 0 ? (
                  <rect x={x + 6} y={ZERO - 1.5} width={SHEET - 12} height={3} rx={1.5} className="fill-ink" fillOpacity={0.5 * grown} />
                ) : (
                  <rect
                    x={x + 6}
                    y={up ? ZERO - h : ZERO}
                    width={SHEET - 12}
                    height={h}
                    rx={3}
                    className={up ? 'fill-sage' : 'fill-ink'}
                    fillOpacity={up ? 1 : 0.55}
                  />
                )}
                <text
                  x={x + SHEET / 2}
                  y={up || a === 0 ? ZERO + 16 : ZERO - 7}
                  textAnchor="middle"
                  opacity={grown}
                  className="fill-ink stroke-paper font-mono text-[12px] tabular-nums"
                  strokeWidth={3}
                  paintOrder="stroke"
                >
                  {a === 0 ? '0' : signed(a)}
                </text>
              </g>
            )
          })}
        </g>
      )}
    </svg>
  )
}

// A tick for a sheet that matches the back of the book, a cross for one that doesn't
function Mark({ x, y, right, shown }: { x: number; y: number; right: boolean; shown: number }) {
  return right ? (
    <path
      d={`M ${x - 7} ${y} L ${x - 2} ${y + 5} L ${x + 8} ${y - 6}`}
      className="fill-none stroke-sage"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={shown}
    />
  ) : (
    <path
      d={`M ${x - 6} ${y - 6} L ${x + 6} ${y + 6} M ${x + 6} ${y - 6} L ${x - 6} ${y + 6}`}
      className="fill-none stroke-ink"
      strokeWidth={2.5}
      strokeLinecap="round"
      opacity={shown}
    />
  )
}

function describe(show: Show): string {
  const p = PROBLEM[show]
  const problem = STORY[p]
  const text = problem.text.join(' ')
  if (show === 'book') return `${text} Eight blank sheets; the answer is at the back of the book.`
  const answers = `Eight tries: ${problem.answers.join(', ')}.`
  if (show === 'tries') return `${text} ${answers}`
  const right = storyRewards(problem).filter((r) => r === 1).length
  const checked = `The back of the book says ${problem.key}: ${right} of 8 are right.`
  if (show === 'checked') return `${text} ${answers} ${checked}`
  const values = storyScored[p].advantages.map((a) => (a === 0 ? '0' : signed(a))).join(', ')
  if (show === 'named') return `A prompt and eight sampled answers, ${right} of which the verifier passes. Their advantages: ${values}.`
  return `${text} ${answers} ${checked} Above or below the average: ${values}.`
}
