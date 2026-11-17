import { useId, useState } from 'react'
import { useAnimationFrame } from 'motion/react'
import { usePrefersReducedMotion } from '../../hooks'
import { Button, Choice, Controls, Readout } from '../../components/explain/figure'
import { lerp } from '../../components/explain/useLoop'
import {
  boundary,
  forward,
  LAB_END,
  LAB_ROUNDS,
  netRight,
  randomNet,
  REVIEWS,
  ROUNDS_PER_FRAME,
  sigmoid,
  STORY_SEED,
  totalLoss,
  train,
  two,
  WORDS,
  type Net,
} from './model'

const WIDTH = 560
const HEIGHT = 400
const LEFT = 34
const RIGHT = 548
const TOP = 30
const BOTTOM = 372
const RANGE: [number, number] = [-14, 14]
// Finer shading at rest than while training, to keep each frame cheap
const FINE = [56, 40]
const COARSE = [28, 20]

const sx = (a: number) => LEFT + ((a - RANGE[0]) / (RANGE[1] - RANGE[0])) * (RIGHT - LEFT)
const sy = (a: number) => BOTTOM - ((a - RANGE[0]) / (RANGE[1] - RANGE[0])) * (BOTTOM - TOP)

const mono = 'font-mono text-[11px] tabular-nums'
const caps = 'font-mono text-[10px] uppercase tracking-widest'

const TEXTS = REVIEWS.map((r) => r.text)

// Where a review lands in the plane, word by word: the helpers' starts, then
// each word's column of W added once per time it appears
function pathOf(net: Net, counts: number[]): { word: string; from: [number, number]; to: [number, number] }[] {
  const steps = []
  let at: [number, number] = [net.b[0], net.b[1]]
  for (let j = 0; j < WORDS.length; j++) {
    for (let n = 0; n < counts[j]; n++) {
      const to: [number, number] = [at[0] + net.W[0][j], at[1] + net.W[1][j]]
      steps.push({ word: WORDS[j], from: at, to })
      at = to
    }
  }
  return steps
}

// Where an arrow's word goes: two thirds along, off to its right-hand or
// upper side, clear of the line
function wordSpot(from: [number, number], to: [number, number]) {
  const x1 = sx(from[0])
  const y1 = sy(from[1])
  const x2 = sx(to[0])
  const y2 = sy(to[1])
  const length = Math.hypot(x2 - x1, y2 - y1) || 1
  let nx = -(y2 - y1) / length
  let ny = (x2 - x1) / length
  if (nx < 0 || (Math.abs(nx) < 0.3 && ny > 0)) {
    nx = -nx
    ny = -ny
  }
  const x = lerp(x1, x2, 0.66) + nx * 12
  const y = lerp(y1, y2, 0.66) + ny * 12 + 4
  return { x, y, textAnchor: nx > 0.3 ? ('start' as const) : ('middle' as const) }
}

