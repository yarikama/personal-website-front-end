import { useState, type KeyboardEvent } from 'react'
import { READ, sees, SOURCE, TARGET, type Family } from './model'

const WIDTH = 460
const HEIGHT = 236
const BOX = { w: 66, h: 28 }

// Where each family's figure opens: a word with words on both sides
const OPENING: Record<Family, number> = { 'Encoder only': 3, 'Decoder only': 2, 'Encoder–decoder': 2 }

// Box centres for a row of `n` words, spread across the width
const centres = (n: number, gap = 86) => Array.from({ length: n }, (_, i) => WIDTH / 2 + (i - (n - 1) / 2) * gap)

const quote = (word: string) => `“${word}”`

function press(event: KeyboardEvent, act: () => void) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  act()
}

// A row of words; the chosen one in sage, the ones it can see in ink, the
// rest dashed. Each word can be chosen.
function Row({
  words,
  y,
  chosen,
  seen,
  onChoose,
}: {
  words: readonly string[]
  y: number
  chosen: number | null
  seen: number[]
  onChoose?: (i: number) => void
}) {
  const xs = centres(words.length)
  return (
    <g>
      {words.map((word, i) => {
        const on = chosen === i
        const visible = on || seen.includes(i)
        const body = (
          <>
            <rect
              x={xs[i] - BOX.w / 2}
              y={y - BOX.h / 2}
              width={BOX.w}
              height={BOX.h}
              rx={9}
              className={on ? 'fill-sage stroke-sage' : visible ? 'fill-paper stroke-ink' : 'fill-paper stroke-zinc-300 dark:stroke-zinc-200/25'}
              fillOpacity={on ? 0.22 : 1}
              strokeWidth={on ? 1.8 : 1.1}
              strokeDasharray={visible ? undefined : '3 4'}
            />
            <text x={xs[i]} y={y + 4.5} textAnchor="middle" className={`font-mono text-[12px] ${visible ? 'fill-ink' : 'fill-zinc-faded'}`}>
              {word}
            </text>
          </>
        )
        return onChoose ? (
          <g
            key={i}
            role="button"
            tabIndex={0}
            aria-pressed={on}
            aria-label={`Look from ${quote(word)}`}
            onClick={() => onChoose(i)}
            onKeyDown={(event) => press(event, () => onChoose(i))}
            className="cursor-pointer outline-none [&:focus-visible>rect]:stroke-ink"
          >
            {body}
          </g>
        ) : (
          <g key={i}>{body}</g>
        )
      })}
    </g>
  )
}

// Arcs over a row, from the chosen word to each word it sees
function Arcs({ n, y, from, to }: { n: number; y: number; from: number; to: number[] }) {
  const xs = centres(n)
  return (
    <g>
      {to
        .filter((j) => j !== from)
        .map((j) => {
          const lift = 18 + 14 * Math.abs(j - from)
          const top = y - BOX.h / 2 - 2
          return (
            <path
              key={j}
              d={`M${xs[from]},${top} C${xs[from]},${top - lift} ${xs[j]},${top - lift} ${xs[j]},${top}`}
              className="fill-none stroke-sage"
              strokeWidth={1.8}
            />
          )
        })}
    </g>
  )
}

// What a word can look at in each of the three families. Choose a word to
// look from it.
export default function Families({ family }: { family: Family }) {
  const [at, setAt] = useState(OPENING[family])
  const both = family === 'Encoder–decoder'

  if (!both) {
    const seen = sees(family, at, READ.length)
    const y = 136
    const next = at + 1 < READ.length ? READ[at + 1] : '</s>'
    return (
      <div>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mx-auto w-full max-w-[36rem]" role="group" aria-label={`${family}: the words ${quote(READ[at])} can look at`}>
          <text x={4} y={20} className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
            {family === 'Encoder only' ? 'A stack of encoder blocks (BERT’s shape)' : 'A stack of decoder blocks (GPT’s shape)'}
          </text>
          <Arcs n={READ.length} y={y} from={at} to={seen} />
          <Row words={READ} y={y} chosen={at} seen={seen} onChoose={setAt} />
          <text x={WIDTH / 2} y={y + 50} textAnchor="middle" className="fill-ink font-mono text-[11px]">
            {family === 'Encoder only' ? 'out: a vector for each word, read in full context' : `out: a guess at the next word, ${quote(next)}`}
          </text>
        </svg>
        <p className="mt-3 text-center text-sm text-ink">
          {quote(READ[at])} looks at {seen.length === READ.length ? `all ${READ.length} words, before and after it` : seen.map((j) => quote(READ[j])).join(', ')}.
        </p>
      </div>
    )
  }

  const seen = sees('Decoder only', at, TARGET.length)
  const targetY = 96
  const sourceY = 186
  const tx = centres(TARGET.length)
  const sx = centres(SOURCE.length)
  const next = at + 1 < TARGET.length ? TARGET[at + 1] : '</s>'
  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mx-auto w-full max-w-[36rem]" role="group" aria-label={`Encoder–decoder: the words ${quote(TARGET[at])} can look at`}>
        <text x={4} y={20} className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
          Decoder writes French
        </text>
        <text x={4} y={sourceY + 38} className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
          Encoder read English
        </text>
        {/* Cross-attention: from the chosen French word down to every English word */}
        {SOURCE.map((_, j) => (
          <path
            key={j}
            d={`M${tx[at]},${targetY + BOX.h / 2 + 2} C${tx[at]},${(targetY + sourceY) / 2} ${sx[j]},${(targetY + sourceY) / 2} ${sx[j]},${sourceY - BOX.h / 2 - 2}`}
            className="fill-none stroke-sage"
            strokeWidth={1.8}
            strokeDasharray="5 4"
          />
        ))}
        <Arcs n={TARGET.length} y={targetY} from={at} to={seen} />
        <Row words={TARGET} y={targetY} chosen={at} seen={seen} onChoose={setAt} />
        <Row words={SOURCE} y={sourceY} chosen={null} seen={SOURCE.map((_, j) => j)} />
      </svg>
      <p className="mt-3 text-center text-sm text-ink">
        To write {quote(next)}, {quote(TARGET[at])} looks back at {seen.map((j) => quote(TARGET[j])).join(', ')} (solid), and
        through cross-attention at all {SOURCE.length} English words (dashed).
      </p>
    </div>
  )
}
