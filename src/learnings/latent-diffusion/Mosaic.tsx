import { useRef, useState } from 'react'
import { useAnimationFrame } from 'motion/react'
import { usePrefersReducedMotion } from '../../hooks'
import {
  afterPass,
  FLOOR,
  FLOOR_NOISE,
  FLOOR_TILES,
  grouped,
  NOTES,
  PASSES,
  pct,
  PLAN_NOISE,
  PLAN_NOTES,
  SIDE,
  STORY,
  STORY_F,
  STORY_PLAN_IMAGES,
  type Grid,
} from './model'
import { Arrow, Tag, TileGrid } from './Tiles'

export type Show = 'floor' | 'floor-passes' | 'encode' | 'decode' | 'plan-passes' | 'compare' | 'named'

const WIDTH = 560
const HEIGHT = 244
// The three places: the floor, the plan, the floor laid from the plan
const CELL = 4
const FLOOR_X = 12
const REBUILT_X = 420
const TOP = 44
// The floors sit level with the middle of the plan
const FLOOR_TOP = TOP + 3
const MINI = 7
const MINI_GAP = 16
// Real milliseconds per pass
const PASS_MS = 60

const PLAN_SIDE = SIDE / STORY_F
const PLAN_WIDTH = 2 * PLAN_SIDE * MINI + MINI_GAP

// The plan: its four notes, each a small grid of 8 by 8 patches
function PlanGrids({ images, x, y }: { images: Grid[]; x: number; y: number }) {
  const size = PLAN_SIDE * MINI
  return (
    <g>
      {images.map((grid, k) => {
        const gx = x + (k % 2) * (size + MINI_GAP)
        const gy = y + Math.floor(k / 2) * (size + 22)
        return (
          <g key={k}>
            <TileGrid grid={grid} x={gx} y={gy} cell={MINI} />
            <text x={gx + size / 2} y={gy + size + 13} textAnchor="middle" className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
              {NOTES[k]}
            </text>
          </g>
        )
      })}
    </g>
  )
}

// Counts passes from 0 to PASSES while `running`; jumps to the end with
// reduced motion
function usePasses(running: boolean) {
  const reducedMotion = usePrefersReducedMotion()
  const started = useRef<number | null>(null)
  const [pass, setPass] = useState(running && !reducedMotion ? 0 : PASSES)
  useAnimationFrame((time) => {
    if (!running || pass >= PASSES) return
    started.current ??= time
    const next = Math.min(PASSES, Math.floor((time - started.current) / PASS_MS))
    if (next !== pass) setPass(next)
  })
  return pass
}

// The story's figure: a mosaic floor, fixed over fifty passes tile by tile,
// then summed up in a small plan, fixed on the plan, and laid once.
export default function Mosaic({ show }: { show: Show }) {
  const pass = usePasses(show === 'floor-passes' || show === 'plan-passes')
  const named = show === 'named'
  const plan = STORY.plan.notes.length
  const floorWidth = SIDE * CELL
  const planX = (FLOOR_X + floorWidth + REBUILT_X) / 2 - PLAN_WIDTH / 2

  if (show === 'floor' || show === 'floor-passes') {
    const big = 5.5
    const x = (WIDTH - SIDE * big) / 2
    const grid = show === 'floor' ? FLOOR : afterPass(FLOOR, FLOOR_NOISE, pass)
    return (
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={show === 'floor' ? 'A mosaic floor of 32 by 32 grey tiles: a soft sun over a grainy hill' : `The floor fixed pass by pass, ${pass} of ${PASSES} passes done`}>
        <Tag x={WIDTH / 2} y={22}>
          {show === 'floor' ? `The floor · ${SIDE} × ${SIDE} tiles` : `Pass ${pass} of ${PASSES}`}
        </Tag>
        <TileGrid grid={grid} x={x} y={34} cell={big} />
        {show === 'floor-passes' && (
          <Tag x={WIDTH / 2} y={34 + SIDE * big + 24} strong>
            {grouped(pass * FLOOR_TILES)} tiles touched
          </Tag>
        )}
      </svg>
    )
  }

  const showFloor = show === 'encode' || show === 'decode' || show === 'compare' || named
  const showRebuilt = show === 'decode' || show === 'compare' || named || (show === 'plan-passes' && pass >= PASSES)
  const planImages = show === 'plan-passes' ? STORY_PLAN_IMAGES.map((g, k) => afterPass(g, PLAN_NOISE[k], pass)) : STORY_PLAN_IMAGES
  const middle = FLOOR_TOP + floorWidth / 2

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      role="img"
      aria-label={
        named
          ? 'An image goes through the encoder into a latent of 8 by 8 by 4 numbers, where the denoising steps run, and the decoder turns the latent back into an image'
          : `The floor, the tiler's plan of ${PLAN_NOTES} notes, and the floor laid from the plan`
      }
    >
      {showFloor && (
        <g>
          <Tag x={FLOOR_X + floorWidth / 2} y={TOP - 14} strong={named}>
            {named ? 'Image' : 'The floor'}
          </Tag>
          <TileGrid grid={FLOOR} x={FLOOR_X} y={FLOOR_TOP} cell={CELL} />
          <Arrow x1={FLOOR_X + floorWidth + 6} x2={planX - 8} y={middle} label={named ? 'Encoder' : 'Sum up'} />
        </g>
      )}

      <Tag x={planX + PLAN_WIDTH / 2} y={TOP - 14} strong={named}>
        {named ? `Latent · ${plan}×${plan}×${NOTES.length}` : show === 'plan-passes' ? `Pass ${pass} of ${PASSES}` : `The plan · ${PLAN_NOTES} notes`}
      </Tag>
      <PlanGrids images={planImages} x={planX} y={TOP} />

      {showRebuilt && (
        <g>
          <Arrow x1={planX + PLAN_WIDTH + 8} x2={REBUILT_X - 6} y={middle} label={named ? 'Decoder' : 'Lay'} />
          <Tag x={REBUILT_X + floorWidth / 2} y={TOP - 14} strong={named}>
            {named ? 'Image' : 'The new floor'}
          </Tag>
          <TileGrid grid={STORY.floor} x={REBUILT_X} y={FLOOR_TOP} cell={CELL} />
        </g>
      )}

      <g>
        {show === 'encode' && (
          <Tag x={WIDTH / 2} y={HEIGHT - 16} strong>
            {grouped(FLOOR_TILES)} tiles → {grouped(PLAN_NOTES)} notes
          </Tag>
        )}
        {show === 'plan-passes' && (
          <>
            <Tag x={WIDTH / 2} y={HEIGHT - 34} strong>
              {grouped(pass * PLAN_NOTES)} notes touched{pass >= PASSES ? ', then laid once' : ''}
            </Tag>
            <Tag x={WIDTH / 2} y={HEIGHT - 14}>
              Tile by tile: {grouped(PASSES * FLOOR_TILES)}
            </Tag>
          </>
        )}
        {show === 'compare' && (
          <Tag x={WIDTH / 2} y={HEIGHT - 16} strong>
            Off by {pct(STORY.close)} up close · {pct(STORY.far)} from across the room
          </Tag>
        )}
        {named && (
          <Tag x={planX + PLAN_WIDTH / 2} y={HEIGHT - 16} strong>
            {PASSES} denoising steps run here
          </Tag>
        )}
      </g>
    </svg>
  )
}
