import { lerp, usePlay } from '../../components/explain/useLoop'
import {
  BIG_ROOM,
  BOX,
  BOX_DIGITS,
  BOX_X,
  BOX_Y,
  BOXES,
  CARD,
  HEIGHT,
  INVOICE_Y,
  INVOICES,
  ROOM,
  SCENES,
  SLIP_Y,
  SLIPS,
  TABLE_PITCH,
  TABLE_Y,
  tableX,
  TRIPS,
  WIDTH,
  type Frame,
  type Scene,
  type Spot,
} from './story'

// Real milliseconds a move takes, by scene
const PACE: Partial<Record<Scene, number>> = { nested: 230, onePass: 300, partition: 260, boxJoin: 300, sort: 420 }

const ease = (t: number) => t * t * (3 - 2 * t)

// Where every sheet is `played` moves into the frames
function at(frames: Frame[], played: number): { spots: [string, Spot, boolean][]; frame: Frame } {
  const i = Math.min(Math.floor(played), frames.length - 1)
  const from = frames[i]
  const to = frames[Math.min(i + 1, frames.length - 1)]
  const t = ease(played - i)
  const spots = Object.keys(to.at).map((id): [string, Spot, boolean] => {
    const a = from.at[id]
    const b = to.at[id]
    const moving = a.x !== b.x || a.y !== b.y
    return [id, { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), tone: moving && t > 0 ? b.tone : a.tone }, moving]
  })
  // Sheets on the move go over the others
  spots.sort((p, q) => Number(p[2]) - Number(q[2]))
  return { spots, frame: from }
}

const label = 'fill-zinc-faded font-mono text-[11px] uppercase tracking-widest'

const WORDS = {
  story: {
    invoices: `Invoices · ${INVOICES.length}`,
    slips: `Shipping slips · ${SLIPS.length}`,
    table: (room: number) => (room === ROOM ? `Table · room for ${room}` : `A table with room for ${room}`),
    hand: 'in hand',
    box: (b: number) => `box ${b + 1} · ends ${BOX_DIGITS[b]}`,
    moved: (frame: Frame) => `Picked up ${frame.reads} · put down ${frame.writes}`,
  },
  system: {
    invoices: `R on disk · B(R) = ${INVOICES.length} pages`,
    slips: `S on disk · B(S) = ${SLIPS.length} pages`,
    table: (room: number) => `Memory · M = ${room} pages`,
    hand: 'input page',
    box: (b: number) => `partition ${b + 1}`,
    moved: (frame: Frame) => `Page reads ${frame.reads} · writes ${frame.writes}`,
  },
}

// What the figure says once a scene has played out
function status(scene: Scene, system: boolean, end: Frame): string | null {
  const all = INVOICES.length + SLIPS.length
  switch (scene) {
    case 'nested':
      return `${TRIPS} trips through the invoices`
    case 'onePass':
      return 'Every sheet picked up once'
    case 'boxJoin':
      return system
        ? `${end.reads + end.writes} I/Os = 3 × (${INVOICES.length} + ${SLIPS.length})`
        : `${end.reads + end.writes} = 3 handlings × ${all} sheets`
    case 'sort':
      return 'Each slip meets its invoice'
    default:
      return null
  }
}

// The stapling story, one scene of it, played once from the start; give it
// a `key` per step. `system` names everything as the database sees it.
export default function Stapling({ scene, system = false }: { scene: Scene; system?: boolean }) {
  const frames = SCENES[scene]
  const played = usePlay(frames.length - 1, PACE[scene] ?? 400)
  const { spots, frame } = at(frames, played)
  const words = system ? WORDS.system : WORDS.story
  const room = scene === 'onePass' ? BIG_ROOM : ROOM
  const boxes = scene === 'partition' || scene === 'boxJoin'
  const counted = scene !== 'start' && scene !== 'sort'
  const done = played >= frames.length - 1
  const said = done ? status(scene, system, frames[frames.length - 1]) : null

  return (
    <div>
      <div className="flex min-h-[1.5rem] flex-wrap items-baseline justify-between gap-x-4 font-mono text-[0.875rem] uppercase tracking-widest">
        <span className="tabular-nums text-ink">{counted ? words.moved(frame) : ''}</span>
        {said && <span className="text-right text-sage-ink">{said}</span>}
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mx-auto mt-2 w-full max-w-[34rem]"
        role="img"
        aria-label={
          system
            ? 'Pages of two tables moving between disk, a memory of four pages, and three partitions on disk'
            : 'Invoices and shipping slips moving between their piles, a table with room for four sheets, and three boxes'
        }
      >
        <text x={26} y={INVOICE_Y - 10} className={label}>
          {words.invoices}
        </text>
        <text x={26} y={SLIP_Y - 10} className={label}>
          {words.slips}
        </text>

        {/* The table: its spots, the last one for the sheet in hand */}
        <rect
          x={tableX(room) - 12}
          y={TABLE_Y - 12}
          width={(room - 1) * TABLE_PITCH + CARD.w + 24}
          height={CARD.h + 24}
          rx={12}
          className="fill-sage/10 stroke-sage"
          strokeWidth={1.5}
        />
        <text x={tableX(room) - 12} y={TABLE_Y - 20} className={label}>
          {words.table(room)}
        </text>
        {Array.from({ length: room }, (_, k) => (
          <rect
            key={k}
            x={tableX(room) + k * TABLE_PITCH}
            y={TABLE_Y}
            width={CARD.w}
            height={CARD.h}
            rx={5}
            className="fill-paper stroke-zinc-300 dark:stroke-zinc-200/25"
            strokeDasharray={k === room - 1 ? '3 3' : undefined}
          />
        ))}
        <text x={tableX(room) + (room - 1) * TABLE_PITCH + CARD.w / 2} y={TABLE_Y + CARD.h + 28} textAnchor="middle" className={label}>
          {words.hand}
        </text>

        {boxes &&
          Array.from({ length: BOXES }, (_, b) => (
            <g key={b}>
              <rect
                x={BOX_X + b * (BOX.w + BOX.gap)}
                y={BOX_Y}
                width={BOX.w}
                height={BOX.h}
                rx={10}
                className="fill-none stroke-zinc-300 dark:stroke-zinc-200/25"
                strokeWidth={1.5}
              />
              <text x={BOX_X + b * (BOX.w + BOX.gap) + BOX.w / 2} y={BOX_Y + BOX.h + 18} textAnchor="middle" className={label}>
                {words.box(b)}
              </text>
            </g>
          ))}

        {spots.map(([id, spot]) => {
          const isSlip = id.startsWith('s')
          return (
            <g key={id} transform={`translate(${spot.x},${spot.y})`}>
              <rect
                width={CARD.w}
                height={CARD.h}
                rx={isSlip ? 9 : 4}
                className={
                  spot.tone === 'matched'
                    ? 'fill-sage stroke-sage'
                    : spot.tone === 'look'
                      ? 'fill-sage/15 stroke-sage'
                      : 'fill-paper stroke-ink'
                }
                strokeWidth={spot.tone === 'look' ? 2 : 1.2}
              />
              <text
                x={CARD.w / 2}
                y={CARD.h / 2 + 4}
                textAnchor="middle"
                className={`font-mono text-[11px] ${spot.tone === 'matched' ? 'fill-paper' : 'fill-ink'}`}
              >
                {id.slice(1)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
