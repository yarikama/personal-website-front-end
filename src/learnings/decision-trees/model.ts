// Decision trees: how mixed a pile is (Gini, entropy, misclassification),
// the search for the best single question, growing a tree from questions
// like that, and the numbers the page states. Figures only draw.

import { seeded } from '../../components/explain/random'

// ---------------------------------------------------------------- impurity

// Counts of each class in a pile, e.g. [400, 400]
export type Counts = number[]

const total = (counts: Counts) => counts.reduce((sum, c) => sum + c, 0)

// The chance two items drawn from the pile (with replacement) are of
// different classes: 1 − Σ p²
export function gini(counts: Counts): number {
  const n = total(counts)
  if (n === 0) return 0
  return 1 - counts.reduce((sum, c) => sum + (c / n) ** 2, 0)
}

// The average number of yes/no questions needed to learn an item's class:
// −Σ p log₂ p, with 0 log 0 = 0
export function entropy(counts: Counts): number {
  const n = total(counts)
  if (n === 0) return 0
  return counts.reduce((sum, c) => (c === 0 ? sum : sum - (c / n) * Math.log2(c / n)), 0)
}

// The share labelled wrong when the pile is labelled by its majority
export function misclassification(counts: Counts): number {
  const n = total(counts)
  if (n === 0) return 0
  return 1 - Math.max(...counts) / n
}

export const IMPURITIES = { gini, entropy, misclassification } as const
export type ImpurityName = keyof typeof IMPURITIES

// The children's impurity, each weighted by its share of the items
export function weighted(children: Counts[], impurity: (counts: Counts) => number): number {
  const n = children.reduce((sum, c) => sum + total(c), 0)
  return children.reduce((sum, c) => sum + (total(c) / n) * impurity(c), 0)
}

// How much a split lowers the impurity: the parent's, less the children's
// weighted average
export function decrease(parent: Counts, children: Counts[], impurity: (counts: Counts) => number): number {
  return impurity(parent) - weighted(children, impurity)
}

// ------------------------------------------------------------- the search

export interface Point {
  x: number[]
  y: number // the class, 0 or 1
}

export interface Split {
  feature: number
  threshold: number // left is x[feature] < threshold
  decrease: number
}

const countsOf = (points: Point[], classes = 2): Counts => {
  const counts = new Array<number>(classes).fill(0)
  for (const p of points) counts[p.y]++
  return counts
}

// Every question worth asking: on each feature, a threshold halfway between
// each pair of neighbouring distinct values, so no point sits on one
export function candidates(points: Point[]): { feature: number; threshold: number }[] {
  const out: { feature: number; threshold: number }[] = []
  const features = points[0]?.x.length ?? 0
  for (let f = 0; f < features; f++) {
    const values = [...new Set(points.map((p) => p.x[f]))].sort((a, b) => a - b)
    for (let i = 1; i < values.length; i++) out.push({ feature: f, threshold: (values[i - 1] + values[i]) / 2 })
  }
  return out
}

// Every question with the decrease it gives, recounting each pile from
// scratch: the slow reference the fast search is tested against
export function scoreAll(points: Point[], impurity: (counts: Counts) => number = gini, minLeaf = 1): Split[] {
  const parent = countsOf(points)
  return candidates(points)
    .map(({ feature, threshold }) => {
      const left = points.filter((p) => p.x[feature] < threshold)
      const right = points.filter((p) => p.x[feature] >= threshold)
      if (left.length < minLeaf || right.length < minLeaf) return null
      return { feature, threshold, decrease: decrease(parent, [countsOf(left), countsOf(right)], impurity) }
    })
    .filter((s): s is Split => s !== null)
}

// The greedy choice: the question that lowers the impurity most. Sorts each
// feature once and sweeps the threshold along it, moving one point at a
// time from the right pile to the left. Ties go to the first found (lower
// feature, then lower threshold). Null when no question leaves at least
// `minLeaf` points on each side.
export function bestSplit(points: Point[], impurity: (counts: Counts) => number = gini, minLeaf = 1): Split | null {
  const parent = countsOf(points)
  const before = impurity(parent)
  const n = points.length
  let best: Split | null = null
  const features = points[0]?.x.length ?? 0
  for (let f = 0; f < features; f++) {
    const order = [...points].sort((a, b) => a.x[f] - b.x[f])
    const left = [0, 0]
    const right = [...parent]
    for (let i = 1; i < n; i++) {
      left[order[i - 1].y]++
      right[order[i - 1].y]--
      const a = order[i - 1].x[f]
      const b = order[i].x[f]
      if (a === b || i < minLeaf || n - i < minLeaf) continue
      const gain = before - ((i / n) * impurity(left) + ((n - i) / n) * impurity(right))
      if (!best || gain > best.decrease + 1e-12) best = { feature: f, threshold: (a + b) / 2, decrease: gain }
    }
  }
  return best
}

