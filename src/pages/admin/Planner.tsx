import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import AdminNav from '../../components/admin/AdminNav'
import { adminPlannerService, PLANNER_MAX, type Planner } from '../../services/api'

// What Claude's morning plan works from. Each morning a scheduled Claude
// reads the owner's mail and calendar, these goals and its own notes, and
// lays out the day's to-dos on the welcome page. The owner writes the goals;
// Claude rewrites the notes each morning, and the owner can correct them.

const LABEL = 'font-mono text-xs text-zinc-400 uppercase tracking-widest'
const WHEN = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

function Page({
  label,
  hint,
  value,
  updatedAt,
  by,
  onSave,
}: {
  label: string
  hint: string
  value: string
  updatedAt: string | null
  by: string
  onSave: (text: string) => Promise<void>
}) {
  const [draft, setDraft] = useState(value)
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle')
  const changed = draft.trim() !== value

  useEffect(() => setDraft(value), [value])

  const save = async () => {
    setState('saving')
    try {
      await onSave(draft.trim())
      setState('saved')
    } catch {
      setState('failed')
    }
  }

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className={LABEL}>{label}</h2>
        {updatedAt && (
          <p className="font-mono text-[11px] text-zinc-400">
            {by} · {WHEN.format(new Date(updatedAt))}
          </p>
        )}
      </div>
      <p className="mt-2 text-sm text-zinc-faded">{hint}</p>
      <textarea
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value)
          setState('idle')
        }}
        maxLength={PLANNER_MAX}
        rows={10}
        lang="zh-Hant"
        aria-label={label}
        className="mt-4 w-full resize-y border border-zinc-200 bg-transparent p-4 font-mono text-sm leading-relaxed focus:border-sage focus:outline-none dark:border-zinc-800"
      />
      <div className="mt-3 flex items-center gap-4">
        <button
          onClick={save}
          disabled={!changed || state === 'saving'}
          className="border border-ink px-4 py-2 font-mono text-xs uppercase tracking-widest transition-colors hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:border-zinc-300 disabled:text-zinc-400 disabled:hover:bg-transparent dark:border-white dark:hover:bg-white dark:hover:text-zinc-900"
        >
          {state === 'saving' ? 'Saving…' : 'Save'}
        </button>
        <p className="font-mono text-[11px] text-zinc-400" aria-live="polite">
          {state === 'saved' && 'Saved'}
          {state === 'failed' && <span className="text-red-600 dark:text-red-400">Not saved; try again</span>}
          {state === 'idle' && `${draft.length} / ${PLANNER_MAX}`}
        </p>
      </div>
    </section>
  )
}

export default function AdminPlanner() {
  const [planner, setPlanner] = useState<Planner | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    adminPlannerService
      .get()
      .then(setPlanner)
      .catch(() => setFailed(true))
  }, [])

  return (
    <div className="min-h-screen bg-paper dark:bg-[#0f0f0f]">
      <AdminNav />

      <main className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-zinc-400 hover:text-sage"
        >
          <ArrowLeft size={12} aria-hidden="true" />
          Today
        </Link>
        <h1 className="mt-6 font-serif text-4xl md:text-5xl font-light tracking-tight">The morning plan</h1>
        <p className="mt-4 max-w-xl text-zinc-faded">
          Every morning at 7, Claude reads your mail, your calendar (Canvas included), these goals and its own
          notes, then lays out the day on the welcome page: what is due today, what to move on this week, and what
          can wait.
        </p>

        {failed && <p className="mt-12 text-sm text-zinc-faded">The plan’s settings are unavailable right now.</p>}
        {!failed && planner === null && <div className="mt-12 h-64 animate-pulse bg-paper-dark" />}
        {planner && (
          <div className="mt-12 space-y-14">
            <Page
              label="Long-term goals"
              hint="Where you are heading, in a few lines: what each morning’s plan is weighed against."
              value={planner.goals}
              updatedAt={planner.goalsUpdatedAt}
              by="You"
              onSave={async (goals) => setPlanner(await adminPlannerService.set({ goals }))}
            />
            <Page
              label="Claude’s notes on you"
              hint="What Claude has gathered about what you are working towards. It rewrites these each morning; correct anything it has wrong."
              value={planner.notes}
              updatedAt={planner.notesUpdatedAt}
              by="Last written"
              onSave={async (notes) => setPlanner(await adminPlannerService.set({ notes }))}
            />
          </div>
        )}
      </main>
    </div>
  )
}
