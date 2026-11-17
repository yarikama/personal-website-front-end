import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  at,
  BLUE,
  CAR_NEAREST,
  COLA_RAW,
  COLA_SQUEEZED,
  cosine,
  COUNTS,
  countMatrix,
  dot,
  FACTORED,
  frobenius,
  IDF_WORKED,
  keptShare,
  multiply,
  norm,
  PAIRS,
  rawSimilarity,
  RED,
  SENTENCES,
  SHARED_RECEIPTS,
  SHOP,
  similarity,
  svd,
  TFIDF,
  transpose,
  truncate,
  VOCAB,
  wordVectors,
  WORKED,
  type Matrix,
} from './model'

const randomMatrix = (random: () => number, m: number, n: number): Matrix =>
  Array.from({ length: m }, () => Array.from({ length: n }, () => Math.round(10 * (2 * random() - 1)) / 4))

const minus = (a: Matrix, b: Matrix): Matrix => a.map((row, i) => row.map((x, j) => x - b[i][j]))

// A reference that shares nothing with Jacobi: the top singular value is the
// square root of the top eigenvalue of CᵀC, found by power iteration
function topByPowerIteration(C: Matrix, random: () => number): number {
  const G = multiply(transpose(C), C)
  let v = G.map(() => random() + 0.1)
  let value = 0
  for (let round = 0; round < 20000; round++) {
    const next = G.map((row) => dot(row, v))
    const length = norm(next)
    if (length < 1e-300) return 0
    value = length / norm(v)
    v = next.map((x) => x / length)
  }
  return Math.sqrt(value)
}

describe('the cosine', () => {
  it('matches hand-worked cases', () => {
    expect(cosine([1, 0], [0, 1])).toBe(0)
    expect(cosine([1, 1], [1, 0])).toBeCloseTo(Math.SQRT1_2, 12)
    expect(cosine([3, 4], [6, 8])).toBeCloseTo(1, 12)
    expect(cosine([1, 2, 0], [2, 1, 1])).toBeCloseTo(4 / (Math.sqrt(5) * Math.sqrt(6)), 12)
  })

  it('ignores length, and is undefined for a row of zeros', () => {
    const random = seeded(3)
    for (let trial = 0; trial < 100; trial++) {
      const a = [random(), random(), random()]
      const b = [random(), random(), random()]
      expect(cosine(a.map((x) => 7 * x), b)).toBeCloseTo(cosine(a, b), 12)
    }
    expect(cosine([0, 0], [1, 2])).toBeNaN()
  })
})

describe('the SVD', () => {
  it('matches the 2 × 2 and 3 × 2 examples worked by hand', () => {
    expect(svd([[1, 2], [3, 4]]).values.map((s) => +s.toFixed(2))).toEqual([5.46, 0.37])
    expect(svd([[1, 2], [3, 4], [5, 6]]).values.map((s) => +s.toFixed(2))).toEqual([9.53, 0.51])
  })

  it('moves the table by exactly the singular value it drops', () => {
    const C = [[1, 2], [3, 4]]
    const f = svd(C)
    const withoutSecond = truncate(f, 1)
    const withoutFirst = [0, 1].map((i) => [0, 1].map((j) => f.values[1] * f.U[1][i] * f.V[1][j]))
    expect(frobenius(minus(C, withoutSecond))).toBeCloseTo(f.values[1], 12)
    expect(frobenius(minus(C, withoutFirst))).toBeCloseTo(f.values[0], 12)
  })

  it('matches the closed form for 2 × 2 matrices', () => {
    const random = seeded(11)
    for (let trial = 0; trial < 300; trial++) {
      const C = randomMatrix(random, 2, 2)
      const [[a, b], [c, d]] = C
      // σ² are the eigenvalues of CᵀC: (T ± √(T² − 4D)) / 2
      const T = a * a + b * b + c * c + d * d
      const D = (a * d - b * c) ** 2
      const r = Math.sqrt(Math.max(0, T * T - 4 * D))
      const values = svd(C).values
      expect(values[0]).toBeCloseTo(Math.sqrt((T + r) / 2), 9)
      expect(values[1]).toBeCloseTo(Math.sqrt(Math.max(0, (T - r) / 2)), 6)
    }
  })

  it('rebuilds random matrices, with unit vectors at right angles, largest first', () => {
    const random = seeded(2026)
    for (let trial = 0; trial < 200; trial++) {
      const m = 1 + Math.floor(random() * 8)
      const n = 1 + Math.floor(random() * 8)
      const C = randomMatrix(random, m, n)
      const f = svd(C)
      expect(frobenius(minus(C, truncate(f, n)))).toBeLessThan(1e-9)
      for (let i = 0; i < n; i++) {
        if (i) expect(f.values[i]).toBeLessThanOrEqual(f.values[i - 1] + 1e-12)
        expect(f.values[i]).toBeGreaterThanOrEqual(0)
        for (let j = 0; j < n; j++) expect(dot(f.V[i], f.V[j])).toBeCloseTo(i === j ? 1 : 0, 9)
      }
      // All the strength there is: Σσ² is the sum of every entry squared
      expect(f.values.reduce((s, x) => s + x * x, 0)).toBeCloseTo(frobenius(C) ** 2, 8)
      // No more than min(m, n) of them are non-zero
      expect(f.values.filter((s) => s > 1e-9).length).toBeLessThanOrEqual(Math.min(m, n))
    }
  })

  it('finds the same top singular value as power iteration', () => {
    const random = seeded(77)
    for (let trial = 0; trial < 60; trial++) {
      const C = randomMatrix(random, 2 + Math.floor(random() * 6), 2 + Math.floor(random() * 6))
      expect(svd(C).values[0]).toBeCloseTo(topByPowerIteration(C, random), 5)
    }
  })

  it('keeps the closest rank-k table: closer than any other k directions tried', () => {
    const random = seeded(5)
    for (let trial = 0; trial < 60; trial++) {
      const n = 3 + Math.floor(random() * 4)
      const C = randomMatrix(random, 2 + Math.floor(random() * 6), n)
      const f = svd(C)
      const k = 1 + Math.floor(random() * (n - 1))
      const error = frobenius(minus(C, truncate(f, k)))
      // Its error is the dropped singular values, squared and added
      expect(error ** 2).toBeCloseTo(f.values.slice(k).reduce((s, x) => s + x * x, 0), 8)
      // Projecting the rows onto k other directions (made orthonormal) does no better
      for (let attempt = 0; attempt < 20; attempt++) {
        const basis: number[][] = []
        while (basis.length < k) {
          let v = Array.from({ length: n }, () => 2 * random() - 1)
          for (const u of basis) v = v.map((x, j) => x - dot(v, u) * u[j])
          const length = norm(v)
          if (length > 1e-6) basis.push(v.map((x) => x / length))
        }
        const projected = C.map((row) => row.map((_, j) => basis.reduce((s, u) => s + dot(row, u) * u[j], 0)))
        expect(frobenius(minus(C, projected))).toBeGreaterThanOrEqual(error - 1e-9)
      }
    }
  })

  it('gives word vectors W = CV_k equal to U_k Σ_k', () => {
    const random = seeded(9)
    for (let trial = 0; trial < 50; trial++) {
      const C = randomMatrix(random, 5, 4)
      const f = svd(C)
      const W = wordVectors(C, 2, f)
      W.forEach((row, i) => row.forEach((x, l) => expect(x).toBeCloseTo(f.values[l] * f.U[l][i], 9)))
    }
  })
})

