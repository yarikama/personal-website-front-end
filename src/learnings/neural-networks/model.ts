import { seeded } from '../../components/explain/random'

// A neural network on word counts, small enough to check by hand: three
// words in, a hidden layer of helpers, one chance out. Every number the page
// states comes from here; the figures only draw.

// --- Reviews as word counts

export const WORDS = ['not', 'good', 'boring'] as const
export const NOT = 0
export const GOOD = 1
export const BORING = 2

export interface Review {
  text: string
  counts: number[]
  happy: boolean
}

// How often each word of WORDS appears in the text; other words are ignored
export const countsOf = (text: string) => {
  const tokens = text.toLowerCase().split(/\s+/)
  return WORDS.map((word) => tokens.filter((t) => t === word).length)
}

const review = (text: string, happy: boolean): Review => ({ text, counts: countsOf(text), happy })

// The four reviews: “not” turns each word's meaning round
export const REVIEWS: Review[] = [
  review('good', true),
  review('not good', false),
  review('boring', false),
  review('not boring', true),
]

// --- One tally: logistic regression on the counts

export interface Tally {
  points: number[]
  start: number
}

export const tallyOf = ({ points, start }: Tally, counts: number[]) =>
  counts.reduce((sum, c, j) => sum + c * points[j], start)

// Called happy when the tally is above zero; a tally of exactly zero is
// no call, and counts as wrong
export const callsRight = (tally: Tally, r: Review) => {
  const t = tallyOf(tally, r.counts)
  return r.happy ? t > 0 : t < 0
}

export const rightOf = (tally: Tally, reviews: Review[] = REVIEWS) => reviews.filter((r) => callsRight(tally, r)).length

// The story's tally: good +2, boring −2, and “not” swept from −4 to +4
export const STORY_TALLY: Tally = { points: [0, 2, -2], start: 0 }
export const NOT_SWEEP: [number, number] = [-4, 4]
export const withNot = (points: number) => ({ ...STORY_TALLY, points: [points, ...STORY_TALLY.points.slice(1)] })

// Why no tally gets all four: the two happy reviews hold, between them,
// exactly the words of the two unhappy ones, so their tallies add up to the
// same total. Two above zero and two below can't share a sum.
export const sumOf = (tally: Tally, happy: boolean, reviews: Review[] = REVIEWS) =>
  reviews.filter((r) => r.happy === happy).reduce((sum, r) => sum + tallyOf(tally, r.counts), 0)

// --- The network

export const sigmoid = (z: number) => (z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z)))

// Hidden weights W (one row per helper, one column per word), each helper's
// start b, your trust in each helper v, and your own start c
export interface Net {
  W: number[][]
  b: number[]
  v: number[]
  c: number
}

export interface Pass {
  // Each helper's tally, and how sure it is (its flag, 0 to 1)
  a: number[]
  z: number[]
  // Your tally, and the chance you give a happy customer
  s: number
  p: number
}

export function forward(net: Net, counts: number[], squash = true): Pass {
  const a = net.W.map((row, k) => counts.reduce((sum, x, j) => sum + row[j] * x, net.b[k]))
  const z = squash ? a.map(sigmoid) : a
  const s = z.reduce((sum, zk, k) => sum + net.v[k] * zk, net.c)
  return { a, z, s, p: sigmoid(s) }
}

// −ln of the chance given to what happened, from the score so it stays finite
export function lossOf(net: Net, r: Review): number {
  const { s } = forward(net, r.counts)
  const against = r.happy ? -s : s
  return against > 0 ? against + Math.log1p(Math.exp(-against)) : Math.log1p(Math.exp(against))
}

export const totalLoss = (net: Net, reviews: Review[] = REVIEWS) => reviews.reduce((sum, r) => sum + lossOf(net, r), 0)

