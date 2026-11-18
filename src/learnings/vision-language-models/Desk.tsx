import { usePlay } from '../../components/explain/useLoop'
import {
  answer,
  AS_THEY_ARE,
  features,
  FIRST_PICTURE,
  nearest,
  NEW_PICTURE,
  patchesOf,
  picture,
  project,
  QUESTION,
  ruleNumbers,
  TRAINED,
  TRAINING,
  WORDS,
  type Rule,
  type Vec,
} from './model'

export type Show = 'look' | 'map' | 'raw' | 'rule' | 'train' | 'read' | 'named'

// Two layouts: side by side on a wide screen, stacked on a phone. Every row
// below the picture and the map spans the whole width, so nothing runs into
// the map. Mono text is budgeted at 7.5 px a character (8 with tracking).
interface Layout {
  width: number
  height: number
  // The word map's corner: its label sits just above
  map: { x: number; y: number }
  reads: number
  sequence: number
  className: string
}
const WIDE: Layout = { width: 640, height: 404, map: { x: 340, y: 16 }, reads: 278, sequence: 306, className: 'w-full' }
const NARROW: Layout = { width: 340, height: 596, map: { x: 30, y: 212 }, reads: 470, sequence: 498, className: 'mx-auto w-full max-w-[26rem]' }

const CELL = 14
const PIC = { x: 18, y: 24 }
const SIDE = CELL * 8
// Mia's numbers and the rule, to the right of the picture
const NOTES = 156
// The word map: x from −1.5 to 1.3, y from −1.15 to 1.15, 100 px a unit
const MAP_W = 280
const MAP_H = 230

const label = 'fill-zinc-faded font-mono text-[11px] uppercase tracking-widest'
const mono = 'font-mono text-[11px]'
const halo = { className: `fill-ink stroke-paper ${mono}`, strokeWidth: 3, paintOrder: 'stroke' as const }
const signed = (v: number) => (v < 0 ? `−${Math.abs(v).toFixed(2)}` : ` ${v.toFixed(2)}`)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
// Words whose label sits to the left of their dot, clear of a neighbour
const LEFT_LABELS = new Set(['solid', 'music', 'soup'])

// The rule partway through training, step `t` of TRAINING (fractional)
function ruleAt(t: number): Rule {
  const i = Math.min(TRAINING.length - 2, Math.floor(t))
  const f = Math.min(1, t - i)
  const [a, b] = [TRAINING[i], TRAINING[i + 1]]
  return {
    m: [
      [lerp(a.m[0][0], b.m[0][0], f), lerp(a.m[0][1], b.m[0][1], f)],
      [lerp(a.m[1][0], b.m[1][0], f), lerp(a.m[1][1], b.m[1][1], f)],
    ],
    b: [lerp(a.b[0], b.b[0], f), lerp(a.b[1], b.b[1], f)],
  }
}

// How long each step plays, in units of `pace` ms
const PLAY: Record<Show, { span: number; pace: number }> = {
  look: { span: 4, pace: 500 },
  map: { span: 1, pace: 700 },
  raw: { span: 4, pace: 450 },
  rule: { span: 1, pace: 600 },
  train: { span: 1, pace: 4500 },
  read: { span: 8, pace: 320 },
  named: { span: 1, pace: 400 },
}

// The story: Mia's squares and numbers, the rule between them, Leo's word
// map, and at the end the sequence Leo reads
export default function Desk({ show }: { show: Show }) {
  const { span, pace } = PLAY[show]
  const played = usePlay(span, pace)
  return (
    <div>
      <div className="hidden sm:block">
        <Drawing l={WIDE} show={show} played={played} />
      </div>
      <div className="sm:hidden">
        <Drawing l={NARROW} show={show} played={played} />
      </div>
    </div>
  )
}

