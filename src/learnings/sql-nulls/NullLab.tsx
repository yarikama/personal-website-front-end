import { useState } from 'react'
import { Readout } from '../../components/explain/figure'
import {
  average,
  CONDITIONS,
  countRows,
  countValues,
  CUSTOMERS,
  ID_CYCLE,
  keeps,
  nextIn,
  ORDERS,
  STAR_CYCLE,
  type Truth,
  type Value,
} from './model'

const label = 'font-mono text-[0.875rem] uppercase tracking-widest text-zinc-faded'
const show = (v: Value) => (v === null ? 'NULL' : String(v))

const TONE: Record<Truth, string> = {
  TRUE: 'border-sage bg-sage/15 text-sage-ink',
  FALSE: 'border-ink text-ink',
  UNKNOWN: 'border-dashed border-zinc-400 text-zinc-faded',
}

// A value the reader can change: each click steps to the next, NULL last
function Editable({ value, onClick, name }: { value: Value; onClick: () => void; name: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={`${name}: ${show(value)}. Change it`}
      className={`w-14 rounded-lg border px-2 py-0.5 font-mono text-[0.875rem] tabular-nums transition-colors hover:border-ink ${
        value === null ? 'border-dashed border-zinc-400 text-zinc-faded' : 'border-zinc-300 dark:border-zinc-200/20 text-ink'
      }`}
    >
      {show(value)}
    </button>
  )
}

// Customers and their orders, a condition to run on each customer row, and
// what it answers: TRUE, FALSE or UNKNOWN, and whether WHERE keeps the row.
// The stars and the orders' customer_ids can be changed, NULL included.
export default function NullLab() {
  const [stars, setStars] = useState<Value[]>(CUSTOMERS.map((c) => c.stars))
  const [orders, setOrders] = useState<Value[]>(ORDERS)
  const [picked, setPicked] = useState(CONDITIONS[5].name)
  const condition = CONDITIONS.find((c) => c.name === picked)!

  const rows = CUSTOMERS.map((c, i) => {
    const customer = { ...c, stars: stars[i] }
    return { customer, truth: condition.test(customer, orders) }
  })
  const kept = rows.filter((r) => keeps(r.truth)).length
  const mean = average(stars)

  return (
    <div>
      <div className="flex flex-col gap-2" role="radiogroup" aria-label="Condition">
        <span className={label}>Condition</span>
        <div className="flex flex-wrap gap-2">
          {CONDITIONS.map((c) => (
            <button
              key={c.name}
              role="radio"
              aria-checked={c.name === picked}
              onClick={() => setPicked(c.name)}
              className={`rounded-xl border px-3 py-1.5 font-mono text-[0.875rem] transition-colors ${
                c.name === picked
                  ? 'border-sage bg-sage/15 text-sage-ink'
                  : 'border-zinc-300 dark:border-zinc-200/20 text-zinc-faded hover:text-ink'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-5 font-mono text-[0.875rem] leading-relaxed text-ink break-words">
        <span className="text-zinc-faded">SELECT name FROM customers c WHERE </span>
        {condition.sql}
      </p>

      <div className="mt-5 flex flex-wrap items-start gap-x-10 gap-y-6">
        <table className="font-mono text-[0.875rem]">
          <caption className={`${label} pb-2 text-left`}>customers</caption>
          <thead>
            <tr className="text-left text-zinc-faded">
              <th className="pr-4 font-normal">name</th>
              <th className="pr-4 font-normal">id</th>
              <th className="pr-4 font-normal">stars</th>
              <th className="pr-4 font-normal">condition</th>
              <th className="font-normal">kept</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ customer, truth }, i) => (
              <tr key={customer.id}>
                <td className="py-1 pr-4 text-ink">{customer.name}</td>
                <td className="py-1 pr-4 tabular-nums text-ink">{customer.id}</td>
                <td className="py-1 pr-4">
                  <Editable
                    name={`${customer.name}'s stars`}
                    value={stars[i]}
                    onClick={() => setStars(stars.map((v, k) => (k === i ? nextIn(STAR_CYCLE, v) : v)))}
                  />
                </td>
                <td className="py-1 pr-4">
                  <span className={`inline-block w-[5.5rem] rounded-lg border px-2 py-0.5 text-center ${TONE[truth]}`}>{truth}</span>
                </td>
                <td className="py-1 text-center">
                  {keeps(truth) ? (
                    <span aria-label="kept" className="inline-block h-3.5 w-3.5 rounded-full bg-sage" />
                  ) : (
                    <span aria-label="dropped" className="text-zinc-faded">
                      –
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <table className="font-mono text-[0.875rem]">
          <caption className={`${label} pb-2 text-left`}>orders</caption>
          <thead>
            <tr className="text-left text-zinc-faded">
              <th className="font-normal">customer_id</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((v, i) => (
              <tr key={i}>
                <td className="py-1">
                  <Editable
                    name={`Order ${i + 1}'s customer_id`}
                    value={v}
                    onClick={() => setOrders(orders.map((o, k) => (k === i ? nextIn(ID_CYCLE, o) : o)))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
        <Readout label="Rows kept" value={`${kept} of ${rows.length}`} accent />
        <Readout label="COUNT(*)" value={countRows(stars)} />
        <Readout label="COUNT(stars)" value={countValues(stars)} />
        <Readout label="AVG(stars)" value={mean === null ? 'NULL' : mean.toFixed(2).replace(/\.?0+$/, '')} />
      </div>
    </div>
  )
}
