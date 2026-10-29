import { describe, expect, it } from 'vitest'
import { greedy, solve, SPOTS, state, steps, sweep } from './ladders'
import { agree, best, bestValues, judged, JUDGE, options, ROUNDS } from './planning'

describe('policy iteration', () => {
  it('switches the squares below ladders, then the ones below those, then stops: 4 rounds', () => {
    const rounds = ROUNDS()
    expect(rounds.map((round) => round.switched)).toEqual([[2, 7, 18], [1, 6, 17], [16], []])
    expect(steps(best())).toEqual([1, 2, 6, 7, 16, 17, 18])
  })

  it('never makes a square worse from one round to the next', () => {
    const rounds = ROUNDS()
    for (let r = 1; r < rounds.length; r++) {
      const before = solve(rounds[r - 1].plan)
      const after = solve(rounds[r].plan)
      for (const sq of SPOTS) expect(after[state(sq)]).toBeGreaterThanOrEqual(before[state(sq)] - 1e-9)
    }
  })

  it('ends on a play that no switch improves, whose values satisfy the optimality equation', () => {
    const values = solve(best())
    expect(greedy(values, best())).toEqual(best())
    expect(sweep(values, 'best').delta).toBeLessThan(1e-9)
    for (const sq of SPOTS) expect(values[state(sq)]).toBeCloseTo(bestValues()[state(sq)], 9)
    expect(values[state(1)]).toBeCloseTo(-6.97, 2)
  })

  it("compares square 7's moves by always rolling's values, as the story says", () => {
    const [first] = ROUNDS()
    const [roll, step] = options(first, 7)
    // Judged until the biggest change was under 0.001, so nearly a fixed point
    expect(Math.abs(roll - first.values[state(7)])).toBeLessThan(0.005)
    // A step lands on the ladder at 8, which climbs to 16
    expect(step).toBeCloseTo(-1 + first.values[state(16)], 12)
    expect(roll).toBeCloseTo(-8.55, 2)
    expect(step).toBeCloseTo(-7.22, 2)
  })

  it('reaches the same best play however few sweeps judge between improvements', () => {
    for (const judge of JUDGE) {
      const run = judged(judge)
      expect(agree(run.plan, best())).toBe(true)
      expect(run.points.at(-1)!.start).toBeCloseTo(bestValues()[state(1)], 2)
    }
    const settled = judged('settled')
    expect(settled.sweeps).toBe(ROUNDS().reduce((sum, round) => sum + round.passes.length - 1, 0))
    expect(judged(3).sweeps).toBeLessThan(settled.sweeps / 3)
  })
})
