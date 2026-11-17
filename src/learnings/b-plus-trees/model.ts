// A B+-tree that really runs: insert with splits, look up a key, scan a
// range along the leaves. Then the arithmetic of how tall one gets, and the
// numbers the page quotes. The figures only draw what this computes.
//
// The tree follows the course's convention: every node is a page with room
// for n keys. A leaf holds up to n keys and a pointer to the next leaf; an
// interior node holds up to n keys and n + 1 pointers to children.

import { seeded } from '../../components/explain/random'

export interface BNode {
  id: number
  keys: number[]
  // An interior node's children, one more than its keys; null for a leaf
  children: BNode[] | null
  // A leaf's right-hand neighbour, by id; null at the right end
  next: number | null
}

export interface BTree {
  // Keys a node has room for
  n: number
  root: BNode
  // Every leaf, by id, so a scan can follow `next`
  leaves: Map<number, BNode>
  // The id the next new node gets
  ids: number
}

export interface Split {
  kind: 'leaf' | 'interior'
  // The node that split, and the new node to its right
  left: number
  right: number
  // The key the parent gets: copied up from a leaf (it stays in the new
  // leaf too), pushed up from an interior node (it leaves both halves)
  up: number
}

export interface InsertReport {
  key: number
  // False when the key was there already
  added: boolean
  splits: Split[]
  // A new root was made: the tree is a level taller
  grew: boolean
}

export function emptyTree(n: number): BTree {
  if (n < 2) throw new Error('A node needs room for at least two keys')
  const root: BNode = { id: 0, keys: [], children: null, next: null }
  return { n, root, leaves: new Map([[0, root]]), ids: 1 }
}

// Which child to follow for `key`: the largest i with keys[i - 1] ≤ key,
// that is, how many of the node's keys are at most `key`
export function childIndex(keys: number[], key: number): number {
  let i = 0
  while (i < keys.length && keys[i] <= key) i += 1
  return i
}

// The pages a search for `key` reads, root first, the leaf last
function descend(tree: BTree, key: number): BNode[] {
  const path = [tree.root]
  let node = tree.root
  while (node.children) {
    node = node.children[childIndex(node.keys, key)]
    path.push(node)
  }
  return path
}

const sortedInsert = (keys: number[], key: number) => keys.splice(childIndex(keys, key), 0, key)

// Put `key` into the tree, in place. A leaf with one key too many splits in
// two and copies the right half's first key up; a parent with one key too
// many splits around its middle key and pushes it up; a root that splits
// gets a new root above it, the only way the tree gets taller.
export function insert(tree: BTree, key: number): InsertReport {
  const path = descend(tree, key)
  const leaf = path.pop()!
  const report: InsertReport = { key, added: false, splits: [], grew: false }
  if (leaf.keys.includes(key)) return report
  report.added = true
  sortedInsert(leaf.keys, key)
  if (leaf.keys.length <= tree.n) return report

  // The leaf has n + 1 keys: keep the first half, the rest go to a new leaf
  // linked in just after it
  const keep = Math.ceil((tree.n + 1) / 2)
  const right: BNode = { id: tree.ids++, keys: leaf.keys.splice(keep), children: null, next: leaf.next }
  leaf.next = right.id
  tree.leaves.set(right.id, right)
  let up = right.keys[0]
  let left: BNode = leaf
  let added: BNode = right
  report.splits.push({ kind: 'leaf', left: leaf.id, right: right.id, up })

  for (;;) {
    const parent = path.pop()
    if (!parent) {
      tree.root = { id: tree.ids++, keys: [up], children: [left, added], next: null }
      report.grew = true
      return report
    }
    const at = parent.children!.indexOf(left)
    parent.keys.splice(at, 0, up)
    parent.children!.splice(at + 1, 0, added)
    if (parent.keys.length <= tree.n) return report

    // n + 1 keys and n + 2 pointers: keep the first half of the pointers
    // and the keys between them, push the next key up, move the rest
    const pointers = Math.ceil((tree.n + 2) / 2)
    const sibling: BNode = {
      id: tree.ids++,
      keys: parent.keys.splice(pointers),
      children: parent.children!.splice(pointers),
      next: null,
    }
    up = parent.keys.pop()!
    report.splits.push({ kind: 'interior', left: parent.id, right: sibling.id, up })
    left = parent
    added = sibling
  }
}

