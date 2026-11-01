import { useMemo } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { seeded } from '../../components/explain/random'
import { NARROW, useWidth } from '../../components/case/useWidth'
import { usePrefersReducedMotion } from '../../hooks'

// A job shop as a graph: one dot per step of a job (an operation), jobs as
// rows, steps in order along each. Plain: every two steps that need the same
// machine are linked, so links pile up as jobs are added. Hubs: one node per
// machine instead, and each step links only to its machine.

const M = 3
const MACHINE_TONE = ['stroke-sage', 'stroke-[#b08d57]', 'stroke-[#8a7fa8]']
const MACHINE_FILL = ['fill-sage', 'fill-[#b08d57]', 'fill-[#8a7fa8]']

// Each job visits the 3 machines in its own order
function routes(jobs: number): number[][] {
  const random = seeded(4)
  return Array.from({ length: jobs }, () => {
    const order = [0, 1, 2]
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[order[i], order[j]] = [order[j], order[i]]
    }
    return order
  })
}

export default function ShopGraph({ jobs, hubs }: { jobs: number; hubs: boolean }) {
  const reducedMotion = usePrefersReducedMotion()
  const machinesOf = useMemo(() => routes(10), [])
  // Drawn at the width it is shown, so its labels keep their size on a phone
  const { ref, width: W } = useWidth<HTMLDivElement>()
  const narrow = W < NARROW
  const H = 330
  const left = narrow ? 62 : 120
  const gap = narrow ? (W - left - 72) / 2 : 130
  const colX = (j: number) => left + j * gap
  const rowY = (i: number) => 24 + (i + 0.5) * ((H - 48) / jobs)
  const hubX = narrow ? W - 26 : 560
  const hubY = (m: number) => 70 + m * 95

  const ops = Array.from({ length: jobs }, (_, i) =>
    Array.from({ length: M }, (_, j) => ({ i, j, m: machinesOf[i][j], x: colX(j), y: rowY(i) }))
  ).flat()

  const conflicts: { a: (typeof ops)[number]; b: (typeof ops)[number] }[] = []
  if (!hubs) {
    for (let p = 0; p < ops.length; p++)
      for (let q = p + 1; q < ops.length; q++) if (ops[p].m === ops[q].m) conflicts.push({ a: ops[p], b: ops[q] })
  }
  const fade = reducedMotion ? { duration: 0 } : { duration: 0.35 }

  return (
    <div ref={ref}>
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block max-w-full" role="img" aria-label={`${jobs} jobs on 3 machines, ${hubs ? 'with machine hubs' : `${conflicts.length} same-machine links`}`}>
      {Array.from({ length: jobs }, (_, i) => (
        <text key={`job${i}`} x={left - (narrow ? 18 : 40)} y={rowY(i) + 4} textAnchor="end" className="fill-zinc-400 font-mono text-[12px]">
          job {i + 1}
        </text>
      ))}

      {/* Same-machine links, curved so they can be told apart */}
      <AnimatePresence>
        {conflicts.map(({ a, b }) => {
          const bend = (a.x === b.x ? 46 : 18) * (a.i % 2 ? 1 : -1)
          const mx = (a.x + b.x) / 2 + bend
          const my = (a.y + b.y) / 2
          return (
            <motion.path
              key={`c${a.i}${a.j}-${b.i}${b.j}`}
              d={`M${a.x},${a.y} Q${mx},${my} ${b.x},${b.y}`}
              fill="none"
              className={MACHINE_TONE[a.m]}
              strokeWidth={1}
              strokeOpacity={0.55}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={fade}
            />
          )
        })}
      </AnimatePresence>

      {/* Links to machine hubs */}
      <AnimatePresence>
        {hubs &&
          ops.map((op) => (
            <motion.line
              key={`h${op.i}${op.j}`}
              x1={op.x}
              y1={op.y}
              x2={hubX}
              y2={hubY(op.m)}
              className={MACHINE_TONE[op.m]}
              strokeWidth={1}
              strokeOpacity={0.45}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={fade}
            />
          ))}
      </AnimatePresence>

      {/* Job order: each step after the one before */}
      {Array.from({ length: jobs }, (_, i) =>
        [0, 1].map((j) => (
          <line
            key={`o${i}${j}`}
            x1={colX(j) + 9}
            y1={rowY(i)}
            x2={colX(j + 1) - 11}
            y2={rowY(i)}
            className="stroke-ink"
            strokeWidth={1.5}
            markerEnd="url(#shop-arrow)"
          />
        ))
      )}
      <defs>
        <marker id="shop-arrow" viewBox="0 0 8 8" refX={7} refY={4} markerWidth={6} markerHeight={6} orient="auto">
          <path d="M0,0 L8,4 L0,8 z" className="fill-ink" />
        </marker>
      </defs>

      {ops.map((op) => (
        <motion.circle
          key={`n${op.i}${op.j}`}
          cx={op.x}
          cy={op.y}
          r={jobs > 7 ? 6 : 8}
          className={`${MACHINE_FILL[op.m]} stroke-paper`}
          strokeWidth={2}
          initial={reducedMotion ? false : { scale: 0 }}
          animate={{ scale: 1 }}
        />
      ))}

      <AnimatePresence>
        {hubs &&
          Array.from({ length: M }, (_, m) => (
            <motion.g key={`hub${m}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={fade}>
              <rect x={hubX - 18} y={hubY(m) - 18} width={36} height={36} rx={4} className={`${MACHINE_FILL[m]}`} />
              <text x={hubX} y={hubY(m) + 5} textAnchor="middle" className="fill-paper font-mono text-[12px]">
                M{m + 1}
              </text>
            </motion.g>
          ))}
      </AnimatePresence>
    </svg>
    </div>
  )
}
