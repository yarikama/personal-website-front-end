import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  ALONG,
  BODIES,
  BODY_COMPONENTS,
  centred,
  CHECK_VALUES,
  cloud,
  covariance,
  dot,
  eigen2,
  END,
  enoughFor,
  explained,
  FRONT,
  kept,
  LOAF,
  LOAF_COV,
  LOAF_TOTAL,
  loafKept,
  loafMissed,
  missed,
  normal,
  standardised,
  times,
  topComponents,
  total,
  unit,
  varianceAlong,
  WORKED,
  type Matrix,
  type Vec,
} from './model'

// A seeded cloud of n points in d dimensions, mixed so its features lean on
// each other, and shifted off the origin
function randomCloud(random: () => number, n: number, d: number): Vec[] {
  const mix = Array.from({ length: d }, () => Array.from({ length: d }, () => normal(random)))
  const shift = Array.from({ length: d }, () => 5 * normal(random))
  return Array.from({ length: n }, () => {
    const z = Array.from({ length: d }, () => normal(random))
    return times(mix, z).map((x, j) => x + shift[j])
  })
}

// The angle between two directions, ignoring which way each points
const apart = (a: number, b: number) => {
  const gap = Math.abs(a - b) % 180
  return Math.min(gap, 180 - gap)
}

describe('covariance', () => {
  it('matches a hand-worked case: (2,2), (−2,−2), (1,−1), (−1,1) give [[2.5, 1.5], [1.5, 2.5]]', () => {
    const cov = covariance([
      [2, 2],
      [-2, -2],
      [1, -1],
      [-1, 1],
    ])
    expect(cov[0][0]).toBeCloseTo(2.5, 12)
    expect(cov[0][1]).toBeCloseTo(1.5, 12)
    expect(cov[1][1]).toBeCloseTo(2.5, 12)
    // Its directions: 45° carries 4, 135° carries 1
    const { values, angle } = eigen2(cov)
    expect(values[0]).toBeCloseTo(4, 12)
    expect(values[1]).toBeCloseTo(1, 12)
    expect(angle).toBeCloseTo(45, 10)
  })

  it('does not care where the points sit', () => {
    const points = randomCloud(seeded(1), 50, 3)
    const a = covariance(points)
    const b = covariance(centred(points))
    for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) expect(a[j][k]).toBeCloseTo(b[j][k], 9)
  })

  it('gives every standardised feature a variance of 1', () => {
    const cov = covariance(standardised(BODIES))
    cov.forEach((row, j) => expect(row[j]).toBeCloseTo(1, 10))
  })
})

describe('the 2 × 2 closed form', () => {
  it('finds the loaf’s directions: 9 at 45°, 1 at 135°', () => {
    const { values, angle, vectors } = eigen2(LOAF_COV)
    expect(values).toEqual([9, 1])
    expect(angle).toBeCloseTo(45, 12)
    expect(dot(vectors[0], vectors[1])).toBeCloseTo(0, 12)
  })

  it('reads a diagonal matrix straight off: [[1, 0], [0, 4]] stretches y most', () => {
    const { values, angle } = eigen2([
      [1, 0],
      [0, 4],
    ])
    expect(values).toEqual([4, 1])
    expect(angle).toBeCloseTo(90, 12)
  })

  it('satisfies Σv = λv on random covariances', () => {
    const random = seeded(3)
    for (let trial = 0; trial < 200; trial++) {
      const cov = covariance(randomCloud(random, 30, 2))
      const { values, vectors } = eigen2(cov)
      for (const i of [0, 1]) {
        const stretched = times(cov, vectors[i])
        stretched.forEach((x, j) => expect(x).toBeCloseTo(values[i] * vectors[i][j], 9))
      }
    }
  })

  it('is the direction of most variance, against a sweep of every angle', () => {
    const random = seeded(4)
    for (let trial = 0; trial < 200; trial++) {
      const cov = covariance(randomCloud(random, 40, 2))
      let most = -Infinity
      let mostAt = 0
      let least = Infinity
      for (let a = 0; a < 180; a += 0.01) {
        const v = varianceAlong(cov, unit(a))
        if (v > most) [most, mostAt] = [v, a]
        least = Math.min(least, v)
      }
      const { values, angle } = eigen2(cov)
      expect(values[0]).toBeGreaterThanOrEqual(most - 1e-9)
      expect(values[0]).toBeCloseTo(most, 6)
      expect(values[1]).toBeCloseTo(least, 6)
      // Unless the cloud is nearly round, the best angle is the same one
      if (values[0] - values[1] > 0.05 * values[0]) expect(apart(mostAt, angle)).toBeLessThan(0.05)
    }
  })
})

