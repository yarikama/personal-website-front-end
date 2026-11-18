import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  CHAIR,
  CHAIR_PIXELS,
  chairBlocks,
  cut,
  DEPTHS,
  FRAME,
  GROWS,
  grow,
  neighbours,
  PHOTO,
  pool,
  resizeBilinear,
  score,
  STACKED,
  STORY,
  STORY_BLOCKS,
  upBilinear,
  upCopy,
  WEIGHTS,
  WORKED,
  type Grid,
} from './model'

const randomGrid = (random: () => number, h: number, w: number): Grid =>
  Array.from({ length: h }, () => Array.from({ length: w }, () => random()))

describe('the photo', () => {
  it('is a 16×16 chair and a frame that never touch', () => {
    expect(CHAIR).toHaveLength(16)
    for (const row of CHAIR) expect(row).toHaveLength(16)
    expect(CHAIR_PIXELS).toBe(36)
    expect(FRAME.flat().filter(Boolean)).toHaveLength(16)
    CHAIR.forEach((row, r) => row.forEach((v, c) => expect(v && FRAME[r][c]).toBeFalsy()))
    expect(PHOTO.flat().filter(Boolean)).toHaveLength(52)
  })
})

describe('shrinking', () => {
  it('averages each block', () => {
    expect(pool([[1, 0], [0, 1]], 2)).toEqual([[0.5]])
    expect(pool([[1, 2, 3, 4], [5, 6, 7, 8], [1, 1, 1, 1], [0, 0, 0, 0]], 2)).toEqual([
      [3.5, 5.5],
      [0.5, 0.5],
    ])
  })

  it('marks the 7 of 16 blocks that hold chair, and none of the frame’s', () => {
    expect(chairBlocks(2)).toEqual([
      [0, 0, 0, 1],
      [0, 0, 0, 1],
      [0, 1, 1, 1],
      [0, 1, 0, 1],
    ])
    expect(STORY_BLOCKS).toBe(7)
  })
})

describe('growing back', () => {
  it('by copying, repeats each value in a 2×2 block', () => {
    expect(upCopy([[1, 2], [3, 4]])).toEqual([
      [1, 1, 2, 2],
      [1, 1, 2, 2],
      [3, 3, 4, 4],
      [3, 3, 4, 4],
    ])
  })

  it('by bilinear, weighs the four neighbours 9, 3, 3 and 1 sixteenths', () => {
    expect(WEIGHTS).toEqual([9 / 16, 3 / 16, 3 / 16, 1 / 16])
    expect(WEIGHTS.reduce((a, b) => a + b, 0)).toBe(1)
    // Worked by hand: [[0, 1], [0, 0]] doubled. New pixel (1, 2) has nearest
    // 1, across 0, below 0, diagonal 0: 9/16. Pixel (0, 1) is clamped at the
    // top, so its near and below are both row 0: 3/16 + 1/16
    const out = upBilinear([[0, 1], [0, 0]])
    expect(out[1][2]).toBeCloseTo(9 / 16)
    expect(out[0][1]).toBeCloseTo(4 / 16)
    expect(out[0][3]).toBeCloseTo(1)
    expect(out[3][0]).toBeCloseTo(0)
  })

  it('by bilinear, matches the general resize on random maps', () => {
    const random = seeded(7)
    for (let t = 0; t < 200; t++) {
      const h = 1 + Math.floor(random() * 6)
      const w = 1 + Math.floor(random() * 6)
      const grid = randomGrid(random, h, w)
      const fast = upBilinear(grid)
      const slow = resizeBilinear(grid, 2 * h, 2 * w)
      fast.forEach((row, r) => row.forEach((v, c) => expect(v).toBeCloseTo(slow[r][c], 12)))
    }
  })

  it('keeps a flat map flat, and stays between the smallest and largest value', () => {
    const random = seeded(8)
    expect(upBilinear([[0.3, 0.3], [0.3, 0.3]]).flat().every((v) => Math.abs(v - 0.3) < 1e-12)).toBe(true)
    for (let t = 0; t < 100; t++) {
      const grid = randomGrid(random, 4, 4)
      const low = Math.min(...grid.flat())
      const high = Math.max(...grid.flat())
      for (const v of upBilinear(grid).flat()) {
        expect(v).toBeGreaterThanOrEqual(low - 1e-12)
        expect(v).toBeLessThanOrEqual(high + 1e-12)
      }
    }
  })

  it('reaches full size from any depth', () => {
    for (const d of DEPTHS) for (const how of GROWS) expect(grow(chairBlocks(d), d, how)).toHaveLength(16)
  })
})

describe('the worked numbers', () => {
  it('are 9/16, 3/16 and 13/16, from their neighbours', () => {
    expect(WORKED.map((w) => w.around)).toEqual([
      [1, 0, 0, 0],
      [0, 0, 1, 0],
      [1, 1, 0, 1],
    ])
    expect(WORKED.map((w) => w.value)).toEqual([9 / 16, 3 / 16, 13 / 16])
    for (const w of WORKED) {
      const sum = w.around.reduce((acc, v, i) => acc + v * WEIGHTS[i], 0)
      expect(w.value).toBeCloseTo(sum)
    }
  })

  it('name each pixel’s neighbours toward the side it sits on', () => {
    const map = [[1, 2], [3, 4]]
    expect(neighbours(map, 1, 1)).toEqual([1, 2, 3, 4])
    expect(neighbours(map, 2, 2)).toEqual([4, 3, 2, 1])
  })
})

describe('the cuts', () => {
  it('tell the story’s numbers', () => {
    expect(STORY.deep).toMatchObject({ kept: 116, missed: 0, extra: 80, frame: 0 })
    expect(STORY.copy).toMatchObject({ kept: 52, missed: 0, extra: 16, frame: 16 })
    expect(STORY.both).toMatchObject({ kept: 36, missed: 0, extra: 0, frame: 0 })
  })

  it('with both, are exact at every depth and either way of growing', () => {
    for (const d of DEPTHS) for (const how of GROWS) expect(score(cut(d, how, 'Both')).wrong).toBe(0)
  })

  it('with the deep map alone, take more floor the further they shrink', () => {
    for (const how of GROWS) {
      const extra = DEPTHS.map((d) => score(cut(d, how, 'Deep map')).extra)
      expect(extra[0]).toBeLessThan(extra[1])
      expect(extra[1]).toBeLessThan(extra[2])
    }
  })

  it('with the copy alone, always take the frame', () => {
    for (const d of DEPTHS) expect(score(cut(d, 'Copy', 'Copy')).frame).toBe(16)
  })

  it('with the deep map, differ only a little between copying and bilinear', () => {
    const copied = score(cut(2, 'Copy', 'Deep map')).extra
    const blended = score(cut(2, 'Bilinear', 'Deep map')).extra
    expect(Math.abs(copied - blended)).toBeLessThan(10)
  })
})

it('stacks 64 and 64 channels into 128', () => {
  expect(STACKED).toBe(128)
})
