import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  alike,
  averageVariance,
  BAG_ROWS,
  BAG_SEED,
  bootstrap,
  BAGGING,
  counts,
  CROWDS,
  distinctShare,
  FOREST,
  growForest,
  growTree,
  GUESS,
  IN_BAG,
  makeData,
  measuredMiss,
  normal,
  predict,
  runFor,
  STORY,
  TESTING,
  TRAINING,
  typicalMiss,
  WORKED,
  type CrowdName,
} from './model'

describe('the variance of an average', () => {
  it('matches the worked numbers', () => {
    expect(averageVariance(0, 100)).toBeCloseTo(0.01, 12)
    expect(averageVariance(0.5, 100)).toBeCloseTo(0.505, 12)
    expect(averageVariance(0.1, 100)).toBeCloseTo(0.109, 12)
    expect(WORKED.map((w) => w.variance)).toEqual(WORKED.map((w) => w.floor + w.shrinks))
    expect(GUESS.variance).toBeCloseTo(0.505, 12)
  })

  it('is one tree’s variance for one tree, or for trees that always agree', () => {
    expect(averageVariance(0.3, 1, 4)).toBeCloseTo(4, 12)
    expect(averageVariance(1, 1000, 4)).toBeCloseTo(4, 12)
  })

  it('never falls below the floor ρσ², however many trees', () => {
    for (const trees of [1, 10, 100, 1e6]) expect(averageVariance(0.5, trees, 2)).toBeGreaterThanOrEqual(1)
    expect(averageVariance(0.5, 1e9, 2)).toBeCloseTo(1, 6)
  })

  it('matches a simulation of correlated predictions', () => {
    const random = seeded(11)
    const cases = [
      { rho: 0.5, trees: 100, variance: 1 },
      { rho: 0, trees: 10, variance: 2 },
      // and a few drawn at random
      ...Array.from({ length: 4 }, () => ({ rho: random(), trees: 1 + Math.floor(random() * 60), variance: 0.5 + 2 * random() })),
    ]
    for (const { rho, trees, variance } of cases) {
      const trials = 20000
      let sum = 0
      let squares = 0
      for (let t = 0; t < trials; t++) {
        // Each prediction: a part every tree shares, and its own
        const shared = Math.sqrt(rho * variance) * normal(random)
        let total = 0
        for (let b = 0; b < trees; b++) total += shared + Math.sqrt((1 - rho) * variance) * normal(random)
        const average = total / trees
        sum += average
        squares += average * average
      }
      const measured = squares / trials - (sum / trials) ** 2
      const expected = averageVariance(rho, trees, variance)
      expect(Math.abs(measured - expected) / expected).toBeLessThan(0.06)
    }
  })
})

describe('the bootstrap', () => {
  it('keeps 1 − (1 − 1/n)ⁿ of the rows, which heads to 1 − 1/e', () => {
    expect(distinctShare(1)).toBe(1)
    expect(distinctShare(2)).toBeCloseTo(0.75, 12)
    expect(distinctShare(20)).toBeCloseTo(0.6415, 4)
    expect(distinctShare(1e6)).toBeCloseTo(IN_BAG, 5)
    expect(IN_BAG).toBeCloseTo(0.632, 3)
  })

  it('holds that share of distinct rows when drawn', () => {
    const random = seeded(2)
    for (const n of [5, 20, 200]) {
      const trials = 3000
      let kept = 0
      for (let t = 0; t < trials; t++) kept += counts(bootstrap(random, n), n).filter((c) => c > 0).length / n
      expect(kept / trials).toBeCloseTo(distinctShare(n), 2)
    }
  })

  it('draws n rows, each one of the n', () => {
    const draws = bootstrap(seeded(1), 50)
    expect(draws).toHaveLength(50)
    for (const row of draws) expect(row >= 0 && row < 50 && Number.isInteger(row)).toBe(true)
  })

  it('keeps 13 of 20 rows in the page’s bag, as the share says to expect', () => {
    const kept = counts(bootstrap(seeded(BAG_SEED), BAG_ROWS), BAG_ROWS).filter((c) => c > 0).length
    expect(kept).toBe(13)
    expect(Math.round(distinctShare(BAG_ROWS) * BAG_ROWS)).toBe(13)
  })
})

