import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  accuracy,
  BEST_STRAIGHT,
  bestCutAt,
  CHERRIES,
  CLIP_X,
  CLIP_Y,
  COSTS,
  CUT,
  CUTS,
  cutAt,
  SWEEP_ANGLES,
  SWEEP_REACH,
  dot,
  eigenvalues,
  featureCount,
  gaussianKernel,
  GRAPES,
  kernelMatrix,
  labFit,
  lift,
  linearKernel,
  moons,
  pairProducts,
  polynomialKernel,
  rings,
  score,
  SPAM_PAIRS,
  squares2,
  train,
  type Kernel,
  type Point,
} from './model'

const vector = (random: () => number, d: number) => Array.from({ length: d }, () => 4 * random() - 2)

describe('the polynomial kernel', () => {
  it('works the clip’s example both ways: (1·3 + 2·1)² = 25 = 9 + 12 + 4', () => {
    expect(dot(CLIP_X, CLIP_Y) ** 2).toBe(25)
    expect(squares2(CLIP_X)).toEqual([1, 2 * Math.SQRT2, 4].map((v, i) => (i === 1 ? expect.closeTo(v, 12) : v)))
    expect(dot(squares2(CLIP_X), squares2(CLIP_Y))).toBeCloseTo(25, 12)
    expect(dot(pairProducts(CLIP_X), pairProducts(CLIP_Y))).toBe(25)
  })

  it('(x·x′)² equals the inner product of all pair products, on seeded vectors of many sizes', () => {
    const random = seeded(1)
    for (let trial = 0; trial < 300; trial++) {
      const d = 1 + Math.floor(random() * 8)
      const x = vector(random, d)
      const y = vector(random, d)
      const viaFeatures = dot(pairProducts(x), pairProducts(y))
      expect(polynomialKernel(2)(x, y)).toBeCloseTo(viaFeatures, 9)
      if (d === 2) expect(dot(squares2(x), squares2(y))).toBeCloseTo(viaFeatures, 9)
    }
  })

  it('(x·x′ + 1)² is the inner product of squares, pairs, scaled inputs and a 1', () => {
    const phi = (x: Point) => [...squares2(x), Math.SQRT2 * x[0], Math.SQRT2 * x[1], 1]
    const random = seeded(2)
    for (let trial = 0; trial < 200; trial++) {
      const x = vector(random, 2)
      const y = vector(random, 2)
      expect(polynomialKernel(2, 1)(x, y)).toBeCloseTo(dot(phi(x), phi(y)), 9)
    }
  })
})

describe('counting features', () => {
  // Brute force: every way to pick `degree` inputs with repeats, in order
  function enumerate(inputs: number, degree: number, from = 0): number {
    if (degree === 0) return 1
    let count = 0
    for (let i = from; i < inputs; i++) count += enumerate(inputs, degree - 1, i)
    return count
  }

  it('matches listing every product, for small sizes', () => {
    for (let inputs = 1; inputs <= 7; inputs++) for (let degree = 0; degree <= 5; degree++) expect(featureCount(inputs, degree)).toBe(enumerate(inputs, degree))
  })

  it('gives the page’s numbers: 3, 5,050 and about 4.3 × 10¹³', () => {
    expect(COSTS.map((c) => c.features)).toEqual([3, 5050, 42634215112710])
    expect(SPAM_PAIRS).toBe(50005000)
  })
})

describe('kernel matrices', () => {
  const random = seeded(3)
  const points = Array.from({ length: 12 }, () => vector(random, 2))

  it('are symmetric and have no negative eigenvalue, for valid kernels', () => {
    const kernels: Kernel[] = [linearKernel, polynomialKernel(2), polynomialKernel(3, 1), gaussianKernel(0.3), gaussianKernel(2)]
    for (const kernel of kernels) {
      const K = kernelMatrix(points, kernel)
      K.forEach((row, i) => row.forEach((v, j) => expect(v).toBe(K[j][i])))
      const scale = Math.max(...K.map((row, i) => row[i]))
      expect(eigenvalues(K)[0]).toBeGreaterThan(-1e-9 * scale)
    }
  })

  it('catch a similarity that is no kernel: squared distance has a negative eigenvalue', () => {
    const K = kernelMatrix(points, (a, b) => a.reduce((s, ai, i) => s + (ai - b[i]) ** 2, 0))
    expect(eigenvalues(K)[0]).toBeLessThan(-0.1)
  })

  it('come with eigenvalues that check out by hand', () => {
    expect(eigenvalues([[2, 1], [1, 2]])).toEqual([expect.closeTo(1, 12), expect.closeTo(3, 12)])
    const values = eigenvalues([[4, 1, 0], [1, 3, 1], [0, 1, 2]])
    expect(values.reduce((a, b) => a + b, 0)).toBeCloseTo(9, 10) // the trace
    expect(values.reduce((a, b) => a * b, 1)).toBeCloseTo(18, 9) // the determinant
  })

  it('give the Gaussian a similarity of 1 for a point with itself, falling with distance', () => {
    const k = gaussianKernel(1)
    expect(k([0.3, -1], [0.3, -1])).toBe(1)
    expect(k([0, 0], [1, 0])).toBeCloseTo(Math.exp(-0.5), 12)
    expect(k([0, 0], [2, 0])).toBeLessThan(k([0, 0], [1, 0]))
  })
})

