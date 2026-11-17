import { lerp, useLoop, usePlay } from '../../components/explain/useLoop'
import { slope1d, STRIDES, VALLEY_L, VALLEY_START, valleyWalk } from './model'

const WIDTH = 560
const HEIGHT = 300
const LEFT = 24
const RIGHT = 536
// The valley floor, and how high the walls reach at the edge of the map
const FLOOR = 262
const TOP = 34
const REACH = 18
// Real milliseconds per stride
const PACE = 480

const x = (w: number) => LEFT + ((w + REACH) / (2 * REACH)) * (RIGHT - LEFT)
const height = (w: number) => (w * w) / (REACH * REACH)
const y = (w: number) => FLOOR - height(w) * (FLOOR - TOP)
const onMap = (w: number) => Math.abs(w) <= REACH

const GROUND = Array.from({ length: 181 }, (_, i) => {
  const w = -REACH + (i / 180) * 2 * REACH
  return `${i ? 'L' : 'M'}${x(w).toFixed(1)},${y(w).toFixed(1)}`
}).join(' ')

// The ground near the walker, which is all the fog lets you see
function underfoot(w: number) {
  const points = Array.from({ length: 21 }, (_, i) => {
    const at = w - 1.6 + (i / 20) * 3.2
    return `${i ? 'L' : 'M'}${x(at).toFixed(1)},${y(at).toFixed(1)}`
  })
  return points.join(' ')
}

// A stride from one spot to the next, as a leap through the air
function lift(a: number, b: number) {
  return Math.min(10 + 0.22 * Math.abs(x(b) - x(a)), Math.min(y(a), y(b)) - 14)
}
function leap(a: number, b: number, t: number) {
  const up = lift(a, b)
  return { px: lerp(x(a), x(b), t), py: lerp(y(a), y(b), t) - up * Math.sin(Math.PI * t) }
}
function leapPath(a: number, b: number) {
  const up = lift(a, b)
  const mx = (x(a) + x(b)) / 2
  const my = (y(a) + y(b)) / 2 - 2 * up
  return `M${x(a).toFixed(1)},${y(a).toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${x(b).toFixed(1)},${y(b).toFixed(1)}`
}

// The tangent under the walker: which way is down, and how steeply
function tangent(w: number) {
  // The valley is (L/2)·w², so its slope is L·w; in the drawing's pixels
  const dx = 1.4
  const x0 = x(w - dx)
  const x1 = x(w + dx)
  const s = (-slope1d(w, VALLEY_L) * (FLOOR - TOP)) / (REACH * REACH) / ((RIGHT - LEFT) / (2 * REACH))
  return { x0, x1, y0: y(w) - s * (x(w) - x0), y1: y(w) + s * (x1 - x(w)) }
}

const metres = (w: number) => `${Math.abs(w).toFixed(2)} m from the bottom`

export type ValleyShow = 'intro' | 'walk' | 'named'

// The story's valley in the fog: the ground shaped like w², a walker
// starting 10 out, and the strides they take, each a set share of how
// steep the ground is underfoot. `show` is 'intro' for the walker alone,
// feeling the slope; 'walk' plays `strides` strides with step size `eta`;
// 'named' plays them with the valley relabelled as a loss. Give it a `key`
// per step, so it plays from the start each time it is shown.
export default function Valley({ show, eta = 0.1, strides = STRIDES }: { show: ValleyShow; eta?: number; strides?: number }) {
  const span = show === 'intro' ? 0 : strides
  const played = usePlay(span, PACE)
  const pulse = useLoop(1600, 0.3)
  return <ValleyScene show={show} eta={eta} span={span} played={played} pulse={pulse} />
}

