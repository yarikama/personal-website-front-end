import { useRef, useState } from 'react'
import { useAnimationFrame } from 'motion/react'
import { lerp } from '../../components/explain/useLoop'
import { usePrefersReducedMotion } from '../../hooks'
import { FLIPS_FROM, FLIPS_TO, MAX_FLICK, outcomeOf, rewardOf, turnOf, type Outcome } from './model'

const WIDTH = 460
const HEIGHT = 336
// The pan, and where the pancake rests on it and lands off it
const PAN = { left: 165, right: 295, top: 160 }
const HANDLE = { x: 90, y: 170 }
const REST = { x: 230, y: 154 }
const FLOOR = { x: 392, y: 206 }
const FLOOR_LINE = 212
// The strip under the kitchen: every flick tried, by how hard it was
const AXIS = { left: 50, right: 410, y: 278 }
const at = (flick: number) => lerp(AXIS.left, AXIS.right, flick / MAX_FLICK)

const label = 'font-mono text-[10px] uppercase tracking-widest'

const said = (flick: number, outcome: Outcome) =>
  outcome === 'flipped' ? 'Flipped' : outcome === 'floor' ? 'On the floor' : flick < 5 ? 'Didn’t turn over' : 'Turned too far'

const score = (reward: number) => (reward > 0 ? '+1' : reward < 0 ? '−1' : '0')

const clamp = (x: number) => Math.min(1, Math.max(0, x))
const ease = (x: number) => x * x * (3 - 2 * x)

// Where the pancake is, `t` of the way through a flick of `flick`: the pan
// tips, the pancake flies and turns, then settles flat on the pan or the
// floor, a whole number of half turns round
function pancakeAt(flick: number, t: number) {
  const outcome = outcomeOf(flick)
  const floor = outcome === 'floor'
  const u = clamp((t - 0.1) / 0.7)
  const height = 20 + flick * 11
  const turn = turnOf(flick)
  const flat = outcome === 'flipped' ? 180 : floor ? Math.round(turn / 180) * 180 : turn < 180 ? 0 : 360
  return {
    x: floor ? lerp(REST.x, FLOOR.x, u) : REST.x,
    y: (floor ? lerp(REST.y, FLOOR.y, u) : REST.y) - 4 * height * u * (1 - u),
    angle: lerp(turn * ease(u), flat, ease(clamp((t - 0.78) / 0.14))),
  }
}

function Pancake({ x, y, angle }: { x: number; y: number; angle: number }) {
  // Pale side up to start, golden side down: turned over, the golden side shows
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}>
      <rect x={-32} y={-6} width={64} height={6} rx={3} className="fill-paper stroke-zinc-faded" strokeWidth={1} />
      <rect x={-32} y={0} width={64} height={6} rx={3} className="fill-sage" />
    </g>
  )
}

function Dot({ flick, stack }: { flick: number; stack: number }) {
  const outcome = outcomeOf(flick)
  const tone =
    outcome === 'flipped' ? 'fill-sage' : outcome === 'floor' ? 'fill-ink' : 'fill-paper stroke-zinc-faded'
  return <circle cx={at(flick)} cy={AXIS.y - 8 - stack * 10} r={5} className={tone} strokeWidth={1.5} />
}

