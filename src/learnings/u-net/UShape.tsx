import { usePlay } from '../../components/explain/useLoop'
import { chairBlocks, PHOTO, pool, score, SIZE, side, type Depth, type Grid, type Mask } from './model'

// The U: the photo at the top left, the deep map at the bottom, the cut at
// the top right; shrinking goes down the left arm, growing up the right, and
// the copy straight across the top
const WIDTH = 440
const HEIGHT = 350
const CELL = 9
const PANEL = CELL * SIZE
const PHOTO_AT = { x: 8, y: 46 }
const CUT_AT = { x: WIDTH - 8 - PANEL, y: 46 }
const MAP_SIZE = 96
const MAP_AT = { x: (WIDTH - MAP_SIZE) / 2, y: 222 }
const TOP = PHOTO_AT.y + PANEL
const MIDDLE = PHOTO_AT.y + PANEL / 2
const BOTTOM = MAP_AT.y + MAP_SIZE / 2

const label = 'font-mono text-[11px] uppercase tracking-widest'

export interface View {
  depth: Depth
  // Which parts are on show
  map: boolean
  // The cut, once there is one
  cut: Mask | null
  // Whether the cut used the deep map, and the copy across
  deep: boolean
  copy: boolean
  // Name the parts as a U-Net's
  named: boolean
  // What plays in when the view is shown: the map or the cut sweeps in a row
  // at a time. Give the figure a `key` so it plays again.
  fresh?: 'map' | 'cut'
}

// An arrowhead at (x, y), pointing at `angle` degrees (0 is right, 90 down)
function Head({ x, y, angle, className }: { x: number; y: number; angle: number; className: string }) {
  return <path d="M0 0 L-8 -4.5 L-8 4.5 Z" transform={`translate(${x} ${y}) rotate(${angle})`} className={className} />
}

