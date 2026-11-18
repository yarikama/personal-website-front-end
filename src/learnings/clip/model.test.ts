import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  alike,
  chancesOf,
  CLASSES,
  DUPLICATE_BEST,
  EVEN_LOSS,
  gradient,
  HOUSE,
  lossAt,
  lossOf,
  N,
  NEW_PICTURES,
  perfectChance,
  perfectLoss,
  PICTURES,
  RUNS,
  similarities,
  STEPS,
  STORY_AFTER,
  STORY_BEFORE,
  TEMPERATURES,
  TRAINED,
  WORKED,
  zeroShot,
  type Arrows,
} from './model'

const randomArrows = (random: () => number, n = N): Arrows => ({
  pictures: Array.from({ length: n }, () => random() * 360),
  captions: Array.from({ length: n }, () => random() * 360),
})
// The gap between two angles, from 0 to 180
const gap = (a: number, b: number) => {
  const d = (((a - b) % 360) + 360) % 360
  return Math.min(d, 360 - d)
}

describe('the postcards', () => {
  it('are four 8×8 pictures with pixels 0, ½ or 1', () => {
    expect(PICTURES).toHaveLength(4)
    for (const p of [...PICTURES, ...NEW_PICTURES]) {
      expect(p.pixels).toHaveLength(8)
      for (const row of p.pixels) {
        expect(row).toHaveLength(8)
        for (const x of row) expect([0, 0.5, 1]).toContain(x)
      }
    }
  })
})

describe('scores and chances', () => {
  it('score arrows by the cosine of the angle between them', () => {
    expect(alike(30, 30)).toBeCloseTo(1, 12)
    expect(alike(0, 90)).toBeCloseTo(0, 12)
    expect(alike(10, 190)).toBeCloseTo(-1, 12)
    expect(alike(0, 60)).toBeCloseTo(0.5, 12)
  })

  it('give every row and every column chances that add up to 1', () => {
    const random = seeded(7)
    for (let trial = 0; trial < 200; trial++) {
      const S = similarities(randomArrows(random))
      const { rows, columns } = chancesOf(S, 0.05 + random())
      for (const p of [...rows, ...columns]) expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12)
    }
  })

  it('work out by hand for the house at the start, at τ = 1', () => {
    // Row: the house picture at 95° against the captions at 200°, 50°, 300°, 130°
    const row = [Math.cos((-105 * Math.PI) / 180), Math.cos((45 * Math.PI) / 180), Math.cos((-205 * Math.PI) / 180), Math.cos((-35 * Math.PI) / 180)]
    WORKED.row.scores.forEach((s, j) => expect(s).toBeCloseTo(row[j], 12))
    const e = row.map(Math.exp)
    const chance = e[HOUSE] / e.reduce((a, b) => a + b, 0)
    expect(WORKED.row.chance).toBeCloseTo(chance, 12)
    expect(WORKED.row.chance).toBeCloseTo(0.371, 3)
    expect(WORKED.row.loss).toBeCloseTo(0.993, 3)
    // It is not even the row's favourite: the lake caption beats it
    expect(WORKED.rowWinner).toBe(3)
    expect(WORKED.rowWinnerChance).toBeCloseTo(0.415, 3)
    // Column: the house caption at 50° against the pictures at 20°, 95°, 160°, 250°
    expect(WORKED.column.chance).toBeCloseTo(0.368, 3)
    expect(WORKED.column.loss).toBeCloseTo(0.999, 3)
    // The whole batch, worse than guessing evenly (ln 4 = 1.39)
    expect(WORKED.total).toBeCloseTo(2.022, 3)
    expect(EVEN_LOSS).toBeCloseTo(1.386, 3)
  })
})

