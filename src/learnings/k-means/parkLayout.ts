import { PARK } from './model'

// Where the park sits in a drawing: 560 wide, a margin all round
export const WIDTH = 560
const MARGIN = 20
export const UNIT = (WIDTH - 2 * MARGIN) / PARK.width
export const HEIGHT = PARK.height * UNIT + 2 * MARGIN

export const sx = (x: number) => MARGIN + x * UNIT
export const sy = (y: number) => MARGIN + (PARK.height - y) * UNIT
