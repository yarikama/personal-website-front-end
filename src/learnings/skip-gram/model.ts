import { seeded } from '../../components/explain/random'

// Skip-gram with negative sampling, small enough to check by hand: twelve
// short sentences, the (word, neighbour) pairs a window takes from them, the
// noise distribution random words are drawn from, one update, and a whole
// training run. Every number the page states comes from here; the figures
// only draw.

export type Vec = number[]

// The corpus. Cat and dog never share a sentence, nor do milk and water, or
// sofa and rug; each pair fills the same slots in different sentences.
export const CORPUS = [
  'the cat drinks milk',
  'the dog drinks water',
  'the cat sleeps on the sofa',
  'the dog sleeps on the rug',
  'you pour the milk',
  'you pour the water',
  'a cat naps on the rug',
  'a dog naps on the sofa',
  'the cat wants milk',
  'the dog wants water',
  'you sit on the sofa',
  'you sit on the rug',
]

export const SENTENCES = CORPUS.map((sentence) => sentence.split(' '))
export const TOKENS = SENTENCES.flat().length

// Every word once, in the order it first appears
export const VOCAB = [...new Set(SENTENCES.flat())]
export const idOf = (word: string) => {
  const id = VOCAB.indexOf(word)
  if (id < 0) throw new Error(`${word} is not in the vocabulary`)
  return id
}
export const COUNTS = VOCAB.map((word) => SENTENCES.flat().filter((token) => token === word).length)

// How many places either side of a word count as its neighbours
export const WINDOW = 2

// The (word, neighbour) pairs the window takes from one sentence, as ids,
// in reading order: each word with every word up to `window` places either
// side of it
export function pairsOf(sentence: string[], window = WINDOW): [number, number][] {
  const pairs: [number, number][] = []
  sentence.forEach((word, at) => {
    for (let off = -window; off <= window; off++) {
      const other = sentence[at + off]
      if (off !== 0 && other !== undefined) pairs.push([idOf(word), idOf(other)])
    }
  })
  return pairs
}

export const PAIRS = SENTENCES.flatMap((sentence) => pairsOf(sentence))

// The words that ever sit within the window of `word`
export const neighboursOf = (word: string) =>
  [...new Set(PAIRS.filter(([centre]) => centre === idOf(word)).map(([, other]) => VOCAB[other]))]

// ---- Scores and chances ---------------------------------------------------

export const dot = (a: Vec, b: Vec) => a.reduce((sum, x, i) => sum + x * b[i], 0)
export const sigmoid = (score: number) => 1 / (1 + Math.exp(-score))
export const cosine = (a: Vec, b: Vec) => dot(a, b) / Math.sqrt(dot(a, a) * dot(b, b))

// The full softmax: the chance of each word as the neighbour, given the
// centre word's vector and every word's context vector. Its bottom line
// sums over the whole vocabulary.
export function softmax(v: Vec, us: Vec[]): number[] {
  const scores = us.map((u) => dot(u, v))
  const top = Math.max(...scores)
  const e = scores.map((s) => Math.exp(s - top))
  const sum = e.reduce((a, b) => a + b, 0)
  return e.map((x) => x / sum)
}

// The negative-sampling objective for one pair: log σ(real score) plus
// log σ(−score) for each noise word. Larger is better; 0 is perfect.
export const objective = (v: Vec, real: Vec, noise: Vec[]) =>
  Math.log(sigmoid(dot(real, v))) + noise.reduce((sum, u) => sum + Math.log(sigmoid(-dot(u, v))), 0)

// ---- Noise words --------------------------------------------------------

// Each word's chance of being drawn as a noise word: its count raised to
// `power`, shared out. 1 is plain counts, 0 every word alike.
export function noiseShares(power: number, counts = COUNTS): number[] {
  const weights = counts.map((n) => n ** power)
  const sum = weights.reduce((a, b) => a + b, 0)
  return weights.map((w) => w / sum)
}

export const POWER = 0.75

// A draw from `shares`, as an index
export function draw(random: () => number, shares: number[]): number {
  let x = random()
  for (let i = 0; i < shares.length; i++) {
    x -= shares[i]
    if (x < 0) return i
  }
  return shares.length - 1
}

// ---- One update -----------------------------------------------------------

export interface Nudge {
  // How far the centre word's vector moves because of the real neighbour,
  // and because of the noise words
  vPull: Vec
  vPush: Vec
  // Where the real neighbour's context vector, and each noise word's, end up
  real: Vec
  noise: Vec[]
}

