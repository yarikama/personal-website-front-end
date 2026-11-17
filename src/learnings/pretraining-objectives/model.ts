import { seeded } from '../../components/explain/random'

// Pretraining objectives: the games a Transformer plays on raw text. Every
// number the page states is worked out here; the figures only draw.

// ---------------------------------------------------------------------------
// The toy text

const words = (s: string) => s.split(' ')

// The sentence the story's quiz is set on, and the lab's other two
export const STORY = words('we sat on the bank of the river and watched the boats go by')
export const SENTENCES = [
  STORY,
  words('she paid the money she earned last week into the bank'),
  words('the cat slept on the warm rug while the rain fell outside'),
]
// Every word the sentences use: where a swapped-in wrong word comes from
export const VOCAB = [...new Set(SENTENCES.flat())].sort()

// ---------------------------------------------------------------------------
// The story

// Where the card stops: the friend has seen "we sat on the" and must guess bank
export const CARD_AT = STORY.indexOf('bank')
// The two words blanked out, about one word in seven
export const BLANKS = [STORY.indexOf('bank'), STORY.lastIndexOf('boats')]
export const BLANK_SHARE = BLANKS.length / STORY.length
// The second blank, now and then swapped for a wrong word instead
export const SWAP = { at: BLANKS[1], word: 'spoons' }
// The phrases blanked out whole: "bank of" and "boats"
export const STORY_SPANS: [number, number][] = [
  [STORY.indexOf('bank'), STORY.indexOf('bank') + 1],
  [BLANKS[1], BLANKS[1]],
]

// ---------------------------------------------------------------------------
// The three games, as what goes in and what must come out

export type Kind =
  | 'word' // a word as written
  | 'blank' // hidden: [MASK]
  | 'swap' // a wrong word swapped in, still to be guessed
  | 'kept' // left as written, still to be guessed
  | 'tag' // a sentinel standing for a dropped span
  | 'edge' // <s> or </s>

export interface Tile {
  text: string
  kind: Kind
}

export interface Game {
  input: Tile[]
  output: Tile[]
  // Words the model is asked to guess
  guesses: number
  // Words in the input still as written
  intact: number
  // How much of the sentence each guess may look at
  sees: 'left' | 'both'
}

export const START = '<s>'
export const END = '</s>'
export const MASK = '[MASK]'

// GPT's game: every word is a guess, made from the words before it
export function nextWord(sentence: string[]): Game {
  return {
    input: [{ text: START, kind: 'edge' }, ...sentence.map((text): Tile => ({ text, kind: 'word' }))],
    output: [...sentence.map((text): Tile => ({ text, kind: 'word' })), { text: END, kind: 'edge' }],
    guesses: sentence.length + 1,
    intact: sentence.length,
    sees: 'left',
  }
}

// BERT's split for a chosen word: 8 in 10 blanked, 1 in 10 swapped for a
// random word, 1 in 10 left as written
export const SHARES = { blank: 0.8, swap: 0.1, kept: 0.1 }
// So only this share of all the text is ever a wrong word: 10% of 15%
export const RATE = 0.15
export const WRONG_SHARE = RATE * SHARES.swap

// How many words a rate picks from n: BERT picks 15% of the positions
export const picked = (n: number, rate: number) => Math.max(1, Math.round(n * rate))

// `k` distinct places out of `n`, in order
export function choose(n: number, k: number, random: () => number): number[] {
  const places = Array.from({ length: n }, (_, i) => i)
  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(random() * (n - i))
    ;[places[i], places[j]] = [places[j], places[i]]
  }
  return places.slice(0, k).sort((a, b) => a - b)
}

export type Treatment = 'blank' | 'swap' | 'kept'

export function treat(random: () => number): Treatment {
  const r = random()
  return r < SHARES.blank ? 'blank' : r < SHARES.blank + SHARES.swap ? 'swap' : 'kept'
}

// A wrong word for `word`: any other word from the vocabulary
export function wrongFor(word: string, random: () => number): string {
  const others = VOCAB.filter((w) => w !== word)
  return others[Math.floor(random() * others.length)]
}

