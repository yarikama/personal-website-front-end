import type { ReactNode } from 'react'
import Glyph from './Glyph'
import { DIAL, HEIGHT, toward, WIDTH } from './layout'
import { KEYWORDS, lossOf, N, PICTURES, similarities, two, type Arrows, type Picture } from './model'

const GLYPH = 16
const GLYPH_AT = 18
const WORD_AT = DIAL.r + 48
// The grid: row i is picture i, column j caption j
const GRID = { x: 28, y: 60, cell: 37 }
const LOSS_X = GRID.x + N * GRID.cell + 8

const RAD = Math.PI / 180

const label = 'font-mono text-[10px] uppercase tracking-widest'
const halo = {
  className: 'fill-ink stroke-paper',
  strokeWidth: 3,
  paintOrder: 'stroke' as const,
}

// One arrow from the centre: solid with a filled head for a picture,
// dashed with a hollow head for a caption. `grow` from 0 to 1.
export function Arrow({
  angle,
  kind,
  grow = 1,
  accent = false,
  at = DIAL,
}: {
  angle: number
  kind: 'picture' | 'caption'
  grow?: number
  accent?: boolean
  at?: typeof DIAL
}) {
  const length = (kind === 'picture' ? at.r : at.r * 0.78) * grow
  if (length < 1) return null
  const tip = toward(angle, length, at)
  const back = toward(angle, length - 8, at)
  const side = (s: number) => ({
    x: back.x + s * 4 * Math.sin(angle * RAD),
    y: back.y + s * 4 * Math.cos(angle * RAD),
  })
  const [l, r] = [side(1), side(-1)]
  const stroke = accent ? 'stroke-sage' : 'stroke-ink'
  return (
    <g>
      <line
        x1={at.x}
        y1={at.y}
        x2={back.x}
        y2={back.y}
        className={stroke}
        strokeWidth={accent ? 2.2 : 1.5}
        strokeDasharray={kind === 'caption' ? '4 3' : undefined}
      />
      <path
        d={`M${tip.x},${tip.y} L${l.x},${l.y} L${r.x},${r.y} Z`}
        className={
          kind === 'picture' ? (accent ? 'fill-sage stroke-sage' : 'fill-ink stroke-ink') : `fill-paper ${stroke}`
        }
        strokeWidth={1.3}
        strokeLinejoin="round"
      />
    </g>
  )
}

// What sits past an arrow's tip: the picture itself, or the caption's word
export function PictureTip({
  angle,
  picture,
  grow = 1,
  accent = false,
  at = DIAL,
}: {
  angle: number
  picture: Picture
  grow?: number
  accent?: boolean
  at?: typeof DIAL
}) {
  if (grow < 1) return null
  const p = toward(angle, at.r + GLYPH_AT, at)
  return <Glyph picture={picture} x={p.x} y={p.y} size={GLYPH} accent={accent} />
}

export function WordTip({
  angle,
  word,
  grow = 1,
  accent = false,
  at = DIAL,
  r = WORD_AT,
}: {
  angle: number
  word: string
  grow?: number
  accent?: boolean
  at?: typeof DIAL
  r?: number
}) {
  if (grow < 1) return null
  const p = toward(angle, r, at)
  return (
    <text
      x={p.x}
      y={p.y + 3.5}
      textAnchor="middle"
      className={`${accent ? 'fill-sage-ink' : 'fill-ink'} font-mono text-[10px]`}
    >
      {word}
    </text>
  )
}

// Two drawings that sit side by side, or one above the other on a phone
export function Pair({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto grid max-w-[22rem] grid-cols-1 gap-6 sm:max-w-none sm:grid-cols-2 sm:gap-4">{children}</div>
  )
}

const lossText = (x: number) => (x < 0.1 ? x.toFixed(3) : x.toFixed(2))

