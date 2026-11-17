import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  allKeys,
  BILLION,
  buildTree,
  CARDS,
  cardsLeft,
  CATALOGUE,
  childIndex,
  emptyTree,
  FANOUT,
  fewestKeys,
  formatCount,
  formatMB,
  GUESS,
  HALF_FANOUT,
  halvingRun,
  halvings,
  height,
  insert,
  LAB_KEYS,
  LAB_N,
  LAB_ORDER,
  LAB_STAGES,
  leafFill,
  levels,
  levelSizes,
  logLevels,
  lookup,
  MAX_KEYS,
  MILLION,
  pagedBinarySearch,
  PAGE_BYTES,
  problems,
  range,
  RANGE_CHECK,
  rangePages,
  RANDOM_READ_MS,
  shuffledKeys,
  SIZES,
  STRING_FANOUT,
  tallest,
  TRILLION,
  TYPICAL_FANOUT,
  upperPages,
  type BTree,
} from './model'

// A seeded run of distinct keys, as many as asked, from 0 to `high`
function distinctKeys(random: () => number, count: number, high: number): number[] {
  const keys = new Set<number>()
  while (keys.size < count) keys.add(Math.floor(random() * high))
  return [...keys]
}

// The reference: a plain sorted array
const sorted = (keys: number[]) => [...new Set(keys)].sort((a, b) => a - b)

describe('the tree, against a sorted array', () => {
  it('holds exactly the keys put in, in order, on many seeded runs', () => {
    const random = seeded(1)
    for (let trial = 0; trial < 300; trial++) {
      const n = 2 + Math.floor(random() * 8)
      // Repeats on purpose: a key put in twice is kept once
      const keys = Array.from({ length: Math.floor(random() * 400) }, () => Math.floor(random() * 500))
      const tree = buildTree(keys, n)
      expect(allKeys(tree)).toEqual(sorted(keys))
    }
  })

  it('finds every key it holds and none it does not', () => {
    const random = seeded(2)
    for (let trial = 0; trial < 100; trial++) {
      const n = 2 + Math.floor(random() * 6)
      const keys = distinctKeys(random, 1 + Math.floor(random() * 200), 400)
      const tree = buildTree(keys, n)
      const held = new Set(keys)
      for (let key = -1; key <= 401; key++) {
        const found = lookup(tree, key)
        expect(found.found).toBe(held.has(key))
        expect(found.path).toHaveLength(height(tree))
      }
    }
  })

  it('answers every range as filtering the sorted array does', () => {
    const random = seeded(3)
    for (let trial = 0; trial < 200; trial++) {
      const n = 2 + Math.floor(random() * 6)
      const keys = distinctKeys(random, Math.floor(random() * 150), 300)
      const tree = buildTree(keys, n)
      const reference = sorted(keys)
      for (let q = 0; q < 20; q++) {
        const a = Math.floor(random() * 320) - 10
        const b = a + Math.floor(random() * 80)
        const scan = range(tree, a, b)
        expect(scan.keys).toEqual(reference.filter((key) => key >= a && key <= b))
        // Down once, then sideways: every page read is a different page
        expect(scan.down).toHaveLength(height(tree) - 1)
        expect(new Set([...scan.down, ...scan.leaves]).size).toBe(scan.pages)
      }
    }
  })

  it('reads one leaf more than the matches fill only when it has to look past them', () => {
    // n = 3, keys 10 to 90 by 10: leaves [10 20] [30 40] [50 60] [70 80 90]
    const tree = buildTree([10, 20, 30, 40, 50, 60, 70, 80, 90], 3)
    expect(range(tree, 30, 40).leaves).toHaveLength(2)
    expect(range(tree, 30, 35).leaves).toHaveLength(1)
    expect(range(tree, 75, 1000).leaves).toHaveLength(1)
  })
})

