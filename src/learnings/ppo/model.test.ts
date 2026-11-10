import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  BEST,
  clippedObjective,
  EPSILON,
  EVEN,
  meanTip,
  ratio,
  rework,
  shares,
  stopped,
  story,
  STORY_NOTES,
  STORY_USUAL,
  storyAverages,
  summarise,
  tip,
  weekend,
  worth,
  type Note,
} from './model'

describe('the tips', () => {
  it('average the going rate plus a twentieth of $20', () => {
    expect(meanTip(BEST)).toBeCloseTo(6, 12)
    const random = seeded(5)
    let total = 0
    const n = 40000
    for (let i = 0; i < n; i++) total += tip(BEST, random)
    expect(total / n).toBeCloseTo(6, 1)
  })

  it('never go below zero', () => {
    const random = seeded(9)
    for (let i = 0; i < 2000; i++) expect(tip(0, random)).toBeGreaterThanOrEqual(0)
  })
})

describe('the setlist', () => {
  it('starts even, a quarter each, worth $4.25 a play', () => {
    expect(shares(EVEN)).toEqual([0.25, 0.25, 0.25, 0.25])
    expect(worth(EVEN)).toBeCloseTo((2.5 + 4 + 4.5 + 6) / 4, 12)
  })

  it('plays each song about as often as its share', () => {
    const random = seeded(2)
    const prefs = [0, 1, 0, 2]
    const counts = [0, 0, 0, 0]
    for (let w = 0; w < 500; w++) for (const note of weekend(prefs, random)) counts[note.song]++
    const total = counts.reduce((a, b) => a + b, 0)
    shares(prefs).forEach((s, song) => expect(counts[song] / total).toBeCloseTo(s, 1))
  })
})

describe('a rework', () => {
  it('weights a note by its song’s share now over its share then', () => {
    const note: Note = { song: 1, tip: 5, share: 0.25, surprise: 1 }
    expect(ratio(EVEN, note)).toBe(1)
    const prefs = [0, Math.log(2), 0, 0] // the cover now 2/5
    expect(ratio(prefs, note)).toBeCloseTo(0.4 / 0.25, 12)
  })

  it('is the plain policy gradient at the setlist that took the notes', () => {
    // One note, cover, $2 better than usual, shares even: the cover's
    // preference rises by α × 2 × (1 − ¼), every other falls by α × 2 × ¼
    const notes: Note[] = [{ song: 1, tip: 6, share: 0.25, surprise: 2 }]
    const after = rework(EVEN, notes, EPSILON, 0.1)
    expect(after[1]).toBeCloseTo(0.1 * 2 * 0.75, 12)
    for (const song of [0, 2, 3]) expect(after[song]).toBeCloseTo(-0.1 * 2 * 0.25, 12)
    expect(rework(EVEN, notes, null, 0.1)).toEqual(after)
  })

  it('stops a note only when it would push its song further past 1 ± ε', () => {
    expect(stopped(1.3, 2, 0.2)).toBe(true)
    expect(stopped(1.1, 2, 0.2)).toBe(false)
    expect(stopped(1.3, -2, 0.2)).toBe(false) // pulling it back toward where it was
    expect(stopped(0.7, -2, 0.2)).toBe(true)
    expect(stopped(0.7, 2, 0.2)).toBe(false)
    expect(stopped(5, 2, null)).toBe(false)
  })

  it('has PPO’s objective: the smaller of r·A and the clipped r·A', () => {
    expect(clippedObjective(1.1, 2)).toBeCloseTo(2.2, 12)
    expect(clippedObjective(1.3, 2)).toBeCloseTo(2.4, 12)
    expect(clippedObjective(1.3, -2)).toBeCloseTo(-2.6, 12)
    expect(clippedObjective(0.7, -2)).toBeCloseTo(-1.6, 12)
    expect(clippedObjective(0.7, 2)).toBeCloseTo(1.4, 12)
  })
})

describe('the story', () => {
  it('has a usual of $3.94 and the cover’s lucky $20 on top', () => {
    expect(STORY_NOTES).toHaveLength(16)
    expect(STORY_USUAL).toBeCloseTo(63 / 16, 12)
    expect(storyAverages()).toEqual([1.5, 6.25, 3, 5])
  })

  it('without the limit, thirty reworks hand the set to the cover and cut the waltz', () => {
    const end = shares(story(null).at(-1)!)
    expect(Math.round(100 * end[1])).toBe(75)
    expect(Math.round(100 * end[BEST])).toBe(14)
  })

  it('with the limit, every song ends near a fifth from where it was', () => {
    const end = shares(story(EPSILON).at(-1)!).map((s) => Math.round(100 * s))
    expect(end).toEqual([19, 31, 19, 31])
  })
})

describe('many weekends', () => {
  it('one rework a weekend is slow; thirty without the limit strand a third of runs; with it, none', () => {
    const once = summarise(1, null)
    const loose = summarise(30, null)
    const held = summarise(30, EPSILON)
    expect(once.onOther).toBe(0)
    expect(once.waltz[20]).toBeLessThan(0.6)
    expect(loose.onOther).toBeGreaterThan(0.25)
    expect(loose.waltz[1]).toBeGreaterThan(held.waltz[1])
    expect(held.onWaltz).toBe(1)
    expect(held.earns).toBeGreaterThan(loose.earns)
    expect(held.earns).toBeGreaterThan(once.earns)
  })

  it('the limit makes no difference to a single rework', () => {
    expect(summarise(1, EPSILON, 20).waltz).toEqual(summarise(1, null, 20).waltz)
  })
})
