// Predicate pushdown on small tables held in memory. A query is SELECT /
// FROM / WHERE with the WHERE in conjunctive normal form; the canonical plan
// pairs every table and then filters, and the pushed plan moves each clause
// down to the lowest operator that has every column it reads. A tiny
// executor runs both on real rows, so the tests can show they always agree
// and the page can count the rows in between. Every number on the page
// comes from here.

export type Value = string | number

// Columns are written with their table's alias, "c.city", so the table a
// column comes from is the part before the dot
export const aliasOf = (column: string) => column.split('.')[0]

export interface Table {
  name: string
  alias: string
  columns: string[]
  rows: Value[][]
}

export function table(name: string, alias: string, columns: string[], rows: Value[][]): Table {
  const qualified = columns.map((column) => `${alias}.${column}`)
  for (const row of rows) if (row.length !== columns.length) throw new Error(`a row of ${name} has the wrong arity`)
  return { name, alias, columns: qualified, rows }
}

export type Op = '=' | '≠' | '<' | '>'
export type Operand = { column: string } | { value: Value }
export interface Comparison {
  left: string
  op: Op
  right: Operand
}
// A clause holds when any one of its comparisons does (an OR)
export type Clause = Comparison[]
// A condition in conjunctive normal form: every clause must hold (an AND of ORs)
export type Cnf = Clause[]

const operand = (right: Value | { column: string }): Operand =>
  typeof right === 'object' ? right : { value: right }
export const col = (column: string) => ({ column })
// One comparison, as a clause of its own
export const cmp = (left: string, op: Op, right: Value | { column: string }): Comparison => ({ left, op, right: operand(right) })
export const clause = (...comparisons: Comparison[]): Clause => comparisons

// The columns a clause reads, and the tables they come from
export const columnsOf = (c: Clause) =>
  [...new Set(c.flatMap((x) => ('column' in x.right ? [x.left, x.right.column] : [x.left])))]
export const tablesOf = (c: Clause) => [...new Set(columnsOf(c).map(aliasOf))]
const columnsOfAll = (cnf: Cnf) => [...new Set(cnf.flatMap(columnsOf))]

// Rule (1c) for one clause over a join of `left` and `right`: it goes onto
// the side that has every column it reads, and stays at the join otherwise
export function side(c: Clause, left: string[], right: string[]): 'left' | 'right' | 'join' {
  const tables = tablesOf(c)
  if (tables.every((t) => left.includes(t))) return 'left'
  if (tables.every((t) => right.includes(t))) return 'right'
  return 'join'
}

// Words for showing a condition
const showValue = (v: Value) => (typeof v === 'string' ? `'${v}'` : String(v))
const showComparison = (x: Comparison) =>
  `${x.left} ${x.op} ${'column' in x.right ? x.right.column : showValue(x.right.value)}`
export const showClause = (c: Clause, alone = true) => {
  const text = c.map(showComparison).join(' ∨ ')
  return c.length > 1 && !alone ? `(${text})` : text
}
export const showCnf = (cnf: Cnf) => cnf.map((c) => showClause(c, cnf.length === 1)).join(' ∧ ')

// Testing rows
function holds(x: Comparison, value: (column: string) => Value): boolean {
  const a = value(x.left)
  const b = 'column' in x.right ? value(x.right.column) : x.right.value
  switch (x.op) {
    case '=':
      return a === b
    case '≠':
      return a !== b
    case '<':
      return a < b
    case '>':
      return a > b
  }
}
const passes = (cnf: Cnf, value: (column: string) => Value) => cnf.every((c) => c.some((x) => holds(x, value)))

// A relation in flight: its columns and its rows. Rows are a bag, as in
// SQL: nothing removes repeats, so the tests compare counts too.
export interface Relation {
  columns: string[]
  rows: Value[][]
}

function at(columns: string[], column: string): number {
  const i = columns.indexOf(column)
  if (i < 0) throw new Error(`no column ${column} here, only ${columns.join(', ')}`)
  return i
}
const reader = (columns: string[]) => {
  const index = new Map(columns.map((c, i) => [c, i]))
  return (row: Value[]) => (column: string) => {
    const i = index.get(column)
    if (i === undefined) throw new Error(`no column ${column} here, only ${columns.join(', ')}`)
    return row[i]
  }
}

