import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  argmax,
  CHOCOLAT,
  context,
  DARK,
  hardRow,
  NOIR,
  NOT_KNOWING_DONT,
  PAIR_NAMES,
  PAIRS,
  pct,
  shade,
  softmax,
  STATES,
  STORY,
  STORY_CONTEXTS,
  STORY_TOPS,
  STORY_WEIGHTS,
  vector,
  WEIGHTS,
} from './model'

// softmax written the plain way, with no shift: the reference for random scores
const plainSoftmax = (scores: number[]) => {
  const raised = scores.map(Math.exp)
  const total = raised.reduce((a, b) => a + b, 0)
  return raised.map((r) => r / total)
}

describe('softmax', () => {
  it('turns scores into weights worked out by hand', () => {
    // e^0 = 1, e^0 = 1, e^1.5 = 4.4817, e^4 = 54.598; total 61.080
    const w = softmax([0, 0, 1.5, 4])
    expect(w[0]).toBeCloseTo(1 / 61.0799, 4)
    expect(w[2]).toBeCloseTo(4.4817 / 61.0799, 4)
    expect(w[3]).toBeCloseTo(54.5982 / 61.0799, 4)
  })

  it('gives equal scores equal weights', () => {
    expect(softmax([2, 2, 2, 2])).toEqual([0.25, 0.25, 0.25, 0.25])
  })

  it('matches the plain formula, is positive and sums to 1, on random scores', () => {
    const random = seeded(5)
    for (let n = 0; n < 300; n++) {
      const scores = Array.from({ length: 2 + Math.floor(8 * random()) }, () => 10 * random() - 5)
      const w = softmax(scores)
      const reference = plainSoftmax(scores)
      w.forEach((x, j) => {
        expect(x).toBeGreaterThan(0)
        expect(x).toBeCloseTo(reference[j], 12)
      })
      expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12)
      // The biggest score gets the biggest weight
      expect(argmax(w)).toBe(argmax(scores))
    }
  })

  it('stays finite on scores too big for exp alone', () => {
    const w = softmax([1000, 999])
    expect(w[0]).toBeCloseTo(1 / (1 + Math.exp(-1)), 12)
  })
})

describe('the context vector', () => {
  it('is the weighted sum of the states, worked by hand', () => {
    // 0.5 × (1, 0) + 0.25 × (0, 2) + 0.25 × (2, 2) = (1, 1)
    expect(
      context(
        [0.5, 0.25, 0.25],
        [
          [1, 0],
          [0, 2],
          [2, 2],
        ],
      ),
    ).toEqual([1, 1])
  })

  it('is the state itself when all the weight is on one word', () => {
    expect(context([0, 0, 1, 0], STATES)).toEqual(STATES[2])
  })

  it('stays between the smallest and largest state in each number, on random weights', () => {
    const random = seeded(9)
    for (let n = 0; n < 200; n++) {
      const states = Array.from({ length: 5 }, () => [4 * random() - 2, 4 * random() - 2])
      const c = context(softmax(states.map(() => 6 * random() - 3)), states)
      for (const k of [0, 1]) {
        const values = states.map((s) => s[k])
        expect(c[k]).toBeGreaterThanOrEqual(Math.min(...values) - 1e-12)
        expect(c[k]).toBeLessThanOrEqual(Math.max(...values) + 1e-12)
      }
    }
  })
})

describe('the story', () => {
  it('looks right to left: noir, then chocolat, then mousse', () => {
    expect(STORY_TOPS.map((j) => STORY.source[j])).toEqual(['noir', 'chocolat', 'mousse'])
  })

  it('gives the numbers the page states for “dark”', () => {
    const row = STORY_WEIGHTS[DARK]
    expect([row[NOIR], row[CHOCOLAT], row[0], row[1]].map(pct)).toEqual(['89%', '7%', '2%', '2%'])
    // A gap of 2.5 in score is e^2.5 ≈ 12 in weight
    expect(row[NOIR] / row[CHOCOLAT]).toBeCloseTo(Math.exp(2.5), 10)
    expect(Math.round(Math.exp(2.5))).toBe(12)
  })

  it('mixes the states into the contexts the page and clip print', () => {
    expect(STORY_CONTEXTS.map(vector)).toEqual(['(0.92, 0.26)', '(0.42, 0.83)', '(0.12, 0.85)'])
    // The clip's sum with the weights rounded to two places lands on the same numbers
    const rounded = STORY_WEIGHTS[DARK].map((w) => Number(w.toFixed(2)))
    expect(vector(context(rounded, STATES))).toBe('(0.92, 0.26)')
    expect(rounded.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10)
  })
})

describe('the lab', () => {
  it('has a score for every pair of words, and rows that sum to 1', () => {
    for (const name of PAIR_NAMES) {
      const { source, target, scores } = PAIRS[name]
      expect(scores).toHaveLength(target.length)
      for (const row of scores) expect(row).toHaveLength(source.length)
      for (const row of WEIGHTS[name]) expect(row.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12)
    }
  })

  it('splits “don’t” between “ne” and “pas”, as the page says', () => {
    expect([NOT_KNOWING_DONT[3], NOT_KNOWING_DONT[1]].map(pct)).toEqual(['49%', '44%'])
    expect(hardRow(NOT_KNOWING_DONT)).toEqual([0, 0, 0, 1])
  })

  it('sends “sleeping” to “dort” and spreads “is”', () => {
    const { source } = PAIRS['Sister’s cat']
    const [, , , is, sleeping] = WEIGHTS['Sister’s cat']
    expect(source[argmax(sleeping)]).toBe('dort')
    expect(Math.max(...is)).toBeLessThan(Math.max(...sleeping) - 0.2)
  })

  it('keeps one partner per word when hard', () => {
    const random = seeded(3)
    for (let n = 0; n < 100; n++) {
      const row = softmax(Array.from({ length: 6 }, () => 4 * random()))
      const hard = hardRow(row)
      expect(hard.reduce((a, b) => a + b, 0)).toBe(1)
      expect(hard[argmax(row)]).toBe(1)
    }
  })

  it('shades cells lightly enough for ink text in both themes', () => {
    expect(shade(0)).toBeGreaterThan(0)
    expect(shade(1)).toBeLessThanOrEqual(0.55)
  })
})
