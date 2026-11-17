import { seeded } from '../../components/explain/random'

// A buffer pool of a fixed number of frames, each holding one page, and the
// rules for which page to throw out when a page that is not there is asked
// for and every frame is full. Everything here works on an access trace: the
// pages a query asks for, in order.

export const POLICIES = ['LRU', 'MRU', 'Clock'] as const
// FIFO is only named on the page, but it is simulated here like the others
export type Policy = (typeof POLICIES)[number] | 'FIFO'

// What happened on one access, and the pool just after it
export interface Access {
  page: number
  // The page was already in a frame
  hit: boolean
  // The frame that holds the page now
  frame: number
  // The page thrown out to make room, if any
  evicted: number | null
  // Which page each frame holds now (null: still empty)
  slots: (number | null)[]
  // Clock's reference bit for each frame, and where its hand rests now
  bits: boolean[]
  hand: number
  // How many frames Clock's hand moved on during this access
  moves: number
}

// Run `trace` through a pool of `frames` frames under `policy`. A page in
// `pinned` is in use the whole time: once it is in a frame, nothing may
// evict it. Empty frames are filled in order. Clock follows the usual
// convention: a page just loaded or just hit has its bit set, and after a
// replacement the hand moves on one frame past the new page.
export function simulate(
  trace: readonly number[],
  frames: number,
  policy: Policy,
  pinned: ReadonlySet<number> = new Set(),
): Access[] {
  const slots: (number | null)[] = Array.from({ length: frames }, () => null)
  const where = new Map<number, number>()
  const lastUse = Array.from({ length: frames }, () => -1)
  const loadedAt = Array.from({ length: frames }, () => -1)
  const bits = Array.from({ length: frames }, () => false)
  let hand = 0

  const evictable = (frame: number) => !pinned.has(slots[frame]!)
  // The frame whose `score` is lowest among those that may be evicted
  const lowest = (score: (frame: number) => number) => {
    let best = -1
    for (let f = 0; f < frames; f++) if (evictable(f) && (best === -1 || score(f) < score(best))) best = f
    return best
  }

  return trace.map((page, time) => {
    let frame = where.get(page)
    const hit = frame !== undefined
    let evicted: number | null = null
    let moves = 0
    if (frame === undefined) {
      frame = slots.indexOf(null)
      if (frame === -1) {
        if (!slots.some((_, f) => evictable(f))) throw new Error('Every frame holds a pinned page')
        if (policy === 'LRU') frame = lowest((f) => lastUse[f])
        else if (policy === 'MRU') frame = lowest((f) => -lastUse[f])
        else if (policy === 'FIFO') frame = lowest((f) => loadedAt[f])
        else {
          // Clock: a set bit buys the page one more round; the first
          // evictable page with a clear bit goes
          while (!evictable(hand) || bits[hand]) {
            if (evictable(hand)) bits[hand] = false
            hand = (hand + 1) % frames
            moves++
          }
          frame = hand
        }
        evicted = slots[frame]
        where.delete(evicted!)
      }
      slots[frame] = page
      where.set(page, frame)
      loadedAt[frame] = time
      if (policy === 'Clock') {
        hand = (frame + 1) % frames
        moves++
      }
    }
    lastUse[frame] = time
    bits[frame] = true
    return { page, hit, frame, evicted, slots: [...slots], bits: [...bits], hand, moves }
  })
}

export const hits = (run: readonly Access[], from = 0, to = run.length) =>
  run.slice(from, to).filter((access) => access.hit).length

// Hits on each pass of a trace that reads `pages` pages per pass
export const hitsPerPass = (run: readonly Access[], pages: number) =>
  Array.from({ length: Math.ceil(run.length / pages) }, (_, pass) => hits(run, pass * pages, (pass + 1) * pages))

// Pages 1 to `pages`, read in order, `passes` times over
export const loop = (pages: number, passes: number) =>
  Array.from({ length: pages * passes }, (_, i) => (i % pages) + 1)

