import { describe, expect, it } from 'vitest'
import { formatDuration, formatHash, last, next, parseHash, plannedSeconds, prev } from './deck'

// Three slides: the middle one reveals in two steps
const steps = [0, 2, 0]

describe('next', () => {
  it('reveals the next step before leaving a slide', () => {
    expect(next({ index: 1, step: 0 }, steps)).toEqual({ index: 1, step: 1 })
    expect(next({ index: 1, step: 2 }, steps)).toEqual({ index: 2, step: 0 })
  })

  it('stays on the last slide', () => {
    expect(next({ index: 2, step: 0 }, steps)).toEqual({ index: 2, step: 0 })
  })
})

describe('prev', () => {
  it('hides steps one at a time', () => {
    expect(prev({ index: 1, step: 2 }, steps)).toEqual({ index: 1, step: 1 })
  })

  it('returns to the previous slide fully revealed', () => {
    expect(prev({ index: 2, step: 0 }, steps)).toEqual({ index: 1, step: 2 })
  })

  it('stays on the first slide', () => {
    expect(prev({ index: 0, step: 0 }, steps)).toEqual({ index: 0, step: 0 })
  })
})

describe('the URL hash', () => {
  it('round-trips a position', () => {
    for (const pos of [
      { index: 0, step: 0 },
      { index: 1, step: 2 },
    ]) {
      expect(parseHash(formatHash(pos), steps)).toEqual(pos)
    }
  })

  it('is 1-based and leaves out step 0', () => {
    expect(formatHash({ index: 1, step: 0 })).toBe('#2')
    expect(formatHash({ index: 1, step: 1 })).toBe('#2.1')
  })

  it('pulls positions outside the deck back in', () => {
    expect(parseHash('#99', steps)).toEqual(last(steps))
    expect(parseHash('#2.9', steps)).toEqual({ index: 1, step: 2 })
    expect(parseHash('#0', steps)).toEqual({ index: 0, step: 0 })
  })

  it('starts at the beginning for an empty or unknown hash', () => {
    expect(parseHash('', steps)).toEqual({ index: 0, step: 0 })
    expect(parseHash('#intro', steps)).toEqual({ index: 0, step: 0 })
  })
})

describe('plannedSeconds', () => {
  const sections = [
    { id: 'intro', minutes: 2 },
    { id: 'work', minutes: 6 },
  ]
  const slideSections = ['intro', 'intro', 'work', 'work', 'work']

  it('spreads each section evenly over its slides', () => {
    expect(plannedSeconds(0, slideSections, sections)).toBe(0)
    expect(plannedSeconds(1, slideSections, sections)).toBe(60)
    expect(plannedSeconds(2, slideSections, sections)).toBe(120)
    expect(plannedSeconds(4, slideSections, sections)).toBe(120 + 240)
  })
})

describe('formatDuration', () => {
  it('shows minutes and seconds', () => {
    expect(formatDuration(452)).toBe('7:32')
    expect(formatDuration(5)).toBe('0:05')
    expect(formatDuration(-75)).toBe('-1:15')
  })
})
