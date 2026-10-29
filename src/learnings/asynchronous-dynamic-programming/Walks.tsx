import { Readout } from '../../components/explain/figure'
import CityMap from './CityMap'
import { backupsBy, blocksOf, CITY, SWEEPING, touchedBy, WALKING } from './model'

// The city after a chosen walk: the corners backed up so far, that walk's
// route, and what the walking has cost, set against value iteration's
// sweeps of every corner
export default function Walks({ walk }: { walk: number }) {
  const c = CITY()
  const { walks } = WALKING()
  const touched = touchedBy(walk)
  const backups = backupsBy(walk)
  const sweeps = backups / c.corners.length
  return (
    <div>
      <CityMap
        label={`The city after walk ${walk}: ${touched} corners backed up, and that walk's route`}
        walks={walk}
        path={walks[walk - 1].path}
      />
      <div className="mt-4 flex flex-wrap gap-x-10 gap-y-3">
        <Readout label={`Walk ${walk}`} value={`${blocksOf(walks[walk - 1])} blocks`} />
        <Readout
          label="Corners backed up"
          value={`${touched.toLocaleString('en')} · ${Math.round((touched / c.corners.length) * 100)}%`}
          accent
        />
        <Readout label="Backups so far" value={backups.toLocaleString('en')} />
        <Readout label="As full sweeps" value={`${sweeps.toFixed(sweeps < 1 ? 2 : 1)} of ${SWEEPING().sweeps}`} />
      </div>
    </div>
  )
}
