import { describe, expect, it } from 'vitest'
import { aroundCircle, everyPair, throughOne } from './model'

describe('connections between parts', () => {
  it('grow with the square when every part talks to every other', () => {
    expect([5, 10, 30].map(everyPair)).toEqual([10, 45, 435])
  })

  it('grow in step with the parts when they go through one interface', () => {
    expect([5, 10, 30].map(throughOne)).toEqual([5, 10, 30])
  })

  it('are the same either way for two parts', () => {
    expect(everyPair(2)).toBe(1)
    expect(throughOne(2)).toBe(2)
  })
})

describe('points round a circle', () => {
  it('start at the top and keep their distance from the centre', () => {
    const points = aroundCircle(4, 100, 100, 50)
    expect(points[0].x).toBeCloseTo(100)
    expect(points[0].y).toBeCloseTo(50)
    for (const p of points) expect(Math.hypot(p.x - 100, p.y - 100)).toBeCloseTo(50)
  })
})
