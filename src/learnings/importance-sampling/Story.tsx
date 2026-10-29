import { usePlay } from '../../components/explain/useLoop'
import Chart from './Chart'
import {
  CLEAR,
  COIN,
  JAMMED,
  legRatio,
  ordinary,
  plain,
  ratio,
  STORY_COUNT,
  STORY_RUN,
  STORY_TRIPS,
  SIDE,
  TRUE,
  tripMinutes,
  weighted,
  YOU,
  type Trip,
} from './model'
import Road, { MAIN_NOTE, SIDE_NOTE, type Labels } from './Road'

const fixed = (value: number, digits = 1) => value.toFixed(digits)
const weightOf = (trip: Trip) => ratio(trip, COIN)
const YOUR_TRIP: Trip = [
  { turn: 'main', jammed: false },
  { turn: 'main', jammed: false },
  { turn: 'main', jammed: false },
]

const odds = (main: number, notes = false) => (): Labels => ({
  main: fixed(main),
  side: fixed(1 - main),
  ...(notes ? { mainNote: MAIN_NOTE, sideNote: SIDE_NOTE } : {}),
})
const RATIOS = (): Labels => ({
  main: `×${fixed(legRatio('main', COIN))}`,
  side: `×${fixed(legRatio('side', COIN))}`,
  mainNote: `${YOU} ÷ ${COIN}`,
  sideNote: `${fixed(1 - YOU)} ÷ ${COIN}`,
})

function Status({ children }: { children: string }) {
  return <p className="font-mono text-[0.8rem] uppercase tracking-widest text-zinc-faded">{children}</p>
}

const turns = (trip: Trip) =>
  trip.map((leg, i) => (
    <span key={i} className={leg.jammed ? 'text-ink' : leg.turn === 'main' ? 'text-sage' : 'text-zinc-faded'}>
      {i ? ' · ' : ''}
      {leg.jammed ? 'jam' : leg.turn}
    </span>
  ))

