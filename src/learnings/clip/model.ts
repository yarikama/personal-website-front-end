// CLIP, small enough to check by hand: four postcards (an 8×8 picture and a
// caption each), every picture and caption an arrow in the plane, the 4×4
// grid of how alike they are, the symmetric contrastive loss on it, and a
// training run that turns the arrows. In the toy the arrows themselves are
// what is learned; in CLIP the two encoders are, and the arrows follow.
// Every number the page states comes from here; the figures only draw.

// ---- The postcards ----------------------------------------------------------

// A picture as rows of characters: # is a full pixel, + half, . empty
const grid = (rows: string[]) => rows.map((row) => [...row].map((c) => (c === '#' ? 1 : c === '+' ? 0.5 : 0)))

export interface Picture {
  name: string
  pixels: number[][]
}

export const PICTURES: Picture[] = [
  {
    name: 'sun',
    pixels: grid(['#..##..#', '.#....#.', '..####..', '#+####+#', '#+####+#', '..####..', '.#....#.', '#..##..#']),
  },
  {
    name: 'house',
    pixels: grid(['...##...', '..####..', '.######.', '########', '.#....#.', '.#.++.#.', '.#.++.#.', '.######.']),
  },
  {
    name: 'tree',
    pixels: grid(['..####..', '.######.', '########', '.######.', '..####..', '...##...', '...##...', '..####..']),
  },
  {
    name: 'boat',
    pixels: grid(['...#....', '...##...', '...###..', '...####.', '...#....', '########', '.######.', '..++++..']),
  },
]

export const CAPTIONS = ['a sunny sky', 'our house', 'the old oak', 'out on the lake']
// The word each caption's arrow is labelled with
export const KEYWORDS = ['sky', 'house', 'oak', 'lake']
export const N = PICTURES.length

// ---- Arrows, scores and the loss --------------------------------------------

// Where every arrow points, in degrees: pictures[i] for picture i,
// captions[j] for caption j
export interface Arrows {
  pictures: number[]
  captions: number[]
}

const RAD = Math.PI / 180
// Two unit arrows are as alike as the cosine of the angle between them:
// 1 the same way, 0 at right angles, −1 opposite
export const alike = (a: number, b: number) => Math.cos((a - b) * RAD)

// The grid: row i is picture i, column j caption j
export const similarities = ({ pictures, captions }: Arrows) => pictures.map((a) => captions.map((b) => alike(a, b)))

export function softmax(scores: number[]): number[] {
  const top = Math.max(...scores)
  const e = scores.map((s) => Math.exp(s - top))
  const sum = e.reduce((x, y) => x + y, 0)
  return e.map((x) => x / sum)
}

const column = (S: number[][], j: number) => S.map((row) => row[j])

// Each row read as a quiz (which caption is this picture's?), each column
// too (which picture is this caption's?), with the scores divided by the
// temperature first. chances.rows[i][j]: picture i's chance on caption j.
export function chancesOf(S: number[][], tau: number) {
  const rows = S.map((row) => softmax(row.map((s) => s / tau)))
  const columns = S[0].map((_, j) => softmax(column(S, j).map((s) => s / tau)))
  return { rows, columns }
}

// The symmetric contrastive loss: −ln of the right answer's chance in each
// of the 2N quizzes, averaged over the rows and over the columns, then the
// two averages averaged (as in the paper's pseudocode)
export function lossOf(S: number[][], tau: number) {
  const { rows, columns } = chancesOf(S, tau)
  const rowLoss = rows.map((p, k) => -Math.log(p[k]))
  const columnLoss = columns.map((q, k) => -Math.log(q[k]))
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
  return { rows: rowLoss, columns: columnLoss, total: (mean(rowLoss) + mean(columnLoss)) / 2 }
}

export const lossAt = (arrows: Arrows, tau: number) => lossOf(similarities(arrows), tau).total

