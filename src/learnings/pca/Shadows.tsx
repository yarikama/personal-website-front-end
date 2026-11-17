import type { ReactNode } from 'react'
import { lerp, usePlay } from '../../components/explain/useLoop'
import { ALONG, LOAF, LOAF_REACH, LOAF_TOTAL, loafKept, loafMissed, unit, type Vec } from './model'

const WIDTH = 560
const HEIGHT = 340
// The loaf, the lamp and the card, on the left
const CX = 168
const CY = 170
const SCALE = 13
// How far the card stands from the middle of the loaf, and how long it is,
// in the loaf's units
const CARD_OFF = LOAF_REACH.along + 1.2
const CARD_HALF = LOAF_REACH.along + 0.5
// The spread by card angle, on the right
const CHART = { left: 370, right: 540, top: 70, bottom: 250 }
const TOP_SPREAD = 10

const px = (p: Vec) => CX + SCALE * p[0]
const py = (p: Vec) => CY - SCALE * p[1]
const along = (u: Vec, t: number, n: Vec, off: number): Vec => [t * u[0] + off * n[0], t * u[1] + off * n[1]]
// The card's side of the loaf: a quarter turn clockwise from its direction
const sideOf = (u: Vec): Vec => [u[1], -u[0]]

const chartX = (angle: number) => CHART.left + (angle / 180) * (CHART.right - CHART.left)
const chartY = (spread: number) => CHART.bottom - (spread / TOP_SPREAD) * (CHART.bottom - CHART.top)
function curve(of: (angle: number) => number, upTo: number) {
  const points: string[] = []
  for (let a = 0; a <= upTo + 1e-9; a += 1.5) points.push(`${points.length ? 'L' : 'M'}${chartX(a).toFixed(1)},${chartY(of(a)).toFixed(1)}`)
  return points.join(' ')
}

const one = (value: number) => value.toFixed(1)

export type Show = 'scene' | 'front' | 'end' | 'round' | 'missed' | 'named'

// How each step moves the card: from one angle to another, at `pace` ms a
// degree (0 holds still)
const MOVES: Record<Show, { from: number; to: number; pace: number }> = {
  scene: { from: 0, to: 0, pace: 0 },
  front: { from: 0, to: 0, pace: 0 },
  end: { from: 0, to: 135, pace: 20 },
  round: { from: 0, to: 180 + ALONG, pace: 22 },
  missed: { from: 0, to: ALONG, pace: 50 },
  named: { from: ALONG, to: ALONG, pace: 0 },
}

