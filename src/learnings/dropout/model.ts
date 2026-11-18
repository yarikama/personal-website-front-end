import { gauss } from '../../components/explain/bandit'
import { seeded } from '../../components/explain/random'

// Dropout, small enough to check by hand: one unit's keep-or-drop, a kitchen
// of six cooks, and a tiny network that tells two kinds of points apart.
// Every number the page states comes from here; the figures only draw.

// --- One unit: keep it with chance 1 − p, and scale what is kept by 1/(1 − p)

export const scaleOf = (p: number) => 1 / (1 - p)

// What a unit with output x passes on, kept or dropped: inverted dropout
export const passed = (x: number, p: number, kept: boolean) => (kept ? x * scaleOf(p) : 0)

// What it passes on, averaged over every coin it could toss
export const expectedPassed = (x: number, p: number) => (1 - p) * passed(x, p, true) + p * passed(x, p, false)

// The worked numbers: one output of 3, at three dropout rates
export const WORKED_X = 3
export const WORKED_P = [0.2, 0.5, 0.8] as const
export const WORKED = WORKED_P.map((p) => ({ p, scale: scaleOf(p), kept: passed(WORKED_X, p, true), mean: expectedPassed(WORKED_X, p) }))

// Plain (not inverted) dropout leaves training alone, so at test time, with
// every unit in, the next layer would get 1/(1 − p) times what it trained on:
// it scales each unit by the chance it was kept, 1 − p, instead
export const testScaleOf = (p: number) => 1 - p
// The check: plain dropout at p = 0.3
export const CHECK_P = 0.3

// --- The kitchen: six cooks, half sent home at random each practice night

export const COOKS = ['Ana', 'Ben', 'Cy', 'Di', 'Eli', 'Fay'] as const
export const KITCHEN_P = 0.5
export const NIGHTS = 8
export const KITCHEN_SEED = 350

// Each night, who is in: every cook independently, with chance 1 − p
export function rota(nights = NIGHTS, p = KITCHEN_P, seed = KITCHEN_SEED): boolean[][] {
  const random = seeded(seed)
  return Array.from({ length: nights }, () => COOKS.map(() => random() >= p))
}

export const ROTA = rota()

// A full night: one share each. A practice night: each cook in makes 1/(1 − p) shares
export const platesOf = (inTonight: boolean[], p = KITCHEN_P) =>
  inTonight.reduce((sum, here) => sum + (here ? scaleOf(p) : 0), 0)
export const FULL_PLATES = COOKS.length
export const ROTA_PLATES = ROTA.map((night) => platesOf(night))
export const ROTA_MEAN = ROTA_PLATES.reduce((a, b) => a + b, 0) / ROTA_PLATES.length

// --- The lab: points in a square, a curved border, and some wrong labels

export interface Point {
  x: number
  y: number
  // Which side of the true border it is on, and the label it was given
  truth: boolean
  label: boolean
}

// The true border: above this curve is the sage kind
export const border = (x: number) => 0.45 * Math.sin(2.2 * x) - 0.05
export const sideOf = (x: number, y: number) => y > border(x)

export const TRAIN_N = 40
export const FLIPPED = 5
export const DATA_SEED = 8

export function sample(n: number, flipped: number, seed: number): Point[] {
  const random = seeded(seed)
  const points = Array.from({ length: n }, () => {
    const x = random() * 2 - 1
    const y = random() * 2 - 1
    const truth = sideOf(x, y)
    return { x, y, truth, label: truth }
  })
  // Flip the labels of the first `flipped` points: they were drawn at
  // random, so these are as random as any
  return points.map((point, i) => (i < flipped ? { ...point, label: !point.truth } : point))
}

// A grid of new points over the square, scored against the true border
export const TEST_SIDE = 60
export const TEST: { x: number; y: number; truth: boolean }[] = Array.from({ length: TEST_SIDE * TEST_SIDE }, (_, i) => {
  const x = ((i % TEST_SIDE) + 0.5) / TEST_SIDE * 2 - 1
  const y = (Math.floor(i / TEST_SIDE) + 0.5) / TEST_SIDE * 2 - 1
  return { x, y, truth: sideOf(x, y) }
})

// --- The network: 2 inputs, H hidden ReLU units, one sigmoid output

