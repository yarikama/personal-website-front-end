// Finding rows through an index or by reading the whole table, on the disk
// the Storage pages use: about 6 ms to get the head to a page, then 0.04 ms
// to read its 4 KB. Sizes are decimal (a KB is 1,000 bytes), so a 4 KB page
// holds exactly 40 rows of 100 bytes.
import { seeded } from '../../components/explain/random'

export const KB = 1_000
export const PAGE_BYTES = 4 * KB

export interface Disk {
  // Seek plus half a turn: getting the head to a page
  tripMs: number
  // How fast bytes stream once the head is in place
  bytesPerSecond: number
}

// The course's disk: a 3 ms seek, 3 ms of rotation, 100 MB/s
export const DISK: Disk = { tripMs: 6, bytesPerSecond: 100_000_000 }

// Reading one page's bytes once the head is there: 0.04 ms
export const pageMs = (disk: Disk = DISK) => (PAGE_BYTES / disk.bytesPerSecond) * 1000

// One page on its own, somewhere on the disk: a trip, then the page
export const randomReadMs = (disk: Disk = DISK) => disk.tripMs + pageMs(disk)

// `pages` pages side by side: one trip, then they stream
export const runMs = (pages: number, disk: Disk = DISK) => (pages > 0 ? disk.tripMs + pages * pageMs(disk) : 0)

export interface Table {
  // T(R)
  rows: number
  rowBytes: number
}

// The table of the guess: 10 million rows of 100 bytes, 1 GB
export const TABLE: Table = { rows: 10_000_000, rowBytes: 100 }

export const rowsPerPage = (table: Table) => Math.floor(PAGE_BYTES / table.rowBytes)

// B(R): the pages the table fills
export const pagesOf = (table: Table) => Math.ceil(table.rows / rowsPerPage(table))

// Index pages read on the way down to the first match (the index's height)
export const HEIGHT = 3

// How many rows a selectivity `s` (a fraction of the table) matches
export const matching = (table: Table, s: number) => Math.round(s * table.rows)

// Pages the matching rows fill when they sit together
const matchingPages = (table: Table, s: number) => Math.ceil(matching(table, s) / rowsPerPage(table))

// Two ways to price a plan: count page reads, as the textbook formulas do,
// or time them on the disk, where a read in a run costs far less than one
// on its own
export type Measure = 'time' | 'reads'

export type Plan = 'scan' | 'clustered' | 'unclustered'
export const PLANS: readonly Plan[] = ['scan', 'clustered', 'unclustered']

// Page reads. Scan: every page, B(R). Clustered: the walk down, then the
// pages the matches fill, about h + s·B(R). Unclustered: the walk down,
// then a page for every matching row, up to h + s·T(R). (The index's own
// leaf pages are left out: they are read in order and cost little.)
export function reads(plan: Plan, table: Table, s: number): number {
  if (plan === 'scan') return pagesOf(table)
  if (plan === 'clustered') return HEIGHT + matchingPages(table, s)
  return HEIGHT + matching(table, s)
}

// Time in ms. Scan: one run over every page. Clustered: the walk down is
// random reads, then the matching pages in one run. Unclustered: every
// read is random
export function timeMs(plan: Plan, table: Table, s: number, disk: Disk = DISK): number {
  if (plan === 'scan') return runMs(pagesOf(table), disk)
  if (plan === 'clustered') return HEIGHT * randomReadMs(disk) + runMs(matchingPages(table, s), disk)
  return (HEIGHT + matching(table, s)) * randomReadMs(disk)
}

export const cost = (measure: Measure, plan: Plan, table: Table, s: number) =>
  measure === 'time' ? timeMs(plan, table, s) : reads(plan, table, s)

// Where the unclustered index stops winning: the number of matching rows at
// which it costs exactly what the scan does (a fraction of a row, since the
// lines meet between two whole counts)
export function crossoverRows(table: Table, measure: Measure, disk: Disk = DISK): number {
  if (measure === 'reads') return pagesOf(table) - HEIGHT
  return timeMs('scan', table, 0, disk) / randomReadMs(disk) - HEIGHT
}

export const crossover = (table: Table, measure: Measure, disk: Disk = DISK) =>
  crossoverRows(table, measure, disk) / table.rows

