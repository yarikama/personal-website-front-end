// Latent semantic analysis, small enough to check by hand: count words in
// documents, compare two words' rows with the cosine, re-weight the counts
// with TF-IDF, and squeeze the rows with a truncated singular value
// decomposition written out below. Every number the page states comes from
// here; the figures only draw.

export type Vec = number[]
export type Matrix = number[][]

export const dot = (a: Vec, b: Vec) => a.reduce((sum, x, i) => sum + x * b[i], 0)
export const norm = (v: Vec) => Math.sqrt(dot(v, v))
export const transpose = (m: Matrix): Matrix => (m.length ? m[0].map((_, j) => m.map((row) => row[j])) : [])
export const multiply = (a: Matrix, b: Matrix): Matrix => a.map((row) => b[0].map((_, j) => row.reduce((sum, x, i) => sum + x * b[i][j], 0)))

// The cosine of the angle between two rows: their dot product over both
// lengths. It ignores how long each row is, only which way it points. A row
// of all zeros points nowhere, so its cosine with anything is undefined (NaN).
export function cosine(a: Vec, b: Vec): number {
  const lengths = norm(a) * norm(b)
  return lengths < 1e-12 ? NaN : dot(a, b) / lengths
}

// --- The singular value decomposition, by one-sided Jacobi ------------------

export interface Svd {
  // The strengths, largest first, one per column of the matrix (some may be 0)
  values: number[]
  // u_j, one unit vector over the rows per strength (zeros where the strength is 0)
  U: Vec[]
  // v_j, one unit vector over the columns per strength, all at right angles
  V: Vec[]
}

// C = Σ_j σ_j u_j v_jᵀ. Turn pairs of columns of C against each other, each
// turn a rotation that makes the two columns perpendicular, until every
// pair is; keep track of the turns in V. Then C V has perpendicular
// columns, and their lengths are the singular values. Each sign is chosen
// so the biggest entry of σ_j u_j is positive, so pictures open the same
// way every time.
export function svd(C: Matrix, sweeps = 60): Svd {
  const m = C.length
  const n = C[0].length
  const A = C.map((row) => [...row])
  const V = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)))
  for (let sweep = 0; sweep < sweeps; sweep++) {
    let turned = false
    for (let p = 0; p < n - 1; p++) {
      for (let q = p + 1; q < n; q++) {
        let alpha = 0
        let beta = 0
        let gamma = 0
        for (let i = 0; i < m; i++) {
          alpha += A[i][p] * A[i][p]
          beta += A[i][q] * A[i][q]
          gamma += A[i][p] * A[i][q]
        }
        if (Math.abs(gamma) <= 1e-15 * Math.sqrt(alpha * beta) || Math.abs(gamma) < 1e-300) continue
        turned = true
        const zeta = (beta - alpha) / (2 * gamma)
        const t = (zeta >= 0 ? 1 : -1) / (Math.abs(zeta) + Math.sqrt(1 + zeta * zeta))
        const c = 1 / Math.sqrt(1 + t * t)
        const s = c * t
        for (const rows of [A, V]) {
          for (const row of rows) {
            const a = row[p]
            const b = row[q]
            row[p] = c * a - s * b
            row[q] = s * a + c * b
          }
        }
      }
    }
    if (!turned) break
  }
  const columns = transpose(A)
  const vectors = transpose(V)
  const order = columns.map((col, j) => ({ value: norm(col), col, v: vectors[j] })).sort((a, b) => b.value - a.value)
  const values: number[] = []
  const U: Vec[] = []
  const Vs: Vec[] = []
  for (const { value, col, v } of order) {
    // Flip so the biggest entry of σu (= Cv) is positive
    let biggest = 0
    for (const x of col) if (Math.abs(x) > Math.abs(biggest) + 1e-12) biggest = x
    const sign = biggest < 0 ? -1 : 1
    values.push(value)
    U.push(col.map((x) => (value > 1e-12 ? (sign * x) / value : 0)))
    Vs.push(v.map((x) => sign * x))
  }
  return { values, U, V: Vs }
}

// The best table of rank k: only the k strongest layers σ_j u_j v_jᵀ
export function truncate({ values, U, V }: Svd, k: number): Matrix {
  return U[0].map((_, i) => V[0].map((_, j) => values.slice(0, k).reduce((sum, s, l) => sum + s * U[l][i] * V[l][j], 0)))
}

export const frobenius = (m: Matrix) => Math.sqrt(m.reduce((sum, row) => sum + dot(row, row), 0))

// Each word's k numbers: its row of C measured along the k strongest
// document patterns, W = C V_k (which is also U_k Σ_k)
export function wordVectors(C: Matrix, k: number, factors: Svd = svd(C)): Matrix {
  return C.map((row) => factors.V.slice(0, k).map((v) => dot(row, v)))
}

// How much of the table the first k layers keep: their share of Σσ²,
// which is the sum of every entry squared
export function keptShare(values: number[], k: number): number {
  const all = values.reduce((sum, s) => sum + s * s, 0)
  return values.slice(0, k).reduce((sum, s) => sum + s * s, 0) / all
}

// --- TF-IDF -----------------------------------------------------------------

// How many documents each word turns up in
export const documentFrequency = (C: Matrix) => C.map((row) => row.filter((x) => x > 0).length)

// idf = ln(N / df): 0 for a word in every document, larger the rarer it is
export const idf = (documents: number, frequency: number) => (frequency ? Math.log(documents / frequency) : 0)

// Every count times its word's idf
export function tfidf(C: Matrix): Matrix {
  const N = C[0].length
  const df = documentFrequency(C)
  return C.map((row, i) => row.map((count) => count * idf(N, df[i])))
}