// BERT's game, from chosen places and how each one is treated
export function maskedFrom(sentence: string[], chosen: number[], treatments: Treatment[], swaps: string[]): Game {
  const input = sentence.map((text, i): Tile => {
    const c = chosen.indexOf(i)
    if (c < 0) return { text, kind: 'word' }
    const how = treatments[c]
    return how === 'blank' ? { text: MASK, kind: 'blank' } : how === 'swap' ? { text: swaps[c], kind: 'swap' } : { text, kind: 'kept' }
  })
  return {
    input,
    output: chosen.map((i) => ({ text: sentence[i], kind: 'word' })),
    guesses: chosen.length,
    intact: input.filter((t) => t.kind === 'word' || t.kind === 'kept').length,
    sees: 'both',
  }
}

export function masked(sentence: string[], rate: number, random: () => number): Game {
  const chosen = choose(sentence.length, picked(sentence.length, rate), random)
  const treatments = chosen.map(() => treat(random))
  const swaps = chosen.map((i) => wrongFor(sentence[i], random))
  return maskedFrom(sentence, chosen, treatments, swaps)
}

// T5's sentinels, in order: the paper writes them <X>, <Y>, <Z>
export const sentinel = (i: number) => `<${'XYZWVU'[i]}>`
// T5's spans average three words
export const MEAN_SPAN = 3

// T5's game from a set of spans [first, last]: each span becomes one
// sentinel in the input, and the output lists each sentinel with the words
// it stands for, then one last sentinel
export function spansFrom(sentence: string[], spans: [number, number][]): Game {
  const input: Tile[] = []
  const output: Tile[] = []
  let dropped = 0
  let at = 0
  spans.forEach(([first, last], s) => {
    for (; at < first; at++) input.push({ text: sentence[at], kind: 'word' })
    input.push({ text: sentinel(s), kind: 'tag' })
    output.push({ text: sentinel(s), kind: 'tag' })
    for (; at <= last; at++) output.push({ text: sentence[at], kind: 'word' })
    dropped += last - first + 1
  })
  for (; at < sentence.length; at++) input.push({ text: sentence[at], kind: 'word' })
  output.push({ text: sentinel(spans.length), kind: 'tag' })
  return { input, output, guesses: dropped, intact: sentence.length - dropped, sees: 'both' }
}

// `total` split into `parts` lengths of at least 1, at random
export function split(total: number, parts: number, random: () => number): number[] {
  const cuts = choose(total - 1, parts - 1, random).map((c) => c + 1)
  const edges = [0, ...cuts, total]
  return edges.slice(1).map((e, i) => e - edges[i])
}

// T5's way of placing spans: drop 15% of the words, in spans averaging three
// words, with kept stretches between them. The stretches before the first
// span and after the last may be empty, so a span can fall anywhere.
export function spanPlaces(n: number, rate: number, random: () => number): [number, number][] {
  const dropped = picked(n, rate)
  const count = Math.max(1, Math.min(Math.round(dropped / MEAN_SPAN), n - dropped + 1))
  const lengths = split(dropped, count, random)
  // count + 1 stretches of kept words, each at least 1, then one taken off
  // the two ends
  const gaps = split(n - dropped + 2, count + 1, random)
  gaps[0] -= 1
  const spans: [number, number][] = []
  let at = 0
  for (let s = 0; s < count; s++) {
    at += gaps[s]
    spans.push([at, at + lengths[s] - 1])
    at += lengths[s]
  }
  return spans
}

export const spans = (sentence: string[], rate: number, random: () => number) =>
  spansFrom(sentence, spanPlaces(sentence.length, rate, random))

// The story's two games on the quiz sentence
export const STORY_MASKED = maskedFrom(STORY, BLANKS, ['blank', 'blank'], ['', ''])
export const STORY_T5 = spansFrom(STORY, STORY_SPANS)

// ---------------------------------------------------------------------------
// The one line of math: BERT's loss on the story's two blanks

// What a model might give the right word at each blank
export const CLIP_PROBS = { bank: 0.4, boats: 0.2 }
export const surprise = (p: number) => -Math.log(p)
export const CLIP_LOSS = surprise(CLIP_PROBS.bank) + surprise(CLIP_PROBS.boats)

// How many guesses a 512-token sequence gives, and how many words are left
// to guess from, at three masking rates; next-word gets one at every word
export const SEQUENCE = 512
export const TRADE_RATES = [0.05, 0.15, 0.5]
export const TRADE = TRADE_RATES.map((rate) => {
  const guesses = Math.round(SEQUENCE * rate)
  return { rate, guesses, clues: SEQUENCE - guesses, passes: SEQUENCE / guesses }
})

