// A tiny database: a few elements (account balances), each with a value on
// disk and a value in the buffer pool in memory, and a log that is built in
// memory (its tail) and written to disk by FLUSH LOG. Transactions change
// values in memory; OUTPUT copies one element to disk. A crash wipes memory,
// tail included, and recovery has only the disk and the log on disk to work
// from. Everything the page states comes from here.

export const SCHEMES = ['Undo', 'Redo', 'Undo/redo'] as const
export type Scheme = (typeof SCHEMES)[number]
// The story starts with no log at all
export type Logging = Scheme | 'None'

export type Event =
  | { kind: 'start'; t: string }
  | { kind: 'write'; t: string; x: string; value: number }
  | { kind: 'flush' }
  | { kind: 'output'; x: string }
  | { kind: 'commit'; t: string }

// An update record keeps the old value (undo), the new one (redo) or both
export type LogRecord =
  | { kind: 'start'; t: string }
  | { kind: 'update'; t: string; x: string; old?: number; new?: number }
  | { kind: 'commit'; t: string }
  | { kind: 'abort'; t: string }

export type Values = Readonly<Record<string, number>>

export interface Snapshot {
  memory: Values
  disk: Values
  // Log records still only in memory, and those on disk
  tail: readonly LogRecord[]
  log: readonly LogRecord[]
  // For each element, the transactions whose writes to it are in memory but
  // not yet on disk
  dirty: Readonly<Record<string, readonly string[]>>
}

export const begin = (initial: Values): Snapshot => ({
  memory: { ...initial },
  disk: { ...initial },
  tail: [],
  log: [],
  dirty: Object.fromEntries(Object.keys(initial).map((x) => [x, []])),
})

export function apply(s: Snapshot, e: Event, logging: Logging): Snapshot {
  switch (e.kind) {
    case 'start':
    case 'commit':
      return logging === 'None' ? s : { ...s, tail: [...s.tail, { kind: e.kind, t: e.t }] }
    case 'write': {
      const old = s.memory[e.x]
      const record: LogRecord =
        logging === 'Undo'
          ? { kind: 'update', t: e.t, x: e.x, old }
          : logging === 'Redo'
            ? { kind: 'update', t: e.t, x: e.x, new: e.value }
            : { kind: 'update', t: e.t, x: e.x, old, new: e.value }
      const was = s.dirty[e.x] ?? []
      return {
        ...s,
        memory: { ...s.memory, [e.x]: e.value },
        tail: logging === 'None' ? s.tail : [...s.tail, record],
        dirty: { ...s.dirty, [e.x]: was.includes(e.t) ? was : [...was, e.t] },
      }
    }
    case 'flush':
      return { ...s, log: [...s.log, ...s.tail], tail: [] }
    case 'output':
      return { ...s, disk: { ...s.disk, [e.x]: s.memory[e.x] }, dirty: { ...s.dirty, [e.x]: [] } }
  }
}

// The state after each prefix of `events`: entry k is after the first k
export function replay(events: readonly Event[], logging: Logging, initial: Values): Snapshot[] {
  const out = [begin(initial)]
  for (const e of events) out.push(apply(out[out.length - 1], e, logging))
  return out
}

// ---------------------------------------------------------------- recovery

export type RecoveryStep =
  | { kind: 'sort'; committed: string[]; unfinished: string[]; disk: Values }
  | { kind: 'set' | 'skip'; pass: 'undo' | 'redo'; at: number; record: LogRecord & { kind: 'update' }; disk: Values }
  | { kind: 'abort'; t: string; disk: Values }

export interface Recovery {
  steps: RecoveryStep[]
  disk: Values
  log: LogRecord[]
}

// The transactions that appear in a log, in order of first appearance
const transactionsIn = (log: readonly LogRecord[]) => [...new Set(log.map((r) => r.t))]

export const committedIn = (log: readonly LogRecord[]) =>
  new Set(log.filter((r) => r.kind === 'commit').map((r) => r.t))

