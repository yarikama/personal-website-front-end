import type { ReactNode } from 'react'
import { useLoop, usePlay } from '../../components/explain/useLoop'
import { bottomOf, flow, LINE, LOOSE, MARGIN, TILE_H, WIDTH, type Place } from './layout'
import {
  BLANKS,
  CARD_AT,
  MASK,
  STORY,
  STORY_MASKED,
  STORY_SPANS,
  STORY_T5,
  SWAP,
  type Tile,
} from './model'
import { TileMark, TileRow } from './Tiles'

// The story: a quiz made from a sentence, one game at a time, then the same
// games named as the models that play them.

export type Scene = 'pile' | 'card' | 'open' | 'blanks' | 'swaps' | 'spans' | 'reveal'

const TOP = 8
const asWords = (words: string[]): Tile[] => words.map((text) => ({ text, kind: 'word' }))
const PLACES = flow(STORY, TOP)
// The same with room for notes under the tiles
const LOOSE_PLACES = flow(STORY, TOP, LOOSE)
// The swap scene keeps room for its longest word, so nothing jumps
const SWAP_PLACES = flow(
  STORY.map((text, i) => (i === SWAP.at ? SWAP.word : text)),
  TOP,
  LOOSE,
)
const RIVER = STORY.indexOf('river')

// A header over the drawing: what the friend sees, and the score
function Header({ left, right, strong = false }: { left: ReactNode; right: ReactNode; strong?: boolean }) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 font-mono text-[0.875rem] uppercase tracking-widest">
      <span className="text-zinc-faded">{left}</span>
      <span className={`tabular-nums ${strong ? 'text-sage-ink' : 'text-ink'}`}>{right}</span>
    </div>
  )
}

function Drawing({ height, label, children }: { height: number; label: string; children: ReactNode }) {
  return (
    <svg viewBox={`0 0 ${WIDTH} ${height}`} className="mx-auto w-full max-w-[30rem]" role="img" aria-label={label}>
      {children}
    </svg>
  )
}

// A note under a tile, in small capitals
function Under({ at, children, tone = 'sage' }: { at: Place; children: ReactNode; tone?: 'sage' | 'faded' }) {
  return (
    <text
      x={at.x + at.w / 2}
      y={at.y + TILE_H + 13}
      textAnchor="middle"
      className={`${tone === 'sage' ? 'fill-sage-ink' : 'fill-zinc-faded'} font-mono text-[10px] uppercase tracking-widest`}
    >
      {children}
    </text>
  )
}

// The card over every word from `from` on: one piece per line
function Card({ places, from }: { places: Place[]; from: number }) {
  const lines = [...new Set(places.slice(from).map((p) => p.line))]
  return (
    <>
      {lines.map((line) => {
        const onLine = places.map((p, i) => ({ p, i })).filter(({ p, i }) => p.line === line && i >= from)
        const first = onLine[0].p
        const last = onLine[onLine.length - 1].p
        return (
          <g key={line}>
            <rect
              x={first.x - 2}
              y={first.y - 3}
              width={last.x + last.w - first.x + 4}
              height={TILE_H + 6}
              rx={6}
              className="fill-ink"
              fillOpacity={0.9}
            />
            <text
              x={first.x + 10}
              y={first.y + 16}
              className="fill-paper font-mono text-[10px] uppercase tracking-widest"
            >
              Card
            </text>
          </g>
        )
      })}
    </>
  )
}

function Pile() {
  const shown = usePlay(STORY.length, 110)
  return (
    <div>
      <Header left="One sentence from the pile" right="No answer key" />
      <Drawing height={bottomOf(PLACES) + 8} label={`The sentence: ${STORY.join(' ')}`}>
        {STORY.map((text, i) => (
          <TileMark key={i} tile={{ text, kind: 'word' }} at={PLACES[i]} opacity={Math.min(1, Math.max(0, shown - i))} />
        ))}
      </Drawing>
    </div>
  )
}

