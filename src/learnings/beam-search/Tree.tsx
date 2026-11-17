import { usePlay } from '../../components/explain/useLoop'
import {
  beam,
  best,
  END,
  greedy,
  perWord,
  samePath,
  sentences,
  three,
  two,
  type Choice,
  type Hypothesis,
  type Scoring,
  type Tree as TreeData,
} from './model'

const WIDTH = 480
const LEFT = 14
const TOP = 42
const ROW = 38
// Room on the right for each sentence's chance
const SCORE = 60
// On a phone the labels are drawn larger to stay readable (useReadableText),
// about 9.2 units a character, so words and columns are spaced for that
const PHONE_CHAR = 9.2

// What the figure shows
export interface Show {
  // Tap the likeliest word each time, one word after another
  greedy?: boolean
  // Run beam search with this width, one step after another: score every
  // extension, then keep the k likeliest
  width?: number
  // Each whole sentence's chance at the right: none, only the one the
  // decoder wrote, or every sentence
  chances?: 'none' | 'found' | 'all'
  // How whole sentences are compared
  scoring?: Scoring
  // Mark the likeliest sentence of all
  best?: boolean
  // The reveal: steps and hypotheses named
  named?: boolean
  // Ms for each half step of an animation
  pace?: number
}

type State = 'idle' | 'scored' | 'kept' | 'dropped'

interface Node {
  key: string
  word: string
  p: number
  depth: number
  y: number
  path: number[]
  parent: string
  leaf: boolean
}

const keyOf = (path: number[]) => path.join('.')

// 0.6, 0.55: as few places as the chance needs
const chanceLabel = (p: number) => p.toFixed(Number.isInteger(Math.round(p * 100) / 10) ? 1 : 2)

// Every node of the tree, with its row: leaves one to a row, top to bottom,
// and each fork halfway between its first and last leaf
function layout(tree: TreeData): { nodes: Node[]; rows: number; depth: number } {
  const nodes: Node[] = []
  let row = 0
  let deepest = 0
  const place = (choices: Choice[], path: number[], depth: number): number[] =>
    choices.map((c, i) => {
      const at = [...path, i]
      deepest = Math.max(deepest, depth)
      let y: number
      if (c.next.length === 0) y = TOP + row++ * ROW
      else {
        const ys = place(c.next, at, depth + 1)
        y = (ys[0] + ys[ys.length - 1]) / 2
      }
      nodes.push({ key: keyOf(at), word: c.word, p: c.p, depth, y, path: at, parent: path.length ? keyOf(path) : '', leaf: c.next.length === 0 })
      return y
    })
  place(tree.first, [], 1)
  return { nodes, rows: row, depth: deepest }
}

