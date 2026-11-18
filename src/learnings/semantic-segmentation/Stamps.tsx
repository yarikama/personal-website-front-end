import { stampCounts } from './model'

const WIDTH = 460
const HEIGHT = 366
const N = 4
const IN_CELL = 22
const INPUT = { x: 8, y: 40 }
const OUTPUT = { x: 132, y: 40, size: 320 }

// A transposed convolution of a 4 × 4 input with every value 1, so each
// output pixel's number is how many stamps land on it. The picked input
// square's stamp is outlined in sage. Tap or press Enter on an input square
// to pick it.
export default function Stamps({
  kernel,
  stride,
  picked,
  onPick,
}: {
  kernel: number
  stride: number
  picked: [number, number]
  onPick: (cell: [number, number]) => void
}) {
  const counts = stampCounts(N, kernel, stride)
  const size = counts.length
  const cell = Math.min(30, OUTPUT.size / size)
  const most = Math.max(...counts.flat())
  const [pi, pj] = picked

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      role="group"
      aria-label={`A 4 by 4 input grows to ${size} by ${size}. Stamps per output pixel, row by row: ${counts
        .map((row) => row.join(' '))
        .join('; ')}.`}
    >
      <text x={INPUT.x} y={22} className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
        Input 4 × 4
      </text>
      <text x={OUTPUT.x} y={22} className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
        Output {size} × {size}: stamps per pixel
      </text>

      {Array.from({ length: N }, (_, i) =>
        Array.from({ length: N }, (_, j) => {
          const on = i === pi && j === pj
          return (
            <rect
              key={`${i}-${j}`}
              x={INPUT.x + j * IN_CELL + 1}
              y={INPUT.y + i * IN_CELL + 1}
              width={IN_CELL - 2}
              height={IN_CELL - 2}
              rx={3}
              role="button"
              tabIndex={0}
              aria-label={`Input row ${i + 1}, column ${j + 1}${on ? ', picked' : ''}`}
              aria-pressed={on}
              onClick={() => onPick([i, j])}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onPick([i, j])
                }
              }}
              className={`cursor-pointer outline-none focus-visible:stroke-ink ${
                on ? 'fill-sage stroke-sage' : 'fill-paper stroke-zinc-400 hover:stroke-ink'
              }`}
              strokeWidth={1.5}
            />
          )
        }),
      )}
      <text x={INPUT.x} y={INPUT.y + N * IN_CELL + 18} className="fill-zinc-faded font-mono text-[10px]">
        tap one to see
      </text>
      <text x={INPUT.x} y={INPUT.y + N * IN_CELL + 32} className="fill-zinc-faded font-mono text-[10px]">
        its stamp
      </text>

      {counts.map((row, r) =>
        row.map((stamps, c) => (
          <g key={`${r}-${c}`}>
            <rect
              x={OUTPUT.x + c * cell + 1}
              y={OUTPUT.y + r * cell + 1}
              width={cell - 2}
              height={cell - 2}
              rx={3}
              className={stamps === 0 ? 'fill-paper stroke-zinc-300 dark:stroke-zinc-200/25' : 'fill-ink'}
              fillOpacity={stamps === 0 ? 1 : 0.1 + (0.45 * stamps) / most}
              strokeWidth={stamps === 0 ? 1 : 0}
            />
            <text
              x={OUTPUT.x + c * cell + cell / 2}
              y={OUTPUT.y + r * cell + cell / 2 + 3.5}
              textAnchor="middle"
              className="fill-ink stroke-paper font-mono text-[10px]"
              strokeWidth={3}
              paintOrder="stroke"
            >
              {stamps}
            </text>
          </g>
        )),
      )}

      <rect
        x={OUTPUT.x + pj * stride * cell - 1.5}
        y={OUTPUT.y + pi * stride * cell - 1.5}
        width={kernel * cell + 3}
        height={kernel * cell + 3}
        rx={5}
        className="pointer-events-none fill-none stroke-sage"
        strokeWidth={3}
      />
    </svg>
  )
}
