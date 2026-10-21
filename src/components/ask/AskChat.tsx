import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUp, Loader2, Square, X } from 'lucide-react'
import { useAskChat } from '../../hooks'
import type { Turn } from '../../hooks'
import type { Citation } from '../../services/api'
import { explainQuestion, withoutCitations } from '../../lib/ask'
import AskOwl, { type OwlMood } from './AskOwl'

const MAX_QUESTION = 500

// One per language the model answers well, each on a narrow topic: broad
// questions ("every project") run long, most of all in scripts that take
// many tokens per word, such as Devanagari.
const SUGGESTIONS = [
  'What did Henry build at Google?',
  'What is PAPIT?',
  '他做過哪些 LLM 安全的研究？',
  'ヘンリーはGoogleで何をしましたか？',
  '헨리는 오픈소스에 어떤 기여를 했나요?',
  "Quelle est la formation d'Henry ?",
  '¿Qué experiencia tiene Henry con RAG?',
  'हेनरी कौन-सी प्रोग्रामिंग भाषाएँ जानते हैं?',
]

// Markdown (with math) is loaded with the first answer, not with the page.
const AnswerMarkdown = lazy(() => import('../ui/AnswerMarkdown'))

// Until it has loaded: the text alone, without the citation markers.
function PlainAnswer({ turn }: { turn: Turn }) {
  return (
    <p className="text-[17px] leading-relaxed whitespace-pre-wrap">
      {withoutCitations(turn.answer)}
    </p>
  )
}

// Named in each answer's header: the answers come from this model on the
// owner's own server. Change it with the model (homelab apps/llm/vllm-ask.yaml).
const MODEL = 'Qwen3.5-4B · home server'

function SourceLink({ citation }: { citation: Citation }) {
  const href = citation.url
  const label = citation.title
  if (!href) return <span>{label}</span>
  // Notes are pages in this app; projects and the resume PDF open in a new tab.
  if (href.startsWith('/') && !href.endsWith('.pdf')) {
    return (
      <Link to={href} className="hover:text-sage transition-colors">
        {label}
      </Link>
    )
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:text-sage transition-colors"
    >
      {label}
    </a>
  )
}

