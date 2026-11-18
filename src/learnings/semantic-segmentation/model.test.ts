import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  accuracy,
  answersPerSide,
  BLOCKY,
  BOAT,
  classifyPatch,
  COARSE,
  dilatedLayers,
  doubleSmoothly,
  evenInside,
  GUESS_SIDE,
  headParameters,
  insideCounts,
  IOU,
  iou,
  labels,
  LOOKALIKES,
  ones,
  outputSize,
  PHOTO,
  plainLayers,
  scoreMap,
  SEA,
  seenOffsets,
  SIDE,
  SIZES,
  SPREAD,
  stampCounts,
  stampsAlong,
  STORY,
  transposedConv,
  TRUTH,
  viewWidth,
  WIDE,
  type Grid,
  type Label,
} from './model'

const randomGrid = (random: () => number, rows: number, cols: number): Grid =>
  Array.from({ length: rows }, () => Array.from({ length: cols }, () => Math.round(random() * 20) / 20))

describe('the photo', () => {
  it('has a sky square and a sea square of exactly the same value', () => {
    const [sr, sc] = LOOKALIKES.sky
    const [er, ec] = LOOKALIKES.sea
    expect(TRUTH[sr][sc]).toBe(0)
    expect(TRUTH[er][ec]).toBe(SEA)
    expect(PHOTO[sr][sc]).toBe(PHOTO[er][ec])
  })

  it('has a boat of six squares', () => {
    expect(STORY.boatSquares).toBe(6)
    expect(STORY.squares).toBe(256)
    expect(STORY.answers).toBe(16)
  })
})

describe('the convolutionalized classifier', () => {
  it('gives the same names as cutting the photo into patches and classifying each', () => {
    const random = seeded(7)
    for (let t = 0; t < 200; t++) {
      const image = randomGrid(random, 16, 16)
      const slid = labels(scoreMap(image))
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++) {
          const patch = image.slice(4 * i, 4 * i + 4).map((row) => row.slice(4 * j, 4 * j + 4))
          expect(slid[i][j]).toBe(classifyPatch(patch))
        }
    }
  })

  it('runs on any photo whose sides are a multiple of 4', () => {
    const image = randomGrid(seeded(8), 8, 24)
    const map = labels(scoreMap(image))
    expect(map).toHaveLength(2)
    expect(map[0]).toHaveLength(6)
  })

  it('names the beach coarsely and misses the boat', () => {
    expect(COARSE.flat()).not.toContain(BOAT)
    expect(COARSE[0].every((l) => l === 0)).toBe(true)
    expect(accuracy(BLOCKY, TRUTH)).toBeCloseTo(0.848, 3)
  })

  it('keeps the head the same size', () => {
    expect(headParameters(4096, 1000)).toBe(4_097_000)
    expect(headParameters(512, 10)).toBe(5_130)
    expect(headParameters(4, 4)).toBe(20)
  })

  it('gives an 8 × 8 grid on a photo twice the size it was trained on', () => {
    expect(GUESS_SIDE).toBe(8)
    expect(answersPerSide(224, 224, 32)).toBe(1)
  })
})

