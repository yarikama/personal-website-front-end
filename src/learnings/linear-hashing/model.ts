import { seeded } from '../../components/explain/random'

// A hash file on disk: records go into buckets chosen from their key's hash
// value, each bucket is one page holding `capacity` records, and a bucket
// that gets more than that chains overflow pages behind its own. Keys here
// are their own hash values, as in the course's examples, so a key is a
// whole number and its bits are the bits the file looks at.

// ---------------------------------------------------------------------------
// Linear hashing
// ---------------------------------------------------------------------------

export interface LinearFile {
  // i: every bucket uses at least the last i bits of a hash
  bits: number
  // B: records a page holds
  capacity: number
  // Each bucket's keys in arrival order: the first `capacity` on its own
  // page, the rest on overflow pages
  buckets: readonly (readonly number[])[]
}

// The last `bits` bits of `hash`
export const lowBits = (hash: number, bits: number) => hash % 2 ** bits

// The split pointer p: the next bucket to split. A round starts with 2^i
// buckets and the pointer at 0, and each split adds one bucket and moves it
// on one, so it is always the number of buckets past 2^i.
export const pointer = (file: LinearFile) => file.buckets.length - 2 ** file.bits

// Where a hash lives: its last i bits, unless that bucket has already been
// split this round, in which case one bit more
export function address(hash: number, bits: number, p: number): number {
  const low = lowBits(hash, bits)
  return low < p ? lowBits(hash, bits + 1) : low
}

export const bucketOf = (file: LinearFile, hash: number) => address(hash, file.bits, pointer(file))

// How many bits bucket `j` reads: one more for those already split this
// round and for the ones the round has added
export const bitsUsed = (file: LinearFile, j: number) =>
  j < pointer(file) || j >= 2 ** file.bits ? file.bits + 1 : file.bits

// A file of 2^bits empty buckets
export function emptyLinear(bits: number, capacity: number): LinearFile {
  return { bits, capacity, buckets: Array.from({ length: 2 ** bits }, () => []) }
}

// A file laid out by hand; it must have between 2^bits and 2^(bits+1) − 1 buckets
export function linearFrom(bits: number, capacity: number, buckets: number[][]): LinearFile {
  if (buckets.length < 2 ** bits || buckets.length >= 2 ** (bits + 1)) {
    throw new Error(`${buckets.length} buckets do not fit ${bits} bits`)
  }
  return { bits, capacity, buckets: buckets.map((b) => [...b]) }
}

export const recordCount = (file: LinearFile) => file.buckets.reduce((sum, b) => sum + b.length, 0)

// Overflow pages behind a bucket holding `records` records
export const overflowPages = (records: number, capacity: number) => Math.max(0, Math.ceil(records / capacity) - 1)

export const linearOverflow = (file: LinearFile) =>
  file.buckets.reduce((sum, b) => sum + overflowPages(b.length, file.capacity), 0)

// Every page the file takes on disk: one per bucket, plus overflow pages
export const linearPages = (file: LinearFile) => file.buckets.length + linearOverflow(file)

// Put a key in its bucket, after the ones already there. No split.
export function put(file: LinearFile, key: number): { file: LinearFile; bucket: number; overflow: boolean } {
  const bucket = bucketOf(file, key)
  const buckets = file.buckets.map((b, j) => (j === bucket ? [...b, key] : b))
  return { file: { ...file, buckets }, bucket, overflow: buckets[bucket].length > file.capacity }
}

// Split the bucket at the pointer: add bucket N, and move to it every key of
// bucket p whose next bit is 1, which is every key whose last i + 1 bits name
// the new bucket. When the new bucket makes 2^(i+1), the round is over: i
// grows by one and the pointer is back at 0.
export function split(file: LinearFile): { file: LinearFile; from: number; to: number } {
  const from = pointer(file)
  const to = file.buckets.length
  const old = file.buckets[from]
  const stay = old.filter((k) => lowBits(k, file.bits + 1) === from)
  const move = old.filter((k) => lowBits(k, file.bits + 1) === to)
  const buckets = file.buckets.map((b, j) => (j === from ? stay : b)).concat([move])
  const bits = buckets.length === 2 ** (file.bits + 1) ? file.bits + 1 : file.bits
  return { file: { ...file, bits, buckets }, from, to }
}

