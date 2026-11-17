import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  als,
  cells,
  club,
  count,
  FILMS,
  filled,
  FRIENDS,
  GUESS,
  LAB,
  LAB_OVERFIT,
  LAB_START,
  labRun,
  NETFLIX,
  normal,
  objective,
  observe,
  parameters,
  planted,
  rating,
  recover,
  rmse,
  SIZES,
  solve,
  SONGS,
  STORY,
  STORY_MASK,
  STORY_ROUNDS,
  storyFit,
  type Grid,
} from './model'

const grid = (rows: number[][]): Grid => ({ m: rows.length, n: rows[0].length, values: Float64Array.from(rows.flat()) })

describe('solving a small system', () => {
  it('solves one worked by hand', () => {
    // 2x + y = 5, x + 3y = 10 → x = 1, y = 3
    const x = solve([2, 1, 1, 3], [5, 10], 2)
    expect(x[0]).toBeCloseTo(1, 12)
    expect(x[1]).toBeCloseTo(3, 12)
  })

  it('needs a pivot when the first entry is zero', () => {
    const x = solve([0, 1, 1, 0], [2, 7], 2)
    expect(Array.from(x)).toEqual([7, 2])
  })

  it('gives back b when multiplied out, for random systems', () => {
    const random = seeded(4)
    for (let trial = 0; trial < 200; trial++) {
      const k = 1 + Math.floor(random() * 8)
      const a = Array.from({ length: k * k }, () => normal(random))
      for (let p = 0; p < k; p++) a[p * k + p] += k // keep it well conditioned
      const b = Array.from({ length: k }, () => normal(random))
      const x = solve(a, b, k)
      for (let p = 0; p < k; p++) {
        let s = 0
        for (let q = 0; q < k; q++) s += a[p * k + q] * x[q]
        expect(s).toBeCloseTo(b[p], 9)
      }
    }
  })
})

describe('counting', () => {
  it('a million cells against ten thousand numbers at rank 5', () => {
    expect(cells(1000, 1000)).toBe(1_000_000)
    expect(parameters(1000, 1000, 5)).toBe(10_000)
  })

  it('the story: 20 cells, 18 numbers', () => {
    const [story] = SIZES
    expect(cells(story.users, story.movies)).toBe(20)
    expect(parameters(story.users, story.movies, story.k)).toBe(18)
  })

  it('the Netflix Prize at rank 50', () => {
    expect(cells(NETFLIX.users, NETFLIX.movies)).toBe(8_532_958_530)
    expect(parameters(NETFLIX.users, NETFLIX.movies, 50)).toBe(24_897_950)
    // About 1.2% of the grid was rated, about 0.3% of it is numbers to fit
    expect(NETFLIX.ratings / cells(NETFLIX.users, NETFLIX.movies)).toBeCloseTo(0.0118, 4)
    expect(parameters(NETFLIX.users, NETFLIX.movies, 50) / cells(NETFLIX.users, NETFLIX.movies)).toBeCloseTo(0.0029, 4)
  })

  it('check yourself: 500 listeners, 400 songs, 4 tastes', () => {
    expect(parameters(SONGS.listeners, SONGS.songs, SONGS.k)).toBe(3600)
    expect(cells(SONGS.listeners, SONGS.songs)).toBe(200_000)
  })
})

