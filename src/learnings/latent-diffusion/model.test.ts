import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  afterPass,
  big,
  blur,
  CHECK_FEWER,
  count,
  decode,
  encode,
  FACTORS,
  fewer,
  fitPlane,
  FLOOR,
  FLOOR_NOISE,
  FLOOR_TILES,
  grainPattern,
  grouped,
  IMAGE_NUMBERS,
  LATENT_NUMBERS,
  PASSES,
  pct,
  planImages,
  PLAN_NOTES,
  REBUILDS,
  rms,
  SD_FEWER,
  SIDE,
  STORY,
  STORY_FEWER,
  type Grid,
  type Notes,
} from './model'

describe('counting numbers per step', () => {
  it('matches the sums worked by hand', () => {
    expect(IMAGE_NUMBERS).toBe(786432)
    expect(LATENT_NUMBERS).toBe(16384)
    expect(SD_FEWER).toBe(48)
    expect(IMAGE_NUMBERS / LATENT_NUMBERS).toBe(48)
  })

  it('agrees with dividing the two counts, for random sizes', () => {
    const random = seeded(1)
    for (let n = 0; n < 200; n++) {
      const f = 1 + Math.floor(random() * 16)
      const side = f * (1 + Math.floor(random() * 64))
      const c = 1 + Math.floor(random() * 16)
      expect(fewer(f, 3, c)).toBeCloseTo(count(side, 3) / count(side / f, c), 9)
    }
  })

  it('gives the check its answer', () => {
    expect(CHECK_FEWER).toBe(16)
    expect(count(512, 3) / count(128, 3)).toBe(16)
  })

  it('reads as the page writes it', () => {
    expect(grouped(786432)).toBe('786,432')
    expect(grouped(16384)).toBe('16,384')
    expect(big(PASSES * IMAGE_NUMBERS)).toBe('39.3 million')
    expect(big(PASSES * LATENT_NUMBERS)).toBe('819,200')
    expect(pct(0.116)).toBe('12%')
  })
})

describe('the floor', () => {
  it('is 32 by 32 tiles, every one between 0 and 1', () => {
    expect(FLOOR).toHaveLength(SIDE)
    expect(FLOOR_TILES).toBe(1024)
    for (const row of FLOOR) {
      expect(row).toHaveLength(SIDE)
      for (const v of row) {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(1)
      }
    }
  })
})

// Least squares by brute force: the error of a plane through a block
const planeError = (b: Grid, bright: number, across: number, down: number) => {
  const f = b.length
  let s = 0
  for (let i = 0; i < f; i++)
    for (let j = 0; j < f; j++) {
      const u = (j + 0.5 - f / 2) / f
      const v = (i + 0.5 - f / 2) / f
      s += (b[i][j] - bright - across * u - down * v) ** 2
    }
  return s
}

describe('the plane through a patch', () => {
  it('finds a plane it was given exactly', () => {
    const f = 4
    const b = Array.from({ length: f }, (_, i) => Array.from({ length: f }, (_, j) => 0.5 + 0.2 * ((j + 0.5 - 2) / 4) - 0.1 * ((i + 0.5 - 2) / 4)))
    const p = fitPlane(b)
    expect(p.bright).toBeCloseTo(0.5, 9)
    expect(p.across).toBeCloseTo(0.2, 9)
    expect(p.down).toBeCloseTo(-0.1, 9)
  })

  it('is the least-squares best: nudging it never lowers the error', () => {
    const random = seeded(2)
    for (let n = 0; n < 200; n++) {
      const f = [2, 4, 8][n % 3]
      const b = Array.from({ length: f }, () => Array.from({ length: f }, () => random()))
      const p = fitPlane(b)
      const best = planeError(b, p.bright, p.across, p.down)
      for (let k = 0; k < 5; k++) {
        const d = () => (random() - 0.5) * 0.2
        expect(planeError(b, p.bright + d(), p.across + d(), p.down + d())).toBeGreaterThanOrEqual(best - 1e-12)
      }
    }
  })
})

