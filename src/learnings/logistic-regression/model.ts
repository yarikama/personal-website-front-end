import { seeded } from '../../components/explain/random'

// Logistic regression on one feature, a patient's temperature: the chance of
// flu is σ(w·x + b), with x the temperature less CENTRE. Every number the
// page states comes from here; the figures only draw.

// Temperatures are measured from here, so the weights stay on one scale
export const CENTRE = 38

export interface Patient {
  temp: number
  flu: boolean
}

// The weights: a slope w per °C and a starting score b at CENTRE
export interface Weights {
  w: number
  b: number
}

export const sigmoid = (z: number) => (z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z)))

export const scoreOf = ({ w, b }: Weights, temp: number) => w * (temp - CENTRE) + b
export const chanceOf = (weights: Weights, temp: number) => sigmoid(scoreOf(weights, temp))

// The chance the curve gave what actually happened
export const chanceOfTruth = (weights: Weights, p: Patient) => {
  const flu = chanceOf(weights, p.temp)
  return p.flu ? flu : 1 - flu
}

// ln(1 / the chance given to what happened). From the score directly, so a
// very confident miss stays finite and exact: ln(1 + e^(−z)) for flu.
export const surpriseOf = (weights: Weights, p: Patient) => {
  const z = scoreOf(weights, p.temp)
  const against = p.flu ? -z : z
  return against > 0 ? against + Math.log1p(Math.exp(-against)) : Math.log1p(Math.exp(against))
}

// Log loss for a label and a predicted chance of 1
export const logLoss = (y: 0 | 1, p: number) => (y === 1 ? -Math.log(p) : -Math.log(1 - p))

// The total surprise, −ln of the likelihood: the log loss summed over patients
export const totalLoss = (weights: Weights, patients: Patient[]) =>
  patients.reduce((sum, p) => sum + surpriseOf(weights, p), 0)

export const likelihood = (weights: Weights, patients: Patient[]) =>
  patients.reduce((product, p) => product * chanceOfTruth(weights, p), 1)

// Its gradient: Σ (chance − label) × (x, 1)
export function gradient(weights: Weights, patients: Patient[]): Weights {
  let w = 0
  let b = 0
  for (const p of patients) {
    const pull = chanceOf(weights, p.temp) - (p.flu ? 1 : 0)
    w += pull * (p.temp - CENTRE)
    b += pull
  }
  return { w, b }
}

// A step size that always goes downhill on the summed loss: the loss curves
// by at most ¼ XᵀX, so 1 / (¼ λmax(XᵀX)) is safe, X with a column of ones
export function safeStep(patients: Patient[]): number {
  let xx = 0
  let x1 = 0
  for (const p of patients) {
    const x = p.temp - CENTRE
    xx += x * x
    x1 += x
  }
  const n = patients.length
  // The larger eigenvalue of [[xx, x1], [x1, n]]
  const mid = (xx + n) / 2
  const most = mid + Math.sqrt(((xx - n) / 2) ** 2 + x1 * x1)
  return 4 / most
}

export const step = (weights: Weights, patients: Patient[], eta: number): Weights => {
  const g = gradient(weights, patients)
  return { w: weights.w - eta * g.w, b: weights.b - eta * g.b }
}

// Gradient descent from `start`: every point it visits
export function descend(start: Weights, patients: Patient[], steps: number, eta = safeStep(patients)): Weights[] {
  const path = [start]
  let at = start
  for (let i = 0; i < steps; i++) {
    at = step(at, patients, eta)
    path.push(at)
  }
  return path
}

// The best weights, by gradient descent until the slope is flat
export function fit(patients: Patient[], start: Weights = { w: 0, b: 0 }, tolerance = 1e-9, most = 200_000): Weights {
  const eta = safeStep(patients)
  let at = start
  for (let i = 0; i < most; i++) {
    const g = gradient(at, patients)
    if (Math.hypot(g.w, g.b) < tolerance) break
    at = { w: at.w - eta * g.w, b: at.b - eta * g.b }
  }
  return at
}

// Where the curve crosses 50%: the score is 0
export const halfwayOf = ({ w, b }: Weights) => CENTRE - b / w
// The weights for a slope and a 50% point
export const weightsAt = (w: number, halfway: number): Weights => ({ w, b: w * (CENTRE - halfway) })

export const wrongAt = (weights: Weights, patients: Patient[]) =>
  patients.filter((p) => chanceOf(weights, p.temp) >= 0.5 !== p.flu).length

// --- The guess: two emails called spam that were fine

