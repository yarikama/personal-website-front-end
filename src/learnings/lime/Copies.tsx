import { useRef, useState } from 'react'
import { useAnimationFrame } from 'motion/react'
import { usePrefersReducedMotion } from '../../hooks'
import { box, guess, keep, points, pct, SINGLES, STORY, STORY_RUN } from './model'

export type Show = 'whole' | 'single' | 'random' | 'say' | 'fit' | 'named'
const ORDER: Show[] = ['whole', 'single', 'random', 'say', 'fit', 'named']
const from = (show: Show, step: Show) => ORDER.indexOf(show) >= ORDER.indexOf(step)

const WIDTH = 460
const HEIGHT = 445
const ROW = 17
const TOP = 40
// Each word's column: as wide as the word, and a gap
const CHAR = 7
const GAP = 7
const WORD_X = 30
const columns = STORY.reduce<{ x: number; w: number }[]>((cols, word) => {
  const x = cols.length ? cols[cols.length - 1].x + cols[cols.length - 1].w + GAP : WORD_X
  return [...cols, { x, w: word.length * CHAR + 8 }]
}, [])
const BAR_X = 250
const BAR_W = 150
const SAY_X = 12
const CREDIT_Y = 400
const CREDIT_SCALE = 110

// The copies the story shows, most of the review kept first
const WHOLE = [STORY.map(() => true)]
const RANDOM = STORY_RUN.copies
  .map((kept, i) => ({ kept, say: STORY_RUN.says[i] }))
  .sort((a, b) => b.kept.filter(Boolean).length - a.kept.filter(Boolean).length)

// A clock from 0 to 1 over `ms`, from when the figure is shown; the end at
// once with reduced motion
function useProgress(ms: number) {
  const reducedMotion = usePrefersReducedMotion()
  const started = useRef<number | null>(null)
  const [t, setT] = useState(reducedMotion ? 1 : 0)
  useAnimationFrame((time) => {
    if (t >= 1) return
    started.current ??= time
    setT(Math.min(1, (time - started.current) / ms))
  })
  return t
}

// The story's figure: copies of the review with words covered, what the
// friend says to each, each copy's say, and the line's credit per word.
// `show` is how far the story has got; each step plays its new part.
export default function Copies({ show }: { show: Show }) {
  const t = useProgress(show === 'random' ? 1600 : 900)
  return <CopiesDrawing show={show} t={t} />
}

