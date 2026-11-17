import { chunks, type PartitionOf } from './model'

// The story: 12 invoices and 6 shipping slips, to be stapled together by
// order number, on a table with room for 4 sheets. It is the model's joins
// with one row a page and 4 pages of memory, laid out as frames: where every
// sheet is after each move, and how many times a sheet has been picked up
// off the floor (a page read) and put down in a box (a page write).

export const INVOICES = [41, 25, 17, 63, 74, 38, 12, 56, 99, 80, 35, 87]
export const SLIPS = [56, 17, 80, 25, 99, 63]
export const ROOM = 4
// A table big enough for every slip and the invoice in hand
export const BIG_ROOM = SLIPS.length + 1
export const BOXES = ROOM - 1

// Boxes by an order number's last digit: 0–3, 4–6 and 7–9
export const byLastDigit: PartitionOf = (key, parts) => Math.floor(((key % 10) * parts) / 10)
export const BOX_DIGITS = ['0–3', '4–6', '7–9']

// The drawing, in SVG units
export const WIDTH = 480
export const HEIGHT = 330
export const CARD = { w: 28, h: 24 }
const ROW_X = 26
const PITCH = 36
export const INVOICE_Y = 34
export const SLIP_Y = 96
export const TABLE_Y = 162
export const TABLE_PITCH = 40
export const BOX_Y = 236
export const BOX = { w: 140, h: 70, gap: 12, pitch: 33 }
export const BOX_X = (WIDTH - BOXES * BOX.w - (BOXES - 1) * BOX.gap) / 2

export type Tone = 'plain' | 'matched' | 'look'
export interface Spot {
  x: number
  y: number
  tone: Tone
}
export interface Frame {
  at: Record<string, Spot>
  reads: number
  writes: number
}

export type Scene = 'start' | 'nested' | 'onePass' | 'partition' | 'boxJoin' | 'sort'

// Sheets by name: "i63" is invoice 63, "s63" the slip for it
export const invoice = (key: number) => `i${key}`
export const slip = (key: number) => `s${key}`

export const tableX = (room: number) => WIDTH / 2 - ((room - 1) * TABLE_PITCH) / 2 - CARD.w / 2
const tableSpot = (room: number, k: number, tone: Tone = 'plain'): Spot => ({
  x: tableX(room) + k * TABLE_PITCH,
  y: TABLE_Y,
  tone,
})
// The table's last spot: the sheet in hand
const handSpot = (room: number, tone: Tone = 'plain') => tableSpot(room, room - 1, tone)

const invoiceSpot = (k: number, tone: Tone = 'plain'): Spot => ({ x: ROW_X + k * PITCH, y: INVOICE_Y, tone })
const slipSpot = (k: number, tone: Tone = 'plain'): Spot => ({ x: ROW_X + k * PITCH, y: SLIP_Y, tone })
const boxSpot = (box: number, row: 0 | 1, k: number, tone: Tone = 'plain'): Spot => ({
  x: BOX_X + box * (BOX.w + BOX.gap) + 8 + k * BOX.pitch,
  y: BOX_Y + 8 + row * 32,
  tone,
})

const START: Frame = {
  at: Object.fromEntries([
    ...INVOICES.map((key, k) => [invoice(key), invoiceSpot(k)]),
    ...SLIPS.map((key, k) => [slip(key), slipSpot(k)]),
  ]),
  reads: 0,
  writes: 0,
}

// A frame from the one before, with some sheets moved
function after(frame: Frame, moves: [string, Spot][], reads = 0, writes = 0): Frame {
  return { at: { ...frame.at, ...Object.fromEntries(moves) }, reads: frame.reads + reads, writes: frame.writes + writes }
}

// Slips on the table, then every invoice through the last spot and back;
// a match turns both sage. `order` lays the slips out on the table.
function nestedFrames(room: number, groups: number[][]): Frame[] {
  let frame = START
  const frames = [frame]
  const matched = new Set<number>()
  const tone = (key: number): Tone => (matched.has(key) ? 'matched' : 'plain')
  for (const group of groups) {
    frame = after(
      frame,
      group.map((key, k) => [slip(key), tableSpot(room, k, tone(key))]),
      group.length
    )
    frames.push(frame)
    INVOICES.forEach((key, k) => {
      const hit = group.includes(key)
      if (hit) matched.add(key)
      const back: [string, Spot][] = k > 0 ? [[invoice(INVOICES[k - 1]), invoiceSpot(k - 1, tone(INVOICES[k - 1]))]] : []
      const moves: [string, Spot][] = [...back, [invoice(key), handSpot(room, tone(key))]]
      if (hit) moves.push([slip(key), tableSpot(room, group.indexOf(key), 'matched')])
      frame = after(frame, moves, 1)
      frames.push(frame)
    })
    // The last invoice back, the slips back to their pile
    const last = INVOICES[INVOICES.length - 1]
    frame = after(frame, [
      [invoice(last), invoiceSpot(INVOICES.length - 1, tone(last))],
      ...group.map((key): [string, Spot] => [slip(key), slipSpot(SLIPS.indexOf(key), tone(key))]),
    ])
    frames.push(frame)
  }
  return frames
}

// The table's 4 spots: the first 3 hold slips, and every 3 slips is one
// more trip through the invoices
const nestedGroups = Array.from({ length: chunks(SLIPS.length, ROOM) }, (_, g) => SLIPS.slice(g * (ROOM - 1), (g + 1) * (ROOM - 1)))
// On the big table, every slip at once, laid out by last digit
const byDigit = [...SLIPS].sort((a, b) => (a % 10) - (b % 10))

