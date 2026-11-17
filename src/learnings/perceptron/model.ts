// The perceptron: a straight line through the middle of a chart sorts
// points into two classes by which side they fall on, sign(w · x), and it
// learns w from its mistakes alone, adding y · x whenever it calls a point
// wrong. On data some line splits with a gap γ, inside a radius R, it makes
// at most (R/γ)² mistakes, however many points there are. On data no line
// splits, it never stops.

import { seeded } from '../../components/explain/random'

// ---------------------------------------------------------------------------
// Vectors in the plane

export type Vec = readonly [number, number]

export const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1]
export const norm = (a: Vec) => Math.hypot(a[0], a[1])
export const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1]]
export const scale = (a: Vec, by: number): Vec => [a[0] * by, a[1] * by]
export const unit = (angle: number): Vec => [Math.cos(angle), Math.sin(angle)]

// A point and its class: +1 (ripe) or −1 (not)
export interface Example {
  x: Vec
  y: 1 | -1
}

// ---------------------------------------------------------------------------
// The classifier

// Which side of the line w · x = 0 a point falls on. Exactly on the line
// (and always, while w is still zero) counts as no answer, so as wrong.
export const predict = (w: Vec, x: Vec): 1 | -1 | 0 => {
  const s = dot(w, x)
  return s > 0 ? 1 : s < 0 ? -1 : 0
}

// Right only if strictly on its own side: y (w · x) > 0
export const isRight = (w: Vec, { x, y }: Example) => y * dot(w, x) > 0

// How far the closest point sits on its own side of the line w · x = 0:
// min over points of y (w · x) / |w|. Negative if a point is on the wrong side.
export function margin(data: readonly Example[], w: Vec): number {
  const length = norm(w)
  if (length === 0) return 0
  let least = Infinity
  for (const { x, y } of data) least = Math.min(least, (y * dot(w, x)) / length)
  return least
}

// How far the farthest point is from the middle: R
export const radius = (data: readonly Example[]) => Math.max(...data.map(({ x }) => norm(x)))

// The widest gap any line through the middle leaves: the margin at the
// best angle. A sweep of the angles, then a closer look around the best.
// If no line splits the data, gamma is zero or below.
export function widestGap(data: readonly Example[]): { angle: number; gamma: number } {
  const at = (angle: number) => margin(data, unit(angle))
  const steps = 3600
  let best = 0
  let bestGamma = -Infinity
  for (let i = 0; i < steps; i++) {
    const angle = (2 * Math.PI * i) / steps
    const g = at(angle)
    if (g > bestGamma) {
      best = angle
      bestGamma = g
    }
  }
  // The margin is a minimum of sine waves, so it has one peak near the
  // best angle: a golden-section search closes in on it
  let low = best - (2 * Math.PI) / steps
  let high = best + (2 * Math.PI) / steps
  const ratio = (Math.sqrt(5) - 1) / 2
  for (let i = 0; i < 60; i++) {
    const a = high - ratio * (high - low)
    const b = low + ratio * (high - low)
    if (at(a) < at(b)) low = a
    else high = b
  }
  const refined = (low + high) / 2
  return at(refined) > bestGamma ? { angle: refined, gamma: at(refined) } : { angle: best, gamma: bestGamma }
}

// The most mistakes the perceptron can make: (R/γ)², or no limit at all
// when no line leaves a gap
export const mistakeBound = (r: number, gamma: number) => (gamma > 0 ? (r / gamma) ** 2 : Infinity)

// ---------------------------------------------------------------------------
// The perceptron

export interface Mistake {
  // Which point it called wrong, on which pass over the data (from 0)
  at: number
  pass: number
  // The weights before and after adding y · x
  before: Vec
  after: Vec
}

export interface Run {
  mistakes: Mistake[]
  // Whether a whole pass went by with no mistake, after which nothing changes
  settled: boolean
  // Passes made, the last one clean if it settled
  passes: number
}

// Go over the points in order, again and again, from w = 0. Right: change
// nothing. Wrong: w ← w + y x. Stop after a pass with no mistake, or after
// `most` passes.
export function perceptron(data: readonly Example[], most = 1000): Run {
  let w: Vec = [0, 0]
  const mistakes: Mistake[] = []
  for (let pass = 0; pass < most; pass++) {
    let clean = true
    data.forEach((example, at) => {
      if (isRight(w, example)) return
      const after = add(w, scale(example.x, example.y))
      mistakes.push({ at, pass, before: w, after })
      w = after
      clean = false
    })
    if (clean) return { mistakes, settled: true, passes: pass + 1 }
  }
  return { mistakes, settled: false, passes: most }
}

// The weights after the first `k` mistakes of a run
export const weightsAfter = (run: Run, k: number): Vec => (k <= 0 ? [0, 0] : run.mistakes[Math.min(k, run.mistakes.length) - 1].after)

// One look at one point, in the order the perceptron makes them
export interface Visit {
  pass: number
  at: number
  // The weights it judged with, and after (the same unless it was wrong)
  before: Vec
  after: Vec
  wrong: boolean
  // Mistakes up to and including this look
  mistakes: number
}