// --- Counting words ---------------------------------------------------------

export const tokens = (text: string) => text.toLowerCase().match(/[a-z]+/g) ?? []

// Row i, column j: how many times word i is in document j
export function countMatrix(documents: string[], vocabulary: readonly string[]): Matrix {
  const split = documents.map(tokens)
  return vocabulary.map((word) => split.map((words) => words.filter((w) => w === word).length))
}

// --- The story: receipts in a corner shop ----------------------------------

export const ITEMS = ['Red cola', 'Blue cola', 'Chips', 'Popcorn', 'Bread', 'Milk', 'Eggs', 'Coffee'] as const
export const RED = 0
export const BLUE = 1
// What the colas ride along with
export const SNACKS = [2, 3]

// Twelve baskets, one per receipt
export const RECEIPTS: string[][] = [
  ['Red cola', 'Chips', 'Popcorn'],
  ['Blue cola', 'Blue cola', 'Chips'],
  ['Bread', 'Milk', 'Eggs'],
  ['Red cola', 'Popcorn'],
  ['Milk', 'Coffee'],
  ['Blue cola', 'Chips', 'Popcorn'],
  ['Bread', 'Eggs', 'Coffee'],
  ['Red cola', 'Red cola', 'Chips'],
  ['Bread', 'Milk', 'Coffee'],
  ['Blue cola', 'Popcorn', 'Milk'],
  ['Eggs', 'Milk'],
  ['Red cola', 'Chips', 'Bread'],
]

export const SHOP: Matrix = ITEMS.map((item) => RECEIPTS.map((basket) => basket.filter((x) => x === item).length))
const SHOP_SVD = svd(SHOP)
// Each item squeezed to two numbers
export const SHOP_MAP = wordVectors(SHOP, 2, SHOP_SVD)
export const SHARED_RECEIPTS = SHOP[RED].filter((x, j) => x > 0 && SHOP[BLUE][j] > 0).length
export const COLA_RAW = cosine(SHOP[RED], SHOP[BLUE])
export const COLA_SQUEEZED = cosine(SHOP_MAP[RED], SHOP_MAP[BLUE])

// --- The lab: twelve sentences ---------------------------------------------

export const SENTENCES = [
  'The car needs fuel.',
  'Drive the car down the road.',
  'The engine of the car runs hot.',
  'The automobile has a new engine.',
  'Drive the automobile on the open road.',
  'The automobile needs fuel for the road.',
  'Bake the cake in a hot oven.',
  'The cake needs flour and sugar.',
  'Mix the flour with the sugar.',
  'Bake the bread in the oven.',
  'The bread needs flour.',
  'Put sugar in the new cake.',
]

// The words counted; the rest (a, of, in, ...) are skipped, except "the",
// kept to show what a word in every sentence does
export const VOCAB = ['car', 'automobile', 'engine', 'road', 'fuel', 'drive', 'cake', 'bread', 'oven', 'flour', 'sugar', 'bake', 'hot', 'needs', 'the'] as const
export type Word = (typeof VOCAB)[number]
export const at = (word: Word) => VOCAB.indexOf(word)

export const COUNTS: Matrix = countMatrix(SENTENCES, VOCAB)
export const TFIDF: Matrix = tfidf(COUNTS)

export type Weighting = 'Counts' | 'TF-IDF'
export const WEIGHTINGS: Weighting[] = ['Counts', 'TF-IDF']
export const TABLES: Record<Weighting, Matrix> = { Counts: COUNTS, 'TF-IDF': TFIDF }

export interface Factored {
  table: Matrix
  factors: Svd
  // Every k from 1 to the number of sentences: each word's k numbers
  vectors: Matrix[]
}

function factor(table: Matrix): Factored {
  const factors = svd(table)
  return { table, factors, vectors: factors.values.map((_, k) => wordVectors(table, k + 1, factors)) }
}
export const FACTORED: Record<Weighting, Factored> = { Counts: factor(COUNTS), 'TF-IDF': factor(TFIDF) }

// Two words' cosine after keeping k layers of the weighted table
export const similarity = (weighting: Weighting, k: number, a: Word, b: Word) =>
  cosine(FACTORED[weighting].vectors[k - 1][at(a)], FACTORED[weighting].vectors[k - 1][at(b)])
// ... and in the raw rows
export const rawSimilarity = (weighting: Weighting, a: Word, b: Word) => cosine(TABLES[weighting][at(a)], TABLES[weighting][at(b)])

export const PAIRS: [Word, Word][] = [
  ['car', 'automobile'],
  ['car', 'the'],
  ['cake', 'bread'],
  ['car', 'cake'],
]

// Car's closest word by raw counts, and how close
export const CAR_NEAREST = (() => {
  const car = COUNTS[at('car')]
  return VOCAB.filter((w) => w !== 'car')
    .map((word) => ({ word, value: cosine(car, COUNTS[at(word)]) }))
    .sort((a, b) => b.value - a.value)[0]
})()

// The worked numbers: car and automobile with 1 layer, 2, and all of them
export const WORKED = [1, 2, SENTENCES.length].map((k) => ({
  k,
  value: similarity('Counts', k, 'car', 'automobile'),
  kept: keptShare(FACTORED.Counts.factors.values, k),
}))

// The three worked idf weights: a word in every sentence, in three, in two
export const IDF_WORKED = (['the', 'car', 'engine'] as Word[]).map((word) => {
  const df = documentFrequency(COUNTS)[at(word)]
  return { word, df, value: idf(SENTENCES.length, df) }
})
