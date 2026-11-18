import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  ACROSS,
  CARDS,
  DOOR,
  E,
  MODELS,
  patchCount,
  patchify,
  patchNumbers,
  PATCHES,
  PICTURE,
  project,
  scoreCount,
  SIDE,
  SIDES,
  STRIPS,
  TILE,
  tokenCount,
  unpatchify,
  WORKED,
} from './model'

const randomImage = (random: () => number, rows: number, cols: number) =>
  Array.from({ length: rows }, () => Array.from({ length: cols }, () => Math.round(10 * random()) / 10))

describe('the story’s picture', () => {
  it('is 12 by 12 and cuts into 9 tiles of 16 squares', () => {
    expect(SIDE).toBe(12)
    expect(PICTURE.every((row) => row.length === SIDE)).toBe(true)
    expect(ACROSS).toBe(3)
    expect(STRIPS).toHaveLength(9)
    expect(STRIPS.every((s) => s.length === 16)).toBe(true)
  })

  it('unrolls a tile top line first: tile 8 is the door over the ground', () => {
    expect(STRIPS[DOOR]).toEqual([0.3, 0.3, 1, 1, 0.3, 0.3, 1, 1, 0.3, 0.3, 1, 1, 0.6, 0.6, 0.6, 0.6])
  })

  it('every tile is different, so no card is a copy of another', () => {
    const keys = new Set(STRIPS.map((s) => s.join()))
    expect(keys.size).toBe(9)
  })
})

describe('patchify', () => {
  it('cuts a 4 × 4 into four 2 × 2 patches in reading order', () => {
    const image = [
      [1, 2, 3, 4],
      [5, 6, 7, 8],
      [9, 10, 11, 12],
      [13, 14, 15, 16],
    ]
    expect(patchify(image, 2)).toEqual([
      [1, 2, 5, 6],
      [3, 4, 7, 8],
      [9, 10, 13, 14],
      [11, 12, 15, 16],
    ])
  })

  it('refuses an image the patches do not fit', () => {
    expect(() => patchify(PICTURE, 5)).toThrow()
  })

  it('puts every pixel exactly once where a brute-force search finds it, and undoes', () => {
    const random = seeded(16)
    for (let trial = 0; trial < 200; trial++) {
      const p = 1 + Math.floor(random() * 4)
      const down = 1 + Math.floor(random() * 4)
      const across = 1 + Math.floor(random() * 4)
      const image = randomImage(random, down * p, across * p)
      const patches = patchify(image, p)
      expect(patches).toHaveLength(down * across)
      for (let r = 0; r < down * p; r++)
        for (let c = 0; c < across * p; c++) {
          const k = Math.floor(r / p) * across + Math.floor(c / p)
          expect(patches[k][(r % p) * p + (c % p)]).toBe(image[r][c])
        }
      expect(unpatchify(patches, p, across)).toEqual(image)
    }
  })
})

describe('the three questions', () => {
  it('are a 16 × 3 matrix whose columns each weigh out an average', () => {
    expect(E).toHaveLength(16)
    for (let d = 0; d < 3; d++) expect(E.reduce((s, row) => s + row[d], 0)).toBeCloseTo(1, 12)
  })

  it('read the door tile as 0.64 in all, 0.65 in the top half, 0.38 in the left', () => {
    // all: (3 × 2.6 + 2.4) / 16; top: 5.2 / 8; left: (3 × 0.6 + 1.2) / 8
    expect(CARDS[DOOR][0]).toBeCloseTo(10.2 / 16, 12)
    expect(CARDS[DOOR][1]).toBeCloseTo(5.2 / 8, 12)
    expect(CARDS[DOOR][2]).toBeCloseTo(3 / 8, 12)
  })

  it('match the averages counted by hand on random tiles', () => {
    const random = seeded(3)
    for (let trial = 0; trial < 300; trial++) {
      const tile = randomImage(random, TILE, TILE)
      const [all, top, left] = project(patchify(tile, TILE)[0], E)
      const flat = tile.flat()
      const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
      expect(all).toBeCloseTo(mean(flat), 12)
      expect(top).toBeCloseTo(mean(tile.slice(0, 2).flat()), 12)
      expect(left).toBeCloseTo(mean(tile.flatMap((row) => row.slice(0, 2))), 12)
    }
  })

  it('are one rule for every tile: the same tile anywhere gets the same card', () => {
    const random = seeded(9)
    const tile = randomImage(random, TILE, TILE)
    const image = randomImage(random, 2 * TILE, 2 * TILE)
    for (let r = 0; r < TILE; r++) for (let c = 0; c < TILE; c++) image[TILE + r][c] = tile[r][c]
    const cards = patchify(image, TILE).map((s) => project(s, E))
    expect(cards[2]).toEqual(project(patchify(tile, TILE)[0], E))
  })
})

describe('counting tokens', () => {
  it('224 pixels in 16-pixel patches: 14 × 14 = 196 patches, 197 tokens, 768 numbers each', () => {
    expect(patchCount(224, 16)).toBe(196)
    expect(tokenCount(224, 16)).toBe(197)
    expect(patchNumbers(16)).toBe(768)
  })

  it('the worked numbers: 196, 576 and 256 patches', () => {
    expect(WORKED.map(({ side, patch }) => patchCount(side, patch))).toEqual([196, 576, 256])
  })

  it('agrees with counting patch corners one by one', () => {
    for (const side of SIDES)
      for (const patch of PATCHES) {
        let corners = 0
        for (let y = 0; y + patch <= side; y += patch) for (let x = 0; x + patch <= side; x += patch) corners++
        expect(patchCount(side, patch)).toBe(corners)
      }
  })

  it('doubling the side gives 4 times the patches and about 16 times the scores', () => {
    for (const patch of PATCHES) expect(patchCount(448, patch)).toBe(4 * patchCount(224, patch))
    expect(scoreCount(224, 16)).toBe(38_809)
    expect(scoreCount(448, 16)).toBe(785 ** 2)
    expect(scoreCount(448, 16) / scoreCount(224, 16)).toBeGreaterThan(15.8)
  })

  it('refuses a side the patch does not divide', () => {
    expect(() => patchCount(384, 14)).toThrow()
  })
})

describe('the paper’s numbers', () => {
  it('the larger model loses on ImageNet alone and wins with JFT-300M', () => {
    const [base, large] = MODELS
    expect(large.accuracy[0]).toBeLessThan(base.accuracy[0])
    expect(large.accuracy[2]).toBeGreaterThan(base.accuracy[2])
    expect(large.accuracy[2] - large.accuracy[0]).toBeCloseTo(10.59, 6)
  })
})
