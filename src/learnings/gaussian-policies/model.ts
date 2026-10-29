// Salting soup by hand: any amount at all, drawn each evening from a habit
// with a centre and a spread (a normal distribution), and a rating out of
// 10 afterwards. Both the centre and the spread learn from the rating, by
// the policy gradient. The spread is learned through its log, so it stays
// above zero.

import { seeded } from '../../components/explain/random'

// ---------------------------------------------------------------------------
// The soup

// How salt sits in a dish: the best amount, in pinches, and how far either
// side of it the taste lasts before it is as flat as no salt at all
export interface Dish {
  best: number
  width: number
}

export const BLAND = 2
export const SOUP: Dish = { best: 5, width: 2.5 }

// The rating, out of 10: 10 at the best amount, falling away on both sides
// to a bland 2 (too little, or too much to enjoy)
export const taste = (pinches: number, dish: Dish = SOUP) =>
  BLAND + (10 - BLAND) * Math.max(0, 1 - ((pinches - dish.best) / dish.width) ** 2)

// ---------------------------------------------------------------------------
// The habit: a normal distribution with a centre μ and a spread σ

export interface Habit {
  centre: number
  spread: number
}

// How likely each amount is under the habit: the bell curve's height
export const density = (pinches: number, { centre, spread }: Habit) =>
  Math.exp(-0.5 * ((pinches - centre) / spread) ** 2) / (spread * Math.sqrt(2 * Math.PI))

// A rating with your mood in it, kept between 0 and 10
const rate = (pinches: number, dish: Dish, random: () => number) =>
  Math.min(10, Math.max(0, taste(pinches, dish) + LEARN.mood * normal(random)))

// A normal draw from two uniform ones
export const normal = (random: () => number) => Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random())

// One evening's amount: the centre, plus the spread times a standard draw
export const sample = (habit: Habit, random: () => number) => habit.centre + habit.spread * normal(random)

// How log π changes with the centre and with the log of the spread, at a
// try `pinches`: ∂/∂μ = (a − μ)/σ², ∂/∂(log σ) = (a − μ)²/σ² − 1
export function slopes(pinches: number, { centre, spread }: Habit) {
  const off = (pinches - centre) / spread
  return { centre: off / spread, logSpread: off * off - 1 }
}

// One evening's push, before the step size: how much better than usual it
// was, times each slope
export function push(pinches: number, surprise: number, habit: Habit) {
  const slope = slopes(pinches, habit)
  return { centre: surprise * slope.centre, logSpread: surprise * slope.logSpread }
}

// The habit after a push of step `alpha`; the spread moves through its log
export function learnFrom(habit: Habit, pinches: number, surprise: number, alpha: number): Habit {
  const p = push(pinches, surprise, habit)
  return { centre: habit.centre + alpha * p.centre, spread: Math.exp(Math.log(habit.spread) + alpha * p.logSpread) }
}

// The rating to expect from a habit, worked out on a fine grid
export function expectedTaste(habit: Habit, dish: Dish = SOUP) {
  const steps = 4000
  const low = habit.centre - 8 * habit.spread
  const dx = (16 * habit.spread) / steps
  let total = 0
  for (let i = 0; i <= steps; i++) {
    const x = low + i * dx
    total += (i === 0 || i === steps ? 0.5 : 1) * density(x, habit) * taste(x, dish)
  }
  return total * dx
}

// ---------------------------------------------------------------------------
// The story: one soup, a habit of 2 pinches give or take half a pinch,
// three evenings told one by one, then many more

export const LEARN = {
  // The step for both the centre and the log of the spread
  alpha: 0.04,
  // How far the usual moves toward each evening's rating
  usual: 0.2,
  // How much a rating wobbles with your mood
  mood: 0.3,
}

export const START: Habit = { centre: 2, spread: 0.5 }
// The first evenings, told one by one, with their ratings exact: one close
// in, one far out on the salty side, one far out on the bland side
export const SCRIPT = [2.1, 2.9, 1.3]
export const STORY_EVENINGS = 150
export const STORY_SEED = 7

export interface Evening {
  pinches: number
  rating: number
  // The usual rating, counting this one, and how much better than it this was
  usual: number
  surprise: number
  // The habit before the evening, and after learning from it
  before: Habit
  after: Habit
}

