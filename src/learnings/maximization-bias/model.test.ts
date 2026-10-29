import { describe, expect, it } from 'vitest'
import { detours, expectedMax, FLOOR, histogram, MARKETS, markets, mean, story, TRUCKS } from './model'

describe('the best of noisy guesses', () => {
  it('lands above the truth by the known amounts', () => {
    expect(expectedMax(1)).toBeCloseTo(0, 2)
    // E[max of two standard normals] = 1/√π
    expect(expectedMax(2)).toBeCloseTo(1 / Math.sqrt(Math.PI), 2)
    expect(expectedMax(8)).toBeCloseTo(1.424, 2)
    expect(expectedMax(50)).toBeCloseTo(2.25, 1)
  })

  it('matches across the story’s thousand markets: one notebook too high, two fair', () => {
    const { one, two } = markets(MARKETS, TRUCKS, 1)
    expect(mean(one)).toBeCloseTo(7 + expectedMax(TRUCKS), 1)
    expect(mean(two)).toBeCloseTo(7, 1)
  })

  it('tells the story’s numbers: a lucky 8.9 that comes back a 7.1', () => {
    const market = story()
    expect(market.first[market.favourite]).toBeCloseTo(8.9, 1)
    expect(market.second[market.favourite]).toBeCloseTo(7.1, 1)
  })

  it('counts values into bins', () => {
    expect(histogram([4.1, 4.2, 4.6, 10.99, 12], 4, 11, 0.5)).toEqual([2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1])
  })
})

describe('the detour', () => {
  const early = (shares: number[]) => Math.max(...shares.slice(0, 60))
  const late = (shares: number[]) => mean(shares.slice(-50))

  it('lures Q-learning to the market when there are many stalls, but not Double Q-learning', () => {
    const q = detours('q', 10, 300)
    const double = detours('double', 10, 300)
    expect(early(q)).toBeGreaterThan(0.85)
    expect(early(double)).toBeLessThan(0.6)
    expect(late(double)).toBeLessThan(FLOOR + 0.04)
    expect(late(q)).toBeGreaterThan(late(double))
  })

  it('fools no one with a single stall', () => {
    const q = detours('q', 1, 300)
    const double = detours('double', 1, 300)
    expect(Math.abs(mean(q) - mean(double))).toBeLessThan(0.04)
  })
})
