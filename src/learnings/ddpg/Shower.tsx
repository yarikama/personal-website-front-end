import { lerp, usePlay } from '../../components/explain/useLoop'
import { seeded } from '../../components/explain/random'
import { climb, comfort, slope, STORY, toUnit } from './model'

const WIDTH = 480
const HEIGHT = 270
// The dial, on the left
const DIAL = { x: 86, y: 150, r: 56 }
// The feel for each setting, on the right
const LEFT = 186
const RIGHT = 462
const TOP = 66
const BOTTOM = 220
const LOW = -2

const px = (dial: number) => LEFT + (dial / 100) * (RIGHT - LEFT)
const feel = (dial: number) => comfort(STORY.cold, dial)
const py = (value: number) => BOTTOM - ((value - LOW) / -LOW) * (BOTTOM - TOP)
const CURVE = Array.from({ length: 101 }, (_, d) => `${d ? 'L' : 'M'} ${px(d).toFixed(1)} ${py(feel(d)).toFixed(1)}`).join(' ')

// Where the needle points for a setting, from far left (0) to far right (100)
function needle(dial: number, length = DIAL.r - 10) {
  const angle = Math.PI * (1 - dial / 100)
  return { x: DIAL.x + length * Math.cos(angle), y: DIAL.y - length * Math.sin(angle) }
}

const HABITS = climb(4)
// Tries a touch off the habit, for step 5
const TRIES = (() => {
  const random = seeded(11)
  return Array.from({ length: 9 }, () => HABITS.at(-1)! + (random() - 0.5) * 22)
})()

const ease = (t: number) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 3

const STATUS = [
  'Any setting from 0 to 100',
  'Try them all? There’s always one more between',
  'A habit: on mornings like this, 30',
  'Your feel says: a bit hotter',
  'Nudge the habit uphill, morning by morning',
  'Now and then, a touch off the habit',
  'DDPG',
]

