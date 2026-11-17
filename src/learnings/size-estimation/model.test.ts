import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  andError,
  andSize,
  byMonth,
  capDistinct,
  CARS_ACTUAL,
  CARS_ESTIMATE,
  CITY_SIZE,
  CLIP_JOIN,
  COLOURS_BY_MIN,
  COLOURS_JOIN,
  compare,
  dayOf,
  distinctOf,
  equalitySize,
  errorFactor,
  formatFactor,
  formatRows,
  GUESS_JOIN,
  HOST_DAYS,
  isPisces,
  joinCount,
  joinCountByPairs,
  joinedDistinct,
  joinSize,
  lab,
  makeTable,
  monthOf,
  multiJoinSize,
  NEIGHBOUR_DAYS,
  notEqualSize,
  orSize,
  pairJoinError,
  pairsSharing,
  PLAN_ERROR,
  productSize,
  rangeSize,
  STORY,
  TWO_RANGES,
  WRONG_WAY,
} from './model'

describe('the rules, on numbers worked by hand', () => {
  it('keeps one row in V for a = c', () => {
    expect(equalitySize(2_000, 40)).toBe(50)
    expect(equalitySize(1_000_000, 500)).toBe(2_000)
  })

  it('keeps a third for a range, and all but one in V for ≠', () => {
    expect(rangeSize(3_000)).toBe(1_000)
    expect(notEqualSize(1_000, 4)).toBe(750)
  })

  it('multiplies the fractions for AND', () => {
    expect(andSize(10_000, 1 / 50, 1 / 100)).toBeCloseTo(2)
    expect(andSize(600)).toBe(600)
  })

  it('takes away the rows that fail both for OR', () => {
    // 1,000 rows; one condition keeps 100, the other 200: 1000(1 − 0.9 × 0.8)
    expect(orSize(1_000, 100, 200)).toBeCloseTo(280)
    // Never more than all the rows
    expect(orSize(1_000, 1_000, 500)).toBeCloseTo(1_000)
  })

  it('pairs everything for a product, and divides by the larger V for a join', () => {
    expect(productSize(300, 20)).toBe(6_000)
    expect(joinSize(1_000, 20_000, 100, 400)).toBe(50_000)
    expect(joinSize(1_000, 20_000, 400, 100)).toBe(50_000)
  })

  it('divides once per column for a join on several', () => {
    expect(multiJoinSize(10_000, 5_000, [[100, 200], [50, 10]])).toBe(5_000)
    expect(multiJoinSize(10_000, 5_000, [[100, 200]])).toBe(joinSize(10_000, 5_000, 100, 200))
  })

  it('keeps the bookkeeping straight', () => {
    expect(capDistinct(500, 2_000)).toBe(500)
    expect(capDistinct(500, 50)).toBe(50)
    expect(joinedDistinct(800, 1_000)).toBe(800)
  })
})

describe('the numbers the page states', () => {
  it('guesses 10,000 rows for orders and customers', () => {
    expect(GUESS_JOIN).toBe(10_000)
  })

  it('has the clip land on 10,000 too, and the wrong way on 12,500', () => {
    expect(CLIP_JOIN).toBe(10_000)
    expect(WRONG_WAY).toBe(12_500)
  })

  it('works the three numbers', () => {
    expect(CITY_SIZE).toBe(2_000)
    expect(Math.round(TWO_RANGES)).toBe(666_802)
    expect(PLAN_ERROR).toBe(1_000)
  })

  it('has the quick check’s cars off by the number of makes', () => {
    expect(CARS_ESTIMATE).toBeCloseTo(31.25)
    expect(CARS_ACTUAL).toBe(1_250)
    expect(CARS_ACTUAL / CARS_ESTIMATE).toBeCloseTo(40)
  })

  it('has the colours join at 120,000, and 600,000 by the smaller V', () => {
    expect(COLOURS_JOIN).toBe(120_000)
    expect(COLOURS_BY_MIN).toBe(600_000)
  })
})