// Cross-entropy between a target spread q over the labels and the model's
// chances p: −Σ q ln p
export const crossEntropy = (q: number[], p: number[]) => q.reduce((sum, qi, i) => (qi === 0 ? sum : sum - qi * Math.log(p[i])), 0)

export interface Backward {
  pass: Pass
  // Your blame, ∂loss/∂s = p − y, and each helper's, ∂loss/∂a_k
  blame: number
  shares: number[]
  grad: Net
}

// Backpropagation for one review: your blame first, then each helper's
// share of it, then each word weight's, each reusing the one before
export function backward(net: Net, r: Review): Backward {
  const pass = forward(net, r.counts)
  const blame = pass.p - (r.happy ? 1 : 0)
  const shares = pass.z.map((zk, k) => blame * net.v[k] * zk * (1 - zk))
  return {
    pass,
    blame,
    shares,
    grad: {
      W: shares.map((share) => r.counts.map((x) => share * x)),
      b: shares,
      v: pass.z.map((zk) => blame * zk),
      c: blame,
    },
  }
}

const zeroLike = (net: Net): Net => ({
  W: net.W.map((row) => row.map(() => 0)),
  b: net.b.map(() => 0),
  v: net.v.map(() => 0),
  c: 0,
})

export function gradient(net: Net, reviews: Review[] = REVIEWS): Net {
  const total = zeroLike(net)
  for (const r of reviews) {
    const { grad } = backward(net, r)
    grad.W.forEach((row, k) => row.forEach((g, j) => (total.W[k][j] += g)))
    grad.b.forEach((g, k) => (total.b[k] += g))
    grad.v.forEach((g, k) => (total.v[k] += g))
    total.c += grad.c
  }
  return total
}

// One step of gradient descent on the summed loss
export function step(net: Net, eta: number, reviews: Review[] = REVIEWS): Net {
  const g = gradient(net, reviews)
  return {
    W: net.W.map((row, k) => row.map((w, j) => w - eta * g.W[k][j])),
    b: net.b.map((w, k) => w - eta * g.b[k]),
    v: net.v.map((w, k) => w - eta * g.v[k]),
    c: net.c - eta * g.c,
  }
}

export function train(net: Net, rounds: number, eta = ETA, reviews: Review[] = REVIEWS): Net[] {
  const path = [net]
  let at = net
  for (let i = 0; i < rounds; i++) {
    at = step(at, eta, reviews)
    path.push(at)
  }
  return path
}

// Small random weights, the same every time for a seed
export function randomNet(seed: number, helpers = 2, scale = 1): Net {
  const random = seeded(seed)
  const draw = () => (random() * 2 - 1) * scale
  return {
    W: Array.from({ length: helpers }, () => WORDS.map(draw)),
    b: Array.from({ length: helpers }, draw),
    v: Array.from({ length: helpers }, draw),
    c: draw(),
  }
}

export const netRight = (net: Net, reviews: Review[] = REVIEWS) =>
  reviews.filter((r) => {
    const { p } = forward(net, r.counts)
    return r.happy ? p > 0.5 : p < 0.5
  }).length

// Without the squash, a tally of tallies is one tally: vᵀW per word, vᵀb + c to start
export const flatten = (net: Net): Tally => ({
  points: WORDS.map((_, j) => net.W.reduce((sum, row, k) => sum + net.v[k] * row[j], 0)),
  start: net.b.reduce((sum, bk, k) => sum + net.v[k] * bk, net.c),
})

// --- The story's helpers, set by hand: Ana flags “good” without “not”,
// Ben flags “not” with “boring”, and you trust either flag

export const HELPERS = ['Ana', 'Ben'] as const
export const HAND: Net = {
  W: [
    [-6, 6, 0],
    [6, 0, 6],
  ],
  b: [-3, -9],
  v: [6, 6],
  c: -3,
}

// --- The story's training: two helpers from a random start

