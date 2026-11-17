// Size estimation: the textbook's rules for guessing how many rows an
// operator produces from two numbers per table, T(R) rows and V(R, a)
// distinct values in column a, and exact counters over real rows, so the
// figures can put each guess beside the truth.

import { seeded } from '../../components/explain/random'

// ---------------------------------------------------------------------------
// The rules. Each takes statistics and returns an estimated row count.

// a = c keeps one row in V(R, a), if the values are spread evenly
export const equalitySize = (rows: number, distinct: number) => rows / distinct

// a < c: with nothing to go on, a third of the rows
export const rangeSize = (rows: number) => rows / 3

// a ≠ c keeps all but one row in V(R, a)
export const notEqualSize = (rows: number, distinct: number) => (rows * (distinct - 1)) / distinct

// C1 AND C2 AND …: the fractions kept (selectivities) multiply, if the
// conditions have nothing to do with each other
export const andSize = (rows: number, ...selectivities: number[]) => selectivities.reduce((size, s) => size * s, rows)

// C1 OR C2: take away the rows that fail both, `kept1` and `kept2` being
// how many rows each condition keeps on its own
export const orSize = (rows: number, kept1: number, kept2: number) => rows * (1 - (1 - kept1 / rows) * (1 - kept2 / rows))

// R × S: every pair
export const productSize = (rowsR: number, rowsS: number) => rowsR * rowsS

// R ⋈ S on Y: each row of the side with fewer distinct values meets
// T/V of the other side's rows, so divide by the larger V
export const joinSize = (rowsR: number, rowsS: number, distinctR: number, distinctS: number) =>
  (rowsR * rowsS) / Math.max(distinctR, distinctS)

// A join on several columns: one larger-V division for each, `pairs` being
// [V(R, Yi), V(S, Yi)]
export const multiJoinSize = (rowsR: number, rowsS: number, pairs: [number, number][]) =>
  pairs.reduce((size, [r, s]) => size / Math.max(r, s), rowsR * rowsS)

// After an operator, no column can have more distinct values than rows
export const capDistinct = (distinct: number, rows: number) => Math.min(distinct, rows)

// After a join on Y, Y keeps the smaller side's distinct values
export const joinedDistinct = (distinctR: number, distinctS: number) => Math.min(distinctR, distinctS)

// Estimates up a plan multiply, and so do their errors
export const compounded = (factor: number, steps: number) => factor ** steps

// ---------------------------------------------------------------------------
// The numbers the page works

// Guess first: 10,000 orders join 1,000 customers on customer id
export const ORDERS = 10_000
export const CUSTOMERS = 1_000
export const GUESS_JOIN = joinSize(ORDERS, CUSTOMERS, CUSTOMERS, CUSTOMERS)

// The clip: the orders mention only 800 of the customers. The larger V
// gives the right answer; the smaller would promise more rows than orders.
export const ORDERED_BY = 800
export const CLIP_JOIN = joinSize(ORDERS, CUSTOMERS, ORDERED_BY, CUSTOMERS)
export const WRONG_WAY = (ORDERS * CUSTOMERS) / Math.min(ORDERED_BY, CUSTOMERS)

// One value of a column: 1,000,000 customers in 500 cities
export const CITY = { rows: 1_000_000, cities: 500 }
export const CITY_SIZE = equalitySize(CITY.rows, CITY.cities)

// Two ranges on TPC-H's lineitem table at scale factor 1: the course's
// optimizer reports 666,802 for exactly this, two thirds taken away twice
export const LINEITEM = 6_001_215
export const TWO_RANGES = rangeSize(rangeSize(LINEITEM))

// Three steps of a plan, each guessed 10 times too small
export const STEP_ERROR = 10
export const PLAN_STEPS = 3
export const PLAN_ERROR = compounded(STEP_ERROR, PLAN_STEPS)

// Quick check: 1,000,000 used cars, 40 makes and 800 models, evenly spread.
// make = Toyota AND model = Corolla: every Corolla is a Toyota.
export const CARS = { rows: 1_000_000, makes: 40, models: 800 }
export const CARS_ESTIMATE = andSize(CARS.rows, 1 / CARS.makes, 1 / CARS.models)
export const CARS_ACTUAL = equalitySize(CARS.rows, CARS.models)

