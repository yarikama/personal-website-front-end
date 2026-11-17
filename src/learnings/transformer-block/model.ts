import { seeded } from '../../components/explain/random'

export type Vec = number[]
export type Mat = number[][]

// ---------------------------------------------------------------------------
// The guess: where a block's weights sit, in the original Transformer
// (Vaswani et al. 2017: d_model = 512, d_ff = 2048, 6 blocks a stack)

export const D_MODEL = 512
export const D_FF = 2048
export const BLOCKS = 6

// Multi-head attention: query, key and value maps plus the output map, each
// d × d with a bias. However many heads, the four maps add up to this.
export const attentionWeights = (d: number) => 4 * d * d + 4 * d
// The feed-forward network: d → d_ff → d, each with a bias
export const feedForwardWeights = (d: number, dff: number) => d * dff + dff + dff * d + d
// One layer norm: a gain and a shift per number; a block has two
export const normWeights = (d: number) => 2 * d

export function blockWeights(d = D_MODEL, dff = D_FF) {
  const attention = attentionWeights(d)
  const feedForward = feedForwardWeights(d, dff)
  const norms = 2 * normWeights(d)
  return { attention, feedForward, norms, total: attention + feedForward + norms }
}

// ---------------------------------------------------------------------------
// The one line of math: layer normalization of one word's vector

export const mean = (x: Vec) => x.reduce((s, v) => s + v, 0) / x.length
// The spread: the standard deviation over the vector's own numbers
export const spread = (x: Vec) => {
  const m = mean(x)
  return Math.sqrt(x.reduce((s, v) => s + (v - m) ** 2, 0) / x.length)
}

// Subtract the vector's mean, divide by its spread, then scale by the gain
// and add the shift (learned in a real model; 1 and 0 here). `eps` keeps a
// flat vector from dividing by zero.
export function layerNorm(x: Vec, gain = 1, shift = 0, eps = 1e-6): Vec {
  const m = mean(x)
  const s = Math.sqrt(spread(x) ** 2 + eps)
  return x.map((v) => gain * ((v - m) / s) + shift)
}

// The worked numbers: one notebook, the same ten times louder, and the same
// with 7 added to every score. All three even out to the same thing.
export const WORKED = {
  notes: [2, 4, 4, 10],
  louder: [20, 40, 40, 100],
  shifted: [9, 11, 11, 17],
}

// ---------------------------------------------------------------------------
// The story: four friends plan a trip, each with a notebook of four scores.
// A real (tiny) Transformer block runs on their notebooks: self-attention,
// add and norm, the feed-forward network, add and norm.

export const FRIENDS = ['Ana', 'Ben', 'Cal', 'Dee'] as const
export const TOPICS = ['beach', 'city', 'hiking', 'budget'] as const
// What the friends turn into at the reveal: a sentence's words
export const WORDS = ['we', 'love', 'the', 'sea'] as const
export const D = TOPICS.length

// Their first notes. Ana is mild, Cal scores everything loudly.
export const START: Mat = [
  [1.2, -0.2, 0, -0.6],
  [-0.4, 1.4, -0.6, 0.2],
  [-1.6, -0.8, 3.2, -2],
  [-0.2, -0.6, 0, 1.2],
]

export const dot = (a: Vec, b: Vec) => a.reduce((s, v, i) => s + v * b[i], 0)
export const add = (a: Vec, b: Vec) => a.map((v, i) => v + b[i])
const matVec = (w: Mat, x: Vec) => w.map((row) => dot(row, x))

export function softmax(scores: Vec): Vec {
  const top = Math.max(...scores)
  const e = scores.map((s) => Math.exp(s - top))
  const total = e.reduce((s, v) => s + v, 0)
  return e.map((v) => v / total)
}

// One head of self-attention with the identity for its query, key and value
// maps (the self-attention page is where those maps are taught): each
// friend's meeting notes are an average of everyone's notebooks, weighted by
// how alike they are, scaled by √d.
export function attentionWeightsOf(x: Mat): Mat {
  return x.map((q) => softmax(x.map((k) => dot(q, k) / Math.sqrt(D))))
}
export function attend(x: Mat, value = VALUE): Mat {
  const weights = attentionWeightsOf(x)
  return weights.map((row) => x[0].map((_, j) => value * row.reduce((s, a, i) => s + a * x[i][j], 0)))
}
// The value map: a plain scaling, so what a friend hears adds to their
// notes without drowning them
export const VALUE = 0.5

// The feed-forward network: the same two small layers for every friend,
// d → 2d with a ReLU, then back to d. Weights drawn once, from a seed.
export interface FeedForward {
  w1: Mat
  b1: Vec
  w2: Mat
  b2: Vec
}

function normal(random: () => number) {
  // Box–Muller
  const u = Math.max(random(), 1e-12)
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random())
}

// How big the feed-forward network's change is, next to the notes it adds to
export const OUT = 0.5

