// "For all" and "only" questions over a small grid: people (or students)
// down the side, items (cafés, homeworks) along the top, a set of items the
// question is about (the good cafés, the homeworks set), and a tick where a
// person likes an item (or a student handed one in).
//
// Each question is answered three ways that must agree: by brute force, the
// quantifier read off the grid; in relational algebra, as everyone minus
// the people with a counterexample; and as SQL's nested NOT EXISTS, a loop
// for each subquery. The figures only draw what these return.

import { seeded } from '../../components/explain/random'

export interface World {
  people: string[]
  items: string[]
  // Per item: is it in the set the question is about (a good café)?
  good: boolean[]
  // likes[person][item]
  likes: boolean[][]
}

// all: x likes every good item. only: every item x likes is good.
// some: x likes at least one good item.
export type Question = 'all' | 'only' | 'some'
export const QUESTIONS: Question[] = ['all', 'only', 'some']

const range = (n: number) => Array.from({ length: n }, (_, i) => i)

// ── By brute force: the quantifier, read straight off the grid ──

export function holds(world: World, question: Question, person: number): boolean {
  const items = range(world.items.length)
  const likes = world.likes[person]
  if (question === 'all') return items.every((y) => !world.good[y] || likes[y])
  if (question === 'only') return items.every((y) => !likes[y] || world.good[y])
  return items.some((y) => likes[y] && world.good[y])
}

// The first item that rules a person out ("all": a good item they don't
// like; "only": a bad item they do), or null if there is none
export function counterexample(world: World, question: 'all' | 'only', person: number): number | null {
  const likes = world.likes[person]
  const found = range(world.items.length).find((y) =>
    question === 'all' ? world.good[y] && !likes[y] : likes[y] && !world.good[y],
  )
  return found ?? null
}

// For "some": the first good item a person likes, which lets them in
export function witness(world: World, person: number): number | null {
  return range(world.items.length).find((y) => world.likes[person][y] && world.good[y]) ?? null
}

// What a figure shows for one person: in or out, and the cell that decides it
export interface Verdict {
  in: boolean
  cell: number | null
  kind: 'counterexample' | 'witness' | null
}

export function verdict(world: World, question: Question, person: number): Verdict {
  if (question === 'some') {
    const cell = witness(world, person)
    return { in: cell !== null, cell, kind: cell === null ? null : 'witness' }
  }
  const cell = counterexample(world, question, person)
  return { in: cell === null, cell, kind: cell === null ? null : 'counterexample' }
}

// ── In relational algebra: sets of rows, and the operators on them ──

type Row = readonly string[]
type Relation = Row[]

const rowKey = (row: Row) => row.join('\u0000')

function distinct(rows: Relation): Relation {
  const seen = new Map<string, Row>()
  for (const row of rows) seen.set(rowKey(row), row)
  return [...seen.values()]
}
const minus = (a: Relation, b: Relation): Relation => {
  const out = new Set(b.map(rowKey))
  return distinct(a.filter((row) => !out.has(rowKey(row))))
}
const product = (a: Relation, b: Relation): Relation => a.flatMap((r) => b.map((s) => [...r, ...s]))
const select = (rows: Relation, keep: (row: Row) => boolean): Relation => rows.filter(keep)
const project = (rows: Relation, columns: number[]): Relation => distinct(rows.map((row) => columns.map((c) => row[c])))

// The world as stored tables: PEOPLE(name), GOOD(item), BAD(item),
// LIKES(person, item)
export function tables(world: World) {
  const people: Relation = world.people.map((p) => [p])
  const items: Relation = world.items.map((y) => [y])
  const good: Relation = world.items.filter((_, y) => world.good[y]).map((y) => [y])
  const likes: Relation = world.people.flatMap((p, x) =>
    world.items.filter((_, y) => world.likes[x][y]).map((y) => [p, y]),
  )
  return { people, good, bad: minus(items, good), likes }
}

// Everyone minus the counterexamples:
//   all:  PEOPLE − π_person((PEOPLE × GOOD) − LIKES)   (the missing pairs)
//   only: PEOPLE − π_person(LIKES ⋈ BAD)               (the bad likes)
//   some: π_person(LIKES ⋈ GOOD)                       (no minus at all)
export function algebra(world: World, question: Question): string[] {
  const { people, good, bad, likes } = tables(world)
  const joinOnItem = (set: Relation) => select(product(likes, set), (row) => row[1] === row[2])
  let answer: Relation
  if (question === 'all') answer = minus(people, project(minus(product(people, good), likes), [0]))
  else if (question === 'only') answer = minus(people, project(joinOnItem(bad), [0]))
  else answer = project(joinOnItem(good), [0])
  return inOrder(world, answer.map((row) => row[0]))
}

// ── In SQL: each subquery a loop, EXISTS true when it finds a row ──

