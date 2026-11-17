import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  bruteSerialOrder,
  COUNTS,
  dirtyReads,
  finalValues,
  findCycle,
  labRun,
  lockPointOrder,
  lockPoints,
  precedence,
  RANDOM,
  RANDOM_RUNS,
  RULES,
  schedule,
  serialOrder,
  SERIAL_ADD_FIRST,
  SERIAL_DOUBLE_FIRST,
  serialValues,
  simulate,
  STORY_2PL,
  STORY_LOOSE,
  STORY_STUCK,
  TIMING,
  TIMINGS,
  verdict,
  type Action,
  type Op,
  type Rule,
  type Run,
  type Txn,
} from './model'

// A random workload: two to four transactions over items A to D, each a few
// reads and writes whose new value is a small linear function of the old
const ITEMS = ['A', 'B', 'C', 'D']
function randomWorkload(random: () => number): { txns: Txn[]; script: number[] } {
  const n = 2 + Math.floor(random() * 3)
  const txns = Array.from({ length: n }, (_, t): Txn => {
    const count = 1 + Math.floor(random() * 4)
    const ops = Array.from({ length: count }, (): Op => {
      const item = ITEMS[Math.floor(random() * ITEMS.length)]
      if (random() < 0.5) return { kind: 'r', item }
      const a = 1 + Math.floor(random() * 3)
      const b = Math.floor(random() * 10)
      return { kind: 'w', item, write: (v) => a * v + b }
    })
    return { name: `T${t + 1}`, does: '', ops }
  })
  const script = Array.from({ length: Math.floor(random() * 30) }, () => Math.floor(random() * n))
  return { txns, script }
}
const INITIAL = { A: 1, B: 2, C: 3, D: 4 }

function runs(rule: Rule, count: number, seed: number): Run[] {
  const random = seeded(seed)
  return Array.from({ length: count }, () => {
    const { txns, script } = randomWorkload(random)
    return simulate(txns, rule, script, { initial: INITIAL })
  })
}

// No state ever has two transactions holding clashing locks on one item
function legal(run: Run) {
  return run.states.every((s) =>
    Object.values(s.locks).every((hs) => hs.filter((h) => h.mode === 'X').length === 0 || hs.length === 1),
  )
}

describe('the precedence-graph check', () => {
  it('finds the cycle in the textbook bad schedule', () => {
    const s: Action[] = [
      { t: 0, kind: 'r', item: 'A' },
      { t: 0, kind: 'w', item: 'A' },
      { t: 1, kind: 'r', item: 'A' },
      { t: 1, kind: 'w', item: 'A' },
      { t: 1, kind: 'r', item: 'B' },
      { t: 1, kind: 'w', item: 'B' },
      { t: 0, kind: 'r', item: 'B' },
      { t: 0, kind: 'w', item: 'B' },
    ]
    expect(serialOrder(s, 2)).toBeNull()
    expect(precedence(s).map((e) => `${e.from}>${e.to}:${e.item}`).sort()).toEqual(['0>1:A', '1>0:B'])
  })

  it('agrees with trying every serial order, on random schedules', () => {
    const random = seeded(11)
    for (let k = 0; k < 600; k++) {
      const n = 2 + Math.floor(random() * 3)
      const s: Action[] = Array.from({ length: 2 + Math.floor(random() * 8) }, () => ({
        t: Math.floor(random() * n),
        kind: random() < 0.5 ? 'r' : 'w',
        item: ITEMS[Math.floor(random() * 3)],
      }))
      const order = serialOrder(s, n)
      expect(order === null).toBe(bruteSerialOrder(s, n) === null)
      // And the order it gives does fit every conflict
      if (order) expect(bruteSerialOrder(s, n)).not.toBeNull()
    }
  })

  it('finds cycles, and none where there are none', () => {
    expect(findCycle(3, [[0, 1], [1, 2], [2, 0]])).toEqual([0, 1, 2])
    expect(findCycle(3, [[0, 1], [1, 2], [0, 2]])).toBeNull()
  })
})

describe('the two transactions that should keep A = B', () => {
  it('keep them equal either way round', () => {
    expect(SERIAL_ADD_FIRST).toEqual({ A: 250, B: 250 })
    expect(SERIAL_DOUBLE_FIRST).toEqual({ A: 150, B: 150 })
  })
})

