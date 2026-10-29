import { seeded } from '../../components/explain/random'

// A juice stall at a market, and two ways to learn how much to stock.
//
// Each morning you top up a fridge that holds FRIDGE bottles. You know
// exactly what topping up does: the bottles left from yesterday plus the
// bottles you buy are what you open with. What you don't know is the day:
// how many people want a bottle, and how many leftovers go off overnight.
// A customer you can't serve and a bottle that goes off each cost one
// bottle, so a day costs between 0 and a handful.
//
// One learner keeps a score for every pair (bottles left, bottles you open
// with): Q(s, a), the usual way. The other keeps a score for every number
// of bottles you open with, the situation right after your move and before
// the day answers it: the afterstate. Every pair that opens with 4 shares
// the one score for 4.

export const FRIDGE = 10
// Customers a day: any number from LOW to HIGH, all as likely
export const WANTED = { low: 2, high: 8 } as const
// The chance a leftover bottle goes off overnight
export const GO_OFF = 0.2
// How much tomorrow's losses count against today's
export const GAMMA = 0.8
// How often a learner stocks a random amount, to keep trying them all
export const EXPLORE = 0.1
export const DAYS = 200

export type Notebook = 'pairs' | 'shelf'

export const range = (low: number, high: number) => Array.from({ length: high - low + 1 }, (_, i) => low + i)

// The amounts you can open with when `left` bottles are left: from what you
// have (buying none) to a full fridge
export const choices = (left: number) => range(left, FRIDGE)

// How many values each notebook has to learn: a pair for every amount left
// and every amount you can open with, against one for every amount
export const pairsFor = (fridge: number) => ((fridge + 1) * (fridge + 2)) / 2
export const shelvesFor = (fridge: number) => fridge + 1
export const PAIRS = pairsFor(FRIDGE)
export const SHELVES = shelvesFor(FRIDGE)

export interface Day {
  left: number
  open: number
  wanted: number
  missed: number
  spoiled: number
  // What is left for the next morning
  next: number
  // Bottles lost: customers missed plus bottles gone off
  lost: number
  explored: boolean
}

// What the day does to a fridge opened with `open` bottles
export function playDay(open: number, random: () => number) {
  const wanted = WANTED.low + Math.floor(random() * (WANTED.high - WANTED.low + 1))
  const sold = Math.min(open, wanted)
  let spoiled = 0
  for (let bottle = 0; bottle < open - sold; bottle++) if (random() < GO_OFF) spoiled++
  return { wanted, missed: wanted - sold, spoiled, next: open - sold - spoiled }
}

// --- What every amount is really worth, worked out exactly ---

const choose = (n: number, k: number) => {
  let c = 1
  for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1)
  return c
}

// For a fridge opened with `open`: the bottles it loses on average, and the
// chance of each number left for the next morning
function exactly(open: number) {
  const days = WANTED.high - WANTED.low + 1
  let lost = 0
  const next = Array<number>(FRIDGE + 1).fill(0)
  for (let wanted = WANTED.low; wanted <= WANTED.high; wanted++) {
    const sold = Math.min(open, wanted)
    const kept = open - sold
    for (let spoiled = 0; spoiled <= kept; spoiled++) {
      const p = (choose(kept, spoiled) * GO_OFF ** spoiled * (1 - GO_OFF) ** (kept - spoiled)) / days
      lost += p * (wanted - sold + spoiled)
      next[kept - spoiled] += p
    }
  }
  return { lost, next }
}

export const EXACT = range(0, FRIDGE).map(exactly)

// The bottles a way of stocking loses a day in the long run: `policy` says
// what to open with for each number left
export function lossOf(policy: number[]): number {
  let share = Array<number>(FRIDGE + 1).fill(0)
  share[0] = 1
  for (let round = 0; round < 200; round++) {
    const after = Array<number>(FRIDGE + 1).fill(0)
    share.forEach((p, left) => EXACT[policy[left]].next.forEach((q, next) => (after[next] += p * q)))
    share = after
  }
  return share.reduce((sum, p, left) => sum + p * EXACT[policy[left]].lost, 0)
}

// The best values for each amount you open with (costs as negatives), by
// value iteration, and the best way to stock
function solve() {
  let values = Array<number>(FRIDGE + 1).fill(0)
  for (let round = 0; round < 400; round++) {
    values = values.map((_, open) => {
      const { lost, next } = EXACT[open]
      return -lost + GAMMA * next.reduce((sum, p, left) => sum + p * Math.max(...choices(left).map((o) => values[o])), 0)
    })
  }
  const policy = range(0, FRIDGE).map((left) => choices(left).reduce((best, o) => (values[o] > values[best] ? o : best)))
  return { values, policy }
}

export const BEST = solve()
export const BEST_LOSS = lossOf(BEST.policy)

// --- The two learners ---

export interface Run {
  days: Day[]
  // After each day (index 0 is before the first; with `every`, after every
  // `every` days), the score of every pair
  // (left, open), null until it has been learned from; for the shelf
  // notebook every pair with the same `open` reads its one shared score
  tables: (number | null)[][][]
  // After each day, how many times each pair (or shelf) has been learned from
  counts: number[][][]
}

const empty = <T,>(fill: () => T) => range(0, FRIDGE).map((left) => choices(left).map(fill))

