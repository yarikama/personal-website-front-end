import { seeded } from '../../components/explain/random'
import { both, solve, SPOTS, state, sweeps } from '../../components/explain/ladders'

// Asynchronous dynamic programming: back up one state at a time, in place,
// in any order, with whatever values the others hold. Two worlds show it.
// On the board, squares picked at random still end on the best play's
// values. In a city far bigger than the board, a walker backs up only the
// corners it stands on, and the work follows the trip, not the city.

// ——— On the board: one square at a time ———

export const THETA = 0.001

// Value iteration, as on the last page: sweeps of every square until the
// biggest change is under θ
export const PASSES = sweeps('best', THETA)
export const VI_SWEEPS = PASSES.length - 1

// The best play's values, to far more places than any figure shows
const truth = () => solve('best')

// How far a set of values is from the best play's, on the square furthest off
export const furthest = (values: number[]) =>
  Math.max(...SPOTS.map((sq) => Math.abs(values[state(sq)] - truth()[state(sq)])))

// Backups until every square is within θ of its true value, sweeping every
// square each time: as two copies (value iteration) or in place from the
// finish down
export function sweptBackups(order: 'copies' | 'down'): number {
  const passes = sweeps('best', 0, order, undefined, 200)
  return passes.findIndex((pass) => furthest(pass.values) < THETA) * SPOTS.length
}

export interface Backup {
  square: number
  // Every square's value just after it
  values: number[]
}

// Squares picked at random, any square any time, each given −1 plus its
// better move in place, until every square is within θ of its true value.
// The first entry is the start, all zeros (its square is 0).
export const JUMBLE_SEED = 4

export function jumbled(seed = JUMBLE_SEED, theta = THETA, most = 50_000): Backup[] {
  const random = seeded(seed)
  let values = truth().map(() => 0)
  const backups: Backup[] = [{ square: 0, values }]
  while (backups.length <= most && furthest(values) >= theta) {
    const sq = SPOTS[Math.floor(random() * SPOTS.length)]
    values = [...values]
    values[state(sq)] = Math.max(...both(values, sq))
    backups.push({ square: sq, values })
  }
  return backups
}

let jumble: Backup[] | null = null
export const JUMBLE = () => (jumble ??= jumbled())

// How many times each square was backed up in the first `upto` backups
export function counts(backups: Backup[], upto: number): Map<number, number> {
  const seen = new Map<number, number>(SPOTS.map((sq) => [sq, 0]))
  for (const { square } of backups.slice(1, upto + 1)) seen.set(square, (seen.get(square) ?? 0) + 1)
  return seen
}

// ——— The city ———

// A grid of street corners, `size` by `size`, cut down the middle by a river
// that you can cross only at a bridge, one every 25 blocks. You walk from a
// hotel west of the river to a station east of it; each block costs a turn,
// so a corner's value is minus the blocks still to walk. A move goes where
// it says: one landing, for sure.
export interface City {
  size: number
  river: number
  hotel: number
  station: number
  // Whether a row has a bridge
  bridge: (row: number) => boolean
  // The corners each corner's moves lead to (none into the river or off the map)
  moves: number[][]
  // The corners you choose a move from: all but the river's and the station
  corners: number[]
  // The blocks from each corner to the station by the shortest way
  blocks: Int32Array
  x: (corner: number) => number
  y: (corner: number) => number
}

export const SIZE = 100
export const BRIDGE_GAP = 25

const bridgeIn = (size: number) => (row: number) =>
  (((row - (size / 2 - 10)) % BRIDGE_GAP) + BRIDGE_GAP) % BRIDGE_GAP === 0

export function makeCity(size = SIZE): City {
  const river = size / 2
  const middle = size / 2
  const at = (x: number, y: number) => y * size + x
  const x = (corner: number) => corner % size
  const y = (corner: number) => Math.floor(corner / size)
  const bridge = bridgeIn(size)
  const wet = (cx: number, cy: number) => cx === river && !bridge(cy)
  const hotel = at(river - 20, middle + 6)
  const station = at(river + 22, middle - 4)
  const moves: number[][] = []
  for (let corner = 0; corner < size * size; corner++) {
    const cx = x(corner)
    const cy = y(corner)
    const out: number[] = []
    if (!wet(cx, cy) && corner !== station) {
      for (const [dx, dy] of [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0],
      ]) {
        const nx = cx + dx
        const ny = cy + dy
        if (nx < 0 || ny < 0 || nx >= size || ny >= size || wet(nx, ny)) continue
        out.push(at(nx, ny))
      }
    }
    moves.push(out)
  }
  const corners = moves.flatMap((out, corner) => (out.length > 0 ? [corner] : []))

  // The true blocks to the station, outward from it
  const blocks = new Int32Array(size * size).fill(-1)
  blocks[station] = 0
  const queue = [station]
  for (let i = 0; i < queue.length; i++) {
    const here = queue[i]
    for (const there of [here - size, here + 1, here + size, here - 1]) {
      if (there < 0 || there >= size * size) continue
      if (Math.abs(x(there) - x(here)) + Math.abs(y(there) - y(here)) !== 1) continue
      if (blocks[there] >= 0 || !moves[there].includes(here)) continue
      blocks[there] = blocks[here] + 1
      queue.push(there)
    }
  }
  return { size, river, hotel, station, bridge, moves, corners, blocks, x, y }
}

// The corners you choose a move from in a city `size` by `size`, counted
// rather than built: every corner but the river's and the station
export function cornersOf(size: number): number {
  const bridge = bridgeIn(size)
  let bridges = 0
  for (let row = 0; row < size; row++) if (bridge(row)) bridges++
  return size * size - (size - bridges) - 1
}

let city: City | null = null
export const CITY = () => (city ??= makeCity())

