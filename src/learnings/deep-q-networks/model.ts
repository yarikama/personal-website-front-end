// Learning guesses with a rule instead of a table, and why aiming at your
// own guess can run away. The scene: the drive home from a pier whose only
// road goes round a lake to the far shore, then home.

import { seeded } from '../../components/explain/random'

// Miles from home as the crow flies, and minutes of driving
export const LAKE = {
  // The pier is close as the crow flies...
  pier: 0.5,
  // ...but its road goes round the lake to the far shore, which is farther
  shore: 1,
  // Minutes from the pier to the far shore, and from the far shore home
  toShore: 4,
  home: 6,
}

// The true drive, in minutes, from each place
export const TRUTH = { pier: LAKE.toShore + LAKE.home, shore: LAKE.home }

// The story's rule of thumb: k minutes for every mile from home. It starts
// at 4, and every nudge moves k by `STEP` × (target − guess) × miles.
export const START_K = 4
export const STEP = 0.4

export const guess = (k: number, miles: number) => k * miles

// What the pier's guess is checked against: the drive to the far shore,
// plus the guess from there, made with the knob `k` (the live one, or a
// copy of it)
export const pierTarget = (k: number) => LAKE.toShore + guess(k, LAKE.shore)

// One nudge from a pier drive: toward the target made with `aim`
export const nudgePier = (k: number, aim: number, step = STEP) =>
  k + step * (pierTarget(aim) - guess(k, LAKE.pier)) * LAKE.pier

// One nudge from a far-shore drive: its target is the real drive home
export const nudgeShore = (k: number, step = STEP) => k + step * (LAKE.home - guess(k, LAKE.shore)) * LAKE.shore

// The knob after each of `nudges` pier drives, aiming at the live guess:
// the target moves with every nudge. Starts with `k`.
export function chase(nudges: number, k = START_K): number[] {
  const ks = [k]
  for (let i = 0; i < nudges; i++) ks.push(nudgePier(ks[i], ks[i]))
  return ks
}

// The same, but aiming at a copy of the knob written down before the first
// nudge: the target holds still
export function frozen(nudges: number, k = START_K, note = k): number[] {
  const ks = [k]
  for (let i = 0; i < nudges; i++) ks.push(nudgePier(ks[i], note))
  return ks
}

// Learning from a notebook that holds pier drives and far-shore drives
// half and half, each nudge the average of one of each (what a handful
// picked at random comes to), aiming at a copy refreshed every `refresh`
// nudges
export function notebook(nudges: number, k: number, refresh = 10): number[] {
  const ks = [k]
  let note = k
  for (let i = 0; i < nudges; i++) {
    if (i > 0 && i % refresh === 0) note = ks[i]
    const fromPier = nudgePier(ks[i], note) - ks[i]
    const fromShore = nudgeShore(ks[i]) - ks[i]
    ks.push(ks[i] + (fromPier + fromShore) / 2)
  }
  return ks
}

// Where one knob settles on that notebook: the k whose pier and far-shore
// errors balance, ½·½(4 + k − ½k) + ½(6 − k) = 0
export const SETTLED_K =
  (LAKE.pier * LAKE.toShore + LAKE.shore * LAKE.home) / (LAKE.shore ** 2 - LAKE.pier * LAKE.shore + LAKE.pier ** 2)

// How far the pier's guess is below its target
export const gap = (k: number, aim: number) => pierTarget(aim) - guess(k, LAKE.pier)

// The story's runs: chasing, then a written-down copy, then the notebook
export const STORY = (() => {
  const chased = chase(10)
  const held = frozen(40)
  const mixed = notebook(60, held.at(-1)!)
  return { chased, held, mixed }
})()

// ---------------------------------------------------------------------------
// Two knobs: k for every mile, plus c, a correction for the far shore alone.
// Now the rule can be exactly right (k = 20, c = −14 gives 10 and 6), and the
// question is only whether learning gets there.

export type Aim = 'moving' | 'frozen'

export const KNOBS = {
  // Features: miles from home, and 1 at the far shore
  pier: [LAKE.pier, 0],
  shore: [LAKE.shore, 1],
  start: [START_K, 0],
  step: 1,
  batch: 8,
  // Drives learned from before the copy is refreshed
  refresh: 50,
  updates: 400,
  // Beyond this a guess has blown up, and the run stops
  limit: 1000,
}

const dot = (w: number[], x: number[]) => w[0] * x[0] + w[1] * x[1]

export interface TwoKnobRun {
  // The guesses after each update (index 0 is before any)
  pier: number[]
  shore: number[]
  // Updates after which the copy was refreshed
  refreshes: number[]
  // The update at which a guess passed the limit, or null
  blewUp: number | null
}

// Learning both knobs from a notebook of drives, `shoreShare` of them from
// the far shore, a handful at random each update. The pier's target is the
// drive to the far shore plus the far shore's guess, made with the live
// knobs (`moving`) or with a copy refreshed every `refresh` updates
// (`frozen`).
export function twoKnobs(aim: Aim, shoreShare: number, seed = 1, updates = KNOBS.updates): TwoKnobRun {
  const random = seeded(seed)
  let w = [...KNOBS.start]
  let copy = [...w]
  const run: TwoKnobRun = { pier: [dot(w, KNOBS.pier)], shore: [dot(w, KNOBS.shore)], refreshes: [], blewUp: null }
  for (let t = 1; t <= updates; t++) {
    const knobs = aim === 'moving' ? w : copy
    const push = [0, 0]
    for (let i = 0; i < KNOBS.batch; i++) {
      const fromShore = random() < shoreShare
      const x = fromShore ? KNOBS.shore : KNOBS.pier
      const target = fromShore ? LAKE.home : LAKE.toShore + dot(knobs, KNOBS.shore)
      const error = target - dot(w, x)
      push[0] += error * x[0]
      push[1] += error * x[1]
    }
    w = w.map((v, i) => v + (KNOBS.step * push[i]) / KNOBS.batch)
    if (aim === 'frozen' && t % KNOBS.refresh === 0) {
      copy = [...w]
      run.refreshes.push(t)
    }
    run.pier.push(dot(w, KNOBS.pier))
    run.shore.push(dot(w, KNOBS.shore))
    if (Math.abs(run.pier[t]) > KNOBS.limit || Math.abs(run.shore[t]) > KNOBS.limit) {
      run.blewUp = t
      break
    }
  }
  return run
}

// The notebook's mixes, as the figure offers them
export const SHARES = { Half: 0.5, '1 in 10': 0.1, None: 0 } as const
export type Share = keyof typeof SHARES

// ---------------------------------------------------------------------------
// An Atari screen: 210 × 160 pixels, each one of 128 colours. How many
// screens, as a power of ten
export const ATARI = { width: 210, height: 160, colours: 128 }
export const screensPowerOfTen = () => ATARI.width * ATARI.height * Math.log10(ATARI.colours)
