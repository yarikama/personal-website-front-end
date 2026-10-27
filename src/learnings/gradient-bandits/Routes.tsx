import { useRef, useState } from 'react'
import { useAnimationFrame } from 'motion/react'
import { usePrefersReducedMotion } from '../../hooks'
import { ROUTES, type Commute } from './model'

const WIDTH = 640
const HEIGHT = 290
const HOME = { x: 40, y: 150 }
const WORK = { x: 318, y: 150 }
const START = 60
const END = 298
// The right-hand panel: one row per route, how often it is taken
const PANEL = 368
const BAR = 256
const ROW_Y = [78, 158, 238]

type Point = { x: number; y: number }

// Each route as points from home to work, so the commuter can be placed by
// how far along it is
const curve = (f: (t: number) => Point, n = 60) => Array.from({ length: n + 1 }, (_, i) => f(i / n))
const PATHS: Point[][] = [
  // The highway arcs over the top
  curve((t) => ({
    x: (1 - t) ** 2 * START + 2 * t * (1 - t) * 179 + t ** 2 * END,
    y: (1 - t) ** 2 * HOME.y + 2 * t * (1 - t) * -16 + t ** 2 * WORK.y,
  })),
  // The river road winds through the middle
  curve((t) => ({ x: START + t * (END - START), y: HOME.y + 16 * Math.sin(t * 4 * Math.PI) })),
  // The back streets turn corner after corner underneath
  [
    { x: START, y: 150 },
    { x: 82, y: 150 },
    { x: 82, y: 222 },
    { x: 148, y: 222 },
    { x: 148, y: 196 },
    { x: 214, y: 196 },
    { x: 214, y: 234 },
    { x: 276, y: 234 },
    { x: 276, y: 150 },
    { x: END, y: 150 },
  ],
]
const LABELS: Point[] = [
  { x: 179, y: 54 },
  { x: 179, y: 122 },
  { x: 179, y: 256 },
]

const lengths = PATHS.map((points) => points.slice(1).map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y)))

// The point `share` of the way along route `route`
function along(route: number, share: number): Point {
  const points = PATHS[route]
  const segments = lengths[route]
  let left = share * segments.reduce((sum, value) => sum + value, 0)
  for (let i = 0; i < segments.length; i++) {
    if (left <= segments[i]) {
      const t = segments[i] ? left / segments[i] : 0
      return { x: points[i].x + (points[i + 1].x - points[i].x) * t, y: points[i].y + (points[i + 1].y - points[i].y) * t }
    }
    left -= segments[i]
  }
  return points.at(-1)!
}

const pathOf = (points: Point[]) => points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
const signed = (value: number, digits = 2) => `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(digits)}`

interface RoutesProps {
  run: Commute
  who: 'You' | 'Your neighbour'
  // Compares each morning with the usual (or counts every minute early as a win)
  baseline: boolean
  // The mornings to play, from `from` (already over when the figure opens)
  // up to `to`, at `pace` ms a morning
  from: number
  to: number
  pace: number
  // Name the parts: arms, preferences, chances, the baseline
  named?: boolean
}