describe('the lab', () => {
  it('lets locks alone produce a schedule no serial order matches', () => {
    const v = verdict(labRun('Early', 'Locks only'))
    expect(v.order).toBeNull()
    expect(v.clash).toEqual({ first: { from: 0, to: 1, item: 'A' }, second: { from: 1, to: 0, item: 'B' } })
    expect(v.values).toEqual({ A: 250, B: 150 })
  })

  it('makes T2 wait under 2PL, and comes out as T1 then T2', () => {
    for (const rule of ['2PL', 'Strict 2PL'] as const) {
      const run = labRun('Early', rule)
      expect(run.events.some((e) => e.kind === 'wait' && e.t === 1 && e.item === 'A')).toBe(true)
      expect(verdict(run)).toMatchObject({ order: [0, 1], values: SERIAL_ADD_FIRST, dirty: 0 })
    }
  })

  it('shows plain 2PL letting T2 read uncommitted data, and strict 2PL not', () => {
    const plain = labRun('Late', '2PL')
    expect(dirtyReads(plain).map((e) => [e.t, e.item, e.dirtyFrom])).toEqual([[1, 'A', 0]])
    expect(verdict(plain).order).toEqual([0, 1])
    const strict = labRun('Late', 'Strict 2PL')
    expect(dirtyReads(strict)).toHaveLength(0)
    expect(strict.events.some((e) => e.kind === 'wait' && e.t === 1)).toBe(true)
  })

  it('detects the deadlock when the two take A and B in opposite orders', () => {
    for (const rule of ['2PL', 'Strict 2PL'] as const) {
      const run = labRun('Crossed', rule)
      const found = run.events.filter((e) => e.kind === 'deadlock')
      expect(found).toEqual([{ kind: 'deadlock', t: 1, cycle: [1, 0] }])
      expect(run.events.some((e) => e.kind === 'abort' && e.t === 1)).toBe(true)
      expect(verdict(run)).toMatchObject({ order: [0, 1], values: SERIAL_ADD_FIRST, deadlocks: 1 })
    }
    // Locks alone never wait here, and go wrong instead
    expect(verdict(labRun('Crossed', 'Locks only'))).toMatchObject({ order: null, deadlocks: 0, values: { A: 250, B: 150 } })
  })

  it('lets two readers share a lock while the writer waits', () => {
    const run = labRun('Readers', '2PL')
    expect(run.states.some((s) => s.locks.A.length === 2 && s.locks.A.every((h) => h.mode === 'S'))).toBe(true)
    const wait = run.states[run.events.findIndex((e) => e.kind === 'wait')]
    expect(wait.waiting[0]).toEqual({ item: 'A', mode: 'X' })
  })

  it('finishes every timing under every rule, legally', () => {
    for (const timing of TIMINGS)
      for (const rule of RULES) {
        const run = labRun(timing, rule)
        expect(run.states.at(-1)!.committed.every(Boolean)).toBe(true)
        expect(legal(run)).toBe(true)
        expect(run.txns).toBe(TIMING[timing].txns)
      }
  })
})