// Every look of a run, at most `most` passes of them
export function visits(data: readonly Example[], run: Run, most = run.passes): Visit[] {
  const out: Visit[] = []
  let k = 0
  let w: Vec = [0, 0]
  for (let pass = 0; pass < Math.min(most, run.passes); pass++) {
    for (let at = 0; at < data.length; at++) {
      const next = run.mistakes[k]
      const wrong = next !== undefined && next.pass === pass && next.at === at
      const before = w
      if (wrong) {
        w = next.after
        k++
      }
      out.push({ pass, at, before, after: w, wrong, mistakes: k })
    }
  }
  return out
}

// Points the weights `w` call wrong
export const wrongCount = (data: readonly Example[], w: Vec) => data.filter((e) => !isRight(w, e)).length

// ---------------------------------------------------------------------------
// The crates: points in an oval, split by a line at a fixed angle, with
// the two halves pulled apart by `gap` (or pushed into each other, when
// it is below zero)

// The line the crates are made with: its normal points up and to the right
export const MADE_ANGLE = (52 * Math.PI) / 180

// How far the oval reaches either side of the made line, and along it:
// long and thin along the line, so its direction takes some learning
export const SHAPE = { off: 0.45, along: 1.3 }

// `n` points from `seed`. Each is drawn evenly from an oval,
// takes its class from its side of the made line, and moves gap/2 away
// from the line (towards it, and past it, for a negative gap). The same
// seed gives the same points at every gap, so a slider slides them.
export function crate(seed: number, n: number, gap: number): Example[] {
  const random = seeded(seed)
  const u = unit(MADE_ANGLE)
  const across: Vec = [-u[1], u[0]]
  const points: Example[] = []
  while (points.length < n) {
    const p: Vec = [2 * random() - 1, 2 * random() - 1]
    if (norm(p) > 1) continue
    const off = SHAPE.off * p[0]
    const side = SHAPE.along * p[1]
    const y = off >= 0 ? 1 : -1
    const s = off + (y * gap) / 2
    points.push({ x: add(scale(u, s), scale(across, side)), y })
  }
  return points
}

// Every point times `by`, as if measured in other units
export const rescale = (data: readonly Example[], by: number): Example[] => data.map(({ x, y }) => ({ x: scale(x, by), y }))

// A crate and everything the page says about it
export interface Summary {
  data: Example[]
  run: Run
  r: number
  // The widest gap a line through the middle leaves, and that line's
  // normal's angle
  gamma: number
  angle: number
  bound: number
}

export function summarise(data: Example[], most = 1000): Summary {
  const run = perceptron(data, most)
  const r = radius(data)
  const { gamma, angle } = widestGap(data)
  return { data, run, r, gamma, angle, bound: mistakeBound(r, gamma) }
}

// ---------------------------------------------------------------------------
// The page's numbers

// Guess first: a thousand avocados with a clear gap
export const GUESS = { seed: 7, n: 1000, gap: 0.4 }
export const guess = () => summarise(crate(GUESS.seed, GUESS.n, GUESS.gap))

// The story's crate: a couple of dozen avocados, tidy, then messy
export const STORY = { seed: 7, n: 24, gap: 0.4, messy: -0.4 }
export const storyCrate = () => summarise(crate(STORY.seed, STORY.n, STORY.gap))
export const messyCrate = () => summarise(crate(STORY.seed, STORY.n, STORY.messy), 200)

// The story's two moments: a few right calls in a row, and the wrong call
// that follows them. The first mistake with `calls` right calls before it
// in the same round.
export function storyMoments(data: readonly Example[], run: Run, calls = 6) {
  const all = visits(data, run)
  for (let i = calls; i < all.length; i++) {
    const before = all.slice(i - calls, i)
    if (all[i].wrong && before.every((v) => !v.wrong && v.pass === all[i].pass)) {
      return { calls: before, mistake: run.mistakes[all[i].mistakes - 1] }
    }
  }
  throw new Error('no wrong call follows a run of right ones')
}

// The lab: a hundred points, the gap on a slider
export const LAB = { seed: 11, n: 100, gaps: [-0.3, 0.6] as const, step: 0.05, start: 0.4, most: 1000 }
export const labCrate = (gap: number) => summarise(crate(LAB.seed, LAB.n, gap), LAB.most)

// Three worked crates for the bound: a wide gap, a narrow one, and none
export const WORKED = [
  { name: 'Wide gap', gap: 0.5 },
  { name: 'Narrow gap', gap: 0.1 },
  { name: 'Overlapping', gap: -0.2 },
] as const
export const worked = () => WORKED.map((w) => ({ ...w, ...labCrate(w.gap) }))

// The quick check: halve the gap, and the limit grows four times
export const CHECK = (() => {
  const r = 1.2
  const gamma = 0.2
  return { r, gamma, before: Math.round(mistakeBound(r, gamma)), after: Math.round(mistakeBound(r, gamma / 2)) }
})()