function TurnView({ turn, anchor }: { turn: Turn; anchor: string }) {
  const waiting = turn.status === 'streaming' && !turn.answer
  return (
    <div className="py-5">
      {turn.passage && (
        <blockquote className="ml-auto w-fit max-w-[85%] mb-2 border-l-2 border-sage/60 pl-3 text-sm italic text-zinc-400 line-clamp-3">
          {turn.passage.text}
        </blockquote>
      )}
      <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-sage/10 px-4 py-2 mb-4 text-zinc-faded">
        {turn.question}
      </p>

      {/* The answer, framed like a log entry: a header strip naming the
          model, the text, then the sources as rows. Full width, so the frame
          does not grow sideways as the answer streams in. */}
      <div className="w-full max-w-[94%] rounded-xl border border-zinc-300 dark:border-white/70 overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-4 py-2 bg-paper-dark border-b border-zinc-200 dark:border-zinc-700 font-mono text-[11px] uppercase tracking-[0.14em]">
          <span className="text-sage shrink-0">Answer</span>
          <span className="text-zinc-faded truncate">{MODEL}</span>
        </div>

        <div className="px-4 py-4 sm:px-5">
          {waiting && (
            <p className="flex items-center gap-2 text-zinc-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Thinking…
            </p>
          )}
          {turn.answer && (
            <Suspense fallback={<PlainAnswer turn={turn} />}>
              <AnswerMarkdown turn={turn} anchor={`${anchor}-${turn.id}`} />
            </Suspense>
          )}
          {turn.truncated && (
            <p className="mt-2 text-sm text-zinc-400 italic">
              The answer got too long and was cut off. Try a narrower question.
            </p>
          )}
          {turn.status === 'error' && (
            <p className={`text-sm text-red-600 dark:text-red-400 ${turn.answer ? 'mt-2' : ''}`}>
              {turn.error}
            </p>
          )}
        </div>

        {turn.citations && turn.citations.length > 0 && (
          <ol className="bg-paper-dark text-sm">
            {turn.citations.map((citation, i) => (
              <li
                key={citation.id}
                id={`${anchor}-${turn.id}-${i + 1}`}
                className="grid grid-cols-[2.25rem_4.5rem_minmax(0,1fr)] items-baseline gap-2 px-4 py-2 border-t border-zinc-200 dark:border-zinc-700"
              >
                <span className="font-mono text-[13px] text-sage">[{i + 1}]</span>
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-faded">
                  {citation.kind}
                </span>
                <SourceLink citation={citation} />
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}

interface AskChatProps {
  // Size and frame of the chat box.
  className?: string
  // Tighter padding and type, for the floating chat.
  compact?: boolean
  autoFocus?: boolean
}

/**
 * The conversation and the question box. The home page section and the
 * floating chat both render one, over the same conversation (AskProvider).
 */
export default function AskChat({ className = '', compact = false, autoFocus = false }: AskChatProps) {
  const { turns, ask, stop, reset, isStreaming, passage, setPassage } = useAskChat()
  // On the page the box opens out wide, and the conversation with it; the
  // floating chat is narrow anyway.
  const column = compact ? 'max-w-3xl' : 'max-w-5xl'
  const [question, setQuestion] = useState('')
  const log = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)
  // Ids for the citation anchors and the input, unique per chat on the page.
  const anchor = `ask${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  // Follow the answer as it streams, unless the visitor scrolled up to read.
  const following = useRef(true)

  useEffect(() => {
    const el = log.current
    if (el && following.current && turns.length) el.scrollTop = el.scrollHeight
  }, [turns])

  useEffect(() => {
    if (autoFocus) input.current?.focus()
  }, [autoFocus])

  // One line to start, growing with the question up to about five lines.
  useEffect(() => {
    const el = input.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [question])

  const handleScroll = () => {
    const el = log.current
    if (el) following.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40
  }

  // Suggestions are questions of their own; typed ones go with the
  // highlighted passage, if there is one.
  const submit = (text: string, withPassage = true) => {
    const about = withPassage ? passage : null
    const q = text.trim() || (about ? explainQuestion(about.text) : '')
    if (!q || isStreaming) return
    setQuestion('')
    if (about) setPassage(null)
    following.current = true
    ask(q, about ?? undefined)
  }

  const latest = turns[turns.length - 1]
  const owlMood: OwlMood =
    latest?.status === 'error'
      ? 'sleep'
      : isStreaming
        ? latest?.answer
          ? 'nod'
          : 'think'
        : question.trim()
          ? 'look'
          : 'idle'

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends; Shift+Enter is a new line. While an input method is
    // composing (Chinese, Japanese), Enter picks a candidate instead.
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit(question)
    }
  }

  return (
  <div className={`flex flex-col overflow-hidden ${className}`}>
    <div
      ref={log}
      onScroll={handleScroll}
      aria-live="polite"
      // The page stays put when the conversation is scrolled to its end. On
      // the page the owl stands at the foot of it, so the last line clears it.
      className={`flex-1 overflow-y-auto overscroll-contain ${compact ? 'px-4' : 'px-5 md:px-8 pb-10'}`}
    >
      {turns.length === 0 ? (
        // min-h-full, not h-full: centred when it fits, scrollable when it
        // does not (a fixed height would cut the top off on small screens).
        <div className="min-h-full py-6 flex flex-col items-center justify-center gap-4 text-center">
          <p className="font-serif text-xl italic text-zinc-faded">Try asking</p>
          <div className="flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => submit(s, false)}
                className="rounded-full font-mono text-xs text-zinc-400 hover:text-sage border border-zinc-200 dark:border-zinc-700 hover:border-sage px-4 py-2 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        // A column of reading width (wider on the page than in the floating
        // chat), however wide the box has opened.
        <div className={`${column} mx-auto`}>
          {turns.map((turn) => (
            <TurnView key={turn.id} turn={turn} anchor={anchor} />
          ))}
        </div>
      )}
    </div>

    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit(question)
      }}
      className="relative border-t border-zinc-200 dark:border-zinc-700 p-3"
    >
      {/* The owl lives in the page's chat only; the floating one is too small */}
      {!compact && <AskOwl mood={owlMood} />}
      {passage && (
        <div className={`${column} mx-auto mb-2 flex items-start gap-2 rounded-xl bg-sage/10 pl-3 pr-1 py-2`}>
          <blockquote className="flex-1 border-l-2 border-sage/60 pl-3 text-sm italic text-zinc-faded line-clamp-3">
            {passage.text}
          </blockquote>
          <button
            type="button"
            onClick={() => setPassage(null)}
            aria-label="Remove the highlighted passage"
            className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-ink hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <div className={`${column} mx-auto flex items-end gap-2 rounded-2xl border border-zinc-200 dark:border-zinc-700 focus-within:border-ink dark:focus-within:border-zinc-400 transition-colors duration-300 pl-4 pr-2 py-2`}>
        <label htmlFor={`${anchor}-question`} className="sr-only">
          Your question
        </label>
        <textarea
          id={`${anchor}-question`}
          ref={input}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={MAX_QUESTION}
          rows={1}
          placeholder={passage ? 'Ask about it, or press Enter' : 'Ask about me…'}
          // The border around it shows focus, so the site-wide ring
          // would draw a second box inside it.
          className={`flex-1 self-center resize-none bg-transparent font-serif focus-visible:outline-none! ${compact ? 'text-base' : 'text-lg'}`}
        />
        {isStreaming ? (
          <button
            type="button"
            onClick={stop}
            aria-label="Stop the answer"
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center border border-zinc-300 dark:border-zinc-600 hover:border-ink dark:hover:border-zinc-400 transition-colors"
          >
            <Square className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!question.trim() && !passage}
            aria-label="Ask"
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-sage text-paper disabled:opacity-40 transition-opacity"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        )}
      </div>
      {(turns.length > 0 || question.length > MAX_QUESTION - 100) && (
        <div className={`${column} mx-auto mt-1.5 px-2 flex justify-between gap-4 text-xs text-zinc-faded`}>
          {/* The model sees the last two turns: say so, and offer a way out
              when the visitor moves on to something else. */}
          {turns.length > 0 ? (
            <p>
              Remembers your last two questions for 30 minutes.{' '}
              <button
                type="button"
                onClick={reset}
                className="underline underline-offset-2 hover:text-sage transition-colors"
              >
                Start over
              </button>
            </p>
          ) : (
            <p />
          )}
          {question.length > MAX_QUESTION - 100 && (
            <p className="shrink-0 font-mono">
              {question.length}/{MAX_QUESTION}
            </p>
          )}
        </div>
      )}
    </form>
  </div>
  )
}
