import { seeded } from '../../components/explain/random'

// A lock manager for a few transactions, and the checks the page makes on
// what it lets through. A transaction is a list of reads and writes, with a
// commit at the end. Before it touches an item it takes a lock on it: shared
// to read, exclusive if it will write the item at any point from here on (so
// it never has to upgrade). A rule decides when it may let a lock go:
//
//   Locks only  as soon as it has finished with the item
//   2PL         the same, but not before it has taken its last lock
//   Strict 2PL  as 2PL for shared locks; exclusive ones only at commit
//
// Every lock left is released at commit. Who moves when is a script of turns:
// on its turn a transaction tries its next step. If the lock it needs is held
// in a mode that clashes, it waits, and tries again on its next turn. A wait
// that closes a cycle of transactions each waiting for the next is a
// deadlock: the youngest in the cycle is rolled back and starts again.

export const RULES = ['Locks only', '2PL', 'Strict 2PL'] as const
export type Rule = (typeof RULES)[number]
export type Mode = 'S' | 'X'

export interface Op {
  kind: 'r' | 'w'
  item: string
  // For a write: the new value, from what this transaction last read of the
  // item (or the item's current value if it never read it)
  write?: (seen: number) => number
}

export interface Txn {
  name: string
  // What it does, in a few words, for the figure
  does: string
  ops: Op[]
}

export type Event =
  | { kind: 'lock'; t: number; item: string; mode: Mode }
  | { kind: 'wait'; t: number; item: string; mode: Mode }
  | { kind: 'op'; t: number; op: 'r' | 'w'; item: string; value: number; attempt: number; dirtyFrom: number | null }
  | { kind: 'unlock'; t: number; item: string; mode: Mode }
  | { kind: 'commit'; t: number }
  // `t` is the victim; the cycle lists who waits for whom, in order
  | { kind: 'deadlock'; t: number; cycle: number[] }
  | { kind: 'abort'; t: number; restored: { item: string; value: number }[] }

export interface Holder {
  t: number
  mode: Mode
}

// Everything a figure draws, just after an event
export interface State {
  values: Record<string, number>
  // Who holds a lock on each item, in the order they got it
  locks: Record<string, Holder[]>
  // What each transaction is waiting for, if anything
  waiting: ({ item: string; mode: Mode } | null)[]
  // Steps of its current attempt each transaction has finished
  done: number[]
  committed: boolean[]
  attempts: number[]
  // The deadlock found at this event, if one was
  cycle: number[] | null
}

export interface Run {
  txns: Txn[]
  rule: Rule
  start: State
  events: Event[]
  // states[k]: just after events[k]
  states: State[]
  // How many events there were after each turn
  turnEnds: number[]
  // A deadlock was found and left in place (resolve: false)
  stuck: boolean
}

const clone = (s: State): State => ({
  values: { ...s.values },
  locks: Object.fromEntries(Object.entries(s.locks).map(([k, v]) => [k, v.map((h) => ({ ...h }))])),
  waiting: s.waiting.map((w) => (w ? { ...w } : null)),
  done: [...s.done],
  committed: [...s.committed],
  attempts: [...s.attempts],
  cycle: null,
})

export const itemsOf = (txns: Txn[]) => [...new Set(txns.flatMap((t) => t.ops.map((o) => o.item)))].sort()

// Who `t` is waiting for: every other holder of its item in a clashing mode
export function waitsFor(state: State, t: number): number[] {
  const want = state.waiting[t]
  if (!want) return []
  return (state.locks[want.item] ?? []).filter((h) => h.t !== t && (want.mode === 'X' || h.mode === 'X')).map((h) => h.t)
}

// The waits-for graph's edges: from the one waiting to the one it waits for
export function waitsForEdges(state: State): [number, number][] {
  return state.waiting.flatMap((_, t) => waitsFor(state, t).map((h) => [t, h] as [number, number]))
}

