// Join algorithms: what each costs in page I/Os, how much memory it needs to
// run that way, and small joins that really run page by page, so the tests
// can hold them to the formulas.
//
// Sizes count pages. B(R) and B(S) are the two tables' pages, M the pages of
// memory the join may use. Every algorithm puts the smaller table on the side
// it keeps in memory (the chunks, the hash table, the partitions it loads).
// Writing the join's own result is not counted: the next step usually takes
// it as it comes.

// ---------------------------------------------------------------------------
// The formulas

export type Algorithm = 'nested' | 'onePass' | 'grace' | 'hybrid' | 'sortMerge'
export const ALGORITHMS: Algorithm[] = ['nested', 'onePass', 'grace', 'hybrid', 'sortMerge']

// Record by record, with no memory to speak of: every record of one table
// against every record of the other, a page read each time
export const tupleNestedLoopIos = (tuplesR: number, tuplesS: number) => tuplesR * tuplesS

// Block nested loop: the smaller table comes in chunks of M − 1 pages, and
// the larger is read through the last page once for every chunk
export const chunks = (small: number, m: number) => Math.ceil(small / (m - 1))
export function nestedLoopIos(r: number, s: number, m: number): number {
  const small = Math.min(r, s)
  return small + chunks(small, m) * Math.max(r, s)
}

// One-pass hash join: the smaller table fits in M − 1 pages, leaving one
// page to read the larger through, and each is read once
export const fitsInMemory = (r: number, s: number, m: number) => Math.min(r, s) <= m - 1
export const onePassIos = (r: number, s: number, m: number) => (fitsInMemory(r, s, m) ? r + s : null)

// Grace hash join: M − 1 partitions, one output page each and one page to
// read through. Then a partition of the smaller table, about B(S)/(M − 1)
// pages, has to fit in M − 1 pages: B(S) up to (M − 1)², about M².
export const partitionCount = (m: number) => m - 1
export const partitionPages = (small: number, m: number) => Math.ceil(small / partitionCount(m))
export const partitionLimit = (m: number) => (m - 1) ** 2
export const graceFits = (r: number, s: number, m: number) => partitionPages(Math.min(r, s), m) <= m - 1
// Read both, write both as partitions, read them back
export const graceIos = (r: number, s: number, m: number) => (graceFits(r, s, m) ? 3 * (r + s) : null)

// Hybrid hash join: Grace, with as much of the smaller table as memory holds
// kept there while partitioning, so that share is never written or read
// back. The textbook's estimate: about (3 − 2M/B(S))(B(R) + B(S)). When the
// smaller table fits it is all kept, and that is the one-pass join.
export function hybridIos(r: number, s: number, m: number): number | null {
  if (fitsInMemory(r, s, m)) return r + s
  if (!graceFits(r, s, m)) return null
  return Math.round((3 - (2 * m) / Math.min(r, s)) * (r + s))
}

// Sort-merge join. Sorted runs of M pages, as external merge sort makes them
export const runCount = (pages: number, m: number) => Math.ceil(pages / m)
// The passes a two-phase multiway merge sort takes: runs, then merges of up
// to M − 1 runs until one is left
export function sortPasses(pages: number, m: number): number {
  let runs = runCount(pages, m)
  let passes = 1
  while (runs > 1) {
    runs = Math.ceil(runs / (m - 1))
    passes += 1
  }
  return passes
}
// The runs of both tables merge at once, a page each, joining as they go
export const mergeAtOnce = (r: number, s: number, m: number) => runCount(r, m) + runCount(s, m) <= m - 1
// Or each table is sorted in full first (a read and a write a pass), then
// the two sorted files are merged: 5(B(R) + B(S)) when each takes two passes
export const sortsInTwoPasses = (pages: number, m: number) => sortPasses(pages, m) <= 2
export function sortMergeIos(r: number, s: number, m: number): number | null {
  if (mergeAtOnce(r, s, m)) return 3 * (r + s)
  if (!sortsInTwoPasses(r, m) || !sortsInTwoPasses(s, m)) return null
  return 2 * r * sortPasses(r, m) + 2 * s * sortPasses(s, m) + r + s
}

