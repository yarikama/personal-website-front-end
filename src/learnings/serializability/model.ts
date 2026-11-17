import { seeded } from '../../components/explain/random'

// Transactions as short programs of reads and writes, schedules as the order
// a database runs their steps in, and the test for whether a schedule is as
// safe as running the transactions one at a time: its conflicts, its
// precedence graph, and a cycle in that graph. A brute-force referee runs
// every serial order on random starting values, so the tests can check the
// graph's verdict against what the schedule actually does.

export type Kind = 'r' | 'w'

// What a transaction has read so far, by item
export type Seen = Readonly<Record<string, number>>
export type State = Record<string, number>

export interface Step {
  kind: Kind
  item: string
  // For a write: the value written, from what this transaction has read
  write?: (seen: Seen) => number
}

export interface Transaction {
  name: string
  // What it does, in a few words, and in one
  does: string
  short?: string
  steps: Step[]
}

// One step of a schedule: step `step` of transaction `tx` (an index into
// the list of transactions)
export interface Op {
  tx: number
  step: number
}

export const read = (item: string): Step => ({ kind: 'r', item })
export const write = (item: string, value: (seen: Seen) => number): Step => ({ kind: 'w', item, write: value })

// The step an op stands for
export const stepOf = (txs: readonly Transaction[], op: Op) => txs[op.tx].steps[op.step]

// Whether `ops` runs every step of every transaction exactly once, each
// transaction's steps in their own order
export function isSchedule(txs: readonly Transaction[], ops: readonly Op[]): boolean {
  const next = txs.map(() => 0)
  for (const op of ops) {
    if (op.tx < 0 || op.tx >= txs.length || op.step !== next[op.tx]) return false
    next[op.tx]++
  }
  return next.every((n, t) => n === txs[t].steps.length)
}

export interface Run {
  final: State
  // The value each op read or wrote
  values: number[]
  // The items' values just after each op
  after: State[]
}

// Run a schedule from `start`: a read copies the item's current value into
// the transaction's own memory, a write sets the item from that memory
export function run(txs: readonly Transaction[], ops: readonly Op[], start: Readonly<State>): Run {
  const state: State = { ...start }
  const seen: State[] = txs.map(() => ({}))
  const values: number[] = []
  const after: State[] = []
  for (const op of ops) {
    const step = stepOf(txs, op)
    if (step.kind === 'r') {
      if (!(step.item in state)) throw new Error(`No item ${step.item}`)
      seen[op.tx][step.item] = state[step.item]
    } else {
      state[step.item] = step.write!(seen[op.tx])
    }
    values.push(state[step.item])
    after.push({ ...state })
  }
  return { final: state, values, after }
}

// The serial schedule that runs whole transactions in `order`
export const serial = (txs: readonly Transaction[], order: readonly number[]): Op[] =>
  order.flatMap((tx) => txs[tx].steps.map((_, step) => ({ tx, step })))

// Two steps conflict when they come from different transactions, touch the
// same item, and at least one of them writes it
export function conflict(txs: readonly Transaction[], a: Op, b: Op): boolean {
  const x = stepOf(txs, a)
  const y = stepOf(txs, b)
  return a.tx !== b.tx && x.item === y.item && (x.kind === 'w' || y.kind === 'w')
}

export interface Pair {
  // Positions in the schedule, first < second
  first: number
  second: number
  item: string
}

export function conflicts(txs: readonly Transaction[], ops: readonly Op[]): Pair[] {
  const pairs: Pair[] = []
  for (let i = 0; i < ops.length; i++)
    for (let j = i + 1; j < ops.length; j++)
      if (conflict(txs, ops[i], ops[j])) pairs.push({ first: i, second: j, item: stepOf(txs, ops[i]).item })
  return pairs
}

export interface Edge {
  from: number
  to: number
  // The items whose conflicts put this arrow in
  items: string[]
}

