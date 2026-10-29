import { useMemo, useState } from 'react'
import { Button, Choice, Controls, Readout } from '../../components/explain/figure'
import { seeded } from '../../components/explain/random'
import Day from './Day'
import { BUSY, OFFSITE, randomDay, RULE_NAMES, RULES, SYNC, trialHits, TRIALS, type Meeting, type Rule } from './model'

const DAYS = ['Offsite', 'Sync', 'Busy', 'Random'] as const
type DayName = (typeof DAYS)[number]
const FIXED: Record<Exclude<DayName, 'Random'>, Meeting[]> = { Offsite: OFFSITE, Sync: SYNC, Busy: BUSY }

// Every rule on every day: pick a rule and a day and watch it book, cancel
// meetings to see what a rule needed, and see how each rule does over many
// random days
export default function Lab() {
  const [rule, setRule] = useState<Rule>('clashes')
  const [dayName, setDayName] = useState<DayName>('Busy')
  // Which random day: each press of "Another" draws the next
  const [draw, setDraw] = useState(1)
  const [cancelled, setCancelled] = useState<number[]>([])
  const rates = trialHits()

  const day = useMemo(() => (dayName === 'Random' ? randomDay(seeded(100 + draw), TRIALS.requests) : FIXED[dayName]), [dayName, draw])
  const pickDay = (name: DayName) => {
    setDayName(name)
    setCancelled([])
  }
  const toggle = (i: number) => setCancelled((before) => (before.includes(i) ? before.filter((j) => j !== i) : [...before, i]))

  return (
    <div>
      <Day
        key={`${rule}-${dayName}-${draw}-${cancelled.join('.')}`}
        day={day}
        rule={rule}
        pace={600}
        cancelled={cancelled}
        onToggle={toggle}
        best
      />
      <Controls>
        <Choice label="Rule" options={RULES} value={rule} onChange={setRule} format={(r) => RULE_NAMES[r]} />
        <Choice label="Day" options={DAYS} value={dayName} onChange={pickDay} />
        <div className="flex gap-3">
          {dayName === 'Random' && (
            <Button
              onClick={() => {
                setDraw((d) => d + 1)
                setCancelled([])
              }}
            >
              Another day
            </Button>
          )}
          <Button onClick={() => setCancelled([])} disabled={!cancelled.length}>
            Restore all
          </Button>
        </div>
      </Controls>
      <p className="mt-8 font-mono text-[0.8rem] uppercase tracking-widest text-zinc-faded">
        Booked the most that fit, on {TRIALS.days.toLocaleString('en-US')} random days of {TRIALS.requests} requests
      </p>
      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {RULES.map((r) => (
          <Readout key={r} label={RULE_NAMES[r]} value={`${((100 * rates[r]) / TRIALS.days).toFixed(1)}%`} accent={r === 'end'} />
        ))}
      </div>
    </div>
  )
}
