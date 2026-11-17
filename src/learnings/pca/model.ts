import { seeded } from '../../components/explain/random'

// Principal component analysis, small enough to check by hand: points,
// their covariance, the spread of their shadows along a direction, the
// directions of most spread, and what a few of them keep. Every number the
// page states comes from here; the figures only draw.

export type Vec = number[]
export type Matrix = number[][]

export const dot = (a: Vec, b: Vec) => a.reduce((sum, x, i) => sum + x * b[i], 0)
export const times = (m: Matrix, v: Vec): Vec => m.map((row) => dot(row, v))
const scaled = (v: Vec, k: number) => v.map((x) => x * k)
const minus = (a: Vec, b: Vec) => a.map((x, i) => x - b[i])
const length = (v: Vec) => Math.sqrt(dot(v, v))
const normalised = (v: Vec) => scaled(v, 1 / length(v))

// A direction in the plane, at `degrees` from the x axis
export const unit = (degrees: number): Vec => [Math.cos((degrees * Math.PI) / 180), Math.sin((degrees * Math.PI) / 180)]

// A draw from the standard normal (Box–Muller)
export function normal(random: () => number): number {
  const u = 1 - random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random())
}

export function mean(points: Vec[]): Vec {
  const sum = points[0].map(() => 0)
  for (const p of points) p.forEach((x, j) => (sum[j] += x))
  return scaled(sum, 1 / points.length)
}

// The points moved so that their mean is at the origin
export function centred(points: Vec[]): Vec[] {
  const middle = mean(points)
  return points.map((p) => minus(p, middle))
}

// Each feature also divided by its spread, so that every one has variance 1
export function standardised(points: Vec[]): Vec[] {
  const moved = centred(points)
  const spreads = covariance(moved).map((row, j) => Math.sqrt(row[j]))
  return moved.map((p) => p.map((x, j) => x / spreads[j]))
}

// The covariance matrix, about the mean, dividing by n: entry (j, k) is the
// average of (feature j − its mean) × (feature k − its mean)
export function covariance(points: Vec[]): Matrix {
  const middle = mean(points)
  const d = middle.length
  const sums = Array.from({ length: d }, () => Array<number>(d).fill(0))
  for (const p of points) {
    const off = minus(p, middle)
    for (let j = 0; j < d; j++) for (let k = 0; k < d; k++) sums[j][k] += off[j] * off[k]
  }
  return sums.map((row) => scaled(row, 1 / points.length))
}

// All the spread there is: the sum of every feature's variance
export const total = (cov: Matrix) => cov.reduce((sum, row, j) => sum + row[j], 0)

// The spread of the shadows along unit direction u: uᵀΣu
export const varianceAlong = (cov: Matrix, u: Vec) => dot(u, times(cov, u))

// --- Shadows, straight from the points -------------------------------------

// Where each point's shadow lands along u, measured from the points' mean
export function shadows(points: Vec[], u: Vec): number[] {
  const middle = mean(points)
  return points.map((p) => dot(minus(p, middle), u))
}

// The spread the shadows keep: their average squared distance from the middle
export function kept(points: Vec[], u: Vec): number {
  const s = shadows(points, u)
  return s.reduce((sum, x) => sum + x * x, 0) / s.length
}

// Keeping only the k numbers along orthonormal directions `basis`, each
// point is rebuilt as the mean plus those numbers times the directions
export function reconstruct(point: Vec, middle: Vec, basis: Vec[]): Vec {
  const off = minus(point, middle)
  return basis.reduce((built, v) => built.map((x, j) => x + dot(off, v) * v[j]), [...middle])
}

// What the rebuilt points miss: the average squared distance from each
// point to its rebuilt self (the reconstruction error)
export function missed(points: Vec[], basis: Vec[]): number {
  const middle = mean(points)
  let sum = 0
  for (const p of points) {
    const gap = minus(p, reconstruct(p, middle, basis))
    sum += dot(gap, gap)
  }
  return sum / points.length
}

// --- Directions of most spread ----------------------------------------------

export interface Eigen2 {
  values: [number, number]
  // The first direction's angle, from 0 up to 180 degrees
  angle: number
  vectors: [Vec, Vec]
}

// A 2 × 2 covariance [[a, b], [b, c]] in closed form: the two spreads are
// the middle (a + c)/2 plus and minus r = √(((a − c)/2)² + b²), and the
// first direction is at half the angle of the point (a − c, 2b)
export function eigen2(cov: Matrix): Eigen2 {
  const [[a, b], [, c]] = cov
  const middle = (a + c) / 2
  const r = Math.hypot((a - c) / 2, b)
  let angle = ((Math.atan2(2 * b, a - c) / 2) * 180) / Math.PI
  if (angle < 0) angle += 180
  const v = unit(angle)
  return { values: [middle + r, middle - r], angle, vectors: [v, [-v[1], v[0]]] }
}

// A symmetric 2 × 2 matrix raised to a power, through its eigenvectors
function power2(cov: Matrix, p: number): Matrix {
  const { values, vectors } = eigen2(cov)
  return [0, 1].map((j) => [0, 1].map((k) => values[0] ** p * vectors[0][j] * vectors[0][k] + values[1] ** p * vectors[1][j] * vectors[1][k]))
}

export interface Components {
  // The spread along each direction, largest first
  values: number[]
  // The directions, one unit vector each, at right angles to each other
  vectors: Vec[]
}