// A tree of next-word choices: every sentence a small model can write, with
// its chance for each next word. A decoder walks it from the left: greedily,
// or keeping a beam of the k likeliest partial sentences. Plays as soon as it
// is shown; with reduced motion it shows the end.
export default function Tree({ tree, show, label }: { tree: TreeData; show: Show; label?: string }) {
  const { nodes, rows, depth } = layout(tree)
  const lastWord = Math.max(...nodes.filter((n) => n.leaf).map((n) => n.word.length))
  const columnWidth = (WIDTH - LEFT - SCORE - lastWord * PHONE_CHAR - 4) / depth
  const x = (d: number) => LEFT + d * columnWidth
  const rootY = (Math.min(...nodes.filter((n) => n.depth === 1).map((n) => n.y)) + Math.max(...nodes.filter((n) => n.depth === 1).map((n) => n.y))) / 2
  const height = TOP + (rows - 1) * ROW + 16
  const scoring = show.scoring ?? 'total'

  const run = show.width ? beam(tree, show.width, scoring) : show.greedy ? greedy(tree) : null
  // The greedy walk plays a word a step; beam search two half steps a step
  const span = run ? (show.width ? run.steps.length * 2 : run.steps.length) : 0
  const played = usePlay(span, show.pace ?? 700)
  const done = played >= span

  const state = new Map<string, State>()
  if (run) {
    run.steps.forEach((step, s) => {
      // Scored, then pruned: half a step later for beam search, at once for greedy
      const scoredAt = show.width ? 2 * s : s
      const prunedAt = show.width ? 2 * s + 1 : s + 0.4
      if (played < scoredAt) return
      for (const h of step.candidates) {
        const kept = step.kept.some((k) => samePath(k, h))
        state.set(keyOf(h.path), played >= prunedAt ? (kept ? 'kept' : 'dropped') : 'scored')
      }
    })
  }
  // A greedy walk only shows the words it took
  if (show.greedy && !show.width) for (const [k, v] of state) if (v === 'dropped') state.set(k, 'idle')

  const all = sentences(tree)
  const top = show.best ? best(tree, scoring) : null
  const found = run && done ? run.result : null
  const shownChance = (h: Hypothesis) =>
    show.chances === 'all' || (show.chances === 'found' && found && samePath(found, h))
  const value = (h: Hypothesis) => (scoring === 'total' ? three(h.chance) : two(perWord(h)))
  const leafY = new Map(nodes.filter((n) => n.leaf).map((n) => [n.key, n.y]))

  const textWidth = (word: string) => word.length * PHONE_CHAR
  const parentY = (n: Node) => (n.parent ? nodes.find((m) => m.key === n.parent)!.y : rootY)
  // A chance sits on the outside of its curve: above a branch that rises,
  // below one that falls
  const below = (n: Node) => n.y > parentY(n)
  const edge = (n: Node) => {
    const parent = n.parent ? nodes.find((m) => m.key === n.parent)! : null
    const x0 = parent ? x(parent.depth) + textWidth(parent.word) + 5 : x(0) + 6
    const y0 = parent ? parent.y : rootY
    const x1 = x(n.depth) - 5
    const mid = (x0 + x1) / 2
    return `M ${x0} ${y0 - 4} C ${mid} ${y0 - 4}, ${mid} ${n.y - 4}, ${x1} ${n.y - 4}`
  }

  return (
    <svg viewBox={`0 0 ${WIDTH} ${height}`} className="mx-auto w-full max-w-[34rem]" role="img" aria-label={label ?? `A tree of next-word choices for “${tree.context}”`}>
      {/* The steps, named in the reveal */}
      {show.named &&
        Array.from({ length: depth }, (_, d) => (
          <text key={d} x={x(d + 1)} y={14} className="fill-sage-ink font-mono text-[10px] uppercase tracking-widest">
            step {d + 1}
          </text>
        ))}

      {/* The start of the sentence */}
      <circle cx={x(0) + 2} cy={rootY - 4} r={4} className="fill-ink" />
      {show.named && (
        <text x={x(0) - 2} y={rootY - 16} className="fill-sage-ink font-mono text-[11px]">
          {'<s>'}
        </text>
      )}

      {nodes.map((n) => {
        const s = state.get(n.key) ?? 'idle'
        const lit = s === 'kept' || s === 'scored'
        const strokeClass = s === 'kept' ? (show.width ? 'stroke-sage' : 'stroke-ink') : s === 'scored' ? 'stroke-ink' : 'stroke-zinc-400'
        return (
          <g key={n.key}>
            <path
              d={edge(n)}
              fill="none"
              className={`${strokeClass} transition-colors duration-300`}
              strokeWidth={s === 'kept' ? 3 : s === 'scored' ? 1.6 : 1.2}
              strokeDasharray={s === 'dropped' ? '3 4' : undefined}
            />
            {/* A word the model is sure of needs no chance */}
            {n.p < 1 && (
              <text x={x(n.depth) - 8} y={below(n) ? n.y + 9 : n.y - 9} textAnchor="end" className={`font-mono text-[10.5px] ${lit ? 'fill-ink' : 'fill-zinc-faded'}`}>
                {chanceLabel(n.p)}
              </text>
            )}
            <text
              x={x(n.depth)}
              y={n.y}
              className={`font-mono text-[12px] ${s === 'dropped' ? 'fill-zinc-faded line-through' : lit || !run ? 'fill-ink' : 'fill-zinc-faded'} ${s === 'kept' ? 'font-semibold' : ''}`}
            >
              {n.word === END ? END : n.word}
            </text>
          </g>
        )
      })}

      {/* Each whole sentence's chance, at the right of its row */}
      {all.map((h) => {
        if (!shownChance(h)) return null
        const y = leafY.get(keyOf(h.path))!
        const isTop = top && samePath(top, h)
        const isFound = found && samePath(found, h)
        return (
          <g key={keyOf(h.path)}>
            {isTop && <rect x={WIDTH - SCORE - 12} y={y - 15} width={SCORE + 12} height={21} rx={10} className="fill-sage" fillOpacity={0.2} />}
            <text
              x={WIDTH - 6}
              y={y}
              textAnchor="end"
              className={`font-mono text-[12px] ${isTop || isFound ? 'fill-ink font-semibold' : 'fill-zinc-faded'}`}
            >
              {value(h)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
