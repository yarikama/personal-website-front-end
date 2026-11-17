import { useId } from 'react'
import { describe, itemsOf, notation, waitsForEdges, type Run, type State } from './model'

const chip = 'rounded-lg border px-2 py-1 font-mono text-[0.8125rem] tabular-nums'

// Where each transaction sits in the waits-for graph
const NODE: Record<number, [number, number][]> = {
  2: [
    [44, 56],
    [176, 56],
  ],
  3: [
    [110, 22],
    [44, 98],
    [176, 98],
  ],
}
const NODE_R = 17

// The waits-for graph: an arrow from each waiting transaction to each one
// it waits for, in ink when they go round in a cycle
function WaitsFor({ run, state }: { run: Run; state: State }) {
  const arrow = `waits-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const at = NODE[run.txns.length] ?? NODE[3]
  const edges = waitsForEdges(state)
  const cycle = state.cycle
  const inCycle = (a: number, b: number) =>
    !!cycle && cycle.some((t, i) => t === a && cycle[(i + 1) % cycle.length] === b)
  return (
    <svg viewBox="0 0 220 124" className="w-full max-w-[15rem]" role="img" aria-label={`Waits-for graph: ${edges.length ? edges.map(([a, b]) => `${run.txns[a].name} waits for ${run.txns[b].name}`).join(', ') : 'nobody waits'}${cycle ? ', a deadlock' : ''}`}>
      <defs>
        <marker id={arrow} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" className="fill-ink" />
        </marker>
      </defs>
      {edges.map(([a, b]) => {
        const [x1, y1] = at[a]
        const [x2, y2] = at[b]
        // Bend each arrow a little, so two opposite ones don't overlap
        const len = Math.hypot(x2 - x1, y2 - y1)
        const nx = -(y2 - y1) / len
        const ny = (x2 - x1) / len
        const mx = (x1 + x2) / 2 + nx * 14
        const my = (y1 + y2) / 2 + ny * 14
        const from = [x1 + ((mx - x1) / Math.hypot(mx - x1, my - y1)) * NODE_R, y1 + ((my - y1) / Math.hypot(mx - x1, my - y1)) * NODE_R]
        const to = [x2 + ((mx - x2) / Math.hypot(mx - x2, my - y2)) * (NODE_R + 2), y2 + ((my - y2) / Math.hypot(mx - x2, my - y2)) * (NODE_R + 2)]
        const hot = inCycle(a, b)
        return (
          <path
            key={`${a}-${b}`}
            d={`M${from[0]},${from[1]} Q${mx},${my} ${to[0]},${to[1]}`}
            className={`fill-none ${hot ? 'stroke-ink' : 'stroke-zinc-400'}`}
            strokeWidth={hot ? 2.2 : 1.4}
            markerEnd={`url(#${arrow})`}
          />
        )
      })}
      {run.txns.map((txn, t) => (
        <g key={t}>
          <circle cx={at[t][0]} cy={at[t][1]} r={NODE_R} className={`fill-paper ${state.waiting[t] ? 'stroke-ink' : 'stroke-zinc-400'}`} strokeWidth={1.6} />
          <text x={at[t][0]} y={at[t][1] + 4} textAnchor="middle" className="fill-ink font-mono text-[11px]">
            {txn.name}
          </text>
        </g>
      ))}
      {cycle && (
        <text x={110} y={120} textAnchor="middle" className="fill-ink font-mono text-[10px] uppercase tracking-widest">
          cycle: deadlock
        </text>
      )}
    </svg>
  )
}

