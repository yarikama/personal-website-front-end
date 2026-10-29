import { describe, expect, it } from 'vitest'
import {
  chase,
  frozen,
  gap,
  guess,
  LAKE,
  notebook,
  pierTarget,
  screensPowerOfTen,
  SETTLED_K,
  SHARES,
  START_K,
  STORY,
  TRUTH,
  twoKnobs,
} from './model'

describe('the lake', () => {
  it('takes 10 minutes from the pier and 6 from the far shore', () => {
    expect(TRUTH).toEqual({ pier: 10, shore: 6 })
  })

  it('starts the story with the pier at 2 minutes, the far shore at 4, and a target of 8', () => {
    expect(guess(START_K, LAKE.pier)).toBe(2)
    expect(guess(START_K, LAKE.shore)).toBe(4)
    expect(pierTarget(START_K)).toBe(8)
    expect(gap(START_K, START_K)).toBe(6)
  })
})

describe('one knob', () => {
  it('chasing the live target, the gap grows by a tenth each nudge: 6 to 15.6 in ten', () => {
    const ks = chase(10)
    ks.slice(1).forEach((k, i) => expect(gap(k, k) / gap(ks[i], ks[i])).toBeCloseTo(1.1, 10))
    expect(gap(ks[10], ks[10]).toFixed(1)).toBe('15.6')
  })

  it('aiming at a written-down copy, the gap shrinks by a tenth each nudge: 6 to 2.1 in ten', () => {
    const ks = frozen(10)
    expect(gap(ks[10], START_K).toFixed(1)).toBe('2.1')
    // And the pier's guess reaches the held target of 8, with k at 16
    expect(frozen(200).at(-1)!).toBeCloseTo(16, 6)
  })

  it('settles at k = 10.7 on a notebook of both drives', () => {
    expect(SETTLED_K).toBeCloseTo(32 / 3, 10)
    expect(notebook(400, 16).at(-1)!).toBeCloseTo(SETTLED_K, 6)
    // Where the story leaves it
    expect(STORY.mixed.at(-1)!.toFixed(1)).toBe('10.7')
  })

  it('tells the story with growing, then held, then settled knobs', () => {
    expect(STORY.chased.at(-1)!.toFixed(1)).toBe('23.1')
    expect(guess(STORY.held.at(-1)!, LAKE.pier)).toBeGreaterThan(7.8)
  })
})

describe('two knobs', () => {
  const settles = (run: ReturnType<typeof twoKnobs>) =>
    run.blewUp === null &&
    Math.abs(run.pier.at(-1)! - TRUTH.pier) < 0.2 &&
    Math.abs(run.shore.at(-1)! - TRUTH.shore) < 0.2

  it('settles either way on a notebook that is half far-shore drives', () => {
    for (const seed of [1, 2, 3]) {
      expect(settles(twoKnobs('moving', SHARES.Half, seed))).toBe(true)
      expect(settles(twoKnobs('frozen', SHARES.Half, seed))).toBe(true)
    }
  })

  it('blows up with the moving target and settles with the copy, when 1 drive in 10 is from the far shore', () => {
    for (const seed of [1, 2, 3]) {
      expect(twoKnobs('moving', SHARES['1 in 10'], seed).blewUp).not.toBeNull()
      expect(settles(twoKnobs('frozen', SHARES['1 in 10'], seed))).toBe(true)
    }
  })

  it('blows up either way with no far-shore drives at all', () => {
    expect(twoKnobs('moving', SHARES.None).blewUp).not.toBeNull()
    expect(twoKnobs('frozen', SHARES.None).blewUp).not.toBeNull()
  })

  it('refreshes the copy every 50 updates', () => {
    expect(twoKnobs('frozen', SHARES.Half).refreshes.slice(0, 3)).toEqual([50, 100, 150])
    expect(twoKnobs('moving', SHARES.Half).refreshes).toEqual([])
  })
})

describe('an Atari screen', () => {
  it('has about 10 to the 70,802 possible screens', () => {
    expect(Math.floor(screensPowerOfTen())).toBe(70802)
  })
})