describe('the kernel classifier', () => {
  it('meets the margin conditions once trained', () => {
    const data = moons(seeded(4), 30, 0.2)
    const C = 5
    const model = train(data.points, data.labels, (a, b) => gaussianKernel(0.4)(a, b) + 1, C)
    data.points.forEach((p, i) => {
      const margin = data.labels[i] * score(model, p)
      const a = model.alphas[i]
      if (a === 0) expect(margin).toBeGreaterThan(1 - 1e-4)
      else if (a === C) expect(margin).toBeLessThan(1 + 1e-4)
      else expect(margin).toBeCloseTo(1, 4)
    })
  })

  it('is the same model as a straight one trained on the features written out', () => {
    const phi = (x: Point) => [...squares2(x), Math.SQRT2 * x[0], Math.SQRT2 * x[1], 1]
    const data = rings(seeded(5), 25, 0.1)
    const viaKernel = train(data.points, data.labels, polynomialKernel(2, 1), 10)
    const written = data.points.map(phi)
    const viaFeatures = train(written, data.labels, linearKernel, 10)
    // Its weights, w = Σ αᵢ yᵢ φ(xᵢ), in the bigger space
    const w = written[0].map((_, k) => written.reduce((s, f, i) => s + viaFeatures.alphas[i] * data.labels[i] * f[k], 0))
    const random = seeded(6)
    for (let trial = 0; trial < 100; trial++) {
      const x = vector(random, 2)
      expect(score(viaKernel, x)).toBeCloseTo(dot(w, phi(x)), 6)
    }
  })

  it('separates the ring with a Gaussian kernel but not with a straight one', () => {
    const data = rings(seeded(8), 40, 0.1)
    const straight = train(data.points, data.labels, (a, b) => dot(a, b) + 1, 10)
    const gaussian = train(data.points, data.labels, (a, b) => gaussianKernel(0.5)(a, b) + 1, 10)
    expect(accuracy(gaussian, data.points, data.labels)).toBeGreaterThanOrEqual(0.97)
    expect(accuracy(straight, data.points, data.labels)).toBeLessThan(0.75)
  })
})

describe('the story', () => {
  it('has no straight cut that beats calling everything a cherry', () => {
    expect(BEST_STRAIGHT).toBe(GRAPES.length)
    // Brute force over every line through two fruits, nudged each way
    const fruits = [...GRAPES, ...CHERRIES]
    const isGrape = (i: number) => i < GRAPES.length
    let fewest = Infinity
    for (let i = 0; i < fruits.length; i++) {
      for (let j = i + 1; j < fruits.length; j++) {
        const normalDir = [fruits[j][1] - fruits[i][1], fruits[i][0] - fruits[j][0]]
        for (const shift of [-1e-6, 1e-6]) {
          const offset = dot(normalDir, fruits[i]) + shift
          const above = fruits.map((p) => dot(normalDir, p) > offset)
          const wrong = above.filter((a, k) => a !== isGrape(k)).length
          fewest = Math.min(fewest, wrong, fruits.length - wrong)
        }
      }
    }
    expect(fewest).toBe(BEST_STRAIGHT)
  })

  it('finds the best place for each direction', () => {
    expect(CUTS.every((c) => c.wrong >= BEST_STRAIGHT)).toBe(true)
    const { offset, wrong } = bestCutAt(0.4)
    const n = [Math.cos(0.4), Math.sin(0.4)]
    const counted = GRAPES.filter((p) => dot(p, n) <= offset).length + CHERRIES.filter((p) => dot(p, n) > offset).length
    expect(counted).toBe(wrong)
  })

  it('never leaves fewer than that wrong as the story’s cuts slide across', () => {
    for (const angle of SWEEP_ANGLES) {
      for (let i = 0; i <= 400; i++) {
        const { wrong } = cutAt(angle, -SWEEP_REACH + (2 * SWEEP_REACH * i) / 400)
        expect(wrong).toBeGreaterThanOrEqual(BEST_STRAIGHT)
      }
    }
    // Through the middle, it does far worse than the best
    expect(cutAt(SWEEP_ANGLES[1], 0).wrong).toBeGreaterThan(BEST_STRAIGHT)
  })

  it('splits grapes from cherries with one flat cut once lifted', () => {
    expect(GRAPES.every((p) => lift(p)[2] < CUT)).toBe(true)
    expect(CHERRIES.every((p) => lift(p)[2] > CUT)).toBe(true)
  })
})

describe('the lab', () => {
  it('fails on the rings with a straight boundary, and fits them with a curved one', () => {
    expect(labFit('Rings', 'Straight', 0.5).train).toBeLessThan(0.75)
    expect(labFit('Rings', 'Degree 2', 0.5).train).toBe(1)
    expect(labFit('Rings', 'Gaussian', 0.5).test).toBeGreaterThan(0.95)
  })

  it('overfits with a tiny σ and underfits with a large one', () => {
    for (const dataset of ['Rings', 'Moons'] as const) {
      const tiny = labFit(dataset, 'Gaussian', 0.05)
      const right = labFit(dataset, 'Gaussian', 0.15)
      const wide = labFit(dataset, 'Gaussian', 3)
      expect(tiny.train).toBe(1)
      expect(tiny.test).toBeLessThan(right.test - 0.05)
      expect(wide.train).toBeLessThan(0.95)
      expect(wide.test).toBeLessThan(right.test - 0.04)
      // A tiny σ leans on nearly every point
      expect(tiny.support).toBeGreaterThan(0.9 * 80)
    }
  })

  it('needs a curve for the moons: degree 2 does no better than straight', () => {
    expect(labFit('Moons', 'Degree 2', 0.5).test).toBeLessThan(0.9)
    expect(labFit('Moons', 'Gaussian', 0.15).test).toBeGreaterThan(0.97)
  })
})
