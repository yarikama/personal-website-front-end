import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  AE_BLOBS,
  AE_HITS,
  BAR,
  BACKSLASH,
  balance,
  COLLAPSE,
  BETWEEN,
  bestSd,
  blend,
  blobKl,
  covered,
  DASH,
  dashShare,
  decode,
  decodePair,
  gauss,
  HIGH,
  hits,
  kl,
  LOW,
  MID,
  NUDGED_BLOBS,
  NUDGED_HITS,
  NUDGED_KL,
  pairLoss,
  PAIR_GAP,
  Phi,
  SPREAD,
  PLANE_SPOTS,
  practised,
  PRIOR_SPOTS,
  REACH,
  rebuildError,
  reparameterize,
  scramble,
  shares,
  SKETCHES,
  SLASH,
  SPOTS,
  squaredError,
  TRICK,
  TRICK_SD,
  TRICK_Z,
  VAE_BLOBS,
  VAE_HITS,
  VAE_KL,
  WIDE,
  WIDE_HITS,
  WORKED,
  type Blob,
  type Vec,
} from './model'

const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length
const sd = (values: number[]) => {
  const m = mean(values)
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2)))
}

// The KL divergence of N(μ, σ²) from N(0, 1) by brute force: the integral of
// q log(q / p) on a fine grid
function klByIntegral(mu: number, sigma: number): number {
  const q = (z: number) => Math.exp(-((z - mu) ** 2) / (2 * sigma * sigma)) / (sigma * Math.sqrt(2 * Math.PI))
  const p = (z: number) => Math.exp(-(z * z) / 2) / Math.sqrt(2 * Math.PI)
  const step = sigma / 400
  let sum = 0
  for (let z = mu - 12 * sigma; z <= mu + 12 * sigma; z += step) {
    const qz = q(z)
    if (qz > 0) sum += qz * Math.log(qz / p(z)) * step
  }
  return sum
}

describe('the sketches', () => {
  it('are four strokes of five pixels each, through the middle', () => {
    for (const s of SKETCHES) {
      expect(s.pixels).toHaveLength(25)
      expect(s.pixels.reduce((a, b) => a + b, 0)).toBe(5)
      expect(s.pixels[12]).toBe(1)
    }
  })

  it('the bar and the dash differ on 8 pixels: they share only the centre', () => {
    expect(PAIR_GAP).toBe(8)
    expect(squaredError(SLASH, BACKSLASH)).toBe(8)
    expect(squaredError(BAR, BAR)).toBe(0)
  })
})

describe('the KL divergence from N(0, 1)', () => {
  it('matches the hand-worked numbers', () => {
    expect(WORKED.map((w) => w.kl)).toEqual([0, 2, expect.closeTo(1.8076, 4)])
    // ½ (1 + 0.25 − ln 0.25 − 1) = ½ (0.25 + 1.3863)
    expect(kl(1, 0.5)).toBeCloseTo(0.8181, 4)
  })

  it('matches the integral of q log(q/p) on 40 seeded blobs', () => {
    const random = seeded(11)
    for (let i = 0; i < 40; i++) {
      const mu = 6 * random() - 3
      const sigma = 0.1 + 2.9 * random()
      expect(kl(mu, sigma)).toBeCloseTo(klByIntegral(mu, sigma), 4)
    }
  })

  it('is never negative, and zero only for N(0, 1) itself', () => {
    const random = seeded(12)
    for (let i = 0; i < 500; i++) expect(kl(4 * random() - 2, 0.05 + 3 * random())).toBeGreaterThanOrEqual(0)
    expect(kl(0, 1)).toBe(0)
    expect(kl(0.01, 1)).toBeGreaterThan(0)
    expect(kl(0, 0.99)).toBeGreaterThan(0)
  })

  it('adds over the coordinates of a round blob', () => {
    expect(VAE_KL).toBeCloseTo(2 * kl(0.8, 0.75), 12)
    expect(VAE_KL).toBeCloseTo(0.778, 3)
    expect(NUDGED_KL).toBeCloseTo(5.64, 2)
    // A point far out costs most of all
    expect(blobKl(AE_BLOBS[0])).toBeGreaterThan(NUDGED_KL)
  })
})

describe('the reparameterization trick', () => {
  it('works the page’s numbers: μ 0.8, log σ² = ln 0.25, ε 1.2', () => {
    expect(TRICK_SD).toBeCloseTo(0.5, 12)
    expect(TRICK_Z).toBeCloseTo(1.4, 12)
  })

  it('draws from N(μ, σ²): 20,000 seeded draws have mean μ and spread σ', () => {
    const random = seeded(5)
    const zs = Array.from({ length: 20000 }, () => reparameterize(TRICK.mean, TRICK.logVar, gauss(random)))
    expect(mean(zs)).toBeCloseTo(TRICK.mean, 1)
    expect(sd(zs)).toBeCloseTo(TRICK_SD, 1)
  })

  it('moves z by 1 for a step in μ, and by ε for a step in σ', () => {
    const h = 1e-6
    const z = (mu: number, s: number) => reparameterize(mu, Math.log(s * s), TRICK.eps)
    expect((z(TRICK.mean + h, 0.5) - z(TRICK.mean, 0.5)) / h).toBeCloseTo(1, 5)
    expect((z(TRICK.mean, 0.5 + h) - z(TRICK.mean, 0.5)) / h).toBeCloseTo(TRICK.eps, 5)
  })

  it('a standard normal from gauss has mean 0 and spread 1', () => {
    const random = seeded(6)
    const xs = Array.from({ length: 20000 }, () => gauss(random))
    expect(mean(xs)).toBeCloseTo(0, 1)
    expect(sd(xs)).toBeCloseTo(1, 1)
  })
})

