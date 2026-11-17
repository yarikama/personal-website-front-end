import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  ALL_MERGES,
  applyMerge,
  CHECK_FIRST,
  CHECK_WORDS,
  encode,
  encodeSteps,
  gluedAt,
  holding,
  joined,
  learn,
  letters,
  MERGES,
  NEW_WORD,
  ORDERS,
  pairCounts,
  STAGES,
  STORY_MERGES,
  storyMerges,
  vocabularySize,
  WORDS,
  type Entry,
  type Merge,
} from './model'

const countOf = (pairs: Merge[], left: string, right: string) =>
  pairs.find((p) => p.left === left && p.right === right)?.count ?? 0

describe('the shop’s list, by hand', () => {
  it('is 60 orders that take 308 presses letter by letter', () => {
    expect(ORDERS).toBe(60)
    expect(STAGES[0].presses).toBe(308)
  })

  it('counts each pair once per place, times how often its word was ordered', () => {
    const pairs = STAGES[0].pairs
    // play 9, plays 3, played 4, playing 5, player 4, replay 3, say 6, saying 4, stay 4, staying 2
    expect(countOf(pairs, 'a', 'y')).toBe(9 + 3 + 4 + 5 + 4 + 3 + 6 + 4 + 4 + 2)
    expect(countOf(pairs, 'a', 'y')).toBe(44)
    // every word with play in it
    expect(countOf(pairs, 'p', 'l')).toBe(9 + 3 + 4 + 5 + 4 + 3)
    // playing 5, saying 4, staying 2, reading 4, sing 3, singer 2
    expect(countOf(pairs, 'i', 'n')).toBe(20)
    expect(holding(MERGES[0]).map((e) => e.word)).toEqual([
      'play', 'plays', 'played', 'playing', 'player', 'replay', 'say', 'saying', 'stay', 'staying',
    ])
  })

  it('glues a + y first, then builds play, then ing', () => {
    expect(MERGES.slice(0, 5).map(joined)).toEqual(['ay', 'pl', 'play', 'in', 'ing'])
    expect(MERGES.slice(0, 5).map((m) => m.count)).toEqual([44, 28, 28, 20, 20])
  })

  it('breaks a tie for the pair met first, reading from the top', () => {
    // p + l and l + a both occur 28 times; p + l comes first in “play”
    expect(countOf(STAGES[1].pairs, 'p', 'l')).toBe(countOf(STAGES[1].pairs, 'l', 'ay'))
    expect(joined(MERGES[1])).toBe('pl')
  })

  it('saves exactly a merge’s count in presses, each time', () => {
    for (let k = 1; k <= ALL_MERGES; k++) expect(STAGES[k - 1].presses - STAGES[k].presses).toBe(MERGES[k - 1].count)
    expect(STAGES[1].presses).toBe(264)
    expect(STAGES[STORY_MERGES].presses).toBe(114)
  })

  it('ends with every word whole: one press per order', () => {
    expect(ALL_MERGES).toBe(24)
    expect(STAGES[ALL_MERGES].presses).toBe(ORDERS)
    expect(STAGES[ALL_MERGES].splits.map((s) => s.join(''))).toEqual(WORDS.map((e) => e.word))
    expect(STAGES[ALL_MERGES].splits.every((s) => s.length === 1)).toBe(true)
  })

  it('grows the vocabulary by one piece a merge', () => {
    expect(vocabularySize(0)).toBe(26)
    expect(vocabularySize(STORY_MERGES)).toBe(36)
  })
})

describe('a word nobody ordered', () => {
  it('is never in the list', () => {
    expect(WORDS.map((e) => e.word)).not.toContain(NEW_WORD)
  })

  it('splits into re, play and ing after ten merges', () => {
    expect(encode(NEW_WORD, storyMerges)).toEqual(['re', 'play', 'ing'])
    expect(encodeSteps(NEW_WORD, storyMerges).map((s) => s.pieces.join(' '))).toEqual([
      'r e p l a y i n g',
      'r e p l ay i n g',
      'r e pl ay i n g',
      'r e play i n g',
      'r e play in g',
      'r e play ing',
      're play ing',
    ])
  })

  it('becomes re and playing once every merge is learned', () => {
    expect(encode(NEW_WORD, MERGES)).toEqual(['re', 'playing'])
  })

  it('falls back to letters when no merge fits', () => {
    expect(encode('zebra', MERGES)).toEqual(letters('zebra'))
  })
})

