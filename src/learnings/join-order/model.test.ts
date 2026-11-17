import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  allTrees,
  bruteForce,
  bushyCount,
  CHAIN,
  CHAIN_PLANS,
  compact,
  cost,
  count,
  dpSplitCount,
  dynamicProgramming,
  formatRows,
  full,
  greedy,
  hasCrossProduct,
  initials,
  joinPieces,
  joinsOf,
  leftDeepCount,
  leftDeepTrees,
  linked,
  LISTS,
  maskOf,
  matches,
  planSets,
  randomQuery,
  SHOP,
  SHOP_BRUTE,
  SHOP_DP,
  SHOP_GREEDY,
  SHOP_LINKED,
  show,
  size,
  splits,
  subplans,
  TRIP,
  TRIP_PLANS,
  type Query,
  type Tree,
} from './model'

const tiny: Query = {
  names: ['R', 'S', 'T'],
  rows: [100, 200, 50],
  joins: [
    { a: 0, b: 1, divide: 100 },
    { a: 1, b: 2, divide: 50 },
  ],
}

describe('the size of a set of tables', () => {
  it('multiplies the sizes and divides once for each condition inside it', () => {
    expect(size(tiny, 0b001)).toBe(100)
    expect(size(tiny, 0b011)).toBe(200) // 100 · 200 / 100
    expect(size(tiny, 0b110)).toBe(200) // 200 · 50 / 50
    expect(size(tiny, 0b101)).toBe(5000) // no condition: a cross product
    expect(size(tiny, 0b111)).toBe(200) // 100 · 200 · 50 / 100 / 50
  })

  it('costs a plan as the rows of every join, the final one included', () => {
    expect(cost(tiny, [[0, 1], 2])).toBe(400)
    expect(cost(tiny, [0, [1, 2]])).toBe(400)
    expect(cost(tiny, [[0, 2], 1])).toBe(5200)
    expect(cost(tiny, 0)).toBe(0)
  })

  it('lists the joins bottom up', () => {
    expect(joinsOf([[0, 1], 2])).toEqual([0b011, 0b111])
    expect(maskOf([[0, 2], 1])).toBe(0b111)
    expect(subplans([[0, 1], 2])).toEqual([[0, 1], [[0, 1], 2]])
  })

  it('knows a cross product: a join with no condition between its sides', () => {
    expect(linked(tiny, [0, 1])).toBe(true)
    expect(linked(tiny, [0, 2])).toBe(false)
    expect(hasCrossProduct(tiny, [[0, 2], 1])).toBe(true)
    expect(hasCrossProduct(tiny, [0, [1, 2]])).toBe(false)
  })
})

describe('counting join trees', () => {
  it('finds as many trees by enumeration as the formulas say, up to 6 tables', () => {
    for (let n = 1; n <= 6; n++) {
      expect(allTrees(full(n))).toHaveLength(bushyCount(n))
      expect(leftDeepTrees(full(n))).toHaveLength(leftDeepCount(n))
    }
  })

  it('finds every tree once, and every one a tree over all the tables', () => {
    for (let n = 2; n <= 5; n++) {
      const trees = allTrees(full(n))
      expect(new Set(trees.map((t) => JSON.stringify(t))).size).toBe(trees.length)
      for (const tree of trees) expect(maskOf(tree)).toBe(full(n))
    }
  })

  it('gives left-deep trees a single table on the right of every join', () => {
    const leftDeep = (t: Tree): boolean => typeof t === 'number' || (typeof t[1] === 'number' && leftDeep(t[0]))
    for (const tree of leftDeepTrees(full(5))) expect(leftDeep(tree)).toBe(true)
    expect(allTrees(full(5)).filter(leftDeep)).toHaveLength(leftDeepCount(5))
  })

  it('has (2n − 2)! / (n − 1)! bushy trees: n! leaf orders times the Catalan number of shapes', () => {
    const catalan = [1, 1, 2, 5, 14, 42, 132, 429, 1430, 4862]
    for (let n = 1; n <= 10; n++) expect(bushyCount(n)).toBe(leftDeepCount(n) * catalan[n - 1])
  })

  it('cuts each set of k tables 2^k − 2 ways', () => {
    for (let k = 1; k <= 6; k++) expect(splits(full(k))).toHaveLength(2 ** k - 2)
    expect(splits(0b101)).toEqual([0b001, 0b100])
  })

  it('quotes the counts the page uses', () => {
    expect([leftDeepCount(3), bushyCount(3), dpSplitCount(3)]).toEqual([6, 12, 12])
    expect([leftDeepCount(4), bushyCount(4), dpSplitCount(4)]).toEqual([24, 120, 50])
    expect([leftDeepCount(7), bushyCount(7), dpSplitCount(7)]).toEqual([5040, 665280, 1932])
    expect([leftDeepCount(10), bushyCount(10), dpSplitCount(10)]).toEqual([3628800, 17643225600, 57002])
    expect(bushyCount(7) / leftDeepCount(7)).toBe(132)
  })
})

