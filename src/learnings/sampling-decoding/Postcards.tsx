import { useRef, useState } from 'react'
import { useAnimationFrame } from 'motion/react'
import { usePrefersReducedMotion } from '../../hooks'
import {
  BEACH,
  chancesOf,
  COLOUR,
  FRIENDS,
  JOKE_VOTES,
  kept,
  STORY_K,
  STORY_P,
  STOVE,
  storyDraws,
  storyJokes,
  topK,
  topP,
  type Blank,
} from './model'

export type Show = 'votes' | 'drawn' | 'tail' | 'five' | 'fixed' | 'nucleus' | 'named'

const WIDTH = 600
const HEIGHT = 270

// Seconds a show takes to play out
const LENGTH: Record<Show, number> = { votes: 0.8, drawn: 2.2, tail: 0.8, five: 2.2, fixed: 1.4, nucleus: 1.4, named: 0.4 }

const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t))

// The story's postcards: the friends' answers as bars, and a hundred cards
// drawn from them. Plays by itself; with reduced motion it shows the end.
export default function Postcards({ show }: { show: Show }) {
  const reducedMotion = usePrefersReducedMotion()
  const started = useRef<number | null>(null)
  const [time, setTime] = useState(reducedMotion ? Infinity : 0)
  const end = LENGTH[show]

  useAnimationFrame((now) => {
    if (time >= end) return
    started.current ??= now
    setTime((now - started.current) / 1000)
  })

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={labelOf(show)}>
      {show === 'fixed' || show === 'nucleus' || show === 'named' ? (
        <Panels show={show} time={time} />
      ) : (
        <Beach show={show} time={time} />
      )}
    </svg>
  )
}

// One blank, the beach, with a grid of a hundred postcards beside it
function Beach({ show, time }: { show: Show; time: number }) {
  const baseline = 236
  const perVote = 3.9
  const top = (i: number) => (i < 5 ? 24 + i * 26 : 24 + 5 * 26 + 6 + (i - 5) * 9)
  const width = (i: number) => (i < 5 ? 18 : 6)
  const tailStart = top(5)
  const tailEnd = top(BEACH.words.length - 1) + width(BEACH.words.length - 1)
  const cut = show === 'five'
  const coloured = show !== 'votes'
  const drawn = show === 'votes' ? null : show === 'five' ? storyDraws.five : storyDraws.all
  const silly = drawn ? drawn.filter((i) => !BEACH.words[i].sensible).length : 0
  // Cards are dealt one after another in the shows that draw; otherwise all at once
  const dealt = show === 'drawn' || show === 'five' ? (time - 0.2) / 1.8 : 1

  return (
    <g>
      <text x={20} y={22} className="fill-ink font-mono text-[12px]">
        “{BEACH.before} …”
      </text>
      <line x1={18} x2={tailEnd + 6} y1={baseline} y2={baseline} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
      {BEACH.words.map((w, i) => {
        const height = Math.max(2, w.votes * perVote)
        const opacity = !coloured ? 0.35 : w.sensible ? 1 : cut ? 0.12 : 0.85
        return (
          <g key={w.word}>
            <rect
              x={top(i)}
              y={baseline - height}
              width={width(i)}
              height={height}
              rx={i < 5 ? 3 : 1.5}
              className={coloured && w.sensible ? 'fill-sage' : 'fill-ink'}
              fillOpacity={opacity}
            />
            {i < 5 && (
              <text
                transform={`translate(${top(i) + 13}, ${baseline - height - 6}) rotate(-90)`}
                className="fill-ink font-mono text-[11px]"
              >
                {w.word} {w.votes}
              </text>
            )}
          </g>
        )
      })}
      {/* The tail: what it is, and what it adds up to */}
      <text x={tailStart} y={baseline - 30} className="fill-zinc-faded font-mono text-[11px]">
        {show === 'tail' ? `${JOKE_VOTES} jokes, 1 slip each` : cut ? 'thrown out' : `+ ${JOKE_VOTES} more words`}
      </text>
      {show === 'tail' && (
        <g>
          <path
            d={`M ${tailStart} ${baseline - 16} v -6 H ${tailEnd} v 6`}
            fill="none"
            className="stroke-ink"
            strokeWidth={1.5}
          />
          <text x={tailStart} y={baseline - 48} className="fill-ink font-mono text-[11px]">
            together: {JOKE_VOTES} slips of {FRIENDS}
          </text>
        </g>
      )}
      <text x={18} y={baseline + 22} className="fill-zinc-faded font-mono text-[11px]">
        {cut ? `only the ${STORY_K} most common words left in the hat` : `${FRIENDS} slips in the hat`}
      </text>

      {/* A hundred postcards, dealt one by one */}
      {Array.from({ length: FRIENDS }, (_, card) => {
        const x = 420 + (card % 10) * 18
        const y = 44 + Math.floor(card / 10) * 18
        // Each card fades in over the time of eight; the last is in by the end
        const shown = drawn ? smooth((dealt * (FRIENDS + 8) - card) / 8) : 0
        const sensible = drawn ? BEACH.words[drawn[card]].sensible : true
        return (
          <g key={card}>
            <rect x={x} y={y} width={16} height={16} rx={3} fill="none" className="stroke-zinc-300 dark:stroke-zinc-200/25" />
            <rect
              x={x}
              y={y}
              width={16}
              height={16}
              rx={3}
              className={sensible ? 'fill-sage' : 'fill-ink'}
              fillOpacity={shown * (sensible ? 0.85 : 0.9)}
            />
          </g>
        )
      })}
      <text x={420} y={baseline + 22} className="fill-zinc-faded font-mono text-[11px]">
        {drawn ? (
          <tspan style={{ opacity: dealt >= 1 ? 1 : 0, transition: 'opacity 0.3s' }}>
            <tspan className="fill-ink">{silly}</tspan> of {FRIENDS} cards silly
          </tspan>
        ) : (
          `${FRIENDS} postcards`
        )}
      </text>
    </g>
  )
}

