import { seeded } from '../../components/explain/random'

// A toy diffusion model in the plane. The data is two flocks of sheep, each a
// round Gaussian cloud; noising them is the forward process of DDPM, and
// because the data's shape is known, the best possible noise guess (the one a
// network trained with squared error converges to) can be worked out exactly.
// So nothing here is trained, and every number the page states comes from
// these functions.

export type Vec = [number, number]

// The two flocks: by the barn (upper left) and by the pond (lower right),
// with the middle of the field at the origin
export const FLOCKS: Vec[] = [
  [-1.6, 0.9],
  [1.6, -0.9],
]
export const FLOCK_NAMES = ['Barn', 'Pond'] as const
// How far a flock's sheep stand from its centre, in each direction
export const SPREAD = 0.3
// A sheep within this of a flock's centre is on it: 99% of real ones are
export const ON_FLOCK = 3 * SPREAD
export const SHEEP = 200

// The story's schedule: T steps (minutes), each adding noise of variance β
export const T = 100
export const BETA = 0.05

// What is left of the start after t steps of variance β each: ᾱ_t, the
// product of (1 − β) over the steps so far
export const alphaBar = (t: number, beta = BETA) => (1 - beta) ** t
// After the story's 100 minutes, about 0.006: the lab's runs all end here
export const END = alphaBar(T)

// One standard normal draw, by Box–Muller
export function normal(random: () => number): number {
  const u = 1 - random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random())
}
const pair = (random: () => number): Vec => [normal(random), normal(random)]

// Two flocks of sheep, half in each
export function flocks(random: () => number, n = SHEEP): Vec[] {
  return Array.from({ length: n }, (_, i) => {
    const [cx, cy] = FLOCKS[i % 2]
    const [a, b] = pair(random)
    return [cx + SPREAD * a, cy + SPREAD * b]
  })
}

// One forward step: shrink toward the middle by √(1 − β), add noise of
// variance β
export const forwardStep = (x: Vec, beta: number, noise: Vec): Vec => {
  const keep = Math.sqrt(1 - beta)
  const add = Math.sqrt(beta)
  return [keep * x[0] + add * noise[0], keep * x[1] + add * noise[1]]
}

// The closed form: straight from x₀ to step t, x_t = √ᾱ x₀ + √(1 − ᾱ) ε
export const jumpTo = (x0: Vec, a: number, eps: Vec): Vec => {
  const keep = Math.sqrt(a)
  const add = Math.sqrt(1 - a)
  return [keep * x0[0] + add * eps[0], keep * x0[1] + add * eps[1]]
}

// The start that a sample x_t and its noise imply: x₀ = (x_t − √(1 − ᾱ) ε) / √ᾱ
export const startFrom = (xt: number, a: number, eps: number) => (xt - Math.sqrt(1 - a) * eps) / Math.sqrt(a)

// Which flock a sample at step t (left with ᾱ = a) came from, as chances
export function chances(x: Vec, a: number): number[] {
  const v = a * SPREAD ** 2 + 1 - a
  const logs = FLOCKS.map(([cx, cy]) => -((x[0] - Math.sqrt(a) * cx) ** 2 + (x[1] - Math.sqrt(a) * cy) ** 2) / (2 * v))
  const top = Math.max(...logs)
  const weights = logs.map((l) => Math.exp(l - top))
  const sum = weights.reduce((s, w) => s + w, 0)
  return weights.map((w) => w / sum)
}

// The best guess of the noise in x_t: the average noise over every start
// that could have led there. This is what squared-error training aims at.
export function bestNoise(x: Vec, a: number): Vec {
  const v = a * SPREAD ** 2 + 1 - a
  const r = chances(x, a)
  const scale = Math.sqrt(1 - a) / v
  let ex = 0
  let ey = 0
  FLOCKS.forEach(([cx, cy], k) => {
    ex += r[k] * scale * (x[0] - Math.sqrt(a) * cx)
    ey += r[k] * scale * (x[1] - Math.sqrt(a) * cy)
  })
  return [ex, ey]
}

// The best guess of where x_t started: the closed form, solved with the
// best noise guess
export function bestStart(x: Vec, a: number): Vec {
  const [ex, ey] = bestNoise(x, a)
  return [startFrom(x[0], a, ex), startFrom(x[1], a, ey)]
}

// One backward step of DDPM, from step t of a schedule with variance β per
// step: take away the scaled noise guess, undo the shrink, and (but for the
// last step) add fresh noise of variance β
export function backStep(x: Vec, t: number, beta: number, noise: Vec | null): Vec {
  const a = alphaBar(t, beta)
  const [ex, ey] = bestNoise(x, a)
  const share = beta / Math.sqrt(1 - a)
  const undo = 1 / Math.sqrt(1 - beta)
  const fresh = noise && t > 1 ? Math.sqrt(beta) : 0
  return [
    undo * (x[0] - share * ex) + fresh * (noise ? noise[0] : 0),
    undo * (x[1] - share * ey) + fresh * (noise ? noise[1] : 0),
  ]
}