describe('a regression tree', () => {
  it('splits a clean step once, halfway between the two sides', () => {
    const x = [[1], [2], [3], [4], [5], [6]]
    const y = [0, 0, 0, 5, 5, 5]
    const tree = growTree(x, y, [0, 1, 2, 3, 4, 5], 1, seeded(1))
    expect(tree).toEqual({ feature: 0, threshold: 3.5, left: { value: 0 }, right: { value: 5 } })
  })

  it('picks the feature that explains the target', () => {
    const x = [
      [0.9, 1],
      [0.1, 2],
      [0.5, 3],
      [0.3, 4],
    ]
    const tree = growTree(x, [1, 1, 7, 7], [0, 1, 2, 3], 2, seeded(1))
    expect('feature' in tree && tree.feature).toBe(1)
    expect(predict(tree, [0.2, 3.9])).toBe(7)
  })

  it('grown to single points, fits every distinct training point exactly', () => {
    const data = makeData(seeded(4), 60)
    const rows = data.y.map((_, i) => i)
    const tree = growTree(data.x, data.y, rows, data.x[0].length, seeded(1))
    data.x.forEach((x, i) => expect(predict(tree, x)).toBeCloseTo(data.y[i], 12))
  })

  it('stops at the leaf size', () => {
    const data = makeData(seeded(4), 60)
    const tree = growTree(data.x, data.y, data.y.map((_, i) => i), 9, seeded(1), 30)
    expect('feature' in tree).toBe(true)
    if ('feature' in tree) {
      expect('value' in tree.left && 'value' in tree.right).toBe(true)
    }
  })
})

describe('how alike the trees are', () => {
  it('gives the forest’s own error from the truth exactly as ρσ² + (1 − ρ)σ²/B', () => {
    const forest = growForest(TRAINING, 25, FOREST, 3)
    const test = { x: TESTING.x.slice(0, 300), f: TESTING.f.slice(0, 300) }
    const errors = forest.trees.map((tree) => test.x.map((x, i) => predict(tree, x) - test.f[i]))
    const { rho, variance } = alike(errors)
    const forestError =
      test.x.reduce((sum, _, i) => sum + (errors.reduce((s, e) => s + e[i], 0) / errors.length) ** 2, 0) / test.x.length
    expect(forestError).toBeCloseTo(averageVariance(rho, errors.length, variance), 10)
  })

  it('finds trees that make the same mistakes fully alike, and opposite ones unlike', () => {
    expect(alike([[1, -2, 3], [1, -2, 3]]).rho).toBeCloseTo(1, 12)
    expect(alike([[1, -2], [-1, 2]]).rho).toBeCloseTo(-1, 12)
    expect(alike([[1, 0], [0, 1]]).rho).toBeCloseTo(0, 12)
  })
})

describe('the lab', () => {
  const bagging = runFor(BAGGING)
  const forest = runFor(FOREST)
  const one = runFor(1)
  const last = (curve: number[]) => curve[curve.length - 1]

  it('averages to far less error than one tree', () => {
    expect(last(bagging.test)).toBeLessThan(0.6 * bagging.oneTree)
    expect(last(forest.test)).toBeLessThan(0.6 * forest.oneTree)
  })

  it('lets the forest beat bagging, with worse trees that are less alike', () => {
    expect(last(forest.test)).toBeLessThan(last(bagging.test) - 0.04)
    expect(forest.oneTree).toBeGreaterThan(bagging.oneTree)
    expect(forest.rho).toBeLessThan(bagging.rho - 0.05)
    expect(one.rho).toBeLessThan(forest.rho)
    // m = 1: the least alike, but too weak
    expect(last(one.test)).toBeGreaterThan(last(forest.test) + 0.05)
  })

  it('has bagged trees all split on a reading first, and fewer of the forest’s', () => {
    expect(bagging.readingFirst).toBe(1)
    expect(forest.readingFirst).toBeLessThan(0.85)
  })

  it('levels off at the floor ρσ² plus the noise', () => {
    for (const run of [bagging, forest]) {
      expect(Math.abs(last(run.test) - (run.rho * run.variance + 0.04))).toBeLessThan(0.04)
    }
  })

  it('has an out-of-bag error within a tenth of the test error from 50 trees on', () => {
    for (const run of [bagging, forest]) {
      for (let trees = 50; trees <= run.test.length; trees++) {
        expect(Math.abs(run.oob[trees - 1] - run.test[trees - 1])).toBeLessThan(0.1)
      }
    }
  })

  it('hardly changes after 100 trees', () => {
    for (const run of [bagging, forest]) expect(Math.abs(run.test[99] - last(run.test))).toBeLessThan(0.03)
  })
})

describe('the story', () => {
  it('lands each crowd’s miss near what the formula says', () => {
    for (const name of Object.keys(CROWDS) as CrowdName[]) {
      const measured = measuredMiss(STORY[name])
      expect(Math.abs(measured - typicalMiss(CROWDS[name])) / typicalMiss(CROWDS[name])).toBeLessThan(0.05)
    }
  })

  it('has each guess with the crowd’s spread, and the friends it says', () => {
    for (const name of Object.keys(CROWDS) as CrowdName[]) {
      expect(STORY[name][0].guesses).toHaveLength(CROWDS[name].friends)
    }
    expect(typicalMiss(CROWDS.apart)).toBeCloseTo(15, 9)
    expect(typicalMiss(CROWDS.trick)).toBeCloseTo(150 * Math.sqrt(0.505), 9)
  })
})