describe('the loss', () => {
  it('is the same with pictures and captions swapped', () => {
    const random = seeded(11)
    for (let trial = 0; trial < 200; trial++) {
      const a = randomArrows(random)
      const tau = 0.05 + random()
      expect(lossAt({ pictures: a.captions, captions: a.pictures }, tau)).toBeCloseTo(lossAt(a, tau), 10)
    }
  })

  it('matches −ln of each right answer, averaged over rows and over columns', () => {
    const random = seeded(12)
    for (let trial = 0; trial < 100; trial++) {
      const S = similarities(randomArrows(random))
      const tau = 0.05 + random()
      // Brute force: write each quiz's softmax out in full
      let rows = 0
      let columns = 0
      for (let k = 0; k < N; k++) {
        let rowSum = 0
        let columnSum = 0
        for (let t = 0; t < N; t++) {
          rowSum += Math.exp(S[k][t] / tau)
          columnSum += Math.exp(S[t][k] / tau)
        }
        rows += -Math.log(Math.exp(S[k][k] / tau) / rowSum)
        columns += -Math.log(Math.exp(S[k][k] / tau) / columnSum)
      }
      expect(lossOf(S, tau).total).toBeCloseTo((rows / N + columns / N) / 2, 9)
    }
  })

  it('has the slope the finite differences give', () => {
    const random = seeded(13)
    const h = 1e-5
    for (let trial = 0; trial < 50; trial++) {
      const a = randomArrows(random)
      const tau = TEMPERATURES[trial % TEMPERATURES.length]
      const g = gradient(a, tau)
      for (const side of ['pictures', 'captions'] as const) {
        for (let i = 0; i < N; i++) {
          const nudge = (by: number) => ({ ...a, [side]: a[side].map((x, k) => (k === i ? x + by : x)) })
          const numeric = (lossAt(nudge(h), tau) - lossAt(nudge(-h), tau)) / (2 * h)
          expect(g[side][i]).toBeCloseTo(numeric, 6)
        }
      }
    }
  })
})

describe('temperature', () => {
  it('caps the chance at about 53% at τ = 1, even placed perfectly', () => {
    // Each row's scores are 1, 0, −1, 0
    const e = Math.E
    expect(perfectChance(1)).toBeCloseTo(e / (e + 2 + 1 / e), 12)
    expect(perfectChance(1)).toBeCloseTo(0.534, 3)
    expect(perfectLoss(1)).toBeCloseTo(0.627, 3)
    expect(perfectChance(0.3)).toBeCloseTo(0.932, 3)
    expect(perfectChance(0.07)).toBeGreaterThan(0.99999)
  })

  it('no arrangement beats the perfect one at τ = 1 (seeded random search)', () => {
    const random = seeded(21)
    for (let trial = 0; trial < 5000; trial++) {
      expect(lossAt(randomArrows(random), 1)).toBeGreaterThan(perfectLoss(1) - 1e-9)
    }
  })
})

describe('training', () => {
  it('starts badly: the house gets 40% at best, the others almost nothing', () => {
    expect(Math.max(...STORY_BEFORE)).toBeCloseTo(0.4, 2)
    for (const [k, c] of STORY_BEFORE.entries()) if (k !== HOUSE) expect(c).toBeLessThan(0.02)
  })

  it('ends with every picture’s own caption on about 90% or more', () => {
    for (const c of STORY_AFTER) expect(c).toBeGreaterThan(0.89)
    // And each pair lined up within ten degrees
    TRAINED.pictures.forEach((a, k) => expect(gap(a, TRAINED.captions[k])).toBeLessThan(10))
  })

  it('lowers the loss at every step, at every temperature', () => {
    for (const tau of TEMPERATURES) {
      const run = RUNS[tau]
      expect(run).toHaveLength(STEPS + 1)
      for (let t = 1; t < run.length; t++) expect(lossAt(run[t], tau)).toBeLessThanOrEqual(lossAt(run[t - 1], tau) + 1e-12)
    }
  })

  it('reaches the perfect arrangement’s floor at τ = 1', () => {
    expect(lossAt(RUNS[1][STEPS], 1)).toBeCloseTo(perfectLoss(1), 2)
  })

  it('at 0.07 the loss all but vanishes before the pairs line up', () => {
    const end = RUNS[0.07][STEPS]
    expect(lossAt(end, 0.07)).toBeLessThan(0.01)
    expect(Math.max(...end.pictures.map((a, k) => gap(a, end.captions[k])))).toBeGreaterThan(20)
  })
})

describe('zero-shot', () => {
  it('picks the right class for each new picture', () => {
    for (const p of NEW_PICTURES) {
      const { pick, chances } = zeroShot(p)
      expect(CLASSES[pick]).toBe(CLASSES[p.of])
      expect(chances[pick]).toBeGreaterThan(0.9)
    }
  })
})

describe('duplicates', () => {
  it('two identical captions leave each of their rows at most half', () => {
    const random = seeded(31)
    for (let trial = 0; trial < 500; trial++) {
      const a = randomArrows(random)
      a.captions[1] = a.captions[0]
      const { rows } = chancesOf(similarities(a), 0.01 + random())
      expect(rows[0][0]).toBeLessThanOrEqual(DUPLICATE_BEST + 1e-12)
      expect(rows[1][1]).toBeLessThanOrEqual(DUPLICATE_BEST + 1e-12)
      expect(rows[0][0] + rows[1][1]).toBeLessThanOrEqual(1 + 1e-12)
    }
  })
})
