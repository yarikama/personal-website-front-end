// Momentum on a long, narrow valley: the loss ½(x² + κy²), gentle along x
// and κ times as steep across y, walked with gradients that are exact or
// carry mini-batch noise. Every number the page states comes from here.
import { seeded } from '../../components/explain/random'

export interface Point {
  x: number
  y: number
}

// ---- The valley -------------------------------------------------------------

// How much steeper the walls are than the floor: the curvature across over
// the curvature along
export const KAPPA = 200
// The plain step size: under 2/κ, so plain steps settle, but close to it,
// so they bounce from wall to wall
export const ETA = 0.0095
// The sledge's step size: half the plain one, as "Making it work" advises
// when momentum goes on. Along the floor its stride still grows to
// ½ × 1/(1 − β) = 5 plain strides at β = 0.9; across it shrinks to
// ½ × 1/(1 + β) ≈ 0.26 of one.
export const MOMENTUM_ETA = ETA / 2
// Where every walk starts: 10 along the floor from the bottom, a little up one wall
export const START: Point = { x: -10, y: 0.15 }
// How big a mini-batch's error is, along and across: the steep direction's
// gradient is bigger, and so is its noise
export const NOISE: Point = { x: 2, y: 8 }

export const loss = (p: Point) => 0.5 * (p.x * p.x + KAPPA * p.y * p.y)
export const gradient = (p: Point): Point => ({ x: p.x, y: KAPPA * p.y })
export const distance = (p: Point) => Math.hypot(p.x, p.y)

// ---- Mini-batch noise --------------------------------------------------------

// A standard normal number from two uniform ones (Box–Muller)
export function normal(random: () => number): number {
  const u = 1 - random()
  const v = random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

// The error each of `steps` mini-batches adds to the gradient, from `seed`.
// Plain steps and momentum see the same mini-batches, so they can be compared.
export function batches(seed: number, steps: number, noise: Point = NOISE): Point[] {
  const random = seeded(seed)
  return Array.from({ length: steps }, () => ({ x: noise.x * normal(random), y: noise.y * normal(random) }))
}

// ---- The walk -----------------------------------------------------------------

export interface Walk {
  // Where each step lands, the start first
  path: Point[]
  // The velocity after each step (v₁, v₂, …): what that step moved along
  velocity: Point[]
}

// Gradient descent with momentum β: v ← βv + g, then w ← w − ηv, the velocity
// starting at rest. β = 0 is plain gradient descent. `errors` are the
// mini-batches' errors, one a step; without them the gradient is exact.
export function walk(beta: number, steps: number, errors: Point[] = [], start: Point = START, eta = ETA): Walk {
  const path = [start]
  const velocity: Point[] = []
  let p = start
  let v: Point = { x: 0, y: 0 }
  for (let k = 0; k < steps; k++) {
    const g = gradient(p)
    const e = errors[k] ?? { x: 0, y: 0 }
    v = { x: beta * v.x + g.x + e.x, y: beta * v.y + g.y + e.y }
    p = { x: p.x - eta * v.x, y: p.y - eta * v.y }
    path.push(p)
    velocity.push(v)
  }
  return { path, velocity }
}

// The share of the way from the start to the bottom a point has covered
export const covered = (p: Point, start: Point = START) => 1 - distance(p) / distance(start)

// How far the first `strides` strides of a walk moved, on average, along the
// floor and across it
export function perStride(w: Walk, strides: number): Point {
  let along = 0
  let across = 0
  for (let k = 1; k <= strides; k++) {
    along += Math.abs(w.path[k].x - w.path[k - 1].x)
    across += Math.abs(w.path[k].y - w.path[k - 1].y)
  }
  return strides ? { x: along / strides, y: across / strides } : { x: 0, y: 0 }
}

// ---- What the velocity settles to ----------------------------------------------

// The same gradient g every step: v = βv + g settles where v = g/(1 − β)
export const steady = (beta: number) => 1 / (1 - beta)
// A gradient that flips sign every step, +g, −g, +g, …: v settles to
// alternating ±g/(1 + β), since then v = −βv + g
export const flipping = (beta: number) => 1 / (1 + beta)
// How much more the velocity favours the steady direction than the flipping one
export const tilt = (beta: number) => steady(beta) / flipping(beta)

// The velocity after n steps of one fixed gradient sequence, by running it
export function velocityAfter(beta: number, gradients: number[]): number {
  let v = 0
  for (const g of gradients) v = beta * v + g
  return v
}

// How much a gradient k steps old still counts in the velocity: β^k
export const weightOf = (beta: number, k: number) => beta ** k

// ---- The story and the guess: 40 strides down the gully ------------------------

export const STRIDES = 40
export const STORY_BETA = 0.9
export const STORY_SEED = 2
export const STORY_BATCHES = batches(STORY_SEED, STRIDES)
export const STORY = {
  exact: walk(0, STRIDES),
  plain: walk(0, STRIDES, STORY_BATCHES),
  momentum: walk(STORY_BETA, STRIDES, STORY_BATCHES, START, MOMENTUM_ETA),
}
// What half the step and β's pile-up make of a stride, against a plain one
export const strideAlong = (beta: number) => (MOMENTUM_ETA / ETA) * steady(beta)
export const strideAcross = (beta: number) => (MOMENTUM_ETA / ETA) * flipping(beta)
export const storyEnd = (w: Walk) => w.path[w.path.length - 1]
// How far from the bottom each walk ends, and the share of the way it has
// come, as a percentage
export const storyAway = (w: Walk) => distance(storyEnd(w))
export const storyCovered = (w: Walk) => Math.round(100 * covered(storyEnd(w)))

// ---- The worked numbers ---------------------------------------------------------

export const WORKED_BETAS = [0.5, 0.9, 0.99] as const

// ---- The lab -------------------------------------------------------------------

export const LAB_STEPS = 60
export const LAB_SEED = 1
export const LAB_BATCHES = batches(LAB_SEED, LAB_STEPS)
export const BETA_RANGE = [0, 0.99] as const
export const DEFAULT_BETA = 0.9
export const LAB_GRADIENTS = ['Exact', 'Mini-batch'] as const
export type LabGradient = (typeof LAB_GRADIENTS)[number]

// Plain steps at the plain step size; the sledge at momentum β and half the step
export const labPlain = (gradients: LabGradient): Walk =>
  walk(0, LAB_STEPS, gradients === 'Exact' ? [] : LAB_BATCHES)
export const labWalk = (beta: number, gradients: LabGradient): Walk =>
  walk(beta, LAB_STEPS, gradients === 'Exact' ? [] : LAB_BATCHES, START, MOMENTUM_ETA)
// How far from the bottom the lab's exact walks end
export const labPlainEnd = () => distance(labPlain('Exact').path[LAB_STEPS])
export const labEnd = (beta: number) => distance(labWalk(beta, 'Exact').path[LAB_STEPS])

// ---- Quick check: the same step size, ten times the stride ---------------------

export const CHECK_BETA = 0.9

// ---- Check yourself: a flipping weight and a steady one ------------------------

export const FLIP_GRADIENT = 3
export const STEADY_GRADIENT = 0.5
export const CHECK_YOURSELF_BETA = 0.9
// What each weight's velocity settles to
export const flipSettles = FLIP_GRADIENT * flipping(CHECK_YOURSELF_BETA)
export const steadySettles = STEADY_GRADIENT * steady(CHECK_YOURSELF_BETA)
