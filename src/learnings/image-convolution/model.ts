// Every number the image convolution page states, and the filtering itself.
// An image is a grid of numbers, row by row; a filter is a 3 by 3 grid of
// whole-number weights over a divisor, so every sum can be checked by hand.

export type Grid = number[][]

export interface Kernel {
  name: string
  weights: Grid
  divisor: number
  // Weights of both signs: the output says which way the picture changes
  signed: boolean
}

// What happens where the window falls off the picture: the fans on the edge
// sit out (the output shrinks), or every missing seat counts as a blank card
export type Border = 'Shrink' | 'Zeros'
export const BORDERS: readonly Border[] = ['Shrink', 'Zeros']

// The brightest card
export const SOLID = 9
// The largest an edge filter can answer on cards from 0 to 9: 1 + 2 + 1
// solid cards on one side, blanks on the other
export const STRONGEST_EDGE = 4 * SOLID

export const BOX: Kernel = {
  name: 'Box',
  weights: [
    [1, 1, 1],
    [1, 1, 1],
    [1, 1, 1],
  ],
  divisor: 9,
  signed: false,
}

export const GAUSSIAN: Kernel = {
  name: 'Gaussian',
  weights: [
    [1, 2, 1],
    [2, 4, 2],
    [1, 2, 1],
  ],
  divisor: 16,
  signed: false,
}

// Right column minus left column, the middle row counted twice: the Sobel
// filter for changes from left to right (laid on the image as it stands,
// with no flip, as neural networks do)
export const SOBEL_ACROSS: Kernel = {
  name: 'Edges ↔',
  weights: [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1],
  ],
  divisor: 1,
  signed: true,
}

// The same turned a quarter: bottom row minus top row
export const SOBEL_DOWN: Kernel = {
  name: 'Edges ↕',
  weights: [
    [-1, -2, -1],
    [0, 0, 0],
    [1, 2, 1],
  ],
  divisor: 1,
  signed: true,
}

export const KERNELS = [BOX, GAUSSIAN, SOBEL_ACROSS, SOBEL_DOWN] as const
export type KernelName = (typeof KERNELS)[number]['name']
export const KERNEL_NAMES = KERNELS.map((k) => k.name) as KernelName[]
export const kernelNamed = (name: KernelName) => KERNELS.find((k) => k.name === name) ?? BOX

const SIZE = 8
const blank = (rows = SIZE, cols = SIZE): Grid => Array.from({ length: rows }, () => Array<number>(cols).fill(0))

// The story's picture: a solid block, rows 1 to 6 and columns 2 to 5, on blank cards
export const BLOCK: Grid = blank().map((row, i) => row.map((_, j) => (i >= 1 && i <= 6 && j >= 2 && j <= 5 ? SOLID : 0)))

// A shorter block with a blank card in it by mistake, and two stray solid cards
export const SPECKLED: Grid = (() => {
  const g = blank().map((row, i) => row.map((_, j) => (i >= 2 && i <= 6 && j >= 1 && j <= 4 ? SOLID : 0)))
  g[4][2] = 0
  g[1][6] = SOLID
  g[6][6] = SOLID
  return g
})()

// A steady slope: each column one brighter than the last
export const RAMP: Grid = blank().map((row) => row.map((_, j) => j))

export const IMAGES = { Block: BLOCK, Speckled: SPECKLED, Ramp: RAMP } as const
export type ImageName = keyof typeof IMAGES
export const IMAGE_NAMES = Object.keys(IMAGES) as ImageName[]

// The pixel at (i, j), or a blank card off the picture
const at = (image: Grid, i: number, j: number) => image[i]?.[j] ?? 0

export interface Term {
  weight: number
  pixel: number
}

// The nine weight-and-pixel pairs under the window centred on (i, j), row by row
export function terms(image: Grid, kernel: Kernel, i: number, j: number): Term[] {
  const out: Term[] = []
  for (let u = -1; u <= 1; u++) for (let v = -1; v <= 1; v++) out.push({ weight: kernel.weights[u + 1][v + 1], pixel: at(image, i + u, j + v) })
  return out
}

// The filter's answer at (i, j): the weighted sum over the window, over the divisor
export function valueAt(image: Grid, kernel: Kernel, i: number, j: number): number {
  return terms(image, kernel, i, j).reduce((sum, t) => sum + t.weight * t.pixel, 0) / kernel.divisor
}

// Where the window's centre may sit: every pixel with zeros around the
// picture, only those a whole window fits round when the fans sit out
export function centres(image: Grid, border: Border): { first: number; lastRow: number; lastCol: number } {
  const margin = border === 'Shrink' ? 1 : 0
  return { first: margin, lastRow: image.length - 1 - margin, lastCol: image[0].length - 1 - margin }
}

// The filtered picture. Shrink: (n − k + 1) by (n − k + 1); zeros: the same size
export function convolve(image: Grid, kernel: Kernel, border: Border): Grid {
  const { first, lastRow, lastCol } = centres(image, border)
  const out: Grid = []
  for (let i = first; i <= lastRow; i++) {
    const row: number[] = []
    for (let j = first; j <= lastCol; j++) row.push(valueAt(image, kernel, i, j))
    out.push(row)
  }
  return out
}

// How wide the output is: an n-wide picture, a k-wide filter, p blank cards
// added on each side, the window moved s pixels at a time
export const outputSize = (n: number, k: number, pad = 0, stride = 1) => Math.floor((n + 2 * pad - k) / stride) + 1