// A cycle in a directed graph on nodes 0..n-1, or null
export function findCycle(n: number, edges: [number, number][]): number[] | null {
  const next = Array.from({ length: n }, () => [] as number[])
  for (const [a, b] of edges) next[a].push(b)
  const mark = Array.from({ length: n }, () => 0) // 0 new, 1 on the path, 2 done
  const path: number[] = []
  const visit = (v: number): number[] | null => {
    mark[v] = 1
    path.push(v)
    for (const w of next[v]) {
      if (mark[w] === 1) return path.slice(path.indexOf(w))
      if (mark[w] === 0) {
        const found = visit(w)
        if (found) return found
      }
    }
    path.pop()
    mark[v] = 2
    return null
  }
  for (let v = 0; v < n; v++) {
    if (mark[v] === 0) {
      const found = visit(v)
      if (found) return found
    }
  }
  return null
}

// Play `txns` under `rule`. `script` lists whose turn it is, in order; after
// it, turns go round the transactions that have not committed. With
// `resolve: false` the run stops at the first deadlock instead of breaking it.
export function simulate(
  txns: Txn[],
  rule: Rule,
  script: number[],
  { initial = {}, resolve = true }: { initial?: Record<string, number>; resolve?: boolean } = {},
): Run {
  const items = itemsOf(txns)
  const n = txns.length
  const state: State = {
    values: Object.fromEntries(items.map((i) => [i, initial[i] ?? 0])),
    locks: Object.fromEntries(items.map((i) => [i, []])),
    waiting: txns.map(() => null),
    done: txns.map(() => 0),
    committed: txns.map(() => false),
    attempts: txns.map(() => 1),
    cycle: null,
  }
  const start = clone(state)
  const events: Event[] = []
  const states: State[] = []
  const turnEnds: number[] = []
  // Per transaction, for its current attempt
  const seen: Record<string, number>[] = txns.map(() => ({}))
  const taken: Set<string>[] = txns.map(() => new Set())
  const undo: { item: string; value: number; writer: number | null }[][] = txns.map(() => [])
  // Who wrote each item's current value (null: nobody, or it is committed data)
  const writer: Record<string, number | null> = Object.fromEntries(items.map((i) => [i, null]))
  let stuck = false

  const emit = (event: Event, cycle: number[] | null = null) => {
    events.push(event)
    states.push({ ...clone(state), cycle })
  }
  const held = (t: number, item: string) => state.locks[item].find((h) => h.t === t)
  const remaining = (t: number) => txns[t].ops.slice(state.done[t])
  const lockPointPassed = (t: number) => txns[t].ops.every((o) => taken[t].has(o.item))
  const release = (t: number, item: string) => {
    const h = held(t, item)!
    state.locks[item] = state.locks[item].filter((x) => x.t !== t)
    emit({ kind: 'unlock', t, item, mode: h.mode })
  }
  // Let go of whatever the rule allows now
  const releaseAllowed = (t: number) => {
    if (rule !== 'Locks only' && !lockPointPassed(t)) return
    const still = new Set(remaining(t).map((o) => o.item))
    for (const item of items) {
      const h = held(t, item)
      if (!h || still.has(item)) continue
      if (rule === 'Strict 2PL' && h.mode === 'X') continue
      release(t, item)
    }
  }
  const releaseAll = (t: number) => {
    for (const item of items) if (held(t, item)) release(t, item)
  }

  const abort = (t: number) => {
    const restored: { item: string; value: number }[] = []
    for (const u of [...undo[t]].reverse()) {
      state.values[u.item] = u.value
      writer[u.item] = u.writer
      restored.push({ item: u.item, value: u.value })
    }
    state.waiting[t] = null
    state.done[t] = 0
    state.attempts[t] += 1
    seen[t] = {}
    taken[t] = new Set()
    undo[t] = []
    emit({ kind: 'abort', t, restored })
    releaseAll(t)
  }

  const turn = (t: number) => {
    if (state.committed[t]) return
    const ops = txns[t].ops
    if (state.done[t] === ops.length) {
      state.committed[t] = true
      emit({ kind: 'commit', t })
      releaseAll(t)
      return
    }
    const op = ops[state.done[t]]
    const mode: Mode = remaining(t).some((o) => o.item === op.item && o.kind === 'w') ? 'X' : 'S'
    const mine = held(t, op.item)
    if (!mine || (mine.mode === 'S' && mode === 'X')) {
      const clash = state.locks[op.item].some((h) => h.t !== t && (mode === 'X' || h.mode === 'X'))
      if (clash) {
        if (state.waiting[t]?.item === op.item) return // still waiting: nothing new
        state.waiting[t] = { item: op.item, mode }
        const cycle = findCycle(n, waitsForEdges(state))
        emit({ kind: 'wait', t, item: op.item, mode })
        if (cycle) {
          const victim = Math.max(...cycle)
          // Name the cycle from the victim round
          const at = cycle.indexOf(victim)
          const ordered = [...cycle.slice(at), ...cycle.slice(0, at)]
          emit({ kind: 'deadlock', t: victim, cycle: ordered }, ordered)
          if (!resolve) {
            stuck = true
            return
          }
          abort(victim)
        }
        return
      }
      state.waiting[t] = null
      if (mine) mine.mode = 'X'
      else state.locks[op.item].push({ t, mode })
      taken[t].add(op.item)
      emit({ kind: 'lock', t, item: op.item, mode })
      releaseAllowed(t)
    }
    let dirtyFrom: number | null = null
    if (op.kind === 'r') {
      seen[t][op.item] = state.values[op.item]
      const w = writer[op.item]
      if (w !== null && w !== t && !state.committed[w]) dirtyFrom = w
    } else {
      undo[t].push({ item: op.item, value: state.values[op.item], writer: writer[op.item] })
      const from = seen[t][op.item] ?? state.values[op.item]
      state.values[op.item] = op.write ? op.write(from) : from
      writer[op.item] = t
    }
    state.done[t] += 1
    emit({ kind: 'op', t, op: op.kind, item: op.item, value: state.values[op.item], attempt: state.attempts[t], dirtyFrom })
    releaseAllowed(t)
  }

  let last = -1
  const play = (t: number) => {
    turn(t)
    last = t
    turnEnds.push(events.length)
  }
  for (const t of script) {
    if (stuck) break
    play(t)
  }
  for (let guard = 0; !stuck && state.committed.some((c) => !c); guard++) {
    if (guard > 10000) throw new Error('The run never finished')
    let t = (last + 1) % n
    while (state.committed[t]) t = (t + 1) % n
    play(t)
  }
  return { txns, rule, start, events, states, turnEnds, stuck }
}

