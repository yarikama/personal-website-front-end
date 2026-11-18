import { seeded } from '../../components/explain/random'

// A GAN on a line. Every "image" is one number, a coin's weight in grams.
// The real coins are a fixed set; the forger (the generator) owns sixteen
// fakes and moves each of them; the cashier (the discriminator) is a
// logistic regression on the first four powers of the weight, so its curve
// of "chance this coin is real" can rise and fall. They take turns.

export const LIGHTEST = 0
export const HEAVIEST = 12
export const COINS = 16

// A standard normal draw (Box–Muller)
export function gauss(random: () => number): number {
  return Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random())
}

const bump = (seed: number, centre: number, spread: number, count: number) => {
  const random = seeded(seed)
  return Array.from({ length: count }, () => centre + spread * gauss(random))
}

export const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length

// The real coins: one kind around 8 g, or an old kind around 4 g and a new
// kind around 9 g, eight of each
export const REAL_CENTRE = 8
export const OLD_CENTRE = 4
export const NEW_CENTRE = 9
export const ONE_KIND = bump(4, REAL_CENTRE, 0.5, COINS)
export const TWO_KINDS = [...bump(7, OLD_CENTRE, 0.4, COINS / 2), ...bump(12, NEW_CENTRE, 0.4, COINS / 2)]
export const KINDS = ['One kind', 'Two kinds'] as const
export type Kind = (typeof KINDS)[number]
export const realOf = (kind: Kind) => (kind === 'One kind' ? ONE_KIND : TWO_KINDS)

// The forger's first batch: around 2.5 g, or every coin from one mould
export const FIRST_CENTRE = 2.5
export const FIRST_VARIED = bump(3, FIRST_CENTRE, 0.4, COINS)
export const FIRST_ALIKE = FIRST_VARIED.map(() => FIRST_CENTRE)
export const STARTS = ['Varied', 'All alike'] as const
export type Start = (typeof STARTS)[number]
export const firstOf = (start: Start) => (start === 'Varied' ? FIRST_VARIED : FIRST_ALIKE)

export const sigmoid = (s: number) => 1 / (1 + Math.exp(-s))

// The cashier: its score is a polynomial in the weight, w₁u + w₂u² + w₃u³ +
// w₄u⁴ + c, with u the weight measured from 6 g in steps of 3 g so the
// weights learn at a like pace; its chance a coin is real is the sigmoid of
// the score. Four powers let the curve rise and fall twice, enough to tell
// two kinds of coin apart.
export const POWERS = 4
export interface Cashier {
  w: number[]
  c: number
}
export const UNSURE: Cashier = { w: Array<number>(POWERS).fill(0), c: 0 }
const MIDDLE = 6
const UNIT = 3
const unitOf = (x: number) => (x - MIDDLE) / UNIT
const powersOf = (x: number) => {
  const u = unitOf(x)
  return Array.from({ length: POWERS }, (_, k) => u ** (k + 1))
}
export const scoreOf = (d: Cashier, x: number) => powersOf(x).reduce((s, f, k) => s + f * d.w[k], d.c)
export const chanceReal = (d: Cashier, x: number) => sigmoid(scoreOf(d, x))
// How fast the score climbs per gram
export const slopeOf = (d: Cashier, x: number) => {
  const u = unitOf(x)
  return d.w.reduce((s, w, k) => s + w * (k + 1) * u ** k, 0) / UNIT
}

// The game's value: the average log of the chance the cashier gives a real
// coin of being real, plus the average log of the chance it gives a fake
// of being fake. The cashier climbs it; the forger pushes it down.
export function valueOf(d: Cashier, real: number[], fakes: number[]): number {
  return (
    mean(real.map((x) => Math.log(chanceReal(d, x)))) + mean(fakes.map((x) => Math.log(1 - chanceReal(d, x))))
  )
}

// A small penalty on the curve's shape keeps its weights from running off
export const PENALTY = 0.01
export const objectiveOf = (d: Cashier, real: number[], fakes: number[]) =>
  valueOf(d, real, fakes) - PENALTY * d.w.reduce((s, w) => s + w * w, 0)

// The objective's slope in each of the cashier's weights
export function cashierGradient(d: Cashier, real: number[], fakes: number[]): Cashier {
  const w = d.w.map(() => 0)
  let c = 0
  const add = (x: number, label: number, weight: number) => {
    const e = (label - chanceReal(d, x)) * weight
    powersOf(x).forEach((f, k) => (w[k] += e * f))
    c += e
  }
  for (const x of real) add(x, 1, 1 / real.length)
  for (const x of fakes) add(x, 0, 1 / fakes.length)
  return { w: w.map((g, k) => g - 2 * PENALTY * d.w[k]), c }
}

// One lesson for the cashier: a few steps uphill on the objective, from
// where it was last round
export const CASHIER_STEPS = 20
export const CASHIER_RATE = 1
export function teach(d: Cashier, real: number[], fakes: number[], steps = CASHIER_STEPS): Cashier {
  let at = d
  for (let k = 0; k < steps; k++) {
    const g = cashierGradient(at, real, fakes)
    at = { w: at.w.map((w, i) => w + CASHIER_RATE * g.w[i]), c: at.c + CASHIER_RATE * g.c }
  }
  return at
}

// The forger's two losses for a fake the cashier gives a chance D:
// the original, log(1 − D), to push down; or the non-saturating −log D.
// Down either one, a fake moves along the score's slope times a factor:
// D for the original, 1 − D for the non-saturating.
export const LOSSES = ['log(1 − D)', '−log D'] as const
export type Loss = (typeof LOSSES)[number]
export const ORIGINAL: Loss = 'log(1 − D)'
export const NON_SATURATING: Loss = '−log D'
export const factorOf = (loss: Loss, chance: number) => (loss === ORIGINAL ? chance : 1 - chance)
export const forgerLoss = (loss: Loss, chance: number) => (loss === ORIGINAL ? Math.log(1 - chance) : -Math.log(chance))

