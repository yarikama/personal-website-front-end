import type { ReactNode } from 'react'
import { usePlay } from '../../components/explain/useLoop'
import {
  BIKE,
  BIKE_ANSWERS,
  BUS,
  FAST,
  SLOW,
  STATION,
  STORY,
  STORY_MC,
  STORY_MODEL,
  STORY_NOTEBOOKS,
  STORY_TD,
  total,
  trueValues,
} from './model'

// Drawn at about a phone's width, so its labels keep their size there
const WIDTH = 360
const HEIGHT = 300

// The map: where each place sits, and the middle it is drawn around
type Spot = { x: number; y: number; w: number }
const AT: Record<number | 'work', Spot> = {
  [BUS]: { x: 48, y: 32, w: 58 },
  [BIKE]: { x: 48, y: 98, w: 58 },
  [STATION]: { x: 166, y: 65, w: 66 },
  [FAST]: { x: 272, y: 32, w: 50 },
  [SLOW]: { x: 272, y: 98, w: 50 },
  work: { x: 336, y: 65, w: 44 },
}
const MIDDLE = 65
const H = 22
const NAME: Record<number | 'work', string> = { [BUS]: 'Bus', [BIKE]: 'Bike', [STATION]: 'Station', [FAST]: 'Fast', [SLOW]: 'Slow', work: 'Work' }

// The notebook, under the map
const TABLE = 150
const ROW = 22
const COLUMNS = [8, 40, 172, 352]

// The hundred notebooks' strip
const LOW = 15
const HIGH = 50
const strip = (minutes: number) => 24 + ((Math.min(HIGH, Math.max(LOW, minutes)) - LOW) / (HIGH - LOW)) * 318

const BIKE_TRUE = trueValues('own')[BIKE]

const STATUS = [
  'Six trips, as she noted them',
  'Whole trips, averaged',
  'Why the bike trips were slow',
  'Every trip passes the station',
  'A leg, plus what the station usually takes',
  `${STORY_NOTEBOOKS} notebooks of ten trips: the bike`,
  'Place = state · trip = episode · notes = batch',
]

const faint = 'stroke-zinc-400'

// An arrow from one place to the next, its label set off to the outside
function Edge({ from, to, label, strong = false }: { from: Spot; to: Spot; label?: string; strong?: boolean }) {
  const x1 = from.x + from.w / 2
  const x2 = to.x - to.w / 2 - 2
  const dx = x2 - x1
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy)
  // The normal that points away from the middle line
  const midY = (from.y + to.y) / 2
  const away = midY <= MIDDLE ? -1 : 1
  let nx = -dy / length
  let ny = dx / length
  if (Math.sign(ny) !== away) {
    nx = -nx
    ny = -ny
  }
  const lx = (x1 + x2) / 2 + nx * 18
  const ly = midY + ny * 18 + 4
  return (
    <g>
      <line x1={x1} y1={from.y} x2={x2} y2={to.y} className={strong ? 'stroke-sage' : faint} strokeWidth={strong ? 2 : 1.25} markerEnd={strong ? 'url(#ce-arrow-strong)' : 'url(#ce-arrow)'} />
      {label && (
        <text x={lx} y={ly} textAnchor="middle" className={`font-mono text-[10px] tabular-nums ${strong ? 'fill-sage' : 'fill-zinc-400'}`}>
          {label}
        </text>
      )}
    </g>
  )
}

function Place({ at, name, children, state = false, below = true }: { at: Spot; name: string; children?: ReactNode; state?: boolean; below?: boolean }) {
  return (
    <g>
      <rect x={at.x - at.w / 2} y={at.y - H / 2} width={at.w} height={H} rx={3} className="fill-paper stroke-zinc-400" strokeWidth={1} />
      <text x={at.x} y={at.y + 4} textAnchor="middle" className="fill-ink font-mono text-[11px]">
        {name}
      </text>
      {state && (
        <text x={at.x} y={below ? at.y - H / 2 - 5 : at.y + H / 2 + 13} textAnchor="middle" className="fill-zinc-400 font-mono text-[9px] uppercase tracking-widest">
          state
        </text>
      )}
      {children && (
        <text x={at.x} y={below ? at.y + H / 2 + 14 : at.y - H / 2 - 6} textAnchor="middle" className="font-mono text-[11px] tabular-nums">
          {children}
        </text>
      )}
    </g>
  )
}

