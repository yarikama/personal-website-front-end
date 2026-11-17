import { seeded } from '../../components/explain/random'

// k-means: points in a plane, k centres, and Lloyd's algorithm, which
// alternates sending each point to its nearest centre with moving each
// centre to the mean of its points. Every number the page states comes
// from here; the figures only draw.

export type Point = readonly [number, number]

export const dist2 = (a: Point, b: Point) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2

// The nearest centre to `p`. A tie keeps `current`, the centre the point
// already has, and otherwise goes to the lowest index: a point only switches
// when another centre is strictly closer, so the algorithm cannot cycle
export function nearest(p: Point, centres: readonly Point[], current = -1): number {
  let best = current >= 0 ? current : 0
  let bestD = dist2(p, centres[best])
  centres.forEach((c, i) => {
    const d = dist2(p, c)
    if (d < bestD) {
      best = i
      bestD = d
    }
  })
  return best
}

// Step 1: every point to its nearest centre
export const assign = (points: readonly Point[], centres: readonly Point[], previous?: readonly number[] | null) =>
  points.map((p, i) => nearest(p, centres, previous?.[i] ?? -1))

// Step 2: every centre to the mean of its points. A centre with no points
// stays where it is
export function means(points: readonly Point[], labels: readonly number[], centres: readonly Point[]): Point[] {
  return centres.map((c, l) => {
    let x = 0
    let y = 0
    let n = 0
    points.forEach((p, i) => {
      if (labels[i] !== l) return
      x += p[0]
      y += p[1]
      n += 1
    })
    return n ? ([x / n, y / n] as const) : c
  })
}

// The sum, over every point, of its squared distance to the centre it is
// assigned to: what both steps lower
export const cost = (points: readonly Point[], labels: readonly number[], centres: readonly Point[]) =>
  points.reduce((sum, p, i) => sum + dist2(p, centres[labels[i]]), 0)

// The k-means objective of a set of centres: each point counted at its
// nearest centre
export const objective = (points: readonly Point[], centres: readonly Point[]) =>
  points.reduce((sum, p) => sum + Math.min(...centres.map((c) => dist2(p, c))), 0)

// One moment of a run: the centres, which centre each point is with (none
// before the first assignment), and the cost then
export interface State {
  centres: Point[]
  labels: number[] | null
  cost: number | null
}

// Lloyd's algorithm from `starts`, half a round at a time: the start, then
// assign, update, assign, update... It stops when an assignment would move
// no point; the last state is then the last update. `rounds` is how many
// updates that took.
export function lloyd(points: readonly Point[], starts: readonly Point[], most = 200): State[] {
  const trace: State[] = [{ centres: [...starts], labels: null, cost: null }]
  let centres = [...starts]
  let labels: number[] | null = null
  for (let round = 0; round < most; round++) {
    const next = assign(points, centres, labels)
    if (labels && next.every((l, i) => l === labels![i])) break
    labels = next
    trace.push({ centres, labels, cost: cost(points, labels, centres) })
    centres = means(points, labels, centres)
    trace.push({ centres, labels, cost: cost(points, labels, centres) })
  }
  return trace
}

export const rounds = (trace: readonly State[]) => (trace.length - 1) / 2
export const final = (trace: readonly State[]) => trace[trace.length - 1].cost!

// Random starts: k different points of the data, every choice equally likely
export function randomStarts(points: readonly Point[], k: number, random: () => number): Point[] {
  const order = points.map((_, i) => i)
  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(random() * (order.length - i))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order.slice(0, k).map((i) => points[i])
}

// k-means++ starts: the first a random point; each next one a point drawn
// with chance in proportion to its squared distance to the nearest start so
// far, so a crowd no start has reached yet is the likeliest to get one
export function plusPlusStarts(points: readonly Point[], k: number, random: () => number): Point[] {
  const starts: Point[] = [points[Math.floor(random() * points.length)]]
  const d2 = points.map((p) => dist2(p, starts[0]))
  while (starts.length < k) {
    const total = d2.reduce((s, d) => s + d, 0)
    let pick = d2.length - 1
    if (total > 0) {
      let r = random() * total
      for (let i = 0; i < d2.length; i++) {
        r -= d2[i]
        if (r < 0 && d2[i] > 0) {
          pick = i
          break
        }
      }
      while (d2[pick] === 0) pick -= 1
    } else {
      pick = Math.floor(random() * points.length)
    }
    starts.push(points[pick])
    points.forEach((p, i) => {
      d2[i] = Math.min(d2[i], dist2(p, points[pick]))
    })
  }
  return starts
}

// The chance that k-means++ picks each point as the next start, given the
// starts so far
export function plusPlusChances(points: readonly Point[], starts: readonly Point[]): number[] {
  const d2 = points.map((p) => Math.min(...starts.map((s) => dist2(p, s))))
  const total = d2.reduce((s, d) => s + d, 0)
  return d2.map((d) => d / total)
}

export type Init = 'Random' | 'k-means++'
export const INITS: readonly Init[] = ['Random', 'k-means++']

export const startsFor = (init: Init, points: readonly Point[], k: number, seed: number) =>
  (init === 'Random' ? randomStarts : plusPlusStarts)(points, k, seeded(seed))

// One run: starts from `init` with `seed`, then Lloyd's algorithm
export const run = (points: readonly Point[], k: number, init: Init, seed: number) =>
  lloyd(points, startsFor(init, points, k, seed))

// Arthur and Vassilvitskii's bound: k-means++ starts alone score, on
// average, at most this many times the best possible objective
export const plusPlusBound = (k: number) => 8 * (Math.log(k) + 2)

