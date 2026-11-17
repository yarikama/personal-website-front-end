// Every number the perplexity page states. The figures only draw.

// ---------------------------------------------------------------------------
// The measure itself

// The probability of a whole text: the chances given to each word that came,
// multiplied
export const product = (chances: number[]) => chances.reduce((total, chance) => total * chance, 1)

// The one chance that, given at every word, multiplies to the same total: the
// geometric mean. Worked in logs so a long text doesn't underflow to 0.
export function perWordChance(chances: number[]): number {
  if (chances.length === 0) throw new Error('no words to average')
  if (chances.some((chance) => chance <= 0)) return 0
  return Math.exp(chances.reduce((sum, chance) => sum + Math.log(chance), 0) / chances.length)
}

// Perplexity: exp(−(1/T) Σ log P), the per-word chance turned over. A single
// impossible word makes it infinite.
export const perplexity = (chances: number[]) => 1 / perWordChance(chances)

// ---------------------------------------------------------------------------
// The story: guessing the next word of a story a friend reads aloud, with
// eight counters spread over the words you think come next

export const COUNTERS = 8

export interface Bet {
  word: string
  counters: number
}

// One guess: the word that came, and every word the counters went on. The
// word that came is always first.
export interface Guess {
  word: string
  bets: Bet[]
}

export const STORY_START = 'The'

// "The dog chased the cat": four guesses after the first word
export const SHORT: Guess[] = [
  {
    word: 'dog',
    bets: [
      { word: 'dog', counters: 1 },
      { word: 'cat', counters: 3 },
      { word: 'man', counters: 2 },
      { word: 'ball', counters: 2 },
    ],
  },
  {
    word: 'chased',
    bets: [
      { word: 'chased', counters: 1 },
      { word: 'barked', counters: 4 },
      { word: 'ran', counters: 2 },
      { word: 'sat', counters: 1 },
    ],
  },
  {
    word: 'the',
    bets: [
      { word: 'the', counters: 4 },
      { word: 'a', counters: 2 },
      { word: 'him', counters: 1 },
      { word: 'it', counters: 1 },
    ],
  },
  {
    word: 'cat',
    bets: [
      { word: 'cat', counters: 4 },
      { word: 'ball', counters: 2 },
      { word: 'man', counters: 1 },
      { word: 'car', counters: 1 },
    ],
  },
]

// "The dog chased the cat out of the yard and into the street": twelve
// guesses, each as good as one of the short sentence's (1 or 4 counters)
export const LONG: { word: string; counters: number }[] = [
  { word: 'dog', counters: 1 },
  { word: 'chased', counters: 1 },
  { word: 'the', counters: 4 },
  { word: 'cat', counters: 4 },
  { word: 'out', counters: 1 },
  { word: 'of', counters: 4 },
  { word: 'the', counters: 4 },
  { word: 'yard', counters: 1 },
  { word: 'and', counters: 1 },
  { word: 'into', counters: 1 },
  { word: 'the', counters: 4 },
  { word: 'street', counters: 4 },
]

export const counterChance = (counters: number) => counters / COUNTERS
const countersOn = (guess: Guess) => guess.bets.find((bet) => bet.word === guess.word)!.counters

export const SHORT_CHANCES = SHORT.map((guess) => counterChance(countersOn(guess)))
export const LONG_CHANCES = LONG.map((guess) => counterChance(guess.counters))

// 1 in 256 and 1 in 16,777,216, yet the same per-word chance: 1 in 4
export const SHORT_ODDS = Math.round(1 / product(SHORT_CHANCES))
export const LONG_ODDS = Math.round(1 / product(LONG_CHANCES))
export const STORY_PERPLEXITY = Math.round(perplexity(SHORT_CHANCES))
// Counters on the right word if every guess were equally good
export const EVEN_COUNTERS = COUNTERS / STORY_PERPLEXITY

// "1/8", "1/2": a chance of counters out of eight, in lowest terms
export function fraction(counters: number, of: number = COUNTERS): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
  const d = gcd(counters, of)
  return `${counters / d}/${of / d}`
}

// "16,777,216"
export const grouped = (n: number) => n.toLocaleString('en-US')

// ---------------------------------------------------------------------------
// The guess first, the worked numbers and the checks

// A four-word sentence given 1 chance in 256 in all: as torn as a blind
// choice among 4 at every word, not 256 ÷ 4 = 64
export const GUESS = { odds: 256, words: 4 }
export const guessPerplexity = () => Math.pow(GUESS.odds, 1 / GUESS.words)

// A model as unsure as a blind guess over the whole vocabulary
export const uniformChances = (vocabulary: number, words: number) =>
  Array.from({ length: words }, () => 1 / vocabulary)

export const WORKED = [
  { label: 'The story', chances: SHORT_CHANCES, note: '4 words, 1 in 256' },
  { label: 'Always sure', chances: [1, 1, 1, 1], note: 'every chance 1' },
  { label: 'Blind', chances: uniformChances(10_000, 4), note: '1 in 10,000 each' },
].map((w) => ({ ...w, perplexity: perplexity(w.chances) }))

