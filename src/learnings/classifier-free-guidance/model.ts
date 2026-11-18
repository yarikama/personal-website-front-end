import { seeded } from '../../components/explain/random'

export type Vec = [number, number]

// The one line of maths: start from the guess made without the prompt and
// walk w times along what the prompt changes about it
export const guided = (uncond: number, cond: number, w: number) => uncond + w * (cond - uncond)
export const guidedVec = (uncond: Vec, cond: Vec, w: number): Vec => [
  guided(uncond[0], cond[0], w),
  guided(uncond[1], cond[1], w),
]

// The same, the way Ho and Salimans write it: (1 + s) cond − s uncond, where
// their s is our w − 1
export const paperForm = (uncond: number, cond: number, s: number) => (1 + s) * cond - s * uncond

// The worked numbers: one pixel of the noise guess, without and with the prompt
export const WORKED_UNCOND = 0.3
export const WORKED_COND = 0.5
export const WORKED_W = [0, 1, 7] as const

// The last check: a pixel the prompt pulls down instead of up
export const CHECK_UNCOND = 1.0
export const CHECK_COND = 0.8
export const CHECK_W = 4
export const CHECK_OPTIONS = [0.8, 0.2, 1.8, 3.2] as const

// ---------------------------------------------------------------------------
// The story: a street artist's faces, each two numbers (how long the nose is,
// how wide the face), measured from the ordinary face at the origin

export const ORDINARY: Vec = [0, 0]
export const SAM: Vec = [0.35, -0.2]
export const CARICATURE = 3
export const TOO_FAR = 10

// The crowd the artist has drawn, around the ordinary face
export const CROWD: Vec[] = (() => {
  const random = seeded(11)
  const out: Vec[] = []
  for (let i = 0; i < 40; i++) {
    const [a, b] = gaussianPair(random)
    out.push([0.32 * a, 0.3 * b])
  }
  return out
})()

// How a face at a point is drawn: the half-width of the face and the
// length of the nose, in drawing units
export const faceShape = ([nose, width]: Vec) => ({
  halfWidth: 18 * Math.exp(0.5 * width),
  nose: 6 + 10 * nose,
})

// ---------------------------------------------------------------------------
// The lab: pictures shrunk to points in the plane, three kinds of them. Each
// kind is a round Gaussian cloud, and the denoiser is the exact one for that
// data, so nothing here is trained: it is the best guess a network could learn.

export const KINDS = ['cat', 'dog', 'owl'] as const
export type Kind = (typeof KINDS)[number]
export const CENTRES: Record<Kind, Vec> = { cat: [-1, -0.6], dog: [1, -0.6], owl: [0, 1.1] }
// How far a kind's pictures spread around its centre
export const TAU = 0.5
// A loosely trained conditional model: told "owl", it gives the owl cloud
// this share of its belief and splits the rest between the others
export const FOLLOWS = 0.6
export const STEPS = 30
export const SAMPLES = 150
export const SEED = 7

// A cosine noise schedule: ᾱ_t from 1 (clean) at t = 0 to nearly 0 at t = T
export const ALPHA_BAR: number[] = (() => {
  const s = 0.008
  const f = (t: number) => Math.cos(((t / STEPS + s) / (1 + s)) * (Math.PI / 2)) ** 2
  return Array.from({ length: STEPS + 1 }, (_, t) => f(t) / f(0))
})()
export const BETA: number[] = Array.from({ length: STEPS }, (_, i) => Math.min(0.999, 1 - ALPHA_BAR[i + 1] / ALPHA_BAR[i]))

// How much each kind counts, with and without the prompt
export const unprompted = (): number[] => KINDS.map(() => 1 / KINDS.length)
export const prompted = (kind: Kind, follows = FOLLOWS): number[] =>
  KINDS.map((k) => (k === kind ? follows : (1 - follows) / (KINDS.length - 1)))

// The noisy pictures at step t: each kind's cloud shrunk by √ᾱ_t and blurred
// by the noise, x_t = √ᾱ_t x_0 + √(1 − ᾱ_t) ε
export function noisyDensity(x: Vec, t: number, weights: number[]): number {
  const a = Math.sqrt(ALPHA_BAR[t])
  const variance = a * a * TAU * TAU + (1 - ALPHA_BAR[t])
  let total = 0
  KINDS.forEach((kind, k) => {
    const c = CENTRES[kind]
    const d2 = (x[0] - a * c[0]) ** 2 + (x[1] - a * c[1]) ** 2
    total += (weights[k] * Math.exp(-d2 / (2 * variance))) / (2 * Math.PI * variance)
  })
  return total
}

