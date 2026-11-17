import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  BAKERIES,
  boundaries,
  CORNER,
  DATASETS,
  density,
  emStep,
  guess,
  hardShares,
  HALFWAY,
  LAB_ROUNDS,
  labRun,
  lloydStep,
  logLikelihood,
  misplaced,
  nearest,
  parcel,
  pointsOf,
  randomStart,
  responsibilities,
  sample,
  SD_FLOOR,
  STALL,
  STORY_FIT,
  STORY_N,
  STORY_POINTS,
  worked,
  type Dataset,
  type Mixture,
} from './model'

// A random mixture of k components, for the seeded checks
function randomMixture(random: () => number, k: number): Mixture {
  const raw = Array.from({ length: k }, () => 0.1 + random())
  const total = raw.reduce((a, b) => a + b, 0)
  return raw.map((w) => ({ weight: w / total, mean: 100 * random(), sd: 0.5 + 10 * random() }))
}

describe('the bell curve', () => {
  it('is 1/(σ√2π) at its centre and e^−½ of that one spread out', () => {
    expect(density(60, CORNER)).toBeCloseTo(1 / (2 * Math.sqrt(2 * Math.PI)), 12)
    expect(density(62, CORNER) / density(60, CORNER)).toBeCloseTo(Math.exp(-0.5), 12)
  })

  it('has area 1', () => {
    let area = 0
    for (let x = 0; x <= 160; x += 0.01) area += density(x, STALL) * 0.01
    expect(area).toBeCloseTo(1, 4)
  })
})

describe('responsibilities', () => {
  it('add up to 1, and match weight × density over the sum, on random mixtures', () => {
    const random = seeded(1)
    for (let trial = 0; trial < 300; trial++) {
      const mixture = randomMixture(random, 1 + Math.floor(random() * 4))
      const x = -20 + 140 * random()
      const shares = responsibilities(x, mixture)
      expect(shares.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12)
      // The direct formula, where it does not underflow
      const joint = mixture.map((c) => c.weight * density(x, c))
      const total = joint.reduce((a, b) => a + b, 0)
      if (total > 1e-200) joint.forEach((j, k) => expect(shares[k]).toBeCloseTo(j / total, 9))
    }
  })

  it('stay finite where every density underflows', () => {
    const shares = responsibilities(10_000, BAKERIES)
    expect(shares.every(Number.isFinite)).toBe(true)
    expect(shares[1]).toBeCloseTo(1, 12)
  })

  it('turn into k-means’ nearest mean as equal spreads shrink', () => {
    const random = seeded(2)
    for (let trial = 0; trial < 200; trial++) {
      const means = [100 * random(), 100 * random(), 100 * random()]
      const x = 100 * random()
      const tiny: Mixture = means.map((mean) => ({ weight: 1 / 3, mean, sd: 0.01 }))
      const sorted = means.map((m) => Math.abs(x - m)).sort((a, b) => a - b)
      if (sorted[1] - sorted[0] < 0.5) continue // too close to a tie to snap
      const shares = responsibilities(x, tiny)
      hardShares(x, means).forEach((h, k) => expect(shares[k]).toBeCloseTo(h, 9))
    }
  })
})

describe('the numbers the page states', () => {
  it('the halfway croissant: five of Corner’s spreads, 1.25 of the stall’s, almost surely the stall’s', () => {
    expect(HALFWAY).toBe(70)
    const g = guess()
    expect(g.cornerSpreads).toBe(5)
    expect(g.stallSpreads).toBe(1.25)
    // By hand: e^−12.5/2 against e^−0.78125/8
    const ratio = (Math.exp(-12.5) / 2) / (Math.exp(-0.78125) / 8)
    expect(g.corner).toBeCloseTo(ratio / (1 + ratio), 12)
    expect(g.stall).toBeGreaterThan(0.9999)
    expect(g.stall).toBeLessThan(0.99999)
  })

  it('the worked croissants: 62 g Corner’s 97%, 66 g Corner’s 17%, 38% when Corner fills three in four', () => {
    const [a, b, c] = worked()
    // 62 g: one of Corner's spreads, 2.25 of the stall's
    expect(a.heights[0]).toBeCloseTo(Math.exp(-0.5) / (2 * Math.sqrt(2 * Math.PI)), 12)
    expect(a.heights[1]).toBeCloseTo(Math.exp(-0.5 * 2.25 ** 2) / (8 * Math.sqrt(2 * Math.PI)), 12)
    expect(Math.round(100 * a.corner)).toBe(97)
    // 66 g: three of Corner's spreads, 1.75 of the stall's
    expect(b.heights[0]).toBeCloseTo(0.0022, 4)
    expect(b.heights[1]).toBeCloseTo(0.0108, 4)
    expect(Math.round(100 * b.corner)).toBe(17)
    // The same croissant, with the weights 0.75 and 0.25
    const by = (0.75 * b.heights[0]) / (0.75 * b.heights[0] + 0.25 * b.heights[1])
    expect(c.corner).toBeCloseTo(by, 12)
    expect(Math.round(100 * c.corner)).toBe(38)
  })

  it('the 9:40 parcel: four of the punctual courier’s spreads, and 93% the other’s', () => {
    const [punctual, other] = parcel()
    const ratio = (Math.exp(-8) / 5) / (Math.exp(-0.5 * (80 / 30) ** 2) / 30)
    expect(punctual).toBeCloseTo(ratio / (1 + ratio), 12)
    expect(Math.round(100 * other)).toBe(93)
  })
})