export function buildTree(keys: number[], n: number): BTree {
  const tree = emptyTree(n)
  for (const key of keys) insert(tree, key)
  return tree
}

// Levels from the root down to the leaves, both counted
export function height(tree: BTree): number {
  let levels = 1
  for (let node = tree.root; node.children; node = node.children[0]) levels += 1
  return levels
}

export interface Lookup {
  found: boolean
  // Ids of the pages read, root first
  path: number[]
}

export function lookup(tree: BTree, key: number): Lookup {
  const path = descend(tree, key)
  return { found: path[path.length - 1].keys.includes(key), path: path.map((node) => node.id) }
}

export interface Scan {
  // The keys from lo to hi, in order
  keys: number[]
  // The interior pages read on the way down, root first
  down: number[]
  // The leaves read, left to right
  leaves: number[]
  // Every page read: the way down plus the leaves
  pages: number
}

// Every key from `lo` to `hi`: go down once to the leaf where `lo` would be,
// then walk right along the leaves until a key past `hi` turns up (or the
// leaves run out). A leaf that ends at or below `hi` sends the walk on.
export function range(tree: BTree, lo: number, hi: number): Scan {
  const path = descend(tree, lo)
  let leaf: BNode | undefined = path.pop()!
  const keys: number[] = []
  const leaves: number[] = []
  while (leaf) {
    leaves.push(leaf.id)
    let past = false
    for (const key of leaf.keys) {
      if (key > hi) {
        past = true
        break
      }
      if (key >= lo) keys.push(key)
    }
    if (past || leaf.next === null) break
    leaf = tree.leaves.get(leaf.next)
  }
  const down = path.map((node) => node.id)
  return { keys, down, leaves, pages: down.length + leaves.length }
}

// A copy that shares nothing with the original, for a figure to keep
export function cloneTree(tree: BTree): BTree {
  const leaves = new Map<number, BNode>()
  const copy = (node: BNode): BNode => {
    const made: BNode = { id: node.id, keys: [...node.keys], children: node.children?.map(copy) ?? null, next: node.next }
    if (!made.children) leaves.set(made.id, made)
    return made
  }
  return { n: tree.n, root: copy(tree.root), leaves, ids: tree.ids }
}

// The fewest keys and pointers a node other than the root may hold: every
// node but the root stays at least half full
export const minLeafKeys = (n: number) => Math.floor((n + 1) / 2)
export const minPointers = (n: number) => Math.ceil((n + 1) / 2)

// Everything that must hold of a B+-tree, as a list of what is broken
// (empty when it is sound)
export function problems(tree: BTree): string[] {
  const found: string[] = []
  const leafDepths = new Set<number>()
  const inOrder: BNode[] = []
  const walk = (node: BNode, depth: number, low: number, high: number) => {
    const { keys } = node
    for (let i = 1; i < keys.length; i++) if (keys[i - 1] >= keys[i]) found.push(`node ${node.id}: keys out of order`)
    for (const key of keys) if (key < low || key >= high) found.push(`node ${node.id}: ${key} outside [${low}, ${high})`)
    if (keys.length > tree.n) found.push(`node ${node.id}: ${keys.length} keys, room for ${tree.n}`)
    const root = node === tree.root
    if (!node.children) {
      leafDepths.add(depth)
      inOrder.push(node)
      if (!root && keys.length < minLeafKeys(tree.n)) found.push(`leaf ${node.id}: under half full`)
      return
    }
    if (node.children.length !== keys.length + 1) found.push(`node ${node.id}: pointers and keys do not match`)
    if (root && node.children.length < 2) found.push('root: fewer than two children')
    if (!root && node.children.length < minPointers(tree.n)) found.push(`node ${node.id}: under half full`)
    node.children.forEach((child, i) =>
      walk(child, depth + 1, i === 0 ? low : keys[i - 1], i === keys.length ? high : keys[i])
    )
  }
  walk(tree.root, 0, -Infinity, Infinity)
  if (leafDepths.size > 1) found.push('leaves at different depths')

  // The chain of leaves: from the leftmost, every leaf once, in order
  const chain: number[] = []
  let leaf: BNode | undefined = inOrder[0]
  while (leaf && chain.length <= inOrder.length) {
    chain.push(leaf.id)
    leaf = leaf.next === null ? undefined : tree.leaves.get(leaf.next)
  }
  if (chain.join() !== inOrder.map((leaf) => leaf.id).join()) found.push('leaf chain broken')
  if (tree.leaves.size !== inOrder.length || inOrder.some((leaf) => tree.leaves.get(leaf.id) !== leaf)) {
    found.push('leaf index out of date')
  }
  return found
}

