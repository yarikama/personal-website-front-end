import { seeded } from '../../components/explain/random'

// ---------------------------------------------------------------------------
// The story: a mystery read one page at a time, with one index card of notes

// Pages in the book, the page the clue is on, and how many pages fit on the desk
export const PAGES = 20
export const CLUE = 2
export const DESK = 3
// Each rewrite of the card keeps this much of the old card
export const KEEP = 0.5

// How much of what page `from` put on the card is left once page `to` is
// read, when each rewrite keeps `keep` of the old card. Run backwards it is
// also how much of the blame for a mistake on page `to` reaches page `from`.
export const carried = (keep: number, from: number, to: number) => keep ** (to - from)

// How wrong each page's guess was in the story (the book's surprise on
// each page, 0 to 1): small, except on the last page, where the clue mattered
export const STORY_SURPRISE = [0.3, 0.2, 0.35, 0.15, 0.25, 0.2, 0.3, 0.1, 0.2, 0.25, 0.15, 0.3, 0.2, 0.1, 0.25, 0.2, 0.15, 0.3, 0.2, 1]

// "1 in 262,144" or "1/262,144" for a share
export const oneIn = (share: number) => `1 in ${Math.round(1 / share).toLocaleString('en-US')}`
export const fraction = (share: number) => `1/${Math.round(1 / share).toLocaleString('en-US')}`

// ---------------------------------------------------------------------------
// Why not count: a table with one entry per run of words, against a network

// Entries in a count table over `vocab` words for runs of `n` words
export const tableEntries = (vocab: number, n: number) => vocab ** n

// Weights in a fixed-window neural language model: a vector of `dim`
// numbers per word, the last `context` vectors side by side into `hidden`
// units, and a score per word out
export const windowWeights = (vocab: number, dim: number, context: number, hidden: number) =>
  vocab * dim + hidden * (context * dim) + hidden + vocab * hidden + vocab

// Weights in a recurrent language model of the same sizes: no window, and
// one more square of weights from the old memory to the new
export const recurrentWeights = (vocab: number, dim: number, hidden: number) =>
  vocab * dim + hidden * dim + hidden * hidden + hidden + vocab * hidden + vocab

// The sizes the page uses
export const SIZES = { vocab: 20_000, dim: 50, context: 3, hidden: 200 }

// ---------------------------------------------------------------------------
// The one line of math: blame shrinks (or grows) by the same factor each step

// The sigmoid squashes, and its slope is at most a quarter (at 0)
export const sigmoid = (x: number) => 1 / (1 + Math.exp(-x))
export const MAX_SLOPE = 0.25

// How much of the blame survives k steps back, when each step multiplies
// it by the weight from old memory to new times the squash's slope
export const survives = (weight: number, slope: number, k: number) => (weight * slope) ** k

// The worked numbers: a memory weight of 2 at the steepest slope gives 0.5
// a step; 6 gives 1.5 a step
export const SHRINK = { weight: 2, slope: MAX_SLOPE }
export const GROW = { weight: 6, slope: MAX_SLOPE }
export const WORKED_STEPS = [2, 6, 18] as const

// The check: a memory that keeps 0.8 a step, with the clue 3 or 30 words back
export const CHECK = { keep: 0.8, near: 3, far: 30 }
export const checkRatio = () => CHECK.keep ** CHECK.near / CHECK.keep ** CHECK.far

// ---------------------------------------------------------------------------
// A real recurrent language model, trained in the browser on twelve sentences

// The words it reads and predicts. It reads <s> first and predicts </s> last.
export const VOCAB = ['<s>', 'the', 'dog', 'dogs', 'cat', 'cats', 'that', 'sees', 'see', 'runs', 'run', '</s>'] as const
export type Word = (typeof VOCAB)[number]

// Twelve sentences. In the long ones the last verb agrees with the first
// noun, four words back, past a second noun that may disagree with it.
export const CORPUS = [
  'the dog runs',
  'the dogs run',
  'the cat runs',
  'the cats run',
  'the dog that the cat sees runs',
  'the dog that the cats see runs',
  'the dogs that the cat sees run',
  'the dogs that the cats see run',
  'the cat that the dog sees runs',
  'the cat that the dogs see runs',
  'the cats that the dog sees run',
  'the cats that the dogs see run',
]

// A sentence as word indices: <s>, its words, </s>
export const encode = (sentence: string) => ['<s>', ...sentence.split(' '), '</s>'].map((w) => VOCAB.indexOf(w as Word))

// Memory size
export const HIDDEN = 8

