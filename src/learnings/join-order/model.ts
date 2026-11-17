// Join order: how many join trees a query has, what each one costs, and
// three ways to pick one: try them all, join the smallest pair next
// (greedy), or solve every subset of tables once (dynamic programming).
//
// A set of tables is a bit mask: table i is in it when bit i is set. A plan
// is a join tree: a table's index at a leaf, or [left, right] for a join.
// R ⋈ S and S ⋈ R count as different trees, as the course counts them.
//
// The cost is the course's: the rows every join in the plan produces, added
// up, the final result included. The final result is the same for every
// plan, so it never changes which plan wins.

export interface Join {
  a: number
  b: number
  // The join's size estimate divides T(a) · T(b) by this: the larger count
  // of distinct join-key values, as /learnings/size-estimation estimates it
  divide: number
}

export interface Query {
  names: string[]
  // T(R) for each table, its filters already applied
  rows: number[]
  joins: Join[]
}

export type Tree = number | [Tree, Tree]

export const full = (n: number) => (1 << n) - 1

export function bits(mask: number): number[] {
  const out: number[] = []
  for (let i = 0; mask >> i; i++) if ((mask >> i) & 1) out.push(i)
  return out
}

export const count = (mask: number) => bits(mask).length

// The estimated rows of the join of every table in `mask`: the product of
// their sizes, divided once for each join condition between two of them.
// With no condition between two parts it is a cross product. The same set
// of tables gives the same rows whatever order they were joined in.
export function size(query: Query, mask: number): number {
  let rows = 1
  for (const i of bits(mask)) rows *= query.rows[i]
  for (const join of query.joins) if ((mask >> join.a) & 1 && (mask >> join.b) & 1) rows /= join.divide
  return rows
}

export function maskOf(tree: Tree): number {
  return typeof tree === 'number' ? 1 << tree : maskOf(tree[0]) | maskOf(tree[1])
}

// Every join in the tree, bottom up (left before right), as table sets
export function joinsOf(tree: Tree): number[] {
  if (typeof tree === 'number') return []
  return [...joinsOf(tree[0]), ...joinsOf(tree[1]), maskOf(tree)]
}

// Every join in the tree as a tree of its own, bottom up
export function subplans(tree: Tree): Tree[] {
  if (typeof tree === 'number') return []
  return [...subplans(tree[0]), ...subplans(tree[1]), tree]
}

// Whether the join at the top of `tree` has a condition between its sides
export function linked(query: Query, tree: Tree): boolean {
  if (typeof tree === 'number') return true
  const [l, r] = [maskOf(tree[0]), maskOf(tree[1])]
  return query.joins.some((j) => ((l >> j.a) & 1 && (r >> j.b) & 1) || ((l >> j.b) & 1 && (r >> j.a) & 1))
}

export const cost = (query: Query, tree: Tree) => joinsOf(tree).reduce((sum, mask) => sum + size(query, mask), 0)

// The non-empty proper subsets of `mask`: the ways to cut it into a left
// side and a right side
export function splits(mask: number): number[] {
  const out: number[] = []
  for (let left = (mask - 1) & mask; left > 0; left = (left - 1) & mask) out.push(left)
  return out.reverse()
}

// Every bushy join tree over the tables in `mask`: any split, then any tree
// for each side
export function allTrees(mask: number): Tree[] {
  const tables = bits(mask)
  if (tables.length === 1) return [tables[0]]
  const out: Tree[] = []
  for (const left of splits(mask))
    for (const l of allTrees(left)) for (const r of allTrees(mask & ~left)) out.push([l, r])
  return out
}

// Every left-deep tree: the right input of each join is a single table
export function leftDeepTrees(mask: number): Tree[] {
  const tables = bits(mask)
  if (tables.length === 1) return [tables[0]]
  return tables.flatMap((last) => leftDeepTrees(mask & ~(1 << last)).map((rest): Tree => [rest, last]))
}

const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1))