// Every key, from the leaves left to right
export const allKeys = (tree: BTree) => range(tree, -Infinity, Infinity).keys

// The fewest keys a tree of `levels` levels can hold, every node as empty
// as the rules allow: so a tree of N keys is at most the tallest `levels`
// whose fewest is at most N
export function fewestKeys(levels: number, n: number): number {
  if (levels === 1) return 0
  return 2 * minPointers(n) ** (levels - 2) * minLeafKeys(n)
}

export function tallest(keys: number, n: number): number {
  let levels = 1
  while (fewestKeys(levels + 1, n) <= keys) levels += 1
  return levels
}

// ---- How tall a tree gets ----

// Keys a page has room for: n keys and n + 1 pointers in `page` bytes
export const keysPerPage = (page: number, key: number, pointer: number) => Math.floor((page - pointer) / (key + pointer))

export const PAGE_BYTES = 4096
export const KEY_BYTES = 4
export const POINTER_BYTES = 4

// A 4 KB page of 4-byte keys and 4-byte page numbers: 511 keys, 512 children
export const MAX_KEYS = keysPerPage(PAGE_BYTES, KEY_BYTES, POINTER_BYTES)
export const FANOUT = MAX_KEYS + 1

// The same page with 60-byte string keys: 63 keys, 64 children
export const STRING_KEY_BYTES = 60
export const STRING_FANOUT = keysPerPage(PAGE_BYTES, STRING_KEY_BYTES, POINTER_BYTES) + 1

// Random inserts leave nodes about ln 2 ≈ 69% full on average (Yao, 1978)
export const TYPICAL_FILL = Math.LN2
export const TYPICAL_FANOUT = Math.round(FANOUT * TYPICAL_FILL)
// The emptiest a node other than the root may be
export const HALF_FANOUT = FANOUT / 2

// Pages on each level for `rows` entries, leaves first and the root last,
// with `perLeaf` entries a leaf and `fanout` children a node
export function levelSizes(rows: number, fanout: number, perLeaf = fanout): number[] {
  const sizes = [Math.max(1, Math.ceil(rows / perLeaf))]
  while (sizes[sizes.length - 1] > 1) sizes.push(Math.ceil(sizes[sizes.length - 1] / fanout))
  return sizes
}

export const levels = (rows: number, fanout: number, perLeaf = fanout) => levelSizes(rows, fanout, perLeaf).length

// The same thing as a power: the fewest h with fanoutʰ ≥ rows, ⌈log_F N⌉
export function logLevels(rows: number, fanout: number): number {
  let h = 1
  let reach = fanout
  while (reach < rows) {
    reach *= fanout
    h += 1
  }
  return h
}

// Binary search: halve until one is left, ⌈log₂ N⌉ looks
export const halvings = (rows: number) => logLevels(rows, 2)

// The table sizes the page works through
export const MILLION = 1e6
export const BILLION = 1e9
export const TRILLION = 1e12
export const SIZES = [MILLION, BILLION, TRILLION] as const

// The disk the Storage pages use: a random page read costs about 6 ms
export const RANDOM_READ_MS = 6

