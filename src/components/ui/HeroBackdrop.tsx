import { useId } from 'react'

// Both cards share the photo's 3:4 frame
const WIDTH = 400
const HEIGHT = 520

// Stripes lean this many degrees off vertical. They are drawn upright across a
// square as wide as the card's diagonal, then rotated, so they reach every corner.
const TILT = 30
const SPAN = Math.hypot(WIDTH, HEIGHT)
// Stripe and gap are equal, so the page background reads as a stripe of its own
const STRIPE = 9
const PERIOD = STRIPE * 2
// Colors cycle through --hero-stripe-0 to -5, defined in index.css per theme
const COLORS = 6
const STRIPES = Array.from({ length: Math.ceil(SPAN / PERIOD) + 1 }, (_, i) => ({
  x: (WIDTH - SPAN) / 2 + i * PERIOD + STRIPE / 2,
  color: `var(--hero-stripe-${i % COLORS})`,
}))

interface Blob {
  cx: number
  cy: number
  rx: number
  ry: number
  // Degrees
  rotate: number
  // Where (radians) the blob's two and three bulges sit around it, so no two
  // blobs bulge alike
  phase: [number, number]
  color: number
}

const BLOB_POINTS = 16

// A closed curve around an ellipse whose edge swells and dips in two gentle
// waves, smoothed with Catmull-Rom
function blobPath({ cx, cy, rx, ry, rotate, phase }: Blob) {
  const angle = (rotate * Math.PI) / 180
  const points = Array.from({ length: BLOB_POINTS }, (_, i) => {
    const t = (i / BLOB_POINTS) * Math.PI * 2
    const w = 0.12 * Math.sin(2 * t + phase[0]) + 0.08 * Math.sin(3 * t + phase[1])
    const x = Math.cos(t) * rx * (1 + w)
    const y = Math.sin(t) * ry * (1 + w)
    return [
      cx + x * Math.cos(angle) - y * Math.sin(angle),
      cy + x * Math.sin(angle) + y * Math.cos(angle),
    ]
  })
  const at = (i: number) => points[(i + points.length) % points.length]
  const r = (n: number) => Math.round(n * 10) / 10

  let d = `M${r(at(0)[0])} ${r(at(0)[1])}`
  points.forEach((_, i) => {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)]
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += `C${r(c1[0])} ${r(c1[1])} ${r(c2[0])} ${r(c2[1])} ${r(p2[0])} ${r(p2[1])}`
  })
  return `${d}Z`
}

// Only the card's left and bottom edges show past the photo, so every shape
// crosses one of them. Back to front.
const BLOB_SHAPES: Blob[] = [
  { cx: 20, cy: 70, rx: 150, ry: 120, rotate: -15, phase: [0.4, 2.1], color: 4 },
  { cx: -20, cy: 280, rx: 110, ry: 135, rotate: 10, phase: [2.6, 0.9], color: 2 },
  { cx: 120, cy: 215, rx: 100, ry: 88, rotate: 20, phase: [4.1, 3.3], color: 5 },
  { cx: 30, cy: 470, rx: 125, ry: 100, rotate: -10, phase: [1.2, 5.0], color: 1 },
  { cx: 165, cy: 410, rx: 72, ry: 62, rotate: 0, phase: [5.3, 1.7], color: 4 },
  { cx: 235, cy: 525, rx: 145, ry: 88, rotate: 8, phase: [3.0, 4.4], color: 2 },
  { cx: 385, cy: 495, rx: 82, ry: 70, rotate: -20, phase: [0.9, 2.8], color: 3 },
  { cx: -30, cy: 560, rx: 85, ry: 72, rotate: 15, phase: [4.7, 0.3], color: 0 },
]
const BLOBS = BLOB_SHAPES.map((blob) => ({ d: blobPath(blob), color: blob.color }))

interface HeroBackdropProps {
  className?: string
}

// What sits behind the hero photo: two cards the photo's size, one of bold
// slanted stripes peeking out at the top-right and one of overlapping blobs
// peeking out at the bottom-left
export default function HeroBackdrop({ className = '' }: HeroBackdropProps) {
  const grainId = `${useId()}-grain`

  return (
    <div aria-hidden="true" className={`hero-decor ${className}`}>
      <div className="hero-card hero-card-blobs">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 h-full w-full"
        >
          <defs>
            <filter id={grainId}>
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
              <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.9 0" />
            </filter>
          </defs>

          {BLOBS.map(({ d, color }) => (
            <path key={d} d={d} className="hero-blob" style={{ fill: `var(--hero-stripe-${color})` }} />
          ))}

          <rect width={WIDTH} height={HEIGHT} filter={`url(#${grainId})`} className="hero-grain" />
        </svg>
      </div>

      <div className="hero-card hero-card-stripes">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 h-full w-full"
        >
          <g transform={`rotate(${TILT} ${WIDTH / 2} ${HEIGHT / 2})`} fill="none" strokeWidth={STRIPE}>
            {STRIPES.map(({ x, color }) => (
              <line
                key={x}
                x1={x}
                y1={(HEIGHT - SPAN) / 2}
                x2={x}
                y2={(HEIGHT + SPAN) / 2}
                style={{ stroke: color }}
              />
            ))}
          </g>
        </svg>
      </div>
    </div>
  )
}
