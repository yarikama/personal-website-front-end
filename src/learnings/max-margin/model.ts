// The hard-margin support vector machine in two dimensions: the line, the
// street around it, and the points on its edges. Positions are in metres on
// the story's map, x across and y up; the label is +1 (the sage village,
// east) or −1 (the ink village, west).

import { seeded } from '../../components/explain/random'

export type Label = 1 | -1

export interface Point {
  x: number
  y: number
  label: Label
}

// The line w·x + b = 0; w points to the +1 side
export interface Line {
  w: [number, number]
  b: number
}

const EPS = 1e-9

export const norm = (line: Line) => Math.hypot(line.w[0], line.w[1])

// w·x + b: zero on the line, its sign says which side
export const score = (line: Line, p: { x: number; y: number }) => line.w[0] * p.x + line.w[1] * p.y + line.b

// Signed distance to the line, positive on the +1 side
export const signedDistance = (line: Line, p: { x: number; y: number }) => score(line, p) / norm(line)

// How far a point sits on its own side: negative when it is on the wrong one
export const clearance = (line: Line, p: Point) => p.label * signedDistance(line, p)

// The gap from the line to the nearest point, counted on each point's own
// side: half the width of the widest street centred on this line
export const gap = (line: Line, points: Point[]) => Math.min(...points.map((p) => clearance(line, p)))

// Every point on its own side of the line
export const separates = (line: Line, points: Point[]) => gap(line, points) > EPS

// The same line, scaled so the nearest point has y(w·x + b) = 1: then
// ‖w‖ = 1 / gap and the street w·x + b = ±1 is 2 / ‖w‖ wide
export function scaled(line: Line, points: Point[]): Line {
  const k = 1 / (gap(line, points) * norm(line))
  return { w: [line.w[0] * k, line.w[1] * k], b: line.b * k }
}

export const width = (line: Line) => 2 / norm(line)

// y(w·x + b) for every point: at least 1 for a feasible hard-margin line
export const functionalMargin = (line: Line, p: Point) => p.label * score(line, p)

// The street's edge on each side, w·x + b = ±1
export const kerb = (line: Line, side: Label): Line => ({ w: line.w, b: line.b - side })

const SUPPORT_TOL = 1e-6

// The points on the street's edges: y(w·x + b) = 1
export const supportVectors = (line: Line, points: Point[]) =>
  points.flatMap((p, i) => (functionalMargin(line, p) <= 1 + SUPPORT_TOL ? [i] : []))

function feasible(line: Line, points: Point[]) {
  return points.every((p) => functionalMargin(line, p) >= 1 - 1e-7)
}

// The street whose edges pass through one +1 point and one −1 point and
// stand at right angles to the segment between them: the perpendicular
// bisector, with w·p + b = 1 and w·q + b = −1
function pairStreet(p: Point, q: Point): Line | null {
  const pos = p.label === 1 ? p : q
  const neg = p.label === 1 ? q : p
  const dx = pos.x - neg.x
  const dy = pos.y - neg.y
  const d2 = dx * dx + dy * dy
  if (d2 < EPS) return null
  const w: [number, number] = [(2 * dx) / d2, (2 * dy) / d2]
  const b = -(w[0] * (pos.x + neg.x) + w[1] * (pos.y + neg.y)) / 2
  return { w, b }
}

// The street with one edge through two points of one class, and the other
// edge through a point of the other class, parallel to it
function tripleStreet(a1: Point, a2: Point, c: Point): Line | null {
  const ux = a2.x - a1.x
  const uy = a2.y - a1.y
  const len = Math.hypot(ux, uy)
  if (len < EPS) return null
  // A unit normal to the edge through a1 and a2, pointing at c
  let nx = -uy / len
  let ny = ux / len
  const toC = nx * (c.x - a1.x) + ny * (c.y - a1.y)
  if (Math.abs(toC) < EPS) return null
  if (toC < 0) {
    nx = -nx
    ny = -ny
  }
  const across = Math.abs(toC)
  // w points to the +1 side; the street is `across` wide, so ‖w‖ = 2 / across
  const sign = c.label === 1 ? 1 : -1
  const k = (2 / across) * sign
  const w: [number, number] = [nx * k, ny * k]
  // a1 sits on its class's edge: w·a1 + b = a1's label
  const b = a1.label - (w[0] * a1.x + w[1] * a1.y)
  return { w, b }
}

// The hard-margin SVM: the line with the widest street that keeps every
// point at least on its own edge, or null when no line separates the
// classes. Solved exactly: in two dimensions an optimal street rests on two
// or three points (one of each class, or two of one and one of the other),
// so try every such street, keep the ones every point respects, and take
// the widest. Fine for the few dozen points a figure shows.
export function maxMargin(points: Point[]): Line | null {
  const pos = points.filter((p) => p.label === 1)
  const neg = points.filter((p) => p.label === -1)
  if (!pos.length || !neg.length) return null
  let best: Line | null = null
  const consider = (line: Line | null) => {
    if (line && (!best || norm(line) < norm(best) - 1e-12) && feasible(line, points)) best = line
  }
  for (const p of pos) for (const q of neg) consider(pairStreet(p, q))
  for (const [same, other] of [
    [pos, neg],
    [neg, pos],
  ]) {
    for (let i = 0; i < same.length; i++)
      for (let j = i + 1; j < same.length; j++) for (const c of other) consider(tripleStreet(same[i], same[j], c))
  }
  return best
}