// ---------------------------------------------------------------------------
// Crowds of points

export interface Crowd {
  at: Point
  spread: number
  count: number
}

// Points around each crowd's centre, spread like a bell curve
export function crowds(spec: readonly Crowd[], seed: number): Point[] {
  const random = seeded(seed)
  const normal = () => {
    const u = 1 - random()
    const v = random()
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }
  return spec.flatMap(({ at, spread, count }) =>
    Array.from({ length: count }, () => [at[0] + spread * normal(), at[1] + spread * normal()] as const)
  )
}

// The park the figures draw: 10 wide, 6 deep
export const PARK = { width: 10, height: 6 }

// ---------------------------------------------------------------------------
// The story: three crowds of picnickers and three food trucks

export const PICNIC_CROWDS: readonly Crowd[] = [
  { at: [2.3, 3.2], spread: 0.55, count: 18 },
  { at: [7.4, 4.6], spread: 0.5, count: 16 },
  { at: [7.0, 1.5], spread: 0.5, count: 16 },
]
export const PICNIC = crowds(PICNIC_CROWDS, 7)

// Where the trucks park the first time: anywhere, a few rounds from right
export const GOOD_START: readonly Point[] = [
  [4.4, 5.3],
  [5.2, 3.4],
  [9.2, 2.6],
]
// The second time: two trucks in the left crowd, one between the others
export const STUCK_START: readonly Point[] = [
  [1.8, 3.4],
  [2.8, 3.0],
  [8.6, 3.0],
]
export const GOOD = lloyd(PICNIC, GOOD_START)
export const STUCK = lloyd(PICNIC, STUCK_START)

// Which crowd each picnicker came from, to tell a found group from a crowd
export const PICNIC_CROWD = PICNIC_CROWDS.flatMap((c, i) => Array.from({ length: c.count }, () => i))

// ---------------------------------------------------------------------------
// The worked example: six points on a line, two centres both starting on
// the left

export const WORKED_POINTS: readonly Point[] = [1, 3, 4, 8, 9, 10].map((x) => [x, 0] as const)
export const WORKED_STARTS: readonly Point[] = [
  [1, 0],
  [3, 0],
]
export const WORKED = lloyd(WORKED_POINTS, WORKED_STARTS)

// Each round as the page tells it: the centres after the update, and the
// cost then
export const workedRounds = () =>
  Array.from({ length: rounds(WORKED) }, (_, r) => {
    const after = WORKED[2 * r + 2]
    return {
      round: r + 1,
      centres: after.centres.map((c) => c[0]),
      groups: after.labels!.map((l, i) => [l, WORKED_POINTS[i][0]] as const),
      cost: after.cost!,
    }
  })

// ---------------------------------------------------------------------------
// The lab: five crowds of different sizes

export const LAB_CROWDS: readonly Crowd[] = [
  { at: [1.5, 4.6], spread: 0.4, count: 30 },
  { at: [4.9, 4.9], spread: 0.35, count: 16 },
  { at: [8.4, 4.5], spread: 0.45, count: 34 },
  { at: [2.3, 1.3], spread: 0.45, count: 26 },
  { at: [6.6, 1.3], spread: 0.4, count: 20 },
]
export const LAB = crowds(LAB_CROWDS, 11)
export const LAB_K = { low: 2, high: 6, start: 5 }
export const RESTARTS = 100

export interface Restarts {
  // Each run's final objective, by how it started
  finals: Record<Init, number[]>
  // The lowest any run reached
  best: number
  // How many runs of each kind reached it (within a thousandth)
  reached: Record<Init, number>
  // The average final objective of each kind
  average: Record<Init, number>
}

const restartCache = new Map<number, Restarts>()

// A hundred runs from each kind of start, on the lab's crowds
export function restarts(k: number): Restarts {
  const known = restartCache.get(k)
  if (known) return known
  const finals = {} as Record<Init, number[]>
  for (const init of INITS) finals[init] = Array.from({ length: RESTARTS }, (_, s) => final(run(LAB, k, init, s + 1)))
  const best = Math.min(...INITS.flatMap((init) => finals[init]))
  const reached = {} as Record<Init, number>
  const average = {} as Record<Init, number>
  for (const init of INITS) {
    reached[init] = finals[init].filter((f) => f <= best * 1.001).length
    average[init] = finals[init].reduce((s, f) => s + f, 0) / RESTARTS
  }
  const found = { finals, best, reached, average }
  restartCache.set(k, found)
  return found
}

const runCache = new Map<string, State[]>()

// A run on the lab's crowds, worked out once
export function labRun(k: number, init: Init, seed: number): State[] {
  const key = `${k} ${init} ${seed}`
  let found = runCache.get(key)
  if (!found) {
    found = run(LAB, k, init, seed)
    runCache.set(key, found)
  }
  return found
}

// ---------------------------------------------------------------------------
// Check yourself: two long thin rows of people side by side

export const ROWS = (() => {
  const points: Point[] = []
  for (let i = 0; i <= 40; i++) {
    points.push([i, 0], [i, 1])
  }
  return points
})()
// Each row its own group, against a cut across both rows at the middle
export const rowsSplit = () => {
  const labels = ROWS.map((p) => (p[1] === 0 ? 0 : 1))
  return cost(ROWS, labels, means(ROWS, labels, [ROWS[0], ROWS[1]]))
}
export const acrossSplit = () => {
  const labels = ROWS.map((p) => (p[0] < 20 ? 0 : 1))
  return cost(ROWS, labels, means(ROWS, labels, [ROWS[0], ROWS[1]]))
}
