import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'

interface Option {
  label: string
  right?: boolean
}

// Ask before telling: a question with a few answers to pick from, and what
// is true once one is picked. Guessing first makes the answer stick, most
// of all when the guess was wrong.
export function Predict({
  question,
  options,
  reveal,
  kicker = 'Guess first',
}: {
  question: ReactNode
  options: Option[]
  reveal: ReactNode
  // "Guess first" before the lesson; "Check yourself" after it
  kicker?: string
}) {
  const [picked, setPicked] = useState<number | null>(null)
  const answered = picked !== null
  return (
    <div className="not-prose my-12 border border-zinc-200 dark:border-zinc-200/20 p-5 sm:p-7">
      <span className="font-mono text-[0.8rem] uppercase tracking-widest text-sage">{kicker}</span>
      <p className="mt-3 font-serif text-2xl font-light leading-snug">{question}</p>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {options.map((option, i) => {
          const chosen = picked === i
          const tone = !answered
            ? 'border-zinc-300 dark:border-zinc-200/20 text-ink hover:border-ink'
            : option.right
              ? 'border-sage bg-sage/15 text-sage'
              : chosen
                ? 'border-ink text-ink line-through decoration-1'
                : 'border-zinc-200 dark:border-zinc-200/10 text-zinc-400'
          return (
            <button
              key={option.label}
              onClick={() => setPicked(i)}
              disabled={answered}
              className={`border px-3 py-3 font-mono text-sm tabular-nums transition-colors ${tone}`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
      <AnimatePresence>
        {answered && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 text-zinc-faded leading-relaxed"
          >
            <p className="font-medium text-ink">{options[picked].right ? 'Right.' : 'Not quite.'}</p>
            <div className="mt-2">{reveal}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
