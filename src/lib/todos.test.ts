import { describe, expect, it } from 'vitest'
import type { Todo } from '../services/api/adminTodos'
import { arrange } from './todos'

const TODAY = '2026-11-12'

function todo(text: string, extra: Partial<Todo> = {}): Todo {
  return {
    id: text,
    text,
    href: null,
    day: TODAY,
    dailyKey: null,
    doneOn: null,
    createdAt: `${TODAY}T07:00:00Z`,
    source: 'owner',
    bucket: null,
    reason: null,
    ...extra,
  }
}

const texts = (todos: Todo[]) => todos.map((t) => t.text)

describe('arrange', () => {
  it('puts the morning plan’s today first, then the owner’s and the daily ones', () => {
    const arranged = arrange(
      [
        todo('NeetCode', { source: 'daily', dailyKey: 'neetcode' }),
        todo('Call home'),
        todo('Finish HW4', { source: 'claude', bucket: 'today', reason: 'Due Friday' }),
      ],
      TODAY,
    )
    expect(texts(arranged.today)).toEqual(['Finish HW4', 'NeetCode', 'Call home'])
  })

  it('files the plan’s other items under this week and can wait', () => {
    const arranged = arrange(
      [
        todo('Reply to the recruiter', { source: 'claude', bucket: 'week' }),
        todo('Read the DPO paper', { source: 'claude', bucket: 'later' }),
      ],
      TODAY,
    )
    expect(texts(arranged.week)).toEqual(['Reply to the recruiter'])
    expect(texts(arranged.later)).toEqual(['Read the DPO paper'])
    expect(arranged.today).toEqual([])
  })

  it('carries over the owner’s items but never the plan’s, which each morning redraws', () => {
    const arranged = arrange(
      [
        todo('Email the TA', { day: '2026-11-10' }),
        todo('Finish HW4', { source: 'claude', bucket: 'today', day: '2026-11-10' }),
      ],
      TODAY,
    )
    expect(texts(arranged.carried)).toEqual(['Email the TA'])
    expect(texts(arranged.today)).toEqual(['Finish HW4'])
  })

  it('treats a plan item without a bucket as due today', () => {
    expect(texts(arrange([todo('Finish HW4', { source: 'claude' })], TODAY).today)).toEqual(['Finish HW4'])
  })
})