export function ios(algorithm: Algorithm, r: number, s: number, m: number): number | null {
  switch (algorithm) {
    case 'nested':
      return nestedLoopIos(r, s, m)
    case 'onePass':
      return onePassIos(r, s, m)
    case 'grace':
      return graceIos(r, s, m)
    case 'hybrid':
      return hybridIos(r, s, m)
    case 'sortMerge':
      return sortMergeIos(r, s, m)
  }
}

// Every algorithm's cost, and the least of them
export function costs(r: number, s: number, m: number): { algorithm: Algorithm; ios: number | null }[] {
  return ALGORITHMS.map((algorithm) => ({ algorithm, ios: ios(algorithm, r, s, m) }))
}
export function cheapest(r: number, s: number, m: number): number {
  return Math.min(...costs(r, s, m).flatMap((c) => (c.ios === null ? [] : [c.ios])))
}

// The course system's rule for choosing (MyDB, Assignment 8): the scan join,
// a one-pass hash join, only while the smaller table takes at most half the
// buffer pool's pages; sort-merge otherwise
export const courseRule = (r: number, s: number, pool: number): 'scan' | 'sortMerge' =>
  Math.min(r, s) > pool / 2 ? 'sortMerge' : 'scan'

// ---------------------------------------------------------------------------
// Joins that run page by page

export interface Row {
  key: number
  id: number
}
// A table on disk: pages of rows
export type Table = Row[][]

export const paginate = (rows: Row[], perPage: number): Table =>
  Array.from({ length: Math.ceil(rows.length / perPage) }, (_, i) => rows.slice(i * perPage, (i + 1) * perPage))

// `n` rows with keys below `keys`, ids from 0, in pages of `perPage`
export function randomTable(random: () => number, n: number, keys: number, perPage: number): Table {
  return paginate(
    Array.from({ length: n }, (_, id) => ({ key: Math.floor(random() * keys), id })),
    perPage
  )
}

// A join's result: the ids of each matching pair, R's then S's, in order
export type Pairs = [number, number][]
const ordered = (pairs: Pairs) => pairs.sort((a, b) => a[0] - b[0] || a[1] - b[1])

export interface JoinRun {
  pairs: Pairs
  reads: number
  writes: number
  // The most pages held in memory at once
  peak: number
}

// The referee: every row of R against every row of S
export function bruteForceJoin(r: Table, s: Table): Pairs {
  const pairs: Pairs = []
  for (const a of r.flat()) for (const b of s.flat()) if (a.key === b.key) pairs.push([a.id, b.id])
  return ordered(pairs)
}

// Which is held in memory: the smaller table. `pair` puts a match back in R, S order.
function sides(r: Table, s: Table) {
  const swap = r.length < s.length
  return {
    small: swap ? r : s,
    big: swap ? s : r,
    pair: (smallRow: Row, bigRow: Row): [number, number] => (swap ? [smallRow.id, bigRow.id] : [bigRow.id, smallRow.id]),
  }
}

// An in-memory hash table on some pages' rows, by key
function hashed(pages: Table): Map<number, Row[]> {
  const table = new Map<number, Row[]>()
  for (const row of pages.flat()) table.set(row.key, [...(table.get(row.key) ?? []), row])
  return table
}

// Block nested loop, counting into `io`: chunks of M − 1 pages of `small`,
// and all of `big` read through the last page for each chunk
function nestedInto(small: Table, big: Table, m: number, pair: (a: Row, b: Row) => [number, number], io: JoinRun) {
  for (let at = 0; at < small.length; at += m - 1) {
    const chunk = small.slice(at, at + m - 1)
    io.reads += chunk.length
    io.peak = Math.max(io.peak, chunk.length + 1)
    const lookup = hashed(chunk)
    for (const page of big) {
      io.reads += 1
      for (const row of page) for (const match of lookup.get(row.key) ?? []) io.pairs.push(pair(match, row))
    }
  }
}

const start = (): JoinRun => ({ pairs: [], reads: 0, writes: 0, peak: 0 })

