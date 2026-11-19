import { describe, expect, it } from 'vitest'
import { markTeaserSeen, TEASER_KEY, TEASER_QUESTIONS, teaserSeen } from './askTeaser'

function memory() {
  const data = new Map<string, string>()
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  }
}

const broken = {
  getItem: () => {
    throw new Error('blocked')
  },
  setItem: () => {
    throw new Error('blocked')
  },
}

describe('the ask teaser', () => {
  it('shows to a first-time visitor, then never again', () => {
    const storage = memory()
    expect(teaserSeen(storage)).toBe(false)
    markTeaserSeen(storage)
    expect(teaserSeen(storage)).toBe(true)
    expect(storage.getItem(TEASER_KEY)).toBe('1')
  })

  it('stays away when storage is missing or blocked, rather than showing on every page', () => {
    expect(teaserSeen(null)).toBe(true)
    expect(teaserSeen(broken)).toBe(true)
    expect(() => markTeaserSeen(broken)).not.toThrow()
  })

  it('offers short questions that fit its bubble', () => {
    expect(TEASER_QUESTIONS.length).toBe(2)
    for (const question of TEASER_QUESTIONS) expect(question.length).toBeLessThanOrEqual(34)
  })
})
