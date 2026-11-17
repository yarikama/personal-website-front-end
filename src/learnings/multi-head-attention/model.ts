import { seeded } from '../../components/explain/random'

// Multi-head attention, with the numbers the page states. Two parts:
//
// 1. Why scores are divided by √d_k. A query and a key are told as two
//    people's answers to a yes/no quiz, +1 or −1 per question, so each
//    answer has mean 0 and variance 1, the paper's own assumption. Their
//    dot product is the "tally": +1 for each answer they share, −1 for each
//    they don't. Its spread is exactly √d_k, so unscaled scores saturate
//    the softmax as d_k grows; divided by √d_k, they keep a spread of 1.
// 2. Two heads against one, on a five-word sentence with hand-made weights,
//    in the matrix form softmax(XQ (XK)ᵀ / √d_k) XV.
//
// Every number the page states comes from here; the figures only draw.

// ── The quiz: random ±1 answers ──────────────────────────────────────────

// How many strangers one person's attention is shared between
export const STRANGERS = 6
// The quiz lengths the story and the lab use (d_k)
export const LENGTHS = [4, 16, 64, 256, 1024] as const
export type Length = (typeof LENGTHS)[number]
// The length in the guess, and the paper's per-head width
export const GUESS_D = 64

// d answers of +1 (yes) or −1 (no)
export const answers = (random: () => number, d: number): number[] =>
  Array.from({ length: d }, () => (random() < 0.5 ? 1 : -1))

// The dot product: +1 per shared answer, −1 per differing one
export const dot = (a: readonly number[], b: readonly number[]) => a.reduce((sum, x, i) => sum + x * b[i], 0)

// The typical size of a tally: its standard deviation, which is exactly √d
// (d independent terms, each of variance 1)
export const spreadOf = (d: number) => Math.sqrt(d)

// Root mean square, for a sample of tallies (their mean is 0)
export const rms = (xs: readonly number[]) => Math.sqrt(xs.reduce((s, x) => s + x * x, 0) / xs.length)

// Tallies of `pairs` random pairs of strangers on a d-question quiz
export function tallies(d: number, pairs: number, seed: number): number[] {
  const random = seeded(seed)
  return Array.from({ length: pairs }, () => dot(answers(random, d), answers(random, d)))
}

// The exact chance of each tally: d − 2 × (number of differing answers),
// so P(tally = d − 2m) = C(d, m) / 2^d
export function exactTallies(d: number): { tally: number; chance: number }[] {
  const out: { tally: number; chance: number }[] = []
  let choose = 1
  for (let m = 0; m <= d; m++) {
    out.push({ tally: d - 2 * m, chance: choose / 2 ** d })
    choose = (choose * (d - m)) / (m + 1)
  }
  return out
}

// Softmax, kept stable by subtracting the largest score
export function softmax(scores: readonly number[]): number[] {
  const top = Math.max(...scores)
  const e = scores.map((s) => Math.exp(s - top))
  const total = e.reduce((a, b) => a + b, 0)
  return e.map((x) => x / total)
}

// How much the weights still move when the scores move: the sum over i of
// ∂αᵢ/∂eᵢ = αᵢ(1 − αᵢ), the trace of the softmax's Jacobian diag(α) − ααᵀ,
// which is 1 − Σ αᵢ². 1 − 1/n for even weights, 0 when one weight is 1.
export const give = (weights: readonly number[]) => 1 - weights.reduce((s, w) => s + w * w, 0)

// The most it can be for n weights: all even
export const mostGive = (n: number) => 1 - 1 / n

// One person (the query) and STRANGERS others (the keys), all at random
export interface Draw {
  query: number[]
  keys: number[][]
  tallies: number[]
}

export function draw(d: number, seed: number): Draw {
  const random = seeded(seed)
  const query = answers(random, d)
  const keys = Array.from({ length: STRANGERS }, () => answers(random, d))
  return { query, keys, tallies: keys.map((k) => dot(query, k)) }
}

