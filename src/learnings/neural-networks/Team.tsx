import { lerp, useLoop, usePlay } from '../../components/explain/useLoop'
import {
  BLAMED,
  backward,
  forward,
  HAND,
  HELPERS,
  NOT_SWEEP,
  pct,
  REVIEWS,
  rightOf,
  signed,
  STORY_PATH,
  STORY_ROUNDS,
  STORY_START,
  STORY_TALLY,
  tallyOf,
  withNot,
  WORDS,
  netRight,
  type Net,
  type Tally,
} from './model'

export type Show = 'tally' | 'sweep' | 'helpers' | 'team' | 'blame' | 'train' | 'named'

const WIDTH = 560
const HEIGHT = 384
const WORD_X = 72
const HELPER_X = 286
const YOU_X = 476
const WORD_Y = [92, 178, 264]
const HELPER_Y = [106, 248]
const YOU_Y = 178
const STRIP_Y = 352
// Where along each edge its weight is written, so the labels miss each other
const LABEL_T = [0.74, 0.4]

const caps = 'font-mono text-[11px] uppercase tracking-widest'
const mono = 'font-mono text-[11px] tabular-nums'

const weightText = (w: number) =>
  w === 0
    ? '0'
    : Number.isInteger(w) ? `${w < 0 ? '−' : '+'}${Math.abs(w)}` : Math.abs(w) < 0.05 ? '0.0' : signed(w, 1)

function Edge({
  from,
  to,
  w,
  t = 0.5,
  label = true,
  flowing = null,
  faint = false,
}: {
  from: [number, number]
  to: [number, number]
  w: number
  t?: number
  label?: boolean
  // Blame running back along the edge: the loop's phase, or null
  flowing?: number | null
  faint?: boolean
}) {
  const [x1, y1] = from
  const [x2, y2] = to
  const x = lerp(x1, x2, t)
  const y = lerp(y1, y2, t)
  const width = Math.min(6, 0.8 + 0.45 * Math.abs(w))
  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        className={w >= 0 ? 'stroke-sage' : 'stroke-ink'}
        strokeOpacity={faint ? 0.2 : w >= 0 ? 0.9 : 0.55}
        strokeWidth={width}
        strokeDasharray={w < 0 ? '6 4' : undefined}
      />
      {flowing !== null && (
        <line
          x1={x2}
          y1={y2}
          x2={x1}
          y2={y1}
          className="stroke-ink"
          strokeWidth={2}
          strokeDasharray="3 13"
          strokeDashoffset={-flowing * 64}
          strokeLinecap="round"
        />
      )}
      {label && !faint && (
        <g>
          <rect x={x - 23} y={y - 9} width={46} height={18} rx={9} className="fill-paper" />
          <text x={x} y={y + 4} textAnchor="middle" className={`fill-ink ${mono}`}>
            {weightText(w)}
          </text>
        </g>
      )}
    </g>
  )
}

function WordNode({ word, y, active, named }: { word: string; y: number; active: boolean; named: number | null }) {
  return (
    <g>
      <rect
        x={WORD_X - 40}
        y={y - 15}
        width={80}
        height={30}
        rx={15}
        className={active ? 'fill-sage stroke-sage' : 'fill-paper stroke-zinc-400'}
        fillOpacity={active ? 0.35 : 1}
        strokeWidth={1.5}
      />
      <text x={WORD_X} y={y + 4} textAnchor="middle" className={`fill-ink ${mono}`}>
        {named === null ? word : `x${'₁₂₃'[named]} ${word}`}
      </text>
    </g>
  )
}

