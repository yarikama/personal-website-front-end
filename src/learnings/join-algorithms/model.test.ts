import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  blockNestedLoopJoin,
  bruteForceJoin,
  CHECK,
  cheapest,
  costs,
  courseRule,
  EXAMPLE,
  fitsInMemory,
  graceFits,
  graceHashJoin,
  graceIos,
  hybridIos,
  MEMORY_SIZES,
  mergeAtOnce,
  mergeSortedJoin,
  nestedLoopIos,
  onePassHashJoin,
  onePassIos,
  paginate,
  partitionLimit,
  randomTable,
  sortedMergeIos,
  sortMergeIos,
  sortMergeJoin,
  sortPasses,
  TABLE_SIZES,
  tupleNestedLoopIos,
  type Row,
  type Table,
} from './model'

// Two random tables of `r` and `s` pages that share some keys
function tables(random: () => number, r: number, s: number, perPage: number, keys: number): [Table, Table] {
  return [randomTable(random, r * perPage, keys, perPage), randomTable(random, s * perPage, keys, perPage)]
}

describe('every join gives the same result as the brute-force one', () => {
  it('on hundreds of seeded tables, with duplicate keys on both sides', () => {
    const random = seeded(1)
    for (let trial = 0; trial < 300; trial++) {
      const perPage = 1 + Math.floor(random() * 4)
      const r = Math.floor(random() * 30)
      const s = Math.floor(random() * 30)
      const m = 3 + Math.floor(random() * 10)
      const [R, S] = tables(random, r, s, perPage, 1 + Math.floor(random() * 40))
      const expected = bruteForceJoin(R, S)
      expect(blockNestedLoopJoin(R, S, m).pairs).toEqual(expected)
      expect(graceHashJoin(R, S, m, perPage).pairs).toEqual(expected)
      expect(sortMergeJoin(R, S, m, perPage).pairs).toEqual(expected)
      if (Math.min(r, s) <= m - 1) expect(onePassHashJoin(R, S, m).pairs).toEqual(expected)
    }
  })

  it('with the tables either way round', () => {
    const random = seeded(2)
    const [R, S] = tables(random, 12, 5, 2, 8)
    const flip = (pairs: [number, number][]) => pairs.map(([a, b]) => [b, a]).sort((x, y) => x[0] - y[0] || x[1] - y[1])
    expect(blockNestedLoopJoin(S, R, 4).pairs).toEqual(flip(bruteForceJoin(R, S)))
    expect(graceHashJoin(S, R, 4, 2).pairs).toEqual(flip(bruteForceJoin(R, S)))
  })

  it('finds nothing when no key is shared, and nothing in an empty table', () => {
    const odd = paginate([1, 3, 5].map((key, id): Row => ({ key, id })), 1)
    const even = paginate([2, 4].map((key, id): Row => ({ key, id })), 1)
    expect(blockNestedLoopJoin(odd, even, 3).pairs).toEqual([])
    expect(sortMergeJoin(odd, even, 3, 1).pairs).toEqual([])
    expect(graceHashJoin(odd, [], 3, 1).pairs).toEqual([])
  })

  it('pairs every row with every row when all keys are equal', () => {
    const same = (n: number) => paginate(Array.from({ length: n }, (_, id): Row => ({ key: 7, id })), 2)
    expect(sortMergeJoin(same(6), same(4), 3, 2).pairs).toHaveLength(24)
    expect(graceHashJoin(same(6), same(4), 3, 2).pairs).toHaveLength(24)
  })
})

