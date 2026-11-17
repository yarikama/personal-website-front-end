import { usePlay } from '../../components/explain/useLoop'
import { carried, CLUE, DESK, KEEP, oneIn, PAGES, STORY_SURPRISE } from './model'

const WIDTH = 640
const HEIGHT = 318
const page = (p: number) => 34 + (p - 1) * 30 // centre of page p, from 1
const TILE = 22
// Rows, top to bottom: how wrong each guess was, the pages, the card after
// each page, and the blame reaching each card
const GUESS = { label: 14, base: 86, tall: 58 }
const PAGE_Y = 92
const PAGE_H = 28
const NUMBER_Y = 134
const CARD = { label: 156, top: 164, h: 30 }
const BLAME = { label: 216, top: 224, tall: 60 }
const NOTE_Y = 306

export type Show = 'desk' | 'gone' | 'card' | 'guess' | 'blame' | 'tiny' | 'named'

const ORDER: Show[] = ['desk', 'gone', 'card', 'guess', 'blame', 'tiny', 'named']
const from = (show: Show, first: Show) => ORDER.indexOf(show) >= ORDER.indexOf(first)

const HEADER: Record<Show, [string, string]> = {
  desk: ['Pages on your desk', 'the clue is on page 2'],
  gone: ['Page 20', 'the clue is off the desk'],
  card: ['One card', 'sage: what is left of the clue'],
  guess: ['Your guesses', 'how wrong each one was'],
  blame: ['Tracing the blame', 'ink: blame reaching each card'],
  tiny: ['Tracing the blame', 'halved at every page'],
  named: ['A recurrent language model', 'words, hidden states, loss, gradient'],
}

const LABELS: Record<'guess' | 'card' | 'blame', [string, string]> = {
  guess: ['How wrong each guess was', 'Loss at each word'],
  card: ['The card after each page', 'Hidden state after each word'],
  blame: ['Blame from page 20’s guess', 'Gradient from the last loss: backpropagation through time'],
}