describe('the story', () => {
  it('rates films by hand', () => {
    const [ana, ben, cy] = FRIENDS
    const paris = FILMS[3]
    expect(rating(ana, FILMS[0])).toBe(5)
    expect(rating(ana, FILMS[4])).toBe(1)
    expect(rating(ana, paris)).toBe(2) // ¼ × 5 + ¾ × 1
    expect(rating(ben, FILMS[1])).toBe(2)
    expect(rating(cy, paris)).toBe(2.5)
  })

  it('sees 15 of 20, with every friend and film seen at least twice', () => {
    expect(count(STORY_MASK)).toBe(15)
    for (let i = 0; i < STORY.m; i++) {
      let seen = 0
      for (let j = 0; j < STORY.n; j++) seen += STORY_MASK[i * STORY.n + j]
      expect(seen).toBeGreaterThanOrEqual(2)
    }
    for (let j = 0; j < STORY.n; j++) {
      let seen = 0
      for (let i = 0; i < STORY.m; i++) seen += STORY_MASK[i * STORY.n + j]
      expect(seen).toBeGreaterThanOrEqual(2)
    }
  })

  it('fills every blank to its true rating by the last round', () => {
    const fit = storyFit()
    expect(fit.trace).toHaveLength(STORY_ROUNDS + 1)
    const last = fit.trace[STORY_ROUNDS]
    for (let c = 0; c < STORY.values.length; c++) expect(Math.abs(last[c] - STORY.values[c])).toBeLessThan(0.05)
  })

  it('fills the blanks the same from other starts too', () => {
    for (const seed of [1, 3, 4, 6, 9, 11]) {
      const fit = als(STORY, STORY_MASK, 2, { lambda: 0.001, sweeps: 60, seed, start: 'random', centre: false })
      expect(rmse(filled(fit, STORY.m, STORY.n), STORY.values, STORY_MASK, 0)).toBeLessThan(0.05)
    }
  })
})

describe('alternating least squares', () => {
  it('never raises what it lowers, sweep by sweep', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const { ratings } = planted(30, 25, 3, seed, { noise: 0.2 })
      for (const share of [0.15, 0.4, 0.8])
        for (const k of [1, 3, 6])
          for (const lambda of [0.01, 0.3, 3])
            for (const start of ['random', 'spectral'] as const) {
              const fit = als(ratings, observe(30, 25, share, seed + 10), k, { lambda, sweeps: 15, seed, start })
              for (let s = 1; s < fit.history.length; s++)
                expect(fit.history[s]).toBeLessThanOrEqual(fit.history[s - 1] * (1 + 1e-9) + 1e-9)
            }
    }
  })

  it('reports the objective it was fitting', () => {
    const { ratings } = planted(12, 10, 2, 8, { noise: 0.1 })
    const seen = observe(12, 10, 0.6, 3)
    const fit = als(ratings, seen, 2, { lambda: 0.5, sweeps: 5 })
    expect(objective(ratings, seen, fit, 0.5)).toBeCloseTo(fit.history.at(-1)!, 9)
  })

  it('finds the best rank-1 fit of a full grid: [[3, 1], [1, 3]] → all 2s, error σ₂² = 4', () => {
    // With every cell seen, the best fit is the truncated SVD (Eckart–Young)
    const x = grid([
      [3, 1],
      [1, 3],
    ])
    const fit = als(x, Uint8Array.from([1, 1, 1, 1]), 1, { lambda: 0, sweeps: 200, start: 'random', centre: false, seed: 2 })
    const out = filled(fit, 2, 2)
    for (const v of out) expect(v).toBeCloseTo(2, 6)
    expect(fit.history.at(-1)).toBeCloseTo(4, 6)
  })

  it('fills the one blank of a rank-1 grid: 2, 4 / 1, ? → 2', () => {
    const y = grid([
      [2, 4],
      [1, 0],
    ])
    const fit = als(y, Uint8Array.from([1, 1, 1, 0]), 1, { lambda: 0, sweeps: 300, start: 'random', centre: false, seed: 5 })
    expect(filled(fit, 2, 2)[3]).toBeCloseTo(2, 3)
  })

  it('recovers a full grid of exact rank from every cell, at that rank', () => {
    // An average of 3 plus 3 tastes is rank 4 when nothing is taken off
    for (const seed of [1, 2, 3]) {
      const { truth } = planted(15, 12, 3, seed)
      const all = new Uint8Array(15 * 12).fill(1)
      const fit = als(truth, all, 4, { lambda: 0, sweeps: 100, seed, centre: false })
      expect(rmse(filled(fit, 15, 12), truth.values, all, 1)).toBeLessThan(1e-4)
    }
  })
})

