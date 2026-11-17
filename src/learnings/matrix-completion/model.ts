import { seeded } from '../../components/explain/random'

// Filling in a ratings grid from a few of its entries. A grid of m users by
// n movies is stored row by row in one array: cell (i, j) is at i * n + j.
// Each user i gets a short vector u_i of k numbers, each movie j a vector v_j,
// and the guess for (i, j) is their dot product. Alternating least squares
// fits them to the cells that were seen.

export type Grid = { m: number; n: number; values: Float64Array }
// A guess for every cell: the average rating, plus user i's vector dotted
// with movie j's
export type Factors = { k: number; average: number; users: Float64Array; movies: Float64Array }

// --- Small linear algebra, enough for k × k systems --------------------------

// Solve A x = b for a k × k matrix A (row by row), by elimination with
// partial pivoting. A and b are copied, not changed.
export function solve(matrix: ArrayLike<number>, rhs: ArrayLike<number>, k: number): Float64Array {
  const a = Float64Array.from(matrix)
  const x = Float64Array.from(rhs)
  for (let col = 0; col < k; col++) {
    let pivot = col
    for (let row = col + 1; row < k; row++) if (Math.abs(a[row * k + col]) > Math.abs(a[pivot * k + col])) pivot = row
    if (pivot !== col) {
      for (let c = 0; c < k; c++) [a[col * k + c], a[pivot * k + c]] = [a[pivot * k + c], a[col * k + c]]
      ;[x[col], x[pivot]] = [x[pivot], x[col]]
    }
    const p = a[col * k + col]
    if (Math.abs(p) < 1e-14) continue
    for (let row = col + 1; row < k; row++) {
      const f = a[row * k + col] / p
      if (f === 0) continue
      for (let c = col; c < k; c++) a[row * k + c] -= f * a[col * k + c]
      x[row] -= f * x[col]
    }
  }
  for (let row = k - 1; row >= 0; row--) {
    let s = x[row]
    for (let c = row + 1; c < k; c++) s -= a[row * k + c] * x[c]
    const p = a[row * k + row]
    x[row] = Math.abs(p) < 1e-14 ? 0 : s / p
  }
  return x
}

export const dot = (a: ArrayLike<number>, i: number, b: ArrayLike<number>, j: number, k: number) => {
  let s = 0
  for (let c = 0; c < k; c++) s += a[i * k + c] * b[j * k + c]
  return s
}

// A standard normal draw (Box–Muller) from a seeded source
export function normal(random: () => number): number {
  const u = 1 - random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random())
}

// --- Counting ----------------------------------------------------------------

// Every cell of the grid, against the numbers the vectors hold
export const cells = (m: number, n: number) => m * n
export const parameters = (m: number, n: number, k: number) => (m + n) * k

// --- A planted grid and which cells are seen ---------------------------------

// A grid that is an average rating plus k tastes: each user has k numbers
// (how much they like each kind of movie), each movie k numbers (how much
// of each kind it is), drawn evenly from a bounded range so that ratings
// stay between about 1 and 5. `spread` is the standard deviation the tastes
// add; `noise` adds a little to each cell on top.
export function planted(
  m: number,
  n: number,
  k: number,
  seed: number,
  { noise = 0, typical = 3, spread = 0.8 } = {},
): { truth: Grid; ratings: Grid } {
  const random = seeded(seed)
  // A product of two numbers even in ±a has variance a⁴/9; k of them add up
  const a = Math.sqrt((3 * spread) / Math.sqrt(Math.max(1, k)))
  const even = () => a * (2 * random() - 1)
  const users = Float64Array.from({ length: m * k }, even)
  const movies = Float64Array.from({ length: n * k }, even)
  const truth = new Float64Array(m * n)
  const ratings = new Float64Array(m * n)
  for (let i = 0; i < m; i++)
    for (let j = 0; j < n; j++) {
      truth[i * n + j] = typical + dot(users, i, movies, j, k)
      ratings[i * n + j] = truth[i * n + j] + noise * normal(random)
    }
  return { truth: { m, n, values: truth }, ratings: { m, n, values: ratings } }
}

// Which cells are seen: each one independently with chance `fraction`.
// Drawn with one number per cell in a fixed order, so a larger fraction from
// the same seed sees every cell a smaller one did, and more.
export function observe(m: number, n: number, fraction: number, seed: number): Uint8Array {
  const random = seeded(seed)
  const seen = new Uint8Array(m * n)
  for (let c = 0; c < m * n; c++) seen[c] = random() < fraction ? 1 : 0
  return seen
}

export const count = (seen: Uint8Array) => seen.reduce((a, b) => a + b, 0)

// --- Alternating least squares ----------------------------------------------

export const guess = (f: Factors, i: number, j: number) => f.average + dot(f.users, i, f.movies, j, f.k)

