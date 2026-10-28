import Board from './Board'
import { usePlay } from './useLoop'
import type { Gridworld } from './mdp'

// Values settling: every square starts at 0, and each pass makes each one
// the average (or the best) of its moves, given the last pass's numbers.
// Plays through `passes` once, `pace` ms a pass, when shown.
export default function Settle({
  world,
  passes,
  pace = 90,
  arrows = null,
  label,
}: {
  world: Gridworld
  passes: number[][]
  pace?: number
  arrows?: number[][] | null
  label: string
}) {
  const last = passes.length - 1
  const played = usePlay(last, pace)
  const pass = Math.min(last, Math.floor(played))
  const scale = Math.max(...passes[last].map(Math.abs))
  return (
    <div>
      <p className="flex justify-between font-mono text-[0.8rem] uppercase tracking-widest text-zinc-faded">
        <span>
          Pass <span className="text-ink tabular-nums">{pass}</span>
        </span>
        <span className={pass === last ? 'text-sage' : undefined}>{pass === last ? 'settled' : 'settling…'}</span>
      </p>
      <div className="mt-3">
        <Board
          world={world}
          label={label}
          values={passes[pass]}
          shade
          scale={scale}
          arrows={pass === last ? arrows : null}
        />
      </div>
    </div>
  )
}