// How the loss changes as each arrow turns, per degree. With z = s/τ, the
// loss moves with z_ij by (P_ij − [i = j] + Q_ij − [i = j]) / 2N, where P is
// the rows' chances and Q the columns'; and s_ij = cos(a_i − b_j) moves by
// −sin(a_i − b_j) as a_i turns, and by +sin as b_j does.
export function gradient(arrows: Arrows, tau: number): Arrows {
  const S = similarities(arrows)
  const { rows, columns } = chancesOf(S, tau)
  const n = S.length
  const pictures = new Array<number>(n).fill(0)
  const captions = new Array<number>(n).fill(0)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const same = i === j ? 1 : 0
      const byZ = (rows[i][j] - same + columns[j][i] - same) / (2 * n)
      const sin = Math.sin((arrows.pictures[i] - arrows.captions[j]) * RAD)
      pictures[i] += (byZ * -sin * RAD) / tau
      captions[j] += (byZ * sin * RAD) / tau
    }
  }
  return { pictures, captions }
}

// ---- Training ---------------------------------------------------------------

// Where the arrows start: scattered, and each caption far from its picture
export const START: Arrows = { pictures: [20, 95, 160, 250], captions: [200, 50, 300, 130] }

// The temperatures the lab offers. CLIP starts at 0.07.
export const TEMPERATURES = [1, 0.3, 0.07] as const
export type Temperature = (typeof TEMPERATURES)[number]
export const CLIP_START_TAU = 0.07
// CLIP caps 1/τ at 100, so τ never goes below 0.01
export const CLIP_MAX_SCALE = 100

export const STEPS = 60
// Plain gradient descent on the angles. The loss's slope grows like 1/τ, so
// the step is scaled by τ to turn the arrows at about the same pace.
const RATE = 0.6 / (RAD * RAD)

export function train(tau: number, start: Arrows = START, steps = STEPS): Arrows[] {
  const run = [start]
  let at = start
  for (let t = 0; t < steps; t++) {
    const g = gradient(at, tau)
    const step = RATE * tau
    at = {
      pictures: at.pictures.map((a, i) => a - step * g.pictures[i]),
      captions: at.captions.map((b, j) => b - step * g.captions[j]),
    }
    run.push(at)
  }
  return run
}

// Worked out once, at module level: a run for each temperature
export const RUNS = Object.fromEntries(TEMPERATURES.map((tau) => [tau, train(tau)])) as Record<Temperature, Arrows[]>

// The story trains at 0.3: low enough to be sure, high enough that each
// pair ends up lined up (at 0.07 the loss is near zero long before that)
export const STORY_TAU = 0.3
export const STORY_RUN = RUNS[STORY_TAU]
export const TRAINED = STORY_RUN[STEPS]
const ownChances = (arrows: Arrows, tau: number) => chancesOf(similarities(arrows), tau).rows.map((p, k) => p[k])
// What each picture gives its own caption, before and after
export const STORY_BEFORE = ownChances(START, STORY_TAU)
export const STORY_AFTER = ownChances(TRAINED, STORY_TAU)

// ---- The one line of math, worked at τ = 1 -----------------------------------

export const WORKED_TAU = 1
const startS = similarities(START)
const startChances = chancesOf(startS, WORKED_TAU)
const startLoss = lossOf(startS, WORKED_TAU)
// The house picture's row and the house caption's column, at the start
export const HOUSE = 1
export const WORKED = {
  row: { scores: startS[HOUSE], chance: startChances.rows[HOUSE][HOUSE], loss: startLoss.rows[HOUSE] },
  column: { scores: column(startS, HOUSE), chance: startChances.columns[HOUSE][HOUSE], loss: startLoss.columns[HOUSE] },
  total: startLoss.total,
  // The row's likeliest caption, which is not its own
  rowWinner: startChances.rows[HOUSE].indexOf(Math.max(...startChances.rows[HOUSE])),
  rowWinnerChance: Math.max(...startChances.rows[HOUSE]),
}
// Guessing evenly among four gives every right answer ¼
export const EVEN_LOSS = Math.log(N)

// ---- Temperature ------------------------------------------------------------

