// Every number the attention page states. The figures only draw.
//
// Attention in an encoder–decoder, at one decoder step t:
//   score_j  = how well source word j fits what the decoder is about to write
//   a_tj     = softmax over j of the scores (positive, summing to 1)
//   c_t      = Σ_j a_tj × s_j, a weighted mix of the encoder states
// The scores here are set by hand to what a trained model learns; in a real
// one a small network (Bahdanau et al.) or a dot product (Luong et al.)
// computes them from the decoder's state and each encoder state.

// e to each score, over the total: positive weights that sum to 1. The
// largest score is taken off first, which changes nothing but keeps exp()
// from overflowing on big scores.
export function softmax(scores: readonly number[]): number[] {
  const top = Math.max(...scores)
  const raised = scores.map((s) => Math.exp(s - top))
  const total = raised.reduce((a, b) => a + b, 0)
  return raised.map((r) => r / total)
}

// The weighted sum of the encoder states: the context vector
export function context(weights: readonly number[], states: readonly (readonly number[])[]): number[] {
  const size = states[0].length
  const mix = new Array<number>(size).fill(0)
  weights.forEach((w, j) => {
    for (let k = 0; k < size; k++) mix[k] += w * states[j][k]
  })
  return mix
}

// The index of the largest weight: what a hard alignment keeps of a row
export const argmax = (row: readonly number[]) => row.reduce((best, w, j) => (w > row[best] ? j : best), 0)

// A hard alignment's row: all the weight on the one word with the most
export const hardRow = (row: readonly number[]) => row.map((_, j): number => (j === argmax(row) ? 1 : 0))

export const pct = (share: number) => `${Math.round(100 * share)}%`

// How strongly a grid cell is shaded for a weight. Kept at or under 0.55, so
// ink text on it reads in both themes (sage at more than about 0.6 on the
// dark theme's black is too light for light text).
export const shade = (weight: number) => 0.06 + 0.49 * weight

// ---------------------------------------------------------------------------
// Sentence pairs, French to English. scores[t][j]: English word t (the
// decoder's step) against French word j (the encoder's position).

export interface Pair {
  source: string[]
  target: string[]
  scores: number[][]
}

export const PAIRS = {
  Dessert: {
    source: ['mousse', 'au', 'chocolat', 'noir'],
    target: ['dark', 'chocolate', 'mousse'],
    scores: [
      [0, 0, 1.5, 4],
      [0.5, 0.5, 4, 1.5],
      [4, 1, 0.5, 0],
    ],
  },
  'Not knowing': {
    source: ['je', 'ne', 'sais', 'pas'],
    target: ['I', 'don’t', 'know'],
    scores: [
      [4, 0.5, 0, 0],
      [0, 3, 0.8, 3.1],
      [0, 0.5, 4, 1],
    ],
  },
  'Sister’s cat': {
    source: ['le', 'chat', 'de', 'ma', 'sœur', 'dort'],
    target: ['my', 'sister’s', 'cat', 'is', 'sleeping'],
    scores: [
      [0, 0, 0.5, 4, 1.5, 0],
      [0, 0.5, 2, 1, 4, 0],
      [1.5, 4, 0.5, 0, 0.5, 0],
      [0.5, 1, 0, 0, 0.5, 2.5],
      [0, 0.5, 0, 0, 0, 4],
    ],
  },
} satisfies Record<string, Pair>

export type PairName = keyof typeof PAIRS
export const PAIR_NAMES = Object.keys(PAIRS) as PairName[]

// Every pair's attention weights, row by row
export const WEIGHTS: Record<PairName, number[][]> = Object.fromEntries(
  PAIR_NAMES.map((name) => [name, PAIRS[name].scores.map(softmax)]),
) as Record<PairName, number[][]>

// ---------------------------------------------------------------------------
// The story and the guess: reading "mousse au chocolat noir" aloud as
// "dark chocolate mousse"

export const STORY = PAIRS.Dessert
export const STORY_WEIGHTS = WEIGHTS.Dessert
// Where each English word looks most: noir, chocolat, mousse, right to left
export const STORY_TOPS = STORY_WEIGHTS.map(argmax)
export const DARK = 0
export const NOIR = 3
export const CHOCOLAT = 2

// The encoder states, cut to two numbers each so a reader can do the sum:
// how much the word in its place is about a colour, and how much about food.
// Real ones have hundreds of numbers, none with a name.
export const FEATURES = ['colour', 'food'] as const
export const STATES: number[][] = [
  [0.1, 0.9], // mousse
  [0, 0.1], // au
  [0.4, 0.9], // chocolat
  [1, 0.2], // noir
]

// One context vector for each English word
export const STORY_CONTEXTS = STORY_WEIGHTS.map((row) => context(row, STATES))

// Two decimals, the way the page and the clip print a vector's numbers
export const two = (x: number) => x.toFixed(2)
export const vector = (v: readonly number[]) => `(${v.map(two).join(', ')})`

// ---------------------------------------------------------------------------
// The quick check: what a decoder step recomputes and what it reuses. The
// encoder states are made once, before the first English word.

export const NOT_KNOWING_DONT = WEIGHTS['Not knowing'][1]
