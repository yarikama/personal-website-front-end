import { mergeOrder, phaseOne } from './model'

// The story: 12 exam papers sorted by student ID on a desk with room for 4.
// It is the model's sort with one record a page and 4 pages of memory, laid
// out as frames: where every paper is after each move, and how many times a
// paper has been picked up off the floor (a page read) and put down (a write).

export const PAPERS = [42, 17, 88, 5, 63, 29, 71, 11, 94, 36, 50, 23]
// The paper that makes one stack too many
export const EXTRA = 68
export const DESK = 4

// The drawing, in SVG units
export const WIDTH = 480
export const HEIGHT = 340
export const CARD = { w: 30, h: 26 }
const PITCH = 34
const ROW_X = 22
export const TOP_Y = 30
export const DESK_PITCH = 44
export const DESK_X = WIDTH / 2 - ((DESK - 1) * DESK_PITCH) / 2 - CARD.w / 2
export const DESK_Y = 118
export const STACK_Y = 212
const STACK_PITCH = 32

export type Tone = 'plain' | 'next' | 'stuck'
export interface Spot {
  x: number
  y: number
  tone: Tone
}
export interface Frame {
  at: Record<number, Spot>
  reads: number
  writes: number
}

export const pileSpot = (k: number, tone: Tone = 'plain'): Spot => ({ x: ROW_X + k * PITCH, y: TOP_Y, tone })
export const deskSpot = (s: number, tone: Tone = 'plain'): Spot => ({ x: DESK_X + s * DESK_PITCH, y: DESK_Y, tone })
// Past the desk's edge: the spot the desk doesn't have
export const GHOST_X = DESK_X + DESK * DESK_PITCH + 14

export const stackSpot = (j: number, k: number, tone: Tone = 'plain'): Spot => ({
  x: ROW_X + k * PITCH,
  y: STACK_Y + j * STACK_PITCH,
  tone,
})

// A frame from the one before, with some papers moved
function after(frame: Frame, moves: [number, Spot][], reads = 0, writes = 0): Frame {
  return { at: { ...frame.at, ...Object.fromEntries(moves) }, reads: frame.reads + reads, writes: frame.writes + writes }
}

// Phase 1: four onto the desk as they come, sorted there, set down as a stack
function sortFrames(papers: number[]): Frame[] {
  let frame: Frame = { at: Object.fromEntries(papers.map((id, k) => [id, pileSpot(k)])), reads: 0, writes: 0 }
  const frames = [frame]
  phaseOne(papers, DESK, 1).forEach((run, j) => {
    const taken = papers.slice(j * DESK, (j + 1) * DESK)
    frame = after(
      frame,
      taken.map((id, s) => [id, deskSpot(s)]),
      taken.length
    )
    frames.push(frame)
    frame = after(
      frame,
      run.map((id, s) => [id, deskSpot(s)])
    )
    frames.push(frame)
    frame = after(
      frame,
      run.map((id, k) => [id, stackSpot(j, k)]),
      0,
      run.length
    )
    frames.push(frame)
  })
  return frames
}

const RUNS = phaseOne(PAPERS, DESK, 1)
const SORTED = sortFrames(PAPERS)
const STACKED = SORTED[SORTED.length - 1]

// The top of each stack onto the desk, one spot each; the smallest marked
// when `hint`
function topsFrame(hint: boolean): Frame {
  const smallest = Math.min(...RUNS.map((run) => run[0]))
  return after(
    STACKED,
    RUNS.map((run, j) => [run[0], deskSpot(j, hint && run[0] === smallest ? 'next' : 'plain')]),
    RUNS.length
  )
}

// Phase 2: the smallest top through the free spot to the finished row, and
// the next paper of its stack up into its place
function mergeFrames(): Frame[] {
  let frame = topsFrame(false)
  const frames = [frame]
  const next = RUNS.map(() => 1)
  mergeOrder(RUNS).forEach((r, k) => {
    const id = RUNS[r][next[r] - 1]
    frame = after(frame, [[id, deskSpot(DESK - 1, 'next')]])
    frames.push(frame)
    const up = RUNS[r][next[r]]
    const moves: [number, Spot][] = [[id, pileSpot(k)]]
    if (up !== undefined) moves.push([up, deskSpot(r)])
    frame = after(frame, moves, up === undefined ? 0 : 1, 1)
    frames.push(frame)
    next[r] += 1
  })
  return frames
}

// With a 13th paper: four stacks, and their tops need a fifth spot
function overflowFrames(): Frame[] {
  const papers = [...PAPERS, EXTRA]
  const sorted = sortFrames(papers)
  const stacked = { ...sorted[sorted.length - 1], reads: 0, writes: 0 }
  const runs = phaseOne(papers, DESK, 1)
  // Three tops on the desk, the free spot kept, and the fourth with nowhere to go
  const tops = after(
    stacked,
    runs.map((run, j): [number, Spot] => [run[0], j < DESK - 1 ? deskSpot(j) : { x: GHOST_X, y: DESK_Y, tone: 'stuck' }])
  )
  return [stacked, tops]
}

export type Scene = 'start' | 'sort' | 'tops' | 'merge' | 'done' | 'overflow'

const MERGED = mergeFrames()

export const SCENES: Record<Scene, Frame[]> = {
  start: [SORTED[0]],
  sort: SORTED,
  tops: [STACKED, topsFrame(true)],
  merge: MERGED,
  done: [MERGED[MERGED.length - 1]],
  overflow: overflowFrames(),
}

// The totals the story tells
export const DONE = MERGED[MERGED.length - 1]
