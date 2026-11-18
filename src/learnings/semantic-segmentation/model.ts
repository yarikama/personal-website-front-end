// Semantic segmentation on a toy beach: a 16 × 16 photo, a classifier that
// names what is in a 4 × 4 patch, the same classifier slid over the whole
// photo (a coarse 4 × 4 map), and transposed convolutions that grow the map
// back to 16 × 16. Every number the page states comes from here.

export const SIDE = 16
export const BLOCK = 4
export const COARSE_SIDE = SIDE / BLOCK

export const CLASSES = ['sky', 'sea', 'sand', 'boat'] as const
export type Label = 0 | 1 | 2 | 3
export const SKY: Label = 0
export const SEA: Label = 1
export const SAND: Label = 2
export const BOAT: Label = 3

export type Grid = number[][]

const grid = (rows: number, cols: number, value: (r: number, c: number) => number): Grid =>
  Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => value(r, c)))

// ---------------------------------------------------------------------------
// The photo. Values are how much ink a square has, from 0 to 1. Sky and the
// sea between its wave crests have exactly the same value, so one square
// alone cannot say which it is.

export const INK = { sky: 0.3, sea: 0.3, crest: 0.65, sand: 0.12, boat: 0.95 }
export const HORIZON = 5 // the first row of sea

// Sand rises from the bottom-left corner to the right, in steps of three columns
const shore = (c: number) => 14 - Math.floor(c / 3)
const isBoat = (r: number, c: number) => (r === 8 || r === 9) && c >= 10 && c <= 12
const isCrest = (r: number, c: number) => (c + 2 * r) % 4 === 0

function truthAt(r: number, c: number): Label {
  if (r < HORIZON) return SKY
  if (isBoat(r, c)) return BOAT
  if (r >= shore(c)) return SAND
  return SEA
}

export const TRUTH: Label[][] = grid(SIDE, SIDE, truthAt) as Label[][]

export const PHOTO: Grid = grid(SIDE, SIDE, (r, c) => {
  const label = TRUTH[r][c]
  if (label === SKY) return INK.sky
  if (label === BOAT) return INK.boat
  if (label === SAND) return INK.sand
  return isCrest(r, c) ? INK.crest : INK.sea
})

// A square of sky and a square of sea (not on a crest) for the story to
// hold side by side: the same value
export const LOOKALIKES = { sky: [3, 5] as const, sea: [10, 3] as const }

// ---------------------------------------------------------------------------
// The classifier. Its body turns a 4 × 4 patch into four features: what
// share of its squares are at each of the photo's four shades (sand's, the
// shade sky and calm sea share, a crest's, the boat's). Its head is a fully
// connected layer from those four features to a score per class. The head's
// weights are set by hand: each class has a typical set of shares, and the
// head scores how close a patch is to it. (Squared distance, with the term
// every class shares dropped, is linear.)

export const SHADES = ['sand', 'sky or calm sea', 'crest', 'boat'] as const
const shadeOf = (v: number) => (v < 0.2 ? 0 : v < 0.5 ? 1 : v < 0.8 ? 2 : 3)

export function features(image: Grid, r0: number, c0: number, size = BLOCK): number[] {
  const shares = [0, 0, 0, 0]
  for (let r = r0; r < r0 + size; r++) for (let c = c0; c < c0 + size; c++) shares[shadeOf(image[r][c])] += 1 / (size * size)
  return shares
}

// A patch of open sea has one crest in each of its 4 rows
export const TYPICAL: number[][] = [
  [0, 1, 0, 0],
  [0, 0.75, 0.25, 0],
  [1, 0, 0, 0],
  [0, 0, 0, 1],
]

export const HEAD = {
  weights: TYPICAL.map((t) => t.map((x) => 2 * x)),
  bias: TYPICAL.map((t) => -t.reduce((sum, x) => sum + x * x, 0)),
}

const dot = (a: number[], b: number[]) => a.reduce((sum, x, i) => sum + x * b[i], 0)
export const head = (f: number[]): number[] => HEAD.weights.map((w, k) => dot(w, f) + HEAD.bias[k])

export const argmax = (scores: number[]): Label => {
  let best = 0
  for (let k = 1; k < scores.length; k++) if (scores[k] > scores[best]) best = k
  return best as Label
}

