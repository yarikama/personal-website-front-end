import { lerp, usePlay } from '../../components/explain/useLoop'
import { Glyph } from './Glyph'
import {
  AE_BLOBS,
  BETWEEN,
  blobKl,
  decode,
  NUDGED_BLOBS,
  PLANE,
  PLANE_SPOTS,
  practised,
  PRIOR_SPOTS,
  REACH,
  SKETCHES,
  SPOTS,
  VAE_BLOBS,
  type Blob,
  type Vec,
} from './model'

const WIDTH = 560
const HEIGHT = 330
// The plane, on the left
const LEFT = 8
const TOP = 10
const SIZE = 310
const SCALE = SIZE / (2 * PLANE)
const px = (x: number) => LEFT + SIZE / 2 + SCALE * x
const py = (y: number) => TOP + SIZE / 2 - SCALE * y
// What the friend draws, on the right
const PANEL = 346
const TILE = 34
const halo = 'stroke-paper'

export type Scene = 'game' | 'spots' | 'random' | 'nudge' | 'pull' | 'sample' | 'named'

// The blobs grow from points over the first GROW units of the nudge step
const GROW = 12
const PLAYS: Record<Scene, { span: number; pace: number }> = {
  game: { span: 1, pace: 1 },
  spots: { span: 1, pace: 700 },
  random: { span: SPOTS, pace: 90 },
  nudge: { span: GROW + SPOTS, pace: 70 },
  pull: { span: 1, pace: 2000 },
  sample: { span: SPOTS + 6, pace: 90 },
  named: { span: 1, pace: 1 },
}

const ease = (t: number) => t * t * (3 - 2 * t)
const mix = (a: Blob[], b: Blob[], t: number): Blob[] =>
  a.map((blob, k) => ({
    mean: [lerp(blob.mean[0], b[k].mean[0], t), lerp(blob.mean[1], b[k].mean[1], t)],
    sd: lerp(blob.sd, b[k].sd, t),
  }))

// Where a blob's own sketch sits: just outside its reach, toward the middle
// while the blobs keep to the corners, and away from it once they crowd in
function tagAt(blob: Blob): Vec {
  const out = ((REACH * blob.sd) / Math.SQRT2 + 0.42) * (Math.abs(blob.mean[0]) > 1.5 ? -1 : 1)
  return [blob.mean[0] + Math.sign(blob.mean[0]) * out, blob.mean[1] + Math.sign(blob.mean[1]) * out]
}

