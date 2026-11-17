import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  BANK,
  BANK_COSINE,
  BLANK_SHARE,
  BLANKS,
  CARD_AT,
  CHECK_T5,
  choose,
  CLIP_LOSS,
  contextual,
  cosine,
  GAMES,
  LAB_RATES,
  masked,
  maskedFrom,
  MASK,
  nextWord,
  picked,
  play,
  SENTENCES,
  spanPlaces,
  spans,
  spansFrom,
  split,
  STORY,
  STORY_MASKED,
  STORY_T5,
  SWAP,
  text,
  TRADE,
  treat,
  VECTORS,
  VOCAB,
  weights,
  WRONG_SHARE,
} from './model'

describe('the story', () => {
  it('stops the card at bank, with the clue river after it', () => {
    expect(STORY[CARD_AT]).toBe('bank')
    expect(STORY.indexOf('river')).toBeGreaterThan(CARD_AT)
  })

  it('blanks bank and boats, about one word in seven', () => {
    expect(BLANKS.map((i) => STORY[i])).toEqual(['bank', 'boats'])
    expect(Math.round(1 / BLANK_SHARE)).toBe(7)
    expect(STORY[SWAP.at]).toBe('boats')
    expect(text(STORY_MASKED.input)).toBe('we sat on the [MASK] of the river and watched the [MASK] go by')
  })

  it('tags bank of and boats, and writes them back', () => {
    expect(text(STORY_T5.input)).toBe('we sat on the <X> the river and watched the <Y> go by')
    expect(text(STORY_T5.output)).toBe('<X> bank of <Y> boats <Z>')
    expect(STORY_T5.guesses).toBe(3)
  })
})

describe('next word', () => {
  it('guesses every word and the end, each from what is before it', () => {
    const g = nextWord(['a', 'b', 'c'])
    expect(text(g.input)).toBe('<s> a b c')
    expect(text(g.output)).toBe('a b c </s>')
    expect(g.guesses).toBe(4)
    expect(g.sees).toBe('left')
    // Output i is input i + 1: the answer at each place is the next input
    for (let i = 0; i < 3; i++) expect(g.output[i].text).toBe(g.input[i + 1].text)
  })
})

describe('masked words', () => {
  it('picks 15% of the places, at least one', () => {
    expect(picked(14, 0.15)).toBe(2)
    expect(picked(4, 0.15)).toBe(1)
    expect(picked(512, 0.15)).toBe(77)
  })

  it('builds the input by hand', () => {
    const g = maskedFrom(['a', 'b', 'c', 'd'], [1, 2, 3], ['blank', 'swap', 'kept'], ['', 'z', ''])
    expect(text(g.input)).toBe(`a ${MASK} z d`)
    expect(text(g.output)).toBe('b c d')
    expect(g.guesses).toBe(3)
    // a and the kept d are as written
    expect(g.intact).toBe(2)
  })

  it('splits chosen words 80/10/10, over many draws', () => {
    const random = seeded(7)
    const counts = { blank: 0, swap: 0, kept: 0 }
    const n = 20000
    for (let i = 0; i < n; i++) counts[treat(random)]++
    expect(counts.blank / n).toBeCloseTo(0.8, 1)
    expect(counts.swap / n).toBeCloseTo(0.1, 1)
    expect(counts.kept / n).toBeCloseTo(0.1, 1)
    expect(WRONG_SHARE).toBeCloseTo(0.015, 10)
  })

  it('chooses each place equally often', () => {
    const random = seeded(3)
    const hits = Array(10).fill(0)
    const runs = 10000
    for (let r = 0; r < runs; r++) for (const i of choose(10, 3, random)) hits[i]++
    for (const h of hits) expect(h / runs).toBeCloseTo(0.3, 1)
  })

  it('never swaps a word for itself, and keeps the sentence length', () => {
    const random = seeded(11)
    for (let r = 0; r < 300; r++) {
      const sentence = SENTENCES[r % 3]
      const rate = LAB_RATES[r % LAB_RATES.length]
      const g = masked(sentence, rate, random)
      expect(g.input).toHaveLength(sentence.length)
      expect(g.guesses).toBe(picked(sentence.length, rate))
      g.input.forEach((t, i) => {
        if (t.kind === 'swap') {
          expect(t.text).not.toBe(sentence[i])
          expect(VOCAB).toContain(t.text)
        }
        if (t.kind === 'word' || t.kind === 'kept') expect(t.text).toBe(sentence[i])
      })
    }
  })
})

