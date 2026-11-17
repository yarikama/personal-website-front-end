// BLEU, worked out in plain functions: every number the page states comes
// from here, and the figures only draw it.

// Words, lower-cased, with punctuation dropped: the only clean-up the page uses
export function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

// Every run of n words in a row, in order, each as one string
export function ngrams(words: string[], n: number): string[] {
  const out: string[] = []
  for (let i = 0; i + n <= words.length; i++) out.push(words.slice(i, i + n).join(' '))
  return out
}

function countsOf(list: string[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const item of list) counts.set(item, (counts.get(item) ?? 0) + 1)
  return counts
}

// One run of the output and whether it is credited
export interface Gram {
  gram: string
  matched: boolean
}

export interface Share {
  n: number
  matched: number
  total: number
  grams: Gram[]
}

// The share of the output's n-word runs found in a reference. With `clip`,
// each run is credited at most as often as the reference that uses it most
// has it (BLEU's modified precision); without, a run is credited whenever
// some reference has it at all. The credited runs are the first ones, read
// left to right.
export function share(candidate: string[], references: string[][], n: number, clip = true): Share {
  const grams = ngrams(candidate, n)
  const most = new Map<string, number>()
  for (const reference of references) {
    for (const [gram, count] of countsOf(ngrams(reference, n))) most.set(gram, Math.max(most.get(gram) ?? 0, count))
  }
  const used = new Map<string, number>()
  const marked = grams.map((gram) => {
    const allowed = clip ? (most.get(gram) ?? 0) : most.has(gram) ? Infinity : 0
    const so = used.get(gram) ?? 0
    const matched = so < allowed
    if (matched) used.set(gram, so + 1)
    return { gram, matched }
  })
  return { n, matched: marked.filter((g) => g.matched).length, total: grams.length, grams: marked }
}

// The reference length closest to the output's; on a tie, the shorter
// (the paper's "best match length")
export function closestLength(c: number, lengths: number[]): number {
  let best = lengths[0]
  for (const r of lengths) {
    const d = Math.abs(r - c)
    const bestD = Math.abs(best - c)
    if (d < bestD || (d === bestD && r < best)) best = r
  }
  return best
}

// The charge for being short: 1 for an output longer than the reference,
// e^(1 − r/c) otherwise
export function brevityPenalty(c: number, r: number): number {
  if (c === 0) return 0
  return c > r ? 1 : Math.exp(1 - r / c)
}

// The multiplying average: the Nth root of the product
export function geometricMean(values: number[]): number {
  if (values.some((v) => v <= 0)) return 0
  return Math.exp(values.reduce((sum, v) => sum + Math.log(v), 0) / values.length)
}

export interface Score {
  shares: Share[]
  precisions: number[]
  mean: number
  c: number
  r: number
  bp: number
  bleu: number
}

export const N = 4

// BLEU for one output against one or more references, with runs up to N words
export function bleu(candidate: string[], references: string[][], n = N): Score {
  const shares = Array.from({ length: n }, (_, i) => share(candidate, references, i + 1))
  return scoreFrom(
    shares.map((s) => [s.matched, s.total]),
    candidate.length,
    closestLength(
      candidate.length,
      references.map((r) => r.length)
    ),
    shares
  )
}

function scoreFrom(counts: number[][], c: number, r: number, shares: Share[]): Score {
  const precisions = counts.map(([matched, total]) => (total === 0 ? 0 : matched / total))
  const mean = geometricMean(precisions)
  const bp = brevityPenalty(c, r)
  return { shares, precisions, mean, c, r, bp, bleu: bp * mean }
}

// BLEU over a whole test set, as the paper defines it: matches and runs are
// summed over every sentence before dividing, and the lengths are summed too
export function corpusBleu(pairs: { candidate: string[]; references: string[][] }[], n = N): Score {
  const counts = Array.from({ length: n }, () => [0, 0])
  let c = 0
  let r = 0
  for (const { candidate, references } of pairs) {
    for (let i = 0; i < n; i++) {
      const s = share(candidate, references, i + 1)
      counts[i][0] += s.matched
      counts[i][1] += s.total
    }
    c += candidate.length
    r += closestLength(
      candidate.length,
      references.map((ref) => ref.length)
    )
  }
  return scoreFrom(counts, c, r, [])
}

// ---------------------------------------------------------------- the page

