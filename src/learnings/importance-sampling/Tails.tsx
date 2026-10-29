import { useState } from 'react'
import { Choice, Controls, Readout } from '../../components/explain/figure'
import { EPSILONS, LENGTHS, reachesStart, TAIL_SHOWN, tailsOf, tailStart } from './model'

const WIDTH = 480
const LEFT = 8
const RIGHT = 472
const ROW = 16
const TOP = 6
const HEIGHT = TOP * 2 + TAIL_SHOWN * ROW + 18

const percent = (share: number) => (share >= 0.1 ? `${Math.round(share * 100)}%` : share >= 0.001 ? `${(share * 100).toFixed(1)}%` : share > 0 ? '< 0.1%' : '0%')

// Episodes of off-policy Monte Carlo control, one strip each, start on the
// left. A tick is a move the exploring behaviour made that the greedy target
// would not have. Only the part from the last tick on, in green, teaches.
export default function Tails() {
  const [length, setLength] = useState<(typeof LENGTHS)[number]>(30)
  const [epsilon, setEpsilon] = useState<(typeof EPSILONS)[number]>(0.1)
  const { shown, taught } = tailsOf(length, epsilon)
  const first = reachesStart(length, epsilon)
  const cell = (RIGHT - LEFT) / length

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`${TAIL_SHOWN} episodes of ${length} moves. Each teaches only from its last exploring move to its end: ${percent(taught)} of moves overall.`}
      >
        {shown.map((moves, row) => {
          const y = TOP + row * ROW
          const start = tailStart(moves)
          return (
            <g key={row}>
              <rect x={LEFT} y={y} width={RIGHT - LEFT} height={ROW - 5} className="fill-zinc-200/60 dark:fill-zinc-200/10" />
              <rect x={LEFT + start * cell} y={y} width={(length - start) * cell} height={ROW - 5} className="fill-sage" opacity={0.75} />
              {moves.map((off, i) =>
                off ? <rect key={i} x={LEFT + i * cell + cell / 2 - 1.25} y={y - 1.5} width={2.5} height={ROW - 2} className="fill-ink" /> : null
              )}
            </g>
          )
        })}
        <text x={LEFT} y={HEIGHT - 4} className="fill-zinc-400 font-mono text-[10px] uppercase tracking-widest">
          First move
        </text>
        <text x={RIGHT} y={HEIGHT - 4} textAnchor="end" className="fill-zinc-400 font-mono text-[10px] uppercase tracking-widest">
          End
        </text>
      </svg>
      <Controls>
        <Choice label="Moves per episode" options={LENGTHS} value={length} onChange={setLength} />
        <Choice label="Exploring" options={EPSILONS} value={epsilon} onChange={setEpsilon} format={(e) => `1 in ${Math.round(1 / e)}`} />
      </Controls>
      <Controls>
        <Readout label="Moves that teach" value={percent(taught)} accent />
        <Readout label="Episodes that teach the first move" value={percent(first)} />
      </Controls>
    </div>
  )
}
