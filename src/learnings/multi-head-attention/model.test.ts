import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  answers,
  attend,
  average,
  dot,
  draw,
  exactTallies,
  give,
  identity,
  LONG,
  LONG_NUDGE,
  LONG_PICK,
  LONG_SCALED,
  matmul,
  mostGive,
  multiHead,
  ONE_HEAD,
  PAIR,
  PAPER_DK,
  pick,
  rms,
  scoreCost,
  SHORT_NUDGE,
  SHORT_PICK,
  softmax,
  SPREADS,
  tallies,
  transpose,
  TWO_HEADS,
  ASKER,
  WORDS,
  WORKED,
  weightCount,
  type Head,
  type Matrix,
} from './model'

const close = (a: number, b: number, digits = 3) => expect(a).toBeCloseTo(b, digits)

describe('the quiz tally', () => {
  it('counts +1 per shared answer and −1 per differing one, by hand', () => {
    expect(dot([1, 1, -1, -1], [1, -1, -1, 1])).toBe(0)
    expect(dot([1, 1, 1, 1], [1, 1, 1, -1])).toBe(2)
    // The story's pair: three shared answers, five differing
    const shared = PAIR.you.filter((a, i) => a === PAIR.them[i]).length
    expect(PAIR.tally).toBe(shared - (PAIR.you.length - shared))
  })

  it('has the exact binomial spread: mean 0, variance d, found by brute force over every answer pattern', () => {
    for (const d of [1, 2, 3, 6, 10]) {
      // Every pattern of agreements, equally likely
      const counts = new Map<number, number>()
      for (let mask = 0; mask < 2 ** d; mask++) {
        let t = 0
        for (let i = 0; i < d; i++) t += mask & (1 << i) ? 1 : -1
        counts.set(t, (counts.get(t) ?? 0) + 1)
      }
      const exact = exactTallies(d)
      for (const { tally, chance } of exact) close(chance, (counts.get(tally) ?? 0) / 2 ** d, 12)
      close(exact.reduce((s, e) => s + e.chance * e.tally, 0), 0, 12)
      close(exact.reduce((s, e) => s + e.chance * e.tally ** 2, 0), d, 9)
    }
  })

  it('spreads like √d in seeded samples', () => {
    for (const { d, rms: r } of SPREADS) expect(Math.abs(r / Math.sqrt(d) - 1)).toBeLessThan(0.05)
    for (const d of [8, 32, 128]) {
      const t = tallies(d, 4000, d)
      expect(Math.abs(rms(t) / Math.sqrt(d) - 1)).toBeLessThan(0.04)
      // and the sample's histogram matches the exact chances
      for (const { tally, chance } of exactTallies(d).filter((e) => e.chance > 0.02)) {
        const seen = t.filter((x) => x === tally).length / t.length
        expect(Math.abs(seen - chance)).toBeLessThan(0.025)
      }
    }
  })

  it('draws answers of ±1 only, about half yes', () => {
    const a = answers(seeded(1), 10000)
    expect(a.every((x) => x === 1 || x === -1)).toBe(true)
    expect(Math.abs(a.filter((x) => x === 1).length / a.length - 0.5)).toBeLessThan(0.02)
  })
})

describe('the softmax and its give', () => {
  it('works by hand', () => {
    const w = softmax([0, Math.log(3)])
    close(w[0], 0.25, 12)
    close(w[1], 0.75, 12)
    close(give(w), 1 - 0.0625 - 0.5625, 12)
    close(give(softmax([1, 1, 1, 1])), mostGive(4), 12)
    expect(give(softmax([0, 1000]))).toBeLessThan(1e-12)
  })

  it('stays finite for huge scores', () => {
    const w = softmax([1000, 999])
    close(w[0], 1 / (1 + Math.exp(-1)), 12)
  })

  it('give is the trace of the Jacobian, against finite differences on seeded scores', () => {
    const random = seeded(9)
    for (let n = 0; n < 200; n++) {
      const scores = Array.from({ length: 6 }, () => (random() - 0.5) * 8)
      const w = softmax(scores)
      let trace = 0
      const h = 1e-6
      for (let i = 0; i < scores.length; i++) {
        const up = softmax(scores.map((s, j) => (j === i ? s + h : s)))[i]
        const down = softmax(scores.map((s, j) => (j === i ? s - h : s)))[i]
        trace += (up - down) / (2 * h)
      }
      close(give(w), trace, 6)
    }
  })
})

