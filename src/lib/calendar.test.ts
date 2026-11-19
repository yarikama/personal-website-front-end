import { describe, expect, it } from 'vitest'
import type { CalendarEvent } from '../services/api/adminCalendar'
import { agenda, dayLabel, startOfDayIso } from './calendar'

// Times are built in the machine's own zone, so these hold in any zone.
const at = (day: number, hour: number, minute = 0) => new Date(2026, 10, day, hour, minute)

function timed(id: string, start: Date, end: Date): CalendarEvent {
  return {
    id,
    calendar_id: 'cal',
    title: id,
    start: start.toISOString(),
    end: end.toISOString(),
    all_day: false,
    location: '',
    url: '',
  }
}

function allDay(id: string, start: string, end: string): CalendarEvent {
  return { id, calendar_id: 'cal', title: id, start, end, all_day: true, location: '', url: '' }
}

const MONDAY = at(16, 9, 30)

describe('startOfDayIso', () => {
  it('is local midnight, with the offset the API needs', () => {
    const iso = startOfDayIso(MONDAY)
    expect(iso).toMatch(/^2026-11-16T00:00:00[+-]\d\d:\d\d$/)
    expect(new Date(iso).getTime()).toBe(new Date(2026, 10, 16).getTime())
  })
})

describe('agenda', () => {
  const events = [
    timed('Office hours', at(16, 15), at(16, 16)),
    timed('COMP 646', at(16, 10, 50), at(16, 12, 5)),
    allDay('Break', '2026-11-16', '2026-11-18'),
    timed('Red-eye', at(17, 22), at(18, 6)),
    timed('Next week', at(30, 9), at(30, 10)),
  ]
  const week = agenda(events, MONDAY, 7, 'en-GB')

  it('gives each day from today, empty ones too', () => {
    expect(week.map((d) => d.day)).toEqual([
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
      '2026-11-19',
      '2026-11-20',
      '2026-11-21',
      '2026-11-22',
    ])
    expect(week[3].items).toEqual([])
  })

  it('puts all-day events first, then timed ones by start', () => {
    expect(week[0].items.map((i) => [i.event.title, i.when])).toEqual([
      ['Break', 'All day'],
      ['COMP 646', '10:50 – 12:05'],
      ['Office hours', '15:00 – 16:00'],
    ])
  })

  it('shows an all-day event on every day it covers, the end being the day after', () => {
    expect(week[1].items[0].event.title).toBe('Break')
    expect(week[2].items.map((i) => i.event.title)).toEqual(['Red-eye'])
  })

  it('shows an event past midnight on both days', () => {
    expect(week[1].items.at(-1)?.when).toBe('22:00 →')
    expect(week[2].items[0].when).toBe('until 6:00')
  })

  it('leaves out what falls after the range', () => {
    expect(week.flatMap((d) => d.items).some((i) => i.event.title === 'Next week')).toBe(false)
  })
})

describe('dayLabel', () => {
  it('names today and tomorrow, then the date', () => {
    expect(dayLabel(at(16, 0), MONDAY, 'en-US')).toBe('Today')
    expect(dayLabel(at(17, 23), MONDAY, 'en-US')).toBe('Tomorrow')
    expect(dayLabel(at(18, 0), MONDAY, 'en-US')).toBe('Wed, Nov 18')
  })
})
