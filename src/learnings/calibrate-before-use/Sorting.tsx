import type { ReactNode } from 'react'
import { cardTexts, pct, REVIEWS, sigmoid, type Prompt } from './model'

// The sorting figure every part of the page draws: the four sorted cards on
// top, and under them the twelve new reviews on a line of how sure the
// helper is that each is happy. Happy reviews are filled dots on the upper
// row, unhappy ones hollow on the lower; sage if sorted right, ink if not.
// The line is in log-odds, so a lean slides every dot by the same amount.

const WIDTH = 600
const HEIGHT = 250
const LEFT = 30
const RIGHT = 570
// Log-odds shown, either side of even
const SPAN = 4
const CARD_Y = 8
const CARD_H = 46
const GAP = 12
const LINE_TOP = 64
// Where the blank card's label sits, and its line starts
const BLANK_Y = 98
const HAPPY_Y = 140
const UNHAPPY_Y = 176
const AXIS_Y = 204
const TICKS = [0.05, 0.25, 0.5, 0.75, 0.95]

const zx = (z: number) => LEFT + ((Math.max(-SPAN, Math.min(SPAN, z)) + SPAN) / (2 * SPAN)) * (RIGHT - LEFT)
const logit = (p: number) => Math.log(p / (1 - p))
const label = 'fill-zinc-faded font-mono text-[10px] uppercase tracking-widest'

export interface SortingProps {
  prompt: Prompt
  // What every score is shifted by, in log-odds: the prompt's lean, or 0
  // once calibrated
  shift: number
  // How much of the dots and the blank card to show, 0 to 1
  shown?: number
  blank?: number | null
  // The blank card's own chance of happy, for its label
  blankChance?: number
  // Language-model words instead of the café's
  named?: boolean
  description: string
}

