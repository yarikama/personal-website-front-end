// Where things sit on the map figures: metres east along the bottom, metres
// north up the side, at the same scale both ways so a right angle looks
// like one.

import { MAP, norm, score, type Line } from './model'

export const WIDTH = 560
export const LEFT = 20
export const RIGHT = 540
export const TOP = 14
const PER_METRE = (RIGHT - LEFT) / MAP.width
export const BOTTOM = TOP + MAP.height * PER_METRE
export const HEIGHT = BOTTOM + 14

export const X = (x: number) => LEFT + x * PER_METRE
export const Y = (y: number) => BOTTOM - y * PER_METRE
export const toMetres = (px: number) => px / PER_METRE

type Pt = [number, number]

const CORNERS: Pt[] = [
  [0, 0],
  [MAP.width, 0],
  [MAP.width, MAP.height],
  [0, MAP.height],
]

// Keep the part of a polygon where w·x + b ≥ level (Sutherland–Hodgman)
function keep(poly: Pt[], line: Line, level: number): Pt[] {
  const f = (p: Pt) => score(line, { x: p[0], y: p[1] }) - level
  const out: Pt[] = []
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const fa = f(a)
    const fb = f(b)
    if (fa >= 0) out.push(a)
    if (fa >= 0 !== fb >= 0) {
      const t = fa / (fa - fb)
      out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])])
    }
  }
  return out
}

const flip = (line: Line): Line => ({ w: [-line.w[0], -line.w[1]], b: -line.b })

const toPath = (poly: Pt[]) =>
  poly.length < 3 ? '' : poly.map(([x, y], i) => `${i ? 'L' : 'M'}${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(' ') + 'Z'

// The strip low ≤ w·x + b ≤ high, inside the map, as an SVG path
export function strip(line: Line, low: number, high: number): string {
  return toPath(keep(keep(CORNERS, line, low), flip(line), -high))
}

// The level set w·x + b = level, inside the map, as a segment, or null when
// it misses the map
export function segment(line: Line, level = 0): { x1: number; y1: number; x2: number; y2: number } | null {
  const hits: Pt[] = []
  const [w0, w1] = line.w
  const c = level - line.b
  if (Math.abs(w1) > 1e-12) {
    for (const x of [0, MAP.width]) {
      const y = (c - w0 * x) / w1
      if (y >= -1e-9 && y <= MAP.height + 1e-9) hits.push([x, y])
    }
  }
  if (Math.abs(w0) > 1e-12) {
    for (const y of [0, MAP.height]) {
      const x = (c - w1 * y) / w0
      if (x >= -1e-9 && x <= MAP.width + 1e-9) hits.push([x, y])
    }
  }
  if (hits.length < 2) return null
  // The two hits furthest apart (a corner can be hit twice)
  let best: [Pt, Pt] = [hits[0], hits[1]]
  let far = -1
  for (const a of hits)
    for (const b of hits) {
      const d = Math.hypot(a[0] - b[0], a[1] - b[1])
      if (d > far) {
        far = d
        best = [a, b]
      }
    }
  return { x1: X(best[0][0]), y1: Y(best[0][1]), x2: X(best[1][0]), y2: Y(best[1][1]) }
}

// The point of the line nearest the map's middle, and the unit normal
// pointing to the +1 side: where to draw a width across the street
export function across(line: Line) {
  const middle = { x: MAP.width / 2, y: MAP.height / 2 }
  const n2 = norm(line) ** 2
  const s = score(line, middle)
  const at = { x: middle.x - (s * line.w[0]) / n2, y: middle.y - (s * line.w[1]) / n2 }
  const unit = { x: line.w[0] / norm(line), y: line.w[1] / norm(line) }
  return { at, unit }
}
