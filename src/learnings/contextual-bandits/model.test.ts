import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  blindBest,
  commute,
  favourite,
  lookingBest,
  meanOf,
  ON_TIME,
  onTimeCount,
  RAIN,
  routeAverage,
  shown,
  signs,
  smooth,
  story,
  STORY_MORNINGS,
  tables,
} from './model'

describe('the arithmetic', () => {
  it('blurs each route over both skies when you never look: 60% and 70%', () => {
    // ½ × 90% + ½ × 30%, ½ × 60% + ½ × 80%
    expect(routeAverage(0)).toBeCloseTo(0.6)
    expect(routeAverage(1)).toBeCloseTo(0.7)
    expect(blindBest()).toBeCloseTo(0.7)
  })

  it('takes the best route for each sky when you look: 85%', () => {
    // ½ × 90% + ½ × 80%
    expect(lookingBest()).toBeCloseTo(0.85)
  })

  it('never does worse looking, and gains nothing when one route is best in every sky', () => {
    expect(lookingBest([[0.9, 0.6], [0.7, 0.4]], 0.3)).toBeCloseTo(blindBest([[0.9, 0.6], [0.7, 0.4]], 0.3))
    for (const rain of [0, 0.2, 0.5, 0.9]) expect(lookingBest(ON_TIME, rain)).toBeGreaterThanOrEqual(blindBest(ON_TIME, rain))
  })
})

describe('a commuter', () => {
  it('rains about RAIN of the mornings', () => {
    const { mornings } = commute(seeded(1), 4000, false)
    expect(mornings.filter((m) => m.sky === 1).length / 4000).toBeCloseTo(RAIN, 1)
  })

  it('is on time about as often as the arithmetic says, less a little for exploring', () => {
    const blind = commute(seeded(2), 6000, false)
    const look = commute(seeded(2), 6000, true)
    expect(onTimeCount(blind) / 6000).toBeGreaterThan(0.66)
    expect(onTimeCount(blind) / 6000).toBeLessThan(0.71)
    expect(onTimeCount(look) / 6000).toBeGreaterThan(0.8)
    expect(onTimeCount(look) / 6000).toBeLessThan(0.86)
  })

  it('keeps one table never looking and one per sky looking, counting every morning once', () => {
    const blind = commute(seeded(3), 50, false)
    const look = commute(seeded(3), 50, true)
    expect(tables(blind, 50)).toHaveLength(1)
    expect(tables(look, 50)).toHaveLength(2)
    const rides = (t: ReturnType<typeof tables>) => t.flat().reduce((sum, s) => sum + s.rides, 0)
    expect(rides(tables(blind, 50))).toBe(50)
    expect(rides(tables(look, 20))).toBe(20)
    // Only that sky's mornings in each table
    const dry = look.mornings.slice(0, 50).filter((m) => m.sky === 0).length
    expect(tables(look, 50)[0].reduce((sum, s) => sum + s.rides, 0)).toBe(dry)
  })

  it('tries each route once in a table before choosing', () => {
    const { mornings } = commute(seeded(4), 2, false)
    expect(mornings.map((m) => m.route)).toEqual([0, 1])
  })

  it('has no favourite until every route is ridden', () => {
    expect(favourite([{ onTime: 1, rides: 1 }, { onTime: 0, rides: 0 }])).toBeNull()
    expect(favourite([{ onTime: 3, rides: 5 }, { onTime: 7, rides: 10 }])).toBe(1)
  })
})

describe('the story', () => {
  const { blind, look } = story()

  it('lands on the arithmetic: 42 of 60 never looking, 51 of 60 looking', () => {
    expect(onTimeCount(blind)).toBe(42)
    expect(onTimeCount(look)).toBe(51)
    expect(onTimeCount(blind) / STORY_MORNINGS).toBeCloseTo(blindBest(), 2)
    expect(onTimeCount(look) / STORY_MORNINGS).toBeCloseTo(lookingBest(), 2)
  })

  it('settles on the train never looking, with the bike ridden enough to have a score', () => {
    const [table] = tables(blind, STORY_MORNINGS)
    expect(favourite(table)).toBe(1)
    expect(table[0].rides).toBeGreaterThan(15)
    // 15 of 23 and 27 of 37: 65% and 73%
    expect(table).toEqual([
      { onTime: 15, rides: 23 },
      { onTime: 27, rides: 37 },
    ])
  })

  it('learns dry → bike, rain → train looking first', () => {
    const [dry, wet] = tables(look, STORY_MORNINGS)
    expect(favourite(dry)).toBe(0)
    expect(favourite(wet)).toBe(1)
  })

  it('has a rule from the tables within the first 8 mornings, as the first steps play', () => {
    expect(tables(look, 8).every((table) => table.every((score) => score.rides > 0))).toBe(true)
  })
})

describe('machines that take turns', () => {
  const quick = { runs: 150 }

  it('is the same problem for both learners with one machine', () => {
    const one = signs(1, false, quick)
    const per = signs(1, true, quick)
    expect(Math.abs(meanOf(one.best, 900) - meanOf(per.best, 900))).toBeLessThan(0.1)
  })

  it('leaves one table far behind a table per sign once there are several machines', () => {
    const one = signs(4, false, quick)
    const per = signs(4, true, quick)
    expect(meanOf(one.best, 900)).toBeLessThan(0.3)
    expect(meanOf(per.best, 900)).toBeGreaterThan(0.6)
    expect(meanOf(per.reward, 900)).toBeGreaterThan(meanOf(one.reward, 900) + 0.4)
  })

  it('learns more slowly per sign with more signs', () => {
    const two = signs(2, true, quick)
    const eight = signs(8, true, quick)
    expect(meanOf(eight.best.slice(0, 300))).toBeLessThan(meanOf(two.best.slice(0, 300)))
  })

  it('draws the machines the same way every time, each with its best arm marked', () => {
    const a = shown(4)
    const b = shown(4)
    expect(a).toEqual(b)
    a.means.forEach((row, m) => expect(row[a.tops[m]]).toBe(Math.max(...row)))
    expect(new Set(a.order).size).toBe(4)
  })
})

describe('the helpers', () => {
  it('smooth keeps the length and the level', () => {
    expect(smooth([1, 1, 1, 1], 3)).toEqual([1, 1, 1, 1])
    expect(smooth([0, 3, 0], 3)).toEqual([1.5, 1, 1.5])
  })
})