// Cover the rest with a card; the card slides to the word being asked
function CardGame() {
  const at = Math.min(CARD_AT, 1 + Math.floor(usePlay(CARD_AT, 650)))
  const tiles = STORY.map((text, i): Tile => (i === at ? { text: '?', kind: 'blank' } : { text, kind: 'word' }))
  return (
    <div>
      <Header left={`Sees: ${STORY.slice(0, at).join(' ')}`} right="Next word?" />
      <Drawing
        height={bottomOf(PLACES) + 8}
        label={`The words after "${STORY.slice(0, CARD_AT).join(' ')}" are covered by a card; the friend must guess the next word, and the clue, river, is under the card.`}
      >
        {tiles.map((tile, i) => i <= at && <TileMark key={i} tile={tile} at={PLACES[i]} />)}
        <Card places={PLACES} from={at + 1} />
      </Drawing>
    </div>
  )
}

// No card: every answer is already on the page
function OpenGame() {
  const played = usePlay(STORY.length, 330)
  const asked = Math.min(STORY.length - 1, Math.floor(played))
  const done = played >= STORY.length
  return (
    <div>
      <Header left="Sees the whole line" right={`${done ? STORY.length : asked} of ${STORY.length} right`} strong={done} />
      <Drawing
        height={bottomOf(LOOSE_PLACES) + 20}
        label={`The whole sentence is visible, so each next word asked for is right there to copy: ${STORY.length} of ${STORY.length} right.`}
      >
        {STORY.map((text, i) => (
          <TileMark key={i} tile={{ text, kind: !done && i === asked ? 'kept' : 'word' }} at={LOOSE_PLACES[i]} />
        ))}
        {!done && <Under at={LOOSE_PLACES[asked]}>Asked</Under>}
      </Drawing>
    </div>
  )
}

// Blank out two words; the clue on the other side is in view
function Blanks() {
  const played = usePlay(2, 900)
  const tiles = STORY.map((text, i): Tile => (BLANKS.includes(i) && played > 0.3 ? { text: '?', kind: 'blank' } : { text, kind: 'word' }))
  const river = LOOSE_PLACES[RIVER]
  return (
    <div>
      <Header left="Sees both sides" right={`Guess ${BLANKS.length} of ${STORY.length}`} />
      <Drawing
        height={bottomOf(LOOSE_PLACES) + 20}
        label={`Two words are blanked out: ${BLANKS.map((i) => STORY[i]).join(' and ')}. Everything else is visible, including river after the first blank.`}
      >
        <TileRow tiles={tiles} places={LOOSE_PLACES} />
        {played > 1 && (
          <>
            <line
              x1={river.x + 3}
              x2={river.x + river.w - 3}
              y1={river.y + TILE_H + 4}
              y2={river.y + TILE_H + 4}
              className="stroke-sage"
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            {BLANKS.map((i) => (
              <Under key={i} at={LOOSE_PLACES[i]}>
                {STORY[i]}
              </Under>
            ))}
          </>
        )}
      </Drawing>
    </div>
  )
}

// The second chosen word: blanked 8 times in 10, swapped 1 in 10, kept 1 in 10
const TURNS: { tile: Tile; note: string }[] = [
  { tile: { text: '?', kind: 'blank' }, note: '8 in 10: blank' },
  { tile: { text: SWAP.word, kind: 'swap' }, note: '1 in 10: wrong word' },
  { tile: { text: STORY[SWAP.at], kind: 'kept' }, note: '1 in 10: left alone' },
]

function Swaps() {
  const phase = useLoop(6000, 0.4)
  const turn = TURNS[Math.min(2, Math.floor(phase * 3))]
  const places = SWAP_PLACES
  const tiles = STORY.map((text, i): Tile => (i === SWAP.at ? turn.tile : i === BLANKS[0] ? { text: '?', kind: 'blank' } : { text, kind: 'word' }))
  return (
    <div>
      <Header left="Any word might be a trap" right={`Guess ${BLANKS.length} of ${STORY.length}`} />
      <Drawing
        height={bottomOf(places) + 20}
        label={`The first chosen word is blanked. The second is blanked 8 times in 10, swapped for a wrong word such as ${SWAP.word} 1 time in 10, and left alone 1 time in 10, and must be guessed every time.`}
      >
        <TileRow tiles={tiles} places={places} />
        <Under at={places[SWAP.at]}>{turn.note}</Under>
      </Drawing>
    </div>
  )
}