describe('scaling by √d', () => {
  it('keeps the scaled scores at spread 1, whatever d', () => {
    for (const d of [4, 64, 1024]) {
      const t = tallies(d, 3000, 5 * d)
      expect(Math.abs(rms(t.map((x) => x / Math.sqrt(d))) - 1)).toBeLessThan(0.05)
    }
  })

  it('unscaled, the biggest share climbs towards 1 and the give falls towards 0 as d grows', () => {
    const raw = [4, 16, 64, 256, 1024].map((d) => average(d, false))
    for (let i = 1; i < raw.length; i++) {
      expect(raw[i].top).toBeGreaterThan(raw[i - 1].top)
      expect(raw[i].give).toBeLessThan(raw[i - 1].give)
    }
    expect(raw[0].top).toBeLessThan(0.65)
    expect(raw.at(-1)!.top).toBeGreaterThan(0.95)
    expect(raw.at(-1)!.give).toBeLessThan(0.05)
  })

  it('scaled, the biggest share and the give hold still across d', () => {
    const scaled = [4, 16, 64, 256, 1024].map((d) => average(d, true))
    for (const s of scaled) {
      expect(Math.abs(s.top - 0.41)).toBeLessThan(0.03)
      expect(Math.abs(s.give - 0.71)).toBeLessThan(0.02)
    }
  })

  it('the worked numbers are the averages the page states', () => {
    expect(WORKED.map((w) => w.spread)).toEqual([2, 8, 32])
    expect(WORKED.map((w) => Math.round(100 * w.raw.top))).toEqual([58, 88, 97])
    for (const w of WORKED) expect(Math.round(100 * w.scaled.top)).toBeGreaterThanOrEqual(40)
    for (const w of WORKED) expect(Math.round(100 * w.scaled.top)).toBeLessThanOrEqual(42)
  })

  it('the story run looks like the averages', () => {
    // The short quiz: a lean, not a certainty, and a nudge moves it a lot
    expect(SHORT_PICK.top).toBeGreaterThan(0.5)
    expect(SHORT_PICK.top).toBeLessThan(0.7)
    expect(SHORT_NUDGE.before - SHORT_NUDGE.after).toBeGreaterThan(0.2)
    // The long quiz: one stranger takes almost everything, and a nudge moves it under a tenth of a point
    expect(LONG_PICK.top).toBeGreaterThan(0.999)
    expect(LONG_NUDGE.before - LONG_NUDGE.after).toBeLessThan(0.001)
    // Scaled, the same strangers share again
    expect(LONG_SCALED.top).toBeLessThan(0.5)
    expect(LONG.tallies).toEqual(draw(256, 2).tallies)
  })

  it('pick() agrees with softmax of the scaled tallies', () => {
    const p = pick([8, 0, -8], 16, true)
    const w = softmax([2, 0, -2])
    p.weights.forEach((x, i) => close(x, w[i], 12))
  })
})

