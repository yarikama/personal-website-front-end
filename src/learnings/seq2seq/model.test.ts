import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  best,
  CARD,
  CHANCES,
  CHECK,
  checkTrip,
  encode,
  INPUTS,
  LEARNING,
  LEARNING_STEP,
  learningCost,
  LONG,
  LONG_CARDS,
  LONG_FIRST_TRIP,
  loss,
  PAPER,
  rightChances,
  sentenceChance,
  SHORT_CARDS,
  SOURCE,
  TARGET,
  top,
  trip,
  trips,
  tripSummary,
  VOCAB,
  WORKED,
} from './model'

describe('the story decoder', () => {
  it('gives every word a chance at every step, summing to 1', () => {
    for (const table of [...CHANCES, LEARNING]) {
      expect(Object.keys(table).sort()).toEqual([...VOCAB].sort())
      expect(Object.values(table).reduce((s, c) => s + c, 0)).toBeCloseTo(1, 10)
      for (const c of Object.values(table)) expect(c).toBeGreaterThan(0)
    }
  })

  it('reads the start token, then each right word, and writes the next one', () => {
    expect(INPUTS.length).toBe(TARGET.length)
    INPUTS.slice(1).forEach((w, t) => expect(w).toBe(TARGET[t]))
    expect(CHANCES.map(best)).toEqual([...TARGET])
  })

  it('puts the words in English order, though the French has the colour after the noun', () => {
    expect(SOURCE.indexOf('noir')).toBeGreaterThan(SOURCE.indexOf('chat'))
    expect(TARGET.indexOf('black')).toBeLessThan(TARGET.indexOf('cat'))
  })

  it('works the three numbers by hand: 0.72, 0.72 × 0.55, and all five', () => {
    expect(rightChances).toEqual([0.72, 0.55, 0.86, 0.78, 0.93])
    expect(WORKED[0].chance).toBeCloseTo(0.72)
    expect(WORKED[1].chance).toBeCloseTo(0.396)
    expect(WORKED[2].chance).toBeCloseTo(0.72 * 0.55 * 0.86 * 0.78 * 0.93)
    expect(WORKED[2].chance).toBeCloseTo(0.247, 3)
    expect(loss(rightChances)).toBeCloseTo(1.398, 3)
  })

  it('makes the loss minus the log of the sentence chance', () => {
    expect(loss(rightChances)).toBeCloseTo(-Math.log(sentenceChance(rightChances)), 12)
  })

  it('has the learner prefer "cat" where the tutor says "black", at a cost of 1.20', () => {
    expect(best(LEARNING)).toBe('cat')
    expect(TARGET[LEARNING_STEP]).toBe('black')
    expect(learningCost).toBeCloseTo(1.204, 3)
    expect(top(LEARNING, 2).map(([w]) => w)).toEqual(['cat', 'black'])
  })
})

// A random decoder over a tiny vocabulary: each prefix gets its own softmax
// over the words and the end token, seeded by the prefix
function randomDecoder(seed: number, words: number) {
  return (prefix: number[]) => {
    const random = seeded(seed * 7919 + prefix.reduce((h, w) => (h * 31 + w + 1) >>> 0, 1))
    const logits = Array.from({ length: words + 1 }, () => random() * 4 - 2)
    const top = Math.max(...logits)
    const e = logits.map((z) => Math.exp(z - top))
    const sum = e.reduce((s, x) => s + x, 0)
    return e.map((x) => x / sum) // index `words` is the end token
  }
}

