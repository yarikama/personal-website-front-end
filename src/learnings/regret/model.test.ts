import { describe, expect, it } from 'vitest'
import {
  averageReward,
  BEST,
  cart,
  DAYS,
  GAPS,
  METHODS,
  played,
  plateau,
  randomCost,
  regret,
  slope,
  story,
  TAKINGS,
  YEAR,
} from './model'

describe('regret, by hand', () => {
  it('is the gap times the pulls of each worse arm', () => {
    expect(GAPS).toEqual([0, 60, 180])
    expect(regret(TAKINGS, [10, 2, 3])).toBe(60 * 2 + 180 * 3)
    expect(averageReward(BEST, 660, 15)).toBe(256)
  })

  it('leaves ε-greedy short of the best arm by ε of the average gap', () => {
    expect(plateau([1, 0], 0.1)).toBeCloseTo(0.95, 12)
    expect(randomCost()).toBeCloseTo(8, 12)
    expect(BEST - plateau(TAKINGS, 0.1)).toBeCloseTo(randomCost(), 12)
  })
})

describe('the cart', () => {
  const { you, friend } = story()

  it('keeps its regret as gap × days, summed', () => {
    for (const run of [you, friend]) {
      const end = run[DAYS - 1]
      expect(end.regret).toBe(regret(TAKINGS, end.visits))
    }
  })

  it('tells the narration’s numbers: yours a straight line near $8 a day, hers flattening', () => {
    expect(slope(you, YEAR, DAYS)).toBeGreaterThan(7)
    expect(slope(you, YEAR, DAYS)).toBeLessThan(10)
    const end = you[DAYS - 1]
    end.averages.forEach((average, c) => expect(Math.abs(average - TAKINGS[c])).toBeLessThan(30))
    expect(friend[DAYS - 1].regret).toBeLessThan(end.regret / 5)
    // Her second and third years add less than her first
    expect(friend[DAYS - 1].regret - friend[YEAR - 1].regret).toBeLessThan(friend[YEAR - 1].regret)
  })

  it('costs, on average over many carts, ε of the average gap a day once it knows the corners', () => {
    const carts = 300
    let total = 0
    for (let seed = 0; seed < carts; seed++) total += slope(cart('random', 5000 + seed), YEAR, DAYS)
    expect(total / carts).toBeGreaterThan(randomCost() - 0.6)
    expect(total / carts).toBeLessThan(randomCost() + 0.6)
  })
})

describe('the testbed', () => {
  const later = (index: number, start: 0 | -5) => {
    const { regret } = played(index, start)
    return { first: regret[999], second: regret[1999] - regret[999] }
  }

  it('gives a fixed ε linear regret, and fading ε and UCB sublinear', () => {
    const fixed = later(1, 0)
    expect(fixed.second).toBeGreaterThan(0.6 * fixed.first)
    for (const index of [2, 3]) {
      const { first, second } = later(index, 0)
      expect(second).toBeLessThan(0.35 * first)
    }
  })

  it('traps greedy for good with a gloomy start, and leaves UCB untouched', () => {
    const stuck = later(0, -5)
    expect(stuck.second).toBeGreaterThan(0.9 * stuck.first)
    expect(played(0, -5).regret[1999]).toBeGreaterThan(2 * played(0, 0).regret[1999])
    expect(played(3, -5).regret).toEqual(played(3, 0).regret)
    expect(METHODS[3].name).toBe('UCB')
  })

  it("brings UCB's average reward closest to the best arm's", () => {
    const runs = METHODS.map((_, i) => played(i, 0))
    const averages = runs.map((run) => averageReward(run.best, run.regret[1999], 2000))
    expect(Math.max(...averages)).toBe(averages[3])
    expect(averages[1]).toBeLessThan(plateau([runs[1].best, runs[1].mean], 0.1) + 0.05)
  })
})
