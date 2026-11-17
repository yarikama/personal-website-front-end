import { describe, expect, it } from 'vitest'
import {
  CHECK_LOG,
  CHECKPOINTING,
  committedState,
  crash,
  cutBefore,
  duration,
  FLUSH_TICKS,
  FUZZY,
  labCrash,
  labHistory,
  LAB,
  LONG_HELD,
  lanes,
  PLAIN,
  QUIET,
  recover,
  SCHEMES,
  schemeOf,
  script,
  show,
  simulate,
  stopPoint,
  STORY,
  truncatable,
  WORK,
  WORKED,
  type Scheme,
} from './model'

describe('the café story', () => {
  it('reads every line with no checkpoint', () => {
    expect(STORY.plain).toEqual({ written: 24, stop: 0, read: 24, deletable: 0 })
  })

  it('stops at the line drawn across, after new orders waited four lines', () => {
    expect(STORY.quiet).toEqual({ written: 25, stop: 17, read: 8, deletable: 17 })
    expect(STORY.waited).toBe(4)
    expect(QUIET.log[STORY.quiet.stop].kind).toBe('ckpt')
  })

  it('stops at the note once its end is written', () => {
    expect(STORY.fuzzy).toEqual({ written: 26, stop: 13, read: 13, deletable: 13 })
    expect(FUZZY.log[13]).toMatchObject({ kind: 'startCkpt', list: [3, 4] })
  })

  it('goes back to where C began when the cut comes before the end', () => {
    expect(STORY.early).toEqual({ written: 19, stop: 8, read: 11, deletable: 0 })
    expect(FUZZY.log[8]).toMatchObject({ kind: 'start', tx: 3 })
  })

  it('tells the same orders in each version', () => {
    const orders = (log: typeof PLAIN.log) => log.filter((r) => r.kind === 'start').map((r) => ('tx' in r ? r.tx : 0))
    expect(orders(QUIET.log)).toEqual(orders(PLAIN.log))
    expect(orders(FUZZY.log)).toEqual(orders(PLAIN.log))
  })
})

describe('where recovery stops, by hand', () => {
  const undo = (text: string) => stopPoint(script(text).log, 'undo')
  const both = (text: string) => stopPoint(script(text).log, 'undoRedo')

  it('stops at a quiescent checkpoint in either log', () => {
    expect(undo('sA uA cA K sB uB')).toBe(3)
    expect(both('sA uA cA K sB uB')).toBe(3)
  })

  it('stops at the start of a complete checkpoint in an undo log', () => {
    expect(undo('sA uA K(A) sB uA cA E uB')).toBe(2)
  })

  it('goes on to the listed starts in an undo/redo log, even when complete', () => {
    expect(both('sA uA K(A) sB uA E cA uB')).toBe(0)
  })

  it('goes back to the earliest listed start when an undo checkpoint is unfinished', () => {
    expect(undo('sA uA cA sB uB sC K(BC) uC')).toBe(3)
  })

  it('falls back to the last complete checkpoint when an undo/redo one is unfinished', () => {
    expect(both('sA K(A) uA E cA sB uB sC cB K(C) uC')).toBe(0)
    expect(both('sA uA cA K() E sB uB cB sC K(C) uC')).toBe(3)
    expect(both('sA uA cA sB uB cB sC K(C) uC')).toBe(0)
  })

  it('may delete only what comes before a complete checkpoint', () => {
    expect(truncatable(script('sA uA cA K(B) sB').log, 'undo')).toBe(0)
    expect(truncatable(script('sA uA cA K() E sB K(B)').log, 'undo')).toBe(3)
  })
})

