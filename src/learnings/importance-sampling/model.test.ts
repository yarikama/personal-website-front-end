import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  COIN,
  drive,
  driveMany,
  episode,
  FRIEND,
  legRatio,
  ordinary,
  outcomes,
  plain,
  ratio,
  reachesStart,
  spread,
  step,
  STORY_RUN,
  STORY_TRIPS,
  tailsOf,
  tailStart,
  TRUE,
  tripMinutes,
  value,
  weighted,
  YOU,
  WEIGHTED_ON_AVERAGE,
  ONE_TRIP,
  type Running,
} from './model'

describe('the commute', () => {
  it('takes you 36 minutes on average, and your friend 40.5', () => {
    expect(TRUE).toBe(36)
    expect(FRIEND).toBe(40.5)
    // The same, from every way a trip can go
    const mean = (main: number) => outcomes(main).reduce((total, o) => total + o.chance * tripMinutes(o.trip), 0)
    expect(mean(YOU)).toBeCloseTo(36, 12)
    expect(mean(COIN)).toBeCloseTo(40.5, 12)
    expect(outcomes(COIN).reduce((total, o) => total + o.chance, 0)).toBeCloseTo(1, 12)
  })

  it('drives as the odds say', () => {
    const trips = driveMany(seeded(2), COIN, 20_000)
    const legs = trips.flat()
    const main = legs.filter((leg) => leg.turn === 'main')
    expect(main.length / legs.length).toBeCloseTo(0.5, 1)
    expect(main.filter((leg) => leg.jammed).length / main.length).toBeCloseTo(0.25, 1)
    expect(legs.every((leg) => leg.turn === 'main' || !leg.jammed)).toBe(true)
    expect(plain(trips)).toBeCloseTo(40.5, 0)
  })
})

describe('the weight', () => {
  it('is your chance of each turn over your friend’s, multiplied', () => {
    expect(legRatio('main', COIN)).toBeCloseTo(1.6)
    expect(legRatio('side', COIN)).toBeCloseTo(0.4)
    expect(STORY_TRIPS.map((trip) => ratio(trip, COIN))).toEqual(
      [1.024, 4.096, 0.256, 0.256, 0.256].map((w) => expect.closeTo(w, 12))
    )
    expect(STORY_TRIPS.map(tripMinutes)).toEqual([32, 36, 52, 40, 40])
  })

  it('is the chance of the whole trip under you over under your friend: the jams cancel', () => {
    for (const behaviour of [0.1, 0.5, 0.95]) {
      const theirs = new Map(outcomes(behaviour).map((o) => [JSON.stringify(o.trip), o.chance]))
      for (const { trip, chance } of outcomes(YOU)) {
        expect(ratio(trip, behaviour)).toBeCloseTo(chance / theirs.get(JSON.stringify(trip))!, 9)
      }
    }
    // A jam changes the minutes, never the weight
    const clear = [{ turn: 'main' as const, jammed: false }]
    const jammed = [{ turn: 'main' as const, jammed: true }]
    expect(ratio(clear, COIN)).toBe(ratio(jammed, COIN))
  })

  it('answers the guess: an all-main-road trip counts about 4 times', () => {
    expect(ratio(STORY_TRIPS[1], COIN).toFixed(1)).toBe('4.1')
    expect(0.8 ** 3 / 0.5 ** 3).toBeCloseTo(4.096)
  })
})

describe('ordinary importance sampling', () => {
  it('is right on average, from a single trip, for any friend who covers your turns', () => {
    for (const behaviour of [0.1, 0.3, 0.5, 0.95]) {
      for (const junctions of [3, 6]) {
        const expected = outcomes(behaviour, junctions).reduce(
          (total, o) => total + o.chance * ratio(o.trip, behaviour) * tripMinutes(o.trip),
          0
        )
        expect(expected).toBeCloseTo(value(YOU, junctions), 9)
      }
    }
  })

  it('is right on average when sampled too', () => {
    const random = seeded(8)
    const estimates = Array.from({ length: 40_000 }, () => ordinary([drive(random, COIN)], COIN))
    expect(estimates.reduce((a, b) => a + b, 0) / estimates.length).toBeCloseTo(36, 0)
    // And one trip can say almost anything: 0.4³ × 48 to 1.6³ × 60
    expect(ONE_TRIP.low).toBeCloseTo(0.064 * 48, 9)
    expect(ONE_TRIP.high).toBeCloseTo(4.096 * 60, 9)
    expect(Math.max(...estimates)).toBeGreaterThan(90)
    expect(Math.min(...estimates)).toBeLessThan(5)
  })
})