// The four pairs placed perfectly: each picture on its caption, pairs a
// quarter turn apart, so each row's scores are 1, 0, −1, 0
export const PERFECT: Arrows = { pictures: [0, 90, 180, 270], captions: [0, 90, 180, 270] }
export const perfectChance = (tau: number) => chancesOf(similarities(PERFECT), tau).rows[0][0]
export const perfectLoss = (tau: number) => lossAt(PERFECT, tau)

// ---- Zero-shot: classes nobody named ------------------------------------------

// A prompt for each class, which the text encoder puts near the captions it
// learned from (in the toy, a few degrees off each trained caption)
export const CLASSES = ['sun', 'house', 'tree', 'boat']
export const PROMPTS = CLASSES.map((c) => `a photo of a ${c}`)
const PROMPT_OFFSETS = [5, -6, 4, -5]
export const PROMPT_ANGLES = TRAINED.captions.map((b, j) => b + PROMPT_OFFSETS[j])

export interface NewPicture extends Picture {
  // The class it is, and how far the image encoder puts it from that
  // class's training picture
  of: number
  offset: number
}

export const NEW_PICTURES: NewPicture[] = [
  {
    name: 'cottage',
    of: 1,
    offset: -9,
    pixels: grid(['.....#..', '..####..', '.######.', '########', '#......#', '#.++.#.#', '#.++...#', '########']),
  },
  {
    name: 'pine',
    of: 2,
    offset: 10,
    pixels: grid(['...##...', '..####..', '...##...', '.######.', '..####..', '########', '...##...', '...++...']),
  },
  {
    name: 'sailboat',
    of: 3,
    offset: -8,
    pixels: grid(['....#...', '...##...', '..###...', '.####...', '....#...', '.#######', '#######.', '.+++++..']),
  },
]

export const newPictureAngle = (p: NewPicture) => TRAINED.pictures[p.of] + p.offset

export function zeroShot(p: NewPicture, tau = STORY_TAU) {
  const scores = PROMPT_ANGLES.map((b) => alike(newPictureAngle(p), b))
  const chances = softmax(scores.map((s) => s / tau))
  return { scores, chances, pick: chances.indexOf(Math.max(...chances)) }
}

// ---- Duplicates in a batch ------------------------------------------------------

// Two pictures whose captions are word for word the same: those two columns
// are identical, so in each of their rows the two captions get the same
// chance, and the right one can get at most half
export const DUPLICATE_BEST = 0.5
export const DUPLICATE_FLOOR = Math.log(2)

// ---- The paper's numbers (Radford et al., 2021) ---------------------------------

export const PAPER = {
  pairs: 400_000_000,
  batch: 32_768,
  imagenetClasses: 1000,
  imagenetLabelled: 1_280_000,
  zeroShot: 76.2, // % top-1, best CLIP, no ImageNet training images
  priorZeroShot: 11.5, // % top-1, Visual N-Grams, the zero-shot result before
  promptGain: 1.3, // points on ImageNet from “A photo of a {label}.”
  ensemblePrompts: 80,
  ensembleGain: 3.5, // more points from averaging 80 prompts
  contrastiveSpeedup: 4, // over predicting a bag of the caption's words
}
export const WRONG_PER_QUIZ = PAPER.batch - 1

// ---- Formatting ----------------------------------------------------------------

export const pct = (x: number, digits = 0) => `${(100 * x).toFixed(digits)}%`
export const two = (x: number) => x.toFixed(2).replace('-', '−')
export const thousands = (n: number) => n.toLocaleString('en-US')

// ---- What the lab shows ------------------------------------------------------------

// The gap between two angles, from 0 to 180
export const gapOf = (a: number, b: number) => {
  const d = (((a - b) % 360) + 360) % 360
  return Math.min(d, 360 - d)
}
// At 0.07 the loss is nearly zero by step 20, with a pair still far apart
export const COLD_STEP = 20
export const COLD = (() => {
  const at = RUNS[0.07][COLD_STEP]
  return {
    loss: lossAt(at, 0.07),
    widest: Math.max(...at.pictures.map((a, k) => gapOf(a, at.captions[k]))),
  }
})()