describe('the guess: 1,000 × 1,000 at rank 5', () => {
  it(`fills the blanks from ${GUESS.enough * 100}% of the cells`, () => {
    const { seenCount, miss, spread } = recover(GUESS.users, GUESS.movies, GUESS.k, GUESS.enough)
    expect(seenCount).toBeGreaterThan(29_000)
    expect(seenCount).toBeLessThan(31_000)
    expect(spread).toBeGreaterThan(0.6)
    expect(miss).toBeLessThan(0.02)
  }, 20_000)

  it(`fails from ${GUESS.tooFew * 100}%, about as many cells as numbers to fit`, () => {
    const { seenCount, miss, spread } = recover(GUESS.users, GUESS.movies, GUESS.k, GUESS.tooFew)
    expect(Math.abs(seenCount - parameters(GUESS.users, GUESS.movies, GUESS.k))).toBeLessThan(500)
    expect(miss).toBeGreaterThan(spread)
  }, 20_000)

  it('the same holds on other seeded grids', () => {
    for (const seed of [8, 9]) {
      expect(recover(400, 400, 5, 0.08, seed).miss).toBeLessThan(0.05)
      const thin = recover(400, 400, 5, 0.02, seed)
      expect(thin.miss).toBeGreaterThan(0.5 * thin.spread)
    }
  }, 20_000)
})

describe('the film club', () => {
  it('fills the blanks far better than the average does', () => {
    const run = club()
    expect(run.seenCount).toBe(322)
    expect(run.miss).toBeLessThan(0.3)
    expect(run.missAverage).toBeGreaterThan(0.75)
  })
})

describe('the lab', () => {
  it('opens on a good fit: close on the hidden cells as on the seen', () => {
    const run = labRun(LAB_START.share, LAB_START.k, LAB_START.lambda)
    expect(run.missHidden).toBeLessThan(0.3)
    expect(run.missSeen).toBeLessThan(run.missHidden)
  })

  it('overfits with too high a rank and no penalty: the seen fit improves, the hidden gets worse', () => {
    const good = labRun(LAB_START.share, LAB_START.k, LAB_START.lambda)
    const over = labRun(LAB_OVERFIT.share, LAB_OVERFIT.k, LAB_OVERFIT.lambda)
    expect(over.missSeen).toBeLessThan(0.05)
    expect(over.missHidden).toBeGreaterThan(1.5 * good.missHidden)
    expect(over.numbers).toBeGreaterThan(over.seenCount)
  })

  it('underfits with too low a rank', () => {
    const under = labRun(LAB_START.share, 1, LAB_START.lambda)
    const good = labRun(LAB_START.share, LAB_START.k, LAB_START.lambda)
    expect(under.missSeen).toBeGreaterThan(2 * good.missSeen)
    expect(under.missHidden).toBeGreaterThan(good.missHidden)
  })

  it('cannot fill much from a tenth of the cells', () => {
    const thin = labRun(0.1, LAB.k, LAB_START.lambda)
    const good = labRun(LAB_START.share, LAB.k, LAB_START.lambda)
    expect(thin.missHidden).toBeGreaterThan(2.5 * good.missHidden)
  })

  it('does poorly at every rank from a fifth of the cells', () => {
    const good = labRun(LAB_START.share, LAB_START.k, LAB_START.lambda)
    for (let k = 1; k <= 8; k++) expect(labRun(0.2, k, LAB_START.lambda).missHidden).toBeGreaterThan(2 * good.missHidden)
  })

  it('sees more cells, and keeps the ones it saw, as the share grows', () => {
    const fewer = observe(LAB.size, LAB.size, 0.3, LAB.seenSeed)
    const more = observe(LAB.size, LAB.size, 0.6, LAB.seenSeed)
    for (let c = 0; c < fewer.length; c++) if (fewer[c]) expect(more[c]).toBe(1)
    expect(count(more)).toBeGreaterThan(count(fewer))
  })
})