// A plan: a tree of operators. A join with no condition is a product ×.
// `keep`, when set, is the columns the operator hands up (a projection
// pushed down into it, the way a scan returns only the columns asked for).
export type Plan =
  | { op: 'scan'; table: Table; keep?: string[] }
  | { op: 'select'; where: Cnf; input: Plan; keep?: string[] }
  | { op: 'join'; on: Cnf; left: Plan; right: Plan; keep?: string[] }
  | { op: 'project'; columns: string[]; input: Plan }

// The columns a node hands up
export function columnsOut(plan: Plan): string[] {
  if (plan.op === 'project') return plan.columns
  if (plan.keep) return plan.keep
  if (plan.op === 'scan') return plan.table.columns
  if (plan.op === 'select') return columnsOut(plan.input)
  return [...columnsOut(plan.left), ...columnsOut(plan.right)]
}

// A plan that has run: each node with what it handed up
export interface Ran {
  plan: Plan
  out: Relation
  inputs: Ran[]
}

function keepOnly(r: Relation, columns: string[] | undefined): Relation {
  if (!columns) return r
  const is = columns.map((c) => at(r.columns, c))
  return { columns, rows: r.rows.map((row) => is.map((i) => row[i])) }
}

export function run(plan: Plan): Ran {
  switch (plan.op) {
    case 'scan':
      return { plan, inputs: [], out: keepOnly({ columns: plan.table.columns, rows: plan.table.rows }, plan.keep) }
    case 'select': {
      const input = run(plan.input)
      const read = reader(input.out.columns)
      const rows = input.out.rows.filter((row) => passes(plan.where, read(row)))
      return { plan, inputs: [input], out: keepOnly({ columns: input.out.columns, rows }, plan.keep) }
    }
    case 'join': {
      const left = run(plan.left)
      const right = run(plan.right)
      const columns = [...left.out.columns, ...right.out.columns]
      const read = reader(columns)
      const rows: Value[][] = []
      for (const a of left.out.rows)
        for (const b of right.out.rows) {
          const row = [...a, ...b]
          if (passes(plan.on, read(row))) rows.push(row)
        }
      return { plan, inputs: [left, right], out: keepOnly({ columns, rows }, plan.keep) }
    }
    case 'project': {
      const input = run(plan.input)
      return { plan, inputs: [input], out: keepOnly(input.out, plan.columns) }
    }
  }
}

export interface Query {
  select: string[]
  from: Table[]
  where: Cnf
}

const scan = (t: Table): Plan => ({ op: 'scan', table: t })

// What the parser hands the optimizer: π_E(σ_B(T1 × T2 × … × Tn))
export function canonical(q: Query): Plan {
  let tree = scan(q.from[0])
  for (const t of q.from.slice(1)) tree = { op: 'join', on: [], left: tree, right: scan(t) }
  return { op: 'project', columns: q.select, input: { op: 'select', where: q.where, input: tree } }
}

// Where a pushed clause lands in the left-deep tree ((T1 ⋈ T2) ⋈ T3) …:
// on the one table it reads, or at the first join below which every table
// it reads has come in. Join k (from 1) is the one that brings in table k.
export type Landing = { at: 'table'; index: number } | { at: 'join'; index: number }

export function landing(q: Query, c: Clause): Landing {
  const tables = tablesOf(c)
  const index = (alias: string) => {
    const i = q.from.findIndex((t) => t.alias === alias)
    if (i < 0) throw new Error(`no table ${alias} in the query`)
    return i
  }
  const where = tables.map(index)
  if (where.length === 1) return { at: 'table', index: where[0] }
  return { at: 'join', index: Math.max(...where) }
}

// Drop every column nobody above needs. `need` is the columns the parent
// still reads; each node keeps those plus what its own condition reads
// below it, and hands up only what is needed.
function narrow(plan: Plan, need: Set<string>): Plan {
  const trim = (p: Exclude<Plan, { op: 'project' }>): Plan => {
    const out = columnsOut(p)
    const kept = out.filter((c) => need.has(c))
    return kept.length < out.length ? { ...p, keep: kept } : p
  }
  switch (plan.op) {
    case 'project':
      return { ...plan, input: narrow(plan.input, new Set(plan.columns)) }
    case 'scan':
      return trim(plan)
    case 'select': {
      // A filter right on a table reads its whole rows as they stream by,
      // then hands up the narrow ones
      const below = new Set([...need, ...columnsOfAll(plan.where)])
      const input = plan.input.op === 'scan' ? plan.input : narrow(plan.input, below)
      return trim({ ...plan, input })
    }
    case 'join': {
      const below = new Set([...need, ...columnsOfAll(plan.on)])
      return trim({ ...plan, left: narrow(plan.left, below), right: narrow(plan.right, below) })
    }
  }
}

