import { motion } from 'motion/react'
import { usePrefersReducedMotion } from '../../hooks'

// The 8 GB card's memory as one bar, filled a step at a time: the
// autocomplete model, then the chat model, then a batch job that takes the
// whole card and gives it back. Sizes in GiB, from the homelab's measured
// budgets (docs/14 and docs/15): 7.62 GiB is what vLLM sees of the card.
const USABLE = 7.62

interface Block {
  id: string
  label: string
  gib: number
  tone: 'weights' | 'cache' | 'other' | 'batch'
  model?: 'autocomplete' | 'ask'
}

const AUTOCOMPLETE: Block[] = [
  { id: 'ac-w', label: 'weights', gib: 1.68, tone: 'weights', model: 'autocomplete' },
  { id: 'ac-kv', label: 'cache', gib: 0.42, tone: 'cache', model: 'autocomplete' },
  { id: 'ac-o', label: '', gib: 0.17, tone: 'other', model: 'autocomplete' },
]
const ASK: Block[] = [
  { id: 'ask-w', label: 'weights', gib: 3.28, tone: 'weights', model: 'ask' },
  { id: 'ask-kv', label: 'cache', gib: 1.04, tone: 'cache', model: 'ask' },
  { id: 'ask-o', label: '', gib: 0.58, tone: 'other', model: 'ask' },
]
const BATCH: Block[] = [{ id: 'batch', label: 'batch job', gib: USABLE, tone: 'batch' }]

// What the card holds at each step of the story
const MEMORY_STEPS: Block[][] = [[], AUTOCOMPLETE, [...AUTOCOMPLETE, ...ASK], [...AUTOCOMPLETE, ...ASK], BATCH, [...AUTOCOMPLETE, ...ASK]]

const TONE: Record<Block['tone'], string> = {
  weights: 'fill-sage',
  cache: 'fill-sage/45',
  other: 'fill-sage/20',
  batch: 'fill-ink',
}

const X0 = 10
const X1 = 630
const scale = (gib: number) => (gib / USABLE) * (X1 - X0)

export default function GpuMemory({ step }: { step: number }) {
  const reducedMotion = usePrefersReducedMotion()
  const blocks = MEMORY_STEPS[step]
  const fixed = step === 3
  const used = blocks.reduce((sum, block) => sum + block.gib, 0)
  const transition = reducedMotion ? { duration: 0 } : { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }

  // Lay the blocks end to end
  const placed = blocks.map((block, i) => ({
    ...block,
    x: X0 + scale(blocks.slice(0, i).reduce((sum, before) => sum + before.gib, 0)),
    w: scale(block.gib),
  }))
  const span = (model: Block['model']) => {
    const mine = placed.filter((block) => block.model === model)
    if (!mine.length) return null
    return { x: mine[0].x, w: mine.reduce((sum, block) => sum + block.w, 0), gib: mine.reduce((s, b) => s + b.gib, 0) }
  }
  const spans = [
    { name: 'Autocomplete ·', ...span('autocomplete') },
    { name: 'Ask chat · 4B, 4-bit ·', ...span('ask') },
  ].filter((s) => s.w !== undefined) as { name: string; x: number; w: number; gib: number }[]

  return (
    <svg viewBox="0 0 640 190" className="w-full" role="img" aria-label={`GPU memory: ${used.toFixed(1)} of ${USABLE} GiB in use`}>
      {/* The card */}
      <rect x={X0} y={60} width={X1 - X0} height={64} rx={4} className="fill-zinc-200/40 stroke-zinc-400 dark:fill-zinc-300/30 dark:stroke-zinc-400/60" strokeDasharray="4 3" />
      {placed.map((block) => (
        <motion.rect
          key={block.id}
          y={60}
          height={64}
          initial={{ x: block.x, width: 0, opacity: 0 }}
          animate={{ x: block.x, width: block.w, opacity: 1 }}
          exit={{ width: 0 }}
          transition={transition}
          className={TONE[block.tone]}
          stroke="var(--color-paper)"
          strokeWidth={1.5}
        />
      ))}
      {placed
        .filter((block) => block.label && block.w > 50)
        .map((block) => (
          <motion.text
            key={`${block.id}-label`}
            x={block.x + block.w / 2}
            y={97}
            textAnchor="middle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ ...transition, delay: reducedMotion ? 0 : 0.3 }}
            className={`font-mono text-[11px] ${block.tone === 'batch' || block.tone === 'weights' ? 'fill-paper' : 'fill-ink'}`}
          >
            {block.label} {block.tone === 'cache' && fixed ? '· fixed' : ''}
          </motion.text>
        ))}

      {/* Which model is which */}
      {spans.map((s) => (
        <g key={s.name}>
          <line x1={s.x + 2} x2={s.x + s.w - 2} y1={48} y2={48} className="stroke-zinc-400" />
          <text x={s.x + 2} y={38} className="fill-ink font-mono text-[11px]">
            {s.name} <tspan className="fill-zinc-faded">{s.gib.toFixed(1)} GiB</tspan>
          </text>
        </g>
      ))}

      {/* The scale */}
      {[0, 2, 4, 6].map((gib) => (
        <g key={gib}>
          <line x1={X0 + scale(gib)} x2={X0 + scale(gib)} y1={128} y2={134} className="stroke-zinc-400" />
          <text x={X0 + scale(gib)} y={148} textAnchor={gib === 0 ? 'start' : 'middle'} className="fill-zinc-400 font-mono text-[10px]">
            {gib} GiB
          </text>
        </g>
      ))}
      <text x={X1} y={148} textAnchor="end" className="fill-zinc-400 font-mono text-[10px]">
        {USABLE} usable
      </text>
      <text x={X0} y={178} className="fill-zinc-faded font-mono text-[11px]">
        In use: <tspan className="fill-ink">{used.toFixed(2)} GiB</tspan>
        {blocks.length > 0 && step !== 4 && <tspan> · free {(USABLE - used).toFixed(2)} GiB</tspan>}
      </text>
    </svg>
  )
}
