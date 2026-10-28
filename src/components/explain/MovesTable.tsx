import type { ReactNode } from 'react'

export interface MoveRow {
  move: string
  // Into the edge: you stay put
  stay: boolean
  reward: number
  // The worth of where it lands, and reward + γ·that
  there: number
  total: number
  // Drawn as the one to watch
  best?: boolean
}

const num = (value: number, digits = 1) => {
  const text = Math.abs(value).toFixed(digits)
  return Number(text) === 0 ? (0).toFixed(digits) : `${value < 0 ? '−' : ''}${text}`
}

// A square's moves under a gridworld board: what each pays, the worth of
// where it lands, and the two together, r + γ·v′; then what they make,
// their average or their best.
export default function MovesTable({
  rows,
  gamma,
  sum,
  value,
  note,
}: {
  rows: MoveRow[]
  gamma: number
  sum: string
  value: number
  note: ReactNode
}) {
  const g = String(gamma).replace(/^0/, '')
  return (
    <div className="mx-auto w-full max-w-[26rem] font-mono text-[0.8rem]">
      <table className="w-full tabular-nums">
        <thead>
          <tr className="text-[0.7rem] text-zinc-400">
            <th className="pb-2 text-left font-normal uppercase tracking-widest">Move</th>
            <th className="pb-2 text-right font-normal">r</th>
            <th className="pb-2 text-right font-normal">+ {g} × v′</th>
            <th className="pb-2 text-right font-normal">=</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.move} className={`border-t border-zinc-200 dark:border-zinc-200/15 ${row.best ? 'text-sage' : 'text-ink'}`}>
              <td className={`py-1.5 uppercase ${row.best ? '' : 'text-zinc-faded'}`}>
                {row.move}
                {row.stay ? <span className="text-zinc-400"> · edge</span> : null}
              </td>
              <td className="py-1.5 text-right">{num(row.reward, 0)}</td>
              <td className="py-1.5 text-right">{num(row.there)}</td>
              <td className={`py-1.5 text-right ${row.best === undefined ? 'text-sage' : ''}`}>{num(row.total, 2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex items-baseline justify-between border-t border-ink pt-2">
        <span className="uppercase tracking-widest text-zinc-faded">{sum}</span>
        <span className="font-serif text-2xl text-sage tabular-nums">{num(value)}</span>
      </div>
      <p className="mt-1 text-zinc-faded">{note}</p>
    </div>
  )
}
