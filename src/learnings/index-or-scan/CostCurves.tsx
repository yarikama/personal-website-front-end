import { Readout } from '../../components/explain/figure'
import { count, cost, crossover, formatMs, formatPercent, matching, TABLE, type Measure, type Plan } from './model'

const WIDTH = 640
const HEIGHT = 300
const PLOT = { left: 70, right: 616, top: 16, bottom: 252 }

// Selectivity from 0.0001% to 100%, on a log scale
const X_LOG = { from: -6, to: 0 }
const X_TICKS = [-6, -5, -4, -3, -2, -1, 0]

// Cost on a log scale too: the three plans differ by factors of thousands
const Y_LOG: Record<Measure, { from: number; to: number }> = {
  time: { from: 1, to: 8 },
  reads: { from: 0, to: 8 },
}
const Y_TICKS: Record<Measure, { at: number; label: string }[]> = {
  time: [
    { at: 10, label: '10 ms' },
    { at: 100, label: '100 ms' },
    { at: 1_000, label: '1 s' },
    { at: 10_000, label: '10 s' },
    { at: 60_000, label: '1 min' },
    { at: 600_000, label: '10 min' },
    { at: 3_600_000, label: '1 h' },
    { at: 36_000_000, label: '10 h' },
  ],
  reads: [1, 10, 100, 1_000, 10_000, 100_000, 1_000_000, 10_000_000].map((at) => ({
    at,
    label: at >= 1_000_000 ? `${at / 1_000_000}M` : at >= 1_000 ? `${at / 1_000}k` : String(at),
  })),
}

const LINES: { plan: Plan; name: string; className: string; dash?: string }[] = [
  { plan: 'scan', name: 'Full scan', className: 'stroke-sage' },
  { plan: 'clustered', name: 'Clustered index', className: 'stroke-zinc-400', dash: '5 4' },
  { plan: 'unclustered', name: 'Unclustered index', className: 'stroke-ink' },
]

const xAt = (s: number) =>
  PLOT.left + ((Math.log10(s) - X_LOG.from) / (X_LOG.to - X_LOG.from)) * (PLOT.right - PLOT.left)

// Points along each line, a few hundred across the plot
const SAMPLES = Array.from({ length: 241 }, (_, i) => 10 ** (X_LOG.from + (i / 240) * (X_LOG.to - X_LOG.from)))

const format = (measure: Measure, value: number) => (measure === 'time' ? formatMs(value) : `${count(value)} reads`)

// The three plans' costs as the share of rows matched grows, for the
// 10-million-row table: the full scan, a clustered index and an unclustered
// one, with the point where the unclustered index starts losing marked
export default function CostCurves({ s, measure }: { s: number; measure: Measure }) {
  const range = Y_LOG[measure]
  const yAt = (value: number) => {
    const clamped = Math.min(range.to, Math.max(range.from, Math.log10(Math.max(value, 1e-9))))
    return PLOT.bottom - ((clamped - range.from) / (range.to - range.from)) * (PLOT.bottom - PLOT.top)
  }
  const path = (plan: Plan) =>
    SAMPLES.map((x, i) => `${i ? 'L' : 'M'}${xAt(x).toFixed(1)},${yAt(cost(measure, plan, TABLE, x)).toFixed(1)}`).join('')

  const cross = crossover(TABLE, measure)
  const crossY = yAt(cost(measure, 'scan', TABLE, cross))
  // The label goes on the side with room: right of the point, or left of it
  const leftOfMiddle = xAt(cross) < (PLOT.left + PLOT.right) / 2
  const costs = LINES.map((line) => ({ ...line, value: cost(measure, line.plan, TABLE, s) }))
  const cheapest = Math.min(...costs.map((c) => c.value))

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`At ${formatPercent(s)} of the rows: ${costs.map((c) => `${c.name} ${format(measure, c.value)}`).join(', ')}. The unclustered index loses to the scan past ${formatPercent(cross)}.`}
      >
        {/* Axes and grid */}
        {Y_TICKS[measure].map((tick) => (
          <g key={tick.at}>
            <line
              x1={PLOT.left}
              x2={PLOT.right}
              y1={yAt(tick.at)}
              y2={yAt(tick.at)}
              className="stroke-zinc-200 dark:stroke-zinc-200/10"
            />
            <text x={PLOT.left - 8} y={yAt(tick.at) + 4} textAnchor="end" className="fill-zinc-faded font-mono text-[10px] tabular-nums">
              {tick.label}
            </text>
          </g>
        ))}
        {X_TICKS.map((power) => (
          <text
            key={power}
            x={xAt(10 ** power)}
            y={PLOT.bottom + 18}
            textAnchor={power === X_LOG.from ? 'start' : power === X_LOG.to ? 'end' : 'middle'}
            className="fill-zinc-faded font-mono text-[10px] tabular-nums"
          >
            {formatPercent(10 ** power)}
          </text>
        ))}
        <text x={PLOT.right} y={PLOT.bottom + 40} textAnchor="end" className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
          Share of rows matched
        </text>
        <line x1={PLOT.left} x2={PLOT.right} y1={PLOT.bottom} y2={PLOT.bottom} className="stroke-zinc-300 dark:stroke-zinc-200/25" />

        {/* The lines */}
        {LINES.map((line) => (
          <path
            key={line.plan}
            d={path(line.plan)}
            fill="none"
            className={line.className}
            strokeWidth={line.plan === 'clustered' ? 1.75 : 2.25}
            strokeDasharray={line.dash}
          />
        ))}

        {/* Where the unclustered index starts losing */}
        <line x1={xAt(cross)} x2={xAt(cross)} y1={crossY} y2={PLOT.bottom} className="stroke-ink" strokeDasharray="2 3" />
        <circle cx={xAt(cross)} cy={crossY} r={5} className="fill-paper stroke-ink" strokeWidth={2} />
        <text
          x={xAt(cross) + (leftOfMiddle ? 9 : -9)}
          y={crossY + (leftOfMiddle ? 18 : -10)}
          textAnchor={leftOfMiddle ? 'start' : 'end'}
          className="fill-ink font-mono text-[11px] tabular-nums"
        >
          crossover {formatPercent(cross)}
        </text>

        {/* The share the slider picks */}
        <line x1={xAt(s)} x2={xAt(s)} y1={PLOT.top} y2={PLOT.bottom} className="stroke-zinc-400" strokeWidth={1} />
        {costs.map((c) => (
          <circle
            key={c.plan}
            cx={xAt(s)}
            cy={yAt(c.value)}
            r={4}
            className={c.plan === 'scan' ? 'fill-sage' : c.plan === 'clustered' ? 'fill-zinc-400' : 'fill-ink'}
          />
        ))}

        {/* Legend, in the empty top left */}
        {LINES.map((line, i) => (
          <g key={line.plan} transform={`translate(${PLOT.left + 12},${PLOT.top + 10 + i * 18})`}>
            <line x1={0} x2={22} y1={0} y2={0} className={line.className} strokeWidth={2.25} strokeDasharray={line.dash} />
            <text x={30} y={4} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
              {line.name}
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-5 grid grid-cols-3 gap-4">
        {costs.map((c) => (
          <Readout key={c.plan} label={c.name} value={measure === 'time' ? formatMs(c.value) : count(c.value)} accent={c.value === cheapest} />
        ))}
      </div>
      <p className="mt-3 font-mono text-[0.8rem] uppercase leading-relaxed tracking-widest text-zinc-faded">
        {count(matching(TABLE, s))} of 10,000,000 rows · 250,000 pages
      </p>
    </div>
  )
}
