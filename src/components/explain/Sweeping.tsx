import { usePlay } from './useLoop'
import { signed, type Pass, type Plan } from './ladders'
import Labelled from './Labelled'
import Track from './LaddersTrack'

// Sweeps playing out on the board: every square starts at 0, and each
// sweep gives each one −1 plus the average (or the better) of where its
// move lands. Plays `passes` once, `pace` ms a sweep, from `from`. With
// `plans`, each sweep also shows the move it would pick on every square.
export default function Sweeping({
  passes,
  pace = 320,
  from = 0,
  to = passes.length - 1,
  plans,
  plan,
  rung,
  theta,
  label,
}: {
  passes: Pass[]
  pace?: number
  from?: number
  to?: number
  plans?: Plan[]
  // One plan for every sweep, and squares to ring once it has played
  plan?: Plan
  rung?: number[]
  theta?: number
  label: string
}) {
  const played = usePlay(to - from, pace)
  const at = Math.min(to, from + Math.floor(played))
  const last = passes.length - 1
  const delta = passes[at].delta
  const scale = Math.max(...passes[last].values.map(Math.abs))
  const done = at === last && theta !== undefined
  return (
    <Labelled
      left={
        <>
          Sweep <span className="text-ink tabular-nums">{at}</span>
        </>
      }
      right={
        at > 0 && (
          <>
            biggest change{' '}
            <span className={`tabular-nums ${done ? 'text-sage' : 'text-ink'}`}>
              {signed(delta, delta < 0.1 ? 3 : 2).replace('−', '')}
            </span>
            {done && <span className="text-sage"> &lt; {theta}</span>}
          </>
        )
      }
    >
      <Track
        label={label}
        values={passes[at].values}
        shade
        scale={scale}
        plan={plans ? plans[at] : (plan ?? null)}
        rung={at === to ? rung : []}
      />
    </Labelled>
  )
}