// The scores the softmax gets: the tallies, or the tallies ÷ √d
export const scoresOf = (t: readonly number[], d: number, scaled: boolean) =>
  scaled ? t.map((x) => x / Math.sqrt(d)) : [...t]

export interface Pick {
  scores: number[]
  weights: number[]
  top: number
  give: number
}

export function pick(t: readonly number[], d: number, scaled: boolean): Pick {
  const scores = scoresOf(t, d, scaled)
  const weights = softmax(scores)
  return { scores, weights, top: Math.max(...weights), give: give(weights) }
}

// Averages over many seeded draws: the biggest share and the give
export interface Average {
  top: number
  give: number
}

export const DRAWS = 2000

export function average(d: number, scaled: boolean, draws = DRAWS, seed = 584): Average {
  const random = seeded(seed + d)
  let top = 0
  let g = 0
  for (let n = 0; n < draws; n++) {
    const query = answers(random, d)
    const t = Array.from({ length: STRANGERS }, () => dot(query, answers(random, d)))
    const p = pick(t, d, scaled)
    top += p.top
    g += p.give
  }
  return { top: top / draws, give: g / draws }
}

// ── The story's runs ─────────────────────────────────────────────────────

// The pair shown first: eight questions
export const PAIR_D = 8
export const PAIR = (() => {
  const random = seeded(7)
  const you = answers(random, PAIR_D)
  const them = answers(random, PAIR_D)
  return { you, them, tally: dot(you, them) }
})()

// A thousand stranger pairs for each quiz length the spread figure shows
export const SPREAD_LENGTHS = [4, 16, 64, 256] as const
export const SPREAD_PAIRS = 1000
export const SPREADS = SPREAD_LENGTHS.map((d) => {
  const t = tallies(d, SPREAD_PAIRS, 100 + d)
  return { d, tallies: t, rms: rms(t) }
})

// The six strangers on a short and a long quiz. Seeds chosen so each run
// looks like the averages below: on the long quiz one stranger takes
// nearly everything unscaled, and the shares spread out once scaled.
export const SHORT_D = 4
export const LONG_D = 256
export const STORY_SEED = 2
export const SHORT = draw(SHORT_D, STORY_SEED)
export const LONG = draw(LONG_D, STORY_SEED)
export const SHORT_PICK = pick(SHORT.tallies, SHORT_D, false)
export const LONG_PICK = pick(LONG.tallies, LONG_D, false)
export const LONG_SCALED = pick(LONG.tallies, LONG_D, true)

// The winner's share after its tally drops by one point
export function nudged(t: readonly number[], d: number, scaled: boolean): { before: number; after: number } {
  const p = pick(t, d, scaled)
  const at = p.weights.indexOf(p.top)
  const lower = p.scores.map((s, i) => (i === at ? s - 1 : s))
  return { before: p.top, after: softmax(lower)[at] }
}
export const SHORT_NUDGE = nudged(SHORT.tallies, SHORT_D, false)
export const LONG_NUDGE = nudged(LONG.tallies, LONG_D, false)

// The three worked lengths, unscaled and scaled
export const WORKED_D = [4, 64, 1024] as const
export const WORKED = WORKED_D.map((d) => ({
  d,
  spread: spreadOf(d),
  raw: average(d, false),
  scaled: average(d, true),
}))

// ── Matrices, and attention in matrix form ───────────────────────────────

export type Matrix = number[][]

export const matmul = (a: Matrix, b: Matrix): Matrix =>
  a.map((row) => b[0].map((_, j) => row.reduce((s, x, k) => s + x * b[k][j], 0)))

export const transpose = (a: Matrix): Matrix => a[0].map((_, j) => a.map((row) => row[j]))

export interface Head {
  q: Matrix
  k: Matrix
  v: Matrix
}

export interface HeadOut {
  scores: Matrix
  weights: Matrix
  out: Matrix
}

// One head, all words at once: softmax(XQ (XK)ᵀ / √d_k) XV, row by row
export function attend(x: Matrix, { q, k, v }: Head): HeadOut {
  const dk = q[0].length
  const scores = matmul(matmul(x, q), transpose(matmul(x, k))).map((row) => row.map((s) => s / Math.sqrt(dk)))
  const weights = scores.map(softmax)
  return { scores, weights, out: matmul(weights, matmul(x, v)) }
}