// The story's loaf of seeds lit by a lamp, its shadow on a card across from
// the lamp, and how spread out the shadows are for every angle of the card.
// Give it a `key` per step, so each step plays from its start.
export default function Shadows({ show }: { show: Show }) {
  const move = MOVES[show]
  const span = move.pace ? Math.abs(move.to - move.from) : 1
  const played = usePlay(span, move.pace || 900)
  const angle = move.pace ? move.from + Math.sign(move.to - move.from) * played : move.from
  // Shadows fall in over the first step that shows them
  const fall = show === 'scene' ? 0 : show === 'front' ? Math.min(1, played) : 1
  const named = show === 'named'
  const misses = show === 'missed' || named

  const u = unit(angle)
  const n = sideOf(u)
  const keptNow = loafKept(angle)
  const missedNow = loafMissed(angle)
  const swept = show === 'round' && angle >= 180 ? 180 : angle % 180
  const traced = show === 'front' || show === 'scene' ? 0 : swept
  const full = show === 'missed' || named || (show === 'round' && angle >= 180)

  const ends = [along(u, -CARD_HALF, n, CARD_OFF), along(u, CARD_HALF, n, CARD_OFF)]
  const lamp = along(u, 0, n, -CARD_OFF - 0.6)

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 font-mono text-[0.875rem] uppercase tracking-widest">
        <span className="shrink-0 text-zinc-faded">{named ? `Direction u at ${Math.round(angle)}°` : `Card at ${Math.round(angle % 180)}°`}</span>
        <span className="text-right text-zinc-faded">
          {show === 'scene' ? (
            ' '
          ) : (
            <>
              {named ? 'Variance' : 'Spread'} <span className="text-sage-ink tabular-nums">{one(keptNow)}</span>
              {misses && (
                <>
                  {' '}
                  · {named ? 'error' : 'missed'} <span className="text-ink tabular-nums">{one(missedNow)}</span>
                </>
              )}
            </>
          )}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-2 w-full"
        role="img"
        aria-label={`A loaf dotted with ${LOAF.length} seeds, lying at 45 degrees. A lamp on one side casts the seeds' shadows on a card at ${Math.round(angle % 180)} degrees on the other. The shadows' spread is ${one(keptNow)} of ${LOAF_TOTAL}.`}
      >
        {/* The loaf */}
        <rect
          x={CX - SCALE * (LOAF_REACH.along + 0.6)}
          y={CY - SCALE * (LOAF_REACH.across + 0.6)}
          width={2 * SCALE * (LOAF_REACH.along + 0.6)}
          height={2 * SCALE * (LOAF_REACH.across + 0.6)}
          rx={SCALE * (LOAF_REACH.across + 0.6)}
          transform={`rotate(-45 ${CX} ${CY})`}
          className="fill-zinc-400/15 stroke-zinc-300 dark:stroke-zinc-200/25"
        />

        {/* Light from the lamp to the card, one ray a seed */}
        {fall > 0 &&
          !misses &&
          LOAF.map((p, i) => {
            const t = p[0] * u[0] + p[1] * u[1]
            const shadow = along(u, t, n, CARD_OFF)
            const tip: Vec = [lerp(p[0], shadow[0], fall), lerp(p[1], shadow[1], fall)]
            return <line key={i} x1={px(p)} y1={py(p)} x2={px(tip)} y2={py(tip)} className="stroke-zinc-300 dark:stroke-zinc-200/25" strokeWidth={0.8} />
          })}

        {/* What a shadow misses: each seed's distance off the line through the middle */}
        {misses && (
          <g>
            <line
              x1={px(along(u, -CARD_HALF - 0.5, n, 0))}
              y1={py(along(u, -CARD_HALF - 0.5, n, 0))}
              x2={px(along(u, CARD_HALF + 0.5, n, 0))}
              y2={py(along(u, CARD_HALF + 0.5, n, 0))}
              className="stroke-sage"
              strokeWidth={1.5}
              strokeDasharray="5 4"
            />
            {LOAF.map((p, i) => {
              const t = p[0] * u[0] + p[1] * u[1]
              const foot = along(u, t, n, 0)
              return <line key={i} x1={px(p)} y1={py(p)} x2={px(foot)} y2={py(foot)} className="stroke-ink" strokeWidth={1.2} />
            })}
          </g>
        )}

        {/* The seeds */}
        {LOAF.map((p, i) => (
          <circle key={i} cx={px(p)} cy={py(p)} r={2.8} className="fill-ink" />
        ))}

        {/* The lamp and the card */}
        {!named && (
          <g>
            <circle cx={px(lamp)} cy={py(lamp)} r={7} className="fill-paper stroke-zinc-400" strokeWidth={1.5} />
            <circle cx={px(lamp)} cy={py(lamp)} r={3} className="fill-zinc-400" />
          </g>
        )}
        <line x1={px(ends[0])} y1={py(ends[0])} x2={px(ends[1])} y2={py(ends[1])} className="stroke-zinc-400" strokeWidth={3} strokeLinecap="round" />
        {fall > 0 &&
          LOAF.map((p, i) => {
            const t = p[0] * u[0] + p[1] * u[1]
            const shadow = along(u, t, n, CARD_OFF)
            return <circle key={i} cx={px(shadow)} cy={py(shadow)} r={2.6} className="fill-sage" opacity={fall} />
          })}

        {show === 'scene' && (
          <g className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
            <text x={px(lamp)} y={py(lamp) - 14} textAnchor="middle">
              lamp
            </text>
            <text x={px(ends[1]) + 8} y={py(ends[1]) + 4}>
              card
            </text>
          </g>
        )}
        {named && <Names u={u} n={n} />}

        <Chart traced={traced} full={full} angle={angle % 180} misses={misses} named={named} live={show !== 'scene'} />
      </svg>
    </div>
  )
}