// A node that lights up as sure as it is: a helper's flag, or your chance
function Unit({
  x,
  y,
  r,
  name,
  on,
  lines,
}: {
  x: number
  y: number
  r: number
  name: string
  on: number | null
  lines: string[]
}) {
  return (
    <g>
      <text x={x} y={y - r - 8} textAnchor="middle" className={`fill-ink ${name.length > 2 ? caps : 'font-serif text-[16px]'}`}>
        {name}
      </text>
      <circle cx={x} cy={y} r={r} className="fill-paper stroke-sage" strokeWidth={1.5} />
      {on !== null && <circle cx={x} cy={y} r={r} className="fill-sage" fillOpacity={0.85 * on} />}
      {lines.map((line, i) => (
        <text key={i} x={x} y={y + r + 16 + i * 14} textAnchor="middle" className={`${i === 0 ? 'fill-ink' : 'fill-zinc-faded'} ${mono}`}>
          {line}
        </text>
      ))}
    </g>
  )
}

// The story's figure: the words of a review, then the helpers, then you.
// Give it a `key` per step so each step plays from the start.
export default function Team({ show }: { show: Show }) {
  // Which review is being read: round the four, one at a time
  const phase = useLoop(4 * 1500, 0.6)
  // The tally's points for “not”, swept back and forth
  const sweep = useLoop(7000, 0.1)
  const played = usePlay(STORY_ROUNDS, 9)
  const flow = useLoop(1200, 0)

  const tallyMode = show === 'tally' || show === 'sweep'
  const notPoints = lerp(NOT_SWEEP[0], NOT_SWEEP[1], sweep < 0.5 ? sweep * 2 : 2 - sweep * 2)
  const tally: Tally = show === 'sweep' ? withNot(Math.round(notPoints * 10) / 10) : STORY_TALLY

  const net: Net =
    show === 'helpers' || show === 'team'
      ? HAND
      : show === 'blame'
        ? STORY_START
        : show === 'train'
          ? STORY_PATH[Math.floor(played)]
          : STORY_PATH[STORY_ROUNDS]

  // Which review the figure is reading, if one
  const current = show === 'blame' ? REVIEWS.indexOf(BLAMED) : show === 'sweep' || show === 'train' ? null : Math.floor(phase * 4) % 4
  const review = current === null ? null : REVIEWS[current]
  const pass = review && !tallyMode ? forward(net, review.counts) : null
  const blame = show === 'blame' ? backward(net, BLAMED) : null
  const named = show === 'named'
  const helperName = (k: number) => (named ? `h${'₁₂'[k]}` : show === 'helpers' || show === 'team' ? HELPERS[k] : `Helper ${k + 1}`)

  const heading: [string, string] =
    show === 'tally'
      ? ['One tally', `“${review!.text}”: ${signed(tallyOf(tally, review!.counts), 0)}`]
      : show === 'sweep'
        ? [`“not” worth ${signed(tally.points[0], 1)}`, `${rightOf(tally)} of 4 right`]
        : show === 'helpers'
          ? ['Two helpers', `“${review!.text}”`]
          : show === 'team'
            ? ['Helpers, then you', `${netRight(net)} of 4 right`]
            : show === 'blame'
              ? ['A random start', `“${BLAMED.text}”: you gave ${pct(pass!.p)}`]
              : show === 'train'
                ? [`Round ${Math.floor(played)} of ${STORY_ROUNDS}`, `${netRight(net)} of 4 right`]
                : ['A neural network', `${netRight(net)} of 4 right`]

  const columns = named ? ['Input layer', 'Hidden layer', 'Output'] : ['Words', tallyMode ? '' : 'Helpers', 'You']
  const active = (j: number) => (review ? review.counts[j] > 0 : false)

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 font-mono text-[0.875rem] uppercase tracking-widest">
        <span className="text-zinc-faded tabular-nums">{heading[0]}</span>
        <span className="text-ink tabular-nums">{heading[1]}</span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-2 w-full"
        role="img"
        aria-label={
          tallyMode
            ? 'Three words, not, good and boring, each feeding points straight into your tally'
            : 'Three words feed two helpers, and the two helpers feed you'
        }
      >
        {[WORD_X, HELPER_X, YOU_X].map((x, i) => (
          <text key={i} x={x} y={22} textAnchor="middle" className={`fill-zinc-faded ${caps}`}>
            {columns[i]}
          </text>
        ))}

        {/* Edges first, so the nodes sit on top */}
        {tallyMode
          ? WORDS.map((_, j) => (
              <Edge key={j} from={[WORD_X + 40, WORD_Y[j]]} to={[YOU_X - 30, YOU_Y]} w={tally.points[j]} t={0.45} />
            ))
          : net.W.map((row, k) =>
              row.map((w, j) => (
                <Edge
                  key={`${k}${j}`}
                  from={[WORD_X + 40, WORD_Y[j]]}
                  to={[HELPER_X - 26, HELPER_Y[k]]}
                  w={w}
                  t={LABEL_T[k]}
                  faint={w === 0}
                  flowing={blame && BLAMED.counts[j] > 0 ? flow : null}
                />
              ))
            )}
        {!tallyMode &&
          net.v.map((w, k) => (
            <Edge
              key={k}
              from={[HELPER_X + 26, HELPER_Y[k]]}
              to={[YOU_X - 30, YOU_Y]}
              w={w}
              faint={show === 'helpers'}
              flowing={blame ? flow : null}
            />
          ))}

        {WORDS.map((word, j) => (
          <WordNode key={word} word={word} y={WORD_Y[j]} active={active(j)} named={named ? j : null} />
        ))}

        {!tallyMode &&
          HELPER_Y.map((y, k) => (
            <Unit
              key={k}
              x={HELPER_X}
              y={y}
              r={24}
              name={helperName(k)}
              on={pass ? pass.z[k] : null}
              lines={
                blame
                  ? [`share ${signed(blame.shares[k])}`]
                  : pass
                    ? [`flag ${pct(pass.z[k])}`, `start ${weightText(net.b[k])}`]
                    : [`start ${weightText(net.b[k])}`]
              }
            />
          ))}

        <Unit
          x={YOU_X}
          y={YOU_Y}
          r={30}
          name={named ? 'p' : ''}
          on={tallyMode ? (review ? (tallyOf(tally, review.counts) > 0 ? 1 : 0) : null) : show === 'helpers' ? null : pass ? pass.p : null}
          lines={
            tallyMode
              ? review
                ? [tallyOf(tally, review.counts) > 0 ? 'happy' : 'unhappy']
                : []
              : show === 'helpers'
                ? []
                : blame
                  ? [`blame ${signed(blame.blame)}`]
                  : pass
                    ? [`happy ${pct(pass.p)}`, `start ${weightText(net.c)}`]
                    : [`start ${weightText(net.c)}`]
          }
        />

        {/* The four reviews, and how each is called */}
        {REVIEWS.map((r, i) => {
          const x = 70 + i * 140
          const score = tallyMode ? tallyOf(tally, r.counts) : forward(net, r.counts).p - 0.5
          const right = r.happy ? score > 0 : score < 0
          const shownText =
            show === 'helpers'
              ? (() => {
                  const z = forward(net, r.counts).z
                  const up = HELPERS.filter((_, k) => z[k] > 0.5)
                  return up.length ? `${up.join(', ')} up` : 'no flag'
                })()
              : tallyMode
                ? `${signed(score, show === 'sweep' ? 1 : 0)} ${right ? '✓' : '✗'}`
                : `${pct(forward(net, r.counts).p)} ${right ? '✓' : '✗'}`
          return (
            <g key={r.text}>
              {current === i && (
                <rect x={x - 62} y={STRIP_Y - 30} width={124} height={44} rx={12} className="fill-none stroke-zinc-400" strokeWidth={1.25} />
              )}
              <circle
                cx={x - 6 - r.text.length * 3.4}
                cy={STRIP_Y - 16}
                r={4}
                className={r.happy ? 'fill-sage stroke-sage' : 'fill-paper stroke-ink'}
                strokeWidth={1.5}
              />
              <text x={x + 6} y={STRIP_Y - 12} textAnchor="middle" className={`fill-ink ${mono}`}>
                “{r.text}”
              </text>
              <text
                x={x}
                y={STRIP_Y + 5}
                textAnchor="middle"
                className={`${show === 'helpers' ? 'fill-zinc-faded' : right ? 'fill-sage-ink' : 'fill-ink'} ${mono}`}
              >
                {shownText}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