describe('EM', () => {
  it('never lowers the log-likelihood, on random data and random starts', () => {
    const random = seeded(3)
    for (let trial = 0; trial < 40; trial++) {
      const k = 1 + Math.floor(random() * 3)
      const truth = randomMixture(random, k)
      const points = sample(truth, 30 + Math.floor(random() * 120), 1000 + trial)
      const xs = points.map((p) => p.x)
      let mixture = randomStart(xs, k, trial)
      let before = logLikelihood(xs, mixture)
      for (let round = 0; round < 25; round++) {
        mixture = emStep(xs, mixture)
        const after = logLikelihood(xs, mixture)
        expect(after).toBeGreaterThanOrEqual(before - 1e-9)
        before = after
      }
    }
  })

  it('keeps the weights a distribution and every spread above the floor', () => {
    const xs = STORY_POINTS.map((p) => p.x)
    // A start with one bell sitting on a single croissant
    let mixture: Mixture = [
      { weight: 0.5, mean: xs[0], sd: 0.01 },
      { weight: 0.5, mean: 70, sd: 10 },
    ]
    for (let round = 0; round < 30; round++) {
      mixture = emStep(xs, mixture)
      expect(mixture.reduce((a, c) => a + c.weight, 0)).toBeCloseTo(1, 12)
      for (const c of mixture) expect(c.sd).toBeGreaterThanOrEqual(SD_FLOOR)
    }
  })

  it('does one round as worked by hand on three points', () => {
    const xs = [0, 1, 10]
    const start: Mixture = [
      { weight: 0.5, mean: 0, sd: 1 },
      { weight: 0.5, mean: 10, sd: 1 },
    ]
    // 0 and 10 are each all one component's; 1 is e^−½ against e^−40.5
    const r1 = 1 / (1 + Math.exp(-40))
    const total = 1 + r1 + responsibilities(10, start)[0]
    const next = emStep(xs, start)
    expect(next[0].weight).toBeCloseTo(total / 3, 12)
    expect(next[0].mean).toBeCloseTo(r1 / total, 12)
    expect(next[1].mean).toBeCloseTo(10, 6)
  })

  it('recovers the bakeries from a large bin', () => {
    const xs = sample(BAKERIES, 20_000, 77).map((p) => p.x)
    let mixture = randomStart(xs, 2, 1)
    for (let round = 0; round < 150; round++) mixture = emStep(xs, mixture)
    const end = mixture.slice().sort((a, b) => a.mean - b.mean)
    BAKERIES.forEach((truth, k) => {
      expect(end[k].weight).toBeCloseTo(truth.weight, 1)
      expect(Math.abs(end[k].mean - truth.mean)).toBeLessThan(0.3)
      expect(Math.abs(end[k].sd - truth.sd)).toBeLessThan(0.3)
    })
  })

  it('recovers three bakeries from a large bin', () => {
    const truth = DATASETS['Three bakeries'].mixture
    const xs = sample(truth, 20_000, 78).map((p) => p.x)
    let mixture = randomStart(xs, 3, 2)
    for (let round = 0; round < 200; round++) mixture = emStep(xs, mixture)
    const end = mixture.slice().sort((a, b) => a.mean - b.mean)
    truth.forEach((t, k) => {
      expect(Math.abs(end[k].weight - t.weight)).toBeLessThan(0.02)
      expect(Math.abs(end[k].mean - t.mean)).toBeLessThan(0.5)
      expect(Math.abs(end[k].sd - t.sd)).toBeLessThan(0.5)
    })
  })
})

