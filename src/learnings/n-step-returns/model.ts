import { seeded } from '../../components/explain/random'

// A hike to a hut along ten legs, in fog, and learning the minutes left
// from each signpost with n-step returns: walk n legs, add up the minutes,
// then trust the guess chalked on the post you reach.

// The usual minutes for each leg, from the trailhead (post 0) to the hut
// (post 10)
export const LEGS = [6, 8, 5, 7, 9, 6, 4, 8, 7, 5]
export const HUT = LEGS.length
// The chance, at any post after the first, of taking a wrong fork: you walk
// as long as the leg would take and come out at the post before
export const LOST = 0.3

// One leg's minutes: within 30% of its usual time either way
export const legMinutes = (leg: number, random: () => number) => LEGS[leg] * (0.7 + 0.6 * random())

// One hike: the posts you stand at, from the trailhead to the hut, and the
// minutes each leg took
export interface Hike {
  posts: number[]
  minutes: number[]
}

export function hike(random: () => number): Hike {
  const posts = [0]
  const minutes: number[] = []
  for (let at = 0; at !== HUT; ) {
    minutes.push(legMinutes(at, random))
    at = at > 0 && random() < LOST ? at - 1 : at + 1
    posts.push(at)
  }
  return { posts, minutes }
}

// The true minutes left from each post (the hut is 0): the leg's usual
// time, plus where it takes you, averaged over the wrong forks. Repeated
// until it stops changing.
export function minutesLeft(): number[] {
  const values = Array<number>(HUT + 1).fill(0)
  for (let pass = 0; pass < 100_000; pass++) {
    let change = 0
    for (let post = HUT - 1; post >= 0; post--) {
      const ahead = values[post + 1]
      const value = LEGS[post] + (post > 0 ? LOST * values[post - 1] + (1 - LOST) * ahead : ahead)
      change = Math.max(change, Math.abs(value - values[post]))
      values[post] = value
    }
    if (change < 1e-10) break
  }
  return values
}

export const TRUE = minutesLeft()

// Walk to the hut whatever happens: n is as large as a hike can be long
export const ALL = Infinity

// The n-step return from the t-th post of a hike: the minutes of the next
// n legs, then the guess chalked on the post they reach. If the hike ends
// first, it is all the minutes to the hut and no guess: Monte Carlo.
export function nStepReturn({ posts, minutes }: Hike, t: number, n: number, chalk: number[]): number {
  const end = Math.min(minutes.length, t + n)
  let total = 0
  for (let k = t; k < end; k++) total += minutes[k]
  return end < minutes.length ? total + chalk[posts[end]] : total
}

// Learn from one hike, as you walk it: n legs after each post, its chalk
// moves a step of the way toward that post's n-step return
export function learnHike(chalk: number[], walked: Hike, n: number, step: number): number[] {
  const next = [...chalk]
  for (let t = 0; t < walked.minutes.length; t++) {
    const post = walked.posts[t]
    next[post] += step * (nStepReturn(walked, t, n, next) - next[post])
  }
  return next
}

// Every post starts with the same rough guess, the hut with 0
export const FIRST_GUESS = 100
export const firstChalk = () => [...Array<number>(HUT).fill(FIRST_GUESS), 0]

// How far the chalk is from the truth: the root mean square over the posts
export const miss = (chalk: number[]) =>
  Math.sqrt(TRUE.slice(0, HUT).reduce((total, value, post) => total + (chalk[post] - value) ** 2, 0) / HUT)

// The chalk after each of `hikes` hikes, from the first guess
export function learnRun(random: () => number, n: number, step: number, hikes: number): number[][] {
  const chalks = [firstChalk()]
  for (let i = 0; i < hikes; i++) chalks.push(learnHike(chalks[i], hike(random), n, step))
  return chalks
}

// The settings of the figure to learn with, and the guess at the top
export const STEP = 0.15
export const HIKES = 10
export const RUNS = 200
export const NS = [1, 2, 3, 4, 6, 8, 16, ALL] as const
export const showN = (n: number) => (n === ALL ? 'all' : String(n))

// The miss after `hikes` hikes, averaged over `runs` runs. Each n walks the
// same hikes, so the only difference is n.
export function missAfter(n: number, runs = RUNS, hikes = HIKES, step = STEP): number {
  let total = 0
  for (let run = 0; run < runs; run++) total += miss(learnRun(seeded(run + 1), n, step, hikes)[hikes])
  return total / runs
}

// The run the figure to learn with shows, the same hikes for every n, and
// the miss after ten hikes for every n, averaged over 200 runs
export const SHOWN_RUN = 1
export const AVERAGE_MISS = NS.map((n) => ({ n, miss: missAfter(n) }))
export const BEST = AVERAGE_MISS.reduce((a, b) => (b.miss < a.miss ? b : a))

// Two ways to be wrong: the n-step returns from the trailhead over many
// hikes when every chalk mark is a fifth too low
export const LOW = 0.8
export const lowChalk = () => TRUE.map((value) => value * LOW)

export function trailheadReturns(random: () => number, n: number, count: number, chalk = lowChalk()): number[] {
  return Array.from({ length: count }, () => nStepReturn(hike(random), 0, n, chalk))
}

export function spread(values: number[]) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const sd = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length)
  return { mean, sd }
}

// The figure's columns: each n's returns for the trailhead over 150 hikes
export const STRIP_NS = [1, 2, 4, 8, 16, ALL] as const
export const STRIP_HIKES = 150
export const STRIP_SEED = 4
export const COLUMNS = STRIP_NS.map((n, i) => {
  const returns = trailheadReturns(seeded(STRIP_SEED + i), n, STRIP_HIKES)
  return { n, returns, ...spread(returns) }
})

// The story's hike, by hand: the trailhead's chalk, checked three ways
export const STORY = {
  // What each post's chalk said before the hike
  chalk: [150, 140, 130, 115, 100, 80, 65, 50, 30, 15, 0],
  // The first three legs, in minutes
  legs: [7, 9, 5],
  // The whole hike, with one wrong fork, in minutes
  whole: 168,
}
export const storyReturn = (n: number) =>
  n >= HUT ? STORY.whole : STORY.legs.slice(0, n).reduce((a, b) => a + b, 0) + STORY.chalk[n]

// λ-returns: the weight on the n-step return
export const lambdaWeight = (lambda: number, n: number) => (1 - lambda) * lambda ** (n - 1)
