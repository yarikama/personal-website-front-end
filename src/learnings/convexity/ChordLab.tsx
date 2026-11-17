import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { usePlay } from '../../components/explain/useLoop'
import { bendsDown, chordGap, descend, DOMAIN, lowest, minima, pokes, trapped, type Landscape } from './model'
import { pile, placer } from './plot'

const WIDTH = 560
const HEIGHT = 330
const BOX = { left: 28, right: 532, top: 64, bottom: 250 }
// The strip under the ground that marks where it bends down
const STRIP = 292
const WALK_MS = 2000
const NUDGE = 0.05

const label = 'font-mono text-[11px] uppercase tracking-widest'
const clamp = (v: number) => Math.max(DOMAIN[0], Math.min(DOMAIN[1], v))

// The lab: the ground for the chosen landscape, a rope whose two ends you
// drag along it (the ground turns ink wherever it stands above the rope),
// a strip under it marking where the ground bends down, and walkers: tap
// the ground to drop one, or drop a crowd from seeded starts.
export default function ChordLab({
  landscape,
  rope,
  onRope,
  walker,
  onWalker,
  crowd,
  run,
}: {
  landscape: Landscape
  rope: [number, number]
  onRope: (rope: [number, number]) => void
  walker: number | null
  onWalker: (start: number) => void
  crowd: number[] | null
  // Changes whenever walkers should set off again
  run: string
}) {
  const svg = useRef<SVGSVGElement>(null)
  const dragging = useRef<0 | 1 | null>(null)
  const place = placer(landscape, BOX)
  const { f } = landscape
  const [a, b] = rope

  const toGround = (event: PointerEvent) => {
    const box = svg.current!.getBoundingClientRect()
    return place.fromX(((event.clientX - box.left) / box.width) * WIDTH)
  }
  const grab = (end: 0 | 1) => (event: PointerEvent) => {
    event.stopPropagation()
    dragging.current = end
    svg.current!.setPointerCapture(event.pointerId)
  }
  const move = (event: PointerEvent) => {
    if (dragging.current === null) return
    const x = toGround(event)
    onRope(dragging.current === 0 ? [x, b] : [a, x])
  }
  const drop = (event: PointerEvent) => {
    if (dragging.current !== null) {
      dragging.current = null
      return
    }
    onWalker(toGround(event))
  }
  const keys = (end: 0 | 1) => (event: KeyboardEvent) => {
    const step = event.key === 'ArrowRight' || event.key === 'ArrowUp' ? NUDGE : event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -NUDGE : 0
    if (!step) return
    event.preventDefault()
    const x = clamp((end === 0 ? a : b) + step)
    onRope(end === 0 ? [x, b] : [a, x])
  }

  const above = pokes(f, a, b)
  const worst = Math.max(0, ...[0.25, 0.5, 0.75].map((t) => chordGap(f, a, b, t)))
  const down = bendsDown(landscape)

  return (
    <svg
      ref={svg}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full touch-none select-none"
      role="img"
      aria-label={`The ground ${landscape.name}, a rope from x = ${a.toFixed(2)} to x = ${b.toFixed(2)}${
        above.length ? ', with the ground above the rope in places' : ', with the ground nowhere above it'
      }`}
      onPointerMove={move}
      onPointerUp={drop}
      onPointerCancel={() => (dragging.current = null)}
    >
      <path d={place.under()} className="fill-zinc-400/10" />
      <path d={place.path()} className="fill-none stroke-zinc-400" strokeWidth={2} />
      {above.map(([from, to]) => (
        <path key={from} d={place.path(from, to, 60)} className="fill-none stroke-ink" strokeWidth={4} strokeLinecap="round" />
      ))}

      {/* The rope */}
      <line
        x1={place.at(a).x}
        y1={place.at(a).y}
        x2={place.at(b).x}
        y2={place.at(b).y}
        className="stroke-sage"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      {[a, b].map((end, i) => (
        <g key={i}>
          <circle
            cx={place.at(end).x}
            cy={place.at(end).y}
            r={11}
            className="cursor-ew-resize fill-paper stroke-sage outline-none focus-visible:stroke-ink"
            strokeWidth={2.5}
            tabIndex={0}
            role="slider"
            aria-label={i === 0 ? 'One end of the rope' : 'The other end of the rope'}
            aria-valuemin={DOMAIN[0]}
            aria-valuemax={DOMAIN[1]}
            aria-valuenow={Number(end.toFixed(2))}
            onPointerDown={grab(i as 0 | 1)}
            onKeyDown={keys(i as 0 | 1)}
          />
        </g>
      ))}
      <text x={BOX.left} y={22} className={`${above.length ? 'fill-ink' : 'fill-sage-ink'} ${label}`}>
        {above.length ? `Ground above the rope, by up to ${worst.toFixed(2)}` : 'Rope on or above the ground'}
      </text>

      {/* Walkers */}
      {crowd ? (
        <Crowd key={`crowd ${run}`} landscape={landscape} starts={crowd} place={place} />
      ) : walker !== null ? (
        <Walker key={`walker ${run}`} landscape={landscape} start={walker} place={place} />
      ) : (
        <text x={BOX.left} y={42} className={`fill-zinc-faded ${label}`}>
          Tap the ground to drop a walker
        </text>
      )}

      {/* Where the ground bends down */}
      <line x1={BOX.left} x2={BOX.right} y1={STRIP} y2={STRIP} className="stroke-zinc-300 dark:stroke-zinc-200/25" strokeWidth={1.5} />
      {down.map(([from, to]) => (
        <line
          key={from}
          x1={place.x(from)}
          x2={place.x(to)}
          y1={STRIP}
          y2={STRIP}
          className="stroke-ink"
          strokeWidth={6}
          strokeLinecap="round"
        />
      ))}
      <text x={BOX.left} y={STRIP + 24} className={`${down.length ? 'fill-ink' : 'fill-sage-ink'} ${label}`}>
        {down.length ? 'Bends down (f″ < 0) here' : 'Bends up or not at all everywhere (f″ ≥ 0)'}
      </text>
    </svg>
  )
}

