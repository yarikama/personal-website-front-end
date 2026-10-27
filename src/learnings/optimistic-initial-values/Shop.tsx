import { useRef, useState } from 'react'
import { useAnimationFrame } from 'motion/react'
import { usePrefersReducedMotion } from '../../hooks'
import { FLAVOURS, HOPE, ratingsAfter, scoopsIn, USUALLY, type Visit } from './model'

const WIDTH = 640
const HEIGHT = 302
const COLUMN = 100
const BAR = 40
// A rating of 10 at the top of the bars, 0 at the bottom
const TOP_Y = 48
const BASE_Y = 214
const at = (flavour: number) => 20 + COLUMN / 2 + flavour * COLUMN
const level = (rating: number) => BASE_Y - (rating / 10) * (BASE_Y - TOP_Y)

// Within one visit: the scoop shows up, then the rating falls toward it
const TASTED = 0.3
const FALLEN = 0.8
const ease = (t: number) => t * t * (3 - 2 * t)

interface ShopProps {
  visits: Visit[]
  // The visits to play, from `from` (already over when the figure opens) up
  // to `to`, at `pace` ms a visit
  from: number
  to: number
  pace: number
  // Show each flavour's usual standard, which you can't see
  truth?: boolean
  // Name things the way a learning program would: arms and estimates
  named?: boolean
}

// The six flavours at the counter, each with a bar for how highly you rate
// it, starting at the 10 you imagined. On each visit you order the
// top-rated one; its scoop shows up as a mark on its bar, and the bar
// falls halfway toward it. It plays as soon as it is shown; with reduced
// motion it shows the end.
export default function Shop({ visits, from, to, pace, truth = false, named = false }: ShopProps) {
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
  // The visit under way, or the last one once the run is over
  const current = over < to ? over : to - 1
  const progress = over < to ? now - over : 1
  const visit = current >= 0 ? visits[current] : null
  // A figure that plays nothing shows no scoop
  const scooped = visit !== null && from < to

  const ratings = ratingsAfter(visits, Math.max(0, current))
  if (visit) {
    const fall = ease(Math.min(1, Math.max(0, (progress - TASTED) / (FALLEN - TASTED))))
    ratings[visit.flavour] = visit.before + (visit.after - visit.before) * fall
  }
  const scoops = scoopsIn(visits, Math.max(0, current) + (visit && progress >= TASTED ? 1 : 0))
  const shown = visit ? current + 1 : 0

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 font-mono text-[0.8rem] uppercase tracking-widest">
        <span className="text-zinc-faded">
          {named ? 'A greedy learner' : 'You'}
          {visit && (
            <>
              {' '}
              · {named ? 'Step' : 'Visit'} {shown} ·{' '}
              <span className="text-sage">{named ? `Arm ${visit.flavour + 1}` : FLAVOURS[visit.flavour]}</span>
            </>
          )}
        </span>
        <span className="text-zinc-faded">
          Random picks <span className="text-ink">none</span>
        </span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-2 w-full"
        role="img"
        aria-label="Six flavours, each with a bar for how highly you rate it, falling as each one is tasted"
      >
        {/* The 10 you imagined, before tasting anything */}
        <line
          x1={20}
          x2={WIDTH - 20}
          y1={level(HOPE)}
          y2={level(HOPE)}
          className="stroke-zinc-400"
          strokeDasharray="3 4"
        />
        <line x1={20} x2={WIDTH - 20} y1={BASE_Y} y2={BASE_Y} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
        {FLAVOURS.map((name, i) => {
          const x = at(i)
          const ordering = visit?.flavour === i && progress < 1
          const chosen = visit?.flavour === i
          return (
            <g key={name}>
              <text x={x} y={26} textAnchor="middle" className={`font-mono text-[15px] uppercase ${chosen ? 'fill-sage' : 'fill-ink'}`}>
                {named ? `Arm ${i + 1}` : name}
              </text>
              <rect
                x={x - BAR / 2}
                y={level(ratings[i])}
                width={BAR}
                height={BASE_Y - level(ratings[i])}
                className={chosen ? 'fill-sage/30 stroke-sage' : 'fill-zinc-300/50 stroke-zinc-400 dark:fill-zinc-200/15'}
                strokeWidth={ordering ? 2 : 1}
              />
              {truth && (
                <line
                  x1={x - BAR / 2 - 6}
                  x2={x + BAR / 2 + 6}
                  y1={level(USUALLY[i])}
                  y2={level(USUALLY[i])}
                  className="stroke-ink"
                  strokeWidth={1.5}
                  strokeDasharray="2 2"
                />
              )}
              <text
                x={x}
                y={248}
                textAnchor="middle"
                className={`font-serif text-[32px] tabular-nums ${chosen ? 'fill-sage' : 'fill-ink'}`}
              >
                {ratings[i] === HOPE ? '10' : ratings[i].toFixed(1)}
              </text>
              <text x={x} y={270} textAnchor="middle" className="fill-zinc-faded font-mono text-[14px] uppercase">
                {scoops[i] === 0 ? 'untried' : `${scoops[i]} ${named ? (scoops[i] === 1 ? 'pull' : 'pulls') : scoops[i] === 1 ? 'scoop' : 'scoops'}`}
              </text>
              {truth && (
                <text x={x} y={292} textAnchor="middle" className="fill-ink font-mono text-[14px] uppercase">
                  {named ? 'mean' : 'usually'} {USUALLY[i]}
                </text>
              )}
            </g>
          )
        })}

        {/* This visit's scoop: how it tasted, as a mark on its bar */}
        {scooped && progress >= 0.05 && (
          <g style={{ opacity: Math.min(1, (progress - 0.05) / 0.15) }}>
            <line
              x1={at(visit.flavour) - BAR / 2 - 8}
              x2={at(visit.flavour) + BAR / 2 + 8}
              y1={level(visit.taste)}
              y2={level(visit.taste)}
              className="stroke-ink"
              strokeWidth={3}
            />
            <text
              x={at(visit.flavour) + BAR / 2 + 11}
              y={level(visit.taste) + 4}
              className="fill-ink font-mono text-[14px]"
            >
              {visit.taste.toFixed(1)}
            </text>
          </g>
        )}
        <text x={18} y={level(HOPE) - 6} className="fill-zinc-400 font-mono text-[11px] uppercase tracking-widest">
          {named ? 'Starting estimate 10' : 'Imagined 10'}
        </text>
      </svg>
    </div>
  )
}
