import Board from '../../components/explain/Board'
import MovesTable from '../../components/explain/MovesTable'
import { best, bestMoves, options, signed, WORLD } from './model'

// The board with every square's best worth, v*, and the best moves as
// arrows. One square picked: its four moves, each worth its reward plus γ
// times the best worth of where it lands; the best of them is the square's
// own worth, and the way to go.
export default function Best({ gamma, square, onPick }: { gamma: number; square: number; onPick: (state: number) => void }) {
  const values = best(gamma)
  const moves = options(square, gamma)
  const jump = moves[0].reward > 0 && moves.every((m) => m.there === moves[0].there && !m.stay)

  return (
    <div className="grid gap-5">
      <Board
        world={WORLD}
        label="The board with every square's best worth and the best moves as arrows; pick a square to see its four moves"
        values={values}
        shade
        arrows={bestMoves(gamma)}
        focus={square}
        jumps={jump}
        onPick={onPick}
      />
      <MovesTable
        rows={moves}
        gamma={gamma}
        sum="Best of the four"
        value={Math.max(...moves.map((m) => m.total))}
        note={<>The square’s own worth, {signed(values[square])}. The arrows are the moves that reach it.</>}
      />
    </div>
  )
}
