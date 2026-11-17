import { useRef, useState } from 'react'
import { useAnimationFrame } from 'motion/react'
import { usePrefersReducedMotion } from '../../hooks'
import { MARKED, pct, QUIZZES, ratio, two } from './model'

const WIDTH = 480
const HEIGHT = 232
const TILE = 62
const GAP = 10
const LEFT = (WIDTH - 6 * TILE - 5 * GAP) / 2
const KEY_TOP = 44
const ANSWER_TOP = 132
const TALL = 30
const ARC = ANSWER_TOP + TALL + 6

const tileX = (i: number) => LEFT + i * (TILE + GAP)
const middle = (i: number) => tileX(i) + TILE / 2

// When each part of a quiz is marked, in seconds from the step's start
const WORD_EVERY = 0.32
const PAIR_EVERY = 0.28
const wordAt = (i: number) => 0.3 + i * WORD_EVERY

const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t))

// The story's marking: the answer key along the top, a student's answer
// under it. Each credited word turns sage and draws a line to the key word
// it used up; with pairs on, an arc under each pair of neighbours, solid sage
// when the key has that pair. Plays by itself; with reduced motion it shows
// the end.
export default function Marking({ step }: { step: number }) {
  const quiz = QUIZZES[step]
  const marked = MARKED[step]
  const named = step === QUIZZES.length - 1
  const reducedMotion = usePrefersReducedMotion()
  const started = useRef<number | null>(null)
  const [time, setTime] = useState(reducedMotion ? Infinity : 0)
  const wordsDone = wordAt(marked.answer.length)
  const pairsDone = wordsDone + 0.2 + (quiz.pairs ? marked.pairs.total * PAIR_EVERY : 0)
  const end = pairsDone + 0.4

  useAnimationFrame((now) => {
    if (time >= end) return
    started.current ??= now
    setTime((now - started.current) / 1000)
  })

  // Which key words have been used up so far
  const usedKey = new Set<number>()
  marked.links.forEach((j, i) => {
    if (j >= 0 && time >= wordAt(i) + 0.15) usedKey.add(j)
  })

  const { words, pairs } = marked
  const score = named
    ? `precision: unigram ${ratio(words)} · bigram ${ratio(pairs)} · brevity penalty ${two(marked.bp)}`
    : quiz.charge
      ? `words ${ratio(words)} · pairs ${ratio(pairs)} · × ${two(marked.bp)} for ${marked.answer.length} words of ${marked.key.length}`
      : quiz.pairs
        ? `words ${ratio(words)} · pairs ${ratio(pairs)}`
        : `${words.matched} of ${words.total} words in the key: ${pct(words.matched / words.total)}`

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={labelOf(step)}>
      {/* Lines from each credited word up to the key word it used */}
      {marked.links.map((j, i) => {
        if (j < 0) return null
        const grow = smooth((time - wordAt(i)) / 0.3)
        const x1 = middle(i)
        const y1 = ANSWER_TOP
        const x2 = middle(j)
        const y2 = KEY_TOP + TALL
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x1 + (x2 - x1) * grow}
            y2={y1 + (y2 - y1) * grow}
            className="stroke-sage"
            strokeWidth={2}
            strokeLinecap="round"
          />
        )
      })}

      {/* The row names, over the lines */}
      <text x={LEFT} y={KEY_TOP - 12} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
        {named ? 'Reference' : 'Answer key'}
      </text>
      <text
        x={LEFT}
        y={ANSWER_TOP - 12}
        className="fill-zinc-faded stroke-paper font-mono text-[11px] uppercase tracking-widest"
        strokeWidth={5}
        paintOrder="stroke"
      >
        {named ? 'Candidate' : 'Student’s answer'}
      </text>

      {/* The key */}
      {marked.key.map((word, j) => (
        <g key={j}>
          <rect
            x={tileX(j)}
            y={KEY_TOP}
            width={TILE}
            height={TALL}
            rx={8}
            className={usedKey.has(j) ? 'fill-sage' : 'fill-ink'}
            fillOpacity={usedKey.has(j) ? 0.35 : 0.07}
          />
          <text x={middle(j)} y={KEY_TOP + 20} textAnchor="middle" className="fill-ink font-mono text-[12px]">
            {word}
          </text>
        </g>
      ))}

      {/* The answer, marked a word at a time */}
      {marked.answer.map((word, i) => {
        const shown = time >= wordAt(i)
        const credited = shown && words.grams[i].matched
        return (
          <g key={i}>
            <rect
              x={tileX(i)}
              y={ANSWER_TOP}
              width={TILE}
              height={TALL}
              rx={8}
              className={credited ? 'fill-sage stroke-sage' : 'fill-ink stroke-ink'}
              fillOpacity={credited ? 0.35 : 0.07}
              strokeOpacity={credited ? 1 : shown ? 0.45 : 0}
              strokeWidth={1.5}
            />
            <text x={middle(i)} y={ANSWER_TOP + 20} textAnchor="middle" className="fill-ink font-mono text-[12px]">
              {word}
            </text>
          </g>
        )
      })}

      {/* Pairs of neighbours: solid sage when the key has the pair */}
      {quiz.pairs &&
        pairs.grams.map((pair, i) => {
          const at = wordsDone + 0.2 + i * PAIR_EVERY
          const grow = smooth((time - at) / 0.25)
          const x1 = middle(i) + 4
          const x2 = middle(i + 1) - 4
          return (
            <path
              key={i}
              d={`M${x1},${ARC} Q${(x1 + x2) / 2},${ARC + 26} ${x2},${ARC}`}
              fill="none"
              className={pair.matched ? 'stroke-sage' : 'stroke-ink'}
              strokeOpacity={pair.matched ? grow : 0.4 * grow}
              strokeWidth={pair.matched ? 2.5 : 1.5}
              strokeDasharray={pair.matched ? undefined : '4 4'}
            />
          )
        })}

      <text
        x={WIDTH / 2}
        y={HEIGHT - 12}
        textAnchor="middle"
        className={`font-mono text-[11px] ${named ? 'fill-sage-ink' : 'fill-ink'}`}
        style={{ opacity: time >= pairsDone ? 1 : 0, transition: 'opacity 0.3s' }}
      >
        {score}
      </text>
    </svg>
  )
}

function labelOf(step: number) {
  const marked = MARKED[step]
  const answer = marked.answer.join(' ')
  const { words, pairs } = marked
  switch (step) {
    case 0:
      return `The answer key “the dog slept on the rug” above the answer “${answer}”: every word but “a” is in the key, ${words.matched} of ${words.total}.`
    case 1:
      return 'The answer “the” six times: every “the” is linked to a “the” in the key, so all 6 count.'
    case 2:
      return 'The same answer with each key word used once: the key’s two “the”s take the first two, and the other four do not count, 2 of 6.'
    case 3:
      return `The answer “${answer}”: each word links to a different key word, ${words.matched} of ${words.total}, but none of its ${pairs.total} pairs of neighbours appear side by side in the key.`
    case 4:
      return 'The answer “the dog slept”: its 3 words and 2 pairs all match the start of the key.'
    case 5:
      return `The answer “the dog slept”, 3 words against a key of 6: its perfect score is multiplied by ${two(marked.bp)}.`
    default:
      return `The reference “the dog slept on the rug” above the candidate “${answer}”: unigram precision ${ratio(words)}, bigram precision ${ratio(pairs)}, brevity penalty ${two(marked.bp)}.`
  }
}
