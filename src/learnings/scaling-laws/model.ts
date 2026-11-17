// Scaling laws for language models. Every number the page states comes from
// here; the figures only draw.
//
// The loss of a model with N parameters trained on D tokens, in nats per
// token, is fitted as a floor plus two power laws (Hoffmann et al. 2022, eq. 2):
//   L(N, D) = E + A / N^α + B / D^β
// Training costs about C ≈ 6ND floating-point operations (Kaplan et al. 2020,
// §2.1): 2 per parameter per token forward, about 4 backward.

export interface Law {
  E: number
  A: number
  B: number
  alpha: number
  beta: number
}

// The law the page draws: Hoffmann et al.'s form, refitted to their own data
// by Besiroglu et al. (2024, eq. 3). Its best split agrees with Chinchilla's
// ~20 tokens per parameter.
export const FIT: Law = { E: 1.8172, A: 482.01, B: 2085.43, alpha: 0.3478, beta: 0.3658 }

// The constants printed in the Chinchilla paper (Hoffmann et al. 2022, eq. 10).
// Besiroglu et al. show the fit stopped early and was rounded; its best split
// sits far from the ~20 tokens per parameter the paper trained with.
export const PRINTED: Law = { E: 1.69, A: 406.4, B: 410.7, alpha: 0.34, beta: 0.28 }

export const FLOPS_PER_PARAM_TOKEN = 6
export const flops = (n: number, d: number) => FLOPS_PER_PARAM_TOKEN * n * d
export const tokensFor = (c: number, n: number) => c / (FLOPS_PER_PARAM_TOKEN * n)

// The two shortfalls: too few parameters, too few tokens
export const modelShortfall = (n: number, law: Law = FIT) => law.A / n ** law.alpha
export const dataShortfall = (d: number, law: Law = FIT) => law.B / d ** law.beta
export const lossOf = (n: number, d: number, law: Law = FIT) => law.E + modelShortfall(n, law) + dataShortfall(d, law)
// The loss of N parameters on the tokens a budget C leaves them
export const lossAt = (c: number, n: number, law: Law = FIT) => lossOf(n, tokensFor(c, n), law)

// The best split of a budget, in closed form (Hoffmann et al. eq. 4): the
// slope of the loss along the budget is zero where α · model shortfall equals
// β · data shortfall, which gives N = G (C/6)^(β/(α+β)).
export function bestSplit(c: number, law: Law = FIT) {
  const { A, B, alpha, beta } = law
  const g = ((alpha * A) / (beta * B)) ** (1 / (alpha + beta))
  const n = g * (c / FLOPS_PER_PARAM_TOKEN) ** (beta / (alpha + beta))
  const d = tokensFor(c, n)
  return { n, d, loss: lossOf(n, d, law), perParam: d / n }
}

// The share of each extra factor of compute that goes to parameters
export const paramShare = (law: Law = FIT) => law.beta / (law.alpha + law.beta)

// ---- Real models (Hoffmann et al. 2022, Table 1) ----

export interface Model {
  name: string
  n: number
  d: number
}
export const GPT3: Model = { name: 'GPT-3', n: 175e9, d: 300e9 }
export const GOPHER: Model = { name: 'Gopher', n: 280e9, d: 300e9 }
export const CHINCHILLA: Model = { name: 'Chinchilla', n: 70e9, d: 1.4e12 }
export const WORKED_MODELS = [GPT3, GOPHER, CHINCHILLA]
export const GOPHER_BUDGET = flops(GOPHER.n, GOPHER.d)

// Chinchilla's own ratio, and the paper's projection for a 1B model
// (Table 3, approach 1: 20.2 billion tokens)
export const CHINCHILLA_RATIO = CHINCHILLA.d / CHINCHILLA.n
export const ONE_BILLION_TOKENS = 20.2e9
export const RULE_OF_THUMB = 20

// Exponent a in N_opt ∝ C^a from Hoffmann et al.'s three approaches (Table 2)
export const HOFFMANN_A = [0.5, 0.49, 0.46]

// ---- Kaplan et al. 2020 (eqs. 1.1 to 1.3, and §6) ----

export const KAPLAN = {
  alphaN: 0.076,
  alphaD: 0.095,
  alphaC: 0.05,
  // N_opt ∝ C^0.73, D_opt ∝ C^0.27
  pN: 0.73,
  pD: 0.27,
}
// Each doubling of parameters multiplies the loss by 2^−0.076 ≈ 0.95
export const KAPLAN_DOUBLING = 2 ** -KAPLAN.alphaN
// k doublings of N, starting from a loss
export const afterDoublings = (loss: number, k: number) => loss * KAPLAN_DOUBLING ** k

// What 100× the compute buys, split Kaplan's way and Hoffmann's way
export const MORE = 100
export const KAPLAN_MODEL_GROWTH = MORE ** KAPLAN.pN
export const KAPLAN_DATA_GROWTH = MORE ** KAPLAN.pD
export const EVEN_GROWTH = MORE ** 0.5

// ---- The story: a choir on a budget ----
// Each singer stands for a billion parameters, each hour of rehearsal for a
// billion tokens, so singer-hours are compute in units of 6 × 10^18 FLOPs.

