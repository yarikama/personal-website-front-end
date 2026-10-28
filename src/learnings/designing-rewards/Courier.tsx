import Board from '../../components/explain/Board'
import { Readout } from '../../components/explain/figure'
import { usePlay } from '../../components/explain/useLoop'
import { CHECKPOINT, courier, delivered, GOAL, MOVES_SHOWN, points, START, trip, type Scheme } from './model'

const PACE = 320

// The courier on its grid under a reward scheme: the best moves as arrows,
// what each square is worth, and the robot running the best policy from the
// start for MOVES_SHOWN moves. Plays when shown; give it a key per scheme.
export default function Courier({ scheme, values = true }: { scheme: Scheme; values?: boolean }) {
  const { world, values: worth, arrows } = courier(scheme)
  const visits = trip(scheme)
  const played = usePlay(visits.length, PACE)
  const index = Math.min(Math.floor(played), visits.length - 1)
  const visit = visits[index]
  const k = played >= visits.length ? 1 : Math.min(1, (played - index) / 0.6)
  const here = world.cell(visit.state)
  const there = world.cell(visit.next)
  const done = visits.slice(0, played >= visits.length ? visits.length : index + (k >= 1 ? 1 : 0))
  const bonus = scheme !== 'Delivery only'

  return (
    <div>
      <Board
        world={world}
        label="A courier robot on a grid, with the best move from each square and the robot following them"
        values={values ? worth : null}
        shade={values}
        arrows={arrows}
        marks={[
          { at: START, text: 'S' },
          { at: GOAL, text: 'G', accent: true },
          ...(bonus ? [{ at: CHECKPOINT, text: 'C +1', accent: true }] : []),
        ]}
        walker={{ x: here.x + (there.x - here.x) * k, y: here.y + (there.y - here.y) * k }}
        said={k >= 1 && visit.reward > 0 ? `+${visit.reward}` : null}
      />
      <div className="mt-4 flex flex-wrap gap-x-10 gap-y-4">
        <Readout label="Delivered" value={delivered(done) ? 'Yes' : played >= visits.length ? 'Never' : '…'} accent />
        <Readout label={`Points in ${MOVES_SHOWN} moves`} value={points(done)} />
      </div>
    </div>
  )
}
