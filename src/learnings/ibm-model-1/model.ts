// IBM Model 1 on a café menu written in French with English beside it.
// Every number the page states comes from here; the figures only draw.

// The empty English word every sentence carries in front, at position 0: a
// French word with no English source is written from it. The literature
// calls it NULL; the page shows it as "none".
export const NONE = '∅'

// One line of the menu: the English and its French translation
export type Pair = { english: string[]; french: string[] }

const pair = (english: string, french: string): Pair => ({ english: english.split(' '), french: french.split(' ') })

// The menu the story reads. "the" is always "le", "a" always "un", and the
// adjective comes after its noun in French
export const MENU: Pair[] = [
  pair('the tea', 'le thé'),
  pair('the coffee', 'le café'),
  pair('a coffee', 'un café'),
  pair('a green tea', 'un thé vert'),
]

// The same menu without "a coffee": then "a" and "green" only ever appear
// together, in the same line, and nothing can tell them apart
export const SHORT_MENU: Pair[] = MENU.filter((_, i) => i !== 2)

// The check's two lines: "cat" and "black" only ever appear together
export const PETS: Pair[] = [pair('the black cat', 'le chat noir'), pair('the dog', 'le chien')]

// The translation probabilities t(f | e): for each English word (and NONE),
// a share for every French word, adding up to 1
export type Table = Record<string, Record<string, number>>

const unique = (words: string[]) => [...new Set(words)]
export const frenchWords = (pairs: Pair[]) => unique(pairs.flatMap((p) => p.french))
export const englishWords = (pairs: Pair[]) => [NONE, ...unique(pairs.flatMap((p) => p.english))]

// An English sentence as the model reads it: NONE in front, at position 0
export const withNone = (english: string[]) => [NONE, ...english]

// Where EM starts: every English word as likely to write any French word
export function uniform(pairs: Pair[]): Table {
  const french = frenchWords(pairs)
  return Object.fromEntries(englishWords(pairs).map((e) => [e, Object.fromEntries(french.map((f) => [f, 1 / french.length]))]))
}

const t = (table: Table, f: string, e: string) => table[e]?.[f] ?? 0

// How likely each link is, given the sentences: for French word j, the
// chance it came from English position i (0 is NONE). Model 1's prior is the
// same for every position, so this is each position's t over their total
export function links(table: Table, { english, french }: Pair): number[][] {
  const from = withNone(english)
  return french.map((f) => {
    const weights = from.map((e) => t(table, f, e))
    const total = weights.reduce((a, b) => a + b, 0)
    return weights.map((w) => (total > 0 ? w / total : 1 / from.length))
  })
}

// One round of EM. Expectation: tally every link by how likely it is.
// Maximization: each English word's new t is its tallies over their total
export function emStep(table: Table, pairs: Pair[]): Table {
  const tally: Table = Object.fromEntries(englishWords(pairs).map((e) => [e, {}]))
  for (const p of pairs) {
    const from = withNone(p.english)
    links(table, p).forEach((shares, j) => {
      const f = p.french[j]
      shares.forEach((share, i) => {
        tally[from[i]][f] = (tally[from[i]][f] ?? 0) + share
      })
    })
  }
  const french = frenchWords(pairs)
  return Object.fromEntries(
    Object.entries(tally).map(([e, counts]) => {
      const total = Object.values(counts).reduce((a, b) => a + b, 0)
      return [e, Object.fromEntries(french.map((f) => [f, (counts[f] ?? 0) / total]))]
    }),
  )
}

// The tables after 0, 1, ..., rounds of EM
export function train(pairs: Pair[], rounds: number): Table[] {
  const tables = [uniform(pairs)]
  for (let r = 0; r < rounds; r++) tables.push(emStep(tables[r], pairs))
  return tables
}

// The number of ways to link m French words to n English ones, when each
// French word picks one English word or NONE
export const alignments = (n: number, m: number) => (n + 1) ** m

// The number of t's Model 1 adds up instead: n + 1 for each French word
export const termsAdded = (n: number, m: number) => m * (n + 1)

// P(f | e) under Model 1: for each French word, the average of t(f_j | e_i)
// over the n + 1 places it could have come from; then their product. (The
// paper's chance of the French length is the same for every English
// candidate of one French sentence, and is left out.)
export function translationChance(table: Table, english: string[], french: string[]): number {
  const from = withNone(english)
  return french.reduce((product, f) => product * (from.reduce((sum, e) => sum + t(table, f, e), 0) / from.length), 1)
}

// The same, the long way: every alignment, each with chance 1/(n+1)^m,
// times the t's of its links. Only for short sentences
export function translationChanceByAlignments(table: Table, english: string[], french: string[]): number {
  const from = withNone(english)
  const count = alignments(english.length, french.length)
  let total = 0
  for (let k = 0; k < count; k++) {
    let product = 1 / count
    let rest = k
    for (const f of french) {
      product *= t(table, f, from[rest % from.length])
      rest = Math.floor(rest / from.length)
    }
    total += product
  }
  return total
}