describe('the parties', () => {
  it('counts days and months of a 365-day year', () => {
    expect(dayOf(0, 1)).toBe(0)
    expect(dayOf(2, 1)).toBe(59)
    expect(monthOf(0)).toBe(0)
    expect(monthOf(58)).toBe(1)
    expect(monthOf(59)).toBe(2)
    expect(monthOf(364)).toBe(11)
  })

  it('has Pisces from 19 February to 20 March', () => {
    expect(isPisces(dayOf(1, 18))).toBe(false)
    expect(isPisces(dayOf(1, 19))).toBe(true)
    expect(isPisces(dayOf(2, 20))).toBe(true)
    expect(isPisces(dayOf(2, 21))).toBe(false)
  })

  it('counts pairs as the brute force does', () => {
    let pairs = 0
    for (const x of HOST_DAYS) for (const y of NEIGHBOUR_DAYS) if (monthOf(x) === monthOf(y)) pairs += 1
    expect(pairsSharing(HOST_DAYS, NEIGHBOUR_DAYS)).toBe(pairs)
  })

  it('tells the story’s numbers', () => {
    expect(STORY.marchGuess).toBe(5)
    expect(STORY.march).toBe(5)
    expect(STORY.pairsGuess).toBe(200)
    expect(STORY.pairs).toBe(201)
    expect(STORY.piscesGuess).toBeCloseTo(0.42, 2)
    expect(STORY.pisces).toBe(3)
    expect(STORY.piscesExpected).toBeCloseTo(3.3, 1)
    expect(byMonth(HOST_DAYS).reduce((a, b) => a + b)).toBe(60)
  })

  it('stacks no month higher than the drawing has room for', () => {
    expect(Math.max(...byMonth(HOST_DAYS))).toBeLessThanOrEqual(8)
    expect(Math.max(...byMonth(NEIGHBOUR_DAYS))).toBeLessThanOrEqual(6)
  })

  it('lands on the guesses on average over many parties', () => {
    const random = seeded(7)
    let march = 0
    let pairs = 0
    const trials = 4_000
    for (let i = 0; i < trials; i++) {
      const a = Array.from({ length: 60 }, () => Math.floor(random() * 365))
      const b = Array.from({ length: 40 }, () => Math.floor(random() * 365))
      march += byMonth(a)[2]
      pairs += pairsSharing(a, b)
    }
    // Months are not quite equal (31 days for March), so within a few percent
    expect(march / trials / STORY.marchGuess).toBeCloseTo(1, 1)
    expect(pairs / trials / STORY.pairsGuess).toBeCloseTo(1, 1)
  })
})