// The perceptron: start flat, and on each point on the wrong side (or on
// the line), add y·x to w and y to b, until a full pass makes no mistake.
// Coordinates are centred and shrunk first so the bias keeps pace with the
// weights. Returns null if it has not settled after `passes` passes.
export function perceptron(points: Point[], passes = 2000): Line | null {
  const cx = 50
  const cy = 30
  const s = 50
  let w0 = 0
  let w1 = 0
  let b = 0
  for (let pass = 0; pass < passes; pass++) {
    let mistakes = 0
    for (const p of points) {
      const u = (p.x - cx) / s
      const v = (p.y - cy) / s
      if (p.label * (w0 * u + w1 * v + b) <= 0) {
        w0 += p.label * u
        w1 += p.label * v
        b += p.label
        mistakes++
      }
    }
    if (!mistakes) {
      // Back to metres: w·((x − c) / s) + b = (w / s)·x + b − w·c / s
      return { w: [w0 / s, w1 / s], b: b - (w0 * cx + w1 * cy) / s }
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// The story: two villages, three roads

const sage = (x: number, y: number): Point => ({ x, y, label: 1 })
const ink = (x: number, y: number): Point => ({ x, y, label: -1 })

// The map is 100 m across and 60 m up
export const MAP = { width: 100, height: 60 }

export const HOUSES: Point[] = [
  sage(50, 50),
  sage(80, 10),
  sage(80, 45),
  sage(92, 28),
  sage(70, 30),
  sage(92, 52),
  ink(40, 30),
  ink(20, 20),
  ink(15, 48),
  ink(35, 8),
  ink(8, 30),
]

// The house the guess deletes: the far corner of the sage village
export const FAR = 5

// Three roads that all keep every house on its own side. A runs due north,
// B has the right tilt but sits too far east, C is the widest there is.
export const ROAD_A: Line = scaled({ w: [1, 0], b: -46 }, HOUSES)
export const ROAD_B: Line = scaled({ w: [0.08, 0.06], b: -6.4 }, HOUSES)
export const ROAD_C: Line = maxMargin(HOUSES)!
export const ROADS = [
  { name: 'A', line: ROAD_A },
  { name: 'B', line: ROAD_B },
  { name: 'C', line: ROAD_C },
] as const

export const KERB_HOUSES = supportVectors(ROAD_C, HOUSES)

// Knock down every house not on C's kerbs, one at a time: the road the
// remaining houses ask for after each
export const KNOCKED = HOUSES.map((_, i) => i).filter((i) => !KERB_HOUSES.includes(i))

// The guess: the same villages without the far house
export const WITHOUT_FAR = maxMargin(HOUSES.filter((_, i) => i !== FAR))!

// The quick check: a new sage house inside C's street, on the sage side
export const INSIDE: Point = sage(60, 28)
export const WITH_INSIDE = maxMargin([...HOUSES, INSIDE])!

// Check yourself: one −1 point and two +1 points
export const CHECK_POINTS: Point[] = [ink(0, 0), sage(4, 0), sage(6, 3)]
export const CHECK = maxMargin(CHECK_POINTS)!

// The clip's two houses: one on the kerb, one far back
export const KERB_HOUSE = HOUSES[0]
export const FAR_HOUSE = HOUSES[FAR]

// ---------------------------------------------------------------------------
// The lab: points to drag, drawn fresh for each seed

export const LAB_PER_CLASS = 7
export const LAB_BOUNDS = { x: [3, 97] as [number, number], y: [3, 57] as [number, number] }

// Two clouds on either side of a random line through the middle of the
// map, each point at least 4 m from it, so the classes start separable
export function labPoints(seed: number): Point[] {
  const random = seeded(seed)
  const angle = (-0.35 + 0.7 * random()) * Math.PI
  const line: Line = { w: [Math.cos(angle), Math.sin(angle)], b: 0 }
  line.b = -(line.w[0] * 50 + line.w[1] * 30)
  const points: Point[] = []
  for (const label of [1, -1] as const) {
    let made = 0
    while (made < LAB_PER_CLASS) {
      const p = {
        x: LAB_BOUNDS.x[0] + 4 + random() * (LAB_BOUNDS.x[1] - LAB_BOUNDS.x[0] - 8),
        y: LAB_BOUNDS.y[0] + 4 + random() * (LAB_BOUNDS.y[1] - LAB_BOUNDS.y[0] - 8),
        label,
      }
      const d = label * signedDistance(line, p)
      if (d >= 4 && d <= 30) {
        points.push(p)
        made++
      }
    }
  }
  return points
}

export const LAB_SEED = 7

// ---------------------------------------------------------------------------
// Words for numbers

export const metres = (value: number) => `${Number(value.toFixed(1))} m`
export const plain = (value: number, digits = 2) => `${Number(value.toFixed(digits))}`