// The fill factor n / (N·B): records over the room the buckets' own pages have
export const fill = (file: LinearFile) => recordCount(file) / (file.buckets.length * file.capacity)

// Too full: n / (N·B) above the limit, a percentage. Counted in whole
// numbers so that 80% of 20 slots is exactly 16.
export const overLimit = (records: number, buckets: number, capacity: number, limit: number) =>
  records * 100 > limit * buckets * capacity

// One insert as the course defines it: put the key in its bucket, then, if
// that leaves the file too full, split the bucket at the pointer, once.
export interface Insert {
  key: number
  // i and p when the key arrived, which decided its bucket
  bits: number
  pointer: number
  bucket: number
  // The key went onto an overflow page
  overflow: boolean
  split: { from: number; to: number } | null
}

export function insert(file: LinearFile, key: number, limit: number): { file: LinearFile; step: Insert } {
  const placed = put(file, key)
  const step: Insert = {
    key,
    bits: file.bits,
    pointer: pointer(file),
    bucket: placed.bucket,
    overflow: placed.overflow,
    split: null,
  }
  if (!overLimit(recordCount(placed.file), placed.file.buckets.length, file.capacity, limit)) {
    return { file: placed.file, step }
  }
  const s = split(placed.file)
  return { file: s.file, step: { ...step, split: { from: s.from, to: s.to } } }
}

export function buildLinear(
  keys: readonly number[],
  { bits, capacity, limit }: { bits: number; capacity: number; limit: number },
): { file: LinearFile; steps: Insert[] } {
  let file = emptyLinear(bits, capacity)
  const steps: Insert[] = []
  for (const key of keys) {
    const r = insert(file, key, limit)
    file = r.file
    steps.push(r.step)
  }
  return { file, steps }
}

// Pages a lookup reads to find a key: its bucket's own page, then down the
// chain to the page the key is on
export const pagesToFind = (position: number, capacity: number) => 1 + Math.floor(position / capacity)

// Average pages read to find each key that is there, over every key
export function averageLookup(buckets: readonly (readonly number[])[], capacity: number): number {
  let pages = 0
  let keys = 0
  for (const b of buckets) {
    b.forEach((_, position) => {
      pages += pagesToFind(position, capacity)
      keys++
    })
  }
  return keys === 0 ? 1 : pages / keys
}

// ---------------------------------------------------------------------------
// Static hashing: a fixed number of buckets, chosen once
// ---------------------------------------------------------------------------

export function buildStatic(keys: readonly number[], count: number): number[][] {
  const buckets: number[][] = Array.from({ length: count }, () => [])
  for (const key of keys) buckets[key % count].push(key)
  return buckets
}

export const staticPages = (buckets: readonly (readonly number[])[], capacity: number) =>
  buckets.length + buckets.reduce((sum, b) => sum + overflowPages(b.length, capacity), 0)

// ---------------------------------------------------------------------------
// Extendible hashing: split exactly the full bucket, through a directory
// ---------------------------------------------------------------------------

export interface Extendible {
  // gd: the directory has an entry for every value of the last gd bits
  depth: number
  // Entry e points at bucket directory[e]
  directory: number[]
  // Each bucket's local depth ld (how many bits its keys share) and keys
  buckets: { depth: number; keys: number[] }[]
  capacity: number
}

// Beyond this many bits a bucket stops splitting and takes overflow, so
// keys that share every bit cannot double the directory forever
const MOST_BITS = 24

export function emptyExtendible(capacity: number): Extendible {
  return { depth: 0, directory: [0], buckets: [{ depth: 0, keys: [] }], capacity }
}

export function extendibleFrom(
  depth: number,
  directory: number[],
  buckets: { depth: number; keys: number[] }[],
  capacity: number,
): Extendible {
  return { depth, directory: [...directory], buckets: buckets.map((b) => ({ depth: b.depth, keys: [...b.keys] })), capacity }
}

