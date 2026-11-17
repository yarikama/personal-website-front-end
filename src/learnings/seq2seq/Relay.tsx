import { usePlay } from '../../components/explain/useLoop'
import {
  CARD,
  CHANCES,
  INPUTS,
  LEARNING,
  LEARNING_STEP,
  learningCost,
  LONG,
  LONG_CARDS,
  LONG_FIRST_TRIP,
  SHORT_CARDS,
  SOURCE,
  TARGET,
  top,
  type Chances,
} from './model'

const WIDTH = 480
const HEIGHT = 372
const LEFT = 20
// The source words, the card under them, the decoder's row
const SOURCE_Y = 28
const CARD_Y = 74
const SQUARE = 28
const GAP = 4
const CARD_X = 160
const CARD_W = CARD * SQUARE + (CARD - 1) * GAP
const OUT_Y = 150
const CELL = { top: 160, h: 26, w: 54 }
const IN_Y = 206
const cellX = (t: number) => 120 + t * 75 // centre of decoder step t, from 0
// The chances panel
const PANEL_Y = 244
const BAR = { label: 150, x: 160, w: 250, h: 14, step: 22 }

export type Show = 'listen' | 'first' | 'write' | 'tutor' | 'long' | 'named'

const HEADER: Record<Show, [string, string]> = {
  listen: ['Listening', 'one card, rewritten after each word'],
  first: ['Writing word 1', 'from the card alone'],
  write: ['Writing', 'the card and the words so far'],
  tutor: ['Learning', 'the tutor’s word goes in'],
  long: ['A longer sentence', `${LONG.length} words, still ${CARD} numbers`],
  named: ['Encoder–decoder', 'seq2seq'],
}

const shortX = (i: number) => CARD_X + 30 + i * 64
const longX = (i: number) => CARD_X + 6 + (i * (CARD_W - 12)) / (LONG.length - 1)

// One card: CARD squares, sage for a positive number, ink for a negative
// one, more solid the further from 0
function Card({ values, x, y, size = SQUARE }: { values: number[] | null; x: number; y: number; size?: number }) {
  return (
    <g>
      {Array.from({ length: CARD }, (_, c) => {
        const v = values?.[c] ?? 0
        const sx = x + c * (size + GAP)
        return (
          <g key={c}>
            <rect x={sx} y={y} width={size} height={size} rx={4} className="fill-paper stroke-zinc-300 dark:stroke-zinc-200/25" strokeWidth={1.2} />
            {values && (
              <rect
                x={sx + 2}
                y={y + 2}
                width={size - 4}
                height={size - 4}
                rx={3}
                className={v >= 0 ? 'fill-sage' : 'fill-ink'}
                fillOpacity={0.12 + 0.8 * Math.abs(v)}
              />
            )}
          </g>
        )
      })}
    </g>
  )
}

// The decoder's chances for one step: its four likeliest words as bars,
// the right one in sage. `grown` from 0 to 1 as the bars come in.
function Bars({ chances, right, grown, mine }: { chances: Chances; right: string; grown: number; mine?: string }) {
  return (
    <g>
      {top(chances, 4).map(([word, c], r) => {
        const y = PANEL_Y + 12 + r * BAR.step
        const isRight = word === right
        const isMine = word === mine
        const note = isMine ? 'your pick' : mine && isRight ? 'the right word' : null
        return (
          <g key={word}>
            <text x={BAR.label} y={y + 11} textAnchor="end" className={`${isRight ? 'fill-sage-ink' : 'fill-ink'} font-mono text-[11px]`}>
              {word}
            </text>
            <rect
              x={BAR.x}
              y={y}
              width={Math.max(1, c * BAR.w * grown)}
              height={BAR.h}
              rx={3}
              className={isRight ? 'fill-sage' : 'fill-ink'}
              fillOpacity={isRight ? 1 : isMine ? 0.75 : 0.3}
            />
            {grown >= 1 && (
              <text x={BAR.x + c * BAR.w + 6} y={y + 11} className="fill-ink font-mono text-[11px]">
                {c.toFixed(2)}
                {note && (
                  <tspan dx={8} className="fill-zinc-faded">
                    {note}
                  </tspan>
                )}
              </text>
            )}
          </g>
        )
      })}
    </g>
  )
}

