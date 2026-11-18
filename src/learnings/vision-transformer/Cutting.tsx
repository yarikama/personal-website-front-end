import { lerp, usePlay } from '../../components/explain/useLoop'
import { ACROSS, CARDS, inPatch, QUESTIONS, SIDE, STRIPS, TILE } from './model'

export type Show = 'picture' | 'cut' | 'unroll' | 'ask' | 'place' | 'blank' | 'named'
const ORDER: Show[] = ['picture', 'cut', 'unroll', 'ask', 'place', 'blank', 'named']
const from = (show: Show, first: Show) => ORDER.indexOf(show) >= ORDER.indexOf(first)

const WIDTH = 360
const HEIGHT = 256
// The whole picture
const CELL = 14
const PIC = { x: 96, y: 36 }
// The picture cut into tiles, a gap between them
const GAP = 8
const CUT = { x: 88, y: 28 }
// The unrolled rows: one per tile, the blank card's row above them
const ROW = 22
const rowY = (k: number) => 34 + (k + 1) * ROW
const STRIP = { x: 34, w: 6, h: 10 }
const CARD = { x: 164, w: 14, step: 16 }
const CHIP = { x: 218, w: 26 }
const ENCODER = { x: 258, w: 40 }
const CARD_END = CARD.x + 2 * CARD.step + CARD.w

const clamp = (t: number) => Math.max(0, Math.min(1, t))
const ease = (t: number) => t * t * (3 - 2 * t)

// Where square m of tile k sits, whole, cut, and unrolled
function placeOf(k: number, m: number) {
  const { row, col } = inPatch(m, TILE)
  const ti = Math.floor(k / ACROSS)
  const tj = k % ACROSS
  return {
    whole: { x: PIC.x + (tj * TILE + col) * CELL, y: PIC.y + (ti * TILE + row) * CELL },
    cut: { x: CUT.x + tj * (TILE * CELL + GAP) + col * CELL, y: CUT.y + ti * (TILE * CELL + GAP) + row * CELL },
    strip: { x: STRIP.x + m * STRIP.w, y: rowY(k) + 2 },
  }
}

const LABEL: Record<Show, string> = {
  picture: 'A 12 by 12 picture of a house, a sun in its top-left corner.',
  cut: 'The picture cut into a 3 by 3 grid of tiles, numbered 1 to 9 in reading order.',
  unroll: 'Each tile unrolled into one row of its 16 squares, top line first.',
  ask: 'Each row gets a card of three answers: how much ink in all, in its top half, in its left half.',
  place: 'Each card gets its tile’s number added to it.',
  blank: 'A blank card, with no tile, joins at the top.',
  named:
    'The rows are patches, the three questions a projection E, the cards tokens, the numbers position embeddings and the blank card the class token; all ten go into a Transformer encoder, and the blank card’s output says house.',
}

