// LIME on a toy black box. Every number the page states comes from here;
// the figures only draw.

import { seeded } from '../../components/explain/random'

// ---------------------------------------------------------------------------
// The black box: a tiny hand-set neural network over a bag of words.
//
// Each word has a three-number vector: how much it leans positive, how much
// negative, and how much it flips (only "not"). The sentence's vector is the
// sum of its words' vectors, so the box ignores order, like the bag-of-words
// classifiers this page builds on. A hidden layer of four ReLU units then
// reads the sum:
//   plain praise    = ReLU(up − 1.5 flip)
//   plain complaint = ReLU(down − 1.5 flip)
//   flipped complaint ("not bad")  = ReLU(down + 3 flip − 3)
//   flipped praise    ("not good") = ReLU(up + 3 flip − 3)
// and the score, through a sigmoid, is the chance the review is positive.
// The flip units are what no straight line over words can copy: "not"
// helps next to "bad" and hurts next to "good".

export interface Vector {
  up: number
  down: number
  flip: number
}

const NEUTRAL: Vector = { up: 0, down: 0, flip: 0 }

export const VOCAB: Record<string, Vector> = {
  good: { up: 1, down: 0, flip: 0 },
  clever: { up: 1, down: 0, flip: 0 },
  bad: { up: 0, down: 1, flip: 0 },
  boring: { up: 0, down: 1.2, flip: 0 },
  slow: { up: 0, down: 0.6, flip: 0 },
  not: { up: 0, down: 0, flip: 1 },
  the: NEUTRAL,
  a: NEUTRAL,
  acting: NEUTRAL,
  was: NEUTRAL,
  plot: NEUTRAL,
  but: NEUTRAL,
  and: NEUTRAL,
}

// The output layer: one weight per hidden unit, and a bias
export const OUT = { praise: 2.2, complaint: -2.2, flippedComplaint: 1.8, flippedPraise: -1.8, bias: 0 }

const relu = (x: number) => Math.max(0, x)
export const sigmoid = (z: number) => 1 / (1 + Math.exp(-z))

export function hidden(words: readonly string[]) {
  const sum = { up: 0, down: 0, flip: 0 }
  for (const word of words) {
    const v = VOCAB[word] ?? NEUTRAL
    sum.up += v.up
    sum.down += v.down
    sum.flip += v.flip
  }
  return {
    praise: relu(sum.up - 1.5 * sum.flip),
    complaint: relu(sum.down - 1.5 * sum.flip),
    flippedComplaint: relu(sum.down + 3 * sum.flip - 3),
    flippedPraise: relu(sum.up + 3 * sum.flip - 3),
  }
}

// The box's chance that a review (a list of words) is positive
export function box(words: readonly string[]): number {
  const h = hidden(words)
  return sigmoid(
    OUT.bias +
      OUT.praise * h.praise +
      OUT.complaint * h.complaint +
      OUT.flippedComplaint * h.flippedComplaint +
      OUT.flippedPraise * h.flippedPraise
  )
}

// The words a copy keeps
export const keep = (words: readonly string[], kept: readonly boolean[]) => words.filter((_, i) => kept[i])

// ---------------------------------------------------------------------------
// LIME's three moves: copies with words covered, a say for each copy by how
// close it is, and a straight line fitted to the box's answers.

// The kernel width σ, in units of cosine distance
export const WIDTHS = [0.15, 0.35, 1] as const
export const WIDTH = 0.35

// The cosine distance from the whole sentence (all ones) to a copy that keeps
// `kept` of its `n` words: the cosine of two 0/1 vectors is shared ÷ √(|a|·|b|)
export const distance = (kept: number, n: number) => 1 - Math.sqrt(kept / n)

// How much say a copy gets: exp(−distance² ÷ σ²)
export const closeness = (kept: number, n: number, width = WIDTH) => Math.exp(-(distance(kept, n) ** 2) / width ** 2)

