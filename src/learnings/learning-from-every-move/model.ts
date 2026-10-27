import { seeded } from '../../components/explain/random'

// Tic-tac-toe, and two ways to get better at it from the same number of
// games. We play X and move first. The opponent is imperfect: it takes a
// win when it has one, and otherwise plays anywhere.

// A board is 9 characters, row by row: "X", "O" or "." for empty
export type Board = string
export type Outcome = 'won' | 'lost' | 'draw'

export const EMPTY: Board = '.........'

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
] as const

// The line `mark` has completed, if any
export const lineOf = (board: Board, mark: 'X' | 'O') =>
  LINES.find((line) => line.every((i) => board[i] === mark)) ?? null

// How the game has ended for X, or null while it goes on
export function outcome(board: Board): Outcome | null {
  if (lineOf(board, 'X')) return 'won'
  if (lineOf(board, 'O')) return 'lost'
  return board.includes('.') ? null : 'draw'
}

export const emptySquares = (board: Board) => [...board].flatMap((mark, i) => (mark === '.' ? [i] : []))

export const place = (board: Board, square: number, mark: 'X' | 'O'): Board =>
  board.slice(0, square) + mark + board.slice(square + 1)

const pick = <T>(random: () => number, items: readonly T[]): T => items[Math.floor(random() * items.length)]

// A square that completes a line for `mark`, if there is one
export const winningSquare = (board: Board, mark: 'X' | 'O') =>
  emptySquares(board).find((square) => lineOf(place(board, square, mark), mark))

// The opponent's move: a winning square if it has one, otherwise any
export const opponentMove = (board: Board, random: () => number) =>
  winningSquare(board, 'O') ?? pick(random, emptySquares(board))

// The story's game, one board after each of our moves (we are X). The third
// move leaves the opponent a win on square 3, which they miss; the fourth wins.
export const GAME: Board[] = ['....X....', 'O.X.X....', 'O.X.X.O.X', 'O.X.XXOOX']
export const BLUNDER = 2

// A player for X: which square to take on `board`
export type Player = (board: Board) => number

// One game against the opponent. `afterOurMove` sees each position our
// moves make, as they are made.
export function playGame(player: Player, random: () => number, afterOurMove?: (board: Board) => void): Outcome {
  let board = EMPTY
  for (;;) {
    board = place(board, player(board), 'X')
    afterOurMove?.(board)
    const ours = outcome(board)
    if (ours) return ours
    board = place(board, opponentMove(board, random), 'O')
    const theirs = outcome(board)
    if (theirs) return theirs
  }
}

// How often a player wins and loses, over `games` games
export function record(player: Player, random: () => number, games: number) {
  let won = 0
  let lost = 0
  for (let i = 0; i < games; i++) {
    const end = playGame(player, random)
    if (end === 'won') won++
    else if (end === 'lost') lost++
  }
  return { won: won / games, lost: lost / games }
}

export interface Learner {
  // Learn from one more game
  play: () => void
  // How it plays now, without trying anything new
  player: () => Player
}

// Either learner breaks ties between equally good moves the same way every
// time, by a fixed shuffle of the squares for each position. Before it has
// learned anything, then, each plays one fixed strategy chosen at random,
// so the two start alike.
function tieBreak(salt: number) {
  return (board: Board, square: number) => {
    let hash = salt
    for (const mark of board + square) hash = Math.imul(hash ^ mark.charCodeAt(0), 0x5bd1e995) >>> 0
    return hash
  }
}

// --- Learning from final results: hill-climbing over whole strategies ---

// A strategy is a move for every position. It is written down as positions
// come up, each with a random move, which is the same as choosing a move for
// every position at the start. Both learners know the rules well enough to
// take a win they can see.
type Strategy = Map<Board, number>

function follow(strategy: Strategy, rank: (board: Board, square: number) => number): Player {
  return (board) => {
    const winning = winningSquare(board, 'X')
    if (winning !== undefined) return winning
    let square = strategy.get(board)
    if (square === undefined) {
      square = emptySquares(board).reduce((best, s) => (rank(board, s) > rank(board, best) ? s : best))
      strategy.set(board, square)
    }
    return square
  }
}

