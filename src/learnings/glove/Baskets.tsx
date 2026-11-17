import { motion } from 'motion/react'
import { usePrefersReducedMotion } from '../../hooks'
import { BASKETS, ICE_STEAM, ratioPosition, type Row } from './model'

// The story's figure: for each item (or, once revealed, each context word),
// how often it turns up beside each of two people (or words), and the ratio
// of the two on a log axis centred on 1.
// `shown` rows are drawn; `ratios` adds the ratio column; `revealed` swaps
// in ice and steam, with the GloVe paper's numbers, on the same figure.

const TICKS = [1 / 10, 1, 10]

const share = (value: number, revealed: boolean) => (revealed ? value.toPrecision(2) : String(value))
const ratioText = (ratio: number) => String(Number(ratio.toPrecision(3)))

export default function Baskets({ shown, ratios, revealed }: { shown: number; ratios: boolean; revealed: boolean }) {
  const reducedMotion = usePrefersReducedMotion()
  const rows: Row[] = revealed ? ICE_STEAM : BASKETS
  const names = revealed ? ['ice', 'steam'] : ['Mia', 'Leo']
  const largest = Math.max(...rows.flatMap((row) => [row.first, row.second]))
  const move = { duration: reducedMotion ? 0 : 0.7, ease: 'easeOut' as const }
  const label = 'font-mono text-[0.75rem] uppercase tracking-widest'

  return (
    <div
      role="img"
      aria-label={
        rows
          .slice(0, shown)
          .map(
            (row) =>
              `${row.label}: ${share(row.first, revealed)} per 1,000 beside ${names[0]}, ${share(row.second, revealed)} beside ${names[1]}` +
              (ratios ? `, ratio ${ratioText(row.ratio)}` : ''),
          )
          .join('; ') || `Receipts from ${names[0]} and ${names[1]}`
      }
    >
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-x-5 sm:gap-x-8">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className={`${label} text-zinc-faded`}>Per 1,000 {revealed ? 'neighbours' : 'items'}</span>
          <span className={`${label} flex items-center gap-1.5 text-ink`}>
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-sage" />
            {names[0]}
          </span>
          <span className={`${label} flex items-center gap-1.5 text-ink`}>
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-ink/40" />
            {names[1]}
          </span>
        </div>
        <div className={`${label} text-zinc-faded ${ratios ? '' : 'invisible'}`}>
          {names[0]} ÷ {names[1]}
        </div>
      </div>

      <div className="mt-4 space-y-5">
        {rows.map((row, i) => {
          // Every row keeps its place, so the figure holds its height; its
          // bars and numbers come in when the story reaches it
          const on = i < shown
          const far = row.ratio > 3 || row.ratio < 1 / 3
          return (
            <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] items-center gap-x-5 sm:gap-x-8">
              <div>
                <p className={`${label} ${on ? 'text-ink' : 'text-zinc-faded'}`}>{row.label}</p>
                {[row.first, row.second].map((value, k) => (
                  <div key={k} className="mt-1.5 flex items-center gap-2">
                    <div className="h-2.5 min-w-0 flex-1">
                      <motion.div
                        className={`h-full rounded-full ${k === 0 ? 'bg-sage' : 'bg-ink/40'}`}
                        initial={{ width: 0 }}
                        animate={{ width: on ? `${Math.max(1.5, (100 * value) / largest)}%` : '0%' }}
                        transition={move}
                      />
                    </div>
                    <span className={`w-12 shrink-0 text-right font-mono text-[0.8125rem] tabular-nums text-ink ${on ? '' : 'invisible'}`}>
                      {share(value, revealed)}
                    </span>
                  </div>
                ))}
              </div>
              <div className={ratios && on ? '' : 'invisible'} aria-hidden>
                <div className="relative h-9">
                  <div className="absolute inset-x-0 top-[27px] h-px bg-zinc-300" />
                  {TICKS.map((tick) => (
                    <div
                      key={tick}
                      className={`absolute top-[27px] w-px -translate-x-1/2 -translate-y-1/2 ${tick === 1 ? 'h-6 bg-zinc-400' : 'h-3 bg-zinc-300'}`}
                      style={{ left: `${100 * ratioPosition(tick)}%` }}
                    />
                  ))}
                  {ratios && (
                    <motion.div
                      className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
                      initial={{ left: '50%' }}
                      animate={{ left: `${100 * ratioPosition(row.ratio)}%` }}
                      transition={move}
                    >
                      <span className={`font-mono text-[0.8125rem] leading-4 tabular-nums ${far ? 'text-sage-ink' : 'text-ink'}`}>
                        {ratioText(row.ratio)}
                      </span>
                      <span className={`mt-1 h-3.5 w-3.5 rounded-full ${far ? 'bg-sage' : 'bg-ink'}`} />
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className={`mt-4 grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-x-5 sm:gap-x-8 ${ratios ? '' : 'invisible'}`} aria-hidden>
        <div />
        <div className={`relative h-4 ${label} text-zinc-faded`}>
          {TICKS.map((tick) => (
            <span key={tick} className="absolute -translate-x-1/2" style={{ left: `${100 * ratioPosition(tick)}%` }}>
              {tick < 1 ? `1/${Math.round(1 / tick)}` : tick}
            </span>
          ))}
        </div>
        <div />
        <div className={`mt-1 flex justify-between ${label} text-zinc-faded`}>
          <span>{names[1]}’s</span>
          <span>{names[0]}’s</span>
        </div>
      </div>
    </div>
  )
}
