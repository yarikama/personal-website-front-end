import Board from '../../components/explain/Board'
import MovesTable from '../../components/explain/MovesTable'
import { average, branches, signed, WORLD, worth } from './model'

// The board with every square's worth under the fair spinner, and one
// square picked: its four moves, what each pays plus γ times the worth of
// where it lands, and their average, which is the square's own worth.
export default function Lean({ gamma, square, onPick }: { gamma: number; square: number; onPick: (state: number) => void }) {
  const values = worth(gamma)
  const moves = branches(square, values, gamma)
  const jump = moves[0].reward > 0 && moves.every((m) => m.next === moves[0].next)

  return (
    <div className="grid gap-5">
      <Board
        world={WORLD}
        label="The board with what every square is worth; pick one to see its four moves"
        values={values}
        shade
        focus={square}
        jumps={jump}
        onPick={onPick}
      />
      <MovesTable
        rows={moves}
        gamma={gamma}
        sum="Average of the four"
        value={average(square, values, gamma)}
        note={<>The same as the number in the square, {signed(values[square])}.</>}
      />
    </div>
  )
}
