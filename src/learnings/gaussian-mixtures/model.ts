// Croissants from two (or three) bakeries, mixed in one bin with no labels.
// Each bakery makes croissants whose weight follows a bell curve: a centre,
// a spread, and its share of the bin. A Gaussian mixture is exactly that, and
// EM fits one by turns: split every croissant between the bakeries by how
// likely each was to make it (the E-step), then refit each bakery from its
// shares (the M-step). k-means is the same loop with every split forced to
// all-or-nothing.

import { seeded } from '../../components/explain/random'

// ---------------------------------------------------------------------------
// One bell curve, and a mixture of them

// A component: its share of the bin (the weight π), its centre (the mean μ)
// and its spread (the standard deviation σ), in grams
export interface Component {
  weight: number
  mean: number
  sd: number
}

export type Mixture = Component[]

// The bell curve's height at x: how likely a croissant of x grams is, per gram
export const density = (x: number, { mean, sd }: { mean: number; sd: number }) =>
  Math.exp(-0.5 * ((x - mean) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI))

// Each component's weight × density at x, worked in logs so a far-off tight
// bell does not round to zero before the others are compared with it
const logJoint = (x: number, mixture: Mixture) =>
  mixture.map(({ weight, mean, sd }) => Math.log(weight) - 0.5 * ((x - mean) / sd) ** 2 - Math.log(sd * Math.sqrt(2 * Math.PI)))

const logSumExp = (values: number[]) => {
  const top = Math.max(...values)
  if (top === -Infinity) return -Infinity
  return top + Math.log(values.reduce((sum, v) => sum + Math.exp(v - top), 0))
}

// The responsibilities at x: for each component, its weight × density there,
// divided by the same summed over all of them. They add up to 1.
export function responsibilities(x: number, mixture: Mixture): number[] {
  const joint = logJoint(x, mixture)
  const total = logSumExp(joint)
  return joint.map((j) => Math.exp(j - total))
}

// How well a mixture explains the data: the sum over points of the log of
// the mixture's density there
export const logLikelihood = (xs: number[], mixture: Mixture) => xs.reduce((sum, x) => sum + logSumExp(logJoint(x, mixture)), 0)

// No spread is allowed below this, in grams, so a bell cannot collapse onto
// a single croissant and send the likelihood to infinity
export const SD_FLOOR = 0.25

// One round of EM. E-step: every point's responsibilities. M-step: each
// component's weight is its total share of the points, its mean the
// share-weighted average, its spread the share-weighted spread around that.
export function emStep(xs: number[], mixture: Mixture): Mixture {
  const shares = xs.map((x) => responsibilities(x, mixture))
  return mixture.map((old, k) => {
    let total = 0
    let sum = 0
    for (let i = 0; i < xs.length; i++) {
      total += shares[i][k]
      sum += shares[i][k] * xs[i]
    }
    // A component no point wants any more keeps what it had
    if (total < 1e-9) return old
    const mean = sum / total
    let squares = 0
    for (let i = 0; i < xs.length; i++) squares += shares[i][k] * (xs[i] - mean) ** 2
    return { weight: total / xs.length, mean, sd: Math.max(SD_FLOOR, Math.sqrt(squares / total)) }
  })
}

// ---------------------------------------------------------------------------
// The hard version: k-means

// The nearest mean to x (the first, on a tie)
export function nearest(x: number, means: number[]) {
  let best = 0
  for (let k = 1; k < means.length; k++) if (Math.abs(x - means[k]) < Math.abs(x - means[best])) best = k
  return best
}

// All of x to the nearest mean, none to the others
export const hardShares = (x: number, means: number[]) => means.map((_, k) => (k === nearest(x, means) ? 1 : 0))

// One round of Lloyd's algorithm on the means: each point to its nearest
// mean, then each mean to the average of its points. The weights and spreads
// are what each cluster's points have, for the readouts; k-means itself does
// not use them.
export function lloydStep(xs: number[], mixture: Mixture): Mixture {
  const means = mixture.map((c) => c.mean)
  const groups = means.map(() => [] as number[])
  for (const x of xs) groups[nearest(x, means)].push(x)
  return groups.map((group, k) => {
    if (group.length === 0) return mixture[k]
    const mean = group.reduce((a, b) => a + b, 0) / group.length
    const sd = Math.sqrt(group.reduce((a, b) => a + (b - mean) ** 2, 0) / group.length)
    return { weight: group.length / xs.length, mean, sd: Math.max(SD_FLOOR, sd) }
  })
}

