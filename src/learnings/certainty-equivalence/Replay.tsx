import { useState } from 'react'
import { Button, Choice, Controls, Readout } from '../../components/explain/figure'
import { usePlay } from '../../components/explain/useLoop'
import { BIKE, BUS, FAST, FIRST_GUESS, MISSES, NOTEBOOKS, PLAY_SEED, replayNotebook, STATION, total, trueValues, type Method, type World } from './model'

// Drawn at about a phone's width, so its labels keep their size there
const WIDTH = 360
const HEIGHT = 300
const LEFT = 64
const RIGHT = 350
const LOW = 10
const HIGH = 50
const x = (minutes: number) => LEFT + ((Math.min(HIGH, Math.max(LOW, minutes)) - LOW) / (HIGH - LOW)) * (RIGHT - LEFT)

const ROWS = [
  { place: BUS, name: 'Bus', y: 132 },
  { place: BIKE, name: 'Bike', y: 188 },
  { place: STATION, name: 'Station', y: 244 },
]
const COLUMN = 35
const column = (i: number) => 5 + i * COLUMN + COLUMN / 2

const WORLDS = ['comes by chance', 'meets the bus'] as const
const worldOf = (option: (typeof WORLDS)[number]): World => (option === WORLDS[0] ? 'own' : 'timed')

const TONE: Record<Method, { fill: string; stroke: string; text: string }> = {
  td: { fill: 'fill-sage', stroke: 'stroke-sage', text: 'fill-sage' },
  mc: { fill: 'fill-ink', stroke: 'stroke-ink', text: 'fill-ink' },
}

