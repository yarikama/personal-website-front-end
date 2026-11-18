import { useRef, useState } from 'react'
import { useAnimationFrame } from 'motion/react'
import { usePrefersReducedMotion } from '../../hooks'
import { FLOCK_NAMES, FLOCKS, nearest, ON_FLOCK, type Vec } from './model'

const WIDTH = 560
const HEIGHT = 330
const CX = WIDTH / 2
const CY = HEIGHT / 2 + 4
const SCALE = 56

const px = (x: Vec) => CX + SCALE * x[0]
const py = (x: Vec) => CY - SCALE * x[1]

// Which flock a sheep stands on, if any
const onOne = (x: Vec) => {
  const [cx, cy] = FLOCKS[nearest(x)]
  return Math.hypot(x[0] - cx, x[1] - cy) < ON_FLOCK
}

export type Tone = 'sage' | 'ink' | 'judged'
export type Names = 'field' | 'pixels'

// A two-pixel picture: the more solid a square, the higher its value
function Swatch({ x, y, at }: { x: number; y: number; at: Vec }) {
  const ink = (v: number) => Math.min(1, Math.max(0.06, (v + 2) / 4))
  return (
    <g>
      <rect x={x} y={y} width={16} height={16} rx={3} className="fill-ink stroke-zinc-400" fillOpacity={ink(at[0])} strokeWidth={1} />
      <rect x={x + 18} y={y} width={16} height={16} rx={3} className="fill-ink stroke-zinc-400" fillOpacity={ink(at[1])} strokeWidth={1} />
    </g>
  )
}

// The field: two rings where the flocks graze, the middle, and the sheep.
// `arrows` draws a line from each of some sheep to where it is guessed to have
// started. `names` 'pixels' relabels the field as a picture's two pixel values.
export function FieldDrawing({
  points,
  tone,
  arrows,
  names,
  label,
}: {
  points: Vec[]
  tone: Tone
  arrows?: Vec[]
  names: Names
  label: string
}) {
  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={label}>
      <line x1={20} x2={WIDTH - 20} y1={CY} y2={CY} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
      <line x1={CX} x2={CX} y1={14} y2={HEIGHT - 14} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
      {names === 'pixels' ? (
        <>
          <text x={WIDTH - 22} y={CY - 8} textAnchor="end" className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
            Pixel 1 →
          </text>
          <text x={CX + 8} y={24} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
            Pixel 2 ↑
          </text>
        </>
      ) : (
        <text x={CX - 8} y={CY + 18} textAnchor="end" className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
          Middle
        </text>
      )}
      {FLOCKS.map((flock, k) => (
        <g key={k}>
          <circle cx={px(flock)} cy={py(flock)} r={SCALE * ON_FLOCK} className="fill-none stroke-zinc-400" strokeWidth={1} strokeDasharray="4 4" />
          {names === 'pixels' ? (
            <Swatch x={px(flock) - 17} y={k === 0 ? py(flock) - SCALE * ON_FLOCK - 24 : py(flock) + SCALE * ON_FLOCK + 8} at={flock} />
          ) : (
            <text
              x={px(flock)}
              y={k === 0 ? py(flock) - SCALE * ON_FLOCK - 8 : py(flock) + SCALE * ON_FLOCK + 18}
              textAnchor="middle"
              className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest"
            >
              {FLOCK_NAMES[k]}
            </text>
          )}
        </g>
      ))}
      {arrows &&
        points.map((p, i) =>
          i % 3 === 0 ? (
            <line key={`a${i}`} x1={px(p)} y1={py(p)} x2={px(arrows[i])} y2={py(arrows[i])} className="stroke-ink" strokeOpacity={0.45} strokeWidth={1} />
          ) : null,
        )}
      {points.map((p, i) => {
        const sage = tone === 'sage' || (tone === 'judged' && onOne(p))
        return <circle key={i} cx={px(p)} cy={py(p)} r={3.2} className={sage ? 'fill-sage' : 'fill-ink'} fillOpacity={0.85} />
      })}
    </svg>
  )
}

// The sheep moving through `frames`, evenly over `ms`, once, as soon as it is
// shown; with reduced motion, the last frame. `minutes` maps the run's
// progress (0 to 1) to the minute shown in the corner.
export function FieldRun({
  frames,
  ms,
  minutes,
  status,
  tone,
  names = 'field',
  label,
}: {
  frames: Vec[][]
  ms: number
  minutes?: [number, number]
  status: (done: boolean) => string
  tone: Tone | ((done: boolean) => Tone)
  names?: Names
  label: string
}) {
  const reducedMotion = usePrefersReducedMotion()
  const started = useRef<number | null>(null)
  const [progress, setProgress] = useState(reducedMotion ? 1 : 0)

  useAnimationFrame((time) => {
    if (progress >= 1) return
    started.current ??= time
    setProgress(Math.min(1, (time - started.current) / ms))
  })

  const at = progress * (frames.length - 1)
  const low = Math.floor(at)
  const high = Math.min(frames.length - 1, low + 1)
  const mix = at - low
  const points = frames[low].map((p, i): Vec => {
    const q = frames[high][i]
    return [p[0] + (q[0] - p[0]) * mix, p[1] + (q[1] - p[1]) * mix]
  })
  const done = progress >= 1

  return (
    <div>
      <Header minute={minutes ? minutes[0] + (minutes[1] - minutes[0]) * progress : null} status={status(done)} />
      <FieldDrawing points={points} tone={typeof tone === 'function' ? tone(done) : tone} names={names} label={label} />
    </div>
  )
}

export function Header({ minute, status }: { minute: number | null; status: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 font-mono text-[0.875rem] uppercase tracking-widest">
      <span className="shrink-0 text-zinc-faded tabular-nums">{minute === null ? '' : `Minute ${Math.round(minute)}`}</span>
      <span className="text-right text-ink">{status}</span>
    </div>
  )
}
