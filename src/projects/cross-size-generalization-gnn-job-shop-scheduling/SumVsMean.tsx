import { motion } from 'motion/react'
import { usePrefersReducedMotion } from '../../hooks'

// What a step hears from its rivals for a machine, added up or averaged, as
// the number of rivals grows. Each rival says roughly "1"; the sum grows with
// them, the average doesn't. Training only ever had 9 rivals.
const TRAINED = 9
const MOST = 99

export default function SumVsMean({ rivals }: { rivals: number }) {
  const reducedMotion = usePrefersReducedMotion()
  const W = 640
  const L = 120
  const R = 70
  const x = (v: number) => L + (Math.min(v, MOST) / MOST) * (W - L - R)
  const spring = reducedMotion ? { duration: 0 } : { type: 'spring' as const, stiffness: 140, damping: 20 }
  const rows = [
    { name: 'Added up', value: rivals, tone: 'fill-ink' },
    { name: 'Averaged', value: 1, tone: 'fill-sage' },
  ]
  return (
    <svg viewBox={`0 0 ${W} 170`} className="w-full" role="img" aria-label={`With ${rivals} rivals: the sum is ${rivals}, the average is 1`}>
      {/* What the model saw while training */}
      <rect x={L} y={14} width={x(TRAINED) - L} height={116} className="fill-sage/10" />
      <text x={x(TRAINED) + 6} y={26} className="fill-sage font-mono text-[11px]">
        seen in training (≤ {TRAINED} rivals)
      </text>
      {rows.map((row, k) => (
        <g key={row.name}>
          <text x={L - 12} y={62 + k * 46} textAnchor="end" className="fill-zinc-faded font-mono text-[12px]">
            {row.name}
          </text>
          <motion.rect
            x={L}
            y={46 + k * 46}
            height={26}
            className={row.tone}
            initial={false}
            animate={{ width: Math.max(2, x(row.value) - L) }}
            transition={spring}
          />
          <motion.text
            y={64 + k * 46}
            className="fill-ink font-mono text-[12px]"
            initial={false}
            animate={{ x: x(row.value) + 8 }}
            transition={spring}
          >
            {row.value}
          </motion.text>
        </g>
      ))}
      <text x={L} y={158} className="fill-zinc-400 font-mono text-[11px]">
        0
      </text>
      <text x={W - R} y={158} textAnchor="end" className="fill-zinc-400 font-mono text-[11px]">
        {MOST}
      </text>
    </svg>
  )
}
