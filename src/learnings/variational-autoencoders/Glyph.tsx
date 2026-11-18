import { SIDE, type Pixels } from './model'

// One tiny greyscale sketch inside an SVG: each pixel a square of ink, as
// strong as its value (0 none, 1 full ink), on a paper tile
export function Glyph({ pixels, x, y, cell, ring = false }: { pixels: Pixels; x: number; y: number; cell: number; ring?: boolean }) {
  const size = SIDE * cell
  return (
    <g>
      <rect
        x={x - 1}
        y={y - 1}
        width={size + 2}
        height={size + 2}
        rx={3}
        className={ring ? 'fill-paper stroke-sage' : 'fill-paper stroke-zinc-300 dark:stroke-zinc-200/25'}
        strokeWidth={ring ? 2 : 1}
      />
      {pixels.map((v, i) =>
        v > 0.02 ? (
          <rect
            key={i}
            x={x + (i % SIDE) * cell}
            y={y + Math.floor(i / SIDE) * cell}
            width={cell}
            height={cell}
            className="fill-ink"
            fillOpacity={Math.min(1, v)}
          />
        ) : null,
      )}
    </g>
  )
}
