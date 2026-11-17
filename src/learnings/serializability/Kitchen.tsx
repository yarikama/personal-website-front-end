import { usePlay } from '../../components/explain/useLoop'
import { conflicts, run, stepOf, type Op, type State, type Transaction } from './model'

// Story words or database words for the same drawing: the reveal relabels it
const CARD_NAMES: Record<string, string> = { S: 'Salt', P: 'Pepper' }
const WORDS = {
  kitchen: {
    lane: (txs: readonly Transaction[], tx: number) => txs[tx].name,
    card: (item: string) => CARD_NAMES[item] ?? item,
    does: (kind: 'r' | 'w') => (kind === 'r' ? 'reads' : 'writes'),
    detail: (item: string, v: number) => `${(CARD_NAMES[item] ?? item).toLowerCase()}: ${v}`,
    value: (v: number) => `${v} tsp`,
  },
  db: {
    lane: (_: readonly Transaction[], tx: number) => `T${tx + 1}`,
    card: (item: string) => `Item ${item}`,
    does: (kind: 'r' | 'w') => (kind === 'r' ? 'read' : 'write'),
    detail: (item: string, v: number) => `${item}: ${v}`,
    value: (v: number) => String(v),
  },
}

// Narrow enough that its labels stay readable on a phone
const WIDTH = 400
const HEIGHT = 196
const CHIP = { x: 0, step: 77, w: 72, h: 38 }
const LANE_Y = [22, 94]
const CARD = { x: 312, w: 88 }
const AXIS_Y = 152

const chipX = (k: number) => CHIP.x + k * CHIP.step
const clamp = (t: number) => Math.max(0, Math.min(1, t))
const label = 'fill-zinc-faded font-mono text-[11px] uppercase tracking-widest'

// Two cooks (or transactions), one lane each, working on one or two recipe
// cards (items). Each step of `ops` appears in its lane in time order, left
// to right, and a write changes its card. Steps before `from` are already
// there; those up to `to` play in. `links` joins each pair that conflicts,
// with an arrow to the later step. Give it a `key` to play again.
export default function Kitchen({
  txs,
  ops,
  start,
  items,
  from,
  to,
  words,
  links = false,
  note,
  pace = 900,
}: {
  txs: readonly Transaction[]
  ops: readonly Op[]
  start: Readonly<State>
  items: readonly string[]
  from: number
  to: number
  words: keyof typeof WORDS
  links?: boolean
  note?: string
  pace?: number
}) {
  const say = WORDS[words]
  const played = usePlay(to - from, pace)
  const finished = played >= to - from
  const amount = (k: number) => (k < from ? 1 : k >= to ? 0 : clamp((from + played - k) * 2))
  const result = run(txs, ops, start)

  // The cards as of the last step that has fully appeared
  let done = -1
  for (let k = 0; k < to; k++) if (amount(k) >= 1) done = k
  const cards: Readonly<State> = done >= 0 ? result.after[done] : start
  const current = finished ? null : Math.min(to - 1, from + Math.floor(played))
  const writing = current !== null && stepOf(txs, ops[current]).kind === 'w' ? stepOf(txs, ops[current]).item : null

  const cardH = items.length === 1 ? 64 : 50
  const cardY = (i: number) => (items.length === 1 ? 45 : 14 + i * 72)
  const center = (k: number) => ({ x: chipX(k) + CHIP.w / 2, top: LANE_Y[ops[k].tx], bottom: LANE_Y[ops[k].tx] + CHIP.h })

  const summary = items.map((item) => `${say.card(item)} ${say.value(cards[item])}`).join(', ')

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      role="img"
      aria-label={`${txs.map((_, t) => say.lane(txs, t)).join(' and ')} each add one to a card. In order: ${ops
        .slice(0, to)
        .map((op, k) => `${say.lane(txs, op.tx)} ${say.does(stepOf(txs, op).kind)} ${say.detail(stepOf(txs, op).item, result.values[k])}`)
        .join('; ')}. Now: ${summary}.`}
    >
      <defs>
        <marker id="kitchen-arrow" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
          <path d="M0,1 L10,5 L0,9 z" className="fill-sage" />
        </marker>
      </defs>

      {txs.map((_, t) => (
        <text key={t} x={0} y={LANE_Y[t] - 7} className={label}>
          {say.lane(txs, t)}
        </text>
      ))}

      {/* Time runs left to right */}
      <line x1={CHIP.x} y1={AXIS_Y} x2={chipX(3) + CHIP.w} y2={AXIS_Y} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
      <path d={`M${chipX(3) + CHIP.w},${AXIS_Y} l-7,-4 l0,8 z`} className="fill-zinc-400" />
      <text x={CHIP.x} y={AXIS_Y + 16} className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
        time
      </text>

      {/* Conflicting pairs, under the steps */}
      {links &&
        conflicts(txs, ops).map(({ first, second }) => {
          const a = center(first)
          const b = center(second)
          const down = ops[first].tx < ops[second].tx
          return (
            <line
              key={`${first}-${second}`}
              x1={a.x}
              y1={down ? a.bottom : a.top}
              x2={b.x}
              y2={down ? b.top - 2 : b.bottom + 2}
              className="stroke-sage"
              strokeWidth={1.6}
              markerEnd="url(#kitchen-arrow)"
            />
          )
        })}

      {ops.map((op, k) => {
        const shown = amount(k)
        if (shown <= 0) return null
        const step = stepOf(txs, op)
        const y = LANE_Y[op.tx]
        return (
          <g key={k} opacity={shown}>
            <rect
              x={chipX(k)}
              y={y}
              width={CHIP.w}
              height={CHIP.h}
              rx={8}
              className={`fill-paper ${step.kind === 'w' ? 'stroke-ink' : 'stroke-zinc-400'}`}
              strokeWidth={step.kind === 'w' ? 1.6 : 1.2}
            />
            <text x={chipX(k) + CHIP.w / 2} y={y + 16} textAnchor="middle" className="fill-ink font-mono text-[11px]">
              {say.does(step.kind)}
            </text>
            <text x={chipX(k) + CHIP.w / 2} y={y + 30} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px]">
              {say.detail(step.item, result.values[k])}
            </text>
          </g>
        )
      })}

      {/* The cards */}
      {items.map((item, i) => (
        <g key={item}>
          <rect
            x={CARD.x}
            y={cardY(i)}
            width={CARD.w}
            height={cardH}
            rx={8}
            className={writing === item ? 'fill-sage/15 stroke-sage' : 'fill-paper stroke-zinc-400'}
            strokeWidth={writing === item ? 2 : 1.2}
          />
          <text x={CARD.x + CARD.w / 2} y={cardY(i) + 17} textAnchor="middle" className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
            {say.card(item)}
          </text>
          <text x={CARD.x + CARD.w / 2} y={cardY(i) + cardH - (items.length === 1 ? 18 : 11)} textAnchor="middle" className="fill-ink font-mono text-[14px]">
            {say.value(cards[item])}
          </text>
        </g>
      ))}

      {note && finished && (
        <text x={WIDTH} y={HEIGHT - 6} textAnchor="end" className="fill-ink font-mono text-[11px] uppercase tracking-widest">
          {note}
        </text>
      )}
    </svg>
  )
}
