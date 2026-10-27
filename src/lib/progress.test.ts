import { afterEach, describe, expect, it, vi } from 'vitest'
import { checksOf } from '../components/explain/checks'
import { afterReading, countsFrom, fadesOn, HOLD, readProgress, recordReading, settle, stageOf, WAIT } from './progress'

const DAY = 86_400_000
const memory = () => {
  const kept = new Map<string, string>()
  return { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => void kept.set(key, value) }
}

describe('reading a page', () => {
  it('cracks it the first time, then a stage further each time the wait is over', () => {
    let progress = afterReading(undefined, 0)
    expect(progress).toEqual({ stage: 1, at: 0 })
    progress = afterReading(progress, WAIT[1])
    expect(progress).toEqual({ stage: 2, at: WAIT[1] })
    progress = afterReading(progress, WAIT[1] + WAIT[2])
    expect(progress).toEqual({ stage: 3, at: WAIT[1] + WAIT[2] })
  })

  it('changes nothing when read again too soon', () => {
    const cracked = { stage: 1 as const, at: 0 }
    expect(afterReading(cracked, WAIT[1] - 1)).toEqual(cracked)
    const lit = { stage: 2 as const, at: 0 }
    expect(afterReading(lit, 2 * DAY)).toEqual(lit)
  })

  it('keeps a sun lit for longer when it is read again', () => {
    expect(afterReading({ stage: 3, at: 0 }, 5 * DAY)).toEqual({ stage: 3, at: 5 * DAY })
  })

  it('says when the next reading counts and when it fades', () => {
    expect(countsFrom({ stage: 1, at: 0 })).toBe(WAIT[1])
    expect(countsFrom({ stage: 3, at: 0 })).toBeNull()
    expect(fadesOn({ stage: 2, at: 0 })).toBe(HOLD[2])
  })
})

describe('fading', () => {
  it('holds a stage until its time is up', () => {
    expect(stageOf({ stage: 3, at: 0 }, HOLD[3])).toBe(3)
  })

  it('fades back a stage at a time, each on its own clock', () => {
    const sun = { stage: 3 as const, at: 0 }
    expect(settle(sun, HOLD[3] + 1)).toEqual({ stage: 2, at: HOLD[3] })
    expect(stageOf(sun, HOLD[3] + HOLD[2] + 1)).toBe(1)
    expect(settle(sun, HOLD[3] + HOLD[2] + HOLD[1] + 1)).toBeNull()
  })

  it('reads on from where it faded to', () => {
    // A sun left 100 days is light through the cracks again, and long past
    // the wait: the next reading opens it again
    expect(afterReading({ stage: 3, at: 0 }, 100 * DAY)).toEqual({ stage: 3, at: 100 * DAY })
    // Cracked and left to mend, it starts over
    expect(afterReading({ stage: 1, at: 0 }, HOLD[1] + 1)).toEqual({ stage: 1, at: HOLD[1] + 1 })
  })
})

describe('keeping progress', () => {
  it('keeps each page, and drops what isn’t progress', () => {
    const kept = memory()
    recordReading('percentiles', 0, kept)
    kept.setItem('learnings-progress', JSON.stringify({ ...JSON.parse(kept.getItem('learnings-progress')!), odd: { stage: 7, at: 1 } }))
    expect(readProgress(kept)).toEqual({ percentiles: { stage: 1, at: 0 } })
  })

  it('reads nothing from storage that is missing or broken', () => {
    expect(readProgress(null)).toEqual({})
    const kept = memory()
    kept.setItem('learnings-progress', '{not json')
    expect(readProgress(kept)).toEqual({})
  })
})

describe('a page’s checks', () => {
  afterEach(() => vi.unstubAllGlobals())
  const browser = () => {
    const localStorage = memory()
    vi.stubGlobal('window', { localStorage, dispatchEvent: vi.fn() })
    return localStorage
  }
  const reading = (rights: boolean[]) => {
    const checks = checksOf('percentiles')
    rights.forEach((_, i) => checks.register(`c${i}`))
    rights.forEach((right, i) => checks.answer(`c${i}`, right))
  }

  it('count the first reading once all are answered, right or not', () => {
    const kept = browser()
    const checks = checksOf('percentiles')
    checks.register('a')
    checks.register('b')
    checks.answer('a', false)
    expect(readProgress(kept)).toEqual({})
    checks.answer('b', true)
    expect(readProgress(kept).percentiles?.stage).toBe(1)
  })

  it('count a later reading only when every answer is right', () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    const kept = browser()
    reading([true, false])
    vi.setSystemTime(2 * DAY)
    reading([true, false])
    expect(readProgress(kept).percentiles?.stage).toBe(1)
    reading([true, true])
    expect(readProgress(kept).percentiles?.stage).toBe(2)
    vi.useRealTimers()
  })
})
