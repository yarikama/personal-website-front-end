import { usePlay } from '../../components/explain/useLoop'
import {
  BAD_NOT_GOOD,
  CARDS,
  chanceOf,
  GOOD_NOT_BAD,
  LEARNED,
  LEARNED_CHANCES,
  LEARNED_VERDICTS,
  LIST_SCORES,
  LIST_VERDICTS,
  LIST_WEIGHTS,
  MOST_UNHAPPY,
  ORDER_ROW,
  pct,
  ROWS,
  signed,
  tally,
  VOCABULARY,
  weightOf,
  type Card,
  type Verdict,
} from './model'

export type Show = 'cards' | 'vocab' | 'counts' | 'list' | 'learned' | 'order' | 'named'

// How long each step plays, in seconds
const LENGTH: Record<Show, number> = {
  cards: 1.6,
  vocab: 1.6,
  counts: 2.2,
  list: 2,
  learned: 2,
  order: 1.2,
  named: 0.8,
}

// The card whose row the story points at
const SHOWN = 2

// Two layouts of one drawing. Wide: a card's words, then its row of counts,
// then its score, on one line. Narrow, for a phone: the words on a line of
// their own above the row, so the counts stay large.
interface Layout {
  width: number
  // Where the first card sits, and how far apart cards are
  top: number
  pitch: number
  // From a card's top: the baseline of its words, and the top of its cells
  textY: number
  cellY: number
  textX: number
  cellsX: number
  cell: number
  cellH: number
  // The right edge of the score column, and its baseline from a card's top
  scoreX: number
  scoreY: number
  // The baseline of the vocabulary, and the middle of the weights band
  vocabY: number
  weightsY: number
  // Extra space before the two new cards
  gap: number
}

const WIDE: Layout = {
  width: 600,
  top: 128,
  pitch: 23,
  textY: 15,
  cellY: 2,
  textX: 26,
  cellsX: 190,
  cell: 26,
  cellH: 19,
  scoreX: 592,
  scoreY: 15,
  vocabY: 62,
  weightsY: 92,
  gap: 18,
}

const NARROW: Layout = {
  width: 360,
  top: 130,
  pitch: 40,
  textY: 11,
  cellY: 17,
  textX: 20,
  cellsX: 4,
  cell: 23,
  cellH: 19,
  scoreX: 356,
  scoreY: 31,
  vocabY: 62,
  weightsY: 94,
  gap: 14,
}

const heightOf = (l: Layout) => l.top + (CARDS.length + 2) * l.pitch + l.gap + 30

const label = 'font-mono text-[11px] uppercase tracking-widest'
const small = 'font-mono text-[11px]'

// Fades in from `at` seconds over a third of a second
const shownFrom = (t: number, at: number) => Math.max(0, Math.min(1, (t - at) / 0.3))

// A tick for right, a cross for wrong, centred on (x, y)
function Mark({ x, y, verdict }: { x: number; y: number; verdict: Verdict }) {
  if (verdict === 'tie') {
    return (
      <text x={x} y={y + 4} textAnchor="middle" className={`fill-zinc-faded ${small}`}>
        ?
      </text>
    )
  }
  return verdict === 'right' ? (
    <path d={`M${x - 4} ${y} l3 3.5 l5.5 -7`} className="fill-none stroke-sage" strokeWidth={1.8} />
  ) : (
    <path d={`M${x - 3.5} ${y - 3.5} l7 7 m0 -7 l-7 7`} className="fill-none stroke-ink" strokeWidth={1.8} />
  )
}

interface Line {
  card: Card
  row: number[]
  // Shown from this many seconds into the step
  from: number
  // Its score, the verdict on it, and when that shows
  score?: string
  verdict?: Verdict
  scoreFrom?: number
  outlined?: boolean
}

