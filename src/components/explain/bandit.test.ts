import { describe, expect, it } from 'vitest'
import { argmax, learner, meanOf, softmax, testbed } from './bandit'
import { seeded } from './random'

// Fewer machines than the book's 2000, to keep the tests quick
const quick = { machines: 400 }

describe('the bandit testbed', () => {
  it('breaks ties at random, and only among the best', () => {
    const random = seeded(1)
    const picks = Array.from({ length: 400 }, () => argmax([1, 3, 0, 3], random))
    expect(new Set(picks)).toEqual(new Set([1, 3]))
    expect(picks.filter((p) => p === 1).length).toBeGreaterThan(150)
  })

  it('keeps the plain average with step 1/n, and leans on recent rewards with a constant step', () => {
    const plain = learner({ kind: 'greedy' }, 1, seeded(1))
    const recent = learner({ kind: 'greedy', step: 0.5 }, 1, seeded(1))
    for (const reward of [2, 4, 9]) {
      plain.learn(0, reward)
      recent.learn(0, reward)
    }
    expect(plain.scores()[0]).toBeCloseTo(5)
    // 0 → 1 → 2.5 → 5.75
    expect(recent.scores()[0]).toBeCloseTo(5.75)
  })

  it('turns preferences into chances that ignore a shift', () => {
    const chances = softmax([1, 2, 3])
    expect(chances.reduce((a, b) => a + b)).toBeCloseTo(1)
    expect(softmax([1001, 1002, 1003])).toEqual(chances.map((c) => expect.closeTo(c, 10)))
  })

  it('shows greedy stuck and a little exploring winning, as in the book', () => {
    const greedy = testbed({ kind: 'greedy', epsilon: 0 }, quick)
    const some = testbed({ kind: 'greedy', epsilon: 0.1 }, quick)
    // Greedy finds the best arm on about a third of machines and earns about 1
    expect(meanOf(greedy.best, 900)).toBeGreaterThan(0.25)
    expect(meanOf(greedy.best, 900)).toBeLessThan(0.45)
    expect(meanOf(greedy.reward, 900)).toBeCloseTo(1.05, 0)
    // ε = 0.1 pulls the best arm far more often, but never above about 91%
    expect(meanOf(some.best, 900)).toBeGreaterThan(0.75)
    expect(meanOf(some.best, 900)).toBeLessThan(0.92)
  })

  it('shows optimism exploring without any random picks', () => {
    const optimist = testbed({ kind: 'greedy', initial: 5, step: 0.1 }, quick)
    const realist = testbed({ kind: 'greedy', epsilon: 0.1, step: 0.1 }, quick)
    // Worse at first, better later
    expect(meanOf(optimist.best.slice(0, 10))).toBeLessThan(meanOf(realist.best.slice(0, 10)))
    expect(meanOf(optimist.best, 800)).toBeGreaterThan(meanOf(realist.best, 800))
  })

  it('shows UCB earning more than ε-greedy', () => {
    const ucb = testbed({ kind: 'ucb', c: 2 }, quick)
    const some = testbed({ kind: 'greedy', epsilon: 0.1 }, quick)
    expect(meanOf(ucb.reward, 100)).toBeGreaterThan(meanOf(some.reward, 100))
    // Each arm once first, in order
    expect(ucb.best[0]).toBeLessThan(0.2)
  })

  it('shows the gradient bandit needs its baseline when rewards sit far from 0', () => {
    const shifted = { ...quick, centre: 4 }
    const withBaseline = testbed({ kind: 'gradient', alpha: 0.1 }, shifted)
    const without = testbed({ kind: 'gradient', alpha: 0.1, baseline: false }, shifted)
    expect(meanOf(withBaseline.best, 800)).toBeGreaterThan(0.7)
    expect(meanOf(without.best, 800)).toBeLessThan(meanOf(withBaseline.best, 800) - 0.2)
  })

  it('shows the plain average falling behind a changing world', () => {
    const changing = { machines: 200, steps: 5000, drift: 0.01 }
    const plain = testbed({ kind: 'greedy', epsilon: 0.1 }, changing)
    const recent = testbed({ kind: 'greedy', epsilon: 0.1, step: 0.1 }, changing)
    expect(meanOf(recent.best, 4000)).toBeGreaterThan(meanOf(plain.best, 4000) + 0.1)
  })

  it('compares methods on the same machines', () => {
    const a = testbed({ kind: 'greedy', epsilon: 0 }, { machines: 5, steps: 5 })
    const b = testbed({ kind: 'greedy', epsilon: 0 }, { machines: 5, steps: 5 })
    expect(a).toEqual(b)
  })
})
