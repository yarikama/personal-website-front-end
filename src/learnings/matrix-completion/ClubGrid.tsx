import { usePlay } from '../../components/explain/useLoop'
import { CLUB, CLUB_RUN, miss as missText, thousands } from './model'
import { shade } from './paint'

const WIDTH = 560
const HEIGHT = 340
const SIZE = CLUB.size
const CELL = 6.2
const X0 = 130
const Y0 = 62
const SPAN = SIZE * CELL
const STRIP = 7
const TEXT_X = X0 + SPAN + 24

const { fit, guesses, ratings, seen, seenCount, miss, missAverage } = CLUB_RUN
const largest = (values: Float64Array) => values.reduce((a, b) => Math.max(a, Math.abs(b)), 0) || 1
const USER_MAX = largest(fit.users)
const MOVIE_MAX = largest(fit.movies)

// People and films in order of the direction of their two numbers, so that
// those with similar tastes sit together and the grid's few patterns show
const byDirection = (values: Float64Array) =>
  Array.from({ length: SIZE }, (_, i) => i).sort(
    (a, b) => Math.atan2(values[a * 2 + 1], values[a * 2]) - Math.atan2(values[b * 2 + 1], values[b * 2]),
  )
const ROWS = byDirection(fit.users)
const COLS = byDirection(fit.movies)
// Shade over the ratings the club actually gives, for contrast
const LOW = Math.min(...ratings.values)
const HIGH = Math.max(...ratings.values)
const tone = (rating: number) => shade(rating, LOW, HIGH)

// A learned number as a little square: sage when above zero, ink below,
// deeper the larger it is
function Learned({ x, y, value, max }: { x: number; y: number; value: number; max: number }) {
  return (
    <rect
      x={x}
      y={y}
      width={STRIP - 1}
      height={STRIP - 1}
      className={value >= 0 ? 'fill-sage' : 'fill-ink'}
      opacity={0.15 + 0.85 * Math.min(1, Math.abs(value) / max)}
    />
  )
}

// The story scaled up: a film club of 40 people and 40 films, a fifth of
// the cells rated. The rated cells appear first, then each person's and
// film's two learned numbers, then the guesses for every blank. `named`
// relabels it as a recommender. Give it a key per step.
export default function ClubGrid({ named }: { named: boolean }) {
  const played = usePlay(named ? 0 : 2.6, 1000)
  const t = named ? 2.6 : played
  const strips = t >= 1
  const lines = named
    ? [
        ['Rank k', '2'],
        ['Numbers to fit', `${thousands((SIZE + SIZE) * 2)}`],
        ['Observed entries', `${thousands(seenCount)} of ${thousands(SIZE * SIZE)}`],
      ]
    : [
        ['Rated', `${thousands(seenCount)} of ${thousands(SIZE * SIZE)}`],
        ['Blanks off by', `${missText(miss)} stars`],
        ['Average alone', `${missText(missAverage)} stars`],
      ]

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      role="img"
      aria-label={`A grid of ${SIZE} people by ${SIZE} films with ${seenCount} rated cells. Each person and each film gets two learned numbers, and every blank is filled with a guess, off by about ${missText(miss)} stars against ${missText(missAverage)} for guessing the average rating.`}
    >
      {/* What each strip is */}
      <text x={X0 + SPAN / 2} y={28} textAnchor="middle" className="fill-ink font-mono text-[11px] uppercase tracking-widest">
        {named ? 'Movie vectors v' : 'Each film’s two numbers'}
      </text>
      <text x={X0 - 2 * STRIP - 12} y={Y0 + SPAN / 2 - 6} textAnchor="end" className="fill-ink font-mono text-[11px] uppercase tracking-widest">
        {named ? 'User' : 'Each'}
      </text>
      <text x={X0 - 2 * STRIP - 12} y={Y0 + SPAN / 2 + 10} textAnchor="end" className="fill-ink font-mono text-[11px] uppercase tracking-widest">
        {named ? 'vectors u' : 'person’s two'}
      </text>
      {!named && (
        <text x={X0 - 2 * STRIP - 12} y={Y0 + SPAN / 2 + 26} textAnchor="end" className="fill-ink font-mono text-[11px] uppercase tracking-widest">
          numbers
        </text>
      )}

      {/* The learned numbers, two per person down the side, two per film across the top */}
      {strips && (
        <g>
          {ROWS.map((person, i) =>
            [0, 1].map((c) => (
              <Learned key={`u${i}-${c}`} x={X0 - 2 * STRIP - 4 + c * STRIP} y={Y0 + i * CELL} value={fit.users[person * 2 + c]} max={USER_MAX} />
            )),
          )}
          {COLS.map((film, j) =>
            [0, 1].map((c) => (
              <Learned key={`v${j}-${c}`} x={X0 + j * CELL} y={Y0 - 2 * STRIP - 4 + c * STRIP} value={fit.movies[film * 2 + c]} max={MOVIE_MAX} />
            )),
          )}
        </g>
      )}

      {/* The grid */}
      <rect x={X0 - 1} y={Y0 - 1} width={SPAN + 2} height={SPAN + 2} className="fill-paper stroke-zinc-300 dark:stroke-zinc-200/25" />
      {Array.from({ length: SIZE * SIZE }, (_, at) => {
        const i = Math.floor(at / SIZE)
        const j = at % SIZE
        const c = ROWS[i] * SIZE + COLS[j]
        const x = X0 + j * CELL
        const y = Y0 + i * CELL
        if (seen[c]) {
          const show = Math.min(1, t)
          return <rect key={at} x={x + 0.4} y={y + 0.4} width={CELL - 0.8} height={CELL - 0.8} className="fill-sage" opacity={show * tone(ratings.values[c])} />
        }
        const from = 1.3 + (1.1 * i) / SIZE
        const show = Math.max(0, Math.min(1, (t - from) / 0.25))
        if (show <= 0) return null
        return <circle key={at} cx={x + CELL / 2} cy={y + CELL / 2} r={2.3} className="fill-sage" opacity={show * tone(guesses[c])} />
      })}

      {/* The numbers */}
      {lines.map(([name, value], k) => (
        <g key={name}>
          <text x={TEXT_X} y={Y0 + 20 + k * 58} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
            {name}
          </text>
          <text x={TEXT_X} y={Y0 + 40 + k * 58} className={`font-serif text-[17px] ${k === 1 && !named ? 'fill-sage-ink' : 'fill-ink'}`}>
            {value}
          </text>
        </g>
      ))}

      {/* Key */}
      <rect x={X0} y={Y0 + SPAN + 16} width={CELL} height={CELL} className="fill-sage" opacity={0.7} />
      <text x={X0 + 12} y={Y0 + SPAN + 23} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
        {named ? 'observed' : 'rated'}
      </text>
      <circle cx={X0 + 112 + CELL / 2} cy={Y0 + SPAN + 16 + CELL / 2} r={2.3} className="fill-sage" opacity={0.7} />
      <text x={X0 + 124} y={Y0 + SPAN + 23} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
        {named ? 'guess: average + u · v' : 'guessed'}
      </text>
    </svg>
  )
}
