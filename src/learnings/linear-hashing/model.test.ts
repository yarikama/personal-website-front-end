import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  address,
  averageLookup,
  bucketOf,
  buildExtendible,
  buildLinear,
  buildStatic,
  CHECK,
  CHECK_BITS,
  CHECK_POINTER,
  emptyLinear,
  extendibleBucket,
  extendibleFrom,
  extendibleInsert,
  fill,
  GUESS,
  GUESS_BITS,
  GUESS_POINTER,
  insert,
  lab,
  LAB,
  LIMITS,
  linearFrom,
  linearOverflow,
  linearPages,
  pointer,
  put,
  rebuildSeconds,
  REBUILD,
  recordCount,
  split,
  STORY,
  STORY_END,
  STORY_STEPS,
  STREAM,
  WORKED,
  type LinearFile,
} from './model'

const sorted = (file: LinearFile) => file.buckets.map((b) => [...b].sort((x, y) => x - y))
const keysOf = (random: () => number, n: number, range = 2 ** 16) =>
  Array.from({ length: n }, () => Math.floor(random() * range))

describe('the address rule', () => {
  it('reads one more bit only for buckets the pointer has passed', () => {
    // i = 2, p = 2 (six buckets): the practice question in the notes
    expect(address(0b1101, 2, 2)).toBe(5)
    expect(address(0b0110, 2, 2)).toBe(2)
    expect(address(0b0100, 2, 2)).toBe(4)
    expect(address(0b0011, 2, 2)).toBe(3)
  })

  it('works the page’s three keys: i = 3, p = 2', () => {
    expect(GUESS_BITS).toBe(3)
    expect(GUESS_POINTER).toBe(2)
    expect(WORKED.map((w) => [w.hash, w.low, w.more, w.bucket])).toEqual([
      [45, 5, false, 5],
      [41, 1, true, 9],
      [48, 0, true, 0],
    ])
  })

  it('always names a bucket that exists', () => {
    const random = seeded(1)
    for (let t = 0; t < 2000; t++) {
      const bits = Math.floor(random() * 6)
      const p = Math.floor(random() * 2 ** bits)
      const b = address(Math.floor(random() * 2 ** 20), bits, p)
      expect(b).toBeGreaterThanOrEqual(0)
      expect(b).toBeLessThan(2 ** bits + p)
    }
  })

  it('agrees with the textbook’s form: i + 1 bits, and drop the top bit if that bucket is not there yet', () => {
    const random = seeded(2)
    for (let t = 0; t < 2000; t++) {
      const bits = 1 + Math.floor(random() * 6)
      const n = 2 ** bits + Math.floor(random() * 2 ** bits)
      const hash = Math.floor(random() * 2 ** 20)
      const m = hash % 2 ** (bits + 1)
      const book = m < n ? m : m - 2 ** bits
      expect(address(hash, bits, n - 2 ** bits)).toBe(book)
    }
  })

  it('puts the check’s file, 20 buckets, at i = 4 and p = 4', () => {
    expect(CHECK_BITS).toBe(4)
    expect(CHECK_POINTER).toBe(4)
    expect(CHECK.full).not.toBe(CHECK_POINTER)
  })
})

