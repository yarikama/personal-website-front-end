import { after, placeOf } from './model'

// Where things sit in the hill's drawing (Hill.tsx), for it and for the
// stories that move a walker over it

export const WIDTH = 560
export const HEIGHT = 380
const CENTRE = WIDTH / 2
const DX = 104
export const OFFICE = { x: CENTRE, y: 30 }
const ROW_Y = [86, 146, 206, 266]
const STALL_Y = 322

export type Point = { x: number; y: number }

export function forkPoint(fork: number): Point {
  const { row, k } = placeOf(fork)
  return { x: CENTRE + (k - row / 2) * DX, y: ROW_Y[row] }
}
export const stallPoint = (stall: number): Point => ({ x: CENTRE + (stall - 2) * DX, y: STALL_Y })

// Where a turn from `fork` ends up, as a point
export const endOf = (fork: number, turn: number): Point => {
  const there = after(fork, turn)
  return 'fork' in there ? forkPoint(there.fork) : stallPoint(there.stall)
}

// The walker's way: the office, the forks passed, the stall
export function wayOf(forks: number[], stall: number): Point[] {
  return [OFFICE, ...forks.map(forkPoint), stallPoint(stall)]
}

// The point `progress` (in legs, 0 to way.length − 1) along a way
export function along(way: Point[], progress: number): Point {
  const leg = Math.min(Math.floor(progress), way.length - 2)
  const t = Math.min(1, progress - leg)
  const a = way[leg]
  const b = way[leg + 1]
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}