export interface Net {
  W: number[][] // H × 2
  b: number[]
  v: number[]
  c: number
}

export const HIDDEN = 64
export const STEPS = 2000
export const RATE = 0.01
export const NET_SEED = 11

export const sigmoid = (z: number) => (z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z)))

export function init(hidden: number, seed: number): Net {
  const random = seeded(seed)
  const W = Array.from({ length: hidden }, () => [gauss(random) * 3, gauss(random) * 3])
  const b = Array.from({ length: hidden }, () => (random() * 2 - 1) * 3)
  const v = Array.from({ length: hidden }, () => gauss(random) / Math.sqrt(hidden))
  return { W, b, v, c: 0 }
}

// The output's score for a point. `mask` says which hidden units are in
// (null: all of them, unscaled, as at test time); kept units are scaled by
// 1/(1 − p), as in training
export function score(net: Net, x: number, y: number, mask: boolean[] | null = null, p = 0): number {
  let s = net.c
  const scale = mask ? scaleOf(p) : 1
  for (let k = 0; k < net.v.length; k++) {
    if (mask && !mask[k]) continue
    const a = net.W[k][0] * x + net.W[k][1] * y + net.b[k]
    if (a > 0) s += net.v[k] * a * scale
  }
  return s
}

export const chance = (net: Net, x: number, y: number, mask: boolean[] | null = null, p = 0) => sigmoid(score(net, x, y, mask, p))

// Train with full-batch Adam on cross-entropy. With p > 0, every point at
// every step gets its own fresh mask over the hidden units. Flat typed
// arrays, so a page can train three of these in a blink
export function train(points: Point[], p: number, steps = STEPS, seed = NET_SEED): Net {
  const start = init(HIDDEN, seed)
  const random = seeded(seed + 1000)
  const H = start.v.length
  // Parameters, flat: W row by row, then b, then v, then c
  const n = 4 * H + 1
  const w = new Float64Array(n)
  start.W.forEach((row, k) => {
    w[2 * k] = row[0]
    w[2 * k + 1] = row[1]
  })
  start.b.forEach((bk, k) => (w[2 * H + k] = bk))
  start.v.forEach((vk, k) => (w[3 * H + k] = vk))
  w[4 * H] = start.c
  const g = new Float64Array(n)
  const m = new Float64Array(n)
  const s2 = new Float64Array(n)
  const h = new Float64Array(H)
  const B1 = 0.9
  const B2 = 0.999
  const scale = scaleOf(p)
  for (let t = 1; t <= steps; t++) {
    g.fill(0)
    for (const pt of points) {
      let z = w[4 * H]
      for (let k = 0; k < H; k++) {
        const kept = p === 0 || random() >= p
        const a = w[2 * k] * pt.x + w[2 * k + 1] * pt.y + w[2 * H + k]
        h[k] = kept && a > 0 ? a * scale : 0
        z += h[k] * w[3 * H + k]
      }
      const d = (sigmoid(z) - (pt.label ? 1 : 0)) / points.length
      g[4 * H] += d
      for (let k = 0; k < H; k++) {
        if (h[k] === 0) continue
        g[3 * H + k] += d * h[k]
        const back = d * w[3 * H + k] * scale
        g[2 * k] += back * pt.x
        g[2 * k + 1] += back * pt.y
        g[2 * H + k] += back
      }
    }
    const c1 = 1 - B1 ** t
    const c2 = 1 - B2 ** t
    for (let i = 0; i < n; i++) {
      m[i] = B1 * m[i] + (1 - B1) * g[i]
      s2[i] = B2 * s2[i] + (1 - B2) * g[i] * g[i]
      w[i] -= (RATE * (m[i] / c1)) / (Math.sqrt(s2[i] / c2) + 1e-8)
    }
  }
  return {
    W: Array.from({ length: H }, (_, k) => [w[2 * k], w[2 * k + 1]]),
    b: Array.from(w.subarray(2 * H, 3 * H)),
    v: Array.from(w.subarray(3 * H, 4 * H)),
    c: w[4 * H],
  }
}

// How many training points get the label they were given
export const trainRightOf = (net: Net, points: Point[] = TRAIN) => points.filter((pt) => (score(net, pt.x, pt.y) > 0) === pt.label).length

