// A shower with a dial: any setting from 0 (cold) to 100 (hot), and a habit
// that learns where to put it. A one-step task, so the critic's target is
// the reward itself; the actor climbs the critic's slope.

import { seeded } from '../../components/explain/random'

// The dial, from 0 to 100, and the same in the learner's units, from −1 to 1
export const toUnit = (dial: number) => (dial - 50) / 50
export const toDial = (unit: number) => 50 + 50 * unit
const clamp = (x: number, low = -1, high = 1) => Math.min(high, Math.max(low, x))

// The best setting on a morning `cold` from 0 (mild) to 1 (freezing)
export const bestDial = (cold: number) => 25 + 60 * cold

// How good a shower feels: 0 at the best setting, worse the farther off
export const comfort = (cold: number, dial: number) => -((toUnit(dial) - toUnit(bestDial(cold))) ** 2)

// ---------------------------------------------------------------------------
// The story: one cold morning, a feel for it already learned, and a habit
// nudged uphill on that feel, half the way each morning

export const STORY = { cold: 0.75, habit: 30, step: 0.25 }
export const PEAK = bestDial(STORY.cold)

// The slope of the feel at a setting, per unit of the learner's scale
export const slope = (dial: number) => -2 * (toUnit(dial) - toUnit(PEAK))

// The habit morning by morning: each moves it `step` × slope, in the
// learner's units
export function climb(mornings: number, habit = STORY.habit, step = STORY.step): number[] {
  const habits = [habit]
  for (let i = 0; i < mornings; i++) habits.push(toDial(toUnit(habits[i]) + step * slope(habits[i])))
  return habits
}

// ---------------------------------------------------------------------------
// The whole thing, for every kind of morning: an actor μ(cold) = θ₀ + θ₁·cold
// (in the learner's units, clipped to the dial), and a critic that guesses
// the comfort of any setting on any morning from six features.

export const features = (cold: number, unit: number) => [1, cold, cold * cold, unit, unit * cold, unit * unit]

export const actorAt = (theta: number[], cold: number) => clamp(theta[0] + theta[1] * cold)

export const criticAt = (w: number[], cold: number, unit: number) =>
  features(cold, unit).reduce((sum, f, i) => sum + f * w[i], 0)

// How the critic's guess changes as the setting rises, at `unit`
export const criticSlope = (w: number[], cold: number, unit: number) => w[3] + w[4] * cold + 2 * w[5] * unit

export const LEARNER = {
  // The habit it starts with: hotter on mild mornings, the wrong way round
  start: [0.6, -0.6],
  showers: 800,
  batch: 16,
  criticStep: 0.5,
  actorStep: 0.2,
  // Keep a snapshot every this many showers, for the figure
  every: 10,
}

// How far off a setting it tries, in dial units, as the figure offers them
export const NOISES = { None: 0, Small: 5, Large: 15 } as const
export type Noise = keyof typeof NOISES

export interface Snapshot {
  shower: number
  theta: number[]
  w: number[]
  // The settings it tried lately, as [cold, dial]
  tried: [number, number][]
}

// A normal draw from two uniform ones
const normal = (random: () => number) => Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random())

// The learner taking `showers` showers, one a morning on a random kind of
// morning: it sets the dial at its habit plus noise of `noise` dial units,
// keeps every shower in a notebook, and after each one learns from a
// handful picked at random. The critic moves toward each shower's comfort;
// the actor moves its setting up the critic's slope.
export function learn(noise: number, seed = 3, showers = LEARNER.showers): Snapshot[] {
  const random = seeded(seed)
  const theta = [...LEARNER.start]
  const w = Array<number>(6).fill(0)
  const notebook: [number, number, number][] = []
  const snapshots: Snapshot[] = [{ shower: 0, theta: [...theta], w: [...w], tried: [] }]
  for (let t = 1; t <= showers; t++) {
    const cold = random()
    const unit = clamp(actorAt(theta, cold) + (noise / 50) * normal(random))
    notebook.push([cold, unit, comfort(cold, toDial(unit))])

    const picked = Array.from({ length: LEARNER.batch }, () => notebook[Math.floor(random() * notebook.length)])
    const push = Array<number>(6).fill(0)
    for (const [c, u, r] of picked) {
      const error = r - criticAt(w, c, u)
      features(c, u).forEach((f, i) => (push[i] += error * f))
    }
    w.forEach((_, i) => (w[i] += (LEARNER.criticStep * push[i]) / LEARNER.batch))

    const climb = [0, 0]
    for (const [c] of picked) {
      const up = criticSlope(w, c, actorAt(theta, c))
      climb[0] += up
      climb[1] += up * c
    }
    theta[0] += (LEARNER.actorStep * climb[0]) / LEARNER.batch
    theta[1] += (LEARNER.actorStep * climb[1]) / LEARNER.batch

    if (t % LEARNER.every === 0) {
      snapshots.push({
        shower: t,
        theta: [...theta],
        w: [...w],
        tried: notebook.slice(-40).map(([c, u]) => [c, toDial(u)]),
      })
    }
  }
  return snapshots
}

// How far the habit is from the best setting, in dial units, averaged over
// mornings from mild to freezing
export function missedBy(theta: number[]): number {
  const colds = Array.from({ length: 21 }, (_, i) => i / 20)
  return colds.reduce((sum, c) => sum + Math.abs(toDial(actorAt(theta, c)) - bestDial(c)), 0) / colds.length
}

// ---------------------------------------------------------------------------
// The guess: trying `per` evenly spaced settings for each of `joints`
// joints means trying every combination
export const combinations = (per: number, joints: number) => per ** joints