describe('the joins count the page I/Os the formulas say', () => {
  it('block nested loop: S once, R once per chunk of M − 1 pages', () => {
    const random = seeded(3)
    for (let trial = 0; trial < 200; trial++) {
      const r = 1 + Math.floor(random() * 40)
      const s = 1 + Math.floor(random() * 40)
      const m = 2 + Math.floor(random() * 12)
      const [R, S] = tables(random, r, s, 3, 50)
      const run = blockNestedLoopJoin(R, S, m)
      expect(run.reads).toBe(nestedLoopIos(r, s, m))
      expect(run.writes).toBe(0)
      expect(run.peak).toBeLessThanOrEqual(m)
    }
  })

  it('one-pass hash: each table once, while the smaller fits in M − 1 pages', () => {
    const [R, S] = tables(seeded(4), 20, 6, 3, 30)
    expect(onePassHashJoin(R, S, 7).reads).toBe(onePassIos(20, 6, 7))
    expect(onePassIos(20, 6, 7)).toBe(26)
    expect(onePassIos(20, 7, 7)).toBeNull()
    expect(() => onePassHashJoin(R, S, 6)).toThrow()
  })

  it('Grace hash: three trips a page, with a row a page, when every partition fits', () => {
    const random = seeded(5)
    let checked = 0
    for (let trial = 0; trial < 300; trial++) {
      const m = 4 + Math.floor(random() * 9)
      const s = m + Math.floor((random() * (m - 1) ** 2) / 2)
      const r = s + Math.floor(random() * 60)
      const [R, S] = tables(random, r, s, 1, 1000)
      const run = graceHashJoin(R, S, m, 1)
      const empty = run.partitions.small.some((pages) => pages === 0)
      if (run.overflow || empty) continue
      checked += 1
      expect(run.reads + run.writes).toBe(graceIos(r, s, m))
      expect(run.writes).toBe(r + s)
      expect(run.peak).toBeLessThanOrEqual(m)
    }
    expect(checked).toBeGreaterThan(100)
  })

  it('Grace hash: at most a part-filled page more per partition with fuller pages', () => {
    const random = seeded(6)
    for (let trial = 0; trial < 200; trial++) {
      const m = 3 + Math.floor(random() * 8)
      const perPage = 2 + Math.floor(random() * 4)
      const r = m * 2 + Math.floor(random() * 30)
      const s = m * 2 + Math.floor(random() * 20)
      const [R, S] = tables(random, r, s, perPage, 1000)
      const run = graceHashJoin(R, S, m, perPage)
      if (run.overflow || run.partitions.small.some((pages) => pages === 0)) continue
      expect(run.reads + run.writes).toBeGreaterThanOrEqual(3 * (r + s))
      expect(run.reads + run.writes).toBeLessThanOrEqual(3 * (r + s) + 4 * (m - 1))
    }
  })

  it('sort-merge: 3 trips a page when the runs merge at once, 5 when each table is sorted first', () => {
    const random = seeded(7)
    for (let trial = 0; trial < 300; trial++) {
      const m = 3 + Math.floor(random() * 8)
      const perPage = 1 + Math.floor(random() * 4)
      const r = 1 + Math.floor(random() * m * (m - 1))
      const s = 1 + Math.floor(random() * m * (m - 1))
      const [R, S] = tables(random, r, s, perPage, 60)
      const run = sortMergeJoin(R, S, m, perPage)
      expect(run.atOnce).toBe(mergeAtOnce(r, s, m))
      expect(run.reads + run.writes).toBe(sortMergeIos(r, s, m))
      expect(run.peak).toBeLessThanOrEqual(m)
    }
    expect(sortMergeIos(12, 6, 6)).toBe(3 * 18)
    // Each needs both passes: 5(B(R) + B(S))
    expect(sortMergeIos(20, 20, 6)).toBe(5 * 40)
  })

  it('a merge alone reads each page once when the tables come sorted', () => {
    const sorted = (keys: number[]) => paginate(keys.map((key, id): Row => ({ key, id })), 2)
    const R = sorted([1, 2, 2, 4, 5, 7, 8, 9])
    const S = sorted([2, 3, 5, 9])
    const run = mergeSortedJoin(R, S)
    expect(run.pairs).toEqual(bruteForceJoin(R, S))
    expect(run.reads).toBe(sortedMergeIos(R.length, S.length))
  })
})