// Check yourself: R of 2,000 rows in 10 colours, S of 3,000 in 50
export const COLOURS = { rowsR: 2_000, rowsS: 3_000, distinctR: 10, distinctS: 50 }
export const COLOURS_JOIN = joinSize(COLOURS.rowsR, COLOURS.rowsS, COLOURS.distinctR, COLOURS.distinctS)
export const COLOURS_BY_MIN = (COLOURS.rowsR * COLOURS.rowsS) / Math.min(COLOURS.distinctR, COLOURS.distinctS)

// ---------------------------------------------------------------------------
// The story: two parties and their birthdays

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
const YEAR = 365
export const MARCH = 2
// Star signs, like months, are 12 to a year
export const SIGNS = 12

// The day of the year, from 0, of a month (from 0) and a date (from 1)
export const dayOf = (month: number, date: number) => MONTH_DAYS.slice(0, month).reduce((a, b) => a + b, 0) + date - 1

export function monthOf(day: number): number {
  let month = 0
  let start = 0
  while (day >= start + MONTH_DAYS[month]) {
    start += MONTH_DAYS[month]
    month += 1
  }
  return month
}

// Pisces runs from 19 February to 20 March
const PISCES_FROM = dayOf(1, 19)
const PISCES_TO = dayOf(2, 20)
export const isPisces = (day: number) => day >= PISCES_FROM && day <= PISCES_TO

// A party of `n` guests, each a birthday drawn evenly over the year
export const party = (random: () => number, n: number) => Array.from({ length: n }, () => Math.floor(random() * YEAR))

export const byMonth = (days: number[]) => {
  const counts = MONTHS.map(() => 0)
  for (const day of days) counts[monthOf(day)] += 1
  return counts
}

// Pairs, one guest from each party, born in the same month: the join
export const pairsSharing = (a: number[], b: number[]) => {
  const ca = byMonth(a)
  const cb = byMonth(b)
  return ca.reduce((sum, n, m) => sum + n * cb[m], 0)
}

export const HOSTS = 60
export const NEIGHBOURS = 40
// Seeded so the parties land where the arithmetic says: 5 born in March
// (the guess is 5), pairs near the guess of 200, and 3 March Pisces, as many
// as the true share of the year (20 days in 365) gives
export const PARTY_SEED = 168

const partyRandom = seeded(PARTY_SEED)
export const HOST_DAYS = party(partyRandom, HOSTS)
export const NEIGHBOUR_DAYS = party(partyRandom, NEIGHBOURS)

// What the story guesses and what it counts
export const STORY = {
  marchGuess: equalitySize(HOSTS, MONTHS.length),
  march: byMonth(HOST_DAYS)[MARCH],
  pairsGuess: joinSize(HOSTS, NEIGHBOURS, MONTHS.length, MONTHS.length),
  pairs: pairsSharing(HOST_DAYS, NEIGHBOUR_DAYS),
  piscesGuess: andSize(HOSTS, 1 / MONTHS.length, 1 / SIGNS),
  pisces: HOST_DAYS.filter((day) => monthOf(day) === MARCH && isPisces(day)).length,
  // In expectation: 20 days of March are Pisces
  piscesExpected: (HOSTS * (PISCES_TO - dayOf(2, 1) + 1)) / YEAR,
}

// ---------------------------------------------------------------------------
// The lab: two tables made from a seed, their statistics measured from the
// rows, each estimate beside the exact count

export interface Row {
  a: number
  b: number
}

export const LAB_R = 10_000
export const LAB_S = 1_000

// `rows` rows whose a and b each hold `distinct` values, spread evenly. In
// a share `correlation` of the rows, b copies a, as a country follows from
// a city; otherwise b is drawn on its own.
export function makeTable(random: () => number, rows: number, distinct: number, correlation: number): Row[] {
  return Array.from({ length: rows }, () => {
    const a = Math.floor(random() * distinct)
    const copy = random() < correlation
    const b = copy ? a : Math.floor(random() * distinct)
    return { a, b }
  })
}

export const distinctOf = (rows: Row[], column: keyof Row) => new Set(rows.map((row) => row[column])).size

// The exact sizes, counted on the rows
export const countWhere = (rows: Row[], keep: (row: Row) => boolean) => rows.filter(keep).length