// The share of new points put on the right side of the true border
export const newRightOf = (net: Net, mask: boolean[] | null = null, p = 0) =>
  TEST.filter((pt) => (score(net, pt.x, pt.y, mask, p) > 0) === pt.truth).length / TEST.length

export const TRAIN = sample(TRAIN_N, FLIPPED, DATA_SEED)

// The lab's three settings, each trained once, the first time it is asked for
export const LAB_P = [0, 0.2, 0.5] as const
export type LabP = (typeof LAB_P)[number]
const nets = new Map<number, Net>()
export function netFor(p: number): Net {
  let net = nets.get(p)
  if (!net) {
    net = train(TRAIN, p)
    nets.set(p, net)
  }
  return net
}

// What a map draws: the chance of the sage kind in each cell of a grid over
// the square, row by row from the top
export const MAP_SIDE = 30
export const cellCentre = (i: number) => ((i + 0.5) / MAP_SIDE) * 2 - 1
export function chanceGrid(chanceAt: (x: number, y: number) => number): number[] {
  return Array.from({ length: MAP_SIDE * MAP_SIDE }, (_, i) => chanceAt(cellCentre(i % MAP_SIDE), -cellCentre(Math.floor(i / MAP_SIDE))))
}

export interface Result {
  trainRight: number
  // How many of the wrong labels it learned to repeat
  wrongFollowed: number
  newRight: number
  grid: number[]
}
const results = new Map<number, Result>()
export function resultOf(p: number): Result {
  let result = results.get(p)
  if (!result) {
    const net = netFor(p)
    result = {
      trainRight: trainRightOf(net),
      wrongFollowed: TRAIN.filter((pt) => pt.label !== pt.truth && (score(net, pt.x, pt.y) > 0) === pt.label).length,
      newRight: newRightOf(net), grid: chanceGrid((x, y) => chance(net, x, y)) }
    results.set(p, result)
  }
  return result
}

// --- Many thinned networks, one average

export const THINNED = 100
export const THIN_SHOWN = 4
export const THIN_P = 0.5
export const THIN_SEED = 4

// Masks over the hidden units, each unit in with chance 1 − p
export function masks(count: number, p: number, hidden: number, seed: number): boolean[][] {
  const random = seeded(seed)
  return Array.from({ length: count }, () => Array.from({ length: hidden }, () => random() >= p))
}

// The average chance over many thinned networks, each scaled as in training
export const averageChance = (net: Net, x: number, y: number, all: boolean[][], p: number) =>
  all.reduce((sum, mask) => sum + chance(net, x, y, mask, p), 0) / all.length

export interface Thinned {
  // The first few thinned networks: their maps and how often each is right on new points
  shown: { grid: number[]; right: number; kept: number }[]
  // How often one thinned network is right on new points, over all of them
  oneRight: number
  average: { grid: number[]; right: number }
  whole: { grid: number[]; right: number }
  // The share of new points where the whole network and the average agree
  agree: number
}

let thinned: Thinned | null = null
export function thinnedOf(): Thinned {
  if (thinned) return thinned
  const net = netFor(THIN_P)
  const all = masks(THINNED, THIN_P, net.v.length, THIN_SEED)
  const rights = all.map((mask) => newRightOf(net, mask, THIN_P))
  let agree = 0
  let averageRight = 0
  for (const pt of TEST) {
    const mean = averageChance(net, pt.x, pt.y, all, THIN_P) > 0.5
    if (mean === (score(net, pt.x, pt.y) > 0)) agree++
    if (mean === pt.truth) averageRight++
  }
  thinned = {
    shown: all.slice(0, THIN_SHOWN).map((mask, i) => ({
      grid: chanceGrid((x, y) => chance(net, x, y, mask, THIN_P)),
      right: rights[i],
      kept: mask.filter(Boolean).length,
    })),
    oneRight: rights.reduce((a, b) => a + b, 0) / THINNED,
    average: { grid: chanceGrid((x, y) => averageChance(net, x, y, all, THIN_P)), right: averageRight / TEST.length },
    whole: { grid: chanceGrid((x, y) => chance(net, x, y)), right: newRightOf(net) },
    agree: agree / TEST.length,
  }
  return thinned
}

// "78%"
export const pct = (share: number) => `${Math.round(share * 100)}%`