describe('the check: a crash inside an undo/redo checkpoint', () => {
  it('prints as the page shows it', () => {
    expect(CHECK_LOG.map((r) => show(r))).toEqual([
      '<START T1>',
      '<T1, X, 1, 2>',
      '<COMMIT T1>',
      '<START T2>',
      '<START CKPT (T2)>',
      '<T2, Y, 3, 4>',
      '<END CKPT>',
      '<COMMIT T2>',
      '<START T3>',
      '<T3, Z, 5, 6>',
      '<START CKPT (T3)>',
      '<T3, X, 2, 7>',
    ])
  })

  it('reads back to record 4, where T2 began', () => {
    expect(stopPoint(CHECK_LOG, 'undoRedo') + 1).toBe(4)
  })

  it('loses T2’s change to Y if it stops at T3’s start, as the notes’ rule does', () => {
    expect(stopPoint(CHECK_LOG, 'undoRedo', 'notes') + 1).toBe(9)
    // On disk: X = 2 (the first checkpoint wrote it), then T3's X = 7 and
    // Z = 6 stolen; Y = 4 still only in memory
    const disk = [7, 3, 6]
    const right = committedState(CHECK_LOG, [1, 3, 5])
    expect(right).toEqual([2, 4, 5])
    expect(recover(CHECK_LOG, disk, 'undoRedo', stopPoint(CHECK_LOG, 'undoRedo'))).toEqual(right)
    expect(recover(CHECK_LOG, disk, 'undoRedo', stopPoint(CHECK_LOG, 'undoRedo', 'notes'))).toEqual([2, 3, 5])
  })
})

describe('recovery from the checkpoint on random histories', () => {
  const SEEDS = Array.from({ length: 24 }, (_, i) => i + 1)
  const histories = SEEDS.flatMap((seed) =>
    CHECKPOINTING.flatMap((checkpointing) =>
      (['undo', 'undoRedo'] as Scheme[]).flatMap((scheme) =>
        [false, true].map((long) => ({
          scheme,
          checkpointing,
          history: simulate({ seed, ticks: 160, every: 30, scheme, checkpointing, long }),
        })),
      ),
    ),
  )

  it('matches recovery from the whole log, and the committed changes, at every crash point', () => {
    let points = 0
    for (const { scheme, history } of histories) {
      for (let cut = 0; cut <= history.events.length; cut++) {
        const { log, disk } = crash(history, cut)
        const right = committedState(log, history.initial)
        const stop = stopPoint(log, scheme)
        expect(recover(log, disk, scheme, 0)).toEqual(right)
        expect(recover(log, disk, scheme, stop)).toEqual(right)
        expect(stop).toBeGreaterThanOrEqual(truncatable(log, scheme))
        points++
      }
    }
    expect(points).toBeGreaterThan(30_000)
  })

  it('reads less with checkpoints than without', () => {
    for (const { scheme, checkpointing, history } of histories) {
      const stop = stopPoint(history.log, scheme)
      if (checkpointing === 'None') expect(stop).toBe(0)
      else expect(stop).toBeGreaterThan(0)
    }
  })

  it('catches the notes’ rule for an unfinished undo/redo checkpoint losing committed work', () => {
    let wrong = 0
    for (const { scheme, checkpointing, history } of histories) {
      if (scheme !== 'undoRedo' || checkpointing !== 'Nonquiescent') continue
      for (let cut = 0; cut <= history.events.length; cut++) {
        const { log, disk } = crash(history, cut)
        const notes = recover(log, disk, scheme, stopPoint(log, scheme, 'notes'))
        if (notes.some((v, el) => v !== committedState(log, history.initial)[el])) wrong++
      }
    }
    expect(wrong).toBeGreaterThan(0)
  })

  it('keeps the checkpoint rules while it generates', () => {
    for (const { scheme, checkpointing, history } of histories) {
      const log = history.log
      // A quiescent checkpoint lets nothing start while it drains
      for (const f of history.frozen) expect(log.some((r) => r.kind === 'start' && r.t >= f.from && r.t < f.to)).toBe(false)
      if (checkpointing === 'Quiescent') expect(history.frozen.length).toBeGreaterThan(0)
      else expect(history.frozen).toEqual([])
      log.forEach((r, i) => {
        if (r.kind !== 'endCkpt') return
        const at = log.findLastIndex((s, j) => j < i && s.kind === 'startCkpt')
        const begun = log[at]
        if (begun.kind !== 'startCkpt') throw new Error('an end with no start')
        if (scheme === 'undo') {
          // Every listed transaction has committed
          for (const tx of begun.list) expect(log.slice(at, i).some((s) => s.kind === 'commit' && s.tx === tx)).toBe(true)
        } else {
          expect(r.t - begun.t).toBeGreaterThanOrEqual(FLUSH_TICKS)
          expect(r.t - begun.t).toBeLessThanOrEqual(FLUSH_TICKS + 4)
        }
      })
    }
  })
})

