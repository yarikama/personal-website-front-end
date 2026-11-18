import { useRef, useState } from 'react'
import { useAnimationFrame } from 'motion/react'
import { usePrefersReducedMotion } from '../../hooks'
import { BLOCK, BOX, convolve, SOBEL_ACROSS, STORY_SIDE, sumText, sweep, terms, type Border, type Kernel } from './model'
import { Pixels, Window } from './Pixels'

export type Show = 'picture' | 'blurring' | 'blurred' | 'border' | 'edging' | 'edges' | 'named'

const WIDTH = 460
const HEIGHT = 250
const CELL = 22
const IN = { x: 34, y: 48 }
const OUT = { x: 258, y: 48 }
// Real milliseconds the window rests on each seat as it sweeps
const PER_SPOT = 160

// What each step runs, and where the window rests once it has run
const PLAN: Record<Show, { kernel: Kernel | null; border: Border; sweep: boolean; rest: [number, number] }> = {
  picture: { kernel: null, border: 'Shrink', sweep: false, rest: [3, 2] },
  blurring: { kernel: BOX, border: 'Shrink', sweep: true, rest: [3, 1] },
  blurred: { kernel: BOX, border: 'Shrink', sweep: false, rest: [3, 1] },
  border: { kernel: BOX, border: 'Zeros', sweep: false, rest: [0, 2] },
  edging: { kernel: SOBEL_ACROSS, border: 'Shrink', sweep: true, rest: [3, 2] },
  edges: { kernel: SOBEL_ACROSS, border: 'Shrink', sweep: false, rest: [3, 2] },
  named: { kernel: SOBEL_ACROSS, border: 'Shrink', sweep: false, rest: [3, 2] },
}

// The story's stand: 64 fans in an 8 by 8 block, each holding a card from
// blank (0) to solid (9), and the new cards they hold up after following a
// rule over the nine cards around them. A sweeping step moves the window
// seat by seat, row by row, and fills the new cards in as it goes; with
// reduced motion it shows the end.
export default function Stand({ show }: { show: Show }) {
  const plan = PLAN[show]
  const reducedMotion = usePrefersReducedMotion()
  const spots = sweep(BLOCK, plan.border)
  const started = useRef<number | null>(null)
  const [done, setDone] = useState(plan.sweep && !reducedMotion ? 0 : spots.length)

  useAnimationFrame((time) => {
    if (done >= spots.length) return
    started.current ??= time
    setDone(Math.min(spots.length, Math.floor((time - started.current) / PER_SPOT) + 1))
  })

  const kernel = plan.kernel
  const output = kernel ? convolve(BLOCK, kernel, plan.border) : null
  const first = plan.border === 'Shrink' ? 1 : 0
  const [wi, wj] = done < spots.length ? spots[Math.max(0, done - 1)] : plan.rest
  const padded = plan.border === 'Zeros'
  const named = show === 'named'

  const line = kernel ? sumText(kernel, terms(BLOCK, kernel, wi, wj)) : 'Each card is a number: 0 is blank, 9 is solid.'

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={
          kernel
            ? `The 8 by 8 block of cards and the new cards made from it. The window at row ${wi + 1}, seat ${wj + 1}: ${line}.`
            : 'An 8 by 8 block of cards: blank all round, solid in a tall block in the middle.'
        }
      >
        <text x={IN.x} y={18} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
          {named ? 'Image: pixels' : 'Cards now'}
        </text>
        <text x={OUT.x} y={18} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
          {named ? 'Output' : 'New cards'}
        </text>

        {/* The empty seats round the block, counted as blank cards */}
        {padded &&
          Array.from({ length: (STORY_SIDE + 2) ** 2 }, (_, n) => [Math.floor(n / (STORY_SIDE + 2)) - 1, (n % (STORY_SIDE + 2)) - 1])
            .filter(([i, j]) => i < 0 || j < 0 || i >= STORY_SIDE || j >= STORY_SIDE)
            .map(([i, j]) => (
              <g key={`pad${i}-${j}`}>
                <rect
                  x={IN.x + j * CELL + 1}
                  y={IN.y + i * CELL + 1}
                  width={CELL - 2}
                  height={CELL - 2}
                  rx={3}
                  className="fill-none stroke-zinc-400"
                  strokeDasharray="3 3"
                />
                <text x={IN.x + j * CELL + CELL / 2} y={IN.y + i * CELL + CELL / 2 + 3.5} textAnchor="middle" className="fill-zinc-faded font-mono text-[10px]">
                  0
                </text>
              </g>
            ))}

        <Pixels values={BLOCK} x={IN.x} y={IN.y} cell={CELL} side={STORY_SIDE} numbers />
        <Pixels
          values={output ?? [[]]}
          x={OUT.x}
          y={OUT.y}
          cell={CELL}
          side={STORY_SIDE}
          first={first}
          shown={output ? done : 0}
          signed={kernel?.signed}
        />

        {kernel && (
          <>
            <Window x={IN.x + (wj - 1) * CELL} y={IN.y + (wi - 1) * CELL} cell={CELL} />
            <Window x={OUT.x + wj * CELL} y={OUT.y + wi * CELL} cell={CELL} size={1} />
          </>
        )}
      </svg>
      <p className="mt-3 font-mono text-[0.875rem] leading-relaxed text-ink tabular-nums" aria-hidden>
        {kernel && <span className="text-zinc-faded">{named ? 'Weights × pixels: ' : kernel === BOX ? 'Average of nine: ' : 'Right minus left: '}</span>}
        {line}
      </p>
      {kernel?.signed && (
        <p className="mt-1 font-mono text-[0.875rem] text-zinc-faded">Sage: the numbers grow to the right. Ink: they shrink.</p>
      )}
    </div>
  )
}
