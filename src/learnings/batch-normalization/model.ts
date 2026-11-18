import { seeded } from '../../components/explain/random'

// Batch normalization, small enough to check by hand: a batch's average and
// spread, the normalized values, the learned scale and shift, the running
// averages kept for test time, a stack of layers with and without it, and how
// much one example's output wobbles with the batch it lands in. Every number
// the page states comes from here; the figures only draw.

// A draw from the standard normal (Box–Muller)
export function normal(random: () => number): number {
  const u = 1 - random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random())
}

export const mean = (xs: number[]) => xs.reduce((sum, x) => sum + x, 0) / xs.length

// The batch's variance: the average squared gap from its mean, dividing by m
// as batch normalization does
export const variance = (xs: number[]) => {
  const mu = mean(xs)
  return xs.reduce((sum, x) => sum + (x - mu) ** 2, 0) / xs.length
}

// The spread: the square root of the variance, with ε inside so a batch of
// identical values never divides by zero
export const spread = (xs: number[], eps = 0) => Math.sqrt(variance(xs) + eps)

// Subtract the batch's mean, divide by its spread
export function normalize(xs: number[], eps = 0): number[] {
  const mu = mean(xs)
  const sigma = spread(xs, eps)
  return xs.map((x) => (x - mu) / sigma)
}

// Then the learned scale γ and shift β
export const batchNorm = (xs: number[], gamma: number, beta: number, eps = 0) =>
  normalize(xs, eps).map((z) => gamma * z + beta)

// The ε frameworks use (PyTorch's default)
export const EPS = 1e-5

// --- The worked numbers -----------------------------------------------------

// One channel's value for each of four photos in a batch
export const WORKED_BATCH = [13, 19, 21, 27]
export const WORKED_MEAN = mean(WORKED_BATCH) // 20
export const WORKED_SPREAD = spread(WORKED_BATCH) // 5
export const WORKED_GAMMA = 2
export const WORKED_BETA = 1
export const WORKED_NORMALIZED = normalize(WORKED_BATCH) // −1.4, −0.2, 0.2, 1.4
export const WORKED_OUT = batchNorm(WORKED_BATCH, WORKED_GAMMA, WORKED_BETA) // −1.8, 0.6, 1.4, 3.8

// In a convolutional layer a channel's average and spread are taken over
// every position of every image: a batch of 32 images of 56 × 56
export const CONV_BATCH = 32
export const CONV_SIDE = 56
export const CONV_COUNT = CONV_BATCH * CONV_SIDE * CONV_SIDE // 100,352

// The last check: a batch of two
export const PAIR = [3, 10]
export const PAIR_OUT = normalize(PAIR) // −1, +1
// What it would be with the n − 1 spread some calculators use
export const PAIR_SAMPLE = PAIR.map((x) => (x - mean(PAIR)) / Math.sqrt((variance(PAIR) * PAIR.length) / (PAIR.length - 1)))

// --- The classroom story ----------------------------------------------------

// Eight students' scores on two quizzes. Maths averages 50 with a spread of
// exactly 5; next week's maths quiz is harder and every score is 20 lower;
// art sits high and close together.
export const MATHS_WEEK_1 = [44, 45, 46, 47, 50, 54, 57, 57]
export const MATHS_WEEK_2 = MATHS_WEEK_1.map((x) => x - 20)
export const ART = [88, 90, 91, 92, 94, 95, 96, 98]
// Which student is you: the first of the two 57s in maths, and the 92 in art
export const YOU = 6
export const YOU_ART = 3

// The two numbers the school picks for each quiz: grade = β + γ × curved
export const SCHOOL = { maths: { gamma: 10, beta: 75 }, art: { gamma: 6, beta: 85 } }

export const curved = (xs: number[]) => normalize(xs)
export const graded = (xs: number[], subject: keyof typeof SCHOOL) =>
  batchNorm(xs, SCHOOL[subject].gamma, SCHOOL[subject].beta)

// The running average a layer keeps while it trains: after each batch, move
// a fraction `momentum` of the way to that batch's value (PyTorch: 0.1)
export function runningAverage(values: number[], start: number, momentum = 0.1): number {
  let kept = start
  for (const v of values) kept += momentum * (v - kept)
  return kept
}

// A long run of art quizzes: 100 classes of 8, each drawn around an average of 93
// with a spread of 3. The running mean and variance start where PyTorch's do
// (0 and 1) and are updated after every class.
export const TERM_LENGTH = 100
export const TERM_CLASSES = (() => {
  const random = seeded(7)
  return Array.from({ length: TERM_LENGTH }, () => Array.from({ length: 8 }, () => 93 + 3 * normal(random)))
})()
export const KEPT_MEAN = runningAverage(TERM_CLASSES.map(mean), 0)
export const KEPT_SPREAD = Math.sqrt(runningAverage(TERM_CLASSES.map(variance), 1))
// The late student sits the art quiz alone, and scores 96
export const LATE_SCORE = 96
export const LATE_CURVED = (LATE_SCORE - KEPT_MEAN) / KEPT_SPREAD
export const LATE_GRADE = SCHOOL.art.beta + SCHOOL.art.gamma * LATE_CURVED

