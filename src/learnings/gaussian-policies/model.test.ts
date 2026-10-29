import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  density,
  DISHES,
  expectedTaste,
  kitchen,
  learnFrom,
  push,
  recentRating,
  sample,
  SCRIPT,
  slopes,
  SOUP,
  START,
  story,
  STORY_EVENINGS,
  taste,
  worked,
  type Habit,
} from './model'

describe('the soup', () => {
  it('rates 10 at the best amount and a bland 2 beyond the width', () => {
    expect(taste(5)).toBe(10)
    expect(taste(2)).toBe(2)
    expect(taste(8)).toBe(2)
  })

  it('falls off as worked by hand: 2 + 8 × (1 − (2.1/2.5)²) at 2.9 pinches', () => {
    expect(taste(2.9)).toBeCloseTo(2 + 8 * (1 - 0.7056), 12)
    expect(taste(2.9)).toBeCloseTo(4.3552, 12)
    expect(taste(6.25)).toBeCloseTo(2 + 8 * 0.75, 12)
  })
})

describe('the habit', () => {
  it('has the bell curve’s height: 1/(σ√2π) at the centre, e^−½ of that one spread out', () => {
    const habit = { centre: 4, spread: 0.5 }
    expect(density(4, habit)).toBeCloseTo(1 / (0.5 * Math.sqrt(2 * Math.PI)), 12)
    expect(density(4.5, habit) / density(4, habit)).toBeCloseTo(Math.exp(-0.5), 12)
  })

  it('is a distribution: its area is 1', () => {
    const habit = { centre: 3, spread: 0.7 }
    let area = 0
    for (let p = -5; p <= 11; p += 0.001) area += density(p, habit) * 0.001
    expect(area).toBeCloseTo(1, 4)
  })

  it('draws amounts with the centre as their average and the spread as their spread', () => {
    const random = seeded(1)
    const habit = { centre: 2, spread: 0.5 }
    const draws = Array.from({ length: 20000 }, () => sample(habit, random))
    const mean = draws.reduce((s, d) => s + d, 0) / draws.length
    const sd = Math.sqrt(draws.reduce((s, d) => s + (d - mean) ** 2, 0) / draws.length)
    expect(mean).toBeCloseTo(2, 1)
    expect(sd).toBeCloseTo(0.5, 1)
    // About 68% within one spread
    expect(draws.filter((d) => Math.abs(d - 2) < 0.5).length / draws.length).toBeCloseTo(0.683, 1)
  })
})

describe('the push', () => {
  it('is the slope of log π along the centre and along the log of the spread', () => {
    const habit = { centre: 3, spread: 0.8 }
    const logPi = (centre: number, rho: number, a: number) => Math.log(density(a, { centre, spread: Math.exp(rho) }))
    const h = 1e-6
    for (const a of [1.5, 2.9, 3.4, 5]) {
      const rho = Math.log(habit.spread)
      const dCentre = (logPi(3 + h, rho, a) - logPi(3 - h, rho, a)) / (2 * h)
      const dRho = (logPi(3, rho + h, a) - logPi(3, rho - h, a)) / (2 * h)
      expect(slopes(a, habit).centre).toBeCloseTo(dCentre, 6)
      expect(slopes(a, habit).logSpread).toBeCloseTo(dRho, 6)
    }
  })

  it('gives the worked numbers: habit 4 ± 1, usual 6', () => {
    const [close, far, farWorse] = worked()
    // 4.5 rated 8: 2 × 0.5 = +1, 2 × (0.25 − 1) = −1.5
    expect(close.centre).toBeCloseTo(1, 12)
    expect(close.logSpread).toBeCloseTo(-1.5, 12)
    // 6 rated 8: 2 × 2 = +4, 2 × (4 − 1) = +6
    expect(far.centre).toBeCloseTo(4, 12)
    expect(far.logSpread).toBeCloseTo(6, 12)
    // 6 rated 4: both turned around
    expect(farWorse.centre).toBeCloseTo(-4, 12)
    expect(farWorse.logSpread).toBeCloseTo(-6, 12)
  })

  it('answers the quick check: close in and worse moves the centre away and widens the spread', () => {
    const p = push(4.9, -1, { centre: 5, spread: 0.5 })
    expect(p.centre).toBeGreaterThan(0)
    expect(p.logSpread).toBeGreaterThan(0)
  })

  it('keeps the spread above zero however hard it is pushed in', () => {
    const habit = learnFrom({ centre: 5, spread: 0.2 }, 5, 50, 1)
    expect(habit.spread).toBeGreaterThan(0)
    expect(habit.spread).toBeLessThan(1e-10)
  })

  it('points uphill on average: its mean is the slope of the rating you can expect', () => {
    // Far below the best, the spread should widen; near it, narrow
    for (const [habit, widen] of [
      [{ centre: 2, spread: 0.5 }, true],
      [{ centre: 4.8, spread: 0.5 }, false],
    ] as [Habit, boolean][]) {
      const h = 1e-4
      const slopeCentre = (expectedTaste({ ...habit, centre: habit.centre + h }) - expectedTaste({ ...habit, centre: habit.centre - h })) / (2 * h)
      const slopeRho =
        (expectedTaste({ ...habit, spread: habit.spread * Math.exp(h) }) - expectedTaste({ ...habit, spread: habit.spread * Math.exp(-h) })) / (2 * h)
      const usual = expectedTaste(habit)
      const random = seeded(4)
      const n = 200000
      let centre = 0
      let rho = 0
      for (let i = 0; i < n; i++) {
        const a = sample(habit, random)
        const p = push(a, taste(a, SOUP) - usual, habit)
        centre += p.centre / n
        rho += p.logSpread / n
      }
      expect(centre).toBeCloseTo(slopeCentre, 1)
      expect(rho).toBeCloseTo(slopeRho, 1)
      expect(slopeRho > 0).toBe(widen)
    }
  })
})

