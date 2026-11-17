// Fitting polynomials to a few noisy points from a smooth curve, and
// splitting the error on new points into bias², variance and noise.
//
// The setup the page uses throughout: the true curve is sin(2πx) on [0, 1],
// a sample is POINTS evenly spaced x's with y = the curve + noise of spread
// SIGMA, and a fit is the least-squares polynomial of a given degree. Every
// sample has the same x's and fresh noise, so the fit is a fixed linear
// function of the y's: that lets the exact bias and variance be worked out
// as well as measured by Monte Carlo.

import { seeded } from '../../components/explain/random'

// ---------------------------------------------------------------------------
// The setup

export const truth = (x: number) => Math.sin(2 * Math.PI * x)
export const SIGMA = 0.3
export const POINTS = 10
export const DEGREES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const
// The three the page compares: a line, a cubic, and one through every point
export const SIMPLE = 1
export const MIDDLE = 3
export const FLEXIBLE = 9

// `n` x's evenly spaced from 0 to 1, ends included
export const design = (n: number) => Array.from({ length: n }, (_, i) => i / (n - 1))

// Where new points are scored: evenly spread over [0, 1], so averaging over
// them is averaging over a new point's x
export const GRID = Array.from({ length: 201 }, (_, i) => i / 200)

// A standard normal draw from two uniform ones (Box–Muller)
export const normal = (random: () => number) => Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random())

// One sample's y's at `xs`: the curve plus noise
export const sampleYs = (xs: number[], random: () => number, sigma = SIGMA) => xs.map((x) => truth(x) + sigma * normal(random))

// ---------------------------------------------------------------------------
// Least squares for a polynomial

// The features of x: 1, t, t², … with t = 2x − 1 in [−1, 1], which keeps the
// columns far better conditioned than powers of x itself
export const features = (x: number, degree: number) => {
  const t = 2 * x - 1
  return Array.from({ length: degree + 1 }, (_, k) => t ** k)
}

// The least-squares coefficients for rows `a` and targets `b`, by
// Householder QR: no XᵀX, so a degree-9 fit through 10 points stays exact
export function leastSquares(a: number[][], b: number[]): number[] {
  const m = a.length
  const n = a[0].length
  const r = a.map((row) => [...row])
  const q = [...b]
  for (let k = 0; k < n; k++) {
    let norm = 0
    for (let i = k; i < m; i++) norm += r[i][k] ** 2
    norm = Math.sqrt(norm)
    if (norm === 0) continue
    const alpha = r[k][k] > 0 ? -norm : norm
    const v = Array.from({ length: m }, (_, i) => (i < k ? 0 : r[i][k]))
    v[k] -= alpha
    let vv = 0
    for (let i = k; i < m; i++) vv += v[i] ** 2
    if (vv === 0) continue
    // Reflect every column, and the targets
    for (let j = k; j < n; j++) {
      let dot = 0
      for (let i = k; i < m; i++) dot += v[i] * r[i][j]
      const s = (2 * dot) / vv
      for (let i = k; i < m; i++) r[i][j] -= s * v[i]
    }
    let dot = 0
    for (let i = k; i < m; i++) dot += v[i] * q[i]
    const s = (2 * dot) / vv
    for (let i = k; i < m; i++) q[i] -= s * v[i]
  }
  // Back substitution on the triangle
  const w = new Array<number>(n).fill(0)
  for (let k = n - 1; k >= 0; k--) {
    let sum = q[k]
    for (let j = k + 1; j < n; j++) sum -= r[k][j] * w[j]
    w[k] = sum / r[k][k]
  }
  return w
}

export type Fit = number[]

// The degree-`degree` polynomial closest to the points in squared error
export const fitPolynomial = (xs: number[], ys: number[], degree: number): Fit =>
  leastSquares(
    xs.map((x) => features(x, degree)),
    ys,
  )

export const evaluate = (fit: Fit, x: number) => {
  const t = 2 * x - 1
  let value = 0
  for (let k = fit.length - 1; k >= 0; k--) value = value * t + fit[k]
  return value
}

// Mean squared error of a fit on points
export const meanSquaredError = (fit: Fit, xs: number[], ys: number[]) =>
  xs.reduce((sum, x, i) => sum + (evaluate(fit, x) - ys[i]) ** 2, 0) / xs.length

// The fit to the noiseless points. Least squares is linear in the y's, so
// this is also the average of the fits over every possible sample
export const averageFit = (degree: number, n = POINTS): Fit => {
  const xs = design(n)
  return fitPolynomial(xs, xs.map(truth), degree)
}

// ---------------------------------------------------------------------------
// The exact split

export interface Terms {
  bias2: number
  variance: number
  noise: number
  // Expected squared error on a new point: the three added up
  test: number
  // Expected squared error on the sample's own points
  train: number
}

