import { describe, expect, it } from 'vitest'
import { solve, SPOTS, state } from '../../components/explain/ladders'
import {
  backupsBy,
  blocksOf,
  CITY,
  cornersOf,
  counts,
  firstBump,
  furthest,
  guess,
  JUMBLE,
  jumbled,
  makeCity,
  routeRight,
  startingValues,
  sweepCity,
  sweptBackups,
  SWEEPING,
  THETA,
  touchedBy,
  valuesAfter,
  VI_SWEEPS,
  walking,
  WALKING,
} from './model'

describe('one square at a time, on the board', () => {
  it('sweeps 19 times as value iteration, 437 backups, or 161 in place from the finish down', () => {
    expect(VI_SWEEPS).toBe(19)
    expect(sweptBackups('copies')).toBe(19 * 23)
    expect(sweptBackups('down')).toBe(7 * 23)
  })

  it('ends on the best play’s values from random picks, in more backups than sweeping', () => {
    const backups = JUMBLE()
    expect(backups.length - 1).toBe(656)
    expect(furthest(backups.at(-1)!.values)).toBeLessThan(THETA)
    expect(furthest(backups.at(-2)!.values)).toBeGreaterThanOrEqual(THETA)
    for (const sq of SPOTS) expect(backups.at(-1)!.values[state(sq)]).toBeCloseTo(solve('best')[state(sq)], 2)
    expect(backups.length - 1).toBeGreaterThan(sweptBackups('copies'))
  })

  it('backs some squares up many times before others once', () => {
    const early = counts(JUMBLE(), 46)
    expect([...early].filter(([, k]) => k === 0).map(([sq]) => sq)).toEqual([6, 17])
    expect(Math.max(...early.values())).toBe(5)
    const all = [...counts(JUMBLE(), JUMBLE().length - 1).values()]
    expect(Math.min(...all)).toBe(20)
    expect(Math.max(...all)).toBe(44)
  })

  it('gets there from other seeds too', () => {
    for (const seed of [1, 2, 3]) expect(furthest(jumbled(seed).at(-1)!.values)).toBeLessThan(THETA)
  })
})

describe('the city', () => {
  const c = CITY()

  it('has 9,903 corners to choose from; the hotel is 64 blocks away, 52 if there were no river', () => {
    expect(c.corners.length).toBe(9903)
    expect(cornersOf(100)).toBe(9903)
    expect(c.blocks[c.hotel]).toBe(64)
    expect(guess(c, c.hotel)).toBe(-52)
  })

  it('guesses no corner gloomier than its truth', () => {
    for (const corner of c.corners) expect(guess(c, corner)).toBeGreaterThanOrEqual(-c.blocks[corner])
  })

  it('first bumps into the river beside a bridge-less bank: −23 becomes −25', () => {
    const bump = firstBump()!
    expect([c.x(bump.corner), c.y(bump.corner)]).toEqual([49, 46])
    expect(bump).toMatchObject({ guess: -23, landing: -24, value: -25 })
  })
})

describe('walking, real-time dynamic programming', () => {
  const c = CITY()
  const { walks } = WALKING()

  it('takes 128 blocks the first time, and 207 walks until the numbers allow only shortest routes', () => {
    expect(blocksOf(walks[0])).toBe(128)
    expect(walks.length).toBe(207)
    expect(blocksOf(walks.at(-1)!)).toBe(64)
    const values = startingValues(c)
    for (const walk of walks.slice(0, -2)) for (const [corner, value] of walk.writes) values[corner] = value
    expect(routeRight(c, values)).toBe(false)
    const end = valuesAfter(walks.length)
    expect(routeRight(c, end)).toBe(true)
    expect(end[c.hotel]).toBe(-64)
  })

  it('backs up 1,098 corners, about one in nine, in 17,592 backups: under two sweeps', () => {
    expect(touchedBy(walks.length)).toBe(1098)
    expect(backupsBy(walks.length)).toBe(17_592)
    expect(backupsBy(walks.length)).toBeLessThan(2 * c.corners.length)
    expect(touchedBy(walks.length) / c.corners.length).toBeLessThan(0.12)
  })

  it('carries values forward walk by walk the same as from scratch', () => {
    const later = Float64Array.from(valuesAfter(120))
    valuesAfter(30)
    expect(Array.from(valuesAfter(120))).toEqual(Array.from(later))
  })

  it('never brings a value below its truth', () => {
    const end = valuesAfter(walks.length)
    for (const corner of c.corners) expect(end[corner]).toBeGreaterThanOrEqual(-c.blocks[corner] - 1e-9)
  })
})

describe('value iteration in the city, from the same guess', () => {
  it('needs 41 sweeps, 406,023 backups, before the route is right', () => {
    expect(SWEEPING()).toEqual({ sweeps: 41, backups: 41 * 9903 })
  })

  it('costs the walker the same in a city three times wider, and sweeping nine times more', () => {
    const big = makeCity(300)
    expect(big.corners.length).toBe(cornersOf(300))
    const run = walking(big)
    expect(run.walks.length).toBe(207)
    expect(backupsBy(run.walks.length, run)).toBe(17_592)
    expect(touchedBy(run.walks.length, run)).toBe(1098)
    expect(sweepCity(big).sweeps).toBe(41)
    expect(cornersOf(1000)).toBe(999_039)
  })
})
