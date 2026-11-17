import { useState } from 'react'
import { Choice, Controls, Readout } from '../../components/explain/figure'
import { LAB_PRESETS, LAB_REFERENCES, labScore, two } from './model'

const OWN = 'Yours'
const OUTPUTS = [...LAB_PRESETS.map((p) => p.name), OWN] as const
type Output = (typeof OUTPUTS)[number]
const REFERENCES = [1, 2] as const

const ROWS = ['1-grams', '2-grams', '3-grams', '4-grams']
const label = 'font-mono text-[0.875rem] uppercase tracking-widest text-zinc-faded'

// Score one output against one or two human translations: every n-gram of
// the output, sage when a reference has it (each used up once), with the
// four shares, the length charge and BLEU under them
export default function Lab() {
  const [output, setOutput] = useState<Output>(LAB_PRESETS[0].name)
  const [text, setText] = useState<string>(LAB_PRESETS[0].text)
  const [references, setReferences] = useState<(typeof REFERENCES)[number]>(1)
  const score = labScore(text, references)

  const pick = (name: Output) => {
    setOutput(name)
    const preset = LAB_PRESETS.find((p) => p.name === name)
    if (preset) setText(preset.text)
  }

  return (
    <div>
      <div className="flex flex-col gap-1 font-mono text-[0.875rem]">
        {LAB_REFERENCES.slice(0, references).map((reference, i) => (
          <p key={reference} className="text-ink">
            <span className="text-zinc-faded">Reference {i + 1}: </span>
            {reference}
          </p>
        ))}
      </div>

      <label className="mt-5 flex flex-col gap-2">
        <span className={label}>Candidate</span>
        <input
          value={text}
          onChange={(event) => {
            setText(event.target.value)
            setOutput(OWN)
          }}
          spellCheck={false}
          className="w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-1.5 font-mono text-[0.875rem] text-ink dark:border-zinc-200/20"
        />
      </label>

      <div className="mt-5 flex flex-col gap-3">
        {score.shares.map((s, i) => (
          <div key={s.n} className="flex items-start gap-3">
            <span className={`${label} w-20 shrink-0 pt-1`}>{ROWS[i]}</span>
            <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
              {s.grams.length === 0 && <span className="pt-1 font-mono text-[0.8rem] text-zinc-faded">none</span>}
              {s.grams.map((g, k) => (
                <span
                  key={k}
                  className={`rounded-lg border px-2 py-0.5 font-mono text-[0.8rem] ${
                    g.matched ? 'border-sage bg-sage/15 text-ink' : 'border-zinc-300 text-zinc-faded dark:border-zinc-200/20'
                  }`}
                >
                  {g.gram}
                </span>
              ))}
            </div>
            <span className="w-12 shrink-0 pt-1 text-right font-mono text-[0.875rem] tabular-nums text-ink">
              {s.total === 0 ? '–' : `${s.matched}/${s.total}`}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <Readout label="Shares, averaged" value={two(score.mean)} />
        <Readout label={`Length ${score.c} of ${score.r}`} value={`× ${two(score.bp)}`} />
        <Readout label="BLEU" value={two(score.bleu)} accent />
      </div>

      <Controls>
        <Choice label="Output" options={OUTPUTS} value={output} onChange={pick} />
        <Choice label="References" options={REFERENCES} value={references} onChange={setReferences} />
      </Controls>
    </div>
  )
}
