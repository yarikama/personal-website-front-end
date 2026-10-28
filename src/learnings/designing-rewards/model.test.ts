import { describe, expect, it } from 'vitest'
import { evaluate } from '../../components/explain/mdp'
import { circling, courier, delivered, DISTANCE, GAMMA, one, points, START, straight, trip, walking } from './model'

describe('the courier', () => {
  it('heads straight for the goal when only delivery pays', () => {
    const visits = trip('Delivery only')
    expect(delivered(visits)).toBe(true)
    expect(visits.length).toBe(DISTANCE)
  })

  it('circles the checkpoint for ever once passing it pays', () => {
    const visits = trip('Delivery + checkpoint')
    expect(delivered(visits)).toBe(false)
    // A point every other move after reaching it
    expect(points(visits)).toBe(15)
  })

  it('values the start as the page works it out: 4.7 to circle, 3.5 to deliver', () => {
    const { world, values } = courier('Delivery + checkpoint')
    expect(one(values[world.at(START)])).toBe('4.7')
    expect(values[world.at(START)]).toBeCloseTo(GAMMA * circling())
    expect(one(circling())).toBe('5.3')
    expect(one(walking(DISTANCE))).toBe('3.5')
    // Delivering is still possible, just worth less than circling
    const going = evaluate(world, straight('Delivery + checkpoint'), GAMMA)
    expect(going[world.at(START)]).toBeLessThan(values[world.at(START)])
  })

  it('values the start at 10 · 0.9¹⁰ when only delivery pays', () => {
    const { world, values } = courier('Delivery only')
    expect(values[world.at(START)]).toBeCloseTo(walking(DISTANCE))
  })
})