describe("the tiler's grain", () => {
  it('has no brightness or shading of its own, and a root mean square of 1', () => {
    for (const f of FACTORS) {
      const g = grainPattern(f)
      const p = fitPlane(g)
      expect(p.bright).toBeCloseTo(0, 9)
      expect(p.across).toBeCloseTo(0, 9)
      expect(p.down).toBeCloseTo(0, 9)
      expect(Math.sqrt(g.flat().reduce((s, v) => s + v * v, 0) / (f * f))).toBeCloseTo(1, 9)
    }
  })
})

describe('encoding and decoding', () => {
  it('turns the floor into 4 notes for every patch', () => {
    expect(STORY.plan.notes).toHaveLength(8)
    expect(PLAN_NOTES).toBe(256)
    expect(STORY_FEWER).toBe(4)
    expect(REBUILDS[2].numbers).toBe(1024)
    expect(REBUILDS[16].numbers).toBe(16)
  })

  it('gets back any plan it laid, when no tile had to be clipped', () => {
    const random = seeded(3)
    for (let n = 0; n < 100; n++) {
      const f = FACTORS[n % FACTORS.length]
      const side = 2
      const notes: Notes[][] = Array.from({ length: side }, () =>
        Array.from({ length: side }, () => [0.4 + 0.2 * random(), (random() - 0.5) * 0.2, (random() - 0.5) * 0.2, 0.05 * random()] as Notes),
      )
      const back = encode(decode({ f, notes }), f)
      for (let i = 0; i < side; i++)
        for (let j = 0; j < side; j++) for (let k = 0; k < 4; k++) expect(back.notes[i][j][k]).toBeCloseTo(notes[i][j][k], 9)
    }
  })

  it('keeps each patch’s brightness and amount of grain, not its specks', () => {
    const plan = STORY.plan
    const again = encode(STORY.floor, STORY.plan.f)
    let notesOff = 0
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) notesOff = Math.max(notesOff, Math.abs(again.notes[i][j][0] - plan.notes[i][j][0]))
    expect(notesOff).toBeLessThan(0.03)
    expect(rms(FLOOR, STORY.floor)).toBeGreaterThan(0.05)
  })

  it('is off far less from across the room than up close, as the story tells it', () => {
    expect(pct(STORY.close)).toBe('12%')
    expect(pct(STORY.far)).toBe('2%')
    expect(STORY.far).toBeLessThan(STORY.close / 4)
  })

  it('loses more the bigger the patch', () => {
    const far = FACTORS.map((f) => REBUILDS[f].far)
    for (let k = 1; k < far.length; k++) expect(far[k]).toBeGreaterThan(far[k - 1])
    expect(REBUILDS[8].far).toBeGreaterThan(2 * REBUILDS[4].far)
  })
})

describe('the blur', () => {
  it('leaves a flat floor flat and averages a single bright tile into its neighbours', () => {
    const flat = Array.from({ length: 4 }, () => Array(4).fill(0.3))
    expect(blur(flat).flat().every((v) => Math.abs(v - 0.3) < 1e-12)).toBe(true)
    const dot = Array.from({ length: 5 }, (_, i) => Array.from({ length: 5 }, (_, j) => (i === 2 && j === 2 ? 0.9 : 0)))
    expect(blur(dot)[2][2]).toBeCloseTo(0.1, 12)
    expect(blur(dot)[1][1]).toBeCloseTo(0.1, 12)
    expect(blur(dot)[0][0]).toBe(0)
  })
})

describe('the scripted passes', () => {
  it('start from noise and end on the target', () => {
    const end = afterPass(FLOOR, FLOOR_NOISE, PASSES)
    expect(rms(end, FLOOR)).toBeLessThan(1e-12)
    expect(rms(afterPass(FLOOR, FLOOR_NOISE, 0), FLOOR)).toBeGreaterThan(0.15)
  })

  it('come closer at every pass', () => {
    let last = Infinity
    for (let k = 0; k <= PASSES; k += 5) {
      const off = rms(afterPass(FLOOR, FLOOR_NOISE, k), FLOOR)
      expect(off).toBeLessThan(last + 1e-9)
      last = off
    }
  })
})

describe("the plan's pictures", () => {
  it('are four grids of values between 0 and 1', () => {
    const images = planImages(STORY.plan)
    expect(images).toHaveLength(4)
    for (const g of images) for (const v of g.flat()) expect(v >= 0 && v <= 1).toBe(true)
  })
})