export default function Sorting({
  prompt,
  shift,
  shown = 1,
  blank = null,
  blankChance = 0.5,
  named = false,
  description,
}: SortingProps) {
  const cardW = (RIGHT - LEFT - GAP * 3) / 4
  const texts = cardTexts(prompt)
  const words = named
    ? { P: 'Positive', N: 'Negative', card: 'Demo', blank: '“N/A”', up: 'Positive', down: 'Negative' }
    : { P: 'Happy', N: 'Unhappy', card: 'Card', blank: 'Blank card', up: 'happy', down: 'unhappy' }
  const middle = zx(0)
  const blankX = zx(shift)
  // Keep the blank card's label inside the drawing
  const blankLabelX = Math.max(LEFT + 120, Math.min(RIGHT - 120, blankX))

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={description}>
      {/* The four sorted cards, first to last */}
      {prompt.map((l, i) => {
        const x = LEFT + i * (cardW + GAP)
        return (
          <g key={i}>
            <title>{texts[i]}</title>
            <rect
              x={x}
              y={CARD_Y}
              width={cardW}
              height={CARD_H}
              rx={10}
              className={l === 'P' ? 'fill-sage stroke-sage' : 'fill-paper stroke-ink'}
              fillOpacity={l === 'P' ? 0.22 : 1}
              strokeWidth={1.5}
            />
            {/* Ink, not faded: the faded grey misses AA on a sage card */}
            <text x={x + cardW / 2} y={CARD_Y + 18} textAnchor="middle" className={label.replace('fill-zinc-faded', 'fill-ink')}>
              {words.card} {i + 1}
              {i === 3 ? ' · last' : ''}
            </text>
            <text
              x={x + cardW / 2}
              y={CARD_Y + 36}
              textAnchor="middle"
              className="fill-ink font-mono text-[12px] uppercase tracking-widest"
            >
              {words[l]}
            </text>
          </g>
        )
      })}

      {/* The 50% line: right of it, the review is called happy */}
      <line x1={middle} x2={middle} y1={LINE_TOP} y2={AXIS_Y} className="stroke-zinc-400" strokeWidth={1.5} />
      <text x={middle - 8} y={LINE_TOP + 14} textAnchor="end" className={label}>
        ← called {words.down}
      </text>
      <text x={middle + 8} y={LINE_TOP + 14} className={label}>
        called {words.up} →
      </text>

      {/* The blank card: where an input with nothing to read lands */}
      {blank !== null && blank > 0 && (
        <g>
          <line
            x1={blankX}
            x2={blankX}
            y1={AXIS_Y}
            y2={AXIS_Y - blank * (AXIS_Y - BLANK_Y - 8)}
            className="stroke-ink"
            strokeWidth={2}
            strokeDasharray="5 4"
          />
          {blank >= 0.6 && (
          <text
            x={blankLabelX}
            y={BLANK_Y}
            textAnchor="middle"
            className="fill-ink stroke-paper font-mono text-[11px] uppercase tracking-widest"
            strokeWidth={5}
            paintOrder="stroke"
          >
            {words.blank}: {pct(sigmoid(shift))} {words.up}
            {Math.abs(sigmoid(shift) - blankChance) > 0.005 ? ` (was ${pct(blankChance)})` : ''}
          </text>
          )}
        </g>
      )}

      {/* Row names */}
      <text x={LEFT} y={HAPPY_Y - 14} className={label}>
        {named ? 'Positive reviews' : 'Happy reviews'}
      </text>
      <text x={LEFT} y={UNHAPPY_Y - 14} className={label}>
        {named ? 'Negative reviews' : 'Unhappy reviews'}
      </text>

      {/* The reviews */}
      {REVIEWS.map((r, i) => {
        const z = r.evidence + shift
        const right = z > 0 === r.happy
        const y = r.happy ? HAPPY_Y : UNHAPPY_Y
        const appear = Math.max(0, Math.min(1, shown * REVIEWS.length - i))
        if (appear <= 0) return null
        return (
          <circle
            key={r.text}
            cx={zx(z)}
            cy={y}
            r={5.5}
            className={
              r.happy ? (right ? 'fill-sage' : 'fill-ink') : right ? 'fill-paper stroke-sage' : 'fill-paper stroke-ink'
            }
            strokeWidth={r.happy ? 0 : 2.5}
            opacity={appear}
          >
            <title>{r.text}</title>
          </circle>
        )
      })}

      {/* The scale: chance of happy, spaced by log-odds */}
      <line x1={LEFT} x2={RIGHT} y1={AXIS_Y} y2={AXIS_Y} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
      {TICKS.map((p) => (
        <g key={p}>
          <line x1={zx(logit(p))} x2={zx(logit(p))} y1={AXIS_Y} y2={AXIS_Y + 5} className="stroke-zinc-400" />
          <text x={zx(logit(p))} y={AXIS_Y + 18} textAnchor="middle" className="fill-zinc-faded font-mono text-[10px]">
            {pct(p)}
          </text>
        </g>
      ))}
      <text x={(LEFT + RIGHT) / 2} y={AXIS_Y + 36} textAnchor="middle" className={label}>
        {named ? 'The model’s p(Positive)' : 'How sure the helper is it’s happy'}
      </text>
    </svg>
  )
}

// The key under the figure
export function SortingKey({ named = false }: { named?: boolean }) {
  const items: [string, ReactNode][] = [
    [named ? 'Positive review' : 'Happy review', <circle cx="7" cy="7" r="6" className="fill-sage" />],
    [named ? 'Negative review' : 'Unhappy review', <circle cx="7" cy="7" r="5" className="fill-paper stroke-sage" strokeWidth={2.5} />],
    ['Sorted wrong', <circle cx="7" cy="7" r="6" className="fill-ink" />],
  ]
  return (
    <div className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-2 font-mono text-[0.875rem] uppercase tracking-widest text-zinc-faded">
      {items.map(([text, mark]) => (
        <span key={text} className="inline-flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
            {mark}
          </svg>
          {text}
        </span>
      ))}
    </div>
  )
}
