import { seeded } from '../../components/explain/random'

// Every number the GloVe page states. The figures only draw.

// ---------------------------------------------------------------------------
// The story: two flatmates' receipts, each item counted per 1,000 items bought

export interface Row {
  // What the row is about, in the story and once relabelled
  label: string
  // How often it turns up beside each of the two, per 1,000
  first: number
  second: number
  // The ratio first ÷ second, as it is quoted (the paper's, for its rows)
  ratio: number
}

const story = (label: string, first: number, second: number): Row => ({ label, first, second, ratio: first / second })

export const BASKETS: Row[] = [
  story('Milk', 60, 50),
  story('Ski wax', 8, 1),
  story('Coffee filters', 1, 10),
  story('Batteries', 2, 2),
]

// Pennington, Socher and Manning (2014), Table 1: P(k | ice) and P(k | steam)
// from a 6-billion-word corpus, here per 1,000 neighbours, with the ratios as
// the paper prints them (worked from unrounded probabilities, so 0.19 ÷ 0.022
// gives 8.6 where the paper says 8.9)
export const ICE_STEAM: Row[] = [
  { label: 'water', first: 3.0, second: 2.2, ratio: 1.36 },
  { label: 'solid', first: 0.19, second: 0.022, ratio: 8.9 },
  { label: 'gas', first: 0.066, second: 0.78, ratio: 0.085 },
  { label: 'fashion', first: 0.017, second: 0.018, ratio: 0.96 },
]

// The guess: near ice, water turns up this many times as often as solid
export const WATER_OVER_SOLID = ICE_STEAM[0].first / ICE_STEAM[1].first

// The ratio axis runs from 1/RATIO_SPAN to RATIO_SPAN, on a log scale
export const RATIO_SPAN = 20

// Where a ratio sits on that axis, from 0 (far left) to 1 (far right)
export function ratioPosition(ratio: number) {
  const clamped = Math.min(RATIO_SPAN, Math.max(1 / RATIO_SPAN, ratio))
  return 0.5 + Math.log(clamped) / (2 * Math.log(RATIO_SPAN))
}

// ---------------------------------------------------------------------------
// The one line of math

// What GloVe asks of a word vector v and a context vector u: u · v ≈ log P.
// For two words, the log of the ratio is u · (v_first − v_second).
export const logRatio = (ratio: number) => Math.log(ratio)

// The log ratios the clip drops in, for solid, gas and water
export const CLIP_LOGS = ['solid', 'gas', 'water'].map((label) => {
  const row = ICE_STEAM.find((r) => r.label === label)!
  return { label, ratio: row.ratio, log: logRatio(row.ratio) }
})

// The weight a pair seen x times gets in the loss: (x / xMax)^alpha, capped
// at 1. GloVe uses xMax = 100 and alpha = 3/4.
export const X_MAX = 100
export const ALPHA = 0.75
export function weight(x: number, xMax = X_MAX, alpha = ALPHA) {
  if (x <= 0) return 0
  return x < xMax ? (x / xMax) ** alpha : 1
}

// The three worked weights under the formula
export const WORKED_WEIGHTS = [1, 10, 100].map((x) => ({ x, weight: weight(x) }))

// The quick check: a pair seen 50,000 times against one seen 40 times
export const CHECK_PAIRS = { common: 50_000, rare: 40, once: 1 }
export const CHECK_WEIGHTS = {
  common: weight(CHECK_PAIRS.common),
  rare: weight(CHECK_PAIRS.rare),
  once: weight(CHECK_PAIRS.once),
}

// ---------------------------------------------------------------------------
// The lab: a corner of a made-up count table, and vectors fitted to it

export const TARGETS = ['king', 'queen', 'man', 'woman', 'doctor', 'nurse'] as const
export const CONTEXTS = ['he', 'she', 'crown', 'palace', 'hospital', 'the'] as const
export type Target = (typeof TARGETS)[number]

// How many of each target word's 1,000 counted neighbours were each context
// word (the rest were other words). Every cell is at least 1, so every
// ratio exists.
export const COUNTS: number[][] = [
  // he she crown palace hospital the
  [30, 5, 20, 15, 1, 60], // king
  [5, 30, 20, 15, 1, 60], // queen
  [40, 6, 1, 1, 3, 60], // man
  [6, 40, 1, 1, 3, 60], // woman
  [20, 8, 1, 1, 25, 60], // doctor
  [4, 28, 1, 1, 25, 60], // nurse
]
export const NEIGHBOURS = 1000

