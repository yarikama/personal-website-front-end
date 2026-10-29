import { lerp, usePlay } from '../../components/explain/useLoop'
import { seeded } from '../../components/explain/random'
import { gap, guess, LAKE, pierTarget, START_K, STORY } from './model'

const WIDTH = 480
const HEIGHT = 330
// The map: home on the left, the lake, the pier on its near bank and the
// far shore on the other, at this many pixels to the mile
const HOME = { x: 40, y: 78 }
const MILE = 260
const PIER = { x: HOME.x + LAKE.pier * MILE, y: 78 }
const SHORE = { x: HOME.x + LAKE.shore * MILE, y: 78 }
const LAKE_AT = { x: 238, y: 78, rx: 58, ry: 36 }
// The pier's road, round the top of the lake
const ROUND = [PIER, { x: 188, y: 8 }, { x: 288, y: 8 }, SHORE] as const
const RULER = 150
// Guesses, as bars standing on this line
const BASE = 304
const PER_MINUTE = 3.4
const BAR = 34
const DIAL = { x: 412, y: 70, r: 24 }

// A point on the cubic curve through the four points, at t from 0 to 1
function along(t: number) {
  const [a, b, c, d] = ROUND
  const u = 1 - t
  const at = (p: 'x' | 'y') => u ** 3 * a[p] + 3 * u * u * t * b[p] + 3 * u * t * t * c[p] + t ** 3 * d[p]
  return { x: at('x'), y: at('y') }
}

// Corners all over town, too many to keep one guess each
const CORNERS = (() => {
  const random = seeded(7)
  const corners: { x: number; y: number }[] = []
  while (corners.length < 70) {
    const x = 20 + random() * 340
    const y = 22 + random() * 112
    const inLake = ((x - LAKE_AT.x) / (LAKE_AT.rx + 6)) ** 2 + ((y - LAKE_AT.y) / (LAKE_AT.ry + 6)) ** 2 < 1
    if (!inLake) corners.push({ x, y })
  }
  return corners
})()

const ease = (t: number) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 3

// Where a run of knob settings is at `t` from 0 to 1, between nudges
function knobAt(ks: number[], t: number) {
  const at = Math.min(ks.length - 1, t * (ks.length - 1))
  const i = Math.floor(at)
  return i >= ks.length - 1 ? ks[i] : lerp(ks[i], ks[i + 1], at - i)
}

const STATUS = [
  '',
  'Too many corners: one rule, k minutes a mile',
  'The pier’s only road goes round the lake',
  'The pier: guess 2, target 4 + 4 = 8',
  'Turn k up, and the target runs away',
  'Aim at a copy instead: the target holds still',
  'Learn from past drives, picked at random',
  'A deep Q-network',
]

function Bar({ x, minutes, label, tone }: { x: number; minutes: number; label: string; tone: 'ink' | 'faded' }) {
  const height = Math.max(0, minutes) * PER_MINUTE
  return (
    <g>
      <rect
        x={x - BAR / 2}
        y={BASE - height}
        width={BAR}
        height={height}
        className={tone === 'ink' ? 'fill-ink/80' : 'fill-zinc-400'}
      />
      <text x={x} y={BASE - height - 6} textAnchor="middle" className="fill-ink font-mono text-[11px] tabular-nums">
        {label}
      </text>
    </g>
  )
}

