import { describe, expect, it } from 'vitest'
import { ALWAYS_ROLL, FINISH, play, ROLL, SPOTS, state, STEP } from '../../components/explain/ladders'
import { best } from '../../components/explain/planning'
import { seeded } from '../../components/explain/random'
import {
  BEST,
  BEST_TURNS,
  bestFor,
  better,
  blank,
  CAP,
  differ,
  fromStart,
  game,
  GAMES,
  GREEDY,
  learn,
  list,
  loops,
  planOf,
  RANDOM,
  ROLLING,
  samples,
  STARTS,
  stepsOn,
  STORY,
  train,
  type Turn,
} from './model'

// A game written out by hand: from, move, to
const turns = (...moves: [number, number, number][]): Turn[] => moves.map(([from, move, to]) => ({ from, move, to }))

describe('the averages', () => {
  it('pick the better move of those tried, and roll on a blank or a tie', () => {
    const table = blank()
    expect(better(table, 5)).toBe(ROLL)
    table[state(5)][ROLL] = { mean: -9, count: 3 }
    expect(better(table, 5)).toBe(ROLL)
    table[state(5)][STEP] = { mean: -7, count: 1 }
    expect(better(table, 5)).toBe(STEP)
    table[state(5)][STEP] = { mean: -9, count: 1 }
    expect(better(table, 5)).toBe(ROLL)
    table[state(6)][STEP] = { mean: -4, count: 1 }
    expect(better(table, 6)).toBe(STEP)
  })

  it('count the turns left from the first time each move is made on a square', () => {
    const game = turns([1, ROLL, 2], [2, STEP, 13], [13, ROLL, 5], [5, ROLL, 7], [7, STEP, 16], [16, ROLL, FINISH])
    expect(samples(game).map((s) => s.left)).toEqual([6, 5, 4, 3, 2, 1])
    const twice = turns([4, ROLL, 6], [6, STEP, 7], [7, ROLL, 13], [13, ROLL, 5], [5, STEP, 6], [6, STEP, 7], [7, ROLL, FINISH])
    expect(samples(twice).filter((s) => s.square === 6)).toEqual([{ square: 6, move: STEP, left: 6 }])
    expect(samples(twice).filter((s) => s.square === 7)).toEqual([{ square: 7, move: ROLL, left: 5 }])
  })

  it('keep exact running averages of minus the turns', () => {
    let table = learn(blank(), turns([1, ROLL, 9], [9, ROLL, FINISH]))
    table = learn(table, turns([1, ROLL, 2], [2, ROLL, 6], [6, ROLL, 12], [12, ROLL, FINISH]))
    expect(table[state(1)][ROLL]).toEqual({ mean: -3, count: 2 })
    expect(table[state(9)][ROLL]).toEqual({ mean: -1, count: 1 })
    expect(table[state(1)][STEP].count).toBe(0)
  })
})

describe('the games', () => {
  it('never step when the averages only ever roll', () => {
    const random = seeded(2)
    let table = blank()
    for (let i = 0; i < 300; i++) {
      const played = game(table, GREEDY, random)
      expect(played[0].from).toBe(1)
      expect(played.every((t) => t.move === ROLL)).toBe(true)
      table = learn(table, played)
    }
  })

  it('start anywhere with either first move, given random starts', () => {
    const random = seeded(3)
    const firsts = Array.from({ length: 2000 }, () => game(blank(), STARTS, random)[0])
    expect(new Set(firsts.map((t) => t.from)).size).toBe(SPOTS.length)
    const steps = firsts.filter((t) => t.move === STEP).length
    expect(steps).toBeGreaterThan(900)
    expect(steps).toBeLessThan(1100)
  })

  it('make a random move about ε of the time, half of them steps', () => {
    const random = seeded(5)
    const moves = Array.from({ length: 400 }, () => game(blank(), RANDOM, random)).flat()
    const share = moves.filter((t) => t.move === STEP).length / moves.length
    expect(share).toBeGreaterThan(0.04)
    expect(share).toBeLessThan(0.06)
  })

  it('are cut off when a plan goes round for ever', () => {
    const table = blank()
    for (const sq of [18, 27]) table[state(sq)][STEP] = { mean: -1, count: 1 }
    const looping = planOf(table)
    expect(loops(looping)).toBe(true)
    expect(loops(BEST)).toBe(false)
    expect(fromStart(looping)).toBe(Infinity)
    const random = seeded(1)
    const long = Array.from({ length: 200 }, () => game(table, GREEDY, random)).filter((g) => g.length === CAP)
    expect(long.length).toBeGreaterThan(0)
  })
})

