import { softmax } from './bandit'
import { seeded } from './random'

// The hill: from your office at the top, lanes fork four times on the way
// down to the harbour, where five stalls sell lunch. At each fork you turn
// left or right by habit (a preference for each turn, made into chances by
// softmax), and where you end up is how many times you turned right. A
// lunch is rated when you get there; nothing else pays. That is a small
// Markov decision process: the forks are its states, the turns its
// actions, and the rating the return of the episode.

export const ROWS = 4
export const LEFT = 0
export const RIGHT = 1
export const TURNS = ['left', 'right'] as const
export const STALLS = ['Soup', 'Salad', 'Noodles', 'Dumplings', 'Fish'] as const
export const FISH = 4
// The stalls in a sentence
export const PLACES = ['the soup kitchen', 'the salad bar', 'the noodle bar', 'the dumpling stall', 'the fish stall']
// What each stall's lunch rates, as a rule; any one lunch is off by up to
// SPREAD either way, one of the five whole numbers equally likely
export const STALL_MEAN = [3, 2, 5, 6, 8]
export const SPREAD = 2

// Forks by row, from the top: row r has r + 1 of them, numbered from the left
export const FORKS = (ROWS * (ROWS + 1)) / 2
export const forkAt = (row: number, k: number) => (row * (row + 1)) / 2 + k
export function placeOf(fork: number): { row: number; k: number } {
  let row = 0
  while (forkAt(row + 1, 0) <= fork) row += 1
  return { row, k: fork - forkAt(row, 0) }
}

// Where a turn from a fork leads: the next fork, or a stall at the bottom
export function after(fork: number, turn: number): { fork: number } | { stall: number } {
  const { row, k } = placeOf(fork)
  return row + 1 < ROWS ? { fork: forkAt(row + 1, k + turn) } : { stall: k + turn }
}

// Habits: a preference for each turn at each fork, all 0 to start (even odds)
export type Habits = number[][]
export const fresh = (): Habits => Array.from({ length: FORKS }, () => [0, 0])
export const chancesAt = (habits: Habits, fork: number) => softmax(habits[fork])
export const copy = (habits: Habits): Habits => habits.map((h) => [...h])

// ——— Worked out exactly, from the habits ———

// How likely you are to pass each fork on a walk (η), and to end at each stall
export function reach(habits: Habits): { forks: number[]; stalls: number[] } {
  const forks = Array<number>(FORKS).fill(0)
  const stalls = Array<number>(STALLS.length).fill(0)
  forks[0] = 1
  for (let fork = 0; fork < FORKS; fork++) {
    const pi = chancesAt(habits, fork)
    for (const turn of [LEFT, RIGHT]) {
      const there = after(fork, turn)
      if ('fork' in there) forks[there.fork] += forks[fork] * pi[turn]
      else stalls[there.stall] += forks[fork] * pi[turn]
    }
  }
  return { forks, stalls }
}

// What each fork is worth with these habits, v(s), and each turn there,
// q(s, a): the lunch you can expect from it, on average
export function worth(habits: Habits): { v: number[]; q: number[][] } {
  const v = Array<number>(FORKS).fill(0)
  const q = Array.from({ length: FORKS }, () => [0, 0])
  for (let fork = FORKS - 1; fork >= 0; fork--) {
    const pi = chancesAt(habits, fork)
    for (const turn of [LEFT, RIGHT]) {
      const there = after(fork, turn)
      q[fork][turn] = 'fork' in there ? v[there.fork] : STALL_MEAN[there.stall]
    }
    v[fork] = pi[LEFT] * q[fork][LEFT] + pi[RIGHT] * q[fork][RIGHT]
  }
  return { v, q }
}

// The lunch you can expect on a walk: the objective, J
export const expected = (habits: Habits) => worth(habits).v[0]

// The policy gradient theorem, for this hill: how J changes as you nudge
// h(s, b), without differentiating how often you reach each fork:
// η(s) Σ_a q(s, a) ∂π(a|s)/∂h(s, b), which for softmax is
// η(s) π(b|s) (q(s, b) − v(s))
export function gradient(habits: Habits): number[][] {
  const { forks } = reach(habits)
  const { v, q } = worth(habits)
  return habits.map((_, fork) => {
    const pi = chancesAt(habits, fork)
    return [LEFT, RIGHT].map((b) => forks[fork] * pi[b] * (q[fork][b] - v[fork]))
  })
}

// The chance of ending at the fish stall: right at all four forks
export const fishChance = (habits: Habits) => reach(habits).stalls[FISH]

// ——— A walk, and learning from it ———

export interface Lunch {
  // The forks passed, the turn taken at each, the stall and the rating
  forks: number[]
  turns: number[]
  stall: number
  score: number
}

export function walk(habits: Habits, random: () => number): Lunch {
  const forks: number[] = []
  const turns: number[] = []
  let fork = 0
  for (;;) {
    const turn = random() < chancesAt(habits, fork)[RIGHT] ? RIGHT : LEFT
    forks.push(fork)
    turns.push(turn)
    const there = after(fork, turn)
    if ('stall' in there) {
      const score = STALL_MEAN[there.stall] + Math.floor(random() * (2 * SPREAD + 1)) - SPREAD
      return { forks, turns, stall: there.stall, score }
    }
    fork = there.fork
  }
}