describe('a decoder is a conditional language model', () => {
  it('spreads exactly 1 over every finished and unfinished sentence, on random decoders', () => {
    const random = seeded(11)
    for (let run = 0; run < 30; run++) {
      const words = 2 + Math.floor(random() * 3)
      const maxLength = 2 + Math.floor(random() * 3)
      const decoder = randomDecoder(run + 1, words)
      // Brute force: walk every prefix up to maxLength words
      let finished = 0
      let unfinished = 0
      const walk = (prefix: number[], chance: number) => {
        const next = decoder(prefix)
        finished += chance * next[words]
        for (let w = 0; w < words; w++) {
          const c = chance * next[w]
          if (prefix.length + 1 === maxLength) unfinished += c
          else walk([...prefix, w], c)
        }
      }
      walk([], 1)
      expect(finished + unfinished).toBeCloseTo(1, 10)
    }
  })

  it('scores a sentence by the chain rule, the same as the product the page shows', () => {
    const random = seeded(23)
    for (let run = 0; run < 50; run++) {
      const words = 3
      const decoder = randomDecoder(100 + run, words)
      const length = 1 + Math.floor(random() * 5)
      const sentence = Array.from({ length }, () => Math.floor(random() * words))
      const chances = [...sentence, words].map((w, t) => decoder(sentence.slice(0, t))[w])
      let direct = 1
      for (let t = 0; t <= length; t++) direct *= decoder(sentence.slice(0, t))[t < length ? sentence[t] : words]
      expect(sentenceChance(chances)).toBeCloseTo(direct, 12)
      expect(loss(chances)).toBeCloseTo(-Math.log(direct), 9)
    }
  })
})

describe('the card', () => {
  it('holds the same number of numbers for 4 words and for 20', () => {
    expect(LONG.length).toBe(20)
    expect(SHORT_CARDS.length).toBe(SOURCE.length)
    expect(LONG_CARDS.length).toBe(LONG.length)
    for (const card of [...SHORT_CARDS, ...LONG_CARDS]) {
      expect(card.length).toBe(CARD)
      for (const x of card) expect(Math.abs(x)).toBeLessThan(1)
    }
  })

  it('changes with every word and gives the same card for the same words', () => {
    expect(encode(SOURCE)).toEqual(SHORT_CARDS)
    for (let t = 1; t < SHORT_CARDS.length; t++) expect(SHORT_CARDS[t]).not.toEqual(SHORT_CARDS[t - 1])
  })
})

// Brute force: the shortest path through the unrolled network, by
// breadth-first search. Nodes 0..m-1 are encoder states, m..m+n-1 decoder
// states; the last encoder state hands over to the first decoder state.
function bfsTrip(m: number, n: number, i: number, j: number, reversed: boolean) {
  const start = reversed ? m - i : i - 1
  const goal = m + j - 1
  const next = (v: number) => (v < m + n - 1 ? [v + 1] : [])
  const seen = new Map([[start, 0]])
  const queue = [start]
  while (queue.length) {
    const v = queue.shift()!
    if (v === goal) return seen.get(v)!
    for (const u of next(v)) {
      if (!seen.has(u)) {
        seen.set(u, seen.get(v)! + 1)
        queue.push(u)
      }
    }
  }
  return Infinity
}

describe('how far a word travels', () => {
  it('works small cases by hand', () => {
    expect(trip(1, 1, 1, false)).toBe(1)
    expect(trip(5, 1, 1, false)).toBe(5)
    expect(trip(5, 1, 1, true)).toBe(1)
    expect(trip(5, 5, 5, true)).toBe(9)
    expect(LONG_FIRST_TRIP).toBe(20)
    expect(checkTrip()).toBe(23)
    expect(CHECK.m - 1 + 1 + (CHECK.k - 1)).toBe(23)
  })

  it('matches a breadth-first search through the unrolled network, on random sentences', () => {
    const random = seeded(5)
    for (let run = 0; run < 500; run++) {
      const m = 1 + Math.floor(random() * 30)
      const n = 1 + Math.floor(random() * 30)
      const i = 1 + Math.floor(random() * m)
      const j = 1 + Math.floor(random() * n)
      const reversed = random() < 0.5
      expect(trip(m, i, j, reversed)).toBe(bfsTrip(m, n, i, j, reversed))
    }
  })

  it('keeps every pair m steps apart read forwards, and the same average read backwards', () => {
    for (const m of [3, 10, 20, 30]) {
      expect(trips(m, false).every((t) => t === m)).toBe(true)
      const back = tripSummary(m, true)
      expect(back.shortest).toBe(1)
      expect(back.longest).toBe(2 * m - 1)
      expect(back.mean).toBeCloseTo(m, 12)
    }
  })
})

describe('the paper', () => {
  it('summarises a sentence in 8,000 numbers whatever its length', () => {
    expect(PAPER.numbers).toBe(8000)
    expect(PAPER.bleuBackwards).toBeGreaterThan(PAPER.bleuForwards)
  })
})