export const GUESS_SURE = 0.9
export const GUESS_UNSURE = 0.6
export const GUESS_RATIO = logLoss(0, GUESS_SURE) / logLoss(0, GUESS_UNSURE)

// --- The story: sixteen patients in flu season

const HEALTHY = [36.2, 36.6, 36.8, 37.0, 37.2, 37.6, 37.8, 38.4]
const FLU = [37.4, 38.0, 38.2, 38.6, 38.8, 39.2, 39.4, 39.8]
export const PATIENTS: Patient[] = [
  ...HEALTHY.map((temp) => ({ temp, flu: false })),
  ...FLU.map((temp) => ({ temp, flu: true })),
].sort((a, b) => a.temp - b.temp)

// The rule a doctor might use: flu from here up
export const CUTOFF = 38
export const cutoffWrong = (patients: Patient[]) => patients.filter((p) => p.temp >= CUTOFF !== p.flu).length

// The patient every curve finds hardest: flu at a low temperature
export const ODD = PATIENTS.find((p) => p.flu && p.temp === 37.4)!

// A first curve, 50% at the rule's line, and one nearly as steep as the rule
export const GENTLE = weightsAt(1.5, CUTOFF)
export const BEST = fit(PATIENTS)
export const STEEP = weightsAt(10, halfwayOf(BEST))

// The search: from a flat 50% for everyone down to the best
export const SEARCH_STEPS = 30
export const SEARCH = descend({ w: 0, b: 0 }, PATIENTS, SEARCH_STEPS, safeStep(PATIENTS))

// --- The worked patients, under the best curve

export const WORKED = [
  PATIENTS.find((p) => p.temp === 39.4)!,
  ODD,
  PATIENTS.find((p) => p.temp === 38.4)!,
]

// --- The lab: patients drawn from a true curve

export const TRUE: Weights = weightsAt(3, 37.9)
export const LAB_SIZE = 40
export const LAB_RANGE: [number, number] = [36.2, 39.8]

// `n` patients at temperatures spread over the range, each with flu at the
// true curve's chance. `split`: no overlap, flu exactly above the 50% point.
export function drawPatients(seed: number, n = LAB_SIZE, truth: Weights = TRUE, split = false): Patient[] {
  const random = seeded(seed)
  const patients: Patient[] = []
  for (let i = 0; i < n; i++) {
    const temp = Math.round((LAB_RANGE[0] + random() * (LAB_RANGE[1] - LAB_RANGE[0])) * 20) / 20
    const roll = random()
    const flu = split ? temp >= halfwayOf(truth) : roll < chanceOf(truth, temp)
    patients.push({ temp, flu })
  }
  return patients.sort((a, b) => a.temp - b.temp)
}

export const LAB_SEED = 5
export const LAB_START = weightsAt(1, 38.6)
// Steps a press of Fit takes, and how many a frame
export const FIT_STEPS = 1500
// The lab's steepness slider runs on a log scale, 0.2 to 50 per °C
export const STEEPNESS: [number, number] = [Math.log10(0.2), Math.log10(50)]
export const HALFWAY_RANGE: [number, number] = [36.5, 39.5]
export const STEPS_PER_FRAME = 25

// --- Quick check: four emails, all called rightly; which pulls hardest

export const PULLS = [
  { name: 'Spam, given 98%', chance: 0.98, spam: true },
  { name: 'Fine, given 45%', chance: 0.45, spam: false },
  { name: 'Spam, given 70%', chance: 0.7, spam: true },
  { name: 'Fine, given 2%', chance: 0.02, spam: false },
]
// How hard an example pulls: its chance less its label (times its features)
export const pullOf = (chance: number, label: boolean) => chance - (label ? 1 : 0)
export const HARDEST = PULLS.reduce((a, b) => (Math.abs(pullOf(b.chance, b.spam)) > Math.abs(pullOf(a.chance, a.spam)) ? b : a))

// --- Check yourself: one constant chance for every email

export const SPAM_SHARE = 0.3
// The average log loss of saying `q` for every email when a share `s` is spam
export const constantLoss = (q: number, s = SPAM_SHARE) => s * logLoss(1, q) + (1 - s) * logLoss(0, q)
export const CONSTANTS = [0, SPAM_SHARE, 0.5, 0.7]

// --- Formatting

export const pct = (p: number) => `${Math.round(100 * p)}%`
export const two = (v: number) => v.toFixed(2)
export const one = (v: number) => v.toFixed(1)
export const degrees = (t: number) => `${t.toFixed(1)}°`
export const signed = (v: number, digits = 2) => `${v < 0 ? '−' : '+'}${Math.abs(v).toFixed(digits)}`
