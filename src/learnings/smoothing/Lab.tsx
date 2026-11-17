import { END, factors, LAB, num, pct, SENTENCES, START, tokens, UNK, type LabSentence } from './model'

const WIDTH = 560
const HEIGHT = 220
const TOP = 62
const TRACK = 110
const COLUMN = WIDTH / 5

const shown = (w: string) => (w === START ? '<s>' : w === END ? '</s>' : w)

// Which sentence to score: Choice's buttons, but wrapping, since a
// sentence is too long for four in a row on a phone
export function Pick({ value, onChange }: { value: LabSentence; onChange: (value: LabSentence) => void }) {
  return (
    <div className="flex flex-col gap-2" role="radiogroup" aria-label="Sentence">
      <span className="font-mono text-[0.875rem] uppercase tracking-widest text-zinc-faded">Sentence</span>
      <div className="flex flex-wrap gap-2">
        {LAB.map((option) => (
          <button
            key={option}
            role="radio"
            aria-checked={option === value}
            onClick={() => onChange(option)}
            className={`rounded-xl border px-3 py-1.5 font-mono text-[0.875rem] transition-colors ${
              option === value
                ? 'border-sage bg-sage/15 text-ink'
                : 'border-zinc-300 dark:border-zinc-200/20 text-zinc-faded hover:text-ink'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

// The twelve sentences the model counted, for checking any count by eye
export function Training() {
  return (
    <ol className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 font-mono text-[0.875rem] text-ink">
      {SENTENCES.map((s) => (
        <li key={s}>{s}</li>
      ))}
    </ol>
  )
}

// A sentence scored pair by pair: each column is one next-word chance, its
// sage bar the chance from 0 to 1 and the fraction under it how it was
// worked out. A pair never seen, unsmoothed, shows an empty track and 0.
export default function Lab({ sentence, k }: { sentence: string; k: number }) {
  const parts = factors(sentence, k)
  const typed = sentence.split(' ')
  const read = tokens(sentence).slice(1, -1)
  const swapped = typed.filter((w, i) => read[i] === UNK && w !== UNK)
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      role="img"
      aria-label={`“${sentence}” scored one pair at a time with k = ${k}: ${parts
        .map((f) => `${shown(f.next)} after ${shown(f.prev)}, ${pct(f.p)}`)
        .join('; ')}.`}
    >
      {swapped.length > 0 && (
        <text x={WIDTH / 2} y={14} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px]">
          never seen in training: “{swapped.join('”, “')}” is read as UNK
        </text>
      )}
      {parts.map((f, i) => {
        // A shorter sentence sits in the middle
        const x = COLUMN * (i + 0.5 + (5 - parts.length) / 2)
        const fill = f.p * TRACK
        const zero = f.p === 0
        return (
          <g key={i}>
            <text x={x} y={TOP - 28} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px]">
              {shown(f.prev)}
            </text>
            <text x={x} y={TOP - 10} textAnchor="middle" className="fill-ink font-mono text-[11px]">
              → {shown(f.next)}
            </text>
            <rect x={x - 14} y={TOP} width={28} height={TRACK} rx={4} className="fill-paper stroke-zinc-300 dark:stroke-zinc-200/25" />
            {fill > 0 && <rect x={x - 14} y={TOP + TRACK - fill} width={28} height={Math.max(1.5, fill)} rx={4} className="fill-sage" />}
            <text x={x} y={TOP + TRACK + 20} textAnchor="middle" className="fill-ink font-mono text-[11px] tabular-nums">
              {num(f.top)}/{num(f.bottom)}
            </text>
            <text
              x={x}
              y={TOP + TRACK + 38}
              textAnchor="middle"
              className={`font-mono text-[11px] tabular-nums ${zero ? 'fill-ink font-bold' : 'fill-zinc-faded'}`}
            >
              {zero ? 'zero' : f.p < 0.01 ? '<1%' : pct(f.p)}
            </text>
            {i > 0 && (
              <text x={x - COLUMN / 2} y={TOP + TRACK / 2 + 4} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px]">
                ×
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
