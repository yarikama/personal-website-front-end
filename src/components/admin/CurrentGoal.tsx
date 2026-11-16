import { useEffect, useRef, useState } from 'react'
import { Pencil } from 'lucide-react'
import { adminGoalService } from '../../services/api'

// The owner's current goal: a few words, large. Click it (or the pencil) to
// change it; Enter or leaving the field saves, Esc puts it back.

export default function CurrentGoal() {
  const [goal, setGoal] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    adminGoalService
      .get()
      .then(({ text }) => setGoal(text))
      .catch(() => setFailed(true))
  }, [])

  useEffect(() => {
    if (editing) input.current?.select()
  }, [editing])

  const edit = () => {
    setDraft(goal ?? '')
    setEditing(true)
  }

  const save = async () => {
    setEditing(false)
    const text = draft.trim()
    if (text === goal) return
    const previous = goal
    setGoal(text)
    try {
      setGoal((await adminGoalService.set(text)).text)
    } catch {
      setGoal(previous)
    }
  }

  if (failed) {
    return <p className="text-sm text-zinc-faded">The goal is unavailable right now.</p>
  }

  // lang: Cormorant has no Chinese, and in a zh-Hant element the browser falls
  // back to a Chinese serif, the same one as 今日事今日畢 on the page, not a sans
  const big = 'font-serif text-4xl md:text-6xl font-light tracking-tight leading-tight'

  if (editing) {
    return (
      <input
        ref={input}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') {
            setDraft(goal ?? '')
            setEditing(false)
          }
        }}
        maxLength={120}
        lang="zh-Hant"
        aria-label="Current goal"
        placeholder="A few words"
        className={`${big} w-full border-b border-zinc-300 bg-transparent pb-1 placeholder:text-zinc-faded focus:border-sage focus:outline-none`}
      />
    )
  }

  return (
    <button
      onClick={edit}
      disabled={goal === null}
      title="Change the goal"
      className="group flex w-full items-start gap-4 text-left"
    >
      <span lang="zh-Hant" className={`${big} ${goal ? '' : 'text-zinc-faded'}`}>
        {goal === null ? '…' : goal || 'Set a goal'}
      </span>
      <Pencil
        size={16}
        aria-hidden="true"
        className="mt-3 shrink-0 text-zinc-faded opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
      />
    </button>
  )
}
