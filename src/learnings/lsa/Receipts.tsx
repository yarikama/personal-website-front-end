import { lerp, usePlay } from '../../components/explain/useLoop'
import { BLUE, COLA_RAW, COLA_SQUEEZED, ITEMS, RECEIPTS, RED, SHARED_RECEIPTS, SHOP, SHOP_MAP, SNACKS } from './model'

const WIDTH = 600
const HEIGHT = 320
// The pile of receipts, as a grid: a row per item, a column per receipt
const GRID = { left: 78, top: 52, cell: 17, row: 26 }
const GRID_RIGHT = GRID.left + GRID.cell * RECEIPTS.length
// The map: two numbers per item, from the origin at the left
const MAP = { x: 350, y: 222, scale: 92 }

export type Show = 'pile' | 'apart' | 'zero' | 'company' | 'squeeze' | 'close' | 'named'

const rowY = (i: number) => GRID.top + GRID.row * i + GRID.row / 2
const colX = (j: number) => GRID.left + GRID.cell * j + GRID.cell / 2
const mapX = (i: number) => MAP.x + MAP.scale * SHOP_MAP[i][0]
const mapY = (i: number) => MAP.y - MAP.scale * SHOP_MAP[i][1]

// Where each item's name sits beside its point on the map, by hand: the
// colas sit close to the snacks, and eggs on top of coffee
const LABELS: { dx: number; dy: number; anchor: 'start' | 'middle' | 'end'; text?: string }[] = [
  { dx: 0, dy: 20, anchor: 'middle' }, // red cola
  { dx: 10, dy: -4, anchor: 'start' }, // blue cola
  { dx: 9, dy: 2, anchor: 'start' }, // chips
  { dx: 8, dy: 16, anchor: 'start' }, // popcorn
  { dx: 10, dy: 4, anchor: 'start' }, // bread
  { dx: 10, dy: 4, anchor: 'start' }, // milk
  { dx: 10, dy: 4, anchor: 'start', text: 'Eggs, Coffee' }, // eggs
  { dx: 0, dy: 0, anchor: 'start', text: '' }, // coffee, named with eggs
]

const two = (value: number) => (Math.abs(value) < 0.005 ? 0 : value).toFixed(2)