// Recovery from what survived a crash. Transactions with a COMMIT on disk are
// committed; those with neither COMMIT nor ABORT are unfinished. Undo logging
// puts back old values of the unfinished, newest record first; redo logging
// writes the new values of the committed, oldest first; undo/redo does the
// redo pass and then the undo pass. Each unfinished transaction then gets an
// ABORT record, so running recovery again changes nothing.
export function recover(diskAtCrash: Values, logAtCrash: readonly LogRecord[], scheme: Scheme): Recovery {
  const committed = committedIn(logAtCrash)
  const aborted = new Set(logAtCrash.filter((r) => r.kind === 'abort').map((r) => r.t))
  const unfinished = transactionsIn(logAtCrash).filter((t) => !committed.has(t) && !aborted.has(t))
  let disk: Values = { ...diskAtCrash }
  const steps: RecoveryStep[] = [{ kind: 'sort', committed: [...committed], unfinished, disk }]
  const updates = logAtCrash.flatMap((r, at) => (r.kind === 'update' ? [{ r, at }] : []))

  if (scheme !== 'Undo')
    for (const { r, at } of updates) {
      const set = committed.has(r.t) && r.new !== undefined
      if (set) disk = { ...disk, [r.x]: r.new! }
      steps.push({ kind: set ? 'set' : 'skip', pass: 'redo', at, record: r, disk })
    }
  if (scheme !== 'Redo')
    for (const { r, at } of [...updates].reverse()) {
      const set = unfinished.includes(r.t) && r.old !== undefined
      if (set) disk = { ...disk, [r.x]: r.old! }
      steps.push({ kind: set ? 'set' : 'skip', pass: 'undo', at, record: r, disk })
    }
  for (const t of unfinished) steps.push({ kind: 'abort', t, disk })
  return { steps, disk, log: [...logAtCrash, ...unfinished.map((t): LogRecord => ({ kind: 'abort', t }))] }
}

// What the disk should hold after recovering from a crash once the first
// `upTo` events had happened: every committed transaction's changes, none of
// the others'. A transaction has committed when its COMMIT is on disk.
export function rightAnswer(events: readonly Event[], upTo: number, initial: Values, committed: ReadonlySet<string>): Values {
  const out: Record<string, number> = { ...initial }
  for (const e of events.slice(0, upTo)) if (e.kind === 'write' && committed.has(e.t)) out[e.x] = e.value
  return out
}

export interface Crash {
  at: Snapshot
  committed: Set<string>
  recovery: Recovery
  right: Values
  // The elements recovery left wrong
  wrong: string[]
}

export function crashAfter(events: readonly Event[], upTo: number, scheme: Scheme, initial: Values): Crash {
  const at = replay(events.slice(0, upTo), scheme, initial)[upTo]
  const committed = committedIn(at.log)
  const recovery = recover(at.disk, at.log, scheme)
  const right = rightAnswer(events, upTo, initial, committed)
  const wrong = Object.keys(initial).filter((x) => recovery.disk[x] !== right[x])
  return { at, committed, recovery, right, wrong }
}

// How many of the crash points (after 0, 1, ... n events) recovery gets right
export function rightCrashes(events: readonly Event[], scheme: Scheme, initial: Values): number {
  let n = 0
  for (let k = 0; k <= events.length; k++) if (crashAfter(events, k, scheme, initial).wrong.length === 0) n++
  return n
}

// ---------------------------------------------------------------- the rules

export type Rule = 'U1' | 'U2' | 'R1' | 'UR1'

export interface Broken {
  rule: Rule
  // The event that breaks it
  at: number
  x?: string
  t?: string
}

// The first event in `events` that breaks a rule of `scheme`, or null.
// U1, UR1: an element reaches the disk while a record of its change is only
// in memory. U2: FLUSH LOG puts a COMMIT on disk while one of that
// transaction's changes is only in memory. R1: an element reaches the disk
// before the COMMIT of every transaction that changed it.
export function broken(events: readonly Event[], scheme: Scheme, initial: Values): Broken | null {
  let s = begin(initial)
  for (let at = 0; at < events.length; at++) {
    const e = events[at]
    if (e.kind === 'output' && s.dirty[e.x].length > 0) {
      if (scheme === 'Redo') {
        const done = committedIn(s.log)
        const t = s.dirty[e.x].find((t) => !done.has(t))
        if (t) return { rule: 'R1', at, x: e.x, t }
      } else if (s.tail.some((r) => r.kind === 'update' && r.x === e.x)) {
        return { rule: scheme === 'Undo' ? 'U1' : 'UR1', at, x: e.x }
      }
    }
    if (e.kind === 'flush' && scheme === 'Undo')
      for (const r of s.tail)
        if (r.kind === 'commit') {
          const x = Object.keys(s.dirty).find((x) => s.dirty[x].includes(r.t))
          if (x) return { rule: 'U2', at, x, t: r.t }
        }
    s = apply(s, e, scheme)
  }
  return null
}

// ---------------------------------------------------------------- random schedules

