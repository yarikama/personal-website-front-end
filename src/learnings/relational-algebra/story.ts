import { columnIndex, KITCHEN, TRAYS, type Ran, type Relation, type Value } from './model'

// The kitchen story, laid out: what each tray holds as cards, and what a
// station does with each card in turn. Every card and every move comes from
// running the model's operators; the figure only draws.

export type Shape = 'long' | 'short'
export interface Card {
  text: string
  // The pasta shapes on the card: a pasta's own, the one a sauce fits
  shapes: Shape[]
}

const get = (r: Relation, row: Value[], column: string) => String(row[columnIndex(r, column)])

const pastaCard = (row: Value[]): Card => ({ text: get(TRAYS.pasta, row, 'pasta'), shapes: [get(TRAYS.pasta, row, 'shape') as Shape] })
const sauceCard = (r: Relation, row: Value[]): Card => ({
  text: `${get(r, row, 'sauce')} · ${get(r, row, 'kind')}`,
  shapes: [get(r, row, 'fits') as Shape],
})
const plateCard = (r: Relation, row: Value[]): Card => ({
  text: `${get(r, row, 'pasta')} + ${get(r, row, 'sauce')}`,
  shapes: [get(r, row, 'shape') as Shape, get(r, row, 'fits') as Shape],
})
const prepCard = (row: Value[]): Card => ({ text: String(row[0]), shapes: [] })

export interface Tray {
  label: string
  cards: Card[]
}

// One move of a station: the input cards it looks at (tray, card), and the
// output card it makes or finds again (null when the card is turned away)
export interface Move {
  from: [number, number][]
  to: number | null
}

export interface Station {
  name: string
  inputs: Tray[]
  output: Tray
  moves: Move[]
}

const key = (row: Value[]) => JSON.stringify(row)
const indexIn = (r: Relation) => new Map(r.rows.map((row, i) => [key(row), i]))

const PASTAS: Tray = { label: 'Pastas', cards: TRAYS.pasta.rows.map(pastaCard) }
const SAUCES: Tray = { label: 'Sauces', cards: TRAYS.sauce.rows.map((row) => sauceCard(TRAYS.sauce, row)) }
const VEG: Tray = { label: 'Vegetarian sauces', cards: TRAYS.veg.rows.map((row) => sauceCard(TRAYS.veg, row)) }
const PAIRS: Tray = { label: 'Every plate', cards: TRAYS.pairs.rows.map((row) => plateCard(TRAYS.pairs, row)) }
const FITTING: Tray = { label: 'Plates that work', cards: TRAYS.fitting.rows.map((row) => plateCard(TRAYS.fitting, row)) }
const PREP: Tray = { label: 'Sauces to cook', cards: TRAYS.prep.rows.map(prepCard) }

// A filter: each card in turn, kept or turned away
function filterMoves(input: Relation, output: Relation): Move[] {
  const at = indexIn(output)
  return input.rows.map((row, i) => ({ from: [[0, i]], to: at.get(key(row)) ?? null }))
}

// A product: each pasta with each sauce, in the product's own order
function pairMoves(): Move[] {
  const sauces = TRAYS.veg.rows.length
  return TRAYS.pairs.rows.map((_, k) => ({
    from: [
      [0, Math.floor(k / sauces)],
      [1, k % sauces],
    ],
    to: k,
  }))
}

// Keeping one column: each plate to its sauce, written once
function prepMoves(): Move[] {
  const at = indexIn(TRAYS.prep)
  const sauce = columnIndex(TRAYS.fitting, 'sauce')
  return TRAYS.fitting.rows.map((row, i) => ({ from: [[0, i]], to: at.get(key([row[sauce]])) ?? null }))
}

export type StationName = 'veg' | 'pair' | 'fit' | 'prep'

export const STATIONS: Record<StationName, Station> = {
  veg: { name: 'Keep the vegetarian ones', inputs: [SAUCES], output: VEG, moves: filterMoves(TRAYS.sauce, TRAYS.veg) },
  pair: { name: 'Pair every pasta with every sauce', inputs: [PASTAS, VEG], output: PAIRS, moves: pairMoves() },
  fit: { name: 'Keep plates whose shapes match', inputs: [PAIRS], output: FITTING, moves: filterMoves(TRAYS.pairs, TRAYS.fitting) },
  prep: { name: 'Write down only the sauce', inputs: [FITTING], output: PREP, moves: prepMoves() },
}

export const START: Tray[] = [PASTAS, SAUCES]

// The whole line as a tree, top down: each node in kitchen words and in
// the database's, with how many rows it hands up
export interface Node {
  kitchen: string
  system: string
  rows: number
  inputs: Node[]
}

const KITCHEN_WORDS: Record<string, string> = {
  'π sauce': 'Sauce only',
  'σ shape = fits': 'Keep if shapes match',
  '×': 'Pair them all',
  "σ kind = 'veg'": 'Keep vegetarian',
  pastas: 'Pastas',
  sauces: 'Sauces',
}

function node(ran: Ran): Node {
  const leaf = ran.inputs.length === 0
  return {
    kitchen: KITCHEN_WORDS[ran.label] ?? ran.label,
    system: leaf ? ran.label.toUpperCase() : ran.label,
    rows: ran.out.rows.length,
    inputs: ran.inputs.map(node),
  }
}

export const TREE = node(KITCHEN)
