import { seeded } from '../../components/explain/random'

// A landscape: the height of the ground (the loss) at x, and how it bends
// there (its second derivative). Every landscape on the page lives on the
// same stretch of ground, DOMAIN.
export interface Landscape {
  name: string
  f: (x: number) => number
  bend: (x: number) => number
}

export const DOMAIN: readonly [number, number] = [-1.6, 1.6]

// The story's bowl
export const BOWL: Landscape = { name: 'x²', f: (x) => x * x, bend: () => 2 }

// A bowl whose bottom is flat: it bends not at all at x = 0, and never down
export const FLAT_BOTTOM: Landscape = { name: 'x⁴', f: (x) => x ** 4, bend: (x) => 12 * x * x }

// A lopsided bowl, steep on one side and gentle on the other
export const LOPSIDED: Landscape = { name: 'eˣ − x', f: (x) => Math.exp(x) - x, bend: (x) => Math.exp(x) }

// A crease at the bottom: no second derivative at 0, but convex all the same
export const CREASE: Landscape = { name: '|x|', f: (x) => Math.abs(x), bend: (x) => (x === 0 ? Infinity : 0) }

// The lab's family: x⁴ + b·x² + 0.8x. It bends by 12x² + 2b, least at
// x = 0, so it is convex exactly when b ≥ 0. The tilt 0.8x is a straight
// line, which adds no bend; it only makes one valley deeper than the other.
export const TILT = 0.8
export const family = (b: number): Landscape => ({
  name: `x⁴ ${b < 0 ? '−' : '+'} ${Math.abs(b)}x² + ${TILT}x`,
  f: (x) => x ** 4 + b * x * x + TILT * x,
  bend: (x) => 12 * x * x + 2 * b,
})

// The story's dented valley: the family at b = −2, a big valley with a
// shallow dip on its right-hand slope
export const DENT_B = -2
export const DENT = family(DENT_B)

// The lab's slider for b
export const BENDS = { min: -2, max: 1, step: 0.1 }
export const bendValues = () => {
  const values: number[] = []
  for (let b = BENDS.min; b <= BENDS.max + 1e-9; b += BENDS.step) values.push(Math.round(b * 10) / 10)
  return values
}

// n evenly spaced points from lo to hi
export const grid = (n: number, lo = DOMAIN[0], hi = DOMAIN[1]) =>
  Array.from({ length: n }, (_, i) => lo + ((hi - lo) * i) / (n - 1))

// --- The chord (the rope) ---

// How far the ground stands above the rope from x to y, a share θ of the
// way from y to x: f(θx + (1 − θ)y) − (θf(x) + (1 − θ)f(y)). Convex means
// this is never above zero.
export const chordGap = (f: Landscape['f'], x: number, y: number, theta: number) =>
  f(theta * x + (1 - theta) * y) - (theta * f(x) + (1 - theta) * f(y))

// Where along the rope from x to y the ground pokes above it, as stretches
// [from, to] of x, sampled at `n` points along it
export function pokes(f: Landscape['f'], x: number, y: number, n = 200): [number, number][] {
  const lo = Math.min(x, y)
  const hi = Math.max(x, y)
  const stretches: [number, number][] = []
  let open: number | null = null
  for (let i = 0; i <= n; i++) {
    const at = lo + ((hi - lo) * i) / n
    const theta = hi === lo ? 0 : (at - lo) / (hi - lo)
    const above = hi > lo && chordGap(f, hi, lo, theta) > 1e-9
    if (above && open === null) open = at
    if (!above && open !== null) {
      stretches.push([open, at])
      open = null
    }
  }
  if (open !== null) stretches.push([open, hi])
  return stretches
}

// The chord test on a grid: stretch a rope between every pair of grid
// points and look halfway along it. (For a continuous function, checking
// halfway is enough: the rest of θ follows.) Returns the most the ground
// ever stands above a rope, so ≤ 0 means convex.
export function chordTest(f: Landscape['f'], n = 161, lo = DOMAIN[0], hi = DOMAIN[1]): number {
  const xs = grid(n, lo, hi)
  const ys = xs.map(f)
  let worst = -Infinity
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j += 2) {
      worst = Math.max(worst, ys[(i + j) / 2] - (ys[i] + ys[j]) / 2)
    }
  }
  return worst
}

// The second-derivative test on a grid: the least the ground ever bends.
// Never below zero means convex.
export function leastBend(landscape: Landscape, n = 161, lo = DOMAIN[0], hi = DOMAIN[1]): number {
  return Math.min(...grid(n, lo, hi).map(landscape.bend))
}

// Where the ground bends down (its second derivative is negative), as
// stretches [from, to] of x
export function bendsDown(landscape: Landscape, n = 321): [number, number][] {
  const xs = grid(n)
  const stretches: [number, number][] = []
  let open: number | null = null
  for (const x of xs) {
    const down = landscape.bend(x) < 0
    if (down && open === null) open = x
    if (!down && open !== null) {
      stretches.push([open, x])
      open = null
    }
  }
  if (open !== null) stretches.push([open, DOMAIN[1]])
  return stretches
}

// --- The walker who only goes downhill ---

