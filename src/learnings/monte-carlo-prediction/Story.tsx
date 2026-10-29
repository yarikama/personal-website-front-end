import { lerp, usePlay } from '../../components/explain/useLoop'
import { centre } from './board'
import { learnAll, samples, SQUARES, STORY_AFTER, STORY_COUNT, STORY_GAMES, STORY_ROLLS, waypoints, type Estimate } from './model'
import Track, { type Note } from './Track'

const AFTER_ONE = learnAll(STORY_GAMES.slice(0, 1))
const AFTER = STORY_AFTER
const FINAL = AFTER[AFTER.length - 1]

const PATHS = STORY_ROLLS.map(waypoints)
const COUNTS = samples(STORY_GAMES[0])

// The token partway along a list of squares: `at` segments in
function along(points: number[], at: number) {
  const i = Math.min(points.length - 2, Math.floor(at))
  const from = centre(points[i])
  const to = centre(points[i + 1])
  const t = Math.min(1, at - i)
  return { x: lerp(from.x, to.x, t), y: lerp(from.y, to.y, t) }
}

// The squares a path has reached so far, as a trail
const trailTo = (points: number[], at: number) => points.slice(0, Math.floor(at) + 1)

const averages = (estimates: Estimate[], accent: number[] = [], sub = (e: Estimate) => (e.count === 1 ? '1 count' : `${e.count} counts`)) =>
  Object.fromEntries(
    SQUARES.filter((square) => estimates[square].count > 0).map((square) => [
      square,
      { main: estimates[square].mean.toFixed(1), sub: sub(estimates[square]), accent: accent.includes(square) } satisfies Note,
    ])
  )

const most = Math.max(...SQUARES.map((square) => FINAL[square].count))
const tinted = (estimates: Estimate[], sub: (square: number, e: Estimate) => string) =>
  Object.fromEntries(
    SQUARES.filter((square) => estimates[square].count > 0).map((square) => [
      square,
      { main: estimates[square].mean.toFixed(1), sub: sub(square, estimates[square]), tint: estimates[square].count / most } satisfies Note,
    ])
  )

const STATUS = [
  'From each square, how many more turns?',
  'Game 1, played to the finish',
  'Counting back from the finish',
  'Game 2, then each square’s average',
  '',
  'Square = state · dice = policy · turns left = return · average = value',
]

// Snakes and ladders, one step of the story at a time. Give it a `key` per
// step so each plays from its start.
export default function Story({ step }: { step: number }) {
  const segments = step === 1 ? PATHS[0].length - 1 : step === 3 ? PATHS[1].length - 1 : step === 2 ? COUNTS.length : step === 4 ? STORY_COUNT : 0
  const pace = step === 4 ? 32 : step === 2 ? 420 : 480
  // A beat at the end of game 2 before its averages show
  const played = usePlay(step === 3 ? segments + 1 : segments, pace)

  let notes: Record<number, Note>
  let token: { x: number; y: number } | null = null
  let trail: number[] = []
  let status = STATUS[step]

  if (step === 0) {
    notes = Object.fromEntries(SQUARES.map((square) => [square, { main: '?' }]))
    token = centre(1)
  } else if (step === 1) {
    token = along(PATHS[0], played)
    trail = trailTo(PATHS[0], played)
    const stood = STORY_GAMES[0].filter((_, i) => PATHS[0].indexOf(STORY_GAMES[0][i]) <= played)
    notes = Object.fromEntries(stood.map((square) => [square, { accent: true }]))
  } else if (step === 2) {
    // The last turn's count first, back to the first
    const shown = COUNTS.filter((_, turn) => COUNTS.length - 1 - turn < played)
    const bySquare = new Map<number, number[]>()
    for (const { square, left } of shown) bySquare.set(square, [...(bySquare.get(square) ?? []), left])
    notes = Object.fromEntries(
      [...bySquare].map(([square, lefts]) => [square, { main: lefts.join(', '), accent: true }])
    )
  } else if (step === 3) {
    const moving = played < segments
    token = moving ? along(PATHS[1], played) : null
    trail = moving ? trailTo(PATHS[1], played) : []
    notes = averages(moving ? AFTER_ONE : AFTER[0], moving ? [] : STORY_GAMES[1])
  } else if (step === 4) {
    const games = Math.floor(played)
    status = `Game ${2 + games} of ${2 + STORY_COUNT}`
    notes = tinted(AFTER[games], (_, e) => `n = ${e.count}`)
  } else {
    notes = tinted(FINAL, (square) => `V(s${square})`)
  }

  return (
    <div>
      <p className="font-mono text-[0.8rem] uppercase tracking-widest text-zinc-faded">{status}</p>
      <div className="mt-3">
        <Track label={status} notes={notes} token={token} trail={trail} named={step === 5} />
      </div>
    </div>
  )
}
