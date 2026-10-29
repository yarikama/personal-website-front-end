import { Readout } from '../../components/explain/figure'
import { usePlay } from '../../components/explain/useLoop'
import { DISHES, KITCHEN_START, recentRating, SPREADS, taste, type DishName, type Habit, type KitchenEvening, type Spread } from './model'

const WIDTH = 560
const HEIGHT = 322
const LEFT = 30
const RIGHT = 530
const BELL = 70
const TASTE = 82
// Where each dish's axis sits
const AXES: Record<DishName, number> = { mug: 124, pot: 276 }
const NAMES: Record<DishName, string> = { mug: 'A mug of soup', pot: 'A big pot' }
const RECENT = 12

const x = (pinches: number) => LEFT + (Math.max(-0.4, Math.min(10.4, pinches)) / 10) * (RIGHT - LEFT)

function tastePath(dish: DishName) {
  const axis = AXES[dish]
  return Array.from({ length: 201 }, (_, i) => {
    const p = i / 20
    return `${i ? 'L' : 'M'}${x(p).toFixed(1)},${(axis - (taste(p, DISHES[dish]) / 10) * TASTE).toFixed(1)}`
  }).join(' ')
}
const TASTES = { mug: tastePath('mug'), pot: tastePath('pot') }

function bellPath(habit: Habit, axis: number) {
  const low = Math.max(-0.4, habit.centre - 4 * habit.spread)
  const high = Math.min(10.4, habit.centre + 4 * habit.spread)
  const points = Array.from({ length: 121 }, (_, i) => {
    const p = low + ((high - low) * i) / 120
    return `L${x(p).toFixed(1)},${(axis - BELL * Math.exp(-0.5 * ((p - habit.centre) / habit.spread) ** 2)).toFixed(1)}`
  })
  return `M${x(low).toFixed(1)},${axis} ${points.join(' ')} L${x(high).toFixed(1)},${axis} Z`
}

// One cook learning to salt a mug and a big pot, evening by evening: each
// dish's habit as a bell curve over how much salt, its latest tries, and
// how each amount would taste in it. Plays from the first evening to the
// last; give it a `key` to play again.
export default function Kitchen({ run, spread }: { run: KitchenEvening[]; spread: Spread }) {
  const shown = Math.floor(usePlay(run.length, 15))
  const start = SPREADS[spread] === null ? KITCHEN_START : { ...KITCHEN_START, spread: SPREADS[spread] as number }
  const habits = shown > 0 ? run[shown - 1].habits : { mug: start, pot: start }
  const done = run.slice(0, shown)
  const rated = (dish: DishName) => {
    const rating = recentRating(run, dish, shown)
    return Number.isNaN(rating) ? '–' : rating.toFixed(1)
  }

  return (
    <div>
      <p className="font-mono text-[0.8rem] uppercase tracking-widest text-zinc-faded">
        Evening <span className="text-ink tabular-nums">{shown}</span> of {run.length}
      </p>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-2 w-full"
        role="img"
        aria-label={`Two habits, one for a mug of soup and one for a big pot, each a bell curve over how much salt, with the spread ${spread.toLowerCase()}; after ${shown} evenings the mug's is centred on ${habits.mug.centre.toFixed(1)} pinches with a spread of ${habits.mug.spread.toFixed(2)}, the pot's on ${habits.pot.centre.toFixed(1)} with a spread of ${habits.pot.spread.toFixed(2)}`}
      >
        {(Object.keys(AXES) as DishName[]).map((dish) => {
          const axis = AXES[dish]
          const habit = habits[dish]
          const tries = done.filter((e) => e.dish === dish).slice(-RECENT)
          return (
            <g key={dish}>
              <text x={LEFT} y={axis - TASTE - 16} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
                {NAMES[dish]}
              </text>
              <text x={RIGHT} y={axis - TASTE - 16} textAnchor="end" className="fill-sage font-mono text-[11px] tabular-nums">
                {habit.centre.toFixed(1)} ± {habit.spread.toFixed(2)}
              </text>
              <line x1={LEFT} x2={RIGHT} y1={axis} y2={axis} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
              {Array.from({ length: 11 }, (_, p) => (
                <text key={p} x={x(p)} y={axis + 15} textAnchor="middle" className="fill-zinc-400 font-mono text-[10px]">
                  {p}
                </text>
              ))}
              <path d={TASTES[dish]} className="fill-none stroke-zinc-400" strokeWidth={1.5} strokeDasharray="4 4" />
              <path d={bellPath(habit, axis)} className="fill-sage/15 stroke-sage" strokeWidth={2} />
              <line x1={x(habit.centre)} x2={x(habit.centre)} y1={axis} y2={axis - BELL - 4} className="stroke-sage" strokeDasharray="3 3" />
              {tries.map((e, i) => (
                <circle key={i} cx={x(e.pinches)} cy={axis} r={3.5} className="fill-ink" opacity={0.2 + (0.6 * (i + 1)) / tries.length} />
              ))}
            </g>
          )
        })}
        <text x={(LEFT + RIGHT) / 2} y={HEIGHT - 4} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
          pinches of salt
        </text>
      </svg>
      <div className="mt-4 flex flex-wrap gap-x-10 gap-y-3">
        <Readout label="Mug: spread" value={habits.mug.spread.toFixed(2)} accent />
        <Readout label="Mug: rated" value={rated('mug')} />
        <Readout label="Pot: spread" value={habits.pot.spread.toFixed(2)} accent />
        <Readout label="Pot: rated" value={rated('pot')} />
      </div>
    </div>
  )
}
