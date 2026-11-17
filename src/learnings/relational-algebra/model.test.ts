import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  and,
  BOOK,
  COMBINES,
  columnIndex,
  difference,
  expression,
  GUESS_ROWS,
  headings,
  intersect,
  is,
  isNot,
  join,
  joinRange,
  KEEPS,
  KITCHEN,
  KITCHEN_JOINED,
  labPlan,
  LOAN,
  LOAN_TREES,
  product,
  project,
  run,
  same,
  sameRows,
  select,
  STUDENT,
  table,
  TAKES,
  TRAYS,
  union,
  YEARS,
  type Relation,
  type Value,
} from './model'

// A random table of `n` rows over a few small values, so rows repeat and
// joins find matches
function randomTable(random: () => number, name: string, columns: string[], n: number): Relation {
  const rows = Array.from({ length: n }, () => columns.map(() => Math.floor(random() * 4)))
  return table(name, columns, rows)
}

const values = (r: Relation) => r.rows.map((row) => row.join(' '))

describe('a relation is a set', () => {
  it('keeps one copy of a repeated row', () => {
    expect(table('t', ['a'], [[1], [1], [2]]).rows).toEqual([[1], [2]])
  })

  it('refuses a row of the wrong length', () => {
    expect(() => table('t', ['a', 'b'], [[1]])).toThrow()
  })
})

describe('the operators', () => {
  it('select keeps the rows a condition accepts and nothing else', () => {
    expect(values(select(STUDENT, is('year', 2)))).toEqual(['Leo 2', 'Mei 2'])
    expect(values(select(STUDENT, isNot('year', 2)))).toEqual(['Ava 1', 'Raj 3', 'Zoe 1'])
  })

  it('project collapses rows that become the same', () => {
    expect(values(project(TAKES, ['course']))).toEqual(['Math', 'Art', 'CS'])
    expect(project(TAKES, ['name']).rows).toHaveLength(4)
  })

  it('a product has |R| × |S| rows and both tables’ columns', () => {
    const both = product(STUDENT, TAKES)
    expect(both.rows).toHaveLength(35)
    expect(headings(both)).toEqual(['student.name', 'year', 'takes.name', 'course'])
  })

  it('a bare name that two columns share is refused; a qualified one is found', () => {
    const both = product(STUDENT, TAKES)
    expect(() => columnIndex(both, 'name')).toThrow()
    expect(columnIndex(both, 'takes.name')).toBe(2)
    expect(() => columnIndex(STUDENT, 'course')).toThrow()
  })

  it('a condition on a missing column fails even with no rows to test', () => {
    expect(() => select(table('t', ['a'], []), is('b', 1))).toThrow()
  })

  it('the set operations need as many columns on each side', () => {
    expect(() => union(STUDENT, project(TAKES, ['course']))).toThrow()
  })
})

describe('laws, on many seeded random tables', () => {
  const random = seeded(530)
  const trials = Array.from({ length: 300 }, (_, k) => ({
    r: randomTable(random, 'r', ['a', 'b'], Math.floor(random() * 9)),
    s: randomTable(random, 's', ['b', 'c'], Math.floor(random() * 9)),
    t: randomTable(random, 't', ['a', 'b'], Math.floor(random() * 9)),
    k,
  }))

  it('a join is a select over the product, and matches a plain nested loop', () => {
    const on = same('r.b', 's.b')
    for (const { r, s } of trials) {
      const joined = join(r, s, on)
      expect(sameRows(joined, select(product(r, s), on))).toBe(true)
      // The referee: every pair, checked by hand
      const pairs: Value[][] = []
      for (const a of r.rows) for (const b of s.rows) if (a[1] === b[0]) pairs.push([...a, ...b])
      expect(sameRows(joined, { ...joined, rows: pairs })).toBe(true)
    }
  })

  it('a join returns between none and every pair', () => {
    for (const { r, s } of trials) {
      const n = join(r, s, same('r.b', 's.b')).rows.length
      const [low, high] = joinRange(r.rows.length, s.rows.length)
      expect(n).toBeGreaterThanOrEqual(low)
      expect(n).toBeLessThanOrEqual(high)
    }
  })

  it('projection never adds rows, and keeps at least one of a non-empty table', () => {
    for (const { r } of trials) {
      const n = project(r, ['a']).rows.length
      expect(n).toBeLessThanOrEqual(r.rows.length)
      if (r.rows.length) expect(n).toBeGreaterThan(0)
    }
  })

  it('union, intersection and difference fit together', () => {
    for (const { r, t } of trials) {
      const u = union(r, t)
      const i = intersect(r, t)
      const d = difference(r, t)
      expect(u.rows.length).toBe(r.rows.length + t.rows.length - i.rows.length)
      expect(sameRows(union(d, i), r)).toBe(true)
      expect(intersect(d, t).rows).toHaveLength(0)
      expect(sameRows(i, difference(r, difference(r, t)))).toBe(true)
      expect(sameRows(union(r, t), union(t, r))).toBe(true)
    }
  })

  it('two conditions at once are one select after the other', () => {
    for (const { r } of trials) {
      expect(sameRows(select(r, and(is('a', 1), is('b', 2))), select(select(r, is('a', 1)), is('b', 2)))).toBe(true)
    }
  })
})