describe('the story’s receipts', () => {
  it('never puts the two colas on one receipt, so their rows score 0', () => {
    expect(SHOP[RED]).toEqual([1, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 1])
    expect(SHOP[BLUE]).toEqual([0, 2, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0])
    expect(SHARED_RECEIPTS).toBe(0)
    expect(COLA_RAW).toBe(0)
  })

  it('puts them almost on one line once squeezed to two numbers', () => {
    expect(COLA_SQUEEZED).toBeCloseTo(0.975, 3)
  })
})

describe('the twelve sentences', () => {
  it('counts each word by hand', () => {
    expect(COUNTS[at('car')]).toEqual([1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0])
    expect(COUNTS[at('automobile')]).toEqual([0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0])
    expect(COUNTS[at('the')]).toEqual([1, 2, 2, 1, 2, 2, 1, 1, 2, 2, 1, 1])
    expect(countMatrix(['A cat, a hat.'], ['a', 'cat'])).toEqual([[2], [1]])
    // Every counted word is in some sentence
    for (const row of COUNTS) expect(row.some((x) => x > 0)).toBe(true)
  })

  it('gives car and automobile no sentence in common', () => {
    expect(rawSimilarity('Counts', 'car', 'automobile')).toBe(0)
    expect(CAR_NEAREST.word).toBe('the')
    expect(CAR_NEAREST.value).toBeCloseTo(0.53, 2)
  })

  it('weights by idf = ln(N / df)', () => {
    expect(IDF_WORKED.map((w) => w.df)).toEqual([12, 3, 2])
    expect(IDF_WORKED[0].value).toBe(0)
    expect(IDF_WORKED[1].value).toBeCloseTo(Math.log(4), 12)
    expect(IDF_WORKED[2].value).toBeCloseTo(Math.log(6), 12)
    expect(TFIDF[at('the')].every((x) => x === 0)).toBe(true)
    expect(TFIDF[at('car')][0]).toBeCloseTo(Math.log(4), 12)
  })

  it('works the page’s numbers: every pair 1 at k = 1, 0.98 at k = 2, the raw rows again at all 12', () => {
    expect(WORKED.map((w) => +w.value.toFixed(2))).toEqual([1, 0.98, 0])
    expect(WORKED.map((w) => Math.round(100 * w.kept))).toEqual([57, 68, 100])
  })

  it('makes every pair point the same way with one layer of a table with no negatives', () => {
    for (const [a, b] of PAIRS) {
      expect(similarity('Counts', 1, a, b)).toBeCloseTo(1, 9)
      if (a !== 'the' && b !== 'the') expect(similarity('TF-IDF', 1, a, b)).toBeCloseTo(1, 9)
    }
  })

  it('gives back the raw cosines when every layer is kept', () => {
    for (const weighting of ['Counts', 'TF-IDF'] as const)
      for (const a of VOCAB)
        for (const b of VOCAB) {
          const raw = rawSimilarity(weighting, a, b)
          const kept = similarity(weighting, SENTENCES.length, a, b)
          if (Number.isNaN(raw)) expect(kept).toBeNaN()
          else expect(kept).toBeCloseTo(raw, 9)
        }
  })

  it('gives car the two numbers the clip shows', () => {
    expect(FACTORED.Counts.vectors[1][at('car')].map((x) => +x.toFixed(2))).toEqual([0.92, -0.51])
  })

  it('keeps what the share says', () => {
    const f = FACTORED.Counts.factors
    expect(keptShare(f.values, SENTENCES.length)).toBeCloseTo(1, 12)
    const k = 3
    const left = frobenius(minus(COUNTS, truncate(f, k))) ** 2
    expect(1 - left / frobenius(COUNTS) ** 2).toBeCloseTo(keptShare(f.values, k), 9)
  })
})