export const ETA = 1
export const STORY_SEED = 3
export const STORY_ROUNDS = 600
export const STORY_START = randomNet(STORY_SEED)
export const STORY_PATH = train(STORY_START, STORY_ROUNDS)
export const STORY_END = STORY_PATH[STORY_ROUNDS]
// The first round after which every review is called right
export const FIRST_ALL_RIGHT = STORY_PATH.findIndex((net) => netRight(net) === REVIEWS.length)

// What each trained helper ends up flagging: the reviews it is over 50% on
export const FLAGGED = STORY_END.b.map((_, k) => REVIEWS.filter((r) => forward(STORY_END, r.counts).z[k] > 0.5).map((r) => r.text))

// The review the story blames on, and the worked numbers: at the random
// start, “not boring”, through the helper that takes more of the blame
export const BLAMED = REVIEWS[3]
export const WORKED = backward(STORY_START, BLAMED)
export const WORKED_HELPER = WORKED.shares[0] ** 2 >= WORKED.shares[1] ** 2 ? 0 : 1
export const WORKED_WEIGHT = WORKED.grad.W[WORKED_HELPER][NOT]

// --- The lab: the helpers' plane, one axis per helper's tally

export const LAB_ROUNDS = 1500
// The lab opens where training from the story's start ends
export const LAB_END = train(STORY_START, LAB_ROUNDS)[LAB_ROUNDS]
export const ROUNDS_PER_FRAME = 6

// The 50% line in the plane, where v₁σ(a₁) + v₂σ(a₂) + c = 0, as segments
// from a grid by marching squares
export function boundary(net: Net, range: [number, number], cells = 60): [number, number, number, number][] {
  const [lo, hi] = range
  const size = (hi - lo) / cells
  const at = (i: number) => lo + i * size
  const score = (a1: number, a2: number) => net.v[0] * sigmoid(a1) + net.v[1] * sigmoid(a2) + net.c
  const grid = Array.from({ length: cells + 1 }, (_, i) => Array.from({ length: cells + 1 }, (_, j) => score(at(i), at(j))))
  const segments: [number, number, number, number][] = []
  // Where the score crosses zero along an edge, from (x0, y0) to (x1, y1)
  const cross = (x0: number, y0: number, f0: number, x1: number, y1: number, f1: number): [number, number] => {
    const t = f0 / (f0 - f1)
    return [x0 + t * (x1 - x0), y0 + t * (y1 - y0)]
  }
  for (let i = 0; i < cells; i++) {
    for (let j = 0; j < cells; j++) {
      const corners: [number, number, number][] = [
        [at(i), at(j), grid[i][j]],
        [at(i + 1), at(j), grid[i + 1][j]],
        [at(i + 1), at(j + 1), grid[i + 1][j + 1]],
        [at(i), at(j + 1), grid[i][j + 1]],
      ]
      const points: [number, number][] = []
      for (let e = 0; e < 4; e++) {
        const [x0, y0, f0] = corners[e]
        const [x1, y1, f1] = corners[(e + 1) % 4]
        if (f0 > 0 !== f1 > 0) points.push(cross(x0, y0, f0, x1, y1, f1))
      }
      for (let n = 0; n + 1 < points.length; n += 2) segments.push([...points[n], ...points[n + 1]])
    }
  }
  return segments
}

// --- Check yourself: one weight's slope, worked from a blame

export const CHECK = { blame: -0.4, trust: 2, flag: 0.5, count: 2 }
export const checkSlope = ({ blame, trust, flag, count } = CHECK) => blame * trust * flag * (1 - flag) * count
export const CHECK_OPTIONS = [
  checkSlope(),
  checkSlope({ ...CHECK, count: 1 }),
  CHECK.blame * CHECK.trust * CHECK.count,
  -checkSlope(),
]

// --- Formatting

export const two = (v: number) => v.toFixed(2)
export const signed = (v: number, digits = 2) => `${v < 0 ? '−' : '+'}${Math.abs(v).toFixed(digits)}`
export const pct = (p: number) => `${Math.round(100 * p)}%`
