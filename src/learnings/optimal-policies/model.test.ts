import { describe, expect, it } from 'vitest'
import { evaluate, greedyPolicy } from '../../components/explain/mdp'
import { best, bestMoves, headsForB, loop, options, signed, spinnerA, SQUARE, story, WORLD } from './model'

describe('the best play on the board', () => {
  it('values A at 24.4, as 10 every five turns, and A′ at 16.0', () => {
    expect(signed(best()[SQUARE.a])).toBe('24.4')
    expect(signed(loop(10, 5, 0.9))).toBe('24.4')
    expect(signed(best()[SQUARE.a_])).toBe('16.0')
    expect(signed(spinnerA())).toBe('8.8')
  })

  it('makes every square the best of its four moves', () => {
    for (const gamma of [0.5, 0.9, 0.99]) {
      const values = best(gamma)
      values.forEach((value, s) => expect(Math.max(...options(s, gamma).map((o) => o.total))).toBeCloseTo(value, 6))
    }
  })

  it('takes A′ north, worth 0 + 0.9 × 17.8', () => {
    const moves = options(SQUARE.a_, 0.9)
    expect(moves.filter((m) => m.best).map((m) => m.move)).toEqual(['north'])
    expect(signed(moves[0].there)).toBe('17.8')
  })

  it('beats or ties every other policy we try, from every square', () => {
    const top = best()
    for (const policy of [greedyPolicy(WORLD, top, 0.9), greedyPolicy(WORLD, evaluate(WORLD, greedyPolicy(WORLD, top.map(() => 0), 0.9), 0.9), 0.9)]) {
      evaluate(WORLD, policy, 0.9).forEach((value, s) => expect(value).toBeLessThanOrEqual(top[s] + 1e-6))
    }
  })

  it('sends only the corner beside B to B at 0.9, and the whole right side at 0.5, as the caption says', () => {
    expect(headsForB(0.9).map((s) => WORLD.names[s])).toEqual(['4,0'])
    expect(headsForB(0.99).length).toBe(1)
    expect(headsForB(0.5).length).toBe(9)
    expect(headsForB(0.5).every((s) => WORLD.cell(s).x >= 3)).toBe(true)
  })

  it('draws two arrows where two moves tie, as in the bottom-left corner', () => {
    expect(bestMoves()[WORLD.at({ x: 0, y: 4 })]).toEqual([0, 1])
  })
})

describe('the story', () => {
  it('walks from A′ up to A and jumps, every five moves', () => {
    const visits = story()
    expect(visits.slice(0, 5).map((v) => WORLD.names[v.next])).toEqual(['1,3', '1,2', '1,1', '1,0', '1,4'])
    expect(visits.filter((v) => v.reward === 10).length).toBe(3)
  })
})