describe('the guess', () => {
  it('1,000 students and 50 courses make 50,000 pairs', () => {
    expect(GUESS_ROWS).toBe(50_000)
  })
})

describe('the kitchen', () => {
  it('passes trays of 3 and 4, then 3, 9, 4 and 3', () => {
    expect(TRAYS.pasta.rows).toHaveLength(3)
    expect(TRAYS.sauce.rows).toHaveLength(4)
    expect(values(TRAYS.veg)).toEqual(['pesto long veg', 'tomato short veg', 'cream long veg'])
    expect(TRAYS.pairs.rows).toHaveLength(9)
    expect(values(TRAYS.fitting)).toEqual([
      'spaghetti long pesto long veg',
      'spaghetti long cream long veg',
      'penne short tomato short veg',
      'fusilli short tomato short veg',
    ])
    expect(values(TRAYS.prep)).toEqual(['pesto', 'cream', 'tomato'])
  })

  it('names its stations in symbols', () => {
    expect(KITCHEN.label).toBe('π sauce')
    expect(KITCHEN.inputs[0].label).toBe('σ shape = fits')
    expect(KITCHEN.inputs[0].inputs[0].label).toBe('×')
    expect(KITCHEN.inputs[0].inputs[0].inputs[1].label).toBe("σ kind = 'veg'")
  })

  it('gets the same list from a join', () => {
    expect(sameRows(KITCHEN_JOINED, KITCHEN.out)).toBe(true)
  })
})

describe('the lab', () => {
  const rows = (year: (typeof YEARS)[number], combine: (typeof COMBINES)[number], keep: (typeof KEEPS)[number]) =>
    run(labPlan(year, combine, keep)).out.rows

  it('starts from 5 students and 7 courses taken', () => {
    expect(STUDENT.rows).toHaveLength(5)
    expect(TAKES.rows).toHaveLength(7)
  })

  it('pairs everyone with everything in a product: 35 rows', () => {
    expect(rows('any', '×', 'every column')).toHaveLength(35)
    expect(rows('any', '×', 'name')).toHaveLength(5)
    expect(rows('any', '×', 'course')).toHaveLength(3)
  })

  it('gets the same rows from a join as from the product and a select', () => {
    for (const year of YEARS)
      for (const keep of KEEPS) expect(rows(year, '⋈', keep)).toEqual(rows(year, 'σ over ×', keep))
    expect(rows('any', '⋈', 'every column')).toHaveLength(7)
    // Zoe takes nothing, so the join drops her
    expect(rows('any', '⋈', 'name')).toHaveLength(4)
  })

  it('answers who in year 2 takes what', () => {
    expect(rows(2, '⋈', 'course')).toEqual([['Math'], ['CS']])
    expect(rows(2, '×', 'every column')).toHaveLength(14)
  })

  it('draws a tree of the right depth for each choice', () => {
    expect(expression(labPlan('any', '×', 'every column'))).toBe('(STUDENT × TAKES)')
    expect(expression(labPlan(1, '⋈', 'course'))).toBe("π[course]((σ[year = 1](STUDENT) ⋈[student.name = takes.name] TAKES))")
  })

  it('bounds the quick check’s join at 0 to 35 rows', () => {
    expect(joinRange(STUDENT.rows.length, TAKES.rows.length)).toEqual([0, 35])
    // Both ends are reachable with these sizes
    expect(join(STUDENT, TAKES, is('year', 9)).rows).toHaveLength(0)
    expect(join(STUDENT, TAKES, isNot('year', 9)).rows).toHaveLength(35)
  })
})

describe('check yourself: the library query', () => {
  it('only the second tree runs and returns the titles', () => {
    expect(BOOK.rows).toHaveLength(3)
    expect(LOAN.rows).toHaveLength(4)
    expect(() => run(LOAN_TREES[0])).toThrow()
    expect(run(LOAN_TREES[1]).out.rows).toEqual([['Dune'], ['Ulysses']])
    expect(() => run(LOAN_TREES[2])).toThrow()
    expect(headings(run(LOAN_TREES[3]).out)).toEqual(['id', 'title', 'book', 'member', 'year'])
  })
})
