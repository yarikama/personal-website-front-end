import { endOf, forkPoint, HEIGHT, OFFICE, stallPoint, WIDTH, type Point } from './geometry'
import { chancesAt, FORKS, STALLS, type Habits } from './model'

// The hill drawn: the office at the top, the four rows of forks, the five
// stalls at the bottom. Each lane is as thick as the habit for taking it,
// so the drawing is the policy. It only draws; the page's story works out
// where the walker is and passes it in. The actor–critic page draws on it
// too, with the critic's guess written in each fork.

export interface Mark {
  fork: number
  turn: number
  text: string
  good: boolean
}

interface HillProps {
  habits: Habits
  label: string
  // Lanes walked so far on this walk, as [fork, turn]
  taken?: [number, number][]
  // The walker, if out
  walker?: Point | null
  // The stall reached, and its rating
  arrived?: { stall: number; score: number } | null
  // A word by a lane: a push (▲ ▼) or the critic's verdict
  marks?: Mark[]
  // The critic's guess at each fork, written in it
  values?: number[] | null
  // Forks to ring: the critic's guess just changed there
  ringed?: number[]
  // How often each stall was where a walk ended, as shares
  shares?: number[] | null
  // Name the parts: state, action, return
  named?: boolean
}

export default function Hill({
  habits,
  label,
  taken = [],
  walker = null,
  arrived = null,
  marks = [],
  values = null,
  ringed = [],
  shares = null,
  named = false,
}: HillProps) {
  const isTaken = (fork: number, turn: number) => taken.some(([f, t]) => f === fork && t === turn)
  const radius = values ? 17 : 7
  const top = forkPoint(0)

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={label}>
      {/* The office, and the path down to the first fork */}
      <path
        d={`M${OFFICE.x - 15},${OFFICE.y + 12} V${OFFICE.y - 8} L${OFFICE.x},${OFFICE.y - 20} L${OFFICE.x + 15},${OFFICE.y - 8} V${OFFICE.y + 12} Z`}
        className="fill-paper stroke-zinc-400"
        strokeWidth={1.5}
      />
      <text x={OFFICE.x - 26} y={OFFICE.y + 6} textAnchor="end" className="fill-zinc-faded font-mono text-[12px] uppercase tracking-widest">
        Office
      </text>
      <line
        x1={OFFICE.x}
        y1={OFFICE.y + 12}
        x2={top.x}
        y2={top.y - radius}
        className={taken.length || walker ? 'stroke-sage' : 'stroke-zinc-300 dark:stroke-zinc-600'}
        strokeWidth={3}
      />

      {/* The lanes, as thick as the habit for each */}
      {Array.from({ length: FORKS }, (_, fork) => {
        const from = forkPoint(fork)
        const pi = chancesAt(habits, fork)
        return [0, 1].map((turn) => {
          const to = endOf(fork, turn)
          const on = isTaken(fork, turn)
          return (
            <line
              key={`${fork}-${turn}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              className={on ? 'stroke-sage' : 'stroke-zinc-300 dark:stroke-zinc-600'}
              strokeWidth={1 + 10 * pi[turn]}
              strokeLinecap="round"
            />
          )
        })
      })}

      {/* The stalls */}
      {STALLS.map((name, stall) => {
        const p = stallPoint(stall)
        const here = arrived?.stall === stall
        return (
          <g key={name}>
            <rect
              x={p.x - 20}
              y={p.y - 2}
              width={40}
              height={28}
              className={here ? 'fill-sage stroke-sage' : 'fill-paper stroke-zinc-400'}
              strokeWidth={1.5}
            />
            {here && (
              <text x={p.x} y={p.y + 19} textAnchor="middle" className="fill-paper font-serif text-[20px]">
                {arrived.score}
              </text>
            )}
            <text
              x={p.x}
              y={p.y + 46}
              textAnchor="middle"
              className={`font-mono text-[12px] uppercase ${here ? 'fill-sage' : 'fill-zinc-faded'}`}
            >
              {name}
            </text>
            {shares && (
              <>
                <rect x={p.x - 24} y={p.y + 52} width={48} height={5} className="fill-zinc-200 dark:fill-zinc-200/10" />
                <rect x={p.x - 24} y={p.y + 52} width={48 * shares[stall]} height={5} className="fill-sage" />
              </>
            )}
          </g>
        )
      })}

      {/* The forks, with the critic's guess in each if there is one */}
      {Array.from({ length: FORKS }, (_, fork) => {
        const p = forkPoint(fork)
        return (
          <g key={fork}>
            <circle
              cx={p.x}
              cy={p.y}
              r={radius}
              className={ringed.includes(fork) ? 'fill-paper stroke-sage' : values ? 'fill-paper stroke-zinc-400' : 'fill-zinc-400'}
              strokeWidth={ringed.includes(fork) ? 2.5 : 1.5}
            />
            {values && (
              <text x={p.x} y={p.y + 5} textAnchor="middle" className="fill-ink font-serif text-[15px] tabular-nums">
                {values[fork].toFixed(1)}
              </text>
            )}
          </g>
        )
      })}

      {/* Pushes and verdicts, beside the lane they are about */}
      {marks.map(({ fork, turn, text, good }) => {
        const from = forkPoint(fork)
        const to = endOf(fork, turn)
        const side = turn === 1 ? 1 : -1
        return (
          <text
            key={`${fork}-${turn}`}
            x={(from.x + to.x) / 2 + side * 16}
            y={(from.y + to.y) / 2 + 4}
            textAnchor={side > 0 ? 'start' : 'end'}
            className={`font-mono text-[14px] ${good ? 'fill-sage' : 'fill-ink'}`}
          >
            {text}
          </text>
        )
      })}

      {named && (
        <g className="font-mono text-[12px]">
          <text x={top.x + radius + 8} y={top.y - 14} className="fill-sage">
            a fork: state s
          </text>
          <text x={top.x - 62} y={top.y + 34} textAnchor="end" className="fill-sage">
            a turn: action a
          </text>
          <text x={top.x + 58} y={top.y + 34} className="fill-sage">
            width: π(a|s)
          </text>
        </g>
      )}

      {walker && <circle cx={walker.x} cy={walker.y} r={8} className="fill-ink" />}
    </svg>
  )
}