// The menu's chance under a table: the product over its lines. EM never
// lowers it
export const menuChance = (table: Table, pairs: Pair[]) =>
  pairs.reduce((product, p) => product * translationChance(table, p.english, p.french), 1)

// ---- The story and the lab ----

// The rounds the story plays, and the round it ends on
export const STORY_PLAY = 6
export const STORY_ROUNDS = 20
export const LAB_ROUNDS = 20

export const MENU_TABLES = train(MENU, LAB_ROUNDS)
export const SHORT_TABLES = train(SHORT_MENU, LAB_ROUNDS)
export const TRAINED = MENU_TABLES[STORY_ROUNDS]

// The share of a link in one menu line, rounded to a whole percent
export function linkShare(table: Table, line: Pair, french: string, english: string): number {
  const j = line.french.indexOf(french)
  const i = withNone(line.english).indexOf(english)
  return links(table, line)[j][i]
}

export const percent = (share: number) => `${Math.round(share * 100)}%`
export const decimal = (x: number, digits = 2) => x.toFixed(digits)

// ---- Counting alignments ----

// The guess: "un thé vert chaud" beside "a hot green tea"
export const GUESS = { english: 'a hot green tea', french: 'un thé vert chaud' }
export const GUESS_N = GUESS.english.split(' ').length
export const GUESS_M = GUESS.french.split(' ').length

// The worked numbers: alignments against terms added, for sentences of
// 2, 4 and 20 words on each side
export const WORKED = [2, 4, 20].map((words) => ({
  words,
  alignments: alignments(words, words),
  terms: termsAdded(words, words),
}))

// A big count, readable: "625", "2.8 × 10^26"
export function spelled(x: number): string {
  if (x < 1e6) return x.toLocaleString('en-US')
  const power = Math.floor(Math.log10(x))
  return `${(x / 10 ** power).toFixed(1)} × 10^${power}`
}

// ---- Translating: the noisy channel ----

// English text for the language model: menus written in English, with no
// French beside them. There is far more of this than of translations
export const ENGLISH_TEXT = [
  'the tea',
  'the coffee',
  'a coffee',
  'a green tea',
  'the green salad',
  'a hot coffee',
  'the hot tea',
  'a green salad',
]

export const START = '<s>'
export const END = '</s>'

// A bigram language model counted from `lines` (see /learnings/n-gram-models)
export function bigram(lines: string[]) {
  const pairs = new Map<string, number>()
  const firsts = new Map<string, number>()
  for (const line of lines) {
    const tokens = [START, ...line.split(' '), END]
    for (let k = 0; k + 1 < tokens.length; k++) {
      const key = `${tokens[k]} ${tokens[k + 1]}`
      pairs.set(key, (pairs.get(key) ?? 0) + 1)
      firsts.set(tokens[k], (firsts.get(tokens[k]) ?? 0) + 1)
    }
  }
  return (sentence: string[]) => {
    const tokens = [START, ...sentence, END]
    let chance = 1
    for (let k = 0; k + 1 < tokens.length; k++) {
      const seen = firsts.get(tokens[k]) ?? 0
      chance *= seen ? (pairs.get(`${tokens[k]} ${tokens[k + 1]}`) ?? 0) / seen : 0
    }
    return chance
  }
}

export const languageModel = bigram(ENGLISH_TEXT)

// The French line to translate, and the English sentences the decoder weighs
export const TO_TRANSLATE = 'le thé vert'.split(' ')
export const CANDIDATES = ['the green tea', 'the tea green', 'a green tea', 'the tea']

export type Scored = { english: string; translation: number; language: number; both: number }

export const SCORED: Scored[] = CANDIDATES.map((line) => {
  const english = line.split(' ')
  const translation = translationChance(TRAINED, english, TO_TRANSLATE)
  const language = languageModel(english)
  return { english: line, translation, language, both: translation * language }
})

export const SCORES = ['Translation model', 'Language model', 'Both'] as const
export type Score = (typeof SCORES)[number]

export const scoreOf = (row: Scored, score: Score) =>
  score === 'Translation model' ? row.translation : score === 'Language model' ? row.language : row.both

// The candidates that score best, ties included
export function best(score: Score): string[] {
  const top = Math.max(...SCORED.map((row) => scoreOf(row, score)))
  return SCORED.filter((row) => scoreOf(row, score) >= top * (1 - 1e-9)).map((row) => row.english)
}

// A chance as "1 in 41", to two significant figures; "never" for 0
export function oneIn(chance: number): string {
  if (chance <= 0) return 'never'
  const odds = 1 / chance
  const power = Math.max(0, Math.floor(Math.log10(odds)) - 1)
  return `1 in ${(Math.round(odds / 10 ** power) * 10 ** power).toLocaleString('en-US')}`
}
