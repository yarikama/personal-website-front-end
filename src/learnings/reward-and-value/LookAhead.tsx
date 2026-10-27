import { choose, lookAhead, PATHS, type Way } from './model'

const CELL = 32
const GAP = 5
const LEFT = 8
const ROW = 70
const SUM_X = LEFT + PATHS.grab.length * (CELL + GAP) + 16
const WIDTH = SUM_X + 92
const HEIGHT = ROW * 2 + 18

const NAMES: Record<Way, string> = { grab: 'Grab the dirt', charge: 'Charge first' }

// Two ways on from the same place, each step's reward in a box. The agent
// adds up the first `horizon` steps of each (the boxes it can see) and
// picks the bigger sum.
export default function LookAhead({ horizon }: { horizon: number }) {
  const picked = choose(horizon)
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      role="img"
      aria-label={`Looking ${horizon} steps ahead: grab the dirt adds up to ${lookAhead(PATHS.grab, horizon)}, charge first to ${lookAhead(PATHS.charge, horizon)}; the agent picks ${NAMES[picked].toLowerCase()}`}
    >
      {(Object.keys(PATHS) as Way[]).map((way, row) => {
        const top = row * ROW + 22
        const chosen = way === picked
        return (
          <g key={way}>
            <text
              x={LEFT}
              y={top - 6}
              className={`font-mono text-[13px] uppercase tracking-widest ${chosen ? 'fill-sage' : 'fill-zinc-400'}`}
            >
              {NAMES[way]}
              {chosen ? '  ← picks this' : ''}
            </text>
            {PATHS[way].map((reward, i) => {
              const seen = i < horizon
              const x = LEFT + i * (CELL + GAP)
              return (
                <g key={i} opacity={seen ? 1 : 0.45}>
                  <rect
                    x={x}
                    y={top}
                    width={CELL}
                    height={CELL}
                    className={seen && chosen ? 'fill-sage/15 stroke-sage' : 'fill-paper stroke-zinc-400'}
                  />
                  <text
                    x={x + CELL / 2}
                    y={top + CELL / 2 + 5}
                    textAnchor="middle"
                    className={`font-mono text-[15px] tabular-nums ${reward > 0 ? 'fill-ink' : 'fill-zinc-400'}`}
                  >
                    {reward}
                  </text>
                </g>
              )
            })}
            <text
              x={SUM_X}
              y={top + CELL / 2 + 9}
              className={`font-serif text-[32px] font-light lining-nums tabular-nums ${chosen ? 'fill-sage' : 'fill-zinc-faded'}`}
            >
              = {lookAhead(PATHS[way], horizon)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
