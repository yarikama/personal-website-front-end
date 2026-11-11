import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, FilePen, Inbox, MessageSquare, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import AdminNav from '../../components/admin/AdminNav'
import CurrentGoal from '../../components/admin/CurrentGoal'
import DayCountdown from '../../components/admin/DayCountdown'
import ContributionHeatmap from '../../components/admin/ContributionHeatmap'
import TodayList from '../../components/admin/TodayList'
import { useNewQuestions, useUnreadMessages } from '../../hooks'
import { adminLabNotesService, adminVisitorsService } from '../../services/api'

// The admin's first page after signing in: the current goal, the day's
// to-dos, what is waiting, and a year on GitHub.

function useNow(everyMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), everyMs)
    return () => window.clearInterval(timer)
  }, [everyMs])
  return now
}

function useDrafts(): number | null {
  const [drafts, setDrafts] = useState<number | null>(null)
  useEffect(() => {
    let live = true
    adminLabNotesService
      .getAll(100)
      .then(({ data }) => live && setDrafts(data.filter((note) => !note.published).length))
      .catch(() => live && setDrafts(null))
    return () => {
      live = false
    }
  }, [])
  return drafts
}

// Visitors over the last seven days; undefined hides the row (Vercel not set
// up, or unavailable).
function useWeekVisitors(): number | null | undefined {
  const [visitors, setVisitors] = useState<number | null | undefined>(null)
  useEffect(() => {
    let live = true
    adminVisitorsService
      .report(7)
      .then((report) => live && setVisitors(report.visitors))
      .catch(() => live && setVisitors(undefined))
    return () => {
      live = false
    }
  }, [])
  return visitors
}

function Waiting({
  to,
  icon: Icon,
  count,
  one,
  many,
  none,
}: {
  to: string
  icon: LucideIcon
  count: number | null
  one: string
  many: string
  none: string
}) {
  const text = count === null ? '…' : count === 0 ? none : count === 1 ? one : many.replace('{n}', String(count))
  return (
    <Link
      to={to}
      className={`group flex items-center gap-4 border p-5 transition-colors ${
        count ? 'border-sage/60 hover:border-sage' : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400'
      }`}
    >
      <Icon size={18} aria-hidden="true" className={count ? 'text-sage' : 'text-zinc-400'} />
      <span className="flex-1 text-sm text-zinc-faded group-hover:text-ink transition-colors">{text}</span>
      <ArrowRight
        size={14}
        aria-hidden="true"
        className="text-zinc-400 transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  )
}

export default function AdminHome() {
  const now = useNow()
  const unread = useUnreadMessages()
  const newQuestions = useNewQuestions()
  const drafts = useDrafts()
  const weekVisitors = useWeekVisitors()
  // Changes once a day, so the routine reloads only then.
  const dayKey = now.toDateString()
  const day = useMemo(() => new Date(dayKey), [dayKey])

  return (
    <div className="min-h-screen bg-paper dark:bg-[#0f0f0f]">
      <AdminNav />

      <main className="max-w-5xl mx-auto px-6 py-16 md:py-24">
        <h1 className="sr-only">Desk</h1>

        <section>
          <p className="font-mono text-xs text-zinc-400 uppercase tracking-widest">Current goal</p>
          <div className="mt-3">
            <CurrentGoal />
          </div>
        </section>

        <div className="mt-16 grid gap-12 md:grid-cols-2">
          <section>
            <p className="font-mono text-xs text-zinc-400 uppercase tracking-widest">Today</p>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <p className="font-serif text-2xl" lang="zh-Hant">
                今日事今日畢
              </p>
              <DayCountdown />
            </div>
            <div className="mt-5">
              <TodayList date={day} />
            </div>
          </section>

          <section>
            <p className="font-mono text-xs text-zinc-400 uppercase tracking-widest">Waiting for you</p>
            <div className="mt-4 grid gap-3">
              <Waiting
                to="/admin/messages"
                icon={Inbox}
                count={unread}
                one="1 unread message"
                many="{n} unread messages"
                none="No unread messages"
              />
              <Waiting
                to="/admin/questions"
                icon={MessageSquare}
                count={newQuestions}
                one="1 new question since your last look"
                many="{n} new questions since your last look"
                none="No new questions"
              />
              <Waiting
                to="/admin/notes"
                icon={FilePen}
                count={drafts}
                one="1 draft waiting to be finished"
                many="{n} drafts waiting to be finished"
                none="No drafts in progress"
              />
              {weekVisitors !== undefined && (
                <Waiting
                  to="/admin/visitors"
                  icon={Users}
                  count={weekVisitors}
                  one="1 visitor this week"
                  many="{n} visitors this week"
                  none="No visitors this week"
                />
              )}
            </div>
          </section>
        </div>

        <section className="mt-16">
          <p className="font-mono text-xs text-zinc-400 uppercase tracking-widest">A year on GitHub</p>
          <div className="mt-4">
            <ContributionHeatmap />
          </div>
        </section>
      </main>
    </div>
  )
}
