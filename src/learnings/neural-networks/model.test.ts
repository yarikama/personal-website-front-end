import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  backward,
  boundary,
  CHECK_OPTIONS,
  checkSlope,
  countsOf,
  crossEntropy,
  FIRST_ALL_RIGHT,
  FLAGGED,
  flatten,
  forward,
  gradient,
  HAND,
  lossOf,
  netRight,
  randomNet,
  REVIEWS,
  rightOf,
  sigmoid,
  STORY_END,
  STORY_START,
  STORY_TALLY,
  sumOf,
  tallyOf,
  totalLoss,
  train,
  withNot,
  WORKED,
  WORKED_HELPER,
  WORKED_WEIGHT,
  type Net,
  type Review,
  type Tally,
} from './model'

const between = (random: () => number, lo: number, hi: number) => lo + random() * (hi - lo)

describe('reviews as counts', () => {
  it('counts each word of the vocabulary, ignoring the rest', () => {
    expect(countsOf('not boring')).toEqual([1, 0, 1])
    expect(countsOf('Not not good coffee')).toEqual([2, 1, 0])
    expect(REVIEWS.map((r) => r.counts)).toEqual([
      [0, 1, 0],
      [1, 1, 0],
      [0, 0, 1],
      [1, 0, 1],
    ])
  })
})

describe('one tally', () => {
  it('adds each word’s points to the start', () => {
    expect(tallyOf(STORY_TALLY, [1, 1, 0])).toBe(2)
    expect(tallyOf(withNot(-3), [1, 1, 0])).toBe(-1)
  })

  it('gets 3 of 4 when “not” is worth a lot either way, and 2 in between', () => {
    expect(rightOf(withNot(-3))).toBe(3)
    expect(rightOf(withNot(3))).toBe(3)
    expect(rightOf(withNot(0))).toBe(2)
  })

  it('gives the happy pair and the unhappy pair the same total, whatever the points', () => {
    const random = seeded(7)
    for (let i = 0; i < 200; i++) {
      const tally: Tally = { points: [0, 1, 2].map(() => between(random, -9, 9)), start: between(random, -9, 9) }
      expect(sumOf(tally, true)).toBeCloseTo(sumOf(tally, false), 10)
    }
  })

  it('never gets all four right, on 20,000 random tallies, and gets 3 on some', () => {
    const random = seeded(11)
    let best = 0
    for (let i = 0; i < 20_000; i++) {
      const tally: Tally = { points: [0, 1, 2].map(() => between(random, -10, 10)), start: between(random, -10, 10) }
      best = Math.max(best, rightOf(tally))
    }
    expect(best).toBe(3)
  })
})

describe('the network', () => {
  it('works one forward pass out by hand', () => {
    const net: Net = { W: [[1, 0, 0]], b: [0], v: [2], c: -1 }
    const pass = forward(net, [1, 0, 0])
    expect(pass.a).toEqual([1])
    expect(pass.z[0]).toBeCloseTo(0.7311, 4)
    expect(pass.s).toBeCloseTo(0.4621, 4)
    expect(pass.p).toBeCloseTo(0.6135, 4)
    expect(lossOf(net, { text: 'not', counts: [1, 0, 0], happy: true })).toBeCloseTo(-Math.log(0.6135), 3)
  })

  it('with the story’s hand-set helpers, calls all four reviews right', () => {
    expect(netRight(HAND)).toBe(4)
    for (const r of REVIEWS) {
      const { p } = forward(HAND, r.counts)
      expect(r.happy ? p : 1 - p).toBeGreaterThan(0.9)
    }
  })

  it('without the squash, collapses into one tally, which can’t get four', () => {
    const random = seeded(5)
    for (let i = 0; i < 100; i++) {
      const net = randomNet(Math.floor(random() * 1e6), 3, 5)
      const flat = flatten(net)
      for (const r of REVIEWS) expect(forward(net, r.counts, false).s).toBeCloseTo(tallyOf(flat, r.counts), 10)
      expect(rightOf(flat)).toBeLessThan(4)
    }
    expect(rightOf(flatten(HAND))).toBeLessThan(4)
  })

  it('has a loss that is the cross-entropy with all the target on the true label', () => {
    for (const r of REVIEWS) {
      const { p } = forward(STORY_START, r.counts)
      const q = r.happy ? [1, 0] : [0, 1]
      expect(crossEntropy(q, [p, 1 - p])).toBeCloseTo(lossOf(STORY_START, r), 10)
    }
  })
})