describe('the lab', () => {
  it('counts joins as every pair does', () => {
    const random = seeded(11)
    for (let trial = 0; trial < 30; trial++) {
      const v = 1 + Math.floor(random() * 8)
      const rho = random()
      const r = makeTable(random, 1 + Math.floor(random() * 60), v, rho)
      const s = makeTable(random, 1 + Math.floor(random() * 60), v, rho)
      expect(joinCount(r, s, (row) => row.a)).toBe(joinCountByPairs(r, s, (x, y) => x.a === y.a))
      expect(joinCount(r, s, (row) => `${row.a},${row.b}`)).toBe(joinCountByPairs(r, s, (x, y) => x.a === y.a && x.b === y.b))
    }
  })

  it('makes tables of the size and number of values asked for', () => {
    const rows = makeTable(seeded(3), 10_000, 20, 0.5)
    expect(rows).toHaveLength(10_000)
    expect(distinctOf(rows, 'a')).toBe(20)
    expect(distinctOf(rows, 'b')).toBe(20)
  })

  it('copies a into b in the share of rows the correlation asks', () => {
    for (const rho of [0, 0.5, 1]) {
      const rows = makeTable(seeded(4), 20_000, 50, rho)
      const same = rows.filter((row) => row.a === row.b).length / rows.length
      // b also matches a by chance, 1 time in 50
      expect(same).toBeCloseTo(rho + (1 - rho) / 50, 1)
    }
  })

  // Average over many seeds: estimate and truth agree in expectation
  const average = (distinct: number, correlation: number, seeds: number) => {
    const sums = [0, 0, 0, 0].map(() => ({ estimate: 0, actual: 0 }))
    for (let seed = 1; seed <= seeds; seed++) {
      lab(distinct, correlation, seed).forEach((c, i) => {
        sums[i].estimate += c.estimate
        sums[i].actual += c.actual
      })
    }
    return sums.map(({ estimate, actual }) => actual / estimate)
  }

  it('estimates right on average when the columns are uniform and independent', () => {
    for (const ratio of average(20, 0, 150)) {
      expect(ratio).toBeGreaterThan(0.93)
      expect(ratio).toBeLessThan(1.07)
    }
  })

  it('falls short on AND and the two-column join as the correlation rises, as the page says', () => {
    const v = 20
    const ratios = [0, 0.5, 1].map((rho) => average(v, rho, 120))
    for (const [i, rho] of [0, 0.5, 1].entries()) {
      // One value and the join on a don't care about b
      expect(ratios[i][0]).toBeCloseTo(1, 0)
      expect(ratios[i][2]).toBeCloseTo(1, 0)
      expect(ratios[i][1] / andError(v, rho)).toBeGreaterThan(0.9)
      expect(ratios[i][1] / andError(v, rho)).toBeLessThan(1.1)
      expect(ratios[i][3] / pairJoinError(v, rho)).toBeGreaterThan(0.9)
      expect(ratios[i][3] / pairJoinError(v, rho)).toBeLessThan(1.1)
    }
    // Growing with the correlation
    expect(ratios[1][1]).toBeGreaterThan(ratios[0][1] * 5)
    expect(ratios[2][1]).toBeGreaterThan(ratios[1][1] * 1.5)
  })

  it('is V times too small when b always follows a', () => {
    expect(andError(20, 1)).toBe(20)
    expect(andError(50, 1)).toBe(50)
    expect(andError(50, 0)).toBe(1)
    expect(pairJoinError(50, 1)).toBeCloseTo(50)
    expect(pairJoinError(50, 0)).toBeCloseTo(1)
    // The figure at its opening setting
    const [, and, , pair] = lab(20, 1, 1)
    expect(and.actual / and.estimate).toBeGreaterThan(15)
    expect(pair.actual / pair.estimate).toBeGreaterThan(15)
  })

  it('measures V from the rows it was given', () => {
    const r = [
      { a: 0, b: 0 },
      { a: 0, b: 1 },
      { a: 1, b: 1 },
    ]
    const s = [
      { a: 0, b: 1 },
      { a: 2, b: 1 },
    ]
    const [one, both, onA, onAB] = compare(r, s)
    expect(one).toMatchObject({ estimate: 1.5, actual: 2 })
    expect(both).toMatchObject({ estimate: 0.75, actual: 1 })
    expect(onA).toMatchObject({ estimate: 3, actual: 2 })
    // 6 pairs, over max(2, 2) for a and max(2, 1) for b
    expect(onAB).toMatchObject({ estimate: 1.5, actual: 1 })
  })
})

describe('the figures’ words', () => {
  it('reads rows', () => {
    expect(formatRows(0)).toBe('0')
    expect(formatRows(0.4166)).toBe('0.4')
    expect(formatRows(31.25)).toBe('31')
    expect(formatRows(666_801.67)).toBe('666,802')
  })

  it('reads how far off an estimate is', () => {
    expect(errorFactor({ name: '', estimate: 10, actual: 200 })).toBe(20)
    expect(errorFactor({ name: '', estimate: 200, actual: 10 })).toBe(-20)
    expect(errorFactor({ name: '', estimate: 1, actual: 0 })).toBeNull()
    expect(formatFactor(20)).toBe('20× too small')
    expect(formatFactor(-2.5)).toBe('2.5× too big')
    expect(formatFactor(1.2)).toBe('about right')
    expect(formatFactor(null)).toBe('—')
  })
})
