import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  ALL,
  firstChalk,
  hike,
  HUT,
  lambdaWeight,
  learnHike,
  LEGS,
  LOST,
  lowChalk,
  miss,
  missAfter,
  NS,
  nStepReturn,
  spread,
  STORY,
  storyReturn,
  trailheadReturns,
  TRUE,
  type Hike,
} from './model'

// A hike by hand, with a wrong fork from post 2 back to 1
const WALK: Hike = { posts: [0, 1, 2, 1, 2, 3], minutes: [5, 6, 7, 8, 9] }

describe('the trail', () => {
  it('ends every hike at the hut, never wandering back from the trailhead', () => {
    const random = seeded(1)
    for (let i = 0; i < 200; i++) {
      const { posts, minutes } = hike(random)
      expect(posts[0]).toBe(0)
      expect(posts.at(-1)).toBe(HUT)
      expect(minutes).toHaveLength(posts.length - 1)
      expect(Math.min(...posts)).toBe(0)
      posts.slice(1).forEach((post, k) => expect(Math.abs(post - posts[k])).toBe(1))
    }
  })

  it('has true values that fit: a leg, then where it leads', () => {
    expect(TRUE[HUT]).toBe(0)
    expect(TRUE[9]).toBeCloseTo(LEGS[9] + LOST * TRUE[8], 6)
    expect(TRUE[0]).toBeCloseTo(LEGS[0] + TRUE[1], 6)
    for (let post = 1; post < HUT; post++) {
      expect(TRUE[post]).toBeCloseTo(LEGS[post] + LOST * TRUE[post - 1] + (1 - LOST) * TRUE[post + 1], 6)
    }
  })

  it('is what timing many hikes finds', () => {
    const random = seeded(2)
    let total = 0
    for (let i = 0; i < 20_000; i++) total += hike(random).minutes.reduce((a, b) => a + b, 0)
    expect(total / 20_000).toBeGreaterThan(TRUE[0] - 2)
    expect(total / 20_000).toBeLessThan(TRUE[0] + 2)
  })
})

describe('the n-step return', () => {
  const chalk = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0]
  it('adds n legs, then the chalk where they lead', () => {
    expect(nStepReturn(WALK, 0, 1, chalk)).toBe(5 + 90)
    expect(nStepReturn(WALK, 0, 2, chalk)).toBe(5 + 6 + 80)
    expect(nStepReturn(WALK, 1, 3, chalk)).toBe(6 + 7 + 8 + 80)
  })

  it('is the whole return once n runs past the end', () => {
    expect(nStepReturn(WALK, 0, 5, chalk)).toBe(35)
    expect(nStepReturn(WALK, 0, ALL, chalk)).toBe(35)
    expect(nStepReturn(WALK, 3, 4, chalk)).toBe(17)
  })

  it('tells the story’s numbers', () => {
    expect(storyReturn(1)).toBe(147)
    expect(storyReturn(3)).toBe(136)
    expect(storyReturn(HUT)).toBe(STORY.whole)
  })

  it('updates each post in turn, toward its return', () => {
    const next = learnHike(chalk, { posts: [0, 1, 2], minutes: [20, 4] }, 1, 0.5)
    expect(next[0]).toBe(100 + 0.5 * (20 + 90 - 100))
    // The last leg ends the hike: no chalk, only the minutes
    expect(next[1]).toBe(90 + 0.5 * (4 - 90))
  })
})

describe('two ways to be wrong', () => {
  it('one leg: tight but as low as the chalk; all the way: right on average but scattered', () => {
    const one = spread(trailheadReturns(seeded(4), 1, 2000))
    const all = spread(trailheadReturns(seeded(4), ALL, 2000))
    expect(one.mean - TRUE[0]).toBeLessThan(-25)
    expect(one.sd).toBeLessThan(2)
    expect(Math.abs(all.mean - TRUE[0])).toBeLessThan(5)
    expect(all.sd).toBeGreaterThan(50)
  })

  it('more legs: less bias and more spread', () => {
    const columns = [1, 2, 4, 8, 16, ALL].map((n) => spread(trailheadReturns(seeded(7), n, 4000)))
    for (let i = 1; i < columns.length; i++) {
      expect(Math.abs(columns[i].mean - TRUE[0])).toBeLessThan(Math.abs(columns[i - 1].mean - TRUE[0]) + 1)
      expect(columns[i].sd).toBeGreaterThan(columns[i - 1].sd)
    }
    expect(lowChalk()[0]).toBeCloseTo(TRUE[0] * 0.8)
  })
})

describe('learning the trail', () => {
  it('starts from the same guess everywhere', () => {
    expect(firstChalk()).toEqual([100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 0])
    expect(miss(TRUE)).toBe(0)
  })

  const misses = NS.map((n) => missAfter(n))
  const best = NS[misses.indexOf(Math.min(...misses))]

  it('does best with a few legs, as the guess says', () => {
    expect(best).toBe(6)
    expect(misses[0]).toBeGreaterThan(30)
    expect(misses[NS.length - 1]).toBeGreaterThan(18)
    expect(Math.min(...misses)).toBeLessThan(14)
  })

  it('favours fewer legs with a bigger step, and more with a smaller one', () => {
    const bestFor = (step: number) => {
      const m = NS.map((n) => missAfter(n, 200, 10, step))
      return NS[m.indexOf(Math.min(...m))]
    }
    expect(bestFor(0.2)).toBeLessThan(6)
    expect(bestFor(0.1)).toBeGreaterThan(6)
  })
})

describe('the λ-return', () => {
  it('gives each step λ times the share of the one before, adding to 1', () => {
    expect([1, 2, 3].map((n) => lambdaWeight(0.5, n))).toEqual([0.5, 0.25, 0.125])
    let total = 0
    for (let n = 1; n < 200; n++) total += lambdaWeight(0.9, n)
    expect(total).toBeCloseTo(1, 6)
    expect(lambdaWeight(0, 1)).toBe(1)
  })
})

describe('the escape rooms', () => {
  it('give room A 0.6 by one step and 0 by Monte Carlo', () => {
    // Room B: ten visits (nine starts and one from A), six escapes
    const b = 6 / 10
    const oneStep = 0 + b
    const monteCarlo = 0
    expect(oneStep).toBe(0.6)
    expect(monteCarlo).toBe(0)
  })
})
