import { percent, smooth } from './model'

// Labels are set in capitals, which would turn ε into a Greek capital E:
// keep it small
function Label({ text, svg = false }: { text: string; svg?: boolean }) {
  return (
    <>
      {text.split(/(ε)/).map((part, i) =>
        part === 'ε' ? (
          svg ? (
            <tspan key={i} className="normal-case">
              ε
            </tspan>
          ) : (
            <span key={i} className="normal-case">
              ε
            </span>
          )
        ) : (
          part
        )
      )}
    </>
  )
}

const WIDTH = 640
const HEIGHT = 250
const LEFT = 44
const RIGHT = 548
const TOP = 16
const BOTTOM = 206

export interface Series {
  // For each step, the share that picked the best arm
  shares: number[]
  tone: 'sage' | 'ink'
  label: string
}

interface SharesProps {
  series: Series[]
  // What a step is, under the axis
  axis: string
  // Steps averaged together, so the lines show the trend
  window: number
  // A moment to mark with a line, such as a change in the world
  mark?: { at: number; label: string }
  label: string
}

// Lines of the share picking the best, step by step, from 0 to 100%
export default function Shares({ series, axis, window, mark, label }: SharesProps) {
  const steps = series[0].shares.length
  const x = (step: number) => LEFT + (step / (steps - 1)) * (RIGHT - LEFT)
  const y = (share: number) => BOTTOM - share * (BOTTOM - TOP)
  // Smoothed on each side of the mark, so a sudden change stays sudden
  const lines = series.map((s) =>
    mark ? [...smooth(s.shares.slice(0, mark.at), window), ...smooth(s.shares.slice(mark.at), window)] : smooth(s.shares, window)
  )
  // The end labels, kept apart when the lines end close together
  const ends = lines.map((line) => y(line.at(-1)!))
  const labels = [...ends]
  if (labels.length === 2) {
    const gap = Math.abs(labels[0] - labels[1])
    if (gap < 14) {
      const upper = labels[0] <= labels[1] ? 0 : 1
      labels[upper] -= (14 - gap) / 2
      labels[1 - upper] += (14 - gap) / 2
    }
  }
  const ticks = [0, steps / 4, steps / 2, (3 * steps) / 4, steps]

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={label}>
      {[0, 0.25, 0.5, 0.75, 1].map((share) => (
        <g key={share}>
          <line x1={LEFT} x2={RIGHT} y1={y(share)} y2={y(share)} className="stroke-zinc-200 dark:stroke-zinc-200/10" />
          <text x={LEFT - 8} y={y(share) + 3} textAnchor="end" className="fill-zinc-400 font-mono text-[10px]">
            {percent(share)}
          </text>
        </g>
      ))}
      {ticks.map((step) => (
        <text key={step} x={x(Math.min(step, steps - 1))} y={BOTTOM + 16} textAnchor="middle" className="fill-zinc-400 font-mono text-[10px]">
          {Math.max(1, step)}
        </text>
      ))}
      <text
        x={(LEFT + RIGHT) / 2}
        y={HEIGHT - 6}
        textAnchor="middle"
        className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest"
      >
        {axis}
      </text>
      {mark && (
        <g>
          <line x1={x(mark.at)} x2={x(mark.at)} y1={TOP} y2={BOTTOM} className="stroke-zinc-400" strokeDasharray="3 4" />
          <text x={x(mark.at) + 6} y={TOP + 10} className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
            {mark.label}
          </text>
        </g>
      )}
      {lines.map((line, i) => (
        <path
          key={series[i].label}
          d={line.map((share, step) => `${step ? 'L' : 'M'}${x(step).toFixed(1)},${y(share).toFixed(1)}`).join(' ')}
          fill="none"
          className={series[i].tone === 'sage' ? 'stroke-sage' : 'stroke-ink'}
          strokeWidth={2}
        />
      ))}
      {series.map((s, i) => (
        <text
          key={s.label}
          x={RIGHT + 8}
          y={labels[i] + 3}
          className={`font-mono text-[10px] uppercase tracking-widest ${s.tone === 'sage' ? 'fill-sage' : 'fill-ink'}`}
        >
          <Label text={s.label} svg />
        </text>
      ))}
    </svg>
  )
}

// The numbers under the lines: a share for each learner over a few stretches
export function Compare({
  columns,
  rows,
}: {
  columns: { label: string; tone: 'sage' | 'ink' }[]
  rows: { label: string; shares: number[] }[]
}) {
  return (
    <table className="mt-4 w-full text-left">
      <thead>
        <tr className="font-mono text-[0.8rem] uppercase tracking-widest">
          <th className="w-2/5 pb-1 font-normal" />
          {columns.map((column) => (
            <th key={column.label} className={`pb-1 font-normal ${column.tone === 'sage' ? 'text-sage' : 'text-ink'}`}>
              <Label text={column.label} />
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="font-serif text-3xl font-light tabular-nums">
        {rows.map((row) => (
          <tr key={row.label}>
            <th className="py-1 pr-2 align-middle font-mono text-[0.8rem] font-normal uppercase tracking-widest text-zinc-faded">
              {row.label}
            </th>
            {row.shares.map((share, i) => (
              <td key={columns[i].label} className={`py-1 ${columns[i].tone === 'sage' ? 'text-sage' : 'text-ink'}`}>
                {percent(share)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