// The plan after pushdown: each clause marked `pushed` moves to its
// landing; the rest wait in a filter over the joins, as in the canonical
// plan. With `columns`, every operator also hands up only the columns
// still needed above it.
export function pushed(q: Query, push: boolean[], columns = false): Plan {
  const stays = q.where.filter((_, i) => !push[i])
  const moved = q.where.map((c, i) => ({ c, i })).filter(({ i }) => push[i])
  const lands = moved.map(({ c }) => landing(q, c))
  const onTable = (k: number) => moved.filter((_, j) => lands[j].at === 'table' && lands[j].index === k).map(({ c }) => c)
  const onJoin = (k: number) => moved.filter((_, j) => lands[j].at === 'join' && lands[j].index === k).map(({ c }) => c)
  const leaf = (k: number): Plan => {
    const where = onTable(k)
    return where.length ? { op: 'select', where, input: scan(q.from[k]) } : scan(q.from[k])
  }
  let tree = leaf(0)
  for (let k = 1; k < q.from.length; k++) tree = { op: 'join', on: onJoin(k), left: tree, right: leaf(k) }
  if (stays.length) tree = { op: 'select', where: stays, input: tree }
  const plan: Plan = { op: 'project', columns: q.select, input: tree }
  return columns ? narrow(plan, new Set(q.select)) : plan
}

export const pushAll = (q: Query) => q.where.map(() => true)

// The answer the slow way, with no plan at all: try every combination of
// rows, keep it if the WHERE holds, and write down the SELECT columns. The
// referee for both plans.
export function bruteForce(q: Query): Relation {
  const columns = q.from.flatMap((t) => t.columns)
  const read = reader(columns)
  const rows: Value[][] = []
  const combine = (k: number, sofar: Value[]) => {
    if (k === q.from.length) {
      const value = read(sofar)
      if (passes(q.where, value)) rows.push(q.select.map((c) => value(c)))
      return
    }
    for (const row of q.from[k].rows) combine(k + 1, [...sofar, ...row])
  }
  combine(0, [])
  return { columns: q.select, rows }
}

// The same columns and the same rows, each as many times, in any order
export function sameBag(a: Relation, b: Relation): boolean {
  if (a.columns.join('|') !== b.columns.join('|') || a.rows.length !== b.rows.length) return false
  const count = new Map<string, number>()
  for (const row of a.rows) count.set(JSON.stringify(row), (count.get(JSON.stringify(row)) ?? 0) + 1)
  for (const row of b.rows) {
    const key = JSON.stringify(row)
    const n = count.get(key) ?? 0
    if (n === 0) return false
    count.set(key, n - 1)
  }
  return true
}

// Every node of a run, top first
export const nodesOf = (ran: Ran): Ran[] => [ran, ...ran.inputs.flatMap(nodesOf)]

// The results in between: what every filter and join makes (not the
// stored tables, and not the final projection, which is the answer)
const inBetween = (ran: Ran) => nodesOf(ran).filter((n) => n.plan.op === 'select' || n.plan.op === 'join')

// The most rows any one of them holds
export const biggest = (ran: Ran) => Math.max(...inBetween(ran).map((n) => n.out.rows.length))

// Values handed up from node to node: rows times columns, summed over
// every node but the answer. A stand-in for the pages the plan moves.
export const valuesMoved = (ran: Ran) =>
  nodesOf(ran)
    .slice(1)
    .reduce((sum, n) => sum + n.out.rows.length * n.out.columns.length, 0)

// ---------------------------------------------------------------------------
// The guess: three tables of a shop at real sizes

export const GUESS = { customers: 10_000, orders: 1_000_000, products: 1_000 }
// Pairing multiplies
export const GUESS_PRODUCT = GUESS.customers * GUESS.orders * GUESS.products

// At 100 bytes a row from each table, written at 100 MB/s (decimal units, as
// on the Storage pages)
export const ROW_BYTES = 100
export const DISK_BYTES_PER_SECOND = 100_000_000
export const PAGE_BYTES = 4_000
export const GUESS_BYTES = GUESS_PRODUCT * 3 * ROW_BYTES
export const GUESS_DAYS = GUESS_BYTES / DISK_BYTES_PER_SECOND / 86_400

