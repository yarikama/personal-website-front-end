import { describe, expect, it } from 'vitest'
import { between, seeded } from '../../components/explain/random'
import {
  afterStrides,
  bestRate,
  bestStep,
  bestSteps,
  BOWL_START,
  CHECK_L,
  CHECK_STEPS,
  descend,
  distance,
  distanceAfter,
  factor,
  gapBound,
  largestStep,
  loss2d,
  rate2d,
  settles,
  step1d,
  stepsByFormula,
  stepsByWalking,
  STRIDE_SIZES,
  TOLERANCE,
  valleyWalk,
  walk1d,
} from './model'

describe('one step on a bowl', () => {
  it('moves against the slope by the step size times the slope', () => {
    // Slope of w² at 10 is 20: a step of 0.1 moves 2
    expect(step1d(10, 0.1, 2)).toBeCloseTo(8, 12)
    expect(step1d(-3, 0.25, 4)).toBeCloseTo(0, 12)
  })

  it('multiplies the distance to the bottom by 1 − ηL', () => {
    const random = seeded(1)
    for (let i = 0; i < 500; i++) {
      const w = between(random, -50, 50)
      const L = between(random, 0.1, 20)
      const eta = between(random, 0, 3 / L)
      expect(step1d(w, eta, L)).toBeCloseTo(factor(eta, L) * w, 9)
    }
  })
})

describe('when the walk settles', () => {
  it('settles if and only if the step is under 2/L', () => {
    const random = seeded(2)
    for (let i = 0; i < 1000; i++) {
      const L = between(random, 0.1, 50)
      const eta = between(random, 0.001, 4) / L
      // Keep away from the edge itself, where the walk bounces forever
      if (Math.abs(eta * L - 2) < 1e-3) continue
      const start = between(random, 1, 100)
      const end = Math.abs(walk1d(start, eta, L, 50).at(-1)!)
      expect(settles(eta, L)).toBe(eta < largestStep(L))
      if (eta < largestStep(L)) expect(end).toBeLessThan(start)
      else expect(end).toBeGreaterThan(start)
    }
  })

  it('bounces forever at exactly 2/L', () => {
    const walk = walk1d(5, 1, 2, 9)
    expect(walk.map(Math.abs)).toEqual(Array(10).fill(5))
    expect(settles(1, 2)).toBe(false)
  })

  it('lands in one step at 1/L', () => {
    expect(step1d(7, 1 / 3, 3)).toBeCloseTo(0, 12)
  })
})

describe('how many steps it takes', () => {
  it('matches the geometric formula |1 − ηL|^k × start', () => {
    const random = seeded(3)
    let compared = 0
    for (let i = 0; i < 1000; i++) {
      const L = between(random, 0.5, 30)
      const eta = between(random, 0.01, 1.99) / L
      const start = between(random, 1, 100)
      const tolerance = 10 ** -between(random, 1, 6)
      // Skip counts that sit on a whole number, where rounding decides
      const exact = Math.log(tolerance / start) / Math.log(Math.abs(factor(eta, L)))
      if (Math.abs(exact - Math.round(exact)) < 1e-6) continue
      expect(stepsByWalking(start, eta, L, tolerance)).toBe(stepsByFormula(start, eta, L, tolerance))
      compared++
    }
    expect(compared).toBeGreaterThan(990)
  })

  it('never arrives when the step is 2/L or more', () => {
    expect(stepsByFormula(10, 1.1, 2, 0.01)).toBeNull()
    expect(stepsByWalking(10, 1.1, 2, 0.01, 500)).toBeNull()
  })
})

describe('the numbers the page states', () => {
  it('walks the valley from 10 as the guess and story say', () => {
    expect(STRIDE_SIZES.map((eta) => factor(eta, 2))).toEqual([0.8, 0, expect.closeTo(-0.8, 12), expect.closeTo(-1.2, 12)])
    expect(afterStrides(0.1)).toBeCloseTo(10 * 0.8 ** 10, 9)
    expect(afterStrides(0.1).toFixed(2)).toBe('1.07')
    expect(afterStrides(0.5)).toBe(0)
    expect(valleyWalk(0.5)[1]).toBe(0)
    expect(afterStrides(0.9).toFixed(2)).toBe('1.07')
    expect(afterStrides(1.1).toFixed(0)).toBe('62')
  })

  it('has the bouncing walk cross the bottom every stride', () => {
    const walk = valleyWalk(0.9)
    for (let k = 1; k < walk.length; k++) expect(Math.sign(walk[k])).toBe(-Math.sign(walk[k - 1]))
  })

  it('has one right answer to Check yourself: just under 2/40 = 0.05', () => {
    expect(largestStep(CHECK_L)).toBeCloseTo(0.05, 12)
    expect(CHECK_STEPS.filter((eta) => settles(eta, CHECK_L))).toEqual([0.01, 0.04])
    expect(factor(0.04, CHECK_L)).toBeCloseTo(-0.6, 12)
    expect(factor(0.06, CHECK_L)).toBeCloseTo(-1.4, 12)
    expect(factor(0.01, CHECK_L)).toBeCloseTo(0.6, 12)
  })

  it('counts the worked bowls: 1, 34 and 339 steps at the best step', () => {
    expect(distance(BOWL_START)).toBeCloseTo(8.732, 3)
    expect([1, 10, 100].map((kappa) => bestSteps(kappa))).toEqual([1, 34, 339])
    expect([1, 10, 100].map((kappa) => descend(bestStep(kappa), kappa).steps)).toEqual([1, 34, 339])
    expect(bestRate(10)).toBeCloseTo(9 / 11, 12)
    expect(bestRate(100)).toBeCloseTo(99 / 101, 12)
  })

  it('makes ten times closer cost ten times the steps under the 1/t bound', () => {
    expect(gapBound(2, 10, 10) / gapBound(2, 10, 100)).toBeCloseTo(10, 12)
  })
})

