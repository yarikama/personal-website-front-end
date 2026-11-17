import { lerp, usePlay } from '../../components/explain/useLoop'
import Chart from './Chart'
import {
  BEST,
  chanceOfTruth,
  CUTOFF,
  cutoffWrong,
  degrees,
  GENTLE,
  halfwayOf,
  ODD,
  PATIENTS,
  pct,
  SEARCH,
  SEARCH_STEPS,
  STEEP,
  surpriseOf,
  totalLoss,
  two,
  type Weights,
} from './model'

export type Show = 'patients' | 'cutoff' | 'curve' | 'surprise' | 'steep' | 'search' | 'named'

// How long each step plays: [span, ms per unit]
const PACE: Record<Show, [number, number]> = {
  patients: [PATIENTS.length, 110],
  cutoff: [1, 900],
  curve: [1, 1400],
  surprise: [1, 1200],
  steep: [1, 1600],
  search: [SEARCH_STEPS, 110],
  named: [1, 600],
}

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)

// The story's chart, one step of the doctor's season at a time. Give it a
// `key` per step, so each step plays from the start.
export default function Clinic({ show }: { show: Show }) {
  const [span, pace] = PACE[show]
  const played = usePlay(span, pace)

  let weights: Weights | null = null
  if (show === 'curve' || show === 'surprise') weights = GENTLE
  if (show === 'steep') {
    const t = ease(played)
    weights = { w: lerp(GENTLE.w, STEEP.w, t), b: lerp(GENTLE.b, STEEP.b, t) }
  }
  if (show === 'search') weights = SEARCH[Math.floor(played)]
  if (show === 'named') weights = BEST

  const total = weights ? totalLoss(weights, PATIENTS) : 0
  const odd = weights ? `flu, given ${pct(chanceOfTruth(weights, ODD))} · ${two(surpriseOf(weights, ODD))}` : ''

  const heading: [string, string] =
    show === 'patients'
      ? ['Flu season', `${Math.min(PATIENTS.length, Math.ceil(played))} patients`]
      : show === 'cutoff'
        ? [`Flu from ${degrees(CUTOFF)} up`, `${cutoffWrong(PATIENTS)} wrong`]
        : show === 'curve'
          ? [`A curve, 50% at ${degrees(halfwayOf(GENTLE))}`, 'every patient a maybe']
          : show === 'surprise'
            ? ['The same curve', `total surprise ${two(total)}`]
            : show === 'steep'
              ? ['Nearly as steep as the rule', `total surprise ${two(total)}`]
              : show === 'search'
                ? [`Nudge ${Math.floor(played)} of ${SEARCH_STEPS}`, `total surprise ${two(total)}`]
                : ['Logistic regression', `log loss ${two(total)}`]

  const surprises = show === 'surprise' || show === 'steep' || show === 'search' || show === 'named'

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 font-mono text-[0.875rem] uppercase tracking-widest">
        <span className="text-zinc-faded tabular-nums">{heading[0]}</span>
        <span className={`tabular-nums ${show === 'search' || show === 'named' ? 'text-sage-ink' : 'text-ink'}`}>{heading[1]}</span>
      </div>
      <Chart
        patients={PATIENTS}
        shown={show === 'patients' ? Math.ceil(played) : PATIENTS.length}
        weights={weights}
        drawn={show === 'curve' ? ease(played) : 1}
        cutoff={show === 'cutoff' ? CUTOFF : null}
        surprises={surprises}
        grow={show === 'surprise' ? ease(played) : 1}
        marked={show === 'surprise' || show === 'steep' ? { patient: ODD, text: odd } : null}
        halfway={show === 'search' || show === 'named'}
        named={show === 'named'}
        label={describe(show, total)}
      />
    </div>
  )
}

function describe(show: Show, total: number): string {
  switch (show) {
    case 'patients':
      return `${PATIENTS.length} patients by temperature: those with flu along the top, those without along the bottom, mixed between 37 and 38.5 degrees.`
    case 'cutoff':
      return `A step at ${degrees(CUTOFF)}: no flu below, flu above. It gets ${cutoffWrong(PATIENTS)} patients wrong.`
    case 'curve':
      return `An S-shaped curve of the chance of flu, rising smoothly through 50% at ${degrees(halfwayOf(GENTLE))}.`
    case 'surprise':
    case 'steep':
    case 'search':
      return `The curve, each patient's gap to it, and a bar for each patient's surprise; the total is ${two(total)}.`
    case 'named':
      return `The best curve, with a log loss of ${two(total)}, crossing 50% at ${degrees(halfwayOf(BEST))}: the decision boundary.`
  }
}
