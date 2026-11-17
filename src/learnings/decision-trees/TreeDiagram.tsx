import { asked, place } from './layout'
import type { Tree } from './model'

export const TREE_W = 300
export const TREE_H = 300

// A tree drawn as a tree: each question in a pill, each leaf as the pile it
// holds. With `dots`, a bushy tree as dots, only its first question named.
// `named` labels the parts: node, leaf.
export default function TreeDiagram({
  tree,
  features,
  units = ['', ''],
  classes,
  dots = false,
  named = false,
  label,
}: {
  tree: Tree
  features: readonly string[]
  units?: readonly string[]
  classes: [string, string]
  dots?: boolean
  named?: boolean
  label: string
}) {
  const { placed, joints } = place(tree, 14, TREE_W - 14, 34, dots ? TREE_H - 20 : TREE_H - 62, dots ? 60 : 82)
  const root = placed.find((p) => p.tree.depth === 0)!

  return (
    <svg viewBox={`0 0 ${TREE_W} ${TREE_H}`} className="w-full" role="img" aria-label={label}>
      {joints.map(({ from, to, yes }, i) => (
        <g key={i}>
          <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} className="stroke-zinc-400" strokeWidth={dots ? 1 : 1.5} />
          {!dots && from.tree.depth === 0 && (
            <text
              x={(from.x + to.x) / 2 + (yes ? -8 : 8)}
              y={(from.y + to.y) / 2}
              textAnchor={yes ? 'end' : 'start'}
              className="fill-zinc-faded font-mono text-[10px]"
            >
              {yes ? 'yes' : 'no'}
            </text>
          )}
        </g>
      ))}
      {placed.map(({ tree: at, x, y }, i) => {
        if (at.kind === 'node') {
          if (dots) return <circle key={i} cx={x} cy={y} r={2.5} className="fill-ink" />
          const text = `${asked(features[at.split.feature], at.split.threshold, units[at.split.feature])}?`
          const width = text.length * 6.2 + 12
          return (
            <g key={i}>
              <rect x={x - width / 2} y={y - 11} width={width} height={22} rx={11} className="fill-paper stroke-ink" strokeWidth={1.2} />
              <text x={x} y={y + 3.5} textAnchor="middle" className="fill-ink font-mono text-[10px]">
                {text}
              </text>
            </g>
          )
        }
        const kind = at.label
        const marker =
          kind === 1 ? (
            <circle cx={x} cy={y} r={dots ? 3.5 : 6} className="fill-sage" />
          ) : (
            <circle cx={x} cy={y} r={dots ? 3 : 5.4} className="fill-paper stroke-ink" strokeWidth={1.4} />
          )
        if (dots) return <g key={i}>{marker}</g>
        // A pure pile needs only its one count
        const pure = at.counts[0] === 0 || at.counts[1] === 0
        if (pure)
          return (
            <g key={i}>
              {marker}
              <text x={x} y={y + 22} textAnchor="middle" className={`${kind === 1 ? 'fill-sage-ink' : 'fill-ink'} font-mono text-[10px]`}>
                {at.counts[kind]} {classes[kind]}
              </text>
            </g>
          )
        return (
          <g key={i}>
            {marker}
            <text x={x} y={y + 22} textAnchor="middle" className="fill-sage-ink font-mono text-[10px]">
              {at.counts[1]} {classes[1]}
            </text>
            <text x={x} y={y + 35} textAnchor="middle" className="fill-ink font-mono text-[10px]">
              {at.counts[0]} {classes[0]}
            </text>
          </g>
        )
      })}
      {dots && tree.kind === 'node' && (
        <text x={root.x} y={root.y - 12} textAnchor="middle" className="fill-ink font-mono text-[10px]">
          {asked(features[tree.split.feature], tree.split.threshold, units[tree.split.feature])}?
        </text>
      )}
      {named && tree.kind === 'node' && (
        <>
          <text x={4} y={14} className="fill-sage-ink font-mono text-[11px] uppercase tracking-widest">
            pills: nodes
          </text>
          <text x={TREE_W - 4} y={14} textAnchor="end" className="fill-sage-ink font-mono text-[11px] uppercase tracking-widest">
            dots: leaves
          </text>
        </>
      )}
    </svg>
  )
}
