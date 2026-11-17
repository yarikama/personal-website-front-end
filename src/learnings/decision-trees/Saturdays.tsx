import type { ReactNode } from 'react'
import { usePlay } from '../../components/explain/useLoop'
import {
  FIRST_GUESS_TREE,
  nodes,
  ODD_DAYS,
  SATURDAY_BOX,
  SATURDAY_FEATURES,
  SATURDAY_SCORES,
  SATURDAY_TREES,
  SATURDAY_UNITS,
  SATURDAYS,
  SWEEP_TREES,
  type Node,
  type Tree,
} from './model'
import Plane from './Plane'
import { asked } from './layout'
import TreeDiagram, { TREE_H, TREE_W } from './TreeDiagram'

export type Scene = 'days' | 'guess' | 'sweep' | 'two' | 'full' | 'named'

const TICKS: [number[], number[]] = [
  [0, 10, 20, 30],
  [0, 10, 20, 30, 40],
]
const CLASSES: [string, string] = ['home', 'ran']
const WORDS: [string, string] = ['temperature °C', 'wind km/h']
const NAMED: [string, string] = ['feature x₁: temperature', 'feature x₂: wind']

function Pair({ children }: { children: ReactNode }) {
  return <div className="grid items-start gap-4 sm:grid-cols-[4fr_3fr]">{children}</div>
}

const describe = (tree: Tree) =>
  tree.kind === 'leaf'
    ? `one pile of ${tree.counts[1]} runs and ${tree.counts[0]} days at home`
    : `${nodes(tree).length} questions`

// The story's Saturdays: when your friend ran (sage dots) and stayed home
// (rings), by temperature and wind, and the questions that sort them. Each
// scene plays once; give it a `key` to play it again.
export default function Saturdays({ scene }: { scene: Scene }) {
  if (scene === 'sweep') return <Sweep />
  const tree =
    scene === 'days' ? SATURDAY_TREES[0] : scene === 'guess' ? FIRST_GUESS_TREE : scene === 'two' ? SATURDAY_TREES[2] : SATURDAY_TREES[3]
  const newest: Node[] =
    scene === 'named'
      ? []
      : nodes(tree).filter((n) => (scene === 'two' ? n.depth === 1 : scene === 'full' ? n.depth >= 2 : true))
  return <Drawn scene={scene} tree={tree} newest={newest} />
}

function Drawn({ scene, tree, newest }: { scene: Scene; tree: Tree; newest: Node[] }) {
  const drawn = usePlay(1, 900)
  return (
    <Pair>
      <Plane
        points={SATURDAYS}
        box={SATURDAY_BOX}
        tree={tree}
        newest={newest}
        drawn={drawn}
        ringed={scene === 'full' ? ODD_DAYS : []}
        names={scene === 'named' ? NAMED : WORDS}
        ticks={TICKS}
        label={`28 Saturdays by temperature and wind, 12 when your friend ran and 16 when she stayed home, cut by ${describe(tree)}`}
      />
      <TreeDiagram
        tree={tree}
        features={SATURDAY_FEATURES}
        units={SATURDAY_UNITS}
        classes={CLASSES}
        named={scene === 'named'}
        label={`The questions as a tree: ${describe(tree)}`}
      />
    </Pair>
  )
}

const BARS_TOP = 150
const BARS_BOTTOM = 252
const BAR_LEFT = 14
const BAR_RIGHT = TREE_W - 14
const TALLEST = Math.max(...SATURDAY_SCORES.map((s) => s.decrease))
const BEST = SATURDAY_SCORES.findIndex((s) => s.decrease === TALLEST)
const FIRST_WIND = SATURDAY_SCORES.findIndex((s) => s.feature === 1)

// Trying every question in turn: a dashed line for the one being tried, its
// two piles, and a bar for how much less mixed each leaves the days, the
// best so far in sage. Ends on the best.
function Sweep() {
  const n = SATURDAY_SCORES.length
  const played = usePlay(n + 4, 120)
  const at = Math.min(n - 1, Math.floor(played))
  const done = played >= n
  let best = 0
  for (let i = 0; i <= at; i++) if (SATURDAY_SCORES[i].decrease > SATURDAY_SCORES[best].decrease + 1e-12) best = i
  const shown = done ? BEST : at
  const trying = SWEEP_TREES[shown] as Node
  const kept = SWEEP_TREES[best] as Node
  const step = (BAR_RIGHT - BAR_LEFT) / n
  const pile = (side: 'left' | 'right') => trying[side].counts
  const q = (node: Node) => asked(SATURDAY_FEATURES[node.split.feature], node.split.threshold, SATURDAY_UNITS[node.split.feature])

  return (
    <Pair>
      <Plane
        points={SATURDAYS}
        box={SATURDAY_BOX}
        tree={kept}
        newest={[kept]}
        shade={done}
        trying={done ? undefined : trying.split}
        names={WORDS}
        ticks={TICKS}
        label={`28 Saturdays by temperature and wind; every question is tried in turn, and the best, ${q(SWEEP_TREES[BEST] as Node)}, is kept`}
      />
      <svg viewBox={`0 0 ${TREE_W} ${TREE_H}`} className="w-full" role="img" aria-label="How much less mixed each question leaves the days, one bar per question">
        <text x={TREE_W / 2} y={20} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
          {done ? 'keep the best' : 'trying'}
        </text>
        <text x={TREE_W / 2} y={44} textAnchor="middle" className={`font-mono text-[13px] ${done ? 'fill-sage-ink' : 'fill-ink'}`}>
          {q(trying)}?
        </text>
        {(['left', 'right'] as const).map((side, i) => (
          <g key={side}>
            <text x={i ? 220 : 80} y={74} textAnchor="middle" className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
              {i ? 'no' : 'yes'}
            </text>
            <text x={i ? 220 : 80} y={92} textAnchor="middle" className="fill-sage-ink font-mono text-[11px] tabular-nums">
              {pile(side)[1]} ran
            </text>
            <text x={i ? 220 : 80} y={107} textAnchor="middle" className="fill-ink font-mono text-[11px] tabular-nums">
              {pile(side)[0]} home
            </text>
          </g>
        ))}
        <text x={BAR_LEFT} y={BARS_TOP - 14} className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
          how much less mixed
        </text>
        <line x1={BAR_LEFT} x2={BAR_RIGHT} y1={BARS_BOTTOM} y2={BARS_BOTTOM} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
        {SATURDAY_SCORES.slice(0, done ? n : at + 1).map((s, i) => {
          const h = Math.max(1, (s.decrease / TALLEST) * (BARS_BOTTOM - BARS_TOP))
          return (
            <rect
              key={i}
              x={BAR_LEFT + i * step + 0.6}
              y={BARS_BOTTOM - h}
              width={Math.max(1, step - 1.2)}
              height={h}
              className={i === best ? 'fill-sage' : i === at && !done ? 'fill-ink' : 'fill-zinc-400'}
            />
          )
        })}
        <text x={BAR_LEFT} y={BARS_BOTTOM + 16} className="fill-zinc-faded font-mono text-[10px]">
          temp
        </text>
        <text x={BAR_LEFT + FIRST_WIND * step} y={BARS_BOTTOM + 16} className="fill-zinc-faded font-mono text-[10px]">
          wind
        </text>
      </svg>
    </Pair>
  )
}
