import { describe, expect, it } from 'vitest'
import {
  appendMs,
  BOOK_MINUTES,
  fetchBooks,
  formatBytes,
  formatMinutes,
  formatMs,
  GB,
  GUESS,
  inOneRunMs,
  inOneRunSplit,
  inPlaceMs,
  KB,
  MB,
  oneReadMs,
  pageSizeSpeedup,
  pagesFor,
  positionMs,
  rotationMs,
  scatteredMs,
  scatteredSplit,
  transferMs,
  TRIP_MINUTES,
  trips,
} from './model'

describe('one read on the course’s disk', () => {
  it('waits half a turn for the page: 3 ms at 10,000 RPM', () => {
    expect(rotationMs(10_000)).toBeCloseTo(3)
    expect(rotationMs(7_200)).toBeCloseTo(4.17, 2)
  })

  it('takes 6 ms to get there and 0.04 ms to read 4 KB', () => {
    expect(positionMs()).toBeCloseTo(6)
    expect(transferMs(4 * KB)).toBeCloseTo(0.04)
    expect(oneReadMs(4 * KB)).toBeCloseTo(6.04)
  })

  it('spends over 99% of a small read getting there', () => {
    expect(positionMs() / oneReadMs(4 * KB)).toBeGreaterThan(0.99)
  })
})

describe('scattered against one run', () => {
  it('gives the guess: 6 s against 46 ms, about 131 times', () => {
    const scattered = scatteredMs(GUESS.pages, GUESS.pageBytes)
    const run = inOneRunMs(GUESS.pages, GUESS.pageBytes)
    expect(scattered).toBeCloseTo(6040)
    expect(run).toBeCloseTo(46)
    expect(scattered / run).toBeGreaterThan(100)
    expect(Math.round(scattered / run)).toBe(131)
  })

  it('are the same for a single page', () => {
    expect(scatteredMs(1, 4 * KB)).toBeCloseTo(inOneRunMs(1, 4 * KB))
  })

  it('splits into getting there and reading that add up', () => {
    const a = scatteredSplit(250, 16 * KB)
    expect(a.gettingThere + a.reading).toBeCloseTo(scatteredMs(250, 16 * KB))
    const b = inOneRunSplit(250, 16 * KB)
    expect(b.gettingThere + b.reading).toBeCloseTo(inOneRunMs(250, 16 * KB))
  })

  it('reads a gigabyte in 10 s in one run, 25 minutes in scattered 4 KB pages, 16 s in 1 MB pages', () => {
    expect(inOneRunMs(pagesFor(GB, 4 * KB), 4 * KB) / 1000).toBeCloseTo(10, 1)
    expect(scatteredMs(pagesFor(GB, 4 * KB), 4 * KB) / 60_000).toBeCloseTo(25.2, 1)
    expect(scatteredMs(pagesFor(GB, MB), MB) / 1000).toBeCloseTo(16)
  })
})

describe('the checks', () => {
  it('make 8 KB pages to 64 KB about 7 times faster when scattered', () => {
    expect(pageSizeSpeedup(80 * MB, 8 * KB, 64 * KB)).toBeCloseTo(7.3, 1)
  })

  it('make 10,000 changes take a minute in place and 16 ms appended', () => {
    expect(inPlaceMs() / 1000).toBeCloseTo(60.4)
    expect(appendMs()).toBeCloseTo(16)
    expect(formatMs(inPlaceMs())).toBe('1 min')
    expect(formatMs(appendMs())).toBe('16 ms')
  })
})

describe('the library', () => {
  it('reads the disk’s milliseconds as minutes', () => {
    expect(TRIP_MINUTES).toBeCloseTo(6)
    expect(BOOK_MINUTES).toBeCloseTo(0.04)
  })

  it('takes a trip for every book on a different shelf', () => {
    const visits = fetchBooks(Array.from({ length: 10 }, (_, i) => ({ shelf: i % 3, at: i * 2 })))
    expect(trips(visits)).toBe(10)
    expect(visits.at(-1)!.done).toBeCloseTo(60.4)
  })

  it('takes one trip for books side by side', () => {
    const visits = fetchBooks(Array.from({ length: 10 }, (_, i) => ({ shelf: 0, at: 5 + i })))
    expect(trips(visits)).toBe(1)
    expect(visits.at(-1)!.done).toBeCloseTo(6.4)
  })

  it('times each visit in order', () => {
    for (const visit of fetchBooks([
      { shelf: 0, at: 1 },
      { shelf: 0, at: 2 },
      { shelf: 2, at: 9 },
    ])) {
      expect(visit.arrive).toBeGreaterThanOrEqual(visit.leave)
      expect(visit.done).toBeGreaterThan(visit.arrive)
    }
  })
})

describe('the numbers as the page writes them', () => {
  it('reads well', () => {
    expect(formatMs(0.04)).toBe('0.04 ms')
    expect(formatMs(46)).toBe('46 ms')
    expect(formatMs(6040)).toBe('6.0 s')
    expect(formatMs(604_000)).toBe('10 min')
    expect(formatMinutes(0.04)).toBe('2 s')
    expect(formatMinutes(6.4)).toBe('6 min 24 s')
    expect(formatMinutes(6040)).toBe('100 h 40 min')
    expect(formatBytes(4 * KB)).toBe('4 KB')
    expect(formatBytes(MB)).toBe('1 MB')
    expect(formatBytes(GB)).toBe('1 GB')
  })
})
