import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  BAD_NOT_GOOD,
  CARDS,
  chanceOf,
  countsOf,
  fit,
  GOOD_NOT_BAD,
  gradientOf,
  LABELS,
  LEARNED,
  LEARNED_VERDICTS,
  LIST_SCORES,
  LIST_VERDICTS,
  lossOf,
  MOST_UNHAPPY,
  NOT_COLD_CHANCE,
  NOT_COLD_LIST,
  ORDER_CHANCE,
  ORDER_LIST_SCORE,
  PAIRS,
  pct,
  ROWS,
  sameRow,
  scoreOf,
  sigmoid,
  signed,
  tally,
  termsOf,
  tokens,
  unknownWords,
  VOCABULARY,
  weightOf,
  type Model,
} from './model'

describe('turning a card into words', () => {
  it('lowercases and drops punctuation', () => {
    expect(tokens('Good coffee, good cake!')).toEqual(['good', 'coffee', 'good', 'cake'])
    expect(tokens('  ')).toEqual([])
  })

  it('lists every word once, in the order it first appears', () => {
    expect(VOCABULARY).toEqual([
      'great',
      'coffee',
      'good',
      'cake',
      'will',
      'come',
      'back',
      'kind',
      'staff',
      'cold',
      'not',
      'rude',
      'bad',
    ])
  })
})

describe('a card’s row of counts', () => {
  it('counts each vocabulary word, as worked by hand', () => {
    const row = countsOf('Good coffee, good cake!')
    expect(row[VOCABULARY.indexOf('good')]).toBe(2)
    expect(row[VOCABULARY.indexOf('coffee')]).toBe(1)
    expect(row[VOCABULARY.indexOf('cake')]).toBe(1)
    expect(row.reduce((a, b) => a + b, 0)).toBe(4)
  })

  it('drops words outside the vocabulary', () => {
    expect(countsOf('Lovely cake, kind staff.').reduce((a, b) => a + b, 0)).toBe(3)
    expect(unknownWords('Lovely cake, kind staff.')).toEqual(['lovely'])
  })

  it('is the same for any order of the same words', () => {
    const random = seeded(1)
    for (let n = 0; n < 300; n++) {
      // A random card from the vocabulary and a few unknown words
      const pool = [...VOCABULARY, 'the', 'lovely', 'was']
      const words = Array.from({ length: 1 + Math.floor(random() * 8) }, () => pool[Math.floor(random() * pool.length)])
      const shuffled = [...words].sort(() => random() - 0.5)
      expect(countsOf(shuffled.join(' '))).toEqual(countsOf(words.join(' ')))
      // Against counting by brute force
      expect(countsOf(words.join(' '))).toEqual(VOCABULARY.map((v) => words.filter((w) => w === v).length))
    }
  })
})

describe('the word list', () => {
  it('scores each card as worked by hand', () => {
    expect(LIST_SCORES).toEqual([1, 1, 2, 0, 1, -1, 1, -1, -2, 0])
  })

  it('gets 7 right, 1 wrong and 2 ties, as the story says', () => {
    expect(tally(LIST_VERDICTS, 'right')).toBe(7)
    expect(tally(LIST_VERDICTS, 'wrong')).toBe(1)
    expect(tally(LIST_VERDICTS, 'tie')).toBe(2)
    expect(LIST_VERDICTS[6]).toBe('wrong')
  })
})

