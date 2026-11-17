import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  aim,
  arrows,
  averageFit,
  bestDegree,
  DEGREES,
  design,
  evaluate,
  exactTerms,
  features,
  fitPolynomial,
  FLEXIBLE,
  leastSquares,
  meanSquaredError,
  MIDDLE,
  monteCarlo,
  normal,
  POINTS,
  PRECISE_TERMS,
  sampleYs,
  scatter,
  SIGMA,
  SIMPLE,
  TERMS,
  truth,
  WORKED,
} from './model'

// Least squares the slow way, as a referee: solve XᵀX w = Xᵀy by Gaussian
// elimination with partial pivoting
function normalEquations(a: number[][], b: number[]): number[] {
  const n = a[0].length
  const m = Array.from({ length: n }, (_, i) => [
    ...Array.from({ length: n }, (_, j) => a.reduce((s, row) => s + row[i] * row[j], 0)),
    a.reduce((s, row, k) => s + row[i] * b[k], 0),
  ])
  for (let c = 0; c < n; c++) {
    let pivot = c
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[pivot][c])) pivot = r
    ;[m[c], m[pivot]] = [m[pivot], m[c]]
    for (let r = c + 1; r < n; r++) {
      const f = m[r][c] / m[c][c]
      for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k]
    }
  }
  const w = new Array<number>(n).fill(0)
  for (let r = n - 1; r >= 0; r--) {
    let s = m[r][n]
    for (let k = r + 1; k < n; k++) s -= m[r][k] * w[k]
    w[r] = s / m[r][r]
  }
  return w
}

describe('least squares', () => {
  it('finds the mean for a constant: 0, 1, 0 gives 1/3', () => {
    const fit = fitPolynomial([0, 0.5, 1], [0, 1, 0], 0)
    expect(evaluate(fit, 0.3)).toBeCloseTo(1 / 3, 12)
  })

  it('finds the hand-worked line through (0, 0), (0.5, 1), (1, 1): y = 1/6 + x', () => {
    // Slope = Σ(x − x̄)(y − ȳ) / Σ(x − x̄)² = (−0.5 · −2/3 + 0.5 · 1/3) / 0.5 = 1; intercept = 2/3 − 0.5
    const fit = fitPolynomial([0, 0.5, 1], [0, 1, 1], 1)
    expect(evaluate(fit, 0)).toBeCloseTo(1 / 6, 12)
    expect(evaluate(fit, 1)).toBeCloseTo(7 / 6, 12)
  })

  it('recovers a polynomial it is given exactly', () => {
    const p = (x: number) => 2 - 3 * x + 0.5 * x ** 3
    const xs = design(8)
    const fit = fitPolynomial(xs, xs.map(p), 3)
    for (const x of [0.1, 0.45, 0.9]) expect(evaluate(fit, x)).toBeCloseTo(p(x), 10)
  })

  it('passes through every point when the degree is one less than the points', () => {
    const random = seeded(4)
    const xs = design(POINTS)
    const ys = sampleYs(xs, random)
    const fit = fitPolynomial(xs, ys, POINTS - 1)
    xs.forEach((x, i) => expect(evaluate(fit, x)).toBeCloseTo(ys[i], 8))
    expect(meanSquaredError(fit, xs, ys)).toBeLessThan(1e-14)
  })

  it('matches the normal equations on 300 seeded random problems', () => {
    const random = seeded(11)
    for (let trial = 0; trial < 300; trial++) {
      const degree = Math.floor(random() * 4)
      const n = degree + 2 + Math.floor(random() * 10)
      const xs = Array.from({ length: n }, () => random())
      const ys = xs.map(() => 4 * random() - 2)
      const rows = xs.map((x) => features(x, degree))
      const ours = leastSquares(rows, ys)
      const theirs = normalEquations(rows, ys)
      // Relative: clustered x's make the normal equations lose a few digits
      ours.forEach((w, k) => expect(Math.abs(w - theirs[k])).toBeLessThan(1e-6 * (1 + Math.abs(theirs[k]))))
    }
  })

  it('leaves a residual orthogonal to every feature', () => {
    const random = seeded(12)
    const xs = design(15)
    const ys = sampleYs(xs, random)
    const fit = fitPolynomial(xs, ys, 4)
    for (let k = 0; k <= 4; k++) {
      const dot = xs.reduce((s, x, i) => s + features(x, 4)[k] * (ys[i] - evaluate(fit, x)), 0)
      expect(dot).toBeCloseTo(0, 10)
    }
  })
})

describe('the noise', () => {
  it('is standard normal: mean 0 and variance 1 over 20,000 draws', () => {
    const random = seeded(3)
    const draws = Array.from({ length: 20000 }, () => normal(random))
    const mean = draws.reduce((s, v) => s + v, 0) / draws.length
    const variance = draws.reduce((s, v) => s + (v - mean) ** 2, 0) / draws.length
    expect(Math.abs(mean)).toBeLessThan(0.03)
    expect(variance).toBeCloseTo(1, 1)
  })
})

