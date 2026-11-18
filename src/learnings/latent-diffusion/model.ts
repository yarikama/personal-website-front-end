import { seeded } from '../../components/explain/random'

// Every number the page states, and the small mosaic it shows them on.

// ---------------------------------------------------------------------------
// Counting numbers per step

// How many numbers a grid holds: height × width × values at each spot
export const count = (side: number, channels: number) => side * side * channels

// Stable Diffusion: a 512 × 512 colour image, and the 64 × 64 grid of 4
// numbers its denoiser works on
export const IMAGE = { side: 512, channels: 3 }
export const LATENT = { side: 64, channels: 4 }
export const IMAGE_NUMBERS = count(IMAGE.side, IMAGE.channels)
export const LATENT_NUMBERS = count(LATENT.side, LATENT.channels)
export const SHRINK = IMAGE.side / LATENT.side

// How many times fewer numbers a latent holds than its image: shrinking each
// side by f divides by f², and the channels go from C to c
export const fewer = (f: number, imageChannels: number, latentChannels: number) =>
  (f * f * imageChannels) / latentChannels

export const SD_FEWER = fewer(SHRINK, IMAGE.channels, LATENT.channels)

// The denoising passes one image takes, in the story and in the sums
export const PASSES = 50

// The check at the end: a 512 colour image, shrunk 4 per side, 3 numbers a spot
export const CHECK = { side: 512, f: 4, channels: 3 }
export const CHECK_FEWER = fewer(CHECK.f, IMAGE.channels, CHECK.channels)

// Thousands separators, the same on every machine
export const grouped = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')

