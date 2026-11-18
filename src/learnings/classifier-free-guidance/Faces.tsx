import { lerp, usePlay } from '../../components/explain/useLoop'
import { CARICATURE, CROWD, faceShape, guidedVec, ORDINARY, SAM, TOO_FAR, type Vec } from './model'

const WIDTH = 560
const HEIGHT = 410
// The plane of faces: nose length across, face width up
const PLANE = { left: 30, right: 540, top: 168, bottom: 392 }
const NOSE = { low: -1.1, high: 3.8 }
const BROAD = { low: -2.25, high: 0.85 }
const px = (nose: number) => PLANE.left + ((nose - NOSE.low) / (NOSE.high - NOSE.low)) * (PLANE.right - PLANE.left)
const py = (width: number) => PLANE.bottom - ((width - BROAD.low) / (BROAD.high - BROAD.low)) * (PLANE.bottom - PLANE.top)

const at = (w: number): Vec => guidedVec(ORDINARY, SAM, w)

// How each step walks the arrow: from one multiple of Sam's difference to
// another, at `pace` ms per unit of w
const WALKS: { from: number; to: number; pace: number }[] = [
  { from: 0, to: 0, pace: 0 },
  { from: 0, to: 0, pace: 0 },
  { from: 0, to: 0, pace: 0 },
  { from: 0, to: 1, pace: 1100 },
  { from: 1, to: CARICATURE, pace: 700 },
  { from: CARICATURE, to: TOO_FAR, pace: 330 },
  { from: TOO_FAR, to: TOO_FAR, pace: 0 },
]

const label = 'font-mono text-[11px] uppercase tracking-widest'
// Labels with w in them keep its case
const math = 'font-mono text-[11px] tracking-widest'
const halo = (cased: boolean) => ({
  className: `fill-ink stroke-paper ${cased ? math : label}`,
  strokeWidth: 3,
  paintOrder: 'stroke' as const,
})

// One face, drawn from its two numbers
function Face({ x, y, point, accent }: { x: number; y: number; point: Vec; accent: boolean }) {
  const { halfWidth, nose } = faceShape(point)
  const line = accent ? 'stroke-sage' : 'stroke-ink'
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse rx={halfWidth} ry={26} className={`fill-paper ${line}`} strokeWidth={2} />
      <circle cx={-halfWidth * 0.42} cy={-8} r={2.2} className="fill-ink" />
      <circle cx={halfWidth * 0.42} cy={-8} r={2.2} className="fill-ink" />
      <line x1={0} y1={-5} x2={0} y2={-5 + nose} className={line} strokeWidth={2} strokeLinecap="round" />
      <path
        d={`M ${-halfWidth * 0.45} 14 Q 0 ${19} ${halfWidth * 0.45} 14`}
        className="fill-none stroke-ink"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </g>
  )
}

