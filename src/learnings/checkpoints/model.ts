import { seeded } from '../../components/explain/random'

// A database's log, the checkpoints written into it, and recovery after a
// crash: where the backward scan may stop, what the log may forget, and the
// database recovery leaves behind. The log is written one record a tick;
// the database's elements live in memory and, once output, on disk.

export type Scheme = 'undo' | 'undoRedo'
export const CHECKPOINTING = ['None', 'Quiescent', 'Nonquiescent'] as const
export type Checkpointing = (typeof CHECKPOINTING)[number]

// The recovery rule for a crash in the middle of a nonquiescent checkpoint.
// 'safe' is the one the page teaches; 'notes' is the course notes' rule for
// an undo/redo log (stop at the listed transactions' starts), which can miss
// work committed before the checkpoint
export type Rule = 'safe' | 'notes'

export type Rec =
  | { t: number; kind: 'start' | 'commit'; tx: number }
  // `old` and `val` are the element's value before and after the change
  | { t: number; kind: 'update'; tx: number; el: number; old: number; val: number }
  | { t: number; kind: 'ckpt' | 'endCkpt' }
  | { t: number; kind: 'startCkpt'; list: number[] }

// An element written from memory to disk. It is not in the log
export interface Output {
  t: number
  el: number
  val: number
}

export type Event = { rec: Rec } | { out: Output }

export interface History {
  // Everything that happened, in order: log records and outputs
  events: Event[]
  log: Rec[]
  initial: number[]
  // Stretches of ticks [from, to) when a quiescent checkpoint held new
  // transactions back
  frozen: { from: number; to: number }[]
  ticks: number
}

// ---------------------------------------------------------------------------
// Recovery

// Where each transaction's <START> is in the log
function starts(log: readonly Rec[]): Map<number, number> {
  const at = new Map<number, number>()
  log.forEach((r, i) => {
    if (r.kind === 'start') at.set(r.tx, i)
  })
  return at
}

// The first log record recovery reads, scanning back from the end of `log`.
// Everything before it is settled, as far as the checkpoints can promise.
export function stopPoint(log: readonly Rec[], scheme: Scheme, rule: Rule = 'safe'): number {
  const startAt = starts(log)
  const earliest = (list: number[], at: number) => Math.min(at, ...list.map((tx) => startAt.get(tx) ?? 0))
  let endSeen = false
  for (let i = log.length - 1; i >= 0; i--) {
    const r = log[i]
    // Quiescent: nothing was open and nothing dirty when it was written
    if (r.kind === 'ckpt') return i
    if (r.kind === 'endCkpt') endSeen = true
    if (r.kind === 'startCkpt') {
      // Complete. Undo: every listed transaction has finished. Undo/redo:
      // every page dirty at the start is on disk, but a listed transaction
      // may still need undoing, back to its <START>
      if (endSeen) return scheme === 'undo' ? i : earliest(r.list, i)
      // Unfinished. Undo: anything open began here or at a listed <START>
      if (scheme === 'undo' || rule === 'notes') return earliest(r.list, i)
      // Undo/redo: no promise about the pages was kept; look further back
      // for the last complete checkpoint
    }
  }
  return 0
}

// How many records at the front of `log` may be deleted: those before the
// stop point of the last complete checkpoint
export function truncatable(log: readonly Rec[], scheme: Scheme): number {
  for (let i = log.length - 1; i >= 0; i--) {
    const kind = log[i].kind
    if (kind === 'ckpt' || kind === 'endCkpt') return stopPoint(log.slice(0, i + 1), scheme)
  }
  return 0
}

