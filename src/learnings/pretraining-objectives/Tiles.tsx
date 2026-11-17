import type { Kind, Tile } from './model'
import { TILE_H, type Place } from './layout'

// One word tile. A word as written is plain; what the model must guess is
// sage: a blank tinted, a swapped word dashed, a word left alone outlined.
// A sentinel is solid ink.
const BOX: Record<Kind, { className: string; fillOpacity?: number; dash?: string }> = {
  word: { className: 'fill-paper stroke-zinc-300' },
  blank: { className: 'fill-sage stroke-sage', fillOpacity: 0.2 },
  swap: { className: 'fill-paper stroke-sage', dash: '4 3' },
  kept: { className: 'fill-paper stroke-sage' },
  tag: { className: 'fill-ink stroke-ink' },
  edge: { className: 'fill-paper stroke-zinc-300', dash: '3 3' },
}

const TEXT: Record<Kind, string> = {
  word: 'fill-ink',
  blank: 'fill-ink',
  swap: 'fill-ink',
  kept: 'fill-ink',
  tag: 'fill-paper',
  edge: 'fill-zinc-faded',
}

export function TileMark({ tile, at, opacity = 1 }: { tile: Tile; at: Place; opacity?: number }) {
  const box = BOX[tile.kind]
  return (
    <g opacity={opacity}>
      <rect
        x={at.x}
        y={at.y}
        width={at.w}
        height={TILE_H}
        rx={7}
        className={box.className}
        fillOpacity={box.fillOpacity}
        strokeDasharray={box.dash}
        strokeWidth={1.5}
      />
      <text x={at.x + at.w / 2} y={at.y + 16.5} textAnchor="middle" className={`${TEXT[tile.kind]} font-mono text-[13px]`}>
        {tile.text}
      </text>
    </g>
  )
}

// A row of tiles at their places
export function TileRow({ tiles, places }: { tiles: Tile[]; places: Place[] }) {
  return (
    <>
      {tiles.map((tile, i) => (
        <TileMark key={i} tile={tile} at={places[i]} />
      ))}
    </>
  )
}
