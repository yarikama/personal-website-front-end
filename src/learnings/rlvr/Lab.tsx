import { Fragment } from 'react'
import { Check, X } from 'lucide-react'
import { QUESTIONS, signed, type Group } from './model'

// The largest advantage a group of eight can give, |±√7|: the bars' scale
const MOST = Math.sqrt(7)

// Eight sampled answers to one question: each one's working, the number the
// checker reads off its end, whether it matches the key, and its advantage
// against the group (sage bars right of the line, ink bars left of it).
export default function Lab({ q, group }: { q: number; group: Group }) {
  const question = QUESTIONS[q]
  return (
    <div>
      <div className="rounded-xl border border-zinc-300 dark:border-zinc-200/25 bg-paper px-4 py-3">
        <p className="font-mono text-[0.875rem] text-ink">{question.text}</p>
        <p className="mt-1 font-mono text-[0.875rem] text-zinc-faded">
          Checker’s key: <span className="text-sage-ink">{question.key}</span>
        </p>
      </div>
      <div className="mt-4 grid grid-cols-[1.25rem_minmax(0,1fr)_auto_6.5rem] items-center gap-x-3 gap-y-2 font-mono text-[0.875rem]">
        <span className="text-zinc-faded">#</span>
        <span className="text-[0.75rem] uppercase tracking-widest text-zinc-faded">Working</span>
        <span className="text-[0.75rem] uppercase tracking-widest text-zinc-faded">Reads</span>
        <span className="text-right text-[0.75rem] uppercase tracking-widest text-zinc-faded">Advantage</span>
        {group.answers.map((answer, i) => {
          const a = group.advantages[i]
          const width = `${(50 * Math.abs(a)) / MOST}%`
          return (
            <Fragment key={i}>
              <span className="tabular-nums text-zinc-faded">{i + 1}</span>
              <span className="text-ink">
                {answer.working}
                {answer.kind === 'lucky' && <span className="block text-[0.75rem] text-zinc-faded">working is wrong</span>}
              </span>
              <span className={`flex items-center gap-1 tabular-nums ${answer.reward ? 'text-sage-ink' : 'text-ink'}`}>
                {answer.answer}
                {answer.reward ? (
                  <Check aria-label="passes" className="h-4 w-4" strokeWidth={2.5} />
                ) : (
                  <X aria-label="fails" className="h-4 w-4" strokeWidth={2.5} />
                )}
              </span>
              <span className="flex flex-col items-stretch gap-1">
                <span className="relative block h-2.5">
                  <span className="absolute -inset-y-[3px] left-1/2 w-px bg-zinc-300 dark:bg-zinc-200/25" />
                  {a > 0 && <span className="absolute inset-y-0 left-1/2 rounded-r bg-sage" style={{ width }} />}
                  {a < 0 && <span className="absolute inset-y-0 right-1/2 rounded-l bg-ink/45" style={{ width }} />}
                </span>
                <span className="text-right text-[0.75rem] tabular-nums text-ink">{a === 0 ? '0' : signed(a)}</span>
              </span>
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}