// The precedence graph: an arrow Ti → Tj when a step of Ti comes before a
// step of Tj it conflicts with
export function precedence(txs: readonly Transaction[], ops: readonly Op[]): Edge[] {
  const edges = new Map<string, Edge>()
  for (const { first, second, item } of conflicts(txs, ops)) {
    const from = ops[first].tx
    const to = ops[second].tx
    const key = `${from}>${to}`
    const edge = edges.get(key) ?? { from, to, items: [] }
    if (!edge.items.includes(item)) edge.items.push(item)
    edges.set(key, edge)
  }
  return [...edges.values()].sort((a, b) => a.from - b.from || a.to - b.to)
}

// Which transactions each one reaches by following arrows, itself included
function reach(n: number, edges: readonly Edge[]): boolean[][] {
  const r = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j))
  for (const { from, to } of edges) r[from][to] = true
  for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (r[i][k] && r[k][j]) r[i][j] = true
  return r
}

// The arrows that lie on some cycle: Ti → Tj is on one exactly when Tj
// leads back to Ti
export function cycleEdges(n: number, edges: readonly Edge[]): Edge[] {
  const r = reach(n, edges)
  return edges.filter(({ from, to }) => r[to][from])
}

// One cycle, as the transactions round it with the first repeated at the
// end (T1, T2, T1), or null when the graph has none
export function findCycle(n: number, edges: readonly Edge[]): number[] | null {
  const out = Array.from({ length: n }, () => [] as number[])
  for (const { from, to } of edges) out[from].push(to)
  // 0: not visited, 1: on the current path, 2: done
  const mark = Array.from({ length: n }, () => 0)
  const path: number[] = []
  const visit = (u: number): number[] | null => {
    mark[u] = 1
    path.push(u)
    for (const v of out[u]) {
      if (mark[v] === 1) return [...path.slice(path.indexOf(v)), v]
      if (mark[v] === 0) {
        const found = visit(v)
        if (found) return found
      }
    }
    path.pop()
    mark[u] = 2
    return null
  }
  for (let u = 0; u < n; u++) {
    if (mark[u] === 0) {
      const found = visit(u)
      if (found) return found
    }
  }
  return null
}

// An order of the transactions in which every arrow points forward (the
// lowest-numbered ready transaction first), or null when there is a cycle
export function topologicalOrder(n: number, edges: readonly Edge[]): number[] | null {
  const into = Array.from({ length: n }, () => 0)
  for (const { to } of edges) into[to]++
  const order: number[] = []
  const done = new Set<number>()
  while (order.length < n) {
    const ready = into.findIndex((count, t) => count === 0 && !done.has(t))
    if (ready === -1) return null
    order.push(ready)
    done.add(ready)
    for (const { from, to } of edges) if (from === ready) into[to]--
  }
  return order
}

// Every order of the transactions 0 to n − 1, which is every serial schedule
export function permutations(n: number): number[][] {
  if (n === 0) return [[]]
  return permutations(n - 1).flatMap((rest) =>
    Array.from({ length: n }, (_, at) => [...rest.slice(0, at), n - 1, ...rest.slice(at)]),
  )
}

export const sameState = (a: Readonly<State>, b: Readonly<State>) => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  return [...keys].every((k) => Math.abs((a[k] ?? NaN) - (b[k] ?? NaN)) < 1e-9)
}

// The serial orders that leave the items exactly as the schedule does, from
// one starting state
export function matchingOrders(txs: readonly Transaction[], ops: readonly Op[], start: Readonly<State>): number[][] {
  const final = run(txs, ops, start).final
  return permutations(txs.length).filter((order) => sameState(run(txs, serial(txs, order), start).final, final))
}

// Random starting values for the items, for the brute-force referee
export function randomStart(items: readonly string[], random: () => number): State {
  return Object.fromEntries(items.map((item) => [item, Math.floor(random() * 1000) - 300]))
}

export const itemsOf = (txs: readonly Transaction[]) => [...new Set(txs.flatMap((tx) => tx.steps.map((s) => s.item)))].sort()

// The referee: whether some serial order has the same effect as the
// schedule on every one of `trials` random starting states. Many random
// states stand in for "every starting state"
export function sameAsSomeSerial(txs: readonly Transaction[], ops: readonly Op[], trials = 40, seed = 1): boolean {
  const random = seeded(seed)
  const starts = Array.from({ length: trials }, () => randomStart(itemsOf(txs), random))
  return permutations(txs.length).some((order) =>
    starts.every((start) => sameState(run(txs, ops, start).final, run(txs, serial(txs, order), start).final)),
  )
}

