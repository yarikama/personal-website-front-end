import { percent, slowChance } from './model'

const WIDTH = 640
const HEIGHT = 300
const LEFT = 48
const RIGHT = 610
const TOP = 16
const BOTTOM = 260
const MOST_CALLS = 100

const x = (calls: number) => LEFT + ((calls - 1) / (MOST_CALLS - 1)) * (RIGHT - LEFT)
const y = (chance: number) => BOTTOM - chance * (BOTTOM - TOP)

const curve = (p: number) =>
  Array.from({ length: MOST_CALLS }, (_, i) => `${i === 0 ? 'M' : 'L'}${x(i + 1).toFixed(1)},${y(slowChance(p, i + 1)).toFixed(1)}`).join(' ')

// The chance a page is slow against how many calls it waits on: one curve
// per chance of a slow call, the chosen one in sage with a dot at `calls`
export default function ChanceChart({ calls, slowness, options }: { calls: number; slowness: number; options: readonly number[] }) {
  const chance = slowChance(slowness, calls)
  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={`With ${calls} calls, ${percent(chance)} of pages are slow`}>
      {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
        <g key={tick}>
          <line x1={LEFT} x2={RIGHT} y1={y(tick)} y2={y(tick)} className="stroke-zinc-200 dark:stroke-zinc-200/15" />
          <text x={LEFT - 8} y={y(tick) + 4} textAnchor="end" className="fill-zinc-400 font-mono text-[10px]">
            {tick * 100}%
          </text>
        </g>
      ))}
      {[1, 25, 50, 75, 100].map((tick) => (
        <text key={tick} x={x(tick)} y={BOTTOM + 18} textAnchor="middle" className="fill-zinc-400 font-mono text-[10px]">
          {tick}
        </text>
      ))}
      <text x={(LEFT + RIGHT) / 2} y={HEIGHT - 4} textAnchor="middle" className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
        Calls per page
      </text>

      {options.map((p) => (
        <g key={p}>
          <path
            d={curve(p)}
            fill="none"
            className={p === slowness ? 'stroke-sage' : 'stroke-zinc-400'}
            strokeWidth={p === slowness ? 2.5 : 1}
            opacity={p === slowness ? 1 : 0.5}
          />
          <text
            x={RIGHT}
            y={y(slowChance(p, MOST_CALLS)) - 6}
            textAnchor="end"
            className={`font-mono text-[10px] ${p === slowness ? 'fill-sage' : 'fill-zinc-400'}`}
          >
            each call {percent(p)} slow
          </text>
        </g>
      ))}

      <line x1={x(calls)} x2={x(calls)} y1={BOTTOM} y2={y(chance)} className="stroke-sage" strokeDasharray="3 3" />
      <circle cx={x(calls)} cy={y(chance)} r={5} className="fill-sage" />
      <text
        x={x(calls) + (calls > 70 ? -10 : 10)}
        // Under the dot near the top, clear of the curves' names
        y={chance > 0.8 ? y(chance) + 20 : y(chance) - 10}
        textAnchor={calls > 70 ? 'end' : 'start'}
        className="fill-ink font-mono text-[11px]"
      >
        {percent(chance)} of pages slow
      </text>
    </svg>
  )
}
