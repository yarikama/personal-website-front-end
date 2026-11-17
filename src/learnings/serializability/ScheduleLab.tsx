import { useId, useState, type KeyboardEvent } from 'react'
import { seeded } from '../../components/explain/random'
import { Button, Choice, Controls } from '../../components/explain/figure'
import {
  BANK_START,
  canMove,
  conflicts,
  isSchedule,
  itemsOf,
  move,
  permutations,
  PRESET_NAMES,
  PRESETS,
  randomSchedule,
  run,
  sameState,
  serial,
  stepOf,
  verdict,
  type Edge,
  type Op,
  type Transaction,
} from './model'

const TIME_W = 26
const LANE_W = 110
const CHIP = { w: 74, h: 24 }
const ROW = 30
const HEADER = 28

const laneX = (tx: number) => TIME_W + tx * LANE_W
const chipX = (tx: number) => laneX(tx) + (LANE_W - CHIP.w) / 2
const rowY = (i: number) => HEADER + i * ROW + (ROW - CHIP.h) / 2
const label = 'fill-zinc-faded font-mono text-[10px] uppercase tracking-widest'
const names = (order: readonly number[]) => order.map((t) => `T${t + 1}`).join(', ')
const isLooped = (looped: readonly Edge[], from: number, to: number) => looped.some((e) => e.from === from && e.to === to)