// The reveal: what each part of the scene is called
function Names({ u, n }: { u: Vec; n: Vec }) {
  // A seed far out along the loaf, to point at
  const seed = LOAF.reduce((best, p) => (p[0] * u[0] + p[1] * u[1] > best[0] * u[0] + best[1] * u[1] ? p : best))
  const shadowLabel = along(u, 2, n, CARD_OFF + 2.6)
  const lineEnd = along(u, -CARD_HALF - 0.5, n, 0)
  const second = unit(135)
  return (
    <g className="font-mono text-[11px]">
      <line
        x1={px([-4.6 * second[0], -4.6 * second[1]])}
        y1={py([-4.6 * second[0], -4.6 * second[1]])}
        x2={px([4.6 * second[0], 4.6 * second[1]])}
        y2={py([4.6 * second[0], 4.6 * second[1]])}
        className="stroke-zinc-400"
        strokeDasharray="2 4"
      />
      <text x={px([5 * second[0], 5 * second[1]])} y={py([5 * second[0], 5 * second[1]]) - 8} textAnchor="middle" className="fill-zinc-faded">
        2nd component
      </text>
      <text x={px(seed) + 8} y={py(seed) - 6} className="fill-ink">
        data point x
      </text>
      <text x={px(shadowLabel)} y={py(shadowLabel)} textAnchor="middle" className="fill-sage-ink">
        projections
      </text>
      <text x={px(lineEnd) - 6} y={py(lineEnd) + 16} textAnchor="middle" className="fill-sage-ink">
        1st component, u
      </text>
    </g>
  )
}

// The spread of the shadows for every angle of the card, traced as far as
// the card has turned, with what they miss and the total once shown
function Chart({
  traced,
  full,
  angle,
  misses,
  named,
  live,
}: {
  traced: number
  full: boolean
  angle: number
  misses: boolean
  named: boolean
  live: boolean
}): ReactNode {
  const upTo = full ? 180 : traced
  return (
    <g>
      {misses ? (
        <text x={CHART.left} y={CHART.top - 22} className="font-mono text-[11px] uppercase tracking-widest">
          <tspan className="fill-sage-ink">kept</tspan>
          <tspan className="fill-zinc-faded">{'\u00a0·\u00a0'}</tspan>
          <tspan className="fill-ink">{named ? 'error' : 'missed'}</tspan>
        </text>
      ) : (
        <text x={CHART.left} y={CHART.top - 22} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
          {named ? 'variance along u' : 'spread of the shadows'}
        </text>
      )}
      <line x1={CHART.left} x2={CHART.right} y1={CHART.bottom} y2={CHART.bottom} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
      <line x1={CHART.left} x2={CHART.left} y1={CHART.top} y2={CHART.bottom} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
      {[0, 5, 10].map((s) => (
        <text key={s} x={CHART.left - 6} y={chartY(s) + 4} textAnchor="end" className="fill-zinc-faded font-mono text-[11px]">
          {s}
        </text>
      ))}
      {[0, 45, 90, 135, 180].map((a) => (
        <text key={a} x={chartX(a)} y={CHART.bottom + 16} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px]">
          {a}°
        </text>
      ))}
      <text x={(CHART.left + CHART.right) / 2} y={CHART.bottom + 34} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
        {named ? 'direction u' : 'card angle'}
      </text>

      {misses && (
        <g>
          <line x1={CHART.left} x2={CHART.right} y1={chartY(LOAF_TOTAL)} y2={chartY(LOAF_TOTAL)} className="stroke-zinc-400" strokeDasharray="3 4" />
          <text x={CHART.right} y={chartY(LOAF_TOTAL) - 6} textAnchor="end" className="fill-zinc-faded font-mono text-[11px]">
            {named ? 'total variance' : 'kept + missed'}
          </text>
          <path d={curve(loafMissed, 180)} className="fill-none stroke-ink" strokeWidth={1.5} strokeDasharray="5 3" />
        </g>
      )}
      {upTo > 0 && <path d={curve(loafKept, upTo)} className="fill-none stroke-sage" strokeWidth={2.5} />}
      {live && (
        <g>
          <line x1={chartX(angle)} x2={chartX(angle)} y1={CHART.bottom} y2={chartY(loafKept(angle))} className="stroke-sage" strokeDasharray="2 3" />
          <circle cx={chartX(angle)} cy={chartY(loafKept(angle))} r={4.5} className="fill-sage" />
          {misses && <circle cx={chartX(angle)} cy={chartY(loafMissed(angle))} r={4} className="fill-paper stroke-ink" strokeWidth={1.5} />}
        </g>
      )}
    </g>
  )
}