describe('a transposed convolution', () => {
  it('stamps the kernel once per input, stride apart', () => {
    expect(transposedConv([[3, 5]], [[1, 2]], 2)).toEqual([[3, 6, 5, 10]])
    expect(transposedConv([[3, 5]], [[1, 1, 1]], 2)).toEqual([[3, 3, 8, 5, 5]])
  })

  it('adds the stamps where they overlap', () => {
    expect(
      transposedConv(
        [
          [1, 2],
          [3, 4],
        ],
        ones(3),
        2,
      ),
    ).toEqual([
      [1, 1, 3, 2, 2],
      [1, 1, 3, 2, 2],
      [4, 4, 10, 6, 6],
      [3, 3, 7, 4, 4],
      [3, 3, 7, 4, 4],
    ])
  })

  it('is multiplication by the transpose of the matching convolution', () => {
    const random = seeded(11)
    for (let t = 0; t < 100; t++) {
      const k = 2 + Math.floor(random() * 3)
      const s = 1 + Math.floor(random() * 3)
      const n = 2 + Math.floor(random() * 3)
      const kernel = randomGrid(random, k, k)
      const input = randomGrid(random, n, n)
      const out = transposedConv(input, kernel, s)
      const size = outputSize(n, k, s)
      // The convolution C maps a size × size map to n × n: output (i, j)
      // reads the window at (i s, j s). Its transpose sends u back:
      // (C^T u)[r][c] = sum over (i, j) of C[(i, j), (r, c)] u[i][j]
      for (let r = 0; r < size; r++)
        for (let c = 0; c < size; c++) {
          let sum = 0
          for (let i = 0; i < n; i++)
            for (let j = 0; j < n; j++) {
              const a = r - i * s
              const b = c - j * s
              if (a >= 0 && a < k && b >= 0 && b < k) sum += kernel[a][b] * input[i][j]
            }
          expect(out[r][c]).toBeCloseTo(sum, 10)
        }
    }
  })

  it('has the size the formula gives', () => {
    expect(SIZES.map((s) => s.size)).toEqual([8, 9, 10])
    expect(outputSize(4, 4, 2, 1)).toBe(8)
    expect(stampCounts(4, 3, 2)).toHaveLength(9)
  })

  it('is uneven inside when the stride does not divide the kernel', () => {
    expect(stampsAlong(4, 3, 2)).toEqual([1, 1, 2, 1, 2, 1, 2, 1, 1])
    expect(stampsAlong(4, 2, 2)).toEqual([1, 1, 1, 1, 1, 1, 1, 1])
    expect(stampsAlong(4, 2, 3)).toEqual([1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1])
    for (let k = 1; k <= 6; k++) for (let s = 1; s <= 4; s++) expect(evenInside(k, s)).toBe(k % s === 0)
    expect(SIZES.map((s) => s.even)).toEqual([true, false, true])
    expect(insideCounts(4, 3, 2)).toEqual([1, 2, 4])
    expect(insideCounts(4, 4, 2)).toEqual([4])
    expect(insideCounts(4, 2, 3)).toEqual([0, 1])
    // The check's four layers
    expect(insideCounts(4, 5, 2)).toEqual([4, 6, 9])
    expect(insideCounts(4, 6, 3)).toEqual([4])
    expect(insideCounts(4, 2, 2)).toEqual([1])
  })

  it('counts stamps in 2-D as the product of the counts along each side', () => {
    const counts = stampCounts(4, 3, 2)
    const along = stampsAlong(4, 3, 2)
    counts.forEach((row, r) => row.forEach((x, c) => expect(x).toBe(along[r] * along[c])))
  })

  it('doubles a map smoothly and leaves a flat map flat inside', () => {
    const flat = doubleSmoothly(Array.from({ length: 4 }, () => [2, 2, 2, 2]))
    expect(flat).toHaveLength(8)
    for (let r = 1; r < 7; r++) for (let c = 1; c < 7; c++) expect(flat[r][c]).toBeCloseTo(2, 10)
  })
})

describe('the grown-back map', () => {
  it('is the full size, closer to the truth, and still has no boat', () => {
    expect(SPREAD).toHaveLength(SIDE)
    expect(SPREAD[0]).toHaveLength(SIDE)
    expect(STORY.spread).toBeGreaterThan(STORY.blocky)
    expect(STORY.spread).toBeCloseTo(0.969, 3)
    expect(IOU.seaBlocky).toBeCloseTo(0.706, 3)
    expect(IOU.seaSpread).toBeCloseTo(0.927, 3)
    expect(IOU.boatSpread).toBe(0)
  })

  it('scores a perfect map at 1 and a disjoint one at 0', () => {
    expect(iou(TRUTH, TRUTH, SEA)).toBe(1)
    const none: Label[][] = TRUTH.map((row) => row.map(() => BOAT))
    expect(iou(none, TRUTH, SEA)).toBe(0)
  })
})

describe('dilated convolutions', () => {
  it('see 3, 7, 15 across with dilations 1, 2, 4, and 3, 5, 7 without', () => {
    expect([[1], [1, 2], [1, 2, 4]].map(viewWidth)).toEqual([3, 7, 15])
    expect([[1], [1, 1], [1, 1, 1]].map(viewWidth)).toEqual([3, 5, 7])
  })

  it('see every pixel in that width, with no holes', () => {
    const random = seeded(12)
    for (let t = 0; t < 50; t++) {
      const dilations = Array.from({ length: 1 + Math.floor(random() * 4) }, (_, i) => 2 ** i)
      const seen = seenOffsets(dilations)
      const half = (viewWidth(dilations) - 1) / 2
      expect(seen).toEqual(Array.from({ length: 2 * half + 1 }, (_, i) => i - half))
    }
  })

  it('need 4 layers to see 31 across, where plain ones need 15', () => {
    expect(dilatedLayers(WIDE)).toBe(4)
    expect(plainLayers(WIDE)).toBe(15)
    expect(dilatedLayers(15)).toBe(3)
    expect(plainLayers(15)).toBe(7)
  })
})
