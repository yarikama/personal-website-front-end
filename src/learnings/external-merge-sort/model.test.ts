import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  DATA_SIZES,
  externalSort,
  formatBytes,
  formatCount,
  GB,
  ioCount,
  MB,
  MEMORY_SIZES,
  mergeOrder,
  pagesIn,
  passes,
  passLimit,
  phaseOne,
  randomRecords,
  runChain,
  runCount,
  TB,
  twoPassLimit,
} from './model'

describe('the sort that runs page by page', () => {
  it('sorts as Array.sort does, on many seeded tables', () => {
    const random = seeded(1)
    for (let trial = 0; trial < 300; trial++) {
      const n = Math.floor(random() * 400)
      const memory = 3 + Math.floor(random() * 6)
      const perPage = 1 + Math.floor(random() * 5)
      const records = randomRecords(random, n, 50)
      const { sorted } = externalSort(records, memory, perPage)
      expect(sorted).toEqual([...records].sort((a, b) => a - b))
    }
  })

  it('reads and writes as many pages as the formula says, in as many passes', () => {
    const random = seeded(2)
    for (let trial = 0; trial < 300; trial++) {
      const n = 1 + Math.floor(random() * 600)
      const memory = 3 + Math.floor(random() * 8)
      const perPage = 1 + Math.floor(random() * 4)
      const result = externalSort(randomRecords(random, n), memory, perPage)
      const pages = Math.ceil(n / perPage)
      expect(result.passes).toBe(passes(pages, memory))
      expect(result.reads).toBe(pages * result.passes)
      expect(result.writes).toBe(pages * result.passes)
      expect(result.reads + result.writes).toBe(ioCount(pages, memory))
      expect(result.runs).toHaveLength(runCount(pages, memory))
    }
  })

  it('never holds more pages than memory has', () => {
    const random = seeded(3)
    for (let trial = 0; trial < 200; trial++) {
      const memory = 3 + Math.floor(random() * 8)
      const result = externalSort(randomRecords(random, Math.floor(random() * 500)), memory, 2)
      expect(result.peak).toBeLessThanOrEqual(memory)
    }
  })

  it('fills memory exactly when it merges as many runs as it can', () => {
    // 12 pages, 4 of memory: three runs, three input pages and the output
    expect(externalSort(randomRecords(seeded(4), 12), 4, 1).peak).toBe(4)
  })

  it('handles nothing to sort', () => {
    expect(externalSort([], 4, 2)).toMatchObject({ sorted: [], reads: 0, writes: 0, passes: 1 })
  })
})

describe('how many passes', () => {
  it('is one when the data fits in memory', () => {
    expect(passes(1, 4)).toBe(1)
    expect(passes(4, 4)).toBe(1)
  })

  it('is two up to M(M − 1) pages, and three one page past it', () => {
    for (const memory of [3, 4, 10, 256, 262144]) {
      expect(passes(memory + 1, memory)).toBe(2)
      expect(passes(twoPassLimit(memory), memory)).toBe(2)
      expect(passes(twoPassLimit(memory) + 1, memory)).toBe(3)
    }
  })

  it('takes k passes exactly up to passLimit(M, k)', () => {
    for (const memory of [3, 5, 16]) {
      for (let k = 2; k <= 5; k++) {
        expect(passes(passLimit(memory, k), memory)).toBe(k)
        expect(passes(passLimit(memory, k) + 1, memory)).toBe(k + 1)
      }
    }
  })

  it('agrees with the sort itself at the boundary', () => {
    const records = randomRecords(seeded(5), 13)
    expect(externalSort(records.slice(0, 12), 4, 1).passes).toBe(2)
    expect(externalSort(records, 4, 1).passes).toBe(3)
  })

  it('refuses memory too small to merge', () => {
    expect(() => passes(10, 2)).toThrow()
    expect(() => externalSort([1, 2, 3], 2, 1)).toThrow()
  })
})

describe('the page I/Os', () => {
  it('are 4B for two passes, 3B when the result is handed on', () => {
    expect(ioCount(12, 4)).toBe(48)
    expect(ioCount(12, 4, false)).toBe(36)
  })

  it('are 2B a pass, less one write of B when handed on', () => {
    expect(ioCount(13, 4)).toBe(78)
    expect(ioCount(4, 4, false)).toBe(4)
  })
})