// The variance per step for a schedule of `steps` steps that ends where the
// story's does
export const betaFor = (steps: number) => 1 - END ** (1 / steps)

// Every frame of a backward run from `start`, `steps` steps long; at most
// about `frames` frames are kept, evenly spaced, with the last always kept
export function backward(start: Vec[], steps: number, fresh: boolean, seed: number, frames = 100): Vec[][] {
  const random = seeded(seed)
  const beta = betaFor(steps)
  const every = Math.max(1, Math.round(steps / frames))
  const kept: Vec[][] = [start]
  let xs = start
  for (let t = steps; t >= 1; t--) {
    xs = xs.map((x) => {
      const noise = pair(random)
      return backStep(x, t, beta, fresh ? noise : null)
    })
    if ((steps - t + 1) % every === 0 || t === 1) kept.push(xs)
  }
  return kept
}

// How a set of sheep compares with the flocks: the share on one, and how far
// they stand from the nearest centre, in each direction
export function nearest(x: Vec): number {
  const d = FLOCKS.map(([cx, cy]) => Math.hypot(x[0] - cx, x[1] - cy))
  return d[0] <= d[1] ? 0 : 1
}
export function onFlock(xs: Vec[]): number {
  return xs.filter((x) => Math.hypot(x[0] - FLOCKS[nearest(x)][0], x[1] - FLOCKS[nearest(x)][1]) < ON_FLOCK).length / xs.length
}
export function spreadOf(xs: Vec[]): number {
  const total = xs.reduce((s, x) => {
    const [cx, cy] = FLOCKS[nearest(x)]
    return s + (x[0] - cx) ** 2 + (x[1] - cy) ** 2
  }, 0)
  return Math.sqrt(total / (2 * xs.length))
}

// The story, worked out once ------------------------------------------------

export const DATA = flocks(seeded(7))

// Minute by minute, the forward process run as a chain of small steps
function forwardRun(start: Vec[], seed: number): Vec[][] {
  const random = seeded(seed)
  const frames = [start]
  for (let t = 1; t <= T; t++) frames.push(frames[t - 1].map((x) => forwardStep(x, BETA, pair(random))))
  return frames
}
export const FORWARD = forwardRun(DATA, 2)

// The minute where the guess is still a clear call
export const CLEAR_MINUTE = 10
export const CLEAR_GUESSES = FORWARD[CLEAR_MINUTE].map((x) => bestStart(x, alphaBar(CLEAR_MINUTE)))

// Every sheep sent straight to its best-guess start from minute 100
export const JUMP = FORWARD[T].map((x) => bestStart(x, END))
// How many end nearer the middle of the field than either flock
export const nearerMiddle = (xs: Vec[]) =>
  xs.filter((x) => {
    const [cx, cy] = FLOCKS[nearest(x)]
    return Math.hypot(x[0], x[1]) < Math.hypot(x[0] - cx, x[1] - cy)
  }).length
export const JUMP_MIDDLE = nearerMiddle(JUMP)

// One minute at a time, back from minute 100
export const BACK = backward(FORWARD[T], T, true, 23, T)
export const BACK_ON = Math.round(onFlock(BACK[BACK.length - 1]) * SHEEP)

// The closed form's worked numbers: a sheep 2 m east of the middle, with a
// noise draw of exactly 1 (a typical size)
export const START = 2
export const DRAW = 1
export const WORKED = [1, 10, 100].map((t) => {
  const a = alphaBar(t)
  const keep = Math.sqrt(a)
  const add = Math.sqrt(1 - a)
  return { t, a, keep, add, shrunk: keep * START, noise: add * DRAW, x: keep * START + add * DRAW }
})

// The lab --------------------------------------------------------------------

export const STEP_CHOICES = [1, 2, 5, 20, 100, 1000] as const
export type StepChoice = (typeof STEP_CHOICES)[number]
export const FRESH_CHOICES = ['On', 'Off'] as const
export type Fresh = (typeof FRESH_CHOICES)[number]

// Fresh noise to start from: the same for every setting, so they compare
export const LAB_START: Vec[] = (() => {
  const random = seeded(31)
  return Array.from({ length: SHEEP }, () => pair(random))
})()

export interface Run {
  frames: Vec[][]
  on: number
  spread: number
}
const runs = new Map<string, Run>()
export function labRun(steps: StepChoice, fresh: Fresh): Run {
  const key = `${steps} ${fresh}`
  let run = runs.get(key)
  if (!run) {
    const frames = backward(LAB_START, steps, fresh === 'On', 41)
    const end = frames[frames.length - 1]
    run = { frames, on: onFlock(end), spread: spreadOf(end) }
    runs.set(key, run)
  }
  return run
}

export const DATA_SPREAD = spreadOf(DATA)
