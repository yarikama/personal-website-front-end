import { lerp, usePlay } from '../../components/explain/useLoop'
import {
  dot,
  pct,
  sigmoid,
  STORY_NOISE,
  STORY_NUDGE,
  STORY_PULLED,
  STORY_PUSHED,
  STORY_REAL,
  STORY_V,
  type Vec,
} from './model'

export type Show = 'arrows' | 'pull' | 'push' | 'named'

// The story's flat board: cat's filled arrow (the word held), drinks's
// hollow one (the real neighbour) and three noise words' hollow ones, before
// and after one nudge. Give it a `key` per step, so each step plays from
// its start.

const WIDTH = 440
const HEIGHT = 360
const OX = 236
const OY = 172
const SCALE = 92
const PACE = 1300

const px = (p: Vec) => OX + SCALE * p[0]
const py = (p: Vec) => OY - SCALE * p[1]
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)
const mix = (a: Vec, b: Vec, t: number): Vec => a.map((x, d) => lerp(x, b[d], t))

// A label's place: beyond the tip, along the arrow
function beyond(p: Vec, by: number): Vec {
  const length = Math.hypot(p[0], p[1]) || 1
  return [px(p) + (by * p[0]) / length, py(p) - (by * p[1]) / length]
}

interface Arrow {
  word: string
  at: Vec
  from?: Vec
  filled?: boolean
  real?: boolean
  chance?: number | null
}

function Mark({ word, at, from, filled = false, real = false, chance = null, named }: Arrow & { named: boolean }) {
  const [lx, ly] = beyond(at, 24)
  const tone = filled || real ? 'stroke-sage' : 'stroke-ink'
  return (
    <g>
      {from && (
        <circle cx={px(from)} cy={py(from)} r={5} className="fill-none stroke-ink" strokeOpacity={0.35} strokeDasharray="2 2" />
      )}
      <line
        x1={OX}
        y1={OY}
        x2={px(at)}
        y2={py(at)}
        className={tone}
        strokeOpacity={filled || real ? 1 : 0.55}
        strokeWidth={filled ? 2.5 : 1.5}
        strokeDasharray={filled ? undefined : '4 3'}
      />
      <circle
        cx={px(at)}
        cy={py(at)}
        r={6.5}
        className={filled ? 'fill-sage stroke-sage' : `fill-paper ${tone}`}
        strokeWidth={2}
      />
      <text x={lx} y={ly + 4} textAnchor="middle" className="fill-ink font-mono text-[12px]">
        {named ? `${word} ${filled ? 'v' : 'u'}` : word}
        {chance !== null && <tspan dx={6} className="fill-zinc-faded tabular-nums">{pct(chance)}</tspan>}
      </text>
    </g>
  )
}

export default function Board({ show }: { show: Show }) {
  const t = ease(usePlay(1, show === 'pull' || show === 'push' ? PACE : 1))
  const named = show === 'named'

  // Where everything is at this moment of the step
  const pulled = show === 'arrows' ? 0 : show === 'pull' ? t : 1
  const pushed = show === 'push' ? t : named ? 1 : 0
  const v = pushed > 0 ? mix(STORY_PULLED, STORY_PUSHED, pushed) : mix(STORY_V, STORY_PULLED, pulled)
  const real = mix(STORY_REAL.u, STORY_NUDGE.real, pulled)
  const noise = STORY_NOISE.map((n, j) => ({ word: n.word, at: mix(n.u, STORY_NUDGE.noise[j], pushed), from: n.u }))

  const scored = show !== 'arrows'
  const chanceOf = (u: Vec) => (scored ? sigmoid(dot(u, v)) : null)
  const before = sigmoid(dot(STORY_REAL.u, STORY_V))

  const heading: [string, string] =
    show === 'arrows'
      ? ['Two arrows a word', 'cat held, drinks guessed']
      : show === 'pull'
        ? ['Cat beside drinks', `drinks ${pct(before)} → ${pct(chanceOf(real) ?? 0)}`]
        : show === 'push'
          ? ['Three random words', 'turned away from cat']
          : ['Skip-gram', 'negative sampling']

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 font-mono text-[0.875rem] uppercase tracking-widest">
        <span className="text-zinc-faded">{heading[0]}</span>
        <span className={`tabular-nums ${named ? 'text-sage-ink' : 'text-ink'}`}>{heading[1]}</span>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={describe(show)}>
        <line x1={16} x2={WIDTH - 16} y1={OY} y2={OY} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
        <line x1={OX} x2={OX} y1={14} y2={HEIGHT - 50} className="stroke-zinc-300 dark:stroke-zinc-200/25" />

        {(show === 'push' || named) &&
          noise.map((n) => <Mark key={n.word} word={n.word} at={n.at} from={n.from} chance={chanceOf(n.at)} named={named} />)}
        <Mark
          word={STORY_REAL.word}
          at={real}
          from={pulled > 0 ? STORY_REAL.u : undefined}
          real
          chance={chanceOf(real)}
          named={named}
        />
        <Mark word="cat" at={v} from={pulled > 0 ? STORY_V : undefined} filled named={named} />
        <circle cx={OX} cy={OY} r={2.5} className="fill-ink" />

        {/* The key, in the story's words, then in the model's */}
        <g className="font-mono text-[11px] uppercase tracking-widest">
          <circle cx={22} cy={HEIGHT - 30} r={5.5} className="fill-sage stroke-sage" strokeWidth={2} />
          <text x={34} y={HEIGHT - 26} className="fill-zinc-faded">
            {named ? 'Word vector v' : 'The word you hold'}
          </text>
          <circle cx={22} cy={HEIGHT - 10} r={5.5} className="fill-paper stroke-sage" strokeWidth={2} />
          <text x={34} y={HEIGHT - 6} className="fill-zinc-faded">
            {named ? 'Context vector u' : 'A word you guess'}
          </text>
          {scored && (
            <text x={WIDTH - 12} y={HEIGHT - 6} textAnchor="end" className="fill-zinc-faded">
              {named ? '% = σ(u · v)' : '% = chance of yes'}
            </text>
          )}
        </g>
      </svg>
    </div>
  )
}

function describe(show: Show): string {
  switch (show) {
    case 'arrows':
      return 'A flat board with arrows from the middle: a filled arrow for cat, the word held, and a hollow arrow for drinks, a word guessed. They point in quite different directions.'
    case 'pull':
      return 'Cat’s filled arrow and drinks’s hollow arrow turn toward each other, and the chance of yes for drinks rises.'
    case 'push':
      return `Three words drawn at random, ${STORY_NOISE.map((n) => n.word).join(', ')}, have their hollow arrows turned away from cat’s filled arrow, and their chances of yes fall; the one pointing most like cat moves most.`
    case 'named':
      return 'The same board relabelled: the filled arrow is cat’s word vector v, the hollow arrows are context vectors u, and each chance is the sigmoid of their dot product.'
  }
}
