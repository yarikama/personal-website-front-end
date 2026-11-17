// Where the figure draws each page of a small B+-tree: leaves side by side
// along the bottom, each interior page centred over its children.

import type { BNode, BTree } from './model'

export const CELL = 26
export const NODE_H = 26
const ROW = 70
const TOP = 10
const LEAF_GAP = 14
export const WIDTH = 650

export interface Box {
  node: BNode
  x: number
  y: number
  width: number
}

export interface Edge {
  parent: number
  child: number
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface Link {
  from: number
  x1: number
  x2: number
  y: number
}

export interface Drawing {
  boxes: Box[]
  edges: Edge[]
  links: Link[]
  height: number
}

export function layOut(tree: BTree): Drawing {
  const width = tree.n * CELL
  const depthOf = (node: BNode): number => (node.children ? 1 + depthOf(node.children[0]) : 0)
  const levels = depthOf(tree.root) + 1
  const leaves: BNode[] = []
  const collect = (node: BNode) => (node.children ? node.children.forEach(collect) : leaves.push(node))
  collect(tree.root)

  const span = leaves.length * width + (leaves.length - 1) * LEAF_GAP
  const left = (WIDTH - span) / 2
  const centre = new Map<number, number>()
  leaves.forEach((leaf, i) => centre.set(leaf.id, left + i * (width + LEAF_GAP) + width / 2))

  const boxes: Box[] = []
  const edges: Edge[] = []
  const yAt = (depth: number) => TOP + depth * ROW
  const place = (node: BNode, depth: number): number => {
    if (node.children) {
      const centres = node.children.map((child) => place(child, depth + 1))
      centre.set(node.id, (centres[0] + centres[centres.length - 1]) / 2)
    }
    const x = centre.get(node.id)! - width / 2
    boxes.push({ node, x, y: yAt(depth), width })
    node.children?.forEach((child, i) =>
      edges.push({
        parent: node.id,
        child: child.id,
        x1: x + i * CELL,
        y1: yAt(depth) + NODE_H,
        x2: centre.get(child.id)!,
        y2: yAt(depth + 1),
      })
    )
    return centre.get(node.id)!
  }
  place(tree.root, 0)

  const leafY = yAt(levels - 1) + NODE_H / 2
  const links: Link[] = leaves.slice(0, -1).map((leaf, i) => ({
    from: leaf.id,
    x1: centre.get(leaf.id)! + width / 2 + 2,
    x2: centre.get(leaves[i + 1].id)! - width / 2 - 2,
    y: leafY,
  }))

  return { boxes, edges, links, height: yAt(levels - 1) + NODE_H + TOP }
}

// The tallest drawing the figure will need: three levels
export const MAX_HEIGHT = TOP + 2 * ROW + NODE_H + TOP
