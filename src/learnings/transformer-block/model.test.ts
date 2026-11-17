import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  ADDING,
  alike,
  attend,
  attentionWeightsOf,
  blockWeights,
  CLIP_SLOPE,
  D,
  drawFeedForward,
  feedForward,
  FIRST,
  KEPT,
  layerNorm,
  leastAlike,
  LOUD,
  mean,
  NETS,
  pairs,
  pathSum,
  plainPass,
  REWRITING,
  ROUNDS,
  runBlock,
  SAME_FROM,
  sees,
  skipPass,
  softmax,
  spread,
  START,
  VALUE,
  WORKED,
  type Mat,
} from './model'

const close = (a: number[], b: number[], digits = 6) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], digits))
const randomVec = (random: () => number, n: number, scale = 5) => Array.from({ length: n }, () => scale * (2 * random() - 1))

describe('where a block’s weights sit', () => {
  it('matches the counts worked by hand for d = 512, d_ff = 2048', () => {
    const w = blockWeights()
    // 4 maps of 512 × 512 with biases
    expect(w.attention).toBe(4 * 512 * 512 + 4 * 512)
    expect(w.attention).toBe(1_050_624)
    // 512 → 2048 → 512, with biases
    expect(w.feedForward).toBe(512 * 2048 + 2048 + 2048 * 512 + 512)
    expect(w.feedForward).toBe(2_099_712)
    expect(w.norms).toBe(2048)
    const share = w.feedForward / w.total
    expect(share).toBeGreaterThan(0.66)
    expect(share).toBeLessThan(0.67)
  })
})

describe('layer normalization', () => {
  it('evens out the worked notebooks to the same pattern', () => {
    expect(mean(WORKED.notes)).toBe(5)
    expect(spread(WORKED.notes)).toBe(3)
    for (const x of [WORKED.notes, WORKED.louder, WORKED.shifted]) close(layerNorm(x), [-1, -1 / 3, -1 / 3, 5 / 3], 5)
  })

  it('applies the gain and shift after normalizing', () => {
    close(layerNorm([2, 4, 4, 10], 2, 1), [-1, 1 / 3, 1 / 3, 13 / 3], 5)
  })

  it('gives mean 0 and spread 1, whatever the scale and offset (seeded)', () => {
    const random = seeded(11)
    for (let k = 0; k < 300; k++) {
      const x = randomVec(random, 2 + Math.floor(random() * 10))
      // A nearly flat vector is left to eps, which keeps it from blowing up
      if (spread(x) < 0.5) continue
      const y = layerNorm(x)
      expect(mean(y)).toBeCloseTo(0, 9)
      expect(spread(y)).toBeCloseTo(1, 5)
      const scale = 0.1 + 20 * random()
      const offset = 50 * (random() - 0.5)
      close(layerNorm(x.map((v) => scale * v + offset)), y, 4)
    }
  })
})

describe('the block', () => {
  it('softmax weights are positive and sum to 1', () => {
    const w = softmax([1, 2, 3])
    expect(w.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 12)
    close(w, [Math.exp(1), Math.exp(2), Math.exp(3)].map((v) => v / (Math.exp(1) + Math.exp(2) + Math.exp(3))))
  })

  it('attention matches a brute-force loop (seeded)', () => {
    const random = seeded(5)
    for (let k = 0; k < 50; k++) {
      const x: Mat = Array.from({ length: 4 }, () => randomVec(random, D, 2))
      const out = attend(x)
      for (let i = 0; i < 4; i++) {
        const scores = x.map((row) => row.reduce((s, v, j) => s + v * x[i][j], 0) / Math.sqrt(D))
        const top = Math.max(...scores)
        const e = scores.map((s) => Math.exp(s - top))
        const z = e.reduce((s, v) => s + v, 0)
        const expected = x[0].map((_, j) => VALUE * e.reduce((s, a, r) => s + (a / z) * x[r][j], 0))
        close(out[i], expected, 9)
      }
      attentionWeightsOf(x).forEach((row) => expect(row.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 12))
    }
  })

  it('a word alone hears only itself', () => {
    close(attend([[1, 2, 3, 4]])[0], [0.5, 1, 1.5, 2])
  })

  it('the feed-forward network is the same function for every word', () => {
    const net = drawFeedForward(3)
    const x = [0.3, -1, 2, 0.5]
    close(feedForward(net, x), feedForward(net, [...x]))
    // ReLU: a hidden unit never contributes a negative amount
    expect(net.w1).toHaveLength(2 * D)
    expect(net.w2[0]).toHaveLength(2 * D)
  })

  it('adds, then evens out, each step', () => {
    const round = runBlock(START, NETS[0])
    round.added.forEach((row, i) => close(row, START[i].map((v, j) => v + round.heard[i][j])))
    round.evened.forEach((row, i) => close(row, layerNorm(round.added[i])))
    round.output.forEach((row, i) => close(row, layerNorm(round.evened[i].map((v, j) => v + round.thought[i][j]))))
    for (const row of round.output) {
      expect(mean(row)).toBeCloseTo(0, 9)
      expect(spread(row)).toBeCloseTo(1, 5)
    }
  })
})