// The classifier as trained: one 4 × 4 patch in, one name out
export const classifyPatch = (patch: Grid): Label => argmax(head(features(patch, 0, 0, patch.length)))

// The same classifier, convolutionalized: the body runs over the whole photo
// in steps of 4 (a map of feature sets), then the head runs at every spot of
// that map on its own, which is a 1 × 1 convolution. Scores per class, 4 × 4.
export function scoreMap(image: Grid): Grid[] {
  const rows = image.length / BLOCK
  const cols = image[0].length / BLOCK
  const feats = Array.from({ length: rows }, (_, i) => Array.from({ length: cols }, (_, j) => features(image, i * BLOCK, j * BLOCK)))
  return CLASSES.map((_, k) => grid(rows, cols, (i, j) => dot(HEAD.weights[k], feats[i][j]) + HEAD.bias[k]))
}

export const labels = (scores: Grid[]): Label[][] =>
  scores[0].map((row, i) => row.map((_, j) => argmax(scores.map((s) => s[i][j]))))

// The head's parameter count, as a fully connected layer or as a 1 × 1
// convolution: the same weights either way
export const headParameters = (inputs: number, outputs: number) => inputs * outputs + outputs

// How many answers a classifier that reads `window` pixels and moves in
// steps of `stride` gives along one side of an `image`-pixel photo
export const answersPerSide = (image: number, window: number, stride: number) => (image - window) / stride + 1

// ---------------------------------------------------------------------------
// Transposed convolution: every input value stamps the kernel, scaled by
// itself, into the output; stamps sit `stride` apart and add where they
// overlap. `padding` trims that many pixels off every side.

export const outputSize = (n: number, kernel: number, stride: number, padding = 0) =>
  (n - 1) * stride + kernel - 2 * padding

export function transposedConv(input: Grid, kernel: Grid, stride: number, padding = 0): Grid {
  const kh = kernel.length
  const kw = kernel[0].length
  const rows = outputSize(input.length, kh, stride, padding)
  const cols = outputSize(input[0].length, kw, stride, padding)
  const out = grid(rows, cols, () => 0)
  input.forEach((row, i) =>
    row.forEach((x, j) => {
      for (let a = 0; a < kh; a++)
        for (let b = 0; b < kw; b++) {
          const r = i * stride + a - padding
          const c = j * stride + b - padding
          if (r >= 0 && r < rows && c >= 0 && c < cols) out[r][c] += x * kernel[a][b]
        }
    }),
  )
  return out
}

export const ones = (k: number): Grid => grid(k, k, () => 1)

// How many stamps land on each output pixel, for an n × n input
export const stampCounts = (n: number, kernel: number, stride: number) => transposedConv(ones(n), ones(kernel), stride)

// How many stamps land on each output pixel along one side, for an input n
// wide: pixel o gets one from every input i whose stamp, starting at i × s,
// covers it
export const stampsAlong = (n: number, kernel: number, stride: number) =>
  Array.from({ length: outputSize(n, kernel, stride) }, (_, o) => {
    let stamps = 0
    for (let i = 0; i < n; i++) if (o - i * stride >= 0 && o - i * stride < kernel) stamps++
    return stamps
  })

// Away from the border, does every output pixel get the same number of
// stamps? Only when the stride divides the kernel; otherwise some get more
// than their neighbours (or none at all), and the output shows a
// checkerboard. The inside runs from where the first stamp ends to where
// the last one starts.
export function evenInside(kernel: number, stride: number): boolean {
  const n = kernel + 2
  const inside = stampsAlong(n, kernel, stride).slice(kernel - 1, (n - 1) * stride + 1)
  return inside.every((x) => x === inside[0])
}

// The different stamp counts inside an n × n input's output, smallest first
export function insideCounts(n: number, kernel: number, stride: number): number[] {
  const along = stampsAlong(n, kernel, stride).slice(kernel - 1, (n - 1) * stride + 1)
  const products = new Set(along.flatMap((a) => along.map((b) => a * b)))
  return [...products].sort((a, b) => a - b)
}

// The kernel that grows a map to twice its size by smooth blending: a tent,
// 4 wide, used with stride 2 and padding 1
const TENT = [0.25, 0.75, 0.75, 0.25]
export const TENT_KERNEL: Grid = grid(4, 4, (a, b) => TENT[a] * TENT[b])
export const doubleSmoothly = (map: Grid) => transposedConv(map, TENT_KERNEL, 2, 1)