describe('the lab', () => {
  const end = LAB.ticks

  it('recovers correctly at every tick of every setting', () => {
    for (const c of CHECKPOINTING)
      for (const s of SCHEMES)
        for (const k of WORK)
          for (let tick = 0; tick <= end; tick++) expect(labCrash(labHistory(c, s, k), schemeOf(s), tick).correct).toBe(true)
  })

  it('holds new work back only under quiescent checkpoints, far longer with a long transaction', () => {
    const held = (c: (typeof CHECKPOINTING)[number], k: (typeof WORK)[number]) =>
      labCrash(labHistory(c, 'Undo', k), 'undo', end).heldBack
    expect(held('None', 'One long')).toBe(0)
    expect(held('Nonquiescent', 'One long')).toBe(0)
    expect(held('Quiescent', 'Short')).toBeGreaterThan(0)
    expect(held('Quiescent', 'One long')).toBeGreaterThan(4 * held('Quiescent', 'Short'))
    expect(LONG_HELD).toBe(72)
  })

  it('reads the whole log with no checkpoint and a short stretch with one', () => {
    const run = (c: (typeof CHECKPOINTING)[number]) => labCrash(labHistory(c, 'Undo', 'Short'), 'undo', end)
    expect(run('None').stop).toBe(0)
    expect(run('Nonquiescent').log.length - run('Nonquiescent').stop).toBeLessThan(run('None').log.length / 3)
  })

  it('lets a long transaction hold back an undo/redo scan to its start', () => {
    const history = labHistory('Nonquiescent', 'Undo/redo', 'One long')
    const { log, stop } = labCrash(history, 'undoRedo', 100)
    const long = log.find((r) => r.kind === 'start' && r.t >= 12)
    expect(log[stop]).toBe(long)
  })

  it('counts crash cuts by tick', () => {
    const history = labHistory('None', 'Undo', 'Short')
    expect(cutBefore(history, 0)).toBe(0)
    expect(cutBefore(history, end)).toBe(history.events.length)
  })
})

describe('the drawing', () => {
  it('never puts two open transactions in one row', () => {
    for (const s of SCHEMES) {
      const log = labHistory('Quiescent', s, 'One long').log
      const row = lanes(log)
      const spans = log.flatMap((r) =>
        r.kind === 'start' ? [{ tx: r.tx, from: r.t, to: log.find((c) => c.kind === 'commit' && c.tx === r.tx)?.t ?? Infinity }] : [],
      )
      for (const a of spans)
        for (const b of spans)
          if (a.tx < b.tx && row.get(a.tx) === row.get(b.tx)) expect(a.to < b.from || b.to < a.from).toBe(true)
    }
  })
})

describe('the arithmetic', () => {
  it('reads 30 days of log in 36 hours, an hour in 3 minutes, 5 minutes in 15 seconds', () => {
    expect(WORKED.map((w) => w.seconds)).toEqual([129_600, 180, 15])
    expect(WORKED.map((w) => duration(w.seconds))).toEqual(['36 hours', '3 minutes', '15 seconds'])
  })
})
