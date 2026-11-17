// Averaging many trees. One deep tree changes a lot with its data; an
// average of B of them changes less, but only as much less as the trees
// differ from each other. Bagging grows each tree on a bootstrap sample of
// the one dataset; a random forest also lets each split look at only a few
// features, so the trees differ more and their average steadies further.

import { seeded } from '../../components/explain/random'

// A normal draw from two uniform ones
export const normal = (random: () => number) => Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random())

const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length

// ---------------------------------------------------------------------------
// The one line of math: the variance of an average of B predictions, each
// with variance σ² and every pair correlated ρ, is ρσ² + (1 − ρ)σ²/B. The
// first part never shrinks with B: it is the floor.

export const averageVariance = (rho: number, trees: number, variance = 1) => rho * variance + ((1 - rho) * variance) / trees

// The page's worked numbers, with σ² = 1: independent trees, trees as alike
// as bagged ones on a dataset with one strong feature, and a forest's
export const WORKED = [
  { rho: 0, trees: 100 },
  { rho: 0.5, trees: 100 },
  { rho: 0.1, trees: 100 },
].map((w) => ({ ...w, floor: w.rho, shrinks: (1 - w.rho) / w.trees, variance: averageVariance(w.rho, w.trees) }))

// The guess: 100 trees, correlation 0.5
export const GUESS = { rho: 0.5, trees: 100, variance: averageVariance(0.5, 100) }

// ---------------------------------------------------------------------------
// The bootstrap: n draws from n rows, with replacement

export function bootstrap(random: () => number, n: number): number[] {
  return Array.from({ length: n }, () => Math.floor(random() * n))
}

// The share of rows a bootstrap sample holds at least once: each row is
// missed by every one of the n draws with chance (1 − 1/n)ⁿ
export const distinctShare = (n: number) => 1 - (1 - 1 / n) ** n

// Where that heads as n grows: 1 − 1/e
export const IN_BAG = 1 - 1 / Math.E

// How many times each of n rows was drawn
export function counts(draws: number[], n: number): number[] {
  const tally = new Array<number>(n).fill(0)
  for (const row of draws) tally[row]++
  return tally
}

// The bag the page shows: 20 rows, and the seed whose draw keeps 13 of
// them, what 1 − (1 − 1/20)²⁰ = 64% says to expect
export const BAG_ROWS = 20
export const BAG_SEED = 5

// ---------------------------------------------------------------------------
// The jar at the fair. Each friend's guess misses the true count by a part
// the whole crowd shares that day (the trick they all use) plus a part of
// their own. `rho` is the shared part's share of a guess's variance.

export const BEANS = 1000

export interface Crowd {
  friends: number
  // How far one guess typically misses: its standard deviation
  spread: number
  rho: number
}

export const FAIRS = 30

export const CROWDS = {
  alone: { friends: 1, spread: 150, rho: 0 },
  apart: { friends: 100, spread: 150, rho: 0 },
  trick: { friends: 100, spread: 150, rho: 0.5 },
  more: { friends: 1000, spread: 150, rho: 0.5 },
  windows: { friends: 100, spread: 180, rho: 0.1 },
} satisfies Record<string, Crowd>

export type CrowdName = keyof typeof CROWDS

export interface Fair {
  guesses: number[]
  average: number
}

// Fairs with one crowd: each day's guesses and their average
export function fairs(crowd: Crowd, seed: number, days = FAIRS): Fair[] {
  const random = seeded(seed)
  const shared = crowd.spread * Math.sqrt(crowd.rho)
  const own = crowd.spread * Math.sqrt(1 - crowd.rho)
  return Array.from({ length: days }, () => {
    const day = shared * normal(random)
    const guesses = Array.from({ length: crowd.friends }, () => BEANS + day + own * normal(random))
    return { guesses, average: mean(guesses) }
  })
}

// How far the crowd's average typically misses, by the formula
export const typicalMiss = (crowd: Crowd) => crowd.spread * Math.sqrt(averageVariance(crowd.rho, crowd.friends))

// How far it missed over some fairs: the root of the mean squared miss
export const measuredMiss = (days: Fair[]) => Math.sqrt(mean(days.map((d) => (d.average - BEANS) ** 2)))

// The story's seeds, chosen so each run lands near what the formula says
export const STORY_SEEDS: Record<CrowdName, number> = { alone: 10, apart: 10, trick: 9, more: 8, windows: 14 }