// The story: a corner shop's twelve receipts as a grid, the two colas that
// never share one, the company they keep, and each item squeezed to two
// numbers and placed on a map. Give it a `key` per step so it plays again.
export default function Receipts({ show }: { show: Show }) {
  const order: Show[] = ['pile', 'apart', 'zero', 'company', 'squeeze', 'close', 'named']
  const step = order.indexOf(show)
  const colas = step >= 1
  const company = show === 'company'
  const mapped = step >= 4
  const named = show === 'named'
  // Points fly from their row to the map over the squeeze; later steps start there
  const flown = usePlay(1, show === 'squeeze' ? 1400 : 1)
  const fly = show === 'squeeze' ? flown : mapped ? 1 : 0
  const ease = fly * fly * (3 - 2 * fly)

  const isCola = (i: number) => i === RED || i === BLUE
  // How strongly each item's marks show at this step
  const weight = (i: number) => {
    if (company) return isCola(i) || SNACKS.includes(i) ? 1 : 0.3
    return 1
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 font-mono text-[0.875rem] uppercase tracking-widest">
        <span className="shrink-0 text-zinc-faded">{named ? 'Words × documents' : 'Items × receipts'}</span>
        <span className="text-right text-zinc-faded">
          {step < 1 ? (
            ' '
          ) : mapped && step >= 5 ? (
            <>
              {named ? 'Cosine' : 'Score'} <span className="text-sage-ink tabular-nums">{two(COLA_SQUEEZED)}</span>
            </>
          ) : (
            <>
              Shared <span className="text-ink tabular-nums">{SHARED_RECEIPTS}</span>
              {step >= 2 && (
                <>
                  {' '}
                  · score <span className="text-ink tabular-nums">{two(COLA_RAW)}</span>
                </>
              )}
            </>
          )}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-2 w-full"
        role="img"
        aria-label={`A grid of ${ITEMS.length} items by ${RECEIPTS.length} receipts. Red cola and blue cola never share a receipt, so their rows score ${two(COLA_RAW)}.${mapped ? ` Squeezed to two numbers each, the items sit on a map where the two colas point almost the same way from the origin: a score of ${two(COLA_SQUEEZED)}.` : ''}`}
      >
        {/* Headers */}
        <text x={GRID.left - 8} y={GRID.top - 10} textAnchor="end" className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
          {named ? 'Word' : 'Item'}
        </text>
        <text x={GRID.left} y={GRID.top - 24} className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
          {named ? 'Documents 1–12' : 'Receipts 1–12'}
        </text>
        {RECEIPTS.map((_, j) => (
          <text key={j} x={colX(j)} y={GRID.top - 10} textAnchor="middle" className="fill-zinc-faded font-mono text-[9px] tabular-nums">
            {j + 1}
          </text>
        ))}

        {/* The rows to watch */}
        {colas &&
          [RED, BLUE].map((i) => (
            <rect key={i} x={4} y={rowY(i) - GRID.row / 2 + 2} width={GRID_RIGHT - 2} height={GRID.row - 4} rx={6} className="fill-sage" fillOpacity={0.18} />
          ))}

        {/* The grid */}
        {ITEMS.map((item, i) => (
          <g key={item}>
            <text x={GRID.left - 8} y={rowY(i) + 3.5} textAnchor="end" className="fill-ink font-mono text-[10px]">
              {item}
            </text>
            {SHOP[i].map((count, j) => {
              const x = colX(j)
              const y = rowY(i)
              if (!count) return <circle key={j} cx={x} cy={y} r={1.2} className="fill-zinc-400" />
              const cls = colas && isCola(i) ? 'fill-sage' : 'fill-ink'
              return count === 1 ? (
                <circle key={j} cx={x} cy={y} r={4.5} className={cls} fillOpacity={weight(i)} />
              ) : (
                <g key={j}>
                  <circle cx={x - 3} cy={y - 3} r={3.6} className={cls} fillOpacity={weight(i)} />
                  <circle cx={x + 3} cy={y + 3} r={3.6} className={cls} fillOpacity={weight(i)} />
                </g>
              )
            })}
          </g>
        ))}
        {company &&
          SNACKS.map((i) => (
            <rect key={i} x={4} y={rowY(i) - GRID.row / 2 + 2} width={GRID_RIGHT - 2} height={GRID.row - 4} rx={6} className="fill-none stroke-ink" strokeWidth={1} />
          ))}

        {/* The map */}
        <text x={MAP.x - 16} y={GRID.top - 24} className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
          {named ? 'Word vectors, k = 2' : 'Two numbers per item'}
        </text>
        <line x1={MAP.x} x2={MAP.x + 220} y1={MAP.y} y2={MAP.y} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
        <line x1={MAP.x} x2={MAP.x} y1={MAP.y + 80} y2={GRID.top - 16} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
        <text x={MAP.x + 220} y={MAP.y - 6} textAnchor="end" className="fill-zinc-faded font-mono text-[9px] uppercase tracking-widest">
          {named ? 'Dimension 1' : 'First number'}
        </text>
        <text x={MAP.x + 6} y={GRID.top - 8} className="fill-zinc-faded font-mono text-[9px] uppercase tracking-widest">
          {named ? 'Dimension 2' : 'Second number'}
        </text>

        {/* The colas' directions from the origin */}
        {step >= 5 &&
          [RED, BLUE].map((i) => (
            <line key={i} x1={MAP.x} y1={MAP.y} x2={mapX(i)} y2={mapY(i)} className="stroke-sage" strokeWidth={2} />
          ))}

        {mapped &&
          ITEMS.map((item, i) => {
            const x = lerp(GRID_RIGHT + 8, mapX(i), ease)
            const y = lerp(rowY(i), mapY(i), ease)
            const label = LABELS[i]
            const cola = isCola(i)
            return (
              <g key={item}>
                <circle cx={x} cy={y} r={cola ? 5 : 4} className={cola ? 'fill-sage stroke-ink' : 'fill-ink'} strokeWidth={cola ? 1 : 0} />
                {fly === 1 && label.text !== '' && (
                  <text x={x + label.dx} y={y + label.dy} textAnchor={label.anchor} className={`font-mono text-[10px] ${cola ? 'fill-ink' : 'fill-zinc-faded'}`}>
                    {label.text ?? item}
                  </text>
                )}
              </g>
            )
          })}
        {mapped && <circle cx={MAP.x} cy={MAP.y} r={2.5} className="fill-zinc-400" />}
      </svg>
    </div>
  )
}
