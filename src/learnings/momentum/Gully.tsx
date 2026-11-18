import { useId } from 'react'
import { lerp, usePlay } from '../../components/explain/useLoop'
import { KAPPA, START, distance, perStride, type Point, type Walk } from './model'

const WIDTH = 560
const HEIGHT = 210
// The map: the floor runs left to right, the walls are above and below it.
// The two directions get their own scales, so the narrow valley shows.
const X_RANGE = [-10.8, 10.8] as const
const Y_RANGE = [-0.5, 0.5] as const
const TOP = 30
const BOTTOM = HEIGHT - 26
// Contour lines where the loss is ½r², at these r along the floor
const LEVELS = [2, 4, 6, 8, 10, 12, 14, 16]
// Milliseconds a stride
const PACE = 170

const px = (x: number) => ((x - X_RANGE[0]) / (X_RANGE[1] - X_RANGE[0])) * WIDTH
const py = (y: number) => TOP + ((Y_RANGE[1] - y) / (Y_RANGE[1] - Y_RANGE[0])) * (BOTTOM - TOP)
const UNIT_X = WIDTH / (X_RANGE[1] - X_RANGE[0])
const UNIT_Y = (BOTTOM - TOP) / (Y_RANGE[1] - Y_RANGE[0])

const label = 'font-mono text-[11px] uppercase tracking-widest'
const halo = { className: `fill-ink stroke-paper ${label}`, strokeWidth: 3, paintOrder: 'stroke' as const }

export type Tone = 'plain' | 'momentum'

export interface Trail {
  walk: Walk
  tone: Tone
}

// Where a walk is after `played` strides, mid-stride included
function at(path: Point[], played: number): Point {
  const k = Math.min(path.length - 1, Math.floor(played))
  const t = played - k
  const a = path[k]
  const b = path[Math.min(k + 1, path.length - 1)]
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) }
}

const points = (path: Point[]) => path.map((p) => `${px(p.x).toFixed(1)},${py(p.y).toFixed(1)}`).join(' ')

// The gully drawn from above, its contour lines, and each trail walked
// `played` strides so far. `named` relabels the scene as a loss.
export function GullyMap({ trails, played, named = false }: { trails: Trail[]; played: number; named?: boolean }) {
  const clip = useId()
  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={describe(trails, played, named)}>
      <defs>
        <clipPath id={clip}>
          <rect x={0} y={TOP - 8} width={WIDTH} height={BOTTOM - TOP + 16} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        {LEVELS.map((r) => (
          <ellipse
            key={r}
            cx={px(0)}
            cy={py(0)}
            rx={UNIT_X * r}
            ry={(UNIT_Y * r) / Math.sqrt(KAPPA)}
            className="fill-none stroke-zinc-300"
            strokeWidth={1}
          />
        ))}
        {/* The bottom, under the trails, so a walk that arrives shows on top */}
        <circle cx={px(0)} cy={py(0)} r={5} className="fill-paper stroke-ink" strokeWidth={1.5} />
        {trails.map(({ walk, tone }) => {
          const done = Math.min(walk.path.length - 1, Math.floor(played))
          const shown = [...walk.path.slice(0, done + 1), at(walk.path, played)]
          const here = at(walk.path, played)
          const sage = tone === 'momentum'
          return (
            <g key={tone}>
              <polyline
                points={points(shown)}
                className={`fill-none ${sage ? 'stroke-sage' : 'stroke-ink'}`}
                strokeOpacity={sage ? 1 : 0.5}
                strokeWidth={sage ? 2 : 1.5}
                strokeLinejoin="round"
              />
              {walk.path.slice(1, done + 1).map((p, i) => (
                <circle
                  key={i}
                  cx={px(p.x)}
                  cy={py(p.y)}
                  r={2.25}
                  className={sage ? 'fill-sage' : 'fill-ink'}
                  fillOpacity={sage ? 1 : 0.5}
                />
              ))}
              <circle cx={px(here.x)} cy={py(here.y)} r={6} className={sage ? 'fill-sage' : 'fill-ink'} />
            </g>
          )
        })}
      </g>
      {/* Start and bottom */}
      <circle cx={px(START.x)} cy={py(START.y)} r={4} className="fill-none stroke-ink" strokeWidth={1.5} />
      <text x={px(START.x) + 2} y={TOP - 12} {...halo}>
        Start
      </text>
      <text x={px(0)} y={TOP - 12} textAnchor="middle" {...halo}>
        {named ? 'Lowest loss' : 'Hut'}
      </text>
      <text x={WIDTH - 4} y={HEIGHT - 6} textAnchor="end" className={`fill-zinc-faded ${label}`}>
        {named ? 'Gentle weight →' : 'Along the floor →'}
      </text>
      <text x={4} y={HEIGHT - 6} className={`fill-zinc-faded ${label}`}>
        {named ? `↕ Steep weight, ${KAPPA}× as curved` : '↕ Across, between the walls'}
      </text>
    </svg>
  )
}

