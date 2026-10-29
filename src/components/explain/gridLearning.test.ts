import { describe, expect, it } from 'vitest'
import { seeded } from './random'
import {
  blank,
  cellsOf,
  chances,
  firstWithin,
  minutes,
  nudge,
  onward,
  onwardOf,
  route,
  score,
  SHORTEST,
  START,
  STATION,
  story,
  STORY,
  tableAt,
  TOWN,
  train,
  walk,
  zoomStep,
} from './gridLearning'

describe('choosing', () => {
  it('gives ε-greedy chances: the best most of the time, every way some of the time', () => {
    const p = chances([-2, -3, -6, -8], 0.1)
    expect(p[0]).toBeCloseTo(0.925)
    expect(p[1]).toBeCloseTo(0.025)
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1)
    // Ties share the greedy part
    const tied = chances([-1, -1, -5, -5], 0.2)
    expect(tied[0]).toBeCloseTo(0.45)
    expect(tied[2]).toBeCloseTo(0.05)
  })
})

describe('the update', () => {
  it('matches the worked numbers on the page', () => {
    // A way scored −4, a minute's walk, step 0.5
    expect(nudge(-4, -1, -2, STORY)).toBeCloseTo(-3.5)
    expect(nudge(-4, -1, -3, STORY)).toBeCloseTo(-4)
    expect(nudge(-4, -1, -8, STORY)).toBeCloseTo(-6.5)
    // The robot vacuum
    expect(nudge(-6, -1, -4, STORY)).toBeCloseTo(-5.5)
  })

  it('looks onward by the way taken, the average, or the best', () => {
    const next = [-2, -3, -6, -8]
    expect(onward('sarsa', next, 2, 0.1)).toBe(-6)
    expect(onward('expected', next, null, 0.1)).toBeCloseTo(0.925 * -2 + 0.025 * (-3 - 6 - 8))
    expect(onward('q', next, 3, 0.1)).toBe(-2)
    // Nothing follows the end
    expect(onward('sarsa', [], null, 0.1)).toBe(0)
  })

  it('writes scores as the page does', () => {
    expect(score(-12.4)).toBe('−12')
    expect(score(-0.2)).toBe('0')
    expect(score(-2.28, 1)).toBe('−2.3')
  })
})

describe('walking the town', () => {
  it('ends at the station, and every step is one Sarsa update', () => {
    const table = blank(TOWN)
    const steps = walk(TOWN, table, 'sarsa', STORY, START, seeded(1))
    expect(steps.at(-1)!.next).toBe(TOWN.at(STATION))
    for (const step of steps) expect(step.after).toBeCloseTo(step.before + 0.5 * (step.reward + onwardOf(step, STORY) - step.before))
  })

  it('learns the shortest way with every method, from any seed', () => {
    for (const method of ['sarsa', 'expected', 'q'] as const) {
      for (let seed = 1; seed <= 5; seed++) {
        const { tables } = train(TOWN, method, { ...STORY, epsilon: 0.1 }, START, 150, seeded(seed), -Infinity, true)
        const way = route(TOWN, tables.at(-1)!, START)
        expect(way.at(-1), `${method} ${seed}`).toBe(TOWN.at(STATION))
        expect(way.length - 1).toBe(SHORTEST)
      }
    }
  })

  it('is the same every time from the same seed', () => {
    const a = train(TOWN, 'sarsa', STORY, START, 10, seeded(4))
    const b = train(TOWN, 'sarsa', STORY, START, 10, seeded(4))
    expect(a.walks.map(minutes)).toEqual(b.walks.map(minutes))
  })
})

describe('the story', () => {
  const training = story()

  it('tells the numbers its run gives', () => {
    expect(minutes(training.walks[0])).toBe(29)
    // The second morning is longer than the first: untried ways look better
    expect(minutes(training.walks[1])).toBeGreaterThan(minutes(training.walks[0]))
    const shortest = firstWithin(training.walks, SHORTEST)
    expect(shortest).toBe(13)
    expect(cellsOf(training.walks[shortest - 1]).length - 1).toBe(SHORTEST)
    // Random turns still cost minutes at the end
    expect(Math.max(...training.walks.slice(-10).map(minutes))).toBeGreaterThan(30)
    expect(route(TOWN, training.tables.at(-1)!, START).length - 1).toBe(SHORTEST)
  })

  it('stops on an update whose numbers are all something', () => {
    const { morning, index } = zoomStep(training)
    // Before the story reaches the shortest walk, as it is told
    expect(morning + 1).toBeLessThan(firstWithin(training.walks, SHORTEST))
    const step = training.walks[morning].steps[index]
    expect(step.before).toBeLessThanOrEqual(-1)
    expect(onwardOf(step, STORY)).toBeLessThanOrEqual(-1)
    // The way onward is the next step's way, and its score is what the update used
    const then = training.walks[morning].steps[index + 1]
    expect(then.state).toBe(step.next)
    expect(tableAt(training, morning, index + 1)[then.state][then.action]).toBeCloseTo(onwardOf(step, STORY))
  })

  it('rebuilds a morning’s table step by step', () => {
    const table = tableAt(training, 3, training.walks[3].steps.length)
    expect(table).toEqual(training.tables[4])
  })
})