// Evenings of soup: the habit draws an amount, the soup is rated, the usual
// moves toward the rating, and the habit learns from how much better than
// usual it was. `script` fixes the first amounts, and rates them exactly.
export function evenings(
  count: number,
  {
    seed = STORY_SEED,
    start = START,
    dish = SOUP,
    script = [] as number[],
    alpha = LEARN.alpha,
    keep = null as number | null,
  } = {}
): Evening[] {
  const random = seeded(seed)
  let habit = keep === null ? start : { ...start, spread: keep }
  let usual = NaN
  const out: Evening[] = []
  for (let t = 0; t < count; t++) {
    const scripted = t < script.length
    const pinches = scripted ? script[t] : sample(habit, random)
    const rating = scripted ? taste(pinches, dish) : rate(pinches, dish, random)
    usual = Number.isNaN(usual) ? rating : usual + LEARN.usual * (rating - usual)
    const surprise = rating - usual
    const learned = learnFrom(habit, pinches, surprise, alpha)
    const after = keep === null ? learned : { centre: learned.centre, spread: keep }
    out.push({ pinches, rating, usual, surprise, before: habit, after })
    habit = after
  }
  return out
}

export const story = () => evenings(STORY_EVENINGS, { script: SCRIPT })

// ---------------------------------------------------------------------------
// The worked pushes: a habit of 4 pinches give or take 1, a usual of 6, and
// three evenings

export const WORKED = { habit: { centre: 4, spread: 1 } as Habit, usual: 6 }
export const WORKED_TRIES = [
  { pinches: 4.5, rating: 8 },
  { pinches: 6, rating: 8 },
  { pinches: 6, rating: 4 },
]
export const worked = () =>
  WORKED_TRIES.map((tried) => ({ ...tried, ...push(tried.pinches, tried.rating - WORKED.usual, WORKED.habit) }))

// ---------------------------------------------------------------------------
// The kitchen: one cook, two situations. A mug of soup takes little salt and
// punishes a pinch too many; a big pot takes more and forgives. The habit
// has a centre and a spread for each, and learns both from the evenings
// spent on each, chosen at random.

export const DISHES = {
  mug: { best: 1.5, width: 0.8 } as Dish,
  pot: { best: 6, width: 3 } as Dish,
}
export type DishName = keyof typeof DISHES
export const KITCHEN_START: Habit = { centre: 3.5, spread: 0.8 }
export const KITCHEN_EVENINGS = 400
export const KITCHEN_SEED = 3
// A smaller step than the story's: the mug's spread gets narrow, and the
// centre's push is divided by its square
export const KITCHEN_ALPHA = 0.02

// How the spread is set, as the figure offers it
export const SPREADS = { Learned: null, 'Kept wide': 1, 'Kept narrow': 0.2 } as const
export type Spread = keyof typeof SPREADS

export interface KitchenEvening {
  dish: DishName
  pinches: number
  rating: number
  // Both habits after this evening
  habits: Record<DishName, Habit>
}

export function kitchen(spread: Spread, seed = KITCHEN_SEED, count = KITCHEN_EVENINGS): KitchenEvening[] {
  const random = seeded(seed)
  const keep = SPREADS[spread]
  const start = keep === null ? KITCHEN_START : { ...KITCHEN_START, spread: keep }
  const habits: Record<DishName, Habit> = { mug: start, pot: start }
  const usual: Record<DishName, number> = { mug: NaN, pot: NaN }
  const out: KitchenEvening[] = []
  for (let t = 0; t < count; t++) {
    const dish: DishName = random() < 0.5 ? 'mug' : 'pot'
    const habit = habits[dish]
    const pinches = sample(habit, random)
    const rating = rate(pinches, DISHES[dish], random)
    usual[dish] = Number.isNaN(usual[dish]) ? rating : usual[dish] + LEARN.usual * (rating - usual[dish])
    const learned = learnFrom(habit, pinches, rating - usual[dish], KITCHEN_ALPHA)
    habits[dish] = keep === null ? learned : { centre: learned.centre, spread: keep }
    out.push({ dish, pinches, rating, habits: { ...habits } })
  }
  return out
}

// The average rating of the last `n` evenings spent on `dish`, up to `upTo`
export function recentRating(run: KitchenEvening[], dish: DishName, upTo = run.length, n = 50) {
  const ratings = run.slice(0, upTo).filter((e) => e.dish === dish).slice(-n).map((e) => e.rating)
  return ratings.length ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : NaN
}
