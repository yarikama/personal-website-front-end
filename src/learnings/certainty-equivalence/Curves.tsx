import { useState } from 'react'
import { Choice, Controls, Readout } from '../../components/explain/figure'
import { usePlay } from '../../components/explain/useLoop'
import { CURVE_TRIPS, CURVES, STEPS } from './model'

const WIDTH = 460
const HEIGHT = 230
const LEFT = 34
const RIGHT = 450
const TOP = 12
const BOTTOM = 196
const MOST = 9
const READ_AT = 20

const x = (trip: number) => LEFT + (trip / CURVE_TRIPS) * (RIGHT - LEFT)
const y = (miss: number) => BOTTOM - (Math.min(MOST, miss) / MOST) * (BOTTOM - TOP)
const path = (values: number[], upTo: number) =>
  values
    .slice(0, Math.floor(upTo) + 1)
    .map((miss, trip) => `${trip ? 'L' : 'M'} ${x(trip).toFixed(1)} ${y(miss).toFixed(1)}`)
    .join(' ')

// The two learning curves for one step, drawn as the trips go by. Give it
// a `key` to draw again.
function Lines({ step }: { step: number }) {
  const { td, mc } = CURVES.find((curve) => curve.step === step)!
  const played = usePlay(CURVE_TRIPS, 22)
  const last = Math.floor(played)
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      role="img"
      aria-label={`How far off the bus and bike times are, trip by trip, with a step of ${step}: after ${READ_AT} trips TD is off by ${td[READ_AT].toFixed(1)} minutes and Monte Carlo by ${mc[READ_AT].toFixed(1)}.`}
    >
      {[0, 3, 6, 9].map((miss) => (
        <g key={miss}>
          <line x1={LEFT} x2={RIGHT} y1={y(miss)} y2={y(miss)} className="stroke-zinc-300 dark:stroke-zinc-200/25" strokeWidth={0.5} />
          <text x={LEFT - 6} y={y(miss) + 3} textAnchor="end" className="fill-zinc-400 font-mono text-[10px]">
            {miss}
          </text>
        </g>
      ))}
      <path d={path(mc, played)} className="fill-none stroke-ink" strokeWidth={2} strokeDasharray="5 3" strokeLinejoin="round" />
      <path d={path(td, played)} className="fill-none stroke-sage" strokeWidth={2.5} strokeLinejoin="round" />
      {last >= CURVE_TRIPS && (
        <g className="font-mono text-[10px] uppercase tracking-widest">
          <text x={RIGHT} y={y(mc[CURVE_TRIPS]) - 8} textAnchor="end" className="fill-ink">
            Monte Carlo
          </text>
          <text x={RIGHT} y={y(td[CURVE_TRIPS]) + 16} textAnchor="end" className="fill-sage">
            TD(0)
          </text>
        </g>
      )}
      <text x={LEFT} y={HEIGHT - 8} className="fill-zinc-400 font-mono text-[10px] uppercase tracking-widest">
        0 trips
      </text>
      <text x={RIGHT} y={HEIGHT - 8} textAnchor="end" className="fill-zinc-400 font-mono text-[10px] uppercase tracking-widest">
        {CURVE_TRIPS} trips
      </text>
      <text x={LEFT + 4} y={TOP + 4} className="fill-zinc-400 font-mono text-[10px] uppercase tracking-widest">
        minutes off
      </text>
    </svg>
  )
}

// Learning online, a trip at a time, from 25 minutes everywhere: how far
// off the bus and bike times are, averaged over many runs, for the step
// you pick
export default function Curves() {
  const [step, setStep] = useState<(typeof STEPS)[number]>(0.1)
  const { td, mc } = CURVES.find((curve) => curve.step === step)!
  return (
    <div>
      <Lines key={step} step={step} />
      <Controls>
        <Choice label="Step size" options={STEPS} value={step} onChange={setStep} />
        <Readout label={`TD, after ${READ_AT} trips`} value={`${td[READ_AT].toFixed(1)} min`} accent />
        <Readout label={`MC, after ${READ_AT} trips`} value={`${mc[READ_AT].toFixed(1)} min`} />
      </Controls>
    </div>
  )
}
