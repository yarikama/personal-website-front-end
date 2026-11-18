import { seeded } from '../../components/explain/random'

// ---------------------------------------------------------------------------
// The story's toy: an 8×8 ink drawing, cut into four 4×4 squares. Mia (the
// vision encoder, frozen) writes two numbers for each square; Leo (the
// language model, frozen) knows words as spots on a 2-D map; a rule of six
// numbers (the projector) is the only thing that learns.
// ---------------------------------------------------------------------------

export type Kind = 'blank' | 'solid' | 'stripes' | 'dots'
export const KINDS: Kind[] = ['blank', 'solid', 'stripes', 'dots']
export const PATCH = 4
export const SIDE = 8

// Each kind of square, as ink from 0 (none) to 1 (full)
export const PATTERNS: Record<Kind, number[][]> = {
  blank: Array.from({ length: PATCH }, () => [0, 0, 0, 0]),
  solid: Array.from({ length: PATCH }, () => [1, 1, 1, 1]),
  stripes: Array.from({ length: PATCH }, () => [1, 0, 1, 0]),
  dots: [
    [1, 0, 1, 0],
    [0, 0, 0, 0],
    [1, 0, 1, 0],
    [0, 0, 0, 0],
  ],
}

export type Vec = [number, number]

// Mia's two numbers: how much ink, and how stripy (the average jump in ink
// from each pixel to the one on its right)
export function features(patch: number[][]): Vec {
  let ink = 0
  let jumps = 0
  let pairs = 0
  for (const row of patch) {
    for (let j = 0; j < row.length; j++) {
      ink += row[j]
      if (j + 1 < row.length) {
        jumps += Math.abs(row[j + 1] - row[j])
        pairs++
      }
    }
  }
  return [ink / (patch.length * patch[0].length), jumps / pairs]
}

// A picture of four squares, read row by row: top left, top right, bottom
// left, bottom right
export function picture(kinds: Kind[]): number[][] {
  return Array.from({ length: SIDE }, (_, y) =>
    Array.from({ length: SIDE }, (_, x) => {
      const kind = kinds[Math.floor(y / PATCH) * 2 + Math.floor(x / PATCH)]
      return PATTERNS[kind][y % PATCH][x % PATCH]
    }),
  )
}

// The four squares of a picture, in the same order
export function patchesOf(pic: number[][]): number[][][] {
  return [0, 1, 2, 3].map((k) => {
    const top = Math.floor(k / 2) * PATCH
    const left = (k % 2) * PATCH
    return pic.slice(top, top + PATCH).map((row) => row.slice(left, left + PATCH))
  })
}

// Leo's word map. Each kind's word has a neighbour that means much the same;
// four words with nothing to do with drawings sit where Mia's raw numbers
// would land if put on the map as they are.
export const WORDS: { word: string; at: Vec }[] = [
  { word: 'blank', at: [-0.3, -0.9] },
  { word: 'empty', at: [0.05, -1.0] },
  { word: 'solid', at: [-0.3, 0.0] },
  { word: 'filled', at: [-0.55, 0.25] },
  { word: 'stripes', at: [-1.2, -0.45] },
  { word: 'zebra', at: [-1.3, -0.15] },
  { word: 'dots', at: [-0.75, -0.7] },
  { word: 'spots', at: [-1.0, -0.95] },
  { word: 'Tuesday', at: [0.1, 0.12] },
  { word: 'music', at: [0.95, -0.25] },
  { word: 'soup', at: [0.38, 0.92] },
  { word: 'piano', at: [0.4, 0.5] },
]
export const wordAt = (word: string) => WORDS.find((w) => w.word === word)!.at

// The rule: a 2×2 matrix and a shift, six numbers
export interface Rule {
  m: [Vec, Vec]
  b: Vec
}
export const RULE_SIZE = 6
export const AS_THEY_ARE: Rule = {
  m: [
    [1, 0],
    [0, 1],
  ],
  b: [0, 0],
}
export const ruleNumbers = (r: Rule) => [r.m[0][0], r.m[0][1], r.m[1][0], r.m[1][1], r.b[0], r.b[1]]

