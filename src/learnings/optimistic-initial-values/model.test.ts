import { describe, expect, it } from 'vitest'
import { testbed } from '../../components/explain/bandit'
import { seeded } from '../../components/explain/random'
import {
  BEST_FLAVOUR,
  CHANGE_AT,
  crowd,
  customers,
  FLAVOURS,
  HOPE,
  leftAfter,
  machines,
  MACHINES,
  meanOf,
  MINT,
  NEW_MINT,
  nudge,
  optimist,
  percent,
  ratingsAfter,
  scoop,
  scoopsIn,
  SCOOP_NOISE,
  settledAt,
  shop,
  smooth,
  story,
  top,
  USUALLY,
  SHARE,
} from './model'

describe('a rating', () => {
  it('moves halfway toward the scoop, as the story tells it', () => {
    expect(nudge(10, 6, 0.5)).toBe(8)
    expect(nudge(8, 6, 0.5)).toBe(7)
    expect(nudge(10, 8, 0.5)).toBe(9)
  })

  it('goes all the way with a step of 1, the plain average’s first step', () => {
    expect(nudge(100, 1.3, 1)).toBeCloseTo(1.3)
  })
})

describe('how optimism drains', () => {
  it('leaves (1 − α)^k of the gap: 5 → 4.6 → 4.24 → 3.92 with α = 0.1 and rewards of 1', () => {
    expect(leftAfter(5, 1, 0.1, 1)).toBeCloseTo(4.6)
    expect(leftAfter(5, 1, 0.1, 2)).toBeCloseTo(4.24)
    expect(leftAfter(5, 1, 0.1, 3)).toBeCloseTo(3.916)
    expect(leftAfter(5, 1, 0.1, 10)).toBeCloseTo(2.39, 2)
    expect(leftAfter(5, 1, 0.1, 30)).toBeCloseTo(1.17, 2)
  })

  it('is the same as nudging one reward at a time', () => {
    let score = 5
    for (let k = 1; k <= 12; k++) {
      score = nudge(score, 1, 0.1)
      expect(score).toBeCloseTo(leftAfter(5, 1, 0.1, k))
    }
  })
})

describe('a scoop', () => {
  it('is the flavour’s usual, give or take SCOOP_NOISE', () => {
    const random = seeded(4)
    const scoops = Array.from({ length: 20000 }, () => scoop(random, 6))
    const mean = meanOf(scoops)
    const spread = Math.sqrt(meanOf(scoops.map((s) => (s - mean) ** 2)))
    expect(mean).toBeCloseTo(6, 1)
    expect(spread).toBeCloseTo(SCOOP_NOISE, 1)
  })
})

describe('the shop', () => {
  it('has Pistachio as the best flavour, and every flavour below the imagined 10', () => {
    expect(top(USUALLY)).toBe(BEST_FLAVOUR)
    expect(FLAVOURS[BEST_FLAVOUR]).toBe('Pistachio')
    expect(Math.max(...USUALLY)).toBeLessThan(HOPE)
  })

  it('works through the whole menu first, left to right, never at random', () => {
    const visits = shop(9)
    expect(visits.slice(0, 6).map((v) => v.flavour)).toEqual([0, 1, 2, 3, 4, 5])
    // The first round tastes exactly the usual, in round numbers
    expect(visits.slice(0, 6).map((v) => v.after)).toEqual([8, 8.5, 7.5, 8.25, 9, 7.25])
    // Every visit is the top-rated flavour at the time
    visits.forEach((visit, i) => expect(visit.flavour).toBe(top(ratingsAfter(visits, i))))
  })
})

describe('the story', () => {
  const visits = story()

  it('starts with Vanilla: a 6 brings its 10 down to 8', () => {
    expect(visits[0]).toEqual({ flavour: 0, taste: 6, before: 10, after: 8 })
  })

  it('settles on Pistachio for good from visit 12', () => {
    expect(settledAt(visits)).toBe(12)
    expect(visits.at(-1)!.flavour).toBe(BEST_FLAVOUR)
    expect(scoopsIn(visits, visits.length)).toEqual([2, 2, 1, 2, 32, 1])
  })
})

describe('the testbed', () => {
  it('is the shared testbed, cut to the page’s machines', () => {
    expect(machines(5)).toEqual(testbed(optimist(5), { machines: MACHINES }))
  })

  it('has the optimist worse at first and better later than picking at random', () => {
    const early = (who: 'realist' | number) => meanOf(machines(who).best, 0, 100)
    const late = (who: 'realist' | number) => meanOf(machines(who).best, 900)
    expect(early(5)).toBeLessThan(early('realist') - 0.1)
    expect(late(5)).toBeGreaterThan(late('realist') + 0.05)
    // Starting at 0, never picking at random, it gets stuck
    expect(late(0)).toBeLessThan(0.6)
    // Far too high: it spends longer draining its hopes
    expect(early(20)).toBeLessThan(early(5))
  })
})

describe('the recipe change', () => {
  const before = (shares: number[]) => meanOf(shares, CHANGE_AT - 20, CHANGE_AT)
  const after = (shares: number[]) => meanOf(shares, shares.length - 20)

  it('finds you at the best almost always before it, and almost never after', () => {
    expect(before(crowd('you'))).toBeGreaterThan(0.95)
    expect(after(crowd('you'))).toBeLessThan(0.25)
  })

  it('lets the friend who picks at random catch up', () => {
    expect(after(crowd(0))).toBeGreaterThan(0.6)
    expect(after(crowd(10))).toBeGreaterThan(0.7)
    // Starting at 10 too, she is near you before the change
    expect(before(crowd(10))).toBeGreaterThan(before(crowd(0)) + 0.3)
  })

  it('makes Mint the best: a greedy customer who started on Mint is at the best only after the change', () => {
    expect(MINT).toBe(FLAVOURS.indexOf('Mint'))
    expect(NEW_MINT).toBeGreaterThan(Math.max(...USUALLY))
    // Starting at 0 and never picking at random, a customer stays with the
    // first flavour forever: about 1 in 6 start on Mint
    const stuck = customers({ kind: 'greedy', epsilon: 0, initial: 0, step: SHARE }, { count: 600 })
    expect(meanOf(stuck, 0, CHANGE_AT)).toBeCloseTo(1 / 6, 1)
    expect(meanOf(stuck, CHANGE_AT)).toBeCloseTo(1 / 6, 1)
    expect(stuck[0]).toBeCloseTo(1 / 6, 1)
  })
})

describe('the helpers', () => {
  it('smooth keeps the length and the level', () => {
    expect(smooth([1, 1, 1, 1], 3)).toEqual([1, 1, 1, 1])
    expect(smooth([0, 3, 0], 3)).toEqual([1.5, 1, 1.5])
  })

  it('format a share as a whole percent', () => {
    expect(percent(0.666)).toBe('67%')
  })
})
