import { seeded } from '../../components/explain/random'

// Every number the page states, and the maths behind its figures. The
// figures only draw.

// ---------------------------------------------------------------------------
// Sketches: tiny 5 × 5 greyscale images, one value from 0 to 1 a pixel, row
// by row from the top left

export const SIDE = 5
export type Pixels = number[]
const grid = (on: (row: number, col: number) => boolean): Pixels =>
  Array.from({ length: SIDE * SIDE }, (_, i) => (on(Math.floor(i / SIDE), i % SIDE) ? 1 : 0))

export const BAR = grid((_, c) => c === 2)
export const DASH = grid((r) => r === 2)
export const SLASH = grid((r, c) => r + c === SIDE - 1)
export const BACKSLASH = grid((r, c) => r === c)

export interface Sketch {
  name: string
  pixels: Pixels
}
// In the order of the corners they sit in: top left, top right, bottom left, bottom right
export const SKETCHES: Sketch[] = [
  { name: 'bar', pixels: BAR },
  { name: 'dash', pixels: DASH },
  { name: 'slash', pixels: SLASH },
  { name: 'backslash', pixels: BACKSLASH },
]

// How far apart two images are: the squared error of one rebuilt as the other
export const squaredError = (a: Pixels, b: Pixels) => a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0)

// ---------------------------------------------------------------------------
// Codes in a plane. A blob is where one sketch's codes fall: a round
// Gaussian with a centre (its mean) and a spread (its standard deviation).
// An ordinary autoencoder's blob is a point, so its spread is all but zero.

export type Vec = [number, number]
export interface Blob {
  mean: Vec
  sd: number
}

// The plane the story draws runs from −PLANE to PLANE on both axes
export const PLANE = 3.5
// Random spots in the plane fall within SPREAD of the middle on both axes
export const SPREAD = 3.2
// A spot counts as practised when it lies within REACH spreads of some
// blob's centre: the decoder saw codes there in training. Elsewhere the loss
// never asked it anything, and the figures draw a scramble.
export const REACH = 2

// The story's codes, one blob per sketch, in the corners
export const FAR = 2.2
export const POINT_SD = 0.05
export const NUDGE_SD = 0.45
export const NEAR = 0.8
export const VAE_SD = 0.75
const corners = (d: number): Vec[] => [
  [-d, d],
  [d, d],
  [-d, -d],
  [d, -d],
]
export const AE_BLOBS: Blob[] = corners(FAR).map((mean) => ({ mean, sd: POINT_SD }))
export const NUDGED_BLOBS: Blob[] = corners(FAR).map((mean) => ({ mean, sd: NUDGE_SD }))
export const VAE_BLOBS: Blob[] = corners(NEAR).map((mean) => ({ mean, sd: VAE_SD }))
// A spot no sketch was given: halfway between the bar's blob and the dash's
export const BETWEEN: Vec = [0, NEAR]

const distance = (a: Vec, b: Vec) => Math.hypot(a[0] - b[0], a[1] - b[1])
export const practised = (z: Vec, blobs: Blob[]) => blobs.some((b) => distance(z, b.mean) <= REACH * b.sd)

// How much each sketch's blob explains the spot z: each blob's density there,
// over their total. The best a decoder can do at z, for squared error, is to
// draw this blend of the sketches (the average image among the codes it saw
// at z).
export function shares(z: Vec, blobs: Blob[]): number[] {
  // Log densities, shifted by the largest so nothing underflows
  const logs = blobs.map((b) => -(distance(z, b.mean) ** 2) / (2 * b.sd * b.sd) - 2 * Math.log(b.sd))
  const top = Math.max(...logs)
  const dens = logs.map((l) => Math.exp(l - top))
  const total = dens.reduce((a, b) => a + b, 0)
  return dens.map((d) => d / total)
}

export const blend = (weights: number[], images: Pixels[]): Pixels =>
  images[0].map((_, i) => weights.reduce((sum, w, k) => sum + w * images[k][i], 0))

// A scramble: what an untrained part of a decoder might draw, set by where
// the spot is, so the same spot always draws the same scramble
export function scramble(z: Vec): Pixels {
  const random = seeded(Math.round(1000 * z[0]) * 7919 + Math.round(1000 * z[1]) * 104729 + 17)
  return Array.from({ length: SIDE * SIDE }, () => random())
}

