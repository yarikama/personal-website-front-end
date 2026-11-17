import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  ASKER,
  attend,
  BACKWARD,
  BIT,
  clarity,
  FORWARD,
  input,
  LOOK,
  MASKED_BIT_DOG,
  MASKED_FIRST,
  NEAR,
  PLACED_BIT,
  PLAIN_BIT,
  position,
  Q,
  sameInOtherOrder,
  SELF_WEIGHT,
  softmax,
  TABLE,
  times,
  TURN,
  VOCAB,
  WORKED,
  type Word,
} from './model'

const e = Math.E

describe('softmax', () => {
  it('turns scores into weights that add up to 1', () => {
    expect(softmax([0, Math.log(3)])).toEqual([0.25, 0.75].map((w) => expect.closeTo(w, 12)))
    expect(softmax([5, 5, 5, 5]).every((w) => Math.abs(w - 0.25) < 1e-12)).toBe(true)
  })

  it('gives a masked score a weight of exactly 0', () => {
    expect(softmax([1, -Infinity, 1])).toEqual([0.5, 0, 0.5])
  })
})

describe('the five friends', () => {
  it('Dee listens most to the tags about cost: 38%, 38%, 14%, 5%, 5%', () => {
    // Her question against the tags scores 2, 2, 1, 0, 0
    const total = 2 * e ** 2 + e + 2
    const want = [e ** 2, e ** 2, e, 1, 1].map((x) => x / total)
    TABLE[ASKER].forEach((w, j) => expect(w).toBeCloseTo(want[j], 12))
    expect(TABLE[ASKER].map((w) => Math.round(100 * w))).toEqual([38, 38, 14, 5, 5])
  })

  it('each friend’s listening adds up to all of it', () => {
    for (const row of TABLE) expect(row.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12)
  })

  it('Ana’s line, copied four times down the row, keeps a sixteenth', () => {
    expect(clarity(4)).toBe(1 / 16)
  })
})

describe('positions', () => {
  it('a query’s place points at the word just before it', () => {
    for (let i = 1; i <= 6; i++) {
      const q = times(Q, [0, 0, 0, 0, 0, 0, ...position(i)])
      const before = position(i - 1)
      expect(q[2]).toBeCloseTo(NEAR * before[0], 12)
      expect(q[3]).toBeCloseTo(NEAR * before[1], 12)
    }
  })

  it('off, they leave a word’s vector as it was', () => {
    expect(input(FORWARD, 3, false).slice(6)).toEqual([0, 0])
  })
})

describe('“bit” in “the dog bit the man”', () => {
  it('without positions, scores dog and man 2 each and the rest 0', () => {
    expect(WORKED.map((w) => w.score)).toEqual([LOOK, LOOK, 0])
    const total = 2 * e ** 2 + 3
    expect(WORKED[0].weight).toBeCloseTo(e ** 2 / total, 12)
    expect(WORKED[2].weight).toBeCloseTo(1 / total, 12)
    expect(WORKED.map((w) => Math.round(100 * w.weight))).toEqual([42, 42, 6])
  })

  it('its new vector holds as much dog as man', () => {
    // the, dog, man, bit: two "the"s at 6% each, dog and man at 42%
    expect(PLAIN_BIT[1]).toBeCloseTo(PLAIN_BIT[2], 12)
    expect(PLAIN_BIT[0]).toBeCloseTo(2 * WORKED[2].weight, 12)
    expect(PLAIN_BIT.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12)
  })

  it('with positions, dog just before it gains 1.5 and man three places on loses 1.06', () => {
    expect(PLACED_BIT.dog.score).toBeCloseTo(LOOK + NEAR, 12)
    expect(PLACED_BIT.man.score).toBeCloseTo(LOOK + NEAR * Math.cos(3 * TURN), 12)
    expect(Math.round(100 * PLACED_BIT.dog.weight)).toBe(78)
    expect(Math.round(100 * PLACED_BIT.man.weight)).toBe(6)
  })

  it('with the mask, the first word sees only itself, and bit puts 85% on dog', () => {
    expect(MASKED_FIRST).toBe(1)
    // bit sees the, dog and itself, scoring NEAR cos(TURN), LOOK + NEAR, NEAR cos(TURN)
    const side = Math.exp(NEAR * Math.cos(TURN))
    const dog = Math.exp(LOOK + NEAR)
    expect(MASKED_BIT_DOG).toBeCloseTo(dog / (dog + 2 * side), 12)
    expect(Math.round(100 * MASKED_BIT_DOG)).toBe(85)
  })

  it('with no matrices at all, it puts 65% on itself', () => {
    // bit · bit = 2; bit shares nothing with the other four
    expect(SELF_WEIGHT).toBeCloseTo(e ** 2 / (e ** 2 + 4), 12)
    expect(Math.round(100 * SELF_WEIGHT)).toBe(65)
  })
})

