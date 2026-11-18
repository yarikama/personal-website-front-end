import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  add,
  apply,
  bestMissed,
  CHANGE,
  changeOf,
  CHECK_FULL,
  CHECK_PARAMS,
  CHECK_SQUARE,
  FULL,
  fromPatterns,
  frobenius,
  fullParams,
  gaussian,
  HOUR_LIST,
  labRun,
  LAB,
  loraParams,
  loraShare,
  METHODS,
  multiply,
  N,
  NEEDED,
  NEW_SCHEDULE,
  orthonormal,
  percent,
  RATE,
  ROOM_LIST,
  ROOMS,
  SCHEDULE,
  STEPS,
  STORY,
  STRENGTHS,
  subtract,
  train,
  transpose,
  WORKED,
  zeros,
  type Matrix,
} from './model'

const randomMatrix = (random: () => number, m: number, n: number): Matrix =>
  Array.from({ length: m }, () => Array.from({ length: n }, () => 2 * random() - 1))

describe('counting what is trained', () => {
  it('matches the counts worked by hand', () => {
    expect(fullParams(4096, 4096)).toBe(16_777_216)
    expect(FULL).toBe(16_777_216)
    expect(loraParams(4096, 4096, 8)).toBe(65_536)
    expect(WORKED.map((w) => w.params)).toEqual([8_192, 65_536, 524_288])
    expect(WORKED.map((w) => percent(w.share))).toEqual(['0.05%', '0.39%', '3.1%'])
  })

  it('is 2r/d of a square table, and r(d + k) of any table', () => {
    const random = seeded(11)
    for (let trial = 0; trial < 200; trial++) {
      const d = 1 + Math.floor(random() * 5000)
      const k = 1 + Math.floor(random() * 5000)
      const r = 1 + Math.floor(random() * 64)
      expect(loraShare(d, d, r)).toBeCloseTo((2 * r) / d, 12)
      // Brute force: count B's cells and A's cells
      expect(loraParams(d, k, r)).toBe(d * r + r * k)
    }
  })

  it('answers the last check', () => {
    expect(CHECK_PARAMS).toBe(120_832)
    expect(CHECK_FULL).toBe(45_088_768)
    expect(percent(CHECK_PARAMS / CHECK_FULL)).toBe('0.27%')
    expect(CHECK_SQUARE).toBe(65_536)
  })
})

describe('the heating schedule', () => {
  it('has 192 settings, and a note of 32 numbers', () => {
    expect(SCHEDULE).toHaveLength(ROOMS.length)
    expect(SCHEDULE.every((row) => row.length === 24)).toBe(true)
    expect(STORY.settings).toBe(192)
    expect(STORY.note).toBe(32)
  })

  it('changes each cell by its room amount times its hour amount', () => {
    expect(CHANGE[0][20]).toBe(3)
    expect(CHANGE[0][17]).toBe(1.5)
    expect(CHANGE[1][20]).toBe(1.5)
    expect(CHANGE[3][20]).toBe(0)
    expect(CHANGE[0][12]).toBe(0)
    expect(STORY.most).toBe(3)
    expect(NEW_SCHEDULE[0][20]).toBe(SCHEDULE[0][20] + 3)
  })

  it('changes nothing while the room list is zero', () => {
    const blank = changeOf(ROOM_LIST.map(() => 0), HOUR_LIST)
    expect(blank.flat().every((x) => x === 0)).toBe(true)
  })

  it('is a table of rank one: every row a multiple of the hour list', () => {
    CHANGE.forEach((row, r) => row.forEach((x, h) => expect(x).toBe(ROOM_LIST[r] * HOUR_LIST[h])))
  })
})

describe('merging', () => {
  it('gives the same outputs as keeping B A beside W', () => {
    const random = seeded(5)
    for (let trial = 0; trial < 50; trial++) {
      const d = 2 + Math.floor(random() * 8)
      const k = 2 + Math.floor(random() * 8)
      const r = 1 + Math.floor(random() * 3)
      const W = randomMatrix(random, d, k)
      const B = randomMatrix(random, d, r)
      const A = randomMatrix(random, r, k)
      const x = Array.from({ length: k }, () => 2 * random() - 1)
      const beside = apply(W, x).map((v, i) => v + apply(B, apply(A, x))[i])
      const merged = apply(add(W, multiply(B, A)), x)
      merged.forEach((v, i) => expect(v).toBeCloseTo(beside[i], 10))
    }
  })
})