// The helpers' plane: each review is a point, the sum of its words'
// vectors; shading is the chance you'd call a point happy, and the line is
// where it is 50%. Train the network and watch the words move.
export default function Plane() {
  const reducedMotion = usePrefersReducedMotion()
  const arrow = useId()
  const clip = useId()
  const [seed, setSeed] = useState(STORY_SEED)
  const [net, setNet] = useState<Net>(LAB_END)
  const [round, setRound] = useState(LAB_ROUNDS)
  // Rounds of training still to take, 0 when it isn't running
  const [left, setLeft] = useState(0)
  const [picked, setPicked] = useState(TEXTS[3])

  useAnimationFrame(() => {
    if (left <= 0) return
    const n = reducedMotion ? left : Math.min(ROUNDS_PER_FRAME, left)
    setNet((at) => train(at, n).at(-1)!)
    setRound((r) => r + n)
    setLeft(left - n)
  })

  // Back to a random start, and train from there
  const restart = (next: number) => {
    setSeed(next)
    setNet(randomNet(next))
    setRound(0)
    setLeft(LAB_ROUNDS)
  }

  const [COLS, ROWS] = left > 0 ? COARSE : FINE
  const cellW = (RANGE[1] - RANGE[0]) / COLS
  const cellH = (RANGE[1] - RANGE[0]) / ROWS
  const chanceAt = (a1: number, a2: number) => sigmoid(net.v[0] * sigmoid(a1) + net.v[1] * sigmoid(a2) + net.c)
  const segments = boundary(net, RANGE, 56)
  const review = REVIEWS[TEXTS.indexOf(picked)]
  const steps = pathOf(net, review.counts)
  const loss = totalLoss(net) / REVIEWS.length
  const right = netRight(net)

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`The helpers’ plane after ${round} rounds: ${right} of 4 reviews on the right side of the 50% line. “${review.text}” is drawn as the sum of its words’ arrows.`}
      >
        <defs>
          <marker id={arrow} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" className="fill-ink" />
          </marker>
          <clipPath id={clip}>
            <rect x={LEFT} y={TOP} width={RIGHT - LEFT} height={BOTTOM - TOP} />
          </clipPath>
        </defs>

        <g clipPath={`url(#${clip})`}>
          {/* The chance you'd call a point happy: the deeper the sage, the surer */}
          {Array.from({ length: COLS }, (_, i) =>
            Array.from({ length: ROWS }, (_, j) => {
              const a1 = RANGE[0] + (i + 0.5) * cellW
              const a2 = RANGE[0] + (j + 0.5) * cellH
              return (
                <rect
                  key={`${i}-${j}`}
                  x={sx(RANGE[0] + i * cellW)}
                  y={sy(RANGE[0] + (j + 1) * cellH)}
                  width={sx(cellW) - sx(0)}
                  height={sy(0) - sy(cellH)}
                  shapeRendering="crispEdges"
                  className="fill-sage"
                  fillOpacity={0.32 * chanceAt(a1, a2)}
                />
              )
            })
          )}
          <line x1={sx(0)} x2={sx(0)} y1={TOP} y2={BOTTOM} className="stroke-zinc-300 dark:stroke-zinc-200/20" strokeWidth={1} />
          <line x1={LEFT} x2={RIGHT} y1={sy(0)} y2={sy(0)} className="stroke-zinc-300 dark:stroke-zinc-200/20" strokeWidth={1} />
          {segments.map(([x1, y1, x2, y2], i) => (
            <line key={i} x1={sx(x1)} y1={sy(y1)} x2={sx(x2)} y2={sy(y2)} className="stroke-ink" strokeWidth={1.75} />
          ))}

          {/* The picked review, word by word from the start */}
          {steps.map((s, i) => (
            <g key={i}>
              <line
                x1={sx(s.from[0])}
                y1={sy(s.from[1])}
                x2={sx(s.to[0])}
                y2={sy(s.to[1])}
                className="stroke-ink"
                strokeWidth={2}
                markerEnd={`url(#${arrow})`}
              />
              <text {...wordSpot(s.from, s.to)} className={`fill-ink ${mono}`}>
                + {s.word}
              </text>
            </g>
          ))}
          <circle cx={sx(net.b[0])} cy={sy(net.b[1])} r={5} className="fill-paper stroke-ink" strokeWidth={1.5} strokeDasharray="2 2" />
          <text x={sx(net.b[0]) - 8} y={sy(net.b[1]) + 16} textAnchor="end" className={`fill-ink ${caps}`}>
            start
          </text>

          {/* Every review where it lands: filled if happy, hollow if not */}
          {REVIEWS.map((r) => {
            const { a } = forward(net, r.counts)
            return (
              <g key={r.text}>
                <circle
                  cx={sx(a[0])}
                  cy={sy(a[1])}
                  r={6}
                  className={r.happy ? 'fill-sage stroke-ink' : 'fill-paper stroke-ink'}
                  strokeWidth={1.5}
                />
                <text
                  x={sx(a[0]) + (a[0] < 0 ? -10 : 10)}
                  y={sy(a[1]) + 4}
                  textAnchor={a[0] < 0 ? 'end' : 'start'}
                  className={`fill-ink ${mono}`}
                >
                  {r.text}
                </text>
              </g>
            )
          })}
        </g>

        <text x={RIGHT} y={BOTTOM + 18} textAnchor="end" className={`fill-zinc-faded ${caps}`}>
          Helper 1’s tally →
        </text>
        <text x={LEFT} y={TOP - 10} className={`fill-zinc-faded ${caps}`}>
          ↑ Helper 2’s tally
        </text>
      </svg>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <Readout label="Round" value={round} />
        <Readout label="Average loss" value={two(loss)} accent />
        <Readout label="Right" value={`${right} of 4`} />
      </div>
      <Controls>
        <div className="max-w-full overflow-x-auto">
          <Choice label="Review" options={TEXTS} value={picked} onChange={setPicked} />
        </div>
      </Controls>
      <Controls>
        <Button onClick={() => restart(seed)}>Train from the start</Button>
        <Button onClick={() => restart(seed + 1)}>New start</Button>
      </Controls>
    </div>
  )
}
