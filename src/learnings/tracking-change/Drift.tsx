import { useEffect, useRef, useState } from 'react'
import { meanOf, type Run } from '../../components/explain/bandit'
import { Readout } from '../../components/explain/figure'
import { bins, MACHINES, percent, ready, run, STEP_SIZES, STEPS, WORLDS, type Step, type World } from './model'

const WIDTH = 640
const HEIGHT = 250
const LEFT = 44
const RIGHT = 560
const TOP = 16
const BOTTOM = 206
// Pulls averaged together in the lines, so they show the trend
const EVERY = 50
// The pulls the readouts are over: the last thousand
const TAIL = 1000

const x = (pull: number) => LEFT + (pull / STEPS) * (RIGHT - LEFT)
const y = (share: number) => BOTTOM - share * (BOTTOM - TOP)
const line = (best: number[]) =>
  bins(best, EVERY)
    .map((share, i) => `${i ? 'L' : 'M'}${x((i + 0.5) * EVERY).toFixed(1)},${y(share).toFixed(1)}`)
    .join(' ')
const end = (best: number[]) => y(bins(best, EVERY).at(-1)!)

// The changing testbed: on each of MACHINES ten-armed machines, the share
// pulling the arm that is best at that moment, for the plain average and a
// constant step. A run takes a moment, so it is worked out after the page
// has drawn, and the figure keeps showing the last one until it is.
export default function Drift({ world, step }: { world: World; step: Step }) {
  const [, redraw] = useState(0)
  const plainNow = ready(world, 'average')
  const steadyNow = ready(world, step)
  const shown = useRef<{ plain: Run; steady: Run; step: Step } | null>(null)
  if (plainNow && steadyNow) shown.current = { plain: plainNow, steady: steadyNow, step }

  useEffect(() => {
    // This setting first, then the others the figure offers, one at a time,
    // so a choice the reader makes later is ready
    const waiting = [
      [world, 'average'],
      [world, step],
      ...WORLDS.flatMap((w) => (['average', ...STEP_SIZES] as Step[]).map((s) => [w, s])),
    ].find(([w, s]) => !ready(w as World, s as Step)) as [World, Step] | undefined
    if (!waiting) return
    const id = setTimeout(() => {
      run(...waiting)
      redraw((n) => n + 1)
    }, 30)
    return () => clearTimeout(id)
  })

  const current = shown.current
  if (!current) {
    return (
      <div className="flex aspect-[640/250] items-center justify-center font-mono text-[0.8rem] uppercase tracking-widest text-zinc-faded">
        Working out {MACHINES} machines…
      </div>
    )
  }
  const { plain, steady } = current
  const plainEnd = end(plain.best)
  const steadyEnd = end(steady.best)
  const nudge = Math.max(0, 14 - Math.abs(plainEnd - steadyEnd)) / 2
  const steadyAbove = steadyEnd <= plainEnd

  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Share of machines pulling the best arm, over the pulls">
        {[0, 0.25, 0.5, 0.75, 1].map((share) => (
          <g key={share}>
            <line x1={LEFT} x2={RIGHT} y1={y(share)} y2={y(share)} className="stroke-zinc-200 dark:stroke-zinc-200/10" />
            <text x={LEFT - 8} y={y(share) + 4} textAnchor="end" className="fill-zinc-400 font-mono text-[11px]">
              {percent(share)}
            </text>
          </g>
        ))}
        {[0, 500, 1000, 1500, 2000, 2500].map((pull) => (
          <text key={pull} x={x(pull)} y={BOTTOM + 16} textAnchor="middle" className="fill-zinc-400 font-mono text-[11px]">
            {pull.toLocaleString('en')}
          </text>
        ))}
        <text x={(LEFT + RIGHT) / 2} y={HEIGHT - 4} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
          Pulls, on each of {MACHINES} machines
        </text>
        <path d={line(plain.best)} fill="none" className="stroke-ink" strokeWidth={2} strokeLinejoin="round" />
        <path d={line(steady.best)} fill="none" className="stroke-sage" strokeWidth={2} strokeLinejoin="round" />
        <text
          x={RIGHT + 8}
          y={plainEnd + 4 + (steadyAbove ? nudge : -nudge)}
          className="fill-ink font-mono text-[11px] uppercase tracking-widest"
        >
          Average
        </text>
        <text
          x={RIGHT + 8}
          y={steadyEnd + 4 + (steadyAbove ? -nudge : nudge)}
          className="fill-sage font-mono text-[11px] uppercase tracking-widest"
        >
          Step {current.step}
        </text>
      </svg>

      <div className="mt-4 flex flex-wrap gap-x-10 gap-y-4">
        <Readout label="Best arm, last 1,000 · average" value={percent(meanOf(plain.best, STEPS - TAIL))} />
        <Readout label={`Best arm, last 1,000 · ${current.step}`} value={percent(meanOf(steady.best, STEPS - TAIL))} accent />
      </div>
    </div>
  )
}
