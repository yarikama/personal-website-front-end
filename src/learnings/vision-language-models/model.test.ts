import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  answer,
  AS_THEY_ARE,
  BIG_TOKENS,
  cellSize,
  features,
  FIRST_PICTURE,
  FIXED_TOKENS,
  gradient,
  INPUTS,
  inkPerCell,
  KINDS,
  LLAVA_TOKENS,
  loss,
  nativePatches,
  nativeTokens,
  NEW_PICTURE,
  oneIn,
  LOOKS,
  textHeight,
  OUTLINES,
  PATTERNS,
  picture,
  patchesOf,
  projectorWeights,
  QWEN,
  readAs,
  reading,
  smartResize,
  SMALL_TOKENS,
  tokens,
  trainedShare,
  TRAINED,
  TRAINING,
  VIEWS,
  WORDS,
  type Rule,
} from './model'

describe('the toy encoder', () => {
  it('gives each kind of square the numbers worked out by hand', () => {
    expect(features(PATTERNS.blank)).toEqual([0, 0])
    expect(features(PATTERNS.solid)).toEqual([1, 0])
    expect(features(PATTERNS.stripes)).toEqual([0.5, 1])
    expect(features(PATTERNS.dots)).toEqual([0.25, 0.5])
  })

  it('cuts a picture back into the squares it was built from', () => {
    const squares = patchesOf(picture(FIRST_PICTURE))
    squares.forEach((s, i) => expect(s).toEqual(PATTERNS[FIRST_PICTURE[i]]))
  })
})

describe('the word map', () => {
  it('reads each word’s own spot as that word, most surely', () => {
    WORDS.forEach((w, i) => {
      const p = reading(w.at)
      expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1)
      expect(p.indexOf(Math.max(...p))).toBe(i)
    })
  })

  it('reads the raw numbers as words that have nothing to do with drawings', () => {
    expect(readAs(AS_THEY_ARE, FIRST_PICTURE)).toEqual(['Tuesday', 'music', 'soup', 'piano'])
  })
})

describe('training the rule', () => {
  it('has a slope that matches small nudges, at seeded random rules', () => {
    const random = seeded(5)
    const step = 1e-6
    for (let trial = 0; trial < 20; trial++) {
      const n = () => random() * 2 - 1
      const r: Rule = {
        m: [
          [n(), n()],
          [n(), n()],
        ],
        b: [n(), n()],
      }
      const g = gradient(r)
      for (const [i, j] of [
        [0, 0],
        [0, 1],
        [1, 0],
        [1, 1],
      ]) {
        const up = structuredClone(r)
        const down = structuredClone(r)
        up.m[i][j] += step
        down.m[i][j] -= step
        expect(g.m[i][j]).toBeCloseTo((loss(up) - loss(down)) / (2 * step), 4)
      }
      for (const i of [0, 1]) {
        const up = structuredClone(r)
        const down = structuredClone(r)
        up.b[i] += step
        down.b[i] -= step
        expect(g.b[i]).toBeCloseTo((loss(up) - loss(down)) / (2 * step), 4)
      }
    }
  })

  it('brings the loss down at every step', () => {
    const losses = TRAINING.map((r) => loss(r))
    for (let t = 1; t < losses.length; t++) expect(losses[t]).toBeLessThan(losses[t - 1])
    expect(losses[0]).toBeGreaterThan(10)
    expect(losses.at(-1)!).toBeLessThan(1)
  })

  it('ends with every kind of square read as its own word, even in a new picture', () => {
    expect(readAs(TRAINED, FIRST_PICTURE)).toEqual(FIRST_PICTURE)
    expect(readAs(TRAINED, NEW_PICTURE)).toEqual(NEW_PICTURE)
    expect(KINDS.every((k) => readAs(TRAINED, [k, k, k, k]).every((w) => w === k))).toBe(true)
  })

  it('learns something close to a quarter turn', () => {
    // Stripiness turns into left, ink into up
    expect(TRAINED.m[0][1]).toBeLessThan(-0.8)
    expect(TRAINED.m[1][0]).toBeGreaterThan(0.5)
    expect(Math.abs(TRAINED.m[0][0])).toBeLessThan(0.3)
    expect(Math.abs(TRAINED.m[1][1])).toBeLessThan(0.3)
  })

  it('answers about the new picture in words', () => {
    expect(answer(readAs(TRAINED, NEW_PICTURE))).toBe('Stripes on top, blank and dots below.')
  })
})

