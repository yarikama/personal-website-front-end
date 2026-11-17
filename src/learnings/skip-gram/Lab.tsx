import { useState } from 'react'
import { Choice, Controls, Readout } from '../../components/explain/figure'
import Alike from './Alike'
import { alike, DEFAULTS, EPOCHS, found, LOOKALIKES, runFor } from './model'

// Train skip-gram on the twelve sentences with the reader's settings and see
// which words end up alike. Each setting's run is worked out once.

const KS = [0, 1, 3, 10] as const
const VECTORS = [2, 1] as const
const WORDS = ['cat', 'milk', 'sofa'] as const

const partnerOf = (word: string) => LOOKALIKES.flatMap(([a, b]) => (a === word ? [b] : b === word ? [a] : []))[0]

export default function Lab() {
  const [k, setK] = useState<(typeof KS)[number]>(3)
  const [vectors, setVectors] = useState<(typeof VECTORS)[number]>(2)
  const [word, setWord] = useState<(typeof WORDS)[number]>('cat')

  const run = runFor({ ...DEFAULTS, k, vectors })
  const ranked = alike(run.v, word)
  const partner = partnerOf(word)
  const pairs = found(run.v)

  return (
    <div>
      <div className="flex flex-wrap gap-x-10 gap-y-3">
        <Readout label={`Most like ${word}`} value={ranked[0].word} accent={ranked[0].word === partner} />
        <Readout label="Look-alikes found" value={`${pairs} of ${LOOKALIKES.length}`} accent={pairs === LOOKALIKES.length} />
      </div>
      <div className="mt-4">
        <Alike
          words={ranked.map((entry) => entry.word)}
          values={ranked.map((entry) => entry.cosine)}
          watch={partner}
          label={`After ${EPOCHS} passes with ${k} noise words a pair and ${vectors} vector${vectors === 1 ? '' : 's'} a word, the word most like ${word} is ${ranked[0].word}; ${pairs} of the ${LOOKALIKES.length} look-alike pairs are found.`}
        />
      </div>
      <Controls>
        <Choice label="Noise words a pair" options={KS} value={k} onChange={setK} />
        <Choice label="Arrows a word" options={VECTORS} value={vectors} onChange={setVectors} format={(n) => (n === 2 ? 'Two' : 'One')} />
        <Choice label="Look from" options={WORDS} value={word} onChange={setWord} />
      </Controls>
    </div>
  )
}
