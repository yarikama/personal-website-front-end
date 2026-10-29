import { describe, expect, it } from 'vitest'
import { seeded } from './random'
import {
  after,
  chancesAt,
  curve,
  estimates,
  expected,
  FISH,
  fishChance,
  forkAt,
  FORKS,
  fresh,
  gradient,
  LEFT,
  logGradient,
  mean,
  placeOf,
  reach,
  reinforce,
  RIGHT,
  scripted,
  SPREAD_SEED,
  spread,
  STORY_LUNCHES,
  story,
  TOP,
  walk,
  worth,
  type Habits,
} from './lunchHill'

const randomHabits = (seed: number): Habits => {
  const random = seeded(seed)
  return Array.from({ length: FORKS }, () => [random() * 2 - 1, random() * 2 - 1])
}

describe('the hill', () => {
  it('numbers its forks row by row and ends each walk at the stall its right turns count', () => {
    for (let fork = 0; fork < FORKS; fork++) {
      const { row, k } = placeOf(fork)
      expect(forkAt(row, k)).toBe(fork)
    }
    expect(after(0, RIGHT)).toEqual({ fork: forkAt(1, 1) })
    expect(after(forkAt(3, 2), RIGHT)).toEqual({ stall: 3 })
    expect(scripted([RIGHT, LEFT, RIGHT, RIGHT], 8).stall).toBe(3)
    expect(scripted([RIGHT, RIGHT, RIGHT, RIGHT], 8).stall).toBe(FISH)
  })

  it('at even habits, ends at each stall 1, 4, 6, 4 and 1 times in 16', () => {
    expect(reach(fresh()).stalls.map((p) => p * 16)).toEqual([1, 4, 6, 4, 1])
    expect(fishChance(fresh())).toBe(1 / 16)
  })

  it('works out what each fork and turn is worth at even habits, as the page says', () => {
    const { v, q } = worth(fresh())
    expect(v[forkAt(3, 0)]).toBe(2.5)
    expect(v[forkAt(3, 3)]).toBe(7)
    expect(q[TOP][RIGHT]).toBe(5.375)
    expect(q[TOP][LEFT]).toBe(3.75)
    expect(v[TOP]).toBe(4.5625)
    expect(expected(fresh())).toBe(4.5625)
  })

  it('walks with the chances its habits give', () => {
    const habits = randomHabits(3)
    const random = seeded(4)
    const ends = Array<number>(5).fill(0)
    const n = 40000
    for (let i = 0; i < n; i++) ends[walk(habits, random).stall] += 1
    reach(habits).stalls.forEach((p, s) => expect(ends[s] / n).toBeCloseTo(p, 2))
  })
})

describe('the policy gradient theorem', () => {
  it('gives the slope of J without the slope of how often each fork is reached', () => {
    for (const seed of [1, 2, 3]) {
      const habits = randomHabits(seed)
      const theorem = gradient(habits)
      for (let fork = 0; fork < FORKS; fork++) {
        for (const b of [LEFT, RIGHT]) {
          const nudged = habits.map((h) => [...h])
          nudged[fork][b] += 1e-6
          const less = habits.map((h) => [...h])
          less[fork][b] -= 1e-6
          const numeric = (expected(nudged) - expected(less)) / 2e-6
          expect(theorem[fork][b]).toBeCloseTo(numeric, 6)
        }
      }
    }
  })

  it('gives +0.41 for turning right at the top at even habits: ½ × (5.375 − 4.5625)', () => {
    expect(gradient(fresh())[TOP][RIGHT]).toBeCloseTo(0.40625, 10)
  })

  it('is what REINFORCE’s step averages to, with or without a baseline', () => {
    const habits = randomHabits(7)
    const theorem = gradient(habits)
    for (const baseline of [0, 5]) {
      const random = seeded(9)
      const n = 60000
      const sum = habits.map(() => [0, 0])
      for (let i = 0; i < n; i++) {
        const lunch = walk(habits, random)
        lunch.forks.forEach((fork, t) => {
          logGradient(chancesAt(habits, fork), lunch.turns[t]).forEach((g, a) => {
            sum[fork][a] += (lunch.score - baseline) * g
          })
        })
      }
      sum.forEach((row, fork) => row.forEach((total, a) => expect(total / n).toBeCloseTo(theorem[fork][a], 1)))
    }
  })
})

