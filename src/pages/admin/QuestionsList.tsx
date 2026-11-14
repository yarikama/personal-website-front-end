import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, ThumbsDown, ThumbsUp } from 'lucide-react'
import AdminNav from '../../components/admin/AdminNav'
import {
  adminAskQuestionsService,
  type AskedQuestion,
  type QuestionFilters,
  type Rating,
} from '../../services/api'

// The chat's own renderer, so citations are numbered as the visitor saw them.
const AnswerMarkdown = lazy(() => import('../../components/ui/AnswerMarkdown'))

const PAGE = 50

const WHO: { value: QuestionFilters['who']; label: string }[] = [
  { value: 'visitors', label: 'Visitors' },
  { value: 'admin', label: 'Me' },
  { value: 'all', label: 'All' },
]

const FLAGS: { key: 'uncited' | 'passage' | 'failed'; label: string; title: string }[] = [
  { key: 'uncited', label: 'No sources', title: 'Answers that cite nothing' },
  { key: 'passage', label: 'Passages', title: 'Questions about a highlighted passage' },
  { key: 'failed', label: 'Cut or broke off', title: 'Answers cut at the length limit or broken off' },
]

const RATINGS: { value: QuestionFilters['rating']; label: string }[] = [
  { value: undefined, label: 'Any rating' },
  { value: 'none', label: 'Unrated' },
  { value: 'good', label: 'Good' },
  { value: 'bad', label: 'Bad' },
]

function chip(active: boolean) {
  return `px-3 py-1.5 font-mono text-xs uppercase tracking-widest rounded-full border transition-colors ${
    active
      ? 'border-ink bg-ink text-paper dark:border-white dark:bg-white dark:text-zinc-900'
      : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-ink dark:hover:text-white'
  }`
}

