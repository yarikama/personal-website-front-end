import { seeded } from '../../components/explain/random'
import { lerp, usePlay } from '../../components/explain/useLoop'
import {
  ART,
  curved,
  graded,
  KEPT_MEAN,
  LATE_CURVED,
  MATHS_WEEK_1,
  MATHS_WEEK_2,
  plain,
  signed,
  TRUE_Z,
  YOU,
  YOU_ART,
} from './model'

// The classroom: eight students' scores on two quizzes, as dots on a line
// each. Step by step the scores are raw, drift, get curved, get put back on a
// scale the school picks, and finally are named for what they are in a
// network: a batch of photos and two of a layer's channels.
export type Scene = 'week-1' | 'week-2' | 'curved' | 'graded' | 'late' | 'named'

const WIDTH = 460
const HEIGHT = 250
const LEFT = 30
const RIGHT = 430
const ROWS = [92, 192]
const R = 6

const caps = 'font-mono text-[11px] uppercase tracking-widest'
const mono = 'font-mono text-[11px] tabular-nums'
const halo = { className: 'fill-ink stroke-paper', strokeWidth: 3, paintOrder: 'stroke' as const }

type Axis = { from: number; to: number; ticks: number[]; format: (x: number) => string }
const RAW: Axis = { from: 20, to: 100, ticks: [20, 40, 60, 80, 100], format: String }
const CURVED: Axis = { from: -2.5, to: 2.5, ticks: [-2, -1, 0, 1, 2], format: (x) => (x === 0 ? '0' : signed(x, 0)) }
const GRADED: Axis = { from: 50, to: 100, ticks: [50, 60, 70, 80, 90, 100], format: String }

const px = (axis: Axis, x: number) => LEFT + ((x - axis.from) / (axis.to - axis.from)) * (RIGHT - LEFT)

// Lift dots that would overlap off the line, alternately up and down, so
// every one of them can be seen
function swarm(xs: number[], gap = 2 * R + 1): number[] {
  const placed: { x: number; y: number }[] = []
  const order = xs.map((x, i) => [x, i] as const).sort((a, b) => a[0] - b[0])
  const lift = Array<number>(xs.length).fill(0)
  for (const [x, i] of order) {
    for (let k = 0; ; k++) {
      const y = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * gap
      if (placed.every((p) => (p.x - x) ** 2 + (p.y - y) ** 2 >= gap * gap)) {
        placed.push({ x, y })
        lift[i] = y
        break
      }
    }
  }
  return lift
}

type Row = { name: string; extra?: string; xs: number[]; axis: Axis; you: number | null; ghost?: number[] }

function rowsOf(scene: Scene): Row[] {
  switch (scene) {
    case 'week-1':
      return [
        { name: 'Maths quiz, week 1', xs: MATHS_WEEK_1, axis: RAW, you: YOU },
        { name: 'Art quiz', xs: ART, axis: RAW, you: YOU_ART },
      ]
    case 'week-2':
      return [
        { name: 'Maths quiz, week 2', xs: MATHS_WEEK_2, axis: RAW, you: YOU, ghost: MATHS_WEEK_1 },
        { name: 'Art quiz', xs: ART, axis: RAW, you: YOU_ART },
      ]
    case 'curved':
    case 'late':
      return [
        { name: 'Maths, curved', xs: curved(MATHS_WEEK_2), axis: CURVED, you: scene === 'late' ? null : YOU },
        { name: 'Art, curved', xs: curved(ART), axis: CURVED, you: scene === 'late' ? null : YOU_ART },
      ]
    case 'graded':
    case 'named': {
      const named = scene === 'named'
      return [
        { name: named ? 'Channel 1' : 'Maths: 75 + 10 × curved', extra: named ? 'γ = 10, β = 75' : undefined, xs: graded(MATHS_WEEK_2, 'maths'), axis: GRADED, you: YOU },
        { name: named ? 'Channel 2' : 'Art: 85 + 6 × curved', extra: named ? 'γ = 6, β = 85' : undefined, xs: graded(ART, 'art'), axis: GRADED, you: YOU_ART },
      ]
    }
  }
}