describe('the notes’ example, corrected', () => {
  // gd = 2, six buckets, keys in binary; the splits happen where the class put them
  const start = () =>
    linearFrom(2, 2, [[0b0000], [0b0001], [0b1010, 0b0010], [0b1111, 0b0111], [], [0b0101, 0b1101]])

  it('traces to bucket 3 empty and bucket 7 holding both 1111 and 0111', () => {
    let file = start()
    expect(pointer(file)).toBe(2)
    file = put(file, 0b0110).file
    expect(file.buckets[2]).toEqual([0b1010, 0b0010, 0b0110])
    file = put(file, 0b1000).file
    expect(file.buckets[0]).toEqual([0b0000, 0b1000])

    const first = split(file)
    expect([first.from, first.to]).toEqual([2, 6])
    file = first.file
    expect(file.buckets[2]).toEqual([0b1010, 0b0010])
    expect(file.buckets[6]).toEqual([0b0110])
    file = put(file, 0b1001).file
    expect(file.buckets[1]).toEqual([0b0001, 0b1001])

    const second = split(file)
    expect([second.from, second.to]).toEqual([3, 7])
    file = second.file
    expect(file.bits).toBe(3)
    expect(pointer(file)).toBe(0)
    expect(file.buckets[3]).toEqual([])
    expect(file.buckets[7]).toEqual([0b1111, 0b0111])
    file = put(file, 0b1000).file
    expect(file.buckets[0]).toEqual([0b0000, 0b1000, 0b1000])
  })
})

describe('the chapter’s full trace from an empty file', () => {
  it('ends in the file worked by hand: B = 2, split above 75%', () => {
    const keys = [
      0b0101, 0b1100, 0b0011, 0b1010, 0b1111, 0b0110, 0b1001, 0b0001, 0b1110, 0b0100, 0b1011, 0b0000,
    ]
    const { file, steps } = buildLinear(keys, { bits: 1, capacity: 2, limit: 75 })
    expect(steps.map((s) => s.split?.from ?? null)).toEqual([null, null, null, 0, 1, null, 0, 1, null, 2, 3, null])
    // Insert 7 lands in bucket 1 but splits bucket 0
    expect(steps[6].bucket).toBe(1)
    expect(file.bits).toBe(3)
    expect(sorted(file)).toEqual([
      [0b0000],
      [0b0001, 0b1001],
      [0b1010],
      [0b0011, 0b1011],
      [0b0100, 0b1100],
      [0b0101],
      [0b0110, 0b1110],
      [0b1111],
    ])
  })
})

describe('linear hashing on random keys', () => {
  const settings = [
    { bits: 0, capacity: 2, limit: 75 },
    { bits: 0, capacity: 4, limit: 80 },
    { bits: 2, capacity: 4, limit: 50 },
    { bits: 1, capacity: 10, limit: 95 },
  ]

  it('finds every key it was given, in the bucket the rule names', () => {
    const random = seeded(3)
    for (const s of settings) {
      for (let run = 0; run < 20; run++) {
        const keys = keysOf(random, 1 + Math.floor(random() * 300))
        const { file } = buildLinear(keys, s)
        expect(recordCount(file)).toBe(keys.length)
        for (const key of keys) expect(file.buckets[bucketOf(file, key)]).toContain(key)
        // and every key sits where the rule sends it
        file.buckets.forEach((b, j) => b.forEach((key) => expect(bucketOf(file, key)).toBe(j)))
      }
    }
  })

  it('splits round-robin: 0, 1, …, 2^i − 1, then from 0 again with one more bit', () => {
    const random = seeded(4)
    const { steps } = buildLinear(keysOf(random, 600), { bits: 0, capacity: 3, limit: 80 })
    const order = steps.flatMap((s) => (s.split ? [s.split.from] : []))
    let bits = 0
    let next = 0
    for (const from of order) {
      expect(from).toBe(next)
      next++
      if (next === 2 ** bits) {
        bits++
        next = 0
      }
    }
    expect(order.length).toBeGreaterThan(100)
  })

  it('usually splits a bucket other than the one the key went to', () => {
    const random = seeded(5)
    const { steps } = buildLinear(keysOf(random, 600), { bits: 0, capacity: 4, limit: 80 })
    const splits = steps.filter((s) => s.split)
    const elsewhere = splits.filter((s) => s.split!.from !== s.bucket).length
    expect(elsewhere / splits.length).toBeGreaterThan(0.8)
  })

  it('splits only above the limit, and so never stays above it', () => {
    const random = seeded(6)
    for (const s of settings) {
      let file = emptyLinear(s.bits, s.capacity)
      for (const key of keysOf(random, 400)) {
        const before = file.buckets.length
        const r = insert(file, key, s.limit)
        const n = recordCount(r.file)
        const wouldBe = (n * 100) / (before * s.capacity)
        expect(r.step.split !== null, `${n} records in ${before} buckets`).toBe(wouldBe > s.limit)
        file = r.file
        expect(fill(file) * 100).toBeLessThanOrEqual(s.limit + 1e-9)
        // the fewest buckets that keep it under the limit
        expect(file.buckets.length).toBe(Math.max(2 ** s.bits, Math.ceil((n * 100) / (s.limit * s.capacity))))
      }
    }
  })

  it('never adds or loses a key in a split, and only moves keys up by 2^i', () => {
    const random = seeded(7)
    let file = emptyLinear(1, 3)
    for (const key of keysOf(random, 200)) file = put(file, key).file
    for (let t = 0; t < 40; t++) {
      const bits = file.bits
      const s = split(file)
      expect(s.to - s.from).toBe(2 ** bits)
      expect([...s.file.buckets[s.from], ...s.file.buckets[s.to]].sort()).toEqual([...file.buckets[s.from]].sort())
      file = s.file
    }
  })
})

