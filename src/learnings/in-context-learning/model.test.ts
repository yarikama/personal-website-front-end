import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  BEARINGS,
  BOARD,
  classify,
  DECK,
  EASY,
  EXAMPLES,
  fit,
  GREAT_AFTER,
  KICKFLIP,
  line,
  NOTES,
  predict,
  PRIOR,
  prompt,
  RAMP,
  READINGS,
  readingOf,
  STAFF,
  STORY,
  WEIGHT_COUNT,
  WHEELS,
  type Example,
  type Note,
  type Reading,
} from './model'

describe('the frozen model, worked by hand', () => {
  it('has fourteen numbers', () => {
    expect(WEIGHT_COUNT).toBe(14)
  })

  it('sorts the ramp note at 14%, 36% and 75% praise with 0, 1 and 2 notes taped up', () => {
    // 0.95 × 0.1 + 0.05 × 0.9
    expect(STORY[0].great).toBeCloseTo(0.14, 10)
    // skater talk: 0.05 × 0.9 = 0.045 against 0.95 × 0.1 = 0.095, so 9/28
    expect(STORY[1].reading.skate).toBeCloseTo(9 / 28, 10)
    expect(STORY[1].great).toBeCloseTo(5 / 14, 10)
    // skater talk: 0.05 × 0.81 = 0.0405 against 0.95 × 0.01 = 0.0095, so 0.81
    expect(STORY[2].reading.skate).toBeCloseTo(0.81, 10)
    expect(STORY[2].great).toBeCloseTo(0.748, 10)
    expect(STORY.map((s) => s.label)).toEqual(['complaint', 'complaint', 'praise'])
  })

  it('gets the easy note right with nothing taped up', () => {
    expect(EASY.great).toBeCloseTo(0.9, 10)
    expect(EASY.label).toBe('praise')
  })

  it('learns nothing from notes every kind of English agrees on', () => {
    expect(predict([BEARINGS, STAFF], RAMP).great).toBeCloseTo(STORY[0].great, 10)
    expect(predict([KICKFLIP, BEARINGS, STAFF], RAMP).great).toBeCloseTo(STORY[1].great, 10)
  })

  it('carries the reading to a word no example used', () => {
    expect(predict([KICKFLIP, WHEELS], DECK).great).toBeCloseTo(STORY[2].great, 10)
    expect(predict([KICKFLIP, WHEELS], BOARD).great).toBeCloseTo(0.1, 10)
  })

  it('writes the prompt as text', () => {
    expect(line(KICKFLIP)).toBe('That kickflip was sick. It was great!')
    expect(prompt([BEARINGS], RAMP)).toEqual(['The bearings rusted in a week. It was terrible!', 'The new ramp is sick. It was …'])
  })

  it('compares only the label words', () => {
    expect(classify({ a: 0.4, fine: 0.2, terrible: 0.25, great: 0.15 })).toBe('complaint')
    expect(classify({ a: 0.4, great: 0.3, terrible: 0.1 })).toBe('praise')
  })
})

// Every way to choose some of the examples, in some order
function subsets(random: () => number): Example[] {
  const chosen = EXAMPLES.filter(() => random() < 0.5)
  for (let i = chosen.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[chosen[i], chosen[j]] = [chosen[j], chosen[i]]
  }
  return chosen
}

describe('against a brute-force reference', () => {
  // The model as a story of how text gets written: pick a kind of English,
  // then write each note's ending in it. Keep only the runs whose endings
  // match the prompt's, and count how often the new note's ending is great.
  function sampled(examples: Example[], note: Note, random: () => number, runs: number): number {
    let kept = 0
    let great = 0
    for (let n = 0; n < runs; n++) {
      const reading: Reading = random() < PRIOR.everyday ? 'everyday' : 'skate'
      const matches = examples.every((e) => random() < fit(e, reading))
      if (!matches) continue
      kept++
      if (random() < GREAT_AFTER[note.word][reading]) great++
    }
    return great / kept
  }

  it('matches sampling on random prompts', () => {
    const random = seeded(584)
    for (let t = 0; t < 12; t++) {
      const examples = subsets(random)
      const note = NOTES[Math.floor(random() * NOTES.length)]
      expect(sampled(examples, note, random, 60_000)).toBeCloseTo(predict(examples, note).great, 1)
    }
  })

  it('gives the same answer in any order of the examples', () => {
    const random = seeded(12)
    for (let t = 0; t < 200; t++) {
      const examples = subsets(random)
      const reversed = [...examples].reverse()
      for (const note of NOTES) expect(predict(reversed, note).great).toBeCloseTo(predict(examples, note).great, 12)
    }
  })

  it('never changes a weight, however many prompts it reads', () => {
    const before = JSON.stringify({ PRIOR, GREAT_AFTER })
    const random = seeded(7)
    for (let t = 0; t < 500; t++) {
      const examples = subsets(random)
      for (const note of NOTES) {
        const p = predict(examples, note)
        expect(p.great + p.terrible).toBeCloseTo(1, 12)
        expect(READINGS.reduce((s, r) => s + readingOf(examples)[r], 0)).toBeCloseTo(1, 12)
      }
    }
    expect(JSON.stringify({ PRIOR, GREAT_AFTER })).toBe(before)
    expect(Object.isFrozen(GREAT_AFTER.sick)).toBe(true)
  })
})
