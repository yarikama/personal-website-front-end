import { describe, expect, it } from 'vitest'
import { evaluate } from '../../components/explain/mdp'
import { average, branches, firstBump, firstJump, PASSES, signed, SQUARE, story, towardA, WORLD, worth } from './model'

describe('the board with a fair spinner', () => {
  it('values A, A′, B and B′ as the page says', () => {
    const values = worth()
    expect(signed(values[SQUARE.a])).toBe('8.8')
    expect(signed(values[SQUARE.a_])).toBe('−1.3')
    expect(signed(values[SQUARE.b])).toBe('5.3')
    expect(signed(values[SQUARE.b_])).toBe('0.4')
  })

  it('makes every square the average of its four moves, for every γ', () => {
    for (const gamma of [0.5, 0.9, 0.99]) {
      const values = worth(gamma)
      values.forEach((value, s) => expect(average(s, values, gamma)).toBeCloseTo(value, 6))
    }
  })

  it('works A′ out as the clip does: −0.4, −1.1, −2.2 and −1.7', () => {
    const moves = branches(SQUARE.a_, worth(), 0.9)
    expect(moves.map((m) => signed(m.total))).toEqual(['−0.4', '−1.1', '−2.2', '−1.7'])
    // South runs into the edge
    expect(moves[2].stay).toBe(true)
  })

  it('settles in passes, ending close to the answer', () => {
    const last = PASSES.at(-1)!
    worth().forEach((value, s) => expect(signed(last[s])).toBe(signed(value)))
    expect(PASSES.length).toBeGreaterThan(20)
    expect(PASSES.length).toBeLessThan(120)
  })

  it('raises A′ when the spinner leans towards A, as the last check says', () => {
    const leaning = evaluate(WORLD, towardA(), 0.9)
    expect(leaning[SQUARE.a_]).toBeGreaterThan(worth()[SQUARE.a_] + 1)
    towardA().forEach((chances) => expect(chances.reduce((a, b) => a + b)).toBeCloseTo(1))
  })
})

describe('the story’s walk', () => {
  it('bumps into the edge, then reaches A and jumps to A′', () => {
    const visits = story()
    const bump = firstBump(visits)
    const jump = firstJump(visits)
    expect(bump).toBeGreaterThan(0)
    expect(jump).toBeGreaterThan(bump)
    expect(visits[jump].state).toBe(SQUARE.a)
    expect(visits[jump].next).toBe(SQUARE.a_)
  })
})