export interface Drawn {
  pixels: Pixels
  practised: boolean
}
export function decode(z: Vec, blobs: Blob[], sketches: Sketch[] = SKETCHES): Drawn {
  if (!practised(z, blobs)) return { pixels: scramble(z), practised: false }
  return { pixels: blend(shares(z, blobs), sketches.map((s) => s.pixels)), practised: true }
}

// ---------------------------------------------------------------------------
// Random spots

// A standard normal draw (Box–Muller)
export function gauss(random: () => number): number {
  const u = 1 - random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random())
}

export const SPOTS = 30
// Seeds chosen so each run lands on what its chance says (see the tests)
export const PLANE_SEED = 4
export const PRIOR_SEED = 41
// Spots anywhere in the plane, for the autoencoder, which has no say on
// where codes should come from
export const PLANE_SPOTS: Vec[] = (() => {
  const random = seeded(PLANE_SEED)
  return Array.from({ length: SPOTS }, () => [(2 * random() - 1) * SPREAD, (2 * random() - 1) * SPREAD] as Vec)
})()
// Spots drawn from the standard normal N(0, I), for the VAE
export const PRIOR_SPOTS: Vec[] = (() => {
  const random = seeded(PRIOR_SEED)
  return Array.from({ length: SPOTS }, () => [gauss(random), gauss(random)] as Vec)
})()

export const hits = (spots: Vec[], blobs: Blob[]) => spots.filter((z) => practised(z, blobs)).length
export const AE_HITS = hits(PLANE_SPOTS, AE_BLOBS)
export const NUDGED_HITS = hits(PLANE_SPOTS, NUDGED_BLOBS)
export const VAE_HITS = hits(PRIOR_SPOTS, VAE_BLOBS)

// ---------------------------------------------------------------------------
// The KL divergence of a blob from the standard normal, one coordinate:
// ½ (μ² + σ² − ln σ² − 1). Coordinates add.

export const kl = (mean: number, sd: number) => 0.5 * (mean * mean + sd * sd - Math.log(sd * sd) - 1)
export const blobKl = (b: Blob) => b.mean.reduce((sum, m) => sum + kl(m, b.sd), 0)

export const NUDGED_KL = blobKl(NUDGED_BLOBS[0])
export const VAE_KL = blobKl(VAE_BLOBS[0])

// The three worked numbers
export const WORKED = [
  { mean: 0, sd: 1, kl: kl(0, 1) },
  { mean: 2, sd: 1, kl: kl(2, 1) },
  { mean: 0, sd: 0.1, kl: kl(0, 0.1) },
]

// The reparameterization trick: draw ε from N(0, 1) on its own, then
// z = μ + σ ε. The encoder gives log σ², so σ = exp(½ log σ²) is always positive.
export const sdOf = (logVar: number) => Math.exp(0.5 * logVar)
export const reparameterize = (mean: number, logVar: number, eps: number) => mean + sdOf(logVar) * eps
export const TRICK = { mean: 0.8, logVar: Math.log(0.25), eps: 1.2 }
export const TRICK_SD = sdOf(TRICK.logVar)
export const TRICK_Z = reparameterize(TRICK.mean, TRICK.logVar, TRICK.eps)

// ---------------------------------------------------------------------------
// The lab: two sketches, the bar and the dash, with one-number codes. The
// bar's codes fall in N(−m, s²), the dash's in N(m, s²), and the decoder is
// the best one for squared error: at code z it draws the blend of the two
// in proportion to how likely each blob is there.

export const PAIR = [BAR, DASH]
export const PAIR_GAP = squaredError(BAR, DASH)
export const LINE = 4

export const logistic = (x: number) => 1 / (1 + Math.exp(-x))

// The share of the dash in what the decoder draws at z
export const dashShare = (z: number, m: number, s: number) => logistic((2 * m * z) / (s * s))

// The standard normal density and its cumulative distribution
export const phi = (x: number) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI)
export function Phi(x: number): number {
  // Abramowitz and Stegun 7.1.26, through the error function
  const t = 1 / (1 + (0.3275911 * Math.abs(x)) / Math.SQRT2)
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(x * x) / 2)
  return x >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y)
}

