import { useState } from 'react'
import { Choice, Controls, Readout, Slider } from '../../components/explain/figure'
import { usePlay } from '../../components/explain/useLoop'
import { height, LAB_KEYS, LAB_N, LAB_ORDER, LAB_STAGES, lookup, ORDERS, range, type InsertReport, type Order } from './model'
import { CELL, layOut, MAX_HEIGHT, NODE_H, WIDTH } from './treeLayout'

// Real milliseconds between inserts while it plays itself
const PACE = 1100

const LOWEST = 10
const HIGHEST = 99

// What the last insert did, in a line
function said(report: InsertReport | null): string {
  if (!report) return `Empty · room for ${LAB_N} keys a page`
  if (report.splits.length === 0) return `Put in ${report.key} · the leaf had room`
  const parts = report.splits.map((split) =>
    split.kind === 'leaf' ? `leaf split, ${split.up} copied up` : `parent split, ${split.up} pushed up`
  )
  return `Put in ${report.key} · ${parts.join(' · ')}${report.grew ? ' · new root' : ''}`
}

// A small B+-tree, room for 3 keys a page, growing one key at a time: it
// plays itself, then the reader can scrub through the inserts, change the
// order the keys arrive in, and search it.
export default function TreeLab() {
  const [order, setOrder] = useState<Order>('shuffled')
  return <Run key={order} order={order} onOrder={setOrder} />
}

function Run({ order, onOrder }: { order: Order; onOrder: (order: Order) => void }) {
  const stages = LAB_STAGES[order]
  const played = usePlay(LAB_KEYS, PACE)
  const [chosen, setChosen] = useState<number | null>(null)
  const [focus, setFocus] = useState<'insert' | 'search'>('insert')
  const [lo, setLo] = useState(40)
  const [hi, setHi] = useState(55)

  const count = chosen ?? Math.floor(played)
  const { tree, report, splits } = stages[count]
  const drawing = layOut(tree)
  const levels = height(tree)

  // What to light up: the way down to the key just put in, or the search
  const searching = focus === 'search'
  const scan = range(tree, lo, hi)
  const path = new Set(
    searching ? [...scan.down, ...scan.leaves] : report?.added ? lookup(tree, report.key).path : []
  )
  const lit = (key: number) => (searching ? key >= lo && key <= hi : key === report?.key)
  const made = new Set(
    !searching && report ? [...report.splits.map((split) => split.right), ...(report.grew ? [tree.root.id] : [])] : []
  )
  const pages = searching ? scan.pages : report ? levels : 0
  const status = searching
    ? lo === hi
      ? `Look up ${lo} · ${scan.keys.length ? 'found' : 'not there'}`
      : `Keys ${lo} to ${hi} · ${scan.keys.length} found`
    : said(report)

  return (
    <div>
      <p className="min-h-[1.5rem] font-mono text-[0.875rem] uppercase tracking-widest text-sage-ink">{status}</p>
      <svg
        viewBox={`0 0 ${WIDTH} ${MAX_HEIGHT}`}
        className="mt-3 w-full"
        role="img"
        aria-label={`A B+-tree of ${count} keys, ${levels} levels tall, with room for ${LAB_N} keys a page`}
      >
        {drawing.edges.map((edge) => {
          const on = path.has(edge.parent) && path.has(edge.child)
          return (
            <line
              key={`${edge.parent}-${edge.child}`}
              x1={edge.x1}
              y1={edge.y1}
              x2={edge.x2}
              y2={edge.y2}
              className={on ? 'stroke-sage' : 'stroke-zinc-400'}
              strokeWidth={on ? 2.2 : 1}
            />
          )
        })}

        {/* The leaves' chain, left to right */}
        {drawing.links.map((link) => (
          <g key={link.from} className="fill-zinc-400 stroke-zinc-400">
            <line x1={link.x1} y1={link.y} x2={link.x2 - 4} y2={link.y} strokeWidth={1.2} />
            <path d={`M${link.x2} ${link.y} l-5 -3.5 v7 z`} stroke="none" />
          </g>
        ))}

        {drawing.boxes.map(({ node, x, y, width }) => {
          const onPath = path.has(node.id)
          return (
            <g key={node.id} transform={`translate(${x},${y})`}>
              <rect
                width={width}
                height={NODE_H}
                rx={5}
                className={`${made.has(node.id) ? 'fill-sage/20' : 'fill-paper'} ${onPath ? 'stroke-sage' : 'stroke-ink'}`}
                strokeWidth={onPath ? 2.2 : 1}
              />
              {Array.from({ length: LAB_N }, (_, i) => {
                const key = node.keys[i]
                const on = key !== undefined && lit(key) && !node.children
                return (
                  <g key={i}>
                    {i > 0 && (
                      <line
                        x1={i * CELL}
                        y1={4}
                        x2={i * CELL}
                        y2={NODE_H - 4}
                        className="stroke-zinc-300 dark:stroke-zinc-200/25"
                      />
                    )}
                    {on && <rect x={i * CELL + 3} y={3} width={CELL - 6} height={NODE_H - 6} rx={3} className="fill-sage" />}
                    {key !== undefined && (
                      <text
                        x={i * CELL + CELL / 2}
                        y={NODE_H / 2 + 4.5}
                        textAnchor="middle"
                        className={`font-mono text-[13px] ${on ? 'fill-ink dark:fill-paper' : node.children ? 'fill-ink/80' : 'fill-ink'}`}
                      >
                        {key}
                      </text>
                    )}
                  </g>
                )
              })}
            </g>
          )
        })}
      </svg>

      <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
        <Readout label="Levels" value={levels} />
        <Readout label="Keys" value={count} />
        <Readout label="Splits so far" value={splits} />
        <Readout label="Pages read" value={pages} accent />
      </div>

      <Controls>
        <Slider
          label="Keys put in"
          value={count}
          min={0}
          max={LAB_KEYS}
          onChange={(value) => {
            setChosen(value)
            setFocus('insert')
          }}
          format={(value) => (value === 0 ? 'none' : `${value} · last ${LAB_ORDER[order][value - 1]}`)}
        />
        <Choice label="Keys arrive" options={ORDERS} value={order} onChange={onOrder} />
      </Controls>
      <Controls>
        <Slider
          label="Search from"
          value={lo}
          min={LOWEST}
          max={HIGHEST}
          onChange={(value) => {
            setLo(value)
            setHi(Math.max(hi, value))
            setFocus('search')
          }}
        />
        <Slider
          label="to"
          value={hi}
          min={LOWEST}
          max={HIGHEST}
          onChange={(value) => {
            setHi(value)
            setLo(Math.min(lo, value))
            setFocus('search')
          }}
        />
      </Controls>
    </div>
  )
}
