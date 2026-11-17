import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  CHECK_CHANCES,
  CHECK_PERPLEXITY,
  CHECK_PLAIN_AVERAGE,
  chanceOf,
  count,
  COUNTERS,
  COUNTS,
  END,
  EVEN_COUNTERS,
  fraction,
  GUESS,
  guessPerplexity,
  HELD_OUT,
  LONG,
  LONG_CHANCES,
  LONG_ODDS,
  MODELS,
  perplexity,
  perWordChance,
  product,
  scoreOf,
  sentenceChances,
  SHORT,
  SHORT_CHANCES,
  SHORT_ODDS,
  shown,
  SMOOTHINGS,
  STORY_PERPLEXITY,
  textPerplexity,
  tokens,
  TRAINING,
  uniformChances,
  VOCABULARIES,
  VOCABULARY_SIZE,
  WORKED,
} from './model'

describe('perplexity', () => {
  it('matches hand-worked cases', () => {
    // The course's Sam sentence: 2/3 · 2/3 · 1/2 · 1/2 = 1/9 over 4 words
    expect(perplexity([2 / 3, 2 / 3, 1 / 2, 1 / 2])).toBeCloseTo(Math.pow(9, 1 / 4), 12)
    expect(perplexity([1 / 2, 1 / 4, 1 / 8])).toBeCloseTo(4, 12)
    expect(perplexity([1, 1, 1])).toBe(1)
  })

  it('is the vocabulary size for a blind model, whatever the length', () => {
    for (const v of [2, 17, 10_000]) for (const t of [1, 5, 300]) expect(perplexity(uniformChances(v, t))).toBeCloseTo(v, 6)
  })

  it('is infinite once one word gets no chance', () => {
    expect(perplexity([0.5, 0, 0.9])).toBe(Infinity)
    expect(perWordChance([0.5, 0])).toBe(0)
  })

  it('agrees with product^(−1/T) on random short texts, and survives long ones', () => {
    const random = seeded(584)
    for (let trial = 0; trial < 500; trial++) {
      const t = 1 + Math.floor(random() * 12)
      const chances = Array.from({ length: t }, () => 0.01 + 0.99 * random())
      expect(perplexity(chances)).toBeCloseTo(Math.pow(product(chances), -1 / t), 8)
      // Between the best and worst word's 1 ÷ chance
      expect(perplexity(chances)).toBeLessThanOrEqual(1 / Math.min(...chances) + 1e-9)
      expect(perplexity(chances)).toBeGreaterThanOrEqual(1 / Math.max(...chances) - 1e-9)
    }
    // 2,000 words at 1/50 each: the product underflows, the log form doesn't
    const long = uniformChances(50, 2_000)
    expect(product(long)).toBe(0)
    expect(perplexity(long)).toBeCloseTo(50, 6)
  })

  it('does not change when a text is repeated: it is per word', () => {
    const random = seeded(7)
    for (let trial = 0; trial < 100; trial++) {
      const chances = Array.from({ length: 5 }, () => 0.05 + 0.9 * random())
      expect(perplexity([...chances, ...chances, ...chances])).toBeCloseTo(perplexity(chances), 9)
    }
  })
})

describe('the story', () => {
  it('spends all eight counters on every guess, and the word that came is among them', () => {
    for (const guess of SHORT) {
      expect(guess.bets.reduce((sum, bet) => sum + bet.counters, 0)).toBe(COUNTERS)
      expect(guess.bets[0].word).toBe(guess.word)
    }
    expect(SHORT.map((g) => g.word).join(' ')).toBe('dog chased the cat')
    expect(LONG.map((g) => g.word).join(' ')).toBe('dog chased the cat out of the yard and into the street')
  })

  it('gives 1/8, 1/8, 1/2, 1/2: 1 in 256 over four words', () => {
    expect(SHORT_CHANCES).toEqual([1 / 8, 1 / 8, 1 / 2, 1 / 2])
    expect(SHORT_ODDS).toBe(256)
  })

  it('gives the 12-word sentence 1 in 16,777,216, and both the same per-word 1 in 4', () => {
    expect(LONG_ODDS).toBe(16_777_216)
    expect(LONG_ODDS).toBe(Math.pow(4, 12))
    expect(STORY_PERPLEXITY).toBe(4)
    expect(perplexity(LONG_CHANCES)).toBeCloseTo(4, 12)
    expect(EVEN_COUNTERS).toBe(2)
  })

  it('writes counters as fractions', () => {
    expect(fraction(1)).toBe('1/8')
    expect(fraction(4)).toBe('1/2')
    expect(fraction(2)).toBe('1/4')
  })
})