// The friend's log, as a table: the trips so far, and what they add up to
function Log({ rows, weights, footer }: { rows: number; weights: boolean; footer: { label: string; value: string; accent?: boolean }[] }) {
  return (
    <div className="mt-4">
      <table className="w-full text-left font-mono text-[0.8rem] tabular-nums">
        <thead>
          <tr className="uppercase tracking-widest text-zinc-faded">
            <th className="pb-1 font-normal">Trip</th>
            <th className="pb-1 font-normal">Turns</th>
            <th className="pb-1 text-right font-normal">Min</th>
            {weights && <th className="pb-1 text-right font-normal">Weight</th>}
          </tr>
        </thead>
        <tbody>
          {STORY_TRIPS.map((trip, i) => (
            <tr key={i} className={`border-t border-zinc-200 dark:border-zinc-200/20 ${i < rows ? '' : 'invisible'}`}>
              <td className="py-1">{i + 1}</td>
              <td className="py-1">{turns(trip)}</td>
              <td className="py-1 text-right text-ink">{tripMinutes(trip)}</td>
              {weights && <td className="py-1 text-right text-sage">{fixed(weightOf(trip), 2)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex min-h-[3.25rem] flex-wrap gap-x-8 gap-y-2">
        {footer.map((item) => (
          <div key={item.label} className="flex flex-col">
            <span className="font-mono text-[0.75rem] uppercase tracking-widest text-zinc-faded">{item.label}</span>
            <span className={`font-serif text-2xl font-light tabular-nums ${item.accent ? 'text-sage' : 'text-ink'}`}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const total = STORY_TRIPS.reduce((sum, trip) => sum + weightOf(trip), 0)
const FINAL = { ordinary: STORY_RUN.ordinary[STORY_COUNT - 1], weighted: STORY_RUN.weighted[STORY_COUNT - 1] }

// The story, one step at a time: your commute, a friend's log of theirs,
// the weight of each trip, and the two ways to average. Give it a `key`
// per step so each plays from its start.
export default function Story({ step }: { step: number }) {
  const span = [3, STORY_TRIPS.length * 3 + 1, 3.6, 3.6, STORY_TRIPS.length + 2, 1, 0][step]
  const pace = [700, 260, 900, 900, 600, 4200, 1][step]
  const played = usePlay(span, pace)
  const road = 'A commute of three junctions from home to work; at each, a straight main road or a side street bowed above it.'

  if (step === 0) {
    return (
      <div>
        <Status>{`Main road: ${CLEAR} min, ${JAMMED} when jammed (1 time in 4) · side street: ${SIDE} min`}</Status>
        <div className="mt-3">
          <Road label={`${road} Your chances: main road 0.8, side street 0.2.`} labels={odds(YOU, true)} trip={YOUR_TRIP} driven={played} />
        </div>
      </div>
    )
  }

  if (step === 1) {
    // Each trip drives in turn, and joins the log when it arrives
    const index = Math.min(STORY_TRIPS.length - 1, Math.floor(played / 3))
    const rows = Math.min(STORY_TRIPS.length, Math.floor(played / 3 + 0.01))
    const done = played >= span - 0.01
    return (
      <div>
        <Status>{`Your friend’s log · a coin at every junction`}</Status>
        <div className="mt-3">
          <Road
            label={`${road} Your friend's chances: 0.5 each way.`}
            labels={odds(COIN, true)}
            trip={done ? null : STORY_TRIPS[index]}
            driven={played - index * 3}
            tone="ink"
          />
        </div>
        <Log rows={rows} weights={false} footer={done ? [{ label: 'Plain average', value: `${fixed(plain(STORY_TRIPS))} min` }] : []} />
      </div>
    )
  }

  if (step === 2 || step === 3) {
    const trip = STORY_TRIPS[step - 2]
    const passed = Math.min(3, Math.floor(played + 0.15))
    const factors = trip.slice(0, passed).map((leg) => fixed(legRatio(leg.turn, COIN)))
    const sofar = trip.slice(0, passed).reduce((w, leg) => w * legRatio(leg.turn, COIN), 1)
    return (
      <div>
        <Status>{`Trip ${step - 1} · ${tripMinutes(trip)} min${step === 3 ? ', jammed' : ''}`}</Status>
        <div className="mt-3">
          <Road
            label={`${road} Each main road weighs 1.6 and each side street 0.4. Trip ${step - 1} weighs ${fixed(weightOf(trip), 2)}.`}
            labels={RATIOS}
            trip={trip}
            driven={Math.min(3, played)}
          />
        </div>
        <p className="mt-2 text-center font-mono text-[0.9rem] tabular-nums text-zinc-faded">
          Weight{' '}
          <span className="text-ink">{passed ? factors.join(' × ') : '1'}</span>
          {passed > 1 && (
            <>
              {' = '}
              <span className="text-sage">{fixed(sofar, 2)}</span>
            </>
          )}
        </p>
        <p className="mt-1 min-h-[1.5rem] text-center font-mono text-[0.8rem] text-zinc-400">
          {step === 3 && passed >= 2 ? 'A jam: 1 in 4, whoever drives' : ''}
        </p>
      </div>
    )
  }

  if (step === 4) {
    const rows = Math.min(STORY_TRIPS.length, Math.floor(played + 1))
    const footer = [
      ...(played >= STORY_TRIPS.length ? [{ label: '÷ 5 trips', value: `${fixed(ordinary(STORY_TRIPS, COIN))} min` }] : []),
      ...(played >= STORY_TRIPS.length + 1
        ? [{ label: `÷ weight ${fixed(total)}`, value: `${fixed(weighted(STORY_TRIPS, COIN))} min`, accent: true }]
        : []),
    ]
    return (
      <div>
        <Status>{`Weighted minutes: ${fixed(STORY_TRIPS.reduce((s, t) => s + weightOf(t) * tripMinutes(t), 0))}`}</Status>
        <Log rows={rows} weights footer={footer} />
      </div>
    )
  }

  // The thousand trips: drawn over time, the trip count growing on a log
  // scale so the early swings play as long as the late settling
  const named = step === 6
  const shown = step === 5 ? Math.pow(STORY_COUNT, played) : STORY_COUNT
  const trips = Math.max(1, Math.floor(shown))
  return (
    <div>
      <Status>
        {named
          ? 'Target π: you · behaviour b: your friend'
          : `Trip ${trips.toLocaleString('en-US')} of ${STORY_COUNT.toLocaleString('en-US')} · dashed: your true ${TRUE} min`}
      </Status>
      <div className="mt-3">
        <Chart
          label={`Two estimates of your commute over ${STORY_COUNT} trips of your friend's. Dividing by the trips swings widely before ending at ${fixed(FINAL.ordinary)}; dividing by the weight stays close and ends at ${fixed(FINAL.weighted)}. The truth is ${TRUE}.`}
          lines={[
            { values: STORY_RUN.ordinary, tone: 'ink', name: named ? 'Ordinary' : '÷ trips' },
            { values: STORY_RUN.weighted, tone: 'sage', name: named ? 'Weighted' : '÷ weight' },
          ]}
          truth={TRUE}
          trips={STORY_COUNT}
          shown={shown}
          top={72}
          height={240}
        />
      </div>
    </div>
  )
}