// The kitchen: one pancake flicked with each strength in `tries`, one after
// another, `pace` ms each; the first `done` already tried. Under it, every
// flick so far, from soft to hard, marked by how it went. `band` shades the
// flicks that work; `labels` names the parts the way reinforcement learning
// does. With reduced motion it shows the end.
export function Kitchen({
  tries,
  done = 0,
  pace = 1600,
  band = false,
  labels = false,
}: {
  tries: number[]
  done?: number
  pace?: number
  band?: boolean
  labels?: boolean
}) {
  const reducedMotion = usePrefersReducedMotion()
  const started = useRef<number | null>(null)
  const total = (tries.length - done) * pace
  const [elapsed, setElapsed] = useState(reducedMotion ? Infinity : 0)

  useAnimationFrame((time) => {
    if (elapsed >= total) return
    started.current ??= time
    setElapsed(time - started.current)
  })

  const played = Math.min(elapsed, total)
  let index = done + Math.floor(played / pace)
  let t = (played % pace) / pace
  if (index >= tries.length) {
    index = tries.length - 1
    t = 1
  }
  const flick = tries[index]
  const landed = t >= 0.85
  const pancake = pancakeAt(flick, t)
  const tip = -8 * Math.sin(Math.PI * clamp(t / 0.16))
  const outcome = outcomeOf(flick)
  const reward = rewardOf(flick)

  // The tries so far, the one in the air once it lands; a dot sits on any
  // close one already there
  const tried = tries.slice(0, landed ? index + 1 : index)
  const stacks = tried.map((f, i) => tried.slice(0, i).filter((g) => Math.abs(g - f) < 0.35).length)

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Flipping a pancake, flick after flick">
      {/* How the flick went: all the cook is told */}
      <text x={WIDTH - 12} y={24} textAnchor="end" className={`${label} fill-zinc-faded`}>
        Try {index + 1}
      </text>
      {landed && (
        <text
          x={WIDTH - 12}
          y={44}
          textAnchor="end"
          className={`font-mono text-[13px] uppercase tracking-widest ${reward > 0 ? 'fill-sage' : 'fill-ink'}`}
        >
          {labels ? `Reward ${score(reward)}` : `${said(flick, outcome)} · ${score(reward)}`}
        </text>
      )}

      <line x1={20} x2={WIDTH - 20} y1={FLOOR_LINE} y2={FLOOR_LINE} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
      <text x={WIDTH - 20} y={FLOOR_LINE + 14} textAnchor="end" className={`${label} fill-zinc-400`}>
        Floor
      </text>

      {/* The pan, tipping up from the hand to flick */}
      <g transform={`rotate(${tip} ${HANDLE.x} ${HANDLE.y})`}>
        <line x1={HANDLE.x} y1={HANDLE.y} x2={PAN.left + 2} y2={PAN.top + 4} className="stroke-ink" strokeWidth={6} strokeLinecap="round" />
        <path
          d={`M ${PAN.left} ${PAN.top} L ${PAN.right} ${PAN.top} L ${PAN.right - 8} ${PAN.top + 12} L ${PAN.left + 8} ${PAN.top + 12} Z`}
          className="fill-zinc-400/30 stroke-ink"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      </g>
      <circle cx={HANDLE.x - 8} cy={HANDLE.y + 1} r={10} className="fill-zinc-400" />

      <Pancake {...pancake} />

      {/* Every flick so far */}
      {band && (
        <g>
          <rect x={at(FLIPS_FROM)} y={AXIS.y - 40} width={at(FLIPS_TO) - at(FLIPS_FROM)} height={40} className="fill-sage/15" />
          <text x={(at(FLIPS_FROM) + at(FLIPS_TO)) / 2} y={AXIS.y - 46} textAnchor="middle" className={`${label} fill-sage`}>
            What works
          </text>
        </g>
      )}
      <line x1={AXIS.left} x2={AXIS.right} y1={AXIS.y} y2={AXIS.y} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
      <text x={AXIS.left} y={AXIS.y + 16} className={`${label} fill-zinc-faded`}>
        Soft
      </text>
      <text x={(AXIS.left + AXIS.right) / 2} y={AXIS.y + 16} textAnchor="middle" className={`${label} fill-zinc-faded`}>
        {labels ? 'Actions tried, and their rewards' : 'How hard you flicked'}
      </text>
      <text x={AXIS.right} y={AXIS.y + 16} textAnchor="end" className={`${label} fill-zinc-faded`}>
        Hard
      </text>
      {tried.map((f, i) => (
        <Dot key={i} flick={f} stack={stacks[i]} />
      ))}

      {/* The key: what each mark scored */}
      <g transform={`translate(${WIDTH / 2 - 160} ${HEIGHT - 8})`} className={`${label} fill-zinc-faded`}>
        <circle cx={0} cy={-3} r={4} className="fill-sage" />
        <text x={8} y={0}>Flipped +1</text>
        <circle cx={110} cy={-3} r={4} className="fill-paper stroke-zinc-faded" strokeWidth={1.5} />
        <text x={118} y={0}>Not turned 0</text>
        <circle cx={236} cy={-3} r={4} className="fill-ink" />
        <text x={244} y={0}>Floor −1</text>
      </g>

      {/* The same kitchen, in reinforcement learning's words */}
      {labels && landed && (
        <g className={`${label} fill-sage`}>
          <text x={HANDLE.x - 8} y={HANDLE.y - 22} textAnchor="middle">
            Agent: you
          </text>
          <text x={20} y={HANDLE.y + 30}>
            Action: the flick
          </text>
          <text x={REST.x} y={REST.y - 22} textAnchor="middle">
            State: what you see
          </text>
          <text x={REST.x + 40} y={PAN.top + 30} textAnchor="middle">
            Environment: pan &amp; pancake
          </text>
        </g>
      )}
    </svg>
  )
}
