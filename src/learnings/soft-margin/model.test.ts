import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  between,
  cloud,
  curbFoot,
  dualObjective,
  hardMargin,
  hinge,
  LAB,
  LAB_SHOWN,
  labRun,
  lineOf,
  logLoss,
  normOf,
  objective,
  ODD_START,
  QUIZ_COST,
  roadOf,
  score,
  signedScore,
  slack,
  solve,
  STORY,
  tally,
  WORKED,
  widthOf,
  zeroOne,
  type Line,
  type Point,
} from './model'

// ---- Referees, written apart from the model ------------------------------

// The distance between two segments in the plane (a point is a segment of
// length zero)
type V = [number, number]
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1]]
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1]
function pointToSegment(p: V, a: V, b: V) {
  const ab = sub(b, a)
  const length = dot(ab, ab)
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, dot(sub(p, a), ab) / length))
  return Math.hypot(p[0] - a[0] - t * ab[0], p[1] - a[1] - t * ab[1])
}
function segmentsCross(a: V, b: V, c: V, d: V) {
  const cross = (o: V, p: V, q: V) => (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0])
  return cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0
}
function segmentToSegment(a: V, b: V, c: V, d: V) {
  if (segmentsCross(a, b, c, d)) return 0
  return Math.min(pointToSegment(a, c, d), pointToSegment(b, c, d), pointToSegment(c, a, b), pointToSegment(d, a, b))
}
// The gap between two classes' convex hulls, by brute force over every
// segment between two points of one class and two of the other. For
// separable classes this gap is the hard-margin street's width.
function hullGap(points: Point[]) {
  const side = (y: number) => points.filter((p) => p.y === y).map((p): V => [p.x1, p.x2])
  const A = side(-1)
  const B = side(1)
  let best = Infinity
  for (let i = 0; i < A.length; i++)
    for (let j = i; j < A.length; j++)
      for (let k = 0; k < B.length; k++)
        for (let l = k; l < B.length; l++) best = Math.min(best, segmentToSegment(A[i], A[j], B[k], B[l]))
  return best
}

// Subgradient descent on the primal, with a shrinking step and the best
// point kept: slow, but a solver that shares nothing with the dual one
function subgradient(points: Point[], C: number, rounds = 40_000): Line {
  let line: Line = { w: [0, 0], b: 0 }
  let best = line
  let bestValue = objective(line, points, C)
  for (let k = 1; k <= rounds; k++) {
    const g: [number, number, number] = [line.w[0], line.w[1], 0]
    for (const p of points)
      if (signedScore(line, p) < 1) {
        g[0] -= C * p.y * p.x1
        g[1] -= C * p.y * p.x2
        g[2] -= C * p.y
      }
    const step = 0.5 / (1 + C * points.length) / Math.sqrt(k)
    line = { w: [line.w[0] - step * g[0], line.w[1] - step * g[1]], b: line.b - step * g[2] }
    const value = objective(line, points, C)
    if (value < bestValue) {
      bestValue = value
      best = line
    }
  }
  return best
}

// Two clouds pulled far enough apart to be separable most of the time
const apart = (seed: number) =>
  cloud(seed, 8, 0.6).map((p) => ({ ...p, x1: p.x1 + p.y * 1.3, x2: p.x2 + p.y * 0.6 }))

// ---- The losses ---------------------------------------------------------

describe('the losses', () => {
  it('give the worked points 0, 0.4 and 1.7', () => {
    expect(WORKED.map((w) => hinge(w.t))).toEqual([0, expect.closeTo(0.4, 12), expect.closeTo(1.7, 12)])
  })

  it('agree at the line: each costs 1 where y·f(x) = 0', () => {
    expect(hinge(0)).toBe(1)
    expect(zeroOne(0)).toBe(1)
    expect(logLoss(0)).toBeCloseTo(1, 12)
    expect(zeroOne(0.01)).toBe(0)
  })

  it('hinge and log loss both lie on or above the 0-1 loss, and hinge is exactly 0 past 1', () => {
    for (let t = -3; t <= 4; t += 0.05) {
      expect(hinge(t)).toBeGreaterThanOrEqual(zeroOne(t))
      expect(logLoss(t)).toBeGreaterThanOrEqual(zeroOne(t))
      if (t >= 1) expect(hinge(t)).toBe(0)
      expect(logLoss(t)).toBeGreaterThan(0)
    }
  })

  it('reads a hand-made line: w = (1, 0), b = 0', () => {
    const line: Line = { w: [1, 0], b: 0 }
    expect(widthOf(line)).toBe(2)
    expect(score(line, { x1: 0.5, x2: 3, y: 1 })).toBe(0.5)
    expect(slack(line, { x1: 0.5, x2: 3, y: 1 })).toBe(0.5)
    expect(slack(line, { x1: -2, x2: 0, y: 1 })).toBe(3)
    expect(slack(line, { x1: -2, x2: 0, y: -1 })).toBe(0)
    expect(objective(line, [{ x1: 0.5, x2: 3, y: 1 }, { x1: -2, x2: 0, y: 1 }], 2)).toBe(0.5 + 2 * 3.5)
  })
})

