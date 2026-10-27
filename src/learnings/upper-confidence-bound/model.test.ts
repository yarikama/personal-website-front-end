import { describe, expect, it } from 'vitest'
import { meanOf } from '../../components/explain/bandit'
import { seeded } from '../../components/explain/random'
import {
  ARMS,
  bonus,
  lunches,
  machine,
  randomRun,
  returnsTo,
  secondVisit,
  SPOT_FIRST,
  SPOT_MEANS,
  SPOTS,
  standing,
  story,
  STORY_C,
  STORY_LUNCHES,
  ucbRun,
  upperBound,
  visitsTo,
} from './model'

describe('the doubt bonus', () => {
  it('matches the numbers the page and the clip work out, with c = 1', () => {
    // √(ln 10) = √2.3026 = 1.5174; halved by four tries; √(ln 1000) = √6.9078
    expect(bonus(1, 10, 1)).toBeCloseTo(1.5174, 4)
    expect(bonus(1, 10, 4)).toBeCloseTo(0.7587, 4)
    expect(bonus(1, 10, 16)).toBeCloseTo(0.3794, 4)
    expect(bonus(1, 100, 1)).toBeCloseTo(2.1460, 4)
    expect(bonus(1, 1000, 1)).toBeCloseTo(2.6283, 4)
  })

  it('scales with c, is endless for an untried option, and adds to the score', () => {
    expect(bonus(2, 10, 1)).toBeCloseTo(2 * bonus(1, 10, 1))
    expect(bonus(1, 10, 0)).toBe(Infinity)
    expect(upperBound(6, 2, 5, 1)).toBeCloseTo(6 + 2 * Math.sqrt(Math.log(5)))
  })
})

describe('a year of lunches', () => {
  const record = story()

  it('tries each spot once, in order, with the scripted first lunches', () => {
    expect(record.slice(0, 4).map((lunch) => lunch.spot)).toEqual([0, 1, 2, 3])
    expect(record.slice(0, 4).map((lunch) => lunch.rating)).toEqual(SPOT_FIRST)
  })

  it('then always goes where score plus doubt is highest', () => {
    for (let day = 5; day <= STORY_LUNCHES; day++) {
      expect(record[day - 1].spot).toBe(standing(record, day - 1, STORY_C).next)
    }
  })

  it('goes to Ramen first, on its lucky first lunch', () => {
    expect(record[4].spot).toBe(SPOTS.indexOf('Ramen'))
  })

  it('keeps every bar on the chart once all four are tried', () => {
    for (let day = 4; day <= STORY_LUNCHES; day++) {
      const { tops, scores, doubts } = standing(record, day, STORY_C)
      expect(Math.max(...tops)).toBeLessThan(10.4)
      scores.forEach((score, i) => expect(score - doubts[i]).toBeGreaterThan(-1))
    }
  })

  it('goes back to Salads after five weeks, and ever more rarely after', () => {
    const salads = SPOTS.indexOf('Salads')
    expect(visitsTo(record, salads)[0]).toBe(2)
    expect(secondVisit(record, salads)).toBe(27)
    const returns = returnsTo(record, salads)
    expect(returns).toEqual([27, 82, 215])
    const waits = [2, ...returns].slice(1).map((day, i) => day - [2, ...returns][i])
    expect(waits[1]).toBeGreaterThan(waits[0])
    expect(waits[2]).toBeGreaterThan(waits[1])
  })

  it('spends most of the year at Tacos, truly the best', () => {
    const { visits } = standing(record, STORY_LUNCHES, STORY_C)
    expect(SPOT_MEANS.indexOf(Math.max(...SPOT_MEANS))).toBe(SPOTS.indexOf('Tacos'))
    expect(visits[SPOTS.indexOf('Tacos')]).toBe(219)
    expect(visits.reduce((sum, n) => sum + n)).toBe(STORY_LUNCHES)
  })

  it('never visits an option it has not counted', () => {
    const other = lunches(seeded(99), 60, STORY_C, SPOT_MEANS, SPOT_FIRST)
    expect(standing(other, 60, STORY_C).visits.reduce((sum, n) => sum + n)).toBe(60)
  })
})

describe('one ten-armed machine', () => {
  const { pulls } = machine(2)

  it('pulls each arm once, then by the rule', () => {
    expect(pulls.slice(0, ARMS).map((pull) => pull.arm)).toEqual([...Array(ARMS).keys()])
    pulls.forEach((pull, i) => expect(pull.tries.reduce((sum, n) => sum + n)).toBe(i + 1))
  })

  it('ends up pulling the best arm most', () => {
    const { means } = machine(2)
    const last = pulls.at(-1)!.tries
    expect(last.indexOf(Math.max(...last))).toBe(means.indexOf(Math.max(...means)))
  })
})

describe('the testbed', () => {
  const ucb = { 0.5: ucbRun(0.5), 1: ucbRun(1), 2: ucbRun(2), 4: ucbRun(4) }
  const random = randomRun()

  it('jumps on step 11 with c = 2, then dips back', () => {
    const reward = ucb[2].reward
    expect(meanOf(reward.slice(0, 10))).toBeLessThan(0.15)
    expect(reward[10]).toBeGreaterThan(1)
    expect(reward[12]).toBeLessThan(reward[10] - 0.2)
    // A smaller c keeps more of the jump
    expect(ucb[1].reward[12]).toBeGreaterThan(reward[12])
  })

  it('beats random exploring with c from ½ to 2, and does best at ½ to 1', () => {
    for (const c of [0.5, 1, 2] as const) expect(meanOf(ucb[c].reward)).toBeGreaterThan(meanOf(random.reward) + 0.05)
    for (const c of [0.5, 1] as const) {
      expect(meanOf(ucb[c].reward)).toBeGreaterThan(meanOf(ucb[2].reward))
      expect(meanOf(ucb[c].reward)).toBeGreaterThan(meanOf(ucb[4].reward))
    }
  })

  it('loses to random exploring over the run when c is 4', () => {
    expect(meanOf(ucb[4].reward)).toBeLessThan(meanOf(random.reward))
  })
})