// The lock manager after the first `at` events of `run`: each transaction's
// steps and the locks it holds, the lock table, the waits-for graph, and
// the schedule so far
export default function LockLab({ run, at }: { run: Run; at: number }) {
  const state = at === 0 ? run.start : run.states[at - 1]
  const items = itemsOf(run.txns)
  const ops = run.events.slice(0, at).flatMap((e, k) => (e.kind === 'op' ? [{ e, k }] : []))

  return (
    <div className="flex flex-col gap-6">
      <p className="min-h-[3rem] font-serif text-lg leading-snug text-ink" aria-live="polite">
        {at === 0 ? 'Nothing has run yet. Step through, or play.' : describe(run, at - 1)}
      </p>

      {/* The transactions */}
      <div className="flex flex-col gap-3">
        {run.txns.map((txn, t) => {
          const done = state.done[t]
          const waiting = state.waiting[t]
          const holds = items.flatMap((item) => state.locks[item].filter((h) => h.t === t).map((h) => `${h.mode === 'X' ? 'X' : 'S'} ${item}`))
          const steps = [...txn.ops.map((o) => `${o.kind}(${o.item})`), 'commit']
          return (
            <div key={t} className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <div className="w-[7.5rem] shrink-0">
                <p className="font-mono text-[0.875rem] text-ink">
                  {txn.name}
                  {state.attempts[t] > 1 && <span className="text-zinc-faded"> · try {state.attempts[t]}</span>}
                </p>
                <p className="font-mono text-[0.75rem] leading-tight text-zinc-faded">{txn.does}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {steps.map((label, i) => {
                  const finished = state.committed[t] || i < done
                  const next = !state.committed[t] && i === done
                  const tone = finished
                    ? 'border-sage bg-sage/15 text-sage-ink'
                    : next && waiting
                      ? 'border-ink border-dashed text-ink'
                      : next
                        ? 'border-ink text-ink'
                        : 'border-zinc-300 dark:border-zinc-200/20 text-zinc-faded'
                  return (
                    <span key={i} className={`${chip} ${tone}`}>
                      {label}
                    </span>
                  )
                })}
              </div>
              <p className="font-mono text-[0.8125rem] text-zinc-faded">
                {waiting ? <span className="text-ink">waits for {waiting.item}</span> : state.committed[t] ? 'committed' : holds.length ? `holds ${holds.join(', ')}` : 'holds nothing'}
              </p>
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap items-start gap-x-10 gap-y-5">
        {/* The lock table */}
        <div className="min-w-[14rem] flex-1">
          <p className="font-mono text-[0.875rem] uppercase tracking-widest text-zinc-faded">Lock table</p>
          <table className="mt-2 w-full font-mono text-[0.8125rem]">
            <thead>
              <tr className="text-left text-zinc-faded">
                <th className="py-1 pr-3 font-normal">Item</th>
                <th className="py-1 pr-3 font-normal">Value</th>
                <th className="py-1 pr-3 font-normal">Held by</th>
                <th className="py-1 font-normal">Waiting</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const holders = state.locks[item]
                const waiters = run.txns.flatMap((txn, t) => (state.waiting[t]?.item === item ? [txn.name] : []))
                return (
                  <tr key={item} className="text-ink">
                    <td className="py-1 pr-3">{item}</td>
                    <td className="py-1 pr-3 tabular-nums">{state.values[item]}</td>
                    <td className="py-1 pr-3">
                      {holders.length ? holders.map((h) => `${run.txns[h.t].name} (${h.mode})`).join(', ') : <span className="text-zinc-faded">free</span>}
                    </td>
                    <td className="py-1">{waiters.length ? waiters.join(', ') : <span className="text-zinc-faded">none</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div>
          <p className="font-mono text-[0.875rem] uppercase tracking-widest text-zinc-faded">Waits-for</p>
          <WaitsFor run={run} state={state} />
        </div>
      </div>

      {/* The schedule so far */}
      <div>
        <p className="font-mono text-[0.875rem] uppercase tracking-widest text-zinc-faded">Schedule so far</p>
        <p className="mt-2 flex min-h-[1.75rem] flex-wrap gap-x-2 gap-y-1 font-mono text-[0.9375rem] text-ink">
          {ops.length === 0 && <span className="text-zinc-faded">empty</span>}
          {ops.map(({ e, k }) => {
            if (e.kind !== 'op') return null
            const undone = e.attempt < state.attempts[e.t]
            return (
              <span
                key={k}
                className={
                  undone
                    ? 'text-zinc-faded line-through'
                    : e.dirtyFrom !== null
                      ? 'underline decoration-dashed decoration-2 underline-offset-4'
                      : undefined
                }
              >
                {notation(e.t, e.op, e.item)}
              </span>
            )
          })}
        </p>
      </div>
    </div>
  )
}
