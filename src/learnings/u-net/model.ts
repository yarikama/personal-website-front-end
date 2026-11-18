// The numbers behind the U-Net page: a 16×16 picture of a chair, what is
// left of it after shrinking, and what comes back when the map is grown
// again, with and without the fine detail copied across.

// A picture or a map: rows of numbers, top row first
export type Grid = number[][]

export const SIZE = 16

// Draws a picture from rows of characters: '#' is ink, anything else empty
const draw = (rows: string[]): Grid => rows.map((row) => [...row].map((c) => (c === '#' ? 1 : 0)))

// A chair seen from the side (back on the right, legs one pixel thin) and a
// picture frame on the wall, drawn in the same ink. Neither the photo's
// pixels nor a pixel's close neighbours can tell the two apart; only a view
// of the whole shape can.
export const CHAIR = draw([
  '................',
  '................',
  '............##..',
  '............##..',
  '............##..',
  '............##..',
  '............##..',
  '............##..',
  '.......#######..',
  '.......#######..',
  '.......#....#...',
  '.......#....#...',
  '.......#....#...',
  '.......#....#...',
  '.......#....#...',
  '................',
])

export const FRAME = draw([
  '................',
  '................',
  '.#####..........',
  '.#...#..........',
  '.#...#..........',
  '.#...#..........',
  '.#####..........',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
])

// The photo: chair and frame alike, one ink
export const PHOTO: Grid = CHAIR.map((row, r) => row.map((v, c) => Math.max(v, FRAME[r][c])))

// The chair's legs: the thin part below the seat
export const LEGS: Grid = CHAIR.map((row, r) => row.map((v) => (r >= 10 ? v : 0)))

const count = (grid: Grid) => grid.flat().reduce((a, b) => a + b, 0)
export const CHAIR_PIXELS = count(CHAIR)
export const LEG_PIXELS = count(LEGS)

// Shrink by averaging each k×k block (k divides the side)
export function pool(grid: Grid, k: number): Grid {
  const size = grid.length / k
  return Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => {
      let sum = 0
      for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) sum += grid[r * k + i][c * k + j]
      return sum / (k * k)
    }),
  )
}

// Grow 2× by copying each value into a 2×2 block
export function upCopy(grid: Grid): Grid {
  return Array.from({ length: grid.length * 2 }, (_, r) =>
    Array.from({ length: grid[0].length * 2 }, (_, c) => grid[r >> 1][c >> 1]),
  )
}

// The weights of a 2× bilinear up-sampling: each new pixel sits a quarter of
// the way from its nearest old pixel toward the next one, across and down,
// so it takes 3/4 of the near one and 1/4 of the far one in each direction
export const NEAR = 3 / 4
export const FAR = 1 / 4
export const WEIGHTS = [NEAR * NEAR, NEAR * FAR, FAR * NEAR, FAR * FAR] as const

const clamp = (i: number, n: number) => Math.max(0, Math.min(n - 1, i))

// Grow 2× by bilinear interpolation (pixel centres lined up, as PyTorch's
// default does; past the border the edge value repeats). New pixel (r, c)
// has its nearest old pixel at (r >> 1, c >> 1) and its far neighbours one
// step toward whichever side it sits on.
export function upBilinear(grid: Grid): Grid {
  const h = grid.length
  const w = grid[0].length
  return Array.from({ length: h * 2 }, (_, r) =>
    Array.from({ length: w * 2 }, (_, c) => {
      const r0 = r >> 1
      const c0 = c >> 1
      const r1 = clamp(r0 + (r % 2 === 0 ? -1 : 1), h)
      const c1 = clamp(c0 + (c % 2 === 0 ? -1 : 1), w)
      const [nn, nf, fn, ff] = WEIGHTS
      return nn * grid[r0][c0] + nf * grid[r0][c1] + fn * grid[r1][c0] + ff * grid[r1][c1]
    }),
  )
}

// Bilinear interpolation to any size, the general way: map each output
// pixel's centre back into the input, clamp to the input's edge, and mix the
// four pixels around it by how close it is to each. The reference the 2×
// rule is tested against.
export function resizeBilinear(grid: Grid, outH: number, outW: number): Grid {
  const h = grid.length
  const w = grid[0].length
  const source = (i: number, from: number, to: number) => Math.max(0, ((i + 0.5) * from) / to - 0.5)
  return Array.from({ length: outH }, (_, r) =>
    Array.from({ length: outW }, (_, c) => {
      const y = source(r, h, outH)
      const x = source(c, w, outW)
      const y0 = Math.min(Math.floor(y), h - 1)
      const x0 = Math.min(Math.floor(x), w - 1)
      const y1 = Math.min(y0 + 1, h - 1)
      const x1 = Math.min(x0 + 1, w - 1)
      const a = y - y0
      const b = x - x0
      return (
        (1 - a) * (1 - b) * grid[y0][x0] + (1 - a) * b * grid[y0][x1] + a * (1 - b) * grid[y1][x0] + a * b * grid[y1][x1]
      )
    }),
  )
}