describe('two-phase locking on random workloads', () => {
  const twoPhase = (['2PL', 'Strict 2PL'] as const).map((rule) => [rule, runs(rule, 800, rule === '2PL' ? 21 : 22)] as const)

  it('only ever produces conflict-serializable schedules', () => {
    for (const [, all] of twoPhase)
      for (const run of all) {
        const s = schedule(run)
        expect(serialOrder(s, run.txns.length)).not.toBeNull()
        expect(bruteSerialOrder(s, run.txns.length)).not.toBeNull()
      }
  })

  it('orders every conflict by lock point', () => {
    for (const [, all] of twoPhase)
      for (const run of all) {
        const points = lockPoints(run)
        for (const e of precedence(schedule(run))) expect(points[e.from]).toBeLessThan(points[e.to])
      }
  })

  it('leaves the values of running them one at a time in lock-point order', () => {
    for (const [, all] of twoPhase)
      for (const run of all) expect(finalValues(run)).toEqual(serialValues(run.txns, lockPointOrder(run), INITIAL))
  })

  it('never takes a lock after letting one go', () => {
    for (const [, all] of twoPhase)
      for (const run of all) {
        // Per attempt: a rollback's releases end that attempt, not this one
        const unlocked = run.txns.map(() => false)
        const rollingBack = run.txns.map(() => false)
        for (const e of run.events) {
          if (e.kind === 'abort') {
            unlocked[e.t] = false
            rollingBack[e.t] = true
            continue
          }
          if (e.kind !== 'unlock' && e.kind !== 'deadlock') rollingBack[e.t] = false
          if (e.kind === 'unlock' && !rollingBack[e.t]) unlocked[e.t] = true
          if (e.kind === 'lock') expect(unlocked[e.t]).toBe(false)
        }
      }
  })

  it('keeps every state legal', () => {
    for (const [, all] of twoPhase) for (const run of all) expect(legal(run)).toBe(true)
  })

  it('under strict 2PL, never lets anyone read uncommitted data', () => {
    const [, strict] = twoPhase[1]
    for (const run of strict) expect(dirtyReads(run)).toHaveLength(0)
  })

  it('under strict 2PL, holds every exclusive lock until commit or rollback', () => {
    const [, strict] = twoPhase[1]
    for (const run of strict) {
      const ended = run.txns.map(() => false)
      for (const e of run.events) {
        if (e.kind === 'commit' || e.kind === 'abort') ended[e.t] = true
        else if (e.kind === 'lock' || e.kind === 'op') ended[e.t] = false
        if (e.kind === 'unlock' && e.mode === 'X') expect(ended[e.t]).toBe(true)
      }
    }
  })

  it('under plain 2PL, sometimes does', () => {
    const [, plain] = twoPhase[0]
    expect(plain.some((run) => dirtyReads(run).length > 0)).toBe(true)
  })

  it('breaks every deadlock it meets and finishes', () => {
    let deadlocks = 0
    for (const [, all] of twoPhase)
      for (const run of all) {
        expect(run.states.at(-1)?.committed.every(Boolean) ?? true).toBe(true)
        deadlocks += run.events.filter((e) => e.kind === 'deadlock').length
      }
    expect(deadlocks).toBeGreaterThan(0)
  })

  it('is what locks alone fail at, on the same workloads', () => {
    const loose = runs('Locks only', 800, 23)
    expect(loose.some((run) => serialOrder(schedule(run), run.txns.length) === null)).toBe(true)
  })
})

describe('random timings of the lab pair', () => {
  it('go wrong only without two phases, and read dirty data only without strictness', () => {
    expect(RANDOM['Locks only']).toEqual({ notSerializable: 121, dirty: 868, unequal: 121, runs: RANDOM_RUNS })
    expect(RANDOM['2PL']).toMatchObject({ notSerializable: 0, unequal: 0, dirty: 754 })
    expect(RANDOM['Strict 2PL']).toMatchObject({ notSerializable: 0, unequal: 0, dirty: 0 })
  })
})

describe('locks held by one transaction alone', () => {
  const counts = (rule: Rule) => COUNTS[rule].steps.map((s) => s.count)

  it('go up and down under locks alone', () => {
    expect(counts('Locks only')).toEqual([1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 0])
  })

  it('rise, then fall, under 2PL: no lock after the first unlock', () => {
    expect(counts('2PL')).toEqual([1, 1, 1, 2, 2, 2, 3, 2, 1, 1, 1, 0, 0])
    expect(COUNTS['2PL'].lockPoint).toBe(6)
    expect(COUNTS['2PL'].firstUnlock).toBe(7)
  })

  it('stay at their peak until commit under strict 2PL', () => {
    expect(counts('Strict 2PL')).toEqual([1, 1, 1, 2, 2, 2, 3, 3, 3, 3, 2, 1, 0])
    expect(COUNTS['Strict 2PL'].steps[COUNTS['Strict 2PL'].firstUnlock - 1].kind).toBe('commit')
  })
})

describe('the story', () => {
  it('leaves rooms that no one-at-a-time order would, when keys go back early', () => {
    expect(finalValues(STORY_LOOSE)).toEqual({ A: 2, B: 1 })
    expect(serialOrder(schedule(STORY_LOOSE), 2)).toBeNull()
    // You hang the kitchen key back in your first turn
    expect(STORY_LOOSE.turnEnds.slice(0, 1)).toEqual([3])
    expect(STORY_LOOSE.events[2]).toMatchObject({ kind: 'unlock', t: 0, item: 'A' })
  })

  it('makes Sam wait under the two-phase rule, and the rooms match', () => {
    expect(STORY_2PL.events[2]).toMatchObject({ kind: 'wait', t: 1, item: 'A' })
    expect(finalValues(STORY_2PL)).toEqual({ A: 2, B: 2 })
  })

  it('freezes when you take the kitchen and Sam the bathroom', () => {
    expect(STORY_STUCK.stuck).toBe(true)
    expect(STORY_STUCK.events.at(-1)).toMatchObject({ kind: 'deadlock' })
    expect(STORY_STUCK.states.at(-1)!.waiting).toEqual([
      { item: 'B', mode: 'X' },
      { item: 'A', mode: 'X' },
    ])
  })
})
