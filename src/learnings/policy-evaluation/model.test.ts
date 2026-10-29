import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  ALWAYS_ROLL,
  BOARD,
  FINISH,
  landing,
  LADDERS,
  play,
  SNAKES,
  solve,
  SPOTS,
  state,
  sweep,
  sweeps,
  WAYS,
  zeros,
} from './board'
import { evaluation, faces, PASSES, shrink, story, THETA, truth } from './model'

// Always rolling's values, from the equations solved outright (Gaussian
// elimination), to check the sweeps against
function solved(): number[] {
  const n = SPOTS.length
  const index = new Map(SPOTS.map((sq, i) => [sq, i]))
  // v(s) − Σ p v(s′) = −1, for every square you can stand on
  const rows = SPOTS.map((sq) => {
    const row = Array.from({ length: n + 1 }, () => 0)
    row[index.get(sq)!] += 1
    row[n] = -1
    for (const { next, chance } of BOARD.moves[state(sq)][0]) {
      const to = index.get(next + 1)
      if (to !== undefined) row[to] -= chance
    }
    return row
  })
  for (let col = 0; col < n; col++) {
    const pivot = rows.findIndex((row, r) => r >= col && Math.abs(row[col]) > 1e-12)
    ;[rows[col], rows[pivot]] = [rows[pivot], rows[col]]
    for (let r = 0; r < n; r++) {
      if (r === col) continue
      const factor = rows[r][col] / rows[col][col]
      for (let c = col; c <= n; c++) rows[r][c] -= factor * rows[col][c]
    }
  }
  const values = zeros()
  SPOTS.forEach((sq, i) => (values[state(sq)] = rows[i][n] / rows[i][i]))
  return values
}

describe('the board', () => {
  it('carries you up ladders and down snakes, and finishes at or past 30', () => {
    expect(landing(1, 2)).toBe(13)
    expect(landing(12, 2)).toBe(5)
    expect(landing(18, 1)).toBe(27)
    expect(landing(27, 3)).toBe(FINISH)
    expect(landing(29, 6)).toBe(FINISH)
    expect(faces(12)).toEqual([13, 5, 15, 16, 17, 18])
  })

  it('has 23 squares to stand on, so 2²³ ways to play', () => {
    expect(SPOTS).toHaveLength(23)
    for (const sq of [...Object.keys(LADDERS), ...Object.keys(SNAKES)].map(Number)) expect(SPOTS).not.toContain(sq)
    expect(WAYS).toBe(8_388_608)
  })

  it("gives every square's roll chances that sum to 1, and nothing to the rest", () => {
    BOARD.moves.forEach((moves, s) => {
      if (!SPOTS.includes(s + 1)) return expect(moves).toEqual([])
      expect(moves[0].reduce((sum, outcome) => sum + outcome.chance, 0)).toBeCloseTo(1, 12)
      expect(moves[1]).toHaveLength(1)
    })
  })
})

describe('policy evaluation by sweeps', () => {
  it('agrees with the equations solved outright', () => {
    const exact = solved()
    for (const sq of SPOTS) expect(truth()[state(sq)]).toBeCloseTo(exact[state(sq)], 8)
    expect(truth()[state(1)]).toBeCloseTo(-9.6, 1)
  })

  it('works out square 27 by hand: −1 plus a sixth of v(18) and v(29)', () => {
    const v = truth()
    expect(v[state(29)]).toBeCloseTo(-1, 12)
    expect(v[state(27)]).toBeCloseTo(-1 + (v[state(18)] + v[state(29)]) / 6, 12)
  })

  it('sees one turn further each sweep: −1 after one, −3 at square 1 after three', () => {
    for (const sq of SPOTS) expect(PASSES[1].values[state(sq)]).toBeCloseTo(-1, 12)
    expect(PASSES[3].values[state(1)]).toBeCloseTo(-3, 12)
    expect(PASSES[2].values[state(27)]).toBeCloseTo(-4 / 3, 12)
  })

  it('stops at the first sweep whose biggest change is under θ', () => {
    expect(PASSES.length - 1).toBe(26)
    expect(PASSES.at(-1)!.delta).toBeLessThan(THETA)
    expect(PASSES.at(-2)!.delta).toBeGreaterThanOrEqual(THETA)
    expect(shrink(PASSES)).toBeCloseTo(0.79, 2)
  })

  it('can stop further from the truth than θ (the quick check)', () => {
    expect(evaluation(THETA, 'copies').error).toBeGreaterThan(3 * THETA)
  })

  it('takes fewer sweeps in place, and fewest going down from the finish', () => {
    const [copies, up, down] = (['copies', 'up', 'down'] as const).map((order) => evaluation(THETA, order).sweeps)
    expect(down).toBeLessThan(up)
    expect(up).toBeLessThan(copies)
    expect(down).toBe(10)
  })

  it('changes nothing once the values are right', () => {
    expect(sweep(truth(), ALWAYS_ROLL).delta).toBeLessThan(1e-10)
    expect(solve(ALWAYS_ROLL)).toBe(truth())
    expect(sweeps(ALWAYS_ROLL, 1e-6, 'copies', truth())).toHaveLength(2)
  })
})

describe('the story', () => {
  it('plays the game the narration tells: 8 turns, 2 ladders, one snake twice', () => {
    const game = story()
    expect(game).toHaveLength(8)
    expect(game.at(-1)!.to).toBe(FINISH)
    expect(game.filter((turn) => turn.reached in LADDERS)).toHaveLength(2)
    const snakes = game.filter((turn) => turn.reached in SNAKES).map((turn) => turn.reached)
    expect(snakes).toEqual([28, 28])
  })

  it('has games that last, on average, as long as the value says', () => {
    const random = seeded(5)
    const games = 4000
    let turns = 0
    for (let i = 0; i < games; i++) turns += play(ALWAYS_ROLL, random).length
    expect(turns / games).toBeCloseTo(-truth()[state(1)], 0)
  })
})
