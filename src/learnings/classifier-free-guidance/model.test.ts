import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  ALPHA_BAR,
  BETA,
  CARICATURE,
  CENTRES,
  CHECK_COND,
  CHECK_OPTIONS,
  CHECK_UNCOND,
  CHECK_W,
  CROWD,
  faceShape,
  generate,
  guided,
  guidedVec,
  KINDS,
  measure,
  middle,
  noiseGuess,
  noisyDensity,
  ORDINARY,
  paperForm,
  prompted,
  quoted,
  SAM,
  STEPS,
  TAU,
  TOO_FAR,
  unprompted,
  WORKED_COND,
  WORKED_UNCOND,
  type Vec,
} from './model'

describe('the guided guess', () => {
  it('matches the worked numbers', () => {
    expect(guided(WORKED_UNCOND, WORKED_COND, 0)).toBeCloseTo(0.3, 12)
    expect(guided(WORKED_UNCOND, WORKED_COND, 1)).toBeCloseTo(0.5, 12)
    expect(guided(WORKED_UNCOND, WORKED_COND, 7)).toBeCloseTo(1.7, 12)
  })

  it('answers the last check with exactly one option', () => {
    const answer = guided(CHECK_UNCOND, CHECK_COND, CHECK_W)
    expect(answer).toBeCloseTo(0.2, 12)
    expect(CHECK_OPTIONS.filter((o) => Math.abs(o - answer) < 1e-9)).toHaveLength(1)
  })

  it('is the paper’s (1 + s) cond − s uncond with s = w − 1, and (1 − w) uncond + w cond', () => {
    const random = seeded(3)
    for (let i = 0; i < 200; i++) {
      const u = 4 * random() - 2
      const c = 4 * random() - 2
      const w = 15 * random()
      expect(paperForm(u, c, w - 1)).toBeCloseTo(guided(u, c, w), 10)
      expect((1 - w) * u + w * c).toBeCloseTo(guided(u, c, w), 10)
    }
  })
})

describe('the story', () => {
  it('walks Sam’s arrow 3 and 10 times from the ordinary face', () => {
    expect(guidedVec(ORDINARY, SAM, CARICATURE)[0]).toBeCloseTo(3 * SAM[0], 12)
    expect(guidedVec(ORDINARY, SAM, TOO_FAR)[1]).toBeCloseTo(10 * SAM[1], 12)
  })

  it('draws the ordinary face in the middle of the crowd', () => {
    const m = middle(CROWD)
    expect(Math.hypot(m[0], m[1])).toBeLessThan(0.12)
  })

  it('draws longer noses and narrower faces further along the arrow, still a face', () => {
    const shapes = [0, 1, CARICATURE, TOO_FAR].map((w) => faceShape(guidedVec(ORDINARY, SAM, w)))
    for (let i = 1; i < shapes.length; i++) {
      expect(shapes[i].nose).toBeGreaterThan(shapes[i - 1].nose)
      expect(shapes[i].halfWidth).toBeLessThan(shapes[i - 1].halfWidth)
    }
    expect(shapes.at(-1)!.halfWidth).toBeGreaterThan(4)
  })
})

describe('the noise schedule', () => {
  it('runs from clean to nearly pure noise', () => {
    expect(ALPHA_BAR[0]).toBe(1)
    expect(ALPHA_BAR[STEPS]).toBeLessThan(1e-3)
    for (let t = 1; t <= STEPS; t++) expect(ALPHA_BAR[t]).toBeLessThan(ALPHA_BAR[t - 1])
    for (const b of BETA) expect(b).toBeGreaterThan(0)
  })
})

