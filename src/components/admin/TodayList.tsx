import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, Check, Plus, Sparkles, X } from 'lucide-react'
import { adminTodosService, localDay, type Todo } from '../../services/api'
import { arrange, completion } from '../../lib/todos'

// The day's to-dos, kept by the API: a NeetCode problem every day, what the
// owner adds, whatever was left undone on earlier days, marked with the day
// it was for, and Claude's morning plan: due today at the top with the rest,
// then this week and what can wait, each saying why.

const SHORT_DAY = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

function dayBefore(day: string): string {
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10)
}

// What carried over from before yesterday says which day it was for.
function olderThanYesterday(todo: Todo, today: string): string | null {
  if (todo.day >= dayBefore(today)) return null
  return SHORT_DAY.format(new Date(`${todo.day}T00:00:00Z`))
}

export default function TodayList({ date }: { date: Date }) {
  const today = localDay(date)
  const [todos, setTodos] = useState<Todo[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [draft, setDraft] = useState('')
  const [history, setHistory] = useState<string[]>([])
  // Esc hides the completion until the text changes.
  const [dismissed, setDismissed] = useState(false)
  const suggestion = dismissed ? null : completion(draft, history)

  useEffect(() => {
    adminTodosService
      .history()
      .then(setHistory)
      .catch(() => {})
  }, [])

  const load = useCallback(async () => {
    try {
      setTodos(await adminTodosService.list(today))
      setFailed(false)
    } catch {
      setFailed(true)
    }
  }, [today])

  useEffect(() => {
    load()
  }, [load])

  const replace = (next: Todo) =>
    setTodos((current) => current?.map((todo) => (todo.id === next.id ? next : todo)) ?? null)

  const toggle = async (todo: Todo) => {
    const done = !todo.doneOn
    replace({ ...todo, doneOn: done ? today : null })
    try {
      replace(await adminTodosService.tick(todo.id, done, today))
    } catch {
      replace(todo)
    }
  }

  const remove = async (todo: Todo) => {
    setTodos((current) => current?.filter((other) => other.id !== todo.id) ?? null)
    try {
      await adminTodosService.remove(todo.id)
    } catch {
      load()
    }
  }

  const add = async (event: React.FormEvent) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text) return
    setDraft('')
    try {
      const todo = await adminTodosService.add(text, today)
      setTodos((current) => [...(current ?? []), todo])
      setHistory((past) => [text, ...past.filter((other) => other !== text)])
    } catch {
      setDraft(text)
    }
  }

  if (failed) {
    return <p className="text-sm text-zinc-faded">The to-dos are unavailable right now.</p>
  }

  const renderItem = (todo: Todo, carried: boolean) => {
    const done = Boolean(todo.doneOn)
    const older = carried ? olderThanYesterday(todo, today) : null
    const external = todo.href && !todo.href.startsWith('/')
    const textClass = `text-sm transition-colors ${
      done ? 'text-zinc-400 line-through' : carried ? 'text-red-600 dark:text-red-400' : 'text-ink'
    }`
    const planned = todo.source === 'claude'
    const label = todo.href ? (
      external ? (
        <a
          href={todo.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1 hover:text-sage ${textClass}`}
        >
          {todo.text}
          <ArrowUpRight size={12} aria-hidden="true" className="text-zinc-400" />
        </a>
      ) : (
        <Link to={todo.href} className={`hover:text-sage ${textClass}`}>
          {todo.text}
        </Link>
      )
    ) : (
      <span className={textClass}>{todo.text}</span>
    )
    return (
      <li key={todo.id} className={`group flex gap-3 ${planned && todo.reason ? 'items-start' : 'items-center'}`}>
        <button
          onClick={() => toggle(todo)}
          role="checkbox"
          aria-checked={done}
          aria-label={todo.text}
          className={`flex h-5 w-5 shrink-0 items-center justify-center border transition-colors ${
            done
              ? 'border-sage bg-sage text-paper'
              : carried
                ? 'border-red-400/70 hover:border-red-500'
                : 'border-zinc-300 hover:border-sage'
          }`}
        >
          {done && <Check size={12} aria-hidden="true" />}
        </button>
        {planned ? (
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {label}
              <Sparkles size={11} aria-label="From the morning plan" className="shrink-0 text-sage/70" />
            </div>
            {todo.reason && !done && <p className="mt-0.5 text-xs leading-snug text-zinc-faded">{todo.reason}</p>}
          </div>
        ) : (
          label
        )}
        {older && !done && (
          <span className="font-mono text-[11px] uppercase tracking-widest text-red-600/80 dark:text-red-400/80">
            {older}
          </span>
        )}
        <button
          onClick={() => remove(todo)}
          aria-label={`Remove: ${todo.text}`}
          title="Remove"
          className="ml-auto p-1 text-zinc-400 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100 focus-visible:opacity-100"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </li>
    )
  }

  // Left undone on earlier days, in a block of its own, in red; the morning
  // plan's this week and later under the list.
  const { carried, today: own, week, later } = arrange(todos ?? [], today)
  const planned = todos?.some((todo) => todo.source === 'claude') ?? false

  return (
    <div>
      {carried.length > 0 && (
        <div className="mb-6 border-l-2 border-red-500/60 pl-4">
          <p className="font-mono text-xs uppercase tracking-widest text-red-600 dark:text-red-400">
            Yesterday
          </p>
          <ul className="mt-3 space-y-3">{carried.map((todo) => renderItem(todo, true))}</ul>
        </div>
      )}

      <ul className="space-y-3">
        {todos === null && <li className="h-5 w-48 animate-pulse bg-paper-dark" />}
        {own.map((todo) => renderItem(todo, false))}
      </ul>

      <form onSubmit={add} className="mt-4 flex items-center gap-3">
        <Plus size={14} aria-hidden="true" className="ml-[3px] shrink-0 text-zinc-400" />
        <div className="relative flex-1">
          {/* The completion, behind the field: the typed text kept invisible
              so the gray rest lines up after it. */}
          {suggestion && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre border-b border-transparent py-1 text-sm"
            >
              <span className="invisible">{draft}</span>
              <span className="text-zinc-400">{suggestion.slice(draft.length)}</span>
            </div>
          )}
          <input
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              setDismissed(false)
            }}
            onKeyDown={(e) => {
              if (!suggestion) return
              const atEnd = e.currentTarget.selectionStart === draft.length
              if (e.key === 'Tab' || (e.key === 'ArrowRight' && atEnd)) {
                e.preventDefault()
                setDraft(suggestion)
              } else if (e.key === 'Escape') {
                setDismissed(true)
              }
            }}
            maxLength={500}
            placeholder="Add a to-do, then Enter"
            aria-label="Add a to-do"
            aria-autocomplete="inline"
            aria-description={suggestion ? `Tab completes: ${suggestion}` : undefined}
            className="relative w-full border-b border-transparent bg-transparent py-1 text-sm placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none"
          />
        </div>
      </form>

      {week.length > 0 && (
        <div className="mt-8">
          <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">This week</p>
          <ul className="mt-3 space-y-3">{week.map((todo) => renderItem(todo, false))}</ul>
        </div>
      )}

      {later.length > 0 && (
        <details className="group/later mt-6">
          <summary className="cursor-pointer list-none font-mono text-xs uppercase tracking-widest text-zinc-400 hover:text-ink">
            Can wait · {later.length}
          </summary>
          <ul className="mt-3 space-y-3">{later.map((todo) => renderItem(todo, false))}</ul>
        </details>
      )}

      <Link
        to="/admin/planner"
        className="mt-8 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-zinc-400 hover:text-sage"
      >
        <Sparkles size={12} aria-hidden="true" />
        {planned ? 'What the morning plan works from' : 'Set up the morning plan'}
        <ArrowRight size={12} aria-hidden="true" />
      </Link>
    </div>
  )
}