describe('spans', () => {
  it('splits a total into positive parts', () => {
    const random = seeded(5)
    for (let r = 0; r < 300; r++) {
      const total = 2 + Math.floor(random() * 10)
      const parts = 1 + Math.floor(random() * total)
      const s = split(total, parts, random)
      expect(s).toHaveLength(parts)
      expect(s.reduce((a, b) => a + b, 0)).toBe(total)
      for (const x of s) expect(x).toBeGreaterThanOrEqual(1)
    }
  })

  it('places spans that drop the right number of words, apart, inside the sentence', () => {
    const random = seeded(9)
    for (let r = 0; r < 500; r++) {
      const n = 8 + Math.floor(random() * 10)
      const rate = LAB_RATES[r % LAB_RATES.length]
      const places = spanPlaces(n, rate, random)
      const dropped = places.reduce((sum, [a, b]) => sum + b - a + 1, 0)
      expect(dropped).toBe(picked(n, rate))
      expect(places[0][0]).toBeGreaterThanOrEqual(0)
      expect(places.at(-1)![1]).toBeLessThan(n)
      // A kept word between any two spans, or they would be one
      for (let s = 1; s < places.length; s++) expect(places[s][0]).toBeGreaterThan(places[s - 1][1] + 1)
    }
  })

  it('lets a span fall at the start, the middle or the end', () => {
    const random = seeded(2)
    const firsts = new Set<number>()
    for (let r = 0; r < 400; r++) firsts.add(spanPlaces(12, 0.15, random)[0][0])
    expect(firsts.has(0)).toBe(true)
    expect(firsts.has(10)).toBe(true)
    expect(firsts.size).toBeGreaterThan(6)
  })

  it('rebuilds the sentence from what the encoder reads and what the decoder writes', () => {
    const random = seeded(13)
    for (let r = 0; r < 300; r++) {
      const sentence = SENTENCES[r % 3]
      const g = spans(sentence, LAB_RATES[r % LAB_RATES.length], random)
      // Put each sentinel's words back in its place
      const filled: string[] = []
      for (const t of g.input) {
        if (t.kind !== 'tag') {
          filled.push(t.text)
          continue
        }
        const at = g.output.findIndex((o) => o.text === t.text)
        for (let j = at + 1; j < g.output.length && g.output[j].kind !== 'tag'; j++) filled.push(g.output[j].text)
      }
      expect(filled).toEqual(sentence)
      expect(g.output.at(-1)!.kind).toBe('tag')
    }
  })

  it('answers the last check', () => {
    expect(text(CHECK_T5.input)).toBe('my sister <X> for the whole street on <Y>')
    expect(text(CHECK_T5.output)).toBe('<X> baked bread <Y> sunday <Z>')
    expect(text(spansFrom(['a', 'b', 'c'], [[0, 2]]).output)).toBe('<X> a b c <Y>')
  })
})

describe('the lab', () => {
  it('draws the same game for the same seed', () => {
    for (const game of GAMES) expect(play(game, STORY, 0.3, 4)).toEqual(play(game, STORY, 0.3, 4))
  })
})

describe('the loss and the trade', () => {
  it('adds the surprise at each blank', () => {
    expect(CLIP_LOSS).toBeCloseTo(-Math.log(0.4) - Math.log(0.2), 10)
    expect(CLIP_LOSS.toFixed(2)).toBe('2.53')
  })

  it('counts guesses and clues in a 512-word sequence', () => {
    expect(TRADE.map((t) => [t.guesses, t.clues])).toEqual([
      [26, 486],
      [77, 435],
      [256, 256],
    ])
  })
})

describe('static and contextual vectors', () => {
  it('has a vector for every word of the two bank sentences', () => {
    for (const w of [...SENTENCES[0], ...SENTENCES[1]]) expect(VECTORS[w], w).toBeDefined()
  })

  it('weights a sentence like a softmax: positive, summing to 1, most on the likest words', () => {
    const w = weights(SENTENCES[0], SENTENCES[0].indexOf('bank'))
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10)
    for (const x of w) expect(x).toBeGreaterThan(0)
    const the = w[SENTENCES[0].indexOf('the')]
    expect(w[SENTENCES[0].indexOf('river')]).toBeGreaterThan(the)
  })

  it('moves bank toward water by the river and toward money at the bank', () => {
    expect(BANK.river[1] / BANK.river[0]).toBeGreaterThan(1)
    expect(BANK.money[0] / BANK.money[1]).toBeGreaterThan(1)
    expect(BANK_COSINE).toBeLessThan(0.9)
    expect(BANK_COSINE.toFixed(2)).toBe('0.81')
  })

  it('leaves a word alone when no sharpness and the sentence is only itself', () => {
    expect(contextual(['bank'], 0)).toEqual(VECTORS.bank)
    // With no sharpness, a plain average of the sentence
    const avg = contextual(['river', 'money'], 0, 0)
    expect(avg[0]).toBeCloseTo((VECTORS.river[0] + VECTORS.money[0]) / 2, 10)
    expect(cosine([1, 0], [0, 1])).toBeCloseTo(0, 10)
  })
})
