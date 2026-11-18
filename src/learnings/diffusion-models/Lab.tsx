import { Readout } from '../../components/explain/figure'
import { FieldRun } from './Field'
import { DATA_SPREAD, labRun, SHEEP, type Fresh, type StepChoice } from './model'

const pct = (share: number) => `${Math.round(100 * share)}%`

// Two hundred fresh noise draws run backwards with the best possible noise
// guess, in as many steps as the reader picks, with or without the fresh
// noise each step adds back. The runs all start and end at the same noise
// level; only the number of steps between differs.
export default function Lab({ steps, fresh, replay }: { steps: StepChoice; fresh: Fresh; replay: number }) {
  const run = labRun(steps, fresh)
  return (
    <div>
      <FieldRun
        key={`${steps} ${fresh} ${replay}`}
        frames={run.frames}
        ms={3500}
        status={(done) => (done ? `${Math.round(run.on * SHEEP)} of ${SHEEP} in a ring` : 'Removing noise…')}
        tone="judged"
        names="pixels"
        label={`${SHEEP} samples of pure noise denoised in ${steps} ${steps === 1 ? 'step' : 'steps'}, fresh noise ${fresh.toLowerCase()}: ${pct(run.on)} end inside a ring, with a width of ${run.spread.toFixed(2)} around their ring's centre.`}
      />
      <div className="mt-4 grid grid-cols-3 gap-4">
        <Readout label="In a ring" value={pct(run.on)} accent />
        <Readout label="Width" value={run.spread.toFixed(2)} />
        <Readout label="Real width" value={DATA_SPREAD.toFixed(2)} />
      </div>
    </div>
  )
}