// Both piles dealt into boxes by last digit, through the spot in hand
const boxOf = (key: number) => byLastDigit(key, BOXES)
function boxed(keys: number[]): Map<number, number> {
  const place = new Map<number, number>()
  const count = Array(BOXES).fill(0)
  for (const key of keys) place.set(key, count[boxOf(key)]++)
  return place
}
const SLIP_PLACE = boxed(SLIPS)
const INVOICE_PLACE = boxed(INVOICES)
const slipBoxSpot = (key: number, tone: Tone = 'plain') => boxSpot(boxOf(key), 0, SLIP_PLACE.get(key)!, tone)
const invoiceBoxSpot = (key: number, tone: Tone = 'plain') => boxSpot(boxOf(key), 1, INVOICE_PLACE.get(key)!, tone)

function partitionFrames(): Frame[] {
  let frame = START
  const frames = [frame]
  const sheets: [string, (tone?: Tone) => Spot][] = [
    ...SLIPS.map((key): [string, (tone?: Tone) => Spot] => [slip(key), (tone) => slipBoxSpot(key, tone)]),
    ...INVOICES.map((key): [string, (tone?: Tone) => Spot] => [invoice(key), (tone) => invoiceBoxSpot(key, tone)]),
  ]
  sheets.forEach(([id], k) => {
    const back: [string, Spot][] = k > 0 ? [[sheets[k - 1][0], sheets[k - 1][1]()]] : []
    frame = after(frame, [...back, [id, handSpot(ROOM)]], 1, k > 0 ? 1 : 0)
    frames.push(frame)
  })
  const [lastId, lastSpot] = sheets[sheets.length - 1]
  frame = after(frame, [[lastId, lastSpot()]], 0, 1)
  frames.push(frame)
  return frames
}

export const PARTITIONED = partitionFrames()

// Box by box: its slips onto the table, its invoices through the spot in
// hand and back into the box
function boxJoinFrames(): Frame[] {
  let frame = PARTITIONED[PARTITIONED.length - 1]
  const frames = [frame]
  const matched = new Set<number>()
  const tone = (key: number): Tone => (matched.has(key) ? 'matched' : 'plain')
  for (let box = 0; box < BOXES; box++) {
    const slips = SLIPS.filter((key) => boxOf(key) === box)
    const invoices = INVOICES.filter((key) => boxOf(key) === box)
    frame = after(
      frame,
      slips.map((key, k): [string, Spot] => [slip(key), tableSpot(ROOM, k)]),
      slips.length
    )
    frames.push(frame)
    invoices.forEach((key, k) => {
      const hit = slips.includes(key)
      if (hit) matched.add(key)
      const back: [string, Spot][] = k > 0 ? [[invoice(invoices[k - 1]), invoiceBoxSpot(invoices[k - 1], tone(invoices[k - 1]))]] : []
      const moves: [string, Spot][] = [...back, [invoice(key), handSpot(ROOM, tone(key))]]
      if (hit) moves.push([slip(key), tableSpot(ROOM, slips.indexOf(key), 'matched')])
      frame = after(frame, moves, 1)
      frames.push(frame)
    })
    const last = invoices[invoices.length - 1]
    frame = after(frame, [
      [invoice(last), invoiceBoxSpot(last, tone(last))],
      ...slips.map((key): [string, Spot] => [slip(key), slipBoxSpot(key, tone(key))]),
    ])
    frames.push(frame)
  }
  return frames
}

// Both piles sorted in place, then walked side by side: the smaller of the
// two sheets in view steps on, and equal numbers are a match
function sortFrames(): Frame[] {
  const invoices = [...INVOICES].sort((a, b) => a - b)
  const slips = [...SLIPS].sort((a, b) => a - b)
  const matched = new Set<number>()
  const tone = (key: number): Tone => (matched.has(key) ? 'matched' : 'plain')
  const lay = (looking: [number, number] | null): Frame => ({
    at: Object.fromEntries([
      ...invoices.map((key, k) => [invoice(key), invoiceSpot(k, looking?.[0] === k && !matched.has(key) ? 'look' : tone(key))]),
      ...slips.map((key, k) => [slip(key), slipSpot(k, looking?.[1] === k && !matched.has(key) ? 'look' : tone(key))]),
    ]),
    reads: 0,
    writes: 0,
  })
  const frames = [START, lay(null)]
  let i = 0
  let j = 0
  while (i < invoices.length && j < slips.length) {
    if (invoices[i] === slips[j]) {
      matched.add(invoices[i])
      frames.push(lay([i, j]))
      i += 1
      j += 1
    } else {
      frames.push(lay([i, j]))
      if (invoices[i] < slips[j]) i += 1
      else j += 1
    }
  }
  frames.push(lay(null))
  return frames
}

export const SCENES: Record<Scene, Frame[]> = {
  start: [START],
  nested: nestedFrames(ROOM, nestedGroups),
  onePass: nestedFrames(BIG_ROOM, [byDigit]),
  partition: PARTITIONED,
  boxJoin: boxJoinFrames(),
  sort: sortFrames(),
}

// Where each scene ends
export const END = Object.fromEntries(Object.entries(SCENES).map(([scene, frames]) => [scene, frames[frames.length - 1]])) as Record<
  Scene,
  Frame
>

// How many times the invoices were gone through, in the nested loop
export const TRIPS = nestedGroups.length
