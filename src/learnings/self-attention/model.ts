// Self-attention on a toy sentence, worked out in full: every number the page
// states comes from here, and the figures only draw it.

export const dot = (a: readonly number[], b: readonly number[]) => a.reduce((sum, x, i) => sum + x * b[i], 0)

// A matrix (rows of numbers) times a vector
export const times = (m: readonly (readonly number[])[], x: readonly number[]) => m.map((row) => dot(row, x))

// Scores to weights that add up to 1. A score of -Infinity (a masked word)
// gets a weight of exactly 0.
export function softmax(scores: readonly number[]): number[] {
  const top = Math.max(...scores)
  const raised = scores.map((s) => (s === -Infinity ? 0 : Math.exp(s - top)))
  const total = raised.reduce((a, b) => a + b, 0)
  return raised.map((r) => r / total)
}

// "41%"
export const pct = (share: number) => `${Math.round(100 * share)}%`

// --- The story: five friends at one table -----------------------------------

// What a friend's tag is about, and what a question asks about, on two
// topics: [cost, the way there]
export interface Friend {
  name: string
  tag: string
  key: [number, number]
  query: [number, number]
  question: string
  note: string
}

export const FRIENDS: Friend[] = [
  { name: 'Ana', tag: 'trains', key: [2, 1], query: [0, 1], question: 'Which way?', note: '9:10 train, $40' },
  { name: 'Ben', tag: 'hotels', key: [2, 0], query: [0, 1], question: 'Where do we end up?', note: '2 nights, $180' },
  { name: 'Cy', tag: 'food', key: [1, 0], query: [1, 0], question: 'What can we spend?', note: 'noodle bar' },
  { name: 'Dee', tag: 'maps', key: [0, 2], query: [1, 0], question: 'What will it cost?', note: '2 km from the station' },
  { name: 'Eli', tag: 'weather', key: [0, 1], query: [0, 1], question: 'Which way?', note: 'rain on Sunday' },
]

// The friend the story follows
export const ASKER = 3

// How much friend i listens to each friend: their tags against i's question
export const listening = (i: number) => softmax(FRIENDS.map((f) => dot(FRIENDS[i].query, f.key)))

// Everyone at once
export const TABLE = FRIENDS.map((_, i) => listening(i))

// The row of friends passing one sheet along: each copy keeps this much of a
// line, so Ana's line, copied by everyone after her, fades
export const COPY_KEEPS = 0.5
export const HANDOFFS = FRIENDS.length - 1
export const clarity = (copies: number) => COPY_KEEPS ** copies

// --- The words: "the dog bit the man" ----------------------------------------

export type Word = 'the' | 'dog' | 'man' | 'bit'
export const VOCAB: Word[] = ['the', 'dog', 'man', 'bit']

// A word's vector, eight numbers: is it a noun, is it a verb, which word it
// is (one of four), and two left for its place in the sentence
const EMBED: Record<Word, number[]> = {
  the: [0, 0, 1, 0, 0, 0],
  dog: [1, 0, 0, 1, 0, 0],
  man: [1, 0, 0, 0, 1, 0],
  bit: [0, 1, 0, 0, 0, 1],
}

// A position is a point on a circle, turned an eighth of the way round for
// each place: one sine wave
export const TURN = Math.PI / 4
export const position = (i: number): [number, number] => [Math.cos(TURN * i), Math.sin(TURN * i)]

// How hard a verb looks for a noun (and a noun for a verb), and how hard
// each word looks at the word just before it
export const LOOK = 2
export const NEAR = 1.5

const c = Math.cos(TURN)
const s = Math.sin(TURN)
// Queries, keys and values, from the eight numbers. A query and a key have
// four: [noun wanted / offered, verb wanted / offered, place, place]. The
// query turns the place back one step, so it fits the key one place before.
//            noun  verb  the  dog  man  bit  place      place
export const Q = [
  [0, LOOK, 0, 0, 0, 0, 0, 0],
  [LOOK, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, NEAR * c, NEAR * s],
  [0, 0, 0, 0, 0, 0, -NEAR * s, NEAR * c],
]
export const K = [
  [1, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 1, 0],
  [0, 0, 0, 0, 0, 0, 0, 1],
]
// A value says which word it is: how much of the, dog, man and bit
export const V = [
  [0, 0, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 0, 0],
]