describe('decoding a spot in the plane', () => {
  it('shares each spot among the blobs by their density there', () => {
    const random = seeded(8)
    for (let i = 0; i < 50; i++) {
      const z: Vec = [6 * random() - 3, 6 * random() - 3]
      const w = shares(z, VAE_BLOBS)
      const dens = VAE_BLOBS.map(
        (b) => Math.exp(-((z[0] - b.mean[0]) ** 2 + (z[1] - b.mean[1]) ** 2) / (2 * b.sd ** 2)) / (2 * Math.PI * b.sd ** 2),
      )
      const total = dens.reduce((a, b) => a + b, 0)
      w.forEach((share, k) => expect(share).toBeCloseTo(dens[k] / total, 10))
    }
  })

  it('draws a sketch back from its own centre: exactly when the blobs keep apart, mostly when they overlap', () => {
    VAE_BLOBS.forEach((b, k) => {
      const w = shares(b.mean, VAE_BLOBS)
      expect(w[k]).toBeGreaterThan(0.8)
      expect(w[k]).toBeLessThan(0.85)
    })
    for (const blobs of [AE_BLOBS, NUDGED_BLOBS]) {
      blobs.forEach((b, k) => {
        const drawn = decode(b.mean, blobs)
        expect(drawn.practised).toBe(true)
        drawn.pixels.forEach((v, i) => expect(v).toBeCloseTo(SKETCHES[k].pixels[i], 1))
      })
    }
  })

  it('draws a plus halfway between the bar and the dash', () => {
    const drawn = decode(BETWEEN, VAE_BLOBS)
    expect(drawn.practised).toBe(true)
    const [bar, dash, slash, back] = shares(BETWEEN, VAE_BLOBS)
    expect(bar).toBeCloseTo(dash, 12)
    expect(bar).toBeGreaterThan(0.4)
    expect(slash + back).toBeLessThan(0.2)
    // The centre is in every sketch; the arms are the bar's and the dash's
    expect(drawn.pixels[12]).toBeCloseTo(1, 12)
    expect(drawn.pixels[2]).toBeCloseTo(bar, 12)
    expect(drawn.pixels[10]).toBeCloseTo(dash, 12)
  })

  it('scrambles where no blob reaches, the same way every time', () => {
    const z: Vec = [0, 0]
    expect(practised(z, AE_BLOBS)).toBe(false)
    expect(decode(z, AE_BLOBS).pixels).toEqual(scramble(z))
    expect(scramble([1, 2])).not.toEqual(scramble([2, 1]))
  })

  it('a blend of sketches with weights adding to 1 stays between 0 and 1', () => {
    const b = blend([0.5, 0.5], [BAR, DASH])
    expect(Math.max(...b)).toBe(1)
    expect(Math.min(...b)).toBe(0)
  })
})

describe('the story’s runs land on what the chances say', () => {
  // The share of the plane within REACH spreads of the blobs, when they do not overlap
  const planeShare = (blobs: Blob[]) => blobs.reduce((s, b) => s + Math.PI * (REACH * b.sd) ** 2, 0) / (2 * SPREAD) ** 2
  // The chance a draw from N(0, I), scaled by `wide`, is practised, by a big seeded sample
  function priorShare(wide: number) {
    const random = seeded(99)
    let n = 0
    for (let i = 0; i < 100000; i++) if (practised([wide * gauss(random), wide * gauss(random)], VAE_BLOBS)) n++
    return n / 100000
  }

  it('spots anywhere in the plane: 0 of 30 hit the points, 7 of 30 the nudged blobs', () => {
    expect(PLANE_SPOTS).toHaveLength(SPOTS)
    for (const [x, y] of PLANE_SPOTS) expect(Math.max(Math.abs(x), Math.abs(y))).toBeLessThanOrEqual(SPREAD)
    expect(AE_HITS).toBe(Math.round(SPOTS * planeShare(AE_BLOBS)))
    expect(AE_HITS).toBe(0)
    expect(NUDGED_HITS).toBe(Math.round(SPOTS * planeShare(NUDGED_BLOBS)))
    expect(NUDGED_HITS).toBe(7)
  })

  it('spots from N(0, I): 28 of 30 land in a blob', () => {
    expect(VAE_HITS).toBe(Math.round(SPOTS * priorShare(1)))
    expect(VAE_HITS).toBe(28)
  })

  it('spots from a prior three times wider: 8 of 30', () => {
    expect(WIDE).toBe(3)
    expect(WIDE_HITS).toBe(Math.round(SPOTS * priorShare(WIDE)))
    expect(WIDE_HITS).toBe(8)
    expect(hits(PRIOR_SPOTS, AE_BLOBS)).toBe(0)
  })
})