describe('the guess and the checks', () => {
  it('a 1-in-256 four-word sentence is a 4-way choice, not 64', () => {
    expect(guessPerplexity()).toBeCloseTo(4, 12)
    expect(GUESS.odds / GUESS.words).toBe(64)
  })

  it('works the three numbers: 4, 1 and 10,000', () => {
    expect(WORKED.map((w) => Math.round(w.perplexity))).toEqual([4, 1, 10_000])
  })

  it('a smaller vocabulary alone makes a blind model look five times better', () => {
    const [big, small] = VOCABULARIES.map((v) => perplexity(uniformChances(v, 20)))
    expect(big).toBeCloseTo(10_000, 4)
    expect(small).toBeCloseTo(2_000, 4)
  })

  it('a half, a quarter, an eighth: perplexity 4, not the plain average 4.67', () => {
    expect(CHECK_PERPLEXITY).toBeCloseTo(4, 12)
    expect(CHECK_PLAIN_AVERAGE).toBeCloseTo(14 / 3, 12)
    expect(1 / product(CHECK_CHANCES)).toBeCloseTo(64, 9)
  })
})

describe('the counted models', () => {
  it('counts the corpus by hand', () => {
    expect(TRAINING).toHaveLength(12)
    // 60 words and 12 ends
    expect(COUNTS.total).toBe(72)
    expect(VOCABULARY_SIZE).toBe(17)
    expect(COUNTS.vocabulary).toContain(END)
    expect(COUNTS.words.get('the')).toBe(18)
    expect(COUNTS.words.get(END)).toBe(12)
    // "the" comes before another word 18 times; "dog" follows it 4 times
    expect(COUNTS.before.get('the')).toBe(18)
    expect(COUNTS.pairs.get('the dog')).toBe(4)
    expect(chanceOf(COUNTS, 'Bigram', 'None', 'the', 'dog')).toBeCloseTo(4 / 18, 12)
    expect(chanceOf(COUNTS, 'Bigram', 'Add-one', 'the', 'dog')).toBeCloseTo(5 / 35, 12)
    expect(chanceOf(COUNTS, 'Unigram', 'None', 'x', 'the')).toBeCloseTo(18 / 72, 12)
  })

  it('every held-out word is in the vocabulary', () => {
    for (const sentence of HELD_OUT) for (const word of tokens(sentence)) expect(COUNTS.vocabulary).toContain(word)
  })

  it('gives each model a proper distribution over the vocabulary after every word', () => {
    for (const model of MODELS)
      for (const smoothing of SMOOTHINGS)
        for (const previous of ['<s>', ...COUNTS.vocabulary.filter((w) => w !== END)]) {
          const sum = COUNTS.vocabulary.reduce((s, word) => s + chanceOf(COUNTS, model, smoothing, previous, word), 0)
          expect(sum).toBeCloseTo(1, 10)
        }
  })

  it('a blind model scores the vocabulary size everywhere', () => {
    for (let i = 0; i < HELD_OUT.length; i++) expect(scoreOf('Blind', 'None', i).sentence).toBeCloseTo(17, 9)
    expect(textPerplexity(COUNTS, 'Blind', 'None', TRAINING)).toBeCloseTo(17, 9)
  })

  it('the bigram beats the unigram on held-out text, and goes infinite on an unseen pair without smoothing', () => {
    const unigram = scoreOf('Unigram', 'Add-one', 0).heldOut
    const bigram = scoreOf('Bigram', 'Add-one', 0).heldOut
    expect(bigram).toBeLessThan(unigram)
    expect(shown(unigram)).toBe('11')
    expect(shown(bigram)).toBe('8.1')
    expect(scoreOf('Bigram', 'None', 2).sentence).toBe(Infinity)
    expect(sentenceChances(COUNTS, 'Bigram', 'None', HELD_OUT[2])[2]).toBe(0)
    expect(shown(scoreOf('Bigram', 'None', 0).sentence)).toBe('3.4')
  })

  it('training text flatters the bigram', () => {
    for (const smoothing of SMOOTHINGS) {
      const score = scoreOf('Bigram', smoothing, 0)
      expect(score.training).toBeLessThan(score.heldOut)
    }
    expect(shown(scoreOf('Bigram', 'None', 0).training)).toBe('2.7')
  })

  it('agrees with a brute-force count on random corpora', () => {
    const random = seeded(42)
    const words = ['a', 'b', 'c', 'd']
    for (let trial = 0; trial < 50; trial++) {
      const corpus = Array.from({ length: 6 }, () =>
        Array.from({ length: 1 + Math.floor(random() * 4) }, () => words[Math.floor(random() * words.length)]).join(' '),
      )
      const counts = count(corpus)
      const all = corpus.flatMap((s) => {
        const t = ['<s>', ...tokens(s)]
        return t.slice(1).map((w, i) => [t[i], w] as const)
      })
      for (const [previous, word] of all) {
        const pair = all.filter(([p, w]) => p === previous && w === word).length
        const before = all.filter(([p]) => p === previous).length
        expect(chanceOf(counts, 'Bigram', 'None', previous, word)).toBeCloseTo(pair / before, 12)
        expect(chanceOf(counts, 'Unigram', 'None', previous, word)).toBeCloseTo(
          all.filter(([, w]) => w === word).length / all.length,
          12,
        )
      }
    }
  })
})

describe('numbers as shown', () => {
  it('rounds by size', () => {
    expect(shown(Infinity)).toBe('∞')
    expect(shown(3.44)).toBe('3.4')
    expect(shown(11.2)).toBe('11')
    expect(shown(10_000)).toBe('10,000')
  })
})