// The story's picture, cut into patches and turned into tokens. `show` picks
// what plays; give it a `key` per step so each plays from the start.
export default function Cutting({ show }: { show: Show }) {
  const span = show === 'unroll' ? 1.4 : show === 'picture' || show === 'named' ? 0 : 1
  const played = usePlay(span, show === 'unroll' ? 1200 : 900)

  const cutting = show === 'cut' ? ease(played) : 1
  const unrolled = (k: number) => (show === 'unroll' ? ease(clamp((played - k * 0.1) / 0.6)) : from(show, 'ask') ? 1 : 0)
  const asked = (k: number) => (show === 'ask' ? clamp(played * 1.6 - k * 0.07) : from(show, 'place') ? 1 : 0)
  const placed = show === 'place' ? played : from(show, 'blank') ? 1 : 0
  const blank = show === 'blank' ? ease(played) : from(show, 'named') ? 1 : 0
  const named = show === 'named'
  const inRows = from(show, 'unroll')

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mx-auto w-full max-w-lg" role="img" aria-label={LABEL[show]}>
      {/* The outline of the picture, then of each tile once it is cut */}
      {show === 'picture' && (
        <rect x={PIC.x} y={PIC.y} width={SIDE * CELL} height={SIDE * CELL} className="fill-none stroke-zinc-300 dark:stroke-zinc-200/25" />
      )}
      {show === 'cut' &&
        STRIPS.map((_, k) => {
          const a = placeOf(k, 0)
          return (
            <rect
              key={k}
              x={lerp(a.whole.x, a.cut.x, cutting)}
              y={lerp(a.whole.y, a.cut.y, cutting)}
              width={TILE * CELL}
              height={TILE * CELL}
              className="fill-none stroke-zinc-300 dark:stroke-zinc-200/25"
              strokeOpacity={cutting}
            />
          )
        })}

      {/* Tracks for the unrolled rows, so an empty square still shows */}
      {inRows &&
        STRIPS.map((_, k) => (
          <rect
            key={k}
            x={STRIP.x - 1}
            y={rowY(k) + 1}
            width={TILE * TILE * STRIP.w + 2}
            height={STRIP.h + 2}
            rx={2}
            className="fill-none stroke-ink"
            strokeOpacity={0.25 * unrolled(k)}
          />
        ))}

      {/* Every square of the picture, wherever it is in the story */}
      {STRIPS.map((strip, k) =>
        strip.map((value, m) => {
          if (value === 0) return null
          const p = placeOf(k, m)
          const at = show === 'picture' ? p.whole : show === 'cut' ? null : p.cut
          const u = unrolled(k)
          const x = at ? lerp(at.x, p.strip.x, u) : lerp(p.whole.x, p.cut.x, cutting)
          const y = at ? lerp(at.y, p.strip.y, u) : lerp(p.whole.y, p.cut.y, cutting)
          return (
            <rect
              key={`${k}-${m}`}
              x={x}
              y={y}
              width={lerp(CELL - 0.6, STRIP.w - 0.6, u)}
              height={lerp(CELL - 0.6, STRIP.h, u)}
              className="fill-ink"
              fillOpacity={value}
            />
          )
        }),
      )}

      {/* Tile numbers: on the tiles once cut, then beside each row */}
      {show === 'cut' &&
        STRIPS.map((_, k) => {
          const a = placeOf(k, 0)
          return (
            <text
              key={k}
              x={a.cut.x + (TILE * CELL) / 2}
              y={a.cut.y + (TILE * CELL) / 2 + 4}
              textAnchor="middle"
              className="fill-ink stroke-paper font-mono text-[11px]"
              strokeWidth={3}
              paintOrder="stroke"
              opacity={cutting}
            >
              {k + 1}
            </text>
          )
        })}
      {inRows &&
        STRIPS.map((_, k) => (
          <text
            key={k}
            x={STRIP.x - 8}
            y={rowY(k) + 10}
            textAnchor="end"
            className="fill-zinc-faded font-mono text-[10px]"
            opacity={unrolled(k)}
          >
            {k + 1}
          </text>
        ))}

      {/* The three answers on each row's card */}
      {from(show, 'ask') &&
        CARDS.map((card, k) => (
          <g key={k} opacity={asked(k)}>
            <line
              x1={STRIP.x + TILE * TILE * STRIP.w + 6}
              x2={CARD.x - 6}
              y1={rowY(k) + 7}
              y2={rowY(k) + 7}
              className="stroke-ink"
              strokeOpacity={0.35}
            />
            {card.map((v, d) => (
              <g key={d}>
                <rect x={CARD.x + d * CARD.step} y={rowY(k)} width={CARD.w} height={14} rx={2} className="fill-sage" fillOpacity={v} />
                <rect
                  x={CARD.x + d * CARD.step}
                  y={rowY(k)}
                  width={CARD.w}
                  height={14}
                  rx={2}
                  className="fill-none stroke-sage"
                  strokeWidth={0.75}
                />
              </g>
            ))}
          </g>
        ))}
      {show === 'ask' && (
        <text x={(CARD.x + CARD_END) / 2} y={rowY(-1) + 10} textAnchor="middle" className="fill-zinc-faded font-mono text-[10px]">
          {QUESTIONS.length} answers
        </text>
      )}

      {/* Each card's place number, the blank card's too */}
      {from(show, 'place') &&
        [-1, ...STRIPS.map((_, k) => k)].map((k) => {
          if (k === -1 && blank === 0) return null
          return (
            <g key={k} opacity={k === -1 ? blank : placed}>
              <rect x={CHIP.x} y={rowY(k)} width={CHIP.w} height={14} rx={7} className="fill-paper stroke-ink" strokeOpacity={0.45} />
              <text x={CHIP.x + CHIP.w / 2} y={rowY(k) + 10.5} textAnchor="middle" className="fill-ink font-mono text-[10px]">
                +{k + 1}
              </text>
            </g>
          )
        })}

      {/* The blank card, sliding in at the top */}
      {from(show, 'blank') && (
        <g opacity={blank} transform={`translate(${lerp(-24, 0, blank)} 0)`}>
          <text x={STRIP.x} y={rowY(-1) + 10} className={`${named ? 'fill-ink' : 'fill-zinc-faded'} font-mono text-[10px]`}>
            {named ? '[class]' : 'no tile'}
          </text>
          {QUESTIONS.map((_, d) => (
            <rect
              key={d}
              x={CARD.x + d * CARD.step}
              y={rowY(-1)}
              width={CARD.w}
              height={14}
              rx={2}
              className="fill-paper stroke-ink"
              strokeOpacity={0.6}
              strokeDasharray="2 2"
            />
          ))}
        </g>
      )}

      {/* The names, and where the ten cards go */}
      {named && (
        <g>
          {[
            { x: STRIP.x + (TILE * TILE * STRIP.w) / 2, text: 'patches' },
            { x: (STRIP.x + TILE * TILE * STRIP.w + CARD.x) / 2, text: 'E' },
            { x: (CARD.x + CARD_END) / 2, text: 'tokens' },
            { x: CHIP.x + CHIP.w / 2 + 6, text: 'position' },
          ].map((label) => (
            <text key={label.text} x={label.x} y={16} textAnchor="middle" className="fill-ink font-mono text-[10px]">
              {label.text}
            </text>
          ))}
          <rect
            x={ENCODER.x}
            y={rowY(-1) - 4}
            width={ENCODER.w}
            height={rowY(8) - rowY(-1) + 22}
            rx={10}
            className="fill-paper stroke-sage"
            strokeWidth={1.5}
          />
          <text
            transform={`translate(${ENCODER.x + ENCODER.w / 2 + 4} ${(rowY(-1) + rowY(8)) / 2 + 7}) rotate(-90)`}
            textAnchor="middle"
            className="fill-ink font-mono text-[11px]"
          >
            Transformer encoder
          </text>
          <line
            x1={ENCODER.x + ENCODER.w + 2}
            x2={ENCODER.x + ENCODER.w + 14}
            y1={rowY(-1) + 7}
            y2={rowY(-1) + 7}
            className="stroke-sage"
            strokeWidth={1.5}
          />
          <text x={ENCODER.x + ENCODER.w + 18} y={rowY(-1) + 11} className="fill-sage-ink font-mono text-[11px]">
            house
          </text>
        </g>
      )}
    </svg>
  )
}