export function blockNestedLoopJoin(r: Table, s: Table, m: number): JoinRun {
  if (m < 2) throw new Error('A nested loop needs a page for each table')
  const { small, big, pair } = sides(r, s)
  const io = start()
  nestedInto(small, big, m, pair, io)
  ordered(io.pairs)
  return io
}

export function onePassHashJoin(r: Table, s: Table, m: number): JoinRun {
  const { small, big, pair } = sides(r, s)
  if (small.length > m - 1) throw new Error('The smaller table does not fit in memory')
  const io = start()
  nestedInto(small, big, m, pair, io)
  ordered(io.pairs)
  return io
}

// Which partition a key goes to
export type PartitionOf = (key: number, parts: number) => number
export const byRemainder: PartitionOf = (key, parts) => key % parts

export interface GraceRun extends JoinRun {
  // The partitions written, in pages, the smaller table's and the larger's
  partitions: { small: number[]; big: number[] }
  // Whether some partition of the smaller table did not fit in memory (it
  // was then joined in chunks, rereading the other side)
  overflow: boolean
}

// Read a table through one page and deal its rows into `parts` partitions,
// each with an output page that goes to disk when it fills
function partition(table: Table, parts: number, perPage: number, of: PartitionOf, io: JoinRun): Table[] {
  const out: Table[] = Array.from({ length: parts }, () => [])
  const buffers: Row[][] = Array.from({ length: parts }, () => [])
  io.peak = Math.max(io.peak, parts + 1)
  for (const page of table) {
    io.reads += 1
    for (const row of page) {
      const p = of(row.key, parts)
      buffers[p].push(row)
      if (buffers[p].length === perPage) {
        out[p].push(buffers[p])
        io.writes += 1
        buffers[p] = []
      }
    }
  }
  buffers.forEach((buffer, p) => {
    if (buffer.length) {
      out[p].push(buffer)
      io.writes += 1
    }
  })
  return out
}

export function graceHashJoin(r: Table, s: Table, m: number, perPage: number, of: PartitionOf = byRemainder): GraceRun {
  if (m < 3) throw new Error('Partitioning needs at least two partitions and a page to read through')
  const { small, big, pair } = sides(r, s)
  const io = start()
  const parts = partitionCount(m)
  const smallParts = partition(small, parts, perPage, of, io)
  const bigParts = partition(big, parts, perPage, of, io)
  let overflow = false
  smallParts.forEach((part, p) => {
    if (part.length > m - 1) overflow = true
    nestedInto(part, bigParts[p], m, pair, io)
  })
  ordered(io.pairs)
  return {
    ...io,
    partitions: { small: smallParts.map((part) => part.length), big: bigParts.map((part) => part.length) },
    overflow,
  }
}

// A sorted run being read a page at a time: rows come out in key order, and
// each page counts as a read when it comes in
class RunReader {
  private page = 0
  private at = 0
  constructor(
    private run: Table,
    private io: JoinRun
  ) {
    if (run.length) io.reads += 1
  }
  get head(): Row | undefined {
    return this.run[this.page]?.[this.at]
  }
  get open() {
    return this.page < this.run.length
  }
  next(): Row {
    const row = this.run[this.page][this.at]
    this.at += 1
    if (this.at === this.run[this.page].length) {
      this.page += 1
      this.at = 0
      if (this.page < this.run.length) this.io.reads += 1
    }
    return row
  }
}

// Many runs read at once, a page of each in memory: their rows in key order
class Merged {
  private readers: RunReader[]
  constructor(runs: Table[], io: JoinRun) {
    this.readers = runs.map((run) => new RunReader(run, io))
  }
  get head(): Row | undefined {
    return this.smallest()?.head
  }
  next(): Row {
    return this.smallest()!.next()
  }
  private smallest(): RunReader | undefined {
    let best: RunReader | undefined
    for (const reader of this.readers) if (reader.head && (!best || reader.head.key < best.head!.key)) best = reader
    return best
  }
}