// The quantity ALS lowers: the squared misses on the seen cells, plus λ times
// the squared size of every vector
export function objective(ratings: Grid, seen: Uint8Array, f: Factors, lambda: number): number {
  const { m, n } = ratings
  let total = 0
  for (let i = 0; i < m; i++)
    for (let j = 0; j < n; j++)
      if (seen[i * n + j]) total += (ratings.values[i * n + j] - guess(f, i, j)) ** 2
  let size = 0
  for (const x of f.users) size += x * x
  for (const x of f.movies) size += x * x
  return total + lambda * size
}

// Refit one side: for each row of `fit`, the vector that best matches its
// seen ratings given the other side's vectors, plus λ on its size. That is a
// k × k system: (Σ v vᵀ + λI) u = Σ r v, over the cells that row has seen.
function refit(
  fit: Float64Array,
  other: Float64Array,
  k: number,
  rows: number,
  seenBy: Int32Array[],
  ratingsBy: Float64Array[],
  lambda: number,
) {
  const a = new Float64Array(k * k)
  const b = new Float64Array(k)
  for (let i = 0; i < rows; i++) {
    a.fill(0)
    b.fill(0)
    const cols = seenBy[i]
    const rs = ratingsBy[i]
    for (let t = 0; t < cols.length; t++) {
      const j = cols[t]
      for (let p = 0; p < k; p++) {
        const vp = other[j * k + p]
        b[p] += rs[t] * vp
        for (let q = p; q < k; q++) a[p * k + q] += vp * other[j * k + q]
      }
    }
    for (let p = 0; p < k; p++) {
      a[p * k + p] += lambda
      for (let q = 0; q < p; q++) a[p * k + q] = a[q * k + p]
    }
    // Nothing seen and no penalty: nothing pins the vector down, so keep it at zero
    if (cols.length === 0 && lambda === 0) {
      fit.fill(0, i * k, i * k + k)
      continue
    }
    const x = solve(a, b, k)
    fit.set(x, i * k)
  }
}

export type Fit = Factors & { history: number[]; trace: Float64Array[] }
export type Start = 'random' | 'spectral'

// A start that already points the right way: fill every unseen cell with 0,
// scale the seen ones up by 1 / (share seen) so the grid is right on
// average, and take its top k directions by repeated multiplication
// (subspace iteration), as the truncated SVD would. `movies` comes in random
// and leaves as those directions; `users` as the grid times them.
function spectralStart(ratings: Grid, seen: Uint8Array, k: number, users: Float64Array, movies: Float64Array) {
  const { m, n, values } = ratings
  const share = count(seen) / (m * n)
  if (share === 0) return
  const scale = 1 / share
  const times = (v: Float64Array, out: Float64Array) => {
    // out (m × k) = A v, A the scaled grid with zeros where unseen
    out.fill(0)
    for (let i = 0; i < m; i++)
      for (let j = 0; j < n; j++) {
        const c = i * n + j
        if (!seen[c]) continue
        const r = scale * values[c]
        for (let p = 0; p < k; p++) out[i * k + p] += r * v[j * k + p]
      }
  }
  const timesT = (u: Float64Array, out: Float64Array) => {
    // out (n × k) = Aᵀ u
    out.fill(0)
    for (let i = 0; i < m; i++)
      for (let j = 0; j < n; j++) {
        const c = i * n + j
        if (!seen[c]) continue
        const r = scale * values[c]
        for (let p = 0; p < k; p++) out[j * k + p] += r * u[i * k + p]
      }
  }
  const orthonormalise = (v: Float64Array, rows: number) => {
    for (let p = 0; p < k; p++) {
      for (let q = 0; q < p; q++) {
        let d = 0
        for (let r = 0; r < rows; r++) d += v[r * k + p] * v[r * k + q]
        for (let r = 0; r < rows; r++) v[r * k + p] -= d * v[r * k + q]
      }
      let size = 0
      for (let r = 0; r < rows; r++) size += v[r * k + p] ** 2
      size = Math.sqrt(size) || 1
      for (let r = 0; r < rows; r++) v[r * k + p] /= size
    }
  }
  orthonormalise(movies, n)
  for (let t = 0; t < 40; t++) {
    times(movies, users)
    timesT(users, movies)
    orthonormalise(movies, n)
  }
  times(movies, users)
  // Share each direction's strength evenly between the two sides
  for (let p = 0; p < k; p++) {
    let size = 0
    for (let i = 0; i < m; i++) size += users[i * k + p] ** 2
    const root = Math.sqrt(Math.sqrt(size)) || 1
    for (let i = 0; i < m; i++) users[i * k + p] /= root
    for (let j = 0; j < n; j++) movies[j * k + p] *= root
  }
}

