import type { KeyboardEvent } from 'react'
import { clampWindow, convolve, show, sumText, terms, type Border, type Grid, type Kernel } from './model'
import { Pixels, Window } from './Pixels'

const CELL = 30
const PAD = 4
const SIDE = 8
const SIZE = SIDE * CELL + 2 * PAD

// The filter on a picture of the reader's choosing: the picture with the
// window on it, the filtered picture with the cell the window writes, the
// filter's weights, and the window's sum written out. Tap a cell on either
// grid to move the window, or use the arrow keys once a grid has focus.
export default function Lab({
  image,
  kernel,
  border,
  at,
  onAt,
}: {
  image: Grid
  kernel: Kernel
  border: Border
  at: [number, number]
  onAt: (at: [number, number]) => void
}) {
  const [i, j] = clampWindow(image, border, at)
  const output = convolve(image, kernel, border)
  const first = border === 'Shrink' ? 1 : 0
  const line = sumText(kernel, terms(image, kernel, i, j))

  const keys = (event: KeyboardEvent) => {
    const move: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }
    const step = move[event.key]
    if (!step) return
    event.preventDefault()
    onAt(clampWindow(image, border, [i + step[0], j + step[1]]))
  }

  const grid = (which: 'in' | 'out') => (
    <div>
      <p className="mb-2 font-mono text-[0.875rem] uppercase tracking-widest text-zinc-faded">{which === 'in' ? 'Image' : 'Output'}</p>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full cursor-pointer touch-manipulation select-none rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-sage"
        tabIndex={0}
        onKeyDown={keys}
        role="img"
        aria-label={
          which === 'in'
            ? `The image, 8 by 8. The window is centred on row ${i + 1}, column ${j + 1}. Arrow keys move it.`
            : `The output, ${output.length} by ${output[0].length}. At row ${i + 1}, column ${j + 1}: ${line}.`
        }
      >
        <Pixels
          values={which === 'in' ? image : output}
          x={PAD}
          y={PAD}
          cell={CELL}
          side={SIDE}
          first={which === 'in' ? 0 : first}
          signed={which === 'out' && kernel.signed}
          numbers
        />
        {which === 'in' ? (
          <Window x={PAD + (j - 1) * CELL} y={PAD + (i - 1) * CELL} cell={CELL} />
        ) : (
          <Window x={PAD + j * CELL} y={PAD + i * CELL} cell={CELL} size={1} />
        )}
        {Array.from({ length: SIDE * SIDE }, (_, n) => (
          <rect
            key={n}
            x={PAD + (n % SIDE) * CELL}
            y={PAD + Math.floor(n / SIDE) * CELL}
            width={CELL}
            height={CELL}
            className="fill-transparent"
            onClick={() => onAt(clampWindow(image, border, [Math.floor(n / SIDE), n % SIDE]))}
          />
        ))}
      </svg>
    </div>
  )

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:gap-8">
        {grid('in')}
        {grid('out')}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-2" aria-label={`The ${kernel.name} filter's weights`}>
          <div className="grid grid-cols-3 gap-1">
            {kernel.weights.flat().map((w, n) => (
              <span
                key={n}
                className={`flex h-8 w-9 items-center justify-center rounded-md border font-mono text-[0.875rem] tabular-nums ${
                  w > 0 ? 'border-sage bg-sage/15 text-ink' : w < 0 ? 'border-ink text-ink' : 'border-zinc-300 text-zinc-faded dark:border-zinc-200/20'
                }`}
              >
                {show(w)}
              </span>
            ))}
          </div>
          {kernel.divisor !== 1 && <span className="font-mono text-[0.875rem] text-ink">÷ {kernel.divisor}</span>}
        </div>
        <p className="min-w-0 flex-1 basis-56 font-mono text-[0.875rem] leading-relaxed text-ink tabular-nums">
          <span className="text-zinc-faded">
            Row {i + 1}, column {j + 1}:{' '}
          </span>
          {line}
        </p>
      </div>
    </div>
  )
}