describe('weighted importance sampling', () => {
  it('works the story’s five trips as told', () => {
    expect(plain(STORY_TRIPS)).toBe(40)
    expect(ordinary(STORY_TRIPS, COIN)).toBeCloseTo(214.016 / 5, 9)
    expect(ordinary(STORY_TRIPS, COIN).toFixed(1)).toBe('42.8')
    expect(weighted(STORY_TRIPS, COIN)).toBeCloseTo(214.016 / 5.888, 9)
    expect(weighted(STORY_TRIPS, COIN).toFixed(1)).toBe('36.3')
  })

  it('one trip at a time: 32, then 35.2, then 36, and the same answer as all at once', () => {
    let state: Running = { estimate: 0, weight: 0 }
    const after = STORY_TRIPS.map((trip) => (state = step(state, tripMinutes(trip), ratio(trip, COIN))).estimate)
    expect(after[0]).toBeCloseTo(32, 9)
    expect(after[1]).toBeCloseTo(35.2, 9)
    expect(after[2]).toBeCloseTo(36, 9)
    expect(after[4]).toBeCloseTo(weighted(STORY_TRIPS, COIN), 9)
    expect(state.weight).toBeCloseTo(5.888, 9)
    // A trip of no weight changes nothing
    expect(step(state, 99, 0)).toBe(state)
  })

  it('is biased at first, toward your friend’s commute, and the bias fades', () => {
    const { one, two } = WEIGHTED_ON_AVERAGE
    // After one trip it says that trip's minutes, whatever the weight
    expect(one).toBeCloseTo(FRIEND, 9)
    expect(two.toFixed(1)).toBe('38.7')
    // Sampled pairs agree with the worked-out average
    const pairs = seeded(12)
    let sum = 0
    for (let i = 0; i < 40_000; i++) sum += weighted(driveMany(pairs, COIN, 2), COIN)
    expect(sum / 40_000).toBeCloseTo(two, 0)
    const random = seeded(3)
    const many = Array.from({ length: 2000 }, () => weighted(driveMany(random, COIN, 100), COIN))
    expect(Math.abs(many.reduce((a, b) => a + b, 0) / many.length - 36)).toBeLessThan(0.1)
  })

  it('misses by far less than ordinary, and both miss more the less your friend drives like you', () => {
    const coin = spread(COIN, 3)
    expect(coin.miss.weighted).toBeLessThan(coin.miss.ordinary / 2)
    expect(coin.miss.ordinary.toFixed(1)).toBe('1.4')
    expect(coin.miss.weighted.toFixed(1)).toBe('0.5')
    const same = spread(YOU, 3)
    expect(same.miss.ordinary).toBeCloseTo(same.miss.weighted, 12)
    expect(same.heaviest).toBeCloseTo(1, 12)
    expect(spread(0.3, 3).miss.ordinary).toBeGreaterThan(coin.miss.ordinary)
    expect(spread(0.1, 3).miss.ordinary).toBeGreaterThan(spread(0.3, 3).miss.ordinary)
    expect(spread(COIN, 12).miss.ordinary).toBeGreaterThan(spread(COIN, 6).miss.ordinary)
    expect(spread(0.1, 3).heaviest).toBeCloseTo(512, 9)
  })

  it('cannot recover turns your friend never takes', () => {
    // A friend who always takes the main road: the log says what your
    // all-main-road trips take, 33 minutes, and nothing about the rest
    const random = seeded(4)
    const trips = driveMany(random, 1, 4000)
    expect(weighted(trips, 1)).toBeCloseTo(33, 0)
    expect(ordinary(trips, 1)).toBeCloseTo(0.512 * 33, 0)
  })
})

describe('the story’s thousand trips', () => {
  it('lets ordinary wander and weighted stay close, both ending near 36', () => {
    const at = (values: number[], trip: number) => values[trip - 1].toFixed(1)
    expect(at(STORY_RUN.ordinary, 10)).toBe('56.4')
    expect(at(STORY_RUN.weighted, 10)).toBe('36.6')
    expect(at(STORY_RUN.ordinary, 1000)).toBe('35.2')
    expect(at(STORY_RUN.weighted, 1000)).toBe('36.1')
    const worst = (values: number[]) => Math.max(...values.slice(19).map((v) => Math.abs(v - 36)))
    expect(worst(STORY_RUN.ordinary)).toBeGreaterThan(10)
    expect(worst(STORY_RUN.weighted)).toBeLessThan(2)
  })
})

describe('off-policy control', () => {
  it('teaches from the last off-target move on', () => {
    expect(tailStart([false, true, false, true, false, false])).toBe(3)
    expect(tailStart([false, false, false])).toBe(0)
    expect(tailStart([true, false])).toBe(0)
  })

  it('reaches the first move as often as the odds say, and rarely in long episodes', () => {
    const random = seeded(6)
    for (const [length, epsilon] of [
      [10, 0.1],
      [30, 0.1],
    ] as const) {
      const runs = 20_000
      let first = 0
      for (let run = 0; run < runs; run++) if (tailStart(episode(random, length, epsilon)) === 0) first += 1
      expect(first / runs).toBeCloseTo(reachesStart(length, epsilon), 2)
    }
    expect(reachesStart(10, 0.1).toFixed(2)).toBe('0.50')
    expect(reachesStart(100, 0.1)).toBeLessThan(0.001)
    expect(tailsOf(100, 0.1).taught).toBeLessThan(0.15)
    expect(tailsOf(10, 0.1).taught).toBeGreaterThan(0.7)
  })
})
