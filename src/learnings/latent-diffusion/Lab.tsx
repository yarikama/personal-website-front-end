import { FLOOR, SIDE, type Rebuild } from './model'
import { Tag, TileGrid } from './Tiles'

const WIDTH = 560
const HEIGHT = 196
const CELL = 5
const GAP = (WIDTH - 3 * SIDE * CELL) / 4
const TOP = 30
// What was lost is faint; drawn three times stronger so it shows
export const LOST_BOOST = 3

const lostGrid = (a: number[][], b: number[][]) => a.map((row, i) => row.map((v, j) => Math.abs(v - b[i][j])))

// The floor, the floor laid from its plan at the chosen patch size, and
// where the two differ
export default function Lab({ rebuild }: { rebuild: Rebuild }) {
  const size = SIDE * CELL
  const xs = [GAP, 2 * GAP + size, 3 * GAP + 2 * size]
  const lost = lostGrid(FLOOR, rebuild.floor)
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      role="img"
      aria-label={`The floor, the floor laid from a plan of ${rebuild.f} by ${rebuild.f} patches, and what differs between them`}
    >
      <Tag x={xs[0] + size / 2} y={TOP - 12}>The floor</Tag>
      <TileGrid grid={FLOOR} x={xs[0]} y={TOP} cell={CELL} />
      <Tag x={xs[1] + size / 2} y={TOP - 12}>
        Laid from {rebuild.f}×{rebuild.f} patches
      </Tag>
      <TileGrid grid={rebuild.floor} x={xs[1]} y={TOP} cell={CELL} />
      <Tag x={xs[2] + size / 2} y={TOP - 12}>What differs</Tag>
      <TileGrid grid={lost} x={xs[2]} y={TOP} cell={CELL} lost={LOST_BOOST} />
    </svg>
  )
}