describe('attention in matrix form', () => {
  // The same thing a word at a time: q_i = x_i Q, scores q_i · k_j / √d_k, weighted sum of v_j
  function byLoop(x: Matrix, { q, k, v }: Head): Matrix {
    const rowTimes = (row: number[], m: Matrix) => m[0].map((_, j) => row.reduce((s, a, i) => s + a * m[i][j], 0))
    const qs = x.map((r) => rowTimes(r, q))
    const ks = x.map((r) => rowTimes(r, k))
    const vs = x.map((r) => rowTimes(r, v))
    return qs.map((qi) => {
      const w = softmax(ks.map((kj) => dot(qi, kj) / Math.sqrt(qi.length)))
      return vs[0].map((_, c) => w.reduce((s, wj, j) => s + wj * vs[j][c], 0))
    })
  }

  it('multiplies and transposes by hand', () => {
    expect(matmul([[1, 2]], [[3], [4]])).toEqual([[11]])
    expect(transpose([[1, 2, 3]])).toEqual([[1], [2], [3]])
  })

  it('works a three-word case by hand', () => {
    // Q = K = V = I on x = (1,0), (0,1), (1,1): scores ÷ √2
    const x = [
      [1, 0],
      [0, 1],
      [1, 1],
    ]
    const { weights, out } = attend(x, { q: identity(2), k: identity(2), v: identity(2) })
    const a = Math.exp(1 / Math.SQRT2)
    close(weights[0][0], a / (2 * a + 1), 9)
    close(weights[0][1], 1 / (2 * a + 1), 9)
    close(out[0][0], (2 * a) / (2 * a + 1), 9)
    close(out[0][1], (a + 1) / (2 * a + 1), 9)
  })

  it('matches the word-at-a-time loop on seeded random matrices', () => {
    const random = seeded(31)
    const m = (r: number, c: number) => Array.from({ length: r }, () => Array.from({ length: c }, () => random() * 2 - 1))
    for (let n = 0; n < 50; n++) {
      const x = m(5, 4)
      const head = { q: m(4, 2), k: m(4, 2), v: m(4, 2) }
      const a = attend(x, head).out
      const b = byLoop(x, head)
      a.forEach((row, i) => row.forEach((val, j) => close(val, b[i][j], 9)))
      for (const row of attend(x, head).weights) close(row.reduce((s, w) => s + w, 0), 1, 12)
    }
  })

  it('one head through multiHead with Y = I is plain attention', () => {
    const random = seeded(4)
    const m = (r: number, c: number) => Array.from({ length: r }, () => Array.from({ length: c }, () => random() * 2 - 1))
    const x = m(3, 4)
    const head = { q: m(4, 4), k: m(4, 4), v: m(4, 4) }
    expect(multiHead(x, [head], identity(4)).out).toEqual(attend(x, head).out)
  })

  it('h heads of width d/h cost what one head of width d does, in weights and in score work', () => {
    for (const [d, h] of [
      [512, 8],
      [1024, 16],
      [4, 2],
    ]) {
      expect(weightCount(d, h)).toBe(weightCount(d, 1))
      expect(weightCount(d, h)).toBe(4 * d * d)
      expect(scoreCost(10, d, h)).toBe(scoreCost(10, d, 1))
    }
    expect(PAPER_DK).toBe(64)
  })
})

describe('the sentence', () => {
  it('two heads: “cooks” looks at “chef” in one and “pasta” in the other', () => {
    const [who, what] = TWO_HEADS.heads
    const chef = WORDS.indexOf('chef')
    const pasta = WORDS.indexOf('pasta')
    close(who.weights[ASKER][chef], 0.809, 3)
    close(what.weights[ASKER][pasta], 0.809, 3)
    // By hand: score 4/√2 against four zeros
    const e = Math.exp(4 / Math.SQRT2)
    close(who.weights[ASKER][chef], e / (e + 4), 12)
    close(TWO_HEADS.out[ASKER][0], e / (e + 4), 12)
    close(TWO_HEADS.out[ASKER][2], e / (e + 4), 12)
  })

  it('one head as wide must split one set of weights between them', () => {
    const w = ONE_HEAD.heads[0].weights[ASKER]
    const e = Math.exp(2)
    close(w[WORDS.indexOf('chef')], e / (2 * e + 3), 12)
    close(w[WORDS.indexOf('pasta')], e / (2 * e + 3), 12)
    close(w.reduce((s, x) => s + x, 0), 1, 12)
    // Its output: a blend, 42% person and 42% food in the same numbers
    close(ONE_HEAD.out[ASKER][0], 0.416, 3)
    close(ONE_HEAD.out[ASKER][1], 0.416, 3)
  })
})
