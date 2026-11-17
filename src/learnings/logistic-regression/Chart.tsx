import { chanceOf, halfwayOf, surpriseOf, type Patient, type Weights } from './model'

// The flu chart every figure on the page draws: patients by temperature,
// flu (filled) along the top and none (hollow) along the bottom, the curve
// of chances in sage, and under it a strip with each patient's surprise.

const WIDTH = 560
const HEIGHT = 380
const LEFT = 40
const RIGHT = 536
// The chance of flu, 1 at TOP and 0 at BOTTOM
const TOP = 46
const BOTTOM = 208
// The surprise strip, 0 at its base, up to MOST_SURPRISE at its top
const STRIP_TOP = 262
const STRIP_BASE = 344
const MOST_SURPRISE = 5
const TEMPS: [number, number] = [36, 40]

const tempX = (t: number) => LEFT + ((t - TEMPS[0]) / (TEMPS[1] - TEMPS[0])) * (RIGHT - LEFT)
const chanceY = (p: number) => BOTTOM - p * (BOTTOM - TOP)
const rowY = (p: Patient) => chanceY(p.flu ? 1 : 0)
const surpriseH = (s: number) => (Math.min(s, MOST_SURPRISE) / MOST_SURPRISE) * (STRIP_BASE - STRIP_TOP)

const label = 'fill-zinc-faded font-mono text-[10px] uppercase tracking-widest'

// The curve of chances, drawn from the left up to `drawn` of the way across
function curvePath(weights: Weights, drawn = 1): string {
  const points: string[] = []
  const end = TEMPS[0] + drawn * (TEMPS[1] - TEMPS[0])
  for (let t = TEMPS[0]; t <= end + 1e-9; t += 0.02) {
    points.push(`${tempX(t).toFixed(1)},${chanceY(chanceOf(weights, t)).toFixed(1)}`)
  }
  return points.join(' ')
}

export interface ChartProps {
  patients: Patient[]
  // How many of them to show yet
  shown?: number
  weights?: Weights | null
  // How much of the curve is drawn, left to right
  drawn?: number
  // A rule instead of a curve: flu from this temperature up
  cutoff?: number | null
  // Each patient's gap to the curve, and its surprise in the strip, grown by `grow`
  surprises?: boolean
  grow?: number
  // A patient to point at, with words
  marked?: { patient: Patient; text: string } | null
  // Where the curve crosses 50%
  halfway?: boolean
  named?: boolean
  dot?: number
  label: string
}

