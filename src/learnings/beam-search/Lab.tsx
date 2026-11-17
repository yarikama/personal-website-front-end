import { useState } from 'react'
import { Button, Choice, Controls, Readout } from '../../components/explain/figure'
import { seeded } from '../../components/explain/random'
import Tree from './Tree'
import {
  beam,
  best,
  HIT_RATES,
  nodeCount,
  pct,
  perWord,
  reroll,
  samePath,
  sentence,
  STORY,
  three,
  TREES,
  TRIALS,
  two,
  WIDTHS,
  type Hypothesis,
  type Scoring,
  type TreeName,
} from './model'

const NAMES = ['Story', 'Trap', 'Lengths', 'Random'] as const
type Name = (typeof NAMES)[number]
const SCORINGS: readonly Scoring[] = ['total', 'per word']

// Beam search on a tree you pick, at a width you pick, beside the best
// sentence found by scoring every one
export default function Lab() {
  const [name, setName] = useState<Name>('Story')
  const [width, setWidth] = useState<(typeof WIDTHS)[number]>(1)
  const [scoring, setScoring] = useState<Scoring>('total')
  const [seed, setSeed] = useState(1)

  const tree = name === 'Random' ? reroll(STORY, seeded(seed)) : TREES[name as TreeName]
  const run = beam(tree, width, scoring)
  const top = best(tree, scoring)
  const hit = samePath(run.result, top)
  const score = (h: Hypothesis) => (scoring === 'total' ? three(h.chance) : `${two(perWord(h))} a word`)

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 font-mono text-[0.875rem] uppercase tracking-widest">
        <span className="shrink-0 text-zinc-faded">“{tree.context}”</span>
        <span className={`text-right ${hit ? 'text-sage-ink' : 'text-ink'}`}>{hit ? 'Found the best' : 'Missed the best'}</span>
      </div>
      <div className="mt-3">
        <Tree
          key={`${name}-${seed}-${width}-${scoring}`}
          tree={tree}
          show={{ width, chances: 'all', scoring, best: true, pace: 380 }}
          label={`Beam search with width ${width} on “${tree.context}” writes “${sentence(run.result)}”; the best sentence is “${sentence(top)}”`}
        />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
        <Readout label={`Width ${width} writes`} value={<span className="text-2xl">{sentence(run.result)}</span>} accent={hit} />
        <Readout label="Best of all" value={<span className="text-2xl">{sentence(top)}</span>} />
        <Readout
          label="Partial sentences scored"
          value={
            <>
              {run.scored}
              <span className="text-xl text-zinc-faded"> of {nodeCount(tree)}</span>
            </>
          }
        />
      </div>
      <p className="mt-2 font-mono text-[0.875rem] text-zinc-faded">
        {score(run.result)} against {score(top)}
      </p>
      <Controls>
        <Choice label="Tree" options={NAMES} value={name} onChange={setName} />
        <Choice label="Beam width" options={WIDTHS} value={width} onChange={setWidth} />
        <Choice label="Compare by" options={SCORINGS} value={scoring} onChange={setScoring} />
        {name === 'Random' && <Button onClick={() => setSeed((s) => s + 1)}>New chances</Button>}
      </Controls>
      <p className="mt-6 font-mono text-[0.875rem] text-zinc-faded">
        Over {TRIALS.trees.toLocaleString('en-US')} story trees with random chances, the best reply is found by width{' '}
        {WIDTHS.map((k) => `${k}: ${pct(HIT_RATES[k])}`).join(' · ')}
      </p>
    </div>
  )
}