// Where a square's two numbers land on the word map: h = W·z + b
export const project = (r: Rule, z: Vec): Vec => [
  r.m[0][0] * z[0] + r.m[0][1] * z[1] + r.b[0],
  r.m[1][0] * z[0] + r.m[1][1] * z[1] + r.b[1],
]

const dist2 = (a: Vec, b: Vec) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2

// How sure Leo is of each word when he reads a spot on his map: a softmax
// over the words, nearer words scoring higher
export const TAU = 0.2
export function reading(h: Vec): number[] {
  const scores = WORDS.map((w) => -dist2(h, w.at) / TAU)
  const top = Math.max(...scores)
  const e = scores.map((s) => Math.exp(s - top))
  const total = e.reduce((a, b) => a + b, 0)
  return e.map((x) => x / total)
}

// The word nearest a spot: what Leo reads it as
export function nearest(h: Vec): string {
  let best = 0
  for (let i = 1; i < WORDS.length; i++) if (dist2(h, WORDS[i].at) < dist2(h, WORDS[best].at)) best = i
  return WORDS[best].word
}

// Training pairs: each kind of square with the word its caption uses for it
export const PAIRS: { z: Vec; word: string }[] = KINDS.map((k) => ({ z: features(PATTERNS[k]), word: k }))

// The caption loss, averaged over the pairs: −log of how sure Leo is of the
// right word. Leo and Mia are frozen; only the rule changes it.
export function loss(r: Rule, pairs = PAIRS): number {
  let total = 0
  for (const { z, word } of pairs) {
    const p = reading(project(r, z))
    total -= Math.log(p[WORDS.findIndex((w) => w.word === word)])
  }
  return total / pairs.length
}

// The loss's slope for each of the rule's six numbers, worked out by hand:
// for one pair, dL/dh = (2/τ)(h − e_right − Σ_w p_w (h − e_w)), and
// dL/dW = dL/dh · zᵀ, dL/db = dL/dh
export function gradient(r: Rule, pairs = PAIRS): Rule {
  const gm: [Vec, Vec] = [
    [0, 0],
    [0, 0],
  ]
  const gb: Vec = [0, 0]
  for (const { z, word } of pairs) {
    const h = project(r, z)
    const p = reading(h)
    const right = wordAt(word)
    const g: Vec = [0, 1].map((d) => {
      const mean = WORDS.reduce((sum, w, i) => sum + p[i] * (h[d] - w.at[d]), 0)
      return (2 / TAU) * (h[d] - right[d] - mean)
    }) as Vec
    for (let i = 0; i < 2; i++) {
      gb[i] += g[i] / pairs.length
      for (let j = 0; j < 2; j++) gm[i][j] += (g[i] * z[j]) / pairs.length
    }
  }
  return { m: gm, b: gb }
}

// Plain gradient descent on the rule, every step kept so the story can play it
export const LEARNING_RATE = 0.05
export const TRAINING_STEPS = 60
export function train(start: Rule, steps = TRAINING_STEPS, rate = LEARNING_RATE): Rule[] {
  const history = [start]
  let r = start
  for (let t = 0; t < steps; t++) {
    const g = gradient(r)
    r = {
      m: [
        [r.m[0][0] - rate * g.m[0][0], r.m[0][1] - rate * g.m[0][1]],
        [r.m[1][0] - rate * g.m[1][0], r.m[1][1] - rate * g.m[1][1]],
      ],
      b: [r.b[0] - rate * g.b[0], r.b[1] - rate * g.b[1]],
    }
    history.push(r)
  }
  return history
}

export const TRAINING = train(AS_THEY_ARE)
export const TRAINED = TRAINING[TRAINING.length - 1]

// The story's pictures: the one Mia looks at first, and a new one Leo is
// asked about once the rule is trained
export const FIRST_PICTURE: Kind[] = ['blank', 'solid', 'stripes', 'dots']
export const NEW_PICTURE: Kind[] = ['stripes', 'stripes', 'blank', 'dots']
export const QUESTION = ['What', 'is', 'in', 'it?']

