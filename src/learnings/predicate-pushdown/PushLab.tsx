import { useState } from 'react'
import { Button, Choice, Controls, Readout } from '../../components/explain/figure'
import {
  biggest,
  LAB,
  LAB_NUMBERS,
  landingWords,
  pushed,
  run,
  sameBag,
  showClause,
  valuesMoved,
  type Clause,
  type Plan,
  type Ran,
} from './model'

const COLUMNS = ['every column', 'only needed'] as const
type Columns = (typeof COLUMNS)[number]

const NONE = LAB.where.map(() => false)
const ALL = LAB.where.map(() => true)
const TRUTH = run(pushed(LAB, NONE)).out

const mono = 'font-mono text-[0.875rem]'

// What a node does, in the algebra: its sign, then its condition a clause
// to a line
function opText(plan: Plan): string[] {
  const clauses = (sign: string, cnf: Clause[]) =>
    cnf.map((c, i) => `${i === 0 ? sign : '∧'} ${showClause(c, cnf.length === 1)}`)
  switch (plan.op) {
    case 'scan':
      return [plan.table.name.toUpperCase()]
    case 'select':
      return clauses('σ', plan.where)
    case 'join':
      return plan.on.length ? clauses('⋈', plan.on) : ['×']
    case 'project':
      return [`π ${plan.columns.join(', ')}`]
  }
}

const holdsClause = (plan: Plan, c: Clause) =>
  (plan.op === 'select' && plan.where.includes(c)) || (plan.op === 'join' && plan.on.includes(c))

// The plan as an indented list, the way EXPLAIN prints one: each operator on
// a line, its inputs under it, a step further in
function lines(ran: Ran, depth = 0): { ran: Ran; depth: number }[] {
  return [{ ran, depth }, ...ran.inputs.flatMap((input) => lines(input, depth + 1))]
}

function Line({ ran, depth, widest, moved }: { ran: Ran; depth: number; widest: boolean; moved: boolean }) {
  const rows = ran.out.rows.length
  const keep = ran.plan.op !== 'project' ? ran.plan.keep : undefined
  const share = rows / LAB_NUMBERS.product
  return (
    <li className="flex items-start gap-3 py-1" style={{ paddingLeft: `${depth * 0.9}rem` }}>
      <div className={`min-w-0 flex-1 break-words ${mono}`}>
        {depth > 0 && <span className="text-zinc-faded">↳ </span>}
        <span className={moved ? 'text-sage-ink' : ran.plan.op === 'scan' ? 'text-zinc-faded' : 'text-ink'}>
          {opText(ran.plan).map((text, i) => (
            <span key={i} className={i === 0 ? undefined : 'block pl-5'}>
              {text}
            </span>
          ))}
        </span>
        {keep && <span className="block pl-5 text-zinc-faded">keeps {keep.join(', ')}</span>}
      </div>
      <div className="w-24 shrink-0 pt-0.5">
        <div className={`text-right tabular-nums ${mono} ${widest ? 'text-sage-ink' : 'text-ink'}`}>
          {rows.toLocaleString('en-US')} × {ran.out.columns.length}
        </div>
        <div className="mt-1 h-1.5 rounded-full bg-zinc-300/50 dark:bg-zinc-200/10">
          <div
            className={`h-1.5 rounded-full ${widest ? 'bg-sage' : 'bg-ink/60'}`}
            style={{ width: rows === 0 ? 0 : `max(3px, ${share * 100}%)` }}
          />
        </div>
      </div>
    </li>
  )
}

// The lab's plan: push each clause of the WHERE to where it can be tested,
// drop columns nobody above reads, and watch the rows in between
export default function PushLab() {
  const [push, setPush] = useState<boolean[]>(NONE)
  const [columns, setColumns] = useState<Columns>('every column')
  const [last, setLast] = useState<number | null>(null)

  const ran = run(pushed(LAB, push, columns === 'only needed'))
  const most = biggest(ran)
  const same = sameBag(ran.out, TRUTH)
  const toggle = (k: number) => {
    setPush(push.map((p, i) => (i === k ? !p : p)))
    setLast(push[k] ? null : k)
  }
  const lastClause = last === null ? null : LAB.where[last]

  return (
    <div>
      <p className={`${mono} uppercase tracking-widest text-zinc-faded`}>The WHERE, a clause at a time</p>
      <div className="mt-2 flex flex-col gap-2">
        {LAB.where.map((c, k) => (
          <button
            key={k}
            onClick={() => toggle(k)}
            aria-pressed={push[k]}
            className={`flex flex-wrap items-baseline justify-between gap-x-4 rounded-xl border px-3 py-2 text-left ${mono} transition-colors ${
              push[k]
                ? 'border-sage bg-sage/15 text-sage-ink'
                : 'border-zinc-300 dark:border-zinc-200/20 text-ink hover:border-ink'
            }`}
          >
            <span>{showClause(c)}</span>
            <span className={push[k] ? 'text-sage-ink' : 'text-zinc-faded'}>
              {push[k] ? `pushed ${landingWords(LAB, c)}` : 'in the filter on top'}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-5 flex items-baseline justify-between gap-4">
        <p className={`${mono} uppercase tracking-widest text-zinc-faded`}>The plan</p>
        <p className={`${mono} uppercase tracking-widest text-zinc-faded`}>rows × cols</p>
      </div>
      <ul className="mt-1">
        {lines(ran).map(({ ran: node, depth }, i) => (
          <Line
            key={i}
            ran={node}
            depth={depth}
            widest={(node.plan.op === 'select' || node.plan.op === 'join') && node.out.rows.length === most}
            moved={lastClause !== null && holdsClause(node.plan, lastClause)}
          />
        ))}
      </ul>

      <div className="mt-5 flex flex-wrap gap-x-10 gap-y-4">
        <Readout label="Biggest in between" value={`${most.toLocaleString('en-US')} rows`} accent />
        <Readout label="Values passed up" value={valuesMoved(ran).toLocaleString('en-US')} />
        <Readout label="Answer" value={`${ran.out.rows.length} rows${same ? ', same' : ''}`} />
      </div>

      <Controls>
        <Choice label="Columns handed up" options={COLUMNS} value={columns} onChange={setColumns} />
        <Button
          onClick={() => {
            setPush(ALL)
            setLast(null)
          }}
          disabled={push.every(Boolean)}
        >
          Push all
        </Button>
        <Button
          onClick={() => {
            setPush(NONE)
            setColumns('every column')
            setLast(null)
          }}
        >
          Start over
        </Button>
      </Controls>
    </div>
  )
}
