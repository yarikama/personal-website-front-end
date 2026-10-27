// A robot vacuum in a room of COLUMNS × ROWS tiles. It earns 1 point for
// each speck of dirt it picks up and nothing for anything else, charging
// included. Each move costs one unit of battery; a full battery is FULL.

export const COLUMNS = 9
export const ROWS = 5
export const FULL = 80

export interface Tile {
  x: number
  y: number
}

export const START: Tile = { x: 4, y: 2 }
export const CHARGER: Tile = { x: 0, y: 2 }
// Low: enough for four moves, 5% of a full battery
export const LOW = 4

// Twenty specks: three in a row right next to the robot (and nothing past
// them), the rest spread over the room, and none on the way to the charger
export const DIRT: Tile[] = [
  { x: 5, y: 2 },
  { x: 6, y: 2 },
  { x: 7, y: 2 },
  { x: 1, y: 0 },
  { x: 3, y: 0 },
  { x: 6, y: 0 },
  { x: 8, y: 0 },
  { x: 0, y: 1 },
  { x: 2, y: 1 },
  { x: 5, y: 1 },
  { x: 4, y: 0 },
  { x: 8, y: 1 },
  { x: 1, y: 3 },
  { x: 3, y: 3 },
  { x: 6, y: 3 },
  { x: 8, y: 3 },
  { x: 0, y: 4 },
  { x: 2, y: 4 },
  { x: 4, y: 4 },
  { x: 7, y: 4 },
]

const key = ({ x, y }: Tile) => `${x},${y}`
const same = (a: Tile, b: Tile) => a.x === b.x && a.y === b.y

// One moment of a run: where the robot is, its battery, what it has earned,
// the reward it got on arriving here, the specks still on the floor, and
// whether it got here by moving (or by sitting on the charger)
export interface Frame {
  at: Tile
  battery: number
  score: number
  reward: number
  dirt: Tile[]
  moved: boolean
}

// Play a run along `path` (tiles after the start). Arriving on dirt picks
// it up for 1 point; arriving on the charger fills the battery (taking a few
// frames, which earn nothing). The run ends where the battery does.
function run(path: Tile[]): Frame[] {
  const left = new Map(DIRT.map((tile) => [key(tile), tile]))
  let frame: Frame = { at: START, battery: LOW, score: 0, reward: 0, dirt: [...left.values()], moved: false }
  const frames = [frame]
  for (const at of path) {
    if (frame.battery === 0) break
    const reward = left.delete(key(at)) ? 1 : 0
    frame = { at, battery: frame.battery - 1, score: frame.score + reward, reward, dirt: [...left.values()], moved: true }
    frames.push(frame)
    if (same(at, CHARGER) && frame.battery < FULL / 2) {
      // Charging shows as a few frames of the battery filling up
      const from = frame.battery
      for (let step = 1; step <= 4; step++) {
        frame = { ...frame, battery: Math.round(from + (FULL - from) * (step / 4)), reward: 0, moved: false }
        frames.push(frame)
      }
    }
  }
  return frames
}

const neighbours = ({ x, y }: Tile): Tile[] =>
  [
    { x: x + 1, y },
    { x, y: y - 1 },
    { x, y: y + 1 },
    { x: x - 1, y },
  ].filter((tile) => tile.x >= 0 && tile.x < COLUMNS && tile.y >= 0 && tile.y < ROWS)

// The robot that always takes the biggest reward it can get right now: a
// next tile with dirt if there is one; with none in reach, it carries on
// the way it was going. It never charges: charging pays nothing.
export function grabRun(): Frame[] {
  const path: Tile[] = []
  const left = new Set(DIRT.map(key))
  let at = START
  for (let moves = 0; moves < LOW; moves++) {
    const options = neighbours(at)
    const next = options.find((tile) => left.has(key(tile))) ?? options[0]
    left.delete(key(next))
    path.push(next)
    at = next
  }
  return run(path)
}

// The robot that gives up the nearby points: to the charger first, then up
// to the top corner and along every row in turn, until the room is clean
export function chargeFirstRun(): Frame[] {
  const path: Tile[] = []
  for (let x = START.x - 1; x >= CHARGER.x; x--) path.push({ x, y: START.y })
  for (let y = CHARGER.y - 1; y >= 0; y--) path.push({ x: 0, y })
  for (let y = 0; y < ROWS; y++) {
    const xs = Array.from({ length: COLUMNS }, (_, i) => (y % 2 === 0 ? i : COLUMNS - 1 - i))
    for (const x of xs) if (!(x === 0 && y === 0)) path.push({ x, y })
  }
  return run(path)
}

export const score = (frames: Frame[]) => frames[frames.length - 1].score

// The frame where the battery is first full again (the end of the way to
// the charger), or the last frame of a run that never charges
export function chargedAt(frames: Frame[]) {
  const i = frames.findIndex((frame) => frame.battery === FULL)
  return i < 0 ? frames.length - 1 : i
}

// The rewards a run collects, one per move (charging frames are not moves)
export const rewards = (frames: Frame[]) => frames.filter((frame) => frame.moved).map((frame) => frame.reward)

// The value of each moment of a run: all the reward still to come from
// there. Each is the next reward plus the value of the moment after.
export function values(rewards: number[]): number[] {
  const out = new Array<number>(rewards.length + 1).fill(0)
  for (let t = rewards.length - 1; t >= 0; t--) out[t] = rewards[t] + out[t + 1]
  return out
}

// Two ways on from one place, as the reward each step pays: grab the dirt
// in reach now, or go and charge first and clean far more after
export const PATHS = {
  grab: [1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
  charge: [0, 0, 0, 0, 2, 2, 2, 2, 2, 2],
} as const

export type Way = keyof typeof PATHS

// The reward of the first `horizon` steps of a path
export const lookAhead = (path: readonly number[], horizon: number) =>
  path.slice(0, horizon).reduce((sum, reward) => sum + reward, 0)

// Which way an agent that adds up `horizon` steps ahead picks; on a tie, the
// one that pays sooner
export const choose = (horizon: number): Way =>
  lookAhead(PATHS.charge, horizon) > lookAhead(PATHS.grab, horizon) ? 'charge' : 'grab'

// The shortest look ahead at which charging first wins
export const flipsAt = () => Array.from({ length: PATHS.grab.length }, (_, i) => i + 1).find((h) => choose(h) === 'charge')