function QuestionCard({
  item,
  isNew,
  onRate,
}: {
  item: AskedQuestion
  isNew: boolean
  onRate: (rating: Rating | null) => void
}) {
  const [open, setOpen] = useState(false)
  const when = new Date(item.createdAt)
  const turn = {
    id: 0,
    question: item.question,
    answer: item.answer,
    citations: item.citations,
    status: 'done' as const,
  }

  return (
    <article className={`rounded-xl border p-5 ${isNew ? 'border-sage/60' : 'border-zinc-200 dark:border-zinc-800'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-zinc-400">
            {isNew && (
              <span className="inline-flex items-center gap-1.5 text-sage">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-sage" />
                New
              </span>
            )}
            <time dateTime={item.createdAt}>
              {when.toLocaleDateString()} {when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </time>
            <span>{(item.durationMs / 1000).toFixed(1)} s</span>
            {item.outputTokens !== null && <span>{item.outputTokens} tokens</span>}
            <span>
              {item.citations.length} source{item.citations.length === 1 ? '' : 's'}
            </span>
            {item.admin && <span className="text-sage">Me</span>}
            {item.status === 'error' && <span className="text-red-500">Broke off</span>}
            {item.truncated && <span className="text-amber-600 dark:text-amber-500">Cut off</span>}
          </div>
          <h2 className="mt-2 font-serif text-lg leading-snug whitespace-pre-wrap break-words">
            {item.question}
          </h2>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {(['good', 'bad'] as const).map((value) => {
            const Icon = value === 'good' ? ThumbsUp : ThumbsDown
            const active = item.rating === value
            return (
              <button
                key={value}
                onClick={() => onRate(active ? null : value)}
                aria-pressed={active}
                title={active ? 'Clear rating' : `Rate ${value}`}
                className={`p-2 transition-colors ${
                  active
                    ? value === 'good'
                      ? 'text-sage'
                      : 'text-red-500'
                    : 'text-zinc-300 hover:text-ink dark:text-zinc-600 dark:hover:text-white'
                }`}
              >
                <Icon size={16} />
              </button>
            )
          })}
        </div>
      </div>

      {item.quote && (
        <blockquote className="mt-3 border-l-2 border-sage pl-3 text-sm text-zinc-500 whitespace-pre-wrap">
          {item.quote}
          {item.page && (
            <a
              href={item.page}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 font-mono text-xs text-zinc-400 hover:text-sage"
            >
              {item.page}
            </a>
          )}
        </blockquote>
      )}

      <div className={`relative mt-4 ${open ? '' : 'max-h-28 overflow-hidden'}`}>
        <Suspense fallback={<p className="text-sm text-zinc-400">{item.answer}</p>}>
          <AnswerMarkdown turn={turn} anchor={`question-${item.id}`} />
        </Suspense>
        {!open && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-paper dark:from-[#0f0f0f]" />
        )}
      </div>

      {open && item.citations.length > 0 && (
        <ol className="mt-4 space-y-1 border-t border-zinc-200 dark:border-zinc-800 pt-3 text-sm">
          {item.citations.map((citation, i) => (
            <li key={citation.id} id={`question-${item.id}-${i + 1}`} className="flex gap-3">
              <span className="font-mono text-xs text-zinc-400 w-5">{i + 1}</span>
              <span className="font-mono text-xs uppercase text-zinc-400 w-16">{citation.kind}</span>
              {citation.url ? (
                <a
                  href={citation.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-sage transition-colors"
                >
                  {citation.title}
                </a>
              ) : (
                <span>{citation.title}</span>
              )}
            </li>
          ))}
        </ol>
      )}

      <button
        onClick={() => setOpen(!open)}
        className="mt-3 font-mono text-xs uppercase tracking-widest text-sage hover:underline"
      >
        {open ? 'Collapse' : 'Show the whole answer'}
      </button>
    </article>
  )
}

export default function AdminQuestionsList() {
  const [filters, setFilters] = useState<QuestionFilters>({ who: 'visitors' })
  const [items, setItems] = useState<AskedQuestion[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // When Questions was opened before this visit: visitors' questions after
  // it are marked new. undefined until known (or if it can't be recorded).
  const [previousVisit, setPreviousVisit] = useState<string | null>()
  const recorded = useRef(false)

  useEffect(() => {
    // Once per visit: a second record (React runs effects twice in
    // development) would make this very visit the previous one.
    if (recorded.current) return
    recorded.current = true
    adminAskQuestionsService
      .markSeen()
      .then(setPreviousVisit)
      .catch(() => {})
  }, [])

  const isNew = (item: AskedQuestion) =>
    previousVisit !== undefined &&
    !item.admin &&
    (previousVisit === null || new Date(item.createdAt) > new Date(previousVisit))

  const load = useCallback(
    async (offset: number) => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await adminAskQuestionsService.list(filters, offset, PAGE)
        setItems((previous) => (offset === 0 ? response.data : [...previous, ...response.data]))
        setTotal(response.pagination.total)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load questions')
      } finally {
        setIsLoading(false)
      }
    },
    [filters],
  )

  useEffect(() => {
    load(0)
  }, [load])

  const rate = async (id: string, rating: Rating | null) => {
    try {
      const { data } = await adminAskQuestionsService.rate(id, rating)
      setItems((previous) => previous.map((item) => (item.id === id ? data : item)))
    } catch {
      alert('Failed to save the rating')
    }
  }

  return (
    <div className="min-h-screen bg-paper dark:bg-[#0f0f0f]">
      <AdminNav />

      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <h1 className="font-serif text-2xl font-light">Questions</h1>
          <p className="text-sm text-zinc-faded">
            What was asked in the chat, kept for 30 days. Rate answers to build the evaluation set.
          </p>
          {previousVisit && (
            <p className="mt-1 font-mono text-xs text-sage">
              New since your last visit,{' '}
              {new Date(previousVisit).toLocaleString([], {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {WHO.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilters({ ...filters, who: value })}
              className={chip(filters.who === value)}
            >
              {label}
            </button>
          ))}
          <span className="mx-2 h-5 w-px bg-zinc-200 dark:bg-zinc-800" />
          {FLAGS.map(({ key, label, title }) => (
            <button
              key={key}
              title={title}
              aria-pressed={Boolean(filters[key])}
              onClick={() => setFilters({ ...filters, [key]: !filters[key] })}
              className={chip(Boolean(filters[key]))}
            >
              {label}
            </button>
          ))}
          <span className="mx-2 h-5 w-px bg-zinc-200 dark:bg-zinc-800" />
          <select
            value={filters.rating ?? ''}
            onChange={(e) =>
              setFilters({ ...filters, rating: (e.target.value || undefined) as QuestionFilters['rating'] })
            }
            className="bg-transparent rounded-full border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-zinc-500"
            aria-label="Rating"
          >
            {RATINGS.map(({ value, label }) => (
              <option key={label} value={value ?? ''}>
                {label}
              </option>
            ))}
          </select>
          <span className="ml-auto font-mono text-xs text-zinc-400">{total} questions</span>
        </div>

        {error ? (
          <div className="py-16 text-center">
            <p className="text-zinc-faded">{error}</p>
            <button
              onClick={() => load(0)}
              className="mt-4 font-mono text-xs uppercase tracking-widest text-sage hover:underline"
            >
              Try again
            </button>
          </div>
        ) : !isLoading && items.length === 0 ? (
          <p className="py-16 text-center font-serif text-xl text-zinc-faded">
            No questions match
          </p>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <QuestionCard
                key={item.id}
                item={item}
                isNew={isNew(item)}
                onRate={(rating) => rate(item.id, rating)}
              />
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
          </div>
        ) : (
          items.length < total && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => load(items.length)}
                className="font-mono text-xs uppercase tracking-widest text-sage hover:underline"
              >
                Load more
              </button>
            </div>
          )
        )}

        <div className="mt-12 pt-8 border-t border-zinc-200 dark:border-zinc-800">
          <Link
            to="/"
            className="font-mono text-xs uppercase tracking-widest text-zinc-faded hover:text-ink transition-colors"
          >
            Back to Site
          </Link>
        </div>
      </main>
    </div>
  )
}
