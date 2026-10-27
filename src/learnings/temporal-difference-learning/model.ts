// Tic-tac-toe, and a player that learns it by temporal-difference learning:
// the book's chapter 1 example, small enough to train in the browser.

// Nine marks, row by row: "X.O......" has X top left and O top right
export type Board = string
export type Outcome = 'win' | 'loss' | 'draw'

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
]

// Who has three in a row, 'draw' for a full board without, null while the
// game goes on
export function winner(board: Board): 'X' | 'O' | 'draw' | null {
  for (const [a, b, c] of LINES) {
    if (board[a] !== '.' && board[a] === board[b] && board[a] === board[c]) return board[a] as 'X' | 'O'
  }
  return board.includes('.') ? null : 'draw'
}

export const place = (board: Board, cell: number, mark: 'X' | 'O'): Board =>
  board.slice(0, cell) + mark + board.slice(cell + 1)

export const openCells = (board: Board) => [...board].flatMap((mark, cell) => (mark === '.' ? [cell] : []))

// The whole method: move the old guess a fraction `step` of the way toward
// the next one
export const nudge = (old: number, next: number, step: number) => old + step * (next - old)

// A table of guesses: for each board just after our move, the chance that
// we (X) go on to win from it. Boards it has never seen are worth 0.5.
export interface Learner {
  values: Map<Board, number>
  // How far each guess moves toward the next one
  step: number
  // How often it plays a random move, to see positions it would otherwise never try
  explore: number
}

export const newLearner = (step: number, explore: number): Learner => ({ values: new Map(), step, explore })

// A finished game is worth what happened: 1 for a win, 0 for a loss or a
// draw, which the book counts as just as bad
export function valueOf(learner: Learner, board: Board): number {
  const end = winner(board)
  if (end === 'X') return 1
  if (end) return 0
  return learner.values.get(board) ?? 0.5
}

// The opponent: sensible one move ahead and blind beyond it. It takes a win
// when it has one, blocks ours when it must, and otherwise plays anywhere,
// so it can be beaten, but only by setting up two threats at once.
export function opponentMove(board: Board, random: () => number): number {
  const cells = openCells(board)
  return (
    cells.find((cell) => winner(place(board, cell, 'O')) === 'O') ??
    cells.find((cell) => winner(place(board, cell, 'X')) === 'X') ??
    cells[Math.floor(random() * cells.length)]
  )
}

// Our move: usually the board with the best guess (ties broken at random),
// now and then any move at all. Says which, since only the first teaches.
export function chooseMove(learner: Learner, board: Board, random: () => number): { after: Board; explored: boolean } {
  const options = openCells(board).map((cell) => place(board, cell, 'X'))
  if (random() < learner.explore) return { after: options[Math.floor(random() * options.length)], explored: true }
  const best = Math.max(...options.map((option) => valueOf(learner, option)))
  const ties = options.filter((option) => valueOf(learner, option) === best)
  return { after: ties[Math.floor(random() * ties.length)], explored: false }
}

// One game, with us as X moving first. With `learn`, after each move the
// guess for the board after our previous move is nudged toward the guess
// for the board after this one, and the last toward how the game ended.
// A random move teaches nothing about the move before it: it was not what
// we would have played.
export function playGame(learner: Learner, random: () => number, learn = true): Outcome {
  let board = EMPTY
  let before: Board | null = null
  const update = (next: number) => {
    if (learn && before !== null) learner.values.set(before, nudge(valueOf(learner, before), next, learner.step))
  }
  for (;;) {
    const { after, explored } = chooseMove(learner, board, random)
    if (!explored) update(valueOf(learner, after))
    board = after
    before = after
    const end = winner(board)
    if (end === 'X') return 'win'
    if (end === 'draw') return 'draw'

    board = place(board, opponentMove(board, random), 'O')
    if (winner(board) === 'O') {
      update(0)
      return 'loss'
    }
  }
}

export function train(learner: Learner, random: () => number, games: number): Outcome[] {
  return Array.from({ length: games }, () => playGame(learner, random))
}

// The share of wins in each block of `size` games
export const winRates = (outcomes: Outcome[], size: number): number[] =>
  Array.from(
    { length: Math.floor(outcomes.length / size) },
    (_, block) => outcomes.slice(block * size, (block + 1) * size).filter((outcome) => outcome === 'win').length / size
  )

// What the learner thinks of each opening move, by cell
export const openingValues = (learner: Learner): number[] =>
  Array.from({ length: 9 }, (_, cell) => valueOf(learner, place(EMPTY, cell, 'X')))

// The same game over and over, ending in a win: `length` positions, each
// starting at 0.5, nudged in order toward the next (the last toward the
// win's 1) once a game. Returns the guesses after each game, game 0 being
// before the first. The win reaches one position further back each game.
export function backups(length: number, step: number, games: number): number[][] {
  const guesses = [Array<number>(length).fill(0.5)]
  for (let game = 0; game < games; game++) {
    const next = [...guesses[game]]
    for (let i = 0; i < length; i++) next[i] = nudge(next[i], i === length - 1 ? 1 : next[i + 1], step)
    guesses.push(next)
  }
  return guesses
}

// The story's drive to the airport, in minutes of the whole trip
export const DRIVE = { first: 40, jam: 60, step: 0.5 }
