import { motion } from 'motion/react'
import { usePrefersReducedMotion } from '../../hooks'
import { COFFEE, mean, percentile } from './model'

const WIDTH = 560
const HEIGHT = 270
const LEFT = 30
const BASE = 226
const TALLEST = 172
const MOST = 20
const BAR = 34
const GAP = 14
// The story's last step reads minutes as milliseconds of a server's answers
const MS_PER_MINUTE = 50

const height = (value: number) => (value / MOST) * TALLEST
const barX = (slot: number) => LEFT + slot * (BAR + GAP)

const average = mean(COFFEE)
const median = percentile(COFFEE, 0.5)
const p90 = percentile(COFFEE, 0.9)
// Each order's place once the line is sorted, shortest wait first
const rank = COFFEE.map((value, i) => COFFEE.filter((other, j) => other < value || (other === value && j < i)).length)

// Ten coffee orders as bars, told in steps: as they were served, the one
// that took 20 minutes, the average, sorted with the median, the 90th
// percentile, and then the same bars as a server's response times
export default function CoffeeLine({ step }: { step: number }) {
  const reducedMotion = usePrefersReducedMotion()
  const sorted = step >= 3
  const server = step >= 5
  const number = (value: number) => (server ? Math.round(value * MS_PER_MINUTE) : value)
  const unit = (value: number) => `${number(value)} ${server ? 'ms' : 'min'}`
  const highlight = (i: number) =>
    step === 1 ? COFFEE[i] === MOST : step === 3 ? rank[i] === 4 : step >= 4 ? rank[i] === 8 || rank[i] === 9 : false

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Ten waits for coffee as bars">
      <line x1={LEFT - 10} x2={WIDTH - 10} y1={BASE} y2={BASE} className="stroke-zinc-400" />
      {COFFEE.map((value, i) => {
        const x = barX(sorted ? rank[i] : i)
        const lit = highlight(i)
        return (
          <g key={i}>
            <motion.rect
              initial={reducedMotion ? false : { height: 0, y: BASE }}
              animate={{ x, height: height(value), y: BASE - height(value) }}
              transition={{
                x: { duration: reducedMotion ? 0 : 0.7, ease: [0.16, 1, 0.3, 1] },
                default: { duration: reducedMotion ? 0 : 0.4, delay: reducedMotion || step > 0 ? 0 : i * 0.12 },
              }}
              width={BAR}
              className={`transition-colors duration-300 ${lit ? (value === MOST && step === 1 ? 'fill-ink' : 'fill-sage') : 'fill-sage/35'}`}
            />
            <motion.text
              animate={{ x: x + BAR / 2 }}
              transition={{ duration: reducedMotion ? 0 : 0.7, ease: [0.16, 1, 0.3, 1] }}
              y={BASE - height(value) - 6}
              textAnchor="middle"
              className={`font-mono text-[10px] ${lit ? 'fill-ink' : 'fill-zinc-400'}`}
            >
              {number(value)}
            </motion.text>
          </g>
        )
      })}

      {step === 1 && (
        <text x={barX(4) + BAR + 8} y={BASE - TALLEST + 14} className="fill-ink font-mono text-[11px] uppercase tracking-widest">
          {server ? 'One slow request' : 'Machine jammed'}
        </text>
      )}

      {step >= 2 && (
        <g opacity={step === 2 ? 1 : 0.45}>
          <line
            x1={LEFT - 10}
            x2={WIDTH - 10}
            y1={BASE - height(average)}
            y2={BASE - height(average)}
            className="stroke-ink"
            strokeDasharray="5 4"
          />
          <text x={LEFT} y={BASE - height(average) - 24} className="fill-ink font-mono text-[11px] uppercase tracking-widest">
            Average {unit(Math.round(average * 10) / 10)}
          </text>
        </g>
      )}

      {step >= 3 && (
        <text x={barX(4) + BAR / 2} y={BASE + 18} textAnchor="middle" className="fill-sage font-mono text-[11px] uppercase tracking-widest">
          Median {unit(median)}
        </text>
      )}
      {step >= 4 && (
        <>
          <text x={barX(8) + BAR / 2} y={BASE + 34} textAnchor="middle" className="fill-sage font-mono text-[11px] uppercase tracking-widest">
            p90 {unit(p90)}
          </text>
          <text x={barX(9) + BAR / 2} y={BASE + 18} textAnchor="middle" className="fill-sage font-mono text-[11px] uppercase tracking-widest">
            Slowest
          </text>
        </>
      )}
      {step < 3 && (
        <text x={LEFT} y={BASE + 18} className="fill-zinc-400 font-mono text-[10px] uppercase tracking-widest">
          {server ? 'Requests, as they came · ms' : 'Customers, as they were served · minutes'}
        </text>
      )}
    </svg>
  )
}