// ---- What came out: the schedule and its checks ----

export interface Action {
  t: number
  kind: 'r' | 'w'
  item: string
}

// The reads and writes of the attempts that committed, in order. A rolled
// back attempt left nothing behind, so it is not part of the schedule.
export function schedule(run: Run): Action[] {
  const final = run.states.length ? run.states[run.states.length - 1] : run.start
  return run.events.flatMap((e) =>
    e.kind === 'op' && final.committed[e.t] && e.attempt === final.attempts[e.t] ? [{ t: e.t, kind: e.op, item: e.item }] : [],
  )
}

const conflict = (a: Action, b: Action) => a.t !== b.t && a.item === b.item && (a.kind === 'w' || b.kind === 'w')

// The precedence graph (see the serializability page): an edge from Ti to Tj
// for each item where an action of Ti conflicts with a later one of Tj
export function precedence(actions: Action[]): { from: number; to: number; item: string }[] {
  const edges = new Map<string, { from: number; to: number; item: string }>()
  actions.forEach((a, i) =>
    actions.slice(i + 1).forEach((b) => {
      if (conflict(a, b)) edges.set(`${a.t}-${b.t}-${a.item}`, { from: a.t, to: b.t, item: a.item })
    }),
  )
  return [...edges.values()]
}

// A serial order equivalent to the schedule (a topological order of the
// precedence graph), or null when the graph has a cycle
export function serialOrder(actions: Action[], n: number): number[] | null {
  const edges = precedence(actions)
  const into = Array.from({ length: n }, () => 0)
  for (const e of edges) into[e.to]++
  const order: number[] = []
  const ready = [...Array(n).keys()].filter((t) => into[t] === 0)
  while (ready.length) {
    ready.sort((a, b) => a - b)
    const t = ready.shift()!
    order.push(t)
    for (const e of edges) if (e.from === t && --into[e.to] === 0) ready.push(e.to)
  }
  return order.length === n ? order : null
}

