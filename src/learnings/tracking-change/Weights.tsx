import { useRef, useState } from 'react'
import { useAnimationFrame } from 'motion/react'
import { Readout } from '../../components/explain/figure'
import { usePrefersReducedMotion } from '../../hooks'
import { percent, VISITS, weights, type Step } from './model'

const WIDTH = 640
const LEFT = 40
const RIGHT = 616
const TOP = 24
const BOTTOM = 196
// The share of the score the bars' scale runs to
const MOST = 0.25
// The strip under the bars: the whole score, split by who makes it up
const STRIP_Y = 236
const STRIP_H = 22
// How long each visit takes to come in
const PACE = 280

const slot = (RIGHT - LEFT) / VISITS
const y = (weight: number) => BOTTOM - (Math.min(weight, MOST) / MOST) * (BOTTOM - TOP)

// What a weight is at a time between visits: the next visit grows in, every
// older one slides back a place and shrinks to its new weight
function at(step: Step, time: number) {
  const before = Math.floor(time)
  const after = Math.min(VISITS, before + 1)
  const blend = time - before
  const was = weights(step, before)
  const now = weights(step, after)
  // Oldest first; the newest, still coming in, has no weight before
  const rewards = now.rewards.map((weight, i) => (i < before ? was.rewards[i] : 0) * (1 - blend) + weight * blend)
  return { rewards, start: was.start * (1 - blend) + now.start * blend, count: after, blend }
}

// Twenty visits coming in one by one, and what each weighs in the score
// after them: a bar for each, the newest on the right, and under them the
// whole score split by who makes it up, the starting guess first. With a
// constant step every bar shrinks as it slides back; with 1/n they are all
// the same. It plays when shown, and again when the step changes.
export default function Weights({ step }: { step: Step }) {
  const reducedMotion = usePrefersReducedMotion()
  const started = useRef<number | null>(null)
  const [time, setTime] = useState(reducedMotion ? VISITS : 0)

  useAnimationFrame((clock) => {
    if (time >= VISITS) return
    started.current ??= clock
    setTime(Math.min(VISITS, (clock - started.current) / PACE))
  })

  const { rewards, start, count, blend } = time >= VISITS ? { ...weights(step, VISITS), count: VISITS, blend: 1 } : at(step, time)
  // Where reward i (oldest first) stands: the newest at the right, sliding in
  const x = (i: number) => RIGHT - (count - 1 - i + blend) * slot + 2
  const finalWeights = weights(step, VISITS)
  const lastFive = finalWeights.rewards.slice(-5).reduce((sum, w) => sum + w, 0)

  // The strip: the start, then each reward, oldest first
  let along = LEFT
  const pieces = [start, ...rewards].map((weight, i) => {
    const piece = { x: along, width: weight * (RIGHT - LEFT), start: i === 0, newest: i === rewards.length }
    along += piece.width
    return piece
  })

  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} 290`} className="w-full" role="img" aria-label="What each of twenty visits weighs in the score">
        {[0.05, 0.1, 0.15, 0.2, 0.25].map((weight) => (
          <g key={weight}>
            <line x1={LEFT} x2={RIGHT} y1={y(weight)} y2={y(weight)} className="stroke-zinc-200 dark:stroke-zinc-200/10" />
            <text x={LEFT - 8} y={y(weight) + 4} textAnchor="end" className="fill-zinc-400 font-mono text-[11px]">
              {percent(weight)}
            </text>
          </g>
        ))}
        <line x1={LEFT} x2={RIGHT} y1={BOTTOM} y2={BOTTOM} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
        <text x={LEFT} y={TOP - 10} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
          Each visit’s share of the score
        </text>

        {rewards.map((weight, i) => (
          <rect
            key={i}
            x={x(i)}
            y={y(weight)}
            width={slot - 4}
            height={BOTTOM - y(weight)}
            className={i === count - 1 ? 'fill-sage' : 'fill-sage/60'}
          />
        ))}
        <text x={RIGHT} y={BOTTOM + 16} textAnchor="end" className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
          Newest
        </text>
        <text x={LEFT} y={BOTTOM + 16} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
          {VISITS} visits back
        </text>

        {/* The whole score, split: the start, then every visit */}
        {pieces.map((piece, i) => (
          <rect
            key={i}
            x={piece.x}
            y={STRIP_Y}
            width={Math.max(0, piece.width - (piece.width > 2 ? 1 : 0))}
            height={STRIP_H}
            className={piece.start ? 'fill-zinc-400 dark:fill-zinc-500' : piece.newest ? 'fill-sage' : 'fill-sage/60'}
          />
        ))}
        <text x={LEFT} y={STRIP_Y + STRIP_H + 18} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
          The whole score{start > 0.005 ? <tspan className="fill-zinc-400"> · grey: the starting guess</tspan> : null}
        </text>
        <text x={RIGHT} y={STRIP_Y + STRIP_H + 18} textAnchor="end" className="fill-ink font-mono text-[11px] tracking-widest">
          100%
        </text>
      </svg>

      <div className="mt-4 flex flex-wrap gap-x-10 gap-y-4">
        <Readout label="The newest visit" value={percent(finalWeights.rewards.at(-1)!)} accent />
        <Readout label="The last five" value={percent(lastFive)} />
        <Readout label="The starting guess" value={percent(finalWeights.start)} />
      </div>
    </div>
  )
}