// Left-deep trees: a tree is the order the tables are added in, n!
export const leftDeepCount = (n: number) => factorial(n)

// Bushy trees: C(n−1) shapes of binary tree with n leaves, times n! ways
// to put the tables on the leaves, which is (2n − 2)! / (n − 1)!
export function bushyCount(n: number): number {
  let out = 1
  for (let k = n; k <= 2 * n - 2; k++) out *= k
  return out
}

// The splits dynamic programming looks at: each set S of two or more
// tables is cut 2^|S| − 2 ways. Summed over every set, 3^n − 2^(n+1) + 1
// (each table goes left, right or stays out: 3^n, less the 2^n with
// nothing on the left and the 2^n with nothing on the right, plus the one
// with nothing on either side, taken away twice)
export const dpSplitCount = (n: number) => 3 ** n - 2 ** (n + 1) + 1

export interface Brute {
  best: Tree
  bestCost: number
  worst: Tree
  worstCost: number
  trees: number
}

// The referee: cost every bushy tree. Ties go to the first one found.
export function bruteForce(query: Query): Brute {
  let best: Tree = 0
  let worst: Tree = 0
  let bestCost = Infinity
  let worstCost = -Infinity
  const trees = allTrees(full(query.rows.length))
  for (const tree of trees) {
    const c = cost(query, tree)
    if (c < bestCost) [best, bestCost] = [tree, c]
    if (c > worstCost) [worst, worstCost] = [tree, c]
  }
  return { best, bestCost, worst, worstCost, trees: trees.length }
}

export interface Entry {
  mask: number
  // The rows this set of tables produces, and the cheapest plan's cost
  rows: number
  cost: number
  // The best split, as table sets; 0 for a single table
  left: number
  right: number
  // How many splits were tried for this set
  tried: number
}

export interface Dp {
  // The memo table, one entry per set of tables, in the order filled:
  // single tables first, then pairs, then threes, and so on
  table: Entry[]
  best: Tree
  cost: number
  // Splits looked at, over every set
  splits: number
}

// Dynamic programming over subsets: the best plan for a set is the cheapest
// of (best plan for a left part) joined with (best plan for the rest), over
// every split, and the best plans for the parts are already in the table.
export function dynamicProgramming(query: Query): Dp {
  const n = query.rows.length
  const memo = new Map<number, Entry>()
  const masks = Array.from({ length: full(n) }, (_, i) => i + 1).sort((a, b) => count(a) - count(b) || a - b)
  let total = 0
  for (const mask of masks) {
    const rows = size(query, mask)
    if (count(mask) === 1) {
      memo.set(mask, { mask, rows, cost: 0, left: 0, right: 0, tried: 0 })
      continue
    }
    let best: Entry | null = null
    const tries = splits(mask)
    for (const left of tries) {
      const right = mask & ~left
      const c = memo.get(left)!.cost + memo.get(right)!.cost + rows
      if (!best || c < best.cost) best = { mask, rows, cost: c, left, right, tried: tries.length }
    }
    total += tries.length
    memo.set(mask, best!)
  }
  const plan = (mask: number): Tree => {
    const entry = memo.get(mask)!
    return entry.left === 0 ? bits(mask)[0] : [plan(entry.left), plan(entry.right)]
  }
  const table = masks.map((mask) => memo.get(mask)!)
  return { table, best: plan(full(n)), cost: memo.get(full(n))!.cost, splits: total }
}

// Greedy: of the pieces built so far, join the two whose join is smallest,
// until one piece is left. Ties go to the first pair.
export function greedy(query: Query): { best: Tree; cost: number; steps: Tree[] } {
  let pieces: Tree[] = query.rows.map((_, i) => i)
  const steps: Tree[] = []
  while (pieces.length > 1) {
    let pick: [number, number] = [0, 1]
    let smallest = Infinity
    for (let i = 0; i < pieces.length; i++)
      for (let j = i + 1; j < pieces.length; j++) {
        const rows = size(query, maskOf(pieces[i]) | maskOf(pieces[j]))
        if (rows < smallest) [pick, smallest] = [[i, j], rows]
      }
    pieces = joinPieces(pieces, pick[0], pick[1])
    steps.push(pieces[pieces.length - 1])
  }
  return { best: pieces[0], cost: cost(query, pieces[0]), steps }
}