describe('what must always hold', () => {
  it('holds after every single insert, on many seeded runs', () => {
    const random = seeded(4)
    for (let trial = 0; trial < 150; trial++) {
      const n = 2 + Math.floor(random() * 7)
      const tree = emptyTree(n)
      for (let i = 0; i < 120; i++) {
        insert(tree, Math.floor(random() * 1000))
        expect(problems(tree)).toEqual([])
      }
    }
  })

  it('holds for keys that arrive in order, and in reverse', () => {
    for (const n of [2, 3, 4, 5, 10]) {
      const up = Array.from({ length: 300 }, (_, i) => i)
      expect(problems(buildTree(up, n))).toEqual([])
      expect(problems(buildTree([...up].reverse(), n))).toEqual([])
    }
  })

  it('catches a broken tree', () => {
    const tree = buildTree([10, 20, 30, 40, 50, 60, 70], 3)
    const leaf = [...tree.leaves.values()][0]
    leaf.next = null
    expect(problems(tree)).toContain('leaf chain broken')
    const other = buildTree([10, 20, 30, 40, 50, 60, 70], 3)
    other.root.children![0].keys.push(99)
    expect(problems(other).length).toBeGreaterThan(0)
  })

  it('grows taller only when the root splits', () => {
    const random = seeded(5)
    const tree = emptyTree(3)
    let was = height(tree)
    for (let i = 0; i < 500; i++) {
      const report = insert(tree, Math.floor(random() * 10_000))
      expect(height(tree)).toBe(was + (report.grew ? 1 : 0))
      was = height(tree)
    }
  })

  it('stays between the shortest and the tallest heights its keys allow', () => {
    const random = seeded(6)
    for (let trial = 0; trial < 200; trial++) {
      const n = 2 + Math.floor(random() * 6)
      const keys = distinctKeys(random, 1 + Math.floor(random() * 300), 2000)
      const tree = buildTree(keys, n)
      expect(height(tree)).toBeGreaterThanOrEqual(levels(keys.length, n + 1, n))
      expect(height(tree)).toBeLessThanOrEqual(tallest(keys.length, n))
    }
  })
})

describe('splits, worked by hand (n = 3)', () => {
  it('copies a leaf’s new first key up, and the root grows a level', () => {
    const tree = buildTree([20, 40, 10], 3)
    const report = insert(tree, 30)
    expect(report.splits).toEqual([{ kind: 'leaf', left: 0, right: 1, up: 30 }])
    expect(report.grew).toBe(true)
    expect(tree.root.keys).toEqual([30])
    expect(tree.root.children!.map((child) => child.keys)).toEqual([
      [10, 20],
      [30, 40],
    ])
  })

  it('pushes an interior node’s middle key up, keeping it out of both halves', () => {
    // The course's sequence: after 15 the root [20 30 40 50] splits around 40
    const tree = buildTree([20, 40, 10, 30, 50, 25, 35, 45, 60], 3)
    expect(tree.root.keys).toEqual([30, 40, 50])
    const report = insert(tree, 15)
    expect(report.splits.map((split) => [split.kind, split.up])).toEqual([
      ['leaf', 20],
      ['interior', 40],
    ])
    expect(tree.root.keys).toEqual([40])
    expect(tree.root.children!.map((child) => child.keys)).toEqual([[20, 30], [50]])
    expect(height(tree)).toBe(3)
  })

  it('follows the child whose range holds the key', () => {
    expect(childIndex([20, 30], 5)).toBe(0)
    expect(childIndex([20, 30], 20)).toBe(1)
    expect(childIndex([20, 30], 29)).toBe(1)
    expect(childIndex([20, 30], 30)).toBe(2)
  })

  it('ignores a key it has already', () => {
    const tree = buildTree([1, 2, 3], 3)
    expect(insert(tree, 2)).toMatchObject({ added: false, splits: [] })
    expect(allKeys(tree)).toEqual([1, 2, 3])
  })
})

describe('how full random inserts leave the leaves', () => {
  it('is about ln 2, 69%', () => {
    const tree = buildTree(distinctKeys(seeded(7), 40_000, 1e9), 63)
    expect(leafFill(tree)).toBeGreaterThan(0.66)
    expect(leafFill(tree)).toBeLessThan(0.72)
  })
})