describe('LLaVA’s sizes', () => {
  it('trains about 5.2 million weights in stage 1, about 1 in 2,500', () => {
    expect(projectorWeights).toBe(1024 * 5120 + 5120)
    expect(trainedShare).toBeCloseTo(0.000394, 5)
    expect(oneIn).toBe(2500)
  })

  it('cuts a 224 picture into 256 tokens, and a 336 one into 576', () => {
    expect(LLAVA_TOKENS).toBe(256)
    expect(FIXED_TOKENS).toBe(576)
  })
})

describe('Qwen2-VL’s resizing', () => {
  it('matches the counts in the paper and the slides', () => {
    expect(nativeTokens(28, 224)).toBe(8)
    expect(nativeTokens(700, 1260)).toBe(1125)
    expect(nativeTokens(8204, 1092)).toBe(11427)
    // 224 × 224: 256 patches, 64 tokens (66 with the start and end markers)
    expect(nativePatches(224, 224)).toBe(256)
    expect(nativeTokens(224, 224)).toBe(64)
  })

  it('has its pixel limits at the slides’ two extremes', () => {
    expect(QWEN.minPixels).toBe(56 * 56)
    expect(QWEN.maxPixels).toBe(3584 * 3584)
    expect(nativePatches(3584, 3584)).toBe(65536)
    expect(nativePatches(56, 56)).toBe(16)
  })

  it('keeps every seeded random picture within the limits, in multiples of 28, near its shape', () => {
    const random = seeded(9)
    for (let i = 0; i < 500; i++) {
      const h = 28 + Math.floor(random() * 6000)
      const w = 28 + Math.floor(random() * 6000)
      if (Math.max(h, w) / Math.min(h, w) > 50) continue
      const r = smartResize(h, w)
      expect(r.height % 28).toBe(0)
      expect(r.width % 28).toBe(0)
      expect(r.height * r.width).toBeLessThanOrEqual(QWEN.maxPixels)
      expect(r.height * r.width).toBeGreaterThanOrEqual(QWEN.minPixels)
      const shape = r.width / r.height / (w / h)
      expect(shape).toBeGreaterThan(0.5)
      expect(shape).toBeLessThan(2)
      expect(nativeTokens(h, w)).toBe(tokens(r.height, r.width, 28))
    }
  })

  it('gives a picture ten times as wide and tall a hundred times the tokens', () => {
    expect(SMALL_TOKENS).toBe(4)
    expect(BIG_TOKENS).toBe(400)
  })
})

