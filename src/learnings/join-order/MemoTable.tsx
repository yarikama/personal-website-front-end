import { useEffect, useRef, useState } from 'react'
import { Button, Controls, Readout } from '../../components/explain/figure'
import { usePlay } from '../../components/explain/useLoop'
import { compact, count, formatRows, initials, planSets, SHOP, SHOP_DP, show, type Entry } from './model'

// The sets of two or more tables, in the order the table fills them, and
// the sizes they come in
const FILLED = SHOP_DP.table.filter((entry) => count(entry.mask) > 1)
const SIZES = [...new Set(FILLED.map((entry) => count(entry.mask)))]
const IN_PLAN = planSets(SHOP_DP)
const SHORT = SHOP.names.map((name) => name[0])

// Real milliseconds per set filled
const PACE = 420

const mono = 'font-mono text-[0.875rem]'
const label = 'font-mono text-[0.875rem] uppercase tracking-widest text-zinc-faded'

const said = (entry: Entry) =>
  `${initials(SHOP, entry.mask)}: ${entry.tried} splits tried; best ${initials(SHOP, entry.left)} + ${initials(
    SHOP,
    entry.right
  )}, ${formatRows(entry.cost)} rows in all`

// The table after `played` sets, drawn
function Board({ played }: { played: number }) {
  const filled = Math.floor(played)
  const done = filled >= FILLED.length
  const current = done ? null : FILLED[filled]
  const tried = FILLED.slice(0, filled).reduce((sum, entry) => sum + entry.tried, 0)

  return (
    <div>
      <div className="space-y-4">
        {SIZES.map((k) => (
          <div key={k}>
            <p className={label}>{k} tables</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {FILLED.filter((entry) => count(entry.mask) === k).map((entry) => {
                const at = FILLED.indexOf(entry)
                const isIn = at < filled
                const now = entry === current
                const plan = done && IN_PLAN.has(entry.mask)
                return (
                  <div
                    key={entry.mask}
                    className={`w-[4.25rem] rounded-lg border px-2 py-1 ${mono} transition-colors ${
                      plan
                        ? 'border-sage bg-sage/15'
                        : now
                          ? 'border-ink'
                          : isIn
                            ? 'border-zinc-300 dark:border-zinc-200/20 bg-paper'
                            : 'border-dashed border-zinc-300 dark:border-zinc-200/20'
                    }`}
                  >
                    <div className={isIn || now ? 'text-ink' : 'text-zinc-faded'}>{initials(SHOP, entry.mask)}</div>
                    <div className={`tabular-nums ${plan ? 'text-sage-ink' : 'text-zinc-faded'}`}>
                      {isIn ? compact(entry.cost) : '·'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <p className={`mt-5 min-h-[3rem] ${mono} text-ink`}>
        {current
          ? said(current)
          : `Done. Read back from the top through the sage cards: ${show(SHOP, SHOP_DP.best, SHORT)}.`}
      </p>

      <div className="mt-3 flex flex-wrap gap-x-10 gap-y-4">
        <Readout label="Sets filled" value={`${Math.min(filled, FILLED.length)} / ${FILLED.length}`} />
        <Readout label="Splits tried" value={formatRows(tried)} accent={done} />
        <Readout label="Best plan" value={done ? formatRows(SHOP_DP.cost) : '…'} />
      </div>
    </div>
  )
}

function Fill() {
  return <Board played={usePlay(FILLED.length, PACE)} />
}

// The memo table filling for the shop's five tables: every set of two or
// more, smallest first, each looked up from the sets already in it. It
// starts filling when it scrolls into view.
export default function MemoTable() {
  const [run, setRun] = useState(0)
  const here = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const node = here.current
    if (!node || typeof IntersectionObserver === 'undefined') return setRun((r) => Math.max(r, 1))
    const seen = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      setRun((r) => Math.max(r, 1))
      seen.disconnect()
    })
    seen.observe(node)
    return () => seen.disconnect()
  }, [])
  return (
    <div ref={here}>
      {run === 0 ? <Board played={0} /> : <Fill key={run} />}
      <Controls>
        <Button onClick={() => setRun(run + 1)}>Fill it again</Button>
      </Controls>
    </div>
  )
}
