import { lerp, useLoop, usePlay, within } from '../../components/explain/useLoop'
import { COOKS, FULL_PLATES, KITCHEN_P, NIGHTS, ROTA, ROTA_PLATES, scaleOf } from './model'

export type Show = 'kitchen' | 'habit' | 'new' | 'off' | 'nights' | 'shares' | 'named'

const WIDTH = 480
const HEIGHT = 320
const ORDER_X = 58
const ORDER_Y = [110, 170, 230]
const COOK_X = 246
const COOK_Y = COOKS.map((_, i) => 50 + i * 48)
const COOK_R = 18
const PASS = { x: 420, y: 170, w: 84, h: 64 }
const ELI = 4
const FAY = 5
// Real milliseconds a practice night is shown for
const NIGHT_MS = 1400

const caps = 'font-mono text-[11px] uppercase tracking-widest'
const mono = 'font-mono text-[11px]'
const halo = { className: `fill-ink stroke-paper ${mono}`, strokeWidth: 3, paintOrder: 'stroke' as const }

const share = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1))

// A kitchen drawn as a network: orders on the left, six cooks, and the pass
// where plates go out. It plays by itself: orders flow to the cooks who are
// in, plates flow to the pass. On the practice-night steps it runs through
// the rota, night by night, and stops on the last.
export default function Kitchen({ show }: { show: Show }) {
  const phase = useLoop(2400, 0.75)
  const practice = show === 'off' || show === 'nights' || show === 'shares'
  const played = usePlay(NIGHTS - 1, NIGHT_MS)
  const night = show === 'off' ? 0 : practice ? Math.min(NIGHTS - 1, Math.floor(played + 0.0001)) : -1
  const inTonight = night >= 0 ? ROTA[night] : COOKS.map(() => true)
  const habit = show === 'habit' || show === 'new'
  const named = show === 'named'
  const scale = show === 'shares' ? scaleOf(KITCHEN_P) : 1
  const here = inTonight.filter(Boolean).length
  // A practice night before the shares: one plate a cook, so fewer plates
  const plates = show === 'shares' ? ROTA_PLATES[night] : practice ? here : FULL_PLATES
  const average = show === 'shares' ? ROTA_PLATES.slice(0, night + 1).reduce((a, b) => a + b, 0) / (night + 1) : FULL_PLATES

  // Orders travel in the first half of the loop, plates in the second
  const toCooks = within(phase, 0, 0.45)

  const left = named ? 'Test time' : show === 'new' ? 'A new dish' : practice ? `Practice night ${night + 1}/${NIGHTS}` : 'Every night'
  const right =
    show === 'new'
      ? 'Sent back: too bland'
      : show === 'shares'
        ? `${plates} plates · average ${share(average)}`
        : practice
          ? `${here} of ${COOKS.length} cooks in`
          : named
            ? `All ${COOKS.length} units in, ×1`
            : `${FULL_PLATES} plates out`

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 font-mono text-[0.875rem] uppercase tracking-widest">
        <span className="shrink-0 text-zinc-faded">{left}</span>
        <span className={`text-right ${show === 'new' ? 'text-ink' : 'text-sage-ink'}`}>{right}</span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mx-auto mt-2 w-full max-w-[32rem]"
        role="img"
        aria-label={
          named
            ? 'The kitchen relabelled as a network: inputs on the left, six hidden units, and the next layer on the right'
            : 'Orders flow to six cooks, and plates flow from the cooks to the pass'
        }
      >
        {/* Column names */}
        {[
          [ORDER_X, named ? 'Inputs' : 'Orders'],
          [COOK_X, named ? 'Hidden units' : 'Cooks'],
          [PASS.x, named ? 'Next layer' : 'Pass'],
        ].map(([x, name]) => (
          <text key={name} x={x} y={16} textAnchor="middle" className={`fill-zinc-faded ${caps}`}>
            {name}
          </text>
        ))}

        {/* Edges: every order to every cook who is in, every cook in to the pass */}
        {COOK_Y.map((cy, k) =>
          inTonight[k] ? (
            <g key={k}>
              {ORDER_Y.map((oy) => (
                <line
                  key={oy}
                  x1={ORDER_X + 32}
                  y1={oy}
                  x2={COOK_X - COOK_R}
                  y2={cy}
                  className="stroke-zinc-300"
                  strokeWidth={1}
                />
              ))}
              <line x1={COOK_X + COOK_R} y1={cy} x2={PASS.x - PASS.w / 2} y2={PASS.y} className="stroke-sage" strokeOpacity={0.6} strokeWidth={1.5} />
            </g>
          ) : null,
        )}

        {/* Orders */}
        {ORDER_Y.map((oy, j) => (
          <g key={oy}>
            <rect x={ORDER_X - 32} y={oy - 15} width={64} height={30} rx={8} className="fill-paper stroke-ink" strokeOpacity={0.6} strokeWidth={1.2} />
            <text x={ORDER_X} y={oy + 4} textAnchor="middle" className={`fill-ink ${mono}`}>
              {named ? `x${'₁₂₃'[j]}` : `Order ${j + 1}`}
            </text>
          </g>
        ))}

        {/* Orders on their way to the cooks */}
        {toCooks !== null &&
          COOK_Y.map((cy, k) =>
            inTonight[k]
              ? ORDER_Y.map((oy) => (
                  <circle
                    key={`${k}-${oy}`}
                    cx={lerp(ORDER_X + 32, COOK_X - COOK_R, toCooks)}
                    cy={lerp(oy, cy, toCooks)}
                    r={3}
                    className="fill-ink"
                    fillOpacity={0.7}
                  />
                ))
              : null,
          )}

        {/* The habit: Fay waters down whatever Eli sends */}
        {habit && (
          <g>
            <path
              d={`M ${COOK_X + COOK_R - 2} ${COOK_Y[ELI] + 8} C ${COOK_X + 52} ${COOK_Y[ELI] + 14}, ${COOK_X + 52} ${COOK_Y[FAY] - 14}, ${COOK_X + COOK_R - 2} ${COOK_Y[FAY] - 8}`}
              className="fill-none stroke-ink"
              strokeWidth={1.8}
              markerEnd="url(#dropout-arrow)"
            />
            <text x={COOK_X + 50} y={(COOK_Y[ELI] + COOK_Y[FAY]) / 2 + 4} {...halo}>
              Fay waters it down
            </text>
          </g>
        )}
        <defs>
          <marker id="dropout-arrow" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={6} markerHeight={6} orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" className="fill-ink" />
          </marker>
        </defs>

        {/* Cooks */}
        {COOKS.map((name, k) => {
          const cy = COOK_Y[k]
          const isIn = inTonight[k]
          return (
            <g key={name}>
              <circle
                cx={COOK_X}
                cy={cy}
                r={COOK_R}
                className={isIn ? 'fill-sage stroke-sage' : 'fill-paper stroke-ink'}
                fillOpacity={isIn ? 0.25 : 1}
                strokeOpacity={isIn ? 1 : 0.4}
                strokeDasharray={isIn ? undefined : '3 3'}
                strokeWidth={1.5}
              />
              <text x={COOK_X} y={cy + 4} textAnchor="middle" className={`${isIn ? 'fill-ink' : 'fill-zinc-faded'} ${mono}`}>
                {name}
              </text>
              {!isIn && (
                <text x={COOK_X - COOK_R - 6} y={cy + 4} textAnchor="end" className={`fill-zinc-faded ${mono}`}>
                  home
                </text>
              )}
              {isIn && (show === 'shares' || named) && (
                <text x={COOK_X + COOK_R + 6} y={cy - 8} {...halo}>
                  ×{share(scale)}
                </text>
              )}
            </g>
          )
        })}

        {/* Plates on their way to the pass */}
        {/* One plate a cook, or two on a practice night with shares */}
        {COOK_Y.map((cy, k) =>
          inTonight[k]
            ? Array.from({ length: Math.round(scale) }, (_, j) => {
                const t = within(phase, 0.5 + 0.1 * j, 0.85 + 0.1 * j)
                return t === null ? null : (
                  <circle
                    key={`${k}-${j}`}
                    cx={lerp(COOK_X + COOK_R, PASS.x - PASS.w / 2, t)}
                    cy={lerp(cy, PASS.y, t)}
                    r={5}
                    className="fill-sage stroke-paper"
                    strokeWidth={1.5}
                  />
                )
              })
            : null,
        )}

        {/* The pass */}
        <rect
          x={PASS.x - PASS.w / 2}
          y={PASS.y - PASS.h / 2}
          width={PASS.w}
          height={PASS.h}
          rx={12}
          className="fill-paper stroke-ink"
          strokeWidth={show === 'new' ? 2.5 : 1.2}
        />
        <text x={PASS.x} y={PASS.y + 2} textAnchor="middle" className="fill-ink font-serif text-[24px]">
          {show === 'new' ? '✗' : plates}
        </text>
        <text x={PASS.x} y={PASS.y + 20} textAnchor="middle" className={`fill-zinc-faded ${mono}`}>
          {show === 'new' ? 'sent back' : named ? 'sum' : 'plates'}
        </text>
      </svg>
    </div>
  )
}
