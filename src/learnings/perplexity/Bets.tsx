import { useRef, useState } from 'react'
import { useAnimationFrame } from 'motion/react'
import { usePrefersReducedMotion } from '../../hooks'
import {
  COUNTERS,
  EVEN_COUNTERS,
  fraction,
  grouped,
  LONG,
  LONG_ODDS,
  SHORT,
  SHORT_ODDS,
  STORY_PERPLEXITY,
  STORY_START,
} from './model'

export type Show = 'first' | 'short' | 'product' | 'long' | 'even' | 'blind' | 'named'

const WIDTH = 480
const HEIGHT = 314

// One column of eight counters, stacked from the bottom in groups, one group
// per word bet on. The first group is the word that came.
interface Column {
  word: string
  // Group sizes from the bottom, and the labels beside them (short only)
  groups: number[]
  labels?: string[]
  // Where the column sits
  x: number
  bottom: number
}

interface Layout {
  cell: number
  width: number
  gap: number
  groupGap: number
}

const SHORT_LAYOUT: Layout = { cell: 18, width: 24, gap: 2, groupGap: 5 }
const LONG_LAYOUT: Layout = { cell: 9, width: 20, gap: 2, groupGap: 4 }

// The top of counter `k` (from the bottom) in a stack grouped as `groups`
function cellTop(k: number, groups: number[], bottom: number, { cell, gap, groupGap }: Layout) {
  let group = 0
  let seen = groups[0]
  while (k >= seen && group < groups.length - 1) seen += groups[++group]
  return bottom - (k + 1) * cell - k * gap - group * groupGap
}

const shortColumns: Column[] = SHORT.map((guess, i) => ({
  word: guess.word,
  groups: guess.bets.map((bet) => bet.counters),
  labels: guess.bets.map((bet) => bet.word),
  x: 60 + i * 108,
  bottom: 240,
}))

const longColumns = (groupsOf: (counters: number) => number[]): Column[] =>
  LONG.map((guess, i) => ({
    word: guess.word,
    groups: groupsOf(guess.counters),
    x: 46 + (i % 6) * 76,
    bottom: i < 6 ? 156 : 284,
  }))

const asBet = (counters: number) => [counters, COUNTERS - counters]
const EVEN = [EVEN_COUNTERS, COUNTERS - EVEN_COUNTERS]
const BLIND = Array.from({ length: STORY_PERPLEXITY }, () => EVEN_COUNTERS)

// Seconds a show takes to play out
const LENGTH: Record<Show, number> = { first: 2.4, short: 2.4, product: 2.6, long: 2.4, even: 2.2, blind: 0.6, named: 0.6 }

const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t))