// A learner that scores pairs or shelves, `days` days from an empty fridge.
// Every score starts at 0, which is hopeful when every day can only lose
// bottles: untried amounts look best, so each gets tried. After each day
// the score of what it chose moves toward what the day lost plus the best
// score it can choose tomorrow (as in Q-learning), by the plain average of
// all it has seen there (a step of 1/n).
export function learn(notebook: Notebook, seed: number, count = DAYS, every = 1): Run {
  const random = seeded(seed)
  const pairs = empty(() => 0)
  const shelves = Array<number>(FRIDGE + 1).fill(0)
  const pairSeen = empty(() => 0)
  const shelfSeen = Array<number>(FRIDGE + 1).fill(0)

  const score = (left: number, open: number) => (notebook === 'pairs' ? pairs[left][open - left] : shelves[open])
  const seen = (left: number, open: number) => (notebook === 'pairs' ? pairSeen[left][open - left] : shelfSeen[open])
  const best = (left: number) => Math.max(...choices(left).map((open) => score(left, open)))
  const snapshot = () => ({
    table: range(0, FRIDGE).map((left) => choices(left).map((open) => (seen(left, open) ? score(left, open) : null))),
    count: range(0, FRIDGE).map((left) => choices(left).map((open) => seen(left, open))),
  })

  const first = snapshot()
  const run: Run = { days: [], tables: [first.table], counts: [first.count] }
  let left = 0
  for (let d = 0; d < count; d++) {
    const options = choices(left)
    const explored = random() < EXPLORE
    let open: number
    if (explored) open = options[Math.floor(random() * options.length)]
    else {
      const top = best(left)
      const ties = options.filter((o) => score(left, o) === top)
      open = ties[Math.floor(random() * ties.length)]
    }
    const day = playDay(open, random)
    const target = -(day.missed + day.spoiled) + GAMMA * best(day.next)
    if (notebook === 'pairs') {
      const n = ++pairSeen[left][open - left]
      pairs[left][open - left] += (target - pairs[left][open - left]) / n
    } else {
      const n = ++shelfSeen[open]
      shelves[open] += (target - shelves[open]) / n
    }
    run.days.push({ left, open, ...day, lost: day.missed + day.spoiled, explored })
    if ((d + 1) % every === 0) {
      const after = snapshot()
      run.tables.push(after.table)
      run.counts.push(after.count)
    }
    left = day.next
  }
  return run
}

// What a table would open with for each number left, playing its best (no
// random amounts). An untried amount scores 0, the most hopeful score, so a
// table still full of them keeps choosing untried amounts; ties go to the
// smallest.
export function policyOf(table: (number | null)[][]): number[] {
  return table.map((row, left) =>
    row.reduce<number>((best, value, i) => ((value ?? 0) > (row[best - left] ?? 0) ? left + i : best), left)
  )
}

// The bottles a table would lose a day, playing its best from now on
const losses = new Map<string, number>()
export function lossNow(table: (number | null)[][]): number {
  const policy = policyOf(table)
  const key = policy.join(',')
  let loss = losses.get(key)
  if (loss === undefined) {
    loss = lossOf(policy)
    losses.set(key, loss)
  }
  return loss
}

// --- Many learners of each kind, on average ---

export const RUNS = 100
// The curve is measured every EVERY days
export const EVERY = 5

export interface Curves {
  days: number[]
  pairs: number[]
  shelf: number[]
}

function average(notebook: Notebook): number[] {
  const points = DAYS / EVERY + 1
  const sum = Array<number>(points).fill(0)
  for (let seed = 1; seed <= RUNS; seed++) {
    const run = learn(notebook, 1000 + seed, DAYS, EVERY)
    for (let i = 0; i < points; i++) sum[i] += lossNow(run.tables[i]) / RUNS
  }
  return sum
}

let curves: Curves | null = null
// Bottles lost a day, playing its best, after each count of days: the
// average over RUNS learners of each kind. Worked out once, when first asked.
export function race(): Curves {
  curves ??= {
    days: range(0, DAYS / EVERY).map((i) => i * EVERY),
    pairs: average('pairs'),
    shelf: average('shelf'),
  }
  return curves
}

// The first day from which a curve stays within `margin` of the best there is
export function daysToReach(curve: number[], margin: number): number {
  let i = curve.length
  while (i > 0 && curve[i - 1] <= BEST_LOSS + margin) i--
  return i * EVERY
}

// The first day the pair notebook does as well as the shelf notebook did
// after `day` days
export function catchUp(day: number): number {
  const { pairs, shelf } = race()
  const mark = shelf[day / EVERY]
  return pairs.findIndex((loss) => loss <= mark) * EVERY
}

// --- The story ---

// Two mornings that open with the same shelf: Monday, 1 left and 3 bought;
// Tuesday, 3 left and 1 bought. On Monday 6 people want a bottle, so 2 go
// without, and none are left to go off.
export const MONDAY = { left: 1, bought: 3, wanted: 6, missed: 2 }
export const TUESDAY = { left: 3, bought: 1 }

// A single learner of each kind, for the figures to show. The seed is one
// whose day STORY_DAY looks like the average (see model.test.ts): the pair
// notebook has tried well under half its pairs and still stocks oddly; the
// shelf notebook has tried every shelf and stocks the best amount.
export const STORY_DAY = 30
export const STORY_SEED = 33
let story: { pairs: Run; shelf: Run } | null = null
export function storyRuns() {
  story ??= { pairs: learn('pairs', STORY_SEED), shelf: learn('shelf', STORY_SEED) }
  return story
}

// How many of a table's values have been learned from at least once
export const tried = (counts: number[][]) => counts.flat().filter((n) => n > 0).length
export const triedShelves = (counts: number[][]) => new Set(counts.flatMap((row, left) => row.flatMap((n, i) => (n > 0 ? [left + i] : [])))).size