function Drawing({ l, show, played }: { l: Layout; show: Show; played: number }) {
  const toX = (x: number) => l.map.x + (x + 1.5) * 100
  const toY = (y: number) => l.map.y + 4 + (1.15 - y) * 100
  const named = show === 'named'
  const reading = show === 'read' || named
  const kinds = reading ? NEW_PICTURE : FIRST_PICTURE
  const pic = picture(kinds)
  const numbers = patchesOf(pic).map(features)

  const rule = show === 'train' ? ruleAt((TRAINING.length - 1) * played ** 2) : reading ? TRAINED : AS_THEY_ARE
  const tokens: Vec[] = numbers.map((z) => project(rule, z))
  const seenNumbers = show === 'look' ? Math.floor(played) + (played > 0 ? 1 : 0) : 4
  const mapShown = show !== 'look'
  const mapOpacity = show === 'map' ? played : 1
  const tokensShown = show === 'raw' ? Math.min(4, Math.floor(played) + 1) : ['look', 'map'].includes(show) ? 0 : 4
  const ruleShown = !['look', 'map', 'raw'].includes(show)
  const reads = tokens.map(nearest)
  const seqShown = reading ? (named ? 8 : Math.floor(played) + 1) : 0

  return (
    <svg viewBox={`0 0 ${l.width} ${l.height}`} className={l.className} role="img" aria-label={ariaFor(show, reads)}>
      {/* The picture, ink as solid as its value, cut into four squares */}
      <text x={0} y={12} className={label}>
        {named ? 'Image' : 'Picture'}
      </text>
      {pic.map((row, y) =>
        row.map((v, x) => (
          <rect
            key={`${x}-${y}`}
            x={PIC.x + x * CELL}
            y={PIC.y + y * CELL}
            width={CELL}
            height={CELL}
            className="fill-ink"
            fillOpacity={v * 0.85}
          />
        )),
      )}
      {[0, 1, 2, 3].map((k) => {
        const x = PIC.x + (k % 2) * (SIDE / 2)
        const y = PIC.y + Math.floor(k / 2) * (SIDE / 2)
        const left = k % 2 === 0
        return (
          <g key={k}>
            <rect x={x} y={y} width={SIDE / 2} height={SIDE / 2} className="fill-none stroke-zinc-400" strokeWidth={1} />
            <text
              x={left ? PIC.x - 6 : PIC.x + SIDE + 6}
              y={y + 13}
              textAnchor={left ? 'end' : 'start'}
              className={`fill-sage-ink ${mono}`}
            >
              {k + 1}
            </text>
          </g>
        )
      })}

      {/* Mia's numbers, one row per square */}
      <text x={NOTES} y={34} className={label}>
        {named ? 'Encoder: z' : 'Mia: ink, stripes'}
      </text>
      {numbers.slice(0, seenNumbers).map((z, k) => (
        <text key={k} x={NOTES} y={54 + k * 16} className={`fill-ink ${mono}`} xmlSpace="preserve">
          {`${k + 1}   ${z[0].toFixed(2)}   ${z[1].toFixed(2)}`}
        </text>
      ))}

      {/* The rule: a matrix to multiply by, and a shift to add */}
      {ruleShown && (
        <g>
          <text x={NOTES} y={132} className={label}>
            {named ? 'Projector: W, b' : 'Rule: 6 numbers'}
          </text>
          <RuleText rule={rule} />
        </g>
      )}

      {/* Leo's word map */}
      {mapShown && (
        <g opacity={mapOpacity}>
          <text x={l.map.x} y={l.map.y - 2} className={label}>
            {named ? 'Word embeddings' : 'Leo’s word map'}
          </text>
          <rect x={l.map.x} y={l.map.y + 4} width={MAP_W} height={MAP_H} rx={10} className="fill-none stroke-zinc-300" />
          {WORDS.map((w) => (
            <circle key={w.word} cx={toX(w.at[0])} cy={toY(w.at[1])} r={3} className="fill-ink" fillOpacity={0.55} />
          ))}
        </g>
      )}

      {/* Mia's squares on Leo's map: the visual tokens */}
      {tokens.slice(0, tokensShown).map((h, k) => (
        <g key={k}>
          <circle cx={toX(h[0])} cy={toY(h[1])} r={8} className="fill-sage" />
          <text x={toX(h[0])} y={toY(h[1]) + 3.5} textAnchor="middle" className="fill-ink dark:fill-paper font-mono text-[10px]">
            {k + 1}
          </text>
        </g>
      ))}
      {/* The words go on top, so a token sitting on its word leaves it readable */}
      {mapShown && (
        <g opacity={mapOpacity}>
          {WORDS.map((w) => (
            <text
              key={w.word}
              x={toX(w.at[0]) + (LEFT_LABELS.has(w.word) ? -9 : 9)}
              y={toY(w.at[1]) - 6}
              textAnchor={LEFT_LABELS.has(w.word) ? 'end' : 'start'}
              {...halo}
            >
              {w.word}
            </text>
          ))}
        </g>
      )}

      {/* What Leo reads each square as, on a row of its own */}
      {tokensShown > 0 && (
        <text x={0} y={l.reads} className={`fill-ink ${mono}`} xmlSpace="preserve">
          <tspan className="fill-zinc-faded">{named ? 'Read as: ' : 'Leo reads: '}</tspan>
          {reads.slice(0, tokensShown).join(' · ')}
        </text>
      )}

      {/* What Leo is given, and his answer */}
      {seqShown > 0 && <Sequence top={l.sequence} shown={seqShown} named={named} reads={reads} />}
    </svg>
  )
}

