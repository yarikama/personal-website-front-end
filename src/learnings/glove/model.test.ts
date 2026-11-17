import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  analogy,
  BASKETS,
  BIAS,
  CHECK_PROFILES,
  CHECK_WEIGHTS,
  CLIP_LOGS,
  CONTEXTS,
  COUNTS,
  DRAWN,
  EVENED,
  FITS,
  fitGlove,
  forDrawing,
  gloveLoss,
  ICE_STEAM,
  leanTowardHe,
  QUESTIONS,
  ratioPosition,
  rowAnalogy,
  TARGETS,
  WATER_OVER_SOLID,
  weight,
  WORKED_WEIGHTS,
  type Target,
  type Vec,
} from './model'

// The eigenvalues of a symmetric matrix, by Jacobi rotations: the reference
// the fitted vectors are checked against
function eigenvalues(matrix: number[][]): number[] {
  const a = matrix.map((row) => [...row])
  const n = a.length
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += a[p][q] ** 2
    if (off < 1e-24) break
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        if (Math.abs(a[p][q]) < 1e-30) continue
        const theta = (a[q][q] - a[p][p]) / (2 * a[p][q])
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1))
        const cos = 1 / Math.sqrt(t * t + 1)
        const sin = t * cos
        for (let k = 0; k < n; k++) {
          const akp = a[k][p]
          const akq = a[k][q]
          a[k][p] = cos * akp - sin * akq
          a[k][q] = sin * akp + cos * akq
        }
        for (let k = 0; k < n; k++) {
          const apk = a[p][k]
          const aqk = a[q][k]
          a[p][k] = cos * apk - sin * aqk
          a[q][k] = sin * apk + cos * aqk
        }
      }
    }
  }
  return a.map((row, i) => row[i]).sort((x, y) => y - x)
}

// With every pair weighted the same, the best fit of v · u + b + c to a full
// table of logs is known in closed form: take out the row and column means,
// and keep the top `dims` singular values. The error left is the sum of the
// squares of the rest.
function bestUnweightedLoss(counts: number[][], dims: number) {
  const logs = counts.map((row) => row.map(Math.log))
  const rows = logs.length
  const cols = logs[0].length
  const rowMean = logs.map((row) => row.reduce((a, b) => a + b, 0) / cols)
  const colMean = logs[0].map((_, j) => logs.reduce((a, row) => a + row[j], 0) / rows)
  const all = rowMean.reduce((a, b) => a + b, 0) / rows
  const centred = logs.map((row, i) => row.map((x, j) => x - rowMean[i] - colMean[j] + all))
  const gram = centred[0].map((_, p) => centred[0].map((_, q) => centred.reduce((a, row) => a + row[p] * row[q], 0)))
  return eigenvalues(gram)
    .slice(dims)
    .reduce((a, b) => a + Math.max(0, b), 0)
}

const distance = (p: Vec, q: Vec) => Math.hypot(...p.map((x, k) => x - q[k]))

describe('the story and the paper', () => {
  it('divides each basket’s shares', () => {
    expect(BASKETS.map((row) => row.ratio)).toEqual([1.2, 8, 0.1, 1])
  })

  it('quotes ratios that match the paper’s rounded probabilities', () => {
    for (const row of ICE_STEAM) expect(row.first / row.second / row.ratio).toBeCloseTo(1, 0)
    for (const row of ICE_STEAM) expect(Math.abs(row.first / row.second - row.ratio) / row.ratio).toBeLessThan(0.05)
  })

  it('puts water about 16 times as often as solid near ice', () => {
    expect(WATER_OVER_SOLID).toBeCloseTo(15.8, 1)
  })

  it('places ratios on a log axis centred on 1', () => {
    expect(ratioPosition(1)).toBe(0.5)
    expect(ratioPosition(20)).toBeCloseTo(1)
    expect(ratioPosition(1 / 20)).toBeCloseTo(0)
    expect(ratioPosition(1000)).toBeCloseTo(1)
    expect(ratioPosition(4) - 0.5).toBeCloseTo(0.5 - ratioPosition(1 / 4))
  })

  it('logs the ratios the clip drops in', () => {
    expect(CLIP_LOGS.map((l) => l.log.toFixed(2))).toEqual(['2.19', '-2.47', '0.31'])
  })
})

describe('the weighting', () => {
  it('matches hand-worked weights', () => {
    expect(WORKED_WEIGHTS.map((w) => w.weight.toFixed(2))).toEqual(['0.03', '0.18', '1.00'])
    expect(weight(0)).toBe(0)
    expect(CHECK_WEIGHTS.rare).toBeCloseTo(0.503, 3)
    expect(CHECK_WEIGHTS.common).toBe(1)
    expect(CHECK_WEIGHTS.common / CHECK_WEIGHTS.rare).toBeCloseTo(2, 0)
  })

  it('rises to 1 at the cap, then stays there', () => {
    const random = seeded(3)
    for (let i = 0; i < 500; i++) {
      const x = random() * 300
      const y = x + random() * 50
      expect(weight(y)).toBeGreaterThanOrEqual(weight(x))
      expect(weight(x)).toBeLessThanOrEqual(1)
    }
    expect(weight(99.999)).toBeCloseTo(1, 4)
  })
})

