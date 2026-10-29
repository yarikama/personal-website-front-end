import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  averageReturns,
  BIKE,
  BIKE_ANSWERS,
  BUS,
  COUNT,
  CURVES,
  estimateModel,
  FAST,
  FIRST_GUESS,
  firstGuesses,
  MISSES,
  modelNumbers,
  replay,
  returns,
  sampleNotebook,
  sampleTrip,
  settled,
  SLOW,
  solveModel,
  solveSteps,
  spreadOf,
  STATION,
  STORY,
  STORY_EPISODES,
  STORY_MC,
  STORY_MODEL,
  STORY_TD,
  tdNumbers,
  total,
  tripMoves,
  trueValues,
  type Episode,
  type World,
} from './model'

const STEP = 0.05

describe('a trip', () => {
  it('is three moves: to the station, onto a train, to work', () => {
    const moves = tripMoves({ by: BUS, leg: 15, train: FAST, ride: 10 })
    expect(moves).toEqual([
      { from: BUS, reward: 15, to: STATION },
      { from: STATION, reward: 0, to: FAST },
      { from: FAST, reward: 10, to: null },
    ])
    expect(returns(moves)).toEqual([
      { state: BUS, left: 25 },
      { state: STATION, left: 10 },
      { state: FAST, left: 10 },
    ])
  })
})

describe('the story’s notebook', () => {
  it('averages 30 minutes by bus and 42 by bike', () => {
    expect(STORY.filter((trip) => trip.by === BUS).map(total)).toEqual([25, 25, 45, 25])
    expect(STORY_MC).toEqual([30, 42, 20, 10, 30])
  })

  it('suggests a model: the fast train half the time, whoever waits', () => {
    expect(STORY_MODEL.next[STATION][FAST]).toBe(0.5)
    expect(STORY_MODEL.next[STATION][SLOW]).toBe(0.5)
    expect(STORY_MODEL.next[BIKE][STATION]).toBe(1)
    expect(STORY_MODEL.reward[BIKE]).toBe(12)
    expect(STORY_MODEL.reward[BUS]).toBe(15)
    expect(STORY_MODEL.ends[SLOW]).toBe(1)
  })

  it('whose values put the bike ahead: 12 + 20 against 15 + 20', () => {
    expect(STORY_TD.map((v) => Math.round(v * 1e9) / 1e9)).toEqual([35, 32, 20, 10, 30])
  })
})

describe('solving a model exactly', () => {
  it('handles a state that can come back to itself', () => {
    // From 0: 1 minute, then back to 0 half the time, else the end: V = 1 + V/2
    const episodes: Episode[] = [
      [
        { from: 0, reward: 1, to: 0 },
        { from: 0, reward: 1, to: null },
      ],
    ]
    expect(solveModel(estimateModel(episodes, 1))[0]).toBeCloseTo(2, 9)
  })

  it('leaves a state the notes never visit at its guess', () => {
    const onlyBus = [tripMoves({ by: BUS, leg: 15, train: FAST, ride: 10 })]
    expect(solveModel(estimateModel(onlyBus, COUNT), FIRST_GUESS)[BIKE]).toBe(FIRST_GUESS)
  })
})

describe('batch updating', () => {
  const notebooks = (world: World) => Array.from({ length: 40 }, (_, k) => sampleNotebook(seeded(500 + k), world, 10))

  it('settles TD(0) on the values of the model the notes suggest, solved exactly', () => {
    for (const world of ['own', 'timed'] as const) {
      for (const notebook of [STORY, ...notebooks(world)]) {
        const episodes = notebook.map(tripMoves)
        const passes = replay(episodes, 'td', STEP, firstGuesses(), 1e-9)
        const exact = solveModel(estimateModel(episodes, COUNT), FIRST_GUESS)
        passes[passes.length - 1].forEach((value, s) => expect(value).toBeCloseTo(exact[s], 5))
      }
    }
  })

  it('settles Monte Carlo on the average return after each state', () => {
    for (const world of ['own', 'timed'] as const) {
      for (const notebook of [STORY, ...notebooks(world)]) {
        const episodes = notebook.map(tripMoves)
        const passes = replay(episodes, 'mc', STEP, firstGuesses(), 1e-9)
        const average = averageReturns(episodes, COUNT)
        passes[passes.length - 1].forEach((value, s) => expect(value).toBeCloseTo(average[s] ?? FIRST_GUESS, 5))
      }
    }
  })

  it('gives Monte Carlo the number closest to the returns it saw', () => {
    const bikeReturns = STORY_EPISODES.flatMap(returns).filter((r) => r.state === BIKE).map((r) => r.left)
    const squared = (v: number) => bikeReturns.reduce((sum, left) => sum + (left - v) ** 2, 0)
    expect(squared(STORY_MC[BIKE])).toBeLessThan(squared(STORY_MC[BIKE] + 0.1))
    expect(squared(STORY_MC[BIKE])).toBeLessThan(squared(STORY_MC[BIKE] - 0.1))
    // TD's answer fits the bike's own trips worse, and is still the better bet
    expect(squared(STORY_TD[BIKE])).toBeGreaterThan(squared(STORY_MC[BIKE]))
  })

  it('agrees with settled(), which the figures draw', () => {
    const notebook = sampleNotebook(seeded(3), 'own', 10)
    const { td, mc } = settled(notebook)
    const episodes = notebook.map(tripMoves)
    expect(replay(episodes, 'td', STEP, firstGuesses(), 1e-9).at(-1)![BIKE]).toBeCloseTo(td[BIKE], 5)
    expect(replay(episodes, 'mc', STEP, firstGuesses(), 1e-9).at(-1)![BIKE]).toBeCloseTo(mc[BIKE], 5)
  })
})