// ---------------------------------------------------------------- the tree

// A region of the plane: [low, high) on each feature
export type Box = [number, number][]

interface Shared {
  counts: Counts
  depth: number
  box: Box
}
export interface Leaf extends Shared {
  kind: 'leaf'
  label: number
}
export interface Node extends Shared {
  kind: 'node'
  split: Split
  left: Tree
  right: Tree
}
export type Tree = Leaf | Node

export interface Grow {
  maxDepth?: number
  minLeaf?: number
  impurity?: (counts: Counts) => number
}

const majority = (counts: Counts, tie: number) =>
  counts[0] === counts[1] ? tie : counts[1] > counts[0] ? 1 : 0

// Grow a tree greedily: at each node take the best question, then do the
// same inside each pile, until the pile is pure, the depth runs out, or no
// question leaves `minLeaf` points a side. A pile still mixed is split even
// when the best question lowers the impurity by nothing (as for XOR): the
// question below it may finish the job.
export function grow(points: Point[], box: Box, { maxDepth = Infinity, minLeaf = 1, impurity = gini }: Grow = {}): Tree {
  const build = (here: Point[], depth: number, region: Box, tie: number): Tree => {
    const counts = countsOf(here)
    const label = majority(counts, tie)
    const leaf: Leaf = { kind: 'leaf', counts, depth, box: region, label }
    if (depth >= maxDepth || counts[0] === 0 || counts[1] === 0) return leaf
    const split = bestSplit(here, impurity, minLeaf)
    if (!split) return leaf
    const { feature: f, threshold: t } = split
    const lower = region.map((r, i) => (i === f ? [r[0], t] : r)) as Box
    const upper = region.map((r, i) => (i === f ? [t, r[1]] : r)) as Box
    return {
      kind: 'node',
      counts,
      depth,
      box: region,
      split,
      left: build(
        here.filter((p) => p.x[f] < t),
        depth + 1,
        lower,
        label,
      ),
      right: build(
        here.filter((p) => p.x[f] >= t),
        depth + 1,
        upper,
        label,
      ),
    }
  }
  return build(points, 0, box, 0)
}

export function predict(tree: Tree, x: number[]): number {
  let at = tree
  while (at.kind === 'node') at = x[at.split.feature] < at.split.threshold ? at.left : at.right
  return at.label
}

export function accuracy(tree: Tree, points: Point[]): number {
  return points.filter((p) => predict(tree, p.x) === p.y).length / points.length
}

export function leaves(tree: Tree): Leaf[] {
  return tree.kind === 'leaf' ? [tree] : [...leaves(tree.left), ...leaves(tree.right)]
}

export function nodes(tree: Tree): Node[] {
  return tree.kind === 'leaf' ? [] : [tree, ...nodes(tree.left), ...nodes(tree.right)]
}

export function depthOf(tree: Tree): number {
  return tree.kind === 'leaf' ? 0 : 1 + Math.max(depthOf(tree.left), depthOf(tree.right))
}

// ------------------------------------------------------- the guess's piles

// 400 spam and 400 not: A splits evenly, B finishes one pile
export const GUESS = {
  parent: [400, 400],
  a: [
    [300, 100],
    [100, 300],
  ],
  b: [
    [200, 400],
    [200, 0],
  ],
} as const satisfies Record<string, Counts | Counts[]>

// Check yourself: 50 and 50, C splits off ten pure, D splits 35:15 each way
export const CHECK = {
  parent: [50, 50],
  c: [
    [50, 40],
    [0, 10],
  ],
  d: [
    [35, 15],
    [15, 35],
  ],
} as const satisfies Record<string, Counts | Counts[]>

// ------------------------------------------------------ the story's Saturdays

// [temperature °C, wind km/h, she joined (1) or stayed home (0)]. Mostly she
// runs on warm, calm days; she skipped one for a birthday (22°, 8 km/h) and
// once came out in the cold (8°, 10 km/h).
const SATURDAY_ROWS: [number, number, number][] = [
  [2, 12, 0], [4, 30, 0], [5, 6, 0], [6, 20, 0], [7, 35, 0], [8, 10, 1], [9, 26, 0], [10, 15, 0], [11, 4, 0], [3, 18, 0],
  [13, 8, 1], [14, 15, 1], [16, 5, 1], [18, 12, 1], [19, 18, 1], [21, 3, 1], [22, 8, 0], [24, 14, 1], [26, 10, 1],
  [28, 6, 1], [17, 20, 1], [15, 2, 1],
  [14, 30, 0], [18, 34, 0], [20, 26, 0], [23, 38, 0], [25, 28, 0], [27, 32, 0],
]
export const SATURDAYS: Point[] = SATURDAY_ROWS.map(([t, w, y]) => ({ x: [t, w], y }))
export const SATURDAY_BOX: Box = [
  [0, 30],
  [0, 40],
]
export const SATURDAY_FEATURES = ['temp', 'wind'] as const
export const SATURDAY_UNITS = ['°', ' km/h'] as const

