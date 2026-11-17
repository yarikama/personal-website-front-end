import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  BIG_SHARE,
  chance,
  CONTEXT,
  contextCount,
  countPairs,
  END,
  factors,
  GUESS,
  LAB,
  MENU,
  neverShare,
  NEVER,
  NONSENSE,
  num,
  oneIn,
  ORDERS,
  pairCount,
  pct,
  ROW,
  rowChances,
  rowCounts,
  SEEN,
  SEEN_SENTENCE,
  SENTENCES,
  sentenceChance,
  START,
  tokens,
  UNK,
  unseenShare,
  V,
  VOCAB,
  visitsChance,
  WORDS,
} from './model'

describe('the training sentences', () => {
  it('use nine words, so eleven things can come next', () => {
    const used = new Set(SENTENCES.flatMap((s) => s.split(' ')))
    expect([...used].sort()).toEqual([...WORDS].sort())
    expect(V).toBe(11)
    expect(VOCAB).toContain(END)
    expect(VOCAB).toContain(UNK)
    expect(VOCAB).not.toContain(START)
  })

  it('count what came after "want" by hand: mango 5, lemon 2, mint 1, of 8', () => {
    expect(ORDERS).toBe(8)
    expect(pairCount('want', 'mango')).toBe(5)
    expect(pairCount('want', 'lemon')).toBe(2)
    expect(pairCount('want', 'mint')).toBe(1)
    expect(rowCounts).toEqual([5, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0])
    expect(SEEN).toBe(3)
    expect(NEVER).toBe(8)
  })

  it('count the other rows the page leans on', () => {
    expect(contextCount(START)).toBe(12)
    expect(pairCount(START, 'i')).toBe(6)
    expect(contextCount('mint')).toBe(2)
    expect(pairCount('mint', END)).toBe(2)
    expect(pairCount('mint', 'now')).toBe(0)
    expect(contextCount('mango')).toBe(6)
    expect(pairCount('mango', 'now')).toBe(2)
    expect(contextCount('now')).toBe(3)
    expect(pairCount('now', END)).toBe(3)
  })

  it('give every menu item a word of the vocabulary, once', () => {
    expect([...ROW].sort()).toEqual([...VOCAB].sort())
    expect(new Set(Object.values(MENU)).size).toBe(V)
    expect(MENU[CONTEXT]).not.toBe(CONTEXT)
  })
})

describe('tokens', () => {
  it('put start and end marks around a sentence and turn unseen words into UNK', () => {
    expect(tokens('we want banana')).toEqual([START, 'we', 'want', UNK, END])
    expect(tokens('i want mango')).toEqual([START, 'i', 'want', 'mango', END])
  })
})

describe('add-k smoothing', () => {
  it('with k = 0 is plain counting: mango 5/8, an unseen word 0', () => {
    expect(chance('want', 'mango', 0)).toBe(5 / 8)
    expect(chance('want', 'now', 0)).toBe(0)
  })

  it('with k = 1 gives mango 6/19 and every unseen word 1/19', () => {
    expect(chance('want', 'mango', 1)).toBeCloseTo(6 / 19, 12)
    expect(chance('want', 'now', 1)).toBeCloseTo(1 / 19, 12)
    expect(neverShare(1)).toBeCloseTo(8 / 19, 12)
    expect(pct(neverShare(1))).toBe('42%')
  })

  it('with k = 0.1 gives mango 5.1/9.1 and the unseen 0.8/9.1 between them', () => {
    expect(chance('want', 'mango', 0.1)).toBeCloseTo(5.1 / 9.1, 12)
    expect(neverShare(0.1)).toBeCloseTo(0.8 / 9.1, 12)
    expect(pct(neverShare(0.1))).toBe('9%')
    expect(pct(chance('want', 'mango', 0.1))).toBe('56%')
  })

  it('gives a context it never saw an even spread, and 0 with k = 0', () => {
    expect(chance(UNK, END, 0)).toBe(0)
    expect(chance(UNK, END, 0.5)).toBeCloseTo(1 / V, 12)
  })

  it('always sums to 1 over what can come next, for every context and k (seeded)', () => {
    const random = seeded(584)
    for (let trial = 0; trial < 200; trial++) {
      const prev = [START, ...WORDS][Math.floor(random() * (WORDS.length + 1))]
      const k = 0.001 + random() * 3
      const total = VOCAB.reduce((sum, w) => sum + chance(prev, w, k), 0)
      expect(total).toBeCloseTo(1, 10)
    }
  })

  it('matches pretend counts added to a brute-force table (seeded random corpora)', () => {
    const random = seeded(7)
    for (let trial = 0; trial < 100; trial++) {
      const corpus = Array.from({ length: 1 + Math.floor(random() * 8) }, () =>
        Array.from({ length: 1 + Math.floor(random() * 5) }, () => WORDS[Math.floor(random() * WORDS.length)]).join(' '),
      )
      const counts = countPairs(corpus)
      const k = [0.01, 0.1, 0.5, 1, 2][Math.floor(random() * 5)]
      // Brute force: write every pair out, then add k to every cell of each row
      const all = corpus.flatMap((s) => {
        const t = [START, ...s.split(' '), END]
        return t.slice(1).map((next, i) => [t[i], next] as const)
      })
      for (const prev of [START, ...WORDS]) {
        const row = VOCAB.map((next) => all.filter(([a, b]) => a === prev && b === next).length + k)
        const sum = row.reduce((a, b) => a + b, 0)
        VOCAB.forEach((next, j) => expect(chance(prev, next, k, counts)).toBeCloseTo(row[j] / sum, 12))
      }
    }
  })

  it('moves every unseen word toward an even 1/V as k grows', () => {
    let last = 0
    for (const k of [0.01, 0.1, 1, 10, 1000]) {
      const p = chance('want', 'now', k)
      expect(p).toBeGreaterThan(last)
      expect(p).toBeLessThan(1 / V)
      last = p
    }
    expect(chance('want', 'mango', 1e6)).toBeCloseTo(1 / V, 4)
  })

  it('takes from seen words what it gives the unseen', () => {
    for (const k of [0.1, 1]) {
      const seen = rowChances(k).slice(0, SEEN).reduce((a, b) => a + b, 0)
      expect(seen + neverShare(k)).toBeCloseTo(1, 12)
    }
  })
})

