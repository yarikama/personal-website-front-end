// Contextual calibration (Zhao et al. 2021) on a toy few-shot classifier
// whose bias you can see. Every number the page states comes from here; the
// figures only draw.
//
// The toy "language model" sorts café reviews into happy (Positive) and
// unhappy (Negative). Its score for a review is in log-odds of happy:
//
//   score = evidence(review) + lean(prompt)
//
// The evidence is what the words say, the same whatever the prompt. The
// lean is what the prompt adds, the same for every review: a small pull
// toward the more common label word, plus each demonstration's label,
// weighted more the later it comes (majority label and recency bias).

export type Label = 'P' | 'N'
export type Prompt = readonly [Label, Label, Label, Label]

export interface Review {
  text: string
  happy: boolean
  // Log-odds of happy that the words alone give
  evidence: number
}

// Twelve new reviews of the café: six happy, six unhappy. One happy review
// reads as unhappy to the model ("bad"), so even unbiased it gets 11 right.
export const REVIEWS: Review[] = [
  { text: 'Perfect flat white.', happy: true, evidence: 2.0 },
  { text: 'Cosy and friendly.', happy: true, evidence: 1.3 },
  { text: 'Worth the walk.', happy: true, evidence: 0.9 },
  { text: 'Good cake, slow queue.', happy: true, evidence: 0.55 },
  { text: 'Quiet, decent wifi.', happy: true, evidence: 0.3 },
  { text: 'Not bad at all.', happy: true, evidence: -0.2 },
  { text: 'Rude at the till.', happy: false, evidence: -1.9 },
  { text: 'Stale bread.', happy: false, evidence: -1.3 },
  { text: 'Too loud to talk.', happy: false, evidence: -0.9 },
  { text: 'Pricey for what it is.', happy: false, evidence: -0.6 },
  { text: 'Fine, I guess.', happy: false, evidence: -0.35 },
  { text: 'Nice cups, weak tea.', happy: false, evidence: -0.1 },
]

// The demonstrations: four reviews you sorted yourself, by label
export const CARDS: Record<Label, string[]> = {
  P: ['Best croissant in town.', 'Lovely staff, will be back.', 'Great music, great coffee.', 'Our new Sunday spot.'],
  N: ['Waited forty minutes.', 'Coffee was cold.', 'Sticky tables.', 'Burnt toast, twice.'],
}

// The text on each card of a prompt: the first happy card, the second, ...
export function cardTexts(prompt: Prompt): string[] {
  const used: Record<Label, number> = { P: 0, N: 0 }
  return prompt.map((label) => CARDS[label][used[label]++])
}

// The pull toward "happy" every prompt has: the label word is more common
export const WORD_LEAN = 0.15
// How much each demonstration's label pulls, first to last
export const RECENCY = [0.1, 0.2, 0.45, 0.95] as const

export const sigmoid = (z: number) => (z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z)))
export const logit = (p: number) => Math.log(p / (1 - p))

export const lean = (prompt: Prompt) =>
  WORD_LEAN + prompt.reduce((sum, label, i) => sum + (label === 'P' ? 1 : -1) * RECENCY[i], 0)

// The model's chance of happy for a review after this prompt
export const pHappy = (prompt: Prompt, review: Review) => sigmoid(review.evidence + lean(prompt))

// The blank card, "N/A": an input with nothing to read, so no evidence
export const BLANK: Review = { text: 'N/A', happy: false, evidence: 0 }
export const blankHappy = (prompt: Prompt) => pHappy(prompt, BLANK)

// ---- Contextual calibration, for any number of labels ----------------------

// W = diag(p_cf)⁻¹: one weight per label, 1 over the blank input's chance
export const weightsOf = (pcf: readonly number[]) => pcf.map((p) => 1 / p)

// W p̂ + b with b = 0: each label's chance divided by the blank's
export const scores = (p: readonly number[], pcf: readonly number[]) => p.map((x, i) => x / pcf[i])

// The scores rescaled to add to one: the calibrated chances the page shows
export function calibrate(p: readonly number[], pcf: readonly number[]): number[] {
  const s = scores(p, pcf)
  const total = s.reduce((a, b) => a + b, 0)
  return s.map((x) => x / total)
}

