import type { Vec } from './model'

// The chart every figure on the page draws on: a square from −RANGE to
// RANGE each way, with the middle (a usual avocado, the origin) at its
// centre, and room above and below for the axes' names
export const WIDTH = 420
export const HEIGHT = 452
export const SQUARE = { left: 10, top: 30, size: 400 }
export const RANGE = 1.5

export const sx = (v: number) => SQUARE.left + ((v + RANGE) / (2 * RANGE)) * SQUARE.size
export const sy = (v: number) => SQUARE.top + ((RANGE - v) / (2 * RANGE)) * SQUARE.size
export const screen = (v: Vec): [number, number] => [sx(v[0]), sy(v[1])]
export const MIDDLE = screen([0, 0])