// ---------------------------------------------------------------------------
// Static against contextual vectors

// Made-up two-dimensional word vectors: across, how much a word is about
// money; up, how much it is about water and the outdoors. Little words sit
// near the corner.
export const VECTORS: Record<string, [number, number]> = {
  bank: [0.7, 0.7],
  river: [0.1, 1.0],
  boats: [0.2, 0.9],
  sat: [0.15, 0.3],
  watched: [0.2, 0.4],
  money: [1.0, 0.1],
  paid: [0.85, 0.2],
  earned: [0.95, 0.0],
  week: [0.3, 0.1],
  last: [0.15, 0.1],
  we: [0.1, 0.1],
  she: [0.1, 0.1],
  on: [0.05, 0.12],
  the: [0.05, 0.05],
  of: [0.06, 0.04],
  and: [0.04, 0.06],
  go: [0.08, 0.1],
  by: [0.06, 0.08],
  into: [0.1, 0.08],
}
export const LITTLE = ['we', 'she', 'on', 'the', 'of', 'and', 'go', 'by', 'into', 'last']
// How sharply a word leans toward the words most like it
export const SHARPNESS = 4

const dot = (a: [number, number], b: [number, number]) => a[0] * b[0] + a[1] * b[1]
export const cosine = (a: [number, number], b: [number, number]) => dot(a, b) / Math.sqrt(dot(a, a) * dot(b, b))

// How much a word at `at` takes from each word of its sentence: a softmax
// over how alike they are (one round of self-attention with no learned
// weights)
export function weights(sentence: string[], at: number, sharpness = SHARPNESS): number[] {
  const me = VECTORS[sentence[at]]
  const scores = sentence.map((w) => sharpness * dot(me, VECTORS[w]))
  const top = Math.max(...scores)
  const e = scores.map((s) => Math.exp(s - top))
  const sum = e.reduce((a, b) => a + b, 0)
  return e.map((x) => x / sum)
}

// The word's vector in this sentence: the weighted mix of its sentence
export function contextual(sentence: string[], at: number, sharpness = SHARPNESS): [number, number] {
  const w = weights(sentence, at, sharpness)
  return sentence.reduce<[number, number]>(
    (sum, word, i) => [sum[0] + w[i] * VECTORS[word][0], sum[1] + w[i] * VECTORS[word][1]],
    [0, 0],
  )
}

export const RIVER_SENTENCE = SENTENCES[0]
export const MONEY_SENTENCE = SENTENCES[1]
export const BANK = {
  still: VECTORS.bank,
  river: contextual(RIVER_SENTENCE, RIVER_SENTENCE.indexOf('bank')),
  money: contextual(MONEY_SENTENCE, MONEY_SENTENCE.indexOf('bank')),
}
export const BANK_COSINE = cosine(BANK.river, BANK.money)

// ---------------------------------------------------------------------------
// The lab

export const GAMES = ['Next word', 'Masked words', 'Spans'] as const
export type GameName = (typeof GAMES)[number]
export const LAB_RATES = [0.15, 0.3, 0.5] as const

export function play(game: GameName, sentence: string[], rate: number, seed: number): Game {
  if (game === 'Next word') return nextWord(sentence)
  const r = seeded(seed)
  return game === 'Masked words' ? masked(sentence, rate, r) : spans(sentence, rate, r)
}

// ---------------------------------------------------------------------------
// The checks

// Check yourself: T5 on a new sentence, with these words chosen
export const CHECK_SENTENCE = words('my sister baked bread for the whole street on sunday')
export const CHECK_SPANS: [number, number][] = [
  [2, 3],
  [9, 9],
]
export const CHECK_T5 = spansFrom(CHECK_SENTENCE, CHECK_SPANS)

// BERT's own ablation (its Table 8): always [MASK] against 80/10/10
export const ABLATION = {
  mixed: { mnli: 84.2, nerFeatures: 94.9 },
  alwaysMask: { mnli: 84.3, nerFeatures: 94.0 },
}

export const percent = (x: number, digits = 0) => `${(x * 100).toFixed(digits)}%`
export const text = (tiles: Tile[]) => tiles.map((t) => t.text).join(' ')