// Recover the disk `disk` from the log records at `from` and after
export function recover(log: readonly Rec[], disk: readonly number[], scheme: Scheme, from: number): number[] {
  const state = [...disk]
  const range = log.slice(from)
  if (scheme === 'undo') {
    // Back to front: put back the old value of every change whose
    // transaction has not been seen to commit
    const done = new Set<number>()
    for (let i = range.length - 1; i >= 0; i--) {
      const r = range[i]
      if (r.kind === 'commit') done.add(r.tx)
      else if (r.kind === 'update' && !done.has(r.tx)) state[r.el] = r.old
    }
    return state
  }
  const committed = new Set<number>()
  const started = new Set<number>()
  for (const r of range) {
    if (r.kind === 'commit') committed.add(r.tx)
    if (r.kind === 'start') started.add(r.tx)
  }
  // Redo the committed, front to back; then undo the unfinished, back to front
  for (const r of range) if (r.kind === 'update' && committed.has(r.tx)) state[r.el] = r.val
  for (let i = range.length - 1; i >= 0; i--) {
    const r = range[i]
    if (r.kind === 'update' && started.has(r.tx) && !committed.has(r.tx)) state[r.el] = r.old
  }
  return state
}

// What the database should hold: every committed change and nothing else
export function committedState(log: readonly Rec[], initial: readonly number[]): number[] {
  const committed = new Set(log.flatMap((r) => (r.kind === 'commit' ? [r.tx] : [])))
  const state = [...initial]
  for (const r of log) if (r.kind === 'update' && committed.has(r.tx)) state[r.el] = r.val
  return state
}

// The log and the disk if the system crashes after the first `cut` events
export function crash(history: History, cut: number): { log: Rec[]; disk: number[] } {
  const log: Rec[] = []
  const disk = [...history.initial]
  for (const event of history.events.slice(0, cut)) {
    if ('rec' in event) log.push(event.rec)
    else disk[event.out.el] = event.out.val
  }
  return { log, disk }
}

// How many events happened before tick `tick`
export const cutBefore = (history: History, tick: number) => history.events.filter((e) => ('rec' in e ? e.rec.t : e.out.t) < tick).length

// ---------------------------------------------------------------------------
// A busy database, tick by tick

export interface Workload {
  seed: number
  ticks: number
  scheme: Scheme
  checkpointing: Checkpointing
  // Ticks from the start of one checkpoint to the start of the next
  every: number
  // One transaction that runs for most of the history
  long: boolean
}

export const ELEMENTS = 10
const MAX_ACTIVE = 4
const ARRIVE = 0.14
const STEAL = 0.15
// Ticks an undo/redo checkpoint takes to write out the pages dirty at its start
export const FLUSH_TICKS = 8
const LONG_AT = 12
const LONG_UPDATES = 12

interface Running {
  els: number[]
  plan: number[]
  next: number
  readyAt: number
  long: boolean
}