export function sql(world: World, question: Question): string[] {
  const { people, good, bad, likes } = tables(world)
  const exists = (rows: Relation, where: (row: Row) => boolean) => rows.some(where)
  const answer = people.filter(([p]) => {
    if (question === 'all')
      // WHERE NOT EXISTS (SELECT * FROM good g
      //   WHERE NOT EXISTS (SELECT * FROM likes l WHERE l.person = p AND l.item = g.item))
      return !exists(good, ([g]) => !exists(likes, ([lp, ly]) => lp === p && ly === g))
    if (question === 'only')
      // WHERE NOT EXISTS (SELECT * FROM likes l
      //   WHERE l.person = p AND l.item IN (SELECT item FROM bad))
      return !exists(likes, ([lp, ly]) => lp === p && exists(bad, ([b]) => b === ly))
    // WHERE EXISTS (SELECT * FROM likes l WHERE l.person = p AND l.item IN (SELECT item FROM good))
    return exists(likes, ([lp, ly]) => lp === p && exists(good, ([g]) => g === ly))
  })
  return answer.map(([p]) => p)
}

// The classic mistake for "only": one row at a time, keep a person with any
// liked item that isn't bad.
//   SELECT DISTINCT l.person FROM likes l WHERE l.item NOT IN (SELECT item FROM bad)
export function mistaken(world: World): string[] {
  const { bad, likes } = tables(world)
  const badItems = new Set(bad.map(([b]) => b))
  return inOrder(
    world,
    project(
      select(likes, ([, y]) => !badItems.has(y)),
      [0],
    ).map(([p]) => p),
  )
}

export function bruteForce(world: World, question: Question): string[] {
  return world.people.filter((_, x) => holds(world, question, x))
}

const inOrder = (world: World, names: string[]) => world.people.filter((p) => names.includes(p))

export const named = (names: string[]) =>
  names.length === 0 ? 'no one' : names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`

const grid = (rows: number[][]) => rows.map((row) => row.map((cell) => cell === 1))

// ── Guess first: who does the one-row-at-a-time query return? ──

export const GUESS: World = {
  people: ['Ana', 'Bo', 'Cy'],
  items: ['Bean', 'Dove'],
  good: [true, false],
  likes: grid([
    [1, 1],
    [1, 0],
    [0, 1],
  ]),
}

// ── The story: a teacher, four students, three homeworks ──

export const CLASS: World = {
  people: ['Ana', 'Ben', 'Cy', 'Dee'],
  items: ['HW 1', 'HW 2', 'HW 3'],
  good: [true, true, true],
  likes: grid([
    [1, 1, 1],
    [1, 0, 1],
    [0, 1, 0],
    [1, 1, 1],
  ]),
}

// The hunt, row by row: each box looked at until the first gap
export interface Look {
  person: number
  item: number
  gap: boolean
}

export function hunt(world: World): Look[] {
  return world.people.flatMap((_, x) => {
    const stop = counterexample(world, 'all', x)
    const last = stop ?? world.items.length - 1
    return range(last + 1).map((y) => ({ person: x, item: y, gap: y === stop }))
  })
}

export const CLASS_HUNT = hunt(CLASS)
export const ON_LIST = bruteForce(CLASS, 'all')
export const OFF_LIST = CLASS.people.filter((p) => !ON_LIST.includes(p))
// Off the list, each with the first gap the hunt found
export const GAPS = OFF_LIST.map((p) => {
  const x = CLASS.people.indexOf(p)
  return { person: p, item: CLASS.items[counterexample(CLASS, 'all', x)!] }
})
// Every box a student's ticks could have filled, and how many are
export const TICKS = (person: string) => CLASS.likes[CLASS.people.indexOf(person)].filter(Boolean).length

// ── Three worked cases for the one line of math ──

const missing = (world: World, x: number) => world.items.filter((_, y) => world.good[y] && !world.likes[x][y]).length

// A new student in a class where nothing has been set yet
export const EMPTY_CLASS: World = { people: ['Dan'], items: [], good: [], likes: [[]] }

export const WORKED = [
  { name: 'Ana', set: CLASS.items.length, missing: missing(CLASS, 0), in: holds(CLASS, 'all', 0) },
  { name: 'Ben', set: CLASS.items.length, missing: missing(CLASS, 1), in: holds(CLASS, 'all', 1) },
  { name: 'Dan', set: 0, missing: missing(EMPTY_CLASS, 0), in: holds(EMPTY_CLASS, 'all', 0) },
]

// ── The lab: five people, five cafés ──

export const LAB: World = {
  people: ['Ana', 'Bo', 'Cy', 'Dee', 'Eve'],
  items: ['Bean', 'Dove', 'Fig', 'Moss', 'Oak'],
  good: [true, false, true, false, true],
  likes: grid([
    [1, 0, 1, 0, 1],
    [1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0],
    [0, 1, 0, 1, 0],
    [0, 0, 0, 0, 0],
  ]),
}

export const toggleLike = (world: World, x: number, y: number): World => ({
  ...world,
  likes: world.likes.map((row, i) => (i === x ? row.map((cell, j) => (j === y ? !cell : cell)) : row)),
})

export const toggleGood = (world: World, y: number): World => ({
  ...world,
  good: world.good.map((g, j) => (j === y ? !g : g)),
})

// A random world for the tests: up to 6 people and 6 items, any of them
// possibly empty
export function randomWorld(random: () => number): World {
  const people = range(1 + Math.floor(random() * 6)).map((i) => `p${i}`)
  const items = range(Math.floor(random() * 7)).map((j) => `i${j}`)
  const density = random()
  return {
    people,
    items,
    good: items.map(() => random() < 0.5),
    likes: people.map(() => items.map(() => random() < density)),
  }
}

export const randomWorlds = (seed: number, count: number) => {
  const random = seeded(seed)
  return range(count).map(() => randomWorld(random))
}
