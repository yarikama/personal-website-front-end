import { useRef, useState, type ReactNode } from 'react'
import { useAnimationFrame } from 'motion/react'
import { usePrefersReducedMotion } from '../../hooks'
import {
  ANSWER,
  ANSWERS_ONLY,
  BINDER,
  CARELESS_SLIPS,
  CAREFUL_SLIPS,
  QUESTION,
  QUIZ_PAGE,
  RAMBLE,
  SLOPPY,
} from './model'
import Tokens from './Tokens'

// The story's help desk: a visitor's slip, what the new assistant writes
// under it, the binder of worked slips, and at the end the same slip as the
// tokens a language model reads.

export type Scene = 'ramble' | 'page' | 'binder' | 'practise' | 'answer' | 'careless' | 'reveal'

const TITLES: Record<Scene, string> = {
  ramble: 'Day one at the desk',
  page: 'Where they read that line',
  binder: `The binder: ${CAREFUL_SLIPS} slips`,
  practise: 'Practice, marked under the line',
  answer: 'The next morning',
  careless: 'Two binders, two assistants',
  reveal: 'The same slip, as tokens',
}

// Letters a second, and when the writing starts
const SPEED = 28
const START = 0.5

// Seconds since the scene appeared; the end at once with reduced motion
function useSeconds(until: number) {
  const reducedMotion = usePrefersReducedMotion()
  const started = useRef<number | null>(null)
  const [seconds, setSeconds] = useState(reducedMotion ? Infinity : 0)
  useAnimationFrame((time) => {
    if (seconds > until) return
    started.current ??= time
    setSeconds((time - started.current) / 1000)
  })
  return seconds
}

const typed = (text: string, seconds: number, from = START) =>
  text.slice(0, Math.max(0, Math.floor((seconds - from) * SPEED)))

export default function Desk({ scene }: { scene: Scene }) {
  const seconds = useSeconds(6)
  return (
    <div className="mx-auto max-w-[36rem] font-mono text-[0.875rem]">
      <p className="uppercase tracking-widest text-zinc-faded">{TITLES[scene]}</p>
      <div className="mt-4">
        {scene === 'ramble' && (
          <Card question={QUESTION} answer={typed(RAMBLE, seconds)} verdict={done(RAMBLE, seconds) && 'Not an answer'} />
        )}
        {scene === 'page' && <Page seconds={seconds} />}
        {scene === 'binder' && (
          <div className="flex flex-col gap-3">
            {BINDER.map((slip, i) => (
              <div key={slip.question} style={{ opacity: Math.min(1, Math.max(0, (seconds - 0.3 - i * 0.5) * 2)) }}>
                <Card question={slip.question} answer={slip.answer} />
              </div>
            ))}
            <p className="text-zinc-faded">and {CAREFUL_SLIPS - BINDER.length} more like them</p>
          </div>
        )}
        {scene === 'practise' && (
          <Card
            question={BINDER[0].question}
            answer={typed(BINDER[0].answer, seconds, 1)}
            marked
            given
            verdict={done(BINDER[0].answer, seconds, 1) && 'Marked: matches the binder'}
          />
        )}
        {scene === 'answer' && (
          <Card question={QUESTION} answer={typed(ANSWER, seconds)} marked verdict={done(ANSWER, seconds) && 'An answer'} />
        )}
        {scene === 'careless' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-[0.75rem] uppercase tracking-widest text-zinc-faded">{CAREFUL_SLIPS} careful slips</p>
              <Card question={QUESTION} answer={typed(ANSWER, seconds)} marked />
            </div>
            <div>
              <p className="mb-2 text-[0.75rem] uppercase tracking-widest text-zinc-faded">
                {CARELESS_SLIPS.toLocaleString('en-US')} careless slips
              </p>
              <Card question={QUESTION} answer={typed(SLOPPY, seconds)} />
            </div>
          </div>
        )}
        {scene === 'reveal' && <Reveal seconds={seconds} />}
      </div>
    </div>
  )
}

const done = (text: string, seconds: number, from = START) => typed(text, seconds, from).length === text.length

// A desk slip: the visitor's question at the top, and under it what the
// assistant writes. `marked` tints the part that gets marked; `given` says
// the question is not.
function Card({
  question,
  answer,
  marked = false,
  given = false,
  verdict,
}: {
  question: string
  answer: string
  marked?: boolean
  given?: boolean
  verdict?: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-zinc-300 bg-paper p-3 dark:border-zinc-400">
      <p className="text-ink">{question}</p>
      {given && <p className="mt-1 text-[0.75rem] uppercase tracking-widest text-zinc-faded">Given, not marked</p>}
      <div
        className={`mt-3 min-h-[2.75rem] rounded-xl px-3 py-2 text-ink ${
          marked ? 'border border-sage bg-sage/15' : 'border border-dashed border-zinc-300 dark:border-zinc-400'
        }`}
      >
        {answer}
        {answer.length > 0 && verdict === false && <span aria-hidden>▍</span>}
      </div>
      {verdict && <p className="mt-2 text-[0.75rem] uppercase tracking-widest text-ink">{verdict}</p>}
    </div>
  )
}

// A page from the books they read: the line, and more lines like it
function Page({ seconds }: { seconds: number }) {
  return (
    <div className="rounded-2xl border border-zinc-300 bg-paper p-3 dark:border-zinc-400">
      <p className="text-[0.75rem] uppercase tracking-widest text-zinc-faded">{QUIZ_PAGE.title}</p>
      <ol className="mt-2 flex flex-col gap-1">
        {QUIZ_PAGE.lines.map((line, i) => (
          <li
            key={line}
            className={`rounded-lg px-2 py-1 text-ink ${i === 0 ? 'border border-ink' : ''}`}
            style={{ opacity: i === 0 ? 1 : Math.min(1, Math.max(0, (seconds - 0.4 - i * 0.6) * 2)) }}
          >
            {i + 1}. {line}
          </li>
        ))}
      </ol>
    </div>
  )
}

// The slip as a chat-formatted string: the question and the tags the app
// writes are dashed, the answer and its end tag are sage
function Reveal({ seconds }: { seconds: number }) {
  const shown = Math.floor(Math.max(0, seconds - 0.3) * 8)
  return (
    <div className="rounded-2xl border border-zinc-300 bg-paper p-3 dark:border-zinc-400">
      <Tokens tokens={ANSWERS_ONLY.tokens} costs={false} shown={shown} />
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[0.75rem] uppercase tracking-widest text-zinc-faded">
        <span>Dashed: prompt, read only</span>
        <span>Sage: response, scored</span>
      </div>
    </div>
  )
}
