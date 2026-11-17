import { describe, expect, it } from 'vitest'
import {
  CLOCK_RUN,
  hits,
  hitsPerPass,
  labRun,
  loop,
  loopHitRate,
  PATTERNS,
  POLICIES,
  simulate,
  STORY_LRU,
  STORY_MRU,
  WARM_UP,
  LAB_LENGTH,
  zigzag,
  type Policy,
} from './model'

describe('a pool on a file one page bigger than it', () => {
  it('never hits under LRU, on any pass', () => {
    for (const frames of [1, 4, 10, 50]) {
      const run = simulate(loop(frames + 1, 8), frames, 'LRU')
      expect(hits(run), `${frames} frames`).toBe(0)
    }
  })

  it('never hits under Clock or FIFO either', () => {
    for (const policy of ['Clock', 'FIFO'] as Policy[]) {
      expect(hits(simulate(loop(11, 8), 10, policy)), policy).toBe(0)
    }
  })

  it('hits on all but about one page a pass under MRU', () => {
    // After the first pass, any M passes of an (M + 1)-page file give
    // (M + 1)(M − 1) hits: M on every pass but one, which gets M − 1
    for (const frames of [2, 4, 10, 25]) {
      const pages = frames + 1
      const run = simulate(loop(pages, frames + 1), frames, 'MRU')
      expect(hits(run, 0, pages)).toBe(0)
      expect(hits(run, pages)).toBe((frames + 1) * (frames - 1))
      for (const count of hitsPerPass(run, pages).slice(1)) expect([frames - 1, frames]).toContain(count)
    }
  })

  it('tells the story’s numbers: 0 of 15 for LRU, 4 and 4 for MRU', () => {
    expect(hitsPerPass(STORY_LRU, 5)).toEqual([0, 0, 0])
    expect(hitsPerPass(STORY_MRU, 5)).toEqual([0, 4, 4])
  })

  it('evicts under MRU the page read just before the miss', () => {
    // The first pass of the story: volume 5 pushes out volume 4
    expect(STORY_MRU[4].evicted).toBe(4)
    expect(STORY_LRU[4].evicted).toBe(1)
  })
})

describe('the MRU hit rate on a repeated scan', () => {
  it('is (M − 1)/(N − 1) over N − 1 passes after the first', () => {
    for (const [frames, pages] of [
      [10, 11],
      [10, 15],
      [10, 20],
      [4, 5],
      [7, 30],
    ]) {
      const run = simulate(loop(pages, pages), frames, 'MRU')
      expect(hits(run, pages) / (pages * (pages - 1)), `${frames} of ${pages}`).toBeCloseTo(
        loopHitRate('MRU', frames, pages),
        10,
      )
    }
  })

  it('is everything once the whole file fits, for either policy', () => {
    expect(loopHitRate('LRU', 12, 11)).toBe(1)
    expect(hits(simulate(loop(11, 3), 12, 'LRU'), 11)).toBe(22)
  })
})

describe('LRU on a scan that turns round each pass', () => {
  it('misses only the far end: 10 of 11 hit with 10 frames', () => {
    expect(hitsPerPass(simulate(zigzag(11, 6), 10, 'LRU'), 11)).toEqual([0, 10, 10, 10, 10, 10])
  })
})

describe('LRU on a short trace worked by hand', () => {
  it('evicts the page used longest ago', () => {
    // 3 frames: 1 2 3 1 4 → 4 pushes out 2 (1 was used again); then 2
    // misses and pushes out 3
    const run = simulate([1, 2, 3, 1, 4, 2], 3, 'LRU')
    expect(run.map((a) => a.hit)).toEqual([false, false, false, true, false, false])
    expect(run[4].evicted).toBe(2)
    expect(run[5].evicted).toBe(3)
    expect(run[5].slots).toEqual([1, 4, 2])
  })
})

