import { useRef, useState } from 'react'
import { useAnimationFrame } from 'motion/react'
import { Button, Controls, Readout } from '../../components/explain/figure'
import { usePrefersReducedMotion } from '../../hooks'
import { Cells, Weights } from './Cells'
import { forward, K, LAB_COUNT, LAB_EXAMPLES, LAB_SEED, LAB_STEPS, rightCount, runFrom, SIZE, type Net } from './model'

const WIDTH = 560
const HEIGHT = 410
const FILTER = { x: 16, y: 64, cell: 54 }
const THUMB = { x: 210, y: 34, cell: 7, dx: 120, dy: 94, cols: 3 }
const SIDE = SIZE * THUMB.cell
// Real milliseconds per training step
const PACE = 16

const caps = 'font-mono text-[11px] uppercase tracking-widest'
const mono = 'font-mono text-[11px] tabular-nums'

// One 3 × 3 filter, a ReLU, the largest value in its map, and logistic
// regression on that, trained by gradient descent on twelve small 7s and 1s.
// Press Train to watch the nine weights move from a random start.
export default function Lab() {
  const reducedMotion = usePrefersReducedMotion()
  const [seed, setSeed] = useState(LAB_SEED)
  const [shown, setShown] = useState(0)
  const [running, setRunning] = useState(false)
  const started = useRef<{ time: number; from: number } | null>(null)
  const run = runFrom(seed)

  useAnimationFrame((time) => {
    if (!running) return
    started.current ??= { time, from: shown }
    const next = Math.min(LAB_STEPS, started.current.from + Math.floor((time - started.current.time) / PACE))
    if (next !== shown) setShown(next)
    if (next >= LAB_STEPS) {
      setRunning(false)
      started.current = null
    }
  })

  const train = () => {
    if (reducedMotion) {
      setShown(LAB_STEPS)
      return
    }
    started.current = null
    if (shown >= LAB_STEPS) setShown(0)
    setRunning(true)
  }
  const restart = () => {
    setRunning(false)
    started.current = null
    setShown(0)
    setSeed((s) => s + 1)
  }

  // Guard against a step from before the start changed
  const net = run[Math.min(shown, run.length - 1)]
  const right = rightCount(net, LAB_EXAMPLES)

  return (
    <div>
      <LabDrawing net={net} shown={shown} />
      <Controls>
        <Readout label="Steps" value={shown} />
        <Readout label="Right" value={`${right} of ${LAB_COUNT}`} accent={right === LAB_COUNT} />
        <div className="flex gap-3">
          <Button onClick={train} disabled={running}>
            {shown >= LAB_STEPS ? 'Again' : 'Train'}
          </Button>
          <Button onClick={restart}>New start</Button>
        </div>
      </Controls>
    </div>
  )
}

// The filter and the twelve digits, for one moment of training
export function LabDrawing({ net, shown }: { net: Net; shown: number }) {
  const right = rightCount(net, LAB_EXAMPLES)
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      role="img"
      aria-label={`The filter's nine weights after ${shown} steps: ${net.filter
        .flat()
        .map((w) => w.toFixed(1))
        .join(', ')}. ${right} of ${LAB_COUNT} digits called right.`}
    >
      <text x={FILTER.x} y={FILTER.y - 14} className={`fill-zinc-faded ${caps}`}>
        The filter
      </text>
      <Weights filter={net.filter} x={FILTER.x} y={FILTER.y} cell={FILTER.cell} numbers />
      <text x={FILTER.x} y={FILTER.y + K * FILTER.cell + 22} className={`fill-ink ${mono}`}>
        9 weights, used
      </text>
      <text x={FILTER.x} y={FILTER.y + K * FILTER.cell + 42} className={`fill-ink ${mono}`}>
        at all 36 spots
      </text>

      {LAB_EXAMPLES.map(({ image, seven }, n) => {
        const x = THUMB.x + (n % THUMB.cols) * THUMB.dx
        const y = THUMB.y + Math.floor(n / THUMB.cols) * THUMB.dy
        const { at, p } = forward(net, image)
        const ok = p > 0.5 === seven
        return (
          <g key={n}>
            <Cells grid={image} x={x} y={y} cell={THUMB.cell} />
            {/* Where the filter fired most */}
            <rect
              x={x + at[1] * THUMB.cell}
              y={y + at[0] * THUMB.cell}
              width={K * THUMB.cell}
              height={K * THUMB.cell}
              className="fill-none stroke-sage"
              strokeWidth={2}
            />
            <text x={x + SIDE + 6} y={y + 12} className="fill-ink font-serif text-[16px]">
              {seven ? '7' : '1'}
            </text>
            {/* How sure it is of a 7 */}
            <rect x={x} y={y + SIDE + 6} width={SIDE} height={6} rx={3} className="fill-zinc-300 dark:fill-zinc-200/25" />
            <rect x={x} y={y + SIDE + 6} width={SIDE * p} height={6} rx={3} className={ok ? 'fill-sage' : 'fill-ink'} />
            <text x={x} y={y + SIDE + 26} className={`fill-ink ${mono}`}>
              {`${Math.round(100 * p)}% a 7${ok ? '' : ' ✗'}`}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
