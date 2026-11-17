import { useLoop, usePlay } from '../../components/explain/useLoop'
import Fits from './Fits'
import { aim, arrows, scatter, SHOWN, SIGMA, SPOTS, two } from './model'

const SIZE = 300
const CENTRE = SIZE / 2
// Pixels per unit of miss
const UNIT = 70
const RINGS = [0.25, 0.75, 1.25, 1.75]
const BOARD = 2.05
// An arrow further out than this lands on the board's edge
const EDGE = 2

const BOWS: Record<number, string> = { 1: 'Stiff bow', 3: 'In-between bow', 9: 'Twitchy bow' }
const MODELS: Record<number, string> = { 1: 'Degree 1: a straight line', 3: 'Degree 3', 9: 'Degree 9: through every point' }

export type Show = 'shots' | 'aim' | 'scatter' | 'noise' | 'curves'

// Where a miss lands on the board: across for the first spot, up for the second
function place([a, b]: [number, number]): [number, number] {
  const far = Math.hypot(a, b)
  const k = far > EDGE ? EDGE / far : 1
  return [CENTRE + a * k * UNIT, CENTRE - b * k * UNIT]
}

// The story's target. Twenty archers, one arrow each: an arrow is one
// sample's fit, landing at how far it misses the true curve at two spots.
// `show` is 'shots' to watch them land, 'aim' to mark where they land on
// average, 'scatter' to land them and ring their spread, 'noise' to let the
// target sway, and 'curves' to land them beside the fits they stand for.
// Give it a `key` per step.
export default function Archery({ degree, show }: { degree: number; show: Show }) {
  const flying = show === 'shots' || show === 'scatter' || show === 'curves'
  const pace = show === 'curves' ? 260 : 150
  const played = usePlay(flying ? SHOWN + 1.5 : 1, pace)
  const landed = flying ? played : SHOWN + 1.5
  const done = landed >= SHOWN + 0.5
  const noise = show === 'noise'
  // With the target swaying, one perfect shot is enough to see it
  const shots: [number, number][] = noise ? [[0, 0]] : arrows(degree)
  const centre = aim(degree)
  const spread = scatter(degree)
  const off = Math.hypot(...centre)
  const marked = show !== 'shots' && !noise && done

  const target = (
    <div>
      <div className="flex items-baseline justify-between gap-4 font-mono text-[0.875rem] uppercase tracking-widest">
        <span className="shrink-0 text-ink">{noise ? 'A perfect shot' : show === 'curves' ? MODELS[degree] : BOWS[degree]}</span>
        <span className="text-right text-zinc-faded">
          {noise
            ? `the target sways about ${two(SIGMA)}`
            : marked
              ? `off by ${two(off)} · scatter ${two(spread)}`
              : `${Math.min(SHOWN, Math.floor(landed))} of ${SHOWN} arrows`}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="mx-auto mt-2 w-full max-w-[22rem]"
        role="img"
        aria-label={
          noise
            ? `A target swaying about ${two(SIGMA)} either way, with one arrow in the middle of where its bull's-eye sways`
            : `A target with ${SHOWN} arrows. On average they land ${two(off)} from the bull's-eye, and they scatter ${two(spread)} around their own centre.`
        }
      >
        <Board sway={show === 'noise'} />
        {shots.map((shot, i) => {
          if (landed < i) return null
          const [x, y] = place(shot)
          const k = Math.min(1, (landed - i) / 0.8)
          const latest = show === 'curves' && i === Math.min(SHOWN - 1, Math.floor(landed))
          return (
            <g key={i}>
              {k < 1 && <circle cx={x} cy={y} r={5 + 14 * (1 - k)} className="fill-none stroke-ink" strokeWidth={1.5} opacity={1 - k} />}
              <circle cx={x} cy={y} r={latest && !done ? 6.5 : 4.5} className="fill-ink" />
            </g>
          )
        })}
        {marked && <Aim centre={centre} spread={spread} off={off} />}
        {show === 'noise' && (
          <circle cx={CENTRE} cy={CENTRE} r={SIGMA * UNIT} className="fill-none stroke-sage" strokeWidth={2} strokeDasharray="3 3" />
        )}
      </svg>
      {show === 'curves' && (
        <p className="mt-2 text-center font-mono text-[0.75rem] uppercase tracking-widest text-zinc-faded">
          across: miss at x = {SPOTS[0]} · up: miss at x = {SPOTS[1]}
        </p>
      )}
    </div>
  )

  if (show !== 'curves') return target
  const shown = Math.min(SHOWN, Math.floor(landed) + 1)
  return (
    <div className="grid items-start gap-6 sm:grid-cols-[1fr_1.25fr]">
      {target}
      <Fits size={10} degree={degree} shown={shown} latest={done ? 0 : Math.min(SHOWN - 1, Math.floor(landed))} spots average={done} />
    </div>
  )
}

// The rings, and the bull's-eye; swaying with the wind when `sway`, about
// as far as the noise in a new point
function Board({ sway }: { sway: boolean }) {
  const phase = useLoop(2600, 0)
  const dx = sway ? SIGMA * UNIT * Math.sin(phase * Math.PI * 2) : 0
  const dy = sway ? SIGMA * UNIT * 0.8 * Math.sin(phase * Math.PI * 4) : 0
  return (
    <g transform={`translate(${dx.toFixed(2)} ${dy.toFixed(2)})`}>
      <circle cx={CENTRE} cy={CENTRE} r={BOARD * UNIT} className="fill-paper stroke-zinc-300 dark:stroke-zinc-200/25" strokeWidth={1.5} />
      {[...RINGS].reverse().map((ring) => (
        <circle key={ring} cx={CENTRE} cy={CENTRE} r={ring * UNIT} className="fill-none stroke-zinc-300 dark:stroke-zinc-200/25" strokeWidth={1.5} />
      ))}
      <circle cx={CENTRE} cy={CENTRE} r={RINGS[0] * UNIT} className="fill-sage/25" />
      <circle cx={CENTRE} cy={CENTRE} r={3} className="fill-sage" />
    </g>
  )
}

// Where the arrows land on average, a line to it from the bull's-eye, and
// a dashed ring as wide as their scatter
function Aim({ centre, spread, off }: { centre: [number, number]; spread: number; off: number }) {
  const [x, y] = place(centre)
  // Its label, beyond the cross, away from the bull's-eye
  const away = off > 0.05 ? [(x - CENTRE) / (off * UNIT), (y - CENTRE) / (off * UNIT)] : [0, -1]
  const reach = spread * UNIT + 12
  const lx = x + away[0] * reach
  const ly = y + away[1] * reach
  return (
    <g>
      <circle cx={x} cy={y} r={spread * UNIT} className="fill-none stroke-ink" strokeWidth={1.25} strokeDasharray="4 4" />
      {off > 0.05 && <line x1={CENTRE} y1={CENTRE} x2={x} y2={y} className="stroke-sage" strokeWidth={2.5} />}
      <path d={`M${x - 8},${y} L${x + 8},${y} M${x},${y - 8} L${x},${y + 8}`} className="stroke-sage" strokeWidth={3} />
      {off > 0.05 && (
        <text x={lx} y={ly + 4} textAnchor={away[0] < -0.3 ? 'end' : away[0] > 0.3 ? 'start' : 'middle'} className="fill-sage-ink font-mono text-[11px] uppercase tracking-widest">
          average
        </text>
      )}
    </g>
  )
}
