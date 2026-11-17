import { seeded } from '../../components/explain/random'

// The kernel trick: a feature map that lifts points into a bigger space, the
// kernels that give inner products there without building it, and a kernel
// classifier trained on those inner products alone. Every number the page
// states comes from here; the figures only draw.

export type Point = readonly number[]

export const dot = (a: Point, b: Point) => a.reduce((sum, ai, i) => sum + ai * b[i], 0)
const squaredDistance = (a: Point, b: Point) => a.reduce((sum, ai, i) => sum + (ai - b[i]) ** 2, 0)

// ---------------------------------------------------------------------------
// Feature maps and kernels

// Every product of two coordinates, in order: x1x1, x1x2, ..., xdxd. Its inner
// products are the kernel (x·x′)²
export const pairProducts = (x: Point): number[] => x.flatMap((xi) => x.map((xj) => xi * xj))

// The same features without the repeats, for two inputs: x1², √2·x1x2, x2².
// The √2 stands for the two copies of x1x2 that pairProducts lists
export const squares2 = (x: Point): number[] => [x[0] ** 2, Math.SQRT2 * x[0] * x[1], x[1] ** 2]

// The story's lift: each point keeps where it lies and gains a height, its
// squared distance from the centre
export const lift = (x: Point): number[] => [x[0], x[1], x[0] ** 2 + x[1] ** 2]

export type Kernel = (a: Point, b: Point) => number

export const linearKernel: Kernel = dot
export const polynomialKernel =
  (degree: number, c = 0): Kernel =>
  (a, b) =>
    (dot(a, b) + c) ** degree
export const gaussianKernel =
  (sigma: number): Kernel =>
  (a, b) =>
    Math.exp(-squaredDistance(a, b) / (2 * sigma * sigma))

// How many different products of exactly `degree` inputs, out of `inputs`,
// there are (repeats allowed): the features behind (x·x′)^degree.
// C(inputs + degree − 1, degree), multiplied up so it stays a whole number
export function featureCount(inputs: number, degree: number): number {
  let count = 1
  for (let i = 1; i <= degree; i++) count = (count * (inputs - 1 + i)) / i
  return count
}

// The table of a kernel's values between every pair of points
export const kernelMatrix = (points: readonly Point[], kernel: Kernel): number[][] =>
  points.map((a) => points.map((b) => kernel(a, b)))

// The eigenvalues of a small symmetric matrix, by Jacobi rotations, smallest first
export function eigenvalues(matrix: readonly (readonly number[])[]): number[] {
  const n = matrix.length
  const a = matrix.map((row) => [...row])
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += a[p][q] ** 2
    if (off < 1e-22) break
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        if (Math.abs(a[p][q]) < 1e-300) continue
        const theta = (a[q][q] - a[p][p]) / (2 * a[p][q])
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1))
        const c = 1 / Math.sqrt(t * t + 1)
        const s = t * c
        for (let k = 0; k < n; k++) {
          const akp = a[k][p]
          const akq = a[k][q]
          a[k][p] = c * akp - s * akq
          a[k][q] = s * akp + c * akq
        }
        for (let k = 0; k < n; k++) {
          const apk = a[p][k]
          const aqk = a[q][k]
          a[p][k] = c * apk - s * aqk
          a[q][k] = s * apk + c * aqk
        }
      }
    }
  }
  return a.map((row, i) => row[i]).sort((x, y) => x - y)
}

// ---------------------------------------------------------------------------
// A kernel classifier: a support vector machine trained through its dual,
// which sees the points only through the kernel. The score of a point is
// Σ αᵢ yᵢ k(xᵢ, x), a vote of the training points weighted by how alike
// each is to it; the label is its sign. There is no separate offset: the
// lab's kernels carry a + 1, the kernel of a constant feature, instead.

export interface Model {
  points: readonly Point[]
  labels: readonly number[]
  kernel: Kernel
  // One weight per training point, between 0 and C
  alphas: number[]
}

// Dual coordinate ascent: raise or lower one αᵢ at a time to its best value
// with the others held, kept between 0 and C, until none moves
export function train(points: readonly Point[], labels: readonly number[], kernel: Kernel, C: number, sweeps = 500): Model {
  const n = points.length
  const K = kernelMatrix(points, kernel)
  const alphas = new Array<number>(n).fill(0)
  const scores = new Array<number>(n).fill(0)
  for (let sweep = 0; sweep < sweeps; sweep++) {
    let moved = 0
    for (let i = 0; i < n; i++) {
      const next = Math.min(C, Math.max(0, alphas[i] + (1 - labels[i] * scores[i]) / K[i][i]))
      const delta = next - alphas[i]
      if (delta === 0) continue
      alphas[i] = next
      for (let j = 0; j < n; j++) scores[j] += delta * labels[i] * K[i][j]
      moved = Math.max(moved, Math.abs(delta))
    }
    if (moved < 1e-7) break
  }
  return { points, labels, kernel, alphas }
}