describe('the split', () => {
  it('is the average of many fits: the average fit is the fit to the noiseless curve', () => {
    const random = seeded(5)
    const xs = design(POINTS)
    const runs = 4000
    const sum = [0, 0, 0]
    for (let r = 0; r < runs; r++) {
      const fit = fitPolynomial(xs, sampleYs(xs, random), MIDDLE)
      ;[0.1, 0.5, 0.8].forEach((x, i) => (sum[i] += evaluate(fit, x)))
    }
    const mean = averageFit(MIDDLE)
    ;[0.1, 0.5, 0.8].forEach((x, i) => expect(sum[i] / runs).toBeCloseTo(evaluate(mean, x), 1))
  })

  it.each([SIMPLE, MIDDLE, FLEXIBLE])('adds up for degree %i: bias² + variance + noise matches the measured error on new points', (degree) => {
    const measured = monteCarlo(21 + degree, degree, 3000)
    const exact = exactTerms(degree)
    expect(Math.abs(measured.bias2 + measured.variance + SIGMA ** 2 - measured.test)).toBeLessThan(0.03 * measured.test + 0.005)
    expect(Math.abs(measured.test - exact.test)).toBeLessThan(0.04 * exact.test + 0.005)
    expect(Math.abs(measured.bias2 - exact.bias2)).toBeLessThan(0.02 * exact.bias2 + 0.002)
    expect(Math.abs(measured.variance - exact.variance)).toBeLessThan(0.06 * exact.variance)
    expect(Math.abs(measured.train - exact.train)).toBeLessThan(0.04 * exact.train + 0.001)
  })

  it('has a bias² of 1/2 for a constant: the curve’s own spread', () => {
    // The best constant is the mean of sin over the points, 0, and the
    // average of sin² over [0, 1] is 1/2
    expect(TERMS[10][0].bias2).toBeCloseTo(0.5, 2)
  })

  it('gives a variance of σ² · (degree + 1) / n on the sample’s own points', () => {
    // The fit's variance summed over its own points is σ² · trace(H), and
    // trace(H) is the number of coefficients: so the training error falls by
    // exactly that much below bias + σ²
    for (const d of DEGREES) {
      const t = exactTerms(d)
      const xs = design(POINTS)
      const mean = averageFit(d)
      const bias = xs.reduce((s, x) => s + (truth(x) - evaluate(mean, x)) ** 2, 0) / POINTS
      expect(t.train).toBeCloseTo(bias + SIGMA ** 2 * (1 - (d + 1) / POINTS), 10)
    }
  })
})

describe('the page’s setup', () => {
  const terms = TERMS[10]

  it('trains better with every degree: training error never rises', () => {
    for (let d = 1; d < terms.length; d++) expect(terms[d].train).toBeLessThanOrEqual(terms[d - 1].train + 1e-12)
    expect(terms[9].train).toBeLessThan(1e-12)
  })

  it('never trains worse on any one sample as the degree grows', () => {
    const random = seeded(9)
    const xs = design(POINTS)
    for (let trial = 0; trial < 50; trial++) {
      const ys = sampleYs(xs, random)
      const errors = DEGREES.map((d) => meanSquaredError(fitPolynomial(xs, ys, d), xs, ys))
      for (let d = 1; d < errors.length; d++) expect(errors[d]).toBeLessThanOrEqual(errors[d - 1] + 1e-12)
    }
  })

  it('wobbles more with every degree: variance rises', () => {
    for (let d = 1; d < terms.length; d++) expect(terms[d].variance).toBeGreaterThan(terms[d - 1].variance)
  })

  it('misses less on average as the degree grows: bias² never rises', () => {
    for (let d = 1; d < terms.length; d++) expect(terms[d].bias2).toBeLessThanOrEqual(terms[d - 1].bias2 + 1e-9)
  })

  it('is U-shaped on new points: degree 3 is best, and degree 9 is worse than a line', () => {
    expect(bestDegree(terms)).toBe(MIDDLE)
    expect(terms[FLEXIBLE].test).toBeGreaterThan(terms[SIMPLE].test)
    expect(terms[MIDDLE].test).toBeLessThan(terms[SIMPLE].test)
  })

  it('tells the worked numbers the page and the clip show', () => {
    const shown = WORKED.map((w) => [w.bias2, w.variance, w.noise, w.test].map((v) => v.toFixed(2)))
    expect(shown).toEqual([
      ['0.22', '0.02', '0.09', '0.33'],
      ['0.01', '0.03', '0.09', '0.13'],
      ['0.00', '0.59', '0.09', '0.68'],
    ])
  })

  it('shrinks the variance with twice the points, and leaves the bias', () => {
    expect(TERMS[20][FLEXIBLE].variance).toBeLessThan(TERMS[10][FLEXIBLE].variance / 10)
    expect(TERMS[20][SIMPLE].bias2).toBeCloseTo(TERMS[10][SIMPLE].bias2, 1)
  })

  it('moves the best degree up when the points are measured three times more precisely', () => {
    expect(bestDegree(PRECISE_TERMS)).toBeGreaterThan(MIDDLE)
    expect(PRECISE_TERMS[5].test).toBeLessThan(PRECISE_TERMS[MIDDLE].test)
  })

  it('tells the story: the stiff bow lands off centre and tight, the twitchy one centred and wide', () => {
    const off = (degree: number) => Math.hypot(...aim(degree))
    expect(off(SIMPLE)).toBeGreaterThan(2 * scatter(SIMPLE))
    expect(off(FLEXIBLE)).toBeLessThan(0.01)
    expect(scatter(FLEXIBLE)).toBeGreaterThan(2.5 * scatter(SIMPLE))
    expect(off(MIDDLE)).toBeLessThan(off(SIMPLE) / 2)
    expect(scatter(MIDDLE)).toBeLessThan(0.6 * scatter(FLEXIBLE))
    // The shown arrows centre where the average fit lands, give or take
    const centre = (degree: number) =>
      arrows(degree)
        .reduce((s, [a, b]) => [s[0] + a, s[1] + b], [0, 0])
        .map((v) => v / arrows(degree).length)
    for (const d of [SIMPLE, MIDDLE]) centre(d).forEach((v, i) => expect(Math.abs(v - aim(d)[i])).toBeLessThan(0.12))
  })
})