describe('what plans are worth, from the rules', () => {
  it('knows rolling everywhere and the best play, as the planning pages found them', () => {
    expect(BEST).toEqual(best())
    expect(stepsOn(BEST)).toEqual([1, 2, 6, 7, 16, 17, 18])
    expect(ROLLING.toFixed(1)).toBe('9.6')
    expect(BEST_TURNS.toFixed(1)).toBe('7.0')
  })

  it('agrees with playing many games', () => {
    for (const plan of [ALWAYS_ROLL, BEST]) {
      const random = seeded(11)
      const games = Array.from({ length: 20_000 }, () => play(plan, random).length)
      const mean = games.reduce((a, b) => a + b) / games.length
      expect(Math.abs(mean - fromStart(plan))).toBeLessThan(0.08)
    }
  })

  it('counts the random moves: the best play with one in ten takes 7.5 turns', () => {
    const random = seeded(12)
    const table = blank()
    for (const sq of stepsOn(BEST)) table[state(sq)][STEP] = { mean: -1, count: 1 }
    expect(planOf(table)).toEqual(BEST)
    const games = Array.from({ length: 20_000 }, () => game(table, RANDOM, random).length)
    const mean = games.reduce((a, b) => a + b) / games.length
    expect(Math.abs(mean - fromStart(BEST, RANDOM.epsilon))).toBeLessThan(0.08)
    expect(fromStart(BEST, RANDOM.epsilon).toFixed(1)).toBe('7.5')
  })

  it('finds the best plan for an explorer: the best play up to one in five, then rolling on 16', () => {
    for (const epsilon of [0.05, 0.1, 0.2]) expect(bestFor(epsilon)).toEqual(BEST)
    const wild = bestFor(1 / 3)
    expect(differ(wild, BEST)).toEqual([16])
    expect(fromStart(wild, 1 / 3)).toBeLessThan(fromStart(BEST, 1 / 3))
    expect(fromStart(BEST, 1 / 3) - fromStart(wild, 1 / 3)).toBeLessThan(0.01)
  })
})

describe('learning', () => {
  it('stays on rolling for ever when greedy, on every seed', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const run = train(GREEDY, 500, seed)
      expect(stepsOn(run.plans[500])).toEqual([])
    }
  })

  it('gets close to the best play with random starts or random moves, typically', () => {
    for (const settings of [STARTS, RANDOM]) {
      let total = 0
      const seeds = 20
      for (let seed = 1; seed <= seeds; seed++) total += fromStart(train(settings, GAMES, seed).plans[GAMES])
      expect(total / seeds).toBeLessThan(7.3)
    }
  })

  it('tells the story’s numbers', () => {
    const { greedy, starts, random } = STORY()
    expect(greedy.games[0].length).toBe(6)
    expect(fromStart(greedy.plans[GAMES]).toFixed(1)).toBe('9.6')
    expect(starts.plans[GAMES]).toEqual(BEST)
    expect(list(stepsOn(starts.plans[GAMES]))).toBe('1, 2, 6, 7, 16, 17 and 18')
    expect(fromStart(random.plans[GAMES]).toFixed(1)).toBe('7.0')
    expect(fromStart(random.plans[GAMES], RANDOM.epsilon).toFixed(1)).toBe('7.5')
    // The worked numbers: square 7 steps
    const [roll, step] = starts.tables[GAMES][state(7)]
    expect((-roll.mean).toFixed(1)).toBe('7.4')
    expect((-step.mean).toFixed(1)).toBe('5.5')
  })
})