type Place = ReturnType<typeof placer>

// One walker, from where you tapped, down to where the ground is flat
function Walker({ landscape, start, place }: { landscape: Landscape; start: number; place: Place }) {
  const way = descend(landscape.f, start)
  const span = way.length - 1
  const played = usePlay(span, WALK_MS / Math.max(1, span))
  const done = played >= span
  const at = place.at(way[Math.min(span, Math.floor(played))])
  const stuck = trapped(landscape.f, way[span])
  const best = lowest(landscape.f)
  return (
    <g>
      <circle cx={at.x} cy={at.y - 10} r={8} className={done ? (stuck ? 'fill-ink' : 'fill-sage') : 'fill-zinc-400'} />
      {done && (
        <text x={BOX.left} y={42} className={`${stuck ? 'fill-ink' : 'fill-sage-ink'} ${label}`}>
          {stuck ? 'Stuck: not the lowest' : 'Reached the lowest'}
        </text>
      )}
      {done && stuck && (
        <circle cx={place.at(best.x).x} cy={place.at(best.x).y} r={6} className="fill-none stroke-ink" strokeWidth={2} />
      )}
    </g>
  )
}

// Many walkers from seeded starts, piled where they stop
function Crowd({ landscape, starts, place }: { landscape: Landscape; starts: number[]; place: Place }) {
  const { f } = landscape
  const ways = starts.map((s) => descend(f, s))
  const span = Math.max(...ways.map((w) => w.length - 1))
  const played = usePlay(span, WALK_MS / Math.max(1, span))
  const done = played >= span
  const ends = ways.map((w) => w.at(-1)!)
  const piles = minima(f).map((m) => {
    const count = ends.filter((e) => Math.abs(e - m.x) < 0.05).length
    const { x, y } = place.at(m.x)
    return { x: m.x, low: !trapped(f, m.x), count, dots: pile(x, y, count, 4) }
  })
  const stuck = piles.filter((p) => !p.low).reduce((sum, p) => sum + p.count, 0)

  return (
    <g>
      {done
        ? piles.map((p) =>
            p.dots.map((d, i) => <circle key={`${p.x} ${i}`} cx={d.x} cy={d.y} r={4} className={p.low ? 'fill-sage' : 'fill-ink'} />),
          )
        : ways.map((w, i) => {
            const at = place.at(w[Math.min(w.length - 1, Math.floor(played))])
            return <circle key={i} cx={at.x} cy={at.y - 5} r={4} className="fill-zinc-400" />
          })}
      {done && (
        <text x={BOX.left} y={42} className={`${stuck ? 'fill-ink' : 'fill-sage-ink'} ${label}`}>
          {stuck ? `${stuck} of ${starts.length} stuck` : `All ${starts.length} at the lowest`}
        </text>
      )}
    </g>
  )
}
