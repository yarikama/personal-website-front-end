import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  AGGREGATES,
  and,
  average,
  byCases,
  CONDITIONS,
  countRows,
  countValues,
  CUSTOMERS,
  EITHER_WAY,
  eq,
  exists,
  GUESS,
  inList,
  isNull,
  ne,
  not,
  notExists,
  notIn,
  notInUnfolded,
  or,
  ORDERS,
  PRODUCTS,
  short,
  STORY_GRID,
  TRUTHS,
  WORKED,
  type Truth,
  type Value,
} from './model'

describe('the truth tables', () => {
  it('match the tables written out by hand', () => {
    // Rows p = T, F, U; columns q = T, F, U
    const AND = ['TFU', 'FFF', 'UFU']
    const OR = ['TTT', 'TFU', 'TUU']
    TRUTHS.forEach((p, i) =>
      TRUTHS.forEach((q, j) => {
        expect(short(and(p, q)), `${p} AND ${q}`).toBe(AND[i][j])
        expect(short(or(p, q)), `${p} OR ${q}`).toBe(OR[i][j])
      }),
    )
    expect(TRUTHS.map(not)).toEqual(['FALSE', 'TRUE', 'UNKNOWN'])
  })

  it('agree with reading UNKNOWN as "could be either"', () => {
    for (const p of TRUTHS)
      for (const q of TRUTHS) {
        expect(and(p, q), `${p} AND ${q}`).toBe(byCases((x, y) => x && y, p, q))
        expect(or(p, q), `${p} OR ${q}`).toBe(byCases((x, y) => x || y, p, q))
      }
  })

  it('keep De Morgan’s laws but lose "p or not p"', () => {
    for (const p of TRUTHS)
      for (const q of TRUTHS) {
        expect(not(and(p, q))).toBe(or(not(p), not(q)))
        expect(not(or(p, q))).toBe(and(not(p), not(q)))
      }
    expect(or('UNKNOWN', not('UNKNOWN'))).toBe('UNKNOWN')
  })

  it('give the three worked lines', () => {
    expect(WORKED.map((w) => w.value)).toEqual(['FALSE', 'TRUE', 'UNKNOWN'])
  })
})

describe('comparisons with NULL', () => {
  it('are UNKNOWN, even NULL = NULL', () => {
    expect(eq(null, 5)).toBe('UNKNOWN')
    expect(ne(5, null)).toBe('UNKNOWN')
    expect(eq(null, null)).toBe('UNKNOWN')
    expect(isNull(null)).toBe('TRUE')
    expect(isNull(0)).toBe('FALSE')
  })

  it('make "= 5 OR <> 5" miss the rows with no review', () => {
    expect(EITHER_WAY).toEqual(['Ana', 'Cal', 'Dee'])
  })

  it('make "= NULL" keep no row and IS NULL keep the missing ones', () => {
    const run = (name: string) =>
      CUSTOMERS.filter((c) => CONDITIONS.find((k) => k.name === name)!.test(c, ORDERS) === 'TRUE').map((c) => c.name)
    expect(run('= NULL')).toEqual([])
    expect(run('IS NULL')).toEqual(['Ben', 'Eli'])
  })
})

describe('the NOT IN trap', () => {
  it('keeps no one in the guess, while NOT EXISTS keeps the three without orders', () => {
    expect(GUESS.notIn).toEqual([])
    expect(GUESS.notExists).toEqual(['Ben', 'Dee', 'Eli'])
  })

  it('tells the story’s grid: Ana and Cal FALSE, the rest UNKNOWN', () => {
    expect(STORY_GRID.map((r) => short(r.all)).join('')).toBe('FUFUU')
    expect(STORY_GRID[1].cells).toEqual(['TRUE', 'TRUE', 'UNKNOWN'])
    expect(STORY_GRID[0].cells).toEqual(['FALSE', 'TRUE', 'UNKNOWN'])
  })

  it('is the same as x <> each value, ANDed', () => {
    const values: Value[] = [1, 2, 3, null]
    for (const x of values)
      for (const a of values)
        for (const b of values) expect(notIn(x, [a, b]), `${x} NOT IN (${a}, ${b})`).toBe(notInUnfolded(x, [a, b]))
  })

  it('is TRUE for an empty list, like NOT EXISTS', () => {
    expect(notIn(4, [])).toBe('TRUE')
    expect(notExists(4, [])).toBe('TRUE')
  })
})

// Random small tables: customer ids and order customer_ids from 1 to 6,
// sometimes with NULLs among the orders
function randomCase(random: () => number, nullChance: number) {
  const orders = Array.from({ length: 1 + Math.floor(random() * 6) }, (): Value =>
    random() < nullChance ? null : 1 + Math.floor(random() * 6),
  )
  const ids = Array.from({ length: 1 + Math.floor(random() * 6) }, () => 1 + Math.floor(random() * 6))
  return { orders, ids }
}

describe('NOT IN against NOT EXISTS on seeded random tables', () => {
  it('agree on every row when the orders hold no NULL', () => {
    const random = seeded(530)
    for (let n = 0; n < 500; n++) {
      const { orders, ids } = randomCase(random, 0)
      for (const id of ids) expect(notIn(id, orders)).toBe(notExists(id, orders))
    }
  })

  it('NOT IN keeps nothing once a NULL is there, and never keeps a row NOT EXISTS drops', () => {
    const random = seeded(7)
    let withNull = 0
    for (let n = 0; n < 500; n++) {
      const { orders, ids } = randomCase(random, 0.3)
      const hasNull = orders.includes(null)
      if (hasNull) withNull++
      for (const id of ids) {
        if (hasNull) expect(notIn(id, orders)).not.toBe('TRUE')
        if (notIn(id, orders) === 'TRUE') expect(notExists(id, orders)).toBe('TRUE')
        // The two disagree exactly on an id with no match among a list holding a NULL
        const differ = notIn(id, orders) !== notExists(id, orders)
        expect(differ).toBe(hasNull && !orders.includes(id))
      }
    }
    expect(withNull).toBeGreaterThan(100)
  })

  it('EXISTS never answers UNKNOWN, IN can', () => {
    const random = seeded(11)
    for (let n = 0; n < 300; n++) {
      const { orders, ids } = randomCase(random, 0.3)
      for (const id of ids) {
        expect(exists(id, orders)).not.toBe('UNKNOWN')
        if (inList(id, orders) !== 'UNKNOWN') expect(inList(id, orders)).toBe(exists(id, orders))
      }
    }
  })
})

describe('aggregates', () => {
  it('count rows with COUNT(*), values with COUNT(col), and average the values', () => {
    expect(AGGREGATES).toEqual({ rows: 5, values: 3, average: 4, asZero: 2.4 })
    expect(countRows([null, null])).toBe(2)
    expect(countValues([null, null])).toBe(0)
    expect(average([null, null])).toBeNull()
    expect(average([1, null, 10])).toBe(5.5)
  })
})

describe('check yourself', () => {
  it('NOT (discount > 10) keeps only the 3 known small discounts', () => {
    expect(PRODUCTS).toEqual({ rows: 10, missing: 3, over: 4, notOver: 3 })
  })

  it('every condition answers each truth value only where it should', () => {
    const seen = new Set<Truth>()
    for (const c of CUSTOMERS) for (const k of CONDITIONS) seen.add(k.test(c, ORDERS))
    expect(seen).toEqual(new Set(TRUTHS))
  })
})