// Join pieces i and j: they leave the list, and their join goes on the end
export function joinPieces(pieces: Tree[], i: number, j: number): Tree[] {
  return [...pieces.filter((_, k) => k !== i && k !== j), [pieces[i], pieces[j]]]
}

// A tree as text: "(C ⋈ F) ⋈ H", with the tables' short names
export function show(query: Query, tree: Tree, short = query.names): string {
  if (typeof tree === 'number') return short[tree]
  const side = (t: Tree) => (typeof t === 'number' ? show(query, t, short) : `(${show(query, t, short)})`)
  return `${side(tree[0])} ⋈ ${side(tree[1])}`
}

// A set of tables as their initials, in table order: "CFH"
export const initials = (query: Query, mask: number) =>
  bits(mask)
    .map((i) => query.names[i][0])
    .join('')

// A query on `n` tables with random sizes and join conditions, from
// `random`: a connected join graph (a random tree) plus maybe a few more
// conditions
export function randomQuery(random: () => number, n: number): Query {
  const rows = Array.from({ length: n }, () => 1 + Math.floor(random() ** 2 * 5000))
  const joins: Join[] = []
  for (let i = 1; i < n; i++) joins.push({ a: Math.floor(random() * i), b: i, divide: 1 + Math.floor(random() * 2000) })
  for (let k = 0; k < Math.floor(random() * n); k++) {
    const a = Math.floor(random() * n)
    const b = Math.floor(random() * n)
    if (a !== b && !joins.some((j) => (j.a === a && j.b === b) || (j.a === b && j.b === a)))
      joins.push({ a, b, divide: 1 + Math.floor(random() * 2000) })
  }
  return { names: rows.map((_, i) => `T${i}`), rows, joins }
}

// ---------------------------------------------------------------------------
// The weekend trip of the story: three real lists, matched for real
//
// Five cities, two days. Each concert is in one city on one day; four
// flights land in every city on every day; each city has six rooms. A trip
// is a concert, a flight into its city that day, and a room in that city.

export const CITIES = 5
export const DAYS = 2

export interface Trip {
  concerts: { city: number; day: number }[]
  flights: { city: number; day: number }[]
  rooms: { city: number }[]
}

export const TRIP: Trip = {
  concerts: [
    { city: 0, day: 0 },
    { city: 1, day: 1 },
  ],
  flights: Array.from({ length: CITIES * DAYS * 4 }, (_, i) => ({ city: i % CITIES, day: Math.floor(i / CITIES) % DAYS })),
  rooms: Array.from({ length: CITIES * 6 }, (_, i) => ({ city: i % CITIES })),
}

// The lists, in the order the story names them
export const LISTS = ['concerts', 'flights', 'rooms'] as const
export type List = (typeof LISTS)[number]

// How many matches a set of lists has, found by trying every combination
// and keeping the ones where every pair that shares something agrees on it
export function matches(trip: Trip, lists: List[]): number {
  // A list left out is one empty choice, so it never disagrees
  const pick = <T>(list: List, items: T[]): (T | null)[] => (lists.includes(list) ? items : [null])
  let found = 0
  for (const c of pick('concerts', trip.concerts))
    for (const f of pick('flights', trip.flights))
      for (const r of pick('rooms', trip.rooms)) {
        const city = [c?.city, f?.city, r?.city].filter((x) => x !== undefined)
        const day = [c?.day, f?.day].filter((x) => x !== undefined)
        if (city.every((x) => x === city[0]) && day.every((x) => x === day[0])) found += 1
      }
  return found
}