// Fit k numbers per user and per movie to the seen cells, measured from
// their average (`centre`, or from 0 without), and alternate: users given
// movies, then movies given users, `sweeps` times. It starts from the
// spectral guess, or from seeded random vectors. `history` is the objective
// before the first sweep and after each one; with `trace`, `trace` holds the
// filled grid at the same moments.
export function als(
  ratings: Grid,
  seen: Uint8Array,
  k: number,
  { lambda = 0.1, sweeps = 30, seed = 1, start = 'spectral' as Start, centre = true, trace = false } = {},
): Fit {
  const { m, n } = ratings
  const seenCount = count(seen)
  let average = 0
  if (centre && seenCount)
    for (let c = 0; c < m * n; c++) if (seen[c]) average += ratings.values[c] / seenCount
  const centred: Grid = { m, n, values: ratings.values.map((r) => r - average) }

  const random = seeded(seed)
  const users = Float64Array.from({ length: m * k }, () => normal(random))
  const movies = Float64Array.from({ length: n * k }, () => normal(random))
  if (start === 'spectral') spectralStart(centred, seen, k, users, movies)

  const byUser: number[][] = Array.from({ length: m }, () => [])
  const byMovie: number[][] = Array.from({ length: n }, () => [])
  for (let i = 0; i < m; i++)
    for (let j = 0; j < n; j++)
      if (seen[i * n + j]) {
        byUser[i].push(j)
        byMovie[j].push(i)
      }
  const userCols = byUser.map((js) => Int32Array.from(js))
  const userRatings = byUser.map((js, i) => Float64Array.from(js, (j) => centred.values[i * n + j]))
  const movieRows = byMovie.map((is) => Int32Array.from(is))
  const movieRatings = byMovie.map((is, j) => Float64Array.from(is, (i) => centred.values[i * n + j]))

  const f: Fit = { k, average, users, movies, history: [], trace: [] }
  const note = () => {
    f.history.push(objective(ratings, seen, f, lambda))
    if (trace) f.trace.push(filled(f, m, n))
  }
  note()
  for (let s = 0; s < sweeps; s++) {
    refit(users, movies, k, m, userCols, userRatings, lambda)
    refit(movies, users, k, n, movieRows, movieRatings, lambda)
    note()
  }
  return f
}

// The filled grid: every cell's guess
export function filled(f: Factors, m: number, n: number): Float64Array {
  const out = new Float64Array(m * n)
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) out[i * n + j] = guess(f, i, j)
  return out
}

// Root mean squared miss against `truth`, over the seen cells (`which` 1)
// or the hidden ones (`which` 0)
export function rmse(guess: ArrayLike<number>, truth: ArrayLike<number>, seen: Uint8Array, which: 0 | 1): number {
  let total = 0
  let cells = 0
  for (let c = 0; c < seen.length; c++)
    if (seen[c] === which) {
      total += (guess[c] - truth[c]) ** 2
      cells++
    }
  return cells ? Math.sqrt(total / cells) : 0
}

// --- The story: four friends, five films -------------------------------------

// Each film is a mix of action and romance (the rest of `action` is romance)
export const FILMS = [
  { name: 'Heist', action: 1 },
  { name: 'Duel', action: 0.75 },
  { name: 'Mr & Mrs', action: 0.5 },
  { name: 'Paris', action: 0.25 },
  { name: 'Letters', action: 0 },
] as const

// Each friend gives action some stars, and romance some
export const FRIENDS = [
  { name: 'Ana', action: 5, romance: 1 },
  { name: 'Ben', action: 1, romance: 5 },
  { name: 'Cy', action: 4, romance: 2 },
  { name: 'Dee', action: 2, romance: 4 },
] as const

// What each friend has seen (x) and not (.), film by film
const STORY_SEEN = ['xx..x', 'x.xxx', 'xxx.x', 'xx.xx']

export const romance = (film: { action: number }) => 1 - film.action

// A friend's rating of a film: their stars for action times how much action
// the film is, plus the same for romance
export const rating = (friend: { action: number; romance: number }, film: { action: number }) =>
  friend.action * film.action + friend.romance * romance(film)

export const STORY: Grid = {
  m: FRIENDS.length,
  n: FILMS.length,
  values: Float64Array.from(FRIENDS.flatMap((friend) => FILMS.map((film) => rating(friend, film)))),
}
export const STORY_MASK = Uint8Array.from(STORY_SEEN.join('').split(''), (c) => (c === 'x' ? 1 : 0))

// The story's back and forth: from random tastes and mixes (seed 7, which
// settles without wild swings), with almost no penalty and no average, as
// the story tells it. `trace[s]` is the grid after s rounds.
export const STORY_ROUNDS = 8
export const storyFit = () =>
  als(STORY, STORY_MASK, 2, { lambda: 0.001, sweeps: STORY_ROUNDS, seed: 7, start: 'random', centre: false, trace: true })

