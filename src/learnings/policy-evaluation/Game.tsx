import { usePlay } from '../../components/explain/useLoop'
import { ROLL, type Turn } from './board'
import { centre } from './layout'
import Labelled from './Labelled'
import Track from './Track'

// A game on the board: the turns of `turns` from `from` to `to` (by index,
// `to` left out), one every `pace` ms. The counter hops to where the die
// or the step sends it, then rides any ladder or snake. Plays when shown.
export default function Game({
  turns,
  from,
  to,
  pace = 900,
}: {
  turns: Turn[]
  from: number
  to: number
  pace?: number
}) {
  const played = usePlay(to - from, pace)
  const now = from + played
  const index = Math.min(Math.floor(now), to - 1)
  const turn = turns[index]
  const k = now >= to ? 1 : now - index
  const a = centre(turn.from)
  const b = centre(turn.reached)
  const c = centre(turn.to)
  const hop = Math.min(1, k / 0.5)
  const ride = Math.max(0, Math.min(1, (k - 0.6) / 0.4))
  const counter =
    ride === 0
      ? { x: a.x + (b.x - a.x) * hop, y: a.y + (b.y - a.y) * hop - Math.sin(Math.PI * hop) * 14 }
      : { x: b.x + (c.x - b.x) * ride, y: b.y + (c.y - b.y) * ride }
  const finished = index === turns.length - 1 && k >= 1
  const move = turn.move === ROLL ? `rolled ${turn.face}` : 'stepped'

  return (
    <Labelled
      left={
        <>
          Turn <span className="text-ink tabular-nums">{index + 1}</span> · <span className="text-sage">{move}</span>
        </>
      }
      right={finished && <span className="text-sage">finished</span>}
    >
      <Track
        label="The snakes-and-ladders board, with a counter moving square by square"
        counter={counter}
        said={k >= 0.5 && turn.face !== null ? String(turn.face) : null}
      />
    </Labelled>
  )
}
