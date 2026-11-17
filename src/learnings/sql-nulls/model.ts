// SQL's three truth values, the predicates the page shows, and every number
// it states. The figures only draw what is here.

export type Truth = 'TRUE' | 'FALSE' | 'UNKNOWN'
// A column's value: a number, or NULL (missing)
export type Value = number | null

export const TRUTHS: readonly Truth[] = ['TRUE', 'FALSE', 'UNKNOWN']
export const short = (t: Truth) => t[0] as 'T' | 'F' | 'U'

// FALSE < UNKNOWN < TRUE: AND takes the smaller, OR the larger
const RANK: Record<Truth, number> = { FALSE: 0, UNKNOWN: 1, TRUE: 2 }
const BY_RANK: Truth[] = ['FALSE', 'UNKNOWN', 'TRUE']

export const and = (a: Truth, b: Truth): Truth => BY_RANK[Math.min(RANK[a], RANK[b])]
export const or = (a: Truth, b: Truth): Truth => BY_RANK[Math.max(RANK[a], RANK[b])]
export const not = (a: Truth): Truth => (a === 'TRUE' ? 'FALSE' : a === 'FALSE' ? 'TRUE' : 'UNKNOWN')
export const andAll = (ts: Truth[]): Truth => ts.reduce(and, 'TRUE')
export const orAll = (ts: Truth[]): Truth => ts.reduce(or, 'FALSE')

// The referee for the tables above: read UNKNOWN as "could be TRUE or
// FALSE", try every way of filling it in with ordinary logic, and the
// answer is what they all agree on, or UNKNOWN when they don't
export function byCases(op: (a: boolean, b: boolean) => boolean, a: Truth, b: Truth): Truth {
  const ways = (t: Truth) => (t === 'TRUE' ? [true] : t === 'FALSE' ? [false] : [true, false])
  const results = new Set(ways(a).flatMap((x) => ways(b).map((y) => op(x, y))))
  return results.size === 2 ? 'UNKNOWN' : results.has(true) ? 'TRUE' : 'FALSE'
}

// Comparisons: anything compared with NULL is UNKNOWN, NULL with NULL too
const compare = (a: Value, b: Value, test: (x: number, y: number) => boolean): Truth =>
  a === null || b === null ? 'UNKNOWN' : test(a, b) ? 'TRUE' : 'FALSE'
export const eq = (a: Value, b: Value) => compare(a, b, (x, y) => x === y)
export const ne = (a: Value, b: Value) => compare(a, b, (x, y) => x !== y)
export const gt = (a: Value, b: Value) => compare(a, b, (x, y) => x > y)
// IS NULL is the one test that looks at NULL itself: never UNKNOWN
export const isNull = (a: Value): Truth => (a === null ? 'TRUE' : 'FALSE')

// WHERE keeps a row only when its condition is TRUE
export const keeps = (t: Truth) => t === 'TRUE'

// x IN (list): equal to some value. x NOT IN (list): NOT of that, which is
// x <> each value, all ANDed together
export const inList = (x: Value, list: Value[]) => orAll(list.map((v) => eq(x, v)))
export const notIn = (x: Value, list: Value[]) => not(inList(x, list))
export const notInUnfolded = (x: Value, list: Value[]) => andAll(list.map((v) => ne(x, v)))

// EXISTS asks whether any row makes its condition TRUE, so it only ever
// answers TRUE or FALSE: a row where the match is UNKNOWN is simply not a
// match
export const exists = (x: Value, list: Value[]): Truth => (list.some((v) => keeps(eq(x, v))) ? 'TRUE' : 'FALSE')
export const notExists = (x: Value, list: Value[]) => not(exists(x, list))

// Aggregates: COUNT(*) counts rows, COUNT(col) and AVG(col) skip NULLs
export const countRows = (values: Value[]) => values.length
export const countValues = (values: Value[]) => values.filter((v) => v !== null).length
export function average(values: Value[]): number | null {
  const present = values.filter((v): v is number => v !== null)
  return present.length === 0 ? null : present.reduce((s, v) => s + v, 0) / present.length
}

