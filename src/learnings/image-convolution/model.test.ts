import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  BLOCK,
  BLUR_RAMP,
  BOX,
  convolve,
  EDGE_ROW,
  EDGE_TOP,
  GAUSSIAN,
  HORIZON_ACROSS,
  HORIZON_DOWN,
  IMAGES,
  ON_WALL,
  outputSize,
  PHOTO_NUMBERS,
  RAMP,
  RAMP_BORDER_EDGE,
  RAMP_EDGE,
  show,
  SIZES,
  SOBEL_ACROSS,
  SOBEL_DOWN,
  SPECKLED,
  SQUARE_DIFFERENCES,
  STORY_SHRUNK,
  STRONGEST_EDGE,
  sumText,
  sweep,
  terms,
  valueAt,
  WORKED,
  type Grid,
} from './model'

const randomImage = (random: () => number, rows: number, cols: number): Grid =>
  Array.from({ length: rows }, () => Array.from({ length: cols }, () => Math.floor(random() * 10)))

describe('the story, worked by hand', () => {
  it('blurs the block’s side into a ramp of 3, 6, 9', () => {
    expect(BLUR_RAMP).toEqual([3, 6, 9])
    expect(WORKED.blur.solid).toBe(3)
  })

  it('finds only the block’s left and right sides', () => {
    expect(EDGE_ROW).toEqual([36, 36, 0, 0, -36, -36])
    expect(WORKED.side.value).toBe(36)
    expect(WORKED.inside.value).toBe(0)
    expect(EDGE_TOP).toBe(0)
    expect(STRONGEST_EDGE).toBe(36)
    // Nothing anywhere stronger than a full side, and nothing off the sides
    const out = convolve(BLOCK, SOBEL_ACROSS, 'Shrink')
    for (const [r, row] of out.entries())
      for (const [c, v] of row.entries()) {
        const j = c + 1
        expect(Math.abs(v)).toBeLessThanOrEqual(36)
        if (![1, 2, 5, 6].includes(j)) expect(v).toBe(0)
        if (r + 1 >= 2 && r + 1 <= 5 && [1, 2].includes(j)) expect(v).toBe(36)
      }
  })

  it('shrinks 8 to 6 without padding and keeps 8 with zeros', () => {
    expect(STORY_SHRUNK).toBe(6)
    expect(convolve(BLOCK, BOX, 'Shrink').length).toBe(6)
    expect(convolve(BLOCK, BOX, 'Shrink')[0].length).toBe(6)
    expect(convolve(BLOCK, BOX, 'Zeros').length).toBe(8)
    expect(sweep(BLOCK, 'Shrink').length).toBe(36)
  })

  it('fills the speckled block’s hole and fades its strays', () => {
    expect(valueAt(SPECKLED, BOX, 4, 2)).toBe(8)
    expect(valueAt(SPECKLED, BOX, 1, 6)).toBe(1)
    expect(valueAt(SPECKLED, GAUSSIAN, 1, 6)).toBeCloseTo(9 / 4)
  })

  it('reads a steady slope everywhere, and an invented edge at a zero border', () => {
    expect(RAMP_EDGE).toBe(8)
    for (const row of convolve(RAMP, SOBEL_ACROSS, 'Shrink')) for (const v of row) expect(v).toBe(8)
    expect(RAMP_BORDER_EDGE).toBe(-24)
    // Smoothing leaves a straight ramp as it was
    expect(convolve(RAMP, BOX, 'Shrink')[2]).toEqual([1, 2, 3, 4, 5, 6])
  })
})

describe('the page’s other numbers', () => {
  it('sizes', () => {
    expect(PHOTO_NUMBERS).toBe(150528)
    expect(SIZES).toEqual({ shrink: 28, padded: 32, strided: 16 })
    expect(outputSize(10, 3)).toBe(8)
  })

  it('a flat wall: kept by the box, gone under the edge filter, nine times over unnormalised', () => {
    expect(ON_WALL).toEqual({ box: 5, edge: 0, ones: 45 })
  })

  it('a level horizon: nothing across, a line down', () => {
    for (const row of HORIZON_ACROSS) for (const v of row) expect(v).toBe(0)
    expect(HORIZON_DOWN.map((row) => row[0])).toEqual([0, 0, -28, -28, 0, 0])
  })

  it('differences of squares are twice the slope', () => {
    expect(SQUARE_DIFFERENCES).toEqual([8, 12, 16])
  })

  it('prints numbers with a real minus', () => {
    expect(show(-36)).toBe('−36')
    expect(show(2.25)).toBe('2.25')
    expect(show(-0)).toBe('0')
  })

  it('smoothing weights add up to one, edge weights to zero', () => {
    for (const k of [BOX, GAUSSIAN]) expect(k.weights.flat().reduce((a, b) => a + b, 0)).toBe(k.divisor)
    for (const k of [SOBEL_ACROSS, SOBEL_DOWN]) expect(k.weights.flat().reduce((a, b) => a + b, 0)).toBe(0)
    for (const image of Object.values(IMAGES)) expect(image.length).toBe(8)
  })
})