// Where a picture's squares land under a rule, and what Leo reads them as
export const tokensOf = (r: Rule, kinds: Kind[]) => patchesOf(picture(kinds)).map((p) => project(r, features(p)))
export const readAs = (r: Rule, kinds: Kind[]) => tokensOf(r, kinds).map(nearest)

// Leo's answer about a picture: what he read in the top two squares, then
// the bottom two
export function answer(words: string[]): string {
  const both = (a: string, b: string) => (a === b ? a : `${a} and ${b}`)
  const top = both(words[0], words[1])
  return `${top[0].toUpperCase()}${top.slice(1)} on top, ${both(words[2], words[3])} below.`
}

// ---------------------------------------------------------------------------
// The real thing: LLaVA (Liu et al. 2023), LLaVA-1.5 and Qwen2-VL
// ---------------------------------------------------------------------------

export const LLAVA = {
  encoderParams: 304e6, // CLIP ViT-L/14's image side
  llmParams: 13.0e9, // Vicuna-13B
  feature: 1024, // numbers per patch out of the encoder
  width: 5120, // numbers in one of Vicuna-13B's word embeddings
  side: 224,
  patch: 14,
  captions: 595_000, // stage 1: filtered CC3M pairs
  instructions: 158_000, // stage 2: LLaVA-Instruct-158K
}
// The projector is one linear layer: a weight for each (feature, width) pair, plus a shift
export const projectorWeights = LLAVA.feature * LLAVA.width + LLAVA.width
export const totalWeights = LLAVA.encoderParams + LLAVA.llmParams + projectorWeights
export const trainedShare = projectorWeights / totalWeights
export const oneIn = Math.round(1 / trainedShare / 100) * 100

// The one line: visual tokens = (height ÷ p) × (width ÷ p)
export const tokens = (height: number, width: number, p: number) => Math.floor(height / p) * Math.floor(width / p)
export const LLAVA_TOKENS = tokens(LLAVA.side, LLAVA.side, LLAVA.patch)

// LLaVA-1.5 pads every picture to a square and shrinks (or grows) it to
// 336 × 336: always 24 × 24 = 576 tokens
export const FIXED_SIDE = 336
export const FIXED_PER_SIDE = FIXED_SIDE / LLAVA.patch
export const FIXED_TOKENS = tokens(FIXED_SIDE, FIXED_SIDE, LLAVA.patch)

// Qwen2-VL-7B-Instruct's settings: 14-pixel patches, each 2 × 2 block merged
// into one token, so one token per 28 × 28 pixels, and a picture resized
// (keeping its shape) to between min and max pixels, each side a multiple of 28
export const QWEN = { patch: 14, merge: 2, minPixels: 3136, maxPixels: 12_845_056 }
export const FACTOR = QWEN.patch * QWEN.merge

// Qwen2-VL's own resizing rule (smart_resize), for a picture `height` by `width`
export function smartResize(height: number, width: number, factor = FACTOR): { height: number; width: number } {
  let h = Math.round(height / factor) * factor
  let w = Math.round(width / factor) * factor
  if (h * w > QWEN.maxPixels) {
    const beta = Math.sqrt((height * width) / QWEN.maxPixels)
    h = Math.floor(height / beta / factor) * factor
    w = Math.floor(width / beta / factor) * factor
  } else if (h * w < QWEN.minPixels) {
    const beta = Math.sqrt(QWEN.minPixels / (height * width))
    h = Math.ceil((height * beta) / factor) * factor
    w = Math.ceil((width * beta) / factor) * factor
  }
  return { height: h, width: w }
}

export function nativeTokens(height: number, width: number): number {
  const r = smartResize(height, width)
  return tokens(r.height, r.width, FACTOR)
}

// Patches before merging, for the reveal: 224 × 224 is 256 patches, 64 tokens
export const nativePatches = (height: number, width: number) => {
  const r = smartResize(height, width)
  return tokens(r.height, r.width, QWEN.patch)
}

