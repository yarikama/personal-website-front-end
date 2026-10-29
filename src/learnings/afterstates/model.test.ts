import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  BEST,
  BEST_LOSS,
  catchUp,
  choices,
  DAYS,
  EVERY,
  EXACT,
  FRIDGE,
  learn,
  lossNow,
  lossOf,
  MONDAY,
  PAIRS,
  pairsFor,
  playDay,
  policyOf,
  race,
  range,
  SHELVES,
  shelvesFor,
  STORY_DAY,
  storyRuns,
  tried,
  triedShelves,
  TUESDAY,
} from './model'

describe('the stall', () => {
  it('counts a score per pair and a score per shelf', () => {
    expect(PAIRS).toBe(66)
    expect(SHELVES).toBe(11)
    expect(pairsFor(6)).toBe(28)
    expect(shelvesFor(6)).toBe(7)
    expect(pairsFor(100)).toBe(5151)
    // Every pair, counted one by one
    expect(range(0, FRIDGE).reduce((sum, left) => sum + choices(left).length, 0)).toBe(PAIRS)
  })

  it('opens the story’s two mornings with the same shelf', () => {
    expect(MONDAY.left + MONDAY.bought).toBe(TUESDAY.left + TUESDAY.bought)
    expect(MONDAY.wanted - (MONDAY.left + MONDAY.bought)).toBe(MONDAY.missed)
  })

  it('works out each day exactly as sampling it does', () => {
    for (const open of [0, 4, 7, 10]) {
      expect(EXACT[open].next.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10)
      const random = seeded(open + 1)
      let lost = 0
      const trials = 20000
      for (let i = 0; i < trials; i++) {
        const day = playDay(open, random)
        lost += day.missed + day.spoiled
      }
      expect(lost / trials).toBeCloseTo(EXACT[open].lost, 1)
    }
    // An empty fridge loses every customer: 5 on average
    expect(EXACT[0].lost).toBeCloseTo(5, 10)
  })

  it('is best stocked by topping up to 7', () => {
    expect(BEST.policy).toEqual([7, 7, 7, 7, 7, 7, 7, 7, 8, 9, 10])
    expect(BEST_LOSS).toBeCloseTo(0.571, 3)
    // Filling the fridge every morning loses more, and so does topping up to 5
    expect(lossOf(range(0, FRIDGE).map(() => FRIDGE))).toBeCloseTo(1, 3)
    expect(lossOf(range(0, FRIDGE).map((left) => Math.max(left, 5)))).toBeGreaterThan(1)
  })
})

describe('the two notebooks', () => {
  it('keeps one score per shelf, read by every pair that opens with it', () => {
    const run = learn('shelf', 3, 60)
    for (const table of [run.tables[20], run.tables[60]])
      for (let open = 0; open <= FRIDGE; open++) {
        const reads = range(0, open).map((left) => table[left][open - left])
        expect(new Set(reads).size).toBe(1)
      }
  })

  it('learns by the same rule in both', () => {
    // On the first morning both hold only zeros, so they choose alike and
    // write the same first score
    const pairs = learn('pairs', 5, 1)
    const shelf = learn('shelf', 5, 1)
    const { left, open } = pairs.days[0]
    expect(pairs.tables[1][left][open - left]).toBe(shelf.tables[1][left][open - left])
  })

  it('tells the story’s numbers on day 30', () => {
    const { pairs, shelf } = storyRuns()
    expect(tried(pairs.counts[STORY_DAY])).toBe(26)
    expect(triedShelves(shelf.counts[STORY_DAY])).toBe(SHELVES)
    // The shelf notebook tops up to 7 from anything below it, as is best
    expect(policyOf(shelf.tables[STORY_DAY]).slice(0, 8)).toEqual(BEST.policy.slice(0, 8))
    expect(lossNow(shelf.tables[STORY_DAY])).toBeCloseTo(BEST_LOSS, 6)
    expect(lossNow(pairs.tables[STORY_DAY])).toBeGreaterThan(2)
  })

  it('on average, learns about three times as fast by shelves', () => {
    const { pairs, shelf } = race()
    expect(pairs).toHaveLength(DAYS / EVERY + 1)
    const at = STORY_DAY / EVERY
    expect(shelf[at]).toBeCloseTo(0.96, 2)
    expect(pairs[at]).toBeCloseTo(2.45, 2)
    expect(catchUp(STORY_DAY)).toBe(90)
    // Both get close to the best; shelves closer
    expect(shelf.at(-1)!).toBeLessThan(pairs.at(-1)!)
    expect(pairs.at(-1)! - BEST_LOSS).toBeLessThan(0.2)
    expect(shelf.at(-1)! - BEST_LOSS).toBeLessThan(0.1)
  })

  it('is not one lucky seed: shelves lead on day 30 for most learners', () => {
    let ahead = 0
    for (let seed = 1; seed <= 20; seed++) {
      if (lossNow(learn('shelf', seed, STORY_DAY).tables[STORY_DAY]) < lossNow(learn('pairs', seed, STORY_DAY).tables[STORY_DAY])) ahead++
    }
    expect(ahead).toBeGreaterThanOrEqual(17)
  })
})
