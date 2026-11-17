import { useState } from 'react'
import { seeded } from '../../components/explain/random'
import { Button, Choice, Controls, Readout } from '../../components/explain/figure'
import Hops from './Hops'
import {
  chance,
  chanceText,
  hops,
  LAB_NAMES,
  LAB_ORDERS,
  MODELS,
  N_NAMES,
  NS,
  ORDERS,
  REPEATS,
  sample,
  seenEntries,
  tableSize,
  vocabulary,
  WRITE_SEED,
} from './model'

type Pick = (typeof LAB_NAMES)[number]

// The table a model could need over the café's words, plus the end mark
const TOKENS = vocabulary(ORDERS).length + 1

// Score an order with a unigram, bigram or trigram model counted from the
// café's orders, or have the model write one of its own
export default function Lab() {
  const [n, setN] = useState<(typeof NS)[number]>(2)
  const [pick, setPick] = useState<Pick>('New')
  // The order "Write one" drew: the model's own, from this seed
  const [seed, setSeed] = useState(WRITE_SEED)

  const model = MODELS[n - 1]
  const order = pick === 'Written' ? sample(model, seeded(seed)) : LAB_ORDERS[LAB_NAMES.indexOf(pick)]
  const heard = (ORDERS as readonly string[]).includes(order)
  const p = chance(model, order)

  const write = () => {
    setSeed(seed + 1)
    setPick('Written')
  }

  return (
    <div>
      <p className="font-serif text-2xl font-light leading-snug">
        <span className="text-ink">“{order || '(says nothing)'}”</span>{' '}
        <span className="font-mono text-[0.875rem] uppercase tracking-widest text-zinc-faded">
          {heard ? 'heard before' : 'never heard'}
        </span>
      </p>
      <div className="mx-auto mt-6 max-w-[26rem]">
        <Hops
          key={`${n}-${order}`}
          hops={hops(model, order)}
          named
          label={`“${order}” under the ${N_NAMES[n]} model: ${hops(model, order)
            .map((h) => `${h.count} of ${h.of}`)
            .join(', ')}; chance ${chanceText(p)}.`}
        />
      </div>
      <div className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
        <Readout label="Chance of the order" value={chanceText(p)} accent={p > 0} />
        <Readout label="Table filled" value={`${seenEntries(model)} of ${tableSize(TOKENS, n).toLocaleString('en-US')}`} />
        <Readout label="Written orders it heard" value={`${Math.round(REPEATS[n - 1] * 100)}%`} />
      </div>
      <Controls>
        <Choice label="Looks back" options={NS} value={n} onChange={setN} format={(k) => N_NAMES[k]} />
        <Choice label="Order" options={LAB_NAMES} value={pick} onChange={setPick} />
        <Button onClick={write}>Write one</Button>
      </Controls>
    </div>
  )
}