// `count` copies of an n-word sentence, LIME's way: the first is the sentence
// itself, and each other covers a random number of words, from one to all but
// one, chosen at random
export function drawCopies(random: () => number, n: number, count: number): boolean[][] {
  const copies: boolean[][] = [Array<boolean>(n).fill(true)]
  while (copies.length < count) {
    const cover = 1 + Math.floor(random() * (n - 1))
    const order = Array.from({ length: n }, (_, i) => i)
    // A random shuffle; its first `cover` words are covered
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[order[i], order[j]] = [order[j], order[i]]
    }
    const kept = Array<boolean>(n).fill(true)
    for (const i of order.slice(0, cover)) kept[i] = false
    copies.push(kept)
  }
  return copies
}

// Solve a x = b by Gaussian elimination with partial pivoting
export function solve(a: number[][], b: number[]): number[] {
  const n = b.length
  const m = a.map((row, i) => [...row, b[i]])
  for (let c = 0; c < n; c++) {
    let pivot = c
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[pivot][c])) pivot = r
    ;[m[c], m[pivot]] = [m[pivot], m[c]]
    for (let r = c + 1; r < n; r++) {
      const f = m[r][c] / m[c][c]
      for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k]
    }
  }
  const x = Array<number>(n).fill(0)
  for (let r = n - 1; r >= 0; r--) {
    let s = m[r][n]
    for (let k = r + 1; k < n; k++) s -= m[r][k] * x[k]
    x[r] = s / m[r][r]
  }
  return x
}

export interface Line {
  base: number
  credit: number[]
}

// The line's guess for a copy: the base plus the credit of every word it keeps
export const guess = (line: Line, kept: readonly boolean[]) =>
  line.base + line.credit.reduce((s, c, i) => s + (kept[i] ? c : 0), 0)

// A tiny ridge, so a word that a few copies never covered gets no credit
// rather than an unsolvable system; it is far too small to move a real fit
const RIDGE = 1e-6

// The weighted least-squares line: the base and per-word credits that make
// Σ say × (box − line)² smallest
export function fitLine(rows: readonly (readonly boolean[])[], targets: readonly number[], says: readonly number[]): Line {
  const n = rows[0].length
  const size = n + 1
  const a = Array.from({ length: size }, () => Array<number>(size).fill(0))
  const b = Array<number>(size).fill(0)
  rows.forEach((kept, r) => {
    const x = [1, ...kept.map((k) => (k ? 1 : 0))]
    for (let i = 0; i < size; i++) {
      b[i] += says[r] * x[i] * targets[r]
      for (let j = 0; j < size; j++) a[i][j] += says[r] * x[i] * x[j]
    }
  })
  const total = says.reduce((s, w) => s + w, 0)
  for (let i = 1; i < size; i++) a[i][i] += RIDGE * total
  const [base, ...credit] = solve(a, b)
  return { base, credit }
}

// How much of the box's spread around the copies the line explains, each copy
// counted by its say (1 is a perfect match)
export function fitQuality(rows: readonly (readonly boolean[])[], targets: readonly number[], says: readonly number[], line: Line) {
  const total = says.reduce((s, w) => s + w, 0)
  const mean = targets.reduce((s, t, i) => s + says[i] * t, 0) / total
  let miss = 0
  let spread = 0
  rows.forEach((kept, i) => {
    miss += says[i] * (targets[i] - guess(line, kept)) ** 2
    spread += says[i] * (targets[i] - mean) ** 2
  })
  return spread === 0 ? 1 : 1 - miss / spread
}

export interface Explanation {
  copies: boolean[][]
  scores: number[]
  says: number[]
  line: Line
  quality: number
}

// LIME, start to finish: `count` copies drawn with `random`, scored by the
// box, weighed by closeness, and a line fitted to them
export function explain(words: readonly string[], count: number, random: () => number, width = WIDTH): Explanation {
  const n = words.length
  const copies = drawCopies(random, n, count)
  const scores = copies.map((kept) => box(keep(words, kept)))
  const says = copies.map((kept) => closeness(kept.filter(Boolean).length, n, width))
  const line = fitLine(copies, scores, says)
  return { copies, scores, says, line, quality: fitQuality(copies, scores, says, line) }
}

const choose = (n: number, k: number) => {
  let c = 1
  for (let i = 1; i <= k; i++) c = (c * (n - k + i)) / i
  return c
}

