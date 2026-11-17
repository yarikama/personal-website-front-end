// Relational algebra on small tables held in memory, with set semantics:
// a relation is a set of rows, so no row appears twice and their order
// means nothing. Every operator takes relations and returns one, which is
// what lets a query be a tree of them (a plan). The page's numbers all
// come from running these.

export type Value = string | number

// A column remembers the table it came from, so a product of two tables
// that share a column name can still tell the two apart
export interface Column {
  table: string
  name: string
}

export interface Relation {
  name: string
  columns: Column[]
  rows: Value[][]
}

const rowKey = (row: Value[]) => JSON.stringify(row)

// Rows without repeats, in the order they first appear
function distinct(rows: Value[][]): Value[][] {
  const seen = new Set<string>()
  return rows.filter((row) => {
    const key = rowKey(row)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// A stored table: a name, its column names and its rows
export function table(name: string, columns: string[], rows: Value[][]): Relation {
  for (const row of rows) if (row.length !== columns.length) throw new Error(`a row of ${name} has the wrong arity`)
  return { name, columns: columns.map((column) => ({ table: name, name: column })), rows: distinct(rows) }
}

// Where a column is: "name" when only one column has that name, or
// "takes.name" to say which table's. Throws when there is none, or when a
// bare name could mean two: a plan that asks for a column its input does
// not have is not a plan.
export function columnIndex(r: Relation, column: string): number {
  const [tableName, name] = column.includes('.') ? column.split('.') : [null, column]
  const found = r.columns.flatMap((c, i) => (c.name === name && (tableName === null || c.table === tableName) ? [i] : []))
  if (found.length === 0) throw new Error(`${r.name} has no column ${column}`)
  if (found.length > 1) throw new Error(`${column} could be any of ${found.length} columns of ${r.name}`)
  return found[0]
}

// The column headings to show: a bare name, or table.name where two share it
export function headings(r: Relation): string[] {
  return r.columns.map((c) => (r.columns.filter((d) => d.name === c.name).length > 1 ? `${c.table}.${c.name}` : c.name))
}

// Conditions: comparisons of a column with another column or a value, all
// of which must hold. Declared rather than written as a function, so a
// condition that reads a missing column fails even on an empty input.
type Operand = { column: string } | { value: Value }
interface Comparison {
  left: string
  op: '=' | '≠'
  right: Operand
}
export interface Condition {
  label: string
  all: Comparison[]
}

const show = (operand: Operand) => ('column' in operand ? operand.column : typeof operand.value === 'string' ? `'${operand.value}'` : String(operand.value))
const compare = (left: string, op: Comparison['op'], right: Operand): Condition => ({
  label: `${left} ${op} ${show(right)}`,
  all: [{ left, op, right }],
})

// column = column
export const same = (left: string, right: string) => compare(left, '=', { column: right })
// column = value, and column ≠ value
export const is = (column: string, value: Value) => compare(column, '=', { value })
export const isNot = (column: string, value: Value) => compare(column, '≠', { value })
// Every condition at once
export const and = (...conditions: Condition[]): Condition => ({
  label: conditions.map((c) => c.label).join(' ∧ '),
  all: conditions.flatMap((c) => c.all),
})

// σ: keep the rows the condition accepts
export function select(r: Relation, condition: Condition): Relation {
  const tests = condition.all.map(({ left, op, right }) => {
    const a = columnIndex(r, left)
    const b = 'column' in right ? columnIndex(r, right.column) : null
    return (row: Value[]) => {
      const equal = row[a] === (b === null ? (right as { value: Value }).value : row[b])
      return op === '=' ? equal : !equal
    }
  })
  return { ...r, rows: r.rows.filter((row) => tests.every((test) => test(row))) }
}

// π: keep only these columns; rows that are now the same become one
export function project(r: Relation, columns: string[]): Relation {
  const at = columns.map((column) => columnIndex(r, column))
  return { ...r, columns: at.map((i) => r.columns[i]), rows: distinct(r.rows.map((row) => at.map((i) => row[i]))) }
}

// ×: every row of one glued to every row of the other
export function product(r: Relation, s: Relation): Relation {
  return {
    name: `${r.name} × ${s.name}`,
    columns: [...r.columns, ...s.columns],
    rows: r.rows.flatMap((a) => s.rows.map((b) => [...a, ...b])),
  }
}

// ⋈: the pairs of the product that pass the condition. That is all a join is.
export function join(r: Relation, s: Relation, condition: Condition): Relation {
  return { ...select(product(r, s), condition), name: `${r.name} ⋈ ${s.name}` }
}

// The set operations need the same number of columns on both sides; the
// result takes the left side's column names
function setOp(r: Relation, s: Relation, symbol: string, keep: (inS: boolean) => boolean, addS: boolean): Relation {
  if (r.columns.length !== s.columns.length) throw new Error(`${r.name} ${symbol} ${s.name}: different numbers of columns`)
  const inS = new Set(s.rows.map(rowKey))
  const rows = r.rows.filter((row) => keep(inS.has(rowKey(row))))
  return { name: `${r.name} ${symbol} ${s.name}`, columns: r.columns, rows: distinct(addS ? [...rows, ...s.rows] : rows) }
}
export const union = (r: Relation, s: Relation) => setOp(r, s, '∪', () => true, true)
export const intersect = (r: Relation, s: Relation) => setOp(r, s, '∩', (inS) => inS, false)
export const difference = (r: Relation, s: Relation) => setOp(r, s, '−', (inS) => !inS, false)

// The same set of rows, in any order
export function sameRows(r: Relation, s: Relation): boolean {
  const a = new Set(r.rows.map(rowKey))
  const b = new Set(s.rows.map(rowKey))
  return a.size === b.size && [...a].every((key) => b.has(key))
}

// A plan: a tree of operators with stored tables at its leaves
export type Plan =
  | { op: 'table'; table: Relation }
  | { op: 'select'; condition: Condition; input: Plan }
  | { op: 'project'; columns: string[]; input: Plan }
  | { op: 'product' | 'union' | 'intersect' | 'difference'; left: Plan; right: Plan }
  | { op: 'join'; condition: Condition; left: Plan; right: Plan }

// A plan that has run: every node with what it handed up
export interface Ran {
  label: string
  out: Relation
  inputs: Ran[]
}

const SYMBOL = { product: '×', union: '∪', intersect: '∩', difference: '−' } as const
const BINARY = { product, union, intersect, difference } as const

export function run(plan: Plan): Ran {
  switch (plan.op) {
    case 'table':
      return { label: plan.table.name, out: plan.table, inputs: [] }
    case 'select': {
      const input = run(plan.input)
      return { label: `σ ${plan.condition.label}`, out: select(input.out, plan.condition), inputs: [input] }
    }
    case 'project': {
      const input = run(plan.input)
      return { label: `π ${plan.columns.join(', ')}`, out: project(input.out, plan.columns), inputs: [input] }
    }
    case 'join': {
      const left = run(plan.left)
      const right = run(plan.right)
      return { label: `⋈ ${plan.condition.label}`, out: join(left.out, right.out, plan.condition), inputs: [left, right] }
    }
    default: {
      const left = run(plan.left)
      const right = run(plan.right)
      return { label: SYMBOL[plan.op], out: BINARY[plan.op](left.out, right.out), inputs: [left, right] }
    }
  }
}

// The plan written as one expression, the way the page writes it
export function expression(plan: Plan): string {
  switch (plan.op) {
    case 'table':
      return plan.table.name.toUpperCase()
    case 'select':
      return `σ[${plan.condition.label}](${expression(plan.input)})`
    case 'project':
      return `π[${plan.columns.join(', ')}](${expression(plan.input)})`
    case 'join':
      return `(${expression(plan.left)} ⋈[${plan.condition.label}] ${expression(plan.right)})`
    default:
      return `(${expression(plan.left)} ${SYMBOL[plan.op]} ${expression(plan.right)})`
  }
}

// --- The guess: a product looks at no data at all ---

export const productSize = (r: number, s: number) => r * s
export const GUESS = { students: 1000, courses: 50 }
export const GUESS_ROWS = productSize(GUESS.students, GUESS.courses)

// --- The story: a kitchen where every station takes a tray and hands one on ---

export const PASTA = table(
  'pastas',
  ['pasta', 'shape'],
  [
    ['spaghetti', 'long'],
    ['penne', 'short'],
    ['fusilli', 'short'],
  ]
)

// The shape of pasta each sauce clings to
export const SAUCE = table(
  'sauces',
  ['sauce', 'fits', 'kind'],
  [
    ['pesto', 'long', 'veg'],
    ['ragù', 'short', 'meat'],
    ['tomato', 'short', 'veg'],
    ['cream', 'long', 'veg'],
  ]
)

export const VEGGIE = is('kind', 'veg')
export const FITS = same('shape', 'fits')

// Tonight's prep list: the sauces of every vegetarian plate that works
export const KITCHEN_PLAN: Plan = {
  op: 'project',
  columns: ['sauce'],
  input: {
    op: 'select',
    condition: FITS,
    input: {
      op: 'product',
      left: { op: 'table', table: PASTA },
      right: { op: 'select', condition: VEGGIE, input: { op: 'table', table: SAUCE } },
    },
  },
}
export const KITCHEN = run(KITCHEN_PLAN)

// Each station's tray, bottom up
const [FITTING] = KITCHEN.inputs
const [PAIRED] = FITTING.inputs
const [, VEG_STEP] = PAIRED.inputs
export const TRAYS = {
  pasta: PASTA,
  sauce: SAUCE,
  veg: VEG_STEP.out,
  pairs: PAIRED.out,
  fitting: FITTING.out,
  prep: KITCHEN.out,
}

// The same answer from a join in place of the product and its filter
export const KITCHEN_JOINED = project(join(PASTA, select(SAUCE, VEGGIE), FITS), ['sauce'])

// --- The lab: students and the courses they take ---

export const STUDENT = table(
  'student',
  ['name', 'year'],
  [
    ['Ava', 1],
    ['Leo', 2],
    ['Mei', 2],
    ['Raj', 3],
    ['Zoe', 1],
  ]
)

export const TAKES = table(
  'takes',
  ['name', 'course'],
  [
    ['Ava', 'Math'],
    ['Ava', 'Art'],
    ['Leo', 'Math'],
    ['Mei', 'CS'],
    ['Mei', 'Math'],
    ['Raj', 'Art'],
    ['Raj', 'CS'],
  ]
)

export const YEARS = ['any', 1, 2, 3] as const
export type Year = (typeof YEARS)[number]
export const COMBINES = ['×', 'σ over ×', '⋈'] as const
export type Combine = (typeof COMBINES)[number]
export const KEEPS = ['every column', 'name', 'course'] as const
export type Keep = (typeof KEEPS)[number]

export const SAME_STUDENT = same('student.name', 'takes.name')

// The lab's tree for a choice of filter, combining and columns to keep
export function labPlan(year: Year, combine: Combine, keep: Keep): Plan {
  const students: Plan = { op: 'table', table: STUDENT }
  const left: Plan = year === 'any' ? students : { op: 'select', condition: is('year', year), input: students }
  const right: Plan = { op: 'table', table: TAKES }
  const combined: Plan =
    combine === '⋈'
      ? { op: 'join', condition: SAME_STUDENT, left, right }
      : combine === '×'
        ? { op: 'product', left, right }
        : { op: 'select', condition: SAME_STUDENT, input: { op: 'product', left, right } }
  if (keep === 'every column') return combined
  return { op: 'project', columns: [keep === 'name' ? 'student.name' : 'course'], input: combined }
}

// Rows a join of tables this big can return, before you see a row
export const joinRange = (r: number, s: number) => [0, productSize(r, s)] as const

// --- Check yourself: a library, and the first tree its SQL becomes ---
// SELECT title FROM book, loan WHERE book.id = loan.book AND year = 2026

export const BOOK = table(
  'book',
  ['id', 'title'],
  [
    [1, 'Dune'],
    [2, 'Emma'],
    [3, 'Ulysses'],
  ]
)
export const LOAN = table(
  'loan',
  ['book', 'member', 'year'],
  [
    [1, 'Kim', 2026],
    [2, 'Lee', 2025],
    [1, 'Max', 2025],
    [3, 'Kim', 2026],
  ]
)
export const LOAN_WHERE = and(same('book.id', 'loan.book'), is('year', 2026))

const books: Plan = { op: 'table', table: BOOK }
const loans: Plan = { op: 'table', table: LOAN }
const both: Plan = { op: 'product', left: books, right: loans }

// The options, in the order the page lists them; the second is the one
export const LOAN_TREES: Plan[] = [
  { op: 'select', condition: LOAN_WHERE, input: { op: 'project', columns: ['title'], input: both } },
  { op: 'project', columns: ['title'], input: { op: 'select', condition: LOAN_WHERE, input: both } },
  { op: 'project', columns: ['title'], input: { op: 'product', left: books, right: { op: 'select', condition: LOAN_WHERE, input: loans } } },
  { op: 'select', condition: LOAN_WHERE, input: both },
]
