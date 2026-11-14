import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { EASE, useCountUp, useSeen } from './motion'

export interface Bar {
  label: ReactNode
  value: number
  // How the number reads; by default the value with `unit`
  display?: string
  // The bar the story is about
  accent?: boolean
  // Shown faded: a reference, not a contender
  muted?: boolean
  note?: ReactNode
}

// A few numbers as bars that grow in when they come into view, so a
// comparison is seen before it is read. `max` sets the full width (by
// default the largest value); `better` says which way is good.
export function Bars({
  bars,
  unit = '',
  decimals = 0,
  max,
  better,
}: {
  bars: Bar[]
  unit?: string
  decimals?: number
  max?: number
  better?: 'lower' | 'higher'
}) {
  const { ref, seen } = useSeen<HTMLDivElement>(0.5)
  const top = max ?? Math.max(...bars.map((bar) => bar.value))
  return (
    <div ref={ref} className="flex flex-col gap-4">
      {better && (
        <p className="font-mono text-[0.8125rem] uppercase tracking-widest text-zinc-400">
          {better === 'lower' ? 'Shorter is better' : 'Longer is better'}
        </p>
      )}
      {bars.map((bar, i) => (
        <div key={i} className="grid grid-cols-1 sm:grid-cols-[minmax(0,11rem)_1fr] items-center gap-x-4 gap-y-1">
          <div className={`text-sm leading-snug ${bar.accent ? 'text-ink font-medium' : 'text-zinc-faded'}`}>
            {bar.label}
            {bar.note && <span className="block text-xs text-zinc-400">{bar.note}</span>}
          </div>
          <div className="flex items-center gap-3">
            <div className="relative h-7 flex-1">
              <motion.div
                className={`absolute inset-y-0 left-0 rounded-md ${
                  bar.accent ? 'bg-sage' : bar.muted ? 'border border-dashed border-zinc-400' : 'bg-zinc-400/70 dark:bg-zinc-400'
                }`}
                initial={{ width: 0 }}
                animate={seen ? { width: `${Math.max(0.5, (bar.value / top) * 100)}%` } : {}}
                transition={{ duration: 0.9, delay: 0.1 + i * 0.12, ease: EASE }}
              />
            </div>
            <span className={`w-20 shrink-0 text-right font-mono text-sm tabular-nums ${bar.accent ? 'text-sage' : 'text-ink'}`}>
              {bar.display ?? <Counted value={bar.value} go={seen} decimals={decimals} unit={unit} />}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function Counted({ value, go, decimals, unit }: { value: number; go: boolean; decimals: number; unit: string }) {
  const shown = useCountUp(value, go, 0.9)
  return (
    <>
      {shown.toFixed(decimals)}
      {unit}
    </>
  )
}