// The order the window visits the picture in: row by row
export function sweep(image: Grid, border: Border): [number, number][] {
  const { first, lastRow, lastCol } = centres(image, border)
  const spots: [number, number][] = []
  for (let i = first; i <= lastRow; i++) for (let j = first; j <= lastCol; j++) spots.push([i, j])
  return spots
}

// A number as the page prints it: whole when it is, else to two places
export const show = (value: number) => {
  const v = Math.abs(value) < 1e-9 ? 0 : value
  return Number.isInteger(v) ? String(v).replace('-', '−') : v.toFixed(2).replace('-', '−')
}

// The story's numbers, read off its picture
export const STORY_ROW = 3
// The blur across row 3, from the column left of the block inwards: 3, 6, 9
export const BLUR_RAMP = [1, 2, 3].map((j) => valueAt(BLOCK, BOX, STORY_ROW, j))
// The edge filter across row 3, every column a whole window fits: 36, 36, 0, 0, −36, −36
export const EDGE_ROW = [1, 2, 3, 4, 5, 6].map((j) => valueAt(BLOCK, SOBEL_ACROSS, STORY_ROW, j))
export const EDGE_SIDE = valueAt(BLOCK, SOBEL_ACROSS, STORY_ROW, 2)
export const EDGE_INSIDE = valueAt(BLOCK, SOBEL_ACROSS, STORY_ROW, 3)
// Along the block's top, the edge filter answers nothing: nothing changes from left to right there
export const EDGE_TOP = valueAt(BLOCK, SOBEL_ACROSS, 1, 3)
export const STORY_SIDE = BLOCK.length
export const STORY_SHRUNK = outputSize(STORY_SIDE, 3)

// The worked numbers: the blur on the block's side (3 solid cards of 9),
// the edge filter on the side, and inside the block
export const WORKED = {
  blur: { at: [STORY_ROW, 1] as const, solid: terms(BLOCK, BOX, STORY_ROW, 1).filter((t) => t.pixel > 0).length, value: BLUR_RAMP[0] },
  side: { at: [STORY_ROW, 2] as const, value: EDGE_SIDE },
  inside: { at: [STORY_ROW, 3] as const, value: EDGE_INSIDE },
}

// A colour photo: three grids, red, green and blue
export const CHANNELS = 3
export const PHOTO_SIDE = 224
export const PHOTO_NUMBERS = CHANNELS * PHOTO_SIDE * PHOTO_SIDE

// Sizes the page names: a 32-pixel picture under a 5-wide filter, and with a stride of 2
export const SIZES = {
  shrink: outputSize(32, 5),
  padded: outputSize(32, 5, 2),
  strided: outputSize(32, 5, 2, 2),
}

// The quick check: what each kind of filter makes of a flat wall of 5s
export const WALL = 5
const wall: Grid = blank(3, 3).map((row) => row.map(() => WALL))
export const ON_WALL = {
  box: valueAt(wall, BOX, 1, 1),
  edge: valueAt(wall, SOBEL_ACROSS, 1, 1),
  ones: valueAt(wall, { ...BOX, divisor: 1 }, 1, 1),
}

// Check yourself: a level horizon, bright sky over a darker sea
export const HORIZON: Grid = blank().map((row, i) => row.map(() => (i < 4 ? SOLID : 2)))
export const HORIZON_ACROSS = convolve(HORIZON, SOBEL_ACROSS, 'Shrink')
export const HORIZON_DOWN = convolve(HORIZON, SOBEL_DOWN, 'Shrink')

// A difference of neighbours is a slope: on a row of squares, 1, 4, 9, 16, 25,
// the central difference (right minus left) gives 8, 12, 16, twice the slope 2x
export const SQUARES = [1, 4, 9, 16, 25]
export const SQUARE_DIFFERENCES = SQUARES.slice(1, -1).map((_, i) => SQUARES[i + 2] - SQUARES[i])

// The ramp's slope is 1 a column, and the edge filter reads 4 × 2 × 1 = 8 on it everywhere
export const RAMP_EDGE = valueAt(RAMP, SOBEL_ACROSS, 3, 3)
// At the ramp's right border, zeros invent an edge that is not there
export const RAMP_BORDER_EDGE = valueAt(RAMP, SOBEL_ACROSS, 3, 7)

// The window's sum as arithmetic a reader can redo: the pixels under the
// positive weights, minus those under the negative ones (a weight of 2 as
// "2×"), over the divisor, and the answer
export function sumText(kernel: Kernel, under: Term[]): string {
  const side = (ts: Term[]) => ts.map((t) => (Math.abs(t.weight) === 1 ? show(t.pixel) : `${Math.abs(t.weight)}×${show(t.pixel)}`)).join(' + ')
  const plus = under.filter((t) => t.weight > 0)
  const minus = under.filter((t) => t.weight < 0)
  const value = show(under.reduce((s, t) => s + t.weight * t.pixel, 0) / kernel.divisor)
  const top = minus.length ? `(${side(plus)}) − (${side(minus)})` : kernel.divisor === 1 ? side(plus) : `(${side(plus)})`
  return kernel.divisor === 1 ? `${top} = ${value}` : `${top} ÷ ${kernel.divisor} = ${value}`
}

// Keep the window's centre where the border allows it
export function clampWindow(image: Grid, border: Border, [i, j]: [number, number]): [number, number] {
  const { first, lastRow, lastCol } = centres(image, border)
  return [Math.min(lastRow, Math.max(first, i)), Math.min(lastCol, Math.max(first, j))]
}
