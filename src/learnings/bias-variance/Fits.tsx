import { useId, type ReactNode } from 'react'
import { AVERAGES, evaluate, FITS, SAMPLES, SPOTS, truth, type Fit, type Size } from './model'

const WIDTH = 360
const HEIGHT = 240
const LEFT = 14
const RIGHT = 346
const TOP = 12
const BOTTOM = 212
// The y's shown; a wild fit runs off the top or bottom
const SPAN = 1.8

const fx = (x: number) => LEFT + x * (RIGHT - LEFT)
const fy = (y: number) => TOP + ((SPAN - y) / (2 * SPAN)) * (BOTTOM - TOP)

function path(f: (x: number) => number) {
  return Array.from({ length: 161 }, (_, i) => {
    const x = i / 160
    const y = Math.max(-3 * SPAN, Math.min(3 * SPAN, f(x)))
    return `${i ? 'L' : 'M'}${fx(x).toFixed(1)},${fy(y).toFixed(1)}`
  }).join(' ')
}

// Worked out once per fit
const paths = new Map<Fit, string>()
function pathOf(fit: Fit) {
  let found = paths.get(fit)
  if (!found) {
    found = path((x) => evaluate(fit, x))
    paths.set(fit, found)
  }
  return found
}
const TRUTH = path(truth)

// Twenty fits of one degree, each to its own sample of noisy points, over
// the true curve, with the average of every possible fit in sage. `shown`
// is how many fits are drawn so far (the last one, `latest`, in ink with
// its sample's points); `spots` marks the two x's the story's target reads.
export default function Fits({
  size,
  degree,
  shown = FITS[size][degree].length,
  latest = 0,
  spots = false,
  average = true,
}: {
  size: Size
  degree: number
  shown?: number
  latest?: number
  spots?: boolean
  average?: boolean
}) {
  const clip = useId()
  const fits = FITS[size][degree]
  const sample = SAMPLES[size][latest]
  const others = fits.slice(0, shown).filter((_, i) => i !== latest)
  const current = latest < shown ? fits[latest] : null

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[0.75rem] uppercase tracking-widest text-zinc-faded">
        <Key className="stroke-ink" dash="5 4">
          truth
        </Key>
        {average && (
          <Key className="stroke-sage" width={3}>
            average fit
          </Key>
        )}
        <Key className="stroke-zinc-400">{fits.length} fits</Key>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`${Math.min(shown, fits.length)} degree-${degree} polynomials, each fitted to its own ${size} noisy points from a sine curve, drawn over the true curve${average ? ', with the average fit' : ''}`}
      >
        <defs>
          <clipPath id={clip}>
            <rect x={LEFT} y={TOP} width={RIGHT - LEFT} height={BOTTOM - TOP} />
          </clipPath>
        </defs>
        <line x1={LEFT} x2={RIGHT} y1={fy(0)} y2={fy(0)} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
        <line x1={LEFT} x2={RIGHT} y1={BOTTOM} y2={BOTTOM} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
        {[0, 0.5, 1].map((x) => (
          <text key={x} x={fx(x)} y={BOTTOM + 16} textAnchor={x === 0 ? 'start' : x === 1 ? 'end' : 'middle'} className="fill-zinc-faded font-mono text-[11px]">
            {x}
          </text>
        ))}
        {spots &&
          SPOTS.map((x) => (
            <g key={x}>
              <line x1={fx(x)} x2={fx(x)} y1={TOP} y2={BOTTOM} className="stroke-zinc-400" strokeDasharray="2 3" />
              <text x={fx(x)} y={BOTTOM + 16} textAnchor="middle" className="fill-ink font-mono text-[11px]">
                {x}
              </text>
            </g>
          ))}
        <g clipPath={`url(#${clip})`} fill="none">
          {others.map((fit, i) => (
            <path key={i} d={pathOf(fit)} className="stroke-zinc-400" strokeWidth={1} />
          ))}
          {average && <path d={pathOf(AVERAGES[size][degree])} className="stroke-sage" strokeWidth={3} />}
          <path d={TRUTH} className="stroke-ink" strokeWidth={1.5} strokeDasharray="5 4" />
          {current && <path d={pathOf(current)} className="stroke-ink" strokeWidth={1.75} />}
        </g>
        {current &&
          sample.xs.map((x, i) => <circle key={i} cx={fx(x)} cy={fy(sample.ys[i])} r={3.5} className="fill-ink" />)}
      </svg>
    </div>
  )
}

function Key({ className, dash, width = 1.5, children }: { className: string; dash?: string; width?: number; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg width="22" height="8" aria-hidden>
        <line x1="1" x2="21" y1="4" y2="4" className={className} strokeWidth={width} strokeDasharray={dash} />
      </svg>
      {children}
    </span>
  )
}