// The customers and orders of the guess, the story and the lab. One order
// was taken without recording who placed it.
export interface Customer {
  id: number
  name: string
  stars: Value // the customer's last review, if they left one
}
export const CUSTOMERS: Customer[] = [
  { id: 1, name: 'Ana', stars: 5 },
  { id: 2, name: 'Ben', stars: null },
  { id: 3, name: 'Cal', stars: 3 },
  { id: 4, name: 'Dee', stars: 4 },
  { id: 5, name: 'Eli', stars: null },
]
export const ORDERS: Value[] = [1, 3, null]

export const kept = (customers: Customer[], test: (c: Customer) => Truth) =>
  customers.filter((c) => keeps(test(c))).map((c) => c.name)

// The guess: NOT IN keeps no one; the customers really without orders are
// the ones NOT EXISTS keeps
export const GUESS = {
  notIn: kept(CUSTOMERS, (c) => notIn(c.id, ORDERS)),
  notExists: kept(CUSTOMERS, (c) => notExists(c.id, ORDERS)),
}

// The story's grid: each friend against each card, then all of them
export const grid = (customers: Customer[], orders: Value[]) =>
  customers.map((c) => ({
    customer: c,
    cells: orders.map((o) => ne(c.id, o)),
    all: notIn(c.id, orders),
  }))
export const STORY_GRID = grid(CUSTOMERS, ORDERS)

// The lab's conditions, each as SQL and as a test of one customer row
export interface Condition {
  name: string
  sql: string
  test: (c: Customer, orders: Value[]) => Truth
}
export const CONDITIONS: Condition[] = [
  { name: '= 5', sql: 'stars = 5', test: (c) => eq(c.stars, 5) },
  { name: '<> 5', sql: 'stars <> 5', test: (c) => ne(c.stars, 5) },
  { name: '= 5 OR <> 5', sql: 'stars = 5 OR stars <> 5', test: (c) => or(eq(c.stars, 5), ne(c.stars, 5)) },
  { name: '= NULL', sql: 'stars = NULL', test: (c) => eq(c.stars, null) },
  { name: 'IS NULL', sql: 'stars IS NULL', test: (c) => isNull(c.stars) },
  {
    name: 'NOT IN',
    sql: 'id NOT IN (SELECT customer_id FROM orders)',
    test: (c, orders) => notIn(c.id, orders),
  },
  {
    name: 'NOT EXISTS',
    sql: 'NOT EXISTS (SELECT * FROM orders o WHERE o.customer_id = c.id)',
    test: (c, orders) => notExists(c.id, orders),
  },
]

// What a lab cell steps through when clicked
export const STAR_CYCLE: Value[] = [1, 2, 3, 4, 5, null]
export const ID_CYCLE: Value[] = [1, 2, 3, 4, 5, null]
export const nextIn = (cycle: Value[], v: Value) => cycle[(cycle.indexOf(v) + 1) % cycle.length]

// The aggregates on the starting table: AVG is over the three reviews, not
// the five rows
export const STARS = CUSTOMERS.map((c) => c.stars)
export const AGGREGATES = {
  rows: countRows(STARS),
  values: countValues(STARS),
  average: average(STARS) as number,
  // What the average would be if a missing review counted as 0
  asZero: STARS.reduce<number>((s, v) => s + (v ?? 0), 0) / STARS.length,
}

// "= 5 OR <> 5" looks like it keeps everyone
export const EITHER_WAY = kept(CUSTOMERS, (c) => CONDITIONS[2].test(c, ORDERS))

// The three worked lines of the math
export const WORKED = [
  { label: 'FALSE AND UNKNOWN', value: and('FALSE', 'UNKNOWN') },
  { label: 'TRUE OR UNKNOWN', value: or('TRUE', 'UNKNOWN') },
  { label: 'NOT UNKNOWN', value: not('UNKNOWN') },
]

// Check yourself: ten products, three with no discount recorded.
// WHERE NOT (discount > 10)
export const PRODUCT_DISCOUNTS: Value[] = [null, null, null, 15, 20, 25, 30, 0, 5, 10]
export const PRODUCTS = {
  rows: PRODUCT_DISCOUNTS.length,
  missing: PRODUCT_DISCOUNTS.filter((d) => d === null).length,
  over: PRODUCT_DISCOUNTS.filter((d) => keeps(gt(d, 10))).length,
  notOver: PRODUCT_DISCOUNTS.filter((d) => keeps(not(gt(d, 10)))).length,
}
