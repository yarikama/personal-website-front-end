import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  BILL,
  binary,
  BITS,
  CLIP_UPDATE,
  diskCount,
  DISK_BITS,
  extraSpace,
  LAYOUTS,
  measuredWritesPerSecond,
  parity,
  parityDisk,
  place,
  randomBlocks,
  rebuild,
  smallWrites,
  traffic,
  updatedParity,
  withParity,
  WORKED,
  writesPerSecond,
  xor,
} from './model'

describe('parity', () => {
  it('is 1 where an odd number of blocks have a 1', () => {
    expect(xor([])).toBe(0)
    expect(parity([1, 0, 1, 1])).toBe(1)
    expect(parity([0, 1, 1, 0])).toBe(0)
    expect(binary(parity([0b0110, 0b1010, 0b1100, 0b0011]), 4)).toBe('0011')
  })

  it('undoes itself: a block XORed twice is gone', () => {
    const random = seeded(1)
    for (const [a, b] of Array.from({ length: 200 }, () => randomBlocks(random, 2, 16))) {
      expect(a ^ b ^ b).toBe(a)
    }
  })
})

describe('rebuilding a lost disk', () => {
  it('brings back any one disk of any row, the parity disk included', () => {
    const random = seeded(2)
    for (let trial = 0; trial < 500; trial++) {
      const n = 2 + Math.floor(random() * 10)
      const bits = 1 + Math.floor(random() * 30)
      const row = withParity(randomBlocks(random, n, bits))
      for (let lost = 0; lost < row.length; lost++) expect(rebuild(row, lost)).toBe(row[lost])
    }
  })

  it('cannot tell two lost disks apart: other values fit the same parity', () => {
    const row = withParity([0b0110, 0b1010, 0b1100, 0b0011])
    // Flip the same bits on two disks and the parity still checks
    const other = row.map((block, disk) => (disk === 1 || disk === 2 ? block ^ 0b0101 : block))
    expect(parity(other.slice(0, 4))).toBe(other[4])
    expect(other).not.toEqual(row)
  })

  it('gives the worked rows the page shows', () => {
    expect(WORKED.map((w) => [w.parity, w.rebuilt])).toEqual([
      [1, 1],
      [0, 1],
      [0b0011, 0b0110],
    ])
    for (const w of WORKED) expect(w.rebuilt).toBe(w.data[w.lost])
  })

  it('tells the story’s numbers', () => {
    expect(BILL).toBe(33)
    expect(parity(BITS)).toBe(1)
    expect(rebuild(withParity(BITS), 1)).toBe(0)
    for (const row of DISK_BITS) expect(rebuild(withParity(row), 2)).toBe(row[2])
    // The reveal rebuilds both 0s and 1s
    expect(new Set(DISK_BITS.map((row) => row[2])).size).toBe(2)
  })
})

describe('updating the parity on a write', () => {
  it('matches recomputing it from every disk', () => {
    const random = seeded(3)
    for (let trial = 0; trial < 1000; trial++) {
      const n = 2 + Math.floor(random() * 10)
      const data = randomBlocks(random, n, 24)
      const disk = Math.floor(random() * n)
      const [newData] = randomBlocks(random, 1, 24)
      const after = data.map((block, d) => (d === disk ? newData : block))
      expect(updatedParity(parity(data), data[disk], newData)).toBe(parity(after))
    }
  })

  it('gives the clip’s numbers', () => {
    expect(binary(CLIP_UPDATE.oldParity, 4)).toBe('0011')
    expect(binary(CLIP_UPDATE.oldData, 4)).toBe('0110')
    expect(binary(CLIP_UPDATE.newParity, 4)).toBe('1010')
    expect(CLIP_UPDATE.newParity).toBe(parity([0b1111, 0b1010, 0b1100, 0b0011]))
  })
})

describe('where blocks live', () => {
  it('puts each stripe’s data on distinct disks, never on its parity disk', () => {
    for (const layout of LAYOUTS) {
      for (const n of [2, 4, 6]) {
        for (let stripe = 0; stripe < 12; stripe++) {
          const disks = Array.from({ length: n }, (_, slot) => place(layout, n, stripe * n + slot).disks).flat()
          expect(new Set(disks).size).toBe(disks.length)
          expect(disks.every((d) => d >= 0 && d < diskCount(layout, n))).toBe(true)
          const p = parityDisk(layout, n, stripe)
          if (p !== null) expect(disks).not.toContain(p)
        }
      }
    }
  })

  it('costs a whole copy to mirror, one disk in n with parity', () => {
    expect(extraSpace('RAID 1', 4)).toBe(1)
    expect(extraSpace('RAID 4', 4)).toBe(0.25)
    expect(diskCount('RAID 1', 4)).toBe(8)
    expect(diskCount('RAID 5', 4)).toBe(5)
  })
})

describe('small writes', () => {
  it('send two operations to RAID 4’s parity disk every time', () => {
    const blocks = smallWrites(seeded(4), 4, 5, 300)
    const counts = traffic('RAID 4', 4, blocks)
    expect(counts[4]).toBe(600)
    expect(counts.reduce((a, b) => a + b, 0)).toBe(1200)
  })

  it('keep up with as many writes as the arithmetic says', () => {
    const random = seeded(5)
    for (const layout of LAYOUTS) {
      for (const n of [2, 4, 6]) {
        const blocks = smallWrites(random, n, 105, 20000)
        const measured = measuredWritesPerSecond(traffic(layout, n, blocks), blocks.length)
        expect(measured / writesPerSecond(layout, n)).toBeGreaterThan(0.9)
        expect(measured / writesPerSecond(layout, n)).toBeLessThanOrEqual(1.0001)
      }
    }
  })

  it('stay at half a disk in RAID 4 however many disks, and grow with them in RAID 5', () => {
    expect(writesPerSecond('RAID 4', 2)).toBe(50)
    expect(writesPerSecond('RAID 4', 16)).toBe(50)
    expect(writesPerSecond('RAID 5', 4)).toBe(125)
    expect(writesPerSecond('RAID 5', 16)).toBe(425)
  })
})