// The story's phone call: a French sentence read word by word onto one card
// of eight numbers, then the English written one word at a time from the
// card and the words already written, with the chances for each next word.
// `show` picks what plays; give it a `key` per step so each plays from the
// start.
export default function Relay({ show }: { show: Show }) {
  const span = show === 'listen' ? SOURCE.length : show === 'write' ? TARGET.length - 1 : show === 'long' ? LONG.length : 1
  const pace = show === 'listen' ? 800 : show === 'write' ? 1300 : show === 'long' ? 130 : 1400
  const played = usePlay(span, pace)
  const named = show === 'named'

  // How many source words are on the card
  const read = show === 'listen' ? Math.floor(played) : show === 'long' ? Math.floor(played) : SOURCE.length
  const words = show === 'long' ? LONG : SOURCE
  const cards = show === 'long' ? LONG_CARDS : SHORT_CARDS
  const card = read > 0 ? cards[Math.min(read, words.length) - 1] : null

  // The decoder step on show (from 0), how far its bars have grown, and how
  // many English words are written
  let step = -1
  let grown = 0
  let written = 0
  if (show === 'first') {
    step = 0
    grown = Math.min(1, played * 1.6)
    written = played >= 0.75 ? 1 : 0
  } else if (show === 'write') {
    step = Math.min(TARGET.length - 1, 1 + Math.floor(played))
    const local = Math.min(1, played - (step - 1))
    grown = Math.min(1, local * 1.6)
    written = step + (local >= 0.6 ? 1 : 0)
  } else if (show === 'tutor') {
    step = LEARNING_STEP
    grown = Math.min(1, played * 1.6)
    written = LEARNING_STEP + 1
  } else if (show === 'named') {
    step = TARGET.length - 1
    grown = 1
    written = TARGET.length
  }
  const decoding = show !== 'listen' && show !== 'long'
  const corrected = show === 'tutor' && played >= 0.75
  const mine = top(LEARNING, 1)[0][0]

  const [title, note] = HEADER[show]
  const rowLabel = (plain: string, term: string) => (named ? term : plain)

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 font-mono text-[0.875rem] uppercase tracking-widest text-zinc-faded">
        <span className="shrink-0">{title}</span>
        <span className="text-right">{note}</span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label="The French sentence le chat noir dort read one word at a time onto a card of eight numbers, then the English the black cat sleeps written one word at a time from the card, with the chances of each next word as bars."
      >
        {/* Row labels */}
        <g className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
          <text x={LEFT} y={SOURCE_Y + 4}>
            {rowLabel('French', 'Source')}
          </text>
          <text x={LEFT} y={CARD_Y + 18}>
            {rowLabel('Card', 'Vector')}
          </text>
          <text x={LEFT} y={OUT_Y}>
            {rowLabel('Writes', 'Output')}
          </text>
          <text x={LEFT} y={IN_Y}>
            {rowLabel('Reads', 'Input')}
          </text>
        </g>

        {/* The source words, each dropping onto the card when read */}
        {show === 'long'
          ? LONG.map((_, i) => (
              <g key={i}>
                <rect
                  x={longX(i) - 4}
                  y={SOURCE_Y - 10}
                  width={8}
                  height={14}
                  rx={2}
                  className={i < read ? (i === 0 ? 'fill-sage' : 'fill-ink') : 'fill-paper stroke-zinc-400'}
                  fillOpacity={i < read ? (i === 0 ? 1 : 0.55) : 1}
                  strokeWidth={1}
                />
                {i === read - 1 && <line x1={longX(i)} x2={longX(i)} y1={SOURCE_Y + 8} y2={CARD_Y - 4} className="stroke-ink" strokeWidth={1.2} />}
              </g>
            ))
          : SOURCE.map((word, i) => {
              if (show === 'listen' && i >= played + 0.4) return null
              return (
                <g key={word}>
                  <text
                    x={shortX(i)}
                    y={SOURCE_Y + 4}
                    textAnchor="middle"
                    className={`${show === 'listen' && i === read - 1 ? 'fill-sage-ink' : 'fill-ink'} font-mono text-[13px]`}
                  >
                    {word}
                  </text>
                  {show === 'listen' && i === read - 1 && (
                    <line x1={shortX(i)} x2={shortX(i)} y1={SOURCE_Y + 10} y2={CARD_Y - 4} className="stroke-sage" strokeWidth={1.5} />
                  )}
                </g>
              )
            })}
        {show === 'long' && (
          <text x={longX(0)} y={SOURCE_Y - 14} className="fill-sage-ink font-mono text-[11px]">
            le
          </text>
        )}

        {/* The card */}
        <Card values={card} x={CARD_X} y={CARD_Y} />
        <text x={CARD_X + CARD_W} y={CARD_Y + SQUARE + 16} textAnchor="end" className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
          {named ? 'the encoder’s last state' : `${CARD} numbers, after ${read} ${read === 1 ? 'word' : 'words'}`}
        </text>

        {/* The hand-over: the card starts the decoder */}
        <path
          d={`M ${CARD_X - 4} ${CARD_Y + SQUARE / 2} H 74 V ${CELL.top + CELL.h / 2} H ${cellX(0) - CELL.w / 2 - 4}`}
          className={decoding ? 'stroke-sage' : 'stroke-zinc-400'}
          strokeWidth={1.5}
          fill="none"
        />
        <path
          d={`M ${cellX(0) - CELL.w / 2 - 9} ${CELL.top + CELL.h / 2 - 4} l 5 4 l -5 4`}
          className={decoding ? 'stroke-sage' : 'stroke-zinc-400'}
          strokeWidth={1.5}
          fill="none"
        />

        {/* The decoder: one cell per English word, reading the word before */}
        {TARGET.map((word, t) => {
          const x = cellX(t)
          const active = t === step && show !== 'named'
          const done = t < written
          const struck = show === 'tutor' && t === LEARNING_STEP
          const input = INPUTS[t]
          const inputShown = decoding && t <= step && (show !== 'tutor' || t <= LEARNING_STEP)
          return (
            <g key={t}>
              {t > 0 && (
                <line
                  x1={cellX(t - 1) + CELL.w / 2}
                  x2={x - CELL.w / 2}
                  y1={CELL.top + CELL.h / 2}
                  y2={CELL.top + CELL.h / 2}
                  className="stroke-zinc-400"
                  strokeWidth={1.2}
                />
              )}
              <rect
                x={x - CELL.w / 2}
                y={CELL.top}
                width={CELL.w}
                height={CELL.h}
                rx={6}
                className={active ? 'fill-sage stroke-sage' : 'fill-paper stroke-zinc-400'}
                fillOpacity={active ? 0.18 : 1}
                strokeWidth={1.2}
                strokeDasharray={decoding ? undefined : '3 3'}
              />
              {done && (
                <text
                  x={x}
                  y={OUT_Y}
                  textAnchor="middle"
                  className={`${struck ? 'fill-ink line-through' : t === step && !named ? 'fill-sage-ink' : 'fill-ink'} font-mono text-[12px]`}
                >
                  {struck ? mine : word}
                </text>
              )}
              {inputShown && (
                <text x={x} y={IN_Y} textAnchor="middle" className="fill-ink font-mono text-[12px]">
                  {input}
                </text>
              )}
            </g>
          )
        })}
        {/* The tutor's word goes in next, not yours */}
        {corrected && (
          <text x={cellX(LEARNING_STEP + 1)} y={IN_Y} textAnchor="middle" className="fill-sage-ink font-mono text-[12px]">
            {TARGET[LEARNING_STEP]}
          </text>
        )}

        {/* The panel: the chances for the step on show, or the two cards */}
        {show === 'long' ? (
          <g>
            <text x={LEFT} y={PANEL_Y} className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
              The card after
            </text>
            {[
              { label: `${SOURCE.length} words`, values: SHORT_CARDS[SOURCE.length - 1] },
              { label: `${LONG.length} words`, values: read >= LONG.length ? LONG_CARDS[LONG.length - 1] : null },
            ].map((row, r) => (
              <g key={row.label}>
                <text x={BAR.label} y={PANEL_Y + 30 + r * 38} textAnchor="end" className="fill-ink font-mono text-[11px]">
                  {row.label}
                </text>
                <Card values={row.values} x={CARD_X} y={PANEL_Y + 12 + r * 38} />
              </g>
            ))}
            {read >= LONG.length && (
              <text x={LEFT} y={HEIGHT - 6} className="fill-ink font-mono text-[11px]">
                “le” to the first English word: {LONG_FIRST_TRIP} steps
              </text>
            )}
          </g>
        ) : (
          step >= 0 && (
            <g>
              <text x={LEFT} y={PANEL_Y} className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
                {named
                  ? `Softmax for word ${step + 1}, given the vector and words 1–${step}`
                  : `Chances for word ${step + 1}${step > 0 ? `, after “${TARGET.slice(0, step).join(' ')}”` : ''}`}
              </text>
              <Bars
                chances={show === 'tutor' ? LEARNING : CHANCES[step]}
                right={TARGET[step]}
                grown={grown}
                mine={show === 'tutor' ? mine : undefined}
              />
              {show === 'tutor' && corrected && (
                <text x={LEFT} y={HEIGHT - 6} className="fill-ink font-mono text-[11px]">
                  The miss costs −log {LEARNING[TARGET[LEARNING_STEP]].toFixed(2)} = {learningCost.toFixed(2)}
                </text>
              )}
            </g>
          )
        )}
      </svg>
    </div>
  )
}