describe('the lab: two sketches on a line', () => {
  // The bar's rebuild error by sampling: draw its codes, decode with the best decoder
  function rebuildBySampling(m: number, s: number, random: () => number) {
    let sum = 0
    const n = 40000
    for (let i = 0; i < n; i++) {
      const z = -m + s * gauss(random)
      const rebuilt = blend([1 - dashShare(z, m, s), dashShare(z, m, s)], [BAR, DASH])
      sum += squaredError(BAR, rebuilt)
    }
    return sum / n
  }

  it('the rebuild error is a quarter of the gap when the blobs sit together, and falls as they part', () => {
    expect(rebuildError(0)).toBeCloseTo(PAIR_GAP / 4, 6)
    for (let r = 0.1; r < 6; r += 0.1) expect(rebuildError(r)).toBeLessThan(rebuildError(r - 0.1))
  })

  it('matches sampling codes and decoding them, on 6 seeded blob pairs', () => {
    const random = seeded(21)
    for (let i = 0; i < 6; i++) {
      const m = 0.1 + 1.5 * random()
      const s = 0.2 + random()
      expect(rebuildError(m / s)).toBeCloseTo(rebuildBySampling(m, s, random), 1)
    }
  })

  it('for blobs r spreads apart, the KL is least at s² = 1 / (1 + r²), where it is ½ ln(1 + r²)', () => {
    for (const r of [0.5, 1, 2, 4]) {
      let best = Infinity
      for (let s = 0.01; s < 2; s += 0.0005) best = Math.min(best, kl(r * s, s))
      expect(kl(r * bestSd(r), bestSd(r))).toBeCloseTo(best, 6)
      expect(kl(r * bestSd(r), bestSd(r))).toBeCloseTo(0.5 * Math.log(1 + r * r), 10)
    }
  })

  it('finds the same balance as a brute-force search over m and s', () => {
    for (const weight of [0.01, 0.3, 1, 3, 10]) {
      const found = balance(weight)
      let best = Infinity
      for (let m = 0; m <= 1.2; m += 0.02) for (let s = 0.1; s <= 1.3; s += 0.02) best = Math.min(best, pairLoss(m, s, weight))
      const ours = found.rebuild + weight * found.kl
      expect(ours).toBeLessThanOrEqual(best + 1e-3)
      expect(pairLoss(found.mean, found.sd, weight)).toBeCloseTo(ours, 6)
    }
  })

  it('a heavier KL weight trades rebuild error for a smaller KL', () => {
    let last = balance(1e-4)
    for (let p = -3.9; p <= 1; p += 0.1) {
      const now = balance(10 ** p)
      expect(now.kl).toBeLessThanOrEqual(last.kl + 1e-12)
      expect(now.rebuild).toBeGreaterThanOrEqual(last.rebuild - 1e-12)
      last = now
    }
  })

  it('at the ends: narrow spikes that rebuild perfectly, or both blobs N(0, 1) and one blurred blend', () => {
    expect(LOW.rebuild).toBeLessThan(1e-4)
    expect(LOW.sd).toBeLessThan(0.25)
    expect(LOW.covered).toBeLessThan(0.45)
    expect(MID.rebuild).toBeCloseTo(0.19, 2)
    expect(MID.covered).toBeGreaterThan(0.9)
    expect(HIGH.mean).toBe(0)
    expect(HIGH.sd).toBe(1)
    expect(HIGH.rebuild).toBeCloseTo(PAIR_GAP / 4, 6)
    // Every code draws the same half-and-half plus
    for (const z of [-2, 0, 1.5]) expect(decodePair(z, HIGH.mean, HIGH.sd).pixels).toEqual(blend([0.5, 0.5], [BAR, DASH]))
  })

  it('collapses onto N(0, 1) past a weight of about 4', () => {
    expect(Math.round(COLLAPSE)).toBe(4)
    expect(balance(COLLAPSE * 1.01).mean).toBe(0)
    expect(balance(COLLAPSE * 0.99).mean).toBeGreaterThan(0)
  })

  it('its coverage matches sampling N(0, 1)', () => {
    const random = seeded(31)
    for (const [m, s] of [
      [0.9, 0.2],
      [0.88, 0.47],
      [0.3, 0.9],
    ]) {
      let n = 0
      for (let i = 0; i < 50000; i++) {
        const z = gauss(random)
        if (Math.min(Math.abs(z + m), Math.abs(z - m)) <= REACH * s) n++
      }
      expect(covered(m, s)).toBeCloseTo(n / 50000, 2)
    }
  })

  it('the normal CDF is right to four places', () => {
    expect(Phi(0)).toBeCloseTo(0.5, 6)
    expect(Phi(1.96)).toBeCloseTo(0.975, 3)
    expect(Phi(-1)).toBeCloseTo(0.1587, 4)
  })
})
