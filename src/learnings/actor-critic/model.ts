import { seeded } from '../../components/explain/random'
import {
  after,
  chancesAt,
  copy,
  fishChance,
  FORKS,
  fresh,
  lunches as reinforceLunches,
  logGradient,
  RIGHT,
  LEFT,
  SPREAD,
  STALL_MEAN,
  worth,
  type Habits,
} from '../reinforce/model'

// The same hill as the REINFORCE page, learned another way. Beside the
// habits (the actor) you keep a feel for each fork (the critic): the lunch
// you expect from there, V(s). After every turn, the critic judges it at
// once: δ = r + V(where you are now) − V(where you were), with r the
// rating when the turn reaches a stall and 0 before, and V of a stall 0.
// The turn's habit moves by δ, and so does the critic's guess.

// The critic's guesses, one per fork
export type Feel = number[]

// What every fork is worth with even odds at every fork: the feel you'd
// have after many walks before you started learning
export const evenFeel = (): Feel => worth(fresh()).v

export interface Judged {
  fork: number
  turn: number
  // Where the turn led: a fork, or a stall (and its rating)
  next: number | null
  stall: number | null
  reward: number
  // The critic's guess here and there before the turn was judged, and the verdict
  here: number
  there: number
  delta: number
  // Actor and critic once this turn is learned from
  habits: Habits
  feel: Feel
}

export interface Walk {
  steps: Judged[]
  stall: number
  score: number
  // Actor and critic once this walk is learned from
  habits: Habits
  feel: Feel
}

export interface Settings {
  alpha: number
  beta: number
  // The critic's guesses to start from
  feel?: Feel
  // Fixed walks for a story: turns, and the rating at the end
  script?: { turns: number[]; score: number }[]
}

// One walk, learning after every turn: the critic's verdict δ moves the
// turn's habit (by α δ ∇ log π) and the critic's own guess (by β δ)
export function walkAndLearn(habits: Habits, feel: Feel, random: () => number, alpha: number, beta: number, script?: { turns: number[]; score: number }): Walk {
  const h = copy(habits)
  const v = [...feel]
  const steps: Judged[] = []
  let fork = 0
  for (let t = 0; ; t++) {
    const pi = chancesAt(h, fork)
    const turn = script ? script.turns[t] : random() < pi[RIGHT] ? RIGHT : LEFT
    const there = after(fork, turn)
    const stall = 'stall' in there ? there.stall : null
    const reward =
      stall === null
        ? 0
        : script
          ? script.score
          : STALL_MEAN[stall] + Math.floor(random() * (2 * SPREAD + 1)) - SPREAD
    const next = 'fork' in there ? there.fork : null
    const here = v[fork]
    const ahead = next === null ? 0 : v[next]
    const delta = reward + ahead - here
    logGradient(pi, turn).forEach((g, a) => {
      h[fork][a] += alpha * delta * g
    })
    v[fork] += beta * delta
    steps.push({ fork, turn, next, stall, reward, here, there: ahead, delta, habits: copy(h), feel: [...v] })
    if (stall !== null) return { steps, stall, score: reward, habits: h, feel: v }
    fork = next!
  }
}

export function actorCritic(random: () => number, count: number, settings: Settings): Walk[] {
  let habits = fresh()
  let feel = settings.feel ?? Array<number>(FORKS).fill(0)
  const walks: Walk[] = []
  for (let day = 0; day < count; day++) {
    const walk = walkAndLearn(habits, feel, random, settings.alpha, settings.beta, settings.script?.[day])
    habits = walk.habits
    feel = walk.feel
    walks.push(walk)
  }
  return walks
}

// ——— The story ———

export const STORY_ALPHA = 0.1
export const STORY_BETA = 0.2
export const STORY_LUNCHES = 150
// The walk from the guess: left at the top, onto the poorer side of the
// hill, then right, right, right to the dumplings, and a lucky 8
export const SCRIPT = [{ turns: [LEFT, RIGHT, RIGHT, RIGHT], score: 8 }]
// Picked so you end where most people do: about nine lunches in ten at the fish
export const STORY_SEED = 2
export const story = () =>
  actorCritic(seeded(STORY_SEED), STORY_LUNCHES, { alpha: STORY_ALPHA, beta: STORY_BETA, feel: evenFeel(), script: SCRIPT })

// ——— Many learners ———

// Where the critic starts: what every fork is worth at even habits (as
// if from earlier walks), a flat 5 everywhere, or 0 everywhere
export const STARTS = ['From earlier walks', 'At 5', 'At 0'] as const
export type Start = (typeof STARTS)[number]
export const startFeel = (start: Start): Feel =>
  start === 'From earlier walks' ? evenFeel() : Array<number>(FORKS).fill(start === 'At 5' ? 5 : 0)

// For each lunch, the chance of ending at the fish stall, averaged over
// `learners` people: by REINFORCE with the usual as its baseline, or by
// an actor–critic whose critic starts at `start`
export function curve(method: 'REINFORCE' | Start, learners: number, count: number, alpha: number, seed: number, beta = STORY_BETA): number[] {
  const random = seeded(seed)
  const total = Array<number>(count).fill(0)
  for (let p = 0; p < learners; p++) {
    const habits =
      method === 'REINFORCE'
        ? reinforceLunches(random, count, { alpha }).map((day) => day.habits)
        : actorCritic(random, count, { alpha, beta, feel: startFeel(method) }).map((walk) => walk.habits)
    habits.forEach((h, i) => {
      total[i] += fishChance(h)
    })
  }
  return total.map((t) => t / learners)
}

// ——— The bandit version: a critic for a single choice ———

// One stall, one lunch: the push REINFORCE gives (today's rating minus the
// usual) and the one a critic gives (the stall's running score minus the usual)
export const pushes = (today: number, stallScore: number, usual: number) => ({
  raw: today - usual,
  critic: stallScore - usual,
})
