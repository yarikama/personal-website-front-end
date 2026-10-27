import { useMemo } from 'react'
import { EPSILON, MACHINES, meanOf, percent, randomRun, smooth, ucbRun } from './model'

const WIDTH = 640
const LEFT = 44
const RIGHT = 560
// The whole run, smoothed, and under it the first steps, one by one
const MAIN = { top: 24, bottom: 196, from: 1, to: 1000 }
const ZOOM = { top: 262, bottom: 372, from: 1, to: 25 }
const HEIGHT = 410
const LOW = -0.2
const HIGH = 1.7

type Panel = typeof MAIN
const xOf = (panel: Panel, step: number) => LEFT + ((step - panel.from) / (panel.to - panel.from)) * (RIGHT - LEFT)
const yOf = (panel: Panel, reward: number) =>
  panel.bottom - ((Math.max(LOW, Math.min(HIGH, reward)) - LOW) / (HIGH - LOW)) * (panel.bottom - panel.top)

// The first steps as they are; after them, averaged with neighbours so the
// line shows the trend rather than the luck of 500 machines
const RAW = 25
const WINDOW = 21
const settled = (rewards: number[]) => [...rewards.slice(0, RAW), ...smooth(rewards, WINDOW).slice(RAW)]

const path = (panel: Panel, rewards: number[]) =>
  rewards
    .slice(panel.from - 1, panel.to)
    .map((reward, i) => `${i ? 'L' : 'M'}${xOf(panel, panel.from + i).toFixed(1)},${yOf(panel, reward).toFixed(1)}`)
    .join(' ')

function Axes({ panel, ticks, title }: { panel: Panel; ticks: number[]; title: string }) {
  return (
    <g>
      <text x={LEFT} y={panel.top - 10} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
        {title}
      </text>
      {[0, 0.5, 1, 1.5].map((reward) => (
        <g key={reward}>
          <line
            x1={LEFT}
            x2={RIGHT}
            y1={yOf(panel, reward)}
            y2={yOf(panel, reward)}
            className={reward === 0 ? 'stroke-zinc-300 dark:stroke-zinc-200/25' : 'stroke-zinc-200 dark:stroke-zinc-200/10'}
          />
          <text x={LEFT - 8} y={yOf(panel, reward) + 4} textAnchor="end" className="fill-zinc-400 font-mono text-[11px]">
            {reward}
          </text>
        </g>
      ))}
      {ticks.map((step) => (
        <text key={step} x={xOf(panel, step)} y={panel.bottom + 16} textAnchor="middle" className="fill-zinc-400 font-mono text-[11px]">
          {step}
        </text>
      ))}
    </g>
  )
}

// Average reward at each step over 500 machines: UCB with doubt worth `c`,
// against picking at random 1 time in 10 and otherwise the best-looking arm
export default function Curves({ c }: { c: number }) {
  const ucb = useMemo(() => ucbRun(c), [c])
  const random = useMemo(() => randomRun(), [])
  const ucbLine = settled(ucb.reward)
  const randomLine = settled(random.reward)
  const ucbEnd = yOf(MAIN, ucbLine.at(-1)!)
  const randomEnd = yOf(MAIN, randomLine.at(-1)!)
  const nudge = Math.max(0, 14 - Math.abs(ucbEnd - randomEnd)) / 2
  const ucbAbove = ucbEnd <= randomEnd

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`Average reward per step over ${MACHINES} machines: UCB against random exploring, over 1000 steps and over the first 25`}
      >
        <Axes panel={MAIN} ticks={[1, 250, 500, 750, 1000]} title="Average reward, steps 1 to 1000" />
        <path d={path(MAIN, randomLine)} fill="none" className="stroke-ink" strokeWidth={1.75} />
        <path d={path(MAIN, ucbLine)} fill="none" className="stroke-sage" strokeWidth={2} />
        <text
          x={RIGHT + 8}
          y={ucbEnd + 4 + (ucbAbove ? -nudge : nudge)}
          className="fill-sage font-mono text-[11px] uppercase tracking-widest"
        >
          UCB
        </text>
        <text
          x={RIGHT + 8}
          y={randomEnd + 4 + (ucbAbove ? nudge : -nudge)}
          className="fill-ink font-mono text-[11px] tracking-widest"
        >
          ε = {EPSILON}
        </text>
        {/* Where the zoom below is, on the whole run */}
        <rect
          x={xOf(MAIN, 1)}
          y={MAIN.top}
          width={xOf(MAIN, ZOOM.to) - xOf(MAIN, 1)}
          height={MAIN.bottom - MAIN.top}
          className="fill-zinc-400/10"
        />

        <Axes panel={ZOOM} ticks={[1, 5, 11, 15, 20, 25]} title="Steps 1 to 25, one by one" />
        <path d={path(ZOOM, random.reward)} fill="none" className="stroke-ink" strokeWidth={1.5} />
        <path d={path(ZOOM, ucb.reward)} fill="none" className="stroke-sage" strokeWidth={2} />
        {ucb.reward.slice(0, ZOOM.to).map((reward, i) => (
          <circle
            key={i}
            cx={xOf(ZOOM, i + 1)}
            cy={yOf(ZOOM, reward)}
            r={i === 10 ? 4.5 : 2.5}
            className={i === 10 ? 'fill-sage' : 'fill-paper stroke-sage'}
          />
        ))}
      </svg>

      <table className="mt-4 w-full text-left">
        <thead>
          <tr className="font-mono text-[0.8rem] uppercase tracking-widest">
            <th className="w-2/5 pb-1 font-normal" />
            <th className="pb-1 font-normal text-sage">UCB, c = {c}</th>
            <th className="pb-1 font-normal normal-case text-ink">ε = {EPSILON}</th>
          </tr>
        </thead>
        <tbody className="font-serif text-3xl font-light tabular-nums">
          <tr>
            <th className="py-1 pr-2 align-middle font-mono text-[0.8rem] font-normal uppercase tracking-widest text-zinc-faded">
              Average reward
            </th>
            <td className="py-1 text-sage">{meanOf(ucb.reward).toFixed(2)}</td>
            <td className="py-1 text-ink">{meanOf(random.reward).toFixed(2)}</td>
          </tr>
          <tr>
            <th className="py-1 pr-2 align-middle font-mono text-[0.8rem] font-normal uppercase tracking-widest text-zinc-faded">
              Best arm, last 100
            </th>
            <td className="py-1 text-sage">{percent(meanOf(ucb.best, 900))}</td>
            <td className="py-1 text-ink">{percent(meanOf(random.best, 900))}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
