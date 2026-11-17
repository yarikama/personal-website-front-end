import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  broken,
  crashAfter,
  INITIAL,
  LAB,
  LAB_START,
  QUIZ_AFTER,
  randomSchedule,
  recordText,
  recover,
  replay,
  rightCrashes,
  SCHEMES,
  STORY,
  STORY_NUMBERS,
  type Event,
  type Scheme,
} from './model'

const RUNS = 300

describe('the story', () => {
  it('loses $100 with no log, and gets it back either way with one', () => {
    expect(STORY_NUMBERS.before).toBe(700)
    expect(STORY_NUMBERS.halfDone).toBe(600)
    expect(STORY_NUMBERS.undone).toEqual({ A: 500, B: 200 })
    expect(STORY_NUMBERS.redone).toEqual({ A: 400, B: 300 })
  })

  it('has seven steps, each with a frame, and the reveal on the redo ending', () => {
    expect(STORY).toHaveLength(7)
    for (const frames of STORY) expect(frames.length).toBeGreaterThan(0)
    expect(STORY[6][0].snap.disk).toEqual(STORY_NUMBERS.redone)
  })

  it('writes the undo notes before the ink, and the redo notes and “done” before it', () => {
    const undo = STORY[3]
    const inked = undo.findIndex((f) => f.event?.kind === 'output')
    expect(undo[inked - 1].snap.log.map(recordText)).toEqual(['<T1, A, 500>', '<T1, B, 200>'])
    const redo = STORY[5]
    const inkedRedo = redo.findIndex((f) => f.event?.kind === 'output')
    expect(redo[inkedRedo - 1].snap.log.map(recordText)).toEqual(['<T1, A, 400>', '<T1, B, 300>', '<COMMIT T1>'])
  })
})

describe('recovery worked by hand', () => {
  it('undo puts back the old values of an unfinished transaction, newest record first', () => {
    const r = recover(
      { X: 7, Y: 9 },
      [
        { kind: 'start', t: 'T' },
        { kind: 'update', t: 'T', x: 'X', old: 1 },
        { kind: 'update', t: 'T', x: 'X', old: 5 },
        { kind: 'update', t: 'T', x: 'Y', old: 2 },
      ],
      'Undo',
    )
    // X was 1, then 5, then 7: walking back, the oldest note wins
    expect(r.disk).toEqual({ X: 1, Y: 2 })
    expect(r.log.at(-1)).toEqual({ kind: 'abort', t: 'T' })
  })

  it('redo writes the new values of committed transactions, the latest last', () => {
    const r = recover(
      { X: 0, Y: 0 },
      [
        { kind: 'update', t: 'T', x: 'X', new: 4 },
        { kind: 'update', t: 'T', x: 'X', new: 6 },
        { kind: 'commit', t: 'T' },
        { kind: 'update', t: 'U', x: 'Y', new: 9 },
      ],
      'Redo',
    )
    expect(r.disk).toEqual({ X: 6, Y: 0 })
  })

  it('answers Check yourself: redo T (stock 11), undo U (price 30)', () => {
    expect(QUIZ_AFTER).toEqual({ stock: 11, price: 30 })
  })
})