export function simulate(w: Workload): History {
  // Separate streams, so the same transactions arrive whatever the checkpoints do
  const arrivals = seeded(w.seed)
  const choose = seeded(w.seed * 7 + 1)
  const values = seeded(w.seed * 7 + 2)
  const steals = seeded(w.seed * 7 + 3)
  const pick = <T>(random: () => number, items: readonly T[]) => items[Math.floor(random() * items.length)]

  const initial = Array.from({ length: ELEMENTS }, () => 10 + Math.floor(values() * 90))
  const memory = [...initial]
  const dirty = new Set<number>()
  const locked = new Set<number>()
  const active = new Map<number, Running>()
  const events: Event[] = []
  const log: Rec[] = []
  const frozen: History['frozen'] = []
  const queue: boolean[] = []
  let nextTx = 1
  let lastCheckpoint = 0
  let drainFrom: number | null = null
  let fuzzy: { list: number[]; pages: Set<number>; at: number } | null = null

  const write = (rec: Rec) => {
    log.push(rec)
    events.push({ rec })
  }
  const output = (el: number, t: number) => {
    events.push({ out: { t, el, val: memory[el] } })
    dirty.delete(el)
    fuzzy?.pages.delete(el)
  }

  for (let t = 0; t < w.ticks; t++) {
    if (arrivals() < ARRIVE) queue.push(false)
    if (w.long && t === LONG_AT) queue.unshift(true)

    let busy = false
    if (w.checkpointing !== 'None' && drainFrom === null && fuzzy === null && t - lastCheckpoint >= w.every) {
      lastCheckpoint = t
      if (w.checkpointing === 'Quiescent') drainFrom = t
      else {
        const list = [...active.keys()]
        write({ t, kind: 'startCkpt', list })
        // Undo/redo waits for the pages dirty now; undo for the listed transactions
        fuzzy = { list, pages: new Set(w.scheme === 'undoRedo' ? dirty : []), at: t }
        busy = true
      }
    } else if (drainFrom !== null && active.size === 0) {
      for (const el of [...dirty]) output(el, t)
      write({ t, kind: 'ckpt' })
      frozen.push({ from: drainFrom, to: t })
      drainFrom = null
      busy = true
    } else if (fuzzy !== null) {
      const done =
        w.scheme === 'undo' ? fuzzy.list.every((tx) => !active.has(tx)) : t - fuzzy.at >= FLUSH_TICKS
      if (done) {
        for (const el of [...fuzzy.pages]) output(el, t)
        write({ t, kind: 'endCkpt' })
        fuzzy = null
        busy = true
      }
    }

    if (!busy) {
      const ready = [...active].filter(([, run]) => run.readyAt <= t).map(([tx]) => tx)
      const free = Array.from({ length: ELEMENTS }, (_, el) => el).filter((el) => !locked.has(el))
      // A short transaction locks up to three elements, the long one two
      const needs = queue.length === 0 ? Infinity : queue[0] ? 2 : 3
      const canStart = drainFrom === null && active.size < MAX_ACTIVE && free.length >= needs
      const candidates = [...ready, ...(canStart ? [0] : [])]
      if (candidates.length > 0) {
        const tx = pick(choose, candidates)
        if (tx === 0) {
          const long = queue.shift()!
          const size = long ? 2 : 1 + Math.floor(choose() * 3)
          const els: number[] = []
          while (els.length < size) {
            const el = pick(choose, free.filter((e) => !els.includes(e)))
            els.push(el)
            locked.add(el)
          }
          const plan = long ? Array.from({ length: LONG_UPDATES }, (_, k) => els[k % 2]) : els
          const id = nextTx++
          active.set(id, { els, plan, next: 0, long, readyAt: t + 1 + Math.floor(choose() * 3) })
          write({ t, kind: 'start', tx: id })
        } else {
          const run = active.get(tx)!
          if (run.next < run.plan.length) {
            const el = run.plan[run.next++]
            const old = memory[el]
            memory[el] = old + 1 + Math.floor(values() * 9)
            dirty.add(el)
            write({ t, kind: 'update', tx, el, old, val: memory[el] })
            run.readyAt = t + (run.long ? 5 + Math.floor(choose() * 5) : 1 + Math.floor(choose() * 3))
          } else {
            // Undo logging: everything the transaction wrote reaches disk before its commit
            if (w.scheme === 'undo') for (const el of run.els) if (dirty.has(el)) output(el, t)
            write({ t, kind: 'commit', tx })
            for (const el of run.els) locked.delete(el)
            active.delete(tx)
          }
        }
      }
    }

    // The buffer manager writes out a page whenever it likes
    if (dirty.size > 0 && steals() < STEAL) output(pick(steals, [...dirty]), t)
  }
  if (drainFrom !== null) frozen.push({ from: drainFrom, to: w.ticks })
  return { events, log, initial, frozen, ticks: w.ticks }
}

// Each transaction's row in a drawing: rows are reused once a transaction ends
export function lanes(log: readonly Rec[]): Map<number, number> {
  const end = new Map<number, number>()
  for (const r of log) if (r.kind === 'commit') end.set(r.tx, r.t)
  const freeAfter: number[] = []
  const lane = new Map<number, number>()
  for (const r of log) {
    if (r.kind !== 'start') continue
    let row = freeAfter.findIndex((t) => t < r.t)
    if (row === -1) row = freeAfter.length
    freeAfter[row] = end.get(r.tx) ?? Infinity
    lane.set(r.tx, row)
  }
  return lane
}

// ---------------------------------------------------------------------------
// The lab: a busy log of 200 ticks, a checkpoint due every 40