// The referee: try every serial order and keep the first whose order agrees
// with every pair of conflicting actions
export function bruteSerialOrder(actions: Action[], n: number): number[] | null {
  const orders = (left: number[]): number[][] =>
    left.length <= 1 ? [left] : left.flatMap((t, i) => orders([...left.slice(0, i), ...left.slice(i + 1)]).map((rest) => [t, ...rest]))
  for (const order of orders([...Array(n).keys()])) {
    const at = new Map(order.map((t, i) => [t, i]))
    const fits = actions.every((a, i) => actions.slice(i + 1).every((b) => !conflict(a, b) || at.get(a.t)! < at.get(b.t)!))
    if (fits) return order
  }
  return null
}

// The reads that saw a value written by a transaction that had not committed
export const dirtyReads = (run: Run) =>
  run.events.filter((e): e is Extract<Event, { kind: 'op' }> => e.kind === 'op' && e.dirtyFrom !== null)

export const deadlocks = (run: Run) => run.events.filter((e): e is Extract<Event, { kind: 'deadlock' }> => e.kind === 'deadlock')

// When each committed transaction took its last lock (its lock point), as an
// event index, and the transactions in that order
export function lockPoints(run: Run): number[] {
  const final = run.states[run.states.length - 1]
  return run.txns.map((_, t) => {
    // The lock point of the attempt that committed: its last lock before commit
    let point = -1
    run.events.forEach((e, k) => {
      if (e.kind === 'abort' && e.t === t) point = -1
      if (e.kind === 'lock' && e.t === t && final.committed[t]) point = k
    })
    return point
  })
}

export const lockPointOrder = (run: Run) => {
  const points = lockPoints(run)
  return [...run.txns.keys()].sort((a, b) => points[a] - points[b])
}

// The values left by running the transactions one at a time in `order`
export function serialValues(txns: Txn[], order: number[], initial: Record<string, number>): Record<string, number> {
  const values: Record<string, number> = Object.fromEntries(itemsOf(txns).map((i) => [i, initial[i] ?? 0]))
  for (const t of order) {
    const seen: Record<string, number> = {}
    for (const op of txns[t].ops) {
      if (op.kind === 'r') seen[op.item] = values[op.item]
      else {
        const from = seen[op.item] ?? values[op.item]
        values[op.item] = op.write ? op.write(from) : from
      }
    }
  }
  return values
}

export const finalValues = (run: Run) => (run.states.length ? run.states[run.states.length - 1] : run.start).values

// ---- The page's transactions ----

const r = (item: string): Op => ({ kind: 'r', item })
const w = (item: string, write: (v: number) => number): Op => ({ kind: 'w', item, write })

// GUW's pair: the database should keep A = B. One adds 100 to both, the
// other doubles both; either order keeps them equal.
export const START = { A: 25, B: 25 }
export const ADD: Txn = { name: 'T1', does: 'adds 100 to A and B', ops: [r('A'), w('A', (v) => v + 100), r('B'), w('B', (v) => v + 100)] }
export const DOUBLE: Txn = { name: 'T2', does: 'doubles A and B', ops: [r('A'), w('A', (v) => v * 2), r('B'), w('B', (v) => v * 2)] }
const DOUBLE_BA: Txn = { name: 'T2', does: 'doubles B, then A', ops: [r('B'), w('B', (v) => v * 2), r('A'), w('A', (v) => v * 2)] }
const AUDIT = (name: string): Txn => ({ name, does: 'reads A and B', ops: [r('A'), r('B')] })

export const SERIAL_ADD_FIRST = serialValues([ADD, DOUBLE], [0, 1], START)
export const SERIAL_DOUBLE_FIRST = serialValues([ADD, DOUBLE], [1, 0], START)

// The lab's timings: who moves when. Each is one script for every rule, so
// the rules can be compared on the same arrivals.
export const TIMINGS = ['Early', 'Late', 'Crossed', 'Readers'] as const
export type Timing = (typeof TIMINGS)[number]

