import { lerp } from '../../components/explain/useLoop'
import { cost, type Point, type State } from './model'

// What a run looks like at a moment `t` along its trace, which may fall
// between two states: partway through an assignment (each point's line
// swinging from its old centre to its new one) or an update (the centres
// sliding toward the means).
export interface Frame {
  centres: Point[]
  // The centre each point is shown with, or null before anyone is assigned
  labels: number[] | null
  // Where each point's line ends, and how far it has grown (the first
  // assignment draws the lines out from the points)
  ends: Point[] | null
  grown: number
  cost: number | null
  phase: 'start' | 'assign' | 'update'
  // The round this moment belongs to, from 1
  round: number
}

const ease = (k: number) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2)
const mix = (a: Point, b: Point, k: number): Point => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)]

export function frameAt(points: readonly Point[], trace: readonly State[], t: number): Frame {
  const last = trace.length - 1
  const at = Math.max(0, Math.min(last, t))
  const i = Math.min(Math.floor(at), Math.max(0, last - 1))
  const k = last === 0 ? 0 : ease(Math.min(1, at - i))
  const from = trace[i]
  const to = trace[Math.min(last, i + 1)]
  const round = Math.max(1, Math.ceil(at / 2))

  if (last === 0 || (from.labels === null && k === 0)) {
    return { centres: from.centres, labels: null, ends: null, grown: 0, cost: null, phase: 'start', round: 1 }
  }

  // An assignment: from state i (even) to i + 1
  if (i % 2 === 0) {
    const labels = to.labels!
    const old = from.labels
    const ends = points.map((_, p) => (old ? mix(from.centres[old[p]], from.centres[labels[p]], k) : from.centres[labels[p]]))
    const shown = old && k < 0.5 ? old : labels
    // The cost while the lines swing: each point's at its new centre once it has arrived
    const now = k >= 1 || !old ? to.cost : from.cost
    return { centres: from.centres, labels: shown, ends, grown: old ? 1 : k, cost: k >= 1 || old ? now : null, phase: 'assign', round }
  }

  // An update: the centres slide; each point's line follows its centre
  const labels = from.labels!
  const centres = from.centres.map((c, l) => mix(c, to.centres[l], k))
  return {
    centres,
    labels,
    ends: points.map((_, p) => centres[labels[p]]),
    grown: 1,
    cost: cost(points, labels, centres),
    phase: 'update',
    round,
  }
}