describe('k-means', () => {
  it('sends each point to its nearest mean, and splits the axis halfway', () => {
    expect(nearest(64, [60, 80])).toBe(0)
    expect(nearest(71, [60, 80])).toBe(1)
    expect(boundaries([80, 60, 100])).toEqual([70, 90])
  })

  it('moves each mean to the average of its points', () => {
    const next = lloydStep([0, 2, 3, 9, 10, 11], [
      { weight: 0.5, mean: 0, sd: 1 },
      { weight: 0.5, mean: 3, sd: 1 },
    ])
    expect(next[0].mean).toBe(0)
    expect(next[1].mean).toBe(7)
  })
})

describe('the story', () => {
  it('has a bin of half and half', () => {
    expect(STORY_POINTS.length).toBe(STORY_N)
    expect(STORY_POINTS.filter((p) => p.source === 0).length).toBe(STORY_N / 2)
  })

  it('climbs to bells close to the bakeries, placing at most one croissant wrong', () => {
    const end = STORY_FIT.at(-1)!
    expect(Math.abs(end.mixture[0].mean - CORNER.mean)).toBeLessThan(1)
    expect(Math.abs(end.mixture[0].sd - CORNER.sd)).toBeLessThan(0.5)
    expect(Math.abs(end.mixture[1].mean - STALL.mean)).toBeLessThan(2)
    expect(end.misplaced).toBeLessThanOrEqual(1)
    expect(STORY_FIT[0].misplaced).toBeGreaterThan(end.misplaced)
    for (let r = 1; r < STORY_FIT.length; r++) expect(STORY_FIT[r].logLikelihood).toBeGreaterThanOrEqual(STORY_FIT[r - 1].logLikelihood)
    // Settled by the end: the last round barely moves it
    expect(end.logLikelihood - STORY_FIT.at(-2)!.logLikelihood).toBeLessThan(0.01)
  })
})

describe('the lab', () => {
  const sets = Object.keys(DATASETS) as Dataset[]

  it('climbs on every start, and misplaces fewer croissants than k-means on the first', () => {
    for (const dataset of sets) {
      for (let start = 0; start < 6; start++) {
        const soft = labRun(dataset, start, false)
        expect(soft.length).toBe(LAB_ROUNDS + 1)
        for (let r = 1; r < soft.length; r++) expect(soft[r].logLikelihood).toBeGreaterThanOrEqual(soft[r - 1].logLikelihood - 1e-9)
      }
      expect(labRun(dataset, 0, false).at(-1)!.misplaced).toBeLessThan(labRun(dataset, 0, true).at(-1)!.misplaced)
    }
  })

  it('has a start for three bakeries that gets stuck lower: why to try several', () => {
    const ends = [0, 1, 2, 3].map((s) => labRun('Three bakeries', s, false).at(-1)!.logLikelihood)
    expect(Math.max(...ends) - Math.min(...ends)).toBeGreaterThan(10)
    // The lab opens on a start that finds the best of them
    expect(Math.max(...ends) - ends[0]).toBeLessThan(0.5)
  })

  it('k-means pushes the wide bakery’s centre away from the tight one (the quick check)', () => {
    const points = pointsOf('Two bakeries')
    const hard = labRun('Two bakeries', 0, true).at(-1)!.mixture.slice().sort((a, b) => a.mean - b.mean)
    const soft = labRun('Two bakeries', 0, false).at(-1)!.mixture.slice().sort((a, b) => a.mean - b.mean)
    const stallMean = (k: number) => {
      const own = points.filter((p) => p.source === k).map((p) => p.x)
      return own.reduce((a, b) => a + b, 0) / own.length
    }
    // The wide one ends further out than its own croissants' average, and than EM puts it
    expect(hard[1].mean).toBeGreaterThan(stallMean(1) + 1)
    expect(hard[1].mean).toBeGreaterThan(soft[1].mean + 1)
    // and the tight one is pulled toward it
    expect(hard[0].mean).toBeGreaterThan(stallMean(0) + 0.5)
    expect(misplaced(points, labRun('Two bakeries', 0, true).at(-1)!.mixture, true)).toBe(labRun('Two bakeries', 0, true).at(-1)!.misplaced)
  })
})