// ---------------------------------------------------------------------------
// The lab's pictures: drawn by hand as boxes of ink, in their own pixels
// ---------------------------------------------------------------------------

export interface Box {
  x: number
  y: number
  w: number
  h: number
  ink: number
}

export interface Input {
  name: string
  width: number
  height: number
  boxes: Box[]
  // The square of the picture the close-up shows, in its own pixels
  look: { x: number; y: number; size: number }
}

// Lines of "text": words as boxes of ink, of seeded lengths
function textLines(
  random: () => number,
  { left, right, top, lines, pitch, tall, ink = 0.85 }: {
    left: number
    right: number
    top: number
    lines: number
    pitch: number
    tall: number
    ink?: number
  },
): Box[] {
  const boxes: Box[] = []
  for (let line = 0; line < lines; line++) {
    const y = top + line * pitch
    // Some lines stop short, as paragraphs do
    const end = random() < 0.2 ? left + (right - left) * (0.3 + 0.5 * random()) : right
    for (let x = left, w = Math.round(tall * (1 + 4 * random())); x + w <= end; w = Math.round(tall * (1 + 4 * random()))) {
      boxes.push({ x, y, w, h: tall, ink })
      x += w + Math.round(tall * 0.6)
    }
  }
  return boxes
}

const ICON: Input = {
  name: 'Icon',
  width: 56,
  height: 56,
  // A smiling face in a frame
  boxes: [
    { x: 4, y: 4, w: 48, h: 4, ink: 1 },
    { x: 4, y: 48, w: 48, h: 4, ink: 1 },
    { x: 4, y: 8, w: 4, h: 40, ink: 1 },
    { x: 48, y: 8, w: 4, h: 40, ink: 1 },
    { x: 17, y: 18, w: 6, h: 8, ink: 1 },
    { x: 33, y: 18, w: 6, h: 8, ink: 1 },
    { x: 16, y: 34, w: 4, h: 4, ink: 1 },
    { x: 20, y: 37, w: 16, h: 4, ink: 1 },
    { x: 36, y: 34, w: 4, h: 4, ink: 1 },
  ],
  look: { x: 0, y: 0, size: 56 },
}

const LINE: Input = {
  name: 'One line of text',
  width: 224,
  height: 28,
  boxes: textLines(seeded(3), { left: 6, right: 218, top: 8, lines: 1, pitch: 28, tall: 12 }),
  look: { x: 0, y: -42, size: 112 },
}

// A house on a hill under the sun, in boxes
const PHOTO: Input = {
  name: 'Photo',
  width: 1260,
  height: 700,
  boxes: [
    { x: 0, y: 520, w: 1260, h: 180, ink: 0.45 },
    // The wall, built round a window and a door
    { x: 140, y: 300, w: 60, h: 220, ink: 0.85 },
    { x: 200, y: 300, w: 60, h: 60, ink: 0.85 },
    { x: 200, y: 360, w: 60, h: 60, ink: 0.2 },
    { x: 200, y: 420, w: 60, h: 100, ink: 0.85 },
    { x: 260, y: 300, w: 60, h: 220, ink: 0.85 },
    { x: 320, y: 300, w: 60, h: 100, ink: 0.85 },
    { x: 320, y: 400, w: 60, h: 120, ink: 0.25 },
    { x: 380, y: 300, w: 60, h: 220, ink: 0.85 },
    { x: 170, y: 240, w: 240, h: 60, ink: 0.7 },
    { x: 960, y: 80, w: 120, h: 120, ink: 0.6 },
    { x: 700, y: 380, w: 30, h: 140, ink: 0.9 },
    { x: 640, y: 260, w: 150, h: 120, ink: 0.55 },
  ],
  look: { x: 180, y: 220, size: 280 },
}

// The receipt's text is 10 pixels tall
export const TEXT_HEIGHT = 10

