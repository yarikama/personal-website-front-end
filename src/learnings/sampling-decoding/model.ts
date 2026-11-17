import { seeded } from '../../components/explain/random'

// A word a friend suggested for the blank, how many of the 100 friends said
// it, and whether it makes sense there
export interface Word {
  word: string
  votes: number
  sensible: boolean
}

// A blank in the postcard: the words before it and the friends' answers,
// most votes first
export interface Blank {
  name: string
  before: string
  // A short name for the blank, for a panel's header
  short: string
  words: Word[]
}

export const FRIENDS = 100

const sensible = (word: string, votes: number): Word => ({ word, votes, sensible: true })

// The 25 friends who were joking each said something different
export const JOKES = [
  'spoon', 'Tuesday', 'of', 'seventeen', 'banana', 'quickly', 'them', 'kettle', 'sneeze', 'although',
  'Gerald', 'wobble', 'and', 'teapot', 'ninety', 'gravel', 'very', 'sock', 'umbrella', 'whom',
  'cactus', 'Thursday', 'yonder', 'pickle', 'eleven',
]

export const BEACH: Blank = {
  name: 'Beach',
  before: 'We spent the day at the',
  short: 'day at the …',
  words: [
    sensible('beach', 36),
    sensible('park', 18),
    sensible('lake', 10),
    sensible('zoo', 7),
    sensible('market', 4),
    ...JOKES.map((word) => ({ word, votes: 1, sensible: false })),
  ],
}

export const STOVE: Blank = {
  name: 'Stove',
  before: 'Careful, the stove is still',
  short: 'stove is still …',
  words: [
    sensible('hot', 85),
    sensible('warm', 7),
    sensible('on', 3),
    { word: 'cold', votes: 2, sensible: false },
    { word: 'wet', votes: 1, sensible: false },
    { word: 'purple', votes: 1, sensible: false },
    { word: 'singing', votes: 1, sensible: false },
  ],
}

export const COLOUR: Blank = {
  name: 'Colour',
  before: 'My favourite colour is',
  short: 'colour is …',
  words: [
    sensible('blue', 11),
    sensible('green', 10),
    sensible('red', 10),
    sensible('purple', 9),
    sensible('black', 9),
    sensible('yellow', 8),
    sensible('orange', 8),
    sensible('pink', 8),
    sensible('white', 7),
    sensible('grey', 7),
    sensible('brown', 7),
    sensible('gold', 6),
  ],
}

export const BLANKS = [BEACH, STOVE, COLOUR] as const

// The friends' answers as chances: each word's share of the slips
export const chancesOf = (blank: Blank) => blank.words.map((w) => w.votes / FRIENDS)

// A model's scores for the blank: the logs of the votes, so that a softmax
// at temperature 1 gives back the friends' chances
export const scoresOf = (blank: Blank) => blank.words.map((w) => Math.log(w.votes))

// The softmax of the scores, each divided first by the temperature
export function softmax(scores: number[], temperature = 1): number[] {
  const scaled = scores.map((s) => s / temperature)
  const top = Math.max(...scaled)
  const raised = scaled.map((s) => Math.exp(s - top))
  const total = raised.reduce((a, b) => a + b, 0)
  return raised.map((r) => r / total)
}

// The order of the words, likeliest first; ties keep the order given
export const ranked = (chances: number[]) =>
  chances.map((_, i) => i).sort((a, b) => chances[b] - chances[a] || a - b)

// Which words top-k keeps: the k likeliest
export function topK(chances: number[], k: number): boolean[] {
  const keep = new Set(ranked(chances).slice(0, Math.max(1, k)))
  return chances.map((_, i) => keep.has(i))
}

// Which words top-p keeps: the fewest likeliest words whose chances add up
// to at least p (with room for rounding, so 0.36 + 0.34 reaches 0.7)
export function topP(chances: number[], p: number): boolean[] {
  const keep = new Set<number>()
  let held = 0
  for (const i of ranked(chances)) {
    keep.add(i)
    held += chances[i]
    if (held >= p - 1e-9) break
  }
  return chances.map((_, i) => keep.has(i))
}