describe('how tall a tree gets', () => {
  it('fits 511 keys and 512 pointers of 4 bytes in a 4 KB page', () => {
    expect(PAGE_BYTES).toBe(4096)
    expect(MAX_KEYS).toBe(511)
    expect(FANOUT).toBe(512)
    expect(511 * 4 + 512 * 4).toBeLessThanOrEqual(4096)
    expect(TYPICAL_FANOUT).toBe(355)
    expect(STRING_FANOUT).toBe(64)
    // A base of 512 takes a ninth of the steps of base 2
    expect(Math.log2(FANOUT)).toBe(9)
  })

  it('counts levels as the power of the fanout that reaches N', () => {
    for (const fanout of [2, 3, 10, 256, 355, 512]) {
      for (const rows of [1, 2, fanout, fanout + 1, fanout ** 2, fanout ** 2 + 1, 12345, MILLION, BILLION]) {
        expect(levels(rows, fanout)).toBe(Math.max(1, logLevels(rows, fanout)))
      }
    }
  })

  it('agrees with ⌈log_F N⌉ in floating point away from exact powers', () => {
    for (const [rows, fanout] of [
      [MILLION, 512],
      [BILLION, 355],
      [TRILLION, 256],
      [BILLION, 2],
    ]) {
      expect(logLevels(rows, fanout)).toBe(Math.ceil(Math.log(rows) / Math.log(fanout)))
    }
  })

  it('gives 3, 4 and 5 levels for a million, a billion and a trillion rows, at any fill', () => {
    for (const fanout of [HALF_FANOUT, TYPICAL_FANOUT, FANOUT]) {
      expect(SIZES.map((rows) => levels(rows, fanout))).toEqual([3, 4, 5])
    }
    expect(SIZES.map(halvings)).toEqual([20, 30, 40])
  })

  it('answers the guess: 4 pages of about 500 keys for a billion rows, against 30 halvings', () => {
    expect(levels(GUESS.rows, GUESS.perPage)).toBe(4)
    expect(GUESS.perPage ** 3).toBeLessThan(BILLION)
    expect(GUESS.perPage ** 4).toBeGreaterThan(BILLION)
    expect(halvings(BILLION)).toBe(30)
    expect(pagedBinarySearch(BILLION)).toBe(21)
  })

  it('keeps the top three levels of a billion-row index in about 33 MB', () => {
    expect(levelSizes(BILLION, TYPICAL_FANOUT)).toEqual([2_816_902, 7_935, 23, 1])
    expect(upperPages(BILLION, TYPICAL_FANOUT)).toBe(7_959)
    expect(formatMB(upperPages(BILLION, TYPICAL_FANOUT) * PAGE_BYTES)).toBe('33 MB')
    expect(4 * RANDOM_READ_MS).toBe(24)
  })

  it('adds one level when the table grows by the fanout', () => {
    for (const fanout of [HALF_FANOUT, TYPICAL_FANOUT, FANOUT]) {
      expect(levels(500 * BILLION, fanout)).toBe(5)
    }
  })

  it('reads about 32 index pages for 10,000 keys in a row', () => {
    const at = levels(RANGE_CHECK.rows, TYPICAL_FANOUT)
    expect(rangePages(RANGE_CHECK.matches, at, TYPICAL_FANOUT)).toBe(32)
    expect(Math.ceil(RANGE_CHECK.matches / TYPICAL_FANOUT)).toBe(29)
    expect(RANGE_CHECK.matches * at).toBe(40_000)
  })

  it('matches a real tree’s range cost to the estimate, give or take a leaf', () => {
    const random = seeded(8)
    const n = 20
    const tree = buildTree(distinctKeys(random, 5000, 1e6), n)
    const keys = allKeys(tree)
    const perLeaf = keys.length / tree.leaves.size
    for (let q = 0; q < 50; q++) {
      const start = Math.floor(random() * (keys.length - 400))
      const matches = 50 + Math.floor(random() * 300)
      const scan = range(tree, keys[start], keys[start + matches - 1])
      // Leaves fill unevenly, so the estimate is close, not exact
      const estimate = rangePages(matches, height(tree), perLeaf)
      expect(Math.abs(scan.pages - estimate)).toBeLessThanOrEqual(2 + 0.2 * estimate)
      // Exactly: the leaves that hold a match, and one more when the last
      // of them ends on a match and the walk has to look past it
      const holding = [...tree.leaves.values()].filter((leaf) =>
        leaf.keys.some((key) => key >= keys[start] && key <= keys[start + matches - 1])
      )
      const lastHolding = holding.reduce((a, b) => (a.keys[0] > b.keys[0] ? a : b))
      const extra = lastHolding.keys[lastHolding.keys.length - 1] === keys[start + matches - 1] && lastHolding.next !== null
      expect(scan.leaves).toHaveLength(holding.length + (extra ? 1 : 0))
    }
  })

  it('needs the fewest keys for each height that the rules allow', () => {
    expect(fewestKeys(1, 3)).toBe(0)
    expect(fewestKeys(2, 3)).toBe(4)
    expect(fewestKeys(3, 3)).toBe(8)
    expect(tallest(15, 3)).toBe(3)
    expect(tallest(16, 3)).toBe(4)
  })
})