export const TIMING: Record<Timing, { txns: Txn[]; script: number[]; says: string }> = {
  // T2 moves while T1 is between A and B
  Early: { txns: [ADD, DOUBLE], script: [0, 0, 1, 1, 1, 1, 1, 0, 0, 0], says: 'T2 starts while T1 is between A and B' },
  // T2 moves after T1 has its last lock, before T1 commits
  Late: { txns: [ADD, DOUBLE], script: [0, 0, 0, 1, 1, 0, 0, 1, 1, 1], says: 'T2 starts once T1 has moved on to B' },
  // The two take the items in opposite orders
  Crossed: { txns: [ADD, DOUBLE_BA], script: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1], says: 'T2 works on B first, then A' },
  // Two readers and a writer
  Readers: { txns: [ADD, AUDIT('T2'), AUDIT('T3')], script: [1, 2, 0, 1, 2, 0, 1, 2, 0], says: 'T2 and T3 only read' },
}

export const labRun = (timing: Timing, rule: Rule) => LAB[timing][rule]
const LAB = Object.fromEntries(
  TIMINGS.map((timing) => [
    timing,
    Object.fromEntries(RULES.map((rule) => [rule, simulate(TIMING[timing].txns, rule, TIMING[timing].script, { initial: START })])),
  ]),
) as Record<Timing, Record<Rule, Run>>

// What a finished run comes to, for the lab's readouts
export function verdict(run: Run) {
  const actions = schedule(run)
  const order = serialOrder(actions, run.txns.length)
  const edges = precedence(actions)
  // A pair of edges that point opposite ways, to name the cycle
  const clash = order ? null : (edges.find((e) => edges.some((f) => f.from === e.to && f.to === e.from)) ?? null)
  const back = clash ? edges.find((f) => f.from === clash.to && f.to === clash.from)! : null
  return {
    order,
    clash: clash && back ? { first: clash, second: back } : null,
    dirty: dirtyReads(run).length,
    deadlocks: deadlocks(run).length,
    values: finalValues(run),
  }
}

// How often a random timing goes wrong under each rule: T1 and T2 from the
// lab, a fresh random script of turns each time
export const RANDOM_RUNS = 1000
const RANDOM_TURNS = 12
export function randomTimings(rule: Rule, runs = RANDOM_RUNS, seed = 530) {
  const random = seeded(seed)
  let notSerializable = 0
  let dirty = 0
  let unequal = 0
  for (let k = 0; k < runs; k++) {
    const script = Array.from({ length: RANDOM_TURNS }, () => (random() < 0.5 ? 0 : 1))
    const run = simulate([ADD, DOUBLE], rule, script, { initial: START })
    if (!serialOrder(schedule(run), 2)) notSerializable++
    if (dirtyReads(run).length) dirty++
    const v = finalValues(run)
    if (v.A !== v.B) unequal++
  }
  return { notSerializable, dirty, unequal, runs }
}
export const RANDOM = Object.fromEntries(RULES.map((rule) => [rule, randomTimings(rule)])) as Record<
  Rule,
  ReturnType<typeof randomTimings>
>

export const percent = (part: number, whole: number) => `${Math.round((100 * part) / whole)}%`

// ---- Locks held over time by one transaction alone, under each rule ----

// It reads and writes three items in turn
export const LONE: Txn = {
  name: 'T',
  does: 'updates A, B and C',
  ops: ['A', 'B', 'C'].flatMap((i) => [r(i), w(i, (v) => v + 1)]),
}

export interface CountStep {
  // Locks held after this event
  count: number
  kind: Event['kind']
  label: string
}

const sub = (e: Event) =>
  e.kind === 'lock'
    ? `${e.mode === 'X' ? 'xl' : 'sl'}(${e.item})`
    : e.kind === 'unlock'
      ? `u(${e.item})`
      : e.kind === 'op'
        ? `${e.op}(${e.item})`
        : e.kind === 'commit'
          ? 'c'
          : e.kind

export function lockCounts(rule: Rule): { steps: CountStep[]; lockPoint: number; firstUnlock: number } {
  const run = simulate([LONE], rule, [])
  const steps = run.events.map((e, k) => ({
    count: Object.values(run.states[k].locks).filter((hs) => hs.length > 0).length,
    kind: e.kind,
    label: sub(e),
  }))
  return {
    steps,
    lockPoint: lockPoints(run)[0],
    firstUnlock: run.events.findIndex((e) => e.kind === 'unlock'),
  }
}
export const COUNTS = Object.fromEntries(RULES.map((rule) => [rule, lockCounts(rule)])) as Record<Rule, ReturnType<typeof lockCounts>>