export default function UShape({ depth, map, cut, deep, copy, named, fresh }: View) {
  const played = usePlay(1, 1100)
  const shown = fresh ? played : 1
  const n = side(depth)
  const blocks: Grid = chairBlocks(depth)
  const blur: Grid = pool(PHOTO, SIZE / n)
  const mapCell = MAP_SIZE / n
  const rows = (count: number, which: 'map' | 'cut') => (fresh === which ? Math.ceil(shown * count) : count)
  const mapRows = rows(n, 'map')
  const cutRows = rows(SIZE, 'cut')
  const result = cut && score(cut)

  const words = named
    ? { photo: 'Input image', map: 'Bottleneck', cut: 'Mask', down: 'Encoder', up: 'Decoder', across: 'Skip connection' }
    : { photo: 'Photo', map: 'Chair blocks', cut: 'Cut', down: 'Shrink', up: 'Grow', across: 'Copy across' }


  return (
    <div>
      <p className="flex flex-wrap justify-between gap-x-4 font-mono text-[0.875rem] uppercase tracking-widest">
        <span className="text-zinc-faded">
          {SIZE}×{SIZE} → {n}×{n} → {SIZE}×{SIZE}
        </span>
        <span className={result ? (result.wrong === 0 ? 'text-sage-ink' : 'text-ink') : 'text-zinc-faded'}>
          {result
            ? result.wrong === 0
              ? `All ${result.kept} cut pixels are chair`
              : `${result.kept - result.extra} of ${result.kept} cut pixels are chair`
            : 'Nothing cut yet'}
        </span>
      </p>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-2 w-full"
        role="img"
        aria-label={`A ${SIZE} by ${SIZE} photo of a chair beside a picture frame${
          map ? `, shrunk to a ${n} by ${n} map of the blocks that hold chair` : ''
        }${
          result
            ? `, and a cut that used ${deep && copy ? 'both the map grown back and the copied photo' : deep ? 'the map grown back' : 'the copied photo'}: ${result.kept} pixels, ${result.kept - result.extra} of them chair`
            : ''
        }.`}
      >
        {/* Shrinking, down the left arm */}
        {map && (
          <g>
            <path
              d={`M${PHOTO_AT.x + PANEL / 2} ${TOP + 10} Q${PHOTO_AT.x + PANEL / 2} ${BOTTOM} ${MAP_AT.x - 14} ${BOTTOM}`}
              className="stroke-zinc-400"
              fill="none"
              strokeWidth={1.5}
              strokeDasharray={deep ? undefined : '4 5'}
            />
            <Head x={MAP_AT.x - 8} y={BOTTOM} angle={0} className="fill-zinc-400" />
            <text x={PHOTO_AT.x} y={BOTTOM + 40} className={`fill-zinc-faded ${label}`}>
              {words.down}
            </text>
          </g>
        )}

        {/* Growing back, up the right arm */}
        {cut && deep && (
          <g>
            <path
              d={`M${MAP_AT.x + MAP_SIZE + 8} ${BOTTOM} Q${CUT_AT.x + PANEL / 2} ${BOTTOM} ${CUT_AT.x + PANEL / 2} ${TOP + 16}`}
              className="stroke-zinc-400"
              fill="none"
              strokeWidth={1.5}
            />
            <Head x={CUT_AT.x + PANEL / 2} y={TOP + 10} angle={-90} className="fill-zinc-400" />
            <text x={WIDTH - 8} y={BOTTOM + 40} textAnchor="end" className={`fill-zinc-faded ${label}`}>
              {words.up}
            </text>
          </g>
        )}

        {/* The copy, straight across the top */}
        {cut && copy && (
          <g>
            <line x1={PHOTO_AT.x + PANEL + 10} x2={CUT_AT.x - 14} y1={MIDDLE} y2={MIDDLE} className="stroke-sage" strokeWidth={2} />
            <Head x={CUT_AT.x - 8} y={MIDDLE} angle={0} className="fill-sage" />
            <text x={WIDTH / 2} y={MIDDLE - 10} textAnchor="middle" className={`fill-sage-ink ${label}`}>
              {words.across}
            </text>
          </g>
        )}

        {/* The photo: the more ink a cell has, the more there is drawn there */}
        <text x={PHOTO_AT.x} y={PHOTO_AT.y - 12} className={`fill-zinc-faded ${label}`}>
          {words.photo}
        </text>
        {PHOTO.map((row, r) =>
          row.map((v, c) => (
            <rect
              key={`p${r}-${c}`}
              x={PHOTO_AT.x + c * CELL}
              y={PHOTO_AT.y + r * CELL}
              width={CELL - 1}
              height={CELL - 1}
              rx={1.5}
              className="fill-ink"
              fillOpacity={v ? 0.85 : 0.06}
            />
          )),
        )}

        {/* The deep map: sage where a block holds chair; elsewhere the photo,
            blurred to the block */}
        {map && (
          <g>
            <text x={WIDTH / 2} y={MAP_AT.y + MAP_SIZE + 22} textAnchor="middle" className={`fill-zinc-faded ${label}`}>
              {words.map}
            </text>
            {blocks.slice(0, mapRows).map((row, r) =>
              row.map((v, c) => (
                <rect
                  key={`m${r}-${c}`}
                  x={MAP_AT.x + c * mapCell}
                  y={MAP_AT.y + r * mapCell}
                  width={mapCell - 1.5}
                  height={mapCell - 1.5}
                  rx={2}
                  className={v > 0 ? 'fill-sage' : 'fill-ink'}
                  fillOpacity={v > 0 ? 1 : 0.06 + 0.6 * blur[r][c]}
                />
              )),
            )}
          </g>
        )}

        {/* The cut: sage where it cuts, the photo's ink inset on top */}
        <text x={CUT_AT.x} y={CUT_AT.y - 12} className={`fill-zinc-faded ${label}`}>
          {words.cut}
        </text>
        {PHOTO.map((row, r) =>
          row.map((v, c) => {
            const on = cut !== null && r < cutRows && cut[r][c]
            return (
              <g key={`c${r}-${c}`}>
                <rect
                  x={CUT_AT.x + c * CELL}
                  y={CUT_AT.y + r * CELL}
                  width={CELL - 1}
                  height={CELL - 1}
                  rx={1.5}
                  className={on ? 'fill-sage' : 'fill-ink'}
                  fillOpacity={on ? 1 : 0.06}
                />
                {v > 0 && (
                  <rect
                    x={CUT_AT.x + c * CELL + 2}
                    y={CUT_AT.y + r * CELL + 2}
                    width={CELL - 5}
                    height={CELL - 5}
                    rx={1}
                    className="fill-ink"
                    fillOpacity={0.85}
                  />
                )}
              </g>
            )
          }),
        )}
      </svg>
    </div>
  )
}
