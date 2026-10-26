import { Readout } from '../../components/explain/figure'
import { BIGGEST, scaleOutCost, scaleUpCost } from './model'

const WIDTH = 640
const HEIGHT = 260
const LEFT = 48
const RIGHT = 620
const TOP = 16
const BOTTOM = 220
const MOST_LOAD = 30
// High enough to show one machine's cost all the way to the biggest made
const MOST_COST = 90

const x = (load: number) => LEFT + ((load - 1) / (MOST_LOAD - 1)) * (RIGHT - LEFT)
const y = (cost: number) => BOTTOM - (Math.min(cost, MOST_COST) / MOST_COST) * (BOTTOM - TOP)

const path = (cost: (load: number) => number | null) => {
  const points: string[] = []
  for (let load = 1; load <= MOST_LOAD; load += 0.25) {
    const c = cost(load)
    if (c === null || c > MOST_COST) break
    points.push(`${points.length ? 'L' : 'M'}${x(load).toFixed(1)},${y(c).toFixed(1)}`)
  }
  return points.join(' ')
}

// What each way costs as load grows, with today's choice marked at `load`
export default function CostCurves({ load }: { load: number }) {
  const up = scaleUpCost(load)
  const out = scaleOutCost(load)
  const verdict = up === null || out < up ? 'Scale out' : 'Scale up'
  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="The cost of scaling up and out as load grows">
        <line x1={LEFT} x2={RIGHT} y1={BOTTOM} y2={BOTTOM} className="stroke-zinc-400" />
        {[1, 10, 20, 30].map((tick) => (
          <text key={tick} x={x(tick)} y={BOTTOM + 16} textAnchor="middle" className="fill-zinc-400 font-mono text-[10px]">
            {tick}×
          </text>
        ))}
        <text x={(LEFT + RIGHT) / 2} y={HEIGHT - 4} textAnchor="middle" className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
          Load, in multiples of today’s
        </text>
        <text x={LEFT - 8} y={TOP + 8} textAnchor="end" className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
          Cost
        </text>
        <line x1={x(BIGGEST)} x2={x(BIGGEST)} y1={TOP} y2={BOTTOM} className="stroke-zinc-400" strokeDasharray="3 3" />
        <text x={x(BIGGEST) + 6} y={TOP + 10} className="fill-zinc-400 font-mono text-[10px] uppercase tracking-widest">
          Biggest machine made
        </text>
        <path d={path(scaleUpCost)} fill="none" className="stroke-ink" strokeWidth={2} />
        <path d={path(scaleOutCost)} fill="none" className="stroke-sage" strokeWidth={2} />
        <text x={x(5.2)} y={y(scaleUpCost(5.2)!) - 8} className="fill-ink font-mono text-[10px] uppercase tracking-widest">
          One bigger machine
        </text>
        <text x={x(22)} y={y(scaleOutCost(22)) - 14} className="fill-sage font-mono text-[10px] uppercase tracking-widest">
          More machines
        </text>
        <line x1={x(load)} x2={x(load)} y1={TOP} y2={BOTTOM} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
        {up !== null && up <= MOST_COST && <circle cx={x(load)} cy={y(up)} r={5} className="fill-ink" />}
        <circle cx={x(load)} cy={y(out)} r={5} className="fill-sage" />
      </svg>
      <div className="mt-4 grid grid-cols-3 gap-4">
        <Readout label="One bigger machine" value={up === null ? 'None made' : `${up.toFixed(1)}×`} />
        <Readout label="More machines" value={`${out.toFixed(1)}×`} />
        <Readout label="Cheaper" value={verdict} accent />
      </div>
    </div>
  )
}