// Where each scene's dots come from, so they move rather than jump
const BEFORE: Partial<Record<Scene, Scene>> = { 'week-2': 'week-1', curved: 'week-2', graded: 'curved' }

const HEADINGS: Record<Scene, string> = {
  'week-1': 'Raw scores',
  'week-2': 'Raw scores, a week later',
  curved: '(score − class average) ÷ spread',
  graded: 'Back on a scale the school picks',
  late: 'One student, alone, curved with kept numbers',
  named: 'A batch of 8 photos, two channels',
}

export function Classroom({ scene }: { scene: Scene }) {
  const t = usePlay(1, 1100)
  const ease = t * t * (3 - 2 * t)
  const rows = rowsOf(scene)
  const before = BEFORE[scene] ? rowsOf(BEFORE[scene]) : null
  const named = scene === 'named'

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={`${HEADINGS[scene]}: two rows of dots, one dot a student`}>
      <text x={LEFT} y={22} className={`fill-ink ${caps}`}>
        {HEADINGS[scene]}
      </text>
      {rows.map((row, r) => {
        const y = ROWS[r]
        const lift = swarm(row.xs.map((x) => px(row.axis, x)))
        const from = before?.[r]
        const fromLift = from ? swarm(from.xs.map((x) => px(from.axis, x))) : null
        const moved = !!from && from.axis !== row.axis
        return (
          <g key={r}>
            <text x={LEFT} y={y - 38} className={`fill-zinc-faded ${caps}`}>
              {row.name}
              {/* Greek letters stay lower case: uppercase would turn γ into Γ */}
              {row.extra && <tspan className="normal-case tracking-normal">{`\u00a0·\u00a0${row.extra}`}</tspan>}
            </text>
            <line x1={LEFT} x2={RIGHT} y1={y + 24} y2={y + 24} className="stroke-zinc-300" strokeWidth={1} />
            {row.axis.ticks.map((tick) => (
              <g key={tick} opacity={moved ? ease : 1}>
                <line x1={px(row.axis, tick)} x2={px(row.axis, tick)} y1={y + 20} y2={y + 28} className="stroke-zinc-400" strokeWidth={1} />
                <text x={px(row.axis, tick)} y={y + 42} textAnchor="middle" className={`fill-zinc-faded ${mono}`}>
                  {row.axis.format(tick)}
                </text>
              </g>
            ))}
            {row.ghost?.map((x, i) => (
              <circle key={`ghost-${i}`} cx={px(row.axis, x)} cy={y + swarm(row.ghost!.map((g) => px(row.axis, g)))[i]} r={R} className="fill-none stroke-ink" strokeOpacity={0.35} strokeDasharray="2 2" />
            ))}
            {row.ghost && (
              <text x={px(row.axis, mean8(row.ghost))} y={y - 26} textAnchor="middle" className={`fill-zinc-faded ${mono}`}>
                last week
              </text>
            )}
            {row.xs.map((x, i) => {
              const toX = px(row.axis, x)
              const toY = y + lift[i]
              const cx = from && fromLift ? lerp(px(from.axis, from.xs[i]), toX, ease) : toX
              const cy = from && fromLift ? lerp(y + fromLift[i], toY, ease) : toY
              const you = row.you === i
              return (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={R}
                  className={you ? 'fill-sage' : 'fill-ink'}
                  fillOpacity={you ? 1 : scene === 'late' ? 0.25 : 0.55}
                  opacity={from ? 1 : ease}
                />
              )
            })}
            {row.you !== null && (
              <text
                x={from ? lerp(px(from.axis, from.xs[row.you]), px(row.axis, row.xs[row.you]), ease) : px(row.axis, row.xs[row.you])}
                y={y + above(row.xs.map((x) => px(row.axis, x)), lift, row.you) - 12}
                textAnchor="middle"
                {...halo}
                className={`${halo.className} ${mono}`}
              >
                {named ? 'your photo' : `you ${scoreText(scene, row.xs[row.you])}`}
              </text>
            )}
            {scene === 'late' && r === 1 && <Late y={y} t={ease} />}
          </g>
        )
      })}
    </svg>
  )
}

