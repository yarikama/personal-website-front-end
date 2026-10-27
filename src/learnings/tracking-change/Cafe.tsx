import { useRef, useState } from 'react'
import { useAnimationFrame } from 'motion/react'
import { usePrefersReducedMotion } from '../../hooks'
import { FRIEND_STEP, GOOD, OLD_VISITS, weights } from './model'

const WIDTH = 640
const LEFT = 36
const RIGHT = 616
const TOP = 26
const BOTTOM = 226
// Under the chart, in the reveal: what each visit weighs in each score now
const STRIP_TOP = 290
const STRIP_BOTTOM = 346

interface CafeProps {
  ratings: number[]
  yours: number[]
  hers: number[]
  // The visits to play, from `from` (already over when the figure opens) up
  // to `to`, at `pace` ms a visit
  from: number
  to: number
  pace: number
  // Draw the friend's score too
  friend?: boolean
  // Name the parts as the system's, and show what each visit weighs
  reveal?: boolean
}

// A café's visits on a line, each a dot at its rating out of 10, with the
// score kept after each: yours (the plain average) and, once she is in the
// story, your friend's (a fifth of the way each visit). It plays as soon as
// it is shown; with reduced motion it shows the end.
export default function Cafe({ ratings, yours, hers, from, to, pace, friend = false, reveal = false }: CafeProps) {
  const reducedMotion = usePrefersReducedMotion()
  const started = useRef<number | null>(null)
  const [played, setPlayed] = useState(reducedMotion ? to - from : 0)

  useAnimationFrame((time) => {
    if (played >= to - from) return
    started.current ??= time
    setPlayed(Math.min(to - from, (time - started.current) / pace))
  })

  const total = ratings.length
  const x = (visit: number) => LEFT + ((visit + 0.5) / total) * (RIGHT - LEFT)
  const y = (rating: number) => BOTTOM - (rating / 10) * (BOTTOM - TOP)

  // Visits over, and how far the line has grown toward the next
  const now = from + played
  const shown = Math.floor(now)
  const growing = now - shown

  // A score's line through the visits over, growing toward the next one
  const line = (score: number[]) => {
    const points = score.slice(0, shown).map((value, i) => [x(i), y(value)])
    if (shown > 0 && shown < total && growing > 0) {
      const [px, py] = points[shown - 1]
      points.push([px + (x(shown) - px) * growing, py + (y(score[shown]) - py) * growing])
    }
    return points.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ')
  }

  // Where a score first came down to GOOD after the chef changed, if it has by now
  const fell = (score: number[]) => {
    const i = score.findIndex((value, visit) => visit >= OLD_VISITS && value <= GOOD)
    return i !== -1 && i < shown ? i : null
  }
  const yourFall = fell(yours)
  const herFall = friend ? fell(hers) : null
  const changed = shown > OLD_VISITS || (shown === OLD_VISITS && growing > 0)
  const last = Math.max(0, shown - 1)

  const mine = weights('average', total)
  const theirs = weights(FRIEND_STEP, total)
  const strip = (weight: number) => (weight / FRIEND_STEP) * (STRIP_BOTTOM - STRIP_TOP)
  const height = reveal ? 368 : 252

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 font-mono text-[0.8rem] uppercase tracking-widest">
        <span className="shrink-0 text-zinc-faded">
          {reveal ? 'Step' : 'Visit'} {Math.max(1, shown)}
        </span>
        <span className="flex gap-4 text-zinc-faded">
          {shown > 0 && (
            <span>
              {reveal ? 'Average' : 'Yours'} <span className="text-ink">{yours[last].toFixed(1)}</span>
            </span>
          )}
          {friend && shown > 0 && (
            <span>
              {reveal ? `Step ${FRIEND_STEP}` : 'Hers'} <span className="text-sage">{hers[last].toFixed(1)}</span>
            </span>
          )}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        className="mt-2 w-full"
        role="img"
        aria-label="Visits to a café, each rated out of 10, with the score kept after each"
      >
        {[2, 4, 6, 8, 10].map((rating) => (
          <g key={rating}>
            <line
              x1={LEFT}
              x2={RIGHT}
              y1={y(rating)}
              y2={y(rating)}
              className={rating === GOOD ? 'stroke-zinc-400 dark:stroke-zinc-200/40' : 'stroke-zinc-200 dark:stroke-zinc-200/10'}
              strokeDasharray={rating === GOOD ? '4 4' : undefined}
            />
            <text x={LEFT - 8} y={y(rating) + 4} textAnchor="end" className="fill-zinc-400 font-mono text-[11px]">
              {rating}
            </text>
          </g>
        ))}
        <text x={LEFT + 6} y={y(GOOD) + 16} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
          Still good above {GOOD}
        </text>
        <text x={LEFT} y={TOP - 12} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
          {reveal ? 'Reward' : 'Rating'}
        </text>

        {/* The new chef */}
        {changed && (
          <g>
            <line
              x1={(x(OLD_VISITS - 1) + x(OLD_VISITS)) / 2}
              x2={(x(OLD_VISITS - 1) + x(OLD_VISITS)) / 2}
              y1={TOP - 4}
              y2={BOTTOM}
              className="stroke-ink"
              strokeDasharray="2 4"
            />
            <text
              x={(x(OLD_VISITS - 1) + x(OLD_VISITS)) / 2 + 6}
              y={TOP + 6}
              className="fill-ink font-mono text-[11px] uppercase tracking-widest"
            >
              {reveal ? 'The world changes' : 'New chef'}
            </text>
          </g>
        )}

        {/* Each visit's rating */}
        {ratings.slice(0, Math.min(total, shown + (growing > 0.5 ? 1 : 0))).map((rating, i) => (
          <circle key={i} cx={x(i)} cy={y(rating)} r={3.5} className="fill-zinc-400 dark:fill-zinc-500" />
        ))}

        <path d={line(yours)} fill="none" className="stroke-ink" strokeWidth={2.5} strokeLinejoin="round" />
        {friend && <path d={line(hers)} fill="none" className="stroke-sage" strokeWidth={2.5} strokeLinejoin="round" />}

        {/* Where each score came down to GOOD, and after how many bad visits */}
        {herFall !== null && (
          <g>
            <line x1={x(herFall)} x2={x(herFall)} y1={y(hers[herFall]) + 5} y2={BOTTOM - 16} className="stroke-sage" strokeDasharray="2 3" />
            <circle cx={x(herFall)} cy={y(hers[herFall])} r={5} className="fill-paper stroke-sage" strokeWidth={2} />
            <text x={x(herFall)} y={BOTTOM - 4} textAnchor="middle" className="fill-sage font-mono text-[11px] uppercase tracking-widest">
              After {herFall - OLD_VISITS + 1}
            </text>
          </g>
        )}
        {yourFall !== null && (
          <g>
            <line x1={x(yourFall)} x2={x(yourFall)} y1={y(yours[yourFall]) + 5} y2={BOTTOM - 16} className="stroke-ink" strokeDasharray="2 3" />
            <circle cx={x(yourFall)} cy={y(yours[yourFall])} r={5} className="fill-paper stroke-ink" strokeWidth={2} />
            <text x={x(yourFall)} y={BOTTOM - 4} textAnchor="middle" className="fill-ink font-mono text-[11px] uppercase tracking-widest">
              After {yourFall - OLD_VISITS + 1}
            </text>
          </g>
        )}

        <text x={(LEFT + RIGHT) / 2} y={BOTTOM + 20} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
          {reveal ? 'Each step, a reward and a new estimate' : 'Each visit, its rating and the score after it'}
        </text>

        {/* What each visit weighs in each score after the last one */}
        {reveal && (
          <g>
            <text x={LEFT} y={STRIP_TOP - 12} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
              What each reward weighs in the estimate now
            </text>
            <line x1={LEFT} x2={RIGHT} y1={STRIP_BOTTOM} y2={STRIP_BOTTOM} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
            {ratings.map((_, i) => (
              <g key={i}>
                <rect
                  x={x(i) - 4}
                  y={STRIP_BOTTOM - strip(mine.rewards[i])}
                  width={3.5}
                  height={strip(mine.rewards[i])}
                  className="fill-ink"
                />
                <rect
                  x={x(i) + 0.5}
                  y={STRIP_BOTTOM - strip(theirs.rewards[i])}
                  width={3.5}
                  height={strip(theirs.rewards[i])}
                  className="fill-sage"
                />
              </g>
            ))}
            <text x={RIGHT} y={STRIP_BOTTOM + 16} textAnchor="end" className="fill-sage font-mono text-[11px] uppercase tracking-widest">
              Newest {Math.round(FRIEND_STEP * 100)}%
            </text>
            <text x={LEFT} y={STRIP_BOTTOM + 16} className="fill-ink font-mono text-[11px] uppercase tracking-widest">
              Average: each 1/{total}
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}