describe('the check’s list', () => {
  it('glues m + a first: 8 against 7 for a + t and a + p', () => {
    const pairs = learn(CHECK_WORDS, 0)[0].pairs
    expect(countOf(pairs, 'm', 'a')).toBe(8)
    expect(countOf(pairs, 'a', 't')).toBe(7)
    expect(countOf(pairs, 'a', 'p')).toBe(7)
    expect(countOf(pairs, 's', 'a')).toBe(4)
    expect(joined(CHECK_FIRST)).toBe('ma')
  })
})

describe('gluing', () => {
  it('scans from the left and never uses a piece twice', () => {
    expect(applyMerge(letters('aaa'), { left: 'a', right: 'a' })).toEqual(['aa', 'a'])
    expect(applyMerge(letters('aaaa'), { left: 'a', right: 'a' })).toEqual(['aa', 'aa'])
    expect(gluedAt(letters('aaa'), { left: 'a', right: 'a' })).toEqual([0])
  })
})

// A second implementation, the way the original paper writes it: each word
// written out as many times as it was ordered, pieces joined by spaces, a
// merge done with a regular expression
function bruteForce(words: Entry[], most: number): string[] {
  let corpus = words.flatMap((e) => Array.from({ length: e.count }, () => e.word.split('').join(' ')))
  const learned: string[] = []
  while (learned.length < most) {
    const counts = new Map<string, number>()
    for (const w of corpus) {
      const s = w.split(' ')
      for (let i = 0; i + 1 < s.length; i++) counts.set(`${s[i]} ${s[i + 1]}`, (counts.get(`${s[i]} ${s[i + 1]}`) ?? 0) + 1)
    }
    let best: string | null = null
    for (const [pair, n] of counts) if (best === null || n > counts.get(best)!) best = pair
    if (best === null) break
    const re = new RegExp(`(?<!\\S)${best}(?!\\S)`, 'g')
    corpus = corpus.map((w) => w.replace(re, best.replace(' ', '')))
    learned.push(best)
  }
  return learned
}

function randomWords(random: () => number): Entry[] {
  const alphabet = 'abcde'
  const seen = new Set<string>()
  const words: Entry[] = []
  const n = 2 + Math.floor(random() * 6)
  while (words.length < n) {
    const length = 1 + Math.floor(random() * 6)
    const word = Array.from({ length }, () => alphabet[Math.floor(random() * alphabet.length)]).join('')
    if (seen.has(word)) continue
    seen.add(word)
    words.push({ word, count: 1 + Math.floor(random() * 5) })
  }
  return words
}

describe('on random lists', () => {
  it('learns the same merges as the written-out brute force', () => {
    const random = seeded(584)
    for (let trial = 0; trial < 300; trial++) {
      const words = randomWords(random)
      const merges = learn(words, Infinity).at(-1)!.merges
      expect(merges.map((m) => `${m.left} ${m.right}`)).toEqual(bruteForce(words, Infinity))
    }
  })

  it('counts pairs as the written-out list does', () => {
    const random = seeded(7)
    for (let trial = 0; trial < 200; trial++) {
      const words = randomWords(random)
      const splits = words.map((e) => letters(e.word))
      for (const p of pairCounts(words, splits)) {
        let n = 0
        for (const e of words) for (let i = 0; i + 1 < e.word.length; i++) if (e.word[i] === p.left && e.word[i + 1] === p.right) n += e.count
        expect(p.count).toBe(n)
      }
    }
  })

  it('splits a learned word the way learning did, and always rejoins to the word', () => {
    const random = seeded(12)
    for (let trial = 0; trial < 200; trial++) {
      const words = randomWords(random)
      const stages = learn(words, Infinity)
      const k = Math.floor(random() * stages.length)
      words.forEach((e, w) => expect(encode(e.word, stages[k].merges)).toEqual(stages[k].splits[w]))
      const other = randomWords(random)[0].word
      expect(encode(other, stages[k].merges).join('')).toBe(other)
    }
  })

  it('saves at least one press a merge, and never goes below one press a word', () => {
    const random = seeded(31)
    for (let trial = 0; trial < 200; trial++) {
      const words = randomWords(random)
      const stages = learn(words, Infinity)
      const orders = words.reduce((sum, e) => sum + e.count, 0)
      for (let k = 1; k < stages.length; k++) expect(stages[k].presses).toBeLessThan(stages[k - 1].presses)
      expect(stages.at(-1)!.presses).toBe(orders)
    }
  })
})