const RECEIPT: Input = {
  name: 'Receipt',
  width: 600,
  height: 2400,
  boxes: textLines(seeded(7), { left: 40, right: 560, top: 60, lines: 120, pitch: 18, tall: TEXT_HEIGHT }),
  look: { x: 30, y: 40, size: 240 },
}

const PAGE: Input = {
  name: 'Web page',
  width: 1092,
  height: 8204,
  boxes: [
    { x: 0, y: 0, w: 1092, h: 90, ink: 0.6 },
    { x: 60, y: 160, w: 520, h: 40, ink: 0.95 },
    ...textLines(seeded(11), { left: 60, right: 1032, top: 240, lines: 30, pitch: 24, tall: 10 }),
    { x: 60, y: 980, w: 972, h: 420, ink: 0.35 },
    ...textLines(seeded(12), { left: 60, right: 1032, top: 1460, lines: 270, pitch: 24, tall: 10 }),
  ],
  look: { x: 40, y: 140, size: 260 },
}

export const INPUTS: Input[] = [ICON, LINE, PHOTO, RECEIPT, PAGE]
export type Mode = 'Fixed' | 'Native'
export const MODES: Mode[] = ['Fixed', 'Native']

// How a picture is cut into tokens, in its own pixels: where the grid starts,
// how big a cell is, and how many cells there are
export interface Grid {
  x0: number
  y0: number
  cellW: number
  cellH: number
  cols: number
  rows: number
}

export function gridOf(input: Input, mode: Mode): Grid {
  if (mode === 'Fixed') {
    // Padded to a square about its middle, then 24 cells a side
    const side = Math.max(input.width, input.height)
    const cell = side / FIXED_PER_SIDE
    return {
      x0: (input.width - side) / 2,
      y0: (input.height - side) / 2,
      cellW: cell,
      cellH: cell,
      cols: FIXED_PER_SIDE,
      rows: FIXED_PER_SIDE,
    }
  }
  const r = smartResize(input.height, input.width)
  const cols = r.width / FACTOR
  const rows = r.height / FACTOR
  return { x0: 0, y0: 0, cellW: input.width / cols, cellH: input.height / rows, cols, rows }
}

const overlap = (a0: number, a1: number, b0: number, b1: number) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0))

// How much ink each token's cell holds, from 0 to 1, row by row: each box
// adds its ink times the share of the cell it covers. Boxes never overlap.
export function inkPerCell(input: Input, g: Grid): number[] {
  const cells = new Array<number>(g.cols * g.rows).fill(0)
  const area = g.cellW * g.cellH
  for (const box of input.boxes) {
    const c0 = Math.max(0, Math.floor((box.x - g.x0) / g.cellW))
    const c1 = Math.min(g.cols - 1, Math.floor((box.x + box.w - g.x0) / g.cellW))
    const r0 = Math.max(0, Math.floor((box.y - g.y0) / g.cellH))
    const r1 = Math.min(g.rows - 1, Math.floor((box.y + box.h - g.y0) / g.cellH))
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const x = g.x0 + c * g.cellW
        const y = g.y0 + r * g.cellH
        const covered = overlap(box.x, box.x + box.w, x, x + g.cellW) * overlap(box.y, box.y + box.h, y, y + g.cellH)
        cells[r * g.cols + c] += (box.ink * covered) / area
      }
    }
  }
  return cells
}

// Cells that hold none of the picture, only padding
export function paddingCells(input: Input, g: Grid): number {
  let count = 0
  for (let r = 0; r < g.rows; r++) {
    for (let c = 0; c < g.cols; c++) {
      const x = g.x0 + c * g.cellW
      const y = g.y0 + r * g.cellH
      if (overlap(0, input.width, x, x + g.cellW) * overlap(0, input.height, y, y + g.cellH) === 0) count++
    }
  }
  return count
}

export interface View {
  grid: Grid
  tokens: number
  padding: number
  ink: number[]
}

// Everything the lab shows for each picture and mode, worked out once
export const VIEWS: Record<Mode, View[]> = {
  Fixed: INPUTS.map((input) => view(input, 'Fixed')),
  Native: INPUTS.map((input) => view(input, 'Native')),
}