export default function Chart({
  patients,
  shown = patients.length,
  weights = null,
  drawn = 1,
  cutoff = null,
  surprises = false,
  grow = 1,
  marked = null,
  halfway = false,
  named = false,
  dot = 5.5,
  label: description,
}: ChartProps) {
  const ticks = [36, 37, 38, 39, 40]
  const visible = patients.slice(0, shown)
  const wrongs = cutoff === null ? [] : visible.filter((p) => p.temp >= cutoff !== p.flu)
  const middle = weights && weights.w > 0 ? halfwayOf(weights) : null

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={description}>
      {/* The chance axis: 0, 50% and 100% */}
      {[0, 0.5, 1].map((p) => (
        <g key={p}>
          <line
            x1={LEFT}
            x2={RIGHT}
            y1={chanceY(p)}
            y2={chanceY(p)}
            className="stroke-zinc-300 dark:stroke-zinc-200/15"
            strokeWidth={1}
            strokeDasharray={p === 0.5 ? '3 4' : undefined}
          />
          <text x={LEFT - 6} y={chanceY(p) + 3.5} textAnchor="end" className="fill-zinc-faded font-mono text-[10px] tabular-nums">
            {p === 0.5 ? '½' : p}
          </text>
        </g>
      ))}
      <text x={LEFT} y={TOP - 32} className={label}>
        {named ? 'σ(w·x + b): chance of flu' : 'Chance of flu'}
      </text>
      {ticks.map((t) => (
        <text key={t} x={tempX(t)} y={BOTTOM + 18} textAnchor="middle" className="fill-zinc-faded font-mono text-[10px] tabular-nums">
          {t}°
        </text>
      ))}
      <text x={RIGHT} y={BOTTOM + 34} textAnchor="end" className={label}>
        {named ? 'Feature x: temperature (°C)' : 'Temperature (°C)'}
      </text>

      {/* Where the curve crosses 50% */}
      {halfway && middle !== null && middle > TEMPS[0] && middle < TEMPS[1] && (
        <g>
          <line
            x1={tempX(middle)}
            x2={tempX(middle)}
            y1={TOP}
            y2={BOTTOM}
            className="stroke-zinc-400 dark:stroke-zinc-200/40"
            strokeWidth={1.25}
            strokeDasharray="5 4"
          />
          <text x={tempX(middle)} y={TOP - 14} textAnchor="middle" className="fill-zinc-faded font-mono text-[10px] tabular-nums">
            {named ? 'boundary' : '50%'} {middle.toFixed(1)}°
          </text>
        </g>
      )}

      {/* The rule: 0 below the cut-off, 1 from it up */}
      {cutoff !== null && (
        <polyline
          points={`${tempX(TEMPS[0])},${chanceY(0)} ${tempX(cutoff)},${chanceY(0)} ${tempX(cutoff)},${chanceY(1)} ${tempX(TEMPS[1])},${chanceY(1)}`}
          className="fill-none stroke-sage"
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
      )}

      {/* Each patient's gap: how far the curve is from what happened */}
      {surprises &&
        weights &&
        visible.map((p, i) => {
          const curve = chanceY(chanceOf(weights, p.temp))
          const row = rowY(p)
          return (
            <line
              key={`gap${i}`}
              x1={tempX(p.temp)}
              x2={tempX(p.temp)}
              y1={row}
              y2={row + (curve - row) * grow}
              className="stroke-ink"
              strokeWidth={1.5}
            />
          )
        })}

      {weights && <polyline points={curvePath(weights, drawn)} className="fill-none stroke-sage" strokeWidth={2.75} strokeLinejoin="round" />}

      {wrongs.map((p, i) => (
        <circle key={`wrong${i}`} cx={tempX(p.temp)} cy={rowY(p)} r={dot + 5} className="fill-none stroke-ink" strokeWidth={1.5} />
      ))}
      {visible.map((p, i) => (
        <circle
          key={`p${i}`}
          cx={tempX(p.temp)}
          cy={rowY(p)}
          r={dot}
          className={p.flu ? 'fill-ink' : 'fill-paper stroke-ink'}
          strokeWidth={1.75}
        />
      ))}

      {/* The surprise strip */}
      {surprises && weights && (
        <g>
          <line x1={LEFT} x2={RIGHT} y1={STRIP_BASE} y2={STRIP_BASE} className="stroke-zinc-300 dark:stroke-zinc-200/25" strokeWidth={1} />
          <text x={LEFT} y={STRIP_BASE + 18} className={label}>
            {named ? 'Log loss: ln(1 ÷ chance of what happened)' : 'Surprise: ln(1 ÷ chance of what happened)'}
          </text>
          {visible.map((p, i) => {
            const s = surpriseOf(weights, p)
            const h = surpriseH(s) * grow
            return (
              <rect
                key={`s${i}`}
                x={tempX(p.temp) - (dot > 4 ? 3.5 : 2)}
                y={STRIP_BASE - h}
                width={dot > 4 ? 7 : 4}
                height={h}
                className="fill-ink"
              />
            )
          })}
          {marked && (
            <text
              x={tempX(marked.patient.temp)}
              y={STRIP_BASE - surpriseH(surpriseOf(weights, marked.patient)) * grow - 6}
              textAnchor="middle"
              className="fill-ink font-mono text-[10px] tabular-nums"
            >
              {marked.text}
            </text>
          )}
        </g>
      )}

    </svg>
  )
}
