import { between, seeded } from '../../components/explain/random'

// A next-word model small enough to check by hand: a tree of choices. Each
// choice is a word with the model's chance for it, given every word before
// it, and the choices it opens. A choice with nothing after it ends the
// sentence. The chances at each fork add up to 1.
export interface Choice {
  word: string
  p: number
  next: Choice[]
}

export interface Tree {
  // What the sentence answers or translates
  context: string
  first: Choice[]
}

// The end of a sentence, counted as a word, as a language model counts it
export const END = '</s>'

const pick = (word: string, p: number, ...next: Choice[]): Choice => ({ word, p, next })

// The story: replies to a friend's text, three words each. Tapping the
// likeliest word each time writes “I might come” (0.198); the likeliest
// reply of all is “Yes I'm in” (0.288), which starts with the word ranked
// second.
export const STORY: Tree = {
  context: 'Dinner tonight?',
  first: [
    pick('I', 0.6, pick('might', 0.55, pick('come', 0.6), pick('not', 0.4)), pick('can’t', 0.45, pick('tonight', 0.7), pick('sorry', 0.3))),
    pick('Yes', 0.4, pick('I’m', 0.9, pick('in', 0.8), pick('coming', 0.2)), pick('please', 0.1, pick('when', 0.6), pick('where', 0.4))),
  ],
}

// A translation where a beam of 2 still misses: the likeliest sentence
// starts third best after two words. Greedy writes the literal “It rains
// ropes”, a beam of 2 finds “It is pouring”, a beam of 3 “It’s pouring down”.
export const TRAP: Tree = {
  context: 'Il pleut des cordes',
  first: [
    pick('It', 0.6, pick('rains', 0.55, pick('ropes', 0.52), pick('hard', 0.48)), pick('is', 0.45, pick('pouring', 0.8), pick('raining', 0.2))),
    pick('It’s', 0.4, pick('pouring', 0.6, pick('down', 0.95), pick('ropes', 0.05)), pick('raining', 0.4, pick('hard', 0.7), pick('ropes', 0.3))),
  ],
}

// Replies of different lengths, each ended by END. Multiplied, the short
// “No” wins; per word, “Yes I'm in” does.
export const LENGTHS: Tree = {
  context: 'Dinner tonight?',
  first: [
    pick('No', 0.45, pick(END, 0.8), pick('thanks', 0.2, pick(END, 1))),
    pick('Yes', 0.55, pick(END, 0.25), pick('I’m', 0.75, pick('in', 0.8, pick(END, 1)), pick('coming', 0.2, pick(END, 1)))),
  ],
}

export const TREES = { Story: STORY, Trap: TRAP, Lengths: LENGTHS } as const
export type TreeName = keyof typeof TREES

// A sentence so far: the place of each choice at each fork, its words, the
// chance of all of them together, and whether it has ended
export interface Hypothesis {
  path: number[]
  words: string[]
  chance: number
  done: boolean
}

const root: Hypothesis = { path: [], words: [], chance: 1, done: false }

// The choices open after a hypothesis
export function choicesAfter(tree: Tree, path: number[]): Choice[] {
  let choices = tree.first
  for (const i of path) choices = choices[i].next
  return choices
}

// Every way a hypothesis can go on by one word, with its chance multiplied in
export function extend(tree: Tree, h: Hypothesis): Hypothesis[] {
  return choicesAfter(tree, h.path).map((c, i) => ({
    path: [...h.path, i],
    words: [...h.words, c.word],
    chance: h.chance * c.p,
    done: c.next.length === 0,
  }))
}

// The chance of a sentence per word: the number that, multiplied once for
// each of its words, gives its chance. The same as e to the average log
// chance per word.
export const perWord = (h: Hypothesis) => Math.exp(Math.log(h.chance) / h.words.length)
export const logScore = (h: Hypothesis) => Math.log(h.chance) / h.words.length

export type Scoring = 'total' | 'per word'
export const scoreOf = (h: Hypothesis, scoring: Scoring) => (scoring === 'total' ? h.chance : perWord(h))

// Every whole sentence the tree can write, top to bottom
export function sentences(tree: Tree): Hypothesis[] {
  const all: Hypothesis[] = []
  const walk = (h: Hypothesis) => {
    if (h.done) all.push(h)
    else extend(tree, h).forEach(walk)
  }
  walk(root)
  return all
}