// Several heads: each attends on its own, their outputs are laid side by
// side, and Y mixes them back to the model's width
export function multiHead(x: Matrix, heads: Head[], y: Matrix): { heads: HeadOut[]; out: Matrix } {
  const each = heads.map((h) => attend(x, h))
  const joined = x.map((_, i) => each.flatMap((h) => h.out[i]))
  return { heads: each, out: matmul(joined, y) }
}

// Weights, for h heads on a width-d model: Q, K and V for every head, and Y
export const weightCount = (d: number, h: number) => h * 3 * d * (d / h) + d * d
// Multiply-adds for the scores of n words: n² per pair of dimensions, per head
export const scoreCost = (n: number, d: number, h: number) => h * n * n * (d / h)

export const identity = (n: number): Matrix =>
  Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)))

// ── The sentence ─────────────────────────────────────────────────────────

// Four features per word: is it a person, a food, an action, or other
export const FEATURES = ['person', 'food', 'action', 'other'] as const
export const WORDS = ['the', 'chef', 'cooks', 'fresh', 'pasta'] as const
const P = 0
const F = 1
const A = 2
const O = 3
const KIND = [O, P, A, O, F]
export const X: Matrix = KIND.map((kind) => FEATURES.map((_, j) => (j === kind ? 1 : 0)))
export const ASKER = WORDS.indexOf('cooks')

// How strongly a query asks: big enough for a clear but not total pick
export const STRENGTH = 4

// A 4 × 2 matrix sending feature `from` to column `to` with weight w
const sends = (pairs: [from: number, to: number, w: number][]): Matrix => {
  const m = Array.from({ length: FEATURES.length }, () => [0, 0])
  for (const [from, to, w] of pairs) m[from][to] = w
  return m
}

// Head 1, "who does it?": the action looks for a person, and the person
// for the action. Its values carry person and action.
export const WHO: Head = {
  q: sends([
    [A, 0, STRENGTH],
    [P, 1, STRENGTH],
  ]),
  k: sends([
    [P, 0, 1],
    [A, 1, 1],
  ]),
  v: sends([
    [P, 0, 1],
    [A, 1, 1],
  ]),
}

// Head 2, "done to what?": the action looks for a food, and the food for
// the action. Its values carry food and action.
export const WHAT: Head = {
  q: sends([
    [A, 0, STRENGTH],
    [F, 1, STRENGTH],
  ]),
  k: sends([
    [F, 0, 1],
    [A, 1, 1],
  ]),
  v: sends([
    [F, 0, 1],
    [A, 1, 1],
  ]),
}

// What each output number of two heads carries, in order
export const TWO_SLOTS = ['person', 'action', 'food', 'action'] as const

// One head as wide as both (d_k = 4): the action has to ask for a person
// and a food in the same query, and its value is the word's features
export const ONE: Head = {
  q: [
    [0, 0, STRENGTH, 0],
    [0, 0, 0, 0],
    [STRENGTH, STRENGTH, 0, 0],
    [0, 0, 0, 0],
  ],
  k: identity(4),
  v: identity(4),
}
export const ONE_SLOTS = FEATURES

export const TWO_HEADS = multiHead(X, [WHO, WHAT], identity(4))
export const ONE_HEAD = multiHead(X, [ONE], identity(4))

// The paper's base model
export const PAPER = { d: 512, h: 8 }
export const PAPER_DK = PAPER.d / PAPER.h

// ── Formatting ───────────────────────────────────────────────────────────

export const pct = (share: number) => `${Math.round(100 * share)}%`
// A share near 100% with its decimals, so 99.97% doesn't read as 100%
export const finePct = (share: number) => (share > 0.99 ? `${(100 * share).toFixed(2)}%` : pct(share))
// Two decimals, without the leading zero: ".83"
export const short = (x: number) => x.toFixed(2).replace(/^0\./, '.').replace(/^-0\./, '−.')
