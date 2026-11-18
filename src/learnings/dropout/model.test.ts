import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  CHECK_P,
  COOKS,
  expectedPassed,
  FLIPPED,
  FULL_PLATES,
  init,
  LAB_P,
  masks,
  passed,
  pct,
  platesOf,
  resultOf,
  ROTA,
  ROTA_MEAN,
  ROTA_PLATES,
  scaleOf,
  score,
  testScaleOf,
  thinnedOf,
  TRAIN,
  TRAIN_N,
  WORKED,
} from './model'

describe('one unit under inverted dropout', () => {
  it('passes on its output scaled by 1/(1 − p), or nothing', () => {
    expect(passed(3, 0.5, true)).toBe(6)
    expect(passed(3, 0.5, false)).toBe(0)
    expect(passed(3, 0.2, true)).toBeCloseTo(3.75)
    expect(passed(3, 0.8, true)).toBeCloseTo(15)
  })

  it('passes on its own output on average, whatever p', () => {
    for (const p of [0.1, 0.2, 0.5, 0.75, 0.8]) expect(expectedPassed(3, p)).toBeCloseTo(3)
  })

  it('gives the worked numbers', () => {
    expect(WORKED.map((w) => [w.p, Number(w.scale.toFixed(2)), Number(w.kept.toFixed(2)), w.mean])).toEqual([
      [0.2, 1.25, 3.75, 3],
      [0.5, 2, 6, 3],
      [0.8, 5, 15, 3],
    ])
  })

  it('averages to its output over many seeded coin tosses', () => {
    const random = seeded(1)
    for (const p of [0.2, 0.5, 0.8]) {
      let sum = 0
      const n = 40000
      for (let i = 0; i < n; i++) sum += passed(3, p, random() >= p)
      expect(sum / n).toBeGreaterThan(2.9)
      expect(sum / n).toBeLessThan(3.1)
    }
  })

  it('without the scaling, would hand the next layer 1 − p of the test-time signal in training', () => {
    // Plain dropout: kept units pass x unscaled, so the average is (1 − p) x;
    // scaling by 1 − p at test time matches it
    const p = CHECK_P
    const plainAverage = (1 - p) * 3
    expect(3 * testScaleOf(p)).toBeCloseTo(plainAverage)
    expect(testScaleOf(p)).toBeCloseTo(0.7)
    expect(scaleOf(0.75)).toBe(4)
  })
})

describe('the kitchen', () => {
  it('sends Ana, Di and Eli home on the first night', () => {
    expect(COOKS.filter((_, i) => !ROTA[0][i])).toEqual(['Ana', 'Di', 'Eli'])
  })

  it('makes two shares a cook on practice nights, six plates on average, as on a full night', () => {
    expect(ROTA_PLATES).toEqual([6, 10, 4, 6, 8, 4, 6, 4])
    expect(ROTA_MEAN).toBe(6)
    expect(FULL_PLATES).toBe(6)
    expect(platesOf(COOKS.map(() => true), 0)).toBe(6)
  })
})

describe('the network', () => {
  it('gives the same score with every unit kept and no scaling', () => {
    const net = init(8, 2)
    expect(score(net, 0.3, -0.4, net.v.map(() => true), 0)).toBeCloseTo(score(net, 0.3, -0.4))
  })

  it('averages, over every mask weighted by its chance, to the whole network (small enough to list them all)', () => {
    const net = init(4, 3)
    const p = 0.5
    for (const [x, y] of [
      [0.2, 0.1],
      [-0.7, 0.5],
      [0.9, -0.9],
    ]) {
      let mean = 0
      for (let bits = 0; bits < 16; bits++) {
        const mask = [0, 1, 2, 3].map((k) => ((bits >> k) & 1) === 1)
        const kept = mask.filter(Boolean).length
        mean += (1 - p) ** kept * p ** (4 - kept) * score(net, x, y, mask, p)
      }
      expect(mean).toBeCloseTo(score(net, x, y), 10)
    }
  })

  it('averages over many seeded masks to the whole network’s score', () => {
    const net = init(64, 5)
    const all = masks(4000, 0.5, 64, 9)
    for (const [x, y] of [
      [0.1, 0.2],
      [-0.5, -0.6],
    ]) {
      const mean = all.reduce((sum, mask) => sum + score(net, x, y, mask, 0.5), 0) / all.length
      expect(Math.abs(mean - score(net, x, y))).toBeLessThan(0.05 * (1 + Math.abs(score(net, x, y))))
    }
  })

  it('learns from points with exactly five wrong labels', () => {
    expect(TRAIN).toHaveLength(TRAIN_N)
    expect(TRAIN.filter((pt) => pt.label !== pt.truth)).toHaveLength(FLIPPED)
  })
})

describe('the lab', () => {
  it('fits every training point without dropout, and does worst on new points', () => {
    const [none, some, half] = LAB_P.map(resultOf)
    expect(none.trainRight).toBe(40)
    expect(some.trainRight).toBe(36)
    expect(half.trainRight).toBe(36)
    // What it gives up is four of the five wrong labels, and nothing else
    expect([none, some, half].map((r) => r.wrongFollowed)).toEqual([5, 1, 1])
    expect([none, some, half].map((r) => pct(r.newRight))).toEqual(['78%', '90%', '94%'])
  })
})

describe('many thinned networks', () => {
  const t = thinnedOf()

  it('are each worse than their average', () => {
    expect(pct(t.oneRight)).toBe('89%')
    expect(t.average.right).toBeGreaterThan(t.oneRight)
    for (const shown of t.shown) expect(shown.right).toBeLessThan(t.average.right)
  })

  it('average to nearly the whole network, which never drops a unit', () => {
    expect(pct(t.average.right)).toBe('95%')
    expect(pct(t.whole.right)).toBe('94%')
    expect(pct(t.agree)).toBe('99%')
  })
})
