import { useRef, useState } from 'react'
import { useAnimationFrame } from 'motion/react'
import { usePrefersReducedMotion } from '../../hooks'
import { favourite, ON_TIME, onTimeCount, percent, ROUTES, SKIES, tables, type Commute as Run, type Score } from './model'

const WIDTH = 640
const HEIGHT = 262
const TODAY_X = 95
// A table is wider alone, with room for how each route truly does
const TABLE_W = 208
const WIDE_W = 290
const ROW_H = 58
const ROW_Y = (row: number) => 36 + row * (ROW_H + 6)
const STRIP_Y = 236

// A sun, or a cloud with rain, centred on (x, y)
function Sky({ sky, x, y, dim }: { sky: number; x: number; y: number; dim: boolean }) {
  const tone = dim ? 'fill-zinc-300 stroke-zinc-300 dark:fill-zinc-200/25 dark:stroke-zinc-200/25' : 'fill-ink stroke-ink'
  if (sky === 0) {
    return (
      <g className={tone}>
        <circle cx={x} cy={y} r={12} />
        {Array.from({ length: 8 }, (_, i) => {
          const angle = (i * Math.PI) / 4
          return (
            <line
              key={i}
              x1={x + 17 * Math.cos(angle)}
              y1={y + 17 * Math.sin(angle)}
              x2={x + 24 * Math.cos(angle)}
              y2={y + 24 * Math.sin(angle)}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
          )
        })}
      </g>
    )
  }
  return (
    <g className={tone}>
      <circle cx={x - 12} cy={y - 2} r={10} stroke="none" />
      <circle cx={x + 1} cy={y - 10} r={13} stroke="none" />
      <circle cx={x + 14} cy={y - 2} r={10} stroke="none" />
      <rect x={x - 12} y={y - 2} width={26} height={10} stroke="none" />
      {[-9, 1, 11].map((dx) => (
        <line key={dx} x1={x + dx} y1={y + 14} x2={x + dx - 4} y2={y + 24} strokeWidth={2.5} strokeLinecap="round" />
      ))}
    </g>
  )
}

interface TableProps {
  x: number
  width: number
  title: string
  scores: Score[]
  // The row being scored this morning, if any
  today: number | null
  // Under each route, how it really does in each sky
  truth: boolean
  bandit: boolean
}

// A table of scores: each route's share of mornings on time, the favourite
// shaded
function Table({ x, width, title, scores, today, truth, bandit }: TableProps) {
  const best = favourite(scores)
  return (
    <g>
      <text x={x + width / 2} y={22} textAnchor="middle" className="fill-zinc-faded font-mono text-[13px] uppercase tracking-widest">
        {title}
      </text>
      {ROUTES.map((route, r) => {
        const y = ROW_Y(r)
        const score = scores[r]
        const isBest = best === r
        return (
          <g key={route}>
            <rect
              x={x}
              y={y}
              width={width}
              height={ROW_H}
              className={isBest ? 'fill-sage/15 stroke-sage' : 'fill-paper stroke-zinc-300 dark:stroke-zinc-200/25'}
              strokeWidth={today === r ? 3 : 1.5}
            />
            <text x={x + 12} y={y + 22} className={`font-mono text-[15px] uppercase ${isBest ? 'fill-sage' : 'fill-ink'}`}>
              {route}
            </text>
            <text x={x + 12} y={y + (truth ? 37 : 42)} className="fill-zinc-faded font-mono text-[13px]">
              {score.rides === 0 ? 'not ridden' : `${score.onTime} of ${score.rides} on time`}
            </text>
            {truth && (
              <text x={x + 12} y={y + 52} className="fill-zinc-400 font-mono text-[12px]">
                truly: dry {percent(ON_TIME[0][r])}, rain {percent(ON_TIME[1][r])}
              </text>
            )}
            <text
              x={x + width - 12}
              y={y + 40}
              textAnchor="end"
              className={`font-serif text-[30px] ${score.rides ? (isBest ? 'fill-sage' : 'fill-ink') : 'fill-zinc-400'}`}
            >
              {score.rides ? percent(score.onTime / score.rides) : '?'}
            </text>
          </g>
        )
      })}
      {bandit && (
        <text x={x + width / 2} y={ROW_Y(2) + 12} textAnchor="middle" className="fill-sage font-mono text-[13px] uppercase tracking-widest">
          A bandit of its own
        </text>
      )}
    </g>
  )
}

interface CommuteProps {
  run: Run
  // The mornings to play, from `from` (already over when the figure opens)
  // up to `to`, at `pace` ms a morning
  from: number
  to: number
  pace: number
  // Show how each route really does in each sky
  truth?: boolean
  // Name the parts: situation, action, policy, a bandit per situation
  named?: boolean
}