// Several blanks side by side, each cut the same way
function Panels({ show, time }: { show: Show; time: number }) {
  const blanks = show === 'fixed' ? [STOVE, COLOUR] : [BEACH, STOVE, COLOUR]
  const n = blanks.length
  const gap = 28
  const width = (WIDTH - 32 - (n - 1) * gap) / n
  const title =
    show === 'fixed'
      ? `Keep the ${STORY_K} most common words`
      : show === 'nucleus'
        ? `Keep words until they hold ${Math.round(STORY_P * FRIENDS)} of ${FRIENDS} slips`
        : `Top-p = ${STORY_P}: draw from the nucleus`
  return (
    <g>
      <text x={WIDTH / 2} y={18} textAnchor="middle" className={`font-mono text-[12px] ${show === 'named' ? 'fill-sage-ink' : 'fill-ink'}`}>
        {title}
      </text>
      {blanks.map((blank, i) => (
        <Panel key={blank.name} blank={blank} show={show} time={time} x={16 + i * (width + gap)} width={width} />
      ))}
    </g>
  )
}

function Panel({ blank, show, time, x, width }: { blank: Blank; show: Show; time: number; x: number; width: number }) {
  const chances = chancesOf(blank)
  const keep = show === 'fixed' ? topK(chances, STORY_K) : topP(chances, STORY_P)
  const { count, votes, words } = kept(blank, keep)
  const baseline = 172
  const perVote = 1.4
  const pitch = Math.min(22, width / blank.words.length)
  const barWidth = Math.max(3, pitch * 0.7)
  // Kept words light up in turn, likeliest first
  const lit = smooth((time - 0.2) / 1.0) * count
  const strip = { y: 186, height: 14 }

  const bad = words.filter((w) => !w.sensible)
  const notes =
    show === 'fixed'
      ? bad.length > 0
        ? [`keeps ${bad.map((w) => w.word).join(' and ')}`, `${votes} of ${FRIENDS} slips`]
        : [`drops ${blank.words.length - count} ${blank === COLOUR ? 'colours' : 'words'}`, `${votes} of ${FRIENDS} slips`]
      : [`keeps ${count} ${count === 1 ? 'word' : blank === COLOUR ? 'colours' : 'words'}`, `${votes} of ${FRIENDS} slips`]

  // Where each word's share of the strip starts
  const starts = blank.words.map((_, i) => blank.words.slice(0, i).reduce((sum, w) => sum + w.votes, 0))
  return (
    <g>
      <text x={x} y={40} className="fill-ink font-mono text-[11px]">
        “…{blank.short}”
      </text>
      <line x1={x} x2={x + width} y1={baseline} y2={baseline} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
      {blank.words.map((w, i) => {
        const height = Math.max(1.5, w.votes * perVote)
        const on = keep[i] && i < lit
        const left = x + i * pitch + (pitch - barWidth) / 2
        return (
          <g key={w.word}>
            <rect
              x={left}
              y={baseline - height}
              width={barWidth}
              height={height}
              rx={1.5}
              className={on && w.sensible ? 'fill-sage' : 'fill-ink'}
              fillOpacity={on ? (w.sensible ? 1 : 0.85) : 0.15}
            />
            {/* A wrong word the cut let in, named on its bar */}
            {on && !w.sensible && (
              <text
                transform={`translate(${left + barWidth / 2 + 4}, ${baseline - height - 5}) rotate(-90)`}
                className="fill-ink font-mono text-[11px]"
              >
                {w.word}
              </text>
            )}
          </g>
        )
      })}
      {/* The slips as one strip: what the cut keeps of the hundred */}
      {blank.words.map((w, i) => {
        const from = x + (starts[i] / FRIENDS) * width
        const on = keep[i] && i < lit
        return (
          <rect
            key={w.word}
            x={from}
            y={strip.y}
            width={Math.max(0.5, (w.votes / FRIENDS) * width - 1)}
            height={strip.height}
            className={on && w.sensible ? 'fill-sage' : 'fill-ink'}
            fillOpacity={on ? (w.sensible ? 1 : 0.85) : 0.15}
          />
        )
      })}
      {show !== 'fixed' && (
        <g>
          <line
            x1={x + STORY_P * width}
            x2={x + STORY_P * width}
            y1={strip.y - 5}
            y2={strip.y + strip.height + 5}
            className="stroke-ink"
            strokeWidth={1.5}
          />
          <text x={x + STORY_P * width + 4} y={strip.y + strip.height + 14} className="fill-zinc-faded font-mono text-[10px]">
            {Math.round(STORY_P * 100)}%
          </text>
        </g>
      )}
      <g style={{ opacity: lit >= count ? 1 : 0, transition: 'opacity 0.3s' }}>
        <text x={x} y={236} className={`font-mono text-[11px] ${show === 'named' ? 'fill-sage-ink' : 'fill-ink'}`}>
          {show === 'named' ? `nucleus: ${count} ${count === 1 ? 'word' : 'words'}` : notes[0]}
        </text>
        <text x={x} y={252} className="fill-zinc-faded font-mono text-[11px]">
          {show === 'named' ? `${votes}% of the probability` : notes[1]}
        </text>
      </g>
    </g>
  )
}