// One step of gradient ascent on the objective, from the centre word's
// vector v, the real neighbour's context vector and the noise words'. The
// real one is pulled towards v by (1 − σ(score)) and v towards it; each
// noise one is pushed from v by σ(score) and v from it. Every move is
// worked out from the vectors as they were before the step.
export function nudge(v: Vec, real: Vec, noise: Vec[], rate: number): Nudge {
  const pull = 1 - sigmoid(dot(real, v))
  const pushes = noise.map((u) => sigmoid(dot(u, v)))
  return {
    vPull: real.map((x) => rate * pull * x),
    vPush: v.map((_, d) => -rate * noise.reduce((sum, u, j) => sum + pushes[j] * u[d], 0)),
    real: real.map((x, d) => x + rate * pull * v[d]),
    noise: noise.map((u, j) => u.map((x, d) => x - rate * pushes[j] * v[d])),
  }
}

export const plus = (...vs: Vec[]) => vs[0].map((_, d) => vs.reduce((sum, v) => sum + v[d], 0))
export const minus = (a: Vec, b: Vec) => a.map((x, d) => x - b[d])

// ---- A whole run ----------------------------------------------------------

export interface Settings {
  // Noise words per real pair
  k: number
  // The power counts are raised to for drawing noise words
  power: number
  // Two vectors per word (a word vector and a context vector), or one for both
  vectors: 1 | 2
  seed: number
}

export const DIMS = 8
export const EPOCHS = 200
export const RATE = 0.05
// How often a run keeps a copy of the word vectors, in passes
export const EVERY = 5

export const DEFAULTS: Settings = { k: 3, power: POWER, vectors: 2, seed: 7 }

export interface Run {
  v: Vec[]
  u: Vec[]
  // The word vectors before the first pass and after every EVERY passes
  history: Vec[][]
}

// Skip-gram with negative sampling on the corpus: EPOCHS passes over every
// pair, each pair one nudge with k noise words drawn from the noise
// distribution (a draw of the real neighbour itself is skipped).
export function train(settings: Settings, epochs = EPOCHS): Run {
  const random = seeded(settings.seed)
  const start = () => Array.from({ length: DIMS }, () => random() - 0.5)
  const v = VOCAB.map(start)
  const u = settings.vectors === 2 ? VOCAB.map(start) : v
  const shares = noiseShares(settings.power)
  const history = [v.map((x) => [...x])]
  for (let epoch = 1; epoch <= epochs; epoch++) {
    for (const [centre, other] of PAIRS) {
      const drawn: number[] = []
      for (let i = 0; i < settings.k; i++) {
        const word = draw(random, shares)
        if (word !== other) drawn.push(word)
      }
      const before = [u[other], ...drawn.map((word) => u[word])]
      const moved = nudge(v[centre], before[0], before.slice(1), RATE)
      // Every move is added on, so a word drawn twice is pushed twice, and with
      // one vector per word the moves of a word in both roles add up
      const moves: [number, Vec][] = [
        [other, minus(moved.real, before[0])],
        ...drawn.map((word, j): [number, Vec] => [word, minus(moved.noise[j], before[j + 1])]),
      ]
      v[centre] = plus(v[centre], moved.vPull, moved.vPush)
      for (const [word, move] of moves) u[word] = plus(u[word], move)
    }
    if (epoch % EVERY === 0) history.push(v.map((x) => [...x]))
  }
  return { v, u, history }
}

// How alike every other word's vector is to `word`'s, most alike first
export function alike(vectors: Vec[], word: string): { word: string; cosine: number }[] {
  const at = idOf(word)
  return VOCAB.map((other, i) => ({ word: other, cosine: cosine(vectors[at], vectors[i]) }))
    .filter((entry) => entry.word !== word)
    .sort((a, b) => b.cosine - a.cosine)
}

export const mostAlike = (vectors: Vec[], word: string) => alike(vectors, word)[0].word

// The three pairs of look-alikes the corpus was written to have
export const LOOKALIKES: [string, string][] = [
  ['cat', 'dog'],
  ['milk', 'water'],
  ['sofa', 'rug'],
]

// How many look-alike pairs a run found: each word's most alike is its partner
export const found = (vectors: Vec[]) =>
  LOOKALIKES.filter(([a, b]) => mostAlike(vectors, a) === b && mostAlike(vectors, b) === a).length

// ---- The story --------------------------------------------------------