// The same table with he and she evened out for doctor and nurse
export const EVEN = 14
export const EVENED: number[][] = COUNTS.map((row, i) =>
  TARGETS[i] === 'doctor' || TARGETS[i] === 'nurse' ? [EVEN, EVEN, ...row.slice(2)] : [...row],
)

export const COUNT_TABLES = ['As counted', 'Evened out'] as const
export type CountTable = (typeof COUNT_TABLES)[number]

export type Vec = number[]

export interface Fit {
  // A vector for each row word and each column word, and a bias for each
  v: Vec[]
  u: Vec[]
  b: number[]
  c: number[]
  // The weighted squared error left
  loss: number
}

const dotProduct = (a: Vec, b: Vec) => a.reduce((sum, x, i) => sum + x * b[i], 0)

// The weighted squared error of a fit on a table of counts
export function gloveLoss(counts: number[][], fit: Omit<Fit, 'loss'>, weigh: (x: number) => number = weight) {
  let loss = 0
  counts.forEach((row, i) =>
    row.forEach((x, j) => {
      if (x <= 0) return
      const miss = dotProduct(fit.v[i], fit.u[j]) + fit.b[i] + fit.c[j] - Math.log(x)
      loss += weigh(x) * miss * miss
    }),
  )
  return loss
}

// Fit GloVe to a table: find v, u and the biases so that v_i · u_j + b_i + c_j
// is close to log x_ij, each miss squared and weighted by weigh(x_ij). Plain
// gradient descent on the whole table at once, from a seeded start, so the
// same table always gives the same vectors. Pairs never seen (x = 0) carry no
// weight and are skipped.
export function fitGlove(
  counts: number[][],
  { dims = 2, steps = 6000, rate = 0.05, seed = 7, weigh = weight }: {
    dims?: number
    steps?: number
    rate?: number
    seed?: number
    weigh?: (x: number) => number
  } = {},
): Fit {
  const random = seeded(seed)
  const rows = counts.length
  const cols = counts[0].length
  const start = () => Array.from({ length: dims }, () => random() - 0.5)
  let v = Array.from({ length: rows }, start)
  let u = Array.from({ length: cols }, start)
  let b = new Array<number>(rows).fill(0)
  let c = new Array<number>(cols).fill(0)
  const weights = counts.map((row) => row.map((x) => weigh(x)))
  const logs = counts.map((row) => row.map((x) => (x > 0 ? Math.log(x) : 0)))

  for (let step = 0; step < steps; step++) {
    // The weighted miss on every cell
    const g = counts.map((row, i) =>
      row.map((x, j) => (x > 0 ? weights[i][j] * (dotProduct(v[i], u[j]) + b[i] + c[j] - logs[i][j]) : 0)),
    )
    const nextV = v.map((vi, i) => vi.map((value, k) => value - rate * g[i].reduce((sum, gij, j) => sum + gij * u[j][k], 0)))
    const nextU = u.map((uj, j) => uj.map((value, k) => value - rate * g.reduce((sum, gi, i) => sum + gi[j] * v[i][k], 0)))
    b = b.map((value, i) => value - rate * g[i].reduce((sum, gij) => sum + gij, 0))
    c = c.map((value, j) => value - rate * g.reduce((sum, gi) => sum + gi[j], 0))
    v = nextV
    u = nextU
  }
  return { v, u, b, c, loss: gloveLoss(counts, { v, u, b, c }, weigh) }
}

// The six word vectors turned and centred for drawing: the middle of the six
// at the origin, man → woman pointing straight up, and man → king pointing
// right. Turning and mirroring keep every distance, so no answer changes.
export function forDrawing(vectors: Vec[]): Vec[] {
  const at = (word: Target) => vectors[TARGETS.indexOf(word)]
  const mean = [0, 1].map((k) => vectors.reduce((sum, v) => sum + v[k], 0) / vectors.length)
  const up = [at('woman')[0] - at('man')[0], at('woman')[1] - at('man')[1]]
  const angle = Math.PI / 2 - Math.atan2(up[1], up[0])
  const turn = (v: Vec) => {
    const x = v[0] - mean[0]
    const y = v[1] - mean[1]
    return [x * Math.cos(angle) - y * Math.sin(angle), x * Math.sin(angle) + y * Math.cos(angle)]
  }
  const turned = vectors.map(turn)
  const right = turned[TARGETS.indexOf('king')][0] - turned[TARGETS.indexOf('man')][0]
  return right < 0 ? turned.map(([x, y]) => [-x, y]) : turned
}

