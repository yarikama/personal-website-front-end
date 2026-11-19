import type { CalendarEvent } from '../services/api/adminCalendar'

// The week view of the owner's calendar on the admin: which events fall on
// which of the browser's days, and how each one's time reads there.

const pad = (n: number) => String(n).padStart(2, '0')

function dayString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** The start of `date`'s day in the browser's zone, as ISO with its offset
 * ("2026-11-19T00:00:00-06:00"), which the API asks for. */
export function startOfDayIso(date: Date): string {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const offset = -start.getTimezoneOffset()
  const sign = offset < 0 ? '-' : '+'
  const abs = Math.abs(offset)
  return `${dayString(start)}T00:00:00${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
}

export interface AgendaItem {
  event: CalendarEvent
  // "All day", "15:00 – 16:00", "until 10:00" or "22:00 →", in the
  // browser's own clock style.
  when: string
}

export interface AgendaDay {
  day: string // YYYY-MM-DD, a day in the browser's zone
  date: Date // its start
  items: AgendaItem[]
}

function timeOf(date: Date, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(date)
}

/** `days` days from `from`'s day, each with the events on it: all-day ones
 * first, on every day they cover, then timed ones by start, also on each day
 * they run into. */
export function agenda(events: CalendarEvent[], from: Date, days: number, locale?: string): AgendaDay[] {
  const result: AgendaDay[] = []
  for (let i = 0; i < days; i++) {
    const start = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i)
    const end = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i + 1)
    const day = dayString(start)
    const allDay: AgendaItem[] = []
    const timed: { at: number; item: AgendaItem }[] = []
    for (const event of events) {
      if (event.all_day) {
        // Dates compare as strings; the end is the day after the last.
        if (event.start <= day && day < event.end) allDay.push({ event, when: 'All day' })
        continue
      }
      const begins = new Date(event.start)
      const ends = new Date(event.end)
      if (!(begins < end && ends > start)) continue
      const before = begins < start
      const after = ends > end
      const when =
        before && after
          ? 'All day'
          : before
            ? `until ${timeOf(ends, locale)}`
            : after
              ? `${timeOf(begins, locale)} →`
              : `${timeOf(begins, locale)} – ${timeOf(ends, locale)}`
      timed.push({ at: Math.max(begins.getTime(), start.getTime()), item: { event, when } })
    }
    timed.sort((a, b) => a.at - b.at)
    result.push({ day, date: start, items: [...allDay, ...timed.map((t) => t.item)] })
  }
  return result
}

/** "Today", "Tomorrow", then "Sat, Nov 21". */
export function dayLabel(date: Date, today: Date, locale?: string): string {
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diff = Math.round((startOf(date) - startOf(today)) / 86_400_000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric' }).format(date)
}