// The guess: a billion rows, pages of about 500 keys
export const GUESS = { rows: BILLION, perPage: 500 }

// Binary search over the sorted keys stored MAX_KEYS to a page: it reads a
// page at each step, so ⌈log₂ pages⌉ reads
export const pagedBinarySearch = (rows: number, perPage = MAX_KEYS) => halvings(Math.ceil(rows / perPage))

// Pages in the levels above the leaves, the root's first: what a buffer
// pool would keep so that only the leaf comes from disk
export function upperPages(rows: number, fanout: number): number {
  const sizes = levelSizes(rows, fanout)
  return sizes.slice(1).reduce((sum, size) => sum + size, 0)
}

// Index pages a range scan of `matches` consecutive keys reads, about: down
// to the first leaf, then the leaves those keys fill
export const rangePages = (matches: number, levelCount: number, perLeaf: number) =>
  levelCount - 1 + Math.ceil(matches / perLeaf)

// The check: 10,000 keys in a row from a billion
export const RANGE_CHECK = { rows: BILLION, matches: 10_000 }

// "1,000,000,000"
export const formatCount = (n: number) => n.toLocaleString('en-US')

// "33 MB", decimal, rounded
export const formatMB = (bytes: number) => `${Math.round(bytes / 1e6)} MB`

// ---- The library story ----

// A billion cards in a catalogue: a sign at the door names 8 cabinets,
// each cabinet has 500 drawers, each drawer 500 dividers, and behind each
// divider stand 500 cards. Each look picks one of these.
export const CATALOGUE = [8, 500, 500, 500] as const
export const CARDS = CATALOGUE.reduce((product: number, size) => product * size, 1)

// Cards still possible after each look, starting with all of them
export const cardsLeft = CATALOGUE.reduce((left: number[], size) => [...left, left[left.length - 1] / size], [CARDS])

// The story's binary search: how many cards are left after each halving
export function halvingRun(rows: number): number[] {
  const left = [rows]
  while (left[left.length - 1] > 1) left.push(Math.ceil(left[left.length - 1] / 2))
  return left
}

// ---- The tree the figure grows ----

// Room for 3 keys a node, 4 children: small enough to watch splits happen
export const LAB_N = 3
export const LAB_KEYS = 15

// 15 different two-digit keys in a shuffled order, from a seed picked so
// the root splits twice and an interior node splits on the way
export const LAB_SEED = 3
export function shuffledKeys(seed: number, count: number, low = 10, high = 99): number[] {
  const random = seeded(seed)
  const pool = Array.from({ length: high - low + 1 }, (_, i) => low + i)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, count)
}

export const ORDERS = ['shuffled', 'ascending'] as const
export type Order = (typeof ORDERS)[number]

const shuffled = shuffledKeys(LAB_SEED, LAB_KEYS)
export const LAB_ORDER: Record<Order, number[]> = { shuffled, ascending: [...shuffled].sort((a, b) => a - b) }

export interface Stage {
  tree: BTree
  // What the last insert did (null before the first)
  report: InsertReport | null
  // Splits so far
  splits: number
}

// The tree after each insert, from empty to every key in
export function grow(keys: number[], n: number): Stage[] {
  const tree = emptyTree(n)
  const stages: Stage[] = [{ tree: cloneTree(tree), report: null, splits: 0 }]
  for (const key of keys) {
    const report = insert(tree, key)
    stages.push({ tree: cloneTree(tree), report, splits: stages[stages.length - 1].splits + report.splits.length })
  }
  return stages
}

export const LAB_STAGES: Record<Order, Stage[]> = {
  shuffled: grow(LAB_ORDER.shuffled, LAB_N),
  ascending: grow(LAB_ORDER.ascending, LAB_N),
}

// How full the leaves are on average, from 0 to 1
export function leafFill(tree: BTree): number {
  let keys = 0
  for (const leaf of tree.leaves.values()) keys += leaf.keys.length
  return keys / (tree.leaves.size * tree.n)
}