describe('backpropagation', () => {
  // Every gradient entry against a central difference of the loss
  const numeric = (net: Net, r: Review) => {
    const h = 1e-6
    const nudge = (change: (n: Net) => void) => {
      const up = structuredClone(net)
      const down = structuredClone(net)
      change(up)
      change(down)
      return { up, down }
    }
    const slope = (pick: (n: Net, by: number) => void) => {
      const { up, down } = nudge(() => {})
      pick(up, h)
      pick(down, -h)
      return (lossOf(up, r) - lossOf(down, r)) / (2 * h)
    }
    return {
      W: net.W.map((row, k) => row.map((_, j) => slope((n, by) => (n.W[k][j] += by)))),
      b: net.b.map((_, k) => slope((n, by) => (n.b[k] += by))),
      v: net.v.map((_, k) => slope((n, by) => (n.v[k] += by))),
      c: slope((n, by) => (n.c += by)),
    }
  }

  it('matches finite differences on 200 random networks and reviews', () => {
    const random = seeded(23)
    for (let i = 0; i < 200; i++) {
      const net = randomNet(Math.floor(random() * 1e6), 1 + Math.floor(random() * 3), 3)
      const r: Review = {
        text: '',
        counts: [0, 1, 2].map(() => Math.floor(random() * 3)),
        happy: random() < 0.5,
      }
      const { grad } = backward(net, r)
      const ref = numeric(net, r)
      grad.W.forEach((row, k) => row.forEach((g, j) => expect(g).toBeCloseTo(ref.W[k][j], 5)))
      grad.b.forEach((g, k) => expect(g).toBeCloseTo(ref.b[k], 5))
      grad.v.forEach((g, k) => expect(g).toBeCloseTo(ref.v[k], 5))
      expect(grad.c).toBeCloseTo(ref.c, 5)
    }
  })

  it('reuses your blame: each helper’s share is blame × trust × the flag’s slope', () => {
    const { pass, blame, shares } = WORKED
    expect(blame).toBeCloseTo(pass.p - 1, 12)
    shares.forEach((share, k) => expect(share).toBeCloseTo(blame * STORY_START.v[k] * pass.z[k] * (1 - pass.z[k]), 12))
    expect(WORKED_WEIGHT).toBeCloseTo(shares[WORKED_HELPER] * 1, 12)
  })

  it('leaves the weights of words not in the review alone', () => {
    const { grad } = backward(STORY_START, REVIEWS[0])
    for (const row of grad.W) {
      expect(Math.abs(row[0])).toBe(0)
      expect(Math.abs(row[2])).toBe(0)
    }
  })

  it('keeps helpers that start identical identical', () => {
    const twin: Net = { W: [[0.3, -0.2, 0.1], [0.3, -0.2, 0.1]], b: [0.1, 0.1], v: [0.5, 0.5], c: 0 }
    const end = train(twin, 300).at(-1)!
    end.W[0].forEach((w, j) => expect(w).toBeCloseTo(end.W[1][j], 12))
    expect(netRight(end)).toBeLessThan(4)
  })

  it('sums the per-review gradients', () => {
    const g = gradient(STORY_START)
    const c = REVIEWS.reduce((sum, r) => sum + backward(STORY_START, r).grad.c, 0)
    expect(g.c).toBeCloseTo(c, 12)
  })
})

describe('the story’s training', () => {
  it('calls all four right, with little loss left', () => {
    expect(netRight(STORY_START)).toBeLessThan(4)
    expect(netRight(STORY_END)).toBe(4)
    expect(FIRST_ALL_RIGHT).toBeGreaterThan(0)
    expect(totalLoss(STORY_END)).toBeLessThan(0.1)
  })

  it('ends with one helper on “not boring” and the other on “good”: Ben’s and Ana’s jobs', () => {
    expect(FLAGGED).toEqual([['not boring'], ['good']])
  })

  it('lowers the loss on most rounds', () => {
    const path = train(STORY_START, 100)
    expect(totalLoss(path[100])).toBeLessThan(totalLoss(path[0]))
  })

  it('gets stuck from some starts and not others', () => {
    const results = Array.from({ length: 30 }, (_, i) => netRight(train(randomNet(i + 1), 1500).at(-1)!))
    expect(results.filter((n) => n === 4).length).toBeGreaterThan(15)
    expect(results.some((n) => n < 4)).toBe(true)
  })
})

describe('the boundary in the helpers’ plane', () => {
  it('sits where your score is zero', () => {
    for (const [x1, y1] of boundary(STORY_END, [-12, 12], 40)) {
      const s = STORY_END.v[0] * sigmoid(x1) + STORY_END.v[1] * sigmoid(y1) + STORY_END.c
      expect(Math.abs(s)).toBeLessThan(0.5)
    }
    expect(boundary(STORY_END, [-12, 12], 40).length).toBeGreaterThan(10)
  })
})

describe('check yourself', () => {
  it('works the slope out: −0.4 × 2 × 0.25 × 2 = −0.4', () => {
    expect(checkSlope()).toBeCloseTo(-0.4, 12)
    expect(new Set(CHECK_OPTIONS.map((o) => o.toFixed(2))).size).toBe(4)
  })
})