// The guess: 5% of the table through an unclustered index, or the scan
export const GUESS_S = 0.05

// The worked numbers: a hundred rows, ten thousand, half a million
export const WORKED = [0.00001, 0.001, 0.05] as const

// The quick check: an id lookup (one row) and a month of orders (3%)
export const MONTH_S = 0.03

// Check yourself: the same 10 million rows, ten times wider, 0.1% matched
export const WIDE: Table = { rows: 10_000_000, rowBytes: 1_000 }
export const WIDE_S = 0.001

// The slider: 1, 2 and 5 of every power of ten from 0.0001% to 100%
export const SELECTIVITIES: readonly number[] = Array.from({ length: 6 }, (_, power) =>
  [1, 2, 5].map((d) => Number((d * 10 ** (power - 6)).toPrecision(1)))
)
  .flat()
  .concat(1)

// The cookbook of the story. A hunt is flipping to the index, reading a
// dish's page number and finding that page; a glance is turning one page
// and looking at it.
export const BOOK = { pages: 400, dishes: 60, huntS: 30, glanceS: 2, chapterStart: 170 }

// Where the chicken dishes are. The index lists them A to Z by name, so the
// pages come in no order at all
export const CHICKEN_PAGES: readonly number[] = (() => {
  const random = seeded(530)
  const pages = Array.from({ length: BOOK.pages }, (_, i) => i)
  for (let i = pages.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[pages[i], pages[j]] = [pages[j], pages[i]]
  }
  return pages.slice(0, BOOK.dishes)
})()

// In the book arranged by main ingredient, the chicken chapter
export const CHAPTER_PAGES: readonly number[] = Array.from({ length: BOOK.dishes }, (_, i) => BOOK.chapterStart + i)

// Looking at one page: when it starts and ends, in seconds from the start,
// and whether getting there took a hunt
export interface Visit {
  page: number
  start: number
  end: number
  hunt: boolean
}

// The first `n` dishes through the back index: a hunt each
export const byIndex = (n: number): Visit[] =>
  CHICKEN_PAGES.slice(0, n).map((page, i) => ({ page, start: i * BOOK.huntS, end: (i + 1) * BOOK.huntS, hunt: true }))

// Every page, front to back: a glance each
export const leafing = (): Visit[] =>
  Array.from({ length: BOOK.pages }, (_, page) => ({ page, start: page * BOOK.glanceS, end: (page + 1) * BOOK.glanceS, hunt: false }))

// The arranged book: one hunt to the chapter, then a glance a page
export const arranged = (): Visit[] =>
  CHAPTER_PAGES.map((page, i) => ({
    page,
    start: i === 0 ? 0 : BOOK.huntS + i * BOOK.glanceS,
    end: BOOK.huntS + (i + 1) * BOOK.glanceS,
    hunt: i === 0,
  }))

export const lastEnd = (visits: Visit[]) => visits[visits.length - 1].end

// Past this many dishes, leafing through the book beats the index
export const bookCrossover = () => (BOOK.pages * BOOK.glanceS) / BOOK.huntS

// "0.04 ms", "524 ms", "10 s", "100 s", "50 min", "17 h"
export function formatMs(ms: number): string {
  if (ms < 1) return `${Number(ms.toFixed(2))} ms`
  if (ms < 1000) return `${Math.round(ms)} ms`
  const s = ms / 1000
  if (s < 120) return `${s < 10 ? Number(s.toFixed(1)) : Math.round(s)} s`
  const min = s / 60
  if (min < 120) return `${Math.round(min)} min`
  return `${Math.round(min / 60)} h`
}

// "30 s", "1 min", "13 min 20 s", for the cookbook's clock
export function formatSeconds(seconds: number): string {
  const whole = Math.round(seconds)
  if (whole < 60) return `${whole} s`
  const min = Math.floor(whole / 60)
  const rest = whole - min * 60
  return rest ? `${min} min ${rest} s` : `${min} min`
}

// "0.0001%", "0.017%", "2.5%", "100%"
export function formatPercent(s: number): string {
  return `${Number((s * 100).toPrecision(2))}%`
}

// "1,654"
export const count = (n: number) => Math.round(n).toLocaleString('en-US')

// "302×"
export const times = (ratio: number) => `${Math.round(ratio)}×`
