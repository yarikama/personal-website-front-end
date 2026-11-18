// The Vision Transformer's front end, worked out on a toy picture: cut it into
// patches, unroll each patch, project it to a token. Every number the page
// states comes from here, and the figures only draw it.

// --- The story's picture: a house, 12 squares by 12 -------------------------

// Each square from 0 (empty) to 1 (solid): a sun in the top-left corner, a
// roof, walls with a window and a door, and the ground
const S = 0.5 // sun
const W = 0.3 // wall
const G = 0.7 // window
const D = 1 // door, roof and the walls' edges
const L = 0.6 // ground
export const PICTURE: number[][] = [
  [S, S, 0, 0, 0, D, D, 0, 0, 0, 0, 0],
  [S, S, 0, 0, D, D, D, D, 0, 0, 0, 0],
  [0, 0, 0, D, D, D, D, D, D, 0, 0, 0],
  [0, 0, D, D, D, D, D, D, D, D, 0, 0],
  [0, D, D, D, D, D, D, D, D, D, D, 0],
  [0, 0, D, W, W, W, W, W, W, D, 0, 0],
  [0, 0, D, G, G, W, W, W, W, D, 0, 0],
  [0, 0, D, G, G, W, W, W, W, D, 0, 0],
  [0, 0, D, W, W, W, D, D, W, D, 0, 0],
  [0, 0, D, W, W, W, D, D, W, D, 0, 0],
  [0, 0, D, W, W, W, D, D, W, D, 0, 0],
  [L, L, L, L, L, L, L, L, L, L, L, L],
]
export const SIDE = PICTURE.length
// The patch side, and how many patches fit across
export const TILE = 4
export const ACROSS = SIDE / TILE

// Cut an image (rows of numbers) into p × p patches, in reading order, each
// unrolled into one row of p² numbers, its top line first
export function patchify(image: readonly (readonly number[])[], p: number): number[][] {
  const rows = image.length
  const cols = image[0].length
  if (rows % p || cols % p) throw new Error(`a ${rows} × ${cols} image does not cut into ${p} × ${p} patches`)
  const out: number[][] = []
  for (let top = 0; top < rows; top += p)
    for (let left = 0; left < cols; left += p) {
      const strip: number[] = []
      for (let r = 0; r < p; r++) for (let c = 0; c < p; c++) strip.push(image[top + r][left + c])
      out.push(strip)
    }
  return out
}

// Put the patches back together: patchify, undone
export function unpatchify(patches: readonly (readonly number[])[], p: number, across: number): number[][] {
  const down = patches.length / across
  const image = Array.from({ length: down * p }, () => new Array<number>(across * p).fill(0))
  patches.forEach((strip, k) => {
    const top = Math.floor(k / across) * p
    const left = (k % across) * p
    strip.forEach((v, m) => (image[top + Math.floor(m / p)][left + (m % p)] = v))
  })
  return image
}

// Where square m of an unrolled p × p patch sat in it
export const inPatch = (m: number, p: number) => ({ row: Math.floor(m / p), col: m % p })

// --- The three questions: a linear projection --------------------------------

// The same three questions put to every unrolled patch: how much ink in all,
// in its top half, in its left half. Each answer is a weighted sum of the 16
// numbers, so the three together are one 16 × 3 matrix, E.
export const QUESTIONS = ['all', 'top half', 'left half'] as const
const n = TILE * TILE
export const E: number[][] = Array.from({ length: n }, (_, m) => {
  const { row, col } = inPatch(m, TILE)
  return [1 / n, row < TILE / 2 ? 2 / n : 0, col < TILE / 2 ? 2 / n : 0]
})

// A row of numbers times a matrix
export const project = (strip: readonly number[], e: readonly (readonly number[])[]) =>
  e[0].map((_, d) => strip.reduce((sum, x, m) => sum + x * e[m][d], 0))

export const STRIPS = patchify(PICTURE, TILE)
export const CARDS = STRIPS.map((strip) => project(strip, E))

// The tile the story reads out: the door, tile 8
export const DOOR = 7

// "0.45"
export const two = (x: number) => x.toFixed(2)

// --- Counting tokens ---------------------------------------------------------

// Patches across times patches down, for a square image `side` pixels wide
export function patchCount(side: number, patch: number): number {
  if (side % patch) throw new Error(`${side} pixels do not cut into ${patch}-pixel patches`)
  return (side / patch) ** 2
}
// What the encoder reads: the patches and one [class] token
export const tokenCount = (side: number, patch: number) => patchCount(side, patch) + 1
// Numbers in one unrolled patch of a colour picture
export const CHANNELS = 3
export const patchNumbers = (patch: number) => patch * patch * CHANNELS
// Attention scores every token against every token, in each head of each block
export const scoreCount = (side: number, patch: number) => tokenCount(side, patch) ** 2

// The worked numbers: ViT-B/16 at its training size, at the paper's
// fine-tuning size, and with 14-pixel patches
export const WORKED = [
  { side: 224, patch: 16 },
  { side: 384, patch: 16 },
  { side: 224, patch: 14 },
] as const

// The lab's settings
export const SIDES = [224, 448] as const
export const PATCHES = [8, 14, 16, 32] as const
export const BASE = { side: 224, patch: 16 } as const

// --- How much data: the paper's Table 5 --------------------------------------

// Top-1 accuracy (%) on ImageNet after fine-tuning, by the set a ViT was
// pre-trained on (Dosovitskiy et al., 2021, Table 5; fine-tuned at 384 pixels)
export const SETS = [
  { name: 'ImageNet', images: '1.3M' },
  { name: 'ImageNet-21k', images: '14M' },
  { name: 'JFT-300M', images: '303M' },
] as const
export const MODELS = [
  { name: 'ViT-B/16', weights: '86M', accuracy: [77.91, 83.97, 84.15] },
  { name: 'ViT-L/16', weights: '307M', accuracy: [76.53, 85.15, 87.12] },
] as const

// The ablation in the paper's Table 8: ViT-B/16, ImageNet 5-shot linear
// accuracy with no position embeddings and with the default learned ones
export const NO_POSITIONS = 61.4
export const POSITIONS = 64.2