describe('dynamic programming over subsets', () => {
  it('finds the brute-force minimum on hundreds of seeded random queries', () => {
    const random = seeded(530)
    for (let trial = 0; trial < 300; trial++) {
      const query = randomQuery(random, 2 + Math.floor(random() * 5))
      const dp = dynamicProgramming(query)
      const brute = bruteForce(query)
      expect(dp.cost).toBeCloseTo(brute.bestCost, 6)
      expect(cost(query, dp.best)).toBeCloseTo(dp.cost, 6)
      expect(maskOf(dp.best)).toBe(full(query.rows.length))
    }
  })

  it('looks at 3^n − 2^(n+1) + 1 splits', () => {
    const random = seeded(7)
    for (let n = 1; n <= 8; n++) expect(dynamicProgramming(randomQuery(random, n)).splits).toBe(dpSplitCount(n))
  })

  it('fills the table smallest sets first, with each split’s parts already in it', () => {
    const { table } = dynamicProgramming(SHOP)
    expect(table).toHaveLength(full(5))
    const seen = new Set<number>()
    for (const entry of table) {
      if (entry.left) {
        expect(seen.has(entry.left) && seen.has(entry.right)).toBe(true)
        expect(entry.left | entry.right).toBe(entry.mask)
        expect(entry.tried).toBe(2 ** count(entry.mask) - 2)
      }
      seen.add(entry.mask)
    }
  })
})

describe('greedy', () => {
  it('is never better than dynamic programming, on hundreds of seeded random queries', () => {
    const random = seeded(9)
    let worse = 0
    for (let trial = 0; trial < 300; trial++) {
      const query = randomQuery(random, 3 + Math.floor(random() * 4))
      const g = greedy(query)
      const dp = dynamicProgramming(query)
      expect(g.cost).toBeGreaterThanOrEqual(dp.cost - 1e-6)
      expect(maskOf(g.best)).toBe(full(query.rows.length))
      if (g.cost > dp.cost * 1.000001) worse += 1
    }
    // and it does lose, often enough to matter
    expect(worse).toBeGreaterThan(10)
  })

  it('is right whenever there are only three tables: the final join is fixed', () => {
    const random = seeded(11)
    for (let trial = 0; trial < 200; trial++) {
      const query = randomQuery(random, 3)
      expect(greedy(query).cost).toBeCloseTo(dynamicProgramming(query).cost, 6)
    }
  })

  it('joins two pieces into one at the end of the list', () => {
    expect(joinPieces([0, 1, 2], 0, 2)).toEqual([1, [0, 2]])
  })
})

describe('the weekend trip', () => {
  it('has the lists the story names', () => {
    expect([TRIP.concerts.length, TRIP.flights.length, TRIP.rooms.length]).toEqual([2, 40, 30])
    expect(LISTS).toEqual(['concerts', 'flights', 'rooms'])
  })

  it('counts the matches by trying every combination', () => {
    expect(matches(TRIP, ['concerts', 'flights'])).toBe(8)
    expect(matches(TRIP, ['concerts', 'rooms'])).toBe(12)
    expect(matches(TRIP, ['flights', 'rooms'])).toBe(240)
    expect(matches(TRIP, ['concerts', 'flights', 'rooms'])).toBe(48)
  })

  it('writes 288, 56 or 60 lines, by which pair goes first', () => {
    expect(TRIP_PLANS.map((p) => [p.pairLines, p.trips, p.lines])).toEqual([
      [240, 48, 288],
      [8, 48, 56],
      [12, 48, 60],
    ])
  })
})