// "39.3 million", "819,200"
export const big = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)} million` : grouped(n))

// ---------------------------------------------------------------------------
// The mosaic: a 32 × 32 floor of grey tiles, values from 0 to 1

export type Grid = number[][]

export const SIDE = 32
// The plan's patch size in the story
export const STORY_F = 4
// The plan's notes for each patch: how bright, how it shades across and
// down, and how grainy
export const NOTES = ['Bright', 'Across', 'Down', 'Grain'] as const
export const NOTES_PER_PATCH = NOTES.length
// The shrink factors the lab offers
export const FACTORS = [2, 4, 8, 16] as const
export type Factor = (typeof FACTORS)[number]

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

// A soft sun in a sky that deepens toward the horizon, over a grainy hill.
// Seeded, so the grain is the same every time.
function makeFloor(): Grid {
  const random = seeded(11)
  const grid: Grid = []
  for (let i = 0; i < SIDE; i++) {
    const row: number[] = []
    for (let j = 0; j < SIDE; j++) {
      const y = i + 0.5
      const x = j + 0.5
      const sky = 0.12 + 0.25 * (y / SIDE)
      const sun = clamp01((7 - Math.hypot(x - 22, y - 9)) / 4)
      const air = sky * (1 - sun) + 0.92 * sun
      const hill = 20 - 5 * Math.exp(-(((x - 9) / 7) ** 2))
      const onGround = clamp01((y - hill) / 2.5)
      const speck = random() < 0.5 ? -1 : 1
      const ground = 0.62 + 0.12 * ((y - hill) / SIDE) + 0.14 * speck
      row.push(clamp01(air * (1 - onGround) + ground * onGround))
    }
    grid.push(row)
  }
  return grid
}

export const FLOOR = makeFloor()
export const FLOOR_TILES = count(SIDE, 1)

// Where tile k of an f-wide patch sits, from −½ to ½ across it
const offset = (k: number, f: number) => (k + 0.5 - f / 2) / f

// The tiler's own grain for an f × f patch: a fixed ± pattern with any
// brightness or shading taken out (so it never changes the other notes),
// scaled to a root mean square of 1. For a 2 × 2 patch only the checkerboard
// is left once brightness and shading are out.
export function grainPattern(f: number): Grid {
  const random = seeded(7 + f)
  const raw = Array.from({ length: f }, (_, i) =>
    Array.from({ length: f }, (_, j) => (f === 2 ? ((i + j) % 2 ? -1 : 1) : random() < 0.5 ? -1 : 1)),
  )
  const fit = fitPlane(raw)
  const flat = raw.map((row, i) => row.map((v, j) => v - plane(fit, i, j, f)))
  const rms = Math.sqrt(flat.flat().reduce((s, v) => s + v * v, 0) / (f * f))
  return flat.map((row) => row.map((v) => v / rms))
}

type Plane = { bright: number; across: number; down: number }

const plane = (p: Plane, i: number, j: number, f: number) => p.bright + p.across * offset(j, f) + p.down * offset(i, f)

// The best flat-but-tilted patch through a block, by least squares. The
// offsets are centred, so the three fits separate: the mean, then each slope.
export function fitPlane(block: Grid): Plane {
  const f = block.length
  let sum = 0
  let sx = 0
  let sy = 0
  let uu = 0
  for (let i = 0; i < f; i++)
    for (let j = 0; j < f; j++) {
      sum += block[i][j]
      sx += block[i][j] * offset(j, f)
      sy += block[i][j] * offset(i, f)
      uu += offset(j, f) ** 2
    }
  return { bright: sum / (f * f), across: sx / uu, down: sy / uu }
}

// A plan: for each f × f patch, its four notes
export type Notes = [bright: number, across: number, down: number, grain: number]
export type Plan = { f: number; notes: Notes[][] }

const block = (grid: Grid, bi: number, bj: number, f: number): Grid =>
  Array.from({ length: f }, (_, i) => grid[bi * f + i].slice(bj * f, bj * f + f))

// The encoder: sum up each patch in four notes. The fourth is how much the
// patch differs from its tilted plane, not where: the exact specks are
// thrown away.
export function encode(grid: Grid, f: number): Plan {
  const n = grid.length / f
  const notes: Notes[][] = []
  for (let bi = 0; bi < n; bi++) {
    const row: Notes[] = []
    for (let bj = 0; bj < n; bj++) {
      const b = block(grid, bi, bj, f)
      const p = fitPlane(b)
      let left = 0
      for (let i = 0; i < f; i++) for (let j = 0; j < f; j++) left += (b[i][j] - plane(p, i, j, f)) ** 2
      row.push([p.bright, p.across, p.down, Math.sqrt(left / (f * f))])
    }
    notes.push(row)
  }
  return { f, notes }
}

// The decoder: lay each patch as its tilted plane with the tiler's own grain
// sprinkled in, as much as the note asks for
export function decode(plan: Plan): Grid {
  const { f, notes } = plan
  const grain = grainPattern(f)
  const n = notes.length
  return Array.from({ length: n * f }, (_, y) =>
    Array.from({ length: n * f }, (_, x) => {
      const [bright, across, down, amount] = notes[Math.floor(y / f)][Math.floor(x / f)]
      const i = y % f
      const j = x % f
      return clamp01(plane({ bright, across, down }, i, j, f) + amount * grain[i][j])
    }),
  )
}

export const planNumbers = (plan: Plan) => plan.notes.length * plan.notes.length * NOTES_PER_PATCH

// How far apart two grids are: the root mean square of their differences
export function rms(a: Grid, b: Grid) {
  let s = 0
  let n = 0
  for (let i = 0; i < a.length; i++)
    for (let j = 0; j < a.length; j++) {
      s += (a[i][j] - b[i][j]) ** 2
      n++
    }
  return Math.sqrt(s / n)
}

// The floor as seen from across the room: each tile averaged with its
// neighbours, three by three (fewer at the edges)
export function blur(grid: Grid): Grid {
  const n = grid.length
  return grid.map((row, i) =>
    row.map((_, j) => {
      let s = 0
      let k = 0
      for (let di = -1; di <= 1; di++)
        for (let dj = -1; dj <= 1; dj++) {
          const a = i + di
          const b = j + dj
          if (a < 0 || b < 0 || a >= n || b >= n) continue
          s += grid[a][b]
          k++
        }
      return s / k
    }),
  )
}

// What the lab shows for each shrink factor, worked out once
export type Rebuild = { f: Factor; plan: Plan; floor: Grid; numbers: number; fewer: number; close: number; far: number }

export const REBUILDS: Record<Factor, Rebuild> = Object.fromEntries(
  FACTORS.map((f) => {
    const plan = encode(FLOOR, f)
    const floor = decode(plan)
    const numbers = planNumbers(plan)
    return [f, { f, plan, floor, numbers, fewer: FLOOR_TILES / numbers, close: rms(FLOOR, floor), far: rms(blur(FLOOR), blur(floor)) }]
  }),
) as Record<Factor, Rebuild>

export const STORY = REBUILDS[STORY_F]
export const PLAN_NOTES = STORY.numbers
export const STORY_FEWER = STORY.fewer
// A share, "11%"
export const pct = (share: number) => `${Math.round(100 * share)}%`

// The plan's notes drawn as four small greyscale grids, each scaled to 0..1:
// brightness as it is, the two slopes with flat at ½, grain from none to the
// most any patch has
export function planImages(plan: Plan): Grid[] {
  const all = plan.notes.flat()
  const reach = Math.max(...all.flatMap((n) => [Math.abs(n[1]), Math.abs(n[2])]), 1e-9)
  const most = Math.max(...all.map((n) => n[3]), 1e-9)
  return [0, 1, 2, 3].map((k) =>
    plan.notes.map((row) =>
      row.map((n) => (k === 0 ? clamp01(n[0]) : k === 3 ? n[3] / most : 0.5 + n[k] / (2 * reach))),
    ),
  )
}

export const STORY_PLAN_IMAGES = planImages(STORY.plan)

// ---------------------------------------------------------------------------
// The passes, scripted: what a grid looks like after pass k of PASSES, from
// random shades at the start to the target at the end. Only a picture of the
// effort: the real steps are the denoiser's (see the diffusion models page).

export function noiseFor(seed: number, side: number): Grid {
  const random = seeded(seed)
  // Roughly normal: the sum of three uniforms, centred
  return Array.from({ length: side }, () => Array.from({ length: side }, () => (random() + random() + random() - 1.5) * 0.6))
}

export function afterPass(target: Grid, noise: Grid, k: number, passes = PASSES): Grid {
  const kept = Math.sin((Math.PI / 2) * Math.min(1, k / passes))
  const left = Math.sqrt(1 - kept * kept)
  return target.map((row, i) => row.map((v, j) => clamp01(0.5 + kept * (v - 0.5) + left * noise[i][j])))
}

export const FLOOR_NOISE = noiseFor(21, SIDE)
export const PLAN_NOISE = [0, 1, 2, 3].map((k) => noiseFor(31 + k, SIDE / STORY_F))

// ---------------------------------------------------------------------------
// The closing comparison

export const TIMELINE = [
  { year: 2014, what: 'GAN, VAE' },
  { year: 2020, what: 'DDPM' },
  { year: 2021, what: 'Guidance' },
  { year: 2022, what: 'Stable Diffusion' },
] as const

export type Family = { name: string; to: string; speed: string; quality: string; variety: string; weak: ('speed' | 'quality' | 'variety')[] }

export const FAMILIES: Family[] = [
  { name: 'GAN', to: '/learnings/gans', speed: '1 pass', quality: 'Sharp', variety: 'Can collapse', weak: ['variety'] },
  { name: 'VAE', to: '/learnings/variational-autoencoders', speed: '1 pass', quality: 'Blurry', variety: 'Covers all', weak: ['quality'] },
  { name: 'Diffusion', to: '/learnings/diffusion-models', speed: '20–1,000 full-size passes', quality: 'Sharp', variety: 'Covers all', weak: ['speed'] },
  { name: 'Latent diffusion', to: '/learnings/latent-diffusion', speed: '20–50 small passes', quality: 'Sharp', variety: 'Covers all', weak: [] },
]