export const LAB = { seed: 11, ticks: 200, every: 40 }
export const SCHEMES = ['Undo', 'Undo/redo'] as const
export const WORK = ['Short', 'One long'] as const
export type SchemeName = (typeof SCHEMES)[number]
export type WorkName = (typeof WORK)[number]
export const schemeOf = (name: SchemeName): Scheme => (name === 'Undo' ? 'undo' : 'undoRedo')

const labKey = (c: Checkpointing, s: SchemeName, k: WorkName) => `${c}|${s}|${k}`
const LAB_RUNS = new Map(
  CHECKPOINTING.flatMap((c) =>
    SCHEMES.flatMap((s) =>
      WORK.map((k) => [
        labKey(c, s, k),
        simulate({ ...LAB, checkpointing: c, scheme: schemeOf(s), long: k === 'One long' }),
      ]),
    ),
  ),
)
export const labHistory = (c: Checkpointing, s: SchemeName, k: WorkName) => LAB_RUNS.get(labKey(c, s, k))!

export interface LabCrash {
  log: Rec[]
  // The first record recovery reads, and how many records may be deleted
  stop: number
  deletable: number
  // Ticks that new transactions were held back, up to the crash
  heldBack: number
  // Recovery from the stop point leaves the right database
  correct: boolean
}

export function labCrash(history: History, scheme: Scheme, tick: number): LabCrash {
  const { log, disk } = crash(history, cutBefore(history, tick))
  const stop = stopPoint(log, scheme)
  const heldBack = history.frozen.reduce((sum, f) => sum + Math.max(0, Math.min(f.to, tick) - f.from), 0)
  const correct = recover(log, disk, scheme, stop).every((v, el) => v === committedState(log, history.initial)[el])
  return { log, stop, deletable: truncatable(log, scheme), heldBack, correct }
}

// How long a quiescent checkpoint holds new work back over the whole lab,
// with the long transaction running
export const LONG_HELD = labCrash(labHistory('Quiescent', 'Undo', 'One long'), 'undo', LAB.ticks).heldBack

// ---------------------------------------------------------------------------
// The story: a café's notebook of orders A to F, written as a log. `sA`
// starts order A, `uA` is a step of it, `cA` serves it; `K` is a line drawn
// across (a quiescent checkpoint), `K(CD)` a note of the open orders and `E`
// its end. `|` marks where new orders start waiting, and writes nothing.

export const ORDER = (tx: number) => String.fromCharCode(64 + tx)

export interface Script {
  log: Rec[]
  frozen: { from: number; to: number }[]
}

export function script(text: string): Script {
  const log: Rec[] = []
  const frozen: Script['frozen'] = []
  let waitFrom: number | null = null
  const steps = new Map<number, number>()
  for (const token of text.split(/\s+/)) {
    const t = log.length
    const tx = token.charCodeAt(1) - 64
    if (token === '|') waitFrom = t
    else if (token === 'K') {
      log.push({ t, kind: 'ckpt' })
      if (waitFrom !== null) frozen.push({ from: waitFrom, to: t })
      waitFrom = null
    } else if (token === 'E') log.push({ t, kind: 'endCkpt' })
    else if (token.startsWith('K(')) log.push({ t, kind: 'startCkpt', list: [...token.slice(2, -1)].map((c) => c.charCodeAt(0) - 64) })
    else if (token[0] === 's') log.push({ t, kind: 'start', tx })
    else if (token[0] === 'c') log.push({ t, kind: 'commit', tx })
    else {
      const n = steps.get(tx) ?? 0
      steps.set(tx, n + 1)
      log.push({ t, kind: 'update', tx, el: tx, old: n, val: n + 1 })
    }
  }
  return { log, frozen }
}