describe('the exact denoiser', () => {
  it('is −√(1 − ᾱ_t) times the slope of log p(x_t), by finite differences', () => {
    const random = seeded(9)
    const h = 1e-5
    for (let i = 0; i < 200; i++) {
      const x: Vec = [5 * random() - 2.5, 5 * random() - 2.5]
      const t = 1 + Math.floor(random() * STEPS)
      const weights = random() < 0.5 ? unprompted() : prompted(KINDS[Math.floor(random() * 3)])
      const log = (p: Vec) => Math.log(noisyDensity(p, t, weights))
      const slope = [(log([x[0] + h, x[1]]) - log([x[0] - h, x[1]])) / (2 * h), (log([x[0], x[1] + h]) - log([x[0], x[1] - h])) / (2 * h)]
      const s = Math.sqrt(1 - ALPHA_BAR[t])
      const guess = noiseGuess(x, t, weights)
      expect(guess[0]).toBeCloseTo(-s * slope[0], 5)
      expect(guess[1]).toBeCloseTo(-s * slope[1], 5)
    }
  })

  it('makes the gap between guesses the pull of the hidden classifier, −√(1 − ᾱ_t) ∇ log p(c | x_t)', () => {
    const random = seeded(12)
    const h = 1e-5
    for (let i = 0; i < 100; i++) {
      const x: Vec = [4 * random() - 2, 4 * random() - 2]
      const t = 1 + Math.floor(random() * STEPS)
      const kind = KINDS[i % 3]
      const posterior = (p: Vec) => Math.log(noisyDensity(p, t, prompted(kind))) - Math.log(noisyDensity(p, t, unprompted()))
      const slope = [(posterior([x[0] + h, x[1]]) - posterior([x[0] - h, x[1]])) / (2 * h), (posterior([x[0], x[1] + h]) - posterior([x[0], x[1] - h])) / (2 * h)]
      const s = Math.sqrt(1 - ALPHA_BAR[t])
      const c = noiseGuess(x, t, prompted(kind))
      const u = noiseGuess(x, t, unprompted())
      expect(c[0] - u[0]).toBeCloseTo(-s * slope[0], 5)
      expect(c[1] - u[1]).toBeCloseTo(-s * slope[1], 5)
    }
  })
})

describe('the sampler', () => {
  it('draws one kind’s own cloud when the model follows the prompt fully (w = 1, all belief on it)', () => {
    // Then the prompted guess is a single Gaussian's, so the samples should
    // have that Gaussian's centre and spread
    const owl = CENTRES.owl
    const pts = generate('owl', 1, 3000, 21, 1)
    const m = middle(pts)
    expect(m[0]).toBeCloseTo(owl[0], 1)
    expect(m[1]).toBeCloseTo(owl[1], 1)
    const sd = Math.sqrt(pts.reduce((s, p) => s + (p[0] - m[0]) ** 2 + (p[1] - m[1]) ** 2, 0) / pts.length / 2)
    expect(Math.abs(sd - TAU)).toBeLessThan(0.05)
  })

  it('without guidance draws all three kinds about equally', () => {
    const pts = generate(null, 1, 3000, 4)
    for (const kind of KINDS) expect(Math.abs(measure(kind, pts).onTarget - 1 / 3)).toBeLessThan(0.06)
  })

  it('gets more on target and less varied as w grows, then slides past the centre', () => {
    for (const kind of KINDS) {
      const at = [1, 3, 15].map((w) => measure(kind, generate(kind, w, 600, 5)))
      expect(at[1].onTarget).toBeGreaterThan(at[0].onTarget + 0.2)
      expect(at[2].onTarget).toBeGreaterThan(0.97)
      expect(at[1].spread).toBeLessThan(at[0].spread)
      expect(at[2].spread).toBeLessThan(TAU)
      expect(at[2].past).toBeGreaterThan(at[1].past + 0.3)
    }
  })

  it('tells the numbers the page quotes', () => {
    expect(Math.round(100 * quoted(1).onTarget)).toBe(55)
    expect(Math.round(100 * quoted(3).onTarget)).toBe(92)
    expect(Math.abs(quoted(3).past)).toBeLessThan(0.05)
    expect(quoted(15).onTarget).toBe(1)
    expect(quoted(15).spread).toBeLessThan(TAU)
    expect(quoted(15).past).toBeGreaterThan(0.5)
  })
})
