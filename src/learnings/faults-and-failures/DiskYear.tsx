import { useMemo } from 'react'
import { Readout } from '../../components/explain/figure'
import { seeded } from '../../components/explain/random'
import { deathsPerDay, year } from './model'

const WEEKS = 52
const CELL = 11

// A year of a data centre's disks, a square a day like a contribution graph:
// empty when no disk died, then darker the more did
export default function DiskYear({ disks, years }: { disks: number; years: number }) {
  const rate = deathsPerDay(disks, years)
  const days = useMemo(() => year(seeded(disks + years * 1000), rate), [disks, years, rate])
  const total = days.reduce((sum, n) => sum + n, 0)
  const quiet = days.filter((n) => n === 0).length
  const tone = (n: number) => (n === 0 ? 'fill-zinc-200 dark:fill-zinc-200/10' : n === 1 ? 'fill-sage/50' : n === 2 ? 'fill-sage' : 'fill-ink')

  return (
    <div>
      <svg viewBox={`0 0 ${WEEKS * CELL} ${7 * CELL}`} className="w-full" role="img" aria-label={`${total} disks died in a year`}>
        {days.map((n, d) => (
          <rect key={d} x={Math.floor(d / 7) * CELL + 1} y={(d % 7) * CELL + 1} width={CELL - 2} height={CELL - 2} className={tone(n)}>
            <title>{`Day ${d + 1}: ${n} ${n === 1 ? 'disk' : 'disks'}`}</title>
          </rect>
        ))}
      </svg>
      <div className="mt-2 flex justify-between font-mono text-[0.8rem] uppercase tracking-widest text-zinc-400">
        <span>Jan</span>
        <span>One square a day</span>
        <span>Dec</span>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-4">
        <Readout label="A day, on average" value={rate < 0.1 ? rate.toFixed(2) : rate.toFixed(1)} />
        <Readout label="Died this year" value={total.toLocaleString('en-US')} accent />
        <Readout label="Days with none" value={quiet} />
      </div>
    </div>
  )
}
