import { useId } from 'react'
import { BOWL_START, type Descent } from './model'

const WIDTH = 560
const HEIGHT = 300
const CX = WIDTH / 2
const CY = HEIGHT / 2
// Pixels per unit of weight, the same both ways so a round bowl looks round
const UNIT = 25
// Iterates drawn as dots; the rest of a long walk is only the line
const DOTS = 80
// Contour lines: where the loss is ½r², at these r along the flat weight
const LEVELS = [1.5, 3, 4.5, 6, 7.5, 9, 10.5, 12, 13.5, 15, 16.5]
// Past this many pixels a point is far off the map: keep the line finite
const FAR = 4000
// Past this, in units of weight, a point is off the map
const OFF = { x: CX / UNIT + 1, y: CY / UNIT + 1 }

const px = (x: number) => Math.max(-FAR, Math.min(FAR, CX + UNIT * x))
const py = (y: number) => Math.max(-FAR, Math.min(FAR, CY - UNIT * y))

// Gradient descent on the loss ½(x² + κy²), drawn on its contour lines: a
// long, narrow valley when κ is large. The path is `descent`, from the
// filled dot; the bottom is the centre.
export default function Bowl({ descent, kappa }: { descent: Descent; kappa: number }) {
  const clip = useId()
  const { path, outcome } = descent
  // A walk that flies out is drawn until its first step off the map
  const out = path.findIndex((p) => Math.abs(p.x) > OFF.x || Math.abs(p.y) > OFF.y)
  const drawn = out < 0 ? path : path.slice(0, out + 1)
  const line = drawn.map((p) => `${px(p.x).toFixed(1)},${py(p.y).toFixed(1)}`).join(' ')
  const squeeze = 1 / Math.sqrt(kappa)
  const label =
    outcome === 'diverges'
      ? `The path flies out of the bowl, stretched ${kappa} times`
      : `The path from the start to the bottom of a bowl stretched ${kappa} times, in ${path.length - 1} steps`

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={label}>
      <defs>
        <clipPath id={clip}>
          <rect x={0} y={0} width={WIDTH} height={HEIGHT} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        {LEVELS.map((r) => (
          <ellipse
            key={r}
            cx={CX}
            cy={CY}
            rx={UNIT * r}
            ry={UNIT * r * squeeze}
            className="fill-none stroke-zinc-300 dark:stroke-zinc-200/25"
            strokeWidth={1}
          />
        ))}
        <polyline points={line} className="fill-none stroke-sage" strokeWidth={1.75} strokeLinejoin="round" />
        {drawn.slice(1, DOTS).map((p, i) => (
          <circle key={i} cx={px(p.x)} cy={py(p.y)} r={2.75} className="fill-sage" />
        ))}
        <circle cx={px(BOWL_START.x)} cy={py(BOWL_START.y)} r={6} className="fill-ink" />
        <text
          x={px(BOWL_START.x) - 12}
          y={py(BOWL_START.y) - 12}
          textAnchor="middle"
          className="fill-ink font-mono text-[11px] uppercase tracking-widest"
        >
          Start
        </text>
        <circle cx={CX} cy={CY} r={5} className="fill-paper stroke-ink" strokeWidth={1.5} />
      </g>
      <text x={WIDTH - 10} y={HEIGHT - 10} textAnchor="end" className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
        First weight →
      </text>
      <text x={10} y={18} className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
        {kappa === 1 ? '↑ Second weight, as curved' : `↑ Second weight, ${kappa}× as curved`}
      </text>
    </svg>
  )
}