export const score = (model: Model, x: Point) =>
  model.points.reduce((sum, p, i) => (model.alphas[i] === 0 ? sum : sum + model.alphas[i] * model.labels[i] * model.kernel(p, x)), 0)

export const classify = (model: Model, x: Point) => (score(model, x) > 0 ? 1 : -1)

export const accuracy = (model: Model, points: readonly Point[], labels: readonly number[]) =>
  points.filter((p, i) => classify(model, p) === labels[i]).length / points.length

// ---------------------------------------------------------------------------
// Data: a blob inside a ring, and two interleaved moons. Label +1 is the
// blob or the upper moon (sage), −1 the ring or the lower moon (ink).

export interface Data {
  points: Point[]
  labels: number[]
}

function normal(random: () => number) {
  const u = 1 - random()
  const v = random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

export function rings(random: () => number, perClass: number, noise: number): Data {
  const points: Point[] = []
  const labels: number[] = []
  for (let i = 0; i < perClass; i++) {
    for (const label of [1, -1]) {
      const angle = 2 * Math.PI * random()
      const radius = label === 1 ? 0.55 * Math.sqrt(random()) : 1.1 + 0.2 * (random() - 0.5)
      points.push([radius * Math.cos(angle) + noise * normal(random), radius * Math.sin(angle) + noise * normal(random)])
      labels.push(label)
    }
  }
  return { points, labels }
}

export function moons(random: () => number, perClass: number, noise: number): Data {
  const points: Point[] = []
  const labels: number[] = []
  for (let i = 0; i < perClass; i++) {
    for (const label of [1, -1]) {
      const t = Math.PI * random()
      const [x, y] = label === 1 ? [Math.cos(t), Math.sin(t)] : [1 - Math.cos(t), 0.5 - Math.sin(t)]
      points.push([1.1 * (x - 0.5) + noise * normal(random), 1.1 * (y - 0.25) + noise * normal(random)])
      labels.push(label)
    }
  }
  return { points, labels }
}

// ---------------------------------------------------------------------------
// The story: grapes in the middle of a round tablecloth, cherries in a ring

export const CLOTH = 1.6
const storyRandom = seeded(7)
const fruit = (count: number, low: number, high: number): Point[] =>
  Array.from({ length: count }, (_, i) => {
    const angle = (2 * Math.PI * (i + 0.5 * storyRandom())) / count
    const radius = low + (high - low) * storyRandom()
    return [radius * Math.cos(angle), radius * Math.sin(angle)]
  })
export const GRAPES = fruit(9, 0.1, 0.5)
export const CHERRIES = fruit(18, 0.95, 1.25)

const radius2 = (p: Point) => p[0] ** 2 + p[1] ** 2
// The flat cut on the lifted cloth: halfway between the highest cherry and
// the lowest grape, as a squared distance from the centre
export const CUT = (Math.max(...GRAPES.map(radius2)) + Math.min(...CHERRIES.map(radius2))) / 2

// The fewest fruits a straight cut through the flat cloth leaves on the
// wrong side, for a line at `angle`: the best place along it, and the count.
// Grapes go on the side the normal points to.
export function bestCutAt(angle: number): { offset: number; wrong: number } {
  const normalDir = [Math.cos(angle), Math.sin(angle)]
  const fruits = [...GRAPES.map((p) => ({ at: dot(p, normalDir), grape: true })), ...CHERRIES.map((p) => ({ at: dot(p, normalDir), grape: false }))]
  fruits.sort((a, b) => a.at - b.at)
  // A cut below every fruit: everything counts as a grape, so the cherries are wrong
  let wrong = CHERRIES.length
  let best = { offset: fruits[0].at - 0.05, wrong }
  for (let i = 0; i < fruits.length; i++) {
    wrong += fruits[i].grape ? 1 : -1
    if (wrong < best.wrong) {
      const next = i + 1 < fruits.length ? fruits[i + 1].at : fruits[i].at + 0.1
      best = { offset: (fruits[i].at + next) / 2, wrong }
    }
  }
  return best
}

// A straight cut at `angle`, `offset` from the centre, with the grapes on
// whichever side leaves fewer fruits wrong: how many are wrong, and whether
// the grapes' side is the one the normal points to
export function cutAt(angle: number, offset: number): { wrong: number; grapesAhead: boolean } {
  const normalDir = [Math.cos(angle), Math.sin(angle)]
  const ahead = (p: Point) => dot(p, normalDir) > offset
  const wrong = GRAPES.filter((p) => !ahead(p)).length + CHERRIES.filter(ahead).length
  const flipped = GRAPES.length + CHERRIES.length - wrong
  return wrong <= flipped ? { wrong, grapesAhead: true } : { wrong: flipped, grapesAhead: false }
}

// The story's sweeps: a cut slid across the cloth at each of these angles
export const SWEEP_ANGLES = [0.3, 1.25, 2.1, 2.75]
export const SWEEP_REACH = 1.35

// Every direction, a quarter of a degree apart, both ways round
export const CUT_ANGLES = Array.from({ length: 1440 }, (_, i) => (2 * Math.PI * i) / 1440)
export const CUTS = CUT_ANGLES.map(bestCutAt)
export const BEST_STRAIGHT = Math.min(...CUTS.map((c) => c.wrong))

// ---------------------------------------------------------------------------
// The worked numbers

// The clip's two points: (x·x′)² by the short way and the long way
export const CLIP_X: Point = [1, 2]
export const CLIP_Y: Point = [3, 1]

// What it takes to build the features, against what the kernel computes:
// p inputs, the products of `degree` of them
export const COSTS = [
  { inputs: 2, degree: 2 },
  { inputs: 100, degree: 2 },
  { inputs: 100, degree: 10 },
].map((c) => ({ ...c, features: featureCount(c.inputs, c.degree) }))

// The spam filter in Check yourself: every pair of 10,000 word counts
export const SPAM_WORDS = 10_000
export const SPAM_PAIRS = featureCount(SPAM_WORDS, 2)

// ---------------------------------------------------------------------------
// The lab

export const DATASETS = ['Rings', 'Moons'] as const
export type Dataset = (typeof DATASETS)[number]
export const KERNELS = ['Straight', 'Degree 2', 'Gaussian'] as const
export type KernelName = (typeof KERNELS)[number]
export const SIGMAS = [0.05, 0.15, 0.5, 3] as const
export type Sigma = (typeof SIGMAS)[number]
export const LAB_C = 10
export const LAB_NOISE = 0.15
const LAB_PER_CLASS = 40
const TEST_PER_CLASS = 200

const makers: Record<Dataset, typeof rings> = { Rings: rings, Moons: moons }
const TRAIN: Record<Dataset, Data> = {
  Rings: rings(seeded(11), LAB_PER_CLASS, LAB_NOISE),
  Moons: moons(seeded(12), LAB_PER_CLASS, LAB_NOISE),
}
const TEST: Record<Dataset, Data> = {
  Rings: makers.Rings(seeded(21), TEST_PER_CLASS, LAB_NOISE),
  Moons: makers.Moons(seeded(22), TEST_PER_CLASS, LAB_NOISE),
}
export const labData = (dataset: Dataset) => TRAIN[dataset]

// Each kernel with a + 1 added, the kernel of a constant feature, so the
// boundary need not pass through the centre
export function labKernel(name: KernelName, sigma: number): Kernel {
  if (name === 'Straight') return (a, b) => dot(a, b) + 1
  if (name === 'Degree 2') return polynomialKernel(2, 1)
  const gaussian = gaussianKernel(sigma)
  return (a, b) => gaussian(a, b) + 1
}

// The square the lab draws, and how finely it colours it
export const BOX = 1.7
export const GRID = 72

export interface LabFit {
  // Each row of the grid, as runs of cells on the +1 side: [from, to)
  runs: [number, number][][]
  train: number
  test: number
  // Training points with a weight: the ones the boundary rests on
  support: number
}

const fits = new Map<string, LabFit>()
export function labFit(dataset: Dataset, kernel: KernelName, sigma: Sigma): LabFit {
  const key = `${dataset} ${kernel} ${kernel === 'Gaussian' ? sigma : ''}`
  const found = fits.get(key)
  if (found) return found
  const data = TRAIN[dataset]
  const model = train(data.points, data.labels, labKernel(kernel, sigma), LAB_C)
  const cell = (2 * BOX) / GRID
  const runs = Array.from({ length: GRID }, (_, row) => {
    const y = BOX - (row + 0.5) * cell
    const out: [number, number][] = []
    let start = -1
    for (let col = 0; col <= GRID; col++) {
      const inside = col < GRID && score(model, [-BOX + (col + 0.5) * cell, y]) > 0
      if (inside && start < 0) start = col
      if (!inside && start >= 0) {
        out.push([start, col])
        start = -1
      }
    }
    return out
  })
  const fit = {
    runs,
    train: accuracy(model, data.points, data.labels),
    test: accuracy(model, TEST[dataset].points, TEST[dataset].labels),
    support: model.alphas.filter((a) => a > 0).length,
  }
  fits.set(key, fit)
  return fit
}