describe('the story', () => {
  const moments = STORY_STEPS.map((frames) => frames.map((f) => f.moment))

  it('starts with six coats in four holes of two, one shy of the limit', () => {
    const file = STORY_STEPS[0][0].file
    expect(recordCount(file)).toBe(6)
    expect(file.buckets.length).toBe(4)
    expect(STORY.limit).toBe(75)
  })

  it('puts the seventh coat in the basket under hole 10, then splits hole 00', () => {
    expect(moments[1][1]).toEqual({ kind: 'put', key: 0b1110, bucket: 2, overflow: true })
    expect(moments[2][1]).toMatchObject({ kind: 'split', from: 0, to: 4 })
    const after = STORY_STEPS[2][1].file
    expect(after.buckets[0]).toEqual([0b1000])
    expect(after.buckets[4]).toEqual([0b0100])
    expect(after.buckets[2].length).toBe(3)
  })

  it('finds the returning coat by three digits, in the new hole', () => {
    expect(moments[3][0]).toEqual({ kind: 'find', key: 0b0100, bucket: 4 })
  })

  it('splits 01, then 10, whose basket empties, while 11 gets one', () => {
    const steps = moments[4].slice(1)
    expect(steps.map((m) => m.kind)).toEqual(['put', 'split', 'put', 'put', 'split'])
    expect(steps[1]).toMatchObject({ from: 1, to: 5 })
    expect(steps[3]).toMatchObject({ key: 0b1011, bucket: 3, overflow: true })
    expect(steps[4]).toMatchObject({ from: 2, to: 6, emptied: true })
  })

  it('ends the round with hole 11 split, eight holes of three digits, the marker back at 0', () => {
    const steps = moments[5].slice(1)
    expect(steps[1]).toMatchObject({ kind: 'split', from: 3, to: 7, emptied: true })
    expect(STORY_END.bits).toBe(3)
    expect(STORY_END.buckets.length).toBe(8)
    expect(pointer(STORY_END)).toBe(0)
    expect(linearOverflow(STORY_END)).toBe(0)
  })
})

