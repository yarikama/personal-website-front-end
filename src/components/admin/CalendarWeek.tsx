import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, CalendarDays } from 'lucide-react'
import { adminCalendarService, type CalendarWeek as Week } from '../../services/api'
import { agenda, dayLabel, startOfDayIso } from '../../lib/calendar'

// The owner's week from Google Calendar, read-only: every calendar in their
// list, a day per row from today. Until it is connected, a link to connect
// it; after Google's consent page the API sends the browser back here with
// ?calendar=connected (or =denied when calendar access was unticked).

const DAYS = 7

const RETURN_NOTES: Record<string, string> = {
  connected: 'Calendar connected.',
  denied: 'Calendar access was not granted, so nothing was connected.',
  not_configured: 'Google sign-in is not set up on the API.',
  unavailable: 'Could not reach Google. Try connecting again.',
}

function useReturnNote(): string | null {
  const [note] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return RETURN_NOTES[params.get('calendar') ?? ''] ?? null
  })
  // Said once: a reload or a bookmark shouldn't say it again.
  useEffect(() => {
    const url = new URL(window.location.href)
    if (!url.searchParams.has('calendar')) return
    url.searchParams.delete('calendar')
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
  }, [])
  return note
}

export default function CalendarWeek({ date }: { date: Date }) {
  const note = useReturnNote()
  const [week, setWeek] = useState<Week | null>(null)
  const [failed, setFailed] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const start = startOfDayIso(date)

  useEffect(() => {
    let live = true
    setFailed(false)
    adminCalendarService
      .events(start, DAYS)
      .then((data) => live && setWeek(data))
      .catch(() => live && setFailed(true))
    return () => {
      live = false
    }
  }, [start])

  const days = useMemo(
    () => (week?.connected ? agenda(week.events, date, DAYS) : []),
    [week, date]
  )
  const colours = useMemo(
    () => new Map(week?.connected ? week.calendars.map((c) => [c.id, c.color]) : []),
    [week]
  )

  const disconnect = async () => {
    setConfirming(false)
    try {
      await adminCalendarService.disconnect()
      setWeek({ connected: false, expired: false })
    } catch {
      setFailed(true)
    }
  }

  return (
    <div>
      {note && <p className="mb-4 text-sm text-sage-ink">{note}</p>}

      {failed && !week && <p className="text-sm text-zinc-faded">Google Calendar is unavailable right now.</p>}
      {!failed && !week && <p className="text-sm text-zinc-faded">…</p>}

      {week && !week.connected && (
        <div className="rounded-xl bg-paper-dark dark:bg-zinc-900 p-5 flex flex-wrap items-center gap-4">
          <CalendarDays size={18} aria-hidden="true" className="text-zinc-faded" />
          <p className="flex-1 min-w-48 text-sm text-zinc-faded">
            {week.expired
              ? 'Google stopped accepting the calendar connection. Connect it again to see your week.'
              : 'Connect your Google Calendar to see the week here. Read-only, every calendar in your list.'}
          </p>
          <a
            href={adminCalendarService.connectUrl()}
            className="rounded-full bg-sage px-4 py-2 text-sm text-paper hover:bg-sage-ink transition-colors"
          >
            {week.expired ? 'Connect again' : 'Connect Google Calendar'}
          </a>
        </div>
      )}

      {week?.connected && (
        <>
          <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {days.map((day) => (
              <li key={day.day}>
                <p className="font-serif text-xl">{dayLabel(day.date, date)}</p>
                {day.items.length === 0 ? (
                  <p className="mt-2 text-sm text-zinc-faded">Nothing scheduled</p>
                ) : (
                  <ul className="mt-2 grid gap-2">
                    {day.items.map(({ event, when }) => (
                      <li key={`${event.calendar_id}/${event.id}/${day.day}`} className="flex gap-3">
                        <span
                          aria-hidden="true"
                          className="mt-[0.45rem] w-2 h-2 shrink-0 rounded-full bg-zinc-400"
                          style={colours.get(event.calendar_id) ? { background: colours.get(event.calendar_id) } : undefined}
                        />
                        <div className="min-w-0">
                          <p className="text-sm leading-snug">
                            {event.url ? (
                              <a
                                href={event.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-sage-ink transition-colors"
                              >
                                {event.title}
                              </a>
                            ) : (
                              event.title
                            )}
                          </p>
                          <p className="text-xs text-zinc-faded">
                            <span className="font-mono tracking-normal">{when}</span>
                            {event.location && ` · ${event.location}`}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>

          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-faded">
            {week.failed.length > 0 && <span>Could not read: {week.failed.join(', ')}</span>}
            <a
              href="https://calendar.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-sage-ink transition-colors"
            >
              Open Google Calendar
              <ArrowUpRight size={14} aria-hidden="true" />
            </a>
            {confirming ? (
              <span className="inline-flex items-center gap-3">
                Disconnect {week.email}?
                <button type="button" onClick={disconnect} className="text-ink hover:text-sage-ink">
                  Disconnect
                </button>
                <button type="button" onClick={() => setConfirming(false)} className="hover:text-ink">
                  Cancel
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirming(true)} className="hover:text-ink transition-colors">
                Disconnect
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