// ---- The story: two people, two rooms, one key each ----

// You (0) and Sam (1) each paint both rooms: A the kitchen, B the bathroom.
// A room's value says who painted it last: 0 nobody, 1 you, 2 Sam.
const paint = (who: number) => () => who
const YOU: Txn = { name: 'You', does: 'paints both rooms', ops: [w('A', paint(1)), w('B', paint(1))] }
const SAM: Txn = { name: 'Sam', does: 'paints both rooms', ops: [w('A', paint(2)), w('B', paint(2))] }
const SAM_BA: Txn = { name: 'Sam', does: 'paints both rooms, bathroom first', ops: [w('B', paint(2)), w('A', paint(2))] }

// You do the kitchen; Sam does both rooms; you do the bathroom
const STORY_SCRIPT = [0, 1, 1, 1, 0, 0]
export const STORY_LOOSE = simulate([YOU, SAM], 'Locks only', STORY_SCRIPT)
export const STORY_2PL = simulate([YOU, SAM], '2PL', STORY_SCRIPT)
export const STORY_STUCK = simulate([YOU, SAM_BA], '2PL', [0, 1, 0, 1], { resolve: false })

// ---- In words, for the lab ----

const DIGITS = '₀₁₂₃₄₅₆₇₈₉'
const subscript = (n: number) => [...String(n)].map((d) => DIGITS[Number(d)]).join('')
// r₁(A): the usual way to write T1 reading A
export const notation = (t: number, kind: 'r' | 'w', item: string) => `${kind}${subscript(t + 1)}(${item})`

const lockName = (mode: Mode) => (mode === 'X' ? 'an exclusive' : 'a shared')
const list = (names: string[]) => (names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`)

// What event `k` of `run` did, in a sentence
export function describe(run: Run, k: number): string {
  const e = run.events[k]
  const name = (t: number) => run.txns[t].name
  const who = name(e.t)
  switch (e.kind) {
    case 'lock':
      return `${who} gets ${lockName(e.mode)} lock on ${e.item}.`
    case 'wait': {
      const holders = run.states[k].locks[e.item].filter((h) => h.t !== e.t).map((h) => name(h.t))
      return `${who} asks for ${lockName(e.mode)} lock on ${e.item}, but ${list(holders)} ${holders.length > 1 ? 'hold' : 'holds'} one that clashes, so ${who} waits.`
    }
    case 'op':
      if (e.op === 'w') return `${who} writes ${e.item} = ${e.value}.`
      return e.dirtyFrom === null
        ? `${who} reads ${e.item} = ${e.value}.`
        : `${who} reads ${e.item} = ${e.value}, written by ${name(e.dirtyFrom)}, which has not committed: a dirty read.`
    case 'unlock':
      return `${who} releases its lock on ${e.item}.`
    case 'commit':
      return `${who} commits.`
    case 'deadlock':
      return `Deadlock: ${[...e.cycle, e.cycle[0]].map(name).join(' waits for ')}. The lock manager picks ${who} to roll back.`
    case 'abort': {
      const back = new Map(e.restored.map((r) => [r.item, r.value]))
      const undone = [...back].map(([item, value]) => `${item} goes back to ${value}`)
      return `${who} is rolled back${undone.length ? ` (${list(undone)})` : ''} and starts again.`
    }
  }
}

// The finished run's verdict, in a sentence
export function verdictSays(run: Run): string {
  const v = verdict(run)
  const name = (t: number) => run.txns[t].name
  if (v.order) return `Conflict-serializable: the same as running ${v.order.map(name).join(', then ')}.`
  if (!v.clash) return 'Not serializable: its conflicts go round in a cycle.'
  const { first, second } = v.clash
  return `Not serializable: ${name(first.from)} gets to ${first.item} before ${name(first.to)}, but ${name(second.from)} gets to ${second.item} before ${name(second.to)}.`
}