export type Grow = 'Copy' | 'Bilinear'
export const GROWS: readonly Grow[] = ['Copy', 'Bilinear']

// How many times the picture is halved on the way down: 16 → 8 → 4 → 2
export const DEPTHS = [1, 2, 3] as const
export type Depth = (typeof DEPTHS)[number]
export const side = (depth: number) => SIZE >> depth

// What the deep end knows: which blocks have any chair in them. Seeing a
// whole block at once is what lets it tell the chair from the frame, so its
// map has the chair in it and not the frame; but a block is all it can say.
export const chairBlocks = (depth: Depth): Grid =>
  pool(CHAIR, 1 << depth).map((row) => row.map((v) => (v > 0 ? 1 : 0)))

// The deep map grown back to full size, one 2× step at a time
export function grow(map: Grid, depth: number, how: Grow): Grid {
  let out = map
  for (let i = 0; i < depth; i++) out = how === 'Copy' ? upCopy(out) : upBilinear(out)
  return out
}

// A pixel is chair where the grown map says more chair than not; with the
// copy across, only where the photo also has ink there
export const HALF = 0.5

export type Mask = boolean[][]

export const cutDeep = (grown: Grid): Mask => grown.map((row) => row.map((v) => v >= HALF))
export const cutCopy = (photo: Grid = PHOTO): Mask => photo.map((row) => row.map((v) => v >= HALF))
export const cutBoth = (grown: Grid, photo: Grid = PHOTO): Mask =>
  grown.map((row, r) => row.map((v, c) => v >= HALF && photo[r][c] >= HALF))

// How a cut compares with the chair: chair pixels it missed, other pixels it
// took (and how many of them are the frame's)
export function score(mask: Mask) {
  let missed = 0
  let extra = 0
  let frame = 0
  let kept = 0
  mask.forEach((row, r) =>
    row.forEach((on, c) => {
      if (on) kept++
      if (CHAIR[r][c] && !on) missed++
      if (!CHAIR[r][c] && on) extra++
      if (FRAME[r][c] && on) frame++
    }),
  )
  return { kept, missed, extra, frame, wrong: missed + extra }
}

// What the lab's cut uses: the deep map, the copied photo, or both
export type Use = 'Deep map' | 'Copy' | 'Both'
export const USES: readonly Use[] = ['Deep map', 'Copy', 'Both']

export function cut(depth: Depth, how: Grow, use: Use): Mask {
  if (use === 'Copy') return cutCopy()
  const grown = grow(chairBlocks(depth), depth, how)
  return use === 'Deep map' ? cutDeep(grown) : cutBoth(grown)
}

// The story: halve twice, to 4×4, and grow back bilinearly
export const STORY_DEPTH: Depth = 2
export const STORY_MAP = chairBlocks(STORY_DEPTH)
export const STORY_GROWN = grow(STORY_MAP, STORY_DEPTH, 'Bilinear')
export const STORY_DEEP = cutDeep(STORY_GROWN)
export const STORY_COPY = cutCopy()
export const STORY_BOTH = cutBoth(STORY_GROWN)
export const STORY = {
  deep: score(STORY_DEEP),
  copy: score(STORY_COPY),
  both: score(STORY_BOTH),
}
export const STORY_BLOCKS = count(STORY_MAP)

// The one line of maths, worked: three new pixels of the first 2× step
// (4×4 to 8×8), each from its four old neighbours, in the order nearest,
// across, down, diagonal
export const FIRST_STEP = upBilinear(STORY_MAP)
export function neighbours(map: Grid, r: number, c: number): [number, number, number, number] {
  const h = map.length
  const w = map[0].length
  const r0 = r >> 1
  const c0 = c >> 1
  const r1 = clamp(r0 + (r % 2 === 0 ? -1 : 1), h)
  const c1 = clamp(c0 + (c % 2 === 0 ? -1 : 1), w)
  return [map[r0][c0], map[r0][c1], map[r1][c0], map[r1][c1]]
}
export const WORKED = ([
  [4, 2],
  [3, 2],
  [5, 5],
] as const).map(([r, c]) => {
  const around = neighbours(STORY_MAP, r, c)
  return { r, c, around, value: FIRST_STEP[r][c] }
})

// Stacking, not adding: the paper's top level, where the up-sampled map and
// the copy each carry 64 channels
export const DECODER_CHANNELS = 64
export const COPY_CHANNELS = 64
export const STACKED = DECODER_CHANNELS + COPY_CHANNELS
