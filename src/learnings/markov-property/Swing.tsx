import { useLoop } from '../../components/explain/useLoop'
import { AHEAD, angle, GAP, nextPlaces, PERIOD, type Knowing } from './model'

const WIDTH = 640
const HEIGHT = 330
const PIVOT = { x: 320, y: 40 }
const ROPE = 230

const seatAt = (degrees: number) => {
  const r = (degrees * Math.PI) / 180
  return { x: PIVOT.x + ROPE * Math.sin(r), y: PIVOT.y + ROPE * Math.cos(r) }
}

function Seat({ degrees, tone, label }: { degrees: number; tone: 'now' | 'before' | 'ghost' | 'trail'; label?: string }) {
  const { x, y } = seatAt(degrees)
  const r = (degrees * Math.PI) / 180
  const below = { x: x + 26 * Math.sin(r), y: y + 26 * Math.cos(r) }
  const cls =
    tone === 'now'
      ? 'fill-sage'
      : tone === 'before'
        ? 'fill-sage/35'
        : tone === 'trail'
          ? 'fill-sage/10'
          : 'fill-none stroke-sage'
  return (
    <g>
      {tone !== 'ghost' && tone !== 'trail' && (
        <line x1={PIVOT.x} y1={PIVOT.y} x2={x} y2={y} className={tone === 'now' ? 'stroke-ink' : 'stroke-zinc-300 dark:stroke-zinc-200/25'} strokeWidth={2} />
      )}
      <g transform={`rotate(${-degrees} ${x} ${y})`}>
        <rect x={x - 24} y={y - 4} width={48} height={8} className={cls} strokeWidth={2} strokeDasharray={tone === 'ghost' ? '4 3' : undefined} />
        <circle cx={x} cy={y - 22} r={11} className={cls} strokeWidth={2} strokeDasharray={tone === 'ghost' ? '4 3' : undefined} />
      </g>
      {label && (
        <text x={below.x} y={below.y + 14} textAnchor="middle" className="fill-sage font-mono text-[16px] uppercase tracking-widest">
          {label}
        </text>
      )}
    </g>
  )
}

interface SwingProps {
  // The moment shown, in seconds, or 'live' to swing on its own
  t: number | 'live'
  knowing: Knowing
  // Draw where the seat could be AHEAD seconds later
  ghosts?: boolean
  // Draw the photo taken a moment before
  before?: boolean
  // Draw the last couple of seconds, faintly: the whole afternoon
  trail?: boolean
  // Words over the drawing: what you have
  caption?: string
}

// A swing on a frame, seen side on, with the seat where it is at a moment.
// The dashed seats are where it could be a second later, given only what
// `knowing` keeps of the moment; with one photo there are two, forward and
// back, except at the very top.
export default function Swing({ t, knowing, ghosts = false, before = false, trail = false, caption }: SwingProps) {
  const phase = useLoop(PERIOD * 1000 * 1.6, 0.47)
  const now = t === 'live' ? phase * PERIOD : t
  const places = nextPlaces(knowing, now)
  const showBefore = before || knowing !== 'one photo'

  return (
    <div>
      <p className="flex justify-between gap-4 font-mono text-[0.8rem] uppercase tracking-widest text-zinc-faded">
        <span>{caption ?? `You have: ${knowing}`}</span>
        {ghosts && (
          <span className="text-right">
            In {AHEAD} s: <span className="text-sage">{places.length === 1 ? 'one place' : `${places.length} places`}</span>
          </span>
        )}
      </p>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mt-2 w-full" role="img" aria-label="A swing seen from the side, with where its seat could be a second later">
        {/* The frame and the arc the seat travels */}
        <line x1={150} x2={490} y1={PIVOT.y} y2={PIVOT.y} className="stroke-ink" strokeWidth={4} />
        <line x1={170} y1={PIVOT.y} x2={120} y2={HEIGHT - 10} className="stroke-zinc-300 dark:stroke-zinc-200/25" strokeWidth={3} />
        <line x1={470} y1={PIVOT.y} x2={520} y2={HEIGHT - 10} className="stroke-zinc-300 dark:stroke-zinc-200/25" strokeWidth={3} />
        <path
          d={`M${seatAt(-55).x},${seatAt(-55).y} A${ROPE},${ROPE} 0 0 0 ${seatAt(55).x},${seatAt(55).y}`}
          fill="none"
          className="stroke-zinc-300 dark:stroke-zinc-200/25"
          strokeDasharray="2 5"
        />
        <text x={seatAt(-58).x - 6} y={seatAt(-58).y + 4} textAnchor="end" className="fill-zinc-400 font-mono text-[15px] uppercase">
          back
        </text>
        <text x={seatAt(58).x + 6} y={seatAt(58).y + 4} className="fill-zinc-400 font-mono text-[15px] uppercase">
          forward
        </text>

        {trail &&
          Array.from({ length: 24 }, (_, i) => <Seat key={i} degrees={angle(now - 0.1 * (i + 2))} tone="trail" />)}
        {showBefore && <Seat degrees={angle(now - GAP)} tone="before" />}
        <Seat degrees={angle(now)} tone="now" />
        {ghosts &&
          places.map((place, i) => (
            <Seat key={i} degrees={place.angle} tone="ghost" label={places.length > 1 ? 'here?' : 'here'} />
          ))}
      </svg>
    </div>
  )
}
