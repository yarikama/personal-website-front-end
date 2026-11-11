import { afterEach, describe, expect, it, vi } from 'vitest'
import { adminTodosService, localDay } from './adminTodos'

afterEach(() => vi.unstubAllGlobals())

describe('localDay', () => {
  it('is the date in the browser’s own time zone, not UTC', () => {
    expect(localDay(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
    expect(localDay(new Date(2026, 9, 2, 0, 1))).toBe('2026-10-02')
  })
})

describe('adminTodosService', () => {
  it('asks for a day, and ticks with the day it is done on', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: 't1' } })))
    vi.stubGlobal('fetch', fetch)

    await adminTodosService.list('2026-10-02')
    await adminTodosService.tick('t1', true, '2026-10-02')

    expect(fetch.mock.calls[0][0]).toMatch(/\/admin\/todos\?day=2026-10-02$/)
    expect(fetch.mock.calls[1][0]).toMatch(/\/admin\/todos\/t1$/)
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ done: true, day: '2026-10-02' })
    expect(fetch.mock.calls[1][1].credentials).toBe('include')
  })
})

describe('completing a to-do', () => {
  it('offers the most recent past item that what is typed starts', async () => {
    const { completion } = await import('../../lib/todos')
    const history = ['Review the CSP reports', 'Reply to the recruiter', 'Review notes']

    expect(completion('rev', history)).toBe('Review the CSP reports')
    expect(completion('Repl', history)).toBe('Reply to the recruiter')
    expect(completion('r', history)).toBeNull() // too short to guess
    expect(completion('Review the CSP reports', history)).toBeNull() // nothing more to add
    expect(completion('Write', history)).toBeNull()
  })
})

describe('adminPlannerService', () => {
  it('reads the planner, and sends only what changes', async () => {
    const planner = { goals: 'Graduate', goalsUpdatedAt: null, notes: '', notesUpdatedAt: null }
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: planner })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { ...planner, notes: 'Busy' } })))
    vi.stubGlobal('fetch', fetch)
    const { adminPlannerService } = await import('./adminPlanner')

    expect(await adminPlannerService.get()).toEqual(planner)
    expect((await adminPlannerService.set({ notes: 'Busy' })).notes).toBe('Busy')

    expect(fetch.mock.calls[0][0]).toMatch(/\/admin\/planner$/)
    expect(fetch.mock.calls[1][1].method).toBe('PUT')
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ notes: 'Busy' })
  })
})
