import { lerp } from '../../components/explain/useLoop'
import { CLEAR, JAMMED, SIDE, type Trip, type Turn } from './model'

// The commute, drawn: home on the left, work on the right, and at each
// junction two ways to the next, the main road straight along the bottom and
// the side street bowed over the top. It only draws: the story says which
// trip to show, how far along it the car is, and what to write on each way.

export const WIDTH = 400
export const HEIGHT = 180
const LEFT = 34
const RIGHT = 366
const MAIN_Y = 122
// The control point of each side street's curve, which peaks halfway to it
const BOW_Y = -8

const nodeX = (k: number, legs: number) => LEFT + ((RIGHT - LEFT) * k) / legs

// A point a share `t` of the way along leg `k`
function point(k: number, legs: number, turn: Turn, t: number) {
  const x0 = nodeX(k, legs)
  const x1 = nodeX(k + 1, legs)
  if (turn === 'main') return { x: lerp(x0, x1, t), y: MAIN_Y }
  const u = 1 - t
  return { x: u * u * x0 + 2 * u * t * ((x0 + x1) / 2) + t * t * x1, y: u * u * MAIN_Y + 2 * u * t * BOW_Y + t * t * MAIN_Y }
}

const sidePath = (k: number, legs: number) =>
  `M${nodeX(k, legs)},${MAIN_Y} Q${(nodeX(k, legs) + nodeX(k + 1, legs)) / 2},${BOW_Y} ${nodeX(k + 1, legs)},${MAIN_Y}`
const mainPath = (k: number, legs: number) => `M${nodeX(k, legs)},${MAIN_Y} L${nodeX(k + 1, legs)},${MAIN_Y}`

// What to write on each way of a leg: a big label and a small one under it
export interface Labels {
  main: string
  side: string
  mainNote?: string
  sideNote?: string
}

export default function Road({
  label,
  legs = 3,
  trip = null,
  driven = 0,
  labels,
  tone = 'sage',
}: {
  label: string
  legs?: number
  // The trip to light, and how far along it the car is, in legs
  trip?: Trip | null
  driven?: number
  // What each leg's two ways say
  labels?: (k: number) => Labels | null
  tone?: 'sage' | 'ink'
}) {
  const car = trip
    ? (() => {
        const k = Math.min(legs - 1, Math.floor(driven))
        return point(k, legs, trip[k].turn, Math.min(1, driven - k))
      })()
    : { x: nodeX(0, legs), y: MAIN_Y }
  const stroke = tone === 'sage' ? 'stroke-sage' : 'stroke-ink'

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mx-auto w-full max-w-[32rem]" role="img" aria-label={label}>
      {Array.from({ length: legs }, (_, k) => {
        const leg = trip?.[k]
        // A way is lit once the car has started down it
        const lit = leg && driven > k
        const mid = (nodeX(k, legs) + nodeX(k + 1, legs)) / 2
        const text = labels?.(k)
        return (
          <g key={k}>
            <path d={sidePath(k, legs)} fill="none" className="stroke-zinc-300 dark:stroke-zinc-200/25" strokeWidth={2} />
            <path d={mainPath(k, legs)} fill="none" className="stroke-zinc-300 dark:stroke-zinc-200/25" strokeWidth={2} />
            {lit && (
              <path
                d={leg.turn === 'main' ? mainPath(k, legs) : sidePath(k, legs)}
                fill="none"
                className={leg.jammed ? 'stroke-ink' : stroke}
                strokeWidth={leg.jammed ? 4 : 3}
                strokeDasharray={leg.jammed ? '3 3' : undefined}
              />
            )}
            {lit && leg.jammed && (
              <text x={mid} y={MAIN_Y - 8} textAnchor="middle" className="fill-ink font-mono text-[10px] uppercase tracking-widest">
                jam
              </text>
            )}
            {text && (
              <g>
                <text x={mid} y={MAIN_Y + 24} textAnchor="middle" className={`font-mono text-[13px] tabular-nums ${lit && leg?.turn === 'main' ? 'fill-sage' : 'fill-ink'}`}>
                  {text.main}
                </text>
                {text.mainNote && (
                  <text x={mid} y={MAIN_Y + 40} textAnchor="middle" className="fill-zinc-400 font-mono text-[10px]">
                    {text.mainNote}
                  </text>
                )}
                <text x={mid} y={(MAIN_Y + BOW_Y) / 2 + 22} textAnchor="middle" className={`font-mono text-[13px] tabular-nums ${lit && leg?.turn === 'side' ? 'fill-sage' : 'fill-ink'}`}>
                  {text.side}
                </text>
                {text.sideNote && (
                  <text x={mid} y={(MAIN_Y + BOW_Y) / 2 - 12} textAnchor="middle" className="fill-zinc-400 font-mono text-[10px]">
                    {text.sideNote}
                  </text>
                )}
              </g>
            )}
          </g>
        )
      })}
      {Array.from({ length: legs + 1 }, (_, k) => (
        <circle key={k} cx={nodeX(k, legs)} cy={MAIN_Y} r={k === 0 || k === legs ? 6 : 4} className="fill-paper stroke-zinc-400" strokeWidth={1.5} />
      ))}
      <text x={nodeX(0, legs)} y={MAIN_Y + 24} textAnchor="middle" className="fill-zinc-400 font-mono text-[10px] uppercase tracking-widest">
        Home
      </text>
      <text x={nodeX(legs, legs)} y={MAIN_Y + 24} textAnchor="middle" className="fill-zinc-400 font-mono text-[10px] uppercase tracking-widest">
        Work
      </text>
      <circle cx={car.x} cy={car.y} r={7} className={`${tone === 'sage' ? 'fill-sage' : 'fill-ink'} stroke-paper`} strokeWidth={2} />
    </svg>
  )
}

// The minutes each way takes, to write under the odds
export const MAIN_NOTE = `${CLEAR} or ${JAMMED} min`
export const SIDE_NOTE = `${SIDE} min`