// --- The film club: the story scaled up ---------------------------------------

export const CLUB = { size: 40, k: 2, share: 0.2, noise: 0.15, seed: 3, seenSeed: 1, lambda: 0.3 }

export function club() {
  const { size, k, share, noise, seed, seenSeed, lambda } = CLUB
  const { ratings } = planted(size, size, k, seed, { noise })
  const seen = observe(size, size, share, seenSeed)
  const fit = als(ratings, seen, k, { lambda, sweeps: 30 })
  const guesses = filled(fit, size, size)
  const flat = filled({ ...fit, k: 0 }, size, size)
  return {
    ratings,
    seen,
    fit,
    guesses,
    seenCount: count(seen),
    // How far off the guesses for the blanks are, and how far off guessing
    // the average rating for every blank would be
    miss: rmse(guesses, ratings.values, seen, 0),
    missAverage: rmse(flat, ratings.values, seen, 0),
  }
}

// --- The guess: a million cells, rank 5 --------------------------------------

export const GUESS = { users: 1000, movies: 1000, k: 5, enough: 0.03, tooFew: 0.01 }

// Fill a planted users × movies grid of rank k from a share of its cells, and
// say how far off the blanks are against the truth, beside the spread of the
// ratings themselves (what guessing the average would miss by)
export function recover(users: number, movies: number, k: number, share: number, seed = 7) {
  const { truth, ratings } = planted(users, movies, k, seed)
  const seen = observe(users, movies, share, seed + 4)
  const fit = als(ratings, seen, k, { lambda: 0.01, sweeps: 30 })
  const guesses = filled(fit, users, movies)
  return {
    seenCount: count(seen),
    miss: rmse(guesses, truth.values, seen, 0),
    spread: rmse(filled({ ...fit, k: 0 }, users, movies), truth.values, seen, 0),
  }
}

// --- Three sizes of grid --------------------------------------------------------

// The Netflix Prize data: 100,480,507 ratings by 480,189 users of 17,770
// movies (Bennett and Lanning, 2007)
export const NETFLIX = { users: 480_189, movies: 17_770, ratings: 100_480_507 }

export const SIZES = [
  { name: 'The story', users: FRIENDS.length, movies: FILMS.length, k: 2 },
  { name: 'The guess', users: GUESS.users, movies: GUESS.movies, k: GUESS.k },
  { name: 'Netflix Prize', users: NETFLIX.users, movies: NETFLIX.movies, k: 50 },
] as const

// --- The lab: a 20 × 20 grid of rank 3 -----------------------------------------

export const LAB = { size: 20, k: 3, noise: 0.15, seed: 3, seenSeed: 5, sweeps: 60 }
export const PENALTIES = [0.01, 0.3, 3] as const
export type Penalty = (typeof PENALTIES)[number]

const LAB_GRID = planted(LAB.size, LAB.size, LAB.k, LAB.seed, { noise: LAB.noise })
export const LAB_RATINGS = LAB_GRID.ratings

export type LabRun = {
  seen: Uint8Array
  guesses: Float64Array
  seenCount: number
  missSeen: number
  missHidden: number
  numbers: number
}

const labRuns = new Map<string, LabRun>()

// Fit the lab's grid from `share` of its cells with k numbers each and
// penalty λ; worked out once per setting
export function labRun(share: number, k: number, lambda: number): LabRun {
  const key = `${share} ${k} ${lambda}`
  let run = labRuns.get(key)
  if (!run) {
    const { size, sweeps, seenSeed } = LAB
    const seen = observe(size, size, share, seenSeed)
    const fit = als(LAB_RATINGS, seen, k, { lambda, sweeps })
    const guesses = filled(fit, size, size)
    run = {
      seen,
      guesses,
      seenCount: count(seen),
      missSeen: rmse(guesses, LAB_RATINGS.values, seen, 1),
      missHidden: rmse(guesses, LAB_RATINGS.values, seen, 0),
      numbers: parameters(size, size, k),
    }
    labRuns.set(key, run)
  }
  return run
}

// The lab's opening setting, and the overfit one the quick check describes
export const LAB_START = { share: 0.5, k: 3, lambda: 0.3 as Penalty }
export const LAB_OVERFIT = { share: 0.5, k: 8, lambda: 0.01 as Penalty }

// --- Check yourself ---------------------------------------------------------------

export const SONGS = { listeners: 500, songs: 400, k: 4 }

// Formatting
export const thousands = (x: number) => Math.round(x).toLocaleString('en-US')
export const stars = (x: number) => x.toFixed(1)
export const miss = (x: number) => x.toFixed(2)
export const percent = (x: number) => `${+(x * 100).toFixed(1)}%`

// The film club's run, worked out once for the story
export const CLUB_RUN = club()
