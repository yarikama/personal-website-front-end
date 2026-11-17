import { usePlay } from '../../components/explain/useLoop'

const WIDTH = 470
const LEFT = 104
const RIGHT = 460
const TOP = 30
const ROW = 62
const BAR = 40
// The tallies the axis shows, either side of 0
const REACH = 50
// ms a pair: a thousand in two seconds
const PACE = 2

const xOf = (t: number) => LEFT + ((t + REACH) / (2 * REACH)) * (RIGHT - LEFT)

// A thousand random pairs of strangers for each quiz length: a histogram of
// their tallies, filling in as the pairs are counted, with the typical
// size, ±√d, bracketed in sage. Each row is scaled to its own tallest bar,
// so it is the width that compares.
export default function Spread({ rows }: { rows: { d: number; tallies: number[]; rms: number }[] }) {
  const pairs = rows[0].tallies.length
  const counted = Math.floor(usePlay(pairs, PACE))
  const done = counted >= pairs
  const height = TOP + rows.length * ROW + 24

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height}`}
      className="mx-auto w-full max-w-[36rem]"
      role="img"
      aria-label={`Histograms of the tally for ${pairs} random pairs on quizzes of ${rows
        .map((r) => r.d)
        .join(', ')} questions. Their typical sizes are about ${rows.map((r) => Math.round(r.rms)).join(', ')}: each four times as many questions doubles it.`}
    >
      <text x={LEFT} y={14} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
        {done ? `${pairs.toLocaleString('en')} pairs of strangers` : `${counted.toLocaleString('en')} pairs…`}
      </text>
      {rows.map(({ d, tallies, rms }, r) => {
        const base = TOP + r * ROW + BAR
        const counts = new Map<number, number>()
        for (const t of tallies.slice(0, counted)) counts.set(t, (counts.get(t) ?? 0) + 1)
        // The row's scale: its tallest bar once every pair is in
        const tallest = Math.max(...tallies.reduce((m, t) => m.set(t, (m.get(t) ?? 0) + 1), new Map<number, number>()).values())
        const spread = Math.sqrt(d)
        return (
          <g key={d}>
            <text x={LEFT - 12} y={base - 14} textAnchor="end" className="fill-ink font-mono text-[11px] tabular-nums">
              {d} questions
            </text>
            <text x={LEFT - 12} y={base} textAnchor="end" className="fill-zinc-faded font-mono text-[11px] tabular-nums">
              ±{Math.round(rms)}
            </text>
            <line x1={LEFT} x2={RIGHT} y1={base} y2={base} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
            {[...counts].map(([t, n]) => {
              const h = (n / tallest) * BAR
              return <rect key={t} x={xOf(t) - 2.5} y={base - h} width={5} height={h} rx={1} className="fill-ink" fillOpacity={0.55} />
            })}
            {done && (
              <g className="stroke-sage" strokeWidth={2}>
                <line x1={xOf(-spread)} x2={xOf(spread)} y1={base + 6} y2={base + 6} />
                <line x1={xOf(-spread)} x2={xOf(-spread)} y1={base + 2} y2={base + 10} />
                <line x1={xOf(spread)} x2={xOf(spread)} y1={base + 2} y2={base + 10} />
              </g>
            )}
          </g>
        )
      })}
      {[-48, -24, 0, 24, 48].map((t) => (
        <text
          key={t}
          x={xOf(t)}
          y={height - 4}
          textAnchor="middle"
          className="fill-zinc-faded font-mono text-[11px] tabular-nums"
        >
          {t > 0 ? `+${t}` : t < 0 ? `−${-t}` : '0'}
        </text>
      ))}
    </svg>
  )
}