// Keep only the words marked, scaled up so their chances add to 1 again
export function truncate(chances: number[], keep: boolean[]): number[] {
  const held = chances.reduce((sum, c, i) => sum + (keep[i] ? c : 0), 0)
  return chances.map((c, i) => (keep[i] ? c / held : 0))
}

export const METHODS = ['All words', 'Top-k', 'Top-p'] as const
export type Method = (typeof METHODS)[number]

export interface Settings {
  method: Method
  k: number
  p: number
  temperature: number
}

// What the decoder draws from: temperature first, then the cut
export function decode(blank: Blank, { method, k, p, temperature }: Settings) {
  const shaped = softmax(scoresOf(blank), temperature)
  const keep = method === 'Top-k' ? topK(shaped, k) : method === 'Top-p' ? topP(shaped, p) : shaped.map(() => true)
  return { shaped, keep, chances: truncate(shaped, keep) }
}

// The share of the draws that land on a word that makes no sense
export const nonsenseShare = (blank: Blank, chances: number[]) =>
  blank.words.reduce((sum, w, i) => sum + (w.sensible ? 0 : chances[i]), 0)

// Draw one word: walk the chances until the running total passes a random
// number in [0, 1)
export function draw(random: () => number, chances: number[]): number {
  const r = random()
  let total = 0
  for (let i = 0; i < chances.length; i++) {
    total += chances[i]
    if (r < total && chances[i] > 0) return i
  }
  // Rounding left the total a hair under 1: the last word that can be drawn
  for (let i = chances.length - 1; i >= 0; i--) if (chances[i] > 0) return i
  return 0
}

export const draws = (random: () => number, chances: number[], n: number) =>
  Array.from({ length: n }, () => draw(random, chances))

// The story: 100 postcards drawn from every slip, then from the five most
// common words only. Seeded to land on what the arithmetic says: 25 of 100
// silly, a quarter
export const STORY_SEED = 16
export const STORY_K = 5
export const STORY_P = 0.7
export const storyDraws = (() => {
  const random = seeded(STORY_SEED)
  const all = draws(random, chancesOf(BEACH), FRIENDS)
  const five = draws(random, truncate(chancesOf(BEACH), topK(chancesOf(BEACH), STORY_K)), FRIENDS)
  return { all, five }
})()
export const storyJokes = storyDraws.all.filter((i) => !BEACH.words[i].sensible).length

// What a cut keeps of a blank's slips: how many words, and their votes
export function kept(blank: Blank, keep: boolean[]) {
  const words = blank.words.filter((_, i) => keep[i])
  return { words, count: words.length, votes: words.reduce((sum, w) => sum + w.votes, 0) }
}

export const JOKE_VOTES = BEACH.words.filter((w) => !w.sensible).reduce((sum, w) => sum + w.votes, 0)

// The guess: a model with 25,000 nonsense words, each 1 in 100,000
export const GUESS = { nonsense: 25_000, each: 1 / 100_000 }
export const guessShare = GUESS.nonsense * GUESS.each

// The temperatures the page works through, with the beach's share and the
// jokes' share at each
export const WORKED_TEMPERATURES = [0.5, 1, 2] as const
export const worked = WORKED_TEMPERATURES.map((temperature) => {
  const chances = softmax(scoresOf(BEACH), temperature)
  return { temperature, beach: chances[0], jokes: nonsenseShare(BEACH, chances) }
})

// How many times likelier beach is than one joke word at a temperature: the
// sums cancel, leaving e to the gap in scores over the temperature
export const beachOverJoke = (temperature: number) => Math.exp((Math.log(36) - Math.log(1)) / temperature)

// Check yourself: top-p at 0.8 on these chances
export const CHECK_CHANCES = [0.5, 0.2, 0.15, 0.1, 0.05]
export const CHECK_P = 0.8
export const checkKept = topP(CHECK_CHANCES, CHECK_P).filter(Boolean).length

// What the lab opens on
export const LAB_START: Settings = { method: 'All words', k: STORY_K, p: STORY_P, temperature: 1 }
export const LAB_DRAWS = 12
// The lab's first twelve draws land near the chances: 3 jokes at the beach,
// none at the stove
export const LAB_SEED = 40

export const percent = (share: number) => `${Math.round(share * 100)}%`
