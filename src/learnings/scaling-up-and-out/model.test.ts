import { describe, expect, it } from 'vitest'
import { BIGGEST, crossover, scaleOutCost, scaleUpCost } from './model'

describe('scaling up', () => {
  it('is cheapest at today’s load', () => {
    expect(scaleUpCost(1)).toBe(1)
    expect(scaleUpCost(1)!).toBeLessThan(scaleOutCost(1))
  })

  it('costs more than in proportion, then runs out of machines', () => {
    expect(scaleUpCost(8)!).toBeGreaterThan(8 * scaleUpCost(1)!)
    expect(scaleUpCost(BIGGEST)).not.toBeNull()
    expect(scaleUpCost(BIGGEST + 1)).toBeNull()
  })
})

describe('scaling out', () => {
  it('costs in proportion to the load, plus a fixed amount', () => {
    expect(scaleOutCost(10) - scaleOutCost(5)).toBeCloseTo(5.5)
  })

  it('gets cheaper than one big machine a few times today’s load', () => {
    const load = crossover()
    expect(load).toBeGreaterThan(2)
    expect(load).toBeLessThan(5)
    expect(scaleOutCost(load)).toBeLessThan(scaleUpCost(load)!)
  })
})
