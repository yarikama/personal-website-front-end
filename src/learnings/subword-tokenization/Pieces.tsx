import type { Entry, Merge } from './model'
import { chipWidth, COLUMN, flow, listCell, SMALL, tones, type Size, type Tone } from './layout'

// One piece: a rounded tile with its letters
export function Chip({ piece, x, y, size, tone = 'plain' }: { piece: string; x: number; y: number; size: Size; tone?: Tone }) {
  const w = chipWidth(piece, size)
  return (
    <g>
      <rect
        x={x + 0.5}
        y={y + 0.5}
        width={w - 1}
        height={size.height - 1}
        rx={4}
        className={tone === 'plain' ? 'fill-paper stroke-ink' : 'fill-sage stroke-sage'}
        fillOpacity={tone === 'plain' ? 1 : tone === 'glue' ? 0.12 : 0.5}
        strokeOpacity={tone === 'plain' ? 0.3 : 1}
        strokeWidth={tone === 'glue' ? 2.5 : tone === 'fresh' ? 1.5 : 1}
      />
      <text
        x={x + w / 2}
        y={y + size.height / 2 + size.font * 0.35}
        textAnchor="middle"
        className="fill-ink font-mono"
        style={{ fontSize: size.font }}
      >
        {piece}
      </text>
    </g>
  )
}

// A row of pieces from (x, y), wrapping at `width`
export function Pieces({
  pieces,
  x = 0,
  y,
  size,
  width,
  glue = null,
  fresh = null,
}: {
  pieces: string[]
  x?: number
  y: number
  size: Size
  width: number
  glue?: Pick<Merge, 'left' | 'right'> | null
  fresh?: string | null
}) {
  const tone = tones(pieces, glue, fresh)
  return (
    <g>
      {flow(pieces, size, width).map((p, i) => (
        <Chip key={i} piece={p.piece} x={x + p.x} y={y + p.line * (size.height + size.gap)} size={size} tone={tone[i]} />
      ))}
    </g>
  )
}

// The list of words, two columns, each word split as it is and how often it
// was written. Only the first `shown` words are on the table yet.
export function WordList({
  words,
  splits,
  y = 0,
  shown = words.length,
  glue = null,
  fresh = null,
}: {
  words: Entry[]
  splits: string[][]
  y?: number
  shown?: number
  glue?: Pick<Merge, 'left' | 'right'> | null
  fresh?: string | null
}) {
  return (
    <g>
      {words.slice(0, shown).map((entry, w) => {
        const cell = listCell(w, words.length)
        return (
          <g key={entry.word}>
            <Pieces pieces={splits[w]} x={cell.x} y={y + cell.y} size={SMALL} width={COLUMN} glue={glue} fresh={fresh} />
            <text
              x={cell.x + COLUMN}
              y={y + cell.y + SMALL.height / 2 + 4}
              textAnchor="end"
              className="fill-zinc-faded font-mono text-[12px]"
            >
              ×{entry.count}
            </text>
          </g>
        )
      })}
    </g>
  )
}
