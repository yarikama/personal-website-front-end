import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  CALLS,
  cellSlope,
  DINNER,
  inMind,
  LAB_F,
  lstmStep,
  pct,
  rightVerb,
  SENTENCE_NAMES,
  SENTENCES,
  sigmoid,
  squashed,
  survives,
  TRACES,
  trace,
  WORKED_F,
  type Gates,
} from './model'

describe('one LSTM step', () => {
  it('keeps the old cell, adds what is written, and shows a share of it', () => {
    // 0.9 × 1 + 0.5 × (−0.4) = 0.7; h = 0.5 × tanh(0.7)
    const { c, h } = lstmStep(1, { f: 0.9, i: 0.5, g: -0.4, o: 0.5 })
    expect(c).toBeCloseTo(0.7)
    expect(h).toBeCloseTo(0.5 * Math.tanh(0.7))
  })

  it('leaves the cell exactly as it was with the forget gate at 1 and nothing let in', () => {
    expect(lstmStep(0.83, { f: 1, i: 0, g: 0.9, o: 0 }).c).toBe(0.83)
  })

  it('wipes and writes with the forget gate at 0 and the input gate at 1', () => {
    expect(lstmStep(0.83, { f: 0, i: 1, g: -0.6, o: 1 }).c).toBeCloseTo(-0.6)
  })

  it('moves with the old cell by exactly the forget gate, on random cells and gates', () => {
    const random = seeded(7)
    for (let n = 0; n < 300; n++) {
      const gates: Gates = { f: random(), i: random(), o: random(), g: 2 * random() - 1 }
      const cPrev = 4 * random() - 2
      expect(cellSlope(cPrev, gates)).toBeCloseTo(gates.f, 6)
    }
  })
})

describe('what survives a run of words', () => {
  it('is the forget gates multiplied, as the page states', () => {
    expect(WORKED_F.map((f) => pct(survives(f, 20)))).toEqual(['0.0001%', '12%', '82%'])
    expect(survives(0.9, 20)).toBeCloseTo(0.1216, 4)
    expect(survives(0.99, 20)).toBeCloseTo(0.8179, 4)
  })

  it('matches stepping the cell word by word, on random runs', () => {
    const random = seeded(11)
    for (let n = 0; n < 200; n++) {
      const f = 0.5 + 0.5 * random()
      const k = 1 + Math.floor(40 * random())
      let c = 1
      for (let j = 0; j < k; j++) c = lstmStep(c, { f, i: 0, g: 0, o: 1 }).c
      expect(c).toBeCloseTo(survives(f, k), 10)
    }
  })

  it('is the chain of one-step slopes, by finite differences across the whole run', () => {
    const random = seeded(12)
    for (let n = 0; n < 100; n++) {
      const k = 2 + Math.floor(20 * random())
      const gates: Gates[] = Array.from({ length: k }, () => ({ f: random(), i: random(), o: 1, g: 2 * random() - 1 }))
      const run = (c0: number) => gates.reduce((c, g) => lstmStep(c, g).c, c0)
      const eps = 1e-6
      const slope = (run(0.3 + eps) - run(0.3 - eps)) / (2 * eps)
      expect(slope).toBeCloseTo(
        gates.reduce((p, g) => p * g.f, 1),
        6,
      )
    }
  })
})

describe('the story', () => {
  it('halves the message in your head at every stop, to 1.6% by dinner', () => {
    expect(inMind.map(pct)).toEqual(['100%', '50%', '25%', '13%', '6.3%', '3.1%', '1.6%'])
    expect(pct(inMind[DINNER])).toBe('1.6%')
  })

  it('writes the note once, keeps it all day, and reads it at dinner', () => {
    let c = 0.4 // yesterday's errand
    for (const gates of CALLS) c = lstmStep(c, gates).c
    expect(c).toBe(1)
    expect(CALLS.map((g) => g.o)).toEqual([0, 0, 0, 0, 0, 0, 1])
  })
})

describe('the lab', () => {
  it('knows which verb each sentence needs', () => {
    expect(SENTENCE_NAMES.map((s) => rightVerb(SENTENCES[s]))).toEqual(['are', 'are', 'are', 'is'])
  })

  it('agrees with tracing the sentence again', () => {
    for (const s of SENTENCE_NAMES) for (const f of LAB_F) expect(TRACES[s][f]).toEqual(trace(SENTENCES[s], f))
  })

  it('has the plain unit right on the short sentence, and overwritten by the last noun otherwise', () => {
    expect(TRACES.Short[0.99].plainRight).toBeGreaterThan(0.9)
    for (const s of ['Noun between', 'Long', 'Singular'] as const) expect(TRACES[s][0.99].plainRight).toBeLessThan(0.01)
  })

  it('has the LSTM right on every sentence with a forget gate of 0.99', () => {
    for (const s of SENTENCE_NAMES) expect(TRACES[s][0.99].lstmRight).toBeGreaterThan(0.95)
  })

  it('leaks the long sentence’s subject away at 0.8, as the page says', () => {
    expect(pct(TRACES.Long[0.8].lstmRight)).toBe('41%')
    expect(pct(TRACES.Long[0.99].lstmRight)).toBe('97%')
  })

  it('reads the verb through a sigmoid of the output', () => {
    expect(sigmoid(0)).toBe(0.5)
    expect(sigmoid(3) + sigmoid(-3)).toBeCloseTo(1)
  })
})

describe('squashing the cell at every word', () => {
  it('shrinks a stored 0.9 even with nothing forgotten', () => {
    expect(squashed(3).map((x) => x.toFixed(2))).toEqual(['0.90', '0.72', '0.61', '0.55'])
  })
})
