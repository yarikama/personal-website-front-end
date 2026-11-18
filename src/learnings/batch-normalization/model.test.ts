import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  ART,
  batchNorm,
  CONV_COUNT,
  curved,
  EPS,
  GAINS,
  graded,
  KEPT_MEAN,
  KEPT_SPREAD,
  LAB_WOBBLE,
  LATE_CURVED,
  MATHS_WEEK_1,
  MATHS_WEEK_2,
  mean,
  normal,
  normalize,
  normalizeColumns,
  PAIR_OUT,
  PAIR_SAMPLE,
  runningAverage,
  spread,
  stack,
  STACKS,
  STORY_WOBBLE,
  TRUE_Z,
  typicalMiss,
  variance,
  wobble,
  WORKED_MEAN,
  WORKED_NORMALIZED,
  WORKED_OUT,
  WORKED_SPREAD,
  YOU,
} from './model'

const close = (a: number[], b: number[], digits = 9) => a.forEach((x, i) => expect(x).toBeCloseTo(b[i], digits))

describe('the worked numbers', () => {
  it('match the hand-worked batch 13, 19, 21, 27', () => {
    expect(WORKED_MEAN).toBe(20)
    // gaps −7, −1, 1, 7: squares 49 + 1 + 1 + 49 = 100, over 4 = 25
    expect(WORKED_SPREAD).toBe(5)
    close(WORKED_NORMALIZED, [-1.4, -0.2, 0.2, 1.4])
    close(WORKED_OUT, [-1.8, 0.6, 1.4, 3.8])
  })

  it('counts a channel’s numbers in a convolutional batch', () => {
    expect(CONV_COUNT).toBe(100352)
  })

  it('gives ±1 for any batch of two, and ±0.71 with the n − 1 spread', () => {
    close(PAIR_OUT, [-1, 1])
    close(PAIR_SAMPLE, [-Math.SQRT1_2, Math.SQRT1_2])
    const random = seeded(3)
    for (let k = 0; k < 200; k++) {
      const a = 100 * random()
      const b = a + 0.1 + 50 * random()
      close(normalize([a, b]), [-1, 1])
    }
  })
})

describe('normalizing', () => {
  it('leaves every batch with average 0 and spread 1', () => {
    const random = seeded(1)
    for (let k = 0; k < 300; k++) {
      const m = 2 + Math.floor(random() * 30)
      const centre = 100 * normal(random)
      const width = 0.1 + 10 * random()
      const xs = Array.from({ length: m }, () => centre + width * normal(random))
      const z = normalize(xs)
      expect(mean(z)).toBeCloseTo(0, 9)
      expect(variance(z)).toBeCloseTo(1, 9)
    }
  })

  it('agrees with the formula written out by hand', () => {
    const random = seeded(2)
    for (let k = 0; k < 100; k++) {
      const xs = Array.from({ length: 8 }, () => 10 * normal(random))
      const gamma = normal(random)
      const beta = normal(random)
      let sum = 0
      for (const x of xs) sum += x
      const mu = sum / xs.length
      let squares = 0
      for (const x of xs) squares += (x - mu) * (x - mu)
      const sigma = Math.sqrt(squares / xs.length + EPS)
      close(
        batchNorm(xs, gamma, beta, EPS),
        xs.map((x) => (gamma * (x - mu)) / sigma + beta),
      )
    }
  })

  it('takes nothing away: γ = spread and β = average give the raw values back', () => {
    const random = seeded(4)
    for (let k = 0; k < 100; k++) {
      const xs = Array.from({ length: 6 }, () => 5 + 3 * normal(random))
      close(batchNorm(xs, spread(xs), mean(xs)), xs)
    }
  })

  it('ignores any shift or rescaling of its input', () => {
    const random = seeded(5)
    for (let k = 0; k < 100; k++) {
      const xs = Array.from({ length: 10 }, () => normal(random))
      const scale = 0.1 + 5 * random()
      const shift = 20 * normal(random)
      close(normalize(xs.map((x) => scale * x + shift)), normalize(xs))
    }
  })

  it('normalizes each column of a batch on its own', () => {
    const rows = [
      [1, 10],
      [3, 30],
    ]
    close(normalizeColumns(rows, 0).flat(), [-1, -1, 1, 1])
  })
})

