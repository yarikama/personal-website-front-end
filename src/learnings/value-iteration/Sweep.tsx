import { Readout } from '../../components/explain/figure'
import Track from '../policy-evaluation/Track'
import { EVERY_MOVE, PASSES, PLANS, switchedAt, wrongAt } from './model'

// Value iteration stopped at one sweep: every square's value, the better
// move by those values (ringed where this sweep changed it), and what the
// sweeps have cost so far
export default function Sweep({ sweep }: { sweep: number }) {
  const scale = Math.max(...PASSES.at(-1)!.values.map(Math.abs))
  const delta = PASSES[sweep].delta
  return (
    <div>
      <Track
        label={`Every square's value and better move after sweep ${sweep}`}
        values={PASSES[sweep].values}
        shade
        scale={scale}
        plan={PLANS[sweep]}
        rung={switchedAt(sweep)}
      />
      <div className="mt-4 flex flex-wrap gap-x-10 gap-y-3">
        <Readout label="Biggest change" value={sweep === 0 ? '–' : delta.toFixed(delta < 0.01 ? 4 : 3)} />
        <Readout label="Moves still to change" value={wrongAt(sweep)} accent />
        <Readout label="Landings looked at" value={(sweep * EVERY_MOVE).toLocaleString('en')} />
      </div>
    </div>
  )
}
