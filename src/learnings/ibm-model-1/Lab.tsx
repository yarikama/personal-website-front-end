import { useState } from 'react'
import { Choice, Controls, Readout, Slider } from '../../components/explain/figure'
import Menu, { MenuHeader } from './Menu'
import { decimal, LAB_ROUNDS, MENU, MENU_TABLES, SHORT_MENU, SHORT_TABLES } from './model'

const MENUS = ['Whole menu', 'Without “a coffee”'] as const
type Which = (typeof MENUS)[number]

// The menu with a slider for the rounds of EM, and a choice to drop the one
// line where "a" appears without "green"
export default function Lab() {
  const [round, setRound] = useState(LAB_ROUNDS)
  const [which, setWhich] = useState<Which>('Whole menu')
  const pairs = which === 'Whole menu' ? MENU : SHORT_MENU
  const tables = which === 'Whole menu' ? MENU_TABLES : SHORT_TABLES
  const table = tables[round]
  return (
    <div>
      <MenuHeader left={`Round ${round}`} right={`${pairs.length} lines`} />
      <Menu pairs={pairs} tables={tables} round={round} />
      <div className="mt-4 grid grid-cols-2 gap-4">
        <Readout label="t(un | a)" value={decimal(table.a.un)} accent />
        <Readout label="t(un | green)" value={decimal(table.green.un)} />
      </div>
      <Controls>
        <Slider label="Rounds of EM" value={round} min={0} max={LAB_ROUNDS} onChange={setRound} />
        <Choice label="Menu" options={MENUS} value={which} onChange={setWhich} />
      </Controls>
    </div>
  )
}