export const FORWARD: Word[] = ['the', 'dog', 'bit', 'the', 'man']
export const BACKWARD: Word[] = ['the', 'man', 'bit', 'the', 'dog']
export const SENTENCES = { 'dog bit man': FORWARD, 'man bit dog': BACKWARD } as const
export type Sentence = keyof typeof SENTENCES
// Where each word of one order sits in the other: dog and man swap places
export const SWAPPED = [0, 4, 2, 3, 1]
export const BIT = 2

export interface Settings {
  positions: boolean
  mask: boolean
}

// The vector word i goes in with: its own, plus its place if positions are on
export function input(words: readonly Word[], i: number, positions: boolean): number[] {
  const place = positions ? position(i + 1) : [0, 0]
  return [...EMBED[words[i]], ...place]
}

export interface Attention {
  queries: number[][]
  keys: number[][]
  values: number[][]
  // scores[i][j]: how well word j's key fits word i's query (-Infinity when masked)
  scores: number[][]
  weights: number[][]
  // outputs[i]: word i's new vector, how much of the, dog, man and bit
  outputs: number[][]
}

// One layer of self-attention over a sentence
export function attend(words: readonly Word[], { positions, mask }: Settings): Attention {
  const xs = words.map((_, i) => input(words, i, positions))
  const queries = xs.map((x) => times(Q, x))
  const keys = xs.map((x) => times(K, x))
  const values = xs.map((x) => times(V, x))
  const scores = queries.map((q, i) => keys.map((k, j) => (mask && j > i ? -Infinity : dot(q, k))))
  const weights = scores.map(softmax)
  const outputs = weights.map((row) => VOCAB.map((_, d) => row.reduce((sum, w, j) => sum + w * values[j][d], 0)))
  return { queries, keys, values, scores, weights, outputs }
}

// Every combination the lab offers, worked out once
const settingsKey = (sentence: Sentence, { positions, mask }: Settings) => `${sentence} ${positions} ${mask}`
const LAB = new Map<string, Attention>()
for (const sentence of Object.keys(SENTENCES) as Sentence[])
  for (const positions of [false, true])
    for (const mask of [false, true])
      LAB.set(settingsKey(sentence, { positions, mask }), attend(SENTENCES[sentence], { positions, mask }))
export const labAttention = (sentence: Sentence, settings: Settings) => LAB.get(settingsKey(sentence, settings))!

// Whether word i gets the same new vector when dog and man swap places
export function sameInOtherOrder(sentence: Sentence, settings: Settings, i: number) {
  const other: Sentence = sentence === 'dog bit man' ? 'man bit dog' : 'dog bit man'
  const here = labAttention(sentence, settings).outputs[i]
  const there = labAttention(other, settings).outputs[SWAPPED[i]]
  return here.every((x, d) => Math.abs(x - there[d]) < 1e-9)
}

// The numbers the page tells
const PLAIN = attend(FORWARD, { positions: false, mask: false })
const PLACED = attend(FORWARD, { positions: true, mask: false })
const MASKED = attend(FORWARD, { positions: true, mask: true })
const DOG = 1
const THE = 0
const MAN = 4

// "bit" with no positions: its query against three keys
export const WORKED = [
  { word: 'dog', score: PLAIN.scores[BIT][DOG], weight: PLAIN.weights[BIT][DOG] },
  { word: 'man', score: PLAIN.scores[BIT][MAN], weight: PLAIN.weights[BIT][MAN] },
  { word: 'the', score: PLAIN.scores[BIT][THE], weight: PLAIN.weights[BIT][THE] },
]
// What its new vector says, with no positions: as much dog as man
export const PLAIN_BIT = PLAIN.outputs[BIT]
// With positions: dog, just before it, gains NEAR; man, three places on, loses
export const PLACED_BIT = {
  dog: { score: PLACED.scores[BIT][DOG], weight: PLACED.weights[BIT][DOG] },
  man: { score: PLACED.scores[BIT][MAN], weight: PLACED.weights[BIT][MAN] },
}
// With the mask as well: the first word sees only itself; bit sees three words
export const MASKED_FIRST = MASKED.weights[0][0]
export const MASKED_BIT_DOG = MASKED.weights[BIT][DOG]

// The quick check: no matrices, each word's own vector as query, key and
// value (positions off). Where "bit" puts its weight.
export function withoutMatrices(words: readonly Word[]) {
  const xs = words.map((_, i) => input(words, i, false))
  return xs.map((q) => softmax(xs.map((k) => dot(q, k))))
}
export const SELF_WEIGHT = withoutMatrices(FORWARD)[BIT][BIT]