// One nudge drawn on a flat board, from vectors set by hand: cat's word
// vector, drinks's context vector, and three noise words'. The rate is
// large so the move can be seen.
export const STORY_RATE = 0.5
export const STORY_V: Vec = [1.3, 0.45]
export const STORY_REAL = { word: 'drinks', u: [-0.2, 1.1] as Vec }
// The three noise words, drawn from the noise distribution; a seed whose
// draws are three different words never seen near cat
export const STORY_SEED = 28
export const STORY_NOISE_WORDS = (() => {
  const random = seeded(STORY_SEED)
  const shares = noiseShares(POWER)
  return [0, 1, 2].map(() => VOCAB[draw(random, shares)])
})()
// Their context vectors, set by hand: water's points partly the way cat's
// word vector does, rug's across it, you's away from it
const NOISE_U: Record<string, Vec> = {
  water: [0.85, -0.7],
  rug: [0.15, -1.1],
  you: [-0.95, -0.55],
}
export const STORY_NOISE = STORY_NOISE_WORDS.map((word) => ({ word, u: NOISE_U[word] }))
export const STORY_NUDGE = nudge(STORY_V, STORY_REAL.u, STORY_NOISE.map((n) => n.u), STORY_RATE)
// Where cat's word vector is after the pull alone, and after the whole nudge
export const STORY_PULLED = plus(STORY_V, STORY_NUDGE.vPull)
export const STORY_PUSHED = plus(STORY_PULLED, STORY_NUDGE.vPush)

// Runs worked out once each, by their settings
const runs = new Map<string, Run>()
export function runFor(settings: Settings): Run {
  const key = `${settings.k} ${settings.power} ${settings.vectors} ${settings.seed}`
  let run = runs.get(key)
  if (!run) {
    run = train(settings)
    runs.set(key, run)
  }
  return run
}

// The run the story and the worked numbers come from
export const STORY_RUN = runFor(DEFAULTS)
export const STORY_WORD = 'cat'

// How alike each other word is to cat over the run, one frame for every
// copy the run kept, the words in the order they end up in
export const STORY_ORDER = alike(STORY_RUN.v, STORY_WORD).map((entry) => entry.word)
export const STORY_FRAMES = STORY_RUN.history.map((v) =>
  STORY_ORDER.map((word) => cosine(v[idOf(STORY_WORD)], v[idOf(word)]))
)

// Three pairs the trained model scores, with cat as the word held: its real
// neighbour drinks, and two words never seen near it. Each adds the log of
// its chance of the right answer, yes for the real one and no for the noise.
export const WORKED = ['drinks', 'water', 'you'].map((word) => {
  const score = dot(STORY_RUN.u[idOf(word)], STORY_RUN.v[idOf(STORY_WORD)])
  const real = neighboursOf(STORY_WORD).includes(word)
  const chance = sigmoid(score)
  return { word, real, score, chance, adds: Math.log(real ? chance : 1 - chance) }
})
export const WORKED_TOTAL = WORKED.reduce((sum, w) => sum + w.adds, 0)

// The same run with one vector per word for both jobs
export const oneVectorRun = () => runFor({ ...DEFAULTS, vectors: 1 })

// The noise distribution's worked numbers: the commonest word, a middling
// one and a rare one
export const NOISE_WORDS = ['the', 'on', 'naps']

// ---- Published numbers ---------------------------------------------------

// Mikolov et al. (2013), "Distributed Representations of Words and Phrases
// and their Compositionality": one billion words of news, every word seen at
// least five times kept, 692K words; 5 noise words per pair in NEG-5
export const PAPER_VOCAB = 692_000
export const PAPER_K = 5
// Scores a pair needs: every word in the vocabulary, or the real neighbour
// and k noise words
export const softmaxCost = (vocab: number) => vocab
export const sampledCost = (k: number) => k + 1
// The hierarchical softmax, the paper's other way round it, needs about log₂ V
export const treeCost = (vocab: number) => Math.round(Math.log2(vocab))

// The quick check: a word seen 81 times and one seen once
export const CHECK_COUNTS = [81, 1]

// ---- Formatting ----------------------------------------------------------

export const pct = (share: number, digits = 0) => `${(100 * share).toFixed(digits)}%`
export const two = (x: number) => x.toFixed(2)
// With a true minus sign: “−0.94”
export const minus2 = (x: number, digits = 2) => `${x < 0 ? '−' : ''}${Math.abs(x).toFixed(digits)}`
export const signed = (x: number) => `${x < 0 ? '−' : '+'}${Math.abs(x).toFixed(2)}`
export const thousands = (n: number) => n.toLocaleString('en-US')
