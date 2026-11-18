import { seeded } from '../../components/explain/random'

export type Matrix = number[][]

// ---------------------------------------------------------------------------
// Counting: what full fine-tuning and LoRA train for one table of weights
// ---------------------------------------------------------------------------

// Full fine-tuning trains every cell of a rows × columns table
export const fullParams = (rows: number, columns: number) => rows * columns

// LoRA trains B (rows × r) and A (r × columns): r × (rows + columns)
export const loraParams = (rows: number, columns: number, r: number) => r * (rows + columns)

// LoRA's share of full fine-tuning for the same table
export const loraShare = (rows: number, columns: number, r: number) => loraParams(rows, columns, r) / fullParams(rows, columns)

// One attention projection of a mid-sized language model: 4,096 × 4,096
export const D = 4096
export const RANKS = [1, 8, 64] as const
export const WORKED = RANKS.map((r) => ({ r, params: loraParams(D, D, r), share: loraShare(D, D, r) }))
export const FULL = fullParams(D, D)
// The rank the first question asks about
export const GUESS_RANK = 8

// The last check: a feed-forward table of 4,096 × 11,008 at rank 8
export const CHECK = { rows: 4096, columns: 11008, r: 8 }
export const CHECK_PARAMS = loraParams(CHECK.rows, CHECK.columns, CHECK.r)
export const CHECK_FULL = fullParams(CHECK.rows, CHECK.columns)
// The wrong answer of a reader who counts the table as if it were square
export const CHECK_SQUARE = loraParams(CHECK.rows, CHECK.rows, CHECK.r)

// What the LoRA paper measured on GPT-3 175B (Hu et al. 2021, §4.2)
export const PAPER = {
  vramFull: '1.2 TB',
  vramLora: '350 GB',
  checkpointFull: '350 GB',
  checkpointLora: '35 MB',
  checkpointRank: 4,
  hundredLora: '354 GB',
  hundredFull: '35 TB',
}

// ---------------------------------------------------------------------------
// Matrix helpers
// ---------------------------------------------------------------------------

export const zeros = (m: number, n: number): Matrix => Array.from({ length: m }, () => new Array<number>(n).fill(0))

export function multiply(a: Matrix, b: Matrix): Matrix {
  const n = b[0]?.length ?? 0
  return a.map((row) => {
    const out = new Array<number>(n).fill(0)
    row.forEach((x, k) => {
      if (x === 0) return
      const bk = b[k]
      for (let j = 0; j < n; j++) out[j] += x * bk[j]
    })
    return out
  })
}

export const add = (a: Matrix, b: Matrix): Matrix => a.map((row, i) => row.map((x, j) => x + b[i][j]))
export const subtract = (a: Matrix, b: Matrix): Matrix => a.map((row, i) => row.map((x, j) => x - b[i][j]))
export const transpose = (a: Matrix): Matrix => (a[0] ?? []).map((_, j) => a.map((row) => row[j]))
export const frobenius = (a: Matrix) => Math.sqrt(a.reduce((sum, row) => sum + row.reduce((s, x) => s + x * x, 0), 0))
export const apply = (a: Matrix, x: number[]) => a.map((row) => row.reduce((s, v, j) => s + v * x[j], 0))
export const outer = (u: number[], v: number[]): Matrix => u.map((x) => v.map((y) => x * y))

// A normal random number, from two uniform ones (Box–Muller)
export function gaussian(random: () => number): number {
  const u = 1 - random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random())
}

// The vectors made orthonormal, in order (Gram–Schmidt)
export function orthonormal(vectors: number[][]): number[][] {
  const out: number[][] = []
  for (const v of vectors) {
    let w = [...v]
    for (const q of out) {
      const along = w.reduce((s, x, i) => s + x * q[i], 0)
      w = w.map((x, i) => x - along * q[i])
    }
    const length = Math.hypot(...w)
    out.push(w.map((x) => x / length))
  }
  return out
}

// ---------------------------------------------------------------------------
// The story: a heating schedule of 8 rooms × 24 hours, and a change to it
// that is one list over rooms times one list over hours
// ---------------------------------------------------------------------------

export const ROOMS = ['Nursery', 'Bedroom', 'Living', 'Kitchen', 'Bath', 'Study', 'Hall', 'Guest']
export const HOURS = Array.from({ length: 24 }, (_, h) => h)

// The printed schedule, in °C: cool at night, warm for breakfast and in the
// evening, each room a little off the house's pattern
const HOUSE = HOURS.map((h) => (h < 6 ? 16 : h < 9 ? 19 : h < 17 ? 17 : h < 23 ? 20 : 16))
const ROOM_OFFSET = [0, -1, 1, 0, 1, 0, -1, -2]
export const SCHEDULE: Matrix = ROOMS.map((_, r) =>
  HOURS.map((h) => HOUSE[h] + ROOM_OFFSET[r] + (r === 5 && h >= 9 && h < 17 ? 2 : 0)),
)

// The change you want: how much warmer each room should be, in °C, and how
// much of that each hour gets (the evening, from 5 pm to midnight)
export const ROOM_LIST = [3, 1.5, 1, 0, 1, 0, 0.5, 0]
export const HOUR_LIST = HOURS.map((h) => (h >= 18 && h <= 22 ? 1 : h === 17 || h === 23 ? 0.5 : 0))

// The change, cell by cell: room amount × hour amount
export const changeOf = (rooms: number[], hours: number[]) => outer(rooms, hours)
export const CHANGE = changeOf(ROOM_LIST, HOUR_LIST)
export const NEW_SCHEDULE = add(SCHEDULE, CHANGE)