function view(input: Input, mode: Mode): View {
  const grid = gridOf(input, mode)
  return { grid, tokens: grid.cols * grid.rows, padding: paddingCells(input, grid), ink: inkPerCell(input, grid) }
}

// "100 × 100" for a cell's size in the picture's own pixels
export const cellSize = (g: Grid) => {
  const f = (v: number) => (v >= 10 ? String(Math.round(v)) : v.toFixed(1))
  return `${f(g.cellW)} × ${f(g.cellH)}`
}

// The check: an icon and a photo ten times as wide and tall
export const SMALL = 56
export const BIG = 560
export const SMALL_TOKENS = nativeTokens(SMALL, SMALL)
export const BIG_TOKENS = nativeTokens(BIG, BIG)

// "5.2 million", "13.3 billion"
export const count = (n: number) =>
  n >= 1e9 ? `${Number((n / 1e9).toFixed(1))} billion` : n >= 1e6 ? `${Number((n / 1e6).toFixed(1))} million` : n.toLocaleString('en-US')
export const percent = (x: number, digits = 2) => `${Number((x * 100).toFixed(digits))}%`

// A picture's boxes with each line of words joined into one box, its ink
// spread over the line: enough for a thumbnail, and cheap to draw
export function outlineOf(input: Input): Box[] {
  const lines = new Map<string, Box[]>()
  for (const b of input.boxes) {
    const key = `${b.y}:${b.h}`
    lines.set(key, [...(lines.get(key) ?? []), b])
  }
  return [...lines.values()].map((row) => {
    if (row.length === 1) return row[0]
    const x = Math.min(...row.map((b) => b.x))
    const end = Math.max(...row.map((b) => b.x + b.w))
    const ink = row.reduce((sum, b) => sum + b.ink * b.w, 0) / (end - x)
    return { x, y: row[0].y, w: end - x, h: row[0].h, ink }
  })
}
export const OUTLINES = INPUTS.map(outlineOf)

// How many of the model's pixels each of the picture's own pixels becomes,
// across and down, once it is resized
export function scaleOf(input: Input, mode: Mode): { sx: number; sy: number } {
  if (mode === 'Fixed') {
    const s = FIXED_SIDE / Math.max(input.width, input.height)
    return { sx: s, sy: s }
  }
  const r = smartResize(input.height, input.width)
  return { sx: r.width / input.width, sy: r.height / input.height }
}

// The close look as the encoder gets it: the resized picture's pixels over
// the `look` square, each as much ink as the area it stands for. Null when
// the look keeps more than MOST_PIXELS pixels across, which is as sharp as
// the drawing can show anyway.
export const MOST_PIXELS = 48
export function lookPixels(input: Input, mode: Mode): { grid: Grid; ink: number[] } | null {
  const { sx, sy } = scaleOf(input, mode)
  if (input.look.size * sx > MOST_PIXELS) return null
  const g = gridOf(input, mode)
  const cellW = 1 / sx
  const cellH = 1 / sy
  const x0 = g.x0 + Math.floor((input.look.x - g.x0) / cellW) * cellW
  const y0 = g.y0 + Math.floor((input.look.y - g.y0) / cellH) * cellH
  const grid = {
    x0,
    y0,
    cellW,
    cellH,
    cols: Math.ceil((input.look.x + input.look.size - x0) / cellW),
    rows: Math.ceil((input.look.y + input.look.size - y0) / cellH),
  }
  return { grid, ink: inkPerCell(input, grid) }
}
export const LOOKS: Record<Mode, ({ grid: Grid; ink: number[] } | null)[]> = {
  Fixed: INPUTS.map((input) => lookPixels(input, 'Fixed')),
  Native: INPUTS.map((input) => lookPixels(input, 'Native')),
}

// How tall the receipt's text is once resized

export const textHeight = (k: number, mode: Mode) => TEXT_HEIGHT * scaleOf(INPUTS[k], mode).sy
