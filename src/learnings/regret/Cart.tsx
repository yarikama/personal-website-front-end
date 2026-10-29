import { usePlay } from '../../components/explain/useLoop'
import { CORNERS, dollars, TAKINGS, YEAR, type Day } from './model'

const WIDTH = 360
const HEIGHT = 300
const TILE = 112
const GAP = 12
const TILES = 84
const LEFT = 46
const RIGHT = 340
const TOP = 118
const BOTTOM = 270

const thousands = (value: number) => (value === 0 ? '$0' : `$${value / 1000}k`)

// The cart's days, playing: three corners with the days spent at each (and,
// when asked, what each truly takes and what you think it takes), and
// under them the regret so far, a line per learner. Plays `who`'s days from
// `from` to `to`, one every `pace` ms; `other` is drawn in full beside it.
export default function Cart({
  days,
  from,
  to,
  pace,
  who = 'You',
  other = null,
  span = YEAR,
  truth = false,
  averages = false,
  chart = true,
}: {
  days: Day[]
  from: number
  to: number
  pace: number
  who?: string
  other?: { days: Day[]; who: string; upTo: number } | null
  span?: number
  truth?: boolean
  averages?: boolean
  chart?: boolean
}) {
  const played = usePlay(to - from, pace)
  const now = Math.max(1, Math.min(to, Math.floor(from + played)))
  const today = days[now - 1]
  const top = Math.max(
    2000,
    Math.ceil(Math.max(days[span - 1].regret, other?.days[span - 1].regret ?? 0) / 2000) * 2000,
  )
  const xOf = (day: number) => LEFT + (day / span) * (RIGHT - LEFT)
  const yOf = (value: number) => BOTTOM - (value / top) * (BOTTOM - TOP)
  // Every few days is enough for a line a few hundred pixels wide
  const every = Math.max(1, Math.floor(span / 300))
  const line = (record: Day[], upTo: number) => {
    let d = `M${xOf(0)},${yOf(0)}`
    for (let i = 0; i < upTo; i++) {
      if (i % every === 0 || i === upTo - 1) d += ` L${xOf(i + 1).toFixed(1)},${yOf(record[i].regret).toFixed(1)}`
    }
    return d
  }
  const ticks = span === YEAR ? [0, 100, 200, 300] : [YEAR, 2 * YEAR, 3 * YEAR]
  const steps = Array.from({ length: Math.round(top / 2000) + 1 }, (_, i) => i * 2000).filter(
    (value, i, all) => all.length <= 4 || value % 4000 === 0,
  )

  return (
    <div>
      <p className="flex justify-between gap-4 font-mono text-[0.8rem] uppercase tracking-widest text-zinc-faded">
        <span>
          {who} · day <span className="text-ink tabular-nums">{now}</span> ·{' '}
          <span className="text-sage">{CORNERS[today.corner]}</span>
          {today.random && <span> (at random)</span>}
        </span>
        {chart && (
          <span>
            regret <span className="text-ink tabular-nums">{dollars(today.regret)}</span>
          </span>
        )}
      </p>
      <svg
        viewBox={`0 0 ${WIDTH} ${chart ? HEIGHT : TILES + 4}`}
        className="mx-auto mt-3 w-full"
        style={{ maxWidth: '34rem' }}
        role="img"
        aria-label={`${who}: days at each corner, and the regret so far`}
      >
        {CORNERS.map((name, c) => {
          const x = c * (TILE + GAP)
          const here = today.corner === c
          return (
            <g key={name}>
              <rect
                x={x + 1}
                y={1}
                width={TILE - 2}
                height={TILES}
                className={here ? 'fill-sage/10 stroke-sage' : 'fill-paper stroke-zinc-300 dark:stroke-zinc-200/25'}
                strokeWidth={here ? 2 : 1}
              />
              <text x={x + 10} y={19} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
                {name}
              </text>
              <text x={x + 10} y={46} className="fill-ink font-serif text-[22px] tabular-nums">
                {today.visits[c]}
                <tspan className="fill-zinc-400 font-mono text-[11px]"> {today.visits[c] === 1 ? 'day' : 'days'}</tspan>
              </text>
              {truth && (
                <text x={x + 10} y={66} className="fill-sage font-mono text-[11px]">
                  truly ${TAKINGS[c]}
                </text>
              )}
              {averages && (
                <text x={x + 10} y={79} className="fill-ink font-mono text-[11px]">
                  yours {dollars(today.averages[c])}
                </text>
              )}
            </g>
          )
        })}

        {chart && (
          <g>
            {steps.map((value) => (
              <g key={value}>
                <line
                  x1={LEFT}
                  x2={RIGHT}
                  y1={yOf(value)}
                  y2={yOf(value)}
                  className="stroke-zinc-200 dark:stroke-zinc-200/10"
                />
                <text x={LEFT - 6} y={yOf(value) + 4} textAnchor="end" className="fill-zinc-400 font-mono text-[11px]">
                  {thousands(value)}
                </text>
              </g>
            ))}
            {ticks.map((day) => (
              <text
                key={day}
                x={xOf(day)}
                y={BOTTOM + 16}
                textAnchor={day === ticks.at(-1) && span !== YEAR ? 'end' : 'middle'}
                className="fill-zinc-400 font-mono text-[11px]"
              >
                {span === YEAR ? day : `${day / YEAR} yr`}
              </text>
            ))}
            <text x={LEFT} y={TOP - 8} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
              Regret so far
            </text>
            {other && <path d={line(other.days, other.upTo)} fill="none" className="stroke-ink" strokeWidth={1.75} />}
            <path d={line(days, now)} fill="none" className={other ? 'stroke-sage' : 'stroke-ink'} strokeWidth={2} />
            {other && (
              <text
                x={xOf(other.upTo)}
                y={yOf(other.days[other.upTo - 1].regret) - 8}
                textAnchor="end"
                className="fill-ink font-mono text-[11px] uppercase"
              >
                {other.who}
              </text>
            )}
            {other && (
              <text
                x={xOf(now)}
                y={yOf(today.regret) - 8}
                textAnchor="end"
                className="fill-sage font-mono text-[11px] uppercase"
              >
                {who}
              </text>
            )}
          </g>
        )}
      </svg>
    </div>
  )
}