export const STORY = {
  settings: fullParams(ROOMS.length, HOURS.length),
  note: loraParams(ROOMS.length, HOURS.length, 1),
  // The warmest the change makes a cell, and where
  most: Math.max(...CHANGE.flat()),
  // How many of the 192 settings the change touches at all
  touched: CHANGE.flat().filter((x) => x !== 0).length,
}

// The range of temperatures the figure shades, in °C
export const COLDEST = 13
export const WARMEST = 24

// ---------------------------------------------------------------------------
// The lab: one 12 × 12 layer learns a change that the task needs, by
// gradient descent on ½‖ΔW − ΔW*‖², either every cell (full fine-tuning) or
// as B A at rank r, with B starting at zero and A random
// ---------------------------------------------------------------------------

export const N = 12
// The needed change: rank 2, with strengths 3 and 1, along smooth patterns
export const STRENGTHS = [3, 1]
const bump = (centre: number, width: number) =>
  Array.from({ length: N }, (_, i) => Math.exp(-(((i - centre) / width) ** 2)))
const ROW_PATTERNS = orthonormal([bump(3, 3), bump(8, 2.5)])
const COLUMN_PATTERNS = orthonormal([bump(7, 3.5), bump(2, 2)])

// A matrix of the given strengths along the given orthonormal patterns
export const fromPatterns = (strengths: number[], rows: number[][], columns: number[][]) =>
  strengths.reduce<Matrix>((sum, s, k) => add(sum, outer(rows[k].map((x) => s * x), columns[k])), zeros(rows[0].length, columns[0].length))

export const NEEDED = fromPatterns(STRENGTHS, ROW_PATTERNS, COLUMN_PATTERNS)

// The best any rank-r change can do, as a share of the needed change missed:
// the strengths it leaves out (the truncated SVD keeps the strongest)
export function bestMissed(strengths: number[], r: number) {
  const total = Math.hypot(...strengths)
  return Math.hypot(...[...strengths].sort((a, b) => b - a).slice(r)) / total
}

export const METHODS = ['Full', 'Rank 1', 'Rank 2', 'Rank 4'] as const
export type Method = (typeof METHODS)[number]
export const rankOf = (method: Method) => (method === 'Full' ? null : Number(method.split(' ')[1]))
export const STARTS = ['B at zero', 'Both at zero'] as const
export type Start = (typeof STARTS)[number]

export const STEPS = 240
export const RATE = 0.05
// A's starting entries: normal with this spread, so each of its rows has a
// length near 1
export const SPREAD = 1 / Math.sqrt(N)

export type Run = {
  // The learned change after each step, from step 0 (before any)
  changes: Matrix[]
  // The share of the needed change it still misses, after each step
  missed: number[]
  params: number
}

// Train `method` to make `needed`, from `start`, for `steps` steps
export function train(
  needed: Matrix,
  method: Method,
  start: Start,
  { steps = STEPS, rate = RATE, seed = 7 }: { steps?: number; rate?: number; seed?: number } = {},
): Run {
  const m = needed.length
  const n = needed[0].length
  const size = frobenius(needed)
  const r = rankOf(method)
  const changes: Matrix[] = []
  const missed: number[] = []
  const record = (change: Matrix) => {
    changes.push(change)
    missed.push(frobenius(subtract(change, needed)) / size)
  }

  if (r === null) {
    // Every cell is its own number: the gradient of ½‖ΔW − ΔW*‖² is the gap
    let change = zeros(m, n)
    record(change)
    for (let t = 0; t < steps; t++) {
      change = change.map((row, i) => row.map((x, j) => x - rate * (x - needed[i][j])))
      record(change)
    }
    return { changes, missed, params: fullParams(m, n) }
  }

  const random = seeded(seed)
  let B = zeros(m, r)
  let A: Matrix =
    start === 'Both at zero' ? zeros(r, n) : Array.from({ length: r }, () => Array.from({ length: n }, () => SPREAD * gaussian(random)))
  record(multiply(B, A))
  for (let t = 0; t < steps; t++) {
    const gap = subtract(multiply(B, A), needed)
    // The gradients: B's push is the gap times A, A's is B times the gap, so
    // each factor moves only as far as the other lets it
    const gradB = multiply(gap, transpose(A))
    const gradA = multiply(transpose(B), gap)
    B = B.map((row, i) => row.map((x, k) => x - rate * gradB[i][k]))
    A = A.map((row, k) => row.map((x, j) => x - rate * gradA[k][j]))
    record(multiply(B, A))
  }
  return { changes, missed, params: loraParams(m, n, r) }
}

// Every run the lab can show, worked out once
const runs = new Map<string, Run>()
export function labRun(method: Method, start: Start): Run {
  const key = `${method} ${start}`
  let found = runs.get(key)
  if (!found) {
    found = train(NEEDED, method, start)
    runs.set(key, found)
  }
  return found
}

// The numbers the page tells about the lab
export const LAB = {
  cells: fullParams(N, N),
  rankOneFloor: bestMissed(STRENGTHS, 1),
  rankTwoParams: loraParams(N, N, 2),
}

// "0.39%" for 0.0039; "3.1%" for 0.031
export const percent = (share: number) => {
  const p = share * 100
  return `${p < 1 ? p.toFixed(2) : p < 10 ? p.toFixed(1) : Math.round(p)}%`
}
export const thousands = (n: number) => n.toLocaleString('en-US')
