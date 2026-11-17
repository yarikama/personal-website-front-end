// Every number the sequence-to-sequence page states. The figures only draw.

import { seeded } from '../../components/explain/random'

// ---------------------------------------------------------------------------
// The story: a French sentence read over the phone, then written in English

export const SOURCE = ['le', 'chat', 'noir', 'dort'] as const
export const TARGET = ['the', 'black', 'cat', 'sleeps', '</s>'] as const
// What the decoder reads at each step: the start token, then the word before
export const INPUTS = ['<s>', 'the', 'black', 'cat', 'sleeps'] as const

// The decoder's small English vocabulary
export const VOCAB = ['the', 'a', 'black', 'cat', 'dog', 'sleeps', 'is', '</s>'] as const
export type Word = (typeof VOCAB)[number]
export type Chances = Record<Word, number>

// The trained decoder's chances for each next word, one table per step,
// given the card and the right words so far. Made up for the story, as a
// trained model might give them; each table sums to 1.
export const CHANCES: Chances[] = [
  // after <s>
  { the: 0.72, a: 0.18, black: 0.04, cat: 0.03, dog: 0.01, sleeps: 0.01, is: 0.005, '</s>': 0.005 },
  // after "the"
  { black: 0.55, cat: 0.35, dog: 0.05, a: 0.01, the: 0.01, sleeps: 0.01, is: 0.01, '</s>': 0.01 },
  // after "the black"
  { cat: 0.86, dog: 0.06, sleeps: 0.03, is: 0.02, the: 0.01, a: 0.01, black: 0.005, '</s>': 0.005 },
  // after "the black cat"
  { sleeps: 0.78, is: 0.12, '</s>': 0.04, black: 0.02, cat: 0.01, dog: 0.01, the: 0.01, a: 0.01 },
  // after "the black cat sleeps"
  { '</s>': 0.93, the: 0.02, a: 0.01, black: 0.01, cat: 0.01, dog: 0.01, sleeps: 0.005, is: 0.005 },
]

// Early in training, after "the": the learner would write "cat", but the
// reference says "black"
export const LEARNING_STEP = 1
export const LEARNING: Chances = {
  cat: 0.48,
  black: 0.3,
  dog: 0.08,
  the: 0.04,
  a: 0.04,
  sleeps: 0.03,
  is: 0.02,
  '</s>': 0.01,
}

// The k likeliest words of a table, likeliest first
export function top(chances: Chances, k: number): [Word, number][] {
  return (Object.entries(chances) as [Word, number][]).sort((a, b) => b[1] - a[1]).slice(0, k)
}

// The decoder's pick: the likeliest word
export const best = (chances: Chances) => top(chances, 1)[0][0]

// The chance each step gave the right word, as the tutor feeds the right
// words in (teacher forcing)
export const rightChances = CHANCES.map((table, t) => table[TARGET[t]])

// A sentence's chance: the chain rule, one factor per word
export const sentenceChance = (chances: number[]) => chances.reduce((p, c) => p * c, 1)

// The training loss: minus the log of each right word's chance, added up
export const loss = (chances: number[]) => chances.reduce((sum, c) => sum - Math.log(c), 0)

// The three worked numbers: the first word, the first two, the whole sentence
export const WORKED = [1, 2, TARGET.length].map((n) => ({ words: n, chance: sentenceChance(rightChances.slice(0, n)) }))

// What one slip costs while learning: minus the log of the right word's chance
export const learningCost = -Math.log(LEARNING[TARGET[LEARNING_STEP]])

// ---------------------------------------------------------------------------
// The card: an untrained recurrent encoder with seeded weights, so the
// shading the story shows is real arithmetic, h = tanh(W h + U x). Training
// would change the numbers, not their number.

export const CARD = 8

// A word's vector: seeded by its letters, so a word always gets the same one
function wordVector(word: string, dim: number) {
  let seed = 17
  for (const ch of word) seed = (Math.imul(seed, 31) + ch.charCodeAt(0)) >>> 0
  const random = seeded(seed)
  return Array.from({ length: dim }, () => random() * 2 - 1)
}

const weights = (() => {
  const random = seeded(584)
  const matrix = () => Array.from({ length: CARD }, () => Array.from({ length: CARD }, () => (random() * 2 - 1) * 0.6))
  return { W: matrix(), U: matrix() }
})()

// The card after each word, CARD numbers between -1 and 1
export function encode(words: readonly string[]): number[][] {
  const states: number[][] = []
  let h = new Array<number>(CARD).fill(0)
  for (const word of words) {
    const x = wordVector(word, CARD)
    h = h.map((_, r) => Math.tanh(weights.W[r].reduce((s, w, c) => s + w * h[c], 0) + weights.U[r].reduce((s, u, c) => s + u * x[c], 0)))
    states.push(h)
  }
  return states
}

export const SHORT_CARDS = encode(SOURCE)

// The long sentence: twenty French words onto the same eight numbers
export const LONG = 'le chat noir de ma voisine dort tous les après-midi sur le vieux fauteuil rouge près de la fenêtre ouverte'.split(' ')
export const LONG_CARDS = encode(LONG)

// ---------------------------------------------------------------------------
// How far a word travels: steps from source word i to target word j through
// the unrolled network. Word i goes into encoder state p (p = i read forwards,
// m - i + 1 read backwards), then through every later encoder state, the
// hand-over to the decoder, and every decoder state before word j:
//   (m - p) + 1 + (j - 1) = m - p + j

export const position = (m: number, i: number, reversed: boolean) => (reversed ? m - i + 1 : i)
export const trip = (m: number, i: number, j: number, reversed: boolean) => m - position(m, i, reversed) + j

// Each source word paired with the target word in the same place
export const trips = (m: number, reversed: boolean) => Array.from({ length: m }, (_, k) => trip(m, k + 1, k + 1, reversed))

export function tripSummary(m: number, reversed: boolean) {
  const all = trips(m, reversed)
  return { shortest: Math.min(...all), mean: all.reduce((s, t) => s + t, 0) / m, longest: Math.max(...all) }
}

// The story's long sentence: its first word, 20 steps from the first English word
export const LONG_FIRST_TRIP = trip(LONG.length, 1, 1, false)

// The check: a 12-word sentence read backwards, last word to last word
export const CHECK = { m: 12, k: 12 }
export const checkTrip = () => trip(CHECK.m, CHECK.k, CHECK.k, true)

// ---------------------------------------------------------------------------
// Sutskever, Vinyals and Le (2014): four layers of 1,000 LSTM cells, whose
// cell and hidden states (2 × 4 × 1,000) are the sentence's whole summary;
// reading the source backwards took test BLEU from 25.9 to 30.6

export const PAPER = {
  layers: 4,
  cells: 1000,
  numbers: 2 * 4 * 1000,
  bleuForwards: 25.9,
  bleuBackwards: 30.6,
  perplexityForwards: 5.8,
  perplexityBackwards: 4.7,
}