// The story's guessing game: counters stacked over each word, the share on
// the word that came in sage. Plays by itself; with reduced motion it shows
// the end.
export default function Bets({ show }: { show: Show }) {
  const reducedMotion = usePrefersReducedMotion()
  const started = useRef<number | null>(null)
  const [time, setTime] = useState(reducedMotion ? Infinity : 0)
  const end = LENGTH[show]

  useAnimationFrame((now) => {
    if (time >= end) return
    started.current ??= now
    setTime((now - started.current) / 1000)
  })

  const short = show === 'first' || show === 'short' || show === 'product'
  const layout = short ? SHORT_LAYOUT : LONG_LAYOUT
  const columns = short
    ? show === 'first'
      ? shortColumns.slice(0, 1)
      : shortColumns
    : show === 'long' || show === 'named'
      ? longColumns(asBet)
      : show === 'even'
        ? longColumns(() => EVEN)
        : longColumns(() => BLIND)
  // Where the 'even' show starts from: each column's real bet
  const from = longColumns(asBet)
  const morph = show === 'even' ? smooth((time - 0.4) / 1.2) : 1

  // How far each column has come in: counters drop in, then the word shows
  const arrival = (i: number) => {
    if (show === 'first') return { drop: time / 1.2, shown: time >= 1.5 }
    if (show === 'short' || show === 'product') return { drop: (time - i * 0.45) / 0.5, shown: time >= i * 0.45 + 0.5 }
    if (show === 'long') return { drop: (time - i * 0.12) / 0.4, shown: time >= i * 0.12 + 0.3 }
    return { drop: 1, shown: true }
  }

  const header =
    show === 'first'
      ? time >= 1.5
        ? `1 counter of 8 on “dog”: a chance of ${fraction(1)}`
        : '8 counters on what comes next'
      : show === 'short'
        ? 'The share on the word that came'
        : show === 'product'
          ? `${SHORT.map((_, i) => fraction(shortColumns[i].groups[0])).join(' × ')} = 1 in ${grouped(SHORT_ODDS)}`
          : show === 'long'
            ? `6 × ${fraction(1)} and 6 × ${fraction(4)} = 1 in ${grouped(LONG_ODDS)}`
            : show === 'even'
              ? `${fraction(EVEN_COUNTERS)} at every word = 1 in ${grouped(LONG_ODDS)}`
              : show === 'blind'
                ? `A blind pick among ${STORY_PERPLEXITY} words, every time`
                : `Perplexity ${STORY_PERPLEXITY}: like a blind pick among ${STORY_PERPLEXITY}`
  const headerShown = show !== 'product' && show !== 'long' ? true : time >= end - 0.4

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={labelOf(show)}>
      <text
        x={WIDTH / 2}
        y={22}
        textAnchor="middle"
        className={`font-mono text-[12px] ${show === 'named' ? 'fill-sage-ink' : 'fill-ink'}`}
        style={{ opacity: headerShown ? 1 : 0, transition: 'opacity 0.3s' }}
      >
        {header}
      </text>
      {show === 'named' && (
        <text x={WIDTH / 2} y={40} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px]">
          sage: P(next word | the words before)
        </text>
      )}
      {/* The word your friend reads first */}
      <text x={short ? 14 : 8} y={(short ? 240 : 156) + 18} className="fill-zinc-faded font-mono text-[12px]">
        {STORY_START}
      </text>
      {columns.map((column, i) => {
        const { drop, shown } = arrival(i)
        const start = from[i]
        return (
          <g key={i}>
            {Array.from({ length: COUNTERS }, (_, k) => {
              // Counters fall in from the bottom one after another
              const fall = smooth(drop * 1.6 - (k / COUNTERS) * 0.6)
              const settled = cellTop(k, column.groups, column.bottom, layout)
              const y =
                show === 'even'
                  ? cellTop(k, start.groups, start.bottom, layout) * (1 - morph) + settled * morph
                  : settled - (1 - fall) * 30
              const sageFrom = k < start.groups[0] ? 1 : 0
              const sageTo = k < column.groups[0] ? 1 : 0
              const sage = show === 'even' ? sageFrom * (1 - morph) + sageTo * morph : shown ? sageTo : 0
              return (
                <g key={k} style={{ opacity: show === 'even' ? 1 : fall }}>
                  <rect x={column.x} y={y} width={layout.width} height={layout.cell} rx={3} className="fill-ink" fillOpacity={0.2} />
                  <rect x={column.x} y={y} width={layout.width} height={layout.cell} rx={3} className="fill-sage" fillOpacity={sage} />
                </g>
              )
            })}
            {/* What each group of counters was bet on */}
            {column.labels?.map((label, g) => {
              const first = column.groups.slice(0, g).reduce((a, b) => a + b, 0)
              const last = first + column.groups[g] - 1
              const middle =
                (cellTop(first, column.groups, column.bottom, layout) +
                  cellTop(last, column.groups, column.bottom, layout) +
                  layout.cell) /
                2
              return (
                <text
                  key={label}
                  x={column.x + layout.width + 6}
                  y={middle + 4}
                  className={`font-mono text-[11px] ${g === 0 && shown ? 'fill-ink' : 'fill-zinc-faded'}`}
                  style={{ opacity: smooth(drop) }}
                >
                  {label}
                </text>
              )
            })}
            {/* The word that came, and its chance */}
            <g style={{ opacity: shown ? 1 : 0, transition: 'opacity 0.3s' }}>
              <text
                x={short ? column.x : column.x + layout.width / 2}
                y={column.bottom + 18}
                textAnchor={short ? 'start' : 'middle'}
                className="fill-ink font-mono text-[12px]"
              >
                {column.word}
              </text>
              {short && (
                <text x={column.x} y={column.bottom + 36} className="fill-sage-ink font-mono text-[12px] tabular-nums">
                  {fraction(column.groups[0])}
                </text>
              )}
            </g>
          </g>
        )
      })}
    </svg>
  )
}

function labelOf(show: Show) {
  switch (show) {
    case 'first':
      return 'Eight counters bet on the word after “The”: three on cat, two on man, two on ball, one on dog. The word is dog, so the chance was 1 in 8.'
    case 'short':
    case 'product':
      return `The sentence “The dog chased the cat”: the word that came got 1 of 8 counters, 1 of 8, 4 of 8 and 4 of 8, which multiply to 1 in ${grouped(SHORT_ODDS)}.`
    case 'long':
      return `A twelve-word sentence where half the words got 1 of 8 counters and half got 4 of 8: in all, 1 in ${grouped(LONG_ODDS)}.`
    case 'even':
      return `The same twelve words, each now with 2 of 8 counters, a quarter: the same total of 1 in ${grouped(LONG_ODDS)}.`
    case 'blind':
      return `Every word with eight counters split evenly over ${STORY_PERPLEXITY} words, one of them right.`
    default:
      return `The twelve words again with their real chances, 1 in 8 or a half, each the model's probability of the next word given the words before: a perplexity of ${STORY_PERPLEXITY}.`
  }
}
