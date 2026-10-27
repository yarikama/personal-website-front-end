import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  backups,
  DRIVE,
  EMPTY,
  newLearner,
  nudge,
  openCells,
  opponentMove,
  openingValues,
  place,
  playGame,
  train,
  valueOf,
  winner,
  winRates,
} from './model'

describe('the rule', () => {
  it('moves the old guess a step of the way toward the next', () => {
    expect(nudge(0.5, 0.9, 0.1)).toBeCloseTo(0.54)
    expect(nudge(0.5, 0.9, 0.5)).toBeCloseTo(0.7)
    expect(nudge(0.5, 0.9, 1)).toBeCloseTo(0.9)
    expect(nudge(30, 35, 0.5)).toBe(32.5)
  })

  it('tells the story’s numbers: 40 minutes, moved halfway to 60', () => {
    expect(nudge(DRIVE.first, DRIVE.jam, DRIVE.step)).toBe(50)
  })
})

describe('tic-tac-toe', () => {
  it('knows who has won', () => {
    expect(winner('XXX.OO...')).toBe('X')
    expect(winner('X.OXO.O..')).toBe('O')
    expect(winner('XOXXOOOXX')).toBe('draw')
    expect(winner(EMPTY)).toBeNull()
  })

  it('places marks and lists open cells', () => {
    expect(place(EMPTY, 4, 'X')).toBe('....X....')
    expect(openCells('XO.X.....')).toEqual([2, 4, 5, 6, 7, 8])
  })

  it('has an opponent that wins when it can and blocks when it must', () => {
    const random = seeded(1)
    // O can finish the middle column
    expect(opponentMove('XO.XO....', random)).toBe(7)
    // O cannot win, but X threatens the top row
    expect(opponentMove('XX..O....', random)).toBe(2)
  })

  it('values finished games by how they ended, and unseen boards at 0.5', () => {
    const learner = newLearner(0.1, 0)
    expect(valueOf(learner, 'XXXOO....')).toBe(1)
    expect(valueOf(learner, 'OOOXX.X..')).toBe(0)
    expect(valueOf(learner, 'XOXXOOOXX')).toBe(0)
    expect(valueOf(learner, 'X........')).toBe(0.5)
  })
})

describe('the learner', () => {
  it('sends a win back one position per game', () => {
    const guesses = backups(3, 0.5, 3)
    expect(guesses[0]).toEqual([0.5, 0.5, 0.5])
    expect(guesses[1]).toEqual([0.5, 0.5, 0.75])
    expect(guesses[2]).toEqual([0.5, 0.625, 0.875])
    expect(guesses[3][0]).toBeGreaterThan(0.5)
  })

  it('learns nothing when told not to', () => {
    const learner = newLearner(0.1, 0.1)
    for (let game = 0; game < 50; game++) playGame(learner, seeded(game), false)
    expect(learner.values.size).toBe(0)
  })

  it('goes from about 1 win in 6 to about 9 in 10, as the page says', () => {
    const best = (learner: ReturnType<typeof newLearner>) => {
      const random = seeded(2024)
      const greedy = { ...learner, explore: 0 }
      let wins = 0
      for (let game = 0; game < 500; game++) if (playGame(greedy, random, false) === 'win') wins++
      return wins / 500
    }
    expect(best(newLearner(0.1, 0))).toBeGreaterThan(0.12)
    expect(best(newLearner(0.1, 0))).toBeLessThan(0.22)

    const learner = newLearner(0.1, 0.1)
    const outcomes = train(learner, seeded(1), 3000)
    expect(best(learner)).toBeGreaterThan(0.85)
    const rates = winRates(outcomes, 100)
    expect(rates.at(-1)).toBeGreaterThan(rates[0])

    // Its favourite first move is a corner
    const opening = openingValues(learner)
    expect([0, 2, 6, 8]).toContain(opening.indexOf(Math.max(...opening)))
  })
})