// The three ways to do the trip: match a pair first, then add the third
// list. Lines written: the pair's sheet plus the trips.
export const TRIP_PLANS = (
  [
    ['flights', 'rooms', 'concerts'],
    ['concerts', 'flights', 'rooms'],
    ['concerts', 'rooms', 'flights'],
  ] as [List, List, List][]
).map(([a, b, last]) => {
  const pair = matches(TRIP, [a, b])
  const trips = matches(TRIP, [...LISTS])
  return { pair: [a, b] as [List, List], last, pairLines: pair, trips, lines: pair + trips }
})

// ---------------------------------------------------------------------------
// The lab: a shop's five tables, each after its filter (customers of one
// market segment, suppliers in one country). Every join condition is a key
// join, so its estimate divides by the number of keys in the full table.

export const SHOP: Query = {
  names: ['CUSTOMER', 'ORDERS', 'LINEITEM', 'PART', 'SUPPLIER'],
  rows: [300, 15000, 60000, 2000, 5],
  joins: [
    { a: 0, b: 1, divide: 1500 },
    { a: 1, b: 2, divide: 15000 },
    { a: 2, b: 3, divide: 2000 },
    { a: 2, b: 4, divide: 100 },
  ],
}

// Whether a join in the tree has no condition between its two sides
export const hasCrossProduct = (query: Query, tree: Tree) => subplans(tree).some((join) => !linked(query, join))

// Worked once, here, so the figures only draw
export const SHOP_DP = dynamicProgramming(SHOP)
export const SHOP_GREEDY = greedy(SHOP)
export const SHOP_BRUTE = bruteForce(SHOP)
// The best and the worst plan with no cross product in them
const linkedCosts = allTrees(full(SHOP.rows.length))
  .filter((tree) => !hasCrossProduct(SHOP, tree))
  .map((tree) => cost(SHOP, tree))
export const SHOP_LINKED = { trees: linkedCosts.length, worst: Math.max(...linkedCosts), best: Math.min(...linkedCosts) }

// The memo entries the best plan is made of, as table sets
export function planSets(dp: Dp): Set<number> {
  const memo = new Map(dp.table.map((entry) => [entry.mask, entry]))
  const out = new Set<number>()
  const walk = (mask: number) => {
    out.add(mask)
    const entry = memo.get(mask)!
    if (entry.left) [entry.left, entry.right].forEach(walk)
  }
  walk(full(Math.max(...dp.table.map((e) => count(e.mask)))))
  return out
}

// ---------------------------------------------------------------------------
// Check yourself: four tables in a chain, A–B–C–D, where the smallest join
// is the wrong place to start

export const CHAIN: Query = {
  names: ['A', 'B', 'C', 'D'],
  rows: [10, 500, 10, 20],
  joins: [
    { a: 0, b: 1, divide: 50 },
    { a: 1, b: 2, divide: 200 },
    { a: 2, b: 3, divide: 10 },
  ],
}

// The four plans the check offers
export const CHAIN_PLANS = {
  greedy: [[[2, 3], 1], 0] as Tree, // C ⋈ D, then B, then A: greedy’s
  best: [[[1, 2], 0], 3] as Tree, // B ⋈ C, then A, then D
  leftFirst: [[[0, 1], 2], 3] as Tree, // A ⋈ B, then C, then D
  pairs: [
    [0, 1],
    [2, 3],
  ] as Tree, // A ⋈ B and C ⋈ D, then the two
}

// ---------------------------------------------------------------------------
// Numbers as the page writes them

export const formatRows = (n: number) => Math.round(n).toLocaleString('en-US')

// "1.5k", "18M": short enough for a card in the memo table
export function compact(n: number): string {
  const round = (x: number) => (x >= 10 ? String(Math.round(x)) : String(Number(x.toFixed(1))))
  if (n >= 1e9) return `${round(n / 1e9)}B`
  if (n >= 1e6) return `${round(n / 1e6)}M`
  if (n >= 1e3) return `${round(n / 1e3)}k`
  return String(Math.round(n))
}