describe('the needed change', () => {
  it('has strengths 3 and 1 along orthonormal patterns', () => {
    expect(frobenius(NEEDED) ** 2).toBeCloseTo(10, 10)
    // Rank 2: every 3 × 3 minor vanishes
    const det3 = (m: Matrix) =>
      m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
      m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
      m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
    const pick = (rows: number[], columns: number[]) => rows.map((i) => columns.map((j) => NEEDED[i][j]))
    expect(det3(pick([1, 5, 9], [0, 4, 10]))).toBeCloseTo(0, 10)
    expect(det3(pick([2, 3, 11], [1, 6, 7]))).toBeCloseTo(0, 10)
  })

  it('leaves 1 of √10 to a rank-1 change at best', () => {
    expect(bestMissed(STRENGTHS, 1)).toBeCloseTo(1 / Math.sqrt(10), 12)
    expect(bestMissed(STRENGTHS, 2)).toBe(0)
    expect(LAB.rankOneFloor).toBeCloseTo(0.316, 3)
    expect(LAB.cells).toBe(144)
    expect(LAB.rankTwoParams).toBe(48)
  })
})

describe('training', () => {
  it('starts from the base model, whatever the method', () => {
    for (const method of METHODS) {
      const run = labRun(method, 'B at zero')
      expect(run.changes[0].flat().every((x) => x === 0)).toBe(true)
      expect(run.missed[0]).toBe(1)
      expect(run.changes).toHaveLength(STEPS + 1)
    }
  })

  it('shrinks the gap of full fine-tuning by 1 − rate a step', () => {
    const run = labRun('Full', 'B at zero')
    for (const t of [1, 10, 100, STEPS]) expect(run.missed[t]).toBeCloseTo((1 - RATE) ** t, 10)
    expect(run.params).toBe(144)
  })

  it('reaches the best rank-r change', () => {
    expect(labRun('Rank 1', 'B at zero').missed[STEPS]).toBeCloseTo(bestMissed(STRENGTHS, 1), 3)
    expect(labRun('Rank 2', 'B at zero').missed[STEPS]).toBeLessThan(0.01)
    expect(labRun('Rank 4', 'B at zero').missed[STEPS]).toBeLessThan(0.01)
    expect(labRun('Rank 2', 'B at zero').params).toBe(48)
  })

  it('never moves when both factors start at zero', () => {
    const run = labRun('Rank 2', 'Both at zero')
    expect(run.missed.every((m) => m === 1)).toBe(true)
  })

  it('reaches the best rank-r fit on random targets too', () => {
    const random = seeded(23)
    for (let trial = 0; trial < 12; trial++) {
      const m = 4 + Math.floor(random() * 5)
      const n = 4 + Math.floor(random() * 5)
      const strengths = [1.5 + random(), 0.3 + random() * 0.7, 0.1 + random() * 0.2]
      const rows = orthonormal(strengths.map(() => Array.from({ length: m }, () => gaussian(random))))
      const columns = orthonormal(strengths.map(() => Array.from({ length: n }, () => gaussian(random))))
      const needed = fromPatterns(strengths, rows, columns)
      for (const method of ['Rank 1', 'Rank 2'] as const) {
        const run = train(needed, method, 'B at zero', { steps: 3000, rate: 0.05, seed: trial + 1 })
        const r = method === 'Rank 1' ? 1 : 2
        expect(run.missed.at(-1)!).toBeCloseTo(bestMissed(strengths, r), 3)
      }
    }
  })
})

describe('the helpers', () => {
  it('multiply and transpose as by hand', () => {
    expect(multiply([[1, 2], [3, 4]], [[5], [6]])).toEqual([[17], [39]])
    expect(transpose([[1, 2, 3]])).toEqual([[1], [2], [3]])
    expect(subtract([[3]], [[1]])).toEqual([[2]])
    expect(zeros(2, 3)).toEqual([[0, 0, 0], [0, 0, 0]])
    expect(frobenius([[3, 4]])).toBe(5)
  })

  it('make vectors orthonormal', () => {
    const random = seeded(3)
    const qs = orthonormal(Array.from({ length: 4 }, () => Array.from({ length: N }, () => gaussian(random))))
    qs.forEach((a, i) =>
      qs.forEach((b, j) => expect(a.reduce((s, x, k) => s + x * b[k], 0)).toBeCloseTo(i === j ? 1 : 0, 10)),
    )
  })
})