// Grams a fake moves per unit of pull, and at most per round
export const FORGER_RATE = 1
export const LONGEST_NUDGE = 0.5
export function nudgeOf(d: Cashier, x: number, loss: Loss): number {
  const step = FORGER_RATE * factorOf(loss, chanceReal(d, x)) * slopeOf(d, x)
  return Math.max(-LONGEST_NUDGE, Math.min(LONGEST_NUDGE, step))
}
export const onLine = (x: number) => Math.max(LIGHTEST, Math.min(HEAVIEST, x))
export const forge = (d: Cashier, fakes: number[], loss: Loss) => fakes.map((x) => onLine(x + nudgeOf(d, x, loss)))

// One round: the cashier learns on the fakes as they are, then the forger
// nudges every fake. A round keeps the cashier after its lesson and the
// fakes it was taught on.
export interface Round {
  cashier: Cashier
  fakes: number[]
}
export function play(real: number[], first: number[], loss: Loss, rounds: number): Round[] {
  const out: Round[] = []
  let cashier = UNSURE
  let fakes = first
  for (let r = 0; r < rounds; r++) {
    cashier = teach(cashier, real, fakes)
    out.push({ cashier, fakes })
    fakes = forge(cashier, fakes, loss)
  }
  return out
}

// The game at time t, in rounds: from round r to r + 1 the fakes move
// first (the forger's turn), then the curve (the cashier's)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const between = (from: Cashier, to: Cashier, t: number): Cashier => ({
  w: from.w.map((w, k) => lerp(w, to.w[k], t)),
  c: lerp(from.c, to.c, t),
})
export function frameAt(rounds: Round[], t: number): Round {
  const last = rounds.length - 1
  const at = Math.max(0, Math.min(last, t))
  const r = Math.min(last, Math.floor(at))
  if (r === last) return rounds[last]
  const p = at - r
  const now = rounds[r]
  const next = rounds[r + 1]
  if (p < 0.5) return { cashier: now.cashier, fakes: now.fakes.map((x, i) => lerp(x, next.fakes[i], p * 2)) }
  return { cashier: between(now.cashier, next.cashier, p * 2 - 1), fakes: next.fakes }
}

// How sure the cashier is, on average, that the fakes are real
export const fooled = (round: Round) => mean(round.fakes.map((x) => chanceReal(round.cashier, x)))
// Fakes heavier than halfway between the two kinds
export const SPLIT = (OLD_CENTRE + NEW_CENTRE) / 2
export const nearNew = (fakes: number[]) => fakes.filter((x) => x > SPLIT).length

// --- The story: one kind of real coin, the non-saturating loss
export const STORY_ROUNDS = 30
export const STORY = play(ONE_KIND, FIRST_VARIED, NON_SATURATING, STORY_ROUNDS)
export const STORY_SHOWN = 6 // the rounds the "take turns" step plays
export const storyEnd = STORY[STORY_ROUNDS - 1]
// The first round the fakes fool the cashier nearly half the time
export const FOOLED_AT = STORY.findIndex((r) => fooled(r) > 0.45) + 1

// --- The lab
export const LAB_ROUNDS = 160
const runs = new Map<string, Round[]>()
export function labRun(kind: Kind, loss: Loss, start: Start): Round[] {
  const key = `${kind}|${loss}|${start}`
  let run = runs.get(key)
  if (!run) {
    run = play(realOf(kind), firstOf(start), loss, LAB_ROUNDS)
    runs.set(key, run)
  }
  return run
}

// How far the fakes have moved on average after `rounds`, from the first batch
export const travelled = (run: Round[], rounds: number) => mean(run[rounds].fakes) - mean(run[0].fakes)
export const EARLY = 10
export const earlyOriginal = () => travelled(labRun('One kind', ORIGINAL, 'Varied'), EARLY)
export const earlyNonSaturating = () => travelled(labRun('One kind', NON_SATURATING, 'Varied'), EARLY)
// The first round at least a quarter of the fakes weigh like the new kind
export const firstReachNew = (run: Round[]) => run.findIndex((r) => nearNew(r.fakes) >= COINS / 4) + 1
// Rounds before any fake weighs like the new kind
export const roundsWithoutNew = (run: Round[]) => run.findIndex((r) => nearNew(r.fakes) > 0)

// --- The worked numbers: the pull's factor when the cashier gives a fake D
export const WORKED = [0.5, 0.1, 0.01]

// At the end of the game the cashier can only guess: D = ½ on every coin,
// and the value is log ½ + log ½ = −log 4
export const EVEN = 0.5
export const valueAtEven = 2 * Math.log(EVEN)

// --- Quick check: four fakes on the same slope, the cashier's chance for each
export const CHECK_FAKES = [
  { name: 'A', chance: 0.02 },
  { name: 'B', chance: 0.3 },
  { name: 'C', chance: 0.6 },
  { name: 'D', chance: 0.95 },
]
export const CHECK_MOST = CHECK_FAKES.reduce((best, f) => (factorOf(ORIGINAL, f.chance) > factorOf(ORIGINAL, best.chance) ? f : best))

// --- Check yourself: a digit GAN's samples
export const SAMPLES = 1000
export const ONES = 990

export const pct = (share: number) => `${Math.round(share * 100)}%`
export const two = (value: number) => value.toFixed(2)
export const one = (value: number) => value.toFixed(1)
export const times = (value: number) => `${Math.round(value)}×`