function describe(trails: Trail[], played: number, named: boolean) {
  const what = named ? 'A loss shaped like a long narrow valley' : 'A long narrow gully seen from above'
  const each = trails.map(({ walk, tone }) => {
    const p = at(walk.path, played)
    return `${tone === 'momentum' ? 'with momentum' : 'plain steps'}, ${distance(p).toFixed(1)} from the bottom`
  })
  return `${what}, with a path from the start toward the bottom: ${each.join('; ')}`
}

export type Show = 'intro' | 'walk' | 'noisy' | 'sledge' | 'both' | 'named'

// One step of the story: plays its trails stride by stride when it mounts.
// Give it a `key` per step.
export default function Gully({
  show,
  trails,
  strides,
}: {
  show: Show
  trails: Trail[]
  strides: number
}) {
  const span = show === 'intro' ? 0 : strides
  const played = usePlay(span, PACE)
  const landed = Math.min(span, Math.floor(played))
  const lead = trails[trails.length - 1]
  const where = lead ? lead.walk.path[landed] : START
  // How far each stride has gone, on average, along the floor and across it
  const average = lead ? perStride(lead.walk, landed) : { x: 0, y: 0 }
  const split = show === 'sledge' || show === 'walk' || show === 'noisy'

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 font-mono text-[0.875rem] uppercase tracking-widest">
        <span className="shrink-0 text-zinc-faded">
          {show === 'intro' ? (
            'Before the first stride'
          ) : (
            <>
              {show === 'named' ? 'Step' : 'Stride'} <span className="text-ink tabular-nums">{landed}</span> of {span}
            </>
          )}
        </span>
        <span className="text-right tabular-nums text-sage-ink">
          {show === 'intro'
            ? `${distance(START).toFixed(0)} m to the hut`
            : trails.length > 1
              ? trails.map((t) => `${t.tone === 'momentum' ? (show === 'named' ? 'momentum' : 'sledge') : show === 'named' ? 'plain' : 'walk'} ${distance(t.walk.path[landed]).toFixed(1)}`).join(' · ')
              : `${distance(where).toFixed(1)} m to go`}
        </span>
      </div>
      <p className="mt-1 font-mono text-[0.875rem] uppercase tracking-widest text-zinc-faded">
        {split && landed > 0 ? (
          <>
            Each stride: <span className="text-ink tabular-nums">{average.x.toFixed(2)}</span> m along,{' '}
            <span className="text-ink tabular-nums">{average.y.toFixed(2)}</span> m across
          </>
        ) : show === 'named' ? (
          'Ink: plain SGD · sage: SGD with momentum'
        ) : show === 'both' ? (
          'Ink: walking · sage: the sledge'
        ) : (
          'Steep walls, a gentle floor'
        )}
      </p>
      <div className="mt-2">
        <GullyMap trails={trails} played={played} named={show === 'named'} />
      </div>
    </div>
  )
}