describe('what memory each needs', () => {
  it('one pass while the smaller fits in M − 1; partitions up to (M − 1)², about M²', () => {
    expect(fitsInMemory(1000, 100, 101)).toBe(true)
    expect(fitsInMemory(1000, 101, 101)).toBe(false)
    expect(partitionLimit(101)).toBe(10_000)
    expect(graceFits(1e6, 10_000, 101)).toBe(true)
    expect(graceFits(1e6, 10_001, 101)).toBe(false)
  })

  it('hashing asks only the smaller table to fit; sorting asks both together', () => {
    // A huge R beside a small-enough S: Grace runs, sort-merge can't merge at once
    expect(graceFits(1e6, 5000, 101)).toBe(true)
    expect(mergeAtOnce(1e6, 5000, 101)).toBe(false)
    expect(sortMergeIos(1e6, 5000, 101)).toBeNull()
  })

  it('hybrid hash is the one-pass join when the smaller fits, and Grace’s cost when it is far bigger than memory', () => {
    expect(hybridIos(1000, 100, 101)).toBe(1100)
    expect(hybridIos(1000, 101, 101)).toBe(1101)
    expect(hybridIos(1e6, 10_000, 101)! / graceIos(1e6, 10_000, 101)!).toBeGreaterThan(0.99)
    expect(hybridIos(1e6, 10_001, 101)).toBeNull()
  })

  it('takes the passes external merge sort takes', () => {
    expect(sortPasses(100, 101)).toBe(1)
    expect(sortPasses(101 * 100, 101)).toBe(2)
    expect(sortPasses(101 * 100 + 1, 101)).toBe(3)
  })
})

describe('the numbers the page quotes', () => {
  const { r, s, m, perPage } = EXAMPLE

  it('the course’s example: block nested loop 5,500; Grace and sort-merge 4,500; hybrid about 3,894', () => {
    expect(nestedLoopIos(r, s, m)).toBe(5500)
    expect(nestedLoopIos(r, s, m)).toBe(s + (s * r) / (m - 1))
    expect(onePassIos(r, s, m)).toBeNull()
    expect(graceIos(r, s, m)).toBe(4500)
    expect(sortMergeIos(r, s, m)).toBe(4500)
    expect(hybridIos(r, s, m)).toBe(3894)
    expect(cheapest(r, s, m)).toBe(3894)
  })

  it('the guess’s other options: page against page, and each once', () => {
    expect(r * s).toBe(500_000)
    expect(nestedLoopIos(r, s, 11)).toBe(50_500)
    expect(r + s).toBe(1500)
    expect(tupleNestedLoopIos(r * perPage, s * perPage)).toBe(50_000_000)
  })

  it('the cheapest join with 11, 101 and 501 pages: nested loop only, hybrid hash, one pass', () => {
    const runs = (memory: number) => costs(r, s, memory).filter((c) => c.ios !== null)
    expect(runs(11).map((c) => c.algorithm)).toEqual(['nested'])
    expect(cheapest(r, s, 11)).toBe(50_500)
    expect(runs(101).find((c) => c.ios === cheapest(r, s, 101))?.algorithm).toBe('hybrid')
    expect(onePassIos(r, s, 501)).toBe(cheapest(r, s, 501))
    // S is five times what memory holds
    expect(s / (m - 1)).toBe(5)
  })

  it('with 501 pages, S fits and one pass costs 1,500', () => {
    expect(onePassIos(r, s, 501)).toBe(1500)
    expect(cheapest(r, s, 501)).toBe(1500)
  })

  it('the course system picks sort-merge unless S is at most half the pool', () => {
    expect(courseRule(r, s, 101)).toBe('sortMerge')
    expect(courseRule(r, s, 999)).toBe('sortMerge')
    expect(courseRule(r, s, 1000)).toBe('scan')
  })

  it('check yourself: with 51 pages, Grace runs in three trips and sort-merge can’t', () => {
    expect(graceIos(CHECK.r, CHECK.s, CHECK.m)).toBe(36_000)
    expect(Math.ceil(CHECK.s / (CHECK.m - 1))).toBe(40)
    expect(Math.ceil(CHECK.r / CHECK.m) + Math.ceil(CHECK.s / CHECK.m)).toBe(237)
    expect(sortMergeIos(CHECK.r, CHECK.s, CHECK.m)).toBeNull()
    expect(nestedLoopIos(CHECK.r, CHECK.s, CHECK.m)).toBe(402_000)
  })

  it('the quick check: sorted tables merge in 1,500', () => {
    expect(sortedMergeIos(r, s)).toBe(1500)
  })

  it('a scaled-down run of the example counts what the formulas say', () => {
    // 100 and 50 pages with 11 of memory: the same shape, a tenth the size
    const [R, S] = tables(seeded(8), 100, 50, 1, 100_000)
    expect(blockNestedLoopJoin(R, S, 11).reads).toBe(nestedLoopIos(100, 50, 11))
    expect(nestedLoopIos(100, 50, 11)).toBe(550)
    // Sort-merge needs a little more memory to merge its runs at once: 8 + 4 runs in 14 pages
    const sm = sortMergeJoin(R, S, 14, 1)
    expect(sm.atOnce).toBe(true)
    expect(sm.reads + sm.writes).toBe(450)
  })

  it('the figure offers sizes in order, with the example’s among them', () => {
    expect([...TABLE_SIZES].sort((a, b) => a - b)).toEqual(TABLE_SIZES)
    expect([...MEMORY_SIZES].sort((a, b) => a - b)).toEqual(MEMORY_SIZES)
    expect(TABLE_SIZES).toContain(r)
    expect(TABLE_SIZES).toContain(s)
    expect(MEMORY_SIZES).toContain(m)
    expect(Math.min(...MEMORY_SIZES)).toBeGreaterThanOrEqual(3)
  })
})

