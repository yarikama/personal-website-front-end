// Byte-pair encoding, run for real on a short list of words and how often
// each was written. Every number the page states comes from here.

export interface Entry {
  word: string
  count: number
}

// A merge: two neighbouring pieces glued into one, and how often they sat
// side by side (each word's count, once per place in it) when it was chosen
export interface Merge {
  left: string
  right: string
  count: number
}

export const joined = (m: Pick<Merge, 'left' | 'right'>) => m.left + m.right

// A word as single letters: where every word starts
export const letters = (word: string) => [...word]

// Every pair of neighbouring pieces and how often it occurs, counting each
// word as many times as it was written. In the order first met, reading the
// list from the top: that order breaks ties.
export function pairCounts(words: Entry[], splits: string[][]): Merge[] {
  const found = new Map<string, Merge>()
  splits.forEach((pieces, w) => {
    for (let i = 0; i + 1 < pieces.length; i++) {
      const key = `${pieces[i]}\u0000${pieces[i + 1]}`
      const seen = found.get(key)
      if (seen) seen.count += words[w].count
      else found.set(key, { left: pieces[i], right: pieces[i + 1], count: words[w].count })
    }
  })
  return [...found.values()]
}

// The pair to merge next: the most frequent, ties to the one met first
export function bestPair(counts: Merge[]): Merge | null {
  let best: Merge | null = null
  for (const pair of counts) if (!best || pair.count > best.count) best = pair
  return best
}

// Glue every `left` followed by `right`, scanning from the left so that a
// piece is never used twice
export function applyMerge(pieces: string[], merge: Pick<Merge, 'left' | 'right'>): string[] {
  const out: string[] = []
  for (let i = 0; i < pieces.length; i++) {
    if (i + 1 < pieces.length && pieces[i] === merge.left && pieces[i + 1] === merge.right) {
      out.push(joined(merge))
      i++
    } else out.push(pieces[i])
  }
  return out
}

// How many stamp presses (tokens) the whole list takes, split as it is
export const presses = (words: Entry[], splits: string[][]) =>
  splits.reduce((sum, pieces, w) => sum + pieces.length * words[w].count, 0)

// One stage of learning: how each word is split after `merges.length` merges
export interface Stage {
  splits: string[][]
  // The merges learned so far, in order
  merges: Merge[]
  // The pairs as counted at this stage, most frequent first (ties: first met)
  pairs: Merge[]
  presses: number
}

// Learn up to `most` merges, stopping early if no pair is left. Stage i is
// the list after i merges.
export function learn(words: Entry[], most: number): Stage[] {
  let splits = words.map((e) => letters(e.word))
  const merges: Merge[] = []
  const stages: Stage[] = []
  for (;;) {
    const counts = pairCounts(words, splits)
    const pairs = counts
      .map((p, i) => ({ p, i }))
      .sort((a, b) => b.p.count - a.p.count || a.i - b.i)
      .map(({ p }) => p)
    stages.push({ splits, merges: [...merges], pairs, presses: presses(words, splits) })
    const next = bestPair(counts)
    if (!next || merges.length >= most) break
    merges.push(next)
    splits = splits.map((pieces) => applyMerge(pieces, next))
  }
  return stages
}

// Split a new word: start from letters and replay the merges in the order
// they were learned. How often things were written in the new text plays
// no part.
export function encode(word: string, merges: Merge[]): string[] {
  return merges.reduce((pieces, m) => applyMerge(pieces, m), letters(word))
}

// The vocabulary: the 26 letters the stamp box starts with, plus one new
// piece per merge
export const ALPHABET = letters('abcdefghijklmnopqrstuvwxyz')
export const vocabularySize = (merges: number) => ALPHABET.length + merges

// Where `merge` would glue `pieces`: the index of each left half it would
// take, scanning as applyMerge does
export function gluedAt(pieces: string[], merge: Pick<Merge, 'left' | 'right'>): number[] {
  const at: number[] = []
  for (let i = 0; i + 1 < pieces.length; i++) {
    if (pieces[i] === merge.left && pieces[i + 1] === merge.right) {
      at.push(i)
      i++
    }
  }
  return at
}

// A new word as the merges reach it: its letters, then its pieces after
// each merge that changed it, with that merge
export function encodeSteps(word: string, merges: Merge[]): { pieces: string[]; merge: Merge | null }[] {
  const steps: { pieces: string[]; merge: Merge | null }[] = [{ pieces: letters(word), merge: null }]
  for (const m of merges) {
    const last = steps[steps.length - 1].pieces
    const next = applyMerge(last, m)
    if (next.length < last.length) steps.push({ pieces: next, merge: m })
  }
  return steps
}

// The story's bookmark shop: last month's orders, a word and how many
// times it was ordered. Written for the page, so every count can be checked.
export const WORDS: Entry[] = (
  [
    ['play', 9],
    ['plays', 3],
    ['played', 4],
    ['playing', 5],
    ['player', 4],
    ['replay', 3],
    ['say', 6],
    ['saying', 4],
    ['stay', 4],
    ['staying', 2],
    ['read', 5],
    ['reading', 4],
    ['reader', 2],
    ['sing', 3],
    ['singer', 2],
  ] as const
).map(([word, count]) => ({ word, count }))

export const ORDERS = WORDS.reduce((sum, e) => sum + e.count, 0)

// Every stage, from letters until no two pieces are left side by side
export const STAGES = learn(WORDS, Infinity)
export const ALL_MERGES = STAGES.length - 1
export const MERGES = STAGES[ALL_MERGES].merges

// The story learns ten merges
export const STORY_MERGES = 10
export const storyMerges = MERGES.slice(0, STORY_MERGES)

// The word nobody ordered, and others to try in the lab
export const NEW_WORD = 'replaying'
export const TRY_WORDS = ['replaying', 'resaying', 'slayer', 'singing', 'zebra'] as const

// The first merges, worked by hand on the page: which words hold each pair
export const holding = (merge: Pick<Merge, 'left' | 'right'>, words: Entry[] = WORDS) =>
  words.filter((e) => gluedAt(letters(e.word), merge).length > 0)

// The check: a new list, and the pair BPE glues first
export const CHECK_WORDS: Entry[] = (
  [
    ['sat', 4],
    ['mat', 3],
    ['map', 5],
    ['cap', 2],
  ] as const
).map(([word, count]) => ({ word, count }))
export const CHECK_FIRST = learn(CHECK_WORDS, 1)[1].merges[0]