// The top k directions of any symmetric matrix, by power iteration: keep
// multiplying a vector by the matrix, and it turns toward the direction the
// matrix stretches most. Then take that direction's stretch out of the
// matrix and repeat for the next.
export function topComponents(cov: Matrix, k = cov.length, seed = 1, rounds = 5000): Components {
  const random = seeded(seed)
  let rest = cov.map((row) => [...row])
  const values: number[] = []
  const vectors: Vec[] = []
  for (let found = 0; found < k; found++) {
    let v = normalised(rest.map(() => normal(random)))
    for (let round = 0; round < rounds; round++) {
      // Keep it at right angles to what is found already, against rounding
      for (const u of vectors) v = minus(v, scaled(u, dot(v, u)))
      const next = times(rest, v)
      if (length(next) < 1e-15) break
      const turned = normalised(next)
      const change = length(minus(turned, v))
      v = turned
      if (change < 1e-13) break
    }
    const value = varianceAlong(cov, v)
    values.push(value)
    vectors.push(v)
    rest = rest.map((row, j) => row.map((x, i) => x - value * v[j] * v[i]))
  }
  return { values, vectors }
}

// Each direction's share of all the spread, and the running total
export function explained(values: number[]): { share: number; cumulative: number }[] {
  const all = values.reduce((a, b) => a + b, 0)
  let running = 0
  return values.map((value) => {
    running += value
    return { share: value / all, cumulative: running / all }
  })
}

// How many directions keep at least `target` of the spread
export const enoughFor = (values: number[], target: number) => explained(values).findIndex((e) => e.cumulative >= target - 1e-12) + 1

// --- The story's loaf ------------------------------------------------------

// The loaf's seeds have exactly this covariance: a spread of 5 along x and
// along y, leaning together by 4. Its directions are 45° (spread 9) and
// 135° (spread 1), and all the spread there is is 10.
export const LOAF_COV: Matrix = [
  [5, 4],
  [4, 5],
]
export const SEEDS = 44

// Seeds scattered over a square, then reshaped so their covariance is
// exactly LOAF_COV: undo their own covariance, then stretch by the loaf's.
// The square becomes a loaf three times as long as it is wide, at 45°.
export const LOAF: Vec[] = (() => {
  const random = seeded(7)
  const side = Math.sqrt(3)
  const square = centred(Array.from({ length: SEEDS }, () => [(2 * random() - 1) * side, (2 * random() - 1) * side]))
  const undo = power2(covariance(square), -0.5)
  const stretch = power2(LOAF_COV, 0.5)
  return square.map((p) => times(stretch, times(undo, p)))
})()

// How far the seeds reach from the middle, along the loaf (45°) and across
// it (135°), for drawing its crust and sizing the card
export const LOAF_REACH = {
  along: Math.max(...LOAF.map((p) => Math.abs(dot(p, unit(45))))),
  across: Math.max(...LOAF.map((p) => Math.abs(dot(p, unit(135))))),
}

// Where the lamp stands in the story, as the angle of the card the shadow
// falls on: in front (0°), at the loaf's end (135°), along the loaf (45°)
export const FRONT = 0
export const END = 135
export const ALONG = 45

// The spread of the loaf's shadows on a card at `angle`, and what it misses
export const loafKept = (angle: number) => kept(LOAF, unit(angle))
export const loafMissed = (angle: number) => missed(LOAF, [unit(angle)])
export const LOAF_TOTAL = total(LOAF_COV)

// The three worked angles in the one line of math: 5 + 4 sin 2θ
export const WORKED = [0, 30, 45].map((angle) => ({
  angle,
  kept: varianceAlong(LOAF_COV, unit(angle)),
  missed: LOAF_TOTAL - varianceAlong(LOAF_COV, unit(angle)),
}))

// --- The lab: a cloud you can stretch and tilt -----------------------------

export const CLOUD_SIZE = 160
// The cloud before it is stretched and tilted: round, seeded
const ROUND: Vec[] = (() => {
  const random = seeded(42)
  return Array.from({ length: CLOUD_SIZE }, () => [normal(random), normal(random)])
})()

// The round cloud stretched `stretch` times along one direction (across
// stays at 1) and turned to `tilt` degrees
export function cloud(stretch: number, tilt: number): Vec[] {
  const [c, s] = unit(tilt)
  return ROUND.map(([x, y]) => [c * stretch * x - s * y, s * stretch * x + c * y])
}

// --- Six measurements of 300 people --------------------------------------

export const MEASURES = ['Height', 'Arm span', 'Leg', 'Shoe', 'Weight', 'Waist'] as const
export const PEOPLE = 300

// Two hidden things drive all six: how big a person is overall, and how
// heavily built. Each measurement is some of each plus its own noise.
// Weight is recorded in grams, as a scale might log it.
export const BODIES: Vec[] = (() => {
  const random = seeded(2026)
  return Array.from({ length: PEOPLE }, () => {
    const size = normal(random)
    const build = normal(random)
    const noise = (sd: number) => sd * normal(random)
    return [
      170 + 9 * size + noise(2.5), // height, cm
      171 + 9 * size + noise(3), // arm span, cm
      80 + 5 * size + noise(2), // leg, cm
      42 + 2 * size + noise(0.8), // shoe, EU size
      (70 + 7 * size + 8 * build + noise(3)) * 1000, // weight, g
      85 + 3 * size + 8 * build + noise(3), // waist, cm
    ]
  })
})()

export type Scale = 'Standardised' | 'As measured'
export const SCALES: Scale[] = ['Standardised', 'As measured']

// The six components of the bodies, each way of scaling them
export const BODY_COMPONENTS: Record<Scale, Components> = {
  Standardised: topComponents(covariance(standardised(BODIES))),
  'As measured': topComponents(covariance(centred(BODIES))),
}

// --- The checks ------------------------------------------------------------

// Check yourself: four features whose directions carry 5, 3, 1.5 and 0.5
export const CHECK_VALUES = [5, 3, 1.5, 0.5]