function labelOf(show: Show) {
  const beach = `After “${BEACH.before}”, 36 friends say beach, 18 park, 10 lake, 7 zoo and 4 market, and ${JOKE_VOTES} others each say a different joke word.`
  switch (show) {
    case 'votes':
      return beach
    case 'drawn':
      return `${beach} A hundred postcards drawn from the slips: ${storyJokes} of them got a joke word.`
    case 'tail':
      return `The ${JOKE_VOTES} joke words have one slip each, but ${JOKE_VOTES} of the ${FRIENDS} slips together: ${storyJokes} of the hundred postcards.`
    case 'five':
      return `Only the five most common words stay in the hat. A hundred postcards drawn again: none is silly.`
    case 'fixed':
      return `Keeping the five most common words after “${STOVE.before}” keeps hot, warm, on, and the wrong words cold and wet; after “${COLOUR.before}” it keeps 5 of 12 colours, 49 of 100 slips, and drops 7.`
    case 'nucleus':
      return `Keeping words until they hold 70 of 100 slips keeps 4 words at the beach (71 slips), 1 at the stove (hot, 85 slips) and 8 colours (73 slips).`
    default:
      return `The same three blanks as a model's probabilities for the next word. Top-p at 0.7 samples from the nucleus: 4 words, 1 word and 8 words.`
  }
}
