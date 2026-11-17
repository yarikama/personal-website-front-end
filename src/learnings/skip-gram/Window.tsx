import { usePlay } from '../../components/explain/useLoop'
import { PAIRS, SENTENCES, TOKENS, WINDOW } from './model'

// The story's first scene: the twelve sentences, a word at a time held up
// with the words up to WINDOW places either side of it, and the pairs each
// one gives. It plays through every word once.

const WIDTH = 440
const ROW = 23
const TOP = 22
const LEFT = 14
// Monospace, so a word's place is its first letter's
const SIZE = 13
const CHAR = SIZE * 0.6
const HEIGHT = TOP + ROW * SENTENCES.length + 4
// The pairs of the word held, on the right
const LIST_X = 262
// Real milliseconds a word is held
const PACE = 150

// Every token, with its sentence, its place in it and where it starts on its row
const PLACES = SENTENCES.flatMap((sentence, row) => {
  let chars = 0
  return sentence.map((word, at) => {
    const place = { row, at, word, x: LEFT + chars * CHAR }
    chars += word.length + 1
    return place
  })
})
// The words a token is paired with: every word in its window
const pairsAt = (row: number, at: number) =>
  SENTENCES[row].flatMap((word, j) => (j !== at && Math.abs(j - at) <= WINDOW ? [word] : []))
// How many pairs there are once each token has been held
const SO_FAR = PLACES.reduce<number[]>((sums, p) => [...sums, (sums.at(-1) ?? 0) + pairsAt(p.row, p.at).length], [])

export default function Window() {
  const played = usePlay(TOKENS, PACE)
  const done = played >= TOKENS
  const held = done ? null : PLACES[Math.floor(played)]
  const count = done ? PAIRS.length : SO_FAR[Math.floor(played)]
  const guesses = held ? pairsAt(held.row, held.at) : []

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 font-mono text-[0.875rem] uppercase tracking-widest">
        <span className="text-zinc-faded">Twelve sentences</span>
        <span className="tabular-nums text-ink">{count} pairs</span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`Twelve short sentences about a cat, a dog, milk, water, a sofa and a rug. Each word in turn is held up with the words up to ${WINDOW} places either side of it, giving ${PAIRS.length} pairs of a word and a neighbour.`}
      >
        {held &&
          PLACES.filter((p) => p.row === held.row && Math.abs(p.at - held.at) <= WINDOW).map((p) => (
            <rect
              key={p.at}
              x={p.x - 3}
              y={TOP + p.row * ROW - SIZE + 1}
              width={p.word.length * CHAR + 6}
              height={SIZE + 6}
              rx={5}
              className={p.at === held.at ? 'fill-sage' : 'fill-paper stroke-sage'}
              fillOpacity={p.at === held.at ? 0.3 : 1}
              strokeWidth={1.5}
            />
          ))}
        {PLACES.map((p, i) => (
          <text
            key={i}
            x={p.x}
            y={TOP + p.row * ROW + 2}
            className={`font-mono text-[13px] ${done || i <= played ? 'fill-ink' : 'fill-zinc-faded'}`}
          >
            {p.word}
          </text>
        ))}
        {held && (
          <g>
            <text x={LIST_X} y={TOP + 2} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
              Guess from {held.word}
            </text>
            {guesses.map((word, j) => (
              <text key={j} x={LIST_X} y={TOP + (j + 1) * ROW + 4} className="fill-ink font-mono text-[13px]">
                {held.word} → {word}
              </text>
            ))}
          </g>
        )}
        {done && (
          <text x={LIST_X} y={TOP + 2} className="fill-sage-ink font-mono text-[11px] uppercase tracking-widest">
            {PAIRS.length} pairs
          </text>
        )}
      </svg>
    </div>
  )
}
