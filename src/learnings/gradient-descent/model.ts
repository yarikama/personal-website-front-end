// Gradient descent on bowls: losses shaped like w², where every step can be
// worked out by hand and checked against a closed form.

// ---- One weight ----------------------------------------------------------

// The loss (L/2)·w², whose slope at w is L·w. Its slope changes by exactly L
// for every unit w moves: L is its smoothness (and its curvature).
export const slope1d = (w: number, L: number) => L * w

// One step: move against the slope, by the step size times the slope
export const step1d = (w: number, eta: number, L: number) => w - eta * slope1d(w, L)

// What one step multiplies the distance to the bottom by: 1 − ηL
export const factor = (eta: number, L: number) => 1 - eta * L

// Whether the walk settles at the bottom: the factor is between −1 and 1
export const settles = (eta: number, L: number) => Math.abs(factor(eta, L)) < 1

// The largest step that still settles is just under 2/L
export const largestStep = (L: number) => 2 / L

// Every position of a walk from `start`, the start included
export function walk1d(start: number, eta: number, L: number, steps: number): number[] {
  const positions = [start]
  for (let i = 0; i < steps; i++) positions.push(step1d(positions[i], eta, L))
  return positions
}

// How many steps until the walk is within `tolerance` of the bottom, by
// walking; null if it is not there after `max`
export function stepsByWalking(start: number, eta: number, L: number, tolerance: number, max = 100000): number | null {
  let w = start
  for (let k = 0; k <= max; k++) {
    if (Math.abs(w) <= tolerance) return k
    w = step1d(w, eta, L)
  }
  return null
}

// The same count without walking: after k steps the distance is
// |1 − ηL|^k × |start|, so k is the smallest whole number with that at
// most `tolerance`. Null when the walk never gets there.
export function stepsByFormula(start: number, eta: number, L: number, tolerance: number): number | null {
  if (Math.abs(start) <= tolerance) return 0
  const f = Math.abs(factor(eta, L))
  if (f === 0) return 1
  if (f >= 1) return null
  return Math.ceil(Math.log(tolerance / Math.abs(start)) / Math.log(f))
}

// ---- The story: a valley shaped like w², from 10 out --------------------

export const VALLEY_L = 2
export const VALLEY_START = 10
export const STRIDES = 10
// The step sizes the guess offers and the story walks
export const STRIDE_SIZES = [0.1, 0.5, 0.9, 1.1] as const
export type StrideSize = (typeof STRIDE_SIZES)[number]

export const valleyWalk = (eta: number) => walk1d(VALLEY_START, eta, VALLEY_L, STRIDES)
// How far from the bottom each walk ends after ten strides
export const afterStrides = (eta: number) => Math.abs(valleyWalk(eta)[STRIDES])

// ---- Check yourself: a bowl with curvature 40 ---------------------------

export const CHECK_L = 40
export const CHECK_STEPS = [0.01, 0.04, 0.06, 0.1] as const

// ---- The 1/t guarantee for smooth convex losses --------------------------

// With step 1/L on an L-smooth convex loss, the gap to the best loss after
// t steps is at most L·d²/(2t), d the starting distance to a best point
export const gapBound = (L: number, distance: number, t: number) => (L * distance * distance) / (2 * t)

// ---- Two weights: a bowl stretched κ times along one direction -----------

export interface Point {
  x: number
  y: number
}

// The loss ½(x² + κ·y²): curvature 1 along x, κ along y. κ, the stretch,
// is the condition number, steepest curvature over flattest.
export const loss2d = (p: Point, kappa: number) => 0.5 * (p.x * p.x + kappa * p.y * p.y)
export const gradient2d = (p: Point, kappa: number): Point => ({ x: p.x, y: kappa * p.y })
export const step2d = (p: Point, eta: number, kappa: number): Point => {
  const g = gradient2d(p, kappa)
  return { x: p.x - eta * g.x, y: p.y - eta * g.y }
}
export const distance = (p: Point) => Math.hypot(p.x, p.y)

export const BOWL_START: Point = { x: -8, y: 3.5 }
export const TOLERANCE = 0.01
export const MAX_STEPS = 2000
// Further than this from the bottom and the walk is counted as gone
const ESCAPE = 1e6

// What each step multiplies the error by along each axis: 1 − η and 1 − ηκ.
// The worse of the two sets the pace.
export const rate2d = (eta: number, kappa: number) => Math.max(Math.abs(1 - eta), Math.abs(1 - eta * kappa))

// The step that makes both axes shrink equally fast, 2/(m + M), and the rate it gets
export const bestStep = (kappa: number) => 2 / (1 + kappa)
export const bestRate = (kappa: number) => (kappa - 1) / (kappa + 1)

export type Outcome = 'settles' | 'diverges' | 'slow'

export interface Descent {
  path: Point[]
  steps: number | null
  outcome: Outcome
}

// Walk the bowl from `start` until within TOLERANCE, gone, or MAX_STEPS
export function descend(eta: number, kappa: number, start: Point = BOWL_START): Descent {
  const path = [start]
  let p = start
  for (let k = 0; k <= MAX_STEPS; k++) {
    const d = distance(p)
    if (d <= TOLERANCE) return { path, steps: k, outcome: 'settles' }
    if (d > ESCAPE || !Number.isFinite(d)) return { path, steps: null, outcome: 'diverges' }
    if (k === MAX_STEPS) break
    p = step2d(p, eta, kappa)
    path.push(p)
  }
  return { path, steps: null, outcome: rate2d(eta, kappa) >= 1 ? 'diverges' : 'slow' }
}

// The distance after k steps without walking: each axis is multiplied by
// its own factor every step
export const distanceAfter = (k: number, eta: number, kappa: number, start: Point = BOWL_START) =>
  Math.hypot((1 - eta) ** k * start.x, (1 - eta * kappa) ** k * start.y)

// With the best step both factors are the same size, so the distance is
// exactly bestRate^k × the start's: the steps follow from a logarithm
export function bestSteps(kappa: number, start: Point = BOWL_START): number {
  if (kappa === 1) return 1
  return Math.ceil(Math.log(TOLERANCE / distance(start)) / Math.log(bestRate(kappa)))
}

// The page's worked bowls: a round one, one stretched 10 times, one 100
export const WORKED_STRETCH = [1, 10, 100] as const

// The lab's settings: the stretch, and the step on a log scale
export const STRETCH_RANGE = [1, 50] as const
export const LOG_STEP_RANGE = [-2.5, 0.4] as const
export const DEFAULT_STRETCH = 20
export const DEFAULT_LOG_STEP = -1.05