// The exact expected errors for one degree, sample size and noise. The fit
// at x is Σᵢ wᵢ(x) yᵢ for weights w that depend only on the x's (each wᵢ is
// the fit to the points with yᵢ = 1 and the rest 0), so its average is
// Σ wᵢ(x) h(xᵢ) and its variance σ² Σ wᵢ(x)².
export function exactTerms(degree: number, n = POINTS, sigma = SIGMA): Terms {
  const xs = design(n)
  const units = xs.map((_, i) => fitPolynomial(xs, xs.map((_, j) => (i === j ? 1 : 0)), degree))
  const mean = averageFit(degree, n)
  let bias2 = 0
  let variance = 0
  for (const x of GRID) {
    bias2 += (evaluate(mean, x) - truth(x)) ** 2
    variance += sigma ** 2 * units.reduce((sum, unit) => sum + evaluate(unit, x) ** 2, 0)
  }
  bias2 /= GRID.length
  variance /= GRID.length
  // On the sample's own points: residual = (I − H)(h + z)
  let train = 0
  xs.forEach((xj, j) => {
    train += (truth(xj) - evaluate(mean, xj)) ** 2
    train += sigma ** 2 * units.reduce((sum, unit, i) => sum + ((i === j ? 1 : 0) - evaluate(unit, xj)) ** 2, 0)
  })
  train /= n
  const noise = sigma ** 2
  return { bias2, variance, noise, test: bias2 + variance + noise, train }
}

// Every degree, for the samples the page offers
export const SIZES = [10, 20] as const
export type Size = (typeof SIZES)[number]
export const TERMS: Record<Size, Terms[]> = {
  10: DEGREES.map((d) => exactTerms(d, 10)),
  20: DEGREES.map((d) => exactTerms(d, 20)),
}

// The degree with the least error on new points
export const bestDegree = (terms: Terms[]) => terms.reduce((best, t, d) => (t.test < terms[best].test ? d : best), 0)

// ---------------------------------------------------------------------------
// Measured, by drawing many samples

export interface Measured {
  bias2: number
  variance: number
  // Squared error on fresh points, each with its own noise
  test: number
  train: number
}

// Draw `runs` samples, fit each, and measure: bias² and variance of the
// fits over GRID, the error on `perRun` fresh points (x anywhere in [0, 1])
// and on the sample's own points
export function monteCarlo(seed: number, degree: number, runs: number, n = POINTS, sigma = SIGMA, perRun = 20): Measured {
  const random = seeded(seed)
  const xs = design(n)
  const sum = GRID.map(() => 0)
  const sumSquares = GRID.map(() => 0)
  let test = 0
  let train = 0
  for (let r = 0; r < runs; r++) {
    const ys = sampleYs(xs, random, sigma)
    const fit = fitPolynomial(xs, ys, degree)
    GRID.forEach((x, g) => {
      const value = evaluate(fit, x)
      sum[g] += value
      sumSquares[g] += value * value
    })
    train += meanSquaredError(fit, xs, ys)
    for (let k = 0; k < perRun; k++) {
      const x = random()
      test += (evaluate(fit, x) - truth(x) - sigma * normal(random)) ** 2
    }
  }
  let bias2 = 0
  let variance = 0
  GRID.forEach((x, g) => {
    const mean = sum[g] / runs
    bias2 += (mean - truth(x)) ** 2
    variance += sumSquares[g] / runs - mean * mean
  })
  return { bias2: bias2 / GRID.length, variance: variance / GRID.length, test: test / (runs * perRun), train: train / runs }
}

// ---------------------------------------------------------------------------
// What the page shows

// The twenty samples drawn in the figures, the same twenty for every degree
export const SHOWN = 20
const SHOWN_SEED = 7
export interface Sample {
  xs: number[]
  ys: number[]
}
export const samples = (n: Size): Sample[] => {
  const random = seeded(SHOWN_SEED + n)
  const xs = design(n)
  return Array.from({ length: SHOWN }, () => ({ xs, ys: sampleYs(xs, random) }))
}
export const SAMPLES: Record<Size, Sample[]> = { 10: samples(10), 20: samples(20) }

// The shown samples' fits, for every degree and size
export const FITS: Record<Size, Fit[][]> = {
  10: DEGREES.map((d) => SAMPLES[10].map((s) => fitPolynomial(s.xs, s.ys, d))),
  20: DEGREES.map((d) => SAMPLES[20].map((s) => fitPolynomial(s.xs, s.ys, d))),
}
export const AVERAGES: Record<Size, Fit[]> = {
  10: DEGREES.map((d) => averageFit(d, 10)),
  20: DEGREES.map((d) => averageFit(d, 20)),
}

// The story's target: each arrow is one fit, landing at how far it misses
// the curve at two spots, across and up
export const SPOTS = [0.2, 0.8] as const
export const miss = (fit: Fit): [number, number] => [
  evaluate(fit, SPOTS[0]) - truth(SPOTS[0]),
  evaluate(fit, SPOTS[1]) - truth(SPOTS[1]),
]
export const arrows = (degree: number) => FITS[10][degree].map(miss)
// Where the arrows land on average: the average fit's miss
export const aim = (degree: number) => miss(AVERAGES[10][degree])
// How far the arrows scatter from their own centre: the root mean square
export function scatter(degree: number) {
  const centre = aim(degree)
  const shots = arrows(degree)
  return Math.sqrt(shots.reduce((sum, [a, b]) => sum + (a - centre[0]) ** 2 + (b - centre[1]) ** 2, 0) / shots.length)
}

// The worked numbers: the exact split for the three degrees the page compares
export const WORKED = [SIMPLE, MIDDLE, FLEXIBLE].map((degree) => ({ degree, ...TERMS[10][degree] }))

// Check yourself: the same ten points, measured three times more precisely
export const PRECISE = 0.1
export const PRECISE_TERMS = DEGREES.map((d) => exactTerms(d, POINTS, PRECISE))

export const two = (value: number) => value.toFixed(2)
