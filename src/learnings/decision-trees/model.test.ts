import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  accuracy,
  BEST,
  bestSplit,
  CHECK,
  decrease,
  entropy,
  FIRST_GUESS,
  FULL,
  FULL_DEPTH,
  gini,
  grow,
  GROWN,
  GUESS,
  IMPURITIES,
  leaves,
  misclassification,
  nodes,
  ODD_DAYS,
  piles,
  PLANE_BOX,
  predict,
  SATURDAY_BOX,
  SATURDAY_SCORES,
  SATURDAY_TREES,
  SATURDAYS,
  scoreAll,
  TEST,
  TRAIN,
  weighted,
  type Counts,
  type Point,
} from './model'

// Seeded points with a few features and small whole-number values, so many
// share a value: the case where a careless sweep puts a threshold between
// equal values
function points(random: () => number, n: number, features: number, values: number): Point[] {
  return Array.from({ length: n }, () => ({
    x: Array.from({ length: features }, () => Math.floor(random() * values)),
    y: random() < 0.5 ? 0 : 1,
  }))
}

// The same points with no two sharing every feature, so none conflict
function distinct(list: Point[]): Point[] {
  const seen = new Set<string>()
  return list.filter((p) => {
    const key = p.x.join(',')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

describe('how mixed a pile is', () => {
  it('gives the hand-worked values', () => {
    expect(gini([400, 400])).toBeCloseTo(0.5, 12)
    expect(entropy([400, 400])).toBeCloseTo(1, 12)
    expect(misclassification([400, 400])).toBeCloseTo(0.5, 12)
    expect(gini([300, 100])).toBeCloseTo(3 / 8, 12)
    expect(gini([200, 400])).toBeCloseTo(4 / 9, 12)
    expect(entropy([300, 100])).toBeCloseTo(0.8113, 4)
    expect(entropy([200, 400])).toBeCloseTo(0.9183, 4)
    for (const pure of [[7, 0], [0, 3]]) {
      expect(gini(pure)).toBe(0)
      expect(entropy(pure)).toBe(0)
      expect(misclassification(pure)).toBe(0)
    }
  })

  it('is 2p(1 − p) for Gini with two classes', () => {
    for (let a = 0; a <= 20; a++) {
      const p = a / 20
      expect(gini([20 - a, a])).toBeCloseTo(2 * p * (1 - p), 12)
    }
  })

  it('ties the guess’s two questions on mistakes but not on Gini or entropy', () => {
    expect(weighted([...GUESS.a], misclassification)).toBeCloseTo(0.25, 12)
    expect(weighted([...GUESS.b], misclassification)).toBeCloseTo(0.25, 12)
    expect(weighted([...GUESS.a], gini)).toBeCloseTo(0.375, 12)
    expect(weighted([...GUESS.b], gini)).toBeCloseTo(1 / 3, 12)
    expect(weighted([...GUESS.a], entropy)).toBeCloseTo(0.811, 3)
    expect(weighted([...GUESS.b], entropy)).toBeCloseTo(0.689, 3)
    expect(decrease([...GUESS.parent], [...GUESS.a], gini)).toBeCloseTo(0.125, 12)
    expect(decrease([...GUESS.parent], [...GUESS.b], gini)).toBeCloseTo(1 / 6, 12)
  })

  it('lets the even split beat the small pure pile in Check yourself', () => {
    const c = decrease([...CHECK.parent], [...CHECK.c], gini)
    const d = decrease([...CHECK.parent], [...CHECK.d], gini)
    expect(c).toBeCloseTo(0.0556, 4)
    expect(d).toBeCloseTo(0.08, 12)
    expect(d).toBeGreaterThan(c)
  })

  it('never rises when a pile is split, on seeded counts', () => {
    const random = seeded(4)
    for (let trial = 0; trial < 2000; trial++) {
      const left: Counts = [Math.floor(random() * 30), Math.floor(random() * 30)]
      const right: Counts = [Math.floor(random() * 30), Math.floor(random() * 30)]
      if (left[0] + left[1] === 0 || right[0] + right[1] === 0) continue
      const parent = [left[0] + right[0], left[1] + right[1]]
      for (const impurity of Object.values(IMPURITIES)) {
        expect(decrease(parent, [left, right], impurity)).toBeGreaterThanOrEqual(-1e-12)
      }
    }
  })
})

describe('the search for the best question', () => {
  it('matches trying every threshold from scratch, on seeded data', () => {
    const random = seeded(1)
    for (let trial = 0; trial < 300; trial++) {
      const data = points(random, 2 + Math.floor(random() * 40), 1 + Math.floor(random() * 3), 2 + Math.floor(random() * 12))
      const minLeaf = 1 + Math.floor(random() * 4)
      for (const impurity of Object.values(IMPURITIES)) {
        const all = scoreAll(data, impurity, minLeaf)
        const best = bestSplit(data, impurity, minLeaf)
        if (all.length === 0) {
          expect(best).toBeNull()
          continue
        }
        const top = Math.max(...all.map((s) => s.decrease))
        expect(best).not.toBeNull()
        expect(best!.decrease).toBeCloseTo(top, 10)
        // and it is a real question with that score, not only the right number
        const same = all.find((s) => s.feature === best!.feature && Math.abs(s.threshold - best!.threshold) < 1e-12)
        expect(same).toBeDefined()
        expect(same!.decrease).toBeCloseTo(best!.decrease, 10)
      }
    }
  })

  it('finds the story’s first question: wind under 23 km/h', () => {
    const best = bestSplit(SATURDAYS)!
    expect(best.feature).toBe(1)
    expect(best.threshold).toBe(23)
    expect(best.decrease).toBeCloseTo(0.174, 3)
    expect(Math.max(...SATURDAY_SCORES.map((s) => s.decrease))).toBeCloseTo(best.decrease, 12)
    expect(piles(SATURDAYS, best)).toEqual([
      [7, 12],
      [9, 0],
    ])
  })

  it('scores the question you might ask first lower', () => {
    expect(piles(SATURDAYS, FIRST_GUESS)).toEqual([
      [9, 1],
      [7, 11],
    ])
    expect(FIRST_GUESS.decrease).toBeCloseTo(0.12, 2)
  })
})

describe('growing a tree', () => {
  it('fits every training point when grown to the end, if no two points conflict', () => {
    const random = seeded(2)
    for (let trial = 0; trial < 200; trial++) {
      const data = distinct(points(random, 2 + Math.floor(random() * 60), 1 + Math.floor(random() * 3), 3 + Math.floor(random() * 10)))
      for (const impurity of Object.values(IMPURITIES)) {
        const tree = grow(data, [[0, 20], [0, 20], [0, 20]], { impurity })
        expect(accuracy(tree, data)).toBe(1)
      }
    }
  })

  it('fits even exact XOR, where no single question helps', () => {
    const xor: Point[] = [
      { x: [0, 0], y: 0 },
      { x: [1, 1], y: 0 },
      { x: [0, 1], y: 1 },
      { x: [1, 0], y: 1 },
    ]
    expect(bestSplit(xor)!.decrease).toBeCloseTo(0, 12)
    expect(accuracy(grow(xor, [[0, 1], [0, 1]]), xor)).toBe(1)
  })

  it('only ever lowers the impurity, and its piles add up', () => {
    const random = seeded(3)
    for (let trial = 0; trial < 100; trial++) {
      const data = points(random, 10 + Math.floor(random() * 60), 2, 10)
      const tree = grow(data, [[0, 10], [0, 10]], { minLeaf: 1 + Math.floor(random() * 3) })
      for (const node of nodes(tree)) {
        const children = [node.left.counts, node.right.counts]
        expect(node.left.counts[0] + node.right.counts[0]).toBe(node.counts[0])
        expect(node.left.counts[1] + node.right.counts[1]).toBe(node.counts[1])
        expect(node.split.decrease).toBeGreaterThanOrEqual(-1e-12)
        expect(decrease(node.counts, children, gini)).toBeCloseTo(node.split.decrease, 10)
      }
    }
  })

  it('sends each point to the leaf whose box holds it', () => {
    const tree = GROWN[1][FULL_DEPTH].tree
    for (const p of TRAIN.slice(0, 50)) {
      const holding = leaves(tree).filter((leaf) => leaf.box.every(([low, high], f) => p.x[f] >= low && p.x[f] < high))
      expect(holding).toHaveLength(1)
      expect(predict(tree, p.x)).toBe(holding[0].label)
    }
  })

  it('keeps to the depth and the smallest leaf it is given', () => {
    for (const [minLeaf, grown] of Object.entries(GROWN)) {
      for (const g of grown) {
        for (const leaf of leaves(g.tree)) {
          expect(leaf.depth).toBeLessThanOrEqual(g.depth)
          expect(leaf.counts[0] + leaf.counts[1]).toBeGreaterThanOrEqual(Number(minLeaf))
        }
      }
    }
  })
})

describe('the page’s numbers', () => {
  it('tells the story’s Saturdays', () => {
    expect(SATURDAYS).toHaveLength(28)
    expect(SATURDAYS.filter((p) => p.y === 1)).toHaveLength(12)
    expect(accuracy(SATURDAY_TREES[0], SATURDAYS)).toBeCloseTo(16 / 28, 12)
    expect(leaves(SATURDAY_TREES[2]).map((l) => l.counts)).toEqual([
      [6, 1],
      [1, 11],
      [9, 0],
    ])
    expect(accuracy(SATURDAY_TREES[2], SATURDAYS)).toBeCloseTo(26 / 28, 12)
    expect(accuracy(SATURDAY_TREES[3], SATURDAYS)).toBe(1)
    expect(leaves(SATURDAY_TREES[3])).toHaveLength(7)
    // The two odd days: the cold day she ran, the birthday she skipped
    expect(ODD_DAYS.map((i) => SATURDAYS[i])).toEqual([
      { x: [8, 10], y: 1 },
      { x: [22, 8], y: 0 },
    ])
    expect(SATURDAY_BOX).toEqual([
      [0, 30],
      [0, 40],
    ])
  })

  it('shows the lab overfitting', () => {
    expect(TRAIN).toHaveLength(200)
    expect(TEST).toHaveLength(3000)
    expect(FULL_DEPTH).toBe(10)
    expect(FULL.train).toBe(1)
    expect(Math.round(100 * FULL.test)).toBe(76)
    expect(BEST.depth).toBe(3)
    expect(Math.round(100 * BEST.test)).toBe(83)
    expect(Math.round(100 * GROWN[5][FULL_DEPTH].test)).toBe(81)
    expect(PLANE_BOX).toEqual([
      [0, 10],
      [0, 10],
    ])
  })
})