// The story's plane of spots: four sketches, the spots you give them, and
// what your friend draws from spots you read out. Give it a `key` per step,
// so each step plays from its start.
export default function Plane({ scene }: { scene: Scene }) {
  const { span, pace } = PLAYS[scene]
  const played = usePlay(span, pace)
  const named = scene === 'named'

  // The blobs at this moment
  let blobs: Blob[] = []
  if (scene === 'spots' || scene === 'random') blobs = AE_BLOBS
  else if (scene === 'nudge') blobs = mix(AE_BLOBS, NUDGED_BLOBS, ease(Math.min(1, played / GROW)))
  else if (scene === 'pull') blobs = mix(NUDGED_BLOBS, VAE_BLOBS, ease(played))
  else if (scene === 'sample' || named) blobs = VAE_BLOBS
  const appear = scene === 'spots' ? played : 1

  // The spots read out, as many as have been so far
  const spots = scene === 'random' || scene === 'nudge' ? PLANE_SPOTS : scene === 'sample' || named ? PRIOR_SPOTS : []
  const shown = scene === 'nudge' ? Math.max(0, played - GROW) : scene === 'sample' ? Math.min(SPOTS, played) : named ? SPOTS : played
  const read = spots.slice(0, Math.floor(shown))
  const back = read.filter((z) => practised(z, blobs)).length
  const showBetween = named || (scene === 'sample' && played >= SPOTS + 2)
  const circle = scene === 'pull' ? played : scene === 'sample' || named ? 1 : 0

  const title = {
    game: 'A sketch, two numbers, a sketch',
    spots: 'Four spots',
    random: 'Spots you never used',
    nudge: 'Nudged spots',
    pull: 'Near the middle',
    sample: 'Spots from the middle',
    named: 'The latent space',
  }[scene]
  const note =
    scene === 'game'
      ? ''
      : scene === 'spots'
        ? '4 of 4 redrawn'
        : scene === 'pull'
          ? `penalty ${blobKl(blobs[0]).toFixed(1)} a sketch`
          : `${back} of ${read.length} come back`

  const grid = scene === 'random' || scene === 'nudge' || scene === 'sample' || named

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 font-mono text-[0.875rem] uppercase tracking-widest">
        <span className="text-zinc-faded">{title}</span>
        <span className="text-right text-sage-ink tabular-nums">{note || ' '}</span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-2 w-full"
        role="img"
        aria-label={label(scene, back, read.length)}
      >
        {/* The plane of spots */}
        <rect x={LEFT} y={TOP} width={SIZE} height={SIZE} rx={10} className="fill-paper stroke-zinc-300 dark:stroke-zinc-200/25" />
        <line x1={px(-PLANE)} x2={px(PLANE)} y1={py(0)} y2={py(0)} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
        <line x1={px(0)} x2={px(0)} y1={py(-PLANE)} y2={py(PLANE)} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
        <g className="fill-zinc-faded stroke-paper font-mono text-[11px]" strokeWidth={3} paintOrder="stroke">
          <text x={px(PLANE) - 8} y={py(-PLANE) - 8} textAnchor="end">
            {named ? 'z₁ →' : '1st number →'}
          </text>
          <text x={px(-PLANE) + 8} y={py(PLANE) + 16}>
            {named ? '↑ z₂' : '↑ 2nd number'}
          </text>
        </g>

        {/* Where most spots from the middle fall */}
        {circle > 0 && (
          <circle cx={px(0)} cy={py(0)} r={2 * SCALE} className="fill-none stroke-ink" strokeOpacity={0.55 * circle} strokeDasharray="5 5" strokeWidth={1.5} />
        )}

        {/* Each sketch's blob: as far as its spots reach */}
        {blobs.map((b, k) => (
          <g key={k} opacity={appear}>
            <circle
              cx={px(b.mean[0])}
              cy={py(b.mean[1])}
              r={Math.max(3, REACH * b.sd * SCALE * appear)}
              className="fill-sage stroke-sage"
              fillOpacity={0.2}
              strokeWidth={1.5}
            />
            <circle cx={px(b.mean[0])} cy={py(b.mean[1])} r={3} className="fill-sage" />
          </g>
        ))}
        {blobs.map((b, k) => {
          const [tx, ty] = tagAt(b)
          return (
            <g key={k} opacity={appear}>
              <Glyph pixels={SKETCHES[k].pixels} x={px(tx) - 10} y={py(ty) - 10} cell={4} />
            </g>
          )
        })}

        {/* The spots read out */}
        {read.map((z, i) => {
          const ok = practised(z, blobs)
          return (
            <g key={i} className={ok ? 'stroke-sage' : 'stroke-ink'} strokeWidth={ok ? 2.2 : 1.6}>
              <line x1={px(z[0]) - 4} x2={px(z[0]) + 4} y1={py(z[1]) - 4} y2={py(z[1]) + 4} />
              <line x1={px(z[0]) - 4} x2={px(z[0]) + 4} y1={py(z[1]) + 4} y2={py(z[1]) - 4} />
            </g>
          )
        })}
        {showBetween && <circle cx={px(BETWEEN[0])} cy={py(BETWEEN[1])} r={8} className="fill-none stroke-ink" strokeWidth={2} />}

        {/* The reveal's names, on the same drawing */}
        {named && (
          <g className="font-mono text-[11px]">
            <text x={px(1.45)} y={py(1.45) - 4} className={`fill-ink ${halo}`} strokeWidth={3} paintOrder="stroke">
              N(0, I)
            </text>
            <text x={px(VAE_BLOBS[0].mean[0])} y={py(VAE_BLOBS[0].mean[1] + REACH * VAE_BLOBS[0].sd) - 6} textAnchor="middle" className={`fill-ink ${halo}`} strokeWidth={3} paintOrder="stroke">
              blob μ, σ
            </text>
          </g>
        )}

        {/* What your friend draws */}
        <text x={PANEL} y={TOP + 12} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
          {named ? 'decoder output' : scene === 'game' ? 'the sketches' : 'your friend draws'}
        </text>
        {!grid &&
          SKETCHES.map((s, k) => {
            const drawn = blobs.length ? decode(blobs[k].mean, blobs).pixels : s.pixels
            const x = PANEL + 14 + (k % 2) * 92
            const y = TOP + 40 + Math.floor(k / 2) * 110
            return (
              <g key={k} opacity={scene === 'spots' ? appear : 1}>
                <Glyph pixels={drawn} x={x} y={y} cell={12} />
                <text x={x + 30} y={y + 80} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px]">
                  {s.name}
                </text>
              </g>
            )
          })}
        {grid &&
          read.map((z, i) => {
            const drawn = decode(z, blobs)
            return (
              <Glyph
                key={i}
                pixels={drawn.pixels}
                x={PANEL + 4 + (i % 6) * TILE}
                y={TOP + 30 + Math.floor(i / 6) * TILE}
                cell={5}
                ring={drawn.practised}
              />
            )
          })}
        {grid && showBetween && (
          <g>
            <Glyph pixels={decode(BETWEEN, VAE_BLOBS).pixels} x={PANEL + 4} y={TOP + 210} cell={12} />
            <text x={PANEL + 76} y={TOP + 236} className="fill-ink font-mono text-[11px]">
              from the
            </text>
            <text x={PANEL + 76} y={TOP + 251} className="fill-ink font-mono text-[11px]">
              ringed spot,
            </text>
            <text x={PANEL + 76} y={TOP + 266} className="fill-ink font-mono text-[11px]">
              {named ? 'a new image' : 'a plus'}
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}

function label(scene: Scene, back: number, read: number): string {
  switch (scene) {
    case 'game':
      return 'An empty plane of two-number spots beside four tiny sketches: a vertical bar, a horizontal dash, a slash and a backslash.'
    case 'spots':
      return 'Each sketch gets one spot, in a corner of the plane, and is redrawn exactly from it.'
    case 'random':
      return `Random spots across the plane. ${back} of ${read} fall on a sketch's spot; the rest are drawn as scrambles of grey pixels.`
    case 'nudge':
      return `The four spots grow into small blobs, still far apart in the corners. ${back} of ${read} random spots land in a blob.`
    case 'pull':
      return 'The four blobs slide toward the middle and widen until they overlap inside a dashed circle around the centre.'
    case 'sample':
      return `Spots drawn near the middle. ${back} of ${read} land in a blob and come back as sketches or blends; the spot between the bar and the dash comes back as a plus.`
    case 'named':
      return 'The same plane named: axes z1 and z2, each blob a mean and spread, the dashed circle the standard normal N(0, I), and the decoder output beside it.'
  }
}