// The referee: the best sentence, found by scoring every one. Ties go to
// the one higher in the tree.
export function best(tree: Tree, scoring: Scoring = 'total'): Hypothesis {
  return sentences(tree).reduce((a, b) => (scoreOf(b, scoring) > scoreOf(a, scoring) + 1e-12 ? b : a))
}

// Every partial sentence a full search would score: each node of the tree
export function nodeCount(tree: Tree): number {
  const count = (choices: Choice[]): number => choices.reduce((n, c) => n + 1 + count(c.next), 0)
  return count(tree.first)
}

export interface BeamStep {
  // Every extension of the beam, best first
  candidates: Hypothesis[]
  // The k best of them: those still going stay in the beam, those that
  // ended are put aside as finished
  kept: Hypothesis[]
}

export interface BeamRun {
  steps: BeamStep[]
  finished: Hypothesis[]
  result: Hypothesis
  // Partial sentences scored along the way
  scored: number
}

const sameKey = (a: number[], b: number[]) => a.length === b.length && a.every((x, i) => x === b[i])
export const samePath = (a: Hypothesis, b: Hypothesis) => sameKey(a.path, b.path)

// Beam search with beam width k: extend every hypothesis in the beam by one
// word, keep the k likeliest, set aside those that ended, repeat until none
// is left; then return the best finished sentence by `scoring`. All the
// hypotheses compared at one step have the same length, so pruning by the
// total chance and by the chance per word agree. With k = 1 it is greedy
// decoding. Ties go to the one higher in the tree.
export function beam(tree: Tree, k: number, scoring: Scoring = 'total'): BeamRun {
  let current = [root]
  const steps: BeamStep[] = []
  const finished: Hypothesis[] = []
  let scored = 0
  while (current.length > 0) {
    const candidates = current
      .flatMap((h) => extend(tree, h))
      .map((h, order) => ({ h, order }))
      .sort((a, b) => b.h.chance - a.h.chance || a.order - b.order)
      .map(({ h }) => h)
    scored += candidates.length
    const kept = candidates.slice(0, k)
    steps.push({ candidates, kept })
    finished.push(...kept.filter((h) => h.done))
    current = kept.filter((h) => !h.done)
  }
  const result = finished.reduce((a, b) => (scoreOf(b, scoring) > scoreOf(a, scoring) + 1e-12 ? b : a))
  return { steps, finished, result, scored }
}

export const greedy = (tree: Tree) => beam(tree, 1)

// The same tree with new chances at every two-way fork, between 0.1 and 0.9
// in steps of 0.05
export function reroll(tree: Tree, random: () => number): Tree {
  const again = (choices: Choice[]): Choice[] => {
    if (choices.length !== 2) throw new Error('reroll needs two-way forks')
    const p = Math.round(between(random, 0.1, 0.9) * 20) / 20
    return choices.map((c, i) => ({ ...c, p: i === 0 ? p : Math.round((1 - p) * 20) / 20, next: c.next.length ? again(c.next) : [] }))
  }
  return { ...tree, first: again(tree.first) }
}

// How often each beam width finds the likeliest reply, over many story trees
// with random chances
export const TRIALS = { trees: 1000, seed: 584 }
export const WIDTHS = [1, 2, 3, 4] as const

export function hitRates(trees = TRIALS.trees, seed = TRIALS.seed): Record<number, number> {
  const random = seeded(seed)
  const hits: Record<number, number> = Object.fromEntries(WIDTHS.map((k) => [k, 0]))
  for (let t = 0; t < trees; t++) {
    const tree = reroll(STORY, random)
    const top = best(tree).chance
    for (const k of WIDTHS) if (beam(tree, k).result.chance >= top - 1e-12) hits[k]++
  }
  return Object.fromEntries(WIDTHS.map((k) => [k, hits[k] / trees]))
}

export const HIT_RATES = hitRates()

// The story's numbers
export const STORY_GREEDY = greedy(STORY).result
export const STORY_BEST = best(STORY)
export const STORY_BEAM = beam(STORY, 2)
export const STORY_NODES = nodeCount(STORY)