describe('sentences', () => {
  it('zero out with one unseen pair, without smoothing', () => {
    const f = factors(GUESS, 0)
    expect(f.map((x) => x.count)).toEqual([3, 2, 1, 0, 3])
    expect(f.map((x) => x.total)).toEqual([12, 3, 8, 2, 3])
    expect(sentenceChance(GUESS, 0)).toBe(0)
    expect(sentenceChance(GUESS, 1)).toBeCloseTo((4 / 23) * (3 / 14) * (2 / 19) * (1 / 13) * (4 / 14), 15)
  })

  it('score “i want mango now” 1/2 × 2/3 × 5/8 × 1/3 × 1 = 5/72 by counting', () => {
    expect(sentenceChance(SEEN_SENTENCE, 0)).toBeCloseTo(5 / 72, 15)
    expect(oneIn(sentenceChance(SEEN_SENTENCE, 0))).toBe('1 in 14')
    expect(sentenceChance(SEEN_SENTENCE, 1)).toBeCloseTo((7 / 23) * (5 / 17) * (6 / 19) * (3 / 17) * (4 / 14), 15)
  })

  it('let add-one shrink the gap between sense and nonsense', () => {
    const gap = (k: number) => sentenceChance(SEEN_SENTENCE, k) / sentenceChance(NONSENSE, k)
    expect(sentenceChance(NONSENSE, 0)).toBe(0)
    expect(gap(0.01)).toBeGreaterThan(gap(0.1))
    expect(gap(0.1)).toBeGreaterThan(gap(1))
  })

  it('in the lab are all scored', () => {
    for (const s of LAB) for (const k of [0, 1]) expect(sentenceChance(s, k)).toBeGreaterThanOrEqual(0)
  })
})

describe('a big vocabulary', () => {
  it('gives over 99% to unseen words with add-one', () => {
    expect(BIG_SHARE).toBeCloseTo(9988 / 10020, 12)
    expect(BIG_SHARE).toBeGreaterThan(0.99)
    expect(unseenShare(20, 12, 0.01, 10000)).toBeCloseTo(99.88 / 120, 12)
  })
})

describe('the story’s five visits', () => {
  it('is impossible without smoothing and possible with it', () => {
    expect(visitsChance(0)).toBe(0)
    expect(visitsChance(1)).toBeCloseTo((6 * 6 * 3 * 1 * 6) / 19 ** 5, 15)
    expect(visitsChance(0.1)).toBeGreaterThan(0)
  })
})

describe('formatting', () => {
  it('writes chances as 1 in N to two figures', () => {
    expect(oneIn(0)).toBe('0')
    expect(oneIn(1 / 14.4)).toBe('1 in 14')
    expect(oneIn(1 / 703)).toBe('1 in 700')
    expect(oneIn(1 / 11_640)).toBe('1 in 12,000')
    expect(num(5)).toBe('5')
    expect(num(5.1)).toBe('5.1')
    expect(num(1.1 + 8)).toBe('9.1')
  })
})
