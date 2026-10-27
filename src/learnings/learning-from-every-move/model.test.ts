import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  BLUNDER,
  chance,
  EMPTY,
  GAME,
  emptySquares,
  nudge,
  opponentMove,
  outcome,
  place,
  playGame,
  race,
  record,
  resultLearner,
  valueLearner,
  valueOf,
  winningSquare,
} from './model'

describe('the board', () => {
  it('knows how a game ended', () => {
    expect(outcome('XXXOO....')).toBe('won')
    expect(outcome('XX.OOOX..')).toBe('lost')
    expect(outcome('XOXXOOOXX')).toBe('draw')
    expect(outcome(EMPTY)).toBeNull()
  })

  it('finds a square that completes a line', () => {
    expect(winningSquare('XX.OO....', 'X')).toBe(2)
    expect(winningSquare('XX.OO....', 'O')).toBe(5)
    expect(winningSquare('X...O....', 'X')).toBeUndefined()
  })
})

describe('the opponent', () => {
  it('always takes a win it can see', () => {
    const random = seeded(1)
    for (let i = 0; i < 50; i++) expect(opponentMove('X.XOO.X..', random)).toBe(5)
  })

  it('otherwise plays any empty square', () => {
    const random = seeded(2)
    const seen = new Set(Array.from({ length: 200 }, () => opponentMove('....X....', random)))
    expect([...seen].sort()).toEqual([0, 1, 2, 3, 5, 6, 7, 8])
  })
})

describe('a game', () => {
  it('ends, with X making every other move', () => {
    const random = seeded(3)
    const boards: string[] = []
    const end = playGame((board) => emptySquares(board)[0], random, (board) => boards.push(board))
    expect(['won', 'lost', 'draw']).toContain(end)
    for (const board of boards) {
      const xs = [...board].filter((mark) => mark === 'X').length
      const os = [...board].filter((mark) => mark === 'O').length
      expect(xs).toBe(os + 1)
    }
  })
})

describe('the value update', () => {
  it('moves the earlier value part of the way to the later', () => {
    expect(nudge(0.5, 0.9, 0.1)).toBeCloseTo(0.54)
    expect(nudge(0.5, 0, 0.2)).toBeCloseTo(0.4)
    expect(nudge(0.7, 0.7, 0.5)).toBeCloseTo(0.7)
  })

  it('starts unknown positions at an even chance, finished ones at what they ended as', () => {
    const values = new Map<string, number>()
    expect(valueOf(values, '....X....')).toBe(0.5)
    expect(valueOf(values, 'XXXOO....')).toBe(1)
    expect(valueOf(values, 'XX.OOOX..')).toBe(0)
  })
})

describe('the true chance of winning', () => {
  it('is certain once won, and nothing once the opponent can win', () => {
    expect(chance('O.X.XXOOX')).toBe(1)
    // The story's blunder: the opponent wins on square 3 next
    expect(chance(GAME[BLUNDER])).toBe(0)
  })

  it('is high before the blunder, as the story says', () => {
    expect(chance(GAME[0])).toBeGreaterThan(0.95)
    expect(chance(GAME[BLUNDER - 1])).toBeCloseTo(0.98, 2)
  })

  it('agrees with playing it out', () => {
    // From the story's second position, the best reply each time
    const best = (board: string) =>
      emptySquares(board).reduce((a, b) => (chance(place(board, b, 'X')) > chance(place(board, a, 'X')) ? b : a))
    const random = seeded(4)
    let won = 0
    for (let i = 0; i < 2000; i++) {
      let board = GAME[1]
      for (;;) {
        board = place(board, opponentMove(board, random), 'O')
        if (outcome(board)) break
        board = place(board, best(board), 'X')
        if (outcome(board)) break
      }
      if (outcome(board) === 'won') won++
    }
    expect(won / 2000).toBeCloseTo(chance(GAME[1]), 1)
  })
})

describe('the two learners', () => {
  it('both get better, on average', () => {
    for (const make of [resultLearner, valueLearner]) {
      let before = 0
      let after = 0
      for (let seed = 1; seed <= 8; seed++) {
        const learner = make(seeded(seed))
        before += record(learner.player(), seeded(100 + seed), 500).lost
        for (let i = 0; i < 1000; i++) learner.play()
        after += record(learner.player(), seeded(100 + seed), 500).lost
      }
      expect(after).toBeLessThan(before)
    }
  })

  it('lose about 17 and 4 games in 100 after 1,000 games, as the page says', () => {
    const runs = Array.from({ length: 12 }, (_, i) => race(i + 1, 1000, 1000, 2000))
    const mean = (pick: (run: (typeof runs)[number]) => number) => runs.reduce((sum, run) => sum + pick(run), 0) / runs.length
    expect(mean((run) => (run.results[0].lost + run.values[0].lost) / 2)).toBeCloseTo(0.27, 1)
    expect(mean((run) => run.results[1].lost)).toBeCloseTo(0.17, 1)
    expect(mean((run) => run.values[1].lost)).toBeCloseTo(0.04, 1)
    // And the value learner is ahead in every run, not only on average
    for (const run of runs) expect(run.values[1].lost).toBeLessThan(run.results[1].lost)
  })

  it('race the same way for a seed', () => {
    expect(race(5, 200, 50, 100)).toEqual(race(5, 200, 50, 100))
  })
})
