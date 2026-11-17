// Least squares: the numbers the page states, and the fit itself. Figures
// only draw what is worked out here.

// One sale: the bike's age in years and what it sold for, in dollars
export interface Sale {
  age: number
  price: number
}

// A straight-line rule: start at `start` dollars and add `perYear` for
// every year of age (negative: it loses value)
export interface Line {
  start: number
  perYear: number
}

export const priceAt = (line: Line, age: number) => line.start + line.perYear * age

// How far each sale lands above (+) or below (−) the line: its residual
export const misses = (sales: readonly Sale[], line: Line) => sales.map((s) => s.price - priceAt(line, s.age))

// The score least squares minimises: every miss squared, added up
export const sumOfSquares = (sales: readonly Sale[], line: Line) =>
  misses(sales, line).reduce((sum, m) => sum + m * m, 0)

// The score absolute error would minimise instead, for comparison
export const sumOfMisses = (sales: readonly Sale[], line: Line) =>
  misses(sales, line).reduce((sum, m) => sum + Math.abs(m), 0)

// The least-squares line through `sales`, in closed form: the slope is how
// age and price move together over how much age varies, and the line passes
// through the average sale. Null when every sale has the same age, since
// then no single line is best.
export function fitLine(sales: readonly Sale[]): Line | null {
  const n = sales.length
  if (n < 2) return null
  const meanAge = sales.reduce((s, p) => s + p.age, 0) / n
  const meanPrice = sales.reduce((s, p) => s + p.price, 0) / n
  let together = 0
  let spread = 0
  for (const s of sales) {
    together += (s.age - meanAge) * (s.price - meanPrice)
    spread += (s.age - meanAge) ** 2
  }
  if (spread < 1e-9) return null
  const perYear = together / spread
  return { start: meanPrice - perYear * meanAge, perYear }
}

// ---- Several features: X w ≈ y, solved through the normal equations ----

export type Matrix = number[][]

export const transpose = (a: Matrix): Matrix => a[0].map((_, j) => a.map((row) => row[j]))

export const times = (a: Matrix, b: Matrix): Matrix =>
  a.map((row) => b[0].map((_, j) => row.reduce((sum, value, k) => sum + value * b[k][j], 0)))

export const timesVector = (a: Matrix, v: readonly number[]) =>
  a.map((row) => row.reduce((sum, value, k) => sum + value * v[k], 0))

// Solve A w = b by Gaussian elimination with partial pivoting. Null when A
// is singular (to working precision).
export function solve(a: Matrix, b: readonly number[]): number[] | null {
  const n = a.length
  const m = a.map((row, i) => [...row, b[i]])
  const scale = Math.max(...a.flat().map(Math.abs), 1e-300)
  for (let col = 0; col < n; col++) {
    let pivot = col
    for (let r = col + 1; r < n; r++) if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r
    if (Math.abs(m[pivot][col]) < 1e-12 * scale) return null
    ;[m[col], m[pivot]] = [m[pivot], m[col]]
    for (let r = col + 1; r < n; r++) {
      const f = m[r][col] / m[col][col]
      for (let c = col; c <= n; c++) m[r][c] -= f * m[col][c]
    }
  }
  const w = new Array<number>(n).fill(0)
  for (let r = n - 1; r >= 0; r--) {
    let sum = m[r][n]
    for (let c = r + 1; c < n; c++) sum -= m[r][c] * w[c]
    w[r] = sum / m[r][r]
  }
  return w
}

// The weights that make X w closest to y: the solution of the normal
// equations XᵀX w = Xᵀy. Null when the columns of X are not independent.
export function fit(x: Matrix, y: readonly number[]): number[] | null {
  const xt = transpose(x)
  return solve(times(xt, x), timesVector(xt, y))
}

// What is left of y once the predictions X w are taken away
export const residual = (x: Matrix, y: readonly number[], w: readonly number[]) => {
  const predicted = timesVector(x, w)
  return y.map((value, i) => value - predicted[i])
}

// A sale as a row of the feature matrix: a 1 for the starting price, then the age
export const row = (s: Sale) => [1, s.age]

// ---- The page's numbers ----

// Five used bikes like yours. Four sold on an exact pattern, $520 less $60 a
// year; the five-year-old fetched $180 more than that pattern says.
export const SALES: readonly Sale[] = [
  { age: 1, price: 460 },
  { age: 2, price: 400 },
  { age: 3, price: 340 },
  { age: 4, price: 280 },
  { age: 5, price: 400 },
]
export const ODD = 4
export const YOUR_AGE = 3

// The four lines of the guess
export const THROUGH_FOUR: Line = { start: 520, perYear: -60 }
export const BEST: Line = fitLine(SALES)!
// The four's slope, raised by a fifth of the odd sale's miss
export const RAISED: Line = { start: 520 + 180 / 5, perYear: -60 }
export const FLAT: Line = {
  start: SALES.reduce((s, p) => s + p.price, 0) / SALES.length,
  perYear: 0,
}

export const CANDIDATES = [
  { name: 'A', line: THROUGH_FOUR },
  { name: 'B', line: BEST },
  { name: 'C', line: RAISED },
  { name: 'D', line: FLAT },
] as const

// The story's search: the line tilts and slides from the four's rule to the
// least-squares line, overshooting on the way
export const SEARCH: readonly Line[] = [
  THROUGH_FOUR,
  { start: 480, perYear: -40 },
  { start: 405, perYear: -8 },
  { start: 430, perYear: -20 },
  { start: 460, perYear: -30 },
  BEST,
]

// The line partway along the search, `t` from 0 to 1, eased between stops
export function searchAt(t: number): Line {
  const legs = SEARCH.length - 1
  const at = Math.max(0, Math.min(1, t)) * legs
  const i = Math.min(legs - 1, Math.floor(at))
  const k = at - i
  const e = k * k * (3 - 2 * k)
  const a = SEARCH[i]
  const b = SEARCH[i + 1]
  return {
    start: a.start + (b.start - a.start) * e,
    perYear: a.perYear + (b.perYear - a.perYear) * e,
  }
}

// The quick check: one miss of $300, or five misses of $100
export const ONE_BIG = { misses: 1, by: 300 }
export const FIVE_SMALL = { misses: 5, by: 100 }
export const squaredTotal = ({ misses: n, by }: { misses: number; by: number }) => n * by * by
export const absoluteTotal = ({ misses: n, by }: { misses: number; by: number }) => n * by

// The lab: an odd sale to add, far from the rest
export const OUTLIER: Sale = { age: 7, price: 620 }

// Display helpers
export const dollars = (value: number) =>
  `${value < 0 ? '−' : ''}$${Math.abs(Math.round(value)).toLocaleString('en-US')}`
export const count = (value: number) => Math.round(value).toLocaleString('en-US')