function RuleText({ rule }: { rule: Rule }) {
  const [a, b, c, d, e, f] = ruleNumbers(rule)
  return (
    <g className={`fill-ink ${mono}`}>
      <text x={NOTES} y={152} xmlSpace="preserve">{`× ${signed(a)} ${signed(b)}`}</text>
      <text x={NOTES} y={168} xmlSpace="preserve">{`  ${signed(c)} ${signed(d)}`}</text>
      <text x={NOTES} y={184} xmlSpace="preserve">{`+ ${signed(e)} ${signed(f)}`}</text>
    </g>
  )
}

// The row of tokens the language model reads: four visual tokens, then the
// question's words, then the answer
function Sequence({ top, shown, named, reads }: { top: number; shown: number; named: boolean; reads: string[] }) {
  const y = top + 30
  const chips = [...[0, 1, 2, 3].map((k) => ({ text: String(k + 1), visual: true })), ...QUESTION.map((w) => ({ text: w, visual: false }))]
  let x = 0
  const placed = chips.map((chip) => {
    const w = chip.visual ? 24 : chip.text.length * 7.5 + 16
    const at = x
    x += w + 6
    return { ...chip, x: at, w }
  })
  return (
    <g>
      <text x={0} y={top} className={label}>
        {named ? 'Visual tokens, then text' : 'Leo is given'}
      </text>
      {placed.slice(0, shown).map((chip, i) => (
        <g key={i}>
          <rect
            x={chip.x}
            y={y - 15}
            width={chip.w}
            height={22}
            rx={6}
            className={chip.visual ? 'fill-sage' : 'fill-paper stroke-zinc-400'}
          />
          <text
            x={chip.x + chip.w / 2}
            y={y}
            textAnchor="middle"
            className={`${chip.visual ? 'fill-ink dark:fill-paper' : 'fill-ink'} ${mono}`}
          >
            {chip.text}
          </text>
        </g>
      ))}
      {shown >= placed.length && (
        <g>
          <text x={0} y={y + 38} className={label}>
            {named ? 'The model writes' : 'Leo writes'}
          </text>
          <text x={0} y={y + 58} className={`fill-ink ${mono}`}>
            {answer(reads)}
          </text>
        </g>
      )}
    </g>
  )
}

function ariaFor(show: Show, reads: string[]): string {
  switch (show) {
    case 'look':
      return 'An 8 by 8 ink drawing cut into four squares, with two numbers for each: how much ink, and how stripy.'
    case 'map':
      return 'A map of words: blank, empty, solid, filled, stripes, zebra, dots, spots, and far off Tuesday, music, soup and piano.'
    case 'raw':
    case 'rule':
      return `The four squares placed on the word map as their raw numbers, read as ${reads.join(', ')}.`
    case 'train':
      return 'The six numbers of the rule change step by step, and the four squares move across the map to their own words.'
    default:
      return `A new picture's four squares land on ${reads.join(', ')}; after them come the words of the question, and the answer: ${answer(reads)}`
  }
}
