import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import { deathsPerDay, faulty, poisson, year } from './model'

describe('disks dying', () => {
  it('is about one a day for 10,000 disks that last 10 to 50 years', () => {
    expect(deathsPerDay(10_000, 10)).toBeCloseTo(2.74, 2)
    expect(deathsPerDay(10_000, 50)).toBeCloseTo(0.55, 2)
    expect(deathsPerDay(10_000, 27.4)).toBeCloseTo(1, 2)
  })

  it('averages out to the rate over a year of days', () => {
    const days = year(seeded(1), 1, 3640)
    const average = days.reduce((sum, n) => sum + n, 0) / days.length
    expect(average).toBeGreaterThan(0.9)
    expect(average).toBeLessThan(1.1)
  })

  it('never happens at a rate of zero', () => {
    const random = seeded(2)
    expect(Array.from({ length: 100 }, () => poisson(random, 0)).every((n) => n === 0)).toBe(true)
  })
})

describe('a unit’s faults', () => {
  it('give the same answer for the same unit and moment', () => {
    expect(faulty(3, 7, 0.2)).toBe(faulty(3, 7, 0.2))
  })

  it('come about as often as asked, across units and moments', () => {
    let faults = 0
    for (let i = 0; i < 100; i++) for (let tick = 0; tick < 100; tick++) if (faulty(i, tick, 0.05)) faults++
    expect(faults / 10_000).toBeGreaterThan(0.04)
    expect(faults / 10_000).toBeLessThan(0.06)
  })
})