export interface Rnn {
  input: number[][] // HIDDEN × VOCAB: each word's vector, its column (W_i)
  memory: number[][] // HIDDEN × HIDDEN: old memory to new (W_h)
  bias: number[] // HIDDEN
  output: number[][] // VOCAB × HIDDEN: a score for each next word (W_o)
  outBias: number[] // VOCAB
}

const matrix = (rows: number, cols: number, f: () => number) =>
  Array.from({ length: rows }, () => Array.from({ length: cols }, f))

// Small random weights, the same for a seed
export function initRnn(seed: number, scale = 0.5): Rnn {
  const random = seeded(seed)
  const r = () => (random() * 2 - 1) * scale
  const V = VOCAB.length
  return {
    input: matrix(HIDDEN, V, r),
    memory: matrix(HIDDEN, HIDDEN, r),
    bias: Array.from({ length: HIDDEN }, () => 0),
    output: matrix(V, HIDDEN, r),
    outBias: Array.from({ length: V }, () => 0),
  }
}

export function softmax(scores: number[]): number[] {
  const top = Math.max(...scores)
  const e = scores.map((s) => Math.exp(s - top))
  const sum = e.reduce((a, b) => a + b, 0)
  return e.map((x) => x / sum)
}

export interface Run {
  // The memory after reading each word but the last (</s> is only predicted)
  memories: number[][]
  // After each of those words, the chance of every next word
  chances: number[][]
  // −ln(chance of the word that came next), one per prediction
  losses: number[]
}

// Read a sentence (as word indices) one word at a time, from an empty memory,
// predicting each next word from the memory
// `nudge` adds to the memory after one word: a test uses it to measure, by
// brute force, how much the loss depends on that memory.
export function read(rnn: Rnn, tokens: number[], nudge?: { at: number; by: number[] }): Run {
  const memories: number[][] = []
  const chances: number[][] = []
  const losses: number[] = []
  let h = Array.from({ length: HIDDEN }, () => 0)
  for (let t = 0; t < tokens.length - 1; t++) {
    const x = tokens[t]
    h = h.map((_, i) => sigmoid(rnn.memory[i].reduce((s, w, j) => s + w * h[j], 0) + rnn.input[i][x] + rnn.bias[i]))
    if (nudge?.at === t) h = h.map((v, i) => v + nudge.by[i])
    const p = softmax(rnn.output.map((row, v) => row.reduce((s, w, j) => s + w * h[j], 0) + rnn.outBias[v]))
    memories.push(h)
    chances.push(p)
    losses.push(-Math.log(p[tokens[t + 1]]))
  }
  return { memories, chances, losses }
}

export const sentenceLoss = (rnn: Rnn, tokens: number[]) => read(rnn, tokens).losses.reduce((a, b) => a + b, 0)

// Backpropagation through time. With `only` set, the loss is that one
// prediction's; otherwise the whole sentence's. Returns every weight's
// gradient and the gradient reaching each memory.
export function backprop(rnn: Rnn, tokens: number[], only?: number) {
  const { memories, chances } = read(rnn, tokens)
  const T = memories.length
  const V = VOCAB.length
  const grad: Rnn = {
    input: matrix(HIDDEN, V, () => 0),
    memory: matrix(HIDDEN, HIDDEN, () => 0),
    bias: Array.from({ length: HIDDEN }, () => 0),
    output: matrix(V, HIDDEN, () => 0),
    outBias: Array.from({ length: V }, () => 0),
  }
  const toMemory: number[][] = Array.from({ length: T }, () => Array.from({ length: HIDDEN }, () => 0))
  // Blame arriving at the memory from the step after it
  let carry = Array.from({ length: HIDDEN }, () => 0)
  for (let t = T - 1; t >= 0; t--) {
    const h = memories[t]
    const dh = carry.slice()
    if (only === undefined || only === t) {
      // Softmax with −ln: the chance minus 1 for the right word
      const dz = chances[t].map((p, v) => p - (v === tokens[t + 1] ? 1 : 0))
      for (let v = 0; v < V; v++) {
        grad.outBias[v] += dz[v]
        for (let j = 0; j < HIDDEN; j++) {
          grad.output[v][j] += dz[v] * h[j]
          dh[j] += dz[v] * rnn.output[v][j]
        }
      }
    }
    toMemory[t] = dh
    // Through the sigmoid, then to the weights and the memory before
    const da = dh.map((d, i) => d * h[i] * (1 - h[i]))
    const before = t > 0 ? memories[t - 1] : Array.from({ length: HIDDEN }, () => 0)
    carry = Array.from({ length: HIDDEN }, () => 0)
    for (let i = 0; i < HIDDEN; i++) {
      grad.bias[i] += da[i]
      grad.input[i][tokens[t]] += da[i]
      for (let j = 0; j < HIDDEN; j++) {
        grad.memory[i][j] += da[i] * before[j]
        carry[j] += da[i] * rnn.memory[i][j]
      }
    }
  }
  return { grad, toMemory }
}

