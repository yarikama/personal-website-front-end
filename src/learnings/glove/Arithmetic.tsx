import { motion } from 'motion/react'
import { Readout } from '../../components/explain/figure'
import { usePrefersReducedMotion } from '../../hooks'
import {
  analogy,
  CONTEXTS,
  COUNT_TABLES,
  COUNTS,
  DRAWN,
  EVENED,
  QUESTIONS,
  TARGETS,
  type CountTable,
  type Target,
  type Vec,
} from './model'

const WIDTH = 400
const HEIGHT = 340
const PAD = 36

// One frame for every picture the lab can show, so nothing jumps when a
// setting changes: every word and every point an analogy can land on
const EVERY_POINT: Vec[] = COUNT_TABLES.flatMap((table) => [
  ...DRAWN[table],
  ...QUESTIONS.map((q) => analogy(DRAWN[table], q.a, q.b, q.c).point),
])
const LOW = [0, 1].map((k) => Math.min(...EVERY_POINT.map((p) => p[k])))
const HIGH = [0, 1].map((k) => Math.max(...EVERY_POINT.map((p) => p[k])))
// The same scale on both axes, so distances on screen are true
const SCALE = Math.min((WIDTH - 2 * PAD - 40) / (HIGH[0] - LOW[0]), (HEIGHT - 2 * PAD) / (HIGH[1] - LOW[1]))
const sx = (x: number) => WIDTH / 2 + (x - (LOW[0] + HIGH[0]) / 2) * SCALE
const sy = (y: number) => HEIGHT / 2 - (y - (LOW[1] + HIGH[1]) / 2) * SCALE

// The fitted word vectors, an analogy as two equal arrows, and the word
// nearest where the second arrow lands. Below, the counts they came from.
export default function Arithmetic({ question, table }: { question: number; table: CountTable }) {
  const reducedMotion = usePrefersReducedMotion()
  const q = QUESTIONS[question]
  const vectors = DRAWN[table]
  const found = analogy(vectors, q.a, q.b, q.c)
  const answer = found.ranked[0]
  const at = (word: Target) => vectors[TARGETS.indexOf(word)]
  const move = { duration: reducedMotion ? 0 : 0.6, ease: 'easeOut' as const }
  const counts = table === 'As counted' ? COUNTS : EVENED
  const arrow = (from: Vec, to: Vec, dashed: boolean, key: string) => (
    <motion.line
      key={key}
      initial={false}
      animate={{ x1: sx(from[0]), y1: sy(from[1]), x2: sx(to[0]), y2: sy(to[1]) }}
      transition={move}
      className="stroke-sage"
      strokeWidth={2.5}
      strokeDasharray={dashed ? '6 5' : undefined}
      markerEnd="url(#glove-arrow)"
    />
  )

  return (
    <div>
      <p className="font-serif text-2xl font-light">
        {q.a} : {q.b} :: {q.c} : <span className="text-sage-ink">{answer.word}</span>
      </p>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mx-auto mt-2 w-full max-w-[28rem]"
        role="img"
        aria-label={`Six word vectors in two dimensions. The arrow from ${q.a} to ${q.b}, drawn again from ${q.c}, lands nearest ${answer.word}, ${answer.distance.toFixed(2)} away.`}
      >
        <defs>
          <marker id="glove-arrow" viewBox="0 0 10 10" refX={8.5} refY={5} markerWidth={9} markerHeight={9} markerUnits="userSpaceOnUse" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" className="fill-sage" />
          </marker>
        </defs>

        {/* From where the arrow lands to the nearest word */}
        <motion.line
          initial={false}
          animate={{ x1: sx(found.point[0]), y1: sy(found.point[1]), x2: sx(at(answer.word)[0]), y2: sy(at(answer.word)[1]) }}
          transition={move}
          className="stroke-ink"
          strokeWidth={1.25}
          strokeDasharray="2 3"
        />

        {arrow(at(q.a), at(q.b), false, 'first')}
        {arrow(at(q.c), found.point, true, 'second')}

        {TARGETS.map((word, i) => {
          const asked = word === q.a || word === q.b || word === q.c
          const picked = word === answer.word
          // Words that land on one spot share one label, on the first of them
          const same = (j: number) => Math.hypot(vectors[j][0] - vectors[i][0], vectors[j][1] - vectors[i][1]) < 0.15
          const shared = TARGETS.some((_, j) => j < i && same(j))
          const names = [word, ...TARGETS.filter((_, j) => j > i && same(j))]
          const lit = TARGETS.some((other, j) => (j === i || (j > i && same(j))) && other === answer.word)
          // A label sits on the side of its dot away from whatever the dot
          // is joined to (an arrow, or the ring), below when it is free; a
          // shared label sits to the left, a line a word, where the picture
          // is empty
          const other = word === q.a ? at(q.b) : word === q.b ? at(q.a) : word === q.c || lit ? found.point : null
          const above = other !== null && other[1] < vectors[i][1]
          const many = names.length > 1
          return (
            <motion.g key={word} initial={false} animate={{ x: sx(vectors[i][0]), y: sy(vectors[i][1]) }} transition={move}>
              <circle r={picked ? 7 : 5.5} className={picked ? 'fill-sage' : 'fill-ink'} fillOpacity={picked || asked ? 1 : 0.45} />
              {!shared && (
                <text
                  x={many ? -13 : 0}
                  y={many ? 4 - 8 * (names.length - 1) : above ? -13 : 23}
                  textAnchor={many ? 'end' : 'middle'}
                  className={`font-mono text-[13px] ${lit ? 'fill-sage-ink' : asked ? 'fill-ink' : 'fill-zinc-faded'}`}
                >
                  {names.map((name, k) => (
                    <tspan key={name} x={many ? -13 : 0} dy={k ? 16 : 0}>
                      {k ? `= ${name}` : name}
                    </tspan>
                  ))}
                </text>
              )}
            </motion.g>
          )
        })}

        {/* Where b − a + c lands */}
        <motion.circle
          initial={false}
          animate={{ cx: sx(found.point[0]), cy: sy(found.point[1]) }}
          transition={move}
          r={8}
          className="fill-none stroke-ink"
          strokeWidth={1.5}
        />
      </svg>

      <div className="mt-2 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
        <Readout label="Nearest word" value={answer.word} accent />
        <Readout label="Missed by" value={answer.distance.toFixed(2)} />
        <Readout label={`Next, ${found.ranked[1].word}`} value={found.ranked[1].distance.toFixed(2)} />
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full font-mono text-[0.75rem] tabular-nums sm:w-auto">
          <caption className="mb-2 text-left font-mono text-[0.75rem] uppercase tracking-widest text-zinc-faded">
            Neighbours of each word, out of 1,000
          </caption>
          <thead>
            <tr className="text-zinc-faded">
              <th className="py-1 pr-2 text-left font-normal" />
              {CONTEXTS.map((context) => (
                <th key={context} className="px-0.5 py-1 text-right font-normal sm:px-3">
                  {context}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TARGETS.map((word, i) => (
              <tr key={word} className="text-ink">
                <th className="py-1 pr-1 text-left font-normal sm:pr-4">{word}</th>
                {counts[i].map((x, j) => {
                  // The cells the evened-out table changes
                  const changed = (word === 'doctor' || word === 'nurse') && j < 2
                  return (
                    <td key={j} className="px-0.5 py-1 text-right sm:px-3">
                      <span className={changed ? 'rounded-md bg-sage/15 px-1 py-0.5' : 'px-1'}>{x}</span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