export interface Answer {
  word: Target
  distance: number
}

export interface Analogy {
  // a is to b as c is to the answer
  a: Target
  b: Target
  c: Target
  // Where b − a + c lands
  point: Vec
  // Every other word, nearest first
  ranked: Answer[]
}

// a : b :: c : ?  Go from c the way a went to b, and take the nearest word,
// leaving out the three in the question
export function analogy(vectors: Vec[], a: Target, b: Target, c: Target): Analogy {
  const at = (word: Target) => vectors[TARGETS.indexOf(word)]
  const point = at(b).map((x, k) => x - at(a)[k] + at(c)[k])
  const ranked = TARGETS.filter((word) => word !== a && word !== b && word !== c)
    .map((word) => ({ word, distance: Math.hypot(...at(word).map((x, k) => x - point[k])) }))
    .sort((p, q) => p.distance - q.distance)
  return { a, b, c, point, ranked }
}

// The same question asked of the table's rows of log probabilities, which
// the vectors are fitted to: the answer whose row best matches row b − row a
// + row c, and by how much it is off, as a typical factor (exp of the root
// mean square gap)
export function rowAnalogy(counts: number[][], a: Target, b: Target, c: Target) {
  const row = (word: Target) => counts[TARGETS.indexOf(word)].map((x) => Math.log(x / NEIGHBOURS))
  const want = row(b).map((x, k) => x - row(a)[k] + row(c)[k])
  return TARGETS.filter((word) => word !== a && word !== b && word !== c)
    .map((word) => {
      const gaps = row(word).map((x, k) => x - want[k])
      return { word, factor: Math.exp(Math.sqrt(gaps.reduce((sum, g) => sum + g * g, 0) / gaps.length)) }
    })
    .sort((p, q) => p.factor - q.factor)
}

export const QUESTIONS = [
  { a: 'man', b: 'king', c: 'woman' },
  { a: 'king', b: 'queen', c: 'man' },
  { a: 'man', b: 'doctor', c: 'woman' },
] as const satisfies readonly { a: Target; b: Target; c: Target }[]

export const questionLabel = (q: { a: Target; b: Target; c: Target }) => `${q.a} : ${q.b} :: ${q.c} : ?`

// The fitted vectors, once for each table, at module level so a figure only draws
export const FITS: Record<CountTable, Fit> = {
  'As counted': fitGlove(COUNTS),
  'Evened out': fitGlove(EVENED),
}
export const DRAWN: Record<CountTable, Vec[]> = {
  'As counted': forDrawing(FITS['As counted'].v),
  'Evened out': forDrawing(FITS['Evened out'].v),
}

// How far each table leans doctor and nurse towards he: P(he | w) ÷ P(she | w)
export const leanTowardHe = (counts: number[][], word: Target) => {
  const row = counts[TARGETS.indexOf(word)]
  return row[CONTEXTS.indexOf('he')] / row[CONTEXTS.indexOf('she')]
}

// The bias numbers the page quotes from the lab
const biased = analogy(DRAWN['As counted'], 'man', 'doctor', 'woman')
const evened = analogy(DRAWN['Evened out'], 'man', 'doctor', 'woman')
export const BIAS = {
  doctorLean: leanTowardHe(COUNTS, 'doctor'),
  nurseLean: leanTowardHe(COUNTS, 'nurse'),
  biasedMiss: biased.ranked[0].distance,
  evenedMiss: evened.ranked[0].distance,
}

// ---------------------------------------------------------------------------
// Check yourself: two pairs' ratio profiles over three context words

export const CHECK_PROFILES = {
  contexts: ['French', 'Italian', 'city'],
  parisRome: [9.1, 0.12, 1.05],
  franceItaly: [8.7, 0.11, 0.98],
}
