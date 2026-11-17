import { useState } from 'react'
import { Button, Controls, Readout } from '../../components/explain/figure'
import {
  bits,
  formatRows,
  joinPieces,
  linked,
  maskOf,
  SHOP,
  SHOP_DP,
  SHOP_GREEDY,
  show,
  size,
  subplans,
  type Tree,
} from './model'

const SHORT = SHOP.names.map((name) => name[0])

// Where each table sits in the join graph
const AT = [
  { x: 60, y: 46 },
  { x: 190, y: 46 },
  { x: 320, y: 46 },
  { x: 250, y: 136 },
  { x: 390, y: 136 },
]
const NODE = { w: 100, h: 44 }

const mono = 'font-mono text-[11px]'
const label = 'font-mono text-[0.875rem] uppercase tracking-widest text-zinc-faded'

const start = (): Tree[] => SHOP.rows.map((_, i) => i)
const named = (tree: Tree) => (typeof tree === 'number' ? SHOP.names[tree] : show(SHOP, tree, SHORT))

// The shop's join graph: which tables the pieces have joined, and which of
// them make up the piece picked
function Graph({ pieces, picked }: { pieces: Tree[]; picked: number | null }) {
  const pieceOf = (table: number) => pieces.findIndex((p) => (maskOf(p) >> table) & 1)
  const together = (a: number, b: number) => pieceOf(a) === pieceOf(b)
  return (
    <svg viewBox="0 0 450 166" className="w-full" role="img" aria-label="The join graph of five tables and their join conditions">
      {SHOP.joins.map((join, k) => {
        const [a, b] = [AT[join.a], AT[join.b]]
        const done = together(join.a, join.b)
        // Labels sit above a level line, and beside a slanted one, away from the middle
        const level = a.y === b.y
        const outward = (a.x + b.x) / 2 < AT[2].x ? -1 : 1
        return (
          <g key={k}>
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              className={done ? 'stroke-sage' : 'stroke-zinc-300 dark:stroke-zinc-200/25'}
              strokeWidth={done ? 3 : 1.5}
            />
            <text
              x={level ? (a.x + b.x) / 2 : (a.x + b.x) / 2 + outward * 10}
              y={level ? a.y - NODE.h / 2 - 8 : (a.y + b.y) / 2 + 4}
              textAnchor={level ? 'middle' : outward < 0 ? 'end' : 'start'}
              className={`${mono} ${done ? 'fill-sage-ink' : 'fill-zinc-faded'}`}
            >
              ÷{formatRows(join.divide)}
            </text>
          </g>
        )
      })}
      {SHOP.names.map((name, i) => {
        const piece = pieceOf(i)
        const chosen = piece === picked
        const joined = typeof pieces[piece] !== 'number'
        return (
          <g key={name}>
            <rect
              x={AT[i].x - NODE.w / 2}
              y={AT[i].y - NODE.h / 2}
              width={NODE.w}
              height={NODE.h}
              rx={10}
              className={
                chosen
                  ? 'fill-sage stroke-sage'
                  : joined
                    ? 'fill-paper stroke-sage'
                    : 'fill-paper stroke-zinc-300 dark:stroke-zinc-200/25'
              }
              strokeWidth={1.5}
            />
            <text x={AT[i].x} y={AT[i].y - 3} textAnchor="middle" className={`${mono} ${chosen ? 'fill-paper' : 'fill-ink'}`}>
              {name}
            </text>
            <text
              x={AT[i].x}
              y={AT[i].y + 13}
              textAnchor="middle"
              className={`${mono} ${chosen ? 'fill-paper' : 'fill-zinc-faded'}`}
            >
              {formatRows(SHOP.rows[i])} rows
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// Plan the shop's five-table join by hand, pair by pair, against greedy
// and against dynamic programming's best
export default function JoinLab() {
  const [pieces, setPieces] = useState<Tree[]>(start)
  const [log, setLog] = useState<Tree[]>([])
  const [picked, setPicked] = useState<number | null>(null)

  const total = log.reduce<number>((sum, join) => sum + size(SHOP, maskOf(join)), 0)
  const done = pieces.length === 1

  const pick = (i: number) => {
    if (picked === null) return setPicked(i)
    if (picked === i) return setPicked(null)
    const next = joinPieces(pieces, picked, i)
    setPieces(next)
    setLog([...log, next[next.length - 1]])
    setPicked(null)
  }
  const load = (tree: Tree | null) => {
    setPieces(tree === null ? start() : [tree])
    setLog(tree === null ? [] : subplans(tree))
    setPicked(null)
  }

  const verdict = !done
    ? picked === null
      ? 'Pick two pieces to join'
      : `Join ${named(pieces[picked])} with…`
    : total === SHOP_DP.cost
      ? 'The best plan there is'
      : `${(total / SHOP_DP.cost).toLocaleString('en-US', { maximumFractionDigits: total / SHOP_DP.cost < 10 ? 1 : 0 })} times the best`

  return (
    <div>
      <Graph pieces={pieces} picked={picked} />

      <p className={`mt-4 ${label}`}>{verdict}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {pieces.map((piece, i) => (
          <button
            key={bits(maskOf(piece)).join()}
            onClick={() => pick(i)}
            disabled={done}
            aria-pressed={picked === i}
            className={`rounded-xl border px-3 py-1.5 font-mono text-[0.875rem] transition-colors ${
              picked === i
                ? 'border-sage bg-sage/15 text-sage-ink'
                : 'border-zinc-300 dark:border-zinc-200/20 text-ink hover:border-sage disabled:hover:border-zinc-300'
            }`}
          >
            {named(piece)}
            <span className="ml-2 text-zinc-faded tabular-nums">{formatRows(size(SHOP, maskOf(piece)))}</span>
          </button>
        ))}
      </div>

      <ol className="mt-5 min-h-[7.5rem] space-y-1 font-mono text-[0.875rem]">
        {log.map((join, k) => (
          <li key={k} className="flex flex-wrap justify-between gap-x-4">
            <span className="text-ink">
              {k + 1}. {show(SHOP, join, SHORT)}
              {!linked(SHOP, join) && <span className="text-zinc-faded"> · no condition: a cross product</span>}
            </span>
            <span className="tabular-nums text-ink">{formatRows(size(SHOP, maskOf(join)))} rows</span>
          </li>
        ))}
        {log.length === 0 && <li className="text-zinc-faded">No joins yet.</li>}
      </ol>

      <div className="mt-5 flex flex-wrap gap-x-10 gap-y-4">
        <Readout label={done ? 'Your plan' : 'Rows so far'} value={formatRows(total)} accent={done && total === SHOP_DP.cost} />
        <Readout label="Greedy" value={formatRows(SHOP_GREEDY.cost)} />
        <Readout label="Best, by DP" value={formatRows(SHOP_DP.cost)} accent />
      </div>

      <Controls>
        <Button onClick={() => load(SHOP_GREEDY.best)}>Greedy’s plan</Button>
        <Button onClick={() => load(SHOP_DP.best)}>Best plan</Button>
        <Button onClick={() => load(null)}>Start over</Button>
      </Controls>
    </div>
  )
}
