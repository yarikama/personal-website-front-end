import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  bleu,
  brevityPenalty,
  CHECK_BEST,
  CHECK_OUTPUTS,
  CHECK_SCORES,
  closestLength,
  corpusBleu,
  geometricMean,
  GUESS_KEY,
  GUESS_OPTIONS,
  labScore,
  LAB_PRESETS,
  MARKED,
  naiveShare,
  ngrams,
  share,
  SKIP,
  SKIP_AFTER,
  SKIP_BP,
  tokens,
  WORKED,
} from './model'

const t = tokens

describe('n-gram precision', () => {
  it('splits text into words and runs', () => {
    expect(t('The cat, sat.')).toEqual(['the', 'cat', 'sat'])
    expect(ngrams(t('a b c d'), 2)).toEqual(['a b', 'b c', 'c d'])
    expect(ngrams(t('a b'), 3)).toEqual([])
  })

  it('clips the paper’s repeated “the”', () => {
    // Papineni et al., Example 2: 2/7 clipped, 7/7 without
    const candidate = t('the the the the the the the')
    const refs = [t('The cat is on the mat.'), t('There is a cat on the mat.')]
    expect(share(candidate, refs, 1)).toMatchObject({ matched: 2, total: 7 })
    expect(share(candidate, refs, 1, false)).toMatchObject({ matched: 7, total: 7 })
  })

  it('gives the paper’s short “of the” perfect precisions', () => {
    // Example 3: 2/2 and 1/1 against three long references
    const refs = [
      t('It is a guide to action that ensures that the military will forever heed Party commands.'),
      t('It is the guiding principle which guarantees the military forces always being under the command of the Party.'),
      t('It is the practical guide for the army always to heed the directions of the party.'),
    ]
    expect(share(t('of the'), refs, 1)).toMatchObject({ matched: 2, total: 2 })
    expect(share(t('of the'), refs, 2)).toMatchObject({ matched: 1, total: 1 })
  })

  it('works the course’s trustworthy pair by hand', () => {
    const s = bleu(t('to make people trustworthy you need to trust them'), [
      t('the way to make people trustworthy is to trust them'),
    ])
    expect(s.shares.map((x) => [x.matched, x.total])).toEqual([
      [7, 9],
      [5, 8],
      [3, 7],
      [1, 6],
    ])
    expect(s.bp).toBeCloseTo(Math.exp(1 - 10 / 9), 12)
    expect(s.mean).toBeCloseTo(Math.pow((7 / 9) * (5 / 8) * (3 / 7) * (1 / 6), 1 / 4), 12)
    expect(s.bleu).toBeCloseTo(0.386, 3)
  })
})

describe('the brevity penalty', () => {
  it('is 1 when longer, and e^(1 − r/c) otherwise', () => {
    expect(brevityPenalty(7, 6)).toBe(1)
    expect(brevityPenalty(6, 6)).toBe(1)
    expect(brevityPenalty(3, 6)).toBeCloseTo(Math.exp(-1), 12)
    expect(brevityPenalty(0, 6)).toBe(0)
  })

  it('compares with the closest reference length', () => {
    // The paper's example: references of 12, 15 and 17 words, a 12-word candidate
    expect(closestLength(12, [15, 12, 17])).toBe(12)
    expect(closestLength(14, [12, 16])).toBe(12)
    expect(closestLength(16, [12, 15, 17])).toBe(15)
  })
})

describe('the geometric mean', () => {
  it('is the Nth root of the product, and 0 with any zero', () => {
    expect(geometricMean([1 / 2, 1 / 8])).toBeCloseTo(1 / 4, 12)
    expect(geometricMean([1, 0.5, 0])).toBe(0)
  })
})

// A brute-force referee: credit a run while an unused copy is left in the
// reference that has the most of it, taking copies out of a list one by one
function bruteMatched(candidate: string[], references: string[][], n: number) {
  let best = 0
  const grams = ngrams(candidate, n)
  const distinct = [...new Set(grams)]
  for (const gram of distinct) {
    const inCandidate = grams.filter((g) => g === gram).length
    let most = 0
    for (const ref of references) {
      const pool = ngrams(ref, n)
      let taken = 0
      for (let k = 0; k < inCandidate; k++) {
        const at = pool.indexOf(gram)
        if (at < 0) break
        pool.splice(at, 1)
        taken++
      }
      most = Math.max(most, taken)
    }
    best += most
  }
  return best
}

