import { seeded } from '../../components/explain/random'

// The soft-margin support vector machine in two dimensions: points with a
// label of +1 or −1, a line w·x + b = 0 with a street of half-width 1/‖w‖
// on each side, and the solver that finds the best street for a toll rate C.
// Every number the page states comes from here; the figures only draw.

export type Label = 1 | -1
export interface Point {
  x1: number
  x2: number
  y: Label
}
export interface Line {
  w: [number, number]
  b: number
}

// The score f(x) = w·x + b: its sign is the side, and ±1 are the two curbs
export const score = (line: Line, p: Point) => line.w[0] * p.x1 + line.w[1] * p.x2 + line.b
// y·f(x): 1 or more is safely behind its own curb, below 0 is on the wrong side
export const signedScore = (line: Line, p: Point) => p.y * score(line, p)

// The three losses of y·f(x) the page compares
export const hinge = (t: number) => Math.max(0, 1 - t)
export const zeroOne = (t: number) => (t <= 0 ? 1 : 0)
// The log loss of logistic regression, divided by ln 2 so that it, too,
// costs 1 on the line
export const logLoss = (t: number) => Math.log1p(Math.exp(-t)) / Math.LN2

// A point's slack: how far short of its curb it falls, in half-widths
export const slack = (line: Line, p: Point) => hinge(signedScore(line, p))

export const normOf = (line: Line) => Math.hypot(line.w[0], line.w[1])
// The street's full width, curb to curb
export const widthOf = (line: Line) => 2 / normOf(line)
// ½‖w‖² + C Σ max(0, 1 − y f(x))
export const objective = (line: Line, points: readonly Point[], C: number) =>
  0.5 * normOf(line) ** 2 + C * points.reduce((sum, p) => sum + slack(line, p), 0)

// Where each point stands with this line
export interface Tally {
  // Inside the street or beyond it: slack above zero
  violations: number
  // On the wrong side of the line
  errors: number
  // C × the sum of the slacks
  tolls: number
}
const TINY = 1e-9
export function tally(line: Line, points: readonly Point[], C: number): Tally {
  let violations = 0
  let errors = 0
  let total = 0
  for (const p of points) {
    const t = signedScore(line, p)
    if (t < 1 - 1e-6) violations++
    if (t < 0) errors++
    total += hinge(t)
  }
  return { violations, errors, tolls: C * total }
}

export interface Solution {
  line: Line
  // The dual weights: 0 for a point behind its curb, C for one inside the
  // street or beyond it, in between for one exactly on its curb
  alpha: number[]
  steps: number
  // The dual objective ½αᵀQα − Σα after each step, when asked for
  dual?: number[]
}

// Solve the soft-margin SVM: minimise ½‖w‖² + C Σ max(0, 1 − yᵢ(w·xᵢ + b)).
// By sequential minimal optimisation on the dual (Platt, 1998): the dual
// asks for weights 0 ≤ αᵢ ≤ C with Σ αᵢyᵢ = 0, so each step moves the two
// weights that break the optimality conditions the most, in the one
// direction that keeps the sum at 0, as far as the box allows. The pair is
// LIBSVM's maximal violating pair, and the step its closed form.
export function solve(points: readonly Point[], C: number, { trace = false, tolerance = 1e-7, most = 200_000 } = {}): Solution {
  const n = points.length
  const y = points.map((p) => p.y)
  const K = points.map((p) => points.map((q) => p.x1 * q.x1 + p.x2 * q.x2))
  const alpha = new Array<number>(n).fill(0)
  // The dual's gradient Qα − 1, with Q = yᵢyⱼ xᵢ·xⱼ
  const G = new Array<number>(n).fill(-1)
  const dual: number[] = []
  const dualValue = () => 0.5 * alpha.reduce((sum, a, k) => sum + a * (G[k] - 1), 0)
  const up = (t: number) => (y[t] === 1 ? alpha[t] < C : alpha[t] > 0)
  const down = (t: number) => (y[t] === 1 ? alpha[t] > 0 : alpha[t] < C)

  let steps = 0
  for (; steps < most; steps++) {
    let high = -Infinity
    let low = Infinity
    let i = -1
    let j = -1
    for (let t = 0; t < n; t++) {
      const v = -y[t] * G[t]
      if (up(t) && v > high) {
        high = v
        i = t
      }
      if (down(t) && v < low) {
        low = v
        j = t
      }
    }
    if (i < 0 || j < 0 || high - low < tolerance) break

    const oldI = alpha[i]
    const oldJ = alpha[j]
    const curve = Math.max(K[i][i] + K[j][j] - 2 * K[i][j], 1e-12)
    if (y[i] !== y[j]) {
      const delta = (-G[i] - G[j]) / curve
      const diff = alpha[i] - alpha[j]
      alpha[i] += delta
      alpha[j] += delta
      if (diff > 0) {
        if (alpha[j] < 0) {
          alpha[j] = 0
          alpha[i] = diff
        }
      } else if (alpha[i] < 0) {
        alpha[i] = 0
        alpha[j] = -diff
      }
      if (diff > 0) {
        if (alpha[i] > C) {
          alpha[i] = C
          alpha[j] = C - diff
        }
      } else if (alpha[j] > C) {
        alpha[j] = C
        alpha[i] = C + diff
      }
    } else {
      const delta = (G[i] - G[j]) / curve
      const sum = alpha[i] + alpha[j]
      alpha[i] -= delta
      alpha[j] += delta
      if (sum > C) {
        if (alpha[i] > C) {
          alpha[i] = C
          alpha[j] = sum - C
        }
      } else if (alpha[j] < 0) {
        alpha[j] = 0
        alpha[i] = sum
      }
      if (sum > C) {
        if (alpha[j] > C) {
          alpha[j] = C
          alpha[i] = sum - C
        }
      } else if (alpha[i] < 0) {
        alpha[i] = 0
        alpha[j] = sum
      }
    }
    const dI = alpha[i] - oldI
    const dJ = alpha[j] - oldJ
    for (let k = 0; k < n; k++) G[k] += y[k] * (y[i] * K[k][i] * dI + y[j] * K[k][j] * dJ)
    if (trace) dual.push(dualValue())
  }

  // w = Σ αᵢyᵢxᵢ; b from the points exactly on their curbs, or, when there
  // are none, from the middle of the range the conditions allow
  const w: [number, number] = [0, 0]
  for (let k = 0; k < n; k++) {
    w[0] += alpha[k] * y[k] * points[k].x1
    w[1] += alpha[k] * y[k] * points[k].x2
  }
  let free = 0
  let freeSum = 0
  let ub = Infinity
  let lb = -Infinity
  for (let k = 0; k < n; k++) {
    const yG = y[k] * G[k]
    const atTop = alpha[k] >= C - TINY
    const atBottom = alpha[k] <= TINY
    if (atTop) {
      if (y[k] === -1) ub = Math.min(ub, yG)
      else lb = Math.max(lb, yG)
    } else if (atBottom) {
      if (y[k] === 1) ub = Math.min(ub, yG)
      else lb = Math.max(lb, yG)
    } else {
      free++
      freeSum += yG
    }
  }
  const rho = free > 0 ? freeSum / free : (ub + lb) / 2
  return { line: { w, b: -rho }, alpha, steps, dual: trace ? dual : undefined }
}