const DAY = 'sA uA sB uA uB cA uB cB sC uC sD uC uD'
// No checkpoint at all
export const PLAIN = script(`${DAY} sE uD cC uE uD cD sF uE uF cE uF`)
// Stop new orders, finish C and D, draw the line; E waits until then
export const QUIET = script(`${DAY} | uD cC uD cD K sE uE sF uE uF cE uF`)
// Note the open orders and carry on; "end" once C and D are served
export const FUZZY = script(`${DAY} K(CD) sE uD cC uE uD cD E sF uE uF cE uF`)
// The power cut that comes before "end": after the 19th line
export const EARLY_CUT = 19
export const STORY_TICKS = Math.max(PLAIN.log.length, QUIET.log.length, FUZZY.log.length)

export interface Reading {
  // Lines written, the first line read back, lines read and lines that may go
  written: number
  stop: number
  read: number
  deletable: number
}

export function reading(log: readonly Rec[], cut = log.length): Reading {
  const prefix = log.slice(0, cut)
  const stop = stopPoint(prefix, 'undo')
  return { written: cut, stop, read: cut - stop, deletable: truncatable(prefix, 'undo') }
}

export const STORY = {
  plain: reading(PLAIN.log),
  quiet: reading(QUIET.log),
  fuzzy: reading(FUZZY.log),
  early: reading(FUZZY.log, EARLY_CUT),
  waited: QUIET.frozen.reduce((sum, f) => sum + f.to - f.from, 0),
}

// ---------------------------------------------------------------------------
// The arithmetic: reading time is the log written since the stop point over
// the disk's read speed (the 100 MB/s disk of the storage pages)

export const LOG_MB_PER_S = 5
export const READ_MB_PER_S = 100
export const readSeconds = (secondsOfLog: number) => (secondsOfLog * LOG_MB_PER_S) / READ_MB_PER_S

export const GUESS = { days: 30 }
export const WORKED = [
  { label: 'No checkpoint', note: `after ${GUESS.days} days`, seconds: readSeconds(GUESS.days * 86_400) },
  { label: 'Every hour', note: 'at most', seconds: readSeconds(3_600) },
  { label: 'Every 5 minutes', note: 'at most', seconds: readSeconds(300) },
]

export function duration(seconds: number): string {
  if (seconds >= 3_600) return `${Math.round(seconds / 3_600)} hours`
  if (seconds >= 60) return `${Math.round(seconds / 60)} minutes`
  return `${Math.round(seconds)} seconds`
}

// ---------------------------------------------------------------------------
// Check yourself: an undo/redo log that crashes inside its second checkpoint.
// T2 committed at record 8; its change to Y (record 6) came after the first
// checkpoint began, so nothing promises it reached the disk

export const CHECK_LOG: Rec[] = [
  { t: 0, kind: 'start', tx: 1 },
  { t: 1, kind: 'update', tx: 1, el: 0, old: 1, val: 2 },
  { t: 2, kind: 'commit', tx: 1 },
  { t: 3, kind: 'start', tx: 2 },
  { t: 4, kind: 'startCkpt', list: [2] },
  { t: 5, kind: 'update', tx: 2, el: 1, old: 3, val: 4 },
  { t: 6, kind: 'endCkpt' },
  { t: 7, kind: 'commit', tx: 2 },
  { t: 8, kind: 'start', tx: 3 },
  { t: 9, kind: 'update', tx: 3, el: 2, old: 5, val: 6 },
  { t: 10, kind: 'startCkpt', list: [3] },
  { t: 11, kind: 'update', tx: 3, el: 0, old: 2, val: 7 },
]
export const CHECK_NAMES = ['X', 'Y', 'Z']

// Log records as text, the way the page prints them
export function show(r: Rec, name: (tx: number) => string = (tx) => `T${tx}`, el = (e: number) => CHECK_NAMES[e]): string {
  switch (r.kind) {
    case 'start':
      return `<START ${name(r.tx)}>`
    case 'commit':
      return `<COMMIT ${name(r.tx)}>`
    case 'update':
      return `<${name(r.tx)}, ${el(r.el)}, ${r.old}, ${r.val}>`
    case 'ckpt':
      return '<CKPT>'
    case 'startCkpt':
      return `<START CKPT (${r.list.map(name).join(', ')})>`
    case 'endCkpt':
      return '<END CKPT>'
  }
}