export interface Verdict {
  edges: Edge[]
  // Arrows on a cycle
  looped: Edge[]
  cycle: number[] | null
  // An equivalent serial order, when there is no cycle
  order: number[] | null
}

export function verdict(txs: readonly Transaction[], ops: readonly Op[]): Verdict {
  const edges = precedence(txs, ops)
  return {
    edges,
    looped: cycleEdges(txs.length, edges),
    cycle: findCycle(txs.length, edges),
    order: topologicalOrder(txs.length, edges),
  }
}

// Whether the op at `at` can trade places with its neighbour (`by` −1 for
// earlier, +1 for later): only with a step of another transaction, so each
// transaction keeps its own order
export function canMove(ops: readonly Op[], at: number, by: -1 | 1): boolean {
  const other = at + by
  return other >= 0 && other < ops.length && ops[other].tx !== ops[at].tx
}

export function move(ops: readonly Op[], at: number, by: -1 | 1): Op[] {
  if (!canMove(ops, at, by)) return [...ops]
  const next = [...ops]
  ;[next[at], next[at + by]] = [next[at + by], next[at]]
  return next
}

// A random interleaving, each one equally likely: the next step comes from a
// transaction in proportion to how many steps it has left
export function randomSchedule(txs: readonly Transaction[], random: () => number): Op[] {
  const left = txs.map((tx) => tx.steps.length)
  const ops: Op[] = []
  let total = left.reduce((a, b) => a + b, 0)
  while (total > 0) {
    let pick = Math.floor(random() * total)
    let tx = 0
    while (pick >= left[tx]) pick -= left[tx++]
    ops.push({ tx, step: txs[tx].steps.length - left[tx] })
    left[tx]--
    total--
  }
  return ops
}

// Every interleaving of the transactions
export function interleavings(txs: readonly Transaction[]): Op[][] {
  const all: Op[][] = []
  const next = txs.map(() => 0)
  const ops: Op[] = []
  const grow = () => {
    if (ops.length === txs.reduce((n, tx) => n + tx.steps.length, 0)) {
      all.push([...ops])
      return
    }
    txs.forEach((tx, t) => {
      if (next[t] < tx.steps.length) {
        ops.push({ tx: t, step: next[t]++ })
        grow()
        ops.pop()
        next[t]--
      }
    })
  }
  grow()
  return all
}

// Shorthand: "r1(A) w1(A) r2(A)" for a schedule, numbering transactions from 1
export function notation(txs: readonly Transaction[], ops: readonly Op[]): string {
  return ops.map((op) => `${stepOf(txs, op).kind}${op.tx + 1}(${stepOf(txs, op).item})`).join(' ')
}

// Build a schedule from that shorthand, for the page's examples
export function parse(text: string): Op[] {
  const next = new Map<number, number>()
  return text
    .trim()
    .split(/\s+/)
    .map((token) => {
      const m = /^[rw](\d)\(\w\)$/.exec(token)
      if (!m) throw new Error(`Bad step ${token}`)
      const tx = Number(m[1]) - 1
      const step = next.get(tx) ?? 0
      next.set(tx, step + 1)
      return { tx, step }
    })
}

// ---- The guess: two $50 deposits into a $100 account, read, read, write, write

export const GUESS = { balance: 100, deposit: 50 }
const deposit = (name: string): Transaction => ({
  name,
  does: `adds $${GUESS.deposit}`,
  steps: [read('A'), write('A', (s) => s.A + GUESS.deposit)],
})
export const DEPOSITS = [deposit('T1'), deposit('T2')]
export const GUESS_INTERLEAVED = run(DEPOSITS, parse('r1(A) r2(A) w1(A) w2(A)'), { A: GUESS.balance }).final.A
export const GUESS_SERIAL = run(DEPOSITS, serial(DEPOSITS, [0, 1]), { A: GUESS.balance }).final.A

// ---- The story: two cooks each add a teaspoon of salt to one recipe card