export function drawFeedForward(seed: number, d = D, hidden = 2 * D): FeedForward {
  const random = seeded(seed)
  const scale1 = 1 / Math.sqrt(d)
  const scale2 = OUT / Math.sqrt(hidden)
  const w1 = Array.from({ length: hidden }, () => Array.from({ length: d }, () => scale1 * normal(random)))
  const b1 = Array.from({ length: hidden }, () => 0.1 * normal(random))
  const w2 = Array.from({ length: d }, () => Array.from({ length: hidden }, () => scale2 * normal(random)))
  const b2 = Array.from({ length: d }, () => 0.1 * normal(random))
  return { w1, b1, w2, b2 }
}

export function feedForward(net: FeedForward, x: Vec): Vec {
  const h = matVec(net.w1, x).map((v, i) => Math.max(0, v + net.b1[i]))
  return matVec(net.w2, h).map((v, i) => v + net.b2[i])
}

// One block, every stage kept for the story. `skip` false rewrites the
// notebook from each step instead of adding to it (no residual connection).
export interface Round {
  input: Mat
  heard: Mat // what attention brings each friend
  added: Mat // input + heard
  evened: Mat // layer norm of that
  thought: Mat // the feed-forward network's change
  output: Mat // layer norm of evened + thought
}

export function runBlock(x: Mat, net: FeedForward, skip = true): Round {
  const heard = attend(x)
  const added = skip ? x.map((row, i) => add(row, heard[i])) : heard
  const evened = added.map((row) => layerNorm(row))
  const thought = evened.map((row) => feedForward(net, row))
  const output = evened.map((row, i) => layerNorm(skip ? add(row, thought[i]) : thought[i]))
  return { input: x, heard, added, evened, thought, output }
}

// Rounds in the story, and the seed for each round's feed-forward weights
export const ROUNDS = BLOCKS
export const SEED = 7
export const NETS = Array.from({ length: ROUNDS }, (_, k) => drawFeedForward(SEED + k))

export function runRounds(x: Mat, skip: boolean, nets = NETS): Round[] {
  const rounds: Round[] = []
  let at = x
  for (const net of nets) {
    const round = runBlock(at, net, skip)
    rounds.push(round)
    at = round.output
  }
  return rounds
}

// How alike two notebooks are in shape: the cosine of their mean-removed
// scores, 1 for the same pattern at any volume
export function alike(a: Vec, b: Vec): number {
  const ca = a.map((v) => v - mean(a))
  const cb = b.map((v) => v - mean(b))
  return dot(ca, cb) / Math.sqrt(dot(ca, ca) * dot(cb, cb))
}

// The least alike two friends' notebooks are: near 1 means they all say
// the same thing
export function leastAlike(x: Mat): number {
  let least = 1
  for (let i = 0; i < x.length; i++) for (let j = i + 1; j < x.length; j++) least = Math.min(least, alike(x[i], x[j]))
  return least
}

// How much each friend's final notebook still looks like their own start
export const ownStart = (start: Mat, end: Mat) => start.map((row, i) => alike(row, end[i]))

// Worked out once, for the story and its figure
export const ADDING = runRounds(START, true)
export const REWRITING = runRounds(START, false)
export const FIRST = ADDING[0]

// ---------------------------------------------------------------------------
// The three families, and what each word may look at

export type Family = 'Encoder only' | 'Decoder only' | 'Encoder–decoder'
export const FAMILIES: readonly Family[] = ['Encoder only', 'Decoder only', 'Encoder–decoder']

export const READ = ['the', 'film', 'was', 'not', 'good'] as const
export const SOURCE = ['the', 'cat', 'sleeps'] as const
export const TARGET = ['<s>', 'le', 'chat', 'dort'] as const

// The words a word at `at` may look at in its own stack: all of them in an
// encoder, itself and those before it in a decoder
export function sees(family: Family, at: number, length: number): number[] {
  const all = Array.from({ length }, (_, j) => j)
  return family === 'Encoder only' ? all : all.filter((j) => j <= at)
}

// ---------------------------------------------------------------------------
// The cost: every word scored against every word, per head, per block

export const pairs = (n: number) => n * n
export const LENGTHS = [512, 4096, 50_000] as const

// The story's numbers: the round by which friends who rewrote their
// notebooks all hold the same notes, and how much each adding friend's
// last notebook still looks like their first
export const SAME_FROM = REWRITING.findIndex((round) => leastAlike(round.output) > 0.999) + 1
export const KEPT = ownStart(START, ADDING[ROUNDS - 1].output)
// Cal, the loud one, and his spread before and after evening out
export const LOUD = 2

// ---------------------------------------------------------------------------
// The clip: blame through three layers, plain and with skips

// The blame a plain stack passes down: the product of its layers' slopes
export const plainPass = (slopes: number[]) => slopes.reduce((p, s) => p * s, 1)
// With skips, each layer's slope becomes 1 + its own
export const skipPass = (slopes: number[]) => slopes.reduce((p, s) => p * (1 + s), 1)
// The same, as a sum over every path: each layer either taken (its slope)
// or skipped (1). One path skips them all and is worth exactly 1.
export function pathSum(slopes: number[]): number {
  let total = 0
  for (let mask = 0; mask < 1 << slopes.length; mask++)
    total += slopes.reduce((p, s, i) => p * (mask & (1 << i) ? s : 1), 1)
  return total
}
export const CLIP_SLOPE = 0.1
