import { Fragment, useState, type ReactNode } from 'react'
import { Choice, Controls } from '../../components/explain/figure'
import { COMBINES, headings, KEEPS, labPlan, run, YEARS, type Combine, type Keep, type Plan, type Ran, type Year } from './model'

// Rows a node lists before it says how many more there are
const SHOWN = 6

const mono = 'font-mono text-[0.875rem]'

// One node of the plan: what it does, how many rows it hands up, and the
// first few of them
function NodeCard({ ran, top }: { ran: Ran; top: boolean }) {
  const leaf = ran.inputs.length === 0
  const heads = headings(ran.out)
  const rows = ran.out.rows
  return (
    <div className={`rounded-xl px-3 py-2.5 ${leaf ? 'bg-paper' : 'bg-sage/10'} ${top ? 'ring-1 ring-sage' : ''}`}>
      <div className={`flex items-baseline justify-between gap-3 ${mono}`}>
        <span className="text-ink">{leaf ? ran.label.toUpperCase() : ran.label}</span>
        <span className={`shrink-0 tabular-nums ${top ? 'text-sage-ink' : 'text-zinc-faded'}`}>
          {rows.length} {rows.length === 1 ? 'row' : 'rows'}
        </span>
      </div>
      <div className="mt-2 overflow-x-auto">
        <div
          className={`grid w-max gap-x-4 gap-y-0.5 ${mono}`}
          style={{ gridTemplateColumns: `repeat(${heads.length}, auto)` }}
        >
          {heads.map((head, i) => (
            <span key={`h${i}`} className="text-zinc-faded">
              {head}
            </span>
          ))}
          {rows.slice(0, SHOWN).map((row, r) => (
            <Fragment key={r}>
              {row.map((value, i) => (
                <span key={i} className="text-ink tabular-nums">
                  {value}
                </span>
              ))}
            </Fragment>
          ))}
        </div>
        {rows.length > SHOWN && <p className={`mt-1 text-zinc-faded ${mono}`}>+{rows.length - SHOWN} more</p>}
        {rows.length === 0 && <p className={`text-zinc-faded ${mono}`}>no rows</p>}
      </div>
    </div>
  )
}

function Up() {
  return (
    <div className="flex justify-center py-1 text-zinc-faded" aria-hidden>
      ↑
    </div>
  )
}

// A node with the subtree under it: rows flow up
function Subtree({ ran, top = false }: { ran: Ran; top?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col">
      <NodeCard ran={ran} top={top} />
      {ran.inputs.length === 1 && (
        <>
          <Up />
          <Subtree ran={ran.inputs[0]} />
        </>
      )}
      {ran.inputs.length === 2 && (
        <div className="grid grid-cols-2 gap-3">
          {ran.inputs.map((input, i) => (
            <div key={i} className="flex min-w-0 flex-col">
              <Up />
              <Subtree ran={input} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// The plan as one expression, with each operator's condition set below it
function Expression({ plan }: { plan: Plan }): ReactNode {
  switch (plan.op) {
    case 'table':
      return plan.table.name.toUpperCase()
    case 'select':
      return (
        <>
          σ<sub>{plan.condition.label}</sub>(<Expression plan={plan.input} />)
        </>
      )
    case 'project':
      return (
        <>
          π<sub>{plan.columns.join(', ')}</sub>(<Expression plan={plan.input} />)
        </>
      )
    case 'join':
      return (
        <>
          <Expression plan={plan.left} /> ⋈<sub>{plan.condition.label}</sub> <Expression plan={plan.right} />
        </>
      )
    case 'product':
      return (
        <>
          <Expression plan={plan.left} /> × <Expression plan={plan.right} />
        </>
      )
    default:
      return null
  }
}

// Build a plan over two small tables and see every node's rows
export default function PlanLab() {
  const [year, setYear] = useState<Year>(2)
  const [combine, setCombine] = useState<Combine>('×')
  const [keep, setKeep] = useState<Keep>('course')
  const plan = labPlan(year, combine, keep)
  const ran = run(plan)

  return (
    <div>
      <Subtree ran={ran} top />
      <p className="mt-5 font-serif text-xl leading-relaxed text-ink break-words">
        <Expression plan={plan} />
      </p>
      <Controls>
        <Choice
          label="Filter students"
          options={YEARS}
          value={year}
          onChange={setYear}
          format={(y) => (y === 'any' ? 'none' : `year ${y}`)}
        />
        <Choice label="Combine" options={COMBINES} value={combine} onChange={setCombine} />
        <Choice label="Keep" options={KEEPS} value={keep} onChange={setKeep} format={(k) => (k === 'every column' ? 'all' : k)} />
      </Controls>
    </div>
  )
}
