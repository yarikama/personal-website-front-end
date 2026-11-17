import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  absoluteTotal,
  BEST,
  CANDIDATES,
  FIVE_SMALL,
  fit,
  fitLine,
  FLAT,
  misses,
  ONE_BIG,
  priceAt,
  RAISED,
  residual,
  row,
  SALES,
  searchAt,
  SEARCH,
  squaredTotal,
  sumOfMisses,
  sumOfSquares,
  THROUGH_FOUR,
  times,
  timesVector,
  transpose,
  YOUR_AGE,
  type Sale,
} from './model'

// The smallest score over a grid of lines, by trying every one
function gridBest(
  sales: readonly Sale[],
  score: (s: readonly Sale[], l: { start: number; perYear: number }) => number,
  starts: [number, number, number],
  slopes: [number, number, number],
) {
  let best = { start: 0, perYear: 0, score: Infinity }
  for (let start = starts[0]; start <= starts[1] + 1e-9; start += starts[2]) {
    for (let perYear = slopes[0]; perYear <= slopes[1] + 1e-9; perYear += slopes[2]) {
      const s = score(sales, { start, perYear })
      if (s < best.score) best = { start, perYear, score: s }
    }
  }
  return best
}

function randomSales(random: () => number, n: number): Sale[] {
  const start = 300 + 400 * random()
  const perYear = -80 + 60 * random()
  return Array.from({ length: n }, () => {
    const age = 10 * random()
    return { age, price: start + perYear * age + 120 * (random() - 0.5) }
  })
}

describe('the five bikes, worked by hand', () => {
  it('fit $448 less $24 a year', () => {
    // Mean age 3, mean price 376; Σ(x−x̄)(y−ȳ) = −240 over Σ(x−x̄)² = 10
    expect(BEST.perYear).toBeCloseTo(-24, 10)
    expect(BEST.start).toBeCloseTo(448, 10)
    expect(priceAt(BEST, YOUR_AGE)).toBeCloseTo(376, 10)
  })

  it('miss by 36, 0, −36, −72 and 72', () => {
    misses(SALES, BEST).forEach((m, i) => expect(m).toBeCloseTo([36, 0, -36, -72, 72][i], 10))
  })

  it('score each guess line as worked by hand', () => {
    expect(sumOfSquares(SALES, THROUGH_FOUR)).toBe(180 * 180)
    expect(sumOfSquares(SALES, BEST)).toBeCloseTo(12960, 8)
    expect(sumOfSquares(SALES, RAISED)).toBe(4 * 36 * 36 + 144 * 144)
    expect(sumOfSquares(SALES, FLAT)).toBe(84 ** 2 + 24 ** 2 + 36 ** 2 + 96 ** 2 + 24 ** 2)
    expect(FLAT.start).toBe(376)
  })

  it('make B the best of the four, and even the flat line beats the line through the four', () => {
    const scores = CANDIDATES.map((c) => sumOfSquares(SALES, c.line))
    expect(Math.min(...scores)).toBe(scores[1])
    expect(sumOfSquares(SALES, FLAT)).toBeLessThan(sumOfSquares(SALES, THROUGH_FOUR))
  })

  it('under absolute error would keep the line through the four instead', () => {
    expect(sumOfMisses(SALES, THROUGH_FOUR)).toBe(180)
    expect(sumOfMisses(SALES, BEST)).toBeCloseTo(216, 8)
    const grid = gridBest(SALES, sumOfMisses, [300, 700, 2], [-100, 20, 1])
    expect(grid.score).toBeCloseTo(180, 6)
    expect(grid).toMatchObject({ start: 520, perYear: -60 })
  })

  it('solve the normal equations 5b + 15m = 1880 and 15b + 55m = 5400', () => {
    const x = SALES.map(row)
    const xt = transpose(x)
    expect(times(xt, x)).toEqual([
      [5, 15],
      [15, 55],
    ])
    expect(
      timesVector(
        xt,
        SALES.map((s) => s.price),
      ),
    ).toEqual([1880, 5400])
    const [b, m] = fit(
      x,
      SALES.map((s) => s.price),
    )!
    expect(b).toBeCloseTo(448, 9)
    expect(m).toBeCloseTo(-24, 9)
  })

  it('have the story’s search start at the four’s line and stop at the best', () => {
    expect(SEARCH[0]).toBe(THROUGH_FOUR)
    expect(searchAt(0)).toEqual(THROUGH_FOUR)
    expect(searchAt(1).start).toBeCloseTo(BEST.start, 10)
    expect(searchAt(1).perYear).toBeCloseTo(BEST.perYear, 10)
  })

  it('score the quick check: one $300 miss counts more than five $100 misses', () => {
    expect(squaredTotal(ONE_BIG)).toBe(90000)
    expect(squaredTotal(FIVE_SMALL)).toBe(50000)
    expect(absoluteTotal(ONE_BIG)).toBeLessThan(absoluteTotal(FIVE_SMALL))
  })
})