export const pct = (x: number) => `${Math.round(100 * x)}%`
export const two = (x: number) => x.toFixed(2)
export const ratio = (s: { matched: number; total: number }) => `${s.matched}/${s.total}`

// The guess: the share of an output's words that also appear in the key,
// with no rules at all
export const GUESS_KEY = 'the dog slept on the rug'
export const GUESS_OPTIONS = ['the', 'the the the the the the', 'rug the on slept dog the']
export const naiveShare = (answer: string, key: string) => share(tokens(answer), [tokens(key)], 1, false)

// The story: one answer key, and the quizzes you mark against it
export const KEY = GUESS_KEY
export interface Quiz {
  answer: string
  clip: boolean
  pairs: boolean
  charge: boolean
}
export const QUIZZES: Quiz[] = [
  { answer: 'a dog slept on the rug', clip: true, pairs: false, charge: false },
  { answer: 'the the the the the the', clip: false, pairs: false, charge: false },
  { answer: 'the the the the the the', clip: true, pairs: false, charge: false },
  { answer: 'rug the on slept dog the', clip: true, pairs: true, charge: false },
  { answer: 'the dog slept', clip: true, pairs: true, charge: false },
  { answer: 'the dog slept', clip: true, pairs: true, charge: true },
  { answer: 'a dog slept on the rug', clip: true, pairs: true, charge: true },
]

export interface Marked {
  answer: string[]
  key: string[]
  words: Share
  pairs: Share
  // For each answer word, the key word it was matched with, or -1
  links: number[]
  bp: number
}

// Mark one quiz: which words and pairs are credited, and which key word
// each credited word used up. A word goes to the nearest key word that is
// the same and, with `clip`, not used up yet.
export function mark(quiz: Quiz, keyText = KEY): Marked {
  const answer = tokens(quiz.answer)
  const key = tokens(keyText)
  const words = share(answer, [key], 1, quiz.clip)
  const pairs = share(answer, [key], 2, quiz.clip)
  const taken = new Set<number>()
  const links = answer.map((word, i) => {
    if (!words.grams[i].matched) return -1
    let best = -1
    key.forEach((k, j) => {
      if (k !== word || (quiz.clip && taken.has(j))) return
      if (best === -1 || Math.abs(j - i) < Math.abs(best - i)) best = j
    })
    if (best >= 0) taken.add(best)
    return best
  })
  return { answer, key, words, pairs, links, bp: brevityPenalty(answer.length, key.length) }
}

export const MARKED = QUIZZES.map((quiz) => mark(quiz))

// Three worked numbers against the story's key
export const WORKED = ['a dog slept on the rug', 'dog slept on the rug', 'the rug slept on the dog'].map((answer) => ({
  answer,
  score: bleu(tokens(answer), [tokens(KEY)]),
}))

// The lab: two human translations of one sentence, and outputs to score
export const LAB_REFERENCES = ['the last train leaves at nine tonight', 'tonight the final train departs at nine']
export const LAB_PRESETS = [
  { name: 'Synonym', text: 'the final train leaves at nine tonight' },
  { name: 'Wrong', text: 'the last bus leaves at nine tonight' },
  { name: 'Short', text: 'the last train leaves' },
  { name: 'Reorder', text: 'at nine tonight the last train leaves' },
] as const
export const labScore = (text: string, references: number) =>
  bleu(tokens(text), LAB_REFERENCES.slice(0, references).map(tokens))

// The quick check: which output does BLEU like best?
export const CHECK_REFERENCE = 'she left her keys on the kitchen table'
export const CHECK_OUTPUTS = [
  'she forgot her keys on the table in the kitchen',
  'she left her keys',
  'on the kitchen table she left her keys',
  'she left her keys on the kitchen chair',
]
export const CHECK_SCORES = CHECK_OUTPUTS.map((text) => bleu(tokens(text), [tokens(CHECK_REFERENCE)]))
export const CHECK_BEST = CHECK_SCORES.reduce((best, s, i) => (s.bleu > CHECK_SCORES[best].bleu ? i : best), 0)

// Check yourself: a system that skips the words it is unsure of
export const SKIP = { before: 0.4, after: 0.46, lengthRatio: 0.8 }
export const SKIP_BP = brevityPenalty(SKIP.lengthRatio, 1)
export const SKIP_AFTER = SKIP.after * SKIP_BP