describe('Clock', () => {
  it('matches a trace worked by hand', () => {
    // 3 frames, 1 2 3 1 4 2 5 1. After the fill every bit is set, so 4
    // sweeps round clearing all three and evicts 1 at frame 0; 2 is hit and
    // set again, so 5 passes it by (clearing it) and evicts 3; then 1
    // sweeps past 4 and evicts 2, whose bit was cleared
    const run = simulate([1, 2, 3, 1, 4, 2, 5, 1], 3, 'Clock')
    expect(run.map((a) => a.hit)).toEqual([false, false, false, true, false, true, false, false])
    expect(run.map((a) => a.evicted)).toEqual([null, null, null, null, 1, null, 3, 2])
    expect(run[4]).toMatchObject({ slots: [4, 2, 3], bits: [true, false, false], hand: 1, moves: 4 })
    expect(run[6]).toMatchObject({ slots: [4, 2, 5], bits: [true, false, true], hand: 0, moves: 2 })
    expect(run[7]).toMatchObject({ slots: [4, 1, 5], bits: [false, true, true], hand: 2, moves: 2 })
  })

  it('gives page 2 its second chance in the page’s figure', () => {
    // Page 2 was hit, so the sweep for page 6 clears its bit and passes it
    // by, evicting page 3 instead
    expect(CLOCK_RUN.map((a) => a.evicted)).toEqual([null, null, null, null, 1, null, 3, 4, null])
    expect(CLOCK_RUN[6].moves).toBe(2)
    expect(hits(CLOCK_RUN)).toBe(2)
  })

  it('sets a page’s bit on a hit and nothing more', () => {
    const run = simulate([1, 2, 1], 2, 'Clock')
    expect(run[2]).toMatchObject({ hit: true, moves: 0, hand: run[1].hand })
  })
})

describe('pinned pages', () => {
  it('are never evicted, whatever the policy', () => {
    const trace = loop(12, 6).map((page, i) => (i % 3 === 0 ? 100 : page))
    for (const policy of [...POLICIES, 'FIFO'] as Policy[]) {
      const run = simulate(trace, 5, policy, new Set([100]))
      expect(run.some((a) => a.evicted === 100), policy).toBe(false)
      // Once loaded it is hit every time after
      expect(run.filter((a) => a.page === 100).slice(1).every((a) => a.hit), policy).toBe(true)
    }
  })

  it('leave nothing to evict when they fill every frame', () => {
    expect(() => simulate([1, 2, 3], 2, 'LRU', new Set([1, 2]))).toThrow()
    expect(() => simulate([1, 2, 3], 2, 'Clock', new Set([1, 2]))).toThrow()
  })
})

describe('the lab', () => {
  it('counts every read after the warm-up', () => {
    for (const pattern of PATTERNS) expect(labRun(pattern, 20, 'LRU').hit).toHaveLength(LAB_LENGTH - WARM_UP)
  })

  it('floods LRU and Clock on the repeated scan until the file fits', () => {
    for (const frames of [10, 30, 55]) {
      expect(labRun('Repeated scan', frames, 'LRU').rate).toBe(0)
      expect(labRun('Repeated scan', frames, 'Clock').rate).toBe(0)
      expect(labRun('Repeated scan', frames, 'MRU').rate).toBeGreaterThan(0.1)
    }
    expect(labRun('Repeated scan', 60, 'LRU').rate).toBe(1)
  })

  it('favours LRU and Clock on a hot set, and MRU on a scan beside one', () => {
    const at = (pattern: (typeof PATTERNS)[number], policy: Policy) => labRun(pattern, 40, policy).rate
    expect(at('Hot set', 'LRU')).toBeGreaterThan(at('Hot set', 'MRU') + 0.5)
    expect(Math.abs(at('Hot set', 'Clock') - at('Hot set', 'LRU'))).toBeLessThan(0.05)
    expect(at('Scan + hot set', 'MRU')).toBeGreaterThan(at('Scan + hot set', 'LRU'))
  })

  it('opens the same way every time', () => {
    expect(labRun('Hot set', 25, 'LRU')).toBe(labRun('Hot set', 25, 'LRU'))
  })
})
