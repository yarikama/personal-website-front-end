import { usePlay } from './useLoop'
import { percent } from './lunchHill'

const WIDTH = 560
const HEIGHT = 240
const LEFT = 58
const RIGHT = 410
const TOP = 26
const BOTTOM = 196

export interface Line {
  name: string
  values: number[]
  // The one to watch, in sage; the other in ink
  accent: boolean
}

// Learning curves: for each lunch, the chance of ending at the fish stall,
// averaged over many people learning at once. The lines draw themselves
// from the first lunch to the last.
export default function Train({ lines, label }: { lines: Line[]; label: string }) {
  const count = lines[0].values.length
  const x = (lunch: number) => LEFT + (lunch / (count - 1)) * (RIGHT - LEFT)
  const y = (share: number) => BOTTOM - share * (BOTTOM - TOP)
  const drawn = Math.max(2, Math.floor(usePlay(count, 8)))
  const path = (values: number[]) =>
    values
      .slice(0, drawn)
      .map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
      .join(' ')

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={label}>
      {[0, 0.25, 0.5, 0.75, 1].map((share) => (
        <g key={share}>
          <line x1={LEFT} x2={RIGHT} y1={y(share)} y2={y(share)} className="stroke-zinc-200 dark:stroke-zinc-200/10" />
          <text x={LEFT - 8} y={y(share) + 4} textAnchor="end" className="fill-zinc-400 font-mono text-[12px]">
            {percent(share)}
          </text>
        </g>
      ))}
      {[1, Math.round(count / 2), count].map((lunch) => (
        <text key={lunch} x={x(lunch - 1)} y={BOTTOM + 18} textAnchor="middle" className="fill-zinc-400 font-mono text-[12px]">
          {lunch}
        </text>
      ))}
      <text x={(LEFT + RIGHT) / 2} y={HEIGHT - 4} textAnchor="middle" className="fill-zinc-faded font-mono text-[12px] uppercase tracking-widest">
        Lunch
      </text>
      {lines.map((line, i) => {
        const end = line.values[Math.min(drawn, count) - 1]
        // Labels kept apart when the lines end close together
        const other = lines[1 - i]?.values[Math.min(drawn, count) - 1]
        const apart = other !== undefined && Math.abs(y(end) - y(other)) < 24 ? (end > other || (end === other && i === 0) ? -12 : 12) : 0
        return (
          <g key={line.name}>
            <path d={path(line.values)} fill="none" className={line.accent ? 'stroke-sage' : 'stroke-ink'} strokeWidth={2.5} />
            <text
              x={x(Math.min(drawn, count) - 1) + 8}
              y={y(end) + 4 + apart}
              className={`font-mono text-[12px] uppercase ${line.accent ? 'fill-sage' : 'fill-ink'}`}
            >
              {line.name} {percent(end)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
