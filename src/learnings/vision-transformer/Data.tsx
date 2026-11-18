import { MODELS, SETS } from './model'

const WIDTH = 360
const HEIGHT = 240
const PLOT = { left: 40, right: 340, top: 44, bottom: 180 }
const LOW = 76
const HIGH = 88
const TICKS = [76, 80, 84, 88]

const x = (i: number) => PLOT.left + 30 + (i * (PLOT.right - PLOT.left - 60)) / (SETS.length - 1)
const y = (accuracy: number) => PLOT.bottom - ((accuracy - LOW) / (HIGH - LOW)) * (PLOT.bottom - PLOT.top)

// How the series are drawn: ViT-B/16 in ink, ViT-L/16, the one to watch, in sage
const LOOK = [
  { line: 'stroke-ink', dot: 'fill-ink', opacity: 0.55 },
  { line: 'stroke-sage', dot: 'fill-sage', opacity: 1 },
]
// The values printed: only at the two ends, where the lines cross over
const PRINTED = [0, SETS.length - 1]

// ImageNet accuracy of two ViT sizes against the set they were pre-trained
// on, from the paper's Table 5
export default function Data() {
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="mx-auto w-full max-w-lg"
      role="img"
      aria-label={`ImageNet accuracy after pre-training on ${SETS.map((s) => s.name).join(', ')}: ${MODELS.map(
        (m) => `${m.name} ${m.accuracy.join('%, ')}%`,
      ).join('; ')}.`}
    >
      {/* The legend */}
      {MODELS.map((model, s) => (
        <g key={model.name} transform={`translate(${PLOT.left} ${8 + s * 14})`}>
          <line x1={0} x2={16} y1={0} y2={0} className={LOOK[s].line} strokeOpacity={LOOK[s].opacity} strokeWidth={2} />
          <circle cx={8} cy={0} r={4} className={LOOK[s].dot} fillOpacity={LOOK[s].opacity} />
          <text x={22} y={4} className="fill-ink font-mono text-[10px]">
            {model.name}, {model.weights} weights
          </text>
        </g>
      ))}

      {TICKS.map((t) => (
        <g key={t}>
          <line x1={PLOT.left} x2={PLOT.right} y1={y(t)} y2={y(t)} className="stroke-zinc-300 dark:stroke-zinc-200/25" strokeWidth={0.75} />
          <text x={PLOT.left - 6} y={y(t) + 3.5} textAnchor="end" className="fill-zinc-faded font-mono text-[10px]">
            {t}%
          </text>
        </g>
      ))}

      {MODELS.map((model, s) => (
        <g key={model.name}>
          <polyline
            points={model.accuracy.map((a, i) => `${x(i)},${y(a)}`).join(' ')}
            className={`fill-none ${LOOK[s].line}`}
            strokeOpacity={LOOK[s].opacity}
            strokeWidth={2}
          />
          {model.accuracy.map((a, i) => (
            <g key={i}>
              <circle cx={x(i)} cy={y(a)} r={4.5} className={`${LOOK[s].dot} stroke-paper`} fillOpacity={LOOK[s].opacity} strokeWidth={2}>
                <title>{`${model.name}, pre-trained on ${SETS[i].name}: ${a}%`}</title>
              </circle>
              {PRINTED.includes(i) && (
                <text
                  x={x(i) + (i === 0 ? -9 : 9)}
                  y={y(a) + 3.5}
                  textAnchor={i === 0 ? 'end' : 'start'}
                  className="fill-ink stroke-paper font-mono text-[10px]"
                  strokeWidth={3}
                  paintOrder="stroke"
                >
                  {a.toFixed(1)}
                </text>
              )}
            </g>
          ))}
        </g>
      ))}

      {SETS.map((set, i) => (
        <g key={set.name}>
          <text x={x(i)} y={PLOT.bottom + 22} textAnchor="middle" className="fill-ink font-mono text-[10px]">
            {set.name}
          </text>
          <text x={x(i)} y={PLOT.bottom + 36} textAnchor="middle" className="fill-zinc-faded font-mono text-[10px]">
            {set.images} images
          </text>
        </g>
      ))}
      <text x={(PLOT.left + PLOT.right) / 2} y={HEIGHT - 4} textAnchor="middle" className="fill-zinc-faded font-mono text-[10px]">
        pre-trained on
      </text>
    </svg>
  )
}
