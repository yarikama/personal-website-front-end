import { describe, expect, it } from 'vitest'
import { meanOf } from '../../components/explain/bandit'
import { seeded } from '../../components/explain/random'
import {
  AFTER,
  BEFORE,
  bins,
  fallsAfter,
  FRIEND_STEP,
  GOOD,
  NEW_VISITS,
  NOISE,
  OLD_VISITS,
  percent,
  plainVisitsToFall,
  ready,
  run,
  scores,
  steadyVisitsToFall,
  story,
  visit,
  visits,
  weights,
  wobble,
} from './model'

describe('keeping a score', () => {
  it('keeps the plain average with step 1/n', () => {
    expect(scores([6, 9, 3, 6], 'average')).toEqual([6, 7.5, 6, 6].map((v) => expect.closeTo(v, 10)))
  })

  it('moves a fixed fraction of the way with a constant step, from the first visit', () => {
    // 8 → 8 + 0.2(3 − 8) = 7 → 7 + 0.2(2 − 7) = 6
    expect(scores([8, 3, 2], 0.2)).toEqual([8, 7, 6].map((v) => expect.closeTo(v, 10)))
  })

  it('is the weighted sum of the unrolled rule', () => {
    const ratings = [5, 7, 2, 9, 4, 6]
    const alpha = 0.3
    // Starting from Q₁ = the first rating, then every rating, the first included
    const { rewards, start } = weights(alpha, ratings.length)
    const unrolled = start * ratings[0] + rewards.reduce((sum, w, i) => sum + w * ratings[i], 0)
    expect(scores(ratings, alpha).at(-1)).toBeCloseTo(unrolled)
  })
})

describe('the weights', () => {
  it('are 0.1, 0.09, 0.081 back from the newest at α = 0.1, as the clip works them', () => {
    const { rewards } = weights(0.1, 20)
    expect(rewards.at(-1)).toBeCloseTo(0.1)
    expect(rewards.at(-2)).toBeCloseTo(0.09)
    expect(rewards.at(-3)).toBeCloseTo(0.081)
  })

  it('add up to 1 with the start’s, for any step', () => {
    for (const step of ['average', 0.1, 0.2, 0.5] as const) {
      const { rewards, start } = weights(step, 20)
      expect(start + rewards.reduce((a, b) => a + b)).toBeCloseTo(1)
    }
  })

  it('leave the start 0.9²⁰ ≈ 12% at α = 0.1, and nothing for the plain average', () => {
    expect(weights(0.1, 20).start).toBeCloseTo(0.1216, 3)
    expect(weights('average', 20).start).toBe(0)
    expect(weights('average', 20).rewards[0]).toBeCloseTo(0.05)
  })
})

describe('the café', () => {
  it('is BEFORE then AFTER, give or take NOISE', () => {
    const random = seeded(1)
    const ratings = Array.from({ length: 20000 }, () => visit(random, BEFORE))
    const mean = meanOf(ratings)
    expect(mean).toBeCloseTo(BEFORE, 1)
    expect(Math.sqrt(meanOf(ratings.map((r) => (r - mean) ** 2)))).toBeCloseTo(NOISE, 1)
    const story = visits(1)
    expect(story).toHaveLength(OLD_VISITS + NEW_VISITS)
    expect(meanOf(story.slice(OLD_VISITS))).toBeCloseTo(AFTER, 0)
  })

  it('needs as many bad visits as good ones to bring a plain average down to 6', () => {
    // (20 × 8 + m × 4) / (20 + m) = 6 at m = 20
    expect(plainVisitsToFall(20)).toBe(20)
    expect(plainVisitsToFall(40)).toBe(40)
  })

  it('needs 4 for a fifth-step score: 4 + 4 × 0.8^m ≤ 6 first at m = 4', () => {
    expect(steadyVisitsToFall(FRIEND_STEP)).toBe(4)
    expect(steadyVisitsToFall(0.5)).toBe(1)
  })

  it('counts the visits after the new chef to come down to GOOD', () => {
    const score = [...Array(OLD_VISITS).fill(8), 7, 6.5, GOOD, 5]
    expect(fallsAfter(score)).toBe(3)
    expect(fallsAfter(Array(OLD_VISITS + 3).fill(8))).toBeNull()
  })
})

describe('the story', () => {
  const { yours, hers, yourFall, herFall } = story()

  it('lands where the arithmetic does', () => {
    expect(yourFall).toBe(plainVisitsToFall(OLD_VISITS))
    expect(herFall).toBe(steadyVisitsToFall(FRIEND_STEP))
  })

  it('has both scores about 8 when the chef changes', () => {
    expect(yours[OLD_VISITS - 1]).toBeCloseTo(BEFORE, 0)
    expect(hers[OLD_VISITS - 1]).toBeCloseTo(BEFORE, 0)
  })

  it('has hers wobble more while the café stays the same', () => {
    expect(wobble(hers)).toBeGreaterThan(1.5 * wobble(yours))
  })
})

describe('the changing testbed', () => {
  // Fewer machines than the page, to keep the test quick
  const quick = 60
  const last = (world: 'still' | 'drifting', step: 'average' | number) => meanOf(run(world, step, quick).best, 1500)

  it('favours a constant step when the arms drift', () => {
    expect(last('drifting', 0.1)).toBeGreaterThan(last('drifting', 'average') + 0.1)
  })

  it('favours the plain average when they hold still', () => {
    expect(last('still', 'average')).toBeGreaterThan(last('still', 0.1))
    expect(last('still', 'average')).toBeGreaterThan(last('still', 0.5) + 0.1)
  })

  it('is too jumpy at α = 0.5 and too slow at 0.02 when they drift', () => {
    expect(last('drifting', 0.1)).toBeGreaterThan(last('drifting', 0.5))
    expect(last('drifting', 0.1)).toBeGreaterThan(last('drifting', 0.02))
  })

  it('remembers a run once worked out', () => {
    expect(ready('still', 0.3)).toBeUndefined()
    const first = run('still', 0.3)
    expect(ready('still', 0.3)).toBe(first)
  })
})

describe('the helpers', () => {
  it('bin values by averaging', () => {
    expect(bins([1, 3, 2, 4, 5], 2)).toEqual([2, 3, 5])
  })

  it('format a share as a percent', () => {
    expect(percent(0.666)).toBe('67%')
    expect(percent(0.0023)).toBe('0.2%')
    expect(percent(0)).toBe('0%')
  })
})