// Phase 1 of the sort: memoryfuls of M pages, sorted and written as runs
function makeRuns(table: Table, m: number, perPage: number, io: JoinRun): Table[] {
  const runs: Table[] = []
  for (let at = 0; at < table.length; at += m) {
    const held = table.slice(at, at + m)
    io.reads += held.length
    io.peak = Math.max(io.peak, held.length)
    const run = paginate(
      held.flat().sort((a, b) => a.key - b.key || a.id - b.id),
      perPage
    )
    io.writes += run.length
    runs.push(run)
  }
  return runs
}

// Merge runs M − 1 at a time, writing each merged run, until one is left
function mergeToOne(runs: Table[], m: number, perPage: number, io: JoinRun): Table[] {
  while (runs.length > 1) {
    const next: Table[] = []
    for (let g = 0; g < runs.length; g += m - 1) {
      const group = runs.slice(g, g + m - 1)
      io.peak = Math.max(io.peak, group.length + 1)
      const merged = new Merged(group, io)
      const rows: Row[] = []
      while (merged.head) rows.push(merged.next())
      const run = paginate(rows, perPage)
      io.writes += run.length
      next.push(run)
    }
    runs = next
  }
  return runs
}

export interface SortMergeRun extends JoinRun {
  // Whether the runs of both tables were merged at once (three trips a page)
  atOnce: boolean
}

export function sortMergeJoin(r: Table, s: Table, m: number, perPage: number): SortMergeRun {
  if (m < 3) throw new Error('A merge needs at least two input pages and an output page')
  const io = start()
  let runsR = makeRuns(r, m, perPage, io)
  let runsS = makeRuns(s, m, perPage, io)
  const atOnce = runsR.length + runsS.length <= m - 1
  if (!atOnce) {
    runsR = mergeToOne(runsR, m, perPage, io)
    runsS = mergeToOne(runsS, m, perPage, io)
  }
  mergeJoin(runsR, runsS, io)
  return { ...io, atOnce }
}

// Tables already sorted on the key: only the merge, each page read once
export const sortedMergeIos = (r: number, s: number) => r + s
export function mergeSortedJoin(r: Table, s: Table): JoinRun {
  const io = start()
  mergeJoin([r], [s], io)
  return io
}

// The merge that joins: a page of every run in memory, rows in key order
// from both sides, and every pair that shares a key
function mergeJoin(runsR: Table[], runsS: Table[], io: JoinRun) {
  io.peak = Math.max(io.peak, runsR.length + runsS.length)
  const left = new Merged(runsR, io)
  const right = new Merged(runsS, io)
  while (left.head && right.head) {
    const key = Math.min(left.head.key, right.head.key)
    if (left.head.key !== right.head.key) {
      if (left.head.key === key) left.next()
      else right.next()
      continue
    }
    // Every row with this key on both sides: all their pairs
    const fromR: Row[] = []
    const fromS: Row[] = []
    while (left.head?.key === key) fromR.push(left.next())
    while (right.head?.key === key) fromS.push(right.next())
    for (const a of fromR) for (const b of fromS) io.pairs.push([a.id, b.id])
  }
  // The formulas count a full read of both sides. Once one side runs out,
  // a real join could stop and save the rest of the other; this one reads
  // on to the end, so its count is the formula's.
  while (left.head) left.next()
  while (right.head) right.next()
  ordered(io.pairs)
}

// ---------------------------------------------------------------------------
// The numbers the page uses

// The course's worked example: R 1,000 pages, S 500, 101 pages of memory,
// 10 rows a page
export const EXAMPLE = { r: 1000, s: 500, m: 101, perPage: 10 }

// Check yourself: R 10,000 pages, S 2,000, 51 pages of memory
export const CHECK = { r: 10_000, s: 2000, m: 51 }

// The real-system figure's sizes
export const TABLE_SIZES = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10_000, 20_000, 50_000, 100_000, 1_000_000]
export const MEMORY_SIZES = [3, 6, 11, 26, 51, 101, 201, 501, 1001, 5001]

export const formatCount = (n: number) => Math.round(n).toLocaleString('en-US')