// The same, but every other pass reads the file backwards
export const zigzag = (pages: number, passes: number) =>
  Array.from({ length: pages * passes }, (_, i) => {
    const at = i % pages
    return Math.floor(i / pages) % 2 === 0 ? at + 1 : pages - at
  })

// What share of reads hit when a file of `pages` pages is read in order over
// and over through `frames` frames, after the first pass (which misses every
// read). LRU (and Clock) keep nothing useful unless the whole file fits; MRU
// keeps all but one frame's worth, which works out to exactly (M − 1)/(N − 1)
// over any N − 1 passes
export const loopHitRate = (policy: 'LRU' | 'MRU', frames: number, pages: number) =>
  frames >= pages ? 1 : policy === 'LRU' ? 0 : (frames - 1) / (pages - 1)

// The story: a desk with room for 4 volumes, a series of 5, read 3 times
export const STORY = { frames: 4, pages: 5, passes: 3 }
export const STORY_TRACE = loop(STORY.pages, STORY.passes)
export const STORY_LRU = simulate(STORY_TRACE, STORY.frames, 'LRU')
export const STORY_MRU = simulate(STORY_TRACE, STORY.frames, 'MRU')

// The guess: 10 frames, an 11-page file
export const GUESS = { frames: 10, pages: 11 }

// The worked numbers: a pool of 10 frames, and files a little and a lot
// bigger than it
export const WORKED = [11, 15, 20].map((pages) => ({
  frames: 10,
  pages,
  lru: loopHitRate('LRU', 10, pages),
  mru: loopHitRate('MRU', 10, pages),
}))

// Clock's figure: four frames and a short trace in which page 2 is hit
// again just before a sweep, and survives it on its second chance
export const CLOCK_FRAMES = 4
export const CLOCK_TRACE = [1, 2, 3, 4, 5, 2, 6, 7, 2]
export const CLOCK_RUN = simulate(CLOCK_TRACE, CLOCK_FRAMES, 'Clock')

// The lab's access patterns, each a seeded trace of LAB_LENGTH reads
export const PATTERNS = ['Repeated scan', 'Hot set', 'Scan + hot set'] as const
export type Pattern = (typeof PATTERNS)[number]
export const LAB_LENGTH = 2400
// Reads before this are the pool filling up, and are not counted
export const WARM_UP = 400
// How many of the counted reads the lab draws
export const LAB_SHOWN = 600
export const SCAN_PAGES = 60
export const HOT_PAGES = 20
const COLD_PAGES = 400

function patternTrace(pattern: Pattern): number[] {
  const random = seeded(PATTERNS.indexOf(pattern) + 7)
  // Pages 1 to 20 are hot; 101 to 160 are the scanned file; 201 and up are cold
  const hot = () => 1 + Math.floor(random() * HOT_PAGES)
  const cold = () => 201 + Math.floor(random() * COLD_PAGES)
  let scanAt = 0
  const scan = () => 101 + (scanAt++ % SCAN_PAGES)
  return Array.from({ length: LAB_LENGTH }, () => {
    if (pattern === 'Repeated scan') return scan()
    if (pattern === 'Hot set') return random() < 0.8 ? hot() : cold()
    return random() < 0.5 ? hot() : scan()
  })
}

export interface LabRun {
  // Whether each counted read (after the warm-up) hit
  hit: boolean[]
  rate: number
}

const labRuns = new Map<string, LabRun>()
const traces = new Map<Pattern, number[]>()

// A lab setting's run, worked out once and kept
export function labRun(pattern: Pattern, frames: number, policy: Policy): LabRun {
  const key = `${pattern} ${frames} ${policy}`
  let found = labRuns.get(key)
  if (!found) {
    let trace = traces.get(pattern)
    if (!trace) {
      trace = patternTrace(pattern)
      traces.set(pattern, trace)
    }
    const hit = simulate(trace, frames, policy)
      .slice(WARM_UP)
      .map((access) => access.hit)
    found = { hit, rate: hit.filter(Boolean).length / hit.length }
    labRuns.set(key, found)
  }
  return found
}

export const percent = (share: number) => `${Math.round(100 * share)}%`
