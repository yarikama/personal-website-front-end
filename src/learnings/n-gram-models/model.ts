import { seeded } from '../../components/explain/random'

// A café's last twelve orders, and n-gram models counted from them. Every
// number the page states comes from here; the figures only draw.

export const START = '<s>'
export const END = '</s>'

// The orders the story's barista kept. Written for the page, small enough
// to check every count by hand. None of them is "a large tea with milk",
// though each pair of words in it was said somewhere.
export const ORDERS = [
  'a large coffee with milk',
  'a small coffee with milk',
  'a large tea with lemon',
  'a large coffee please',
  'a small tea with honey',
  'a large coffee with honey',
  'a small coffee please',
  'coffee with milk please',
  'a large tea please',
  'tea with lemon please',
  'a small coffee with milk',
  'a large coffee',
] as const

export const words = (sentence: string) => sentence.split(' ').filter(Boolean)

// Every word the orders use, in the order they first appear
export const vocabulary = (sentences: readonly string[]) => [...new Set(sentences.flatMap(words))]

// A model that looks back n − 1 words: for each context (the last n − 1
// tokens, joined by spaces), how often each next token followed it
export interface Model {
  n: number
  counts: Map<string, Map<string, number>>
}

// A sentence as the model reads it: n − 1 start marks (one for a bigram,
// two for a trigram, none needed by a unigram), its words, an end mark
export const padded = (sentence: string, n: number) => [
  ...Array.from({ length: Math.max(1, n - 1) }, () => START),
  ...words(sentence),
  END,
]

// The (context, next) pairs a sentence holds: every token after the start
// marks, with the n − 1 tokens before it
export function grams(sentence: string, n: number): { context: string[]; next: string }[] {
  const tokens = padded(sentence, n)
  const first = Math.max(1, n - 1)
  return tokens.slice(first).map((next, i) => ({ context: tokens.slice(first + i - (n - 1), first + i), next }))
}

// Maximum likelihood by counting: tally every (context, next) pair
export function train(sentences: readonly string[], n: number): Model {
  const counts = new Map<string, Map<string, number>>()
  for (const sentence of sentences) {
    for (const { context, next } of grams(sentence, n)) {
      const key = context.join(' ')
      const row = counts.get(key) ?? new Map<string, number>()
      row.set(next, (row.get(next) ?? 0) + 1)
      counts.set(key, row)
    }
  }
  return { n, counts }
}

const total = (row: Map<string, number> | undefined) => [...(row?.values() ?? [])].reduce((a, b) => a + b, 0)

// One hop of a sentence: the word, what the model looked at, and the
// count of the pair over the count of the context
export interface Hop {
  context: string[]
  next: string
  count: number
  of: number
}

export const chanceOfHop = (hop: Hop) => (hop.of === 0 ? 0 : hop.count / hop.of)

export function hops(model: Model, sentence: string): Hop[] {
  return grams(sentence, model.n).map(({ context, next }) => {
    const row = model.counts.get(context.join(' '))
    return { context, next, count: row?.get(next) ?? 0, of: total(row) }
  })
}

// The chance of a whole sentence: each hop's chance, multiplied along
export const chance = (model: Model, sentence: string) =>
  hops(model, sentence).reduce((p, hop) => p * chanceOfHop(hop), 1)

// The next-word chances after a context, most likely first
export function nextChances(model: Model, context: string[]): { next: string; count: number; chance: number }[] {
  const row = model.counts.get(context.join(' '))
  const of = total(row)
  return [...(row?.entries() ?? [])]
    .map(([next, count]) => ({ next, count, chance: count / of }))
    .sort((a, b) => b.count - a.count)
}

// Write a sentence by drawing each next token from the counts, from the
// start marks to the end mark (or `most` words, in case a model loops)
export function sample(model: Model, random: () => number, most = 12): string {
  const out: string[] = []
  const context = Array.from({ length: model.n - 1 }, () => START)
  while (out.length < most) {
    const row = model.counts.get(context.slice(context.length - (model.n - 1)).join(' '))!
    let r = random() * total(row)
    let next = END
    for (const [token, count] of row) {
      next = token
      if ((r -= count) < 0) break
    }
    if (next === END) break
    out.push(next)
    context.push(next)
  }
  return out.join(' ')
}

// How many chances a table for n-grams could hold over a vocabulary of v
// words: v words (or the end mark) after each of the v^(n − 1) contexts.
// Ignoring the start and end marks, which hardly change it for a real
// vocabulary.
export const tableSize = (v: number, n: number) => v ** n

