// Parity across disks, and what keeping it costs each write.
//
// A block is a whole number whose bits are the block's bits (a 1-bit block
// is 0 or 1, a 4-bit one 0 to 15). A row (a stripe) is one block from each
// data disk, at the same place on each.

// The XOR of blocks: for each bit position, 1 if an odd number of the
// blocks have a 1 there. Adding without carrying.
export const xor = (blocks: number[]) => blocks.reduce((a, b) => a ^ b, 0)

// The parity block of a row of data blocks
export const parity = (data: number[]) => xor(data)

// The block disk `lost` held, from the row's other blocks and its parity:
// the XOR of everything that survives. The parity disk itself (lost =
// data.length when `row` is data then parity) comes back the same way.
export function rebuild(row: number[], lost: number): number {
  return xor(row.filter((_, disk) => disk !== lost))
}

// A row with its parity on the end: what the disks hold
export const withParity = (data: number[]) => [...data, parity(data)]

// The new parity after one data block changes, from the old parity and the
// old and new data only: the other disks need not be read
export const updatedParity = (oldParity: number, oldData: number, newData: number) => oldParity ^ oldData ^ newData

// `count` random blocks of `bits` bits each
export function randomBlocks(random: () => number, count: number, bits: number): number[] {
  return Array.from({ length: count }, () => Math.floor(random() * 2 ** bits))
}

// A block's bits as text, highest first: 6 in 4 bits is "0110"
export const binary = (block: number, bits: number) => block.toString(2).padStart(bits, '0')

// ——— The story's numbers ———

// Four friends' shares of a bill, in dollars, and the one who keeps the total
export const FRIENDS = ['Ana', 'Ben', 'Cal', 'Dee'] as const
export const KEEPER = 'Pat'
export const SHARES = [12, 7, 9, 5]
export const BILL = SHARES.reduce((a, b) => a + b, 0)

// The same four as bits, with their odd-or-even
export const BITS = [1, 0, 1, 1]

// Eight rows of one bit on each of four disks, for the reveal. Fixed rather
// than random, so it shows a mix of rebuilt 0s and 1s, odd and even rows.
export const DISK_BITS = [
  [1, 0, 1, 1],
  [0, 1, 1, 0],
  [1, 1, 0, 1],
  [0, 0, 1, 0],
  [1, 0, 0, 0],
  [1, 1, 1, 1],
  [0, 1, 0, 1],
  [0, 0, 0, 1],
]
// The disk that dies in the reveal
export const DEAD_DISK = 2

// The worked rows under the math: a row with one disk lost, and its parity.
// The last has 4-bit blocks, to show a whole block comes back bit by bit.
export const WORKED = [
  { data: [1, 0, 1, 1], lost: 2, bits: 1 },
  { data: [0, 1, 1, 0], lost: 1, bits: 1 },
  { data: [0b0110, 0b1010, 0b1100, 0b0011], lost: 0, bits: 4 },
].map((row) => ({ ...row, parity: parity(row.data), rebuilt: rebuild(withParity(row.data), row.lost) }))

// The clip's numbers: disk 1 of the last worked row is rewritten
export const CLIP_UPDATE = (() => {
  const data = WORKED[2].data
  const oldParity = parity(data)
  const newData = 0b1111
  return { oldParity, oldData: data[0], newData, newParity: updatedParity(oldParity, data[0], newData) }
})()

// ——— Where small writes land ———

export const LAYOUTS = ['RAID 1', 'RAID 4', 'RAID 5'] as const
export type Layout = (typeof LAYOUTS)[number]

// Disks in the array for n disks' worth of data: a copy of each, or one more
export const diskCount = (layout: Layout, n: number) => (layout === 'RAID 1' ? 2 * n : n + 1)

// Extra disk space, as a share of the data: all of it again, or one disk in n
export const extraSpace = (layout: Layout, n: number) => (layout === 'RAID 1' ? 1 : 1 / n)

// The disk holding stripe `stripe`'s parity: the last disk in RAID 4; in
// RAID 5 it moves along one disk a stripe, so every disk takes its turn.
// RAID 1 has none.
export function parityDisk(layout: Layout, n: number, stripe: number): number | null {
  if (layout === 'RAID 1') return null
  return layout === 'RAID 4' ? n : stripe % (n + 1)
}

// The disk(s) holding data block `block` and the stripe it is in. Blocks
// go round the data disks in turn: block b is in stripe ⌊b / n⌋.
export function place(layout: Layout, n: number, block: number): { stripe: number; disks: number[] } {
  const stripe = Math.floor(block / n)
  const slot = block % n
  if (layout === 'RAID 1') return { stripe, disks: [2 * slot, 2 * slot + 1] }
  const p = parityDisk(layout, n, stripe)!
  return { stripe, disks: [slot < p ? slot : slot + 1] }
}

// What one small write (one block) does to each disk it touches. A mirror
// writes both copies. With parity: read the old data and the old parity,
// then write the new data and the new parity.
export function touches(layout: Layout, n: number, block: number): { disk: number; ios: number; parity: boolean }[] {
  const { stripe, disks } = place(layout, n, block)
  if (layout === 'RAID 1') return disks.map((disk) => ({ disk, ios: 1, parity: false }))
  return [
    { disk: disks[0], ios: 2, parity: false },
    { disk: parityDisk(layout, n, stripe)!, ios: 2, parity: true },
  ]
}

// Disk operations per small write: 2 for a mirror, 4 with parity
export const iosPerWrite = (layout: Layout) => (layout === 'RAID 1' ? 2 : 4)

// How many disk operations each disk did for a stream of small writes
export function traffic(layout: Layout, n: number, blocks: number[]): number[] {
  const counts = Array<number>(diskCount(layout, n)).fill(0)
  for (const block of blocks) for (const { disk, ios } of touches(layout, n, block)) counts[disk] += ios
  return counts
}

// A stream of `count` small writes to random blocks among `stripes`
// stripes of n data blocks
export function smallWrites(random: () => number, n: number, stripes: number, count: number): number[] {
  return Array.from({ length: count }, () => Math.floor(random() * n * stripes))
}

// Each disk does this many random operations a second
export const DISK_IOPS = 100

// Small writes a second the array keeps up with, when writes land evenly:
// in RAID 4 the parity disk takes two operations for every write, whatever
// n is; otherwise the work spreads over every disk
export function writesPerSecond(layout: Layout, n: number, iops = DISK_IOPS): number {
  if (layout === 'RAID 4') return iops / 2
  return (diskCount(layout, n) * iops) / iosPerWrite(layout)
}

// The same, measured from a stream: the busiest disk sets the pace
export function measuredWritesPerSecond(counts: number[], writes: number, iops = DISK_IOPS): number {
  return (iops * writes) / Math.max(...counts)
}

// "25%" for 0.25
export const percent = (share: number) => `${Math.round(100 * share)}%`