describe('the classroom', () => {
  it('has maths at 50 ± 5 and the next week 20 lower', () => {
    expect(mean(MATHS_WEEK_1)).toBe(50)
    expect(spread(MATHS_WEEK_1)).toBe(5)
    expect(mean(MATHS_WEEK_2)).toBe(30)
    expect(MATHS_WEEK_2[YOU]).toBe(37)
    expect(Math.max(...MATHS_WEEK_2)).toBe(37)
    expect(MATHS_WEEK_2[YOU]).toBeLessThan(Math.min(...MATHS_WEEK_1))
  })

  it('curves both weeks of maths alike, your score to +1.4', () => {
    close(curved(MATHS_WEEK_2), curved(MATHS_WEEK_1))
    expect(curved(MATHS_WEEK_2)[YOU]).toBeCloseTo(1.4, 12)
    expect(graded(MATHS_WEEK_2, 'maths')[YOU]).toBeCloseTo(89, 12)
    expect(mean(ART)).toBe(93)
  })

  it('keeps running averages near the art classes’ true 93 and 3', () => {
    expect(KEPT_MEAN).toBeGreaterThan(92)
    expect(KEPT_MEAN).toBeLessThan(94)
    expect(KEPT_SPREAD).toBeGreaterThan(2.5)
    expect(KEPT_SPREAD).toBeLessThan(3.5)
    expect(LATE_CURVED).toBeCloseTo((96 - KEPT_MEAN) / KEPT_SPREAD, 12)
  })

  it('curves your 57 to at most √2 in classes of 3', () => {
    // With three values, none can sit more than √(m − 1) = √2 spreads out
    for (const z of STORY_WOBBLE) expect(Math.abs(z)).toBeLessThanOrEqual(Math.SQRT2 + 1e-9)
    expect(Math.min(...STORY_WOBBLE)).toBeLessThan(0.6)
  })
})

describe('the running average', () => {
  it('matches its closed form: (1 − α)ⁿ start + Σ α (1 − α)ⁿ⁻ᵏ xₖ', () => {
    const random = seeded(6)
    for (let k = 0; k < 50; k++) {
      const n = 1 + Math.floor(random() * 40)
      const values = Array.from({ length: n }, () => 10 * normal(random))
      const start = normal(random)
      const alpha = 0.01 + 0.5 * random()
      let closed = (1 - alpha) ** n * start
      values.forEach((v, i) => (closed += alpha * (1 - alpha) ** (n - 1 - i) * v))
      expect(runningAverage(values, start, alpha)).toBeCloseTo(closed, 9)
    }
  })

  it('stays put on a constant', () => {
    expect(runningAverage([7, 7, 7], 7)).toBe(7)
  })
})

describe('the batch it lands in', () => {
  it('scatters less as batches grow', () => {
    const misses = [...LAB_WOBBLE.values()].map(typicalMiss)
    for (let i = 1; i < misses.length; i++) expect(misses[i]).toBeLessThan(misses[i - 1])
    expect(misses.at(-1)!).toBeLessThan(0.15)
  })

  it('averages near the whole-dataset value in big batches', () => {
    const outputs = wobble(1024, 50, 9)
    expect(mean(outputs)).toBeCloseTo(TRUE_Z, 1)
  })
})

describe('a stack of layers', () => {
  it('grows or shrinks with the weights’ size without batch norm', () => {
    const small = STACKS.get(0.8)!.without.at(-1)!
    const large = STACKS.get(1.25)!.without.at(-1)!
    expect(small).toBeLessThan(0.05)
    expect(large).toBeGreaterThan(10)
  })

  it('is the same at every weight size with batch norm, at about √½', () => {
    const lines = GAINS.map((g) => STACKS.get(g)!.with)
    // (ε makes them differ in the sixth decimal)
    for (const line of lines) close(line, lines[0], 4)
    // A ReLU of a mean-0, variance-1 unit has a mean square of ½
    for (const value of lines[0]) {
      expect(value).toBeGreaterThan(0.6)
      expect(value).toBeLessThan(0.8)
    }
  })

  it('multiplies the size by the gain each layer, on average, without batch norm', () => {
    // A brute-force check over many seeded networks: the average log size
    // at layer 10 is near 10 log(gain)
    const random = seeded(8)
    const layers = 10
    const runs = 20
    for (const gain of [0.8, 1.25]) {
      let logs = 0
      for (let r = 0; r < runs; r++) {
        const weights = Array.from({ length: layers }, () =>
          Array.from({ length: 32 }, () => Array.from({ length: 32 }, () => Math.sqrt(2 / 32) * normal(random))),
        )
        const input = Array.from({ length: 32 }, () => Array.from({ length: 32 }, () => normal(random)))
        logs += Math.log(stack(gain, false, weights, input).at(-1)!)
      }
      expect(logs / runs / layers).toBeCloseTo(Math.log(gain), 1)
    }
  })
})
