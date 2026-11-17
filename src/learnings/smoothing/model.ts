// A bigram model trained on twelve short sentences about ice cream, with add-k
// smoothing: every number the page states comes from here.

export const START = '<s>'
export const END = '</s>'
export const UNK = 'UNK'

// The training text: short enough that a reader can check every count
export const SENTENCES = [
  'i want mango',
  'i want lemon',
  'you want mango',
  'i want mango now',
  'we want lemon',
  'i like mango',
  'you like lemon',
  'we like mint',
  'i want mint',
  'you want mango',
  'we want mango now',
  'i like lemon now',
] as const

// Every word the training text uses, in a fixed order
export const WORDS = ['i', 'you', 'we', 'want', 'like', 'mango', 'lemon', 'mint', 'now'] as const

// What can come next: every word, the end of the sentence, and UNK for a
// word the model has never seen. V is how many there are.
export const VOCAB: readonly string[] = [...WORDS, END, UNK]
export const V = VOCAB.length

const known = new Set<string>(WORDS)

// A sentence as the model reads it: start and end marks around it, and any
// word it has never seen turned into UNK
export function tokens(sentence: string): string[] {
  const words = sentence.split(' ').filter(Boolean)
  return [START, ...words.map((w) => (known.has(w) ? w : UNK)), END]
}

export interface Counts {
  // How often `next` came right after `prev`, keyed "prev next"
  pairs: Map<string, number>
  // How often `prev` was followed by anything at all
  contexts: Map<string, number>
}

export function countPairs(sentences: readonly string[]): Counts {
  const pairs = new Map<string, number>()
  const contexts = new Map<string, number>()
  for (const sentence of sentences) {
    const t = tokens(sentence)
    for (let i = 1; i < t.length; i++) {
      const key = `${t[i - 1]} ${t[i]}`
      pairs.set(key, (pairs.get(key) ?? 0) + 1)
      contexts.set(t[i - 1], (contexts.get(t[i - 1]) ?? 0) + 1)
    }
  }
  return { pairs, contexts }
}

export const COUNTS = countPairs(SENTENCES)

export const pairCount = (prev: string, next: string, counts: Counts = COUNTS) => counts.pairs.get(`${prev} ${next}`) ?? 0
export const contextCount = (prev: string, counts: Counts = COUNTS) => counts.contexts.get(prev) ?? 0

// Add-k: (times `next` followed `prev` + k) ÷ (times `prev` was followed by
// anything + k × V). With k = 0 and no data at all, the chance is 0.
export function chance(prev: string, next: string, k: number, counts: Counts = COUNTS, size = V): number {
  const top = pairCount(prev, next, counts) + k
  const bottom = contextCount(prev, counts) + k * size
  return bottom === 0 ? 0 : top / bottom
}

export interface Factor {
  prev: string
  next: string
  count: number
  total: number
  // The fraction as it is worked out: (count + k) ÷ (total + kV)
  top: number
  bottom: number
  p: number
}

// One factor per neighbouring pair: the sentence's chance is their product
export function factors(sentence: string, k: number, counts: Counts = COUNTS): Factor[] {
  const t = tokens(sentence)
  return t.slice(1).map((next, i) => {
    const prev = t[i]
    const count = pairCount(prev, next, counts)
    const total = contextCount(prev, counts)
    return { prev, next, count, total, top: count + k, bottom: total + k * V, p: chance(prev, next, k, counts) }
  })
}

export const sentenceChance = (sentence: string, k: number, counts: Counts = COUNTS) =>
  factors(sentence, k, counts).reduce((product, f) => product * f.p, 1)

// The share of the next-word chance that goes to words never seen after
// `prev`, when `seenWords` different words were seen after it `total` times
// out of a vocabulary of `size`
export const unseenShare = (total: number, seenWords: number, k: number, size: number) =>
  ((size - seenWords) * k) / (total + k * size)

// --- The story: what came after "want" -----------------------------------

export const CONTEXT = 'want'

// The menu's order: what was ordered first, then the rest
export const ROW: readonly string[] = ['mango', 'lemon', 'mint', 'i', 'you', 'we', 'want', 'like', 'now', END, UNK]

// What each word is on the ice-cream shop's menu in the story
export const MENU: Record<string, string> = {
  mango: 'mango',
  lemon: 'lemon',
  mint: 'mint',
  i: 'peach',
  you: 'cherry',
  we: 'coconut',
  want: 'vanilla',
  like: 'caramel',
  now: 'lychee',
  [END]: 'pistachio',
  // The flavour of the week: a stand-in for anything new
  [UNK]: 'special',
}

export const ORDERS = contextCount(CONTEXT)
export const rowCounts = ROW.map((w) => pairCount(CONTEXT, w))
export const SEEN = rowCounts.filter((c) => c > 0).length
export const NEVER = ROW.length - SEEN
export const rowChances = (k: number) => ROW.map((w) => chance(CONTEXT, w, k))
export const neverShare = (k: number) => unseenShare(ORDERS, SEEN, k, V)

// Five more visits: mango, mango, lemon, cherry, mango
export const VISITS = ['mango', 'mango', 'lemon', 'you', 'mango'] as const
export const visitsChance = (k: number) => VISITS.reduce((product, w) => product * chance(CONTEXT, w, k), 1)

// The k the story and the math use
export const ADD_ONE = 1
export const SMALL_K = 0.1
export const WORKED = [0, ADD_ONE, SMALL_K] as const

// --- The lab --------------------------------------------------------------

export const LAB = ['i want mango now', 'you want mint now', 'we want banana', 'want i now mango'] as const
export type LabSentence = (typeof LAB)[number]
export const KS = [0, 0.01, 0.1, 0.5, 1] as const

// The question up top: every word seen, one pair ("mint now") never
export const GUESS = 'you want mint now'
export const SEEN_SENTENCE = 'i want mango now'
export const NONSENSE = 'want i now mango'

// --- Check yourself: a big vocabulary -------------------------------------

export const BIG = { size: 10000, total: 20, seenWords: 12 }
export const BIG_SHARE = unseenShare(BIG.total, BIG.seenWords, ADD_ONE, BIG.size)

// --- Formatting -----------------------------------------------------------

export const pct = (p: number) => `${Math.round(100 * p)}%`

// A chance as "1 in N", N to two significant figures; 0 stays 0
export function oneIn(p: number): string {
  if (p === 0) return '0'
  const n = 1 / p
  const digits = Math.max(0, Math.floor(Math.log10(n)) - 1)
  const rounded = Math.round(n / 10 ** digits) * 10 ** digits
  return `1 in ${rounded.toLocaleString('en-US')}`
}

// k as the page writes it
export const kText = (k: number) => String(k)

// A number in a fraction: whole numbers plain, others to a tenth or more
export const num = (x: number) => (Number.isInteger(x) ? String(x) : String(Math.round(x * 100) / 100))