describe('the lab', () => {
  it('opens on undo logging with A on disk and B only in memory', () => {
    const order = LAB[LAB_START.scheme][0]
    const c = crashAfter(order.events, LAB_START.crash, LAB_START.scheme, INITIAL)
    expect(c.at.disk).toEqual({ A: 400, B: 200, C: 800 })
    expect(c.at.memory.B).toBe(300)
    expect(c.recovery.disk).toEqual(INITIAL)
    expect(c.wrong).toEqual([])
  })

  it('gets every crash point right when the rules are kept', () => {
    for (const scheme of SCHEMES) {
      const [rules] = LAB[scheme]
      expect(rules.name).toBe('By the rules')
      expect(broken(rules.events, scheme, INITIAL)).toBeNull()
      expect(rightCrashes(rules.events, scheme, INITIAL)).toBe(rules.events.length + 1)
    }
  })

  it('names the rule each other order breaks, and fails where it says', () => {
    const expected: Record<string, { rule: string; at: number; wrongAt: number[] }> = {
      'Undo/Breaks U1': { rule: 'U1', at: 2, wrongAt: [3, 4, 5, 6] },
      'Undo/Breaks U2': { rule: 'U2', at: 6, wrongAt: [7, 8, 9, 10] },
      'Redo/Breaks R1': { rule: 'R1', at: 4, wrongAt: [5, 6, 7, 8] },
      'Undo/redo/Breaks UR1': { rule: 'UR1', at: 2, wrongAt: [3, 4, 5, 6] },
    }
    for (const scheme of SCHEMES)
      for (const order of LAB[scheme].slice(1)) {
        const want = expected[`${scheme}/${order.name}`]
        const b = broken(order.events, scheme, INITIAL)
        expect(b?.rule).toBe(want.rule)
        expect(b?.at).toBe(want.at)
        const wrongAt = order.events
          .map((_, k) => k)
          .concat(order.events.length)
          .filter((k) => crashAfter(order.events, k, scheme, INITIAL).wrong.length > 0)
        expect(wrongAt, `${scheme}, ${order.name}`).toEqual(want.wrongAt)
      }
  })
})

// A schedule with a rule broken on purpose: an element output right after
// the first write of the run, before its record (or COMMIT) is on disk
function breakIt(events: Event[], scheme: Scheme): { events: Event[]; at: number } {
  const first = events.findIndex((e) => e.kind === 'write')
  const e = events[first] as Event & { kind: 'write' }
  const inserted: Event[] = scheme === 'Redo' ? [{ kind: 'flush' }, { kind: 'output', x: e.x }] : [{ kind: 'output', x: e.x }]
  return {
    events: [...events.slice(0, first + 1), ...inserted, ...events.slice(first + 1)],
    at: first + inserted.length,
  }
}

describe.each(SCHEMES)('%s logging, on random schedules that keep its rules', (scheme) => {
  const schedules = Array.from({ length: RUNS }, (_, i) => randomSchedule(seeded(1000 + i), scheme))

  it('keeps the rules it was built to keep', () => {
    for (const { events, initial } of schedules) expect(broken(events, scheme, initial)).toBeNull()
  })

  it('recovers to all-or-nothing at every crash point: committed kept whole, the rest wiped', () => {
    for (const { events, initial } of schedules)
      for (let k = 0; k <= events.length; k++) {
        const c = crashAfter(events, k, scheme, initial)
        expect(c.wrong, `crash after ${k}`).toEqual([])
      }
  })

  it('gives the same result run twice, or cut off part way and run again', () => {
    for (const { events, initial } of schedules.slice(0, 100))
      for (let k = 0; k <= events.length; k++) {
        const at = replay(events.slice(0, k), scheme, initial)[k]
        const once = recover(at.disk, at.log, scheme)
        const twice = recover(once.disk, once.log, scheme)
        expect(twice.disk).toEqual(once.disk)
        expect(twice.log).toEqual(once.log)
        for (const step of once.steps) {
          if (step.kind === 'abort') continue
          expect(recover(step.disk, at.log, scheme).disk).toEqual(once.disk)
        }
      }
  })

  it('fails at the crash right after a rule is broken', () => {
    for (const { events, initial } of schedules) {
      const bad = breakIt(events, scheme)
      const b = broken(bad.events, scheme, initial)
      expect(b?.rule).toBe(scheme === 'Undo' ? 'U1' : scheme === 'Redo' ? 'R1' : 'UR1')
      expect(b?.at).toBe(bad.at)
      expect(crashAfter(bad.events, bad.at + 1, scheme, initial).wrong.length).toBeGreaterThan(0)
    }
  })
})

describe('schedules that keep no rules', () => {
  it('make every scheme fail somewhere, and only where a rule is broken', () => {
    for (const scheme of SCHEMES) {
      let failed = 0
      for (let i = 0; i < RUNS; i++) {
        const { events, initial } = randomSchedule(seeded(5000 + i), null)
        const ok = rightCrashes(events, scheme, initial) === events.length + 1
        if (!ok) {
          failed++
          expect(broken(events, scheme, initial)).not.toBeNull()
        }
      }
      expect(failed).toBeGreaterThan(RUNS / 4)
    }
  })
})
