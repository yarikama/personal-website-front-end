import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  afterDoublings,
  BEST_CHOIR,
  bestSplit,
  BIG_CHOIR,
  CHECK_BEST,
  CHECK_OPTIONS,
  CHECK_RULE_N,
  CHINCHILLA,
  CHINCHILLA_RATIO,
  CHOIR_BUDGET,
  count,
  dataShortfall,
  FIT,
  flops,
  FRONTIER_RATIOS,
  GOPHER,
  GOPHER_BUDGET,
  GPT3,
  GUESS,
  GUESS_BEST,
  guessLoss,
  hoursFor,
  KAPLAN_DATA_GROWTH,
  KAPLAN_DOUBLING,
  KAPLAN_MODEL_GROWTH,
  lossAt,
  lossOf,
  modelShortfall,
  ONE_BILLION_TOKENS,
  paramShare,
  practiceFlaw,
  PRINTED,
  QUICK_OPTIONS,
  QUICK_RIGHT,
  ratio,
  sci,
  SINGER_HOURS,
  SMALL_CHOIR,
  thinFlaw,
  tokensFor,
  totalFlaw,
  type Law,
} from './model'

// The best split by brute force: try model sizes on a fine log grid
function searchBest(c: number, law: Law = FIT) {
  let best = { n: 0, loss: Infinity }
  for (let i = 0; i <= 12000; i++) {
    const n = 10 ** (5 + i / 1000)
    const loss = lossAt(c, n, law)
    if (loss < best.loss) best = { n, loss }
  }
  return best
}

describe('the cost of training', () => {
  it('is six operations per parameter per token', () => {
    expect(flops(1, 1)).toBe(6)
    // 6 × 70e9 × 1.4e12 = 5.88e23
    expect(flops(CHINCHILLA.n, CHINCHILLA.d)).toBeCloseTo(5.88e23, -20)
    // 6 × 280e9 × 300e9 = 5.04e23, and 6 × 175e9 × 300e9 = 3.15e23
    expect(GOPHER_BUDGET).toBeCloseTo(5.04e23, -20)
    expect(flops(GPT3.n, GPT3.d)).toBeCloseTo(3.15e23, -20)
    expect(tokensFor(GOPHER_BUDGET, GOPHER.n)).toBeCloseTo(GOPHER.d, -3)
  })

  it('makes Chinchilla 20 tokens per parameter, as the paper projects for 1B', () => {
    expect(CHINCHILLA_RATIO).toBe(20)
    expect(ONE_BILLION_TOKENS / 1e9).toBeCloseTo(20, 0)
  })
})

describe('the fitted law', () => {
  it('matches hand-worked values', () => {
    // 482.01 / (70e9)^0.3478 and 2085.43 / (1.2e12)^0.3658, worked by hand
    expect(modelShortfall(70e9)).toBeCloseTo(0.0815, 3)
    expect(dataShortfall(1.2e12)).toBeCloseTo(0.0795, 3)
    expect(lossOf(70e9, 1.2e12)).toBeCloseTo(1.978, 3)
    expect(lossOf(GOPHER.n, GOPHER.d)).toBeCloseTo(2.0, 3)
  })

  it('falls by a fixed share for every doubling', () => {
    expect(modelShortfall(2e9) / modelShortfall(1e9)).toBeCloseTo(2 ** -FIT.alpha, 12)
    expect(modelShortfall(2e12) / modelShortfall(1e12)).toBeCloseTo(2 ** -FIT.alpha, 12)
    expect(dataShortfall(2e11) / dataShortfall(1e11)).toBeCloseTo(2 ** -FIT.beta, 12)
  })

  it('finds the same best split in closed form as by brute force, on random budgets', () => {
    const random = seeded(584)
    for (let i = 0; i < 200; i++) {
      const c = 10 ** (17 + random() * 10)
      const closed = bestSplit(c)
      const searched = searchBest(c)
      expect(Math.abs(Math.log10(closed.n) - Math.log10(searched.n))).toBeLessThan(0.002)
      expect(closed.loss).toBeLessThanOrEqual(searched.loss + 1e-12)
      // and no other size on that budget does better
      const other = 10 ** (6 + random() * 7)
      expect(closed.loss).toBeLessThanOrEqual(lossAt(c, other) + 1e-12)
    }
  })

  it('balances the shortfalls at the best split: α · model = β · data', () => {
    const random = seeded(2022)
    for (let i = 0; i < 100; i++) {
      const c = 10 ** (18 + random() * 8)
      const { n, d } = bestSplit(c)
      expect(FIT.alpha * modelShortfall(n)).toBeCloseTo(FIT.beta * dataShortfall(d), 10)
    }
  })

  it('puts the best split near 20 tokens per parameter; the printed constants do not', () => {
    const gopher = bestSplit(GOPHER_BUDGET)
    expect(gopher.n / 1e9).toBeCloseTo(67.5, 0)
    expect(gopher.perParam).toBeGreaterThan(15)
    expect(gopher.perParam).toBeLessThan(25)
    for (const r of FRONTIER_RATIOS) {
      expect(r).toBeGreaterThan(15)
      expect(r).toBeLessThan(27)
    }
    // Hoffmann's printed fit: ~0.45 of each extra factor to parameters, and ~90 tokens per parameter here
    expect(paramShare(PRINTED)).toBeCloseTo(0.4516, 3)
    expect(paramShare()).toBeCloseTo(0.5126, 3)
    expect(bestSplit(GOPHER_BUDGET, PRINTED).perParam).toBeGreaterThan(60)
    const printed = searchBest(GOPHER_BUDGET, PRINTED)
    expect(Math.abs(Math.log10(printed.n) - Math.log10(bestSplit(GOPHER_BUDGET, PRINTED).n))).toBeLessThan(0.002)
  })
})