describe('kept and missed', () => {
  it('kept along u is uᵀΣu, straight from the shadows', () => {
    const random = seeded(5)
    for (let trial = 0; trial < 100; trial++) {
      const points = randomCloud(random, 25, 2)
      const u = unit(180 * random())
      expect(kept(points, u)).toBeCloseTo(varianceAlong(covariance(points), u), 9)
    }
  })

  it('kept + missed = total, for any line through the middle', () => {
    const random = seeded(6)
    for (let trial = 0; trial < 200; trial++) {
      const points = randomCloud(random, 30, 2)
      const u = unit(180 * random())
      expect(kept(points, u) + missed(points, [u])).toBeCloseTo(total(covariance(points)), 9)
    }
  })

  it('misses exactly the dropped eigenvalues, and no k directions miss less', () => {
    const random = seeded(7)
    for (let trial = 0; trial < 30; trial++) {
      const points = randomCloud(random, 60, 4)
      const cov = covariance(points)
      const { values, vectors } = topComponents(cov)
      for (let k = 1; k <= 4; k++) {
        const dropped = values.slice(k).reduce((a, b) => a + b, 0)
        expect(missed(points, vectors.slice(0, k))).toBeCloseTo(dropped, 7)
      }
      // Any other single direction misses at least as much
      for (let probe = 0; probe < 20; probe++) {
        const z = Array.from({ length: 4 }, () => normal(random))
        const u = z.map((x) => x / Math.sqrt(dot(z, z)))
        expect(missed(points, [u])).toBeGreaterThanOrEqual(values.slice(1).reduce((a, b) => a + b, 0) - 1e-9)
      }
    }
  })
})

describe('power iteration', () => {
  it('matches the closed form on 2 × 2 covariances', () => {
    const random = seeded(8)
    for (let trial = 0; trial < 200; trial++) {
      const cov = covariance(randomCloud(random, 20, 2))
      const closed = eigen2(cov)
      const found = topComponents(cov, 2, trial + 1)
      expect(found.values[0]).toBeCloseTo(closed.values[0], 8)
      expect(found.values[1]).toBeCloseTo(closed.values[1], 8)
      if (closed.values[0] - closed.values[1] > 1e-3) {
        expect(Math.abs(dot(found.vectors[0], closed.vectors[0]))).toBeCloseTo(1, 8)
      }
    }
  })

  it('finds orthonormal eigenvectors whose eigenvalues add to the total', () => {
    const random = seeded(9)
    for (let trial = 0; trial < 30; trial++) {
      const cov: Matrix = covariance(randomCloud(random, 80, 6))
      const { values, vectors } = topComponents(cov)
      expect(values.reduce((a, b) => a + b, 0)).toBeCloseTo(total(cov), 8)
      for (let i = 0; i < 6; i++) {
        if (i > 0) expect(values[i]).toBeLessThanOrEqual(values[i - 1] + 1e-9)
        times(cov, vectors[i]).forEach((x, j) => expect(x).toBeCloseTo(values[i] * vectors[i][j], 6))
        for (let k = 0; k < 6; k++) expect(dot(vectors[i], vectors[k])).toBeCloseTo(i === k ? 1 : 0, 8)
      }
    }
  })
})