describe('the library story', () => {
  it('holds a billion cards, the tree a fanout of 500 makes', () => {
    expect(CARDS).toBe(BILLION)
    expect(levelSizes(BILLION, 500)).toEqual([2_000_000, 4_000, 8, 1])
    expect(CATALOGUE[0]).toBe(levelSizes(BILLION, 500)[2])
    expect(CATALOGUE).toHaveLength(levels(BILLION, 500))
  })

  it('narrows a billion to one in four looks', () => {
    expect(cardsLeft).toEqual([BILLION, 125_000_000, 250_000, 500, 1])
  })

  it('halves a billion to one in 30 looks', () => {
    const run = halvingRun(BILLION)
    expect(run).toHaveLength(31)
    expect(run[run.length - 1]).toBe(1)
  })

  it('reads well', () => {
    expect(formatCount(BILLION)).toBe('1,000,000,000')
  })
})

describe('the tree the figure grows', () => {
  const final = (stages: { tree: BTree }[]) => stages[stages.length - 1].tree

  it('has 15 different two-digit keys, the same ones in both orders', () => {
    expect(new Set(LAB_ORDER.shuffled).size).toBe(LAB_KEYS)
    expect(LAB_ORDER.shuffled.every((key) => key >= 10 && key <= 99)).toBe(true)
    expect(LAB_ORDER.ascending).toEqual(sorted(LAB_ORDER.shuffled))
    expect(shuffledKeys(3, 15)).toEqual(LAB_ORDER.shuffled)
  })

  it('grows to three levels, with an interior split on the way, in both orders', () => {
    for (const stages of Object.values(LAB_STAGES)) {
      expect(stages).toHaveLength(LAB_KEYS + 1)
      expect(height(final(stages))).toBe(3)
      expect(stages.filter((stage) => stage.report?.grew)).toHaveLength(2)
      expect(stages.some((stage) => stage.report?.splits.some((split) => split.kind === 'interior'))).toBe(true)
      for (const stage of stages) expect(problems(stage.tree)).toEqual([])
    }
  })

  it('never has more than 7 leaves, so they fit across the figure', () => {
    for (const stages of Object.values(LAB_STAGES)) {
      for (const stage of stages) expect(stage.tree.leaves.size).toBeLessThanOrEqual(7)
    }
  })

  it('keeps each stage apart from the next', () => {
    const stages = LAB_STAGES.shuffled
    expect(allKeys(stages[3].tree)).toHaveLength(3)
    expect(allKeys(stages[LAB_KEYS].tree)).toHaveLength(LAB_KEYS)
    expect(stages.every((stage) => stage.tree.n === LAB_N)).toBe(true)
  })

  it('leaves every leaf but the last half full when keys come in order', () => {
    const tree = final(LAB_STAGES.ascending)
    const leaves = range(tree, -Infinity, Infinity).leaves.map((id) => tree.leaves.get(id)!.keys.length)
    expect(leaves.slice(0, -1).every((count) => count === 2)).toBe(true)
  })
})