// Three finished replies from LENGTHS, for the worked numbers: the short
// “No”, the short “Yes”, and “Yes I'm in”
export const WORKED = [
  sentences(LENGTHS).find((h) => h.words.join(' ') === `No ${END}`)!,
  sentences(LENGTHS).find((h) => h.words.join(' ') === `Yes ${END}`)!,
  sentences(LENGTHS).find((h) => h.words.join(' ') === `Yes I’m in ${END}`)!,
]

// The quick check: four finished replies, each word with the same chance
export const CHECK = [
  { words: 2, each: 0.6 },
  { words: 3, each: 0.5 },
  { words: 4, each: 0.7 },
  { words: 6, each: 0.65 },
]
export const checkTotal = (c: { words: number; each: number }) => c.each ** c.words

// Open-ended writing, in a toy model where a step writes a whole sentence.
// A fresh sentence has a small chance of its own, since many could come
// next; saying the last sentence again has a chance that grows with each
// time it was just said. The chances are made up; the growth is what
// Holtzman et al. (2020) found in GPT-2.
export const OPENING = 'A fox lived at the edge of the woods.'
export const FRESH = [
  { text: 'It was a very quiet fox.', p: 0.06 },
  { text: 'Every night it raided the same henhouse.', p: 0.012 },
  { text: 'The farmer, oddly, never minded.', p: 0.004 },
  { text: 'He had always wanted a dog.', p: 0.009 },
  { text: 'So the fox grew fat, and the farmer got his dog.', p: 0.002 },
]
// The chance of saying the last sentence again, after it was said once,
// twice, three times in a row
export const AGAIN = [0.31, 0.58, 0.74]

// The toy model's chance of `next` after the sentences `before`
export function sentenceChance(before: string[], next: string): number {
  const last = before[before.length - 1]
  if (next === last) {
    let run = 0
    for (let i = before.length - 1; i >= 0 && before[i] === last; i--) run++
    return AGAIN[Math.min(run, AGAIN.length) - 1]
  }
  return FRESH.find((s) => s.text === next)!.p
}

export interface Written {
  text: string
  p: number
}

const chances = (texts: string[]): Written[] => texts.map((text, i) => ({ text, p: sentenceChance(texts.slice(0, i), text) }))

// Four sentences by always taking the likeliest next one, and four a person
// might write
export const LIKELIEST_TEXT: Written[] = (() => {
  const texts: string[] = []
  for (let i = 0; i < 4; i++) {
    const options = FRESH.map((s) => s.text)
    texts.push(options.reduce((a, b) => (sentenceChance(texts, b) > sentenceChance(texts, a) ? b : a)))
  }
  return chances(texts)
})()
export const PERSON_TEXT: Written[] = chances(FRESH.slice(1).map((s) => s.text))

export const totalOf = (written: Written[]) => written.reduce((t, w) => t * w.p, 1)

// What Holtzman et al. (2020) measured over 5,000 GPT-2 Large continuations
// of up to 200 tokens: the share stuck repeating a phrase at the end
export const PAPER = { beamWidth: 16, beamRepeats: 0.2894, greedyRepeats: 0.7366, humanRepeats: 0.0028 }

// Search as a sum: sentences of `length` words from a vocabulary of `vocabulary`
export const COST = { vocabulary: 50000, length: 20, width: 5 }
// Every sentence: about 10 to this power
export const everySentenceExponent = Math.round(COST.length * Math.log10(COST.vocabulary))
// Beam search: the width times the vocabulary, at each step
export const beamScores = COST.width * COST.vocabulary * COST.length

// Formatting
// 0.0080 as “8.0 × 10⁻³”
const SUPERSCRIPT: Record<string, string> = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' }
export function scientific(x: number): string {
  const [m, e] = x.toExponential(1).split('e')
  return `${m} × 10${String(Number(e))
    .split('')
    .map((c) => SUPERSCRIPT[c])
    .join('')}`
}
export const two = (x: number) => x.toFixed(2)
export const three = (x: number) => x.toFixed(3)
export const pct = (x: number) => `${Math.round(x * 100)}%`
export const sentence = (h: Hypothesis) => h.words.filter((w) => w !== END).join(' ')