// The dual objective at some weights, for checking the solver
export function dualObjective(points: readonly Point[], alpha: readonly number[]) {
  let quad = 0
  for (let i = 0; i < points.length; i++)
    for (let j = 0; j < points.length; j++) {
      const p = points[i]
      const q = points[j]
      quad += alpha[i] * alpha[j] * p.y * q.y * (p.x1 * q.x1 + p.x2 * q.x2)
    }
  return 0.5 * quad - alpha.reduce((sum, a) => sum + a, 0)
}

// The hard-margin street, or null when no line puts every point behind its
// curb. A very high toll rate makes any violation too dear to accept
export const HARD_C = 1e6
export function hardMargin(points: readonly Point[]): Line | null {
  const { line } = solve(points, HARD_C)
  return points.every((p) => signedScore(line, p) > 1 - 1e-4) ? line : null
}

// A street as the figures draw it: the direction of its normal, how far its
// centre line sits from the origin along it, and its half-width. Between
// two of these a figure can slide smoothly.
export interface Road {
  angle: number
  offset: number
  half: number
}
export function roadOf(line: Line): Road {
  const norm = normOf(line)
  return { angle: Math.atan2(line.w[1], line.w[0]), offset: -line.b / norm, half: 1 / norm }
}
export function lineOf(road: Road): Line {
  const scale = 1 / road.half
  return { w: [Math.cos(road.angle) * scale, Math.sin(road.angle) * scale], b: -road.offset * scale }
}
export function between(from: Road, to: Road, f: number): Road {
  // The short way round
  let turn = to.angle - from.angle
  while (turn > Math.PI) turn -= 2 * Math.PI
  while (turn < -Math.PI) turn += 2 * Math.PI
  return {
    angle: from.angle + turn * f,
    offset: from.offset + (to.offset - from.offset) * f,
    half: from.half + (to.half - from.half) * f,
  }
}
// How far two streets' lines turn from each other, in degrees
export function turnDegrees(a: Line, b: Line) {
  const cos = (a.w[0] * b.w[0] + a.w[1] * b.w[1]) / (normOf(a) * normOf(b))
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI
}

// ---- The story: two villages and a road ----------------------------------

const house = (x1: number, x2: number, y: Label): Point => ({ x1, x2, y })
// West's houses are hollow (−1); East's are the same houses turned half
// way round about the middle, filled (+1)
const WEST: [number, number][] = [
  [-3.6, 1.7],
  [-2.4, 2.2],
  [-1.5, 1.0],
  [-3.0, 0.2],
  [-1.6, -0.8],
  [-3.8, -1.4],
  [-2.4, -2.1],
]
export const VILLAGES: Point[] = [
  ...WEST.map(([a, b]) => house(a, b, -1)),
  ...WEST.map(([a, b]) => house(-a, -b, 1)),
]
// A West house built near the road, still on West's side of the gap
export const NEAR: Point = house(0.2, 2.2, -1)
// A West house built deep inside East
export const DEEP: Point = house(2.4, -0.6, -1)

