// Two-phase multiway merge sort: the counts, and a small sort that really
// runs page by page, so the figures draw what it does and the tests can hold
// it to the counts.
//
// Sizes count pages. B is the data's pages, M the pages of memory the sort
// may use. A pass reads every page once and writes it once.

export const KB = 1024
export const MB = KB * 1024
export const GB = MB * 1024
export const TB = GB * 1024
export const PB = TB * 1024

// The page size the real-sized figures use
export const PAGE_BYTES = 4 * KB

export const pagesIn = (bytes: number) => Math.ceil(bytes / PAGE_BYTES)

// Phase 1 fills memory, sorts it and writes it out: one run per memoryful
export const runCount = (pages: number, memory: number) => Math.ceil(pages / memory)

// Every merge holds one page of each run it reads and one page of output,
// so it can take at most M − 1 runs at a time
export const fanIn = (memory: number) => memory - 1

// How many passes over the data the sort needs: phase 1, then merges of up
// to M − 1 runs until one run is left. Data that fits in memory takes one.
export function passes(pages: number, memory: number): number {
  if (memory < 3) throw new Error('A merge needs at least two input pages and an output page')
  let runs = runCount(pages, memory)
  let count = 1
  while (runs > 1) {
    runs = Math.ceil(runs / fanIn(memory))
    count += 1
  }
  return count
}

// How many runs are left after each pass, down to the one sorted run
export function runChain(pages: number, memory: number): number[] {
  const chain = [runCount(pages, memory)]
  while (chain[chain.length - 1] > 1) chain.push(Math.ceil(chain[chain.length - 1] / fanIn(memory)))
  return chain
}

// The most pages k passes can sort: M pages a run, and each merge pass
// multiplies how much one run holds by M − 1. Two passes: M(M − 1), about M².
export const passLimit = (memory: number, k: number) => memory * fanIn(memory) ** (k - 1)
export const twoPassLimit = (memory: number) => passLimit(memory, 2)

// Page reads and writes: each pass reads and writes every page, except that
// the last pass writes nothing when the next step takes the sorted records
// as they come (4B for two passes, or 3B)
export const ioCount = (pages: number, memory: number, written = true) =>
  2 * pages * passes(pages, memory) - (written ? 0 : pages)

// Phase 1 on records: cut them into memoryfuls of `memory` pages of
// `perPage` records, in the order they come, and sort each one
export function phaseOne(records: number[], memory: number, perPage: number): number[][] {
  const size = memory * perPage
  const runs: number[][] = []
  for (let at = 0; at < records.length; at += size) runs.push(records.slice(at, at + size).sort((a, b) => a - b))
  return runs
}

// Which run each record of a merge comes from, in the order they come out:
// always the smallest of the runs' heads, the first run's on a tie
export function mergeOrder(runs: number[][]): number[] {
  const next = runs.map(() => 0)
  const order: number[] = []
  for (;;) {
    let from = -1
    runs.forEach((run, r) => {
      if (next[r] < run.length && (from < 0 || run[next[r]] < runs[from][next[from]])) from = r
    })
    if (from < 0) return order
    order.push(from)
    next[from] += 1
  }
}

// Records in pages of `perPage`, the last one maybe not full
const paginate = (records: number[], perPage: number) =>
  Array.from({ length: Math.ceil(records.length / perPage) }, (_, i) => records.slice(i * perPage, (i + 1) * perPage))

export interface SortResult {
  sorted: number[]
  // Page reads and writes, the sorted result written back included
  reads: number
  writes: number
  passes: number
  // The runs phase 1 left, in records
  runs: number[][]
  // The most pages held in memory at once
  peak: number
}