// The drawing at time `t` (0 to 1) of its step
export function CopiesDrawing({ show, t }: { show: Show; t: number }) {
  const named = show === 'named'
  const rows =
    show === 'whole'
      ? WHOLE.map((kept) => ({ kept, say: 1 }))
      : show === 'single'
        ? [WHOLE[0], ...SINGLES].map((kept) => ({ kept, say: 1 }))
        : RANDOM
  // How far each new part has grown
  const appear = (i: number) => (show === 'random' || show === 'single' ? Math.max(0, Math.min(1, t * rows.length - i)) : 1)
  const sayGrow = show === 'say' ? t : 1
  const fitGrow = show === 'fit' ? t : 1
  const line = STORY_RUN.line

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      role="img"
      aria-label={
        from(show, 'fit')
          ? `${rows.length} copies of the review “${STORY.join(' ')}” with words covered. The line that best matches the answers gives ${STORY.map((w, i) => `${w} ${points(line.credit[i])}`).join(', ')}, on a base of ${pct(line.base)}.`
          : `Copies of the review “${STORY.join(' ')}”, words covered, and the chance of a thumbs-up given to each: ${rows.map((r) => `${keep(STORY, r.kept).join(' ')}, ${pct(box(keep(STORY, r.kept)))}`).join('; ')}.`
      }
    >
      <text x={WORD_X} y={18} className="fill-zinc-faded font-mono text-[11px] tracking-wide">
        {named ? 'Perturbed samples z′' : rows.length === 1 ? 'The review' : 'Copies'}
      </text>
      <text x={BAR_X} y={18} className="fill-zinc-faded font-mono text-[11px] tracking-wide">
        {named ? 'Black box f(z)' : 'Thumbs-up chance'}
      </text>
      <line x1={BAR_X} x2={BAR_X} y1={TOP - 12} y2={TOP + rows.length * ROW - 6} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
      <line x1={BAR_X + BAR_W / 2} x2={BAR_X + BAR_W / 2} y1={TOP - 12} y2={TOP + rows.length * ROW - 6} className="stroke-zinc-300 dark:stroke-zinc-200/25" strokeDasharray="2 3" />

      {rows.map(({ kept, say }, r) => {
        const y = TOP + r * ROW
        const grow = appear(r)
        if (grow <= 0) return null
        const score = box(keep(STORY, kept))
        const fitted = Math.max(0, Math.min(1, guess(line, kept)))
        return (
          <g key={r}>
            {from(show, 'say') && <circle cx={SAY_X} cy={y - 4} r={Math.sqrt(say) * 6 * sayGrow} className="fill-sage" />}
            {STORY.map((word, i) =>
              kept[i] ? (
                <text key={i} x={columns[i].x + columns[i].w / 2} y={y} textAnchor="middle" className="fill-ink font-mono text-[11px]">
                  {word}
                </text>
              ) : (
                <rect key={i} x={columns[i].x + 2} y={y - 10} width={columns[i].w - 4} height={12} rx={3} className="fill-ink" fillOpacity={0.85} />
              )
            )}
            <rect x={BAR_X} y={y - 10} width={BAR_W * score * grow} height={12} rx={3} className="fill-ink" fillOpacity={0.35} />
            <text x={WIDTH - 4} y={y} textAnchor="end" className="fill-ink font-mono text-[11px] tabular-nums">
              {pct(score)}
            </text>
            {from(show, 'fit') && (
              <line
                x1={BAR_X + BAR_W * fitted}
                x2={BAR_X + BAR_W * fitted}
                y1={y - 13}
                y2={y + 3}
                className="stroke-sage"
                strokeWidth={2.5}
                strokeOpacity={fitGrow}
              />
            )}
          </g>
        )
      })}

      {from(show, 'fit') && (
        <g>
          <text x={WORD_X} y={CREDIT_Y - 82} className="fill-zinc-faded font-mono text-[11px] tracking-wide">
            {named ? 'LIME weights w' : 'Credit per word'}
          </text>
          <text x={BAR_X} y={CREDIT_Y - 82} className="fill-zinc-faded font-mono text-[11px] tracking-wide">
            {named ? 'Surrogate g, sage ticks' : 'Line’s guess: sage ticks'}
          </text>
          <text x={BAR_X} y={CREDIT_Y + 4} className="fill-ink font-mono text-[11px]">
            {named ? 'Intercept' : 'Base'} {pct(line.base)}
          </text>
          <line x1={WORD_X - 4} x2={columns[columns.length - 1].x + columns[columns.length - 1].w + 4} y1={CREDIT_Y} y2={CREDIT_Y} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
          {STORY.map((word, i) => {
            const c = line.credit[i] * fitGrow
            const h = Math.abs(c) * CREDIT_SCALE
            const cx = columns[i].x + columns[i].w / 2
            return (
              <g key={word}>
                <rect
                  x={cx - 9}
                  y={c >= 0 ? CREDIT_Y - h : CREDIT_Y}
                  width={18}
                  height={Math.max(h, 0.5)}
                  rx={2}
                  className={c >= 0 ? 'fill-sage' : 'fill-ink'}
                  fillOpacity={c >= 0 ? 1 : 0.6}
                />
                <text x={cx} y={c >= 0 ? CREDIT_Y - h - 5 : CREDIT_Y + h + 13} textAnchor="middle" className="fill-ink font-mono text-[11px] tabular-nums">
                  {points(line.credit[i])}
                </text>
                <text x={cx} y={CREDIT_Y + 32} textAnchor="middle" className="fill-ink font-mono text-[11px]">
                  {word}
                </text>
              </g>
            )
          })}
        </g>
      )}
    </svg>
  )
}