// How many of them the counts actually filled
export const seenEntries = (model: Model) => [...model.counts.values()].reduce((sum, row) => sum + row.size, 0)

// ---------------------------------------------------------------------------
// The story

// The new order, never heard, and the one heard most like it
export const NEW = 'a large tea with milk'
export const HEARD = 'a large coffee with milk'
// A short order that was heard, yet comes out less likely than NEW
export const SHORT = 'a large coffee'

export const MODELS = [1, 2, 3].map((n) => train(ORDERS, n))
export const BIGRAM = MODELS[1]

// Looking back over whole orders: how many began with each longer start of
// the new order, and what came next in those that did
export const prefixes = (sentence: string) =>
  words(sentence)
    .slice(0, -1)
    .map((_, i) => {
      const start = words(sentence).slice(0, i + 1)
      const matching = ORDERS.filter((order) => words(order).slice(0, start.length).join(' ') === start.join(' '))
      return { start, matching, next: matching.map((order) => words(order)[start.length] ?? END) }
    })

// The words the story tallies: everything that came right after WATCH
export const WATCH = 'with'
export const AFTER_WATCH = nextChances(BIGRAM, [WATCH])
export const WATCH_COUNT = AFTER_WATCH.reduce((sum, row) => sum + row.count, 0)

// Where each pair "WATCH, next" sits in the orders: order i, word j (the
// WATCH word itself), in reading order
export const watchSpots = ORDERS.flatMap((order, i) =>
  words(order).flatMap((word, j) => (word === WATCH ? [{ order: i, word: j }] : [])),
)

// ---------------------------------------------------------------------------
// The worked numbers and the checks

// "1 in 21" for 0.047
export const oneIn = (p: number) => `1 in ${Math.round(1 / p)}`
export const pct = (p: number, digits = 1) => `${(p * 100).toFixed(digits)}%`
// "3/64" for a chance that is a fraction with a small denominator
export function fraction(p: number, most = 10000): string {
  for (let d = 1; d <= most; d++) {
    const n = Math.round(p * d)
    if (Math.abs(n / d - p) < 1e-12) return `${n}/${d}`
  }
  return p.toPrecision(3)
}

// A real vocabulary, and the size of each n-gram table over it
export const BIG_VOCABULARY = 10_000
export const CHECK_VOCABULARY = 20_000

// "10 thousand", "100 million", "1 trillion"
export function spelled(x: number): string {
  const names: [number, string][] = [
    [1e12, 'trillion'],
    [1e9, 'billion'],
    [1e6, 'million'],
    [1e3, 'thousand'],
  ]
  for (const [size, name] of names) if (x >= size) return `${Number((x / size).toPrecision(3)).toLocaleString('en-US')} ${name}`
  return x.toLocaleString('en-US')
}

// Check yourself: a new, three-sentence text
export const TINY = ['go home', 'go out', 'stay home'] as const
export const TINY_ASKED = 'go home'
export const TINY_CHANCE = chance(train(TINY, 2), TINY_ASKED)

// ---------------------------------------------------------------------------
// The lab

export const LAB_ORDERS = [HEARD, NEW, 'milk with coffee large a'] as const
export const LAB_NAMES = ['Heard', 'New', 'Jumbled', 'Written'] as const
export const NS = [1, 2, 3] as const
export const N_NAMES: Record<number, string> = { 1: 'unigram', 2: 'bigram', 3: 'trigram' }
// How many orders "Write one" draws to measure how often each model just
// repeats an order it heard
export const WRITE_TRIES = 1000
export const repeatShare = (model: Model, seed: () => number, tries = WRITE_TRIES) => {
  const heard = new Set<string>(ORDERS)
  let repeats = 0
  for (let i = 0; i < tries; i++) if (heard.has(sample(model, seed))) repeats++
  return repeats / tries
}

// How often each model's written orders are ones it heard, out of
// WRITE_TRIES, seeded so the page always says the same
export const REPEATS = MODELS.map((model) => repeatShare(model, seeded(1)))

// The lab's first written order, and the seeds after it
export const WRITE_SEED = 3

// A chance as the page writes it: a percentage, or "1 in 409,000" once it
// is too small for one
export function chanceText(p: number): string {
  if (p === 0) return '0'
  if (p >= 0.001) return pct(p)
  return `1 in ${Number((1 / p).toPrecision(3)).toLocaleString('en-US')}`
}
