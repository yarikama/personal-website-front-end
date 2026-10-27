import { describe, expect, it } from 'vitest'
import {
  chargeFirstRun,
  CHARGER,
  choose,
  COLUMNS,
  DIRT,
  flipsAt,
  FULL,
  grabRun,
  LOW,
  lookAhead,
  PATHS,
  rewards,
  ROWS,
  score,
  START,
  values,
} from './model'

describe('the room', () => {
  it('has twenty specks, each on its own tile inside it', () => {
    expect(DIRT).toHaveLength(20)
    expect(new Set(DIRT.map(({ x, y }) => `${x},${y}`)).size).toBe(20)
    for (const { x, y } of DIRT) {
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(COLUMNS)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThan(ROWS)
    }
  })

  it('starts the robot on a low battery: 5%, just enough to reach the charger', () => {
    expect(LOW / FULL).toBe(0.05)
    expect(Math.abs(START.x - CHARGER.x) + Math.abs(START.y - CHARGER.y)).toBe(LOW)
  })
})

describe('the robot that grabs the nearest reward', () => {
  const frames = grabRun()

  it('takes the three specks in reach, then runs flat', () => {
    expect(rewards(frames)).toEqual([1, 1, 1, 0])
    expect(score(frames)).toBe(3)
    expect(frames[frames.length - 1].battery).toBe(0)
  })

  it('dies far from the charger', () => {
    const end = frames[frames.length - 1].at
    expect(Math.abs(end.x - CHARGER.x) + Math.abs(end.y - CHARGER.y)).toBeGreaterThan(LOW)
  })
})

describe('the robot that charges first', () => {
  const frames = chargeFirstRun()

  it('earns nothing on the way to the charger', () => {
    expect(rewards(frames).slice(0, LOW)).toEqual([0, 0, 0, 0])
  })

  it('fills up there, then cleans the whole room', () => {
    expect(Math.max(...frames.map((frame) => frame.battery))).toBe(FULL)
    expect(score(frames)).toBe(20)
    expect(frames[frames.length - 1].dirt).toHaveLength(0)
    expect(frames[frames.length - 1].battery).toBeGreaterThan(0)
  })

  it('moves one tile at a time', () => {
    const moves = frames.filter((frame) => frame.moved)
    let at = START
    for (const frame of moves) {
      expect(Math.abs(frame.at.x - at.x) + Math.abs(frame.at.y - at.y)).toBe(1)
      at = frame.at
    }
  })
})

describe('value', () => {
  it('adds up all the reward still to come', () => {
    expect(values([1, 1, 1, 0])).toEqual([3, 2, 1, 0, 0])
    expect(values(rewards(chargeFirstRun()))[0]).toBe(20)
  })

  it('is the next reward plus the value of where you land', () => {
    const r = rewards(chargeFirstRun())
    const v = values(r)
    for (let t = 0; t < r.length; t++) expect(v[t]).toBe(r[t] + v[t + 1])
  })
})

describe('looking ahead', () => {
  it('adds up the first steps of a path', () => {
    expect(lookAhead(PATHS.grab, 2)).toBe(2)
    expect(lookAhead(PATHS.grab, 10)).toBe(3)
    expect(lookAhead(PATHS.charge, 4)).toBe(0)
    expect(lookAhead(PATHS.charge, 10)).toBe(12)
  })

  it('grabs when it looks only a few steps ahead, and charges once it looks far enough', () => {
    expect(choose(1)).toBe('grab')
    expect(choose(5)).toBe('grab')
    expect(choose(6)).toBe('charge')
    expect(choose(10)).toBe('charge')
    expect(flipsAt()).toBe(6)
  })
})