describe('the stapling story', async () => {
  const story = await import('./story')
  const { BIG_ROOM, BOXES, byLastDigit, END, INVOICES, ROOM, SCENES, SLIPS, TABLE_Y } = story
  const sheets = (keys: number[]) => paginate(keys.map((key, id): Row => ({ key, id })), 1)

  it('counts what the joins themselves count', () => {
    expect(END.nested.reads).toBe(blockNestedLoopJoin(sheets(INVOICES), sheets(SLIPS), ROOM).reads)
    expect(END.nested.reads).toBe(30)
    expect(END.onePass.reads).toBe(onePassHashJoin(sheets(INVOICES), sheets(SLIPS), BIG_ROOM).reads)
    const grace = graceHashJoin(sheets(INVOICES), sheets(SLIPS), ROOM, 1, byLastDigit)
    expect(grace.overflow).toBe(false)
    expect([END.boxJoin.reads, END.boxJoin.writes]).toEqual([grace.reads, grace.writes])
    expect(END.boxJoin.reads + END.boxJoin.writes).toBe(54)
    expect([END.partition.reads, END.partition.writes]).toEqual([18, 18])
  })

  it('matches every slip to its invoice', () => {
    expect(SLIPS.every((key) => INVOICES.includes(key))).toBe(true)
    for (const scene of ['nested', 'onePass', 'boxJoin', 'sort'] as const) {
      for (const key of SLIPS) {
        expect(END[scene].at[`s${key}`].tone, `${scene} ${key}`).toBe('matched')
        expect(END[scene].at[`i${key}`].tone, `${scene} ${key}`).toBe('matched')
      }
      for (const key of INVOICES.filter((k) => !SLIPS.includes(k))) expect(END[scene].at[`i${key}`].tone).toBe('plain')
    }
  })

  it('never has more sheets on the table than it has room for', () => {
    for (const [scene, frames] of Object.entries(SCENES)) {
      const room = scene === 'onePass' ? BIG_ROOM : ROOM
      for (const frame of frames) {
        expect(Object.values(frame.at).filter((spot) => spot.y === TABLE_Y).length).toBeLessThanOrEqual(room)
      }
    }
  })

  it('deals the slips two to a box, so each box’s slips fit on the table', () => {
    const counts = Array(BOXES).fill(0)
    for (const key of SLIPS) counts[byLastDigit(key, BOXES)] += 1
    expect(counts).toEqual([2, 2, 2])
    expect(Math.max(...counts)).toBeLessThanOrEqual(ROOM - 1)
  })
})
