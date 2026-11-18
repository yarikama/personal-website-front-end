import { useState } from 'react'
import { Choice, Controls, Readout, Slider } from '../../components/explain/figure'
import Board from './Board'
import { chancesOf, lossAt, pct, RUNS, similarities, STEPS, STORY_TAU, TEMPERATURES, two, type Temperature } from './model'

// The four postcards trained at the temperature you pick: drag through the
// run and watch the arrows turn, the grid change and the loss fall.
export default function Lab() {
  const [tau, setTau] = useState<Temperature>(STORY_TAU)
  const [step, setStep] = useState(STEPS)
  const arrows = RUNS[tau][step]
  const { rows } = chancesOf(similarities(arrows), tau)
  const worst = Math.min(...rows.map((p, k) => p[k]))

  return (
    <div>
      <Board arrows={arrows} tau={tau} named />
      <Controls>
        <Choice label="Temperature τ" options={TEMPERATURES} value={tau} onChange={setTau} />
        <Slider label="Training step" value={step} min={0} max={STEPS} onChange={setStep} />
      </Controls>
      <div className="mt-5 flex flex-wrap gap-x-10 gap-y-4">
        <Readout label="Loss" value={two(lossAt(arrows, tau))} accent />
        <Readout label="Weakest own caption" value={pct(worst)} />
      </div>
    </div>
  )
}
