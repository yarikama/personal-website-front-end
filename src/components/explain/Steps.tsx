import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useReadableText } from './useReadableText'

// A figure told as a story: one sentence at a time, each with what the
// figure shows at that step. `children` draws step `step` (from 0). Next and
// back, or the arrow keys once it has focus. `readable` as for a Figure.
export function Steps({
  say,
  children,
  readable = false,
}: {
  say: ReactNode[]
  children: (step: number) => ReactNode
  readable?: boolean
}) {
  const [step, setStep] = useState(0)
  const drawing = useRef<HTMLDivElement>(null)
  useReadableText(drawing, readable)
  const last = say.length - 1
  const go = (to: number) => setStep(Math.max(0, Math.min(last, to)))
  const keys = (event: KeyboardEvent) => {
    if (event.key === 'ArrowRight') go(step + 1)
    else if (event.key === 'ArrowLeft') go(step - 1)
    else return
    event.preventDefault()
  }

  return (
    <figure
      className="not-prose my-12 -mx-4 sm:mx-0 border-y sm:border border-zinc-200 dark:border-zinc-200/20 bg-paper-dark/40 outline-none"
      tabIndex={0}
      onKeyDown={keys}
      aria-roledescription="story"
    >
      <div ref={drawing} className="p-4 sm:p-6">
        {children(step)}
      </div>
      <div className="border-t border-zinc-200 dark:border-zinc-200/20 px-4 sm:px-6 py-5">
        <div className="min-h-[4.5rem]" aria-live="polite">
          <AnimatePresence mode="wait">
            <motion.p
              key={step}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="font-serif text-xl sm:text-2xl font-light leading-snug"
            >
              {say[step]}
            </motion.p>
          </AnimatePresence>
        </div>
        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="flex gap-1.5" aria-hidden>
            {say.map((_, i) => (
              <span key={i} className={`h-1.5 w-6 transition-colors ${i <= step ? 'bg-sage' : 'bg-zinc-300 dark:bg-zinc-200/20'}`} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => go(step - 1)}
              disabled={step === 0}
              className="p-2 text-zinc-faded hover:text-ink disabled:opacity-30"
              aria-label="Back"
            >
              <ArrowLeft size={18} />
            </button>
            <button
              onClick={() => go(step + 1)}
              disabled={step === last}
              className="inline-flex items-center gap-2 border border-ink px-4 py-2 font-mono text-xs uppercase tracking-widest text-ink transition-colors hover:bg-ink hover:text-paper disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink"
            >
              {step === last ? 'Done' : 'Next'} <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </figure>
  )
}
