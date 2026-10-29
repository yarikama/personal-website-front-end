// Where each square of the board is drawn: five across and four up,
// winding from the bottom left

export const CELL = 64
const PAD = 10
const COLUMNS = 5
const ROWS = 4
export const WIDTH = PAD * 2 + COLUMNS * CELL
export const HEIGHT = PAD * 2 + ROWS * CELL

// Row by row from the bottom, left to right and back again
export function corner(square: number) {
  const index = square - 1
  const row = Math.floor(index / COLUMNS)
  const column = row % 2 === 0 ? index % COLUMNS : COLUMNS - 1 - (index % COLUMNS)
  return { x: PAD + column * CELL, y: PAD + (ROWS - 1 - row) * CELL }
}

export function centre(square: number) {
  const { x, y } = corner(square)
  return { x: x + CELL / 2, y: y + CELL / 2 }
}
