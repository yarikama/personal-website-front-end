import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  alphaBar,
  BACK,
  BACK_ON,
  backward,
  bestNoise,
  bestStart,
  betaFor,
  chances,
  CLEAR_GUESSES,
  DATA,
  DATA_SPREAD,
  END,

  FLOCKS,
  FORWARD,
  forwardStep,
  JUMP,
  JUMP_MIDDLE,
  jumpTo,
  labRun,
  normal,
  onFlock,
  SHEEP,
  spreadOf,
  SPREAD,
  startFrom,
  T,
  WORKED,
  type Vec,
} from './model'

const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length
const variance = (xs: number[]) => {
  const m = mean(xs)
  return mean(xs.map((x) => (x - m) ** 2))
}

describe('the schedule', () => {
  it('keeps (1 − β) to the power t of the start', () => {
    expect(alphaBar(1)).toBeCloseTo(0.95, 12)
    expect(alphaBar(10)).toBeCloseTo(0.5987, 4)
    expect(alphaBar(100)).toBeCloseTo(0.00592, 5)
    expect(END).toBe(alphaBar(T))
  })

  it('works the page’s three numbers', () => {
    const shown = WORKED.map((w) => [w.keep.toFixed(2), w.shrunk.toFixed(2), w.noise.toFixed(2), w.x.toFixed(2)])
    expect(shown).toEqual([
      ['0.97', '1.95', '0.22', '2.17'],
      ['0.77', '1.55', '0.63', '2.18'],
      ['0.08', '0.15', '1.00', '1.15'],
    ])
  })

  it('gives the start back from the noise: (2.18 − 0.63) ÷ 0.77 is 2', () => {
    const w = WORKED[1]
    expect(startFrom(w.x, w.a, 1)).toBeCloseTo(2, 12)
  })

  it('ends every lab schedule where the story ends', () => {
    for (const steps of [1, 2, 5, 20, 100, 1000]) expect(alphaBar(steps, betaFor(steps))).toBeCloseTo(END, 12)
    expect(betaFor(100)).toBeCloseTo(0.05, 12)
  })
})

describe('the closed form', () => {
  it('matches the chain of small steps it replaces', () => {
    // Run 10 small steps from x₀ = (2, 0) many times; the closed form says
    // the result has mean √ᾱ x₀ and variance 1 − ᾱ in each direction
    const random = seeded(3)
    const ends: Vec[] = []
    for (let i = 0; i < 20000; i++) {
      let x: Vec = [2, 0]
      for (let t = 0; t < 10; t++) x = forwardStep(x, 0.05, [normal(random), normal(random)])
      ends.push(x)
    }
    const a = alphaBar(10)
    expect(mean(ends.map((x) => x[0]))).toBeCloseTo(Math.sqrt(a) * 2, 1)
    expect(variance(ends.map((x) => x[0]))).toBeCloseTo(1 - a, 1)
    expect(variance(ends.map((x) => x[1]))).toBeCloseTo(1 - a, 1)
  })

  it('turns the flocks into a round blob around the middle by minute 100', () => {
    const end = FORWARD[T]
    expect(Math.abs(mean(end.map((x) => x[0])))).toBeLessThan(0.2)
    expect(Math.abs(mean(end.map((x) => x[1])))).toBeLessThan(0.2)
    expect(variance(end.map((x) => x[0]))).toBeGreaterThan(0.75)
    expect(variance(end.map((x) => x[0]))).toBeLessThan(1.3)
  })
})

describe('the best noise guess', () => {
  it('is what squared-error training aims at: the average noise among samples near a point', () => {
    // Brute force: noise many seeded samples to step t, keep those that land
    // near a point, and average their noise
    const random = seeded(5)
    const a = alphaBar(20)
    const near: Vec = [0.4, -0.2]
    const caught: Vec[] = []
    for (let i = 0; i < 1500000; i++) {
      const [cx, cy] = FLOCKS[i % 2]
      const x0: Vec = [cx + SPREAD * normal(random), cy + SPREAD * normal(random)]
      const eps: Vec = [normal(random), normal(random)]
      const xt = jumpTo(x0, a, eps)
      if (Math.hypot(xt[0] - near[0], xt[1] - near[1]) < 0.08) caught.push(eps)
    }
    expect(caught.length).toBeGreaterThan(3000)
    const guess = bestNoise(near, a)
    // Within four standard errors of the brute-force average
    for (const d of [0, 1]) {
      const values = caught.map((e) => e[d])
      const error = Math.sqrt(variance(values) / values.length)
      expect(Math.abs(mean(values) - guess[d])).toBeLessThan(4 * error + 0.01)
    }
  })

  it('splits its bet evenly in the exact middle', () => {
    const [p, q] = chances([0, 0], alphaBar(30))
    expect(p).toBeCloseTo(0.5, 12)
    expect(q).toBeCloseTo(0.5, 12)
  })

  it('points a sheep standing on a flock back at it when there is no noise left to undo', () => {
    const start = bestStart([FLOCKS[0][0] * Math.sqrt(0.999), FLOCKS[0][1] * Math.sqrt(0.999)], 0.999)
    expect(start[0]).toBeCloseTo(FLOCKS[0][0], 2)
    expect(start[1]).toBeCloseTo(FLOCKS[0][1], 2)
  })

  it('is the one jump when the run back is a single step', () => {
    // At t = 1 the backward step adds no fresh noise and lands on the best guess
    const x: Vec = [1.5, -0.8]
    const viaStep = backward([x], 1, true, 1)[1][0]
    const guess = bestStart(x, END)
    expect(viaStep[0]).toBeCloseTo(guess[0], 12)
    expect(viaStep[1]).toBeCloseTo(guess[1], 12)
  })
})

describe('the story', () => {
  it('starts with flocks as wide as asked', () => {
    expect(DATA).toHaveLength(SHEEP)
    expect(DATA_SPREAD).toBeGreaterThan(SPREAD - 0.03)
    expect(DATA_SPREAD).toBeLessThan(SPREAD + 0.03)
    expect(onFlock(DATA)).toBeGreaterThan(0.97)
  })

  it('has nearly every guess at minute 10 pointing into a flock', () => {
    expect(onFlock(CLEAR_GUESSES)).toBeGreaterThan(0.9)
  })

  it('piles every sheep in the middle with one jump', () => {
    expect(JUMP_MIDDLE).toBe(SHEEP)
    expect(onFlock(JUMP)).toBe(0)
    expect(JUMP).toHaveLength(SHEEP)
  })

  it('brings the flocks back one minute at a time', () => {
    expect(BACK).toHaveLength(T + 1)
    expect(BACK_ON).toBeGreaterThan(190)
  })
})

describe('the lab', () => {
  it('lands in between with one or two steps, and on the flocks with many', () => {
    expect(labRun(1, 'On').on).toBe(0)
    expect(labRun(2, 'On').on).toBeLessThan(0.5)
    expect(labRun(100, 'On').on).toBeGreaterThan(0.95)
    expect(labRun(1000, 'On').on).toBeGreaterThan(0.95)
  })

  it('keeps the flocks as wide as the real ones only with fresh noise', () => {
    expect(labRun(1000, 'On').spread).toBeGreaterThan(0.26)
    expect(labRun(1000, 'Off').spread).toBeLessThan(0.12)
    expect(labRun(1000, 'Off').on).toBe(1)
  })

  it('keeps at most about 100 frames, and the last', () => {
    const run = labRun(1000, 'On')
    expect(run.frames.length).toBeLessThanOrEqual(102)
    expect(spreadOf(run.frames[run.frames.length - 1])).toBe(run.spread)
  })
})