describe('the numbers the page states', () => {
  it('the guess: on a 45° cloud of 9 and 1, x keeps half and the best direction 90%', () => {
    expect(varianceAlong(LOAF_COV, unit(0)) / LOAF_TOTAL).toBeCloseTo(0.5, 12)
    expect(eigen2(LOAF_COV).values[0] / LOAF_TOTAL).toBeCloseTo(0.9, 12)
  })

  it('the loaf’s seeds have exactly the covariance [[5, 4], [4, 5]]', () => {
    const cov = covariance(LOAF)
    expect(cov[0][0]).toBeCloseTo(5, 10)
    expect(cov[0][1]).toBeCloseTo(4, 10)
    expect(cov[1][1]).toBeCloseTo(5, 10)
    expect(LOAF_TOTAL).toBe(10)
  })

  it('the story: the front gives 5, the end 1, along the loaf 9, and kept + missed is always 10', () => {
    expect(loafKept(FRONT)).toBeCloseTo(5, 10)
    expect(loafKept(END)).toBeCloseTo(1, 10)
    expect(loafKept(ALONG)).toBeCloseTo(9, 10)
    expect(loafMissed(ALONG)).toBeCloseTo(1, 10)
    for (let a = 0; a < 360; a += 7) expect(loafKept(a) + loafMissed(a)).toBeCloseTo(10, 10)
  })

  it('the worked numbers: 5 + 4 sin 2θ at 0°, 30° and 45°', () => {
    expect(WORKED.map((w) => w.angle)).toEqual([0, 30, 45])
    expect(WORKED[0].kept).toBeCloseTo(5, 12)
    expect(WORKED[1].kept).toBeCloseTo(5 + 2 * Math.sqrt(3), 12)
    expect(WORKED[1].kept.toFixed(1)).toBe('8.5')
    expect(WORKED[1].missed.toFixed(1)).toBe('1.5')
    expect(WORKED[2].kept).toBeCloseTo(9, 12)
    expect(WORKED[2].missed).toBeCloseTo(1, 12)
  })

  it('the lab: PC 1 sits within a few degrees of the tilt once the cloud is stretched', () => {
    const { angle } = eigen2(covariance(cloud(3, 30)))
    expect(apart(angle, 30)).toBeLessThan(5)
    expect(cloud(3, 30)).toHaveLength(160)
  })

  it('the quick check: a round cloud’s best direction keeps only about half', () => {
    const cov = covariance(cloud(1, 30))
    const share = eigen2(cov).values[0] / total(cov)
    expect(share).toBeGreaterThan(0.5)
    expect(share).toBeLessThan(0.6)
  })

  it('the bodies: standardised, two components keep 93%; PC 1 is size, PC 2 build', () => {
    const { values, vectors } = BODY_COMPONENTS.Standardised
    const shares = explained(values)
    expect(Math.round(100 * shares[1].cumulative)).toBe(93)
    // Size: all six on the same side, none small
    const sign = Math.sign(vectors[0][0])
    for (const x of vectors[0]) expect(sign * x).toBeGreaterThan(0.2)
    // Build: weight and waist one way, the four lengths the other
    const w = Math.sign(vectors[1][4])
    expect(w * vectors[1][5]).toBeGreaterThan(0)
    for (const j of [0, 1, 2, 3]) expect(w * vectors[1][j]).toBeLessThan(0)
  })

  it('the bodies as measured: weight in grams takes nearly all of the first component', () => {
    const { values, vectors } = BODY_COMPONENTS['As measured']
    expect(explained(values)[0].share).toBeGreaterThan(0.9999)
    expect(Math.abs(vectors[0][4])).toBeGreaterThan(0.9999)
  })

  it('check yourself: 5, 3, 1.5 and 0.5 need three components for 90%', () => {
    expect(explained(CHECK_VALUES).map((e) => e.cumulative)).toEqual([0.5, 0.8, 0.95, 1])
    expect(enoughFor(CHECK_VALUES, 0.9)).toBe(3)
  })
})
