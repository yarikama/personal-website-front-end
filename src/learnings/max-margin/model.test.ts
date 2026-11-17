import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  CHECK,
  CHECK_POINTS,
  FAR,
  functionalMargin,
  gap,
  HOUSES,
  INSIDE,
  KERB_HOUSES,
  labPoints,
  maxMargin,
  norm,
  perceptron,
  ROAD_A,
  ROAD_B,
  ROAD_C,
  separates,
  supportVectors,
  width,
  WITH_INSIDE,
  WITHOUT_FAR,
  type Line,
  type Point,
} from './model'

const close = (a: Line, b: Line) => {
  expect(a.w[0]).toBeCloseTo(b.w[0], 9)
  expect(a.w[1]).toBeCloseTo(b.w[1], 9)
  expect(a.b).toBeCloseTo(b.b, 9)
}

// The widest street by brute force: half the gap between the classes
// measured along a direction, tried for 3,600 directions, then finely
// around the best of them
function sweep(points: Point[]) {
  const along = (a: number) => {
    const s = points.map((p) => Math.cos(a) * p.x + Math.sin(a) * p.y)
    const pos = Math.min(...s.filter((_, i) => points[i].label === 1))
    const neg = Math.max(...s.filter((_, i) => points[i].label === -1))
    return (pos - neg) / 2
  }
  const step = (2 * Math.PI) / 3600
  let best = -Infinity
  let at = 0
  for (let k = 0; k < 3600; k++) {
    const v = along(k * step)
    if (v > best) [best, at] = [v, k * step]
  }
  for (let k = -4000; k <= 4000; k++) best = Math.max(best, along(at + (k * step) / 1000))
  return best
}

// Random clouds of a few points each, separable or not
function cloud(random: () => number): Point[] {
  const n = 3 + Math.floor(random() * 8)
  const shift = random() * 30
  return Array.from({ length: n }, (_, i) => {
    const label = i % 2 ? 1 : -1
    return { x: random() * 50 + (label === 1 ? shift : 0), y: random() * 40, label } as Point
  })
}

describe('the hard-margin SVM, worked by hand', () => {
  it('puts the line halfway between two points, at right angles', () => {
    const line = maxMargin([
      { x: 0, y: 0, label: -1 },
      { x: 4, y: 0, label: 1 },
    ])!
    close(line, { w: [0.5, 0], b: -1 })
    expect(width(line)).toBeCloseTo(4, 12)
  })

  it('rests on two points of one class and one of the other', () => {
    // Edges y = 2 (sage, through two points) and y = 0 (ink): the line is y = 1
    const points: Point[] = [
      { x: 0, y: 2, label: 1 },
      { x: 6, y: 2, label: 1 },
      { x: 3, y: 0, label: -1 },
      { x: 3, y: 5, label: 1 },
    ]
    const line = maxMargin(points)!
    close(line, { w: [0, 1], b: -1 })
    expect(supportVectors(line, points)).toEqual([0, 1, 2])
  })

  it('finds no street when the classes overlap', () => {
    expect(
      maxMargin([
        { x: 0, y: 0, label: 1 },
        { x: 2, y: 0, label: -1 },
        { x: 4, y: 0, label: 1 },
      ]),
    ).toBeNull()
  })
})

describe('the hard-margin SVM, on seeded random points', () => {
  const random = seeded(642)
  const cases = Array.from({ length: 300 }, () => cloud(random))
  const solved = cases.map((points) => ({ points, line: maxMargin(points) }))

  it('keeps every point at least 1 out: y(w·x + b) ≥ 1', () => {
    for (const { points, line } of solved) {
      if (!line) continue
      for (const p of points) expect(functionalMargin(line, p)).toBeGreaterThanOrEqual(1 - 1e-7)
    }
  })

  it('is at least as wide as the widest street a sweep of directions finds, and no wider', () => {
    let separable = 0
    for (const { points, line } of solved) {
      const best = sweep(points)
      if (!line) {
        expect(best).toBeLessThanOrEqual(1e-9)
        continue
      }
      separable++
      expect(1 / norm(line)).toBeGreaterThanOrEqual(best - 1e-9)
      expect(1 / norm(line)).toBeLessThanOrEqual(best + 1e-4)
    }
    expect(separable).toBeGreaterThan(100)
  })

  it('does not move when a point off its edges is deleted', () => {
    for (const { points, line } of solved) {
      if (!line) continue
      const support = supportVectors(line, points)
      points.forEach((_, i) => {
        if (support.includes(i)) return
        close(maxMargin(points.filter((_, j) => j !== i))!, line)
      })
    }
  })

  it('is decided by the points on its edges alone', () => {
    for (const { points, line } of solved) {
      if (!line) continue
      close(maxMargin(supportVectors(line, points).map((i) => points[i]))!, line)
    }
  })

  it('is never narrower than the perceptron’s line leaves', () => {
    let settled = 0
    let separable = 0
    for (const { points, line } of solved) {
      if (!line) continue
      separable++
      // On a thin street the perceptron can take many passes to settle
      const p = perceptron(points)
      if (!p) continue
      settled++
      expect(separates(p, points)).toBe(true)
      expect(2 * gap(p, points)).toBeLessThanOrEqual(width(line) + 1e-9)
    }
    expect(settled).toBeGreaterThan(0.9 * separable)
  })

  it('has a street for every lab drawing', () => {
    for (let seed = 1; seed < 60; seed++) {
      const points = labPoints(seed)
      expect(points).toHaveLength(14)
      expect(width(maxMargin(points)!)).toBeGreaterThanOrEqual(8 - 1e-9)
    }
  })
})

describe('the page’s numbers', () => {
  it('the three roads: 8 m, 12 m and 20 m', () => {
    expect(norm(ROAD_A)).toBeCloseTo(0.25, 12)
    expect(width(ROAD_A)).toBeCloseTo(8, 9)
    expect(gap(ROAD_A, HOUSES)).toBeCloseTo(4, 9)
    expect(norm(ROAD_B)).toBeCloseTo(1 / 6, 12)
    expect(width(ROAD_B)).toBeCloseTo(12, 9)
    expect(gap(ROAD_B, HOUSES)).toBeCloseTo(6, 9)
    close(ROAD_C, { w: [0.08, 0.06], b: -6 })
    expect(norm(ROAD_C)).toBeCloseTo(0.1, 12)
    expect(width(ROAD_C)).toBeCloseTo(20, 9)
    for (const road of [ROAD_A, ROAD_B, ROAD_C]) expect(separates(road, HOUSES)).toBe(true)
  })

  it('road C rests on three houses, and the far house is not one', () => {
    expect(KERB_HOUSES).toEqual([0, 1, 6])
    expect(KERB_HOUSES).not.toContain(FAR)
    close(WITHOUT_FAR, ROAD_C)
  })

  it('a house built inside the street narrows it to 17.4 m', () => {
    expect(functionalMargin(ROAD_C, INSIDE)).toBeGreaterThan(0)
    expect(functionalMargin(ROAD_C, INSIDE)).toBeLessThan(1)
    expect(width(WITH_INSIDE)).toBeCloseTo(17.38, 2)
    expect(supportVectors(WITH_INSIDE, [...HOUSES, INSIDE])).toContain(HOUSES.length)
  })

  it('check yourself: ‖w‖ = 0.5, decided by two of the three points', () => {
    close(CHECK, { w: [0.5, 0], b: -1 })
    expect(supportVectors(CHECK, CHECK_POINTS)).toEqual([0, 1])
    expect(width(CHECK)).toBeCloseTo(4, 12)
  })
})
