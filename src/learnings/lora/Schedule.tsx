import { usePlay } from '../../components/explain/useLoop'
import {
  CHANGE,
  COLDEST,
  HOUR_LIST,
  HOURS,
  NEW_SCHEDULE,
  ROOM_LIST,
  ROOMS,
  SCHEDULE,
  STORY,
  WARMEST,
} from './model'

const WIDTH = 420
const HEIGHT = 250
// The hour list: a strip above the grid
const STRIP = { y: 20, height: 12 }
// The grid: a row per room, a column per hour
const GRID = { left: 116, top: 48, cell: 12, row: 22 }
// The room list: a column left of the grid, its numbers left of that
const LIST_X = 94
const VALUE_X = 88

export type Show = 'table' | 'every' | 'shape' | 'note' | 'zero' | 'merged' | 'named'

const colX = (h: number) => GRID.left + GRID.cell * h
const rowY = (r: number) => GRID.top + GRID.row * r
// A temperature's shade: fuller ink is warmer
const warmth = (t: number) => 0.06 + (0.84 * (t - COLDEST)) / (WARMEST - COLDEST)
const signed = (x: number) => (x === 0 ? '0' : `+${x}`)
const smooth = (t: number) => t * t * (3 - 2 * t)

// The story: a house's heating schedule, 8 rooms × 24 hours; the change you
// want, which is a room list times an hour list; that note kept beside the
// printed schedule, started at zero, and finally copied in. Give it a `key`
// per step so it plays again.
export default function Schedule({ show }: { show: Show }) {
  // One-off animations, each over the step it belongs to
  const played = usePlay(1, show === 'every' ? 2600 : show === 'zero' ? 3200 : show === 'note' ? 1400 : 1000)

  const lists = show === 'shape' || show === 'note' || show === 'zero' || show === 'named' || show === 'merged'
  // How much of the note is in force: the room list grows from zero in 'zero'
  const grown = show === 'zero' ? smooth(Math.max(0, (played - 0.3) / 0.7)) : 1
  const rooms = ROOM_LIST.map((x) => x * grown)
  // How far the lists have faded out once copied in
  const listFade = show === 'merged' ? 1 - played : 1

  // What each cell shows
  const cell = (r: number, h: number): { tone: 'ink' | 'sage'; opacity: number } => {
    if (show === 'table' || show === 'every') return { tone: 'ink', opacity: warmth(SCHEDULE[r][h]) }
    if (show === 'shape') {
      // The change fills in room by room
      const shown = Math.min(1, Math.max(0, played * ROOMS.length - r))
      return { tone: 'sage', opacity: CHANGE[r][h] ? shown * (0.15 + (0.8 * CHANGE[r][h]) / STORY.most) : 0 }
    }
    if (show === 'note') return { tone: 'ink', opacity: warmth(SCHEDULE[r][h] + smooth(played) * CHANGE[r][h]) }
    if (show === 'zero') return { tone: 'ink', opacity: warmth(SCHEDULE[r][h] + rooms[r] * HOUR_LIST[h]) }
    return { tone: 'ink', opacity: warmth(NEW_SCHEDULE[r][h]) }
  }

  const outlined = show === 'every' ? Math.floor(played * STORY.settings) : 0
  const named = show === 'named'

  const status =
    show === 'table'
      ? `${STORY.settings} settings`
      : show === 'every'
        ? `Rethinking ${Math.max(1, outlined)} of ${STORY.settings}`
        : show === 'shape'
          ? 'Room amount × hour amount'
          : show === 'note'
            ? `${STORY.settings} printed + a note of ${STORY.note}`
            : show === 'zero'
              ? grown === 0
                ? 'The note adds 0° everywhere'
                : 'Tuning the room list'
              : show === 'merged'
                ? 'One table again'
                : 'W (frozen) + B A'

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 font-mono text-[0.875rem] uppercase tracking-widest">
        <span className="shrink-0 text-zinc-faded">{named ? 'One layer' : 'Heating'}</span>
        <span className={`text-right ${show === 'table' || show === 'every' ? 'text-ink' : 'text-sage-ink'}`}>{status}</span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-2 w-full"
        role="img"
        aria-label={`A heating schedule: ${ROOMS.length} rooms by ${HOURS.length} hours, ${STORY.settings} temperatures.${
          lists
            ? ` Beside it, a note of ${STORY.note} numbers: a list of how much warmer each room should be (nursery 3 degrees, bedroom 1.5) and a list of how much each hour gets (the evening). Each cell's change is its room amount times its hour amount.`
            : ''
        }`}
      >
        {/* The hour list */}
        {lists && (
          <g opacity={listFade}>
            <text x={0} y={STRIP.y + 10} className="fill-sage-ink font-mono text-[10px] uppercase tracking-widest">
              {named ? 'A' : 'Hour list'}
            </text>
            {HOURS.map((h) => (
              <rect
                key={h}
                x={colX(h) + 0.5}
                y={STRIP.y}
                width={GRID.cell - 1}
                height={STRIP.height}
                rx={2}
                className={HOUR_LIST[h] ? 'fill-sage' : 'fill-none stroke-zinc-300 dark:stroke-zinc-200/25'}
                fillOpacity={HOUR_LIST[h] ? 0.35 + 0.55 * HOUR_LIST[h] : undefined}
              />
            ))}
          </g>
        )}

        {/* The room list's heading */}
        {lists && (
          <text x={LIST_X + 6} y={GRID.top - 6} textAnchor="middle" className="fill-sage-ink font-mono text-[10px]" opacity={listFade}>
            {named ? 'B' : '°C'}
          </text>
        )}

        {ROOMS.map((room, r) => {
          const y = rowY(r)
          return (
            <g key={room}>
              <text x={0} y={y + 14} className="fill-ink font-mono text-[10px]">
                {named ? `out ${r + 1}` : room}
              </text>
              {lists && (
                <g opacity={listFade}>
                  <text x={VALUE_X} y={y + 14} textAnchor="end" className="fill-sage-ink font-mono text-[10px] tabular-nums">
                    {signed(Math.round(rooms[r] * 10) / 10)}
                  </text>
                  <rect
                    x={LIST_X}
                    y={y + 1}
                    width={12}
                    height={GRID.row - 2}
                    rx={2}
                    className={rooms[r] ? 'fill-sage' : 'fill-none stroke-zinc-300 dark:stroke-zinc-200/25'}
                    fillOpacity={rooms[r] ? 0.35 + (0.55 * rooms[r]) / STORY.most : undefined}
                  />
                </g>
              )}
              {HOURS.map((h) => {
                const { tone, opacity } = cell(r, h)
                return (
                  <rect
                    key={h}
                    x={colX(h) + 0.5}
                    y={y + 1}
                    width={GRID.cell - 1}
                    height={GRID.row - 2}
                    rx={2}
                    className={tone === 'sage' ? 'fill-sage' : 'fill-ink'}
                    fillOpacity={opacity}
                  />
                )
              })}
            </g>
          )
        })}

        {/* Every setting, outlined as you get to it */}
        {show === 'every' &&
          Array.from({ length: outlined }, (_, i) => {
            const r = Math.floor(i / HOURS.length)
            const h = i % HOURS.length
            return (
              <rect
                key={i}
                x={colX(h) + 1}
                y={rowY(r) + 1.5}
                width={GRID.cell - 2}
                height={GRID.row - 3}
                rx={2}
                className="fill-none stroke-sage"
                strokeWidth={1.2}
              />
            )
          })}

        {/* The hours */}
        {[0, 6, 12, 18].map((h) => (
          <text
            key={h}
            x={colX(h) + 1}
            y={rowY(ROOMS.length) + 14}
            className="fill-zinc-faded font-mono text-[10px] tabular-nums"
          >
            {named ? `in ${h + 1}` : `${String(h).padStart(2, '0')}:00`}
          </text>
        ))}
      </svg>
      <p className="mt-2 font-mono text-[0.75rem] text-zinc-faded">
        {show === 'shape' ? 'Fuller sage: a bigger change' : named ? 'Fuller ink: a larger weight' : 'Fuller ink: warmer'}
        {lists && !named && show !== 'merged' ? ' · sage: the note' : ''}
      </p>
    </div>
  )
}