// A walk with its turns fixed, for a story; the rating is given too
export function scripted(turns: number[], score: number): Lunch {
  const forks: number[] = []
  let fork = 0
  for (const turn of turns) {
    forks.push(fork)
    const there = after(fork, turn)
    if ('stall' in there) return { forks, turns, stall: there.stall, score }
    fork = there.fork
  }
  throw new Error('A walk takes four turns')
}

// One step's ∇ log π for softmax preferences, at the fork it was taken:
// 1 − π for the turn taken, −π for the other
export const logGradient = (pi: number[], turn: number) => pi.map((p, a) => (a === turn ? 1 : 0) - p)

// REINFORCE, once the lunch is over: at every fork you passed, each turn's
// habit moves by step × (rating − baseline) × ∇ log π of the turn you took.
// Every turn gets the same credit, since only the end pays. Returns the
// habits after.
export function reinforce(habits: Habits, lunch: Lunch, alpha: number, baseline: number): Habits {
  const next = copy(habits)
  lunch.forks.forEach((fork, t) => {
    const pi = chancesAt(habits, fork)
    logGradient(pi, lunch.turns[t]).forEach((g, a) => {
      next[fork][a] += alpha * (lunch.score - baseline) * g
    })
  })
  return next
}

export interface Day extends Lunch {
  // The usual rating, counting this one (or 0 with no baseline), and how
  // this lunch compares with it
  usual: number
  surprise: number
  // The habits once this lunch is learned from
  habits: Habits
}

// Lunch after lunch, learning by REINFORCE. `script` fixes the first walks
// and their ratings, for a story told with fixed numbers.
export function lunches(
  random: () => number,
  count: number,
  { alpha = STORY_ALPHA, baseline = true, script = [] as { turns: number[]; score: number }[] } = {}
): Day[] {
  let habits = fresh()
  let usual = 0
  const days: Day[] = []
  for (let day = 0; day < count; day++) {
    const lunch = script[day] ? scripted(script[day].turns, script[day].score) : walk(habits, random)
    // As on the bandit page, the usual counts this lunch
    usual += (lunch.score - usual) / (day + 1)
    const against = baseline ? usual : 0
    habits = reinforce(habits, lunch, alpha, against)
    days.push({ ...lunch, usual: baseline ? usual : 0, surprise: lunch.score - against, habits })
  }
  return days
}

// ——— The story ———

export const STORY_ALPHA = 0.1
export const STORY_LUNCHES = 150
// Monday sets the usual; Tuesday is worse; Wednesday better, with one left
// turn in it that keeps you from the fish
export const SCRIPT = [
  { turns: [LEFT, RIGHT, LEFT, RIGHT], score: 5 },
  { turns: [LEFT, LEFT, RIGHT, LEFT], score: 2 },
  { turns: [RIGHT, LEFT, RIGHT, RIGHT], score: 8 },
]
// Picked so you end where most people do: about nine lunches in ten at the fish
export const STORY_SEED = 19
export const story = () => lunches(seeded(STORY_SEED), STORY_LUNCHES, { script: SCRIPT })

// ——— How noisy one walk's estimate is ———

// One walk's estimate of the slope of J along the top fork's "right"
// habit: (rating − baseline) × (1{right} − π(right)). Averaged over many
// walks it is the true slope, whatever the baseline.
export const TOP = 0
// Picked so each setting's average lands near the true slope, as it does on average
export const SPREAD_SEED = 8
export function estimates(habits: Habits, baseline: number, walks: number, each: number, seed: number): number[] {
  const random = seeded(seed)
  return Array.from({ length: walks }, () => {
    let sum = 0
    for (let i = 0; i < each; i++) {
      const lunch = walk(habits, random)
      const pi = chancesAt(habits, TOP)
      sum += (lunch.score - baseline) * logGradient(pi, lunch.turns[0])[RIGHT]
    }
    return sum / each
  })
}

export const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length
export const spread = (values: number[]) => {
  const m = mean(values)
  return Math.sqrt(values.reduce((sum, v) => sum + (v - m) ** 2, 0) / values.length)
}

// ——— Many learners ———

// For each lunch, the chance of ending at the fish stall, averaged over
// `learners` people each learning their own way
export function curve(learners: number, count: number, alpha: number, baseline: boolean, seed: number): number[] {
  const random = seeded(seed)
  const total = Array<number>(count).fill(0)
  for (let p = 0; p < learners; p++) {
    lunches(random, count, { alpha, baseline }).forEach((day, i) => {
      total[i] += fishChance(day.habits)
    })
  }
  return total.map((t) => t / learners)
}

// "62%"
export const percent = (share: number) => `${Math.round(share * 100)}%`
// "+0.15", "−0.30"
export const signed = (value: number, digits = 2) => `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(digits)}`