// The story's shower: the dial, your habit, and your feel for how each
// setting would go on a cold morning. Each step plays from its start; give
// it a `key` per step.
export default function Shower({ step }: { step: number }) {
  const t = usePlay(1, [2400, 3000, 1200, 1600, 3200, 2400, 1000][step])
  const named = step === 6

  // The habit at this moment: it walks through the climb in step 4
  const at = step === 4 ? ease(t) * (HABITS.length - 1) : step > 4 ? HABITS.length - 1 : 0
  const i = Math.min(HABITS.length - 2, Math.floor(at))
  const habit = step < 4 ? HABITS[0] : at >= HABITS.length - 1 ? HABITS.at(-1)! : lerp(HABITS[i], HABITS[i + 1], at - i)
  const showsHabit = step >= 2
  // In step 0 the needle sweeps; in step 1 it jumps between tries
  const grid = step === 1 ? 2 ** (1 + Math.floor(ease(t) * 6)) : 0
  const sweep = step === 0 ? 50 + 50 * Math.sin(t * Math.PI * 2) : null
  const point = sweep ?? (step === 1 ? 100 * ((Math.floor(t * 40) * 7) % grid) / grid : habit)
  const tip = needle(point)

  // The slope of the feel at the habit, drawn as a short tangent
  const rise = slope(habit) * (toUnit(habit + 1) - toUnit(habit)) // feel per dial setting
  const span = 14
  const tangent = {
    x1: px(habit - span),
    y1: py(feel(habit) - rise * span),
    x2: px(habit + span),
    y2: py(feel(habit) + rise * span),
  }

  return (
    <div>
      <p className="font-mono text-[0.8rem] uppercase tracking-widest text-zinc-faded">{STATUS[step]}</p>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mx-auto mt-2 w-full max-w-[32rem]" role="img" aria-label={STATUS[step]}>
        {/* The dial */}
        <path
          d={`M ${DIAL.x - DIAL.r} ${DIAL.y} A ${DIAL.r} ${DIAL.r} 0 0 1 ${DIAL.x + DIAL.r} ${DIAL.y}`}
          className="fill-paper stroke-ink"
          strokeWidth={1.5}
        />
        {Array.from({ length: 11 }, (_, k) => {
          const inner = needle(k * 10, DIAL.r - 6)
          const outer = needle(k * 10, DIAL.r)
          return <line key={k} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} className="stroke-zinc-400" />
        })}
        <line x1={DIAL.x} y1={DIAL.y} x2={tip.x} y2={tip.y} className="stroke-sage" strokeWidth={3} strokeLinecap="round" />
        <circle cx={DIAL.x} cy={DIAL.y} r={4} className="fill-ink" />
        <text x={DIAL.x - DIAL.r} y={DIAL.y + 18} textAnchor="middle" className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
          cold
        </text>
        <text x={DIAL.x + DIAL.r} y={DIAL.y + 18} textAnchor="middle" className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
          hot
        </text>
        <text x={DIAL.x} y={DIAL.y + 44} textAnchor="middle" className={`font-mono text-[12px] tabular-nums ${named ? 'fill-sage' : 'fill-ink'}`}>
          {named ? 'action a' : `${Math.round(point)}`}
        </text>

        {/* The settings, and the feel for each */}
        <line x1={LEFT} x2={RIGHT} y1={BOTTOM} y2={BOTTOM} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
        {[0, 50, 100].map((d) => (
          <text key={d} x={px(d)} y={BOTTOM + 16} textAnchor="middle" className="fill-zinc-400 font-mono text-[10px]">
            {d}
          </text>
        ))}
        <text x={(LEFT + RIGHT) / 2} y={BOTTOM + 34} textAnchor="middle" className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
          {named ? 'action a' : 'setting'}
        </text>

        {/* Trying every setting: the marks get finer and never finish */}
        {step === 1 &&
          Array.from({ length: grid + 1 }, (_, k) => (
            <line key={k} x1={px((100 * k) / grid)} x2={px((100 * k) / grid)} y1={BOTTOM - 10} y2={BOTTOM} className="stroke-ink" />
          ))}
        {step === 1 && (
          <text x={RIGHT} y={BOTTOM - 18} textAnchor="end" className="fill-ink font-mono text-[11px] tabular-nums">
            {grid + 1} tried, and more between
          </text>
        )}

        {/* The feel */}
        {step >= 3 && (
          <path
            d={CURVE}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={step === 3 ? 1 - ease(t * 1.4) : 0}
            className="fill-none stroke-ink"
            strokeWidth={2}
          />
        )}
        {step >= 3 && (
          <text x={RIGHT} y={py(feel(100)) + 26} textAnchor="end" className={`font-mono text-[11px] ${named ? 'fill-sage' : 'fill-zinc-faded'}`}>
            {named ? 'critic Q(s, a)' : 'how it would feel'}
          </text>
        )}

        {/* The habit, and the way uphill from it */}
        {showsHabit && (
          <g>
            <line x1={px(habit)} x2={px(habit)} y1={BOTTOM} y2={TOP - 8} className="stroke-sage" strokeDasharray="3 3" />
            <circle cx={px(habit)} cy={step >= 3 ? py(feel(habit)) : BOTTOM} r={5} className="fill-sage" />
            <text x={px(habit) + 6} y={BOTTOM - 8} className="fill-sage font-mono text-[11px] tabular-nums">
              {named ? 'actor μ(s)' : `habit ${Math.round(habit * 10) / 10}`}
            </text>
          </g>
        )}
        {step === 4 &&
          HABITS.slice(0, Math.floor(at) + 1).map((h) => (
            <circle key={h} cx={px(h)} cy={py(feel(h))} r={3} className="fill-sage/40" />
          ))}
        {step >= 3 && step !== 5 && (
          <g opacity={step === 3 ? ease((t - 0.6) / 0.4) : 1}>
            <line {...tangent} className="stroke-sage" strokeWidth={2.5} />
            <circle cx={tangent.x2} cy={tangent.y2} r={3} className="fill-sage" />
            {(step === 3 || named) && (
              <text
                x={named ? tangent.x2 + 6 : px(habit) - 8}
                y={named ? tangent.y2 - 8 : TOP - 4}
                textAnchor={named ? 'start' : 'end'}
                className="fill-sage font-mono text-[11px]"
              >
                {named ? '∂Q/∂a' : 'hotter is better'}
              </text>
            )}
          </g>
        )}

        {/* A few tries a touch off the habit */}
        {step === 5 &&
          TRIES.map((d, k) => (
            <circle
              key={k}
              cx={px(d)}
              cy={py(feel(d))}
              r={3.5}
              className="fill-ink"
              opacity={ease(t * 1.5 - k / 10)}
            />
          ))}
        {step === 5 && (
          <text x={px(HABITS.at(-1)!) - 14} y={py(0) + 30} textAnchor="end" className="fill-ink font-mono text-[11px]">
            tries nearby
          </text>
        )}
        {named && (
          <text x={px(15)} y={py(-1.6)} className="fill-zinc-faded font-mono text-[11px]">
            r = how it felt
          </text>
        )}
      </svg>
    </div>
  )
}