// Keep a strategy, and try a copy with `changes` of its moves changed. Play
// them in turn, `trial` games each, and switch only if the copy won more.
// (Both play again each round: carrying a count over from before would let
// one lucky streak stand forever.) Only how each game ended is used; what
// happened during it is not.
export function resultLearner(random: () => number, { trial = 50, changes = 3 } = {}): Learner {
  const rank = tieBreak(Math.floor(random() * 2 ** 32))
  let kept: Strategy = new Map()
  let candidate: Strategy = new Map()
  const wins = { kept: 0, candidate: 0 }
  let played = 0
  return {
    play() {
      const turn = played % 2 === 0 ? 'kept' : 'candidate'
      if (playGame(follow(turn === 'kept' ? kept : candidate, rank), random) === 'won') wins[turn]++
      if (++played < 2 * trial) return
      if (wins.candidate > wins.kept) kept = candidate
      candidate = new Map(kept)
      const positions = [...candidate.keys()]
      for (let i = 0; i < changes && positions.length; i++) {
        const board = pick(random, positions)
        candidate.set(board, pick(random, emptySquares(board)))
      }
      wins.kept = 0
      wins.candidate = 0
      played = 0
    },
    // On a copy, so measuring it writes nothing into what it has learned
    player: () => follow(new Map(kept), rank),
  }
}

// --- Learning from every move: a value for every position ---

// The chance of winning from a position just after our move, as learned so
// far: an even chance until learned, and a finished game what it ended as
export function valueOf(values: Map<Board, number>, board: Board): number {
  const end = outcome(board)
  if (end) return end === 'won' ? 1 : 0
  return values.get(board) ?? 0.5
}

function greedy(values: Map<Board, number>, rank: (board: Board, square: number) => number): Player {
  return (board) => {
    let best = -1
    let bestValue = -Infinity
    for (const square of emptySquares(board)) {
      const value = valueOf(values, place(board, square, 'X'))
      if (value > bestValue || (value === bestValue && rank(board, square) > rank(board, best))) {
        best = square
        bestValue = value
      }
    }
    return best
  }
}

// One update: the earlier position's value moves a fraction `step` of the
// way toward the later one's
export const nudge = (earlier: number, later: number, step: number) => earlier + step * (later - earlier)

// Mostly play the move to the best-valued position, sometimes (`explore`)
// a random one. After each best move, nudge the previous position's value
// toward the new one's; when the opponent wins, toward 0.
export function valueLearner(random: () => number, { step = 0.2, explore = 0.1 } = {}): Learner {
  const rank = tieBreak(Math.floor(random() * 2 ** 32))
  const values = new Map<Board, number>()
  const best = greedy(values, rank)
  return {
    play() {
      let previous: Board | null = null
      let exploring = false
      const player: Player = (board) => {
        exploring = random() < explore
        return exploring ? pick(random, emptySquares(board)) : best(board)
      }
      const end = playGame(player, random, (board) => {
        if (!exploring && previous !== null) values.set(previous, nudge(valueOf(values, previous), valueOf(values, board), step))
        previous = board
      })
      if (end === 'lost' && previous !== null) values.set(previous, nudge(valueOf(values, previous), 0, step))
    },
    player: () => best,
  }
}

// --- What a position is really worth ---

const worth = new Map<Board, number>()

// The true chance of winning from a position just after our move, playing
// as well as possible from there against this opponent: what learning
// values gets close to with enough games
export function chance(board: Board): number {
  const end = outcome(board)
  if (end) return end === 'won' ? 1 : 0
  const known = worth.get(board)
  if (known !== undefined) return known
  const winning = winningSquare(board, 'O')
  const replies = winning !== undefined ? [winning] : emptySquares(board)
  let total = 0
  for (const reply of replies) {
    const theirs = place(board, reply, 'O')
    total += outcome(theirs) ? chance(theirs) : Math.max(...emptySquares(theirs).map((s) => chance(place(theirs, s, 'X'))))
  }
  worth.set(board, total / replies.length)
  return total / replies.length
}

// --- The two side by side ---

export interface Race {
  games: number[]
  // How often each would lose and win now, at each count of games
  results: { won: number; lost: number }[]
  values: { won: number; lost: number }[]
}

// Both learners from the same start, `budget` games each. Every `every`
// games, `test` games without exploring measure how each plays.
export function race(seed: number, budget: number, every = 50, test = 300): Race {
  const random = seeded(seed)
  const testing = seeded(seed + 1)
  const byResults = resultLearner(random)
  const byValues = valueLearner(random)
  const run: Race = { games: [], results: [], values: [] }
  for (let games = 0; games <= budget; games++) {
    if (games % every === 0) {
      run.games.push(games)
      run.results.push(record(byResults.player(), testing, test))
      run.values.push(record(byValues.player(), testing, test))
    }
    if (games === budget) break
    byResults.play()
    byValues.play()
  }
  return run
}