// The walker's stride: small, so where she stops is where the ground is
// flat. (How big a step to take is the next page's question.)
export const STRIDE = 0.01

// Walk downhill from x0: feel the ground a stride either way, step to the
// lower side, and stop when neither side is lower. The way walked, from x0
// to where she stopped.
export function descend(f: Landscape['f'], x0: number, stride = STRIDE, lo = DOMAIN[0], hi = DOMAIN[1]): number[] {
  const way = [x0]
  let x = x0
  for (let i = 0; i < 10_000; i++) {
    const here = f(x)
    const left = x - stride >= lo - 1e-12 ? f(x - stride) : Infinity
    const right = x + stride <= hi + 1e-12 ? f(x + stride) : Infinity
    if (left >= here && right >= here) break
    x = left < right ? x - stride : x + stride
    way.push(x)
  }
  return way
}

// The lowest point of the ground, found by looking everywhere (what the
// walker in the fog cannot do)
export function lowest(f: Landscape['f'], n = 3201): { x: number; y: number } {
  let best = { x: DOMAIN[0], y: Infinity }
  for (const x of grid(n)) {
    const y = f(x)
    if (y < best.y) best = { x, y }
  }
  return best
}

// Every flat spot the walker can stop at: the local minima, left to right
export function minima(f: Landscape['f'], n = 3201): { x: number; y: number }[] {
  const xs = grid(n)
  const ys = xs.map(f)
  const found: { x: number; y: number }[] = []
  for (let i = 0; i < n; i++) {
    const left = i > 0 ? ys[i - 1] : Infinity
    const right = i < n - 1 ? ys[i + 1] : Infinity
    if (ys[i] < left && ys[i] <= right) found.push({ x: xs[i], y: ys[i] })
  }
  return found
}

// Whether a walker who stopped at x is stuck above the lowest point. A
// walker stops within a stride of a flat spot, which on a crease like |x|
// can leave her a stride's climb above it; the dip on the page is far
// higher than that.
export const trapped = (f: Landscape['f'], x: number, tolerance = 0.02) => f(x) > lowest(f).y + tolerance

// Where walkers dropped at random over the ground start: seeded, so the
// story always tells the same numbers
export const starts = (seed: number, count: number) => {
  const random = seeded(seed)
  return Array.from({ length: count }, () => DOMAIN[0] + random() * (DOMAIN[1] - DOMAIN[0]))
}

// The share of the ground from which a walker ends in the lowest valley:
// the width of its basin over the width of the ground
export function lowestBasinShare(f: Landscape['f'], n = 1601): number {
  const best = lowest(f).y
  const xs = grid(n)
  const ending = xs.filter((x) => f(descend(f, x).at(-1)!) <= best + 0.02).length
  return ending / n
}

// --- The story ---

// Where the hiker sets off, on the bowl and on the dented valley
export const STORY_START = 1.3
export const FRIENDS = 20
// Chosen so the run lands on what the basins say: the dip catches 44% of
// the ground, about 9 of 20
export const STORY_SEED = 2
export const STORY_STARTS = starts(STORY_SEED, FRIENDS)

export const DENT_MINIMA = minima(DENT.f)
export const DENT_LOWEST = lowest(DENT.f)
export const DENT_DIP = DENT_MINIMA.find((m) => trapped(DENT.f, m.x))!
export const dentTrapped = STORY_STARTS.filter((x) => trapped(DENT.f, descend(DENT.f, x).at(-1)!)).length

// --- The one line of math ---

// The rope across the dent's hump: from x = −1 to x = 1, looked at halfway
export const ROPE = { x: -1, y: 1 }
export const ROPE_WORKED = {
  left: DENT.f(ROPE.x),
  right: DENT.f(ROPE.y),
  rope: (DENT.f(ROPE.x) + DENT.f(ROPE.y)) / 2,
  ground: DENT.f((ROPE.x + ROPE.y) / 2),
}

// The three worked bends, each at its least, x = 0
export const WORKED_BENDS = [
  { landscape: BOWL, at: 0 },
  { landscape: FLAT_BOTTOM, at: 0 },
  { landscape: DENT, at: 0 },
].map(({ landscape, at }) => ({ name: landscape.name, bend: landscape.bend(at), convex: leastBend(landscape) >= 0 }))

// --- Check yourself: the larger of two convex losses ---
export const LARGER: Landscape = {
  name: 'max(x², (x − 1)²)',
  f: (x) => Math.max(x * x, (x - 1) ** 2),
  bend: (x) => (Math.abs(x - 0.5) < 1e-12 ? Infinity : 2),
}

// "−1.8", "0.0"
export const one = (value: number) => (Math.abs(value) < 0.05 ? '0' : value.toFixed(1).replace('-', '−'))

// --- The lab ---

// Where the lab's rope starts: across the hump when b < 0, clear of the
// two valleys' piles of walkers
export const LAB_ROPE: [number, number] = [-1.4, 1.2]

// Where the lab's crowd of walkers starts
export const LAB_STARTS = starts(11, FRIENDS)

// The highest b on the slider at which the ground has a second valley:
// above it, the ground is not convex (for b < 0) but has only one valley
export const SECOND_VALLEY = Math.max(...bendValues().filter((b) => minima(family(b).f).length > 1))