// ---- The solver ---------------------------------------------------------

describe('the solver', () => {
  const pair: Point[] = [
    { x1: -1, x2: 0, y: -1 },
    { x1: 1, x2: 0, y: 1 },
  ]

  it('solves two points by hand: w = 2C until the street reaches them, then w = 1', () => {
    // ½w² + 2C·max(0, 1 − w) is least at w = 2C while 2C < 1
    const low = solve(pair, 0.25).line
    expect(low.w[0]).toBeCloseTo(0.5, 6)
    expect(low.w[1]).toBeCloseTo(0, 6)
    expect(low.b).toBeCloseTo(0, 6)
    expect(slack(low, pair[0])).toBeCloseTo(0.5, 6)
    const high = solve(pair, 5).line
    expect(high.w[0]).toBeCloseTo(1, 6)
    expect(widthOf(high)).toBeCloseTo(2, 6)
  })

  it('approaches the hard margin as C grows, on separable data', () => {
    let checked = 0
    for (let seed = 1; seed <= 40; seed++) {
      const points = apart(seed)
      const hard = hardMargin(points)
      if (!hard) continue
      checked++
      const gap = hullGap(points)
      expect(widthOf(hard)).toBeCloseTo(gap, 4)
      // Wider with a small C, closing in on the hard street as C grows
      const widths = [0.01, 0.1, 1, 10, 1000].map((C) => widthOf(solve(points, C).line))
      for (let k = 1; k < widths.length; k++) expect(widths[k]).toBeLessThanOrEqual(widths[k - 1] + 1e-6)
      expect(widths[0]).toBeGreaterThan(gap)
      expect(widths.at(-1)!).toBeCloseTo(gap, 4)
    }
    expect(checked).toBeGreaterThan(25)
  })

  it('never lets its objective go up, and ends where the primal meets the dual', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const points = cloud(seed, 10)
      for (const C of [0.05, 1, 20]) {
        const { line, alpha, dual } = solve(points, C, { trace: true })
        for (let k = 1; k < dual!.length; k++) expect(dual![k]).toBeLessThanOrEqual(dual![k - 1] + 1e-12)
        expect(dual!.at(-1)).toBeCloseTo(dualObjective(points, alpha), 8)
        // Strong duality: the primal's least value is minus the dual's
        const primal = objective(line, points, C)
        expect(Math.abs(primal + dual!.at(-1)!)).toBeLessThan(1e-5 * Math.max(1, primal))
      }
    }
  })

  it('beats every nearby line and a slow subgradient descent, on random data', () => {
    const random = seeded(7)
    for (let seed = 1; seed <= 8; seed++) {
      const points = cloud(seed, 8)
      const C = [0.1, 1, 5][seed % 3]
      const { line } = solve(points, C)
      const best = objective(line, points, C)
      for (let k = 0; k < 300; k++) {
        const s = 0.2 * random()
        const near: Line = {
          w: [line.w[0] + s * (random() - 0.5), line.w[1] + s * (random() - 0.5)],
          b: line.b + s * (random() - 0.5),
        }
        expect(objective(near, points, C)).toBeGreaterThanOrEqual(best - 1e-9)
      }
      const slow = objective(subgradient(points, C), points, C)
      expect(slow).toBeGreaterThanOrEqual(best - 1e-9)
      expect(slow).toBeLessThan(best * 1.01 + 1e-3)
    }
  })

  it('gives every point a slack equal to its hinge loss, and weights that match where it stands', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const points = cloud(seed, 10)
      const C = 0.5
      const { line, alpha } = solve(points, C)
      const tol = 1e-4
      let balance = 0
      const w: [number, number] = [0, 0]
      points.forEach((p, i) => {
        const t = signedScore(line, p)
        const xi = slack(line, p)
        // The least slack that meets yᵢf(xᵢ) ≥ 1 − ξᵢ and ξᵢ ≥ 0 is the hinge
        expect(xi).toBe(hinge(t))
        expect(t).toBeGreaterThanOrEqual(1 - xi - 1e-12)
        if (xi > 1e-3) expect(t).toBeLessThan(1 - (xi - 1e-3))
        // α = 0: clear of the street; 0 < α < C: on its curb; α = C: may pay
        if (alpha[i] < 1e-9) expect(t).toBeGreaterThan(1 - tol)
        else if (alpha[i] > C - 1e-9) expect(t).toBeLessThan(1 + tol)
        else expect(t).toBeCloseTo(1, 3)
        // Anyone who pays is held at the top of the box
        if (xi > tol) expect(alpha[i]).toBeCloseTo(C, 9)
        balance += alpha[i] * p.y
        w[0] += alpha[i] * p.y * p.x1
        w[1] += alpha[i] * p.y * p.x2
      })
      expect(balance).toBeCloseTo(0, 9)
      expect(w[0]).toBeCloseTo(line.w[0], 9)
      expect(w[1]).toBeCloseTo(line.w[1], 9)
      // The slacks add to at least the number of mistakes
      const { errors, tolls } = tally(line, points, C)
      expect(tolls / C).toBeGreaterThanOrEqual(errors)
    }
  })
})