// --- How the batch it lands in moves one value -------------------------------

// A value that sits 1.4 spreads above the average of everything the channel
// sees: 27 when the channel's values run around 20 with a spread of 5 (or 57
// around 50, in the story)
export const TRUE_Z = 1.4

// `count` batches of size m, each holding our value and m − 1 others drawn
// from the channel's usual values; our value's normalized output in each
export function wobble(m: number, count: number, seed: number, centre = 20, width = 5): number[] {
  const random = seeded(seed)
  const ours = centre + TRUE_Z * width
  return Array.from({ length: count }, () => {
    const batch = [ours, ...Array.from({ length: m - 1 }, () => centre + width * normal(random))]
    return normalize(batch, EPS)[0]
  })
}

// How far the outputs typically land from where they would with the whole
// dataset: the root mean square of the miss
export const typicalMiss = (outputs: number[]) =>
  Math.sqrt(outputs.reduce((sum, z) => sum + (z - TRUE_Z) ** 2, 0) / outputs.length)

// The story's classes of three, in maths: your 57 with two classmates each
export const STORY_CLASS = 3
export const STORY_CLASSES = 30
export const STORY_WOBBLE = wobble(STORY_CLASS, STORY_CLASSES, 11, 50, 5)

// The lab's batch sizes, each with 40 batches
export const BATCH_SIZES = [4, 16, 64, 256] as const
export type BatchSize = (typeof BATCH_SIZES)[number]
export const LAB_BATCHES = 40
export const LAB_WOBBLE = new Map<BatchSize, number[]>(BATCH_SIZES.map((m) => [m, wobble(m, LAB_BATCHES, 100 + m)]))

// --- A stack of layers -------------------------------------------------------

// A toy network: 64 examples, 32 units a layer, 20 layers, each a matrix of
// random weights then a ReLU. The weights are drawn at the usual size for a
// ReLU network (variance 2 / 32) times a gain, so each layer multiplies the
// numbers' size by about the gain. With batch normalization, each unit is
// normalized over the batch before its ReLU. The same weights are used with
// and without, so the two runs differ only in the normalizing.
export const DEPTH = 20
export const WIDTH = 32
export const BATCH = 64
export const GAINS = [0.8, 1, 1.25] as const
export type Gain = (typeof GAINS)[number]

const relu = (x: number) => Math.max(0, x)

// The root mean square of a layer's outputs: how big its numbers typically are
export const rms = (rows: number[][]) =>
  Math.sqrt(rows.reduce((sum, row) => sum + row.reduce((s, x) => s + x * x, 0), 0) / (rows.length * rows[0].length))

// The weights, one matrix a layer, at the plain size; a gain scales them
export const STACK_WEIGHTS = (() => {
  const random = seeded(2015)
  const size = Math.sqrt(2 / WIDTH)
  return Array.from({ length: DEPTH }, () =>
    Array.from({ length: WIDTH }, () => Array.from({ length: WIDTH }, () => size * normal(random))),
  )
})()
export const STACK_INPUT = (() => {
  const random = seeded(1502)
  return Array.from({ length: BATCH }, () => Array.from({ length: WIDTH }, () => normal(random)))
})()

// Normalize each unit (column) over the batch (rows)
export function normalizeColumns(rows: number[][], eps = EPS): number[][] {
  const columns = rows[0].map((_, j) => normalize(rows.map((row) => row[j]), eps))
  return rows.map((_, i) => columns.map((column) => column[i]))
}

// The size of each layer's outputs, layer 1 to DEPTH
export function stack(gain: number, withNorm: boolean, weights = STACK_WEIGHTS, input = STACK_INPUT): number[] {
  let rows = input
  const sizes: number[] = []
  for (const w of weights) {
    let z = rows.map((row) => w.map((weightsOf) => gain * weightsOf.reduce((s, wij, j) => s + wij * row[j], 0)))
    if (withNorm) z = normalizeColumns(z)
    rows = z.map((row) => row.map(relu))
    sizes.push(rms(rows))
  }
  return sizes
}

export const STACKS = new Map<Gain, { without: number[]; with: number[] }>(
  GAINS.map((g) => [g, { without: stack(g, false), with: stack(g, true) }]),
)

// --- Formatting --------------------------------------------------------------

export const signed = (x: number, digits = 1) => `${x < 0 ? '−' : x > 0 ? '+' : ''}${Math.abs(x).toFixed(digits)}`
export const plain = (x: number, digits = 1) => `${x < 0 ? '−' : ''}${Math.abs(x).toFixed(digits)}`
// A size on the log scale, to two significant figures
export const size = (x: number) => (x >= 10 ? x.toFixed(0) : x >= 1 ? x.toFixed(1) : x.toPrecision(2))