describe('extendible hashing', () => {
  it('works the notes’ example, corrected: 15, 17, 4, 19, 12, 14, 23, 27', () => {
    const e = extendibleFrom(
      1,
      [0, 1],
      [
        { depth: 1, keys: [10, 2] },
        { depth: 1, keys: [3, 11] },
      ],
      4,
    )
    for (const key of [15, 17, 4, 19]) extendibleInsert(e, key)
    expect(e.depth).toBe(2)
    expect(e.buckets[1].keys).toEqual([17])
    expect(e.buckets[2].keys).toEqual([3, 11, 15, 19])
    for (const key of [12, 14, 23, 27]) extendibleInsert(e, key)
    expect(e.depth).toBe(3)
    expect(e.directory).toEqual([0, 1, 3, 2, 0, 1, 3, 4])
    expect(e.buckets.map((b) => [...b.keys].sort((x, y) => x - y))).toEqual([
      [4, 12],
      [17],
      [3, 11, 19, 27],
      [2, 10, 14],
      [15, 23],
    ])
  })

  it('finds every key, keeps every page within capacity, and points 2^(gd − ld) entries at each bucket', () => {
    const random = seeded(8)
    for (let run = 0; run < 20; run++) {
      const keys = [...new Set(keysOf(random, 300))]
      const e = buildExtendible(keys, 4)
      for (const key of keys) expect(e.buckets[extendibleBucket(e, key)].keys).toContain(key)
      e.buckets.forEach((b, id) => {
        expect(b.keys.length).toBeLessThanOrEqual(4)
        expect(e.directory.filter((d) => d === id).length).toBe(2 ** (e.depth - b.depth))
      })
    }
  })

  it('doubles its directory far past its buckets on keys that share their last bits', () => {
    // Five keys that first differ at bit 12: the full bucket needs 13 bits,
    // so the directory reaches 2^13 (the notes' 2^20 case, scaled down)
    const e = buildExtendible([0, 1, 2, 3, 4].map((k) => k * 2 ** 12), 4)
    expect(e.directory.length).toBe(2 ** 13)
    expect(e.buckets.length).toBeLessThan(20)
  })
})

describe('static hashing and the lab', () => {
  it('chains overflow pages as a fixed table outgrows itself', () => {
    const keys = Array.from({ length: 64 }, (_, k) => k)
    const flat = buildStatic(keys, 4)
    expect(flat.every((b) => b.length === 16)).toBe(true)
    // 16 keys over pages of 4: 1, 2, 3, 4 pages, so 2.5 on average
    expect(averageLookup(flat, 4)).toBe(2.5)
  })

  it('draws 128 distinct keys', () => {
    expect(STREAM.length).toBe(LAB.most)
    expect(new Set(STREAM).size).toBe(LAB.most)
  })

  it('keeps linear hashing near one page a lookup at every limit, while the static table drifts to chains', () => {
    for (const limit of LIMITS) {
      const run = lab(STREAM, limit)
      expect(run.linear.lookup, `${limit}%`).toBeLessThan(1.4)
      expect(run.linear.pages).toBe(linearPages(run.file))
    }
    const full = lab(STREAM, 80)
    expect(full.static.lookup).toBeGreaterThan(1.5)
    expect(full.extendible.lookup).toBe(1)
    expect(full.extendible.directory).toBeGreaterThanOrEqual(full.extendible.pages)
    // The lab's file stays within four rows of 16 buckets
    expect(lab(STREAM, LIMITS[0]).file.buckets.length).toBeLessThanOrEqual(64)
  })

  it('spends fewer pages with a higher limit, and more overflow', () => {
    const low = lab(STREAM, 50)
    const high = lab(STREAM, 95)
    expect(high.file.buckets.length).toBeLessThan(low.file.buckets.length)
    expect(high.linear.overflow).toBeGreaterThan(low.linear.overflow)
    expect(high.linear.lookup).toBeGreaterThan(low.linear.lookup)
  })

  it('rebuilds 10 GB in no less than 200 seconds', () => {
    expect(rebuildSeconds(REBUILD.bytes, REBUILD.bytesPerSecond)).toBe(200)
  })

  it('keeps the guess file at 10 buckets with bucket 7 not the pointer', () => {
    expect(GUESS.full).not.toBe(GUESS_POINTER)
    expect(GUESS.buckets).toBe(2 ** GUESS_BITS + GUESS_POINTER)
  })
})