describe('logistic regression on the counts', () => {
  it('stops where the slope is flat', () => {
    const g = gradientOf(LEARNED, ROWS, LABELS)
    expect(Math.hypot(g.bias, ...g.weights)).toBeLessThan(1e-8)
  })

  it('has the slope of its loss, by finite differences', () => {
    const random = seeded(2)
    for (let n = 0; n < 20; n++) {
      const model: Model = { weights: VOCABULARY.map(() => random() * 4 - 2), bias: random() - 0.5 }
      const g = gradientOf(model, ROWS, LABELS)
      const h = 1e-6
      const i = Math.floor(random() * VOCABULARY.length)
      const up = { ...model, weights: model.weights.map((w, j) => (j === i ? w + h : w)) }
      const down = { ...model, weights: model.weights.map((w, j) => (j === i ? w - h : w)) }
      expect((lossOf(up, ROWS, LABELS) - lossOf(down, ROWS, LABELS)) / (2 * h)).toBeCloseTo(g.weights[i], 5)
    }
  })

  it('beats every nearby model on its loss', () => {
    const random = seeded(3)
    const best = lossOf(LEARNED, ROWS, LABELS)
    for (let n = 0; n < 500; n++) {
      const nudged: Model = {
        weights: LEARNED.weights.map((w) => w + (random() - 0.5) * 0.4),
        bias: LEARNED.bias + (random() - 0.5) * 0.4,
      }
      expect(lossOf(nudged, ROWS, LABELS)).toBeGreaterThan(best)
    }
  })

  it('gets all ten cards right, with “not” the unhappiest word', () => {
    expect(tally(LEARNED_VERDICTS, 'right')).toBe(10)
    expect(MOST_UNHAPPY).toBe('not')
    expect(signed(weightOf('not'), 2)).toBe('−2.30')
    expect(signed(weightOf('back'), 2)).toBe('+0.26')
  })

  it('weighs words with no lean either way near zero', () => {
    for (const word of ['coffee', 'cake', 'staff']) expect(Math.abs(weightOf(word))).toBeLessThan(0.15)
  })

  it('grows without end with no penalty, as the page says', () => {
    const loose = fit(ROWS, LABELS, 0, 1e-10, 20_000)
    const looser = fit(ROWS, LABELS, 0, 1e-10, 40_000)
    expect(Math.abs(looser.weights[VOCABULARY.indexOf('not')])).toBeGreaterThan(
      Math.abs(loose.weights[VOCABULARY.indexOf('not')])
    )
  })
})

describe('the clip’s numbers', () => {
  it('match the learned weights for “Good coffee, good cake!”', () => {
    const terms = termsOf(LEARNED, 'Good coffee, good cake!')
    expect(LEARNED.bias.toFixed(2)).toBe('0.21')
    expect(terms.map((t) => [t.word, t.count, t.weight.toFixed(2)])).toEqual([
      ['coffee', 1, '-0.10'],
      ['good', 2, '1.03'],
      ['cake', 1, '-0.06'],
    ])
    const z = scoreOf(LEARNED.weights, LEARNED.bias, countsOf('Good coffee, good cake!'))
    expect(z.toFixed(2)).toBe('2.11')
    expect(sigmoid(z).toFixed(2)).toBe('0.89')
    // Rounded terms add up to the rounded total
    expect((0.21 + 1.03 * 2 - 0.1 - 0.06).toFixed(2)).toBe('2.11')
  })
})

describe('word order', () => {
  it('gives the two new cards one row and one chance', () => {
    expect(countsOf(GOOD_NOT_BAD.text)).toEqual(countsOf(BAD_NOT_GOOD.text))
    expect(chanceOf(LEARNED, countsOf(GOOD_NOT_BAD.text))).toBe(chanceOf(LEARNED, countsOf(BAD_NOT_GOOD.text)))
    expect(pct(ORDER_CHANCE)).toBe('10%')
    expect(ORDER_LIST_SCORE).toBe(0)
  })

  it('fools both sorters on the quick check’s card', () => {
    expect(NOT_COLD_LIST).toBe(-2)
    expect(NOT_COLD_CHANCE).toBeLessThan(0.5)
    expect((NOT_COLD_CHANCE * 100).toFixed(1)).toBe('0.1')
  })

  it('leaves exactly one pair in Check yourself with two different rows', () => {
    expect(PAIRS.map(([a, b]) => sameRow(a, b))).toEqual([true, true, false, true])
  })
})

describe('the sigmoid', () => {
  it('is 1/2 at 0 and stays finite far out', () => {
    expect(sigmoid(0)).toBe(0.5)
    expect(sigmoid(800)).toBe(1)
    expect(sigmoid(-800)).toBe(0)
    expect(sigmoid(2) + sigmoid(-2)).toBeCloseTo(1, 12)
  })
})

describe('the cards', () => {
  it('are half happy', () => {
    expect(CARDS.filter((c) => c.happy)).toHaveLength(5)
  })
})