// The same query with its filters first. Say 100 customers live in
// Houston, 20 products are teas, every customer has the same number of
// orders, and orders are spread evenly over the products.
export const HOUSTON = 100
export const TEAS = 20
export const ORDERS_EACH = GUESS.orders / GUESS.customers
export const HOUSTON_ORDERS = HOUSTON * ORDERS_EACH
export const TEA_SHARE = TEAS / GUESS.products
export const ANSWER = HOUSTON_ORDERS * TEA_SHARE
// The biggest result in between, with every clause pushed
export const PUSHED_BIGGEST = Math.max(HOUSTON, TEAS, HOUSTON_ORDERS, ANSWER)

// ---------------------------------------------------------------------------
// The story: six friends, a shop of eight gifts, three rules

export const FRIEND = table('friend', 'f', ['name', 'hobby', 'soon'], [
  ['Ana', 'books', 'yes'],
  ['Ben', 'games', 'no'],
  ['Cai', 'tea', 'yes'],
  ['Dev', 'plants', 'no'],
  ['Eli', 'games', 'yes'],
  ['Fay', 'books', 'no'],
])

// Two of each kind, one cheap and one not
export const GIFT = table('gift', 'g', ['id', 'hobby', 'price'], [
  [1, 'books', 12],
  [2, 'books', 45],
  [3, 'plants', 18],
  [4, 'plants', 40],
  [5, 'games', 25],
  [6, 'games', 60],
  [7, 'tea', 9],
  [8, 'tea', 35],
])

export const BIRTHDAY = clause(cmp('f.soon', '=', 'yes'))
export const BUDGET = clause(cmp('g.price', '<', 30))
export const SUITS = clause(cmp('f.hobby', '=', col('g.hobby')))

export const STORY_QUERY: Query = { select: ['f.name', 'g.id'], from: [FRIEND, GIFT], where: [BIRTHDAY, BUDGET, SUITS] }

const storyLate = run(canonical(STORY_QUERY))
const storyEarly = run(pushed(STORY_QUERY, pushAll(STORY_QUERY)))
const passesAlone = (t: Table, c: Clause) => t.rows.map((row) => passes([c], reader(t.columns)(row)))

export const STORY = {
  friends: FRIEND.rows.length,
  gifts: GIFT.rows.length,
  // Every pair written down, then tested
  cards: FRIEND.rows.length * GIFT.rows.length,
  // Who is left after their own rule
  friendOk: passesAlone(FRIEND, BIRTHDAY),
  giftOk: passesAlone(GIFT, BUDGET),
  // Each cell of the grid: friend i with gift j
  kept: FRIEND.rows.map((f) => GIFT.rows.map((g) => passes(STORY_QUERY.where, reader([...FRIEND.columns, ...GIFT.columns])([...f, ...g])))),
  answerLate: storyLate.out.rows.length,
  answerEarly: storyEarly.out.rows.length,
  same: sameBag(storyLate.out, storyEarly.out),
  // The pairs written down the early way: what reaches the join from each side
  earlyCards: nodesOf(storyEarly)
    .find((n) => n.plan.op === 'join')!
    .inputs.reduce((p, n) => p * n.out.rows.length, 1),
}
export const FRIENDS_LEFT = STORY.friendOk.filter(Boolean).length
export const GIFTS_LEFT = STORY.giftOk.filter(Boolean).length

// ---------------------------------------------------------------------------
// The lab: a small shop, run for real

export const CUSTOMER = table('customer', 'c', ['id', 'name', 'city'], [
  [1, 'Ana', 'Houston'],
  [2, 'Ben', 'Austin'],
  [3, 'Cai', 'Houston'],
  [4, 'Dev', 'Dallas'],
  [5, 'Eli', 'Houston'],
  [6, 'Fay', 'Austin'],
  [7, 'Gus', 'Dallas'],
  [8, 'Hal', 'Austin'],
])

// id, customer, product, quantity
export const ORDERS = table('orders', 'o', ['id', 'cust', 'prod', 'qty'], [
  [1, 1, 1, 1],
  [2, 1, 3, 3],
  [3, 1, 5, 2],
  [4, 2, 2, 4],
  [5, 3, 2, 1],
  [6, 3, 4, 5],
  [7, 4, 1, 2],
  [8, 5, 1, 3],
  [9, 5, 6, 1],
  [10, 6, 3, 2],
  [11, 7, 2, 3],
  [12, 8, 4, 1],
  [13, 2, 5, 2],
  [14, 3, 3, 2],
  [15, 4, 4, 4],
  [16, 6, 1, 1],
  [17, 7, 5, 6],
  [18, 1, 2, 4],
  [19, 8, 3, 2],
  [20, 5, 2, 2],
  [21, 2, 1, 5],
  [22, 6, 6, 1],
  [23, 3, 1, 1],
  [24, 4, 3, 3],
])

