import { Readout } from '../../components/explain/figure'
import { HIDDEN, pct, THINNED, thinnedOf } from './model'
import Regions from './Regions'

const caps = 'font-mono text-[0.875rem] uppercase tracking-widest'

function Panel({ name, note, grid, accent = false }: { name: string; note: string; grid: number[]; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className={`${caps} ${accent ? 'text-sage-ink' : 'text-zinc-faded'}`}>{name}</p>
      <Regions grid={grid} label={`${name}: ${note}`} />
      <p className="font-mono text-[0.875rem] text-ink">{note}</p>
    </div>
  )
}

// The network trained with dropout at a half, looked at three ways: a few
// of the thinned networks training sampled, the average of a hundred of
// them, and the whole network with nothing dropped
export default function Thinned() {
  const t = thinnedOf()
  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {t.shown.map((s, i) => (
          <Panel key={i} name={`Thinned ${i + 1}`} note={`${s.kept} of ${HIDDEN} units · ${pct(s.right)}`} grid={s.grid} />
        ))}
        <Panel name={`Average of ${THINNED}`} note={`${pct(t.average.right)} right`} grid={t.average.grid} />
        <Panel name="Whole network" note={`${pct(t.whole.right)} right`} grid={t.whole.grid} accent />
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Readout label="One thinned" value={pct(t.oneRight)} />
        <Readout label="Their average" value={pct(t.average.right)} />
        <Readout label="Whole network" value={pct(t.whole.right)} accent />
        <Readout label="Same answer" value={pct(t.agree)} />
      </div>
    </div>
  )
}
