import type { Picture } from './model'

// A picture as its 8×8 pixels: each pixel's ink is its value, solid for 1,
// empty for 0, with a faint square behind so the frame shows. Centred on
// (x, y), `size` wide.
export default function Glyph({ picture, x, y, size, accent = false }: { picture: Picture; x: number; y: number; size: number; accent?: boolean }) {
  const cell = size / 8
  const left = x - size / 2
  const top = y - size / 2
  return (
    <g>
      <rect
        x={left - 1.5}
        y={top - 1.5}
        width={size + 3}
        height={size + 3}
        rx={2}
        className={accent ? 'fill-paper stroke-sage' : 'fill-paper stroke-zinc-300 dark:stroke-zinc-200/25'}
        strokeWidth={accent ? 1.5 : 1}
      />
      {picture.pixels.flatMap((row, r) =>
        row.map((value, c) =>
          value > 0 ? (
            <rect
              key={`${r}-${c}`}
              x={left + c * cell}
              y={top + r * cell}
              width={cell}
              height={cell}
              className="fill-ink"
              fillOpacity={value}
            />
          ) : null,
        ),
      )}
    </g>
  )
}
