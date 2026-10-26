import { Readout } from '../../components/explain/figure'
import { aroundCircle, everyPair, throughOne } from './model'

const SIZE = 300
const CENTRE = SIZE / 2

// A system's parts in a ring, wired every part to every other, or each to
// one interface in the middle
export default function Connections({ parts, through }: { parts: number; through: boolean }) {
  const points = aroundCircle(parts, CENTRE, CENTRE, 120)
  const lines = through ? throughOne(parts) : everyPair(parts)
  return (
    <div>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto w-full max-w-[20rem]" role="img" aria-label={`${parts} parts, ${lines} connections`}>
        {through
          ? points.map((p, i) => <line key={i} x1={p.x} y1={p.y} x2={CENTRE} y2={CENTRE} className="stroke-sage" strokeWidth={1.2} />)
          : points.flatMap((a, i) =>
              points.slice(i + 1).map((b, j) => (
                <line key={`${i}-${j}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="stroke-ink" strokeWidth={0.6} opacity={0.7} />
              ))
            )}
        {through && <rect x={CENTRE - 18} y={CENTRE - 12} width={36} height={24} className="fill-sage" />}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={7} className="fill-paper stroke-ink" strokeWidth={1.5} />
        ))}
      </svg>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <Readout label="Connections to understand" value={lines} accent={through} />
        <Readout label="Wired the other way" value={through ? everyPair(parts) : throughOne(parts)} />
      </div>
    </div>
  )
}
