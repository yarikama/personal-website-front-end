import { SQUARES } from './board'

// Where the board's squares sit in its drawing: five rows of six that wind
// up from the bottom left, as on a real board

export const COLUMNS = 6
export const ROWS = SQUARES / COLUMNS
export const CELL = 58
export const PAD = 6
export const WIDTH = PAD * 2 + COLUMNS * CELL
export const HEIGHT = PAD * 2 + ROWS * CELL

// The top-left corner of a square's cell: rows go left to right, then
// right to left, from the bottom up
export function corner(sq: number) {
  const row = Math.floor((sq - 1) / COLUMNS)
  const along = (sq - 1) % COLUMNS
  const column = row % 2 === 0 ? along : COLUMNS - 1 - along
  return { x: PAD + column * CELL, y: PAD + (ROWS - 1 - row) * CELL }
}

export const centre = (sq: number) => {
  const { x, y } = corner(sq)
  return { x: x + CELL / 2, y: y + CELL / 2 }
}