export const extendibleBucket = (e: Extendible, hash: number) => e.directory[lowBits(hash, e.depth)]

// Insert in place. A full bucket splits on its next bit; if it already uses
// every bit the directory has, the directory doubles first. Repeat until
// the key fits.
export function extendibleInsert(e: Extendible, key: number): void {
  for (;;) {
    const id = extendibleBucket(e, key)
    const bucket = e.buckets[id]
    if (bucket.keys.length < e.capacity || bucket.depth >= MOST_BITS) {
      bucket.keys.push(key)
      return
    }
    if (bucket.depth === e.depth) {
      e.directory = e.directory.concat(e.directory)
      e.depth++
    }
    const bit = 2 ** bucket.depth
    const added = e.buckets.length
    e.buckets.push({ depth: bucket.depth + 1, keys: bucket.keys.filter((k) => Math.floor(k / bit) % 2 === 1) })
    bucket.keys = bucket.keys.filter((k) => Math.floor(k / bit) % 2 === 0)
    bucket.depth++
    e.directory = e.directory.map((b, entry) => (b === id && Math.floor(entry / bit) % 2 === 1 ? added : b))
  }
}

export function buildExtendible(keys: readonly number[], capacity: number): Extendible {
  const e = emptyExtendible(capacity)
  for (const key of keys) extendibleInsert(e, key)
  return e
}

// ---------------------------------------------------------------------------
// The numbers the page states
// ---------------------------------------------------------------------------

export const binary = (n: number, digits: number) => n.toString(2).padStart(digits, '0').slice(-digits)

// The guess: a file of 10 buckets whose last split was bucket 1, and an
// insert that lands in full bucket 7
export const GUESS = { buckets: 10, full: 7 }
export const GUESS_BITS = Math.floor(Math.log2(GUESS.buckets))
export const GUESS_POINTER = GUESS.buckets - 2 ** GUESS_BITS

// The worked keys: the same 10-bucket file, i = 3 and p = 2
export const WORKED = [45, 41, 48].map((hash) => {
  const low = lowBits(hash, GUESS_BITS)
  return { hash, low, more: low < GUESS_POINTER, bucket: address(hash, GUESS_BITS, GUESS_POINTER) }
})

// Check yourself: 20 buckets, bucket 17 has just overflowed
export const CHECK = { buckets: 20, full: 17 }
export const CHECK_BITS = Math.floor(Math.log2(CHECK.buckets))
export const CHECK_POINTER = CHECK.buckets - 2 ** CHECK_BITS

// Rebuilding a static file all at once: read every page, write every page,
// at the Storage pages' 100 MB/s, even if it all streamed in order
export const REBUILD = { bytes: 10e9, bytesPerSecond: 100e6 }
export const rebuildSeconds = (bytes: number, bytesPerSecond: number) => (2 * bytes) / bytesPerSecond

// The 6 ms trip to a random page, from the Storage pages
export const TRIP_MS = 6

// ---------------------------------------------------------------------------
// The story: a coat check whose pigeonholes are buckets of two
// ---------------------------------------------------------------------------

export const STORY = { bits: 2, capacity: 2, limit: 75 }

// Four holes, six coats; tickets are 4-digit codes of 0s and 1s
export const STORY_START: number[][] = [[0b1000, 0b0100], [0b0101], [0b0010, 0b1010], [0b0111]]

export type Moment =
  | { kind: 'start' }
  | { kind: 'put'; key: number; bucket: number; overflow: boolean }
  | { kind: 'split'; from: number; to: number; emptied: boolean }
  | { kind: 'find'; key: number; bucket: number }

export interface Frame {
  file: LinearFile
  moment: Moment
}