// The story's notes, one step at a time: the map of the trip and the
// notebook under it, read two ways, then a hundred notebooks, then the
// same in the method's words. Give it a `key` per step.
export default function Notes({ step }: { step: number }) {
  const rows = usePlay(STORY.length, 320)
  const dots = usePlay(STORY_NOTEBOOKS, 22)
  const named = step === 6
  const shown = step === 0 ? Math.floor(rows) : STORY.length

  // What each way to the station says at this step
  const way = (place: typeof BUS | typeof BIKE) => {
    const leg = STORY_MODEL.reward[place]
    if (step === 1 || step === 2) return <tspan className="fill-ink">avg {STORY_MC[place]}</tspan>
    if (step === 4 || step === 5)
      return (
        <tspan className="fill-sage">
          {leg} + {STORY_TD[STATION]} = {STORY_TD[place]}
        </tspan>
      )
    if (named)
      return (
        <>
          <tspan className="fill-ink">MC {STORY_MC[place]}</tspan>
          <tspan className="fill-zinc-400"> · </tspan>
          <tspan className="fill-sage">TD {STORY_TD[place]}</tspan>
        </>
      )
    return null
  }

  const share = (train: number) => `${STORY_MODEL.next[STATION][train] * STORY.length} of ${STORY.length}`
  const headers = named ? ['#', 'Reward', 'Reward', 'Return'] : ['#', 'To the station', 'Train', 'Total']
  const legs = step === 2 || step === 4

  return (
    <div>
      <p className="font-mono text-[0.8rem] uppercase tracking-widest text-zinc-faded">{STATUS[step]}</p>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mx-auto mt-3 w-full max-w-[30rem]" role="img" aria-label={STATUS[step]}>
        <defs>
          {(['ce-arrow', 'ce-arrow-strong'] as const).map((id) => (
            <marker key={id} id={id} viewBox="0 0 8 8" refX={7} refY={4} markerWidth={7} markerHeight={7} markerUnits="userSpaceOnUse" orient="auto">
              <path d="M 0 0 L 8 4 L 0 8 z" className={id === 'ce-arrow' ? 'fill-zinc-400' : 'fill-sage'} />
            </marker>
          ))}
        </defs>

        {/* The map */}
        <Edge from={AT[BUS]} to={AT[STATION]} label={step >= 2 ? (named ? 'r = 15' : '15 min') : undefined} strong={legs} />
        <Edge from={AT[BIKE]} to={AT[STATION]} label={step >= 2 ? (named ? 'r = 12' : '12 min') : undefined} strong={legs} />
        <Edge from={AT[STATION]} to={AT[FAST]} label={step >= 3 ? share(FAST) : undefined} strong={step === 3} />
        <Edge from={AT[STATION]} to={AT[SLOW]} label={step >= 3 ? share(SLOW) : undefined} strong={step === 3} />
        <Edge from={AT[FAST]} to={AT.work} />
        <Edge from={AT[SLOW]} to={AT.work} />
        <Place at={AT[BUS]} name={NAME[BUS]} state={named} below={false}>
          {way(BUS)}
        </Place>
        <Place at={AT[BIKE]} name={NAME[BIKE]} state={named}>
          {way(BIKE)}
        </Place>
        <Place at={AT[STATION]} name={NAME[STATION]} state={named}>
          {step >= 3 && <tspan className="fill-sage">{named ? `V = ${STORY_TD[STATION]}` : `avg ${STORY_TD[STATION]}`}</tspan>}
        </Place>
        <Place at={AT[FAST]} name={NAME[FAST]} state={named} below={false}>
          {step >= 3 && <tspan className="fill-zinc-400">{named ? 'r = 10' : '10 min'}</tspan>}
        </Place>
        <Place at={AT[SLOW]} name={NAME[SLOW]} state={named}>
          {step >= 3 && <tspan className="fill-zinc-400">{named ? 'r = 30' : '30 min'}</tspan>}
        </Place>
        <Place at={AT.work} name={NAME.work} />

        {step === 5 ? (
          // A hundred notebooks: the bike's settled number by each reading
          <g>
            {(['mc', 'td'] as const).map((method, i) => {
              const y = TABLE + 34 + i * 50
              return (
                <g key={method}>
                  <text x={4} y={y - 12} className={`font-mono text-[10px] uppercase tracking-widest ${method === 'td' ? 'fill-sage' : 'fill-ink'}`}>
                    {method === 'mc' ? 'Whole trips' : 'Leg + station'}
                  </text>
                  {BIKE_ANSWERS.slice(0, Math.floor(dots)).map((answer, k) => (
                    <circle
                      key={k}
                      cx={strip(answer[method])}
                      cy={y + ((k * 7) % 13) - 6}
                      r={2.2}
                      className={method === 'td' ? 'fill-sage' : 'fill-ink'}
                      opacity={0.55}
                    />
                  ))}
                </g>
              )
            })}
            <line x1={strip(BIKE_TRUE)} x2={strip(BIKE_TRUE)} y1={TABLE + 14} y2={TABLE + 100} className="stroke-ink" strokeDasharray="4 3" strokeWidth={1} />
            <text x={strip(BIKE_TRUE) + 4} y={TABLE + 10} className="fill-ink font-mono text-[10px]">
              true {BIKE_TRUE}
            </text>
            {[20, 30, 40, 50].map((minutes) => (
              <text key={minutes} x={strip(minutes)} y={TABLE + 120} textAnchor="middle" className="fill-zinc-400 font-mono text-[10px]">
                {minutes}
              </text>
            ))}
            <text x={WIDTH - 4} y={TABLE + 138} textAnchor="end" className="fill-zinc-400 font-mono text-[10px] uppercase tracking-widest">
              minutes, by bike
            </text>
          </g>
        ) : (
          // The notebook
          <g>
            {headers.map((header, c) => (
              <text
                key={c}
                x={COLUMNS[c]}
                y={TABLE}
                textAnchor={c === 3 ? 'end' : 'start'}
                className={`font-mono text-[10px] uppercase tracking-widest ${named && c > 0 ? 'fill-sage' : 'fill-zinc-400'}`}
              >
                {header}
              </text>
            ))}
            <line x1={4} x2={WIDTH - 4} y1={TABLE + 7} y2={TABLE + 7} className="stroke-zinc-300 dark:stroke-zinc-200/25" strokeWidth={1} />
            {STORY.slice(0, shown).map((trip, i) => {
              const y = TABLE + 24 + i * ROW
              const bike = trip.by === BIKE
              // What to pick out: whole trips by way, the legs and the bike's
              // trains, or every train
              const trainStrong = (step === 2 && bike) || step === 3
              return (
                <g key={i} className="font-mono text-[11px] tabular-nums">
                  {(step === 1 || step === 2) && bike && (
                    <rect x={4} y={y - 15} width={WIDTH - 8} height={ROW - 2} className="fill-ink" opacity={0.07} />
                  )}
                  <text x={COLUMNS[0]} y={y} className="fill-zinc-400">
                    {i + 1}
                  </text>
                  <text x={COLUMNS[1]} y={y} className={legs ? 'fill-sage' : 'fill-ink'}>
                    {bike ? 'bike' : 'bus'} {trip.leg}
                  </text>
                  <text x={COLUMNS[2]} y={y} className={trainStrong ? (trip.train === SLOW ? 'fill-ink font-bold' : 'fill-sage') : 'fill-ink'}>
                    {trip.train === FAST ? 'fast' : 'slow'} {trip.ride}
                  </text>
                  <text x={COLUMNS[3]} y={y} textAnchor="end" className={step === 1 ? 'fill-ink font-bold' : 'fill-zinc-400'}>
                    {total(trip)}
                  </text>
                </g>
              )
            })}
          </g>
        )}
      </svg>
    </div>
  )
}