// The story's drive home: the town, the rule of thumb's one knob, and its
// guesses for the pier and the far shore. Each step plays from its start;
// give it a `key` per step.
export default function Lake({ step: shown }: { step: number }) {
  // The story's first sentence covers both the corners and the rule
  const step = shown + 1
  const t = usePlay(1, [1600, 2400, 2200, 1400, 2800, 3200, 3200, 1200][step])
  const named = step === 7

  // The knob at this moment, and what the pier's guess is aimed at
  const k =
    step <= 3 ? START_K : step === 4 ? knobAt(STORY.chased, ease(t)) : step === 5 ? knobAt(STORY.held, ease(t)) : knobAt(STORY.mixed, step === 6 ? ease(t) : 1)
  const note = step === 5 ? START_K : null
  const target = step === 3 || step === 4 ? pierTarget(k) : step === 5 ? pierTarget(START_K) : null
  const car = step === 2 ? along(ease(t)) : step === 3 ? SHORE : null
  const grow = step === 1 ? ease((t - 0.4) / 0.6) : 1
  const angle = -135 + (Math.min(k, 30) / 30) * 270
  const needle = {
    x: DIAL.x + DIAL.r * 0.8 * Math.sin((angle * Math.PI) / 180),
    y: DIAL.y - DIAL.r * 0.8 * Math.cos((angle * Math.PI) / 180),
  }

  return (
    <div>
      <p className="font-mono text-[0.8rem] uppercase tracking-widest text-zinc-faded">{STATUS[step]}</p>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mx-auto mt-2 w-full max-w-[32rem]" role="img" aria-label={STATUS[step]}>
        {/* The town's corners: one guess each would be far too many */}
        {CORNERS.map((corner, i) => (
          <circle
            key={i}
            cx={corner.x}
            cy={corner.y}
            r={2}
            className="fill-zinc-400"
            opacity={step === 1 ? lerp(0.9, 0.25, ease((t - 0.5) * 2)) * ease(t * 2.5 - i / 90) : 0.25}
          />
        ))}

        {/* The lake, the roads, home, the pier and the far shore */}
        <ellipse cx={LAKE_AT.x} cy={LAKE_AT.y} rx={LAKE_AT.rx} ry={LAKE_AT.ry} className="fill-sage/15 stroke-sage/40" />
        <path
          d={`M ${ROUND[0].x} ${ROUND[0].y} C ${ROUND[1].x} ${ROUND[1].y}, ${ROUND[2].x} ${ROUND[2].y}, ${ROUND[3].x} ${ROUND[3].y}`}
          className="fill-none stroke-zinc-300 dark:stroke-zinc-200/25"
          strokeWidth={6}
        />
        <path
          d={`M ${SHORE.x} ${SHORE.y} C ${SHORE.x - 10} ${SHORE.y + 60}, ${HOME.x + 20} ${HOME.y + 60}, ${HOME.x} ${HOME.y + 10}`}
          className="fill-none stroke-zinc-300 dark:stroke-zinc-200/25"
          strokeWidth={6}
        />
        <path
          d={`M ${HOME.x - 12} ${HOME.y + 10} V ${HOME.y - 4} L ${HOME.x} ${HOME.y - 15} L ${HOME.x + 12} ${HOME.y - 4} V ${HOME.y + 10} Z`}
          className="fill-ink"
        />
        <line x1={PIER.x} x2={PIER.x + 12} y1={PIER.y} y2={PIER.y} className="stroke-ink" strokeWidth={3} />
        <circle cx={PIER.x} cy={PIER.y} r={4} className="fill-ink" />
        <circle cx={SHORE.x} cy={SHORE.y} r={4} className="fill-ink" />
        {[
          [HOME.x, HOME.y + 28, named ? 'end' : 'home'],
          [PIER.x - 4, PIER.y + 22, named ? 's' : 'pier'],
          [SHORE.x + 4, SHORE.y + 22, named ? 's′' : 'far shore'],
        ].map(([x, y, label]) => (
          <text key={label} x={x} y={y} textAnchor="middle" className={`font-mono text-[11px] uppercase tracking-widest ${named ? 'fill-sage' : 'fill-zinc-faded'}`}>
            {label}
          </text>
        ))}
        {step >= 2 && (
          <text x={238} y={30} textAnchor="middle" className="fill-zinc-faded font-mono text-[10px]">
            {named ? 'r = 4' : '4 min'}
          </text>
        )}
        {step >= 6 && (
          <text x={180} y={146} textAnchor="middle" className="fill-zinc-faded font-mono text-[10px]">
            6 min
          </text>
        )}
        {car && <rect x={car.x - 9} y={car.y - 5} width={18} height={10} rx={2} className="fill-sage" />}

        {/* As the crow flies */}
        <g className="fill-zinc-400 font-mono text-[10px]">
          <line x1={HOME.x} x2={SHORE.x} y1={RULER + 12} y2={RULER + 12} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
          {[
            [HOME.x, '0'],
            [PIER.x, '½ mi'],
            [SHORE.x, '1 mi'],
          ].map(([x, label]) => (
            <g key={label}>
              <line x1={x} x2={x} y1={RULER + 8} y2={RULER + 16} className="stroke-zinc-400" />
              <text x={x} y={RULER + 28} textAnchor="middle">
                {label}
              </text>
            </g>
          ))}
        </g>

        {/* The knob */}
        {step >= 1 && (
          <g opacity={grow}>
            <circle cx={DIAL.x} cy={DIAL.y} r={DIAL.r} className="fill-paper stroke-ink" strokeWidth={1.5} />
            <line x1={DIAL.x} y1={DIAL.y} x2={needle.x} y2={needle.y} className="stroke-sage" strokeWidth={3} strokeLinecap="round" />
            <text x={DIAL.x} y={DIAL.y + DIAL.r + 18} textAnchor="middle" className="fill-ink font-mono text-[12px] tabular-nums">
              {named ? 'w' : `k = ${k.toFixed(1)}`}
            </text>
            <text x={DIAL.x} y={DIAL.y + DIAL.r + 32} textAnchor="middle" className="fill-zinc-faded font-mono text-[10px]">
              {named ? 'weights' : 'min a mile'}
            </text>
          </g>
        )}
        {/* The copy on a sticky note, and the notebook of past drives */}
        {(note !== null || named) && (
          <g>
            <rect x={DIAL.x - 58} y={140} width={116} height={30} className="fill-paper stroke-sage" />
            <text x={DIAL.x} y={159} textAnchor="middle" className="fill-sage font-mono text-[11px]">
              {named ? 'target w⁻' : `copy: k = ${START_K}`}
            </text>
          </g>
        )}
        {step >= 6 &&
          [0, 1, 2].map((i) => (
            <rect
              key={i}
              x={DIAL.x - 62 + i * 4}
              y={190 + i * 4}
              width={116}
              height={26}
              className="fill-paper stroke-zinc-400"
            />
          ))}
        {step >= 6 && (
          <text x={DIAL.x} y={211} textAnchor="middle" className="fill-ink font-mono text-[11px]">
            {named ? 'replay buffer' : 'past drives'}
          </text>
        )}

        {/* The guesses */}
        <line x1={110} x2={360} y1={BASE} y2={BASE} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
        {step >= 1 && (
          <>
            <Bar
              x={PIER.x}
              minutes={guess(k, LAKE.pier) * grow}
              label={named ? 'Q(s)' : guess(k, LAKE.pier).toFixed(1)}
              tone="ink"
            />
            <Bar
              x={SHORE.x}
              minutes={guess(k, LAKE.shore) * grow}
              label={named ? 'Q(s′)' : guess(k, LAKE.shore).toFixed(1)}
              tone="faded"
            />
          </>
        )}
        {target !== null && (
          <g>
            <rect
              x={PIER.x - BAR / 2 - 5}
              y={BASE - target * PER_MINUTE}
              width={BAR + 10}
              height={target * PER_MINUTE}
              className="fill-none stroke-sage"
              strokeWidth={2}
              strokeDasharray="4 3"
              opacity={step === 3 ? ease(t * 2) : 1}
            />
            <text x={PIER.x - BAR / 2 - 10} y={BASE - target * PER_MINUTE + 4} textAnchor="end" className="fill-sage font-mono text-[11px] tabular-nums">
              target {target.toFixed(1)}
            </text>
            <text x={PIER.x + BAR / 2 + 10} y={BASE - 6} className="fill-sage font-mono text-[10px] tabular-nums">
              gap {gap(k, note ?? k).toFixed(1)}
            </text>
          </g>
        )}
        {/* The far shore's own drives home take 6 minutes */}
        {step >= 6 && (
          <line
            x1={SHORE.x - BAR / 2 - 6}
            x2={SHORE.x + BAR / 2 + 6}
            y1={BASE - LAKE.home * PER_MINUTE}
            y2={BASE - LAKE.home * PER_MINUTE}
            className="stroke-sage"
            strokeWidth={2}
            strokeDasharray="4 3"
          />
        )}
        {step >= 1 && (
          <g className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
            <text x={PIER.x} y={BASE + 16} textAnchor="middle">
              {named ? 'guess at s' : 'pier'}
            </text>
            <text x={SHORE.x} y={BASE + 16} textAnchor="middle">
              {named ? 'guess at s′' : 'far shore'}
            </text>
          </g>
        )}
        {named && (
          <text x={(PIER.x + SHORE.x) / 2} y={BASE - 92} textAnchor="middle" className="fill-sage font-mono text-[11px]">
            target: r + Q(s′; w⁻)
          </text>
        )}
      </svg>
    </div>
  )
}
