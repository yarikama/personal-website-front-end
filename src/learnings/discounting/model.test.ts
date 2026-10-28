import { describe, expect, it } from 'vitest'
import { discounted, fall, forever, halfWithin, LONG, pile, route, SHORT, show, weight } from './model'

describe('the return', () => {
  it('counts a reward k steps off at γ^k', () => {
    expect(weight(0.9, 0)).toBe(1)
    expect(weight(0.9, 2)).toBeCloseTo(0.81)
  })

  it('piles a reward of 1 a step up to 1 / (1 − γ), and without end at γ = 1', () => {
    expect(pile(0.9, 1)).toBeCloseTo(1)
    expect(pile(0.9, 3)).toBeCloseTo(2.71)
    expect(pile(0.9, 1000)).toBeCloseTo(10)
    expect(pile(1, 40)).toBe(40)
    expect(forever(0.9)).toBeCloseTo(10)
    expect(forever(0.5)).toBeCloseTo(2)
    expect(forever(0.99)).toBeCloseTo(100)
  })

  it('agrees with the discounted sum, and folds into itself: G = R + γG′', () => {
    const rewards = [3, -1, 0, 2, 5]
    expect(discounted(rewards, 0.9)).toBeCloseTo(3 + 0.9 * discounted(rewards.slice(1), 0.9))
    expect(discounted(Array(40).fill(1), 0.9)).toBeCloseTo(pile(0.9, 40))
  })

  it('brings half of the worth within 7 steps at 0.9, as the story says', () => {
    expect(halfWithin(0.9)).toBe(7)
    expect(pile(0.9, 7)).toBeGreaterThanOrEqual(5)
    expect(pile(0.9, 6)).toBeLessThan(5)
    expect(halfWithin(0.5)).toBe(1)
    expect(halfWithin(0.99)).toBe(69)
    expect(halfWithin(0)).toBe(1)
  })
})

describe('episodes', () => {
  it('makes both ways out worth 1 with no discount, and the short one worth more with one', () => {
    expect(discounted(route(SHORT), 1)).toBe(1)
    expect(discounted(route(LONG), 1)).toBe(1)
    expect(discounted(route(SHORT), 0.9)).toBeCloseTo(0.9 ** 5)
    expect(discounted(route(SHORT), 0.9)).toBeGreaterThan(discounted(route(LONG), 0.9))
  })

  it('adds nothing after the end: zeros for ever leave the sum alone', () => {
    const ended = [...route(SHORT), ...Array(100).fill(0)]
    expect(discounted(ended, 0.9)).toBeCloseTo(discounted(route(SHORT), 0.9))
  })

  it('makes a later fall cost less: 0.39 after 10 steps, 0.05 after 30', () => {
    expect(show(-fall(10, 0.9))).toBe('0.39')
    expect(show(-fall(30, 0.9))).toBe('0.05')
    expect(fall(30, 0.9)).toBeGreaterThan(fall(10, 0.9))
  })

  it('writes numbers the page’s way', () => {
    expect(show(10)).toBe('10')
    expect(show(Infinity)).toBe('∞')
    expect(show(-0.387)).toBe('−0.39')
  })
})