// The story's book: twenty pages, the desk that holds three of them, the
// index card rewritten after each page (sage: how much of the clue is still
// on it), how wrong each guess was, and the blame for the last guess
// reaching back to each card. `show` picks what plays; give it a `key` per
// step so each plays from the start.
export default function Book({ show }: { show: Show }) {
  // What plays at this step, from 0 to its span
  const span = show === 'desk' ? PAGES - DESK : show === 'card' || show === 'guess' || show === 'blame' ? PAGES : 0
  const pace = show === 'desk' ? 200 : show === 'card' ? 110 : show === 'guess' ? 70 : 130
  const played = usePlay(span, pace)

  const named = show === 'named'
  const desk = show === 'desk' ? 1 + played : show === 'gone' ? PAGES - DESK + 1 : null
  const cards = show === 'card' ? played : from(show, 'card') ? PAGES : 0
  const guesses = show === 'guess' ? played : from(show, 'guess') ? PAGES : 0
  const blamed = show === 'blame' ? played : from(show, 'blame') ? PAGES : 0
  const label = (row: keyof typeof LABELS) => LABELS[row][named ? 1 : 0]

  const [title, note] = HEADER[show]

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
        aria-label={`Twenty pages read one at a time, an index card rewritten after each, and the blame for the last guess halving at every page back: ${oneIn(carried(KEEP, CLUE, PAGES))} of it reaches page ${CLUE}.`}
      >
        {/* How wrong each guess was */}
        {guesses > 0 && (
          <text x={page(1) - TILE / 2} y={GUESS.label} className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
            {label('guess')}
          </text>
        )}
        {STORY_SURPRISE.map((s, i) => {
          const grown = Math.max(0, Math.min(1, guesses - i))
          if (grown <= 0) return null
          const h = s * GUESS.tall * grown
          const last = i === PAGES - 1
          return (
            <rect
              key={i}
              x={page(i + 1) - 7}
              y={GUESS.base - h}
              width={14}
              height={h}
              rx={2}
              className="fill-ink"
              fillOpacity={last ? 0.9 : 0.3}
            />
          )
        })}

        {/* The desk: the three pages you can still see */}
        {desk !== null && (
          <g>
            <rect
              x={page(desk) - TILE / 2 - 5}
              y={PAGE_Y - 5}
              width={(DESK - 1) * 30 + TILE + 10}
              height={PAGE_H + 9}
              rx={8}
              className="fill-sage stroke-sage"
              fillOpacity={0.18}
              strokeWidth={1.5}
            />
            <text x={page(desk) + 30} y={PAGE_Y - 12} textAnchor="middle" className="fill-ink font-mono text-[10px] uppercase tracking-widest">
              Desk
            </text>
          </g>
        )}

        {/* The pages */}
        {Array.from({ length: PAGES }, (_, i) => {
          const p = i + 1
          const clue = p === CLUE
          return (
            <g key={p}>
              <rect
                x={page(p) - TILE / 2}
                y={PAGE_Y}
                width={TILE}
                height={PAGE_H}
                rx={3}
                className={clue ? 'fill-ink stroke-ink' : 'fill-paper stroke-zinc-400'}
                fillOpacity={clue ? 0.2 : 1}
                strokeWidth={1.2}
              />
              <text x={page(p)} y={NUMBER_Y} textAnchor="middle" className="fill-zinc-faded font-mono text-[10px]">
                {named ? `w${p}` : p}
              </text>
            </g>
          )
        })}
        {!from(show, 'guess') && (
          <text x={page(CLUE)} y={PAGE_Y - 12} textAnchor="middle" className="fill-ink font-mono text-[10px] uppercase tracking-widest">
            Clue
          </text>
        )}
        {show === 'gone' && (
          <text x={page(PAGES)} y={PAGE_Y + 19} textAnchor="middle" className="fill-ink font-mono text-[13px]">
            ?
          </text>
        )}

        {/* The card after each page, and how much of the clue is on it */}
        {cards > 0 && (
          <text x={page(1) - TILE / 2} y={CARD.label} className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
            {label('card')}
          </text>
        )}
        {Array.from({ length: PAGES }, (_, i) => {
          const p = i + 1
          if (cards < p - 1 + 0.01) return null
          const clue = p >= CLUE ? carried(KEEP, CLUE, p) : 0
          const fill = clue * (CARD.h - 4)
          return (
            <g key={p}>
              {p > 1 && (
                <line x1={page(p - 1) + TILE / 2} x2={page(p) - TILE / 2} y1={CARD.top + CARD.h / 2} y2={CARD.top + CARD.h / 2} className="stroke-zinc-400" strokeWidth={1.2} />
              )}
              <rect x={page(p) - TILE / 2} y={CARD.top} width={TILE} height={CARD.h} rx={3} className="fill-paper stroke-zinc-400" strokeWidth={1.2} />
              {fill > 0.3 && <rect x={page(p) - TILE / 2 + 2} y={CARD.top + CARD.h - 2 - fill} width={TILE - 4} height={fill} rx={1.5} className="fill-sage" />}
            </g>
          )
        })}

        {/* The blame for the last guess, reaching back to each card */}
        {blamed > 0 && (
          <text x={page(1) - TILE / 2} y={BLAME.label} className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
            {label('blame')}
          </text>
        )}
        {blamed > 0 && <line x1={page(1) - TILE / 2} x2={page(PAGES) + TILE / 2} y1={BLAME.top} y2={BLAME.top} className="stroke-zinc-300" strokeWidth={1} />}
        {Array.from({ length: PAGES }, (_, i) => {
          const p = i + 1
          const back = PAGES - p
          const reached = Math.max(0, Math.min(1, blamed - back))
          if (reached <= 0) return null
          const h = carried(KEEP, p, PAGES) * BLAME.tall * reached
          return <rect key={p} x={page(p) - 7} y={BLAME.top} width={14} height={Math.max(h, 0.6)} rx={2} className="fill-ink" fillOpacity={0.8} />
        })}
        {from(show, 'tiny') &&
          [15, CLUE].map((p) => (
            <g key={p}>
              <line x1={page(p)} x2={page(p)} y1={BLAME.top + 4} y2={NOTE_Y - 12} className="stroke-zinc-400" strokeWidth={1} strokeDasharray="2 3" />
              <text x={page(p)} y={NOTE_Y} textAnchor={p === CLUE ? 'start' : 'middle'} dx={p === CLUE ? -8 : 0} className="fill-ink font-mono text-[11px]">
                {oneIn(carried(KEEP, p, PAGES))}
              </text>
            </g>
          ))}
      </svg>
    </div>
  )
}
