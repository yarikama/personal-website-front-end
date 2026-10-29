import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  average,
  DIE,
  FINISH,
  GUESS_GAMES,
  land,
  learnAll,
  meanMiss,
  playGame,
  playGames,
  samples,
  SQUARES,
  STORY_COUNT,
  STORY_GAMES,
  STORY_SEED,
  TRUE,
  typicalMiss,
  waypoints,
} from './model'

describe('the board', () => {
  it('moves by the roll, up ladders, down snakes, and stops at the finish', () => {
    expect(land(1, 1)).toBe(2)
    expect(land(1, 2)).toBe(13)
    expect(land(13, 4)).toBe(7)
    expect(land(10, 4)).toBe(4)
    expect(land(18, 6)).toBe(FINISH)
  })

  it('never lets you stand on a ladder’s foot or a snake’s head', () => {
    expect(SQUARES).not.toContain(3)
    expect(SQUARES).not.toContain(17)
    expect(SQUARES).toHaveLength(15)
  })

  it('plays the story’s two games as told', () => {
    expect(STORY_GAMES[0]).toEqual([1, 7, 13, 7, 12, 18, 20])
    expect(STORY_GAMES[1]).toEqual([1, 15, 7, 13, 19, 20])
    expect(waypoints([4, 2, 6, 6, 1])).toEqual([1, 5, 15, 17, 7, 13, 19, 20])
    expect(waypoints([6, 6, 4, 5, 6, 2])).toEqual([1, 7, 13, 17, 7, 12, 18, 20])
  })
})

describe('counting what followed', () => {
  it('counts back from the finish, every visit or only the first', () => {
    const every = samples(STORY_GAMES[0])
    expect(every.map((s) => s.left)).toEqual([6, 5, 4, 3, 2, 1])
    expect(every.filter((s) => s.square === 7).map((s) => s.left)).toEqual([5, 3])
    const first = samples(STORY_GAMES[0], true)
    expect(first.filter((s) => s.square === 7).map((s) => s.left)).toEqual([5])
  })

  it('keeps an exact running average', () => {
    expect(average(6, 4, 2)).toBe(5)
    expect(average(5, 8, 3)).toBe(6)
  })

  it('averages the story’s two games: the start square says 5.5', () => {
    const estimates = learnAll(STORY_GAMES)
    expect(estimates[1]).toEqual({ mean: 5.5, count: 2 })
    expect(estimates[7].count).toBe(3)
    expect(estimates[7].mean).toBeCloseTo(11 / 3)
    expect(learnAll(STORY_GAMES, true)[7]).toEqual({ mean: 4, count: 2 })
  })

  it('works the check’s numbers: 7 by first visit, 6 by every visit', () => {
    expect((9 + 5) / 2).toBe(7)
    expect((9 + 4 + 5) / 3).toBe(6)
  })
})

describe('the true values', () => {
  it('fit the board: one turn plus the average of the six rolls', () => {
    expect(TRUE[19]).toBeCloseTo(1)
    expect(TRUE[18]).toBeCloseTo(7 / 6)
    for (const square of SQUARES) {
      let total = 0
      for (let roll = 1; roll <= DIE; roll++) total += TRUE[land(square, roll)]
      expect(TRUE[square]).toBeCloseTo(1 + total / DIE, 9)
    }
    expect(TRUE[1].toFixed(1)).toBe('6.7')
  })

  it('are what averaging many games finds, by either count', () => {
    const games = playGames(seeded(5), 20_000)
    for (const firstVisit of [false, true]) {
      const estimates = learnAll(games, firstVisit)
      expect(estimates[1].count).toBe(20_000)
      for (const square of SQUARES) expect(Math.abs(estimates[square].mean - TRUE[square])).toBeLessThan(0.15)
      expect(meanMiss(estimates)).toBeLessThan(0.05)
    }
  })
})

describe('the guess: about 70 games for half a turn', () => {
  it('has a spread of about 4.1 turns from the start', () => {
    const random = seeded(9)
    const turns = Array.from({ length: 20_000 }, () => playGame(random).length - 1)
    const mean = turns.reduce((a, b) => a + b) / turns.length
    const spread = Math.sqrt(turns.reduce((a, b) => a + (b - mean) ** 2, 0) / turns.length)
    expect(spread).toBeGreaterThan(3.9)
    expect(spread).toBeLessThan(4.3)
    expect(Math.min(...turns)).toBe(2)
    expect(typicalMiss(4.1, GUESS_GAMES)).toBeCloseTo(0.49, 2)
  })

  it('is borne out: averages of 70 games miss by about half a turn', () => {
    const random = seeded(21)
    let squares = 0
    const batches = 1000
    for (let batch = 0; batch < batches; batch++) {
      const turns = Array.from({ length: GUESS_GAMES }, () => playGame(random).length - 1)
      squares += (turns.reduce((a, b) => a + b) / GUESS_GAMES - TRUE[1]) ** 2
    }
    const miss = Math.sqrt(squares / batches)
    expect(miss).toBeGreaterThan(0.42)
    expect(miss).toBeLessThan(0.55)
  })
})

describe('the story’s hundred games', () => {
  const estimates = learnAll([...STORY_GAMES, ...playGames(seeded(STORY_SEED), STORY_COUNT)])

  it('leave the start square close and square 2 rough, as the story says', () => {
    expect(estimates[1].count).toBe(102)
    expect(estimates[1].mean.toFixed(1)).toBe('6.6')
    expect(estimates[2].count).toBe(18)
    expect(estimates[2].mean.toFixed(1)).toBe('6.1')
    expect(TRUE[2].toFixed(1)).toBe('6.7')
  })
})