describe('REINFORCE', () => {
  it('has a ∇ log π that adds up to 0 over the turns', () => {
    const g = logGradient([0.3, 0.7], RIGHT)
    expect(g[0]).toBeCloseTo(-0.3, 12)
    expect(g[1]).toBeCloseTo(0.3, 12)
  })

  it('pushes every turn of a good walk up, the mistaken one too', () => {
    const lunch = scripted([RIGHT, LEFT, RIGHT, RIGHT], 8)
    const next = reinforce(fresh(), lunch, 0.1, 5)
    lunch.forks.forEach((fork, t) => {
      const turn = lunch.turns[t]
      expect(chancesAt(next, fork)[turn]).toBeGreaterThan(0.5)
    })
    // The left at the second fork, by 0.1 × 3 × ½ each way
    expect(next[forkAt(1, 1)][LEFT]).toBeCloseTo(0.15, 12)
  })
})

describe('the story', () => {
  const days = story()

  it('tells Monday, Tuesday and Wednesday with the page’s numbers', () => {
    const [monday, tuesday, wednesday] = days
    expect(monday.surprise).toBe(0)
    expect(monday.score).toBe(5)
    expect(tuesday.usual).toBe(3.5)
    expect(tuesday.surprise).toBe(-1.5)
    expect(wednesday.stall).toBe(3)
    expect(wednesday.usual).toBe(5)
    expect(wednesday.surprise).toBe(3)
  })

  it('ends at the fish stall about nine lunches in ten, as most people do', () => {
    const end = days.at(-1)!
    expect(fishChance(end.habits)).toBeGreaterThan(0.88)
    expect(fishChance(end.habits)).toBeLessThan(0.92)
    expect(days.slice(-30).filter((day) => day.stall === FISH).length).toBe(27)
    expect(curve(200, STORY_LUNCHES, 0.1, true, 1).at(-1)).toBeGreaterThan(0.85)
  })
})

describe('the noise in one walk', () => {
  const even = fresh()
  const truth = gradient(even)[TOP][RIGHT]
  const usual = expected(even)
  const runs = {
    none: estimates(even, 0, 120, 1, SPREAD_SEED),
    usual: estimates(even, usual, 120, 1, SPREAD_SEED),
    none10: estimates(even, 0, 120, 10, SPREAD_SEED),
    usual10: estimates(even, usual, 120, 10, SPREAD_SEED),
  }

  it('averages near the true slope in every setting the figure shows', () => {
    Object.values(runs).forEach((values) => expect(Math.abs(mean(values) - truth)).toBeLessThan(0.08))
  })

  it('narrows to less than half the spread with the usual, and again over ten walks', () => {
    expect(spread(runs.usual)).toBeLessThan(spread(runs.none) / 2)
    expect(spread(runs.none10)).toBeLessThan(spread(runs.none) / 2.5)
    expect(spread(runs.usual10)).toBeLessThan(spread(runs.none10) / 2)
  })
})

describe('many learners', () => {
  it('find the fish stall with the usual as a baseline, and often lock on elsewhere without it', () => {
    for (const alpha of [0.05, 0.1, 0.2]) {
      const withUsual = curve(200, 300, alpha, true, 1)
      const without = curve(200, 300, alpha, false, 1)
      expect(withUsual.at(-1)).toBeGreaterThan(without.at(-1)! + 0.25)
    }
    expect(curve(200, STORY_LUNCHES, 0.1, false, 1).at(-1)).toBeLessThan(0.55)
  })
})