export const PRODUCT = table('product', 'p', ['id', 'title', 'kind', 'price'], [
  [1, 'green tea', 'tea', 4],
  [2, 'black tea', 'tea', 9],
  [3, 'espresso', 'coffee', 12],
  [4, 'oolong', 'tea', 15],
  [5, 'mug', 'gear', 8],
  [6, 'kettle', 'gear', 30],
])

export const LAB: Query = {
  select: ['c.name', 'p.title'],
  from: [CUSTOMER, ORDERS, PRODUCT],
  where: [
    clause(cmp('c.city', '=', 'Houston')),
    clause(cmp('o.cust', '=', col('c.id'))),
    clause(cmp('o.prod', '=', col('p.id'))),
    clause(cmp('p.kind', '=', 'tea'), cmp('p.kind', '=', 'coffee')),
    clause(cmp('o.qty', '>', 2), cmp('p.price', '<', 5)),
  ],
}

// Where a clause of the lab lands, in words
export function landingWords(q: Query, c: Clause): string {
  const l = landing(q, c)
  if (l.at === 'table') return `onto ${q.from[l.index].name.toUpperCase()}`
  return `into the join with ${q.from[l.index].name.toUpperCase()}`
}

const labCanonical = run(canonical(LAB))
const labPushed = run(pushed(LAB, pushAll(LAB), true))
export const LAB_NUMBERS = {
  product: LAB.from.reduce((p, t) => p * t.rows.length, 1),
  productColumns: LAB.from.reduce((n, t) => n + t.columns.length, 0),
  answer: labCanonical.out.rows.length,
  canonicalBiggest: biggest(labCanonical),
  pushedBiggest: biggest(labPushed),
  canonicalValues: valuesMoved(labCanonical),
  pushedValues: valuesMoved(labPushed),
}

// The wrong rewrite of a clause that reads two tables: send each half of
// the OR down to its own table, as if it were an AND. On the lab's data it
// loses rows the query wants.
export function splitOr(q: Query, k: number): Query {
  const split = q.where[k].map((x) => clause(x))
  return { ...q, where: [...q.where.slice(0, k), ...split, ...q.where.slice(k + 1)] }
}
export const LAB_MIXED = 4
export const LAB_SPLIT_ANSWER = bruteForce(splitOr(LAB, LAB_MIXED)).rows.length

// ---------------------------------------------------------------------------
// The quick check: two tables; which clause has to wait at the join?

const C2 = table('customer', 'c', ['id', 'city', 'vip'], [])
const O2 = table('orders', 'o', ['id', 'cust', 'qty', 'price', 'status'], [])
export const CHECK_CLAUSES = {
  oneTableOr: clause(cmp('c.city', '=', 'Austin'), cmp('c.city', '=', 'Dallas')),
  oneTable: clause(cmp('o.qty', '>', 2)),
  mixedOr: clause(cmp('c.vip', '=', 'yes'), cmp('o.price', '>', 100)),
}
export const CHECK_TABLES = { left: [C2.alias], right: [O2.alias] }

// ---------------------------------------------------------------------------
// Check yourself: which columns of ORDERS travel up into the join?

const O8 = table('orders', 'o', ['id', 'cust', 'prod', 'qty', 'price', 'date', 'status', 'note'], [])
const C3 = table('customer', 'c', ['id', 'name', 'vip'], [])
export const COLUMNS_QUERY: Query = {
  select: ['c.name', 'o.qty'],
  from: [C3, O8],
  where: [
    clause(cmp('o.cust', '=', col('c.id'))),
    clause(cmp('o.status', '=', 'open')),
    clause(cmp('c.vip', '=', 'yes'), cmp('o.price', '>', 100)),
  ],
}

// The columns a table's side hands up into its join once every clause is
// pushed and every unneeded column dropped
export function columnsUp(q: Query, t: Table): string[] {
  const under = (p: Plan): Table | null =>
    p.op === 'scan' ? p.table : p.op === 'select' && p.input.op === 'scan' ? p.input.table : null
  const find = (p: Plan): Plan | null => {
    if (p.op === 'scan') return null
    if (p.op !== 'join') return find(p.input)
    for (const side of [p.left, p.right]) if (under(side) === t) return side
    return find(p.left) ?? find(p.right)
  }
  const node = find(pushed(q, pushAll(q), true))
  if (!node) throw new Error(`${t.name} is not under a join`)
  return columnsOut(node)
}
export const CHECK_ORDERS = O8
export const ORDERS_COLUMNS = O8.columns.length
