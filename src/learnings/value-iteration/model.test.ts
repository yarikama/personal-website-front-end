import { describe, expect, it } from 'vitest'
import { solve, SPOTS, state } from '../policy-evaluation/board'
import { best } from '../policy-iteration/model'
import {
  EVERY_MOVE,
  FINAL,
  generalizedCost,
  judgingCost,
  options,
  PASSES,
  PLANS,
  policyIterationCost,
  settledAt,
  THETA,
  valueIterationCost,
  wrongAt,
} from './model'

describe('value iteration', () => {
  it('stops after 19 sweeps on the best play policy iteration found', () => {
    expect(PASSES.length - 1).toBe(19)
    expect(PASSES.at(-1)!.delta).toBeLessThan(THETA)
    expect(FINAL).toEqual(best())
    for (const sq of SPOTS) expect(PASSES.at(-1)!.values[state(sq)]).toBeCloseTo(solve('best')[state(sq)], 2)
  })

  it('has every move right from sweep 10, while the values move on', () => {
    expect(settledAt()).toBe(10)
    expect(wrongAt(9)).toBeGreaterThan(0)
    expect(wrongAt(10)).toBe(0)
    expect(PLANS.slice(10).every((plan) => plan.join() === FINAL.join())).toBe(true)
    expect(PASSES[10].delta).toBeGreaterThan(0.1)
  })

  it("holds values above the best play's while still on their way (the quick check)", () => {
    const exact = solve('best')
    for (const sq of SPOTS) expect(PASSES[10].values[state(sq)]).toBeGreaterThanOrEqual(exact[state(sq)] - 1e-12)
    expect(PASSES[10].values[state(1)]).toBeGreaterThan(exact[state(1)] + 0.1)
  })

  it('takes the better move on square 7: −1 plus the ladder top for a step', () => {
    const [roll, step] = options(PASSES.length - 1, 7)
    expect(step).toBeCloseTo(-1 + PASSES.at(-1)!.values[state(16)], 12)
    expect(roll).toBeCloseTo(-6.71, 2)
    expect(step).toBeCloseTo(-5.6, 2)
    expect(PASSES.at(-1)!.values[state(7)]).toBeCloseTo(Math.max(roll, step), 2)
  })

  it('counts landings: 23 squares × 7 a sweep, and judging a few sweeps between improvements is cheapest here', () => {
    expect(EVERY_MOVE).toBe(161)
    expect(judgingCost(PLANS[0])).toBe(23 * 6)
    const vi = valueIterationCost()
    const pi = policyIterationCost()
    const few = generalizedCost(3)
    expect(vi.landings).toBe(19 * 161)
    expect(pi.sweeps).toBe(80)
    expect(few.landings).toBeLessThan(vi.landings)
    expect(vi.landings).toBeLessThan(pi.landings)
  })
})