describe('the shop the lab plans', () => {
  it('has the best plan at 7,200 rows, with no cross product', () => {
    expect(SHOP_DP.cost).toBe(7200)
    expect(SHOP_BRUTE.bestCost).toBe(7200)
    expect(show(SHOP, SHOP_DP.best, ['C', 'O', 'L', 'P', 'S'])).toBe('P ⋈ (C ⋈ (O ⋈ (L ⋈ S)))')
    expect(hasCrossProduct(SHOP, SHOP_DP.best)).toBe(false)
    expect(SHOP_LINKED.best).toBe(7200)
  })

  it('has greedy start with a cross product and finish at 17,700', () => {
    expect(SHOP_GREEDY.cost).toBe(17700)
    expect(SHOP_GREEDY.steps.map((s) => size(SHOP, maskOf(s)))).toEqual([1500, 15000, 600, 600])
    expect(initials(SHOP, maskOf(SHOP_GREEDY.steps[0]))).toBe('CS')
    expect(hasCrossProduct(SHOP, SHOP_GREEDY.steps[0])).toBe(true)
    expect(SHOP_GREEDY.cost).toBeGreaterThan(SHOP_DP.cost)
  })

  it('has its first pick smaller than any join with a condition', () => {
    const linkedPairs = SHOP.joins.map((j) => size(SHOP, (1 << j.a) | (1 << j.b)))
    expect(Math.min(...linkedPairs)).toBe(3000)
  })

  it('has 1,680 trees, from 7,200 to 210 million rows; 288 with no cross product, up to 132,600', () => {
    expect(SHOP_BRUTE.trees).toBe(1680)
    expect(SHOP_BRUTE.worstCost).toBe(210000600)
    expect(SHOP_LINKED).toEqual({ trees: 288, worst: 132600, best: 7200 })
  })

  it('looks at 180 splits to find it, and the plan is built from five memo entries', () => {
    expect(SHOP_DP.splits).toBe(180)
    expect([...planSets(SHOP_DP)].map((m) => initials(SHOP, m)).sort()).toEqual(
      ['COLPS', 'COLS', 'OLS', 'LS', 'C', 'O', 'L', 'P', 'S'].sort()
    )
  })
})

describe('the chain of Check yourself', () => {
  it('has the sizes the question gives', () => {
    const sets = { AB: 0b0011, BC: 0b0110, CD: 0b1100, ABC: 0b0111, BCD: 0b1110, ABCD: 0b1111 }
    expect(Object.fromEntries(Object.entries(sets).map(([k, m]) => [k, size(CHAIN, m)]))).toEqual({
      AB: 100,
      BC: 25,
      CD: 20,
      ABC: 5,
      BCD: 50,
      ABCD: 10,
    })
  })

  it('costs the four offered plans 80, 40, 115 and 130', () => {
    expect(cost(CHAIN, CHAIN_PLANS.greedy)).toBe(80)
    expect(cost(CHAIN, CHAIN_PLANS.best)).toBe(40)
    expect(cost(CHAIN, CHAIN_PLANS.leftFirst)).toBe(115)
    expect(cost(CHAIN, CHAIN_PLANS.pairs)).toBe(130)
  })

  it('has greedy take the 80 plan and dynamic programming the 40', () => {
    expect(greedy(CHAIN).cost).toBe(80)
    expect(cost(CHAIN, greedy(CHAIN).steps[0])).toBe(20) // C ⋈ D, the smallest join
    expect(dynamicProgramming(CHAIN).cost).toBe(40)
    expect(bruteForce(CHAIN).bestCost).toBe(40)
  })
})

describe('the numbers as written', () => {
  it('read well', () => {
    expect(formatRows(17700)).toBe('17,700')
    expect(compact(1500)).toBe('1.5k')
    expect(compact(150010000)).toBe('150M')
    expect(compact(600)).toBe('600')
    expect(compact(18060000)).toBe('18M')
  })
})