describe('the lab', () => {
  it('gives every picture 576 tokens when fixed, and the native counts otherwise', () => {
    expect(VIEWS.Fixed.map((v) => v.tokens)).toEqual([576, 576, 576, 576, 576])
    expect(VIEWS.Native.map((v) => v.tokens)).toEqual([4, 8, 1125, 1806, 11427])
    expect(VIEWS.Native.every((v) => v.padding === 0)).toBe(true)
    // The one line of text, padded to a square, touches only 4 of its 24 rows
    expect(VIEWS.Fixed[1].padding).toBe(576 - 4 * 24)
  })

  it('says how much of the picture one token covers', () => {
    expect(cellSize(VIEWS.Fixed[3].grid)).toBe('100 × 100')
    expect(cellSize(VIEWS.Fixed[0].grid)).toBe('2.3 × 2.3')
    expect(cellSize(VIEWS.Native[2].grid)).toBe('28 × 28')
  })

  it('draws boxes that never overlap and stay inside their picture', () => {
    const clashes: string[] = []
    for (const input of INPUTS) {
      for (const [i, a] of input.boxes.entries()) {
        if (a.x < 0 || a.y < 0 || a.x + a.w > input.width || a.y + a.h > input.height) clashes.push(`${input.name} ${i} outside`)
        for (const [j, b] of input.boxes.slice(i + 1).entries()) {
          const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y
          if (!apart) clashes.push(`${input.name} ${i} and ${i + 1 + j}`)
        }
      }
    }
    expect(clashes).toEqual([])
  })

  it('keeps all the ink: the cells add up to the boxes', () => {
    for (const mode of ['Fixed', 'Native'] as const) {
      INPUTS.forEach((input, k) => {
        const v = VIEWS[mode][k]
        const fromCells = v.ink.reduce((a, b) => a + b, 0) * v.grid.cellW * v.grid.cellH
        const fromBoxes = input.boxes.reduce((a, b) => a + b.ink * b.w * b.h, 0)
        expect(fromCells / fromBoxes).toBeCloseTo(1, 6)
      })
    }
  })

  it('matches ink found by sampling seeded random points in each cell', () => {
    const random = seeded(13)
    const inkAt = (input: (typeof INPUTS)[number], x: number, y: number) =>
      input.boxes.find((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h)?.ink ?? 0
    for (const k of [0, 2, 3]) {
      const input = INPUTS[k]
      for (const mode of ['Fixed', 'Native'] as const) {
        const g = VIEWS[mode][k].grid
        const ink = inkPerCell(input, g)
        for (let trial = 0; trial < 15; trial++) {
          const c = Math.floor(random() * g.cols)
          const r = Math.floor(random() * g.rows)
          let sum = 0
          const samples = 4000
          for (let s = 0; s < samples; s++) {
            sum += inkAt(input, g.x0 + (c + random()) * g.cellW, g.y0 + (r + random()) * g.cellH)
          }
          expect(Math.abs(sum / samples - ink[r * g.cols + c])).toBeLessThan(0.04)
        }
      }
    }
  })
})

describe('the thumbnails', () => {
  it('keep each picture’s ink, line by line', () => {
    INPUTS.forEach((input, k) => {
      const inked = (boxes: { w: number; h: number; ink: number }[]) => boxes.reduce((a, b) => a + b.ink * b.w * b.h, 0)
      expect(inked(OUTLINES[k]) / inked(input.boxes)).toBeCloseTo(1, 9)
      expect(OUTLINES[k].length).toBeLessThanOrEqual(input.boxes.length)
    })
    expect(OUTLINES[4].length).toBeLessThan(400)
  })
})

describe('the close look as the encoder gets it', () => {
  it('blurs the receipt and the web page only when fixed', () => {
    expect(LOOKS.Fixed.map((l) => l !== null)).toEqual([false, false, false, true, true])
    expect(LOOKS.Native.every((l) => l === null)).toBe(true)
    expect(LOOKS.Fixed[3]!.grid.cols).toBe(34)
  })

  it('shrinks the receipt’s 10-pixel text to under 2 pixels when fixed, and keeps it when native', () => {
    expect(textHeight(3, 'Fixed')).toBeCloseTo(1.4, 2)
    expect(textHeight(3, 'Native')).toBeCloseTo(10.03, 2)
  })

  it('keeps the ink the boxes put in the pixels it covers', () => {
    const { grid, ink } = LOOKS.Fixed[3]!
    const input = INPUTS[3]
    const inside = input.boxes
      .map((b) => {
        const w = Math.max(0, Math.min(b.x + b.w, grid.x0 + grid.cols * grid.cellW) - Math.max(b.x, grid.x0))
        const h = Math.max(0, Math.min(b.y + b.h, grid.y0 + grid.rows * grid.cellH) - Math.max(b.y, grid.y0))
        return b.ink * w * h
      })
      .reduce((a, b) => a + b, 0)
    expect((ink.reduce((a, b) => a + b, 0) * grid.cellW * grid.cellH) / inside).toBeCloseTo(1, 6)
  })
})