// ---- The drawing helpers -------------------------------------------------

describe('the street as drawn', () => {
  it('turns a line into a road and back', () => {
    const line: Line = { w: [0.6, -0.8], b: 0.3 }
    const road = roadOf(line)
    expect(road.half).toBeCloseTo(1, 12)
    const back = lineOf(road)
    expect(back.w[0]).toBeCloseTo(0.6, 12)
    expect(back.w[1]).toBeCloseTo(-0.8, 12)
    expect(back.b).toBeCloseTo(0.3, 12)
    const other = roadOf({ w: [2, 0], b: -1 })
    expect(between(road, other, 0)).toEqual(road)
    expect(between(road, other, 1).half).toBeCloseTo(0.5, 12)
  })

  it('puts a paying point’s foot on its own curb', () => {
    const line = STORY.soft
    for (const { p } of STORY.paying) {
      const [x1, x2] = curbFoot(line, p)
      expect(signedScore(line, { x1, x2, y: p.y })).toBeCloseTo(1, 9)
      expect(Math.hypot(x1 - p.x1, x2 - p.x2)).toBeCloseTo(slack(line, p) / normOf(line), 9)
    }
  })
})

// ---- The numbers the page states ----------------------------------------

describe('the page’s numbers', () => {
  it('tells the story’s roads', () => {
    expect(STORY.impossible).toBeNull()
    expect(STORY.numbers).toEqual({
      firstWide: 31,
      squeezedWide: 19,
      turned: 28,
      softWide: 38,
      softTurned: 0,
      tolls: [expect.closeTo(0.379, 3), expect.closeTo(0.379, 3), expect.closeTo(0.851, 3), expect.closeTo(2.078, 3)],
      highWide: 21,
      highTurned: 13,
      highPaying: 2,
      lowWide: 75,
      lowPaying: 14,
    })
    // The near house is on the road but on its own side; the deep one across
    const near = STORY.paying.find(({ p }) => p.x1 === 0.2)!
    expect(near.toll).toBeGreaterThan(0)
    expect(near.toll).toBeLessThan(1)
    expect(STORY.paying.find(({ p }) => p.x1 === 2.4 && p.y === -1)!.toll).toBeGreaterThan(1)
  })

  it('works the check: C = 2 and y·f(x) = −0.5 add 3', () => {
    expect(hinge(-0.5)).toBe(1.5)
    expect(QUIZ_COST).toBe(3)
  })

  it('gives the lab caption its turns: 29° at C = 1, 50° at 100, 5° at 0.01 with 32 of 33 in the street', () => {
    expect(LAB.length + 1).toBe(33)
    expect(LAB_SHOWN.map((r) => r.C)).toEqual([0.01, 1, 100])
    expect(LAB_SHOWN.map((r) => Math.round(r.turned))).toEqual([5, 29, 50])
    expect(LAB_SHOWN[0].violations).toBe(32)
  })

  it('opens the lab with an overlap, and the odd point dragging harder as C grows', () => {
    expect(hardMargin(LAB)).toBeNull()
    const turns = [0.01, 1, 100].map((C) => labRun(ODD_START, C).turned)
    expect(turns[0]).toBeLessThan(turns[1])
    expect(turns[1]).toBeLessThan(turns[2])
    const opening = labRun(ODD_START, 1)
    expect(opening.tally.errors).toBeGreaterThan(0)
  })
})
