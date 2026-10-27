import { useLoop } from '../../components/explain/useLoop'
import { bonus, played, PULLS } from './model'

const WIDTH = 640
const HEIGHT = 300
const LEFT = 40
const GAP = 58
const at = (arm: number) => LEFT + 24 + arm * GAP
// Values from LOW to HIGH; a bar that reaches past HIGH is cut, with a mark
const LOW = -2.5
const HIGH = 4.5
const TOP = 28
const BOTTOM = 236
const y = (value: number) => BOTTOM - ((Math.max(LOW, Math.min(HIGH, value)) - LOW) / (HIGH - LOW)) * (BOTTOM - TOP)

// The loop, in seconds: the first pulls one at a time, then faster and
// faster up to the last, then a pause on the end
const SLOW = 7
const FAST = 15
const HOLD = 4
const LOOP = SLOW + FAST + HOLD
const FIRST = 14
function pullsAt(seconds: number): number {
  if (seconds < SLOW) return Math.min(FIRST, Math.floor((seconds / SLOW) * FIRST) + 1)
  const k = Math.min(1, (seconds - SLOW) / FAST)
  return Math.round(FIRST + (PULLS - FIRST) * k * k)
}

// One ten-armed machine played by the rule, pull by pull: each arm's score
// (the dot), the doubt stacked on top of it, and the arm pulled.
export default function Arms({ c }: { c: number }) {
  const phase = useLoop(LOOP * 1000, 0.99)
  const { means, pulls } = played(c)
  const t = pullsAt(phase * LOOP)
  const pull = pulls[t - 1]
  // What the rule sees going into the next pull
  const tops = pull.scores.map((score, a) => score + bonus(c, t + 1, pull.tries[a]))
  const next = tops.indexOf(Math.max(...tops))
  const best = means.indexOf(Math.max(...means))
  const total = pulls.slice(0, t).reduce((sum, p) => sum + p.reward, 0)

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 font-mono text-[0.8rem] uppercase tracking-widest">
        <span className="shrink-0 text-zinc-faded">
          Pull <span className="text-ink tabular-nums">{t}</span> of {PULLS}
        </span>
        <span className="text-right text-zinc-faded">
          Average reward <span className="text-ink tabular-nums">{(total / t).toFixed(2)}</span>
        </span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-2 w-full"
        role="img"
        aria-label="Ten arms, each with its estimated value and a doubt bonus on top; the arm pulled is marked"
      >
        {[-2, 0, 2, 4].map((value) => (
          <g key={value}>
            <line
              x1={LEFT}
              x2={WIDTH - 8}
              y1={y(value)}
              y2={y(value)}
              className={value === 0 ? 'stroke-zinc-300 dark:stroke-zinc-200/25' : 'stroke-zinc-200 dark:stroke-zinc-200/10'}
            />
            <text x={LEFT - 8} y={y(value) + 4} textAnchor="end" className="fill-zinc-400 font-mono text-[11px]">
              {value}
            </text>
          </g>
        ))}
        {means.map((mean, arm) => {
          const x = at(arm)
          const tried = pull.tries[arm] > 0
          const score = pull.scores[arm]
          const top = tops[arm]
          const cut = !tried || top > HIGH
          const pulled = pull.arm === arm
          return (
            <g key={arm}>
              {/* The arm's true value, which the rule can't see */}
              <line
                x1={x - 20}
                x2={x + 20}
                y1={y(mean)}
                y2={y(mean)}
                className="stroke-zinc-400"
                strokeWidth={1.5}
                strokeDasharray="3 2"
              />
              {tried && (
                <>
                  {/* The doubt, from the score up to score + bonus */}
                  <rect
                    x={x - 12}
                    width={24}
                    y={y(top)}
                    height={Math.max(0, y(score) - y(top))}
                    className="fill-sage/20"
                  />
                  <line
                    x1={x - 16}
                    x2={x + 16}
                    y1={y(top)}
                    y2={y(top)}
                    className="stroke-sage"
                    strokeWidth={next === arm ? 3.5 : 1.5}
                  />
                  {/* The score */}
                  <circle cx={x} cy={y(score)} r={5.5} className={pulled ? 'fill-sage' : 'fill-ink'} />
                </>
              )}
              {cut && (
                <path
                  d={`M${x - 8},${TOP - 4} L${x},${TOP - 12} L${x + 8},${TOP - 4}`}
                  fill="none"
                  className="stroke-sage"
                  strokeWidth={2}
                />
              )}
              <text
                x={x}
                y={BOTTOM + 22}
                textAnchor="middle"
                className={`font-mono text-[13px] ${arm === best ? 'fill-ink' : 'fill-zinc-faded'}`}
              >
                {arm + 1}
                {arm === best ? '★' : ''}
              </text>
              <text x={x} y={BOTTOM + 40} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px] tabular-nums">
                {pull.tries[arm] || '–'}
              </text>
              {pulled && <circle cx={x} cy={BOTTOM + 52} r={4} className="fill-sage" />}
            </g>
          )
        })}
        <text x={LEFT - 8} y={BOTTOM + 22} textAnchor="end" className="fill-zinc-400 font-mono text-[10px] uppercase">
          arm
        </text>
        <text x={LEFT - 8} y={BOTTOM + 40} textAnchor="end" className="fill-zinc-400 font-mono text-[10px] uppercase">
          N
        </text>
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 font-mono text-[0.75rem] uppercase tracking-widest text-zinc-faded">
        <span>
          <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-ink align-middle" />
          Score Q
        </span>
        <span>
          <span className="mr-2 inline-block h-2.5 w-3 border-t-2 border-sage bg-sage/20 align-middle" />
          Doubt bonus
        </span>
        <span>
          <span className="mr-2 inline-block w-4 border-t-2 border-dashed border-zinc-400 align-middle" />
          True value
        </span>
        <span>
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-sage align-middle" />
          Just pulled
        </span>
      </div>
    </div>
  )
}