// The question you might ask first, "warmer than 12°?"
export const FIRST_GUESS: Split = (() => {
  const threshold = 12
  const left = SATURDAYS.filter((p) => p.x[0] < threshold)
  const right = SATURDAYS.filter((p) => p.x[0] >= threshold)
  return {
    feature: 0,
    threshold,
    decrease: decrease(countsOf(SATURDAYS), [countsOf(left), countsOf(right)], gini),
  }
})()

// A tree of one given question: the root and its two piles
export function splitOnce(points: Point[], box: Box, split: Split): Tree {
  const counts = countsOf(points)
  const label = majority(counts, 0)
  const { feature: f, threshold: t } = split
  const side = (yes: boolean): Leaf => {
    const here = countsOf(points.filter((p) => (p.x[f] < t) === yes))
    return {
      kind: 'leaf',
      counts: here,
      depth: 1,
      box: box.map((r, i) => (i === f ? (yes ? [r[0], t] : [t, r[1]]) : r)) as Box,
      label: majority(here, label),
    }
  }
  return { kind: 'node', counts, depth: 0, box, split, left: side(true), right: side(false) }
}

export const FIRST_GUESS_TREE = splitOnce(SATURDAYS, SATURDAY_BOX, FIRST_GUESS)

// Every question on the Saturdays, scored, in the order the search tries
// them, and the one-question tree each makes
export const SATURDAY_SCORES = scoreAll(SATURDAYS)
export const SWEEP_TREES = SATURDAY_SCORES.map((split) => splitOnce(SATURDAYS, SATURDAY_BOX, split))
// The two days no simple rule explains: the cold run and the birthday
export const ODD_DAYS = [5, 16]
export const SATURDAY_TREES = [0, 1, 2, Infinity].map((maxDepth) => grow(SATURDAYS, SATURDAY_BOX, { maxDepth }))

// What lands on each side of a split: [left counts, right counts]
export function piles(points: Point[], split: { feature: number; threshold: number }): [Counts, Counts] {
  return [
    countsOf(points.filter((p) => p.x[split.feature] < split.threshold)),
    countsOf(points.filter((p) => p.x[split.feature] >= split.threshold)),
  ]
}

// --------------------------------------------------------- the real system

// Two features on [0, 10] each; the true class is 1 above a rising S-shaped
// curve and 0 below it, and one label in ten is flipped (noise no rule can
// learn). Seeded, so the figure and the page's numbers never change.
export const PLANE_BOX: Box = [
  [0, 10],
  [0, 10],
]
export const NOISE = 0.1
export const TRAIN_SIZE = 200
export const TEST_SIZE = 3000

// Where the true boundary is, at x₁
export const boundary = (x1: number) => 2 + 6 / (1 + Math.exp(-(x1 - 5)))
export const truth = (x: number[]) => (x[1] > boundary(x[0]) ? 1 : 0)

export function sample(random: () => number, n: number, noise = NOISE): Point[] {
  return Array.from({ length: n }, () => {
    const x = [Math.round(random() * 1000) / 100, Math.round(random() * 1000) / 100]
    const flip = random() < noise
    return { x, y: flip ? 1 - truth(x) : truth(x) }
  })
}

export const TRAIN = sample(seeded(2), TRAIN_SIZE)
export const TEST = sample(seeded(102), TEST_SIZE)

export const MIN_LEAVES = [1, 5, 15] as const
export type MinLeaf = (typeof MIN_LEAVES)[number]

// The fully grown tree's depth, the deepest the lab's slider goes
export const FULL_DEPTH = depthOf(grow(TRAIN, PLANE_BOX))

export interface Grown {
  depth: number
  tree: Tree
  train: number
  test: number
  leaves: number
}

// Every tree the lab can show, grown once: by smallest leaf, then depth
export const GROWN: Record<MinLeaf, Grown[]> = Object.fromEntries(
  MIN_LEAVES.map((minLeaf) => [
    minLeaf,
    Array.from({ length: FULL_DEPTH + 1 }, (_, depth) => {
      const tree = grow(TRAIN, PLANE_BOX, { maxDepth: depth, minLeaf })
      return { depth, tree, train: accuracy(tree, TRAIN), test: accuracy(tree, TEST), leaves: leaves(tree).length }
    }),
  ]),
) as Record<MinLeaf, Grown[]>

// The depth whose tree does best on the test points, smallest leaf 1
export const BEST: Grown = GROWN[1].reduce((best, g) => (g.test > best.test + 1e-12 ? g : best))
export const FULL: Grown = GROWN[1][FULL_DEPTH]

export const pct = (share: number) => `${Math.round(100 * share)}%`
export const three = (value: number) => value.toFixed(3)