describe('swapping dog and man', () => {
  it('without positions, changes no word’s new vector', () => {
    for (let i = 0; i < 5; i++) {
      expect(sameInOtherOrder('dog bit man', { positions: false, mask: false }, i)).toBe(true)
    }
  })

  it('with positions, changes what bit hears', () => {
    expect(sameInOtherOrder('dog bit man', { positions: true, mask: false }, BIT)).toBe(false)
    const forward = attend(FORWARD, { positions: true, mask: false }).outputs[BIT]
    const backward = attend(BACKWARD, { positions: true, mask: false }).outputs[BIT]
    expect(forward[1]).toBeGreaterThan(forward[2])
    expect(backward[2]).toBeGreaterThan(backward[1])
  })
})

// Random sentences from the four words, from a fixed seed
function sentences(seed: number, count: number): Word[][] {
  const random = seeded(seed)
  return Array.from({ length: count }, () => {
    const length = 2 + Math.floor(random() * 6)
    return Array.from({ length }, () => VOCAB[Math.floor(random() * VOCAB.length)])
  })
}

describe('on 300 random sentences', () => {
  it('without positions, shuffling the words shuffles the new vectors the same way', () => {
    const random = seeded(7)
    for (const words of sentences(1, 300)) {
      // A random order: order[k] is where the k-th word of the shuffle came from
      const order = words.map((_, i) => i)
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1))
        ;[order[i], order[j]] = [order[j], order[i]]
      }
      const shuffled = order.map((i) => words[i])
      const before = attend(words, { positions: false, mask: false }).outputs
      const after = attend(shuffled, { positions: false, mask: false }).outputs
      order.forEach((from, k) => after[k].forEach((x, d) => expect(x).toBeCloseTo(before[from][d], 12)))
    }
  })

  it('with the mask, each word gets what it would from the words up to it alone', () => {
    // The reference: run each prefix on its own, unmasked, and read its last word
    for (const words of sentences(2, 300)) {
      for (const positions of [false, true]) {
        const masked = attend(words, { positions, mask: true })
        words.forEach((_, i) => {
          const prefix = attend(words.slice(0, i + 1), { positions, mask: false })
          prefix.outputs[i].forEach((x, d) => expect(masked.outputs[i][d]).toBeCloseTo(x, 12))
          masked.weights[i].slice(i + 1).forEach((w) => expect(w).toBe(0))
        })
      }
    }
  })

  it('every word’s weights add up to 1, and its new vector is their blend of the values', () => {
    for (const words of sentences(3, 300)) {
      const { weights, values, outputs } = attend(words, { positions: true, mask: false })
      weights.forEach((row, i) => {
        expect(row.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12)
        let blend = [0, 0, 0, 0]
        row.forEach((w, j) => (blend = blend.map((x, d) => x + w * values[j][d])))
        blend.forEach((x, d) => expect(outputs[i][d]).toBeCloseTo(x, 12))
      })
    }
  })
})