const length = (v: number[]) => Math.sqrt(v.reduce((s, x) => s + x * x, 0))

// How much blame for prediction `t` reaches the memory after each earlier
// word: the length of the gradient there, for memories 0 … t
export function blame(rnn: Rnn, tokens: number[], t: number): number[] {
  return backprop(rnn, tokens, t).toMemory.slice(0, t + 1).map(length)
}

const step = (w: number[][], g: number[][], rate: number) =>
  w.map((row, i) => row.map((x, j) => x - rate * g[i][j]))

const zeros = (rows: number, cols: number) => matrix(rows, cols, () => 0)
const addInto = (into: number[][], g: number[][]) => g.forEach((row, i) => row.forEach((x, j) => (into[i][j] += x)))

// One step of plain gradient descent on the whole corpus: every sentence's
// gradient added up, then a step of `rate` against it
export function trainStep(rnn: Rnn, sentences: number[][], rate: number): Rnn {
  const V = VOCAB.length
  const sum: Rnn = {
    input: zeros(HIDDEN, V),
    memory: zeros(HIDDEN, HIDDEN),
    bias: Array.from({ length: HIDDEN }, () => 0),
    output: zeros(V, HIDDEN),
    outBias: Array.from({ length: V }, () => 0),
  }
  for (const tokens of sentences) {
    const { grad } = backprop(rnn, tokens)
    addInto(sum.input, grad.input)
    addInto(sum.memory, grad.memory)
    addInto(sum.output, grad.output)
    grad.bias.forEach((x, i) => (sum.bias[i] += x))
    grad.outBias.forEach((x, i) => (sum.outBias[i] += x))
  }
  return {
    input: step(rnn.input, sum.input, rate),
    memory: step(rnn.memory, sum.memory, rate),
    bias: rnn.bias.map((x, i) => x - rate * sum.bias[i]),
    output: step(rnn.output, sum.output, rate),
    outBias: rnn.outBias.map((x, i) => x - rate * sum.outBias[i]),
  }
}

export function train(rnn: Rnn, sentences: number[][], steps: number, rate: number): Rnn {
  let at = rnn
  for (let i = 0; i < steps; i++) at = trainStep(at, sentences, rate)
  return at
}

export const SENTENCES = CORPUS.map(encode)
export const corpusLoss = (rnn: Rnn) => SENTENCES.reduce((s, tokens) => s + sentenceLoss(rnn, tokens), 0)

// The lab trains two networks on the same sentences, the same way, from
// different random starts: run A learns the long agreement, run B does not
export const TRAIN_STEPS = 1500
export const RATE = 0.1
export const RUNS = { A: 8, B: 4 } as const
export type RunName = keyof typeof RUNS

// The lab's sentence: one of the long ones, by its two nouns
export const FIRST_NOUNS = ['dog', 'dogs'] as const
export const SECOND_NOUNS = ['cat', 'cats'] as const
export const longSentence = (first: string, second: string) =>
  `the ${first} that the ${second} ${second.endsWith('s') ? 'see' : 'sees'} ${first.endsWith('s') ? 'run' : 'runs'}`

// In a long sentence, the prediction of the last verb: after reading the
// verb of the inner clause, two words before the end
export const verbStep = (tokens: number[]) => tokens.length - 3
// The memory right after the first noun
export const NOUN_STEP = 2

// The chance a network gives the right last verb and the wrong one
export function verbChances(rnn: Rnn, sentence: string) {
  const tokens = encode(sentence)
  const t = verbStep(tokens)
  const right = tokens[t + 1]
  const wrong = VOCAB.indexOf(VOCAB[right] === 'runs' ? 'run' : 'runs')
  const p = read(rnn, tokens).chances[t]
  return { right: p[right], wrong: p[wrong] }
}

// How many times weaker the blame for the last verb's guess is at the first
// noun than where the guess is made
export function nounFade(rnn: Rnn, sentence: string) {
  const tokens = encode(sentence)
  const t = verbStep(tokens)
  const b = blame(rnn, tokens, t)
  return b[t] / b[NOUN_STEP]
}
