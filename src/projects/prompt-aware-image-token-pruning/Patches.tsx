import { useMemo } from 'react'
import { motion } from 'motion/react'
import { seeded } from '../../components/explain/random'
import { usePrefersReducedMotion } from '../../hooks'

// A photo cut into LLaVA's 24 × 24 grid, and which quarter of the patches
// each method keeps for the question "What is the brand of this camera?".
// The drawing and the kept patches are an illustration; the answers are the
// models' real ones on this TextVQA question (outputs/distill100k_attn_L8_textvqa.csv).

const N = 24
const CELL = 12
const SIZE = N * CELL
const KEEP = 144

// Where things are in the drawing, in grid cells
const CAMERA = { x: 12, y: 13.5 }
const LABEL = { x: 7.5, y: 9.2 }

type Method = 'all' | 'random' | 'clip' | 'distill'

const PATCH_STEPS: { method: Method; answer?: string; right?: boolean }[] = [
  { method: 'all', answer: 'Dakota digital', right: true },
  { method: 'random', answer: 'Canon' },
  { method: 'clip', answer: 'Polaroid' },
  { method: 'distill', answer: 'Dakota', right: true },
]

function topK(score: (x: number, y: number) => number): Set<number> {
  const cells = Array.from({ length: N * N }, (_, i) => ({ i, s: score(i % N, Math.floor(i / N)) }))
  cells.sort((a, b) => b.s - a.s)
  return new Set(cells.slice(0, KEEP).map((c) => c.i))
}

function kept(): Record<Method, Set<number>> {
  const r1 = seeded(11)
  const r2 = seeded(5)
  const r3 = seeded(8)
  return {
    all: new Set(Array.from({ length: N * N }, (_, i) => i)),
    random: topK(() => r1()),
    // Salient to CLIP: the camera as a whole, densest at its middle
    clip: topK((x, y) => -Math.hypot((x - CAMERA.x) / 1.3, y - CAMERA.y) + r2() * 3),
    // Where the language model looks: the label, then the rest of the camera
    distill: topK((x, y) => -Math.hypot((x - LABEL.x) / 2.2, y - LABEL.y) * 1.6 - Math.hypot(x - CAMERA.x, y - CAMERA.y) * 0.25 + r3() * 1.8),
  }
}

export default function Patches({ step }: { step: number }) {
  const reducedMotion = usePrefersReducedMotion()
  const sets = useMemo(() => kept(), [])
  const { method, answer, right } = PATCH_STEPS[step]
  const keep = sets[method]

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-8">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full max-w-[22rem]" role="img" aria-label={`A photo of a camera with ${keep.size} of 576 patches kept`}>
        {/* The photo */}
        <rect width={SIZE} height={SIZE} className="fill-[#d9d4c7] dark:fill-[#3a3833]" />
        <rect y={SIZE * 0.72} width={SIZE} height={SIZE * 0.28} className="fill-[#b9ae98] dark:fill-[#4a453b]" />
        <rect x={48} y={92} width={192} height={128} rx={14} className="fill-[#2b2b2b]" />
        <rect x={150} y={78} width={52} height={20} rx={4} className="fill-[#2b2b2b]" />
        <circle cx={150} cy={160} r={46} className="fill-[#4a4a4a]" />
        <circle cx={150} cy={160} r={30} className="fill-[#1c2733]" />
        <circle cx={140} cy={150} r={8} className="fill-white/40" />
        <rect x={58} y={102} width={64} height={18} rx={2} className="fill-[#e9e4d6]" />
        <text x={90} y={115.5} textAnchor="middle" className="fill-[#2b2b2b] font-mono text-[12px] font-bold tracking-widest">
          DAKOTA
        </text>
        <rect x={212} y={104} width={16} height={10} rx={2} className="fill-[#c9a227]" />

        {/* The patches not kept, covered */}
        {Array.from({ length: N * N }, (_, i) => {
          const x = (i % N) * CELL
          const y = Math.floor(i / N) * CELL
          const out = !keep.has(i)
          return (
            <motion.rect
              key={i}
              x={x}
              y={y}
              width={CELL}
              height={CELL}
              className="fill-paper"
              initial={false}
              animate={{ opacity: out ? 0.93 : 0 }}
              transition={reducedMotion ? { duration: 0 } : { duration: 0.35, delay: ((i % N) + Math.floor(i / N)) * 0.008 }}
            />
          )
        })}
        {/* The grid */}
        {Array.from({ length: N + 1 }, (_, k) => (
          <g key={k} className="stroke-black/10 dark:stroke-white/10" strokeWidth={0.5}>
            <line x1={k * CELL} x2={k * CELL} y1={0} y2={SIZE} />
            <line y1={k * CELL} y2={k * CELL} x1={0} x2={SIZE} />
          </g>
        ))}
      </svg>

      <div className="flex w-full flex-col gap-3 sm:max-w-[14rem]">
        <p className="font-mono text-[0.8125rem] uppercase tracking-widest text-zinc-400">Question</p>
        <p className="font-serif text-xl leading-snug">“What is the brand of this camera?”</p>
        <p className="mt-2 font-mono text-[0.8125rem] uppercase tracking-widest text-zinc-400">
          Patches kept · <span className="text-ink">{keep.size}</span> of 576
        </p>
        <p className="mt-2 font-mono text-[0.8125rem] uppercase tracking-widest text-zinc-400">Model answers</p>
        <motion.p
          key={answer}
          initial={reducedMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reducedMotion ? 0 : 0.5 }}
          className={`font-serif text-3xl ${right ? 'text-sage' : 'text-ink line-through decoration-1'}`}
        >
          {answer}
        </motion.p>
      </div>
    </div>
  )
}