describe('the sizes the page quotes', () => {
  it('sorts 100 GB with 1 GB of memory in two passes, from 100 runs', () => {
    const memory = pagesIn(GB)
    const pages = pagesIn(100 * GB)
    expect(memory).toBe(262144)
    expect(runCount(pages, memory)).toBe(100)
    expect(passes(pages, memory)).toBe(2)
  })

  it('reaches about 256 TB in two passes with 1 GB, and about 4 GB with 4 MB', () => {
    expect(formatBytes(twoPassLimit(pagesIn(GB)) * 4096)).toBe('256 TB')
    expect(formatBytes(twoPassLimit(pagesIn(4 * MB)) * 4096)).toBe('4 GB')
    expect(twoPassLimit(4)).toBe(12)
  })

  it('needs three passes for 1 GB with 1 MB of memory: 1,024 runs, then 5, then 1', () => {
    const memory = pagesIn(MB)
    const pages = pagesIn(GB)
    expect(runCount(pages, memory)).toBe(1024)
    expect(Math.ceil(1024 / (memory - 1))).toBe(5)
    expect(passes(pages, memory)).toBe(3)
    expect(runChain(pages, memory)).toEqual([1024, 5, 1])
  })

  it('counts one pass for each run count it passes through', () => {
    for (const [pages, memory] of [[12, 4], [13, 4], [4, 4], [10 ** 9, 50]]) {
      expect(runChain(pages, memory)).toHaveLength(passes(pages, memory))
    }
  })

  it('needs twice the memory for four times the data', () => {
    const memory = pagesIn(GB)
    expect(twoPassLimit(2 * memory) / twoPassLimit(memory)).toBeCloseTo(4, 4)
  })
})

describe('the story’s pieces', () => {
  it('cuts the records into sorted memoryfuls, in the order they come', () => {
    expect(phaseOne([4, 3, 9, 1, 7, 2], 2, 1)).toEqual([
      [3, 4],
      [1, 9],
      [2, 7],
    ])
  })

  it('takes the smallest head each time, the first run on a tie', () => {
    const runs = [
      [1, 4],
      [1, 2],
      [3],
    ]
    expect(mergeOrder(runs)).toEqual([0, 1, 1, 2, 0])
  })

  it('merges into sorted order', () => {
    const random = seeded(6)
    for (let trial = 0; trial < 50; trial++) {
      const runs = phaseOne(randomRecords(random, 40), 3, 2)
      const next = runs.map(() => 0)
      const out = mergeOrder(runs).map((r) => runs[r][next[r]++])
      expect(out).toEqual(runs.flat().sort((a, b) => a - b))
    }
  })
})

describe('the figures’ numbers', () => {
  it('read well', () => {
    expect(formatBytes(100 * GB)).toBe('100 GB')
    expect(formatBytes(1.5 * TB)).toBe('1.5 TB')
    expect(formatBytes(1023.99 * GB)).toBe('1 TB')
    expect(formatCount(104857600)).toBe('105 million')
    expect(formatCount(1572864)).toBe('1.6 million')
    expect(formatCount(48)).toBe('48')
  })

  it('offer sizes in order, with the guess’s sizes among them', () => {
    expect([...DATA_SIZES].sort((a, b) => a - b)).toEqual(DATA_SIZES)
    expect(DATA_SIZES).toContain(100 * GB)
    expect(MEMORY_SIZES).toContain(GB)
    expect(Math.min(...MEMORY_SIZES.map(pagesIn))).toBeGreaterThanOrEqual(3)
  })
})

describe('the desk story', async () => {
  const { DESK, DESK_Y, DONE, GHOST_X, PAPERS, SCENES } = await import('./story')

  it('counts the reads and writes the sort itself counts', () => {
    const sort = externalSort(PAPERS, DESK, 1)
    expect([DONE.reads, DONE.writes]).toEqual([sort.reads, sort.writes])
  })

  it('never has more papers on the desk than it has room for', () => {
    for (const frames of Object.values(SCENES)) {
      for (const frame of frames) {
        const onDesk = Object.values(frame.at).filter((spot) => spot.y === DESK_Y && spot.x < GHOST_X)
        expect(onDesk.length).toBeLessThanOrEqual(DESK)
      }
    }
  })

  it('ends with the papers in order', () => {
    const order = Object.entries(DONE.at).sort((a, b) => a[1].x - b[1].x).map(([id]) => Number(id))
    expect(order).toEqual([...PAPERS].sort((a, b) => a - b))
  })
})