export const STORY = Object.fromEntries(
  (Object.keys(CROWDS) as CrowdName[]).map((name) => [name, fairs(CROWDS[name], STORY_SEEDS[name])])
) as Record<CrowdName, Fair[]>

// How far each of the story's crowds missed, to the nearest 5
export const storyMiss = (name: CrowdName) => Math.round(measuredMiss(STORY[name]) / 5) * 5

// ---------------------------------------------------------------------------
// The data: nine features. The first three are rough readings of one
// strong hidden quantity (as floor area, rooms and bedrooms all measure a
// house's size); the other six are uniform on [0, 1] and count for a little
// each. A tree that may pick any feature splits on a reading first.

export const FEATURES = 9
export const READINGS = 3
const BLUR = 0.15
export const NOISE = 0.2

export interface Data {
  x: number[][]
  // What was measured, noise and all
  y: number[]
  // The truth without noise, which we know because we made the data
  f: number[]
}

// A jump at the middle of the hidden quantity, a slope along it, and a
// little from three of the other features; the last three are only noise
export const truth = (hidden: number, x: number[]) => 3 * (hidden > 0.5 ? 1 : 0) + 2 * hidden + x[3] + x[4] + x[5]

export function makeData(random: () => number, n: number): Data {
  const data: Data = { x: [], y: [], f: [] }
  for (let i = 0; i < n; i++) {
    const hidden = random()
    const x = Array.from({ length: FEATURES }, (_, j) => (j < READINGS ? hidden + BLUR * normal(random) : random()))
    const f = truth(hidden, x)
    data.x.push(x)
    data.f.push(f)
    data.y.push(f + NOISE * normal(random))
  }
  return data
}

// ---------------------------------------------------------------------------
// A regression tree, grown greedily: each split is the one, among `m`
// features drawn at random, that leaves the least squared error; each leaf
// predicts the average of its points. It stops at `leaf` points.

export type Tree = { value: number } | { feature: number; threshold: number; left: Tree; right: Tree }

// `k` of `n` features, at random and without repeats
function pick(random: () => number, n: number, k: number): number[] {
  const all = Array.from({ length: n }, (_, i) => i)
  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(random() * (n - i))
    ;[all[i], all[j]] = [all[j], all[i]]
  }
  return all.slice(0, k)
}

export function growTree(x: number[][], y: number[], rows: number[], m: number, random: () => number, leaf = 1): Tree {
  const total = rows.reduce((sum, r) => sum + y[r], 0)
  const value = total / rows.length
  if (rows.length < 2 * leaf) return { value }
  const squares = rows.reduce((sum, r) => sum + y[r] * y[r], 0)
  // Squared error is Σy² − (Σy)²/n; Σy² is the same either side, so the
  // best split has the largest (Σleft)²/nleft + (Σright)²/nright
  let best = (total * total) / rows.length + 1e-9
  let split: { feature: number; threshold: number; at: number; order: number[] } | null = null
  if (squares - (total * total) / rows.length < 1e-12) return { value }
  for (const feature of pick(random, x[0].length, m)) {
    const order = [...rows].sort((a, b) => x[a][feature] - x[b][feature])
    let left = 0
    for (let i = 0; i < order.length - 1; i++) {
      left += y[order[i]]
      const here = x[order[i]][feature]
      const next = x[order[i + 1]][feature]
      if (here === next || i + 1 < leaf || order.length - i - 1 < leaf) continue
      const right = total - left
      const score = (left * left) / (i + 1) + (right * right) / (order.length - i - 1)
      if (score > best) {
        best = score
        split = { feature, threshold: (here + next) / 2, at: i + 1, order }
      }
    }
  }
  if (!split) return { value }
  return {
    feature: split.feature,
    threshold: split.threshold,
    left: growTree(x, y, split.order.slice(0, split.at), m, random, leaf),
    right: growTree(x, y, split.order.slice(split.at), m, random, leaf),
  }
}

export function predict(tree: Tree, x: number[]): number {
  let node = tree
  while (!('value' in node)) node = x[node.feature] < node.threshold ? node.left : node.right
  return node.value
}

// The feature a tree splits on first, or −1 for a lone leaf
export const root = (tree: Tree) => ('value' in tree ? -1 : tree.feature)

// ---------------------------------------------------------------------------
// An ensemble: B trees, each grown on its own bootstrap sample, each split
// choosing among m features. m = 9, all of them, is bagging.

export interface Forest {
  trees: Tree[]
  // For each tree, which training rows its sample held
  inBag: boolean[][]
}

