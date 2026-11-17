import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  arranged,
  BOOK,
  bookCrossover,
  byIndex,
  CHAPTER_PAGES,
  CHICKEN_PAGES,
  crossover,
  crossoverRows,
  formatMs,
  formatPercent,
  formatSeconds,
  GUESS_S,
  HEIGHT,
  lastEnd,
  leafing,
  matching,
  MONTH_S,
  pageMs,
  pagesOf,
  randomReadMs,
  reads,
  rowsPerPage,
  runMs,
  SELECTIVITIES,
  TABLE,
  timeMs,
  WIDE,
  WIDE_S,
  WORKED,
  type Measure,
  type Table,
} from './model'

describe('the disk', () => {
  it('reads a 4 KB page in 0.04 ms, and one on its own in 6.04 ms', () => {
    expect(pageMs()).toBeCloseTo(0.04, 10)
    expect(randomReadMs()).toBeCloseTo(6.04, 10)
  })

  it('reads a run with one trip', () => {
    expect(runMs(0)).toBe(0)
    expect(runMs(1)).toBeCloseTo(6.04, 10)
    expect(runMs(1000)).toBeCloseTo(46, 10)
  })
})

describe('the table of the guess', () => {
  it('is 10 million rows, 40 to a page, on 250,000 pages', () => {
    expect(rowsPerPage(TABLE)).toBe(40)
    expect(pagesOf(TABLE)).toBe(250_000)
  })

  it('scans in about 10 s', () => {
    expect(timeMs('scan', TABLE, GUESS_S)).toBeCloseTo(10_006, 6)
    expect(formatMs(timeMs('scan', TABLE, GUESS_S))).toBe('10 s')
  })

  it('takes 50 minutes through the unclustered index at 5%, about 300 times the scan', () => {
    expect(matching(TABLE, GUESS_S)).toBe(500_000)
    // (3 + 500,000) × 6.04 ms
    expect(timeMs('unclustered', TABLE, GUESS_S)).toBeCloseTo(3_020_018.12, 4)
    expect(formatMs(timeMs('unclustered', TABLE, GUESS_S))).toBe('50 min')
    expect(timeMs('unclustered', TABLE, GUESS_S) / timeMs('scan', TABLE, GUESS_S)).toBeCloseTo(301.8, 1)
  })

  it('takes half a second through a clustered index at 5%', () => {
    // 3 × 6.04 + 6 + 12,500 × 0.04
    expect(timeMs('clustered', TABLE, GUESS_S)).toBeCloseTo(524.12, 6)
  })

  it('works the three selectivities of the page by hand', () => {
    const [few, some, many] = WORKED
    expect(matching(TABLE, few)).toBe(100)
    expect(matching(TABLE, some)).toBe(10_000)
    expect(matching(TABLE, many)).toBe(500_000)
    expect(timeMs('unclustered', TABLE, few)).toBeCloseTo(103 * 6.04, 6)
    expect(timeMs('unclustered', TABLE, some)).toBeCloseTo(10_003 * 6.04, 6)
    expect(timeMs('clustered', TABLE, few)).toBeCloseTo(3 * 6.04 + 6 + 3 * 0.04, 6)
    expect(timeMs('clustered', TABLE, some)).toBeCloseTo(3 * 6.04 + 6 + 250 * 0.04, 6)
    expect([few, some, many].map((s) => formatMs(timeMs('unclustered', TABLE, s)))).toEqual(['622 ms', '60 s', '50 min'])
    expect([few, some, many].map((s) => formatMs(timeMs('clustered', TABLE, s)))).toEqual(['24 ms', '34 ms', '524 ms'])
  })

  it('counts page reads as the textbook does', () => {
    expect(reads('scan', TABLE, GUESS_S)).toBe(250_000)
    expect(reads('clustered', TABLE, GUESS_S)).toBe(3 + 12_500)
    expect(reads('unclustered', TABLE, GUESS_S)).toBe(3 + 500_000)
  })
})

