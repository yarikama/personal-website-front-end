import { motion } from 'motion/react'
import { usePrefersReducedMotion } from '../../hooks'

export type Tone = 'fine' | 'bad' | 'quiet'

const FILL: Record<Tone, string> = {
  fine: 'fill-sage/50',
  bad: 'fill-ink',
  quiet: 'fill-zinc-300 dark:fill-zinc-200/20',
}

const CELL = 34

// Many of something at once (dinners, pages, servers), one dot each, in
// rows of `columns`: fine, bad or quiet. With `appear`, the dots come in one
// after another; a new `run` plays that again.
export function DotGrid({
  tones,
  label,
  columns = 10,
  appear = true,
  run = '',
}: {
  tones: Tone[]
  label: string
  columns?: number
  appear?: boolean
  run?: string
}) {
  const reducedMotion = usePrefersReducedMotion()
  const rows = Math.ceil(tones.length / columns)
  const animate = appear && !reducedMotion
  return (
    <svg
      viewBox={`0 0 ${columns * CELL} ${rows * CELL}`}
      className="mx-auto w-full max-w-[22rem]"
      role="img"
      aria-label={label}
    >
      {tones.map((tone, i) => (
        <motion.circle
          key={`${run}-${i}`}
          cx={(i % columns) * CELL + CELL / 2}
          cy={Math.floor(i / columns) * CELL + CELL / 2}
          r={12}
          initial={animate ? { opacity: 0, scale: 0.4 } : false}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: animate ? i * 0.012 : 0, duration: 0.3 }}
          className={`transition-colors duration-300 ${FILL[tone]}`}
        />
      ))}
    </svg>
  )
}

// The key under a grid: what each tone means
export function DotKey({ items }: { items: [Tone, string][] }) {
  return (
    <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2 font-mono text-[0.8rem] uppercase tracking-widest text-zinc-faded">
      {items.map(([tone, text]) => (
        <span key={text} className="inline-flex items-center gap-2">
          <svg width="12" height="12" aria-hidden>
            <circle cx="6" cy="6" r="6" className={FILL[tone]} />
          </svg>
          {text}
        </span>
      ))}
    </div>
  )
}