// One notebook replayed by both methods at once, pass after pass, from 25
// minutes everywhere until nothing moves. Give it a `key` to play again.
function Run({ world, seed }: { world: World; seed: number }) {
  const { trips, passes, settled } = replayNotebook(world, seed)
  const most = Math.max(passes.td.length, passes.mc.length) - 1
  const played = usePlay(most, Math.min(60, Math.max(18, 3200 / most)))
  const at = (method: Method) => passes[method][Math.min(passes[method].length - 1, Math.floor(played))]
  const truth = trueValues(world)
  const done = played >= most
  const visited = (place: number) => place === STATION || trips.some((trip) => trip.by === place)

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 font-mono text-[0.8rem] uppercase tracking-widest">
        <span className="text-zinc-faded">
          Pass <span className="tabular-nums text-ink">{Math.floor(played)}</span>
        </span>
        <span className={done ? 'text-sage' : 'text-zinc-faded'}>{done ? 'settled' : 'replaying…'}</span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mx-auto mt-3 w-full max-w-[32rem]"
        role="img"
        aria-label={`Ten trips replayed. Settled values: bus ${settled.td[BUS].toFixed(1)} by TD and ${settled.mc[BUS].toFixed(1)} by Monte Carlo; bike ${settled.td[BIKE].toFixed(1)} and ${settled.mc[BIKE].toFixed(1)}; true values ${truth[BUS]} and ${truth[BIKE]}.`}
      >
        {/* The notebook: how each trip began, its train, its minutes */}
        {trips.map((trip, i) => {
          const fast = trip.train === FAST
          return (
            <g key={i} className="font-mono tabular-nums">
              <text x={column(i)} y={12} textAnchor="middle" className="fill-zinc-400 text-[10px] uppercase">
                {trip.by === BUS ? 'bus' : 'bike'}
              </text>
              <rect
                x={column(i) - 16}
                y={20}
                width={32}
                height={19}
                className={fast ? 'fill-sage/25 stroke-sage' : 'fill-paper stroke-ink'}
                strokeWidth={1}
              />
              <text x={column(i)} y={34} textAnchor="middle" className={`text-[10px] ${fast ? 'fill-sage' : 'fill-ink'}`}>
                {fast ? 'fast' : 'slow'}
              </text>
              <text x={column(i)} y={56} textAnchor="middle" className="fill-ink text-[11px]">
                {Math.round(total(trip))}
              </text>
            </g>
          )
        })}
        <line x1={10} x2={WIDTH - 10} y1={72} y2={72} className="stroke-zinc-300 dark:stroke-zinc-200/25" strokeWidth={1} />

        {/* The minutes axis */}
        {[10, 20, 30, 40, 50].map((minutes) => (
          <g key={minutes}>
            <line x1={x(minutes)} x2={x(minutes)} y1={108} y2={262} className="stroke-zinc-300 dark:stroke-zinc-200/25" strokeWidth={0.5} />
            <text x={x(minutes)} y={276} textAnchor="middle" className="fill-zinc-400 font-mono text-[10px]">
              {minutes}
            </text>
          </g>
        ))}
        <text x={RIGHT} y={294} textAnchor="end" className="fill-zinc-400 font-mono text-[10px] uppercase tracking-widest">
          minutes left
        </text>

        {ROWS.map(({ place, name, y }) => {
          const seen = visited(place)
          return (
            <g key={place}>
              <text x={8} y={y + 4} className="fill-ink font-mono text-[11px]">
                {name}
              </text>
              {!seen && (
                <text x={8} y={y + 18} className="fill-zinc-400 font-mono text-[10px]">
                  not in notes
                </text>
              )}
              <line x1={LEFT} x2={RIGHT} y1={y} y2={y} className="stroke-zinc-300 dark:stroke-zinc-200/25" strokeWidth={1} />
              {/* The truth */}
              <line x1={x(truth[place])} x2={x(truth[place])} y1={y - 9} y2={y + 9} className="stroke-ink" strokeDasharray="3 2" strokeWidth={1} />
              {/* Where each settles, then where each is now */}
              {(['mc', 'td'] as const).map((method) => (
                <circle key={`end-${method}`} cx={x(settled[method][place])} cy={y} r={7} fill="none" className={TONE[method].stroke} strokeWidth={1} opacity={0.6} />
              ))}
              {(['mc', 'td'] as const).map((method) => {
                const value = at(method)[place]
                return (
                  <g key={method}>
                    <circle cx={x(value)} cy={y} r={4.5} className={`${TONE[method].fill} stroke-paper`} strokeWidth={1} />
                    <text
                      x={x(value)}
                      y={method === 'td' ? y - 11 : y + 21}
                      textAnchor="middle"
                      className={`font-mono text-[10px] tabular-nums ${TONE[method].text}`}
                    >
                      {value.toFixed(1)}
                    </text>
                  </g>
                )
              })}
            </g>
          )
        })}

        {/* Key */}
        <g className="font-mono text-[10px] uppercase">
          <circle cx={8} cy={88} r={4} className="fill-sage" />
          <text x={16} y={91} className="fill-sage">
            TD(0)
          </text>
          <circle cx={62} cy={88} r={4} className="fill-ink" />
          <text x={70} y={91} className="fill-ink">
            Monte Carlo
          </text>
          <line x1={160} x2={160} y1={82} y2={94} className="stroke-ink" strokeDasharray="3 2" strokeWidth={1} />
          <text x={166} y={91} className="fill-ink">
            True
          </text>
          <circle cx={214} cy={88} r={5} fill="none" className="stroke-zinc-400" strokeWidth={1} />
          <text x={223} y={91} className="fill-zinc-400">
            Where it settles
          </text>
        </g>
      </svg>
    </div>
  )
}

// Replay a notebook of ten trips with both methods, see where each
// settles, and switch to a world where how you came to the station matters
export default function Replay() {
  const [option, setOption] = useState<(typeof WORLDS)[number]>(WORLDS[0])
  const [seed, setSeed] = useState(PLAY_SEED)
  const [round, setRound] = useState(0)
  const world = worldOf(option)
  const misses = MISSES[world]
  const better: Method = misses.td < misses.mc ? 'td' : 'mc'
  return (
    <div>
      <Run key={`${world} ${seed} ${round}`} world={world} seed={seed} />
      <Controls>
        <Choice label="The fast train" options={WORLDS} value={option} onChange={setOption} />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setRound((r) => r + 1)}>Replay</Button>
          <Button onClick={() => setSeed((s) => s + 1)}>New notebook</Button>
        </div>
      </Controls>
      <Controls>
        <Readout label="TD misses by" value={`${misses.td.toFixed(1)} min`} accent={better === 'td'} />
        <Readout label="MC misses by" value={`${misses.mc.toFixed(1)} min`} accent={better === 'mc'} />
      </Controls>
      <p className="mt-3 font-mono text-[0.7rem] uppercase tracking-widest text-zinc-faded">
        Bus and bike, typically, over {NOTEBOOKS.toLocaleString('en-US')} notebooks of ten trips; every guess starts at {FIRST_GUESS}
      </p>
    </div>
  )
}
