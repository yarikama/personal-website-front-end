// Where a row of word tiles goes: each tile as wide as its text, flowing
// onto a new line when the drawing's width runs out.

// The drawings are narrow, so a phone shows them near full size
export const WIDTH = 360
export const MARGIN = 8
export const SIZE = 13
// Monospace, so a word's width is its letters'
export const CHAR = SIZE * 0.6
export const PAD_X = 6
export const TILE_H = 24
export const GAP = 6
export const LINE = TILE_H + 10
// Room for a note under each tile
export const LOOSE = LINE + 14

export interface Place {
  x: number
  y: number
  w: number
  line: number
}

export const tileWidth = (text: string) => Math.max(text.length, 1) * CHAR + PAD_X * 2

// The places of tiles with these texts, from (MARGIN, top), wrapping at the
// drawing's width, `line` apart
export function flow(texts: string[], top: number, line = LINE): Place[] {
  const places: Place[] = []
  let x = MARGIN
  let row = 0
  for (const text of texts) {
    const w = tileWidth(text)
    if (x > MARGIN && x + w > WIDTH - MARGIN) {
      x = MARGIN
      row += 1
    }
    places.push({ x, y: top + row * line, w, line: row })
    x += w + GAP
  }
  return places
}

// How far down the tiles reach
export const bottomOf = (places: Place[]) => (places.length ? Math.max(...places.map((p) => p.y)) + TILE_H : 0)