// The rebuild error of either sketch, averaged over its codes. The bar comes
// back with the dash mixed in at share w, an error of w² times the gap. It
// depends only on how far apart the blobs are in spreads, r = m / s:
// z = −m + s ε gives 2mz / s² = 2rε − 2r².
const EPS_STEP = 0.01
const EPS_EDGE = 8
export function rebuildError(r: number): number {
  let sum = 0
  for (let e = -EPS_EDGE; e <= EPS_EDGE + 1e-9; e += EPS_STEP) sum += phi(e) * logistic(2 * r * e - 2 * r * r) ** 2
  return PAIR_GAP * sum * EPS_STEP
}

// The whole loss for one sketch: rebuild error plus the weighted KL
export const pairLoss = (m: number, s: number, weight: number) => rebuildError(m / s) + weight * kl(m, s)

// For blobs r spreads apart, the KL is smallest at s² = 1 / (1 + r²), where
// it is ½ ln(1 + r²)
export const bestSd = (r: number) => 1 / Math.sqrt(1 + r * r)

// The best balance for a weight on the KL term: scan r, with the best s for each
const R_STEP = 0.02
const R_TOP = 12
const TABLE = Array.from({ length: Math.round(R_TOP / R_STEP) + 1 }, (_, i) => {
  const r = i * R_STEP
  return { r, rebuild: rebuildError(r), kl: 0.5 * Math.log(1 + r * r) }
})

export interface Balance {
  mean: number
  sd: number
  rebuild: number
  kl: number
  covered: number
}
export function balance(weight: number): Balance {
  let best = TABLE[0]
  for (const row of TABLE) if (row.rebuild + weight * row.kl < best.rebuild + weight * best.kl) best = row
  const sd = bestSd(best.r)
  const mean = best.r * sd
  return { mean, sd, rebuild: best.rebuild, kl: best.kl, covered: covered(mean, sd) }
}

// The chance a code drawn from N(0, 1) lands within REACH spreads of either
// blob: the share of samples the decoder has practised on
export function covered(m: number, s: number): number {
  const reach = REACH * s
  const lo = [-m - reach, m - reach]
  const hi = [-m + reach, m + reach]
  if (hi[0] >= lo[1]) return Phi(hi[1]) - Phi(lo[0])
  return Phi(hi[0]) - Phi(lo[0]) + Phi(hi[1]) - Phi(lo[1])
}

export const pairPractised = (z: number, m: number, s: number) => Math.min(Math.abs(z + m), Math.abs(z - m)) <= REACH * s
export function decodePair(z: number, m: number, s: number): Drawn {
  if (!pairPractised(z, m, s)) return { pixels: scramble([z, 0.5]), practised: false }
  const w = dashShare(z, m, s)
  return { pixels: blend([1 - w, w], PAIR), practised: true }
}

// The lab's slider runs over the weight's power of ten
export const WEIGHT_POWERS = { min: -4, max: 1, start: 0 }
export const weightOf = (power: number) => 10 ** power
// Where the strip under the lab decodes
export const STRIP = Array.from({ length: 9 }, (_, i) => -2.4 + 0.6 * i)

export const LOW = balance(weightOf(WEIGHT_POWERS.min))
export const MID = balance(weightOf(WEIGHT_POWERS.start))
export const HIGH = balance(weightOf(WEIGHT_POWERS.max))

// The check: sampling from a prior three times wider than N(0, I)
export const WIDE = 3
export const WIDE_SPOTS: Vec[] = PRIOR_SPOTS.map(([x, y]) => [WIDE * x, WIDE * y])
export const WIDE_HITS = hits(WIDE_SPOTS, VAE_BLOBS)

// What overlapping blobs cost the rebuilds: the bar's share in what is drawn
// at its own centre, and the shares at the spot between the bar and the dash
export const OWN_SHARE = shares(VAE_BLOBS[0].mean, VAE_BLOBS)[0]
export const BETWEEN_SHARES = shares(BETWEEN, VAE_BLOBS)

// The weight past which both blobs collapse onto N(0, 1), found by halving
export const COLLAPSE = (() => {
  let lo = weightOf(WEIGHT_POWERS.start)
  let hi = weightOf(WEIGHT_POWERS.max)
  for (let i = 0; i < 40; i++) {
    const mid = Math.sqrt(lo * hi)
    if (balance(mid).mean === 0) hi = mid
    else lo = mid
  }
  return hi
})()
