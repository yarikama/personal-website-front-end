import Board from './Board'
import { usePlay } from './useLoop'
import { MOVES, STEP, type Gridworld, type Visit } from './mdp'

const PACE = 1000

const paid = (reward: number) => (reward > 0 ? `+${reward}` : reward < 0 ? `−${-reward}` : '0')

// A walk on a gridworld: the moves of `visits` from `from` to `to` (by
// index, `to` left out), one every `pace` ms, each saying what it paid.
// `says` names who picked the move. Plays when shown.
export default function Walk({
  world,
  visits,
  from,
  to,
  jumps = false,
  says = 'the spinner says',
  pace = PACE,
}: {
  world: Gridworld
  visits: Visit[]
  from: number
  to: number
  jumps?: boolean
  says?: string
  pace?: number
}) {
  const played = usePlay(to - from, pace)
  const now = from + played
  // The move under way, or the last one once it is over
  const index = Math.min(Math.floor(now), to - 1)
  const visit = visits[index]
  const k = now >= to ? 1 : Math.min(1, (now - index) / 0.5)
  const here = world.cell(visit.state)
  const there = world.cell(visit.next)
  // A move into the edge nudges towards it and back
  const nudge = visit.next === visit.state ? Math.sin(Math.PI * k) * 0.22 : 0
  const [dx, dy] = STEP[visit.action]
  const walker = { x: here.x + (there.x - here.x) * k + dx * nudge, y: here.y + (there.y - here.y) * k + dy * nudge }
  const trail = visits.slice(Math.max(0, index - 5), index).map((v) => world.cell(v.state))

  return (
    <div>
      <p className="font-mono text-[0.8rem] uppercase tracking-widest text-zinc-faded">
        Turn {index + 1} · <span className="text-sage">
          {says} {MOVES[visit.action]}
        </span>
      </p>
      <div className="mt-3">
        <Board
          world={world}
          label="A board; a counter moves one square a turn"
          jumps={jumps}
          walker={walker}
          said={k >= 1 ? paid(visit.reward) : null}
          trail={trail}
        />
      </div>
    </div>
  )
}
