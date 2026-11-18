import { Choice, Controls, Readout } from '../../components/explain/figure'
import { LAB_P, pct, resultOf, TRAIN, TRAIN_N, type LabP } from './model'
import Regions from './Regions'

// The lab: the same network trained on the same forty points, with dropout
// off, light, or at a half. The setting lives in the page.
export default function Lab({ p, onChange }: { p: LabP; onChange: (p: LabP) => void }) {
  const result = resultOf(p)
  return (
    <div>
      <div className="grid items-center gap-6 sm:grid-cols-[minmax(0,20rem)_1fr]">
        <div className="mx-auto w-full max-w-[20rem]">
          <Regions
            grid={result.grid}
            points={TRAIN}
            label={`The network's answer over the square, trained with dropout p = ${p}: right on ${result.trainRight} of ${TRAIN_N} training points and ${pct(result.newRight)} of new points`}
          />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-1">
          <Readout label="Training points right" value={`${result.trainRight} of ${TRAIN_N}`} />
          <Readout label="New points right" value={pct(result.newRight)} accent />
        </div>
      </div>
      <Controls>
        <Choice label="Dropout p" options={LAB_P} value={p} onChange={onChange} />
      </Controls>
    </div>
  )
}
