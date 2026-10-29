import { usePlay } from '../../components/explain/useLoop'
import { book, clock, DAY, most, RULE_NAMES, type Meeting, type Rule } from './model'

const WIDTH = 480
const LEFT = 16
const RIGHT = 464
const TOP = 6
const LANE = 24
const BAR = 15

const x = (hours: number) => LEFT + ((hours - DAY.from) / (DAY.to - DAY.from)) * (RIGHT - LEFT)

// Each meeting's row on the sheet: the first row it fits in, by start, so
// meetings that don't clash can share one
function lanes(day: Meeting[]): number[] {
  const ends: number[] = []
  const lane = new Array<number>(day.length)
  day
    .map((_, i) => i)
    .sort((a, b) => day[a].start - day[b].start || day[a].end - day[b].end)
    .forEach((i) => {
      let row = ends.findIndex((end) => end <= day[i].start)
      if (row < 0) row = ends.push(0) - 1
      ends[row] = day[i].end
      lane[i] = row
    })
  return lane
}

interface DayProps {
  day: Meeting[]
  // The rule booking the room, or none to show the requests waiting
  rule: Rule | null
  // Ms a booking
  pace?: number
  // The reveal: meetings become intervals, and each booking's end is marked
  named?: boolean
  // For a figure to play with: meetings cancelled, and a tap to cancel one
  // or put it back
  cancelled?: number[]
  onToggle?: (meeting: number) => void
  // Draw a best schedule under the sheet
  best?: boolean
}

// A day of requests for one room, on a booking sheet, and a greedy rule
// booking it: each booking lights up, then what clashes with it is turned
// away. Plays as soon as it is shown; with reduced motion it shows the end.
export default function Day({ day, rule, pace = 900, named = false, cancelled = [], onToggle, best = false }: DayProps) {
  const open = day.map((_, i) => i).filter((i) => !cancelled.includes(i))
  const asked = open.map((i) => day[i])
  // Bookings by the place in `day`, not among the open ones
  const picks = rule ? book(asked, rule).map((pick) => ({ take: open[pick.take], drop: pick.drop.map((j) => open[j]) })) : []
  const fit = most(asked).map((k) => open[k])
  const played = usePlay(picks.length, pace)
  const done = played >= picks.length
  const booked = picks.filter((_, k) => played > k)
  const lane = lanes(day)
  const rows = Math.max(...lane) + 1
  const axis = TOP + rows * LANE + 4
  const height = axis + (named ? 42 : 22) + (best ? 40 : 0)
  const turnedAway = (i: number) => picks.findIndex((pick, k) => pick.drop.includes(i) && played > k + 0.45) >= 0
  const short = booked.length < fit.length

  const status = !rule
    ? `${asked.length} requests`
    : done
      ? named
        ? `${booked.length} of ${asked.length} intervals chosen`
        : `Booked ${booked.length} · ${fit.length} fit`
      : `Booking ${booked.length}…`

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 font-mono text-[0.8rem] uppercase tracking-widest">
        <span className="shrink-0 text-zinc-faded">{rule ? (named ? 'Greedy · ends first' : RULE_NAMES[rule]) : 'One room'}</span>
        <span className={`text-right ${rule && done ? (short ? 'text-ink' : 'text-sage') : 'text-zinc-faded'}`}>{status}</span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        className="mt-3 w-full"
        role="img"
        aria-label={`A day of ${asked.length} requests for one room${rule ? `, booked by the rule “${RULE_NAMES[rule]}”: ${booked.length} booked where ${fit.length} fit` : ''}`}
      >
        {/* The hours */}
        {Array.from({ length: DAY.to - DAY.from + 1 }, (_, k) => DAY.from + k).map((h) => (
          <g key={h}>
            <line x1={x(h)} x2={x(h)} y1={TOP - 4} y2={axis} className="stroke-zinc-200 dark:stroke-zinc-200/10" />
            <text x={x(h)} y={axis + 14} textAnchor="middle" className="fill-zinc-400 font-mono text-[10px]">
              {((h + 11) % 12) + 1}
            </text>
          </g>
        ))}
        <line x1={LEFT} x2={RIGHT} y1={axis} y2={axis} className="stroke-zinc-400" />

        {day.map((m, i) => {
          const isCancelled = cancelled.includes(i)
          const k = picks.findIndex((pick) => pick.take === i)
          const isBooked = k >= 0 && played > k
          const away = !isBooked && turnedAway(i)
          const y = TOP + lane[i] * LANE
          const tone = isCancelled
            ? 'fill-transparent stroke-zinc-400 [stroke-dasharray:3_3]'
            : isBooked
              ? 'fill-sage stroke-sage'
              : away
                ? 'fill-ink/5 stroke-ink/40 dark:stroke-ink/30'
                : 'fill-paper stroke-zinc-400'
          const what = isCancelled ? 'cancelled' : isBooked ? 'booked' : away ? 'turned away' : 'waiting'
          const bar = (
            <>
              <rect x={x(m.start) + 1} y={y} width={x(m.end) - x(m.start) - 2} height={BAR} rx={2} className={`${tone} transition-colors`} strokeWidth={1.2} />
              {away && (
                <line x1={x(m.start) + 4} x2={x(m.end) - 4} y1={y + BAR / 2} y2={y + BAR / 2} className="stroke-ink/50" strokeWidth={1} />
              )}
            </>
          )
          if (!onToggle) return <g key={i}>{bar}</g>
          return (
            <g
              key={i}
              role="button"
              tabIndex={0}
              aria-label={`${clock(m.start)} to ${clock(m.end)}, ${what}. ${isCancelled ? 'Put it back' : 'Cancel it'}`}
              aria-pressed={isCancelled}
              onClick={() => onToggle(i)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return
                event.preventDefault()
                onToggle(i)
              }}
              className="cursor-pointer outline-none [&:focus-visible>rect]:stroke-sage [&:focus-visible>rect]:[stroke-width:2.5]"
            >
              {/* A taller target than the bar, for a finger */}
              <rect x={x(m.start)} y={y - 4} width={x(m.end) - x(m.start)} height={BAR + 8} className="fill-transparent" />
              {bar}
            </g>
          )
        })}

        {/* The reveal: when the room is free again after each booking */}
        {named &&
          booked.map((pick, k) => {
            const end = day[pick.take].end
            return (
              <g key={pick.take}>
                <line x1={x(end)} x2={x(end)} y1={axis - 6} y2={axis + 22} className="stroke-sage" strokeWidth={1.5} />
                <text x={x(end) - 3} y={axis + 34} textAnchor="end" className="fill-sage font-mono text-[11px]">
                  f{k + 1}
                </text>
              </g>
            )
          })}

        {best && (
          <g>
            <text x={LEFT} y={height - 24} className="fill-zinc-400 font-mono text-[10px] uppercase tracking-widest">
              Most that fit · {fit.length}
            </text>
            {fit.map((i) => (
              <rect
                key={i}
                x={x(day[i].start) + 1}
                y={height - 16}
                width={x(day[i].end) - x(day[i].start) - 2}
                height={10}
                rx={2}
                className="fill-none stroke-sage"
                strokeWidth={1.2}
              />
            ))}
          </g>
        )}
      </svg>
    </div>
  )
}
