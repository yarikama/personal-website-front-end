// Bag of words: a café's comment cards turned into word counts over a fixed
// vocabulary, then sorted happy or unhappy two ways: a hand-written word list
// (+1 and −1 per word) and logistic regression fitted to the cards. Every
// number the page states comes from here; the figures only draw.

export interface Card {
  text: string
  happy: boolean
}

// The ten cards the story sorts, written for the page
export const CARDS: Card[] = [
  { text: 'Great coffee.', happy: true },
  { text: 'Good cake.', happy: true },
  { text: 'Good coffee, good cake!', happy: true },
  { text: 'Will come back.', happy: true },
  { text: 'Kind staff.', happy: true },
  { text: 'Cold coffee.', happy: false },
  { text: 'Cake not good.', happy: false },
  { text: 'Rude staff.', happy: false },
  { text: 'Bad coffee, bad cake.', happy: false },
  { text: 'Will not come back.', happy: false },
]

// Two new cards, the same words in a different order
export const GOOD_NOT_BAD: Card = { text: 'Good, not bad.', happy: true }
export const BAD_NOT_GOOD: Card = { text: 'Bad, not good.', happy: false }

// Lowercase words, punctuation dropped: "Good coffee, good cake!" is
// good, coffee, good, cake
export const tokens = (text: string): string[] => text.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) ?? []

// Every word on any card, in the order it first appears
export function vocabularyOf(cards: Card[]): string[] {
  const seen: string[] = []
  for (const card of cards) for (const word of tokens(card.text)) if (!seen.includes(word)) seen.push(word)
  return seen
}

export const VOCABULARY = vocabularyOf(CARDS)

// A card's row: how many times each vocabulary word appears on it. Words
// outside the vocabulary have no column, so they drop out.
export function countsOf(text: string, vocabulary: string[] = VOCABULARY): number[] {
  const row = vocabulary.map(() => 0)
  for (const word of tokens(text)) {
    const at = vocabulary.indexOf(word)
    if (at >= 0) row[at]++
  }
  return row
}

// The words on a card that the vocabulary doesn't have
export const unknownWords = (text: string, vocabulary: string[] = VOCABULARY) =>
  tokens(text).filter((word) => !vocabulary.includes(word))

export const ROWS = CARDS.map((card) => countsOf(card.text))

// The score both sorters use: bias + Σ weight × count
export const scoreOf = (weights: number[], bias: number, row: number[]) =>
  row.reduce((sum, count, i) => sum + weights[i] * count, bias)

// --- The word list: +1 for a happy word, −1 for an unhappy one, 0 for the rest

export const HAPPY_WORDS = ['great', 'good', 'kind']
export const UNHAPPY_WORDS = ['cold', 'rude', 'bad']

export const listWeightsOf = (vocabulary: string[]) =>
  vocabulary.map((word) => (HAPPY_WORDS.includes(word) ? 1 : UNHAPPY_WORDS.includes(word) ? -1 : 0))

export const LIST_WEIGHTS = listWeightsOf(VOCABULARY)

export type Verdict = 'right' | 'wrong' | 'tie'

// Happy above 0, unhappy below; at exactly 0 the list can't call it
export function listVerdict(score: number, happy: boolean): Verdict {
  if (score === 0) return 'tie'
  return score > 0 === happy ? 'right' : 'wrong'
}

export const LIST_SCORES = ROWS.map((row) => scoreOf(LIST_WEIGHTS, 0, row))
export const LIST_VERDICTS = CARDS.map((card, i) => listVerdict(LIST_SCORES[i], card.happy))
export const tally = (verdicts: Verdict[], v: Verdict) => verdicts.filter((x) => x === v).length

// --- Logistic regression on the counts

export const sigmoid = (z: number) => (z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z)))

export interface Model {
  weights: number[]
  bias: number
}

// How hard the fit is held back from large weights: λ/2 × Σ w² on top of
// the log loss (the bias is free). Without it, cards a word list can split
// cleanly send the weights off to infinity.
export const PENALTY = 0.2

// The slope of the penalised log loss: Σ (chance − label) × row, plus λw
export function gradientOf(model: Model, rows: number[][], labels: boolean[], penalty = PENALTY): Model {
  const weights = model.weights.map((w) => penalty * w)
  let bias = 0
  rows.forEach((row, n) => {
    const pull = sigmoid(scoreOf(model.weights, model.bias, row)) - (labels[n] ? 1 : 0)
    row.forEach((count, i) => (weights[i] += pull * count))
    bias += pull
  })
  return { weights, bias }
}

