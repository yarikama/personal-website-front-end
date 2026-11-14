import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { Check, X } from 'lucide-react'
import { EASE, useSeen } from './motion'

export interface Option {
  label: string
  // Why it was or wasn't taken, in a line
  why: ReactNode
  chosen?: boolean
}

// A fork in the road: the question, the ways Henry could have gone, and the
// one he took. The options appear side by side; then the ones not taken
// step back, so the reader sees the choice being made, and the reason below
// says why.
export function Decision({
  n,
  question,
  options,
  children,
}: {
  n: number
  question: ReactNode
  options: Option[]
  // Why, in a short paragraph or two
  children: ReactNode
}) {
  const { ref, seen } = useSeen<HTMLDivElement>(0.45)
  // The options come in one by one, then the choice is made
  const decided = 0.25 + options.length * 0.12 + 0.35
  return (
    <div
      ref={ref}
      className="not-prose my-12 -mx-4 sm:mx-0 border-y sm:border sm:rounded-2xl border-zinc-200 dark:border-zinc-200/20 p-5 sm:p-7"
    >
      <span className="font-mono text-[0.875rem] uppercase tracking-widest text-sage">
        Decision {String(n).padStart(2, '0')}
      </span>
      <p className="mt-3 font-serif text-2xl font-light leading-snug">{question}</p>

      <ul
        className="mt-6 grid gap-3"
        style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${options.length > 3 ? 9 : 11}rem, 1fr))` }}
      >
        {options.map((option, i) => (
          <motion.li
            key={option.label}
            initial={{ opacity: 0, y: 10 }}
            animate={
              seen
                ? { opacity: option.chosen ? 1 : [0, 1, 1, 0.55], y: 0 }
                : {}
            }
            transition={{
              y: { duration: 0.45, delay: 0.25 + i * 0.12, ease: EASE },
              opacity: option.chosen
                ? { duration: 0.45, delay: 0.25 + i * 0.12 }
                : { duration: decided + 0.5 - (0.25 + i * 0.12), delay: 0.25 + i * 0.12, times: [0, 0.2, 0.7, 1] },
            }}
            // The choice gets a row of its own, under the roads not taken
            style={option.chosen ? { gridColumn: '1 / -1', order: 1 } : undefined}
            className="relative flex flex-col gap-2 rounded-xl border p-4 border-zinc-200 dark:border-zinc-200/20"
          >
            {option.chosen && (
              <motion.span
                aria-hidden
                className="pointer-events-none absolute -inset-px rounded-xl border-2 border-sage bg-sage/10"
                initial={{ opacity: 0, scale: 1.04 }}
                animate={seen ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.4, delay: decided, ease: EASE }}
              />
            )}
            <span className="relative flex items-start justify-between gap-2">
              <span className={`font-medium leading-snug ${option.chosen ? 'text-ink' : 'text-zinc-faded'}`}>
                {option.label}
              </span>
              <motion.span
                initial={{ opacity: 0, scale: 0.5 }}
                animate={seen ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.3, delay: decided + (option.chosen ? 0.1 : 0) }}
                className={option.chosen ? 'text-sage' : 'text-zinc-400'}
              >
                {option.chosen ? <Check size={18} aria-label="Chosen" /> : <X size={16} aria-label="Not chosen" />}
              </motion.span>
            </span>
            <span className="relative text-sm leading-relaxed text-zinc-faded">{option.why}</span>
          </motion.li>
        ))}
      </ul>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={seen ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, delay: decided + 0.2, ease: EASE }}
        className="mt-6 flex flex-col gap-3 leading-relaxed text-zinc-faded [&_strong]:font-medium [&_strong]:text-ink"
      >
        <span className="font-mono text-[0.875rem] uppercase tracking-widest text-zinc-400">Why</span>
        {children}
      </motion.div>
    </div>
  )
}
