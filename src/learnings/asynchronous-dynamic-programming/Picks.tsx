import { usePlay } from '../../components/explain/useLoop'
import Labelled from '../../components/explain/Labelled'
import Track from '../../components/explain/LaddersTrack'
import { furthest, JUMBLE, PASSES } from './model'

// Squares backed up one at a time, picked at random, on the board: from
// backup `from` to `to`, `pace` ms each. The square just backed up is
// ringed; on the right, how far the furthest square still is from its
// true value.
export default function Picks({ from, to, pace, label }: { from: number; to: number; pace: number; label: string }) {
  const backups = JUMBLE()
  const played = usePlay(to - from, pace)
  const at = Math.min(to, from + Math.floor(played))
  const { square, values } = backups[at]
  const off = furthest(values)
  const scale = Math.max(...PASSES.at(-1)!.values.map(Math.abs))
  return (
    <Labelled
      left={
        <>
          Backup <span className="text-ink tabular-nums">{at}</span>
          {at > 0 && (
            <span className="hidden sm:inline">
              {' '}
              · square <span className="text-sage tabular-nums">{square}</span>
            </span>
          )}
        </>
      }
      right={
        <>
          <span className="hidden sm:inline">furthest </span>off <span className="text-ink tabular-nums">{off.toFixed(off < 0.1 ? 3 : 2)}</span>
        </>
      }
    >
      <Track label={label} values={values} shade scale={scale} rung={at > 0 ? [square] : []} />
    </Labelled>
  )
}