// The top of the dots stacked over or beside dot `i`, so its label clears them
function above(xs: number[], lift: number[], i: number) {
  let top = lift[i] - R
  xs.forEach((x, j) => {
    if (Math.abs(x - xs[i]) < 4 * R) top = Math.min(top, lift[j] - R)
  })
  return top
}

const mean8 = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length

function scoreText(scene: Scene, x: number) {
  if (scene === 'curved') return signed(x)
  return Math.round(x).toString()
}

// The late student's dot, curved with the kept average and spread
function Late({ y, t }: { y: number; t: number }) {
  const x = px(CURVED, LATE_CURVED)
  return (
    <g opacity={t}>
      <circle cx={x} cy={y} r={R + 1} className="fill-sage stroke-ink" strokeWidth={1.5} />
      <text x={x} y={y - 16} textAnchor="middle" {...halo} className={`${halo.className} ${mono}`}>
        late: 96 → {signed(LATE_CURVED)}
      </text>
      <line x1={px(CURVED, 0)} x2={px(CURVED, 0)} y1={y - 12} y2={y + 24} className="stroke-sage" strokeWidth={1.5} strokeDasharray="3 3" />
      <text x={px(CURVED, 0) + 4} y={y - 16} textAnchor="end" {...halo} className={`${halo.className} ${mono}`}>
        kept average {plain(KEPT_MEAN)}
      </text>
    </g>
  )
}

// One value's normalized output in many batches, a dot per batch, spread
// up and down at random so that piles of them show as darker patches, beside where it would land against everything
// the channel sees
const W_AXIS: Axis = { from: -0.5, to: 2.5, ticks: [-0.5, 0, 0.5, 1, 1.5, 2, 2.5], format: (x) => (x === 0 ? '0' : signed(x)) }
const W_HEIGHT = 210
const W_BASE = 168
const W_R = 4.5
// Each dot's fixed height in the strip, from 0 to 1
const JITTER = (() => {
  const random = seeded(5)
  return Array.from({ length: 64 }, () => random())
})()

export function Wobble({ outputs, what, whole }: { outputs: number[]; what: string; whole: string }) {
  const shown = usePlay(outputs.length, 45)
  const truth = px(W_AXIS, TRUE_Z)
  const dots = outputs.map((z, i) => ({
    x: px(W_AXIS, Math.max(W_AXIS.from, Math.min(W_AXIS.to, z))),
    y: W_BASE - 14 - JITTER[i % JITTER.length] * 96,
  }))
  return (
    <svg viewBox={`0 0 ${WIDTH} ${W_HEIGHT}`} className="w-full" role="img" aria-label={`${outputs.length} dots, ${what}`}>
      <text x={LEFT} y={22} className={`fill-ink ${caps}`}>
        {what}
      </text>
      <line x1={truth} x2={truth} y1={34} y2={W_BASE} className="stroke-sage" strokeWidth={2} />
      <text x={truth + 6} y={44} {...halo} className={`${halo.className} ${mono}`}>
        {whole}
      </text>
      {dots.map(({ x, y }, i) =>
        i < Math.floor(shown) ? <circle key={i} cx={x} cy={y} r={W_R} className="fill-ink" fillOpacity={0.45} /> : null,
      )}
      <line x1={LEFT} x2={RIGHT} y1={W_BASE} y2={W_BASE} className="stroke-zinc-300" strokeWidth={1} />
      {W_AXIS.ticks.map((tick) => (
        <g key={tick}>
          <line x1={px(W_AXIS, tick)} x2={px(W_AXIS, tick)} y1={W_BASE - 4} y2={W_BASE + 4} className="stroke-zinc-400" strokeWidth={1} />
          <text x={px(W_AXIS, tick)} y={W_BASE + 18} textAnchor="middle" className={`fill-zinc-faded ${mono}`}>
            {W_AXIS.format(tick)}
          </text>
        </g>
      ))}
    </svg>
  )
}
