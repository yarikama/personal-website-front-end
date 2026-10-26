import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import { COFFEE, mean, percentile, sampleResponses, withSlowest } from './model'

describe('the coffee shop', () => {
  it('has an average nobody waited', () => {
    expect(mean(COFFEE)).toBeCloseTo(3.84)
    expect(COFFEE.some((minutes) => Math.abs(minutes - 3.84) < 1)).toBe(false)
  })

  it('has a median of 2 minutes, a 90th percentile of 2.4 and a slowest of 20', () => {
    expect(percentile(COFFEE, 0.5)).toBe(2.0)
    expect(percentile(COFFEE, 0.9)).toBe(2.4)
    expect(percentile(COFFEE, 1)).toBe(20)
  })
})

describe('a percentile', () => {
  it('is the value at its rank once sorted', () => {
    const values = Array.from({ length: 100 }, (_, i) => 100 - i)
    expect(percentile(values, 0.5)).toBe(50)
    expect(percentile(values, 0.99)).toBe(99)
    expect(percentile(values, 0)).toBe(1)
  })

  it('does not move when the slowest value does, but the mean does', () => {
    const responses = sampleResponses(seeded(1), 100)
    const slower = withSlowest(responses, 5000)
    expect(percentile(slower, 0.5)).toBe(percentile(responses, 0.5))
    expect(mean(slower)).toBeGreaterThan(mean(responses) + 40)
  })
})

describe('sampled responses', () => {
  it('are mostly fast, with a few slow ones', () => {
    const responses = sampleResponses(seeded(2), 1000)
    expect(percentile(responses, 0.5)).toBeLessThan(80)
    expect(percentile(responses, 0.99)).toBeGreaterThan(300)
  })
})