describe('the choir', () => {
  it('is Gopher’s budget, in billions', () => {
    expect(SINGER_HOURS).toBe(84000)
    expect(CHOIR_BUDGET).toBeCloseTo(GOPHER_BUDGET, -20)
    expect(hoursFor(BIG_CHOIR)).toBe(300)
    expect(hoursFor(SMALL_CHOIR)).toBe(5600)
  })

  it('tells the numbers the story says', () => {
    expect(practiceFlaw(BIG_CHOIR)).toBeCloseTo(0.132, 3)
    expect(thinFlaw(BIG_CHOIR)).toBeCloseTo(0.05, 3)
    expect(totalFlaw(SMALL_CHOIR)).toBeCloseTo(0.185, 3)
    expect(Math.round(BEST_CHOIR)).toBe(67)
    expect(Math.round(hoursFor(BEST_CHOIR))).toBe(1245)
    expect(totalFlaw(BEST_CHOIR)).toBeCloseTo(0.161, 3)
    // both sides of the valley are worse than its bottom
    expect(totalFlaw(BIG_CHOIR)).toBeGreaterThan(totalFlaw(BEST_CHOIR))
    expect(totalFlaw(SMALL_CHOIR)).toBeGreaterThan(totalFlaw(BEST_CHOIR))
  })
})

describe('the checks', () => {
  it('guess first: the 70B split wins, and both extremes lose to Gopher’s', () => {
    expect(GUESS_BEST.n).toBe(70e9)
    expect(GUESS.map((s) => Number(guessLoss(s).toFixed(3)))).toEqual([2.06, 2.0, 1.978, 2.033])
    for (const s of GUESS) expect(flops(s.n, s.d)).toBeCloseTo(GOPHER_BUDGET, -20)
  })

  it('quick check: three doublings under Kaplan’s law', () => {
    expect(KAPLAN_DOUBLING).toBeCloseTo(0.9487, 4)
    expect(QUICK_RIGHT).toBeCloseTo(3 * 0.9487 ** 3, 3)
    expect(QUICK_RIGHT.toFixed(2)).toBe('2.56')
    expect(QUICK_OPTIONS.filter((o) => o.right)).toHaveLength(1)
    expect(new Set(QUICK_OPTIONS.map((o) => o.value.toFixed(2))).size).toBe(4)
    expect(afterDoublings(1, 0)).toBe(1)
  })

  it('check yourself: the 20-per-parameter answer is the fitted law’s best of the four', () => {
    expect(CHECK_RULE_N / 1e9).toBeCloseTo(9.13, 2)
    expect(CHECK_BEST.n).toBe(9e9)
    expect(CHECK_OPTIONS.filter((o) => o.loss < CHECK_BEST.loss + 1e-12)).toHaveLength(1)
  })

  it('works out Kaplan’s 100× split', () => {
    expect(KAPLAN_MODEL_GROWTH).toBeCloseTo(28.8, 1)
    expect(KAPLAN_DATA_GROWTH).toBeCloseTo(3.47, 2)
    expect(KAPLAN_MODEL_GROWTH * KAPLAN_DATA_GROWTH).toBeCloseTo(100, 6)
  })
})

describe('formatting', () => {
  it('writes counts and powers of ten', () => {
    expect(count(280e9)).toBe('280B')
    expect(count(1.4e12)).toBe('1.4T')
    expect(count(1e12)).toBe('1T')
    expect(count(9.13e9)).toBe('9.1B')
    expect(count(84e6)).toBe('84M')
    expect(sci(5.04e23)).toBe('5.0 × 10²³')
    expect(sci(1e22)).toBe('10²²')
    expect(sci(9.99e22)).toBe('10²³')
    expect(ratio(20)).toBe('20')
    expect(ratio(1.0714)).toBe('1.1')
    expect(ratio(0.05)).toBe('0.05')
  })
})
