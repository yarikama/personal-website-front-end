import { adminFetch } from './auth'
import { API_BASE_URL } from './client'

// The owner's Google Calendar, read-only, through the API: every calendar in
// their list. Connecting goes through Google's consent page, from connectUrl.

export interface CalendarInfo {
  id: string
  name: string
  color: string // Google's colour for it, '#rrggbb', or '' for none
}

export interface CalendarEvent {
  id: string
  calendar_id: string
  title: string
  // All-day: dates (YYYY-MM-DD), the end the day after the last. Otherwise
  // date-times with their offset.
  start: string
  end: string
  all_day: boolean
  location: string
  url: string
}

export type CalendarWeek =
  | { connected: false; expired: boolean }
  | {
      connected: true
      email: string
      calendars: CalendarInfo[]
      events: CalendarEvent[]
      failed: string[] // calendars that could not be read this time
    }

export class CalendarUnavailableError extends Error {}

export const adminCalendarService = {
  /** `start`: the start of the owner's day, with its UTC offset. */
  async events(start: string, days: number): Promise<CalendarWeek> {
    const query = new URLSearchParams({ start, days: String(days) })
    const response = await adminFetch(`${API_BASE_URL}/admin/calendar?${query}`)
    if (response.status === 401) {
      window.location.href = '/admin/login'
      throw new Error('Unauthorized')
    }
    if (!response.ok) throw new CalendarUnavailableError('Google Calendar is unavailable')
    const { data } = await response.json()
    return data
  },

  /** Where the browser goes to connect the calendar (a page, not a fetch). */
  connectUrl(): string {
    return `${API_BASE_URL}/auth/google/calendar`
  },

  async disconnect(): Promise<void> {
    const response = await adminFetch(`${API_BASE_URL}/admin/calendar`, { method: 'DELETE' })
    if (!response.ok) throw new Error('Could not disconnect the calendar')
  },
}