describe('the two worlds', () => {
  it('have the true values the arithmetic says', () => {
    expect(trueValues('own')).toEqual([35, 32, 20, 10, 30])
    // Timed bus: 15 + 0.8 × 10 + 0.2 × 30; bike: 12 + 0.2 × 10 + 0.8 × 30
    trueValues('timed').forEach((value, s) => expect(value).toBeCloseTo([29, 38, 17, 10, 30][s], 9))
  })

  it('are what many trips average to', () => {
    for (const world of ['own', 'timed'] as const) {
      const random = seeded(11)
      const sums = [0, 0]
      const counts = [0, 0]
      for (let i = 0; i < 40_000; i++) {
        const trip = sampleTrip(random, world)
        sums[trip.by] += total(trip)
        counts[trip.by] += 1
      }
      expect(counts[BUS] / 40_000).toBeCloseTo(0.75, 1)
      expect(sums[BUS] / counts[BUS]).toBeCloseTo(trueValues(world)[BUS], 0)
      expect(sums[BIKE] / counts[BIKE]).toBeCloseTo(trueValues(world)[BIKE], 0)
    }
  })

  it('favour TD when trains run on their own, and Monte Carlo when the bus is timed', () => {
    expect(MISSES.own.td).toBeLessThan(MISSES.own.mc * 0.7)
    expect(MISSES.timed.mc).toBeLessThan(MISSES.timed.td * 0.75)
    expect(Math.round(MISSES.own.td)).toBe(3)
    expect(Math.round(MISSES.own.mc)).toBe(6)
    expect(Math.round(MISSES.timed.td)).toBe(7)
    expect(Math.round(MISSES.timed.mc)).toBe(5)
  })

  it('tell the story’s hundred notebooks: the bike’s TD numbers bunch, its Monte Carlo ones scatter', () => {
    expect(BIKE_ANSWERS).toHaveLength(100)
    const td = spreadOf(BIKE_ANSWERS.map((a) => a.td), 32)
    const mc = spreadOf(BIKE_ANSWERS.map((a) => a.mc), 32)
    expect(Math.round(td)).toBe(3)
    expect(Math.round(mc)).toBe(8)
  })
})

describe('learning online', () => {
  it('puts TD ahead of Monte Carlo for every step tried', () => {
    for (const { td, mc } of CURVES) {
      expect(td[0]).toBe(mc[0])
      for (let k = 5; k <= 100; k += 5) expect(td[k]).toBeLessThan(mc[k])
    }
  })

  it('starts from the same guess everywhere', () => {
    expect(firstGuesses()).toEqual([25, 25, 25, 25, 25])
    // Off by 10 on the bus and 7 on the bike: the root mean square
    expect(CURVES[0].td[0]).toBeCloseTo(Math.sqrt((10 ** 2 + 7 ** 2) / 2), 9)
  })
})

describe('the check yourself: a fishing log', () => {
  // Creek 0, Lake 1, North shore 2, South shore 3; fish as the reward
  const CREEK = 0
  const LAKE = 1
  const NORTH = 2
  const SOUTH = 3
  const shore = (at: number, fish: number): Episode => [
    { from: LAKE, reward: 0, to: at },
    { from: at, reward: fish, to: null },
  ]
  const log: Episode[] = [
    [{ from: CREEK, reward: 0, to: LAKE }, ...shore(NORTH, 1)],
    ...[2, 3, 2, 2, 2].map((fish) => shore(NORTH, fish)),
    ...[6, 6, 6, 6].map((fish) => shore(SOUTH, fish)),
  ]

  it('gives the creek 3.6 by TD and 1 by Monte Carlo', () => {
    const td = solveModel(estimateModel(log, 4))
    expect(td[NORTH]).toBeCloseTo(2, 9)
    expect(td[SOUTH]).toBeCloseTo(6, 9)
    expect(td[LAKE]).toBeCloseTo(0.6 * 2 + 0.4 * 6, 9)
    expect(td[CREEK]).toBeCloseTo(3.6, 9)
    expect(averageReturns(log, 4)[CREEK]).toBe(1)
    const passes = replay(log, 'td', 0.05, [0, 0, 0, 0], 1e-10)
    expect(passes.at(-1)![CREEK]).toBeCloseTo(3.6, 5)
  })
})

describe('what solving the model costs', () => {
  it('grows as n² numbers and n³ steps, against n for TD', () => {
    expect(modelNumbers(10_000)).toBe(1e8)
    expect(solveSteps(10_000)).toBe(1e12)
    expect(tdNumbers(10_000)).toBe(1e4)
  })
})
