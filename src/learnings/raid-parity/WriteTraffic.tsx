import { usePlay } from '../../components/explain/useLoop'
import { diskCount, parityDisk, place, touches, traffic, type Layout } from './model'

const WIDTH = 560
const HEIGHT = 340
const SIDE = 16
const GAP = 8
const GRID_TOP = 30
const GRID_HEIGHT = 120
const BAR_BASE = 300
const BAR_HEIGHT = 110
// Milliseconds a write
const PACE = 160

// A disk's name: mirrors pair up as 1 and 1′; RAID 4's last disk is its parity
function diskName(layout: Layout, n: number, disk: number): string {
  if (layout === 'RAID 1') return `${Math.floor(disk / 2) + 1}${disk % 2 ? '′' : ''}`
  if (layout === 'RAID 4' && disk === n) return 'P'
  return String(disk + 1)
}

// What each disk holds in stripe `stripe`: a data block's number, or P
function stripeContents(layout: Layout, n: number, stripe: number): string[] {
  const cells = Array<string>(diskCount(layout, n)).fill('')
  for (let slot = 0; slot < n; slot++) {
    const block = stripe * n + slot
    for (const disk of place(layout, n, block).disks) cells[disk] = String(block)
  }
  const p = parityDisk(layout, n, stripe)
  if (p !== null) cells[p] = 'P'
  return cells
}

// An array of disks taking a stream of small writes to random blocks. The
// grid is what each disk holds, a row a stripe; the bars under it count the
// operations each disk has done. Each write lights the data block it changes
// and, with parity, the parity block it must also read and rewrite. It plays
// once; give it a `key` to play again.
export default function WriteTraffic({ layout, n, blocks }: { layout: Layout; n: number; blocks: number[] }) {
  const played = usePlay(blocks.length, PACE)
  const disks = diskCount(layout, n)
  const stripes = n + 1
  const column = Math.min(64, (WIDTH - 2 * SIDE - (disks - 1) * GAP) / disks)
  const left = (WIDTH - disks * column - (disks - 1) * GAP) / 2
  const x = (disk: number) => left + disk * (column + GAP)
  const pitch = GRID_HEIGHT / stripes
  const cell = pitch - 4

  const current = Math.floor(played)
  const counted = Math.min(blocks.length, Math.floor(played + 0.5))
  const counts = traffic(layout, n, blocks.slice(0, counted))
  // Every disk is drawn against the most a disk can do: two operations a write
  const scale = BAR_HEIGHT / (2 * blocks.length)
  const lit = current < blocks.length ? touches(layout, n, blocks[current]) : []
  const litStripe = current < blocks.length ? place(layout, n, blocks[current]).stripe : -1
  const contents = Array.from({ length: stripes }, (_, s) => stripeContents(layout, n, s))
  const busiest = Math.max(...counts)

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      role="img"
      aria-label={`${layout} with ${disks} disks taking ${blocks.length} small writes; the busiest disk does ${busiest} operations`}
    >
      {Array.from({ length: disks }, (_, disk) => (
        <text
          key={disk}
          x={x(disk) + column / 2}
          y={18}
          textAnchor="middle"
          className={`${layout === 'RAID 4' && disk === n ? 'fill-ink' : 'fill-zinc-faded'} font-mono text-[11px] uppercase tracking-widest`}
        >
          {diskName(layout, n, disk)}
        </text>
      ))}

      {contents.map((cells, s) =>
        cells.map((label, disk) => {
          const hit = s === litStripe ? lit.find((t) => t.disk === disk) : undefined
          const isParity = label === 'P'
          const tone = hit
            ? hit.parity
              ? 'fill-ink stroke-ink'
              : 'fill-sage stroke-sage'
            : isParity
              ? 'fill-ink/10 stroke-zinc-400'
              : 'fill-paper stroke-zinc-300 dark:stroke-zinc-200/25'
          const y = GRID_TOP + s * pitch
          return (
            <g key={`${s} ${disk}`}>
              <rect x={x(disk)} y={y} width={column} height={cell} rx={5} className={tone} strokeWidth={1} />
              {cell >= 12 && (
                <text
                  x={x(disk) + column / 2}
                  y={y + cell / 2 + 4}
                  textAnchor="middle"
                  className={`${hit ? 'fill-paper' : isParity ? 'fill-ink' : 'fill-zinc-faded'} font-mono text-[10px]`}
                >
                  {label}
                </text>
              )}
            </g>
          )
        })
      )}

      <text x={SIDE} y={BAR_BASE - BAR_HEIGHT - 20} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
        Disk operations so far
      </text>
      <line x1={left - 4} x2={x(disks - 1) + column + 4} y1={BAR_BASE} y2={BAR_BASE} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
      {counts.map((count, disk) => {
        const h = count * scale
        const top = count === busiest && count > 0
        return (
          <g key={disk}>
            <rect
              x={x(disk) + column * 0.15}
              y={BAR_BASE - h}
              width={column * 0.7}
              height={h}
              rx={3}
              className={top ? 'fill-ink' : 'fill-sage'}
            />
            <text
              x={x(disk) + column / 2}
              y={BAR_BASE - h - 5}
              textAnchor="middle"
              className={`${top ? 'fill-ink' : 'fill-zinc-faded'} font-mono text-[10px] tabular-nums`}
            >
              {count}
            </text>
            <text x={x(disk) + column / 2} y={BAR_BASE + 16} textAnchor="middle" className="fill-zinc-faded font-mono text-[10px]">
              {diskName(layout, n, disk)}
            </text>
          </g>
        )
      })}
      <text x={WIDTH / 2} y={HEIGHT - 6} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
        {Math.min(counted, blocks.length)} of {blocks.length} small writes
      </text>
    </svg>
  )
}