describe('the stretched bowl', () => {
  it('walks the same path the per-axis formula predicts', () => {
    const random = seeded(4)
    for (let i = 0; i < 300; i++) {
      const kappa = between(random, 1, 50)
      const eta = between(random, 0.01, 1.99) / kappa
      const { path } = descend(eta, kappa)
      for (const k of [0, 1, 2, 5, Math.min(20, path.length - 1)]) {
        expect(distance(path[k])).toBeCloseTo(distanceAfter(k, eta, kappa), 8)
      }
    }
  })

  it('settles if and only if the step is under 2/κ, the steep direction’s limit', () => {
    const random = seeded(5)
    for (let i = 0; i < 400; i++) {
      const kappa = between(random, 1.5, 50)
      const eta = between(random, 0.05, 3) / kappa
      if (Math.abs(eta * kappa - 2) < 0.02) continue
      const { outcome } = descend(eta, kappa)
      if (eta < 2 / kappa) expect(outcome).not.toBe('diverges')
      else expect(outcome).toBe('diverges')
    }
  })

  it('needs no fewer steps than at the best step, which follows the closed-form rate', () => {
    const random = seeded(6)
    for (let i = 0; i < 200; i++) {
      const kappa = between(random, 1.5, 40)
      const best = descend(bestStep(kappa), kappa).steps!
      expect(best).toBe(bestSteps(kappa))
      const eta = between(random, 0.05, 1.95) / kappa
      const other = descend(eta, kappa).steps ?? Infinity
      // The bound is on the worse axis; the start's split between the axes
      // can let another step finish a step or two sooner
      expect(other).toBeGreaterThanOrEqual(best - 2)
      expect(rate2d(eta, kappa)).toBeGreaterThanOrEqual(bestRate(kappa) - 1e-12)
    }
  })

  it('takes about κ/2 × log(start/tolerance) steps at best: slow when stretched', () => {
    for (const kappa of [5, 20, 50]) {
      const steps = bestSteps(kappa)
      expect(steps).toBeLessThanOrEqual(Math.ceil(((kappa + 1) / 2) * Math.log(distance(BOWL_START) / TOLERANCE)))
      expect(steps).toBeGreaterThanOrEqual(Math.floor(((kappa - 1) / 2) * Math.log(distance(BOWL_START) / TOLERANCE)))
    }
  })

  it('goes down the bowl when the step is under 1/κ', () => {
    const random = seeded(7)
    for (let i = 0; i < 200; i++) {
      const kappa = between(random, 1, 50)
      const eta = between(random, 0.01, 1) / kappa
      const { path } = descend(eta, kappa)
      for (let k = 1; k < path.length; k++) expect(loss2d(path[k], kappa)).toBeLessThanOrEqual(loss2d(path[k - 1], kappa))
    }
  })
})

// The 1/t guarantee holds for any smooth convex loss, not only bowls. Check
// it on the logistic loss of a few seeded one-weight examples:
// f(w) = mean of log(1 + e^(−y·a·w)), whose slope changes by at most
// mean(a²)/4 per unit
describe('a smooth convex loss that is not a bowl', () => {
  const random = seeded(8)
  const data = Array.from({ length: 40 }, () => {
    const a = between(random, -2, 2)
    // Labels that mostly but not always agree with a: a finite best weight
    const y = random() < 0.8 ? Math.sign(a) || 1 : -(Math.sign(a) || 1)
    return { a, y }
  })
  const f = (w: number) => data.reduce((s, { a, y }) => s + Math.log1p(Math.exp(-y * a * w)), 0) / data.length
  const slope = (w: number) => data.reduce((s, { a, y }) => s - (y * a) / (1 + Math.exp(y * a * w)), 0) / data.length
  const L = data.reduce((s, { a }) => s + a * a, 0) / data.length / 4

  // The best weight: where the slope is zero, by halving
  let low = -50
  let high = 50
  for (let i = 0; i < 200; i++) {
    const mid = (low + high) / 2
    if (slope(mid) > 0) high = mid
    else low = mid
  }
  const best = (low + high) / 2

  it('has a best weight inside the search range', () => {
    expect(Math.abs(best)).toBeLessThan(40)
    expect(Math.abs(slope(best))).toBeLessThan(1e-9)
  })

  it('stays within L·d²/(2t) of the best loss with step 1/L, and never goes up', () => {
    const start = best + 15
    let w = start
    let previous = f(w)
    for (let t = 1; t <= 500; t++) {
      w -= slope(w) / L
      expect(f(w)).toBeLessThanOrEqual(previous + 1e-12)
      expect(f(w) - f(best)).toBeLessThanOrEqual(gapBound(L, start - best, t) + 1e-12)
      previous = f(w)
    }
  })
})
