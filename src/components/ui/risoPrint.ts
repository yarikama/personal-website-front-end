// The Lab Notes print's geometry and its screening, kept free of React so it
// can be tested: a 4 × 3 grid of rounded squares in two inks, laid out on a
// 400 × 320 sheet, and the halftone that turns each ink's coverage into dots.

export const SHEET = { w: 400, h: 320 }

export type Tile = { x: number; y: number; size: number; ink: 'a' | 'b'; cover: number }

// How much ink each square takes, row by row: uneven on purpose, as a print run is
const COVER = [1, 0.45, 0.7, 0.25, 0.55, 1, 0.35, 0.8, 0.6, 0.3, 1, 0.5]
const SIZE = 60, STEP = 72, X0 = 60, Y0 = 54

/** The twelve squares; the two inks alternate like a chequerboard. */
export const TILES: Tile[] = COVER.map((cover, k) => {
  const i = k % 4, j = Math.floor(k / 4)
  return { x: X0 + i * STEP, y: Y0 + j * STEP, size: SIZE, ink: (i + j) % 2 ? 'a' : 'b', cover }
})

// Each ink's screen angle, and how far the second ink lands off register, in sheet units
export const ANGLE = { a: (15 * Math.PI) / 180, b: (75 * Math.PI) / 180 }
export const OFFSET = { x: 5, y: 4 }

/** A small seeded random, so the grain is the same every time the print is drawn. */
export function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Screens a coverage mask (its alpha channel, `width` × `height`) into dots at
 * `angle`, `pitch` pixels apart: each dot's area follows the coverage under
 * its centre. Returns [x, y, r] for every dot.
 */
export function screen(alpha: Uint8ClampedArray, width: number, height: number, angle: number, pitch: number): [number, number, number][] {
  const dots: [number, number, number][] = []
  const ca = Math.cos(angle), sa = Math.sin(angle), R = Math.hypot(width, height) / 2 + pitch
  for (let v = -R; v < R; v += pitch) for (let u = -R; u < R; u += pitch) {
    const x = u * ca - v * sa + width / 2, y = u * sa + v * ca + height / 2
    if (x < 0 || y < 0 || x >= width || y >= height) continue
    const cover = alpha[((y | 0) * width + (x | 0)) * 4 + 3] / 255
    if (cover < 0.04) continue
    dots.push([x, y, pitch * 0.64 * Math.sqrt(cover)])
  }
  return dots
}