describe('on random sentences', () => {
  const VOCAB = ['the', 'a', 'cat', 'dog', 'sat', 'on', 'mat', 'rug']
  const sentence = (random: () => number, length: number) =>
    Array.from({ length }, () => VOCAB[Math.floor(random() * VOCAB.length)])

  it('clips exactly as the brute-force referee does', () => {
    const random = seeded(584)
    for (let trial = 0; trial < 400; trial++) {
      const candidate = sentence(random, 1 + Math.floor(random() * 10))
      const refs = Array.from({ length: 1 + Math.floor(random() * 3) }, () => sentence(random, 1 + Math.floor(random() * 10)))
      for (let n = 1; n <= 4; n++) {
        const s = share(candidate, refs, n)
        expect(s.matched).toBe(bruteMatched(candidate, refs, n))
        expect(s.total).toBe(Math.max(0, candidate.length - n + 1))
      }
    }
  })

  it('stays in [0, 1], gives a copy 1, and matches the log form', () => {
    const random = seeded(2002)
    for (let trial = 0; trial < 300; trial++) {
      const candidate = sentence(random, 1 + Math.floor(random() * 12))
      const reference = sentence(random, 1 + Math.floor(random() * 12))
      const s = bleu(candidate, [reference])
      expect(s.bleu).toBeGreaterThanOrEqual(0)
      expect(s.bleu).toBeLessThanOrEqual(1)
      if (s.precisions.every((p) => p > 0)) {
        const logForm = s.bp * Math.exp(s.precisions.reduce((sum, p) => sum + Math.log(p) / 4, 0))
        expect(s.bleu).toBeCloseTo(logForm, 12)
      }
      if (reference.length >= 4) expect(bleu(reference, [reference]).bleu).toBeCloseTo(1, 12)
      // One sentence as a corpus is that sentence
      expect(corpusBleu([{ candidate, references: [reference] }]).bleu).toBeCloseTo(s.bleu, 12)
    }
  })
})

describe('the page’s numbers', () => {
  it('the guess: all three options get 100% with no rules', () => {
    for (const o of GUESS_OPTIONS) {
      const s = naiveShare(o, GUESS_KEY)
      expect(s.matched).toBe(s.total)
    }
  })

  it('the story', () => {
    expect([MARKED[0].words.matched, MARKED[0].words.total]).toEqual([5, 6])
    expect([MARKED[1].words.matched, MARKED[1].words.total]).toEqual([6, 6])
    expect([MARKED[2].words.matched, MARKED[2].words.total]).toEqual([2, 6])
    expect([MARKED[3].words.matched, MARKED[3].pairs.matched, MARKED[3].pairs.total]).toEqual([6, 0, 5])
    expect([MARKED[4].words.matched, MARKED[4].pairs.matched]).toEqual([3, 2])
    expect(MARKED[5].bp).toBeCloseTo(Math.exp(-1), 12)
    // Clipped links never use a key word twice
    for (const m of MARKED.filter((_, i) => i !== 1)) {
      const used = m.links.filter((j) => j >= 0)
      expect(new Set(used).size).toBe(used.length)
    }
  })

  it('the worked numbers', () => {
    const [a, b, c] = WORKED.map((w) => w.score)
    expect(a.mean).toBeCloseTo(Math.pow(1 / 3, 1 / 4), 12)
    expect(a.bleu).toBeCloseTo(0.76, 2)
    expect(b.bleu).toBeCloseTo(Math.exp(1 - 6 / 5), 12)
    expect(b.bleu).toBeGreaterThan(a.bleu)
    expect(c.precisions[3]).toBe(0)
    expect(c.bleu).toBe(0)
  })

  it('the lab: a second reference lifts the synonym past the wrong word', () => {
    const [synonym, wrong] = LAB_PRESETS.map((p) => p.text)
    expect(labScore(synonym, 1).bleu).toBeGreaterThan(labScore(wrong, 1).bleu)
    expect(labScore(synonym, 2).bleu).toBeGreaterThan(labScore(synonym, 1).bleu + 0.1)
    expect(labScore(wrong, 2).bleu).toBeCloseTo(labScore(wrong, 1).bleu, 12)
  })

  it('the quick check: the wrong place scores highest, the paraphrase lowest', () => {
    expect(CHECK_OUTPUTS[CHECK_BEST]).toContain('chair')
    const order = CHECK_SCORES.map((s) => s.bleu)
    expect(Math.min(...order)).toBe(order[0])
    expect(CHECK_SCORES[CHECK_BEST].shares[0]).toMatchObject({ matched: 7, total: 8 })
  })

  it('check yourself: skipping words lowers BLEU', () => {
    expect(SKIP_BP).toBeCloseTo(Math.exp(-0.25), 12)
    expect(SKIP_AFTER).toBeCloseTo(0.36, 2)
    expect(SKIP_AFTER).toBeLessThan(SKIP.before)
  })
})