// Three routes from home to work and one commuter taking one each morning.
// Beside them, how strong each habit is and how often it is taken. After
// each trip the habits move, by how the trip compares with the usual.
export default function Routes({ run, who, baseline, from, to, pace, named = false }: RoutesProps) {
  const reducedMotion = usePrefersReducedMotion()
  const started = useRef<number | null>(null)
  const [played, setPlayed] = useState(reducedMotion ? to - from : 0)

  useAnimationFrame((time) => {
    if (played >= to - from) return
    started.current ??= time
    setPlayed(Math.min(to - from, (time - started.current) / pace))
  })

  const now = from + played
  // Mornings fully over, and the one under way with how far it has got
  const over = Math.floor(now)
  const today = over < to ? over : null
  const progress = now - over
  const shown = today ?? Math.max(0, to - 1)
  const morning = to > 0 ? run.mornings[shown] : null
  const arrived = today === null ? to > 0 : progress > 0.55
  // Learned from: the bars move between 0.6 and 0.85 of the morning
  const learned = today === null ? 1 : Math.max(0, Math.min(1, (progress - 0.6) / 0.25))

  const uniform = ROUTES.map(() => 1 / ROUTES.length)
  const flat = ROUTES.map(() => 0)
  const before = shown > 0 ? run.mornings[shown - 1] : null
  const was = { chances: before?.chances ?? uniform, habits: before?.habits ?? flat }
  const after = morning ?? { chances: uniform, habits: flat }
  const chances = was.chances.map((c, i) => c + (after.chances[i] - c) * learned)
  const habits = learned > 0 ? after.habits : was.habits
  const usual = arrived ? morning?.usual : before?.usual

  const commuter = morning
    ? today === null
      ? WORK
      : progress < 0.55
        ? along(morning.route, progress / 0.55)
        : WORK
    : HOME

  const surprise = morning?.surprise ?? 0
  const verdict = !morning
    ? ' '
    : !baseline
      ? `${morning.early} min early · every minute counts as a win`
      : Math.abs(surprise) < 0.05
        ? `${morning.early} min early · the same as usual`
        : `${morning.early} min early · ${Math.abs(surprise).toFixed(1)} ${surprise > 0 ? 'better' : 'worse'} than usual`

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 font-mono text-[0.8rem] uppercase tracking-widest">
        <span className="shrink-0 text-zinc-faded">
          {who} · {to === 0 ? 'Before the first trip' : `Morning ${shown + 1}`}
        </span>
        <span className="text-right text-zinc-faded">
          {usual !== undefined && (
            <>
              {baseline ? (named ? 'Baseline R̄' : 'Usual') : 'Average'}{' '}
              <span className="text-ink">{usual.toFixed(1)}</span> min early
            </>
          )}
        </span>
      </div>
      <div
        className={`mt-2 font-mono text-[0.8rem] uppercase tracking-widest transition-opacity ${
          arrived ? 'opacity-100' : 'opacity-0'
        } ${baseline && surprise < -0.05 ? 'text-ink' : 'text-sage'}`}
      >
        {verdict}
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-2 w-full"
        role="img"
        aria-label={`${who}: three routes to work, and how often each is taken`}
      >
        {/* Home and work */}
        <path
          d={`M${HOME.x - 16},${HOME.y + 14} V${HOME.y - 4} L${HOME.x},${HOME.y - 18} L${HOME.x + 16},${HOME.y - 4} V${HOME.y + 14} Z`}
          className="fill-paper stroke-zinc-400"
          strokeWidth={1.5}
        />
        <text x={HOME.x} y={HOME.y + 32} textAnchor="middle" className="fill-zinc-faded font-mono text-[13px] uppercase tracking-widest">
          Home
        </text>
        <rect x={WORK.x - 16} y={WORK.y - 22} width={32} height={40} className="fill-paper stroke-zinc-400" strokeWidth={1.5} />
        {[0, 1, 2].map((k) => (
          <line
            key={k}
            x1={WORK.x - 9}
            x2={WORK.x + 9}
            y1={WORK.y - 13 + k * 10}
            y2={WORK.y - 13 + k * 10}
            className="stroke-zinc-300 dark:stroke-zinc-200/25"
            strokeWidth={3}
          />
        ))}
        <text x={WORK.x} y={WORK.y + 36} textAnchor="middle" className="fill-zinc-faded font-mono text-[13px] uppercase tracking-widest">
          Work
        </text>

        {/* The routes; the one taken this morning drawn in sage */}
        {PATHS.map((points, i) => {
          const taken = morning?.route === i && today !== null
          return (
            <g key={i}>
              <path
                d={pathOf(points)}
                fill="none"
                className={taken ? 'stroke-sage' : 'stroke-zinc-300 dark:stroke-zinc-600'}
                strokeWidth={taken ? 3 : 2}
                strokeLinejoin="round"
              />
              <text
                x={LABELS[i].x}
                y={LABELS[i].y}
                textAnchor="middle"
                className={`font-mono text-[14px] uppercase tracking-widest ${taken ? 'fill-sage' : 'fill-zinc-faded'}`}
              >
                {ROUTES[i]}
              </text>
            </g>
          )
        })}

        {/* This morning's minutes early, over the office */}
        {arrived && morning && (
          <g>
            <circle cx={WORK.x} cy={WORK.y - 62} r={25} className="fill-paper stroke-sage" strokeWidth={1.5} />
            <text x={WORK.x} y={WORK.y - 60} textAnchor="middle" className="fill-ink font-serif text-[22px]">
              {morning.early}
            </text>
            <text x={WORK.x} y={WORK.y - 47} textAnchor="middle" className="fill-zinc-faded font-mono text-[9px] uppercase">
              min
            </text>
          </g>
        )}
        <circle cx={commuter.x} cy={commuter.y} r={8} className={who === 'You' ? 'fill-ink' : 'fill-sage'} />

        {/* How strong each habit is, and how often it is taken */}
        <text x={PANEL} y={22} className="fill-zinc-faded font-mono text-[13px] uppercase tracking-widest">
          {named ? (
            <>
              Chance <tspan className="normal-case">π</tspan>
            </>
          ) : (
            'How often you take it'
          )}
        </text>
        {ROUTES.map((name, i) => {
          const y = ROW_Y[i]
          const top = chances.indexOf(Math.max(...chances)) === i && to > 0
          const change = morning && learned > 0 ? after.habits[i] - was.habits[i] : 0
          return (
            <g key={name}>
              <text x={PANEL} y={y - 16} className={`font-mono text-[15px] uppercase ${top ? 'fill-sage' : 'fill-ink'}`}>
                {named ? `Arm ${i + 1} · ${name}` : name}
              </text>
              <text x={PANEL + BAR} y={y - 14} textAnchor="end" className={`font-serif text-[22px] ${top ? 'fill-sage' : 'fill-ink'}`}>
                {Math.round(chances[i] * 100)}%
              </text>
              <rect x={PANEL} y={y - 6} width={BAR} height={14} className="fill-zinc-200 dark:fill-zinc-200/10" />
              <rect x={PANEL} y={y - 6} width={BAR * chances[i]} height={14} className="fill-sage" />
              <text x={PANEL} y={y + 28} className="fill-zinc-faded font-mono text-[14px]">
                {named ? 'H' : 'HABIT'} {signed(habits[i])}
                {Math.abs(change) >= 0.005 && (
                  <tspan className={change > 0 ? 'fill-sage' : 'fill-ink'}>
                    {'  '}
                    {change > 0 ? '▲' : '▼'} {signed(change)}
                  </tspan>
                )}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