function tally<K>(rows: Row[], key: (row: Row) => K) {
  const counts = new Map<K, number>()
  for (const row of rows) counts.set(key(row), (counts.get(key(row)) ?? 0) + 1)
  return counts
}

// Rows of R ⋈ S on `key`: for each key, its rows in R times its rows in S
export function joinCount<K>(r: Row[], s: Row[], key: (row: Row) => K) {
  const inS = tally(s, key)
  let total = 0
  for (const [k, n] of tally(r, key)) total += n * (inS.get(k) ?? 0)
  return total
}

// The brute-force referee for joinCount: every pair
export function joinCountByPairs(r: Row[], s: Row[], same: (x: Row, y: Row) => boolean) {
  let total = 0
  for (const x of r) for (const y of s) if (same(x, y)) total += 1
  return total
}

export interface Comparison {
  name: string
  estimate: number
  actual: number
}

// Four operators on the two tables: one value, two values ANDed, a join on
// a, and a join on a and b together
export function compare(r: Row[], s: Row[]): Comparison[] {
  const vra = distinctOf(r, 'a')
  const vrb = distinctOf(r, 'b')
  const vsa = distinctOf(s, 'a')
  const vsb = distinctOf(s, 'b')
  return [
    {
      name: 'σ a = 0',
      estimate: equalitySize(r.length, vra),
      actual: countWhere(r, (row) => row.a === 0),
    },
    {
      name: 'σ a = 0 AND b = 0',
      estimate: andSize(r.length, 1 / vra, 1 / vrb),
      actual: countWhere(r, (row) => row.a === 0 && row.b === 0),
    },
    {
      name: 'R ⋈ S on a',
      estimate: joinSize(r.length, s.length, vra, vsa),
      actual: joinCount(r, s, (row) => row.a),
    },
    {
      name: 'R ⋈ S on a and b',
      estimate: multiJoinSize(r.length, s.length, [
        [vra, vsa],
        [vrb, vsb],
      ]),
      actual: joinCount(r, s, (row) => `${row.a},${row.b}`),
    },
  ]
}

// The lab for one setting: R and S drawn from the same seed
export function lab(distinct: number, correlation: number, seed: number): Comparison[] {
  const random = seeded(seed)
  const r = makeTable(random, LAB_R, distinct, correlation)
  const s = makeTable(random, LAB_S, distinct, correlation)
  return compare(r, s)
}

// How many times too small the AND estimate is, in expectation: the truth
// is (1/V)(ρ + (1 − ρ)/V) of the rows, the estimate 1/V²
export const andError = (distinct: number, correlation: number) => correlation * distinct + 1 - correlation

// The same for the join on a and b: the chance two rows agree on both,
// over the 1/V² the estimate assumes
export function pairJoinError(distinct: number, correlation: number) {
  const v = distinct
  const p = correlation
  const same = (p + (1 - p) / v) / v // the chance of one (x, x) cell
  const other = (1 - p) / (v * v) // the chance of one (x, y) cell, x ≠ y
  const agree = v * same * same + (v * v - v) * other * other
  return agree * v * v
}

// How many times the truth differs from the estimate, as the page reads it
export function errorFactor({ estimate, actual }: Comparison) {
  if (actual === 0 || estimate === 0) return null
  return actual >= estimate ? actual / estimate : -(estimate / actual)
}

// ---------------------------------------------------------------------------
// Numbers as the page writes them

export function formatRows(n: number): string {
  if (n === 0) return '0'
  if (n < 10 && !Number.isInteger(n)) return n.toFixed(1)
  return Math.round(n).toLocaleString('en-US')
}

// Off by less than this reads as about right: chance alone moves small counts
export const ABOUT_RIGHT = 1.3

export const isOff = (factor: number | null) => factor !== null && Math.abs(factor) >= ABOUT_RIGHT

export function formatFactor(factor: number | null): string {
  if (factor === null) return '—'
  const size = Math.abs(factor)
  if (size < ABOUT_RIGHT) return 'about right'
  const times = size < 10 ? size.toFixed(1) : Math.round(size).toLocaleString('en-US')
  return factor > 0 ? `${times}× too small` : `${times}× too big`
}