export function lossOf(model: Model, rows: number[][], labels: boolean[], penalty = PENALTY): number {
  let loss = (penalty / 2) * model.weights.reduce((sum, w) => sum + w * w, 0)
  rows.forEach((row, n) => {
    const z = scoreOf(model.weights, model.bias, row)
    const against = labels[n] ? -z : z
    // ln(1 + e^against), kept finite
    loss += against > 0 ? against + Math.log1p(Math.exp(-against)) : Math.log1p(Math.exp(against))
  })
  return loss
}

// Gradient descent until the slope is flat. The loss curves by at most
// ¼ Σ‖(row, 1)‖² + λ, so one over that is a step that always goes downhill.
export function fit(rows: number[][], labels: boolean[], penalty = PENALTY, tolerance = 1e-10, most = 500_000): Model {
  const curve = rows.reduce((sum, row) => sum + row.reduce((s, c) => s + c * c, 1), 0) / 4 + penalty
  const eta = 1 / curve
  let model: Model = { weights: rows[0].map(() => 0), bias: 0 }
  for (let i = 0; i < most; i++) {
    const g = gradientOf(model, rows, labels, penalty)
    const size = Math.hypot(g.bias, ...g.weights)
    if (size < tolerance) break
    model = { weights: model.weights.map((w, j) => w - eta * g.weights[j]), bias: model.bias - eta * g.bias }
  }
  return model
}

export const LABELS = CARDS.map((card) => card.happy)
export const LEARNED = fit(ROWS, LABELS)

export const chanceOf = (model: Model, row: number[]) => sigmoid(scoreOf(model.weights, model.bias, row))
export const learnedVerdict = (chance: number, happy: boolean): Verdict => (chance >= 0.5 === happy ? 'right' : 'wrong')

export const LEARNED_CHANCES = ROWS.map((row) => chanceOf(LEARNED, row))
export const LEARNED_VERDICTS = CARDS.map((card, i) => learnedVerdict(LEARNED_CHANCES[i], card.happy))

export const weightOf = (word: string) => LEARNED.weights[VOCABULARY.indexOf(word)]

// The word the fit made most unhappy
export const MOST_UNHAPPY = VOCABULARY.reduce((a, b) => (weightOf(b) < weightOf(a) ? b : a))

// --- The two new cards: one row, one score, so one of them is wrong

export const ORDER_ROW = countsOf(GOOD_NOT_BAD.text)
export const ORDER_CHANCE = chanceOf(LEARNED, ORDER_ROW)
export const ORDER_LIST_SCORE = scoreOf(LIST_WEIGHTS, 0, ORDER_ROW)

// --- The one line of math, worked for three cards

export const WORKED = [CARDS[2], CARDS[9], GOOD_NOT_BAD]

// A card's score as its terms: each word on it, its count and its weight
export const termsOf = (model: Model, text: string) =>
  VOCABULARY.map((word, i) => ({ word, count: countsOf(text)[i], weight: model.weights[i] })).filter(
    (term) => term.count > 0
  )

// --- The quick check: a card neither sorter can read

export const NOT_COLD: Card = { text: 'Not cold, not rude.', happy: true }
export const NOT_COLD_LIST = scoreOf(LIST_WEIGHTS, 0, countsOf(NOT_COLD.text))
export const NOT_COLD_CHANCE = chanceOf(LEARNED, countsOf(NOT_COLD.text))

// --- Check yourself: which pair gets two different rows?

export const PAIRS: [string, string][] = [
  ['The dog chased the cat.', 'The cat chased the dog.'],
  ['Worth it, not cheap.', 'Cheap, not worth it.'],
  ['Good, good, good.', 'Good.'],
  ['Was it good? No.', 'No, it was good.'],
]

// Two texts get the same row when they hold the same words the same number
// of times, over the vocabulary of both
export function sameRow(a: string, b: string): boolean {
  const vocabulary = vocabularyOf([
    { text: a, happy: true },
    { text: b, happy: true },
  ])
  const ra = countsOf(a, vocabulary)
  const rb = countsOf(b, vocabulary)
  return ra.every((count, i) => count === rb[i])
}

// --- Formatting

export const pct = (p: number) => `${Math.round(p * 100)}%`
export const signed = (x: number, digits = 1) => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(digits)}`

// Pang, Lee and Vaithyanathan (2002), movie reviews, 50% by chance: two
// students' hand-picked word lists, and classifiers learned from word counts
// (their figures 1 and 3)
export const PANG_LISTS = [0.58, 0.64]
export const PANG_LEARNED = [0.787, 0.829]