// Every copy that covers at least one word, each with how often LIME would
// draw it (a number of covered words uniform from 1 to n − 1, then which
// ones, uniform) times its say
export function everyCopy(words: readonly string[], width = WIDTH) {
  const n = words.length
  const rows: boolean[][] = []
  const says: number[] = []
  for (let mask = 0; mask < 2 ** n; mask++) {
    const kept = Array.from({ length: n }, (_, i) => ((mask >> i) & 1) === 1)
    const k = kept.filter(Boolean).length
    if (k === 0 || k === n) continue
    rows.push(kept)
    says.push((1 / (n - 1) / choose(n, n - k)) * closeness(k, n, width))
  }
  return { rows, says, scores: rows.map((kept) => box(keep(words, kept))) }
}

// What LIME gives with endless copies: the same fit over every copy
export function endless(words: readonly string[], width = WIDTH): Line {
  const { rows, says, scores } = everyCopy(words, width)
  return fitLine(rows, scores, says)
}

// How well the endless-copies line matches the box
export function endlessQuality(words: readonly string[], width = WIDTH) {
  const { rows, says, scores } = everyCopy(words, width)
  return fitQuality(rows, scores, says, fitLine(rows, scores, says))
}

// The word with the most credit
export const topWord = (words: readonly string[], line: Line) =>
  words[line.credit.reduce((best, c, i) => (c > line.credit[best] ? i : best), 0)]

// Out of `draws` runs of LIME with `count` copies each, how many put a word
// other than `expected` on top
export function wrongTops(words: readonly string[], expected: string, count: number, draws: number, seed: number) {
  const random = seeded(seed)
  let wrong = 0
  for (let d = 0; d < draws; d++) if (topWord(words, explain(words, count, random).line) !== expected) wrong++
  return wrong
}

// ---------------------------------------------------------------------------
// The page's sentences and numbers

const split = (text: string) => text.split(' ')
// The index of a word in a sentence
export const at = (words: readonly string[], word: string) => words.indexOf(word)

export const STORY = split('the acting was not bad')
// The story's handful of copies, seeded so the story always tells the same
// numbers, and chosen so its line lands near the endless-copies answer
export const STORY_COUNT = 16
export const STORY_SEED = 24
export const STORY_RUN = explain(STORY, STORY_COUNT, seeded(STORY_SEED))
export const STORY_ENDLESS = endless(STORY)

// One word covered at a time, for the story's second step
export const without = (words: readonly string[], word: string) => words.filter((w) => w !== word)
export const coverOne = (words: readonly string[], word: string) => words.map((w) => w !== word)
export const SINGLES = ['not', 'bad', 'the'].map((word) => coverOne(STORY, word))

// How often a handful of copies gets the top word wrong, and how often
// plenty do: 100 runs each
export const DRAWS = 100
export const FEW = STORY_COUNT
export const MANY = 500
export const WRONG_FEW = wrongTops(STORY, 'not', FEW, DRAWS, 101)
export const WRONG_MANY = wrongTops(STORY, 'not', MANY, DRAWS, 202)

// The lab's sentences
export const SENTENCES = {
  'not bad': STORY,
  'not good': split('the acting was not good'),
  'clever, slow': split('a clever plot but slow and boring'),
} as const
export type SentenceName = keyof typeof SENTENCES
export const SENTENCE_NAMES = Object.keys(SENTENCES) as SentenceName[]

// The worked closeness numbers: a copy of the 5-word story that keeps 4, 2
// and 1 of its words
export const WORKED_KEPT = [4, 2, 1] as const

// The quick check: the same box on "not good"
export const NOT_GOOD_ENDLESS = endless(SENTENCES['not good'])

// How well a straight line can match the box: on the story, where "not" and
// "bad" work as a pair, and on a review whose words each push one way
export const STORY_QUALITY = endlessQuality(STORY)
export const PLAIN_QUALITY = endlessQuality(SENTENCES['clever, slow'])

// How the kernel width moves the credit for "bad" in the story
export const BAD_BY_WIDTH = WIDTHS.map((width) => ({ width, credit: endless(STORY, width).credit[at(STORY, 'bad')] }))

// The chance as a whole percentage
export const pct = (p: number) => `${Math.round(100 * p)}%`
// A credit in percentage points, with its sign
export const points = (c: number) => `${c >= 0 ? '+' : '−'}${Math.abs(Math.round(100 * c))}`
export const two = (x: number) => x.toFixed(2)
