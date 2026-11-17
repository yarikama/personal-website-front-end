import { lerp, usePlay } from '../../components/explain/useLoop'
import { FILMS, FRIENDS, romance, STORY, STORY_MASK, STORY_ROUNDS, storyFit } from './model'
import { starText } from './paint'

const WIDTH = 560
const HEIGHT = 316
const NAMES = 112
const COL = 88
const ROW = 46
const TOP = 86
const BAR = 64
const n = FILMS.length

const colX = (j: number) => NAMES + j * COL
const rowY = (i: number) => TOP + i * ROW
const BOTTOM = TOP + FRIENDS.length * ROW

// The story's back and forth, worked out once
const FIT = storyFit()
// Ana and the two films that are all one thing
const ANA = 0
const PURE = [0, n - 1]
const PARIS = 3

const fraction = (x: number) => ({ 1: '1', 0.75: '¾', 0.5: '½', 0.25: '¼', 0: '0' })[x] ?? String(x)

// The story's grid: four friends down the side, five films across, the
// ratings they have given and blanks for the rest. `step` is the story's:
// 0 the grid, 1 each film's mix, 2 Ana's taste from two of her ratings,
// 3 her blank for Paris worked out, 4 every blank filled by going back and
// forth (it plays; give it a key).
export default function FriendsGrid({ step }: { step: number }) {
  const rounds = usePlay(step === 4 ? STORY_ROUNDS : 0, 700)
  const mixes = step >= 1 && step <= 3
  const anaKnown = step >= 2 && step <= 3

  // What a blank shows at round `rounds` of the back and forth
  const roundValue = (c: number) => {
    if (rounds < 1) return null
    const r = Math.min(STORY_ROUNDS - 1, Math.floor(rounds))
    const t = Math.min(1, rounds - r)
    const eased = t * t * (3 - 2 * t)
    return lerp(FIT.trace[r][c], FIT.trace[Math.min(STORY_ROUNDS, r + 1)][c], rounds >= STORY_ROUNDS ? 1 : eased)
  }

  const caption =
    step === 3
      ? `Paris for Ana: ¼ × 5 + ¾ × 1 = 2`
      : step === 4
        ? rounds < 1
          ? 'Start from a random guess…'
          : `Round ${Math.min(STORY_ROUNDS, Math.floor(rounds))} of ${STORY_ROUNDS}: tastes from films, then films from tastes`
        : step === 2
          ? 'Ana: Heist 5, all action · Letters 1, all romance'
          : ''

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={label(step)}>
      {/* Films across the top, with how much action and romance each is */}
      {FILMS.map((film, j) => (
        <g key={film.name}>
          <text x={colX(j) + COL / 2} y={22} textAnchor="middle" className="fill-ink font-mono text-[12px] uppercase tracking-widest">
            {film.name}
          </text>
          {mixes && (
            <g>
              <rect x={colX(j) + (COL - BAR) / 2} y={34} width={BAR * film.action} height={12} className="fill-sage" />
              <rect
                x={colX(j) + (COL - BAR) / 2 + BAR * film.action}
                y={34}
                width={BAR * romance(film)}
                height={12}
                className="fill-zinc-300"
              />
              <text x={colX(j) + COL / 2} y={64} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px]">
                {fraction(film.action)} · {fraction(romance(film))}
              </text>
            </g>
          )}
        </g>
      ))}

      {/* Friends down the side */}
      {FRIENDS.map((friend, i) => (
        <g key={friend.name}>
          <text x={8} y={rowY(i) + (anaKnown && i === ANA ? 20 : 28)} className="fill-ink font-mono text-[13px] uppercase tracking-widest">
            {friend.name}
          </text>
          {anaKnown && i === ANA && (
            <text x={8} y={rowY(i) + 38} className="fill-sage-ink font-mono text-[11px]">
              act {friend.action} · rom {friend.romance}
            </text>
          )}
        </g>
      ))}

      {/* The ratings */}
      {FRIENDS.map((_, i) =>
        FILMS.map((film, j) => {
          const c = i * n + j
          const x = colX(j) + 6
          const y = rowY(i) + 5
          const w = COL - 12
          const h = ROW - 10
          const seen = STORY_MASK[c] === 1
          const used = step === 2 && i === ANA && PURE.includes(j)
          let guess: number | null = null
          if (!seen && step === 3 && i === ANA) guess = j === PARIS ? STORY.values[c] : null
          if (!seen && step === 4) guess = roundValue(c)
          const focus = step === 3 && i === ANA && j === PARIS
          return (
            <g key={film.name}>
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                rx={8}
                className={
                  seen
                    ? `fill-paper ${used ? 'stroke-ink' : 'stroke-zinc-300 dark:stroke-zinc-200/25'}`
                    : guess !== null
                      ? 'fill-sage/20 stroke-sage'
                      : 'fill-none stroke-zinc-400'
                }
                strokeWidth={used || focus ? 2 : 1.2}
                strokeDasharray={!seen && guess === null ? '4 4' : undefined}
              />
              <text
                x={x + w / 2}
                y={y + h / 2 + 6}
                textAnchor="middle"
                className={`font-serif text-[18px] ${seen || guess !== null ? 'fill-ink' : 'fill-zinc-faded'}`}
              >
                {seen ? starText(STORY.values[c]) : guess !== null ? starText(guess) : '?'}
              </text>
            </g>
          )
        }),
      )}

      {/* What the step works out */}
      <text x={NAMES + 6} y={BOTTOM + 34} className="fill-ink font-mono text-[12px]">
        {caption}
      </text>
      {mixes && (
        <g>
          <rect x={8} y={30} width={12} height={10} className="fill-sage" />
          <text x={26} y={39} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
            action
          </text>
          <rect x={8} y={50} width={12} height={10} className="fill-zinc-300" />
          <text x={26} y={59} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
            romance
          </text>
        </g>
      )}
    </svg>
  )
}

function label(step: number) {
  const base = 'A grid of four friends by five films, Heist, Duel, Mr and Mrs, Paris and Letters, with 15 ratings given and 5 blanks'
  if (step === 1) return `${base}. Above each film, how much of it is action and how much romance, from all action for Heist to all romance for Letters.`
  if (step === 2) return `${base}. Ana rated Heist 5 and Letters 1, so she gives action 5 stars and romance 1.`
  if (step === 3) return `${base}. Ana's blank for Paris, a quarter action and three quarters romance, works out to 2.`
  if (step === 4) return `${base}. Round by round, the blanks settle: Ana's Mr and Mrs at 3 and Paris at 2, Ben's Duel at 2, Cy's Paris at 2.5, Dee's Mr and Mrs at 3.`
  return `${base}.`
}
