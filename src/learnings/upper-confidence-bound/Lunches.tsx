import { useRef, useState } from 'react'
import { useAnimationFrame } from 'motion/react'
import { usePrefersReducedMotion } from '../../hooks'
import { SPOT_MEANS, SPOTS, standing, STORY_C, type Lunch } from './model'

const WIDTH = 640
const HEIGHT = 320
const at = (spot: number) => 95 + spot * 150
// A rating of 10 at TOP, 0 at FLOOR
const TOP = 24
const FLOOR = 244
const y = (rating: number) => FLOOR - (Math.max(0, Math.min(10.4, rating)) / 10) * (FLOOR - TOP)
const lerp = (a: number, b: number, k: number) => a + (b - a) * k

interface LunchesProps {
  record: Lunch[]
  // The lunches to play, from `from` (already eaten when the figure opens)
  // up to `to`, at `pace` ms a lunch
  from: number
  to: number
  pace: number
  // Draw each spot's bar of doubt; 'grow' grows them in
  bars?: boolean | 'grow'
  // One spot to watch: the others fade
  focus?: number
  // Show each spot's usual standard, which you can't see
  truth?: boolean
  // The reveal: spots become arms, and the bar's parts get their names
  named?: boolean
}

// Four lunch spots, each drawn as its score (the dot: the average of your
// lunches there) and a bar of how much better or worse it might really be.
// The next lunch goes where a bar reaches highest. Plays as soon as it is
// shown; with reduced motion it shows the end.
export default function Lunches({ record, from, to, pace, bars = true, focus, truth = false, named = false }: LunchesProps) {
  const reducedMotion = usePrefersReducedMotion()
  const started = useRef<number | null>(null)
  const span = Math.max(to - from, bars === 'grow' ? 1 : 0)
  const [played, setPlayed] = useState(reducedMotion ? span : 0)

  useAnimationFrame((time) => {
    if (played >= span) return
    started.current ??= time
    setPlayed(Math.min(span, (time - started.current) / pace))
  })

  const now = Math.min(to, from + played)
  const over = Math.floor(now)
  const progress = now - over
  // The lunch under way: you walk there, then its rating moves the score
  const today = over < to ? over : null
  const settle = today === null ? 0 : Math.min(1, Math.max(0, (progress - 0.45) / 0.4))
  const before = standing(record, over, STORY_C)
  const after = today === null ? before : standing(record, over + 1, STORY_C)
  const grown = bars === 'grow' ? Math.min(1, played / span) : bars ? 1 : 0
  const eaten = today !== null && settle > 0 ? over + 1 : over

  // The diner: at the last lunch's spot, walking to today's
  const last = eaten > 0 ? record[eaten - 1] : null
  const walkFrom = today !== null && today > 0 ? at(record[today - 1].spot) : 20
  const diner = today !== null ? lerp(walkFrom, at(record[today].spot), Math.min(1, progress / 0.4)) : last ? at(last.spot) : 20
  const shown = today !== null ? (settle > 0 ? record[today] : null) : last

  const next = settle >= 1 || today === null ? after.next : before.next
  const nextShown = eaten >= SPOTS.length && grown > 0
  // The reveal names the parts on the spot with the longest bar
  const widest = after.doubts.indexOf(Math.max(...after.doubts))

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 font-mono text-[0.8rem] uppercase tracking-widest">
        <span className="shrink-0 text-zinc-faded">
          {named ? `Step t = ${Math.max(1, eaten)}` : `Lunch ${Math.max(1, eaten)} · week ${Math.ceil(Math.max(1, eaten) / 5)}`}
        </span>
        <span className="text-right text-zinc-faded">
          {nextShown && (
            <>
              {named ? 'Next pull' : 'Next lunch'}{' '}
              <span className="text-sage">{named ? `arm ${next + 1}` : SPOTS[next]}</span>
            </>
          )}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-2 w-full"
        role="img"
        aria-label="Four lunch spots, each with its score and a bar of how much better or worse it might really be"
      >
        {[0, 5, 10].map((rating) => (
          <g key={rating}>
            <line
              x1={18}
              x2={WIDTH - 8}
              y1={y(rating)}
              y2={y(rating)}
              className="stroke-zinc-200 dark:stroke-zinc-200/10"
              strokeDasharray={rating === 0 ? undefined : '2 4'}
            />
            <text x={10} y={y(rating) + 4} textAnchor="middle" className="fill-zinc-400 font-mono text-[11px]">
              {rating}
            </text>
          </g>
        ))}

        {SPOTS.map((name, i) => {
          const x = at(i)
          const tried = after.visits[i] > 0 && (before.visits[i] > 0 || settle > 0)
          // Fade a spot's numbers in on its first lunch
          const k = before.visits[i] > 0 ? settle : 1
          const score = before.visits[i] > 0 ? lerp(before.scores[i], after.scores[i], settle) : after.scores[i]
          const doubt =
            before.visits[i] > 0 ? lerp(before.doubts[i], after.doubts[i], settle) : after.doubts[i]
          const visits = settle > 0 ? after.visits[i] : before.visits[i]
          const faded = focus !== undefined && focus !== i
          const isNext = nextShown && next === i
          return (
            <g key={name} opacity={faded ? 0.35 : 1}>
              {tried && grown > 0 && Number.isFinite(doubt) && (
                <>
                  <rect
                    x={x - 10}
                    width={20}
                    y={y(score + doubt * grown)}
                    height={Math.max(0, y(score - doubt * grown) - y(score + doubt * grown))}
                    className="fill-sage/25"
                  />
                  <line
                    x1={x - 24}
                    x2={x + 24}
                    y1={y(score + doubt * grown)}
                    y2={y(score + doubt * grown)}
                    className={isNext ? 'stroke-sage' : 'stroke-zinc-400'}
                    strokeWidth={isNext ? 3.5 : 2}
                  />
                </>
              )}
              {tried && (
                <g opacity={before.visits[i] > 0 ? 1 : Math.max(0.2, k)}>
                  <circle cx={x} cy={y(score)} r={7} className="fill-ink" />
                  <text x={x - 16} y={y(score) + 6} textAnchor="end" className="fill-ink font-serif text-[20px]">
                    {score.toFixed(1)}
                  </text>
                </g>
              )}
              {truth && (
                <g>
                  <line
                    x1={x + 12}
                    x2={x + 30}
                    y1={y(SPOT_MEANS[i])}
                    y2={y(SPOT_MEANS[i])}
                    className="stroke-ink"
                    strokeWidth={1.5}
                    strokeDasharray="3 2"
                  />
                  <text x={x + 34} y={y(SPOT_MEANS[i]) + 4} className="fill-zinc-faded font-mono text-[11px] uppercase">
                    usually {SPOT_MEANS[i]}
                  </text>
                </g>
              )}
              {named && i === widest && (
                <>
                  <text
                    x={x}
                    y={y(score + doubt) - 10}
                    textAnchor="middle"
                    className="fill-sage font-mono text-[12px]"
                  >
                    Q + c√(ln t / N)
                  </text>
                  <text x={x + 14} y={y(score) + 4} className="fill-ink font-mono text-[12px]">
                    Q
                  </text>
                </>
              )}
              <text
                x={x}
                y={FLOOR + 46}
                textAnchor="middle"
                className={`font-mono text-[15px] uppercase ${shown?.spot === i ? 'fill-sage' : 'fill-ink'}`}
              >
                {named ? `Arm ${i + 1}` : name}
              </text>
              <text x={x} y={FLOOR + 66} textAnchor="middle" className="fill-zinc-faded font-mono text-[13px] uppercase">
                {visits === 0
                  ? 'not tried'
                  : named
                    ? `N = ${visits}`
                    : `${visits} ${visits === 1 ? 'lunch' : 'lunches'}`}
              </text>
            </g>
          )
        })}

        {/* You, and today's lunch rating beside you */}
        <circle cx={diner} cy={FLOOR + 18} r={7} className="fill-sage" />
        {shown && (
          <text
            x={diner + (shown.spot === SPOTS.length - 1 ? -14 : 14)}
            y={FLOOR + 23}
            textAnchor={shown.spot === SPOTS.length - 1 ? 'end' : 'start'}
            className="fill-sage font-mono text-[13px]"
          >
            {named ? `R = ${shown.rating.toFixed(1)}` : `today ${shown.rating.toFixed(1)}`}
          </text>
        )}
      </svg>
    </div>
  )
}