describe('the crossover', () => {
  it('sits at about 1,654 rows (0.017%) in time and 2.5% in page reads', () => {
    expect(crossoverRows(TABLE, 'time')).toBeCloseTo(10_006 / 6.04 - 3, 6)
    expect(formatPercent(crossover(TABLE, 'time'))).toBe('0.017%')
    expect(crossoverRows(TABLE, 'reads')).toBe(249_997)
    expect(formatPercent(crossover(TABLE, 'reads'))).toBe('2.5%')
    expect(crossover(TABLE, 'reads') / crossover(TABLE, 'time')).toBeCloseTo(151, 0)
  })

  // The referee: walk the row counts one at a time and find the first at
  // which the unclustered index costs more than the scan
  const firstLoss = (table: Table, measure: Measure) => {
    const price = measure === 'time' ? timeMs : reads
    for (let m = 0; m <= table.rows; m++) {
      if (price('unclustered', table, m / table.rows) > price('scan', table, m / table.rows)) return m
    }
    return Infinity
  }

  it('is where the curves meet, for the page’s tables', () => {
    for (const table of [TABLE, WIDE]) {
      for (const measure of ['time', 'reads'] as const) {
        const m = crossoverRows(table, measure)
        expect(firstLoss(table, measure)).toBe(Math.floor(m) + 1)
      }
    }
  })

  it('is where the curves meet, for random tables', () => {
    const random = seeded(7)
    for (let i = 0; i < 40; i++) {
      const table = { rows: 1_000 + Math.floor(random() * 200_000), rowBytes: 20 + Math.floor(random() * 2_000) }
      for (const measure of ['time', 'reads'] as const) {
        const m = crossoverRows(table, measure)
        // a table so small that the walk down the index alone costs more
        // than the scan has no crossover: the scan always wins
        expect(firstLoss(table, measure)).toBe(Math.max(0, Math.floor(m) + 1))
      }
    }
  })
})

describe('the checks', () => {
  it('a month of orders: 30 minutes unclustered, a third of a second clustered', () => {
    expect(matching(TABLE, MONTH_S)).toBe(300_000)
    expect(formatMs(timeMs('unclustered', TABLE, MONTH_S))).toBe('30 min')
    expect(formatMs(timeMs('clustered', TABLE, MONTH_S))).toBe('324 ms')
    // one order by id, through any index: the walk and one page
    expect(formatMs((HEIGHT + 1) * randomReadMs())).toBe('24 ms')
  })

  it('wider rows: the scan takes 100 s, the index 60 s', () => {
    expect(rowsPerPage(WIDE)).toBe(4)
    expect(pagesOf(WIDE)).toBe(2_500_000)
    expect(formatMs(timeMs('scan', WIDE, WIDE_S))).toBe('100 s')
    expect(formatMs(timeMs('unclustered', WIDE, WIDE_S))).toBe('60 s')
    expect(timeMs('scan', WIDE, WIDE_S) / timeMs('unclustered', WIDE, WIDE_S)).toBeCloseTo(1.66, 2)
    // with the narrow rows, the same query loses 6 to 1
    expect(timeMs('unclustered', TABLE, WIDE_S) / timeMs('scan', TABLE, WIDE_S)).toBeCloseTo(6.04, 2)
    expect(formatPercent(crossover(WIDE, 'time'))).toBe('0.17%')
  })
})

describe('the slider', () => {
  it('runs 1, 2, 5 from 0.0001% to 100%', () => {
    expect(SELECTIVITIES).toHaveLength(19)
    expect(SELECTIVITIES[0]).toBe(0.000001)
    expect(SELECTIVITIES.at(-1)).toBe(1)
    expect(SELECTIVITIES).toContain(0.05)
    for (let i = 1; i < SELECTIVITIES.length; i++) expect(SELECTIVITIES[i]).toBeGreaterThan(SELECTIVITIES[i - 1])
    expect(SELECTIVITIES.map(formatPercent).slice(0, 4)).toEqual(['0.0001%', '0.0002%', '0.0005%', '0.001%'])
  })
})

describe('the cookbook', () => {
  it('has 60 chicken dishes on 60 different pages, in no order', () => {
    expect(new Set(CHICKEN_PAGES).size).toBe(BOOK.dishes)
    for (const page of CHICKEN_PAGES) expect(page).toBeGreaterThanOrEqual(0)
    for (const page of CHICKEN_PAGES) expect(page).toBeLessThan(BOOK.pages)
    const sorted = [...CHICKEN_PAGES].sort((a, b) => a - b)
    expect(CHICKEN_PAGES).not.toEqual(sorted)
    // spread over the whole book, not bunched up
    expect(sorted[0]).toBeLessThan(40)
    expect(sorted.at(-1)).toBeGreaterThan(360)
  })

  it('tells the story’s times', () => {
    expect(formatSeconds(lastEnd(byIndex(2)))).toBe('1 min')
    expect(formatSeconds(lastEnd(byIndex(BOOK.dishes)))).toBe('30 min')
    expect(formatSeconds(lastEnd(leafing()))).toBe('13 min 20 s')
    expect(formatSeconds(lastEnd(arranged()))).toBe('2 min 30 s')
    expect(Math.round(bookCrossover())).toBe(27)
  })

  it('reads the arranged book as one hunt and a run of glances', () => {
    const visits = arranged()
    expect(visits.map((v) => v.page)).toEqual([...CHAPTER_PAGES])
    expect(visits.filter((v) => v.hunt)).toHaveLength(1)
    expect(visits[0].end).toBe(BOOK.huntS + BOOK.glanceS)
    for (let i = 1; i < visits.length; i++) expect(visits[i].start).toBe(visits[i - 1].end)
  })
})
