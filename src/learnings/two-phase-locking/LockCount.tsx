import { COUNTS, RULES } from './model'

const W = 640
const LEFT = 112
const RIGHT = 628
const ROW = 92
const TALL = 48
const UNIT = TALL / 3

// How many locks one transaction holds as it updates A, B and C in turn,
// under each rule: one row per rule, time running left to right, an event a
// step. Sage where a lock is taken; ink where one is taken after an unlock.
export default function LockCount() {
  return (
    <svg
      viewBox={`0 0 ${W} ${RULES.length * ROW}`}
      className="w-full"
      role="img"
      aria-label="Locks held over time. Locks only: up and down three times. 2PL: up to three, then down to none. Strict 2PL: up to three, held until commit, then all released."
    >
      {RULES.map((rule, row) => {
        const { steps, lockPoint } = COUNTS[rule]
        const dx = (RIGHT - LEFT) / (steps.length + 1)
        const base = row * ROW + 18 + TALL
        const x = (k: number) => LEFT + (k + 1) * dx
        const y = (count: number) => base - count * UNIT
        // A step line: each event's count holds until the next event
        let d = `M${LEFT},${y(0)}`
        let prev = 0
        steps.forEach((s, k) => {
          d += ` L${x(k)},${y(prev)} L${x(k)},${y(s.count)}`
          prev = s.count
        })
        d += ` L${RIGHT},${y(prev)}`
        return (
          <g key={rule}>
            <text x={0} y={base - TALL / 2 + 4} className="fill-ink font-mono text-[11px] uppercase tracking-widest">
              {rule}
            </text>
            {[1, 2, 3].map((c) => (
              <line key={c} x1={LEFT} x2={RIGHT} y1={y(c)} y2={y(c)} className="stroke-zinc-300 dark:stroke-zinc-200/25" strokeDasharray="2 5" />
            ))}
            <text x={LEFT - 8} y={y(3) + 3.5} textAnchor="end" className="fill-zinc-faded font-mono text-[10px]">
              3
            </text>
            <text x={LEFT - 8} y={y(0) + 3.5} textAnchor="end" className="fill-zinc-faded font-mono text-[10px]">
              0
            </text>
            <line x1={LEFT} x2={RIGHT} y1={base} y2={base} className="stroke-zinc-400" />
            {rule !== 'Locks only' && (
              <g>
                <line x1={x(lockPoint)} x2={x(lockPoint)} y1={y(3) - 8} y2={base} className="stroke-sage" strokeDasharray="3 3" />
                <text x={x(lockPoint)} y={y(3) - 11} textAnchor="middle" className="fill-sage-ink font-mono text-[10px]">
                  lock point
                </text>
              </g>
            )}
            <path d={d} className="fill-none stroke-ink" strokeWidth={1.8} />
            {steps.map((s, k) => {
              if (s.kind === 'commit')
                return (
                  <text key={k} x={x(k)} y={base + 14} textAnchor="middle" className="fill-zinc-faded font-mono text-[10px]">
                    commit
                  </text>
                )
              if (s.kind !== 'lock') return null
              const late = steps.slice(0, k).some((p) => p.kind === 'unlock')
              return <circle key={k} cx={x(k)} cy={y(s.count)} r={4} className={late ? 'fill-ink' : 'fill-sage'} />
            })}
          </g>
        )
      })}
    </svg>
  )
}
