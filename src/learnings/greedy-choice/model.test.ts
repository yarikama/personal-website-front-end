import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  bestBy,
  book,
  BUSY,
  BUSY_TALK,
  byEnd,
  clash,
  clock,
  finishes,
  hitRates,
  most,
  OFFSITE,
  randomDay,
  RULES,
  scan,
  SYNC,
  taken,
  WEDNESDAY,
  type Meeting,
} from './model'

const fits = (day: Meeting[], set: number[]) =>
  set.every((i, k) => set.slice(k + 1).every((j) => !clash(day[i], day[j])))

describe('two meetings', () => {
  it('clash when they overlap, not when one starts as the other ends', () => {
    expect(clash({ start: 9, end: 11 }, { start: 10, end: 12 })).toBe(true)
    expect(clash({ start: 9, end: 11 }, { start: 11, end: 12 })).toBe(false)
    expect(clash({ start: 9, end: 17 }, { start: 12, end: 13 })).toBe(true)
  })
})

describe('the most that fit', () => {
  it('is worked out by hand on the story’s days', () => {
    expect(most(OFFSITE).length).toBe(3)
    expect(most(SYNC).length).toBe(2)
    expect(most(BUSY).length).toBe(4)
    expect(most(WEDNESDAY).length).toBe(4)
  })

  it('never clashes', () => {
    const random = seeded(1)
    for (let d = 0; d < 100; d++) {
      const day = randomDay(random, 8)
      expect(fits(day, most(day))).toBe(true)
    }
  })
})

describe('each rule', () => {
  it('books a set that never clashes, and turns away only what clashes', () => {
    const random = seeded(2)
    for (let d = 0; d < 100; d++) {
      const day = randomDay(random, 8)
      for (const rule of RULES) {
        const picks = book(day, rule)
        expect(fits(day, taken(picks))).toBe(true)
        // Every request is either booked or turned away, once
        const seen = picks.flatMap((pick) => [pick.take, ...pick.drop]).sort((a, b) => a - b)
        expect(seen).toEqual(day.map((_, i) => i))
        for (const pick of picks) for (const j of pick.drop) expect(clash(day[pick.take], day[j])).toBe(true)
      }
    }
  })
})

describe('the wrong rules', () => {
  it('fail on the story’s days, with no tie to blame', () => {
    expect(book(OFFSITE, 'start').length).toBe(1)
    expect(bestBy('start', OFFSITE, [0, 1, 2, 3])).toEqual([0])

    expect(book(SYNC, 'shortest').length).toBe(1)
    expect(bestBy('shortest', SYNC, [0, 1, 2])).toEqual([1])

    expect(bestBy('clashes', BUSY, BUSY.map((_, i) => i))).toEqual([BUSY_TALK])
    expect(book(BUSY, 'clashes').length).toBe(3)
  })

  it('lose on the busy day whichever way its later ties go', () => {
    // After the talk, what is left is two clusters where everything clashes
    // with everything else in its cluster: one booking each, however chosen
    const left = book(BUSY, 'clashes')[0]
    const waiting = BUSY.map((_, i) => i).filter((j) => j !== left.take && !left.drop.includes(j))
    expect(most(waiting.map((i) => BUSY[i])).length).toBe(2)
  })

  it('each do fine on the other days', () => {
    expect(book(OFFSITE, 'shortest').length).toBe(3)
    expect(book(SYNC, 'start').length).toBe(2)
  })
})

describe('ends first', () => {
  it('books as many as fit, on every random day', () => {
    const random = seeded(3)
    for (let d = 0; d < 500; d++) {
      const day = randomDay(random, 9)
      expect(book(day, 'end').length).toBe(most(day).length)
    }
  })

  it('stays ahead: its k-th booking ends no later than any schedule’s k-th', () => {
    const random = seeded(4)
    for (let d = 0; d < 200; d++) {
      const day = randomDay(random, 8)
      const greedy = finishes(day, taken(book(day, 'end')))
      for (const rule of RULES) {
        const other = finishes(day, taken(book(day, rule)))
        other.forEach((end, k) => expect(greedy[k]).toBeLessThanOrEqual(end))
      }
    }
  })

  it('stays ahead of the fewest-clashes schedule on the busy day', () => {
    expect(finishes(BUSY, taken(book(BUSY, 'end')))).toEqual([11, 13, 15, 17])
    expect(finishes(BUSY, taken(book(BUSY, 'clashes')))).toEqual([11, 13.5, 15.5])
  })
})

describe('random days', () => {
  it('repeat for a seed and stay inside the working day', () => {
    expect(randomDay(seeded(5), 8)).toEqual(randomDay(seeded(5), 8))
    for (const m of randomDay(seeded(6), 50)) {
      expect(m.start).toBeGreaterThanOrEqual(9)
      expect(m.end).toBeLessThanOrEqual(17)
      expect(m.end).toBeGreaterThan(m.start)
    }
  })

  it('catch the shortcut rules often, and never fewest clashes', () => {
    const hits = hitRates(7, 1000, 8)
    expect(hits.end).toBe(1000)
    expect(hits.clashes).toBeGreaterThan(hits.shortest)
    expect(hits.shortest).toBeGreaterThan(hits.start)
    expect(hits.clashes).toBe(1000)
  })
})

describe('the template’s run', () => {
  const steps = scan(WEDNESDAY)
  const order = byEnd(WEDNESDAY)

  it('sorts by end before the loop', () => {
    expect(order.map((i) => WEDNESDAY[i].end)).toEqual([10.5, 11, 12, 13, 13.5, 14.5, 15])
    expect(steps[0]).toMatchObject({ line: 1, sorted: false })
    expect(steps[1]).toMatchObject({ line: 2, sorted: true })
  })

  it('picks what ends first does, taking a meeting that starts as the last ends', () => {
    const last = steps[steps.length - 1]
    expect(last.line).toBe(8)
    expect(last.picked.map((k) => order[k]).sort()).toEqual(taken(book(WEDNESDAY, 'end')).sort())
    expect(last.picked.length).toBe(4)
    expect(last.lastEnd).toBe(15)
    // 10:30 to 12:00 starts the moment 9:00 to 10:30 ends
    expect(steps.find((s) => s.line === 5 && s.at === 2)?.fits).toBe(true)
    // Two picks start the moment the one before ends, as the caption says
    const ends = last.picked.map((k) => WEDNESDAY[order[k]])
    expect(ends.filter((m, k) => k > 0 && m.start === ends[k - 1].end)).toHaveLength(2)
  })

  it('runs lines 6 and 7 only for a meeting that fits', () => {
    for (const step of steps) if (step.line === 6 || step.line === 7) expect(step.fits).toBe(true)
    const visits = steps.filter((s) => s.line === 4).length
    expect(visits).toBe(WEDNESDAY.length)
  })
})

describe('times', () => {
  it('read like a booking sheet', () => {
    expect([9, 9.5, 12, 13, 16.5].map(clock)).toEqual(['9:00', '9:30', '12:00', '1:00', '4:30'])
  })
})

describe('the busy day without its trap', () => {
  it('lets fewest clashes book all four', () => {
    const day = BUSY.filter((_, i) => i !== BUSY_TALK)
    expect(book(day, 'clashes').length).toBe(4)
  })
})

describe('starts last, working backwards', () => {
  it('is ends first with the clock run backwards, so it books as many as fit', () => {
    const random = seeded(8)
    for (let d = 0; d < 300; d++) {
      const day = randomDay(random, 8)
      const mirrored = day.map((m) => ({ start: -m.end, end: -m.start }))
      expect(book(mirrored, 'end').length).toBe(most(day).length)
    }
  })
})
