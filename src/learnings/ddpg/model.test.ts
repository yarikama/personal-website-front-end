import { describe, expect, it } from 'vitest'
import {
  actorAt,
  bestDial,
  climb,
  combinations,
  comfort,
  criticAt,
  criticSlope,
  learn,
  LEARNER,
  missedBy,
  NOISES,
  PEAK,
  slope,
  toDial,
  toUnit,
} from './model'

describe('the shower', () => {
  it('puts the best setting at 25 on a mild morning, 85 on a freezing one, 70 in the story', () => {
    expect(bestDial(0)).toBe(25)
    expect(bestDial(1)).toBe(85)
    expect(PEAK).toBe(70)
  })

  it('feels best at the best setting', () => {
    expect(comfort(0.75, 70)).toBeCloseTo(0, 12)
    expect(comfort(0.75, 60)).toBeLessThan(0)
    expect(comfort(0.75, 80)).toBeLessThan(0)
  })

  it('converts between the dial and the learner’s units', () => {
    expect(toUnit(30)).toBeCloseTo(-0.4, 12)
    expect(toDial(0.4)).toBeCloseTo(70, 12)
  })
})

describe('the story’s climb', () => {
  it('has a slope of 1.6 at 30, so a step of 0.25 moves the habit 20 settings', () => {
    expect(slope(30)).toBeCloseTo(1.6, 12)
    expect(climb(1)[1]).toBeCloseTo(50, 12)
  })

  it('goes half the way each morning: 30, 50, 60, 65, 67.5', () => {
    expect(climb(4)).toEqual([30, 50, 60, 65, 67.5])
  })
})

describe('the critic’s slope', () => {
  it('is the derivative of its guess along the setting', () => {
    const w = [0.3, -0.2, 0.1, 0.5, -0.7, -0.9]
    const h = 1e-6
    for (const [c, u] of [[0.2, -0.3], [0.8, 0.5]]) {
      const numeric = (criticAt(w, c, u + h) - criticAt(w, c, u - h)) / (2 * h)
      expect(criticSlope(w, c, u)).toBeCloseTo(numeric, 6)
    }
  })

  it('can fit the comfort exactly, and then points at the best setting', () => {
    // −(u − m)² with m = −0.5 + 1.2c, in the six features
    const w = [-0.25, 1.2, -1.44, -1, 2.4, -1]
    for (const c of [0, 0.5, 1]) {
      for (const dial of [10, 50, 90]) expect(criticAt(w, c, toUnit(dial))).toBeCloseTo(comfort(c, dial), 10)
      expect(criticSlope(w, c, toUnit(bestDial(c)))).toBeCloseTo(0, 10)
    }
  })
})

describe('the learner', () => {
  it('starts the wrong way round, about 25 settings off', () => {
    expect(actorAt(LEARNER.start, 0)).toBeGreaterThan(actorAt(LEARNER.start, 1))
    expect(missedBy(LEARNER.start)).toBeCloseTo(24.7, 1)
  })

  it('gets within 2 of the best with large noise, and stalls about 10 off with none', () => {
    for (const seed of [1, 2, 3, 4]) {
      expect(missedBy(learn(NOISES.Large, seed).at(-1)!.theta)).toBeLessThan(2)
      const stuck = missedBy(learn(NOISES.None, seed).at(-1)!.theta)
      expect(stuck).toBeGreaterThan(6)
      expect(stuck).toBeLessThan(14)
    }
  })

  it('does better with more noise, on the figure’s run', () => {
    const [none, small, large] = [NOISES.None, NOISES.Small, NOISES.Large].map((n) => missedBy(learn(n).at(-1)!.theta))
    expect(small).toBeLessThan(none)
    expect(large).toBeLessThan(small)
  })

  it('keeps a snapshot every 10 showers, with the last 40 tried', () => {
    const run = learn(NOISES.Small)
    expect(run.length).toBe(LEARNER.showers / LEARNER.every + 1)
    expect(run[2].shower).toBe(20)
    expect(run.at(-1)!.tried.length).toBe(40)
  })
})

describe('the guess', () => {
  it('needs a trillion tries for six joints at 100 settings each', () => {
    expect(combinations(100, 1)).toBe(100)
    expect(combinations(100, 2)).toBe(10_000)
    expect(combinations(100, 6)).toBe(1e12)
    expect(combinations(21, 4)).toBe(194_481)
  })
})