// The whole sort on `records`, kept on "disk" as pages of `perPage`, with
// room for `memory` pages, counting every page that crosses between them
export function externalSort(records: number[], memory: number, perPage: number): SortResult {
  if (memory < 3) throw new Error('A merge needs at least two input pages and an output page')
  let reads = 0
  let writes = 0
  let peak = 0
  const file = paginate(records, perPage)

  // Phase 1: read a memoryful, sort it, write it back as a run
  let runs: number[][][] = []
  for (let at = 0; at < file.length; at += memory) {
    const held = file.slice(at, at + memory)
    reads += held.length
    peak = Math.max(peak, held.length)
    const run = paginate(held.flat().sort((a, b) => a - b), perPage)
    writes += run.length
    runs.push(run)
  }
  const first = runs.map((run) => run.flat())
  let count = 1

  // Merge passes, M − 1 runs at a time, until one run is left
  while (runs.length > 1) {
    const merged: number[][][] = []
    for (let g = 0; g < runs.length; g += fanIn(memory)) {
      const group = runs.slice(g, g + fanIn(memory))
      // In memory: the page each run is on (none once it is used up), where
      // in it, and one output page
      const page = group.map(() => 0)
      const held: (number[] | null)[] = group.map((run) => {
        reads += 1
        return run[0]
      })
      const at = group.map(() => 0)
      let out: number[] = []
      const result: number[][] = []
      for (;;) {
        peak = Math.max(peak, held.filter(Boolean).length + 1)
        let from = -1
        let smallest = Infinity
        held.forEach((p, r) => {
          if (p && p[at[r]] < smallest) {
            from = r
            smallest = p[at[r]]
          }
        })
        if (from < 0) break
        out.push(smallest)
        if (out.length === perPage) {
          result.push(out)
          writes += 1
          out = []
        }
        at[from] += 1
        if (at[from] === held[from]!.length) {
          // This page is used up: the run's next one comes in, if it has one
          page[from] += 1
          at[from] = 0
          held[from] = page[from] < group[from].length ? group[from][page[from]] : null
          if (held[from]) reads += 1
        }
      }
      if (out.length) {
        result.push(out)
        writes += 1
      }
      merged.push(result)
    }
    runs = merged
    count += 1
  }

  return { sorted: runs.length ? runs[0].flat() : [], reads, writes, passes: count, runs: first, peak }
}

// Whole numbers between `low` and `high`, from `random`: a table to sort
export const randomRecords = (random: () => number, n: number, high = 1000) =>
  Array.from({ length: n }, () => Math.floor(random() * high))

// "256 TB" for 2⁴⁸ bytes: counting in powers of 2, rounded to what reads well
export function formatBytes(bytes: number): string {
  const units: [string, number][] = [
    ['KB', KB],
    ['MB', MB],
    ['GB', GB],
    ['TB', TB],
    ['PB', PB],
  ]
  const round = (value: number) => (value >= 10 ? Math.round(value) : Number(value.toFixed(1)))
  if (bytes < KB) return `${bytes} B`
  let u = units.length - 1
  while (bytes < units[u][1]) u -= 1
  // 1023.9 GB reads as 1 TB
  if (round(bytes / units[u][1]) >= 1024 && u < units.length - 1) u += 1
  return `${round(bytes / units[u][1]).toLocaleString('en-US')} ${units[u][0]}`
}

// "105 million" style counts, for page I/Os
export function formatCount(n: number): string {
  const steps: [string, number][] = [
    ['trillion', 1e12],
    ['billion', 1e9],
    ['million', 1e6],
  ]
  for (const [word, size] of steps) {
    if (n >= size) {
      const value = n / size
      return `${value >= 10 ? Math.round(value) : Number(value.toFixed(1))} ${word}`
    }
  }
  return Math.round(n).toLocaleString('en-US')
}

// The sizes the real-system figure offers: 1, 2 and 5 of each unit from
// 1 MB to 1 PB for the data, powers of 4 from 64 KB to 4 GB for memory
export const DATA_SIZES = [MB, GB, TB].flatMap((unit) => [1, 2, 5, 10, 20, 50, 100, 200, 500].map((n) => n * unit)).concat(PB)
export const MEMORY_SIZES = [64 * KB, 256 * KB, MB, 4 * MB, 16 * MB, 64 * MB, 256 * MB, GB, 4 * GB]
