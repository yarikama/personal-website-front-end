import { useMemo } from 'react'
import { useLoop } from '../../components/explain/useLoop'
import { meanOf, percent, shown, signsFor, smooth, STEPS } from './model'

const WIDTH = 640
const HEIGHT = 390
// The machines along the top
const BOX_Y = 8
const BOX_H = 112
// The chart under them
const LEFT = 44
const RIGHT = 548
const TOP = 160
const BOTTOM = 344
const WINDOW = 25
// How long each machine stays up in the drawing, in ms
const BEAT = 700

const x = (step: number) => LEFT + (step / (STEPS - 1)) * (RIGHT - LEFT)
const y = (share: number) => BOTTOM - share * (BOTTOM - TOP)
const line = (shares: number[]) =>
  smooth(shares, WINDOW)
    .map((share, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(share).toFixed(1)}`)
    .join(' ')

// The sign a machine shows: a different shape for each, centred on (cx, cy)
function Sign({ sign, cx, cy, r, className }: { sign: number; cx: number; cy: number; r: number; className: string }) {
  const points = (corners: [number, number][]) => corners.map(([px, py]) => `${cx + px * r},${cy + py * r}`).join(' ')
  switch (sign % 8) {
    case 0:
      return <circle cx={cx} cy={cy} r={r * 0.9} className={className} />
    case 1:
      return <polygon points={points([[0, -1], [0.95, 0.75], [-0.95, 0.75]])} className={className} />
    case 2:
      return <rect x={cx - r * 0.8} y={cy - r * 0.8} width={r * 1.6} height={r * 1.6} className={className} />
    case 3:
      return <polygon points={points([[0, -1.05], [1, 0], [0, 1.05], [-1, 0]])} className={className} />
    case 4:
      return <polygon points={points([[0, 1], [0.95, -0.75], [-0.95, -0.75]])} className={className} />
    case 5:
      return (
        <polygon
          points={points([[-0.3, -1], [0.3, -1], [0.3, -0.3], [1, -0.3], [1, 0.3], [0.3, 0.3], [0.3, 1], [-0.3, 1], [-0.3, 0.3], [-1, 0.3], [-1, -0.3], [-0.3, -0.3]])}
          className={className}
        />
      )
    case 6:
      return <polygon points={points([[-0.5, -0.9], [0.5, -0.9], [1, 0], [0.5, 0.9], [-0.5, 0.9], [-1, 0]])} className={className} />
    default:
      return (
        <polygon
          points={points(
            Array.from({ length: 10 }, (_, i) => {
              const angle = -Math.PI / 2 + (i * Math.PI) / 5
              const reach = i % 2 ? 0.45 : 1.05
              return [reach * Math.cos(angle), reach * Math.sin(angle)] as [number, number]
            })
          )}
          className={className}
        />
      )
  }
}

// Several slot machines, one of them up at each step, its sign showing
// which; then, over 1000 steps, the share of runs that pulled the best arm
// of the machine they faced: keeping one table of scores, against a table
// per sign
export default function Signs({ count }: { count: number }) {
  const one = signsFor(count, false)
  const per = signsFor(count, true)
  const machines = useMemo(() => shown(count), [count])
  const phase = useLoop(machines.order.length * BEAT, 0.02)
  const up = machines.order[Math.min(machines.order.length - 1, Math.floor(phase * machines.order.length))]

  const slot = WIDTH / count
  const boxW = Math.min(150, slot - 14)
  const barW = (boxW - 16) / 10

  const oneEnd = y(smooth(one.best, WINDOW).at(-1)!)
  const perEnd = y(smooth(per.best, WINDOW).at(-1)!)
  const nudge = Math.max(0, 16 - Math.abs(oneEnd - perEnd)) / 2
  const perAbove = perEnd <= oneEnd

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`${count} slot machine${count > 1 ? 's' : ''}, each with its own best arm, and the share of runs pulling the best arm over 1000 steps, keeping one table against a table per sign`}
      >
        {machines.means.map((arms, m) => {
          const cx = slot * m + slot / 2
          const left = cx - boxW / 2
          const isUp = m === up
          const top = machines.tops[m]
          return (
            <g key={m} opacity={isUp ? 1 : 0.45}>
              <rect
                x={left}
                y={BOX_Y}
                width={boxW}
                height={BOX_H}
                className={isUp ? 'fill-paper stroke-sage' : 'fill-paper stroke-zinc-300 dark:stroke-zinc-200/25'}
                strokeWidth={isUp ? 2.5 : 1.5}
              />
              <Sign sign={m} cx={cx} cy={BOX_Y + 22} r={10} className={isUp ? 'fill-sage' : 'fill-zinc-400'} />
              <line x1={left + 6} x2={left + boxW - 6} y1={BOX_Y + 76} y2={BOX_Y + 76} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
              {arms.map((mean, a) => {
                const height = Math.max(-2.6, Math.min(2.6, mean)) * 13
                return (
                  <rect
                    key={a}
                    x={left + 8 + a * barW + 0.5}
                    y={height > 0 ? BOX_Y + 76 - height : BOX_Y + 76}
                    width={barW - 1}
                    height={Math.max(1, Math.abs(height))}
                    className={a === top ? 'fill-sage' : 'fill-zinc-400'}
                  />
                )
              })}
            </g>
          )
        })}

        {/* The chart: share pulling the best arm of the machine that's up */}
        {[0, 0.25, 0.5, 0.75, 1].map((share) => (
          <g key={share}>
            <line x1={LEFT} x2={RIGHT} y1={y(share)} y2={y(share)} className="stroke-zinc-200 dark:stroke-zinc-200/10" />
            <text x={LEFT - 8} y={y(share) + 4} textAnchor="end" className="fill-zinc-400 font-mono text-[12px]">
              {percent(share)}
            </text>
          </g>
        ))}
        {[0, 250, 500, 750, STEPS - 1].map((step) => (
          <text key={step} x={x(step)} y={BOTTOM + 18} textAnchor="middle" className="fill-zinc-400 font-mono text-[12px]">
            {step + 1}
          </text>
        ))}
        <text x={(LEFT + RIGHT) / 2} y={HEIGHT - 6} textAnchor="middle" className="fill-zinc-faded font-mono text-[12px] uppercase tracking-widest">
          Step · share pulling the best arm
        </text>
        <path d={line(one.best)} fill="none" className="stroke-ink" strokeWidth={2} />
        <path d={line(per.best)} fill="none" className="stroke-sage" strokeWidth={2} />
        <text x={RIGHT + 8} y={oneEnd + 4 + (perAbove ? nudge : -nudge)} className="fill-ink font-mono text-[12px] uppercase tracking-widest">
          One table
        </text>
        <text x={RIGHT + 8} y={perEnd + 4 + (perAbove ? -nudge : nudge)} className="fill-sage font-mono text-[12px] uppercase tracking-widest">
          Per sign
        </text>
      </svg>

      <table className="mt-4 w-full text-left">
        <thead>
          <tr className="font-mono text-[0.8rem] uppercase tracking-widest">
            <th className="w-2/5 pb-1 font-normal" />
            <th className="pb-1 font-normal text-ink">One table</th>
            <th className="pb-1 font-normal text-sage">Table per sign</th>
          </tr>
        </thead>
        <tbody className="font-serif text-3xl font-light tabular-nums">
          <tr>
            <th className="py-1 pr-2 align-middle font-mono text-[0.8rem] font-normal uppercase tracking-widest text-zinc-faded">
              Best arm, last 100 steps
            </th>
            <td className="py-1 text-ink">{percent(meanOf(one.best, STEPS - 100))}</td>
            <td className="py-1 text-sage">{percent(meanOf(per.best, STEPS - 100))}</td>
          </tr>
          <tr>
            <th className="py-1 pr-2 align-middle font-mono text-[0.8rem] font-normal uppercase tracking-widest text-zinc-faded">
              Reward, last 100 steps
            </th>
            <td className="py-1 text-ink">{meanOf(one.reward, STEPS - 100).toFixed(2)}</td>
            <td className="py-1 text-sage">{meanOf(per.reward, STEPS - 100).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
