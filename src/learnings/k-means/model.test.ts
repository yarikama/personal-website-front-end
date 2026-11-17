import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  acrossSplit,
  assign,
  cost,
  crowds,
  dist2,
  final,
  GOOD,
  INITS,
  LAB,
  lloyd,
  means,
  nearest,
  objective,
  PICNIC,
  PICNIC_CROWD,
  plusPlusBound,
  plusPlusChances,
  plusPlusStarts,
  randomStarts,
  restarts,
  ROWS,
  rounds,
  rowsSplit,
  run,
  STUCK,
  WORKED,
  workedRounds,
  type Point,
  type State,
} from './model'

const costs = (trace: State[]) => trace.slice(1).map((s) => s.cost!)

// Which found group holds most of each crowd, and whether every crowd got
// a group of its own
function crowdsFound(trace: State[]) {
  const labels = trace.at(-1)!.labels!
  const owner = [0, 1, 2].map((crowd) => {
    const counts = [0, 0, 0]
    labels.forEach((l, i) => {
      if (PICNIC_CROWD[i] === crowd) counts[l] += 1
    })
    return counts.indexOf(Math.max(...counts))
  })
  return new Set(owner).size
}

describe('the two steps', () => {
  it('sends a point to its nearest centre, keeping its centre on a tie', () => {
    const centres: Point[] = [
      [0, 0],
      [4, 0],
    ]
    expect(nearest([1, 0], centres)).toBe(0)
    expect(nearest([3, 1], centres)).toBe(1)
    // Halfway: the lowest index, unless the point is already with the other
    expect(nearest([2, 5], centres)).toBe(0)
    expect(nearest([2, 5], centres, 1)).toBe(1)
  })

  it('moves a centre to the mean of its points, and leaves one with none where it was', () => {
    const points: Point[] = [
      [0, 0],
      [2, 0],
      [1, 3],
    ]
    expect(means(points, [0, 0, 0], [[9, 9], [5, 5]])).toEqual([
      [1, 1],
      [5, 5],
    ])
  })

  it('scores as worked by hand', () => {
    const points: Point[] = [
      [0, 0],
      [3, 4],
    ]
    expect(dist2(points[0], points[1])).toBe(25)
    expect(cost(points, [0, 0], [[0, 0]])).toBe(25)
    expect(objective(points, [[0, 0], [3, 0]])).toBe(16)
  })

  it('finds the mean is the cheapest centre: any other place costs n × its distance² more', () => {
    const random = seeded(4)
    for (let t = 0; t < 50; t++) {
      const points = Array.from({ length: 8 }, () => [random() * 10, random() * 10] as const)
      const labels = points.map(() => 0)
      const [mean] = means(points, labels, [[0, 0]])
      const other: Point = [random() * 10, random() * 10]
      expect(cost(points, labels, [other])).toBeCloseTo(cost(points, labels, [mean]) + 8 * dist2(mean, other), 9)
    }
  })
})

describe("Lloyd's algorithm", () => {
  it('runs the worked example as by hand: 111, then 38.8, 22.75 and 6.67 after three rounds', () => {
    expect(WORKED[1].cost).toBe(111)
    expect(rounds(WORKED)).toBe(3)
    const told = workedRounds()
    expect(told.map((r) => r.centres)).toEqual([
      [1, 6.8],
      [2, 7.75],
      [8 / 3, 9],
    ])
    expect(told[0].cost).toBeCloseTo(38.8, 12)
    expect(told[1].cost).toBeCloseTo(22.75, 12)
    expect(told[2].cost).toBeCloseTo(20 / 3, 12)
    // In between, the assignments of rounds 2 and 3
    expect(WORKED[3].cost).toBeCloseTo(28.36, 12)
    expect(WORKED[5].cost).toBeCloseTo(12.6875, 12)
  })

  it('never raises the cost, at either step, on seeded crowds', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const random = seeded(seed)
      const k = 2 + Math.floor(random() * 5)
      const points = crowds(
        Array.from({ length: 4 }, () => ({ at: [random() * 10, random() * 6] as const, spread: 0.3 + random(), count: 10 })),
        seed
      )
      const trace = lloyd(points, randomStarts(points, k, random))
      const seen = costs(trace)
      for (let i = 1; i < seen.length; i++) expect(seen[i]).toBeLessThanOrEqual(seen[i - 1] + 1e-9)
    }
  })

  it('stops in a finite number of rounds, where another round would change nothing', () => {
    for (let seed = 1; seed <= 100; seed++) {
      for (const init of INITS) {
        const trace = run(LAB, 5, init, seed)
        expect(rounds(trace)).toBeLessThan(50)
        const last = trace.at(-1)!
        expect(assign(LAB, last.centres, last.labels)).toEqual(last.labels)
        expect(means(LAB, last.labels!, last.centres)).toEqual(last.centres)
        // Its cost is the objective of where the centres ended
        expect(final(trace)).toBeCloseTo(objective(LAB, last.centres), 9)
      }
    }
  })

  it('finds the three crowds from the story’s first start', () => {
    expect(rounds(GOOD)).toBe(5)
    expect(crowdsFound(GOOD)).toBe(3)
    expect(GOOD[1].cost).toBeCloseTo(312.3, 1)
    expect(final(GOOD)).toBeCloseTo(27.9, 1)
  })

  it('gets stuck from two starts in one crowd: it splits that crowd and merges the other two', () => {
    expect(crowdsFound(STUCK)).toBe(2)
    const labels = STUCK.at(-1)!.labels!
    // The left crowd shared by centres 0 and 1; the two right crowds all with centre 2
    const left = labels.filter((_, i) => PICNIC_CROWD[i] === 0)
    expect(new Set(left)).toEqual(new Set([0, 1]))
    expect(labels.filter((_, i) => PICNIC_CROWD[i] > 0).every((l) => l === 2)).toBe(true)
    expect(final(STUCK) / final(GOOD)).toBeGreaterThan(3)
    expect(final(STUCK)).toBeCloseTo(99.5, 1)
  })
})

