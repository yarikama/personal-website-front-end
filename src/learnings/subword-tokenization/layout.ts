import { gluedAt, type Merge } from './model'

// Where the figures put each piece: sizes in viewBox units, so the drawings
// only place what this works out

// A narrow drawing, so its letters stay large on a phone
export const WIDTH = 380

export interface Size {
  font: number
  char: number
  pad: number
  gap: number
  height: number
}

// Overpass Mono advances about 0.6 em a character
export const SMALL: Size = { font: 13, char: 13 * 0.62, pad: 4, gap: 3, height: 20 }
export const BIG: Size = { font: 17, char: 17 * 0.62, pad: 6, gap: 5, height: 28 }

export const chipWidth = (piece: string, size: Size) => [...piece].length * size.char + 2 * size.pad

export interface Placed {
  piece: string
  x: number
  // The line it sits on, from 0
  line: number
}

// Pieces laid left to right from x = 0, onto a new line when one would pass
// `width`
export function flow(pieces: string[], size: Size, width: number): Placed[] {
  const placed: Placed[] = []
  let x = 0
  let line = 0
  for (const piece of pieces) {
    const w = chipWidth(piece, size)
    if (x > 0 && x + w > width) {
      x = 0
      line++
    }
    placed.push({ piece, x, line })
    x += w + size.gap
  }
  return placed
}

export const linesOf = (placed: Placed[]) => (placed.length ? placed[placed.length - 1].line + 1 : 1)

// The word list: two columns, a word to a row
export const COLUMNS = 2
export const COLUMN = (WIDTH - 12) / COLUMNS
export const ROW = 28
export const listHeight = (words: number) => Math.ceil(words / COLUMNS) * ROW - (ROW - SMALL.height)
export const listCell = (w: number, words: number) => {
  const rows = Math.ceil(words / COLUMNS)
  return { x: Math.floor(w / rows) * (COLUMN + 12), y: (w % rows) * ROW }
}

// How a piece is drawn: plain, about to be glued to its neighbour, or just
// made by a merge
export type Tone = 'plain' | 'glue' | 'fresh'

// Which tone each piece of a word gets: both halves wherever `glue` would
// glue them, and every piece equal to `fresh`
export function tones(pieces: string[], glue: Pick<Merge, 'left' | 'right'> | null, fresh: string | null): Tone[] {
  const lit = new Set<number>()
  if (glue) for (const i of gluedAt(pieces, glue)) lit.add(i).add(i + 1)
  return pieces.map((piece, i) => (lit.has(i) ? 'glue' : piece === fresh ? 'fresh' : 'plain'))
}