// The starting guess: minus the blocks to the station as if there were no
// river. Never gloomier than the truth, since the river only adds blocks.
export const guess = (c: City, corner: number) =>
  corner === c.station ? 0 : -(Math.abs(c.x(corner) - c.x(c.station)) + Math.abs(c.y(corner) - c.y(c.station)))

export const startingValues = (c: City) => Float64Array.from({ length: c.size * c.size }, (_, corner) => guess(c, corner))

// One corner's backup: −1 for the block plus the best of where its moves land
export const backup = (c: City, values: ArrayLike<number>, corner: number) => {
  let top = -Infinity
  for (const there of c.moves[corner]) top = Math.max(top, -1 + values[there])
  return top
}

// Does every route the numbers allow from the hotel (better moves, either
// way at a tie) take the shortest way? Neither planner could know this
// moment; stopping each there is fair to both.
export function routeRight(c: City, values: ArrayLike<number>): boolean {
  const seen = new Set([c.hotel])
  const queue = [c.hotel]
  for (let i = 0; i < queue.length; i++) {
    const here = queue[i]
    if (here === c.station) continue
    const top = backup(c, values, here)
    for (const there of c.moves[here]) {
      if (Math.abs(-1 + values[there] - top) > 1e-9) continue
      if (c.blocks[there] !== c.blocks[here] - 1) return false
      if (!seen.has(there)) {
        seen.add(there)
        queue.push(there)
      }
    }
  }
  return true
}

export interface Walk {
  // The corners walked through, from the hotel to the station; every one
  // but the station was backed up as you stood on it
  path: number[]
  // The backups this walk made that changed a value: the corner and its
  // new value
  writes: [number, number][]
}

export interface Walking {
  walks: Walk[]
  // The walk on which each corner was first backed up (0: never)
  first: Int32Array
}

// Real-time dynamic programming: walk from the hotel, and at every corner
// back it up, then take the move its numbers favour, a coin deciding ties.
// Walk again and again, until every route the numbers allow from the hotel
// is a shortest one, and the walk that showed it was one too.
export const WALK_SEED = 1

export function walking(c: City = CITY(), seed = WALK_SEED, most = 2000): Walking {
  const random = seeded(seed)
  const values = startingValues(c)
  const first = new Int32Array(c.size * c.size)
  const walks: Walk[] = []
  for (let n = 1; n <= most; n++) {
    const path = [c.hotel]
    const writes: [number, number][] = []
    let here = c.hotel
    while (here !== c.station && path.length < 100_000) {
      const value = backup(c, values, here)
      if (Math.abs(value - values[here]) > 1e-9) writes.push([here, value])
      values[here] = value
      if (first[here] === 0) first[here] = n
      let top = -Infinity
      let ties: number[] = []
      for (const there of c.moves[here]) {
        const worth = -1 + values[there]
        if (worth > top + 1e-9) {
          top = worth
          ties = [there]
        } else if (Math.abs(worth - top) <= 1e-9) ties.push(there)
      }
      here = ties[Math.floor(random() * ties.length)]
      path.push(here)
    }
    walks.push({ path, writes })
    if (path.length - 1 === c.blocks[c.hotel] && routeRight(c, values)) break
  }
  return { walks, first }
}

let walked: Walking | null = null
export const WALKING = () => (walked ??= walking())

// Blocks walked, which is also backups made
export const blocksOf = (walk: Walk) => walk.path.length - 1

// The corners backed up in the first `n` walks
export const touchedBy = (n: number, run: Walking = WALKING()) =>
  run.first.reduce((sum, walk) => sum + (walk > 0 && walk <= n ? 1 : 0), 0)

// Backups made in the first `n` walks: one per block walked
export const backupsBy = (n: number, run: Walking = WALKING()) =>
  run.walks.slice(0, n).reduce((sum, walk) => sum + blocksOf(walk), 0)

// Every corner's value after `n` walks (0: the guess). Kept from the last
// call and carried forward, as a figure asks for walk after walk.
let kept: { run: Walking; n: number; values: Float64Array } | null = null
export function valuesAfter(n: number, run: Walking = WALKING(), c: City = CITY()): Float64Array {
  if (!kept || kept.run !== run || kept.n > n) kept = { run, n: 0, values: startingValues(c) }
  for (const walk of run.walks.slice(kept.n, n)) for (const [corner, value] of walk.writes) kept.values[corner] = value
  kept.n = Math.max(kept.n, Math.min(n, run.walks.length))
  return kept.values
}

// The first backup the first walk made beside the river, and what it saw:
// the corner, its guess, the best of its moves' landings, its new value
export function firstBump(run: Walking = WALKING(), c: City = CITY()) {
  const values = startingValues(c)
  for (const [corner, value] of run.walks[0].writes) {
    if (c.x(corner) === c.river - 1 && !c.bridge(c.y(corner))) {
      return { corner, guess: values[corner], landing: value + 1, value }
    }
    values[corner] = value
  }
  return null
}

// ——— Value iteration in the city, from the same guess ———

export interface Sweeping {
  // Sweeps until every route from the hotel is right, and the backups they made
  sweeps: number
  backups: number
}

// Value iteration from the guess, two copies: sweeps of every corner until
// every route the numbers allow from the hotel is a shortest one
export function sweepCity(c: City = CITY(), most = 500): Sweeping {
  let values = startingValues(c)
  for (let n = 1; n <= most; n++) {
    const next = Float64Array.from(values)
    for (const corner of c.corners) next[corner] = backup(c, values, corner)
    values = next
    if (routeRight(c, values)) return { sweeps: n, backups: n * c.corners.length }
  }
  return { sweeps: Infinity, backups: Infinity }
}

let swept: Sweeping | null = null
export const SWEEPING = () => (swept ??= sweepCity())