const teaspoon = (name: string, item: string): Transaction => ({
  name,
  does: 'adds a teaspoon',
  steps: [read(item), write(item, (s) => s[item] + 1)],
})
export const COOKS = [teaspoon('You', 'S'), teaspoon('Friend', 'S')]
// Your friend works on the pepper card instead
export const COOKS_APART = [teaspoon('You', 'S'), teaspoon('Friend', 'P')]
export const CARD_START: State = { S: 1, P: 1 }
export const TAKING_TURNS = serial(COOKS, [0, 1])
export const AT_ONCE = parse('r1(S) r2(S) w1(S) w2(S)')
export const AT_ONCE_APART = parse('r1(S) r2(P) w1(S) w2(P)')

// ---- The bank: the worked schedules and the lab

export const BANK_START: State = { A: 100, B: 100, C: 0 }
export const TRANSFER: Transaction = {
  name: 'T1',
  does: 'moves $50 from A to B',
  short: 'transfer',
  steps: [read('A'), write('A', (s) => s.A - 50), read('B'), write('B', (s) => s.B + 50)],
}
// Integer arithmetic, so 10% of 110 is exactly 11
export const INTEREST: Transaction = {
  name: 'T2',
  does: 'adds 10% to A and to B',
  short: 'interest',
  steps: [read('A'), write('A', (s) => (s.A * 11) / 10), read('B'), write('B', (s) => (s.B * 11) / 10)],
}
export const AUDIT: Transaction = {
  name: 'T3',
  does: 'writes the total A + B into C',
  short: 'audit',
  steps: [read('A'), read('B'), write('C', (s) => s.A + s.B)],
}
export const BANK = [TRANSFER, INTEREST]
export const BANK_AND_AUDIT = [TRANSFER, INTEREST, AUDIT]

export interface Preset {
  name: string
  txs: Transaction[]
  ops: Op[]
}

export const WORKED: Preset[] = [
  { name: 'Serial', txs: BANK, ops: serial(BANK, [0, 1]) },
  { name: 'Mixed', txs: BANK, ops: parse('r1(A) w1(A) r2(A) w2(A) r1(B) w1(B) r2(B) w2(B)') },
  { name: 'Crossed', txs: BANK, ops: parse('r1(A) w1(A) r2(A) w2(A) r2(B) w2(B) r1(B) w1(B)') },
]

// The audit slips in between the transfer and the interest, on both accounts
export const PRESETS: Preset[] = [
  ...WORKED,
  {
    name: 'Audit',
    txs: BANK_AND_AUDIT,
    ops: parse('r1(A) w1(A) r3(A) r2(A) w2(A) r1(B) w1(B) r3(B) w3(C) r2(B) w2(B)'),
  },
]
export const PRESET_NAMES = PRESETS.map((p) => p.name)

export const total = (state: Readonly<State>) => state.A + state.B

// Of every way to interleave the transfer and the interest, how many pass
// the graph test, and how many match some serial order on the bank's
// starting balances
const BANK_ALL = interleavings(BANK)
export const BANK_INTERLEAVINGS = BANK_ALL.length
export const BANK_PASSING = BANK_ALL.filter((ops) => topologicalOrder(2, precedence(BANK, ops)) !== null).length

// ---- The checks

// Quick check: each transaction reads one account and writes the other
export const QUICK = {
  txs: [
    { name: 'T1', does: 'copies A into B', steps: [read('A'), write('B', (s) => s.A)] },
    { name: 'T2', does: 'copies B into A', steps: [read('B'), write('A', (s) => s.B)] },
  ] as Transaction[],
  ops: parse('r1(A) r2(B) w1(B) w2(A)'),
}

// Check yourself: three transactions; the one that starts first goes last
export const CHECK = {
  txs: [
    { name: 'T1', does: '', steps: [read('A'), write('B', (s) => s.A + 1)] },
    { name: 'T2', does: '', steps: [write('A', () => 7)] },
    { name: 'T3', does: '', steps: [read('C'), read('B'), write('C', (s) => s.B + s.C)] },
  ] as Transaction[],
  ops: parse('r3(C) w2(A) r1(A) w1(B) r3(B) w3(C)'),
}
