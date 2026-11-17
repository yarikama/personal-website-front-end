// Where a tree diagram draws each node: leaves side by side in the order
// the tree reads them, each question centred over its two answers, one row
// per level.

import { depthOf, type Tree } from './model'

// A question as words: "wind < 23 km/h"
export const asked = (feature: string, threshold: number, unit = '') =>
  `${feature} < ${Number.isInteger(threshold) ? threshold : threshold.toFixed(1)}${unit}`

export interface Placed {
  tree: Tree
  x: number
  y: number
}

export interface Joint {
  from: Placed
  to: Placed
  yes: boolean // the left answer: the value is under the threshold
}

export function place(tree: Tree, left: number, right: number, top: number, bottom: number, maxRow = 70) {
  const placed: Placed[] = []
  const joints: Joint[] = []
  const levels = Math.max(1, depthOf(tree))
  const row = Math.min(maxRow, (bottom - top) / levels)
  let leaf = 0
  const count = countLeaves(tree)
  const step = (right - left) / count
  const visit = (at: Tree): Placed => {
    if (at.kind === 'leaf') {
      const here = { tree: at, x: left + (leaf + 0.5) * step, y: top + at.depth * row }
      leaf++
      placed.push(here)
      return here
    }
    const l = visit(at.left)
    const r = visit(at.right)
    const here = { tree: at, x: (l.x + r.x) / 2, y: top + at.depth * row }
    placed.push(here)
    joints.push({ from: here, to: l, yes: true }, { from: here, to: r, yes: false })
    return here
  }
  visit(tree)
  return { placed, joints, row }
}

function countLeaves(tree: Tree): number {
  return tree.kind === 'leaf' ? 1 : countLeaves(tree.left) + countLeaves(tree.right)
}
