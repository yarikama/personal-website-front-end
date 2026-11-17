import { usePlay } from '../../components/explain/useLoop'
import { seeded } from '../../components/explain/random'
import { BEANS, CROWDS, FAIRS, storyMiss, STORY, type CrowdName } from './model'

const WIDTH = 640
const HEIGHT = 228
const LEFT = 24
const RIGHT = 616
const LOW = 400
const HIGH = 1600
// The true count is labelled on its own
const TICKS = [600, 1400]
// The two rows: one fair's guesses, and where the average landed at each fair
const GUESSES = { top: 26, bottom: 100 }
const AVERAGES = { top: 148, bottom: 182 }
const AXIS = 202

const x = (count: number) => LEFT + ((Math.min(HIGH, Math.max(LOW, count)) - LOW) / (HIGH - LOW)) * (RIGHT - LEFT)

// Where each dot sits up and down its row, the same every time
const random = seeded(42)
const JITTER = Array.from({ length: 1000 }, () => random())

const commas = (n: number) => Math.round(n).toLocaleString('en-US')

// The story's figure. On top, one fair: each dot a friend's guess at the
// beans in the jar, and the sage line their average. Below, the average at
// each of 30 fairs: how widely those land is how far the crowd's average
// misses. `model` relabels the same drawing as trees predicting a value.
// Give it a `key` per step: the guesses land, then the fairs.
export default function Jar({ crowd, model = false }: { crowd: CrowdName; model?: boolean }) {
  const { friends } = CROWDS[crowd]
  const days = STORY[crowd]
  const today = days[0]
  const played = usePlay(2, 900)
  const shown = Math.ceil(Math.min(1, played) * friends)
  const fairsShown = Math.max(0, Math.min(FAIRS, Math.floor((played - 1) * FAIRS) + 1))
  const done = played >= 2
  const miss = storyMiss(crowd)
  const r = friends === 1 ? 6 : friends <= 100 ? 3.2 : 1.6

  const alone = friends === 1
  const who = model ? 'trees' : alone ? 'you alone' : 'friends'
  const where = model ? 'one dataset' : 'one fair'
  const many = model ? `the average on ${FAIRS} datasets` : alone ? `your guess at ${FAIRS} fairs` : `the average at ${FAIRS} fairs`
  const truth = model ? 'the true value' : `${commas(BEANS)} beans`

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 font-mono text-[0.875rem] uppercase tracking-widest">
        <span className="shrink-0 text-ink">
          {alone ? who : `${commas(friends)} ${who}`} · {where}
        </span>
        <span className="text-right text-zinc-faded">{done ? `average misses by about ${miss}` : ' '}</span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-2 w-full"
        role="img"
        aria-label={`${alone ? 'Your guess' : `${commas(friends)} ${model ? 'trees’ predictions' : 'friends’ guesses'}`} on a line from ${LOW} to ${HIGH}, with the true count at ${BEANS}, and ${alone ? 'it is' : 'their average is'} ${commas(today.average)}. Over ${FAIRS} ${model ? 'datasets' : 'fairs'} ${alone ? 'you miss' : 'the average misses'} by about ${miss}.`}
      >
        <line x1={x(BEANS)} x2={x(BEANS)} y1={GUESSES.top - 14} y2={AXIS} className="stroke-zinc-400" strokeWidth={1} strokeDasharray="3 4" />

        {today.guesses.slice(0, shown).map((guess, i) => (
          <circle
            key={i}
            cx={x(guess)}
            cy={GUESSES.top + JITTER[i] * (GUESSES.bottom - GUESSES.top)}
            r={r}
            className="fill-ink"
            opacity={friends > 100 ? 0.55 : 0.8}
          />
        ))}
        {played >= 1 && (
          <g>
            <line
              x1={x(today.average)}
              x2={x(today.average)}
              y1={GUESSES.top - 10}
              y2={GUESSES.bottom + 10}
              className="stroke-sage"
              strokeWidth={3.5}
              strokeLinecap="round"
            />
            <text
              x={x(today.average) + (today.average < BEANS ? -8 : 8)}
              y={GUESSES.top - 2}
              textAnchor={today.average < BEANS ? 'end' : 'start'}
              className="fill-sage-ink font-mono text-[11px] uppercase tracking-widest"
            >
              {alone ? 'your guess' : 'average'} {commas(today.average)}
            </text>
          </g>
        )}

        <text x={LEFT} y={AVERAGES.top - 12} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
          {many}
        </text>
        {days.slice(0, fairsShown).map((day, i) => (
          <circle
            key={i}
            cx={x(day.average)}
            cy={AVERAGES.top + JITTER[500 + i] * (AVERAGES.bottom - AVERAGES.top)}
            r={4.5}
            className="fill-sage"
          />
        ))}

        <line x1={LEFT} x2={RIGHT} y1={AXIS} y2={AXIS} className="stroke-zinc-300 dark:stroke-zinc-200/20" strokeWidth={1} />
        {TICKS.map((tick) => (
          <text
            key={tick}
            x={x(tick)}
            y={AXIS + 18}
            textAnchor="middle"
            className="fill-zinc-faded font-mono text-[11px] tabular-nums"
          >
            {commas(tick)}
          </text>
        ))}
        <text x={x(BEANS)} y={AXIS + 18} textAnchor="middle" className="fill-ink font-mono text-[11px] uppercase tracking-widest">
          {truth}
        </text>
      </svg>
    </div>
  )
}