// A random run of a few transactions, each writing one to three elements, in
// a random interleaving with random flushes and outputs. With a scheme, every
// flush, output and commit keeps to that scheme's rules; with null, anything
// goes. Like real locking, an element written by one transaction is not
// written by another until the first commits, and each transaction takes its
// elements in order, so none waits for another forever. Every value written
// is new, so a change in the wrong place always shows.
export function randomSchedule(
  random: () => number,
  scheme: Scheme | null,
  { transactions = 3, elements = ['A', 'B', 'C', 'D'] } = {},
): { events: Event[]; initial: Values } {
  const initial = Object.fromEntries(elements.map((x, i) => [x, 100 * (i + 1)]))
  let value = 1000
  const pick = <T>(items: readonly T[]) => items[Math.floor(random() * items.length)]
  const scripts: Event[][] = Array.from({ length: transactions }, (_, i) => {
    const t = `T${i + 1}`
    const xs = Array.from({ length: 1 + Math.floor(random() * 3) }, () => pick(elements)).sort()
    return [{ kind: 'start', t }, ...xs.map((x): Event => ({ kind: 'write', t, x, value: value++ })), { kind: 'commit', t }]
  })
  const next = scripts.map(() => 0)
  const holder: Record<string, string | undefined> = {}
  let s = begin(initial)
  const events: Event[] = []

  for (;;) {
    const enabled: { event: Event; script?: number }[] = []
    scripts.forEach((script, i) => {
      const e = script[next[i]]
      if (!e) return
      if (e.kind === 'write' && holder[e.x] !== undefined && holder[e.x] !== e.t) return
      if (e.kind === 'commit' && scheme === 'Undo' && elements.some((x) => s.dirty[x].includes(e.t))) return
      enabled.push({ event: e, script: i })
    })
    if (s.tail.length > 0) enabled.push({ event: { kind: 'flush' } })
    const done = committedIn(s.log)
    for (const x of elements) {
      if (s.dirty[x].length === 0) continue
      const unlogged = s.tail.some((r) => r.kind === 'update' && r.x === x)
      const ok =
        scheme === null ||
        (scheme === 'Redo' ? s.dirty[x].every((t) => done.has(t)) : !unlogged)
      if (ok) enabled.push({ event: { kind: 'output', x } })
    }
    const finished = next.every((k, i) => k >= scripts[i].length)
    if (enabled.length === 0 || (finished && random() < 0.3)) break

    const { event, script } = pick(enabled)
    if (script !== undefined) next[script]++
    if (event.kind === 'write') holder[event.x] = event.t
    if (event.kind === 'commit') for (const x of elements) if (holder[x] === event.t) holder[x] = undefined
    s = apply(s, event, scheme ?? 'Undo/redo')
    events.push(event)
  }
  return { events, initial }
}

// ---------------------------------------------------------------- the page's numbers

// The transfer: $100 from A to B
export const INITIAL: Values = { A: 500, B: 200, C: 800 }
export const TRANSFER = { amount: 100, A: 400, B: 300 }
export const total = (v: Values, xs: readonly string[] = ['A', 'B']) => xs.reduce((sum, x) => sum + v[x], 0)

const start = (t: string): Event => ({ kind: 'start', t })
const write = (t: string, x: string, value: number): Event => ({ kind: 'write', t, x, value })
const flush: Event = { kind: 'flush' }
const output = (x: string): Event => ({ kind: 'output', x })
const commit = (t: string): Event => ({ kind: 'commit', t })

// The story: one transfer, two lines of a ledger
export const STORY_INITIAL: Values = { A: INITIAL.A, B: INITIAL.B }
export const STORY_T = 'T1'
const wA = write(STORY_T, 'A', TRANSFER.A)
const wB = write(STORY_T, 'B', TRANSFER.B)

// A frame of the story's figure: the state, what just happened, and
// whether memory is gone
export interface Frame {
  snap: Snapshot
  event?: Event
  step?: RecoveryStep
  crashed: boolean
  // For a crash with no log, nothing to say the disk is half done
  logging: Logging
}

// The frames of a scripted run. In the story every note goes straight into
// the notebook, so each write and commit is followed by a flush, and the
// flushes are not shown as frames of their own.
function played(events: Event[], logging: Logging, from: Snapshot): Frame[] {
  const frames: Frame[] = []
  let s = from
  for (const e of events) {
    s = apply(s, e, logging)
    if (logging !== 'None' && (e.kind === 'write' || e.kind === 'commit')) s = apply(s, flush, logging)
    frames.push({ snap: s, event: e, crashed: false, logging })
  }
  return frames
}

const lost = (f: Frame): Frame => ({ ...f, event: undefined, crashed: true })

function recovered(f: Frame, scheme: Scheme): Frame[] {
  const r = recover(f.snap.disk, f.snap.log, scheme)
  return r.steps
    .filter((step) => step.kind === 'set')
    .map((step) => ({ ...f, event: undefined, step, snap: { ...f.snap, disk: step.disk } }))
}

const nolog = played([wA, wB, output('A')], 'None', begin(STORY_INITIAL))
const undoRun = played([wA, wB, output('A')], 'Undo', begin(STORY_INITIAL))
const undoCrash = lost(undoRun[undoRun.length - 1])
const redoRun = played([wA, wB, commit(STORY_T), output('A')], 'Redo', begin(STORY_INITIAL))
const redoCrash = lost(redoRun[redoRun.length - 1])
const redoBack = recovered(redoCrash, 'Redo')