describe('against references, on seeded random pictures', () => {
  const random = seeded(646)

  it('the box filter is the plain average of the window, found by brute force', () => {
    for (let n = 0; n < 200; n++) {
      const image = randomImage(random, 5 + Math.floor(random() * 5), 5 + Math.floor(random() * 5))
      const out = convolve(image, BOX, 'Shrink')
      expect(out.length).toBe(outputSize(image.length, 3))
      expect(out[0].length).toBe(outputSize(image[0].length, 3))
      for (let i = 1; i < image.length - 1; i++)
        for (let j = 1; j < image[0].length - 1; j++) {
          let sum = 0
          for (const r of [i - 1, i, i + 1]) for (const c of [j - 1, j, j + 1]) sum += image[r][c]
          expect(out[i - 1][j - 1]).toBeCloseTo(sum / 9)
        }
    }
  })

  it('Sobel is a smoothing down the column, then a difference across', () => {
    for (let n = 0; n < 200; n++) {
      const image = randomImage(random, 6, 7)
      for (let i = 1; i < 5; i++)
        for (let j = 1; j < 6; j++) {
          const smooth = (c: number) => image[i - 1][c] + 2 * image[i][c] + image[i + 1][c]
          expect(valueAt(image, SOBEL_ACROSS, i, j)).toBe(smooth(j + 1) - smooth(j - 1))
          // Turned a quarter: the same on the transposed picture
          const turned = image[0].map((_, c) => image.map((row) => row[c]))
          expect(valueAt(image, SOBEL_DOWN, i, j)).toBe(valueAt(turned, SOBEL_ACROSS, j, i))
        }
    }
  })

  it('filtering is linear: filter two pictures and add, or add and filter', () => {
    for (let n = 0; n < 100; n++) {
      const a = randomImage(random, 6, 6)
      const b = randomImage(random, 6, 6)
      const sum = a.map((row, i) => row.map((v, j) => v + b[i][j]))
      for (const k of [BOX, GAUSSIAN, SOBEL_ACROSS]) {
        const fa = convolve(a, k, 'Zeros')
        const fb = convolve(b, k, 'Zeros')
        const fs = convolve(sum, k, 'Zeros')
        fs.forEach((row, i) => row.forEach((v, j) => expect(v).toBeCloseTo(fa[i][j] + fb[i][j])))
      }
    }
  })

  it('zero padding counts the missing seats as blanks', () => {
    for (let n = 0; n < 100; n++) {
      const image = randomImage(random, 5, 5)
      const padded = [Array(7).fill(0), ...image.map((row) => [0, ...row, 0]), Array(7).fill(0)]
      const viaZeros = convolve(image, GAUSSIAN, 'Zeros')
      const viaPadding = convolve(padded, GAUSSIAN, 'Shrink')
      expect(viaZeros).toEqual(viaPadding)
      expect(terms(image, GAUSSIAN, 0, 0).length).toBe(9)
    }
  })
})

describe('the window’s sum, written out', () => {
  it('reads as a reader would redo it', () => {
    expect(sumText(BOX, terms(BLOCK, BOX, 3, 2))).toBe('(0 + 9 + 9 + 0 + 9 + 9 + 0 + 9 + 9) ÷ 9 = 6')
    expect(sumText(SOBEL_ACROSS, terms(BLOCK, SOBEL_ACROSS, 3, 2))).toBe('(9 + 2×9 + 9) − (0 + 2×0 + 0) = 36')
    expect(sumText(GAUSSIAN, terms(SPECKLED, GAUSSIAN, 1, 6))).toBe('(0 + 2×0 + 0 + 2×0 + 4×9 + 2×0 + 0 + 2×0 + 0) ÷ 16 = 2.25')
  })
})
