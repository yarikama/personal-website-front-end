import { usePlay } from '../../components/explain/useLoop'
import Labelled from '../../components/explain/Labelled'
import CityMap from './CityMap'
import { blocksOf, touchedBy, WALKING } from './model'

// Walks playing out in the city. With `blocks`, one walk (`from` + 1) is
// played block by block, `pace` ms a block; otherwise the walks after
// `from` up to `to` are played one after another, `pace` ms a walk, each
// drawn whole as it ends.
export default function Trips({
  from,
  to = from + 1,
  pace,
  blocks = false,
  label,
}: {
  from: number
  to?: number
  pace: number
  blocks?: boolean
  label: string
}) {
  const { walks } = WALKING()
  const span = blocks ? blocksOf(walks[from]) : to - from
  const played = usePlay(span, pace)
  if (blocks) {
    const walk = walks[from]
    const along = Math.min(span, Math.floor(played))
    const passed = new Set(walk.path.slice(0, along + 1)).size
    return (
      <Labelled
        left={
          <>
            Walk <span className="text-ink tabular-nums">{from + 1}</span>
            <span className="hidden sm:inline">
              {' '}
              · block <span className="text-ink tabular-nums">{along}</span>
            </span>
          </>
        }
        right={
          <>
            <span className="text-ink tabular-nums">{touchedBy(from) + passed - (along === span ? 1 : 0)}</span> corners
            <span className="hidden sm:inline"> backed up</span>
          </>
        }
      >
        <CityMap label={label} walks={from} path={walk.path} along={along} />
      </Labelled>
    )
  }
  const at = Math.max(from + 1, Math.min(to, from + Math.ceil(played)))
  return (
    <Labelled
      left={
        <>
          Walk <span className="text-ink tabular-nums">{at}</span> ·{' '}
          <span className="text-ink tabular-nums">{blocksOf(walks[at - 1])}</span>
          <span className="hidden sm:inline"> blocks</span>
        </>
      }
      right={
        <>
          <span className="text-ink tabular-nums">{touchedBy(at).toLocaleString('en')}</span> corners
          <span className="hidden sm:inline"> backed up</span>
        </>
      }
    >
      <CityMap label={label} walks={at} path={walks[at - 1].path} />
    </Labelled>
  )
}
