import { usePlay } from '../../components/explain/useLoop'
import { House, Street, Toll } from './Field'
import { HEIGHT, WIDTH } from './fieldScale'
import {
  between,
  DEEP,
  lineOf,
  metres,
  NEAR,
  roadOf,
  slack,
  STORY,
  STORY_C,
  SWEEP,
  VILLAGES,
  type Point,
  type Road,
} from './model'

export type Show = 'first' | 'near' | 'none' | 'soft' | 'tolls' | 'sweep' | 'named'

const FIRST = roadOf(STORY.first)
const SQUEEZED = roadOf(STORY.squeezed)
const SOFT = roadOf(STORY.soft)
const SWEPT = STORY.sweep.map(roadOf)
// A road shrunk to nothing where it stood
const gone = (road: Road): Road => ({ ...road, half: 0 })
// The sweep starts on the story's rate, climbs to the highest, then falls
// to the lowest
const START = SWEEP.indexOf(STORY_C)
const SWEEP_PATH = [...Array.from({ length: START + 1 }, (_, k) => START - k), ...Array.from({ length: SWEEP.length - 1 }, (_, k) => k + 1)]

interface Plan {
  houses: Point[]
  from: Road
  to: Road
  // A house built during this step
  fresh?: Point
  tolls: 'none' | 'strokes' | 'numbers' | 'symbols'
}
const PLANS: Record<Exclude<Show, 'sweep'>, Plan> = {
  first: { houses: VILLAGES, from: gone(FIRST), to: FIRST, tolls: 'none' },
  near: { houses: STORY.withNear, from: FIRST, to: SQUEEZED, fresh: NEAR, tolls: 'none' },
  none: { houses: STORY.all, from: SQUEEZED, to: gone(SQUEEZED), fresh: DEEP, tolls: 'none' },
  soft: { houses: STORY.all, from: gone(SOFT), to: SOFT, tolls: 'strokes' },
  tolls: { houses: STORY.all, from: SOFT, to: SOFT, tolls: 'numbers' },
  named: { houses: STORY.all, from: SWEPT.at(-1)!, to: SOFT, tolls: 'symbols' },
}

// A paper outline, so a label reads over the street too
const HALO = { strokeWidth: 4, strokeLinejoin: 'round', style: { paintOrder: 'stroke' } } as const

const ease = (f: number) => (f < 0.5 ? 2 * f * f : 1 - (-2 * f + 2) ** 2 / 2)
const odd = (p: Point) => p === NEAR || p === DEEP
const two = (value: number) => value.toFixed(2)

// The two villages and the road between them, one step of the story at a
// time. Each step plays from where the last one left the road; give it a
// `key` to play again.
export default function Villages({ show }: { show: Show }) {
  const played = usePlay(show === 'sweep' ? SWEEP_PATH.length - 1 : 1, show === 'sweep' ? 520 : 1300)

  let road: Road
  let houses: Point[]
  let fresh: Point | undefined
  let tolls: Plan['tolls']
  let rate = STORY_C
  if (show === 'sweep') {
    const at = Math.min(Math.floor(played), SWEEP_PATH.length - 2)
    const f = ease(played - at)
    road = between(SWEPT[SWEEP_PATH[at]], SWEPT[SWEEP_PATH[at + 1]], f)
    rate = Math.exp(Math.log(SWEEP[SWEEP_PATH[at]]) * (1 - f) + Math.log(SWEEP[SWEEP_PATH[at + 1]]) * f)
    houses = STORY.all
    tolls = 'strokes'
  } else {
    const plan = PLANS[show]
    road = between(plan.from, plan.to, ease(played))
    houses = plan.houses
    fresh = plan.fresh
    tolls = plan.tolls
  }

  const line = road.half > 0.001 ? lineOf(road) : null
  const paying = line ? houses.filter((p) => slack(line, p) > 1e-3) : []
  const header =
    show === 'first'
      ? `Road ${metres(STORY.first)} m wide`
      : show === 'near'
        ? `${metres(lineOf(road))} m wide · turned ${Math.round((Math.abs(road.angle - FIRST.angle) * 180) / Math.PI)}°`
        : show === 'none'
          ? played < 1
            ? 'Squeezing…'
            : 'No straight road fits'
          : show === 'sweep'
            ? `${paying.length} houses pay · road ${metres(lineOf(road))} m`
            : show === 'named'
              ? `Street · slack ξ · C = ${STORY_C}`
              : `Road ${metres(lineOf(road))} m wide · tolls allowed`
  const said =
    show === 'named'
      ? `Data points of two classes with the soft-margin street between them, C = ${STORY_C}; ${paying.length} points have slack: ${paying.map((p) => two(slack(line!, p))).join(', ')}`
      : `Two villages, West's houses hollow and East's filled, with a road between them. ${header}.`

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={said}>
      {line && <Street road={road} />}
      {line &&
        tolls !== 'none' &&
        paying.map((p, k) => (
          <Toll
            key={k}
            road={road}
            p={p}
            label={tolls === 'numbers' ? two(slack(line, p)) : tolls === 'symbols' ? `ξ = ${two(slack(line, p))}` : undefined}
          />
        ))}
      {houses.map((p, k) => (
        <House key={k} p={p} ring={odd(p)} grow={p === fresh ? Math.min(1, played * 2.5) : 1} />
      ))}
      <text x={16} y={24} className={`fill-ink stroke-paper font-mono text-[12px] tracking-widest ${show === 'named' ? '' : 'uppercase'}`} {...HALO}>
        {header}
      </text>
      {show === 'sweep' && (
        <text x={WIDTH - 16} y={24} textAnchor="end" className="fill-ink stroke-paper font-mono text-[12px] uppercase tracking-widest tabular-nums"
          {...HALO}>
          Toll rate {rate >= 0.995 ? rate.toFixed(1) : rate.toFixed(2)}
        </text>
      )}
      <text x={16} y={HEIGHT - 14} className={`fill-zinc-faded stroke-paper font-mono text-[11px] tracking-widest ${show === 'named' ? '' : 'uppercase'}`} {...HALO}>
        {show === 'named' ? 'y = −1' : 'West'}
      </text>
      <text x={WIDTH - 16} y={HEIGHT - 14} textAnchor="end" className={`fill-zinc-faded stroke-paper font-mono text-[11px] tracking-widest ${show === 'named' ? '' : 'uppercase'}`} {...HALO}>
        {show === 'named' ? 'y = +1' : 'East'}
      </text>
    </svg>
  )
}