// ---------------------------------------------------------------------------
// The story's maps

export const SCORES = scoreMap(PHOTO)
export const COARSE: Label[][] = labels(SCORES)
// The coarse map read at full size: each answer covers its 4 × 4 patch
export const BLOCKY: Label[][] = grid(SIDE, SIDE, (r, c) => COARSE[Math.floor(r / BLOCK)][Math.floor(c / BLOCK)]) as Label[][]
// The coarse scores grown back by two transposed convolutions, 4 → 8 → 16
export const SPREAD: Label[][] = labels(SCORES.map((s) => doubleSmoothly(doubleSmoothly(s))))

// Intersection over union: the pixels both maps call `label`, over the
// pixels either calls it
export function iou(pred: Label[][], truth: Label[][], label: Label): number {
  let both = 0
  let either = 0
  pred.forEach((row, r) =>
    row.forEach((p, c) => {
      const t = truth[r][c]
      if (p === label && t === label) both++
      if (p === label || t === label) either++
    }),
  )
  return either === 0 ? 1 : both / either
}

export function accuracy(pred: Label[][], truth: Label[][]): number {
  let right = 0
  pred.forEach((row, r) => row.forEach((p, c) => (right += p === truth[r][c] ? 1 : 0)))
  return right / (pred.length * pred[0].length)
}

export const count = (map: Label[][], label: Label) => map.flat().filter((l) => l === label).length

// ---------------------------------------------------------------------------
// Dilated convolutions: a 3 × 3 filter whose taps sit `d` pixels apart.
// The offsets (along one side) that one output pixel sees through a stack of
// such layers, and how wide that is.

export function seenOffsets(dilations: number[]): number[] {
  let seen = new Set([0])
  for (const d of dilations) {
    const next = new Set<number>()
    for (const o of seen) for (const t of [-d, 0, d]) next.add(o + t)
    seen = next
  }
  return [...seen].sort((a, b) => a - b)
}

export const viewWidth = (dilations: number[]) => 1 + dilations.reduce((sum, d) => sum + 2 * d, 0)

// The fewest 3 × 3 layers that see `width` pixels across: plain ones add 2
// each; doubling the dilation (1, 2, 4, ...) doubles the view plus one
export const plainLayers = (width: number) => Math.ceil((width - 1) / 2)
export function dilatedLayers(width: number): number {
  let layers = 0
  while (viewWidth(Array.from({ length: layers }, (_, i) => 2 ** i)) < width) layers++
  return layers
}

export const DILATIONS = { plain: [1, 1, 1], dilated: [1, 2, 4] }

// Formatting
export const pct = (share: number) => `${Math.round(100 * share)}%`
export const decimal = (x: number) => x.toFixed(2)
export const thousands = (x: number) => x.toLocaleString('en-US')

// ---------------------------------------------------------------------------
// The numbers the page tells

// The guess: a classifier that reads 224 × 224 and moves in steps of 32,
// slid over a photo twice as wide and tall
export const GUESS = { photo: 448, window: 224, stride: 32 }
export const GUESS_SIDE = answersPerSide(GUESS.photo, GUESS.window, GUESS.stride)

export const STORY = {
  squares: SIDE * SIDE,
  answers: COARSE_SIDE * COARSE_SIDE,
  blocky: accuracy(BLOCKY, TRUTH),
  spread: accuracy(SPREAD, TRUTH),
  boatSquares: count(TRUTH, BOAT),
}

export const IOU = {
  seaBlocky: iou(BLOCKY, TRUTH, SEA),
  seaSpread: iou(SPREAD, TRUTH, SEA),
  boatSpread: iou(SPREAD, TRUTH, BOAT),
}

// A real classifier's last layer, and the toy's
export const ALEXNET_HEAD = { inputs: 4096, outputs: 1000 }
export const TOY_HEAD = { inputs: SHADES.length, outputs: CLASSES.length }

// Three transposed convolutions on a 4-wide map, all with stride 2
export const SIZES = [2, 3, 4].map((kernel) => ({ kernel, size: outputSize(4, kernel, 2), even: evenInside(kernel, 2) }))

// The check: how many 3 × 3 layers to see 31 pixels across
export const WIDE = 31