// The drawing at one moment: `played` strides of `span` done, and the
// walker's ring at `pulse` of its beat
export function ValleyScene({
  show,
  eta,
  span,
  played,
  pulse,
}: {
  show: ValleyShow
  eta: number
  span: number
  played: number
  pulse: number
}) {
  const walk = valleyWalk(eta)
  const named = show === 'named'

  const done = Math.min(span, Math.floor(played))
  const t = played - done
  const here = walk[done]
  const next = walk[Math.min(done + 1, walk.length - 1)]
  const moving = done < span && t > 0
  // Where the walker is drawn: mid-leap, or standing
  const walker = moving ? leap(here, next, t) : { px: x(here), py: y(here) }
  const visible = onMap(here) && (!moving || onMap(next))
  const landed = done < span ? done : span
  const gone = !onMap(walk[landed])
  const lastSeen = walk.slice(0, landed + 1).filter(onMap).length - 1

  const counter = named ? 'Iteration' : 'Stride'
  const status =
    landed === 0 && !moving
      ? named
        ? `w = ${VALLEY_START}`
        : `${VALLEY_START} m out, in fog`
      : named
        ? `w = ${walk[landed].toFixed(2)}`
        : walk[landed] === 0
          ? 'on the bottom'
          : metres(walk[landed])

  const t0 = visible && !moving ? tangent(here) : null
  const ring = 9 + 10 * pulse

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 font-mono text-[0.875rem] uppercase tracking-widest">
        <span className="shrink-0 text-zinc-faded">
          {show === 'intro' ? 'Before the first stride' : (
            <>
              {counter} <span className="text-ink tabular-nums">{landed}</span> of {span}
            </>
          )}
        </span>
        <span className={`text-right tabular-nums ${gone ? 'text-ink' : 'text-sage-ink'}`}>{status}</span>
      </div>
      <p className="mt-1 font-mono text-[0.875rem] uppercase tracking-widest text-zinc-faded">
        {show === 'intro'
          ? 'you can feel only the slope underfoot'
          : named
            ? `step size η = ${eta}`
            : `stride = ${eta} × steepness`}
      </p>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-2 w-full"
        role="img"
        aria-label={
          show === 'intro'
            ? 'A valley shaped like a bowl, hidden in fog, with a walker 10 metres from the bottom feeling the slope under their feet'
            : `A walker in a bowl-shaped valley taking strides of ${eta} times the steepness, starting 10 from the bottom; after ${landed} strides they are ${Math.abs(walk[landed]).toFixed(2)} from the bottom`
        }
      >
        {/* The valley, mostly lost in the fog */}
        <path d={GROUND} className="fill-none stroke-zinc-300 dark:stroke-zinc-200/25" strokeWidth={1.5} strokeDasharray="3 5" />
        <line x1={x(0)} x2={x(0)} y1={FLOOR + 6} y2={FLOOR + 14} className="stroke-zinc-400" strokeWidth={1.5} />
        <text x={x(0)} y={FLOOR + 30} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
          {named ? 'Lowest loss' : 'Bottom'}
        </text>
        {named && (
          <>
            <text x={RIGHT} y={FLOOR + 30} textAnchor="end" className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
              Weight w →
            </text>
            <text x={LEFT} y={TOP - 14} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
              ↑ Loss f(w)
            </text>
          </>
        )}

        {/* The strides taken so far, and where each landed */}
        {walk.slice(0, landed + 1).map((w, k) => {
          const after = walk[k + 1]
          return (
            <g key={k}>
              {k < landed && onMap(w) && onMap(after) && after !== w && (
                <path d={leapPath(w, after)} className="fill-none stroke-sage" strokeWidth={1.5} strokeDasharray="4 4" />
              )}
              {onMap(w) && k < landed && <circle cx={x(w)} cy={y(w)} r={4} className="fill-zinc-400" />}
            </g>
          )
        })}

        {/* The ground the walker can see */}
        {visible && !moving && <path d={underfoot(here)} className="fill-none stroke-ink" strokeWidth={2} />}

        {/* The slope underfoot */}
        {t0 && (
          <g>
            <line x1={t0.x0} x2={t0.x1} y1={t0.y0} y2={t0.y1} className="stroke-sage" strokeWidth={2.5} />
            {show === 'intro' && (
              <text
                x={x(here)}
                y={Math.min(t0.y0, t0.y1) - 14}
                textAnchor="middle"
                className="fill-sage-ink font-mono text-[11px] uppercase tracking-widest"
              >
                Slope underfoot
              </text>
            )}
            {named && (
              <text
                x={here >= 0 ? t0.x1 + 8 : t0.x0 - 8}
                y={(here >= 0 ? t0.y1 : t0.y0) - 4}
                textAnchor={here >= 0 ? 'start' : 'end'}
                className="fill-sage-ink font-mono text-[11px] uppercase tracking-widest"
              >
                Gradient
              </text>
            )}
          </g>
        )}

        {visible && (
          <g>
            {show === 'intro' && <circle cx={walker.px} cy={walker.py} r={ring} className="fill-none stroke-sage" strokeWidth={1} />}
            <circle cx={walker.px} cy={walker.py} r={8} className="fill-sage" />
          </g>
        )}

        {/* Climbing off the map: the walk goes on out of sight */}
        {gone && lastSeen >= 0 && (
          <g>
            <text
              x={walk[lastSeen] < 0 ? RIGHT : LEFT}
              y={TOP + 4}
              textAnchor={walk[lastSeen] < 0 ? 'end' : 'start'}
              className="fill-ink font-mono text-[11px] uppercase tracking-widest"
            >
              {walk[lastSeen] < 0 ? 'Off the map →' : '← Off the map'}
            </text>
          </g>
        )}

        {named && landed > 0 && onMap(walk[0]) && onMap(walk[1]) && (
          <text
            x={(x(walk[0]) + x(walk[1])) / 2}
            y={(y(walk[0]) + y(walk[1])) / 2 - lift(walk[0], walk[1]) - 10}
            textAnchor="middle"
            className="fill-sage-ink font-mono text-[11px] uppercase tracking-widest"
          >
            η × gradient
          </text>
        )}
      </svg>
    </div>
  )
}
