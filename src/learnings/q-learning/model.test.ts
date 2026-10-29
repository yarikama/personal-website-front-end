import { describe, expect, it } from 'vitest'
import { curves, EDGE, FAR, lateWet, learn, RIVERSIDE, settled, START, story, wetMornings } from './model'

describe('the riverside', () => {
  it('has a quick way along the edge and a longer one along the far street', () => {
    expect(EDGE).toBe(6)
    expect(FAR).toBe(10)
    // A step south from the edge is into the river and ends the walk
    expect(RIVERSIDE.moves[START][2][0].reward).toBe(-100)
    expect(RIVERSIDE.moves[RIVERSIDE.moves[START][2][0].next]).toEqual([])
  })
})

describe('the story', () => {
  const { you, friend } = story()

  it('ends with Sarsa on the far street and Q-learning on the edge', () => {
    expect(settled(you).length - 1).toBe(FAR)
    expect(settled(friend).length - 1).toBe(EDGE)
    expect(settled(friend).every((s) => RIVERSIDE.cell(s).y === 2)).toBe(true)
  })

  it('gets the friend wet far more often', () => {
    expect(wetMornings(you)).toBe(32)
    expect(wetMornings(friend)).toBe(79)
  })

  it('is what the two methods do in general, not luck', () => {
    for (let seed = 1; seed <= 8; seed++) {
      expect(settled(learn('q', seed)).length - 1).toBe(EDGE)
      expect(wetMornings(learn('q', seed))).toBeGreaterThan(wetMornings(learn('sarsa', seed)))
    }
  })
})

describe('on average', () => {
  const average = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length

  it('scores Sarsa’s mornings better and wets Q-learning more, the more so the more it explores', () => {
    const gaps = [0.05, 0.1, 0.2].map((epsilon) => {
      const sarsa = curves('sarsa', epsilon)
      const q = curves('q', epsilon)
      expect(lateWet(q.wet)).toBeGreaterThan(lateWet(sarsa.wet))
      expect(average(sarsa.totals.slice(-100))).toBeGreaterThan(average(q.totals.slice(-100)))
      return average(sarsa.totals.slice(-100)) - average(q.totals.slice(-100))
    })
    expect(gaps[0]).toBeLessThan(gaps[1])
    expect(gaps[1]).toBeLessThan(gaps[2])
  })
})
