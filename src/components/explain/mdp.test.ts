import { describe, expect, it } from 'vitest'
import {
  A,
  A_,
  actionValues,
  always,
  B,
  B_,
  board,
  discounted,
  evaluate,
  forever,
  greedy,
  greedyPolicy,
  gridworld,
  optimal,
  rows,
  run,
  sweeps,
  uniform,
  type Mdp,
} from './mdp'
import { seeded } from './random'

const round = (table: number[][]) => table.map((row) => row.map((value) => Math.round(value * 10) / 10))

describe('the board the value pages share', () => {
  const world = board()

  it('gives the book’s values for wandering at random, γ = 0.9 (Figure 3.2)', () => {
    const values = evaluate(world, uniform(world), 0.9)
    expect(round(rows(world, values))).toEqual([
      [3.3, 8.8, 4.4, 5.3, 1.5],
      [1.5, 3.0, 2.3, 1.9, 0.5],
      [0.1, 0.7, 0.7, 0.4, -0.4],
      [-1.0, -0.4, -0.4, -0.6, -1.2],
      [-1.9, -1.3, -1.2, -1.4, -2.0],
    ])
  })

  it('gives the book’s values for the best play, γ = 0.9 (Figure 3.5)', () => {
    const values = optimal(world, 0.9)
    expect(round(rows(world, values))).toEqual([
      [22.0, 24.4, 22.0, 19.4, 17.5],
      [19.8, 22.0, 19.8, 17.8, 16.0],
      [17.8, 19.8, 17.8, 16.0, 14.4],
      [16.0, 17.8, 16.0, 14.4, 13.0],
      [14.4, 16.0, 14.4, 13.0, 11.7],
    ])
  })

  it('values A at its 10 plus 0.9 of A′, and B at its 5 plus 0.9 of B′', () => {
    const values = evaluate(world, uniform(world), 0.9)
    expect(values[world.at(A)]).toBeCloseTo(10 + 0.9 * values[world.at(A_)])
    expect(values[world.at(B)]).toBeCloseTo(5 + 0.9 * values[world.at(B_)])
    // A is worth less than its 10, B more than its 5
    expect(values[world.at(A)]).toBeLessThan(10)
    expect(values[world.at(B)]).toBeGreaterThan(5)
  })

  it('values A at 10 every five moves when playing well: 10 / (1 − 0.9⁵)', () => {
    const values = optimal(world, 0.9)
    expect(values[world.at(A)]).toBeCloseTo(10 / (1 - 0.9 ** 5))
  })

  it('makes acting greedily on v* as good as v* says', () => {
    const best = optimal(world, 0.9)
    const values = evaluate(world, greedyPolicy(world, best, 0.9), 0.9)
    values.forEach((value, s) => expect(value).toBeCloseTo(best[s]))
  })

  it('shows every optimal move from the bottom-left corner going up or right', () => {
    const best = greedy(world, optimal(world, 0.9), 0.9)
    // North and east tie there (Figure 3.5)
    expect(best[world.at({ x: 0, y: 4 })]).toEqual([0, 1])
  })

  it('settles in passes, each one closer', () => {
    const passes = sweeps(world, 0.9, uniform(world))
    expect(passes[0].every((v) => v === 0)).toBe(true)
    expect(passes.length).toBeGreaterThan(50)
    const gap = (i: number) => Math.max(...passes[i].map((v, s) => Math.abs(v - passes.at(-1)![s])))
    expect(gap(10)).toBeLessThan(gap(5))
    expect(gap(40)).toBeLessThan(0.1)
  })
})

describe('returns', () => {
  it('discounts each reward one step later by γ', () => {
    expect(discounted([1, 1, 1], 0.5)).toBeCloseTo(1.75)
    expect(discounted([0, 0, 10], 0.9)).toBeCloseTo(8.1)
    expect(discounted([3, 2], 1)).toBe(5)
  })

  it('makes 1 every step forever worth 1 / (1 − γ)', () => {
    expect(forever(0.9)).toBeCloseTo(10)
    expect(discounted(Array(500).fill(1), 0.9)).toBeCloseTo(forever(0.9))
    expect(forever(1)).toBe(Infinity)
  })
})

describe('gridworlds', () => {
  it('ends an episode on stepping onto an end, and pays its reward', () => {
    const world = gridworld({ width: 3, height: 1, ends: [{ at: { x: 2, y: 0 }, reward: 10 }], bump: 0 })
    const values = optimal(world, 0.9)
    expect(values[2]).toBe(0)
    expect(values[1]).toBeCloseTo(10)
    expect(values[0]).toBeCloseTo(9)
  })

  it('pays a bonus each time it is stepped onto', () => {
    const world = gridworld({ width: 2, height: 1, bonuses: [{ at: { x: 1, y: 0 }, reward: 1 }], bump: 0 })
    // Back and forth: 1 every other step
    const values = optimal(world, 0.9)
    expect(values[0]).toBeCloseTo(1 / (1 - 0.81))
  })

  it('keeps walls out', () => {
    const world = gridworld({ width: 3, height: 1, walls: [{ x: 1, y: 0 }], bump: -1 })
    expect(world.moves[0][1]).toEqual([{ next: 0, reward: -1, chance: 1 }])
  })

  it('runs a policy until the end', () => {
    const world = gridworld({ width: 4, height: 1, ends: [{ at: { x: 3, y: 0 }, reward: 1 }], bump: 0 })
    const east = always(world, () => 1)
    const visits = run(world, east, 0, 100, seeded(1))
    expect(visits.map((v) => v.next)).toEqual([1, 2, 3])
    expect(visits.at(-1)!.reward).toBe(1)
  })
})

describe('a world with chance', () => {
  // The book's recycling robot (Example 3.3), with numbers of our own:
  // states high and low battery; search, wait, or (when low) recharge
  const alpha = 0.8
  const beta = 0.4
  const search = 2
  const wait = 1
  const gamma = 0.9
  const robot: Mdp = {
    names: ['high', 'low'],
    moves: [
      [
        [
          { next: 0, reward: search, chance: alpha },
          { next: 1, reward: search, chance: 1 - alpha },
        ],
        [{ next: 0, reward: wait, chance: 1 }],
      ],
      [
        [
          { next: 1, reward: search, chance: beta },
          { next: 0, reward: -3, chance: 1 - beta },
        ],
        [{ next: 1, reward: wait, chance: 1 }],
        [{ next: 0, reward: 0, chance: 1 }],
      ],
    ],
  }

  it('solves the Bellman optimality equations, written out by hand', () => {
    const [high, low] = optimal(robot, gamma)
    expect(high).toBeCloseTo(
      Math.max(search + gamma * (alpha * high + (1 - alpha) * low), wait + gamma * high)
    )
    expect(low).toBeCloseTo(
      Math.max(
        beta * search - 3 * (1 - beta) + gamma * ((1 - beta) * high + beta * low),
        wait + gamma * low,
        gamma * high
      )
    )
  })

  it('averages over outcomes in an action’s worth', () => {
    const values = [10, 0]
    // 0.4 · (2 + 0.9 · 0) + 0.6 · (−3 + 0.9 · 10)
    expect(actionValues(robot, values, gamma, 1)[0]).toBeCloseTo(0.8 + 3.6)
  })
})