describe('the least-squares line', () => {
  it('matches the bottom of a brute-force grid on seeded random sales', () => {
    const random = seeded(7)
    for (let trial = 0; trial < 20; trial++) {
      const sales = randomSales(random, 8)
      const line = fitLine(sales)!
      const ours = sumOfSquares(sales, line)
      const grid = gridBest(
        sales,
        sumOfSquares,
        [Math.round(line.start) - 30, Math.round(line.start) + 30, 0.5],
        [Math.round(line.perYear) - 6, Math.round(line.perYear) + 6, 0.05],
      )
      // No line on the grid beats it, and the grid's best is right beside it
      expect(grid.score).toBeGreaterThanOrEqual(ours - 1e-6)
      expect(Math.abs(grid.start - line.start)).toBeLessThan(1)
      expect(Math.abs(grid.perYear - line.perYear)).toBeLessThan(0.1)
    }
  })

  it('gets worse whichever way it is nudged', () => {
    const random = seeded(11)
    for (let trial = 0; trial < 50; trial++) {
      const sales = randomSales(random, 6)
      const line = fitLine(sales)!
      const ours = sumOfSquares(sales, line)
      const angle = 2 * Math.PI * random()
      const nudged = {
        start: line.start + Math.cos(angle),
        perYear: line.perYear + 0.1 * Math.sin(angle),
      }
      expect(sumOfSquares(sales, nudged)).toBeGreaterThan(ours)
    }
  })

  it('leaves misses that add to zero, and to zero once weighted by age', () => {
    const random = seeded(13)
    for (let trial = 0; trial < 50; trial++) {
      const sales = randomSales(random, 3 + Math.floor(10 * random()))
      const m = misses(sales, fitLine(sales)!)
      expect(m.reduce((s, v) => s + v, 0)).toBeCloseTo(0, 6)
      expect(m.reduce((s, v, i) => s + v * sales[i].age, 0)).toBeCloseTo(0, 5)
    }
  })

  it('has no answer when every sale is the same age', () => {
    expect(
      fitLine([
        { age: 2, price: 100 },
        { age: 2, price: 300 },
      ]),
    ).toBeNull()
    expect(fitLine([{ age: 2, price: 100 }])).toBeNull()
  })
})

describe('several features', () => {
  it('agrees with the one-feature formula when the features are a 1 and the age', () => {
    const random = seeded(17)
    for (let trial = 0; trial < 20; trial++) {
      const sales = randomSales(random, 7)
      const line = fitLine(sales)!
      const [start, perYear] = fit(
        sales.map(row),
        sales.map((s) => s.price),
      )!
      expect(start).toBeCloseTo(line.start, 6)
      expect(perYear).toBeCloseTo(line.perYear, 6)
    }
  })

  it('leaves a residual perpendicular to every feature column: Xᵀr ≈ 0', () => {
    const random = seeded(19)
    for (let trial = 0; trial < 50; trial++) {
      const d = 2 + Math.floor(3 * random())
      const n = d + 2 + Math.floor(10 * random())
      const x = Array.from({ length: n }, () => [1, ...Array.from({ length: d - 1 }, () => 10 * random() - 5)])
      const y = Array.from({ length: n }, () => 20 * random() - 10)
      const w = fit(x, y)!
      const r = residual(x, y, w)
      for (const v of timesVector(transpose(x), r)) expect(v).toBeCloseTo(0, 7)
    }
  })

  it('finds the weights exactly when the data has no noise', () => {
    const random = seeded(23)
    const truth = [3, -2, 0.5, 4]
    const x = Array.from({ length: 12 }, () => [1, random(), random(), random()])
    const y = timesVector(x, truth)
    fit(x, y)!.forEach((w, i) => expect(w).toBeCloseTo(truth[i], 8))
  })

  it('beats every random nearby set of weights', () => {
    const random = seeded(29)
    const x = Array.from({ length: 15 }, () => [1, random(), random()])
    const y = Array.from({ length: 15 }, () => random())
    const w = fit(x, y)!
    const score = (v: number[]) => residual(x, y, v).reduce((s, r) => s + r * r, 0)
    for (let trial = 0; trial < 200; trial++) {
      const nudged = w.map((value) => value + 0.2 * (random() - 0.5))
      expect(score(nudged)).toBeGreaterThanOrEqual(score(w))
    }
  })

  it('has no answer when one feature copies another', () => {
    const x = [
      [1, 1, 2],
      [1, 2, 4],
      [1, 3, 6],
      [1, 4, 8],
    ]
    expect(fit(x, [1, 2, 3, 5])).toBeNull()
  })
})