// Each story step plays its frames; the first is where it starts from
export const STORY: Frame[][] = [
  [{ snap: begin(STORY_INITIAL), crashed: false, logging: 'None' }, ...nolog.slice(0, 2)],
  [nolog[1], nolog[2]],
  [nolog[2], lost(nolog[2])],
  [{ snap: begin(STORY_INITIAL), crashed: false, logging: 'Undo' }, ...undoRun, undoCrash],
  [undoCrash, ...recovered(undoCrash, 'Undo')],
  [{ snap: begin(STORY_INITIAL), crashed: false, logging: 'Redo' }, ...redoRun, redoCrash, ...redoBack],
  [redoBack[redoBack.length - 1]],
]

// The numbers the story tells
export const STORY_NUMBERS = {
  before: total(STORY_INITIAL),
  halfDone: total(lost(nolog[2]).snap.disk),
  undone: STORY[4][STORY[4].length - 1].snap.disk,
  redone: STORY[5][STORY[5].length - 1].snap.disk,
}

// The lab: T1 makes the transfer, T2 adds $50 of interest to C. For each
// scheme, an order that keeps its rules and orders that break one.
export const T2_VALUE = 850

export interface Order {
  name: string
  events: Event[]
}

const T1 = 'T1'
const T2 = 'T2'
const tA = write(T1, 'A', TRANSFER.A)
const tB = write(T1, 'B', TRANSFER.B)
const tC = write(T2, 'C', T2_VALUE)

export const LAB: Record<Scheme, Order[]> = {
  Undo: [
    {
      name: 'By the rules',
      events: [start(T1), tA, tB, start(T2), tC, flush, output('A'), output('B'), commit(T1), flush, output('C'), commit(T2), flush],
    },
    {
      name: 'Breaks U1',
      events: [start(T1), tA, output('A'), tB, start(T2), tC, flush, output('B'), commit(T1), flush, output('C'), commit(T2), flush],
    },
    {
      name: 'Breaks U2',
      events: [start(T1), tA, tB, flush, output('A'), commit(T1), flush, start(T2), tC, flush, output('B'), output('C'), commit(T2), flush],
    },
  ],
  Redo: [
    {
      name: 'By the rules',
      events: [start(T1), tA, tB, start(T2), tC, commit(T1), flush, output('A'), commit(T2), flush, output('C'), output('B')],
    },
    {
      name: 'Breaks R1',
      events: [start(T1), tA, tB, flush, output('A'), start(T2), tC, commit(T1), flush, commit(T2), flush, output('C'), output('B')],
    },
  ],
  'Undo/redo': [
    {
      name: 'By the rules',
      events: [start(T1), tA, tB, start(T2), tC, flush, output('A'), output('C'), commit(T1), flush, output('B'), commit(T2), flush],
    },
    {
      name: 'Breaks UR1',
      events: [start(T1), tA, output('A'), tB, start(T2), tC, flush, output('C'), commit(T1), flush, output('B'), commit(T2), flush],
    },
  ],
}

// Where the lab opens: undo logging by the rules, crashed after A reached
// the disk but before B did
export const LAB_START = { scheme: 'Undo' as Scheme, crash: 7 }

// Check yourself: an undo/redo log on disk, and the disk, at a crash
export const QUIZ_INITIAL: Values = { stock: 12, price: 30 }
export const QUIZ_LOG: LogRecord[] = [
  { kind: 'start', t: 'T' },
  { kind: 'update', t: 'T', x: 'stock', old: 12, new: 11 },
  { kind: 'start', t: 'U' },
  { kind: 'update', t: 'U', x: 'price', old: 30, new: 35 },
  { kind: 'commit', t: 'T' },
]
export const QUIZ_DISK: Values = { stock: 12, price: 35 }
export const QUIZ_AFTER = recover(QUIZ_DISK, QUIZ_LOG, 'Undo/redo').disk

// ---------------------------------------------------------------- words

export const money = (n: number) => `$${n}`

export function recordText(r: LogRecord): string {
  switch (r.kind) {
    case 'start':
      return `<START ${r.t}>`
    case 'commit':
      return `<COMMIT ${r.t}>`
    case 'abort':
      return `<ABORT ${r.t}>`
    case 'update':
      return `<${[r.t, r.x, r.old, r.new].filter((v) => v !== undefined).join(', ')}>`
  }
}

export function eventText(e: Event): string {
  switch (e.kind) {
    case 'start':
      return `${e.t} starts`
    case 'write':
      return `${e.t}: WRITE(${e.x}, ${e.value})`
    case 'flush':
      return 'FLUSH LOG'
    case 'output':
      return `OUTPUT(${e.x})`
    case 'commit':
      return `${e.t} commits`
  }
}