// The four postcards' arrows round one dial, and the 4×4 grid of how alike
// each picture is to each caption. Optional layers, for the story to bring
// in one at a time: `cells` shown so far (in reading order), the pair being
// compared, the diagonal, the losses, and the names CLIP gives them.
export default function Board({
  arrows,
  tau,
  grow = 1,
  cells = N * N,
  comparing = null,
  diagonal = true,
  losses = true,
  named = false,
}: {
  arrows: Arrows
  tau: number
  grow?: number
  cells?: number
  comparing?: number | null
  diagonal?: boolean
  losses?: boolean
  named?: boolean
}) {
  const S = similarities(arrows)
  const loss = lossOf(S, tau)
  const row = comparing === null ? -1 : Math.floor(comparing / N)
  const col = comparing === null ? -1 : comparing % N

  return (
    <Pair>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`Four pictures (sun, house, tree, boat) and four captions (${KEYWORDS.join(', ')}) as arrows round a dial: pictures at ${arrows.pictures
          .map((a) => `${Math.round(((a % 360) + 360) % 360)}°`)
          .join(
            ', ',
          )}; captions at ${arrows.captions.map((b) => `${Math.round(((b % 360) + 360) % 360)}°`).join(', ')}.`}
      >
        <text x={DIAL.x} y={14} textAnchor="middle" className={`fill-zinc-faded ${label}`}>
          {named ? 'Embeddings' : 'Arrows'}
        </text>
        <circle
          cx={DIAL.x}
          cy={DIAL.y}
          r={DIAL.r}
          className="fill-none stroke-zinc-300 dark:stroke-zinc-200/25"
          strokeWidth={1}
        />
        {arrows.captions.map((b, j) => (
          <Arrow key={`c${j}`} angle={b} kind="caption" grow={grow} accent={j === col} />
        ))}
        {arrows.pictures.map((a, i) => (
          <Arrow key={`p${i}`} angle={a} kind="picture" grow={grow} accent={i === row} />
        ))}
        <circle cx={DIAL.x} cy={DIAL.y} r={2.5} className="fill-ink" />
        {arrows.pictures.map((a, i) => (
          <PictureTip key={`pt${i}`} angle={a} picture={PICTURES[i]} grow={grow} accent={i === row} />
        ))}
        {arrows.captions.map((b, j) => (
          <WordTip key={`ct${j}`} angle={b} word={KEYWORDS[j]} grow={grow} accent={j === col} />
        ))}
        {/* Which arrow is which */}
        <g transform={`translate(${named ? 52 : 38}, ${HEIGHT - 8})`}>
          <line x1={0} x2={16} y1={-3} y2={-3} className="stroke-ink" strokeWidth={1.5} />
          <text x={20} y={0} className="fill-ink font-mono text-[10px]">
            {named ? 'image' : 'picture'}
          </text>
          <line
            x1={named ? 62 : 72}
            x2={named ? 78 : 88}
            y1={-3}
            y2={-3}
            className="stroke-ink"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
          <text x={named ? 82 : 92} y={0} className="fill-ink font-mono text-[10px]">
            {named ? 'text' : 'caption'}
          </text>
        </g>
      </svg>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`The grid of how alike each picture is to each caption: ${S.map(
          (r, i) => `${PICTURES[i].name} ${r.map((s) => two(s)).join(', ')}`,
        ).join(
          '; ',
        )}.${losses ? ` Row losses ${loss.rows.map(two).join(', ')}; column losses ${loss.columns.map(two).join(', ')}; average ${lossText(loss.total)}.` : ''}`}
      >
        <text x={GRID.x + (N * GRID.cell) / 2} y={14} textAnchor="middle" className={`fill-zinc-faded ${label}`}>
          {named ? 'Similarity matrix' : 'How alike'}
        </text>
        {KEYWORDS.map((w, j) => (
          <text
            key={`h${j}`}
            x={GRID.x + j * GRID.cell + (GRID.cell - 3) / 2}
            y={GRID.y - 8}
            textAnchor="middle"
            className={`${j === col ? 'fill-sage-ink' : 'fill-ink'} font-mono text-[10px]`}
          >
            {w}
          </text>
        ))}
        {PICTURES.map((p, i) => (
          <Glyph
            key={`r${i}`}
            picture={p}
            x={GRID.x - 14}
            y={GRID.y + i * GRID.cell + (GRID.cell - 3) / 2}
            size={GLYPH}
            accent={i === row}
          />
        ))}
        {S.map((r, i) =>
          r.map((s, j) => {
            const x = GRID.x + j * GRID.cell
            const y = GRID.y + i * GRID.cell
            const shown = i * N + j < cells
            return (
              <g key={`${i}-${j}`}>
                <rect
                  x={x}
                  y={y}
                  width={GRID.cell - 3}
                  height={GRID.cell - 3}
                  rx={5}
                  className={shown ? 'fill-ink' : 'fill-none stroke-zinc-300 dark:stroke-zinc-200/25'}
                  fillOpacity={shown ? 0.04 + 0.46 * ((s + 1) / 2) : undefined}
                />
                {diagonal && i === j && (
                  <rect
                    x={x - 1.5}
                    y={y - 1.5}
                    width={GRID.cell}
                    height={GRID.cell}
                    rx={6}
                    className="fill-none stroke-sage"
                    strokeWidth={2}
                  />
                )}
                {shown && (
                  <text
                    x={x + (GRID.cell - 3) / 2}
                    y={y + GRID.cell / 2 + 2}
                    textAnchor="middle"
                    {...halo}
                    className={`${halo.className} font-mono text-[10px] tabular-nums`}
                  >
                    {two(s)}
                  </text>
                )}
              </g>
            )
          }),
        )}
        {losses && (
          <g>
            <text x={LOSS_X} y={GRID.y - 8} className={`fill-zinc-faded ${label}`}>
              Loss
            </text>
            {loss.rows.map((l, i) => (
              <text
                key={`rl${i}`}
                x={LOSS_X}
                y={GRID.y + i * GRID.cell + GRID.cell / 2 + 2}
                className="fill-ink font-mono text-[10px] tabular-nums"
              >
                {two(l)}
              </text>
            ))}
            {loss.columns.map((l, j) => (
              <text
                key={`cl${j}`}
                x={GRID.x + j * GRID.cell + (GRID.cell - 3) / 2}
                y={GRID.y + N * GRID.cell + 12}
                textAnchor="middle"
                className="fill-ink font-mono text-[10px] tabular-nums"
              >
                {two(l)}
              </text>
            ))}
            <text x={GRID.x - 22} y={HEIGHT - 8} className={`fill-zinc-faded ${label}`}>
              {named ? 'Contrastive loss' : 'Average loss'}
            </text>
            <text
              x={WIDTH - 4}
              y={HEIGHT - 8}
              textAnchor="end"
              className="fill-sage-ink font-mono text-[11px] tabular-nums"
            >
              {lossText(loss.total)}
            </text>
          </g>
        )}
      </svg>
    </Pair>
  )
}