// Whole phrases blanked: each gap one tag, and the answer written gap by gap
function Spans() {
  const played = usePlay(3, 900)
  const chosen = (i: number) => STORY_SPANS.some(([a, b]) => i >= a && i <= b)
  const before = STORY.map((text, i): Tile => ({ text, kind: played > 0.4 && chosen(i) ? 'kept' : 'word' }))
  const tagged = played > 1.3
  const input = tagged ? STORY_T5.input : before
  const places = flow(
    input.map((t) => t.text),
    TOP,
  )
  const outTop = bottomOf(places) + 30
  const outPlaces = flow(
    STORY_T5.output.map((t) => t.text),
    outTop,
  )
  return (
    <div>
      <Header left="Gaps get tags" right={tagged ? `Write back ${STORY_T5.guesses} words` : 'Pick phrases'} />
      <Drawing
        height={outTop + LINE + 4}
        label={`The phrases "${STORY.slice(STORY_SPANS[0][0], STORY_SPANS[0][1] + 1).join(' ')}" and "${STORY[STORY_SPANS[1][0]]}" are each replaced by one tag. The friend writes back: ${STORY_T5.output.map((t) => t.text).join(' ')}.`}
      >
        <TileRow tiles={input} places={places} />
        {played > 2.1 && (
          <>
            <text x={MARGIN} y={outTop - 10} className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
              Writes back
            </text>
            <TileRow tiles={STORY_T5.output} places={outPlaces} />
          </>
        )}
      </Drawing>
    </div>
  )
}

// The reveal: the three games, named
const GPT_TILES = STORY.slice(0, CARD_AT + 1).map((text, i): Tile => (i === CARD_AT ? { text: '?', kind: 'blank' } : { text, kind: 'word' }))
const BERT_TILES = STORY_MASKED.input.map((t): Tile => (t.kind === 'blank' ? { text: MASK, kind: 'blank' } : t))

function Reveal() {
  const blocks: { name: string; what: string; rows: Tile[][] }[] = [
    { name: 'GPT · next word', what: 'The card is the causal mask', rows: [asWords(STORY)] },
    { name: 'BERT · masked words', what: 'The blank is [MASK]', rows: [BERT_TILES] },
    { name: 'T5 · spans', what: 'The tags are sentinels', rows: [STORY_T5.input, STORY_T5.output] },
  ]
  let y = 14
  const drawn = blocks.map((block) => {
    const top = y
    const rows = block.rows.map((row) => {
      const places = flow(
        row.map((t) => t.text),
        y + 8,
      )
      y = bottomOf(places) + 8
      return { row, places }
    })
    y += 26
    return { block, top, rows }
  })
  return (
    <div>
      <Header left="The friend is the model" right="Three games" strong />
      <Drawing height={y - 16} label="The three games named: GPT predicts the next word behind a causal mask, BERT guesses words replaced by [MASK], and T5 writes back spans replaced by sentinels.">
        {drawn.map(({ block, top, rows }, b) => (
          <g key={b}>
            <text x={MARGIN} y={top} className="fill-ink font-mono text-[11px] uppercase tracking-widest">
              {block.name}
            </text>
            <text x={WIDTH - MARGIN} y={top} textAnchor="end" className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
              {block.what}
            </text>
            {rows.map(({ row, places }, r) =>
              b === 0 ? (
                <g key={r}>
                  {GPT_TILES.map((tile, i) => (
                    <TileMark key={i} tile={tile} at={places[i]} />
                  ))}
                  <Card places={places} from={CARD_AT + 1} />
                </g>
              ) : (
                <TileRow key={r} tiles={row} places={places} />
              ),
            )}
          </g>
        ))}
      </Drawing>
    </div>
  )
}

export default function Quiz({ scene }: { scene: Scene }) {
  switch (scene) {
    case 'pile':
      return <Pile />
    case 'card':
      return <CardGame />
    case 'open':
      return <OpenGame />
    case 'blanks':
      return <Blanks />
    case 'swaps':
      return <Swaps />
    case 'spans':
      return <Spans />
    case 'reveal':
      return <Reveal />
  }
}

