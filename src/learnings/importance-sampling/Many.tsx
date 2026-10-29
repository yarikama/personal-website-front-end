import { useState } from 'react'
import { Choice, Controls, Readout, Slider } from '../../components/explain/figure'
import Chart from './Chart'
import { COIN, JUNCTION_CHOICES, PLAY_SHOWN, PLAY_TRIPS, spread, YOU } from './model'

const fmt = (value: number) => (value >= 100 ? Math.round(value).toLocaleString('en-US') : value.toFixed(1))
const weight = (value: number) =>
  value >= 1e6 ? `${(value / 1e6).toFixed(1)} million` : value >= 100 ? Math.round(value).toLocaleString('en-US') : value.toFixed(2)

// Many friends' logs at once, each of a thousand trips, both estimates
// after every trip. Choose how often the friend takes the main road, and
// how many junctions a commute has: the further the friend's habit is from
// yours, and the longer the trip, the wilder the weights.
export default function Many() {
  const [behaviour, setBehaviour] = useState(COIN)
  const [junctions, setJunctions] = useState<(typeof JUNCTION_CHOICES)[number]>(3)
  const { shown, miss, heaviest, truth } = spread(behaviour, junctions)
  const top = truth * 2
  const note =
    behaviour === 0 || behaviour === 1
      ? `Your friend never takes the ${behaviour === 1 ? 'side street' : 'main road'}, and you sometimes do: no weighting can find trips that are not in the log.`
      : Math.abs(behaviour - YOU) < 1e-9
        ? 'Your friend drives just like you: every weight is 1, and both estimates are the plain average.'
        : ''
  const panel = (which: 'ordinary' | 'weighted') => (
    <div>
      <p className={`font-mono text-[0.8rem] uppercase tracking-widest ${which === 'ordinary' ? 'text-ink' : 'text-sage'}`}>
        {which === 'ordinary' ? 'Ordinary · ÷ trips' : 'Weighted · ÷ weight'}
      </p>
      <Chart
        label={`${PLAY_SHOWN} logs of ${PLAY_TRIPS} trips, the ${which} estimate after each trip, against your true ${truth} minutes`}
        lines={shown.map((run) => ({ values: run[which], tone: which === 'ordinary' ? 'ink' : 'sage', faint: true }))}
        truth={truth}
        trips={PLAY_TRIPS}
        top={top}
        height={170}
      />
    </div>
  )

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2">
        {panel('ordinary')}
        {panel('weighted')}
      </div>
      <p className="mt-2 min-h-[1.25rem] font-mono text-[0.8rem] text-zinc-faded">{note}</p>
      <Controls>
        <Slider
          label="Your friend takes the main road"
          value={behaviour}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => setBehaviour(Math.round(v * 20) / 20)}
          format={(v) => `${Math.round(v * 100)}%`}
        />
        <Choice label="Junctions" options={JUNCTION_CHOICES} value={junctions} onChange={setJunctions} />
      </Controls>
      <Controls>
        <Readout label="Ordinary misses by" value={`${fmt(miss.ordinary)} min`} />
        <Readout label="Weighted misses by" value={`${fmt(miss.weighted)} min`} accent />
        <Readout label="Heaviest trip" value={weight(heaviest)} />
      </Controls>
    </div>
  )
}