export function growForest(data: Data, trees: number, m: number, seed: number, leaf = 1): Forest {
  const random = seeded(seed)
  const n = data.y.length
  const forest: Forest = { trees: [], inBag: [] }
  for (let b = 0; b < trees; b++) {
    const rows = bootstrap(random, n)
    const bag = new Array<boolean>(n).fill(false)
    for (const r of rows) bag[r] = true
    forest.trees.push(growTree(data.x, data.y, rows, m, random, leaf))
    forest.inBag.push(bag)
  }
  return forest
}

// How alike the trees' mistakes are. Each tree's error at every test point
// is measured from the truth; σ² is a tree's mean squared error, and ρ the
// average over pairs of trees of their errors' product, as a share of σ².
// With these two, the forest's own squared error from the truth is exactly
// ρσ² + (1 − ρ)σ²/B.
export function alike(errors: number[][]): { variance: number; rho: number } {
  const trees = errors.length
  const points = errors[0].length
  let own = 0
  let together = 0
  for (let i = 0; i < points; i++) {
    let sum = 0
    for (let b = 0; b < trees; b++) {
      own += errors[b][i] ** 2
      sum += errors[b][i]
    }
    together += sum * sum
  }
  const variance = own / (trees * points)
  // Σ over pairs b ≠ b′ = (Σ_b e_b)² − Σ_b e_b², summed over points
  const pairs = (together - own) / (trees * (trees - 1) * points)
  return { variance, rho: pairs / variance }
}

// ---------------------------------------------------------------------------
// The lab: one training set and one test set, and for each m a forest of
// up to MOST_TREES trees, measured at every size from 1 tree up

export const TRAIN = 200
export const TEST = 1000
export const MOST_TREES = 200
export const BAGGING = FEATURES
// √9 = 3, which is also 9/3, the usual setting for regression
export const FOREST = Math.round(Math.sqrt(FEATURES))
export const LEAF = 1
export const DATA_SEED = 5
export const FOREST_SEED = 7

const random = seeded(DATA_SEED)
export const TRAINING = makeData(random, TRAIN)
export const TESTING = makeData(random, TEST)

export interface Run {
  m: number
  // Squared error on the test points, against what was measured there, for
  // the first B trees: test[B − 1]
  test: number[]
  // The out-of-bag estimate of the same: each training point predicted by
  // the trees whose samples left it out
  oob: number[]
  // One tree's test error, averaged over the trees
  oneTree: number
  // How alike the trees' mistakes are, from the truth
  rho: number
  variance: number
  // How often the trees split first on one of the strong readings
  readingFirst: number
}

export function run(m: number, data = TRAINING, test = TESTING, trees = MOST_TREES, seed = FOREST_SEED): Run {
  const forest = growForest(data, trees, m, seed, LEAF)
  const sums = new Array<number>(test.y.length).fill(0)
  const oobSums = new Array<number>(data.y.length).fill(0)
  const oobCounts = new Array<number>(data.y.length).fill(0)
  const errors: number[][] = []
  const testCurve: number[] = []
  const oobCurve: number[] = []
  let oneTree = 0
  forest.trees.forEach((tree, b) => {
    const guesses = test.x.map((x) => predict(tree, x))
    errors.push(guesses.map((g, i) => g - test.f[i]))
    oneTree += mean(guesses.map((g, i) => (g - test.y[i]) ** 2))
    guesses.forEach((g, i) => (sums[i] += g))
    testCurve.push(mean(sums.map((s, i) => (s / (b + 1) - test.y[i]) ** 2)))
    data.x.forEach((x, i) => {
      if (forest.inBag[b][i]) return
      oobSums[i] += predict(tree, x)
      oobCounts[i]++
    })
    const covered = oobSums.flatMap((s, i) => (oobCounts[i] ? [(s / oobCounts[i] - data.y[i]) ** 2] : []))
    oobCurve.push(mean(covered))
  })
  const { rho, variance } = alike(errors)
  return {
    m,
    test: testCurve,
    oob: oobCurve,
    oneTree: oneTree / trees,
    rho,
    variance,
    readingFirst: forest.trees.filter((t) => root(t) >= 0 && root(t) < READINGS).length / trees,
  }
}

// Each m's run, worked out the first time it is asked for
const runs = new Map<number, Run>()
export function runFor(m: number): Run {
  let found = runs.get(m)
  if (!found) {
    found = run(m)
    runs.set(m, found)
  }
  return found
}

export const two = (value: number) => value.toFixed(2)
export const pct = (share: number) => `${Math.round(100 * share)}%`