export const UNIT = 1e9
export const SINGER_HOURS = (GOPHER.n / UNIT) * (GOPHER.d / UNIT)
export const CHOIR_BUDGET = flops(SINGER_HOURS * UNIT, UNIT)
export const hoursFor = (singers: number) => SINGER_HOURS / singers
export const thinFlaw = (singers: number) => modelShortfall(singers * UNIT)
export const practiceFlaw = (singers: number) => dataShortfall(hoursFor(singers) * UNIT)
export const totalFlaw = (singers: number) => thinFlaw(singers) + practiceFlaw(singers)

export const BIG_CHOIR = GOPHER.n / UNIT
export const SMALL_CHOIR = 15
export const BEST_CHOIR = bestSplit(CHOIR_BUDGET).n / UNIT
// The flaws shrink by a fixed fraction with each doubling
export const THIN_PER_DOUBLING = 2 ** -FIT.alpha
export const PRACTICE_PER_DOUBLING = 2 ** -FIT.beta

// ---- Guess first: Gopher's budget, four ways to split it ----

export interface Split {
  label: string
  n: number
  d: number
}
const gopherSplit = (n: number): Split => ({ label: '', n, d: tokensFor(GOPHER_BUDGET, n) })
export const GUESS: Split[] = [
  { ...gopherSplit(1e12), label: 'A 1-trillion-parameter model on 84 billion tokens' },
  { ...gopherSplit(GOPHER.n), label: 'Gopher’s own split' },
  { ...gopherSplit(70e9), label: 'A 70-billion-parameter model on four times the tokens' },
  { ...gopherSplit(7e9), label: 'A 7-billion-parameter model on forty times the tokens' },
]
export const guessLoss = (s: Split) => lossOf(s.n, s.d)
export const GUESS_BEST = GUESS.reduce((best, s) => (guessLoss(s) < guessLoss(best) ? s : best))

// ---- Quick check: three doublings under Kaplan's law ----

export const QUICK_START = 3
export const QUICK_DOUBLINGS = 3
export const QUICK_RIGHT = afterDoublings(QUICK_START, QUICK_DOUBLINGS)
export const QUICK_OPTIONS = [
  { value: afterDoublings(QUICK_START, 1), right: false },
  { value: QUICK_RIGHT, right: true },
  { value: QUICK_START - 0.75, right: false },
  { value: QUICK_START / 2 ** QUICK_DOUBLINGS, right: false },
]

// ---- Check yourself: a budget of 10^22 FLOPs ----

export const CHECK_BUDGET = 1e22
// About 20 tokens per parameter: 6 · N · 20N = C
export const CHECK_RULE_N = Math.sqrt(CHECK_BUDGET / (FLOPS_PER_PARAM_TOKEN * RULE_OF_THUMB))
export const CHECK_OPTIONS = [1e9, 9e9, 40e9, 120e9].map((n) => ({
  n,
  d: tokensFor(CHECK_BUDGET, n),
  loss: lossAt(CHECK_BUDGET, n),
}))
export const CHECK_BEST = CHECK_OPTIONS.reduce((best, o) => (o.loss < best.loss ? o : best))

// ---- The lab ----

export const LAB = {
  minLogC: 18,
  maxLogC: 26,
  minLogN: 7,
  maxLogN: 13,
  budgets: [18, 20, 22, 24, 26],
  // Each valley runs over these tokens per parameter
  minPerParam: 0.02,
  maxPerParam: 20000,
}

// ---- Formatting ----

// 280e9 → "280B", 1.4e12 → "1.4T", 84e6 → "84M"
export function count(x: number): string {
  const units: [number, string][] = [
    [1e12, 'T'],
    [1e9, 'B'],
    [1e6, 'M'],
    [1e3, 'K'],
  ]
  for (const [size, unit] of units) {
    if (x >= size * 0.9995) {
      const v = x / size
      return `${v >= 9.995 ? Math.round(v) : Number(v.toFixed(1))}${unit}`
    }
  }
  return String(Math.round(x))
}

const SUPERSCRIPT = '⁰¹²³⁴⁵⁶⁷⁸⁹'
const superscript = (k: number) =>
  String(k)
    .split('')
    .map((ch) => (ch === '-' ? '⁻' : SUPERSCRIPT[Number(ch)]))
    .join('')

// 5.04e23 → "5.0 × 10²³"; a whole power of ten → "10²²"
export function sci(x: number, digits = 1): string {
  let k = Math.floor(Math.log10(x))
  let m = x / 10 ** k
  if (Number(m.toFixed(digits)) >= 10) {
    k += 1
    m /= 10
  }
  if (Number(m.toFixed(digits)) === 1) return `10${superscript(k)}`
  return `${m.toFixed(digits)} × 10${superscript(k)}`
}

export const two = (x: number) => x.toFixed(2)
export const three = (x: number) => x.toFixed(3)
export const whole = (x: number) => Math.round(x).toLocaleString('en-US')
// 0.786 → "21%": how much a factor takes off
export const cut = (factor: number) => `${Math.round((1 - factor) * 100)}%`

// Tokens per parameter at the best split of the lab's smallest and largest budgets
export const FRONTIER_RATIOS = LAB.budgets.map((logC) => bestSplit(10 ** logC).perParam)
// 1.7 → "1.7", 20 → "20", 0.05 → "0.05"
export const ratio = (x: number) =>
  x >= 9.95 ? Math.round(x).toLocaleString('en-US') : x >= 0.995 ? x.toFixed(1) : x.toFixed(2)
