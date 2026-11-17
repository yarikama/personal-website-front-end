import { LAB_SHOWN, type LabRun } from './model'

const COLUMNS = 60
const ROWS = LAB_SHOWN / COLUMNS
const CELL = 9
const GAP = 2

// The first reads of a lab run after the warm-up, one cell each, left to
// right and row by row: sage for a hit, ink for a miss
export default function PoolLab({ run, label }: { run: LabRun; label: string }) {
  const cells = run.hit.slice(0, LAB_SHOWN)
  return (
    <svg
      viewBox={`0 0 ${COLUMNS * (CELL + GAP) - GAP} ${ROWS * (CELL + GAP) - GAP}`}
      className="w-full"
      role="img"
      aria-label={label}
    >
      {cells.map((hit, k) => (
        <rect
          key={k}
          x={(k % COLUMNS) * (CELL + GAP)}
          y={Math.floor(k / COLUMNS) * (CELL + GAP)}
          width={CELL}
          height={CELL}
          rx={2}
          className={hit ? 'fill-sage' : 'fill-ink'}
        />
      ))}
    </svg>
  )
}