// The schedule, top to bottom in time, a column per transaction. Each line
// joins a conflicting pair, with its arrow on the later step: sage, or ink
// when its arrow in the graph is on a cycle.
function Timeline({
  txs,
  ops,
  values,
  looped,
  selected,
  onSelect,
  onMove,
}: {
  txs: readonly Transaction[]
  ops: readonly Op[]
  values: readonly number[]
  looped: readonly Edge[]
  selected: number | null
  onSelect: (at: number | null) => void
  onMove: (at: number, by: -1 | 1) => void
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const width = TIME_W + txs.length * LANE_W
  const height = HEADER + ops.length * ROW + 4
  const pairs = conflicts(txs, ops)
  const order = ops.map((op, i) => ({ op, i })).sort((a, b) => a.op.tx - b.op.tx || a.op.step - b.op.step)

  const keys = (at: number) => (event: KeyboardEvent) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      onMove(at, event.key === 'ArrowUp' ? -1 : 1)
      event.preventDefault()
    }
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxWidth: width }} aria-label="The schedule, one column per transaction">
      <defs>
        {(['sage', 'ink'] as const).map((tone) => (
          <marker key={tone} id={`${id}-${tone}`} viewBox="0 0 10 10" refX={9} refY={5} markerWidth={6} markerHeight={6} orient="auto-start-reverse">
            <path d="M0,1 L10,5 L0,9 z" className={tone === 'sage' ? 'fill-sage' : 'fill-ink'} />
          </marker>
        ))}
      </defs>

      {txs.map((tx, t) => (
        <text key={t} x={laneX(t) + LANE_W / 2} y={16} textAnchor="middle" className="fill-ink font-mono text-[11px]">
          {tx.name} {tx.short}
        </text>
      ))}
      {ops.map((_, i) => (
        <text key={i} x={TIME_W - 8} y={rowY(i) + CHIP.h / 2 + 4} textAnchor="end" className={label}>
          {i + 1}
        </text>
      ))}

      {pairs.map(({ first, second }) => {
        const a = ops[first]
        const b = ops[second]
        const right = a.tx < b.tx
        const ink = isLooped(looped, a.tx, b.tx)
        const touches = selected === first || selected === second
        return (
          <line
            key={`${first}-${second}`}
            x1={right ? chipX(a.tx) + CHIP.w : chipX(a.tx)}
            y1={rowY(first) + CHIP.h / 2}
            x2={right ? chipX(b.tx) - 1 : chipX(b.tx) + CHIP.w + 1}
            y2={rowY(second) + CHIP.h / 2}
            className={ink ? 'stroke-ink' : 'stroke-sage'}
            strokeWidth={touches ? 2.2 : 1.2}
            opacity={selected === null || touches ? 1 : 0.3}
            markerEnd={`url(#${id}-${ink ? 'ink' : 'sage'})`}
          />
        )
      })}

      {/* In a fixed order, by transaction, so a step keeps focus as it moves */}
      {order.map(({ op, i }) => {
        const step = stepOf(txs, op)
        const chosen = selected === i
        return (
          <g
            key={`${op.tx}-${op.step}`}
            role="button"
            tabIndex={0}
            aria-pressed={chosen}
            aria-label={`Step ${i + 1}: ${txs[op.tx].name} ${step.kind === 'r' ? 'reads' : 'writes'} ${step.item}, ${values[i]}. Arrow keys move it.`}
            onClick={() => onSelect(i)}
            onFocus={() => onSelect(i)}
            onKeyDown={keys(i)}
            className="cursor-pointer outline-none"
          >
            <rect
              x={chipX(op.tx)}
              y={rowY(i)}
              width={CHIP.w}
              height={CHIP.h}
              rx={7}
              className={chosen ? 'fill-sage/15 stroke-sage' : `fill-paper ${step.kind === 'w' ? 'stroke-ink' : 'stroke-zinc-400'}`}
              strokeWidth={chosen ? 2 : step.kind === 'w' ? 1.5 : 1.1}
            />
            <text
              x={chipX(op.tx) + CHIP.w / 2}
              y={rowY(i) + CHIP.h / 2 + 4}
              textAnchor="middle"
              className={`${chosen ? 'fill-sage-ink' : 'fill-ink'} font-mono text-[11px]`}
            >
              {step.kind} {step.item}: {values[i]}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

const NODES: Record<number, { x: number; y: number }[]> = {
  2: [
    { x: 44, y: 76 },
    { x: 176, y: 76 },
  ],
  3: [
    { x: 44, y: 40 },
    { x: 176, y: 40 },
    { x: 110, y: 140 },
  ],
}
const R = 20

// The precedence graph: a node per transaction, an arrow Ti → Tj labelled
// with the items whose conflicts put it there
function Graph({ txs, edges, looped }: { txs: readonly Transaction[]; edges: readonly Edge[]; looped: readonly Edge[] }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const at = NODES[txs.length]
  const middle = { x: at.reduce((s, p) => s + p.x, 0) / at.length, y: at.reduce((s, p) => s + p.y, 0) / at.length }
  return (
    <svg viewBox="0 0 220 176" className="mx-auto w-full max-w-[15rem]" aria-label={`Precedence graph: ${edges.length ? edges.map((e) => `T${e.from + 1} to T${e.to + 1} on ${e.items.join(' and ')}`).join('; ') : 'no arrows'}`}>
      <defs>
        {(['sage', 'ink'] as const).map((tone) => (
          <marker key={tone} id={`${id}-${tone}`} viewBox="0 0 10 10" refX={9} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
            <path d="M0,1 L10,5 L0,9 z" className={tone === 'sage' ? 'fill-sage' : 'fill-ink'} />
          </marker>
        ))}
      </defs>
      {edges.map((edge) => {
        const p = at[edge.from]
        const q = at[edge.to]
        const both = edges.some((e) => e.from === edge.to && e.to === edge.from)
        const dx = q.x - p.x
        const dy = q.y - p.y
        const length = Math.hypot(dx, dy)
        // Bend a pair of opposite arrows apart; each bends to its own left
        const bend = both ? 26 : 0
        const c = { x: (p.x + q.x) / 2 + (dy / length) * bend, y: (p.y + q.y) / 2 - (dx / length) * bend }
        const unit = (ax: number, ay: number) => {
          const l = Math.hypot(ax, ay)
          return { x: ax / l, y: ay / l }
        }
        const s = unit(c.x - p.x, c.y - p.y)
        const e = unit(q.x - c.x, q.y - c.y)
        const start = { x: p.x + s.x * (R + 2), y: p.y + s.y * (R + 2) }
        const end = { x: q.x - e.x * (R + 3), y: q.y - e.y * (R + 3) }
        const mid = { x: 0.25 * p.x + 0.5 * c.x + 0.25 * q.x, y: 0.25 * p.y + 0.5 * c.y + 0.25 * q.y }
        // The label sits on the side away from the middle of the graph
        const away = { x: mid.x - middle.x, y: mid.y - middle.y }
        const out = Math.hypot(away.x, away.y) < 1 ? { x: 0, y: -1 } : unit(away.x, away.y)
        const ink = isLooped(looped, edge.from, edge.to)
        return (
          <g key={`${edge.from}-${edge.to}`}>
            <path
              d={`M${start.x},${start.y} Q${c.x},${c.y} ${end.x},${end.y}`}
              className={`fill-none ${ink ? 'stroke-ink' : 'stroke-sage'}`}
              strokeWidth={1.8}
              markerEnd={`url(#${id}-${ink ? 'ink' : 'sage'})`}
            />
            <text
              x={mid.x + out.x * 14}
              y={mid.y + out.y * 12 + 4}
              textAnchor="middle"
              className={`${ink ? 'fill-ink' : 'fill-sage-ink'} font-mono text-[11px]`}
            >
              {edge.items.join(', ')}
            </text>
          </g>
        )
      })}
      {txs.map((tx, t) => (
        <g key={t}>
          <circle cx={at[t].x} cy={at[t].y} r={R} className="fill-paper stroke-zinc-400" strokeWidth={1.2} />
          <text x={at[t].x} y={at[t].y + 4} textAnchor="middle" className="fill-ink font-mono text-[12px]">
            {tx.name}
          </text>
        </g>
      ))}
    </svg>
  )
}

// A schedule of the bank's transactions to rearrange: its conflicts, its
// precedence graph and verdict, and what it leaves in the accounts beside
// what every serial order leaves
export default function ScheduleLab({ first = 'Mixed' }: { first?: string }) {
  const [lab, setLab] = useState({
    preset: first,
    ops: PRESETS.find((p) => p.name === first)!.ops,
    selected: null as number | null,
  })
  const [shuffles, setShuffles] = useState(0)
  const preset = PRESETS.find((p) => p.name === lab.preset)!
  const { txs } = preset
  // A schedule left from another preset would not fit these transactions
  const ops = isSchedule(txs, lab.ops) ? lab.ops : preset.ops
  const selected = lab.selected !== null && lab.selected < ops.length ? lab.selected : null

  const v = verdict(txs, ops)
  const items = itemsOf(txs)
  const ran = run(txs, ops, BANK_START)
  const orders = permutations(txs.length).map((order) => ({
    order,
    final: run(txs, serial(txs, order), BANK_START).final,
  }))

  const moveStep = (at: number, by: -1 | 1) => {
    if (!canMove(ops, at, by)) return
    setLab({ ...lab, ops: move(ops, at, by), selected: at + by })
  }
  const shuffle = () => {
    setLab({ ...lab, ops: randomSchedule(txs, seeded(shuffles + 1)), selected: null })
    setShuffles(shuffles + 1)
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-center gap-x-10 gap-y-6">
        <Timeline
          txs={txs}
          ops={ops}
          values={ran.values}
          looped={v.looped}
          selected={selected}
          onSelect={(at) => setLab({ ...lab, ops, selected: at })}
          onMove={moveStep}
        />
        <div className="min-w-[15rem] flex-1">
          <p className="text-center font-mono text-[0.875rem] uppercase tracking-widest text-zinc-faded">Precedence graph</p>
          <Graph txs={txs} edges={v.edges} looped={v.looped} />
          <p className={`mt-2 text-center font-mono text-[0.875rem] ${v.order ? 'text-sage-ink' : 'text-ink'}`} aria-live="polite">
            {v.order
              ? `No cycle: same as ${names(v.order)}`
              : `Cycle ${v.cycle!.map((t) => `T${t + 1}`).join(' → ')}: no serial order fits`}
          </p>
          <table className="mx-auto mt-5 font-mono text-[0.875rem] tabular-nums">
            <thead>
              <tr className="text-zinc-faded uppercase tracking-widest">
                <th className="pr-4 text-left font-normal">Run</th>
                {items.map((item) => (
                  <th key={item} className="px-2 text-right font-normal">
                    {item}
                  </th>
                ))}
                <th className="pl-3 font-normal" />
              </tr>
            </thead>
            <tbody>
              <tr className="text-ink">
                <td className="pr-4 pt-1">This schedule</td>
                {items.map((item) => (
                  <td key={item} className="px-2 pt-1 text-right">
                    {ran.final[item]}
                  </td>
                ))}
                <td />
              </tr>
              {orders.map(({ order, final }) => {
                const same = sameState(final, ran.final)
                return (
                  <tr key={order.join()} className={same ? 'text-sage-ink' : 'text-zinc-faded'}>
                    <td className="pr-4 pt-1">{names(order)}</td>
                    {items.map((item) => (
                      <td key={item} className="px-2 pt-1 text-right">
                        {final[item]}
                      </td>
                    ))}
                    <td className="pl-3 pt-1">{same ? 'same' : ''}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      <Controls>
        <Choice
          label="Schedule"
          options={PRESET_NAMES}
          value={lab.preset}
          onChange={(name) => setLab({ preset: name, ops: PRESETS.find((p) => p.name === name)!.ops, selected: null })}
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => selected !== null && moveStep(selected, -1)} disabled={selected === null || !canMove(ops, selected, -1)}>
            Earlier
          </Button>
          <Button onClick={() => selected !== null && moveStep(selected, 1)} disabled={selected === null || !canMove(ops, selected, 1)}>
            Later
          </Button>
          <Button onClick={shuffle}>Shuffle</Button>
        </div>
      </Controls>
    </div>
  )
}
