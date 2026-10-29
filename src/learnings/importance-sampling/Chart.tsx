// Estimates of your commute after each trip of a log, against the number of
// trips on a log scale, so the first few trips, where the estimates swing
// most, get as much room as the last few hundred. Values off the chart are
// held at its edge. It only draws.

export interface Line {
  values: number[]
  tone: 'sage' | 'ink'
  // Faint lines for one of many logs
  faint?: boolean
  // A name at the line's right end
  name?: string
}

const WIDTH = 480
const LEFT = 34
const RIGHT_NAMED = 372
const RIGHT_BARE = 450
const TOP = 12

export default function Chart({
  lines,
  truth,
  trips,
  shown = trips,
  top,
  height = 200,
  label,
  truthName,
}: {
  lines: Line[]
  truth: number
  // How many trips the axis runs to, and how many of them to draw so far
  trips: number
  shown?: number
  // The highest minutes on the chart
  top: number
  height?: number
  label: string
  truthName?: string
}) {
  const named = lines.some((line) => line.name)
  const right = named ? RIGHT_NAMED : RIGHT_BARE
  const bottom = height - 24
  const x = (trip: number) => LEFT + (Math.log10(trip) / Math.log10(trips)) * (right - LEFT)
  const y = (minutes: number) => TOP + (1 - Math.min(top, Math.max(0, minutes)) / top) * (bottom - TOP)
  const count = Math.max(1, Math.min(trips, Math.floor(shown)))
  const path = (values: number[]) =>
    values
      .slice(0, count)
      .map((v, i) => (Number.isFinite(v) ? `${i ? 'L' : 'M'}${x(i + 1).toFixed(1)},${y(v).toFixed(1)}` : ''))
      .join(' ')
  const ticks = [1, 10, 100, 1000, 10000].filter((t) => t <= trips)
  const grid = [0, Math.round(top / 2), top]

  // Names at the right, nudged apart when the lines end close together
  const ends = lines
    .filter((line) => line.name)
    .map((line) => ({ line, at: y(line.values[count - 1]) }))
    .sort((a, b) => a.at - b.at)
  for (let i = 1; i < ends.length; i++) ends[i].at = Math.max(ends[i].at, ends[i - 1].at + 14)

  return (
    <svg viewBox={`0 0 ${WIDTH} ${height}`} className="w-full" role="img" aria-label={label}>
      {grid.map((m) => (
        <g key={m}>
          <line x1={LEFT} x2={right} y1={y(m)} y2={y(m)} className="stroke-zinc-200 dark:stroke-zinc-200/10" />
          <text x={LEFT - 6} y={y(m) + 4} textAnchor="end" className="fill-zinc-400 font-mono text-[10px] tabular-nums">
            {m}
          </text>
        </g>
      ))}
      {ticks.map((t) => (
        <text key={t} x={x(t)} y={bottom + 16} textAnchor="middle" className="fill-zinc-400 font-mono text-[10px] tabular-nums">
          {t.toLocaleString('en-US')}
        </text>
      ))}
      <line x1={LEFT} x2={right} y1={y(truth)} y2={y(truth)} className="stroke-zinc-400" strokeDasharray="4 4" />
      {truthName && (
        <text x={LEFT + 4} y={y(truth) - 5} className="fill-zinc-400 font-mono text-[10px]">
          {truthName}
        </text>
      )}
      {lines.map((line, i) => (
        <path
          key={i}
          d={path(line.values)}
          fill="none"
          className={line.tone === 'sage' ? 'stroke-sage' : 'stroke-ink'}
          strokeWidth={line.faint ? 1.25 : 2}
          strokeOpacity={line.faint ? 0.55 : 1}
          strokeLinejoin="round"
        />
      ))}
      {ends.map(({ line, at }) => (
        <text key={line.name} x={right + 6} y={at + 4} className={`font-mono text-[10px] uppercase tracking-wider ${line.tone === 'sage' ? 'fill-sage' : 'fill-ink'}`}>
          {line.name}
        </text>
      ))}
    </svg>
  )
}