// The story's toll rate, and the rates step six sweeps through, high to low
export const STORY_C = 0.15
export const SWEEP = [3, 1, 0.5, 0.3, 0.15, 0.08, 0.04, 0.02, 0.01] as const

// One unit of the map is ten metres
export const metres = (line: Line) => Math.round(10 * widthOf(line))

const ALL = [...VILLAGES, NEAR, DEEP]
const first = hardMargin(VILLAGES)!
const squeezed = hardMargin([...VILLAGES, NEAR])!
const soft = solve(ALL, STORY_C).line
const sweep = SWEEP.map((C) => solve(ALL, C).line)
// Who pays on the soft road, and how much
const paying = ALL.map((p) => ({ p, toll: slack(soft, p) })).filter(({ toll }) => toll > 1e-6)
export const STORY = {
  houses: VILLAGES,
  withNear: [...VILLAGES, NEAR],
  all: ALL,
  first,
  squeezed,
  // No road clears every house once the deep one is built
  impossible: hardMargin(ALL),
  soft,
  sweep,
  paying,
  numbers: {
    firstWide: metres(first),
    squeezedWide: metres(squeezed),
    turned: Math.round(turnDegrees(first, squeezed)),
    softWide: metres(soft),
    softTurned: Math.round(turnDegrees(first, soft)),
    tolls: paying.map(({ toll }) => toll).sort((a, b) => a - b),
    highWide: metres(sweep[0]),
    highTurned: Math.round(turnDegrees(first, sweep[0])),
    highPaying: tally(sweep[0], ALL, SWEEP[0]).violations,
    lowWide: metres(sweep[sweep.length - 1]),
    lowPaying: tally(sweep[sweep.length - 1], ALL, SWEEP[SWEEP.length - 1]).violations,
  },
}

// The point on a point's own curb straight across from it: where its slack
// is measured to. A point behind its curb is its own foot.
export function curbFoot(line: Line, p: Point): [number, number] {
  const by = (p.y * slack(line, p)) / normOf(line) ** 2
  return [p.x1 + by * line.w[0], p.x2 + by * line.w[1]]
}

// ---- The worked numbers --------------------------------------------------

// Three points' y·f(x): behind the curb, inside the street, across the line
export const WORKED = [
  { place: 'Clear of the street', t: 1.6 },
  { place: 'Inside the street', t: 0.6 },
  { place: 'Wrong side', t: -0.7 },
] as const

// Check yourself: a toll rate and a point across the line
export const QUIZ_C = 2
export const QUIZ_T = -0.5
export const QUIZ_COST = QUIZ_C * hinge(QUIZ_T)

// ---- The lab: two overlapping clouds and one point to drag ---------------

// A normal draw by Box–Muller
function normal(random: () => number) {
  const u = 1 - random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random())
}

export const LAB_SEED = 11
export const LAB_EACH = 16
export const LAB_SPREAD = 0.8
const CENTRE: [number, number] = [1.2, 0.5]
// Two round clouds, hollow (−1) around −CENTRE and filled (+1) around CENTRE
export function cloud(seed: number, each = LAB_EACH, spread = LAB_SPREAD): Point[] {
  const random = seeded(seed)
  const points: Point[] = []
  for (const y of [-1, 1] as const)
    for (let k = 0; k < each; k++)
      points.push({
        x1: y * CENTRE[0] + spread * normal(random),
        x2: y * CENTRE[1] + spread * normal(random),
        y,
      })
  return points
}
export const LAB = cloud(LAB_SEED)
// A filled (+1) point that starts deep among the hollow ones
export const ODD_START: Point = { x1: -2.4, x2: 1.4, y: 1 }

// The slider moves log₁₀ C from −2 to 2
export const LOG_C: [number, number] = [-2, 2]
export const LAB_LOG_C = 0
export const cOf = (log: number) => 10 ** log
export const formatC = (C: number) => (C >= 1 ? String(Math.round(C * 10) / 10) : String(Number(C.toPrecision(2))))

// What the lab reads out, for a toll rate and where the odd point is
// The same rate without the odd point, to see how far it drags the line;
// kept, since dragging the point does not change it
const withoutOdd = new Map<number, Line>()
function labWithout(C: number) {
  let line = withoutOdd.get(C)
  if (!line) {
    line = solve(LAB, C).line
    withoutOdd.set(C, line)
  }
  return line
}
export function labRun(odd: Point, C: number) {
  const points = [...LAB, odd]
  const { line } = solve(points, C)
  const without = labWithout(C)
  return { points, line, without, tally: tally(line, points, C), turned: turnDegrees(line, without) }
}

// The lab's opening point at a low, middling and high rate, for the prose
export const LAB_RATES = [0.01, 1, 100] as const
export const LAB_SHOWN = LAB_RATES.map((C) => {
  const run = labRun(ODD_START, C)
  return { C, width: widthOf(run.line), turned: run.turned, ...run.tally }
})