describe('the story', () => {
  it('Cal is the loud one, and evening out brings him to spread 1', () => {
    const spreads = START.map(spread)
    expect(Math.max(...spreads)).toBe(spreads[LOUD])
    expect(spread(FIRST.added[LOUD])).toBeCloseTo(3.1, 1)
    expect(spread(FIRST.evened[LOUD])).toBeCloseTo(1, 5)
  })

  it('friends who add keep their own notes; friends who rewrite end up alike', () => {
    expect(ADDING).toHaveLength(ROUNDS)
    // Every adding friend still leans the way they started
    KEPT.forEach((k) => expect(k).toBeGreaterThan(0.6))
    // And they still disagree with each other
    expect(leastAlike(ADDING[ROUNDS - 1].output)).toBeLessThan(0)
    // Rewriters hold the same notes from round 4 on
    expect(SAME_FROM).toBe(4)
    for (let k = SAME_FROM - 1; k < ROUNDS; k++) expect(leastAlike(REWRITING[k].output)).toBeGreaterThan(0.999)
    expect(leastAlike(REWRITING[SAME_FROM - 2].output)).toBeLessThan(0.999)
  })

  it('alike is 1 for the same pattern at any volume', () => {
    expect(alike([1, 2, 3, 6], [10, 20, 30, 60])).toBeCloseTo(1, 12)
    expect(alike([1, 2, 3, 6], [-1, -2, -3, -6])).toBeCloseTo(-1, 12)
  })
})

describe('what each word may see', () => {
  it('an encoder sees all words, a decoder only itself and earlier ones', () => {
    expect(sees('Encoder only', 1, 5)).toEqual([0, 1, 2, 3, 4])
    expect(sees('Decoder only', 1, 5)).toEqual([0, 1])
    expect(sees('Decoder only', 0, 5)).toEqual([0])
  })
})

describe('the cost', () => {
  it('scores every pair, so doubling the text quadruples it', () => {
    expect(pairs(512)).toBe(262_144)
    expect(pairs(4096)).toBe(16_777_216)
    expect(pairs(50_000)).toBe(2_500_000_000)
    expect(pairs(8000) / pairs(4000)).toBe(4)
  })
})

describe('the clip', () => {
  it('worked numbers: three slopes of 0.1', () => {
    const slopes = [CLIP_SLOPE, CLIP_SLOPE, CLIP_SLOPE]
    expect(plainPass(slopes)).toBeCloseTo(0.001, 12)
    expect(skipPass(slopes)).toBeCloseTo(1.331, 12)
  })

  it('the product with skips is the sum over every path (seeded)', () => {
    const random = seeded(9)
    for (let k = 0; k < 200; k++) {
      const slopes = randomVec(random, 1 + Math.floor(random() * 6), 1.5)
      expect(pathSum(slopes)).toBeCloseTo(skipPass(slopes), 9)
    }
  })

  it('the derivative of x + F(x) is 1 + F′(x), checked by finite differences', () => {
    const F = (x: number) => Math.tanh(0.7 * x)
    const dF = (x: number) => 0.7 * (1 - Math.tanh(0.7 * x) ** 2)
    for (const x of [-2, -0.3, 0, 1.1, 3]) {
      const h = 1e-6
      const numeric = (x + h + F(x + h) - (x - h + F(x - h))) / (2 * h)
      expect(numeric).toBeCloseTo(1 + dF(x), 6)
    }
  })
})
