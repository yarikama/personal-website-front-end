import { useMemo, useRef, useState } from 'react'
import { useAnimationFrame } from 'motion/react'
import { usePrefersReducedMotion } from '../../hooks'
import { ARMS, machine, MACHINE_SEED, preferencesOf, PULLS } from './model'

const WIDTH = 640
const HEIGHT = 340
const COLUMN = 56
const FIRST = 68
const BAR = 26
// Preferences, either side of a zero line; chances, up from a floor
const ZERO = 96
const PER_UNIT = 13
const LIMIT = 5
const FLOOR = 292
const FULL = 90
// The run plays faster as it goes: the first pulls slowly, so each one shows
const SECONDS = 15

const x = (arm: number) => FIRST + arm * COLUMN

// One machine of ten arms, and a learner pulling them: above, each arm's
// preference; below, its chance of being pulled next. The arm that really
// pays best is in sage. Plays a thousand pulls once, faster as it goes.
export default function OneMachine({ alpha, baseline }: { alpha: number; baseline: boolean }) {
  const reducedMotion = usePrefersReducedMotion()
  const run = useMemo(() => machine(MACHINE_SEED, alpha, baseline), [alpha, baseline])
  const started = useRef<number | null>(null)
  const [pulls, setPulls] = useState(reducedMotion ? PULLS : 0)

  useAnimationFrame((time) => {
    if (pulls >= PULLS) return
    started.current ??= time
    const seconds = (time - started.current) / 1000
    setPulls(Math.min(PULLS, Math.floor(PULLS * (seconds / SECONDS) ** 2)))
  })

  const chances = pulls > 0 ? run.chances[pulls - 1] : Array.from({ length: ARMS }, () => 1 / ARMS)
  const preferences = preferencesOf(chances)
  const last = pulls > 0 ? run.arms[pulls - 1] : null

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 font-mono text-[0.8rem] uppercase tracking-widest">
        <span className="shrink-0 text-zinc-faded">
          Pull <span className="text-ink tabular-nums">{pulls}</span> of {PULLS}
        </span>
        <span className="text-right text-zinc-faded">
          Best arm’s chance <span className="text-sage tabular-nums">{Math.round(chances[run.best] * 100)}%</span>
        </span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-2 w-full"
        role="img"
        aria-label="Ten arms: each arm's preference and its chance of being pulled, as a learner pulls them"
      >
        <text x={0} y={18} className="fill-zinc-faded font-mono text-[13px] uppercase tracking-widest">
          Preference H
        </text>
        <text x={0} y={FLOOR - FULL - 22} className="fill-zinc-faded font-mono text-[13px] uppercase tracking-widest">
          Chance <tspan className="normal-case">π</tspan>
        </text>
        <line x1={FIRST - COLUMN / 2} x2={x(ARMS - 1) + COLUMN / 2} y1={ZERO} y2={ZERO} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
        <text x={FIRST - COLUMN / 2 - 6} y={ZERO + 4} textAnchor="end" className="fill-zinc-400 font-mono text-[10px]">
          0
        </text>
        <line x1={FIRST - COLUMN / 2} x2={x(ARMS - 1) + COLUMN / 2} y1={FLOOR} y2={FLOOR} className="stroke-zinc-300 dark:stroke-zinc-200/25" />

        {run.means.map((mean, arm) => {
          const best = arm === run.best
          const h = Math.max(-LIMIT, Math.min(LIMIT, preferences[arm]))
          const height = Math.abs(h) * PER_UNIT
          const chance = chances[arm]
          const fill = best ? 'fill-sage' : 'fill-zinc-400 dark:fill-zinc-500'
          return (
            <g key={arm}>
              <rect x={x(arm) - BAR / 2} y={h >= 0 ? ZERO - height : ZERO} width={BAR} height={height} className={fill} />
              {Math.abs(preferences[arm]) > LIMIT && (
                <text
                  x={x(arm)}
                  y={h > 0 ? ZERO - height - 4 : ZERO + height + 12}
                  textAnchor="middle"
                  className="fill-zinc-faded font-mono text-[10px]"
                >
                  {preferences[arm] > 0 ? '▲' : '▼'}
                </text>
              )}
              <rect x={x(arm) - BAR / 2} y={FLOOR - chance * FULL} width={BAR} height={chance * FULL} className={fill} />
              <text
                x={x(arm)}
                y={FLOOR - chance * FULL - 5}
                textAnchor="middle"
                className={`font-mono text-[12px] tabular-nums ${best ? 'fill-sage' : 'fill-zinc-faded'}`}
              >
                {Math.round(chance * 100)}
              </text>
              {/* The arm, a mark if it was just pulled, and what it pays on average */}
              <text
                x={x(arm)}
                y={FLOOR + 20}
                textAnchor="middle"
                className={`font-mono text-[15px] ${best ? 'fill-sage' : last === arm ? 'fill-ink' : 'fill-zinc-faded'}`}
              >
                {last === arm ? `●${arm + 1}` : arm + 1}
              </text>
              <text
                x={x(arm)}
                y={FLOOR + 40}
                textAnchor="middle"
                className={`font-mono text-[13px] ${best ? 'fill-sage' : 'fill-zinc-400'}`}
              >
                {mean.toFixed(1)}
              </text>
            </g>
          )
        })}
        <text x={0} y={FLOOR + 20} className="fill-zinc-faded font-mono text-[12px] uppercase tracking-widest">
          Arm
        </text>
        <text x={0} y={FLOOR + 40} className="fill-zinc-faded font-mono text-[12px] uppercase tracking-widest">
          Pays
        </text>
      </svg>
    </div>
  )
}