// The best possible noise guess at x_t: ε̂ = −√(1 − ᾱ_t) ∇ log p(x_t)
export function noiseGuess(x: Vec, t: number, weights: number[]): Vec {
  const a = Math.sqrt(ALPHA_BAR[t])
  const variance = a * a * TAU * TAU + (1 - ALPHA_BAR[t])
  const logs = KINDS.map((kind, k) => {
    const c = CENTRES[kind]
    const d2 = (x[0] - a * c[0]) ** 2 + (x[1] - a * c[1]) ** 2
    return Math.log(weights[k]) - d2 / (2 * variance)
  })
  const top = Math.max(...logs)
  const share = logs.map((l) => Math.exp(l - top))
  const sum = share.reduce((p, q) => p + q, 0)
  let gx = 0
  let gy = 0
  KINDS.forEach((kind, k) => {
    const c = CENTRES[kind]
    gx += (share[k] / sum) * (a * c[0] - x[0])
    gy += (share[k] / sum) * (a * c[1] - x[1])
  })
  const s = Math.sqrt(1 - ALPHA_BAR[t])
  return [(-s * gx) / variance, (-s * gy) / variance]
}

function gaussianPair(random: () => number): Vec {
  const u = Math.max(random(), 1e-12)
  const v = random()
  const r = Math.sqrt(-2 * Math.log(u))
  return [r * Math.cos(2 * Math.PI * v), r * Math.sin(2 * Math.PI * v)]
}

// Generate n pictures of `kind` with guidance scale w: start from pure noise
// and run the steps backwards (DDPM's sampler), with the guided noise guess
// in place of the plain one. The same seed gives the same noise for every w,
// so the reader sees the same pictures move as w changes. `follows` is how
// much of its belief the prompted model puts on the kind asked for.
export function generate(kind: Kind | null, w: number, n = SAMPLES, seed = SEED, follows = FOLLOWS): Vec[] {
  const random = seeded(seed)
  const without = unprompted()
  const withPrompt = kind ? prompted(kind, follows) : without
  const points: Vec[] = Array.from({ length: n }, () => gaussianPair(random))
  for (let t = STEPS; t >= 1; t--) {
    const beta = BETA[t - 1]
    const shrink = beta / Math.sqrt(1 - ALPHA_BAR[t])
    const spread = Math.sqrt(beta)
    for (let i = 0; i < n; i++) {
      const x = points[i]
      const e = guidedVec(noiseGuess(x, t, without), noiseGuess(x, t, withPrompt), w)
      const z = t > 1 ? gaussianPair(random) : [0, 0]
      points[i] = [
        (x[0] - shrink * e[0]) / Math.sqrt(1 - beta) + spread * z[0],
        (x[1] - shrink * e[1]) / Math.sqrt(1 - beta) + spread * z[1],
      ]
    }
  }
  return points
}

// Which kind a picture looks like: the nearest centre
export function nearest(x: Vec): Kind {
  let best: Kind = KINDS[0]
  let bestD = Infinity
  for (const kind of KINDS) {
    const c = CENTRES[kind]
    const d = (x[0] - c[0]) ** 2 + (x[1] - c[1]) ** 2
    if (d < bestD) {
      bestD = d
      best = kind
    }
  }
  return best
}

export const middle = (points: Vec[]): Vec => [
  points.reduce((s, p) => s + p[0], 0) / points.length,
  points.reduce((s, p) => s + p[1], 0) / points.length,
]

// The middle of all three kinds, and the way out from it to one kind
const HUB = middle(KINDS.map((k) => CENTRES[k]))
export function outward(kind: Kind): Vec {
  const c = CENTRES[kind]
  const d = Math.hypot(c[0] - HUB[0], c[1] - HUB[1])
  return [(c[0] - HUB[0]) / d, (c[1] - HUB[1]) / d]
}

export interface Measure {
  // Share of pictures that look like the kind asked for
  onTarget: number
  // How spread out they are: root mean square distance from their middle, per axis
  spread: number
  // How far their middle sits past the kind's own centre, away from the
  // other kinds (negative: short of it)
  past: number
}

export function measure(kind: Kind, points: Vec[]): Measure {
  const m = middle(points)
  const sq = points.reduce((s, p) => s + (p[0] - m[0]) ** 2 + (p[1] - m[1]) ** 2, 0) / points.length
  const c = CENTRES[kind]
  const u = outward(kind)
  return {
    onTarget: points.filter((p) => nearest(p) === kind).length / points.length,
    spread: Math.sqrt(sq / 2),
    past: (m[0] - c[0]) * u[0] + (m[1] - c[1]) * u[1],
  }
}

// What the page quotes from the lab: the owl at a few guidance scales
export const QUOTED_W = [1, 3, 15] as const
export const QUOTED = QUOTED_W.map((w) => ({ w, ...measure('owl', generate('owl', w)) }))
export const quoted = (w: (typeof QUOTED_W)[number]) => QUOTED.find((q) => q.w === w)!