// The paper writes it as Platt scaling, softmax(W p̂ + b) (its equation 1).
// For picking a label it agrees with the scores above; its chances differ.
export function softmax(z: readonly number[]): number[] {
  const top = Math.max(...z)
  const e = z.map((x) => Math.exp(x - top))
  const total = e.reduce((a, b) => a + b, 0)
  return e.map((x) => x / total)
}
export const platt = (p: readonly number[], pcf: readonly number[]) => softmax(scores(p, pcf))

export const argmax = (xs: readonly number[]) => xs.reduce((best, x, i) => (x > xs[best] ? i : best), 0)

// Two labels, ordered [unhappy, happy] as the page writes them
export const pair = (happy: number): [number, number] => [1 - happy, happy]

// The calibrated chance of happy for a review after this prompt
export const calibratedHappy = (prompt: Prompt, review: Review) =>
  calibrate(pair(pHappy(prompt, review)), pair(blankHappy(prompt)))[1]

// How many reviews land on the right side of 50% with every score shifted
// by `shift` log-odds from what the words alone say
export const rightCount = (shift: number) => REVIEWS.filter((r) => r.evidence + shift > 0 === r.happy).length

// How many reviews it sorts right, before and after calibration
export const rightBefore = (prompt: Prompt) => REVIEWS.filter((r) => pHappy(prompt, r) > 0.5 === r.happy).length
export const rightAfter = (prompt: Prompt) => REVIEWS.filter((r) => calibratedHappy(prompt, r) > 0.5 === r.happy).length

// Every prompt of four labels, sorted by how far its blank card leans happy
export const ALL_PROMPTS: Prompt[] = Array.from({ length: 16 }, (_, m) =>
  [0, 1, 2, 3].map((i) => ((m >> (3 - i)) & 1 ? 'P' : 'N')) as unknown as Prompt,
).sort((a, b) => lean(a) - lean(b))

export const promptName = (prompt: Prompt) => prompt.join(' ')

const before = ALL_PROMPTS.map(rightBefore)
const after = ALL_PROMPTS.map(rightAfter)
export const RANGE_BEFORE = [Math.min(...before), Math.max(...before)] as const
export const RANGE_AFTER = [Math.min(...after), Math.max(...after)] as const

// ---- The story --------------------------------------------------------------

// The first evening's cards, the same four shuffled with the happy ones last,
// then all four happy
export const STORY = {
  mixed: ['N', 'P', 'P', 'N'] as Prompt,
  happyLast: ['N', 'N', 'P', 'P'] as Prompt,
  allHappy: ['P', 'P', 'P', 'P'] as Prompt,
}

// The three worked numbers: reviews after the happy-last prompt
export const WORKED = ['Worth the walk.', 'Fine, I guess.', 'Too loud to talk.'].map(
  (text) => REVIEWS.find((r) => r.text === text)!,
)

// ---- The checks --------------------------------------------------------------

// Quick check: the blank card and a review, as chances of happy
export const QUICK = { blank: 0.8, review: 0.72 }
export const QUICK_AFTER = calibrate(pair(QUICK.review), pair(QUICK.blank))[1]

// Check yourself: three topics
export const TOPICS = ['Sports', 'Business', 'Tech'] as const
export const TOPIC_BLANK = [0.5, 0.3, 0.2]
export const TOPIC_ARTICLE = [0.45, 0.25, 0.3]
export const TOPIC_SCORES = scores(TOPIC_ARTICLE, TOPIC_BLANK)
export const TOPIC_AFTER = calibrate(TOPIC_ARTICLE, TOPIC_BLANK)

// ---- What the paper measured (Zhao et al. 2021, GPT-3) ----------------------

export const PAPER = {
  // Table 2: two SST-2 examples, GPT-3 2.7B, then the same two reversed
  ordered: 0.885,
  reversed: 0.513,
  // Section 1: accuracy across orderings of one set of examples
  worstOrder: 0.54,
  bestOrder: 0.93,
  // Section 5: "N/A" after a two-example prompt
  blankPositive: 0.618,
  // Section 4: P P P N leads to nearly 90% Negative predictions
  pppnNegative: 0.9,
  // Section 4: on DBPedia, "book" predicted 11 times as often as "artist"
  bookOverArtist: 11,
  // Table 1: SST-2, GPT-3 2.7B, 4-shot, mean over five sets of examples
  sst4Before: 0.591,
  sst4After: 0.799,
  // Section 5.1: the largest gain
  bestGain: 30.0,
}

export const pct = (p: number) => `${Math.round(p * 100)}%`
export const pct1 = (p: number) => `${(p * 100).toFixed(1)}%`
export const two = (x: number) => x.toFixed(2)