// Where k-means splits the axis: halfway between neighbouring means
export function boundaries(means: number[]) {
  const sorted = [...means].sort((a, b) => a - b)
  return sorted.slice(1).map((m, i) => (sorted[i] + m) / 2)
}

// ---------------------------------------------------------------------------
// Data

// A normal draw from two uniform ones
export const normal = (random: () => number) => Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random())

export interface Point {
  x: number
  // The component that really made it
  source: number
}

// n points from a mixture: each component makes its share (rounded), in a
// shuffled order, so they arrive mixed
export function sample(mixture: Mixture, n: number, seed: number): Point[] {
  const random = seeded(seed)
  const points: Point[] = []
  let left = n
  mixture.forEach((c, k) => {
    const count = k === mixture.length - 1 ? left : Math.round(n * c.weight)
    left -= count
    for (let i = 0; i < count; i++) points.push({ x: c.mean + c.sd * normal(random), source: k })
  })
  for (let i = points.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[points[i], points[j]] = [points[j], points[i]]
  }
  return points
}

// How a fit labels each point: the component with the largest share
export const labelOf = (x: number, mixture: Mixture, hard: boolean) => {
  const shares = hard ? hardShares(x, mixture.map((c) => c.mean)) : responsibilities(x, mixture)
  return shares.indexOf(Math.max(...shares))
}

function permutations(n: number): number[][] {
  if (n <= 1) return [[0]]
  return permutations(n - 1).flatMap((p) => Array.from({ length: n }, (_, i) => [...p.slice(0, i), n - 1, ...p.slice(i)]))
}

// How many points a fit puts with the wrong bakery, matching its components
// to the real ones whichever way gets the most right
export function misplaced(points: Point[], mixture: Mixture, hard: boolean) {
  const labels = points.map((p) => labelOf(p.x, mixture, hard))
  let best = Infinity
  for (const order of permutations(mixture.length)) {
    const wrong = points.reduce((n, p, i) => n + (order[labels[i]] === p.source ? 0 : 1), 0)
    best = Math.min(best, wrong)
  }
  return best
}

// ---------------------------------------------------------------------------
// A run of rounds

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

// A mixture partway from one round to the next, for drawing: the weights and
// centres in a line, the spreads by their logs
export const between = (a: Mixture, b: Mixture, t: number): Mixture =>
  a.map((c, k) => ({
    weight: lerp(c.weight, b[k].weight, t),
    mean: lerp(c.mean, b[k].mean, t),
    sd: Math.exp(lerp(Math.log(c.sd), Math.log(b[k].sd), t)),
  }))

export interface Round {
  mixture: Mixture
  // The log-likelihood, for EM; k-means does not climb it
  logLikelihood: number
  misplaced: number
}

export function fit(points: Point[], start: Mixture, rounds: number, hard = false): Round[] {
  const xs = points.map((p) => p.x)
  const history: Round[] = []
  let mixture = start
  for (let r = 0; r <= rounds; r++) {
    history.push({ mixture, logLikelihood: logLikelihood(xs, mixture), misplaced: misplaced(points, mixture, hard) })
    if (r < rounds) mixture = hard ? lloydStep(xs, mixture) : emStep(xs, mixture)
  }
  return history
}

// A start from the data alone: k distinct points picked at random for the
// means (in order), every spread the data's whole spread, equal weights
export function randomStart(xs: number[], k: number, seed: number): Mixture {
  const random = seeded(seed)
  const picked = new Set<number>()
  while (picked.size < k) picked.add(Math.floor(random() * xs.length))
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length
  const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length)
  return [...picked]
    .map((i) => xs[i])
    .sort((a, b) => a - b)
    .map((m) => ({ weight: 1 / k, mean: m, sd }))
}