describe('k-means++', () => {
  it('gives each point a chance in proportion to its squared distance, and none to a start', () => {
    const points: Point[] = [
      [0, 0],
      [1, 0],
      [3, 0],
    ]
    expect(plusPlusChances(points, [[0, 0]])).toEqual([0, 1 / 10, 9 / 10])
  })

  it('draws them at those rates', () => {
    const points: Point[] = [
      [0, 0],
      [1, 0],
      [3, 0],
    ]
    const random = seeded(9)
    let far = 0
    let draws = 0
    for (let t = 0; t < 20000; t++) {
      const starts = plusPlusStarts(points, 2, random)
      if (starts[0][0] !== 0) continue
      draws += 1
      if (starts[1][0] === 3) far += 1
      expect(starts[1][0]).not.toBe(0)
    }
    expect(far / draws).toBeCloseTo(0.9, 1)
  })

  it('never picks the same point twice', () => {
    const random = seeded(2)
    for (let t = 0; t < 200; t++) {
      const starts = plusPlusStarts(PICNIC, 3, random)
      expect(new Set(starts).size).toBe(3)
    }
  })

  it('ends lower on average than random starts on the lab’s crowds once k is past 2', () => {
    for (let k = 3; k <= 6; k++) {
      const { average } = restarts(k)
      expect(average['k-means++']).toBeLessThanOrEqual(average.Random)
    }
    // At k = 2 nearly every run of either kind finds the same split
    const two = restarts(2)
    expect(Math.abs(two.average['k-means++'] - two.average.Random)).toBeLessThan(two.best * 0.005)
  })

  it('reaches the best grouping far more often at k = 5, the lab’s crowds', () => {
    const { reached, average, best } = restarts(5)
    expect(best).toBeCloseTo(38.4, 1)
    expect(reached.Random).toBe(53)
    expect(reached['k-means++']).toBe(92)
    expect(average.Random).toBeCloseTo(114, 0)
    expect(average['k-means++']).toBeCloseTo(51, 0)
  })

  it('starts alone within its bound of the best, on average', () => {
    for (const k of [3, 5]) {
      const { best } = restarts(k)
      let sum = 0
      for (let s = 1; s <= 200; s++) sum += objective(LAB, plusPlusStarts(LAB, k, seeded(s)))
      expect(sum / 200).toBeLessThan(plusPlusBound(k) * best)
    }
    expect(plusPlusBound(3)).toBeCloseTo(24.79, 2)
  })
})

describe('two long thin rows', () => {
  it('scores a cut across both rows far below a group for each row', () => {
    expect(rowsSplit()).toBeCloseTo(2 * 41 * (41 * 41 - 1) / 12, 9)
    expect(acrossSplit()).toBeLessThan(rowsSplit() / 3)
  })

  it('is cut across by k-means, whichever of many starts is kept', () => {
    let best = Infinity
    let labels: number[] = []
    for (let s = 1; s <= 50; s++) {
      const trace = run(ROWS, 2, 'k-means++', s)
      if (final(trace) < best) {
        best = final(trace)
        labels = trace.at(-1)!.labels!
      }
    }
    // Each found group holds both rows
    for (const group of [0, 1]) {
      const rows = new Set(ROWS.filter((_, i) => labels[i] === group).map((p) => p[1]))
      expect(rows).toEqual(new Set([0, 1]))
    }
    expect(best).toBeLessThan(rowsSplit())
  })
})