// Frames for keys arriving one at a time: one after each key is put, and
// one after each split it sets off
export function arrive(file: LinearFile, keys: readonly number[], limit: number): Frame[] {
  const frames: Frame[] = []
  for (const key of keys) {
    const placed = put(file, key)
    file = placed.file
    frames.push({ file, moment: { kind: 'put', key, bucket: placed.bucket, overflow: placed.overflow } })
    if (overLimit(recordCount(file), file.buckets.length, file.capacity, limit)) {
      const before = file.buckets[pointer(file)].length
      const s = split(file)
      file = s.file
      const after = Math.max(file.buckets[s.from].length, file.buckets[s.to].length)
      frames.push({
        file,
        moment: { kind: 'split', from: s.from, to: s.to, emptied: before > file.capacity && after <= file.capacity },
      })
    }
  }
  return frames
}

const startFile = linearFrom(STORY.bits, STORY.capacity, STORY_START)
const start: Frame = { file: startFile, moment: { kind: 'start' } }

// The coat that lands in a full hole, and sets off the first split
export const FIRST = 0b1110
const firstFrames = arrive(startFile, [FIRST], STORY.limit)
// The guest who comes back for a coat moved by that split
export const RETURNING = 0b0100
const afterFirst = firstFrames[firstFrames.length - 1].file
const find: Frame = { file: afterFirst, moment: { kind: 'find', key: RETURNING, bucket: bucketOf(afterFirst, RETURNING) } }
// More coats: the splits move on down the line
export const MORE = [0b1001, 0b0011, 0b1011]
const moreFrames = arrive(afterFirst, MORE, STORY.limit)
const afterMore = moreFrames[moreFrames.length - 1].file
// The last coat, which ends the round
export const LAST = 0b0000
const lastFrames = arrive(afterMore, [LAST], STORY.limit)

// Each story step plays its frames in order, from the one before it
export const STORY_STEPS: Frame[][] = [
  [start],
  [start, firstFrames[0]],
  [firstFrames[0], firstFrames[1]],
  [find],
  [find, ...moreFrames],
  [moreFrames[moreFrames.length - 1], ...lastFrames],
  [{ file: lastFrames[lastFrames.length - 1].file, moment: { kind: 'start' } }],
]

export const STORY_END = lastFrames[lastFrames.length - 1].file

// ---------------------------------------------------------------------------
// The lab: keys arriving into a file that starts as a single bucket
// ---------------------------------------------------------------------------

export const LAB = { bits: 0, capacity: 4, staticBuckets: 16, most: 128 }
export const LIMITS = [50, 65, 80, 95] as const
export const LAB_LIMIT: (typeof LIMITS)[number] = 80

// Distinct random 16-bit hash values, the same every time
export const STREAM: number[] = (() => {
  const random = seeded(530)
  const seen = new Set<number>()
  const keys: number[] = []
  while (keys.length < LAB.most) {
    const key = Math.floor(random() * 2 ** 16)
    if (!seen.has(key)) {
      seen.add(key)
      keys.push(key)
    }
  }
  return keys
})()

export interface LabState {
  file: LinearFile
  last: Insert | null
  linear: { pages: number; overflow: number; lookup: number }
  static: { pages: number; overflow: number; lookup: number }
  extendible: { pages: number; directory: number; lookup: number }
}

export function lab(keys: readonly number[], limit: number): LabState {
  const { file, steps } = buildLinear(keys, { bits: LAB.bits, capacity: LAB.capacity, limit })
  const flat = buildStatic(keys, LAB.staticBuckets)
  const e = buildExtendible(keys, LAB.capacity)
  return {
    file,
    last: steps.length ? steps[steps.length - 1] : null,
    linear: { pages: linearPages(file), overflow: linearOverflow(file), lookup: averageLookup(file.buckets, LAB.capacity) },
    static: {
      pages: staticPages(flat, LAB.capacity),
      overflow: staticPages(flat, LAB.capacity) - LAB.staticBuckets,
      lookup: averageLookup(flat, LAB.capacity),
    },
    extendible: {
      pages: e.buckets.length,
      directory: e.directory.length,
      lookup: averageLookup(
        e.buckets.map((b) => b.keys),
        LAB.capacity,
      ),
    },
  }
}
