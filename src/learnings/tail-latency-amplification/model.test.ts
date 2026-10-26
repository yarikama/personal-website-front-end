import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import { percent, sampleCall, samplePage, slowChance, slowPages, SLOW_MS } from './model'

describe('the chance a page is slow', () => {
  it('is the chance of one call for a page of one call', () => {
    expect(slowChance(0.01, 1)).toBeCloseTo(0.01)
  })

  it('grows with every call the page waits on', () => {
    expect(slowChance(0.01, 10)).toBeCloseTo(0.0956, 4)
    expect(slowChance(0.01, 100)).toBeCloseTo(0.634, 3)
  })

  it('reads as the story tells it', () => {
    expect([1, 10, 100].map((n) => percent(slowChance(0.01, n)))).toEqual(['1%', '9.6%', '63.4%'])
  })
})

describe('a sampled call', () => {
  it('is fast or slow, never in between', () => {
    const random = seeded(1)
    for (let i = 0; i < 2000; i++) {
      const ms = sampleCall(random, 0.05)
      expect(ms < 80 || (ms >= 400 && ms <= 900)).toBe(true)
    }
  })

  it('is slow about as often as asked', () => {
    const random = seeded(2)
    const calls = Array.from({ length: 20000 }, () => sampleCall(random, 0.01))
    const slow = calls.filter((ms) => ms > SLOW_MS).length / calls.length
    expect(slow).toBeGreaterThan(0.008)
    expect(slow).toBeLessThan(0.012)
  })

  it('makes pages slow as often as the arithmetic says', () => {
    const random = seeded(3)
    const pages = Array.from({ length: 5000 }, () => Math.max(...samplePage(random, 0.01, 50)))
    const slow = pages.filter((ms) => ms > SLOW_MS).length / pages.length
    expect(slow).toBeCloseTo(slowChance(0.01, 50), 1)
  })
})

describe('a run of pages', () => {
  it('has one answer per page, slow when any call was', () => {
    const pages = slowPages(seeded(4), 0.01, 100, 2000)
    expect(pages).toHaveLength(2000)
    const share = pages.filter(Boolean).length / pages.length
    expect(share).toBeCloseTo(slowChance(0.01, 100), 1)
  })

  it('is never slow when no call can be', () => {
    expect(slowPages(seeded(5), 0, 100, 100).some(Boolean)).toBe(false)
  })
})

describe('the seeded random numbers', () => {
  it('repeat for a seed, and stay in [0, 1)', () => {
    const a = seeded(42)
    const b = seeded(42)
    for (let i = 0; i < 100; i++) {
      const x = a()
      expect(x).toBe(b())
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(1)
    }
  })
})
