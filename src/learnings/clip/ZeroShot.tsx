import { Arrow, Pair, PictureTip, WordTip } from './Board'
import { DIAL, HEIGHT, WIDTH } from './layout'
import { CLASSES, newPictureAngle, pct, PROMPT_ANGLES, PROMPTS, two, zeroShot, type NewPicture } from './model'

const BARS = { x: 14, top: 70, step: 44, w: 156 }

// A picture CLIP was never trained on, against one written prompt per
// class: its arrow, the prompts' arrows, and the chance it gives each
// prompt. The closest prompt is the answer, in sage.
export default function ZeroShot({ picture }: { picture: NewPicture }) {
  const { scores, chances, pick } = zeroShot(picture)
  const angle = newPictureAngle(picture)
  return (
    <Pair>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`A new picture, a ${picture.name}, as an arrow among the arrows of four prompts, one per class.`}
      >
        <text
          x={DIAL.x}
          y={14}
          textAnchor="middle"
          className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest"
        >
          New picture
        </text>
        <circle
          cx={DIAL.x}
          cy={DIAL.y}
          r={DIAL.r}
          className="fill-none stroke-zinc-300 dark:stroke-zinc-200/25"
          strokeWidth={1}
        />
        {PROMPT_ANGLES.map((b, j) => (
          <Arrow key={j} angle={b} kind="caption" accent={j === pick} />
        ))}
        <Arrow angle={angle} kind="picture" />
        <circle cx={DIAL.x} cy={DIAL.y} r={2.5} className="fill-ink" />
        <PictureTip angle={angle} picture={picture} />
        {PROMPT_ANGLES.map((b, j) => (
          <WordTip key={j} angle={b} word={CLASSES[j]} accent={j === pick} />
        ))}
      </svg>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`The ${picture.name} against four prompts: ${PROMPTS.map((p, j) => `${p}, how alike ${two(scores[j])}, chance ${pct(chances[j])}`).join('; ')}. The answer is ${CLASSES[pick]}.`}
      >
        <text x={BARS.x} y={14} className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
          Prompt, how alike, chance
        </text>
        {PROMPTS.map((p, j) => {
          const y = BARS.top + j * BARS.step
          const mine = j === pick
          return (
            <g key={p}>
              <text x={BARS.x} y={y - 8} className={`${mine ? 'fill-sage-ink' : 'fill-ink'} font-mono text-[10px]`}>
                “{p}”
              </text>
              <text
                x={BARS.x + BARS.w + 56}
                y={y - 8}
                textAnchor="end"
                className="fill-ink font-mono text-[10px] tabular-nums"
              >
                {two(scores[j])}
              </text>
              <rect x={BARS.x} y={y - 2} width={BARS.w} height={12} rx={3} className="fill-ink" fillOpacity={0.08} />
              <rect
                x={BARS.x}
                y={y - 2}
                width={Math.max(1, BARS.w * chances[j])}
                height={12}
                rx={3}
                className={mine ? 'fill-sage' : 'fill-ink'}
                fillOpacity={mine ? 1 : 0.55}
              />
              <text
                x={BARS.x + BARS.w + 56}
                y={y + 8}
                textAnchor="end"
                className={`${mine ? 'fill-sage-ink' : 'fill-ink'} font-mono text-[10px] tabular-nums`}
              >
                {pct(chances[j])}
              </text>
            </g>
          )
        })}
      </svg>
    </Pair>
  )
}