// ---------------------------------------------------------------------------
// The story: Corner bakery, very consistent, and the market stall, not

export const CORNER: Component = { weight: 0.5, mean: 60, sd: 2 }
export const STALL: Component = { weight: 0.5, mean: 80, sd: 8 }
export const BAKERIES: Mixture = [CORNER, STALL]

// Guess first: a croissant exactly halfway
export const HALFWAY = (CORNER.mean + STALL.mean) / 2
// How many of each bakery's spreads away it is
export const spreadsAway = (x: number, c: Component) => Math.abs(x - c.mean) / c.sd
export const guess = () => {
  const [corner, stall] = responsibilities(HALFWAY, BAKERIES)
  return { corner, stall, cornerSpreads: spreadsAway(HALFWAY, CORNER), stallSpreads: spreadsAway(HALFWAY, STALL) }
}

// The worked numbers: three croissants, each weight × height for each
// bakery, then the split. The last has Corner making three in four.
export const WORKED = [
  { grams: 62, mixture: BAKERIES },
  { grams: 66, mixture: BAKERIES },
  { grams: 66, mixture: [{ ...CORNER, weight: 0.75 }, { ...STALL, weight: 0.25 }] },
]
export const worked = () =>
  WORKED.map(({ grams, mixture }) => ({
    grams,
    cornerWeight: mixture[0].weight,
    heights: mixture.map((c) => density(grams, c)),
    corner: responsibilities(grams, mixture)[0],
  }))

// The bin in the story
export const STORY_N = 80
export const STORY_SEED = 11
export const STORY_POINTS = sample(BAKERIES, STORY_N, STORY_SEED)
// A first guess that knows nothing: two bells in the middle, equally wide
export const STORY_START: Mixture = [
  { weight: 0.5, mean: 66, sd: 7 },
  { weight: 0.5, mean: 74, sd: 7 },
]
export const STORY_ROUNDS = 12
export const STORY_FIT = fit(STORY_POINTS, STORY_START, STORY_ROUNDS)

// ---------------------------------------------------------------------------
// The lab: the same two bakeries, or three with a supermarket

export const SUPERMARKET: Component = { weight: 0.25, mean: 100, sd: 3 }

export type Dataset = 'Two bakeries' | 'Three bakeries'
export const DATASETS: Record<Dataset, { mixture: Mixture; n: number; seed: number }> = {
  'Two bakeries': { mixture: BAKERIES, n: 160, seed: 5 },
  'Three bakeries': { mixture: [{ ...CORNER, weight: 0.35 }, { ...STALL, weight: 0.4 }, SUPERMARKET], n: 200, seed: 8 },
}

export const LAB_ROUNDS = 40
// The first start the lab opens on, for each data set
export const FIRST_START = 0

const labPoints = new Map<Dataset, Point[]>()
export function pointsOf(dataset: Dataset) {
  let found = labPoints.get(dataset)
  if (!found) {
    const { mixture, n, seed } = DATASETS[dataset]
    found = sample(mixture, n, seed)
    labPoints.set(dataset, found)
  }
  return found
}

const runs = new Map<string, Round[]>()
// The lab's run for a data set, a start and hard or soft, worked out once
export function labRun(dataset: Dataset, start: number, hard: boolean) {
  const key = `${dataset} ${start} ${hard}`
  let found = runs.get(key)
  if (!found) {
    const points = pointsOf(dataset)
    const k = DATASETS[dataset].mixture.length
    found = fit(points, randomStart(points.map((p) => p.x), k, 100 + start), LAB_ROUNDS, hard)
    runs.set(key, found)
  }
  return found
}

// ---------------------------------------------------------------------------
// Check yourself: two couriers, one on the dot, one anything but

export const COURIERS: Mixture = [
  { weight: 0.5, mean: 0, sd: 5 }, // 10:00, give or take 5 minutes
  { weight: 0.5, mean: 60, sd: 30 }, // 11:00, give or take 30
]
// A parcel at 9:40: 20 minutes before the punctual one
export const PARCEL = -20
export const parcel = () => responsibilities(PARCEL, COURIERS)