// The story's street artist: every face drawn so far as a dot in the plane
// of (nose length, face width), the ordinary face in the middle of them,
// Sam's face, the arrow between, and that arrow walked three and ten times,
// with a portrait of each along the top. The last step relabels it all as
// the denoiser's two noise guesses and the guidance scale.
// Give it a `key` per step, so each step plays from its start.
export default function Faces({ step }: { step: number }) {
  const walk = WALKS[step]
  const played = usePlay(1, walk.pace || 1)
  const w = walk.pace ? lerp(walk.from, walk.to, played) : walk.to
  const named = step === 6
  const tip = at(w)

  const portraits: { point: Vec; say: string; named: string; from: number; accent: boolean }[] = [
    { point: ORDINARY, say: 'A face', named: 'No prompt', from: 1, accent: false },
    { point: SAM, say: 'Sam', named: 'Prompt', from: 2, accent: true },
    { point: at(step === 4 ? w : CARICATURE), say: 'Sam × 3', named: 'w = 3', from: 4, accent: true },
    { point: at(step === 5 ? w : TOO_FAR), say: 'Sam × 10', named: 'w = 10', from: 5, accent: true },
  ]
  // Points marked on the line once the walk has passed them
  const marks = [
    { w: CARICATURE, say: '×3', named: 'w = 3', from: 4 },
    { w: TOO_FAR, say: '×10', named: 'w = 10', from: 5 },
  ].filter((m) => step > m.from || (step === m.from && w >= m.w - 1e-9))

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      role="img"
      aria-label={
        named
          ? 'The plane is now two numbers of a noise guess. The ordinary face is the guess without the prompt, Sam the guess with it, and the walks along the arrow are the guidance scale w, at 3 and at 10.'
          : `Faces as dots by nose length and face width. ${step >= 1 ? 'The ordinary face sits in the middle of the crowd.' : ''} ${step >= 2 ? 'Sam has a slightly longer nose and a slightly narrower face.' : ''} ${step >= 3 ? `The arrow from the ordinary face to Sam is walked ${Math.round(w * 10) / 10} times.` : ''}`
      }
    >
      {/* The portraits along the top */}
      {portraits.map((p, i) => {
        const x = 70 + i * 140
        return (
          <g key={i}>
            <rect x={x - 58} y={8} width={116} height={130} rx={14} className="fill-paper stroke-zinc-300 dark:stroke-zinc-200/25" />
            {step >= p.from ? (
              <>
                <Face x={x} y={62} point={p.point} accent={p.accent} />
                <text
                  x={x}
                  y={124}
                  textAnchor="middle"
                  className={`${named && i >= 2 ? math : label} ${p.accent ? 'fill-sage-ink' : 'fill-ink'}`}
                >
                  {named ? p.named : p.say}
                </text>
              </>
            ) : null}
          </g>
        )
      })}

      {/* The plane's axes, through the ordinary face */}
      <line x1={PLANE.left} x2={PLANE.right} y1={py(0)} y2={py(0)} className="stroke-zinc-400" strokeOpacity={0.6} />
      <line x1={px(0)} x2={px(0)} y1={PLANE.top} y2={PLANE.bottom} className="stroke-zinc-400" strokeOpacity={0.6} />
      <text x={PLANE.right} y={py(0) - 8} textAnchor="end" className={`fill-zinc-faded ${label}`}>
        {named ? 'Noise guess, number 1 →' : 'Longer nose →'}
      </text>
      <text x={px(0) + 8} y={PLANE.top + 4} className={`fill-zinc-faded ${label}`}>
        {named ? '↑ Number 2' : '↑ Wider face'}
      </text>

      {/* Every face drawn so far */}
      {CROWD.map((p, i) => (
        <circle key={i} cx={px(p[0])} cy={py(p[1])} r={2.6} className="fill-ink" fillOpacity={0.3} />
      ))}

      {/* The arrow, walked w times */}
      {step >= 3 && w > 0.02 ? (
        <>
          <line x1={px(0)} y1={py(0)} x2={px(tip[0])} y2={py(tip[1])} className="stroke-sage" strokeWidth={2.5} />
          <circle cx={px(tip[0])} cy={py(tip[1])} r={6} className="fill-paper stroke-sage" strokeWidth={2.5} />
        </>
      ) : null}
      {marks.map((m) => {
        const p = at(m.w)
        return (
          <g key={m.w}>
            <circle cx={px(p[0])} cy={py(p[1])} r={4} className="fill-sage" />
            <text
              x={px(p[0]) + (m.w === TOO_FAR ? -4 : 10)}
              y={py(p[1]) + (m.w === TOO_FAR ? 24 : -10)}
              textAnchor={m.w === TOO_FAR ? 'end' : 'start'}
              {...halo(named)}
            >
              {named ? m.named : m.say}
            </text>
          </g>
        )
      })}

      {step >= 1 ? (
        <>
          <circle cx={px(0)} cy={py(0)} r={4.5} className="fill-ink" />
          <text x={px(0) - 10} y={py(0) - 10} textAnchor="end" {...halo(false)}>
            {named ? 'No prompt' : 'A face'}
          </text>
        </>
      ) : null}
      {step >= 2 ? (
        <>
          <circle cx={px(SAM[0])} cy={py(SAM[1])} r={4.5} className="fill-sage" />
          <text x={px(SAM[0]) - 8} y={py(SAM[1]) + 20} textAnchor="end" {...halo(false)}>
            {named ? 'Prompt' : 'Sam'}
          </text>
        </>
      ) : null}
    </svg>
  )
}
