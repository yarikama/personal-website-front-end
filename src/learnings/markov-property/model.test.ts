import { describe, expect, it } from 'vitest'
import { AHEAD, AMPLITUDE, angle, GAP, nextPlaces, PERIOD, PHOTO, way } from './model'

// Every moment of a long afternoon, every 0.01 s
const AFTERNOON = Array.from({ length: 20 * PERIOD * 100 }, (_, i) => i / 100)

// Where the seat went AHEAD seconds after every moment that a description
// can't tell apart from time t: the test of the Markov property, by brute force
function futures(describe: (t: number) => string, t: number) {
  const now = describe(t)
  const places = AFTERNOON.filter((moment) => describe(moment) === now).map((moment) => Math.round(angle(moment + AHEAD)))
  return [...new Set(places)].sort((a, b) => a - b)
}
const onePhoto = (t: number) => `${Math.round(angle(t))}`
const twoPhotos = (t: number) => `${Math.round(angle(t))} ${Math.round(angle(t - GAP))}`
const tenPhotos = (t: number) => Array.from({ length: 10 }, (_, i) => Math.round(angle(t - i * GAP))).join(' ')

describe('the swing', () => {
  it('is at the bottom, going forward, in the story’s photo', () => {
    expect(angle(PHOTO)).toBeCloseTo(0)
    expect(way(PHOTO)).toBe(1)
  })

  it('has two futures from one photo at the bottom, high at the front or the back', () => {
    const places = nextPlaces('one photo', PHOTO)
    expect(places.map((p) => Math.round(p.angle)).sort((a, b) => a - b)).toEqual([-AMPLITUDE, AMPLITUDE])
    expect(places.every((p) => p.share === 0.5)).toBe(true)
  })

  it('has one future from two photos, the same as from the whole afternoon', () => {
    for (const t of [0.3, 1.1, PHOTO, 3.7]) {
      expect(nextPlaces('two photos', t)).toEqual(nextPlaces('the whole afternoon', t))
      expect(nextPlaces('two photos', t)).toHaveLength(1)
    }
  })

  it('has one future from one photo only at the very top', () => {
    expect(nextPlaces('one photo', 0)).toHaveLength(1)
    expect(nextPlaces('one photo', PERIOD / 2)).toHaveLength(1)
    expect(nextPlaces('one photo', 0.4)).toHaveLength(2)
  })

  it('agrees with brute force: one photo is not Markov, two are, and ten add nothing', () => {
    const t = 3.07
    expect(futures(onePhoto, t).length).toBeGreaterThan(1)
    expect(futures(twoPhotos, t)).toHaveLength(1)
    expect(futures(tenPhotos, t)).toEqual(futures(twoPhotos, t))
    expect(futures(twoPhotos, t)[0]).toBe(Math.round(nextPlaces('two photos', t)[0].angle))
  })
})