describe('the story', () => {
  const evenings = story()
  const [first, second, third] = evenings

  it('tells its first evenings exactly as scripted', () => {
    expect(evenings.slice(0, SCRIPT.length).map((e) => e.pinches)).toEqual(SCRIPT)
    expect(first.rating).toBe(2)
    expect(first.usual).toBe(2)
    expect(first.after).toEqual(START)
  })

  it('moves toward a far-out try that paid, and widens', () => {
    expect(second.surprise).toBeGreaterThan(0)
    expect(second.after.centre).toBeGreaterThan(START.centre)
    expect(second.after.spread).toBeGreaterThan(START.spread)
    expect(second.after.centre.toFixed(2)).toBe('2.27')
    expect(second.after.spread.toFixed(2)).toBe('0.59')
  })

  it('steps away from a far-out try that let you down, and narrows', () => {
    expect(third.surprise).toBeLessThan(0)
    expect(third.pinches).toBeLessThan(third.before.centre - third.before.spread)
    expect(third.after.centre).toBeGreaterThan(third.before.centre)
    expect(third.after.spread).toBeLessThan(third.before.spread)
  })

  it('widens first, then narrows, and finds the best amount', () => {
    const spreads = evenings.map((e) => e.after.spread)
    const widest = Math.max(...spreads)
    const at = spreads.indexOf(widest)
    expect(evenings).toHaveLength(STORY_EVENINGS)
    expect(widest).toBeGreaterThan(2 * START.spread)
    expect(at).toBeLessThan(40)
    const last = evenings.at(-1)!.after
    expect(Math.abs(last.centre - SOUP.best)).toBeLessThan(0.2)
    expect(last.spread).toBeLessThan(START.spread / 2)
    const recent = evenings.slice(-30).reduce((s, e) => s + e.rating, 0) / 30
    expect(recent).toBeGreaterThan(9.5)
  })
})

describe('the kitchen', () => {
  it('learns a tight spread for the mug and a looser one for the pot', () => {
    const run = kitchen('Learned')
    const { mug, pot } = run.at(-1)!.habits
    expect(Math.abs(mug.centre - DISHES.mug.best)).toBeLessThan(0.2)
    expect(Math.abs(pot.centre - DISHES.pot.best)).toBeLessThan(0.3)
    expect(pot.spread).toBeGreaterThan(3 * mug.spread)
    expect(recentRating(run, 'mug')).toBeGreaterThan(9)
    expect(recentRating(run, 'pot')).toBeGreaterThan(9)
  })

  it('does worse with the spread kept wide, and never finds the mug with it kept narrow', () => {
    const learned = recentRating(kitchen('Learned'), 'mug')
    const wide = kitchen('Kept wide')
    const narrow = kitchen('Kept narrow')
    expect(wide.at(-1)!.habits.mug.spread).toBe(1)
    expect(recentRating(wide, 'mug')).toBeLessThan(learned - 3)
    expect(recentRating(narrow, 'mug')).toBeLessThan(2.5)
  })

  it('learns in most kitchens, not only the one shown', () => {
    const found = [1, 2, 3, 4, 5, 6, 7, 8].filter((seed) => recentRating(kitchen('Learned', seed), 'mug') > 8.5).length
    expect(found).toBeGreaterThanOrEqual(7)
  })
})
