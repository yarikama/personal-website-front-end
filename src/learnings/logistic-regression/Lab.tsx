import { useState } from 'react'
import { useAnimationFrame } from 'motion/react'
import { usePrefersReducedMotion } from '../../hooks'
import { Button, Choice, Controls, Readout, Slider } from '../../components/explain/figure'
import Chart from './Chart'
import {
  descend,
  drawPatients,
  FIT_STEPS,
  HALFWAY_RANGE,
  halfwayOf,
  LAB_SEED,
  LAB_SIZE,
  LAB_START,
  safeStep,
  STEEPNESS,
  STEPS_PER_FRAME,
  totalLoss,
  TRUE,
  two,
  weightsAt,
  wrongAt,
  type Patient,
  type Weights,
} from './model'

const OVERLAPS = ['Some', 'None'] as const
type Overlap = (typeof OVERLAPS)[number]

interface Data {
  seed: number
  overlap: Overlap
  patients: Patient[]
  eta: number
}

const dataOf = (seed: number, overlap: Overlap): Data => {
  const patients = drawPatients(seed, LAB_SIZE, TRUE, overlap === 'None')
  return { seed, overlap, patients, eta: safeStep(patients) }
}

// Forty patients drawn from a true curve. Set the curve by hand, or let
// gradient descent fit it from wherever it is.
export default function Lab() {
  const reducedMotion = usePrefersReducedMotion()
  const [data, setData] = useState<Data>(() => dataOf(LAB_SEED, 'Some'))
  const [weights, setWeights] = useState<Weights>(LAB_START)
  // Steps of gradient descent still to take, 0 when it isn't running
  const [left, setLeft] = useState(0)

  useAnimationFrame(() => {
    if (left <= 0) return
    const n = reducedMotion ? left : Math.min(STEPS_PER_FRAME, left)
    setWeights((at) => descend(at, data.patients, n, data.eta).at(-1)!)
    setLeft(left - n)
  })

  const { patients } = data
  const halfway = halfwayOf(weights)
  const loss = totalLoss(weights, patients) / patients.length

  const changeData = (seed: number, overlap: Overlap) => {
    setLeft(0)
    setData(dataOf(seed, overlap))
  }
  const setByHand = (next: Weights) => {
    setLeft(0)
    setWeights(next)
  }

  return (
    <div>
      <Chart
        patients={patients}
        weights={weights}
        surprises
        halfway
        dot={4}
        label={`${patients.length} patients and a curve of chances crossing 50% at ${halfway.toFixed(1)} degrees, with an average surprise of ${two(loss)}.`}
      />
      <div className="mt-4 grid grid-cols-3 gap-4">
        <Readout label="Average surprise" value={two(loss)} accent />
        <Readout label="Wrong at 50%" value={wrongAt(weights, patients)} />
        <Readout label="Steepness w" value={weights.w.toFixed(1)} />
      </div>
      <Controls>
        <Slider
          label="Steepness, per °C"
          value={Math.min(STEEPNESS[1], Math.max(STEEPNESS[0], Math.log10(weights.w)))}
          min={STEEPNESS[0]}
          max={STEEPNESS[1]}
          step={0.01}
          onChange={(v) => setByHand(weightsAt(10 ** v, halfway))}
          format={() => weights.w.toFixed(1)}
        />
        <Slider
          label="50% at"
          value={Math.min(HALFWAY_RANGE[1], Math.max(HALFWAY_RANGE[0], halfway))}
          min={HALFWAY_RANGE[0]}
          max={HALFWAY_RANGE[1]}
          step={0.05}
          onChange={(c) => setByHand(weightsAt(weights.w, c))}
          format={() => `${halfway.toFixed(2)}°`}
        />
      </Controls>
      <Controls>
        <Button onClick={() => setLeft(FIT_STEPS)} disabled={left > 0}>
          Fit by gradient descent
        </Button>
        <Button onClick={() => changeData(data.seed + 1, data.overlap)}>New patients</Button>
        <Choice label="Overlap" options={OVERLAPS} value={data.overlap} onChange={(o) => changeData(data.seed, o)} />
      </Controls>
    </div>
  )
}
