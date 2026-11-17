import { lerp, usePlay } from '../../components/explain/useLoop'
import {
  CARD,
  DESK,
  DESK_PITCH,
  DESK_X,
  DESK_Y,
  GHOST_X,
  HEIGHT,
  SCENES,
  STACK_Y,
  TOP_Y,
  WIDTH,
  type Frame,
  type Scene,
  type Spot,
} from './story'

// Real milliseconds a move takes, by scene
const PACE: Partial<Record<Scene, number>> = { sort: 650, tops: 900, merge: 420, overflow: 900 }

const ease = (t: number) => t * t * (3 - 2 * t)

// Where every paper is `played` moves into the frames
function at(frames: Frame[], played: number): { spots: [number, Spot, boolean][]; frame: Frame } {
  const i = Math.min(Math.floor(played), frames.length - 1)
  const from = frames[i]
  const to = frames[Math.min(i + 1, frames.length - 1)]
  const t = ease(played - i)
  const spots = Object.keys(to.at).map((key): [number, Spot, boolean] => {
    const id = Number(key)
    const a = from.at[id]
    const b = to.at[id]
    const moving = a.x !== b.x || a.y !== b.y
    return [id, { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), tone: moving && t > 0 ? b.tone : a.tone }, moving]
  })
  // Papers on the move go over the others
  spots.sort((p, q) => Number(p[2]) - Number(q[2]))
  return { spots, frame: from }
}

const label = 'fill-zinc-faded font-mono text-[11px] uppercase tracking-widest'

const WORDS = {
  story: {
    pile: 'Papers to sort',
    finished: 'Finished pile',
    desk: `Desk · room for ${DESK}`,
    free: 'free spot',
    stacks: 'Sorted stacks',
    stack: (j: number) => `stack ${j + 1}`,
    moved: (reads: number, writes: number) => `Picked up ${reads} · put down ${writes}`,
  },
  system: {
    pile: 'File on disk',
    finished: 'Sorted file on disk',
    desk: `Memory · M = ${DESK} pages`,
    free: 'output page',
    stacks: 'Sorted runs on disk',
    stack: (j: number) => `run ${j + 1}`,
    moved: (reads: number, writes: number) => `Page reads ${reads} · writes ${writes}`,
  },
}

// The desk story, one scene of it, played once from the start; give it a
// `key` per step. `system` names everything as the database sees it.
export default function Desk({ scene, system = false }: { scene: Scene; system?: boolean }) {
  const frames = SCENES[scene]
  const played = usePlay(frames.length - 1, PACE[scene] ?? 600)
  const { spots, frame } = at(frames, played)
  const words = system ? WORDS.system : WORDS.story
  const merging = scene === 'tops' || scene === 'merge' || scene === 'done' || scene === 'overflow'
  const stacks = new Set(
    Object.values(frame.at)
      .filter((spot) => spot.y >= STACK_Y)
      .map((spot) => Math.round((spot.y - STACK_Y) / 32))
  )
  const stackRows = scene === 'start' ? 0 : scene === 'overflow' ? 4 : scene === 'sort' ? stacks.size : 3
  const counted = scene !== 'start' && scene !== 'overflow'
  const status =
    scene === 'overflow'
      ? system
        ? `4 runs + output = 5 pages > M`
        : 'Needs 5 spots · the desk has 4'
      : scene === 'done'
        ? system
          ? `${frame.reads + frame.writes} I/Os = 4 × 12 pages`
          : `Never more than ${DESK} on the desk`
        : null

  return (
    <div>
      <div className="flex min-h-[1.5rem] flex-wrap items-baseline justify-between gap-4 font-mono text-[0.875rem] uppercase tracking-widest">
        <span className={`tabular-nums ${counted ? 'text-ink' : 'text-zinc-faded'}`}>
          {counted ? words.moved(frame.reads, frame.writes) : ''}
        </span>
        {status && <span className={`text-right ${scene === 'overflow' ? 'text-ink' : 'text-sage-ink'}`}>{status}</span>}
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mx-auto mt-2 w-full max-w-[34rem]"
        role="img"
        aria-label={
          system
            ? 'Pages moving between a file on disk, a memory of four pages, and sorted runs on disk'
            : 'Exam papers moving between a pile, a desk with room for four, and sorted stacks'
        }
      >
        <text x={22} y={TOP_Y - 10} className={label}>
          {merging ? words.finished : words.pile}
        </text>

        {/* The desk: four spots, the last one kept free while merging */}
        <rect
          x={DESK_X - 12}
          y={DESK_Y - 12}
          width={(DESK - 1) * DESK_PITCH + CARD.w + 24}
          height={CARD.h + 24}
          rx={12}
          className="fill-sage/10 stroke-sage"
          strokeWidth={1.5}
        />
        <text x={DESK_X - 12} y={DESK_Y - 20} className={label}>
          {words.desk}
        </text>
        {Array.from({ length: DESK }, (_, s) => (
          <rect
            key={s}
            x={DESK_X + s * DESK_PITCH}
            y={DESK_Y}
            width={CARD.w}
            height={CARD.h}
            rx={5}
            className="fill-paper stroke-zinc-300 dark:stroke-zinc-200/25"
            strokeDasharray={merging && s === DESK - 1 ? '3 3' : undefined}
          />
        ))}
        {merging && (
          <text
            x={DESK_X + (DESK - 1) * DESK_PITCH + CARD.w / 2}
            y={DESK_Y + CARD.h + 30}
            textAnchor="middle"
            className={label}
          >
            {words.free}
          </text>
        )}
        {scene === 'overflow' && (
          <rect
            x={GHOST_X}
            y={DESK_Y}
            width={CARD.w}
            height={CARD.h}
            rx={5}
            className="fill-none stroke-ink"
            strokeDasharray="3 3"
          />
        )}

        {stackRows > 0 && (
          <text x={22} y={STACK_Y - 10} className={label}>
            {words.stacks}
          </text>
        )}
        {Array.from({ length: stackRows }, (_, j) => (
          <text key={j} x={22 + 4 * 34 + 8} y={STACK_Y + j * 32 + 17} className={label}>
            {words.stack(j)}
          </text>
        ))}

        {spots.map(([id, spot]) => (
          <g key={id} transform={`translate(${spot.x},${spot.y})`}>
            <rect
              width={CARD.w}
              height={CARD.h}
              rx={5}
              className={
                spot.tone === 'next' ? 'fill-sage stroke-sage' : spot.tone === 'stuck' ? 'fill-ink stroke-ink' : 'fill-paper stroke-ink'
              }
              strokeWidth={1.2}
            />
            <text
              x={CARD.w / 2}
              y={CARD.h / 2 + 4}
              textAnchor="middle"
              className={`font-mono text-[11px] ${spot.tone === 'plain' ? 'fill-ink' : 'fill-paper'}`}
            >
              {id}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