// Quick check: shrinking the vocabulary alone moves the perplexity of a
// blind model from 10,000 to 2,000
export const VOCABULARIES = [10_000, 2_000] as const

// Check yourself: three words at a half, a quarter and an eighth. The
// tempting wrong answers are the plain average of 2, 4 and 8, and 64.
export const CHECK_CHANCES = [1 / 2, 1 / 4, 1 / 8]
export const CHECK_PERPLEXITY = perplexity(CHECK_CHANCES)
export const CHECK_PLAIN_AVERAGE = CHECK_CHANCES.reduce((sum, chance) => sum + 1 / chance, 0) / CHECK_CHANCES.length

// ---------------------------------------------------------------------------
// The lab: three small models trained by counting a dozen sentences, scored
// on sentences they never saw

export const TRAINING = [
  'the dog chased the cat',
  'the cat chased the bird',
  'the dog ate the bone',
  'the cat ate the fish',
  'a dog sat on the mat',
  'the cat sat on the mat',
  'the bird sat on the tree',
  'a bird ate the seed',
  'the dog barked',
  'the cat slept',
  'the dog slept on the mat',
  'a cat chased a dog',
]

export const HELD_OUT = ['the dog chased the bird', 'a cat sat on the tree', 'the bird chased the dog']

export const START = '<s>'
export const END = '</s>'

export const MODELS = ['Blind', 'Unigram', 'Bigram'] as const
export type Model = (typeof MODELS)[number]
export const SMOOTHINGS = ['None', 'Add-one'] as const
export type Smoothing = (typeof SMOOTHINGS)[number]

// The words a model predicts for a sentence: each word, then the end
export const tokens = (sentence: string) => [...sentence.split(' '), END]

export interface Counts {
  // Every word that can be predicted, the end included (not the start)
  vocabulary: string[]
  // How often each word was predicted, and their total
  words: Map<string, number>
  total: number
  // How often each pair came, and how often each word came before another
  pairs: Map<string, number>
  before: Map<string, number>
}

const pairKey = (previous: string, word: string) => `${previous} ${word}`
const bump = (map: Map<string, number>, key: string) => map.set(key, (map.get(key) ?? 0) + 1)

export function count(sentences: string[]): Counts {
  const words = new Map<string, number>()
  const pairs = new Map<string, number>()
  const before = new Map<string, number>()
  let total = 0
  for (const sentence of sentences) {
    let previous = START
    for (const word of tokens(sentence)) {
      bump(words, word)
      bump(pairs, pairKey(previous, word))
      bump(before, previous)
      total += 1
      previous = word
    }
  }
  return { vocabulary: [...words.keys()].sort(), words, total, pairs, before }
}

export const COUNTS = count(TRAINING)
export const VOCABULARY_SIZE = COUNTS.vocabulary.length

// The chance a model gives `word` after `previous`
export function chanceOf(counts: Counts, model: Model, smoothing: Smoothing, previous: string, word: string): number {
  const v = counts.vocabulary.length
  const add = smoothing === 'Add-one' ? 1 : 0
  if (model === 'Blind') return 1 / v
  if (model === 'Unigram') return ((counts.words.get(word) ?? 0) + add) / (counts.total + add * v)
  return ((counts.pairs.get(pairKey(previous, word)) ?? 0) + add) / ((counts.before.get(previous) ?? 0) + add * v)
}

// The chance given to each word of a sentence, the end included
export function sentenceChances(counts: Counts, model: Model, smoothing: Smoothing, sentence: string): number[] {
  const out: number[] = []
  let previous = START
  for (const word of tokens(sentence)) {
    out.push(chanceOf(counts, model, smoothing, previous, word))
    previous = word
  }
  return out
}

// Perplexity over several sentences at once: every word's chance in one
// geometric mean, as a test set is scored
export const textPerplexity = (counts: Counts, model: Model, smoothing: Smoothing, sentences: string[]) =>
  perplexity(sentences.flatMap((sentence) => sentenceChances(counts, model, smoothing, sentence)))

export interface Score {
  chances: number[]
  sentence: number
  heldOut: number
  training: number
}

// Every setting the lab offers, worked out once
export const SCORES = new Map<string, Score>()
for (const model of MODELS)
  for (const smoothing of SMOOTHINGS)
    HELD_OUT.forEach((sentence, i) => {
      const chances = sentenceChances(COUNTS, model, smoothing, sentence)
      SCORES.set(`${model} ${smoothing} ${i}`, {
        chances,
        sentence: perplexity(chances),
        heldOut: textPerplexity(COUNTS, model, smoothing, HELD_OUT),
        training: textPerplexity(COUNTS, model, smoothing, TRAINING),
      })
    })
export const scoreOf = (model: Model, smoothing: Smoothing, sentence: number) =>
  SCORES.get(`${model} ${smoothing} ${sentence}`)!

// "4.3", "17", "∞"
export const shown = (value: number) =>
  !Number.isFinite(value) ? '∞' : value >= 100 ? grouped(Math.round(value)) : value >= 10 ? value.toFixed(0) : value.toFixed(1)
