import { useId, type ReactNode } from 'react'
import { isRight, norm, type Example, type Vec } from './model'
import { HEIGHT, MIDDLE, RANGE, screen, SQUARE, sx, sy, WIDTH } from './planeScale'

// Far enough to cross the whole square either way
const LONG = 4 * RANGE

// An arrow from `from` to `to`, in the chart's units, with its head drawn
// as a small triangle in the same colour
const TONES = { sage: ['stroke-sage', 'fill-sage stroke-sage'], ink: ['stroke-ink', 'fill-ink stroke-ink'] } as const

export function Arrow({ from, to, tone, dashed = false }: { from: Vec; to: Vec; tone: keyof typeof TONES; dashed?: boolean }) {
  const [x1, y1] = screen(from)
  const [x2, y2] = screen(to)
  const length = Math.hypot(x2 - x1, y2 - y1)
  if (length < 1) return null
  const [ux, uy] = [(x2 - x1) / length, (y2 - y1) / length]
  const head = Math.min(12, length * 0.6)
  const [bx, by] = [x2 - ux * head, y2 - uy * head]
  const [line, tip] = TONES[tone]
  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={bx}
        y2={by}
        className={line}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeDasharray={dashed ? '5 5' : undefined}
      />
      <polygon
        points={`${x2},${y2} ${bx - uy * head * 0.45},${by + ux * head * 0.45} ${bx + uy * head * 0.45},${by - ux * head * 0.45}`}
        className={tip}
        strokeWidth={1}
        strokeLinejoin="round"
      />
    </g>
  )
}

// One point: ripe (+1) a filled sage dot, not ripe (−1) an open ink ring
export function Dot({ example, opacity = 1 }: { example: Example; opacity?: number }) {
  const [x, y] = screen(example.x)
  return example.y === 1 ? (
    <circle cx={x} cy={y} r={6} className="fill-sage" opacity={opacity} />
  ) : (
    <circle cx={x} cy={y} r={5.2} className="fill-paper stroke-ink" strokeWidth={1.6} opacity={opacity} />
  )
}

// A ring around the point being looked at
export function Look({ at, wrong }: { at: Vec; wrong: boolean }) {
  const [x, y] = screen(at)
  return <circle cx={x} cy={y} r={12} className={`fill-none ${wrong ? 'stroke-ink' : 'stroke-sage'}`} strokeWidth={2} />
}

// The chart: axes through the middle, the rule's line at right angles to
// `w` with the side it calls ripe shaded, and the points on top. Points
// the rule calls wrong get a ring when `rings` is on. `named` turns the
// axes' names into x₁ and x₂.
export function Plane({
  data,
  w,
  label,
  named = false,
  rings = false,
  under,
  children,
  shown = data.length,
}: {
  data: readonly Example[]
  w: Vec | null
  label: string
  named?: boolean
  rings?: boolean
  // Drawn under the points (guides), and over them (marks)
  under?: ReactNode
  children?: ReactNode
  // How many of the points have appeared, the last one fading in
  shown?: number
}) {
  const clip = useId()
  const length = w ? norm(w) : 0
  const n: Vec | null = w && length > 0 ? [w[0] / length, w[1] / length] : null
  const d: Vec | null = n ? [-n[1], n[0]] : null

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mx-auto w-full max-w-[30rem]" role="img" aria-label={label}>
      <defs>
        <clipPath id={clip}>
          <rect x={SQUARE.left} y={SQUARE.top} width={SQUARE.size} height={SQUARE.size} />
        </clipPath>
      </defs>
      <rect
        x={SQUARE.left}
        y={SQUARE.top}
        width={SQUARE.size}
        height={SQUARE.size}
        rx={14}
        className="fill-paper stroke-zinc-300 dark:stroke-zinc-200/25"
      />

      <g clipPath={`url(#${clip})`}>
        {/* The side the rule calls ripe */}
        {n && d && (
          <polygon
            points={[
              screen([d[0] * LONG, d[1] * LONG]),
              screen([d[0] * LONG + n[0] * LONG, d[1] * LONG + n[1] * LONG]),
              screen([-d[0] * LONG + n[0] * LONG, -d[1] * LONG + n[1] * LONG]),
              screen([-d[0] * LONG, -d[1] * LONG]),
            ]
              .map((p) => p.join(','))
              .join(' ')}
            className="fill-sage/15"
          />
        )}
        {/* The axes */}
        <line x1={SQUARE.left} x2={SQUARE.left + SQUARE.size} y1={MIDDLE[1]} y2={MIDDLE[1]} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
        <line x1={MIDDLE[0]} x2={MIDDLE[0]} y1={SQUARE.top} y2={SQUARE.top + SQUARE.size} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
        {under}
        {/* The rule's line */}
        {d && (
          <line
            x1={sx(d[0] * LONG)}
            y1={sy(d[1] * LONG)}
            x2={sx(-d[0] * LONG)}
            y2={sy(-d[1] * LONG)}
            className="stroke-sage"
            strokeWidth={2.5}
          />
        )}
        {data.slice(0, Math.ceil(shown)).map((example, i) => (
          <Dot key={i} example={example} opacity={i + 1 > shown ? shown - i : 1} />
        ))}
        {rings &&
          w &&
          data.map((example, i) =>
            isRight(w, example) ? null : (
              <circle key={i} cx={sx(example.x[0])} cy={sy(example.x[1])} r={10} className="fill-none stroke-ink" strokeWidth={1.5} />
            ),
          )}
        {children}
      </g>

      {/* The axes' names, outside the square */}
      <text x={MIDDLE[0] + 8} y={SQUARE.top - 10} className="fill-zinc-faded font-mono text-[12px] uppercase tracking-widest">
        {named ? 'x₂ ↑' : 'darker ↑'}
      </text>
      <text
        x={SQUARE.left + SQUARE.size}
        y={SQUARE.top + SQUARE.size + 18}
        textAnchor="end"
        className="fill-zinc-faded font-mono text-[12px] uppercase tracking-widest"
      >
        {named ? 'x₁ →' : 'softer →'}
      </text>
    </svg>
  )
}

// What the dots mean, under a drawing
export function Key({ named = false }: { named?: boolean }) {
  return (
    <div className="mt-2 flex flex-wrap justify-center gap-x-6 gap-y-1 font-mono text-[0.875rem] uppercase tracking-widest text-zinc-faded">
      <span className="flex items-center gap-2">
        <svg width="14" height="14" aria-hidden="true">
          <circle cx="7" cy="7" r="6" className="fill-sage" />
        </svg>
        {named ? 'y = +1' : 'ripe'}
      </span>
      <span className="flex items-center gap-2">
        <svg width="14" height="14" aria-hidden="true">
          <circle cx="7" cy="7" r="5" className="fill-paper stroke-ink" strokeWidth={1.6} />
        </svg>
        {named ? 'y = −1' : 'not ripe'}
      </span>
      <span className="flex items-center gap-2">
        <svg width="22" height="14" aria-hidden="true">
          <rect x="1" y="1" width="20" height="12" rx="3" className="fill-sage/15" />
          <line x1="1" x2="21" y1="13" y2="1" className="stroke-sage" strokeWidth={2} />
        </svg>
        {named ? 'w · x > 0' : 'called ripe'}
      </span>
    </div>
  )
}
