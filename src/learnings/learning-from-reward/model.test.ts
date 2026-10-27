import { describe, expect, it } from 'vitest'
import { DOZEN_TRIES, FLIPS_FROM, FLIPS_TO, outcomeOf, rewardOf, turnOf } from './model'

describe('a flick of the pan', () => {
  it('turns the pancake over at 5', () => {
    expect(turnOf(5)).toBe(180)
    expect(outcomeOf(5)).toBe('flipped')
  })

  it('too soft does not turn it; too hard puts it on the floor', () => {
    expect(outcomeOf(2)).toBe('unturned')
    expect(outcomeOf(6.5)).toBe('unturned')
    expect(outcomeOf(8)).toBe('floor')
  })

  it('scores the floor below a pancake that did not turn', () => {
    expect([rewardOf(5), rewardOf(2), rewardOf(9)]).toEqual([1, 0, -1])
  })

  it('flips across a band around 5', () => {
    expect(FLIPS_FROM).toBeCloseTo(4.17, 2)
    expect(FLIPS_TO).toBeCloseTo(5.83, 2)
  })
})

describe('the dozen tries in the story', () => {
  const outcomes = DOZEN_TRIES.map(outcomeOf)

  it('are a dozen', () => {
    expect(DOZEN_TRIES).toHaveLength(12)
  })

  it('start with too soft, then too hard', () => {
    expect(outcomes.slice(0, 2)).toEqual(['unturned', 'floor'])
  })

  it('miss at first and flip every time by the end', () => {
    expect(outcomes.slice(0, 6)).not.toContain('flipped')
    expect(outcomes.slice(6)).toEqual(Array(6).fill('flipped'))
  })
})
