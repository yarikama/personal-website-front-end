import { labAttention, pct, sameInOtherOrder, SENTENCES, VOCAB, type Sentence, type Settings } from './model'

const WIDTH = 460
const HEIGHT = 286
const CELL = 40
const GAP = 4
const GRID = { x: 74, y: 44 }
const BARS = { x: 310, label: 346, w: 70, top: 74, step: 28 }

const cellX = (j: number) => GRID.x + j * CELL
const cellY = (i: number) => GRID.y + i * CELL

// One layer of self-attention on the toy sentence: row i is word i asking,
// each cell how much of its attention goes to the word in that column (more
// solid: more). The asking word's row is sage, its weights printed under the
// grid, and its new vector, how much of each word it took in, beside it.
export default function Lab({ sentence, settings, asking }: { sentence: Sentence; settings: Settings; asking: number }) {
  const words = SENTENCES[sentence]
  const { weights, outputs } = labAttention(sentence, settings)
  const row = weights[asking]
  const output = outputs[asking]
  const same = sameInOtherOrder(sentence, settings, asking)
  const word = words[asking]

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      role="img"
      aria-label={`“${words.join(' ')}”. Word ${asking + 1}, “${word}”, puts ${words
        .map((w, j) => `${pct(row[j])} on ${w}`)
        .join(', ')}. Its new vector is ${VOCAB.map((v, d) => `${pct(output[d])} ${v}`).join(', ')}.`}
    >
      <text x={GRID.x} y={12} className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
        Attends to →
      </text>
      {words.map((w, j) => (
        <text
          key={`c${j}`}
          x={cellX(j) + (CELL - GAP) / 2}
          y={GRID.y - 10}
          textAnchor="middle"
          className="fill-ink font-mono text-[11px]"
        >
          {w}
        </text>
      ))}
      {words.map((w, i) => (
        <text
          key={`r${i}`}
          x={GRID.x - 10}
          y={cellY(i) + (CELL - GAP) / 2 + 4}
          textAnchor="end"
          className={`${i === asking ? 'fill-sage-ink' : 'fill-ink'} font-mono text-[11px]`}
        >
          {i + 1} {w}
        </text>
      ))}

      {/* The asking word's row */}
      <rect
        x={GRID.x - 4}
        y={cellY(asking) - 4}
        width={words.length * CELL + GAP + 4}
        height={CELL + 4}
        rx={8}
        className="fill-none stroke-sage"
        strokeWidth={1.5}
      />
      {weights.map((ws, i) =>
        ws.map((w, j) => {
          const hidden = settings.mask && j > i
          const mine = i === asking
          return (
            <rect
              key={`${i}-${j}`}
              x={cellX(j)}
              y={cellY(i)}
              width={CELL - GAP}
              height={CELL - GAP}
              rx={5}
              className={
                hidden ? 'fill-none stroke-zinc-300 dark:stroke-zinc-200/25' : mine ? 'fill-sage' : 'fill-ink'
              }
              fillOpacity={hidden ? undefined : mine ? 0.1 + 0.9 * w : 0.05 + 0.85 * w}
              strokeDasharray={hidden ? '3 3' : undefined}
            />
          )
        }),
      )}

      {/* The asking word's weights, under their columns */}
      {row.map((w, j) => (
        <text
          key={`w${j}`}
          x={cellX(j) + (CELL - GAP) / 2}
          y={cellY(words.length) + 16}
          textAnchor="middle"
          className="fill-ink font-mono text-[11px] tabular-nums"
        >
          {settings.mask && j > asking ? '—' : pct(w)}
        </text>
      ))}
      <text
        x={GRID.x - 10}
        y={cellY(words.length) + 16}
        textAnchor="end"
        className="fill-sage-ink font-mono text-[10px] uppercase tracking-widest"
      >
        {word}
      </text>

      {/* Its new vector */}
      <text x={BARS.x} y={GRID.y - 10} className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
        {word}’s vector
      </text>
      {VOCAB.map((v, d) => {
        const y = BARS.top + d * BARS.step
        return (
          <g key={v}>
            <text x={BARS.x} y={y + 4} className="fill-ink font-mono text-[11px]">
              {v}
            </text>
            <rect
              x={BARS.label}
              y={y - 6}
              width={BARS.w}
              height={12}
              rx={3}
              className="fill-ink"
              fillOpacity={0.08}
            />
            <rect x={BARS.label} y={y - 6} width={BARS.w * output[d]} height={12} rx={3} className="fill-sage" />
            <text
              x={BARS.label + BARS.w + 4}
              y={y + 4}
              className="fill-ink font-mono text-[11px] tabular-nums"
            >
              {pct(output[d])}
            </text>
          </g>
        )
      })}
      <text x={BARS.x} y={BARS.top + 4 * BARS.step + 14} className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
        Swapped
      </text>
      <text
        x={BARS.x}
        y={BARS.top + 4 * BARS.step + 32}
        className={`${same ? 'fill-ink' : 'fill-sage-ink'} font-mono text-[11px]`}
      >
        {same ? 'same' : 'changes'}
      </text>
    </svg>
  )
}