function Drawing({ l, show, t }: { l: Layout; show: Show; t: number }) {
  const at = (i: number) => l.cellsX + i * l.cell
  const counted = show !== 'cards' && show !== 'vocab'
  const listed = show === 'list'
  const learned = show === 'learned' || show === 'order' || show === 'named'

  const lines: Line[] = CARDS.map((card, n) => ({
    card,
    row: ROWS[n],
    from: show === 'cards' ? n * 0.12 : show === 'counts' ? 0.2 + n * 0.16 : 0,
    score: listed ? signed(LIST_SCORES[n], 0).replace('+0', '0') : learned ? pct(LEARNED_CHANCES[n]) : undefined,
    verdict: listed ? LIST_VERDICTS[n] : learned ? LEARNED_VERDICTS[n] : undefined,
    // Scores already shown on the step before stay put, so the end state holds every one
    scoreFrom: show === 'order' || show === 'named' ? 0 : 0.5 + n * 0.12,
    outlined: (show === 'counts' || show === 'named') && n === SHOWN,
  }))
  if (show === 'order' || show === 'named') {
    const chance = pct(chanceOf(LEARNED, ORDER_ROW))
    for (const [k, card] of [GOOD_NOT_BAD, BAD_NOT_GOOD].entries()) {
      const happy = chanceOf(LEARNED, ORDER_ROW) >= 0.5
      lines.push({
        card,
        row: ORDER_ROW,
        from: show === 'order' ? 0.1 + k * 0.35 : 0,
        score: chance,
        verdict: happy === card.happy ? 'right' : 'wrong',
        scoreFrom: show === 'order' ? 0.6 + k * 0.35 : 0,
        outlined: show === 'order',
      })
    }
  }

  const yOf = (n: number) => l.top + n * l.pitch + (n >= CARDS.length ? l.gap : 0)
  const scoreHead = listed ? 'Score' : learned ? (show === 'named' ? 'P(happy)' : 'Chance happy') : null
  // Most a weight bar reaches either side of the band's middle
  const reach = 18

  return (
    <svg
      viewBox={`0 0 ${l.width} ${heightOf(l)}`}
      className="w-full"
      role="img"
      aria-label={
        counted
          ? `Ten comment cards, each a row of counts over ${VOCABULARY.length} words.`
          : 'Ten comment cards, each marked happy or unhappy.'
      }
    >
      {/* The vocabulary, one column per word */}
      {show !== 'cards' &&
        VOCABULARY.map((word, i) => (
          <text
            key={word}
            x={at(i) + l.cell / 2 + 3}
            y={l.vocabY}
            transform={`rotate(-55 ${at(i) + l.cell / 2 + 3} ${l.vocabY})`}
            opacity={show === 'vocab' ? shownFrom(t, i * 0.08) : 1}
            className={`${small} ${word === MOST_UNHAPPY && learned ? 'fill-ink font-bold' : 'fill-ink'}`}
          >
            {word}
          </text>
        ))}
      {show === 'named' && (
        <text x={l.cellsX} y={14} className={`fill-sage-ink ${label}`}>
          Vocabulary
        </text>
      )}

      {/* The weights band: the word list's ±1, or the learned weights */}
      {(listed || learned) && (
        <g>
          <line
            x1={l.cellsX}
            x2={at(VOCABULARY.length)}
            y1={l.weightsY}
            y2={l.weightsY}
            className="stroke-zinc-300 dark:stroke-zinc-200/25"
          />
          {VOCABULARY.map((word, i) => {
            const x = at(i) + l.cell / 2
            if (listed) {
              const w = LIST_WEIGHTS[i]
              if (w === 0) return null
              return (
                <text
                  key={word}
                  x={x}
                  y={l.weightsY + (w > 0 ? -5 : 13)}
                  textAnchor="middle"
                  opacity={shownFrom(t, 0.1 + i * 0.02)}
                  className={`${small} ${w > 0 ? 'fill-sage-ink' : 'fill-ink'}`}
                >
                  {w > 0 ? '+1' : '−1'}
                </text>
              )
            }
            const grow = show === 'learned' ? Math.min(1, t / 0.9) : 1
            const w = weightOf(word) * grow
            const h = (Math.abs(w) / Math.abs(weightOf(MOST_UNHAPPY))) * reach
            return (
              <rect
                key={word}
                x={x - 6}
                y={w > 0 ? l.weightsY - h : l.weightsY}
                width={12}
                height={Math.max(h, 0.5)}
                rx={2}
                className={w > 0 ? 'fill-sage' : 'fill-ink'}
                fillOpacity={w > 0 ? 1 : 0.75}
              />
            )
          })}
          <text x={l.cellsX - 6} y={l.weightsY + 4} textAnchor="end" className={`fill-zinc-faded ${label}`} display={l === WIDE ? undefined : 'none'}>
            {listed ? 'Word list' : 'Weights'}
          </text>
          {learned && (
            <text
              x={at(VOCABULARY.indexOf(MOST_UNHAPPY)) + l.cell / 2}
              y={l.weightsY + reach + 12}
              textAnchor="middle"
              className={`fill-ink ${small}`}
            >
              {signed(weightOf(MOST_UNHAPPY))}
            </text>
          )}
        </g>
      )}
      {scoreHead && (
        <text x={l.scoreX} y={l.top - 10} textAnchor="end" className={`fill-zinc-faded ${label}`}>
          {scoreHead}
        </text>
      )}
      {show === 'named' && (
        <text x={l === WIDE ? l.textX : l.cellsX} y={l === WIDE ? l.top - 10 : 14} textAnchor="start" className={`fill-sage-ink ${label}`} display={l === WIDE ? undefined : 'none'}>
          Documents
        </text>
      )}

      {/* The cards: a mark for happy or unhappy, the words, the counts */}
      {lines.map((line, n) => {
        const y = yOf(n)
        const shown = shownFrom(t, line.from)
        return (
          <g key={line.card.text} opacity={shown}>
            <circle
              cx={l === WIDE ? 12 : l.cellsX + 6}
              cy={y + l.textY - 4}
              r={5}
              className={line.card.happy ? 'fill-sage' : 'fill-ink'}
            />
            <text x={l.textX} y={y + l.textY} className={`fill-ink ${small}`}>
              {line.card.text}
            </text>
            {counted &&
              line.row.map((count, i) => (
                <g key={i}>
                  <rect
                    x={at(i) + 1}
                    y={y + l.cellY}
                    width={l.cell - 2}
                    height={l.cellH}
                    rx={3}
                    className={count > 0 ? 'fill-ink' : 'fill-paper'}
                    fillOpacity={count > 0 ? 0.08 + 0.1 * count : 1}
                  />
                  <text
                    x={at(i) + l.cell / 2}
                    y={y + l.cellY + l.cellH / 2 + 4}
                    textAnchor="middle"
                    className={`${small} ${count > 0 ? 'fill-ink font-bold' : 'fill-zinc-faded'}`}
                  >
                    {count}
                  </text>
                </g>
              ))}
            {show === 'vocab' &&
              VOCABULARY.map((word, i) => (
                <rect
                  key={word}
                  x={at(i) + 1}
                  y={y + l.cellY}
                  width={l.cell - 2}
                  height={l.cellH}
                  rx={3}
                  opacity={shownFrom(t, 0.4 + i * 0.05)}
                  className="fill-paper stroke-zinc-300 dark:stroke-zinc-400"
                />
              ))}
            {line.outlined && counted && (
              <rect
                x={at(0) - 1}
                y={y + l.cellY - 2}
                width={VOCABULARY.length * l.cell + 2}
                height={l.cellH + 4}
                rx={4}
                className="fill-none stroke-sage"
                strokeWidth={1.8}
              />
            )}
            {line.score !== undefined && line.verdict && (
              <g opacity={shownFrom(t, line.scoreFrom ?? 0)}>
                <text x={l.scoreX - 16} y={y + l.scoreY} textAnchor="end" className={`fill-ink ${small}`}>
                  {line.score}
                </text>
                <Mark x={l.scoreX - 5} y={y + l.scoreY - 4} verdict={line.verdict} />
              </g>
            )}
          </g>
        )
      })}

      {/* The two new cards, set apart */}
      {(show === 'order' || show === 'named') && (
        <text
          x={l === WIDE ? l.textX : l.cellsX}
          y={yOf(CARDS.length) - (l === WIDE ? 5 : 4)}
          className={`fill-zinc-faded ${label}`}
          opacity={show === 'order' ? shownFrom(t, 0) : 1}
        >
          New cards
        </text>
      )}
    </svg>
  )
}

// The story's cards, one step at a time. Give it a `key` per step, so each
// step plays from the start.
export default function Cards({ show }: { show: Show }) {
  const t = usePlay(LENGTH[show], 1000)
  const listed = show === 'list'
  const learned = show === 'learned'
  return (
    <div>
      <div className="hidden sm:block">
        <Drawing l={WIDE} show={show} t={t} />
      </div>
      <div className="sm:hidden">
        <Drawing l={NARROW} show={show} t={t} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[0.875rem] uppercase tracking-widest text-zinc-faded">
        <span className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-sage" /> Happy
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-ink" /> Unhappy
        </span>
        {listed && (
          <span className="text-ink">
            {tally(LIST_VERDICTS, 'right')} right · {tally(LIST_VERDICTS, 'wrong')} wrong · {tally(LIST_VERDICTS, 'tie')}{' '}
            ties
          </span>
        )}
        {learned && <span className="text-ink">{tally(LEARNED_VERDICTS, 'right')} of {CARDS.length} right</span>}
        {show === 'named' && <span className="text-sage-ink">Outlined: a bag-of-words vector</span>}
      </div>
    </div>
  )
}
