import { Readout } from '../../components/explain/figure'
import { cut, score, type Depth, type Grow, type Use } from './model'
import UShape from './UShape'

// The story's U with its settings in the reader's hands: how far to shrink,
// how to grow back, and what the cut may use
export default function Lab({ depth, how, use }: { depth: Depth; how: Grow; use: Use }) {
  const mask = cut(depth, how, use)
  const result = score(mask)
  return (
    <div>
      <UShape depth={depth} map cut={mask} deep={use !== 'Copy'} copy={use !== 'Deep map'} named={false} />
      <div className="mt-4 grid grid-cols-3 gap-x-6">
        <Readout label="Cut" value={result.kept} />
        <Readout label="Missed" value={result.missed} />
        <Readout label="Extra" value={result.extra} accent={result.extra === 0} />
      </div>
    </div>
  )
}
