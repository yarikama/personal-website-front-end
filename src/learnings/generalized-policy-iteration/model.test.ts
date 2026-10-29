import { describe, expect, it } from 'vitest'
import { ALWAYS_ROLL, solve, SPOTS, state, STEP, sweep } from '../../components/explain/ladders'
import { best } from '../../components/explain/planning'
import {
  at,
  bySquares,
  finishes,
  GRAINS,
  offBy,
  offText,
  PER_SWEEP,
  restingOn,
  run,
  sameAsBest,
  story,
  storyRounds,
  switchedBy,
  THETA,
  unhappy,
} from './model'

const stepping = (...squares: number[]) => ALWAYS_ROLL.map((move, s) => (squares.includes(s + 1) ? STEP : move))

describe('the two numbers', () => {
  it('are both zero on the best play and its values', () => {
    expect(offBy(solve('best'), best())).toBeLessThan(1e-9)
    expect(unhappy(solve('best'), best())).toEqual([])
  })

  it("measure the values against the play's own: always rolling from zeros is off by its slowest square", () => {
    const own = solve(ALWAYS_ROLL)
    expect(offBy(own, ALWAYS_ROLL)).toBeLessThan(1e-9)
    expect(offBy(own.map(() => 0), ALWAYS_ROLL)).toBeCloseTo(Math.max(...own.map(Math.abs)), 9)
    // Its exact values make some squares want to step: the first switches
    expect(unhappy(own, ALWAYS_ROLL)).toEqual([2, 7, 18])
  })

  it('know a play that never finishes: step on 18 and on 27 and you go round for ever', () => {
    expect(finishes(ALWAYS_ROLL)).toBe(true)
    expect(finishes(best())).toBe(true)
    expect(finishes(stepping(18, 27))).toBe(false)
    expect(offBy(solve('best'), stepping(18, 27))).toBe(Infinity)
  })

  it('format the gap for a label', () => {
    expect(offText(2.915)).toBe('2.92')
    expect(offText(0.004)).toBe('<0.01')
  })
})

describe('every grain', () => {
  for (const grain of GRAINS) {
    it(`ends on the best play with both jobs done: ${grain}`, () => {
      const r = run(grain)
      const end = r.moments.at(-1)!
      expect(sameAsBest(r.plan)).toBe(true)
      expect(end.unhappy).toEqual([])
      expect(end.off).toBeLessThan(0.01)
      // Never through a play that goes round for ever
      expect(r.moments.every((m) => finishes(m.plan))).toBe(true)
      for (const sq of SPOTS) expect(end.values[state(sq)]).toBeCloseTo(solve('best')[state(sq)], 2)
    })
  }

  it('clears every unhappy square at a whole-board switch, and judging never pushes the values further off', () => {
    for (const grain of [1, 3, 'settled'] as const) {
      const { moments } = run(grain)
      for (let i = 1; i < moments.length; i++) {
        if (moments[i].kind === 'improve') expect(moments[i].unhappy).toEqual([])
        else expect(moments[i].off).toBeLessThanOrEqual(moments[i - 1].off + 1e-12)
      }
    }
  })

  it('takes 12 sweeps’ worth one square at a time, switching 37 moves, some of them back', () => {
    const fine = run('square')
    expect(fine.updates).toBe(12 * PER_SWEEP)
    expect(switchedBy(fine, fine.updates)).toBe(37)
    expect(Math.max(...fine.moments.map((m) => m.unhappy.length))).toBe(15)
  })

  it('needs its shuffle seed: another seed can pass through a play that never finishes, and still end on the best', () => {
    const other = bySquares(THETA, 1)
    expect(other.moments.some((m) => !finishes(m.plan))).toBe(true)
    expect(sameAsBest(other.plan)).toBe(true)
  })

  it('finds the moment at a number of updates', () => {
    const r = run(1)
    expect(at(r, 0)).toBe(0)
    expect(r.moments[at(r, PER_SWEEP * 2 + 5)].updates).toBe(PER_SWEEP * 2)
    expect(at(r, r.updates)).toBe(r.moments.length - 1)
  })
})

describe('the story: judging until settled', () => {
  const { moments, updates } = story()
  const rounds = storyRounds()

  it('switches three times, at passes 36, 58 and 72, and ends after 80', () => {
    expect(rounds.map((round) => moments[round.after].updates / PER_SWEEP)).toEqual([36, 58, 72])
    expect(rounds.map((round) => moments[round.after].switched)).toEqual([[2, 7, 18], [1, 6, 17], [16]])
    expect(updates / PER_SWEEP).toBe(80)
  })

  it('has each pull undo the other: settled values are thrown off by a switch, and new values make squares unhappy', () => {
    const [first, second, third] = rounds
    expect(moments[first.before].off).toBeLessThan(0.01)
    expect(moments[first.before].unhappy).toEqual([2, 7, 18])
    expect(moments[second.before].unhappy).toEqual([1, 6, 17])
    expect(rounds.map((round) => offText(moments[round.after].off))).toEqual(['2.91', '1.05', '0.06'])
    expect(moments[third.after].unhappy).toEqual([])
  })

  it('is not the best right after the first switch, though no square wants to switch (the quick check)', () => {
    const after = moments[rounds[0].after]
    expect(after.unhappy).toEqual([])
    expect(sameAsBest(after.plan)).toBe(false)
  })

  it('ends 6.97 turns from square 1', () => {
    expect(moments.at(-1)!.values[state(1)]).toBeCloseTo(-6.97, 2)
  })
})

describe('where both rest', () => {
  it('on square 12, rolling is the better move and the value is its worth', () => {
    const rest = restingOn(12)
    expect(rest.roll).toBeCloseTo(-5.53, 2)
    expect(rest.step).toBeCloseTo(-5.97, 2)
    expect(rest.value).toBeCloseTo(Math.max(rest.roll, rest.step), 3)
  })

  it('satisfies the optimality equation everywhere: one more sweep with the better move changes almost nothing', () => {
    const end = story().moments.at(-1)!.values
    expect(sweep(end, 'best').delta).toBeLessThan(THETA)
  })
})
