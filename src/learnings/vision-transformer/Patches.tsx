import { Readout } from '../../components/explain/figure'
import { BASE, patchCount, patchNumbers, PICTURE, scoreCount, SIDE, tokenCount } from './model'

const BOX = 220
const AT = { x: 10, y: 10 }

const big = (n: number) => n.toLocaleString('en-US')
const times = (x: number) => (x >= 10 ? `${Math.round(x)}×` : x >= 1 ? `${x.toFixed(1)}×` : `${x.toFixed(2)}×`)

// A square picture `side` pixels wide cut into `patch`-pixel patches: the
// grid drawn over a faint house, one patch in sage, and what the encoder
// then has to read and score.
export default function Patches({ side, patch }: { side: number; patch: number }) {
  const across = side / patch
  const step = BOX / across
  const pixel = BOX / SIDE
  const scores = scoreCount(side, patch)

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-10">
      <svg
        viewBox={`0 0 ${BOX + 2 * AT.x} ${BOX + 2 * AT.y + 16}`}
        className="w-full max-w-[16rem] shrink-0"
        role="img"
        aria-label={`A ${side} by ${side} picture cut into ${across} by ${across} patches of ${patch} pixels: ${patchCount(
          side,
          patch,
        )} patches.`}
      >
        {PICTURE.map((row, r) =>
          row.map((value, c) =>
            value === 0 ? null : (
              <rect
                key={`${r}-${c}`}
                x={AT.x + c * pixel}
                y={AT.y + r * pixel}
                width={pixel}
                height={pixel}
                className="fill-ink"
                fillOpacity={value * 0.3}
              />
            ),
          ),
        )}
        {Array.from({ length: across + 1 }, (_, i) => (
          <g key={i}>
            <line
              x1={AT.x + i * step}
              x2={AT.x + i * step}
              y1={AT.y}
              y2={AT.y + BOX}
              className="stroke-ink"
              strokeOpacity={0.35}
              strokeWidth={0.6}
            />
            <line
              x1={AT.x}
              x2={AT.x + BOX}
              y1={AT.y + i * step}
              y2={AT.y + i * step}
              className="stroke-ink"
              strokeOpacity={0.35}
              strokeWidth={0.6}
            />
          </g>
        ))}
        <rect x={AT.x} y={AT.y} width={step} height={step} className="fill-sage stroke-sage" fillOpacity={0.35} strokeWidth={1.5} />
        <text x={AT.x + BOX / 2} y={AT.y + BOX + 14} textAnchor="middle" className="fill-zinc-faded font-mono text-[10px]">
          {across} × {across} patches of {patch} px
        </text>
      </svg>
      <div className="grid w-full grid-cols-2 gap-x-6 gap-y-5">
        <Readout label="Tokens" value={big(tokenCount(side, patch))} accent />
        <Readout label="Numbers per patch" value={big(patchNumbers(patch))} />
        <Readout label="Scores per head" value={big(scores)} />
        <Readout label={`vs ${BASE.side}, ${BASE.patch} px`} value={times(scores / scoreCount(BASE.side, BASE.patch))} />
      </div>
    </div>
  )
}