describe('fitting GloVe', () => {
  it('scores a perfect fit at zero', () => {
    // A table built from known vectors and biases is fitted with no miss
    const v = [[1, 0], [0, 2]]
    const u = [[0.5, 1], [1, -1]]
    const b = [0.2, 0.1]
    const c = [1, 2]
    const counts = v.map((vi, i) => u.map((uj, j) => Math.exp(vi[0] * uj[0] + vi[1] * uj[1] + b[i] + c[j])))
    expect(gloveLoss(counts, { v, u, b, c })).toBeCloseTo(0, 12)
  })

  it('reaches the closed-form best when every pair weighs the same', () => {
    const flat = () => 1
    expect(fitGlove(COUNTS, { weigh: flat, steps: 20_000, rate: 0.02 }).loss).toBeCloseTo(bestUnweightedLoss(COUNTS, 2), 4)
    const random = seeded(11)
    for (let trial = 0; trial < 6; trial++) {
      const table = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => 1 + Math.floor(random() * 60)))
      const fit = fitGlove(table, { weigh: flat, steps: 20_000, rate: 0.02, seed: trial })
      expect(fit.loss).toBeCloseTo(bestUnweightedLoss(table, 2), 3)
    }
  })

  it('has settled: running longer changes nothing', () => {
    expect(fitGlove(COUNTS, { steps: 30_000, rate: 0.02 }).loss).toBeCloseTo(FITS['As counted'].loss, 6)
  })

  it('does better on its own weighted loss than the unweighted fit does', () => {
    const plain = fitGlove(COUNTS, { weigh: () => 1, steps: 20_000, rate: 0.02 })
    expect(FITS['As counted'].loss).toBeLessThan(gloveLoss(COUNTS, plain))
  })
})

describe('the drawing', () => {
  it('only turns and mirrors: every distance stays', () => {
    const v = FITS['As counted'].v
    const drawn = forDrawing(v)
    for (let i = 0; i < v.length; i++) for (let j = 0; j < v.length; j++) {
      expect(distance(drawn[i], drawn[j])).toBeCloseTo(distance(v[i], v[j]), 9)
    }
    const random = seeded(5)
    for (let trial = 0; trial < 50; trial++) {
      const points = TARGETS.map(() => [random() * 4 - 2, random() * 4 - 2])
      const turned = forDrawing(points)
      expect(distance(turned[0], turned[3])).toBeCloseTo(distance(points[0], points[3]), 9)
    }
  })

  it('points man → woman up and man → king right', () => {
    for (const drawn of Object.values(DRAWN)) {
      const at = (w: Target) => drawn[TARGETS.indexOf(w)]
      expect(at('woman')[0] - at('man')[0]).toBeCloseTo(0, 9)
      expect(at('woman')[1]).toBeGreaterThan(at('man')[1])
      expect(at('king')[0]).toBeGreaterThan(at('man')[0])
    }
  })
})

describe('analogies', () => {
  it('finds queen, woman and nurse', () => {
    expect(QUESTIONS.map((q) => analogy(DRAWN['As counted'], q.a, q.b, q.c).ranked[0].word)).toEqual(['queen', 'woman', 'nurse'])
  })

  it('agrees with the rows of logs the vectors were fitted to', () => {
    for (const [table, drawn] of [
      [COUNTS, DRAWN['As counted']],
      [EVENED, DRAWN['Evened out']],
    ] as const) {
      for (const q of QUESTIONS) {
        expect(analogy(drawn, q.a, q.b, q.c).ranked[0].word).toBe(rowAnalogy(table, q.a, q.b, q.c)[0].word)
      }
    }
  })

  it('matches a brute-force search on random vectors', () => {
    const random = seeded(17)
    for (let trial = 0; trial < 200; trial++) {
      const vectors = TARGETS.map(() => [random(), random(), random()].map((x) => 4 * x - 2))
      const [a, b, c] = [0, 1, 2].map(() => TARGETS[Math.floor(random() * TARGETS.length)])
      if (new Set([a, b, c]).size < 3) continue
      const found = analogy(vectors, a, b, c)
      let best: Target | null = null
      let bestDistance = Infinity
      for (const word of TARGETS) {
        if (word === a || word === b || word === c) continue
        const i = TARGETS.indexOf(word)
        const point = vectors[TARGETS.indexOf(b)].map((x, k) => x - vectors[TARGETS.indexOf(a)][k] + vectors[TARGETS.indexOf(c)][k])
        const d = distance(vectors[i], point)
        if (d < bestDistance) [best, bestDistance] = [word, d]
      }
      expect(found.ranked[0].word).toBe(best)
      expect(found.ranked[0].distance).toBeCloseTo(bestDistance, 9)
    }
  })

  it('leans doctor toward he and nurse toward she, and loses the fit once evened out', () => {
    expect(leanTowardHe(COUNTS, 'doctor')).toBe(2.5)
    expect(leanTowardHe(COUNTS, 'nurse')).toBeCloseTo(1 / 7)
    expect(leanTowardHe(EVENED, 'doctor')).toBe(1)
    const evened = DRAWN['Evened out']
    expect(distance(evened[TARGETS.indexOf('doctor')], evened[TARGETS.indexOf('nurse')])).toBeLessThan(1e-3)
    expect(BIAS.evenedMiss).toBeGreaterThan(2 * BIAS.biasedMiss)
  })

  it('keeps every count at least 1, so every ratio exists', () => {
    for (const table of [COUNTS, EVENED]) {
      expect(table).toHaveLength(TARGETS.length)
      for (const row of table) {
        expect(row).toHaveLength(CONTEXTS.length)
        for (const x of row) expect(x).toBeGreaterThanOrEqual(1)
      }
    }
  })
})

describe('check yourself', () => {
  it('gives the two pairs nearly the same log ratios', () => {
    CHECK_PROFILES.parisRome.forEach((ratio, k) => {
      expect(Math.abs(Math.log(ratio) - Math.log(CHECK_PROFILES.franceItaly[k]))).toBeLessThan(0.1)
    })
  })
})