// Mornings going to work: today's sky (checked or not), the route taken and
// whether it was on time, and the tables of scores filling in. Below, every
// morning so far, on time or late. Plays as soon as it is shown; with
// reduced motion it shows the end.
export default function Commute({ run, from, to, pace, truth = false, named = false }: CommuteProps) {
  const reducedMotion = usePrefersReducedMotion()
  const started = useRef<number | null>(null)
  const [played, setPlayed] = useState(reducedMotion ? to - from : 0)

  useAnimationFrame((time) => {
    if (played >= to - from) return
    started.current ??= time
    setPlayed(Math.min(to - from, (time - started.current) / pace))
  })

  const now = from + played
  const over = Math.floor(now)
  const underWay = over < to
  const progress = now - over
  // Today's result is in halfway through the morning
  const counted = underWay && progress > 0.5 ? over + 1 : over
  const today = run.mornings[underWay ? over : to - 1]
  const scored = !underWay || progress > 0.5

  const { look } = run
  const kept = tables(run, counted)
  const xs = look ? [206, 428] : [420 - WIDE_W / 2]
  const width = look ? TABLE_W : WIDE_W
  const rule = kept.map(favourite)
  const ruled = rule.every((route) => route !== null)
  const said = (route: number | null) => ROUTES[route ?? 0].toLowerCase()
  const onTime = onTimeCount(run, counted)
  const cell = WIDTH / run.mornings.length

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 font-mono text-[0.8rem] uppercase tracking-widest">
        <span className="text-zinc-faded">
          {look ? 'Looking first' : 'Never looking'} · Morning {Math.max(1, counted)}
        </span>
        <span className="shrink-0 text-right text-zinc-faded">
          {counted > 0 && (
            <>
              On time <span className="text-ink">{onTime}</span> of {counted}
            </>
          )}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-3 w-full"
        role="img"
        aria-label={
          look
            ? 'Going to work by bike or train, checking the sky first, with a table of scores for dry mornings and one for rainy mornings'
            : 'Going to work by bike or train without checking the sky, with one table of scores for both routes'
        }
      >
        {/* Today: the sky, the route and how it went */}
        <text x={TODAY_X} y={22} textAnchor="middle" className="fill-zinc-faded font-mono text-[13px] uppercase tracking-widest">
          {named ? 'Situation' : 'Today’s sky'}
        </text>
        <Sky sky={today.sky} x={TODAY_X} y={62} dim={!look} />
        <text
          x={TODAY_X}
          y={110}
          textAnchor="middle"
          className={look ? 'fill-ink font-serif text-[22px]' : 'fill-zinc-400 font-mono text-[13px] uppercase tracking-widest'}
        >
          {look ? SKIES[today.sky] : 'not checked'}
        </text>
        <text x={TODAY_X} y={142} textAnchor="middle" className="fill-zinc-faded font-mono text-[13px] uppercase tracking-widest">
          {named ? 'Action' : 'You take'}
        </text>
        <text x={TODAY_X} y={174} textAnchor="middle" className="fill-ink font-serif text-[30px]">
          {ROUTES[today.route]}
        </text>
        {scored && (
          <text
            x={TODAY_X}
            y={198}
            textAnchor="middle"
            className={`font-mono text-[13px] uppercase tracking-widest ${today.onTime ? 'fill-sage' : 'fill-ink'}`}
          >
            {today.onTime ? 'On time' : 'Late'}
          </text>
        )}
        <line x1={190} x2={190} y1={8} y2={204} className="stroke-zinc-300 dark:stroke-zinc-200/25" />

        {/* The tables of scores */}
        {kept.map((scores, t) => (
          <Table
            key={t}
            x={xs[t]}
            width={width}
            title={look ? `${SKIES[t] === 'Dry' ? 'Dry' : 'Rainy'} mornings` : 'Every morning'}
            scores={scores}
            today={underWay && scored && (look ? today.sky : 0) === t ? today.route : null}
            truth={truth}
            bandit={named}
          />
        ))}
        {ruled && (
          <text
            x={look ? 422 : xs[0] + WIDE_W / 2}
            y={named ? 204 : 196}
            textAnchor="middle"
            className="fill-sage font-mono text-[13px] uppercase tracking-widest"
          >
            {named ? 'Policy' : 'Your rule'}:{' '}
            {look ? `dry → ${said(rule[0])} · rain → ${said(rule[1])}` : `always the ${said(rule[0])}`}
          </text>
        )}

        {/* Every morning so far: filled on time, hollow late */}
        <text x={0} y={STRIP_Y - 8} className="fill-zinc-faded font-mono text-[12px] uppercase tracking-widest">
          Each morning: filled on time, hollow late
        </text>
        {run.mornings.slice(0, counted).map((morning, i) => (
          <rect
            key={i}
            x={i * cell + 1.5}
            y={STRIP_Y}
            width={cell - 3}
            height={cell - 3}
            className={morning.onTime ? 'fill-sage' : 'fill-none stroke-ink'}
            strokeWidth={1.2}
          />
        ))}
      </svg>
    </div>
  )
}
