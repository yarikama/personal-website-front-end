import { useState } from 'react'
import { motion } from 'motion/react'
import { Bars } from '../../components/case/Bars'
import CaseStudy from '../../components/case/CaseStudy'
import { Decision } from '../../components/case/Decision'
import { EASE, useSeen } from '../../components/case/motion'
import { Choice, Controls, Figure, Numbers, Slider } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import type { Project } from '../../types'
import ShopGraph from './ShopGraph'
import SumVsMean from './SumVsMean'

// Numbers from the GGJSSP repo: the corrected report
// (docs/project_report_submit/project_report.tex, commit 2bd7799) and
// docs/Eval_result. Error is (makespan − best known) / best known, on
// Taillard instances, for a policy trained only on 10 × 10.

export default function GnnJobShop({ project }: { project: Project }) {
  const [jobs, setJobs] = useState(3)
  const [view, setView] = useState<'Plain graph' | 'Machine hubs'>('Plain graph')
  const [rivals, setRivals] = useState(9)
  const hubs = view === 'Machine hubs'

  return (
    <CaseStudy
      project={project}
      pitch="A scheduler trained on small factories fell apart on bigger ones. The cause was one number that grows with the factory, and dividing by it fixed most of the problem."
      team={
        <>
          A Rice project with Kerstin Sun and Cheng Han Lin. Henry built the encoders, the GRPO and PPO trainers and the
          evaluation, and ran the experiments that tested the course professor’s hypothesis about why the model fails.
        </>
      }
      problem="Graph neural networks trained with reinforcement learning schedule small job shops well, then fail on larger ones. One trained on 10 × 10 shops scored 136% above the best known schedule on 15 × 15."
      did="Traced the failure to how many neighbours each step has in the graph, which grows with the number of jobs, and tested two fixes in a five-seed experiment."
      result="Either fix brings the error on unseen larger shops to about 26%, from shops 2 to 20 times the training size, level with the published L2D model."
      stats={[
        { value: 26, prefix: '~', suffix: '%', label: 'error on larger shops', note: 'was 136% on 15 × 15' },
        { value: 20, suffix: '×', label: 'largest test vs training', note: '2,000 steps vs 100' },
        { value: 5, label: 'seeds per setting', note: 'to tell a fix from luck' },
      ]}
      learned={
        <>
          When a model breaks on bigger inputs, look for what grows with the input. Here it was how many neighbours a
          node has, and a model that had only ever seen 9 was suddenly hearing from 99.
        </>
      }
    >
      <h2>The problem, in a kitchen</h2>
      <p>
        A kitchen has a few stations (an oven, a grill, a fryer) and a list of dishes. Each dish goes through the
        stations in its own fixed order, and a station cooks one thing at a time. The question is what to cook next,
        everywhere, so that the last dish is out as early as possible.
      </p>
      <p>
        That is the <strong>job shop</strong> problem: jobs instead of dishes, machines instead of stations. It is hard
        enough that factories use rules of thumb, like “do the shortest step first”. A learned scheduler sees it as a
        graph and picks the next step one at a time.
      </p>

      <Figure caption="Each dot is one step of a job, coloured by the machine it needs. Arrows are a job’s order. The thin curves link steps that compete for the same machine. Add jobs and watch them multiply.">
        <ShopGraph jobs={jobs} hubs={hubs} />
        <Controls>
          <Slider label="Jobs" value={jobs} min={2} max={10} onChange={setJobs} />
          <Choice label="Graph" options={['Plain graph', 'Machine hubs'] as const} value={view} onChange={setView} />
        </Controls>
        <Numbers
          items={[
            { label: 'Order neighbours', value: '≤ 2', note: 'any size' },
            {
              label: hubs ? 'Machine neighbours' : 'Rival neighbours',
              value: hubs ? '1' : String(jobs - 1),
              note: hubs ? 'its machine' : 'one per other job',
            },
          ]}
        />
      </Figure>

      <h2>Why bigger broke it</h2>
      <Predict
        question="A step’s rivals each send it a message, and the network adds them up. Trained with 9 rivals, it meets a shop where steps have 99. What does it see?"
        options={[
          { label: 'The same, just slower' },
          { label: 'Numbers 11 times bigger', right: true },
          { label: 'Mostly zeros' },
          { label: 'An error' },
        ]}
        reveal={
          <>
            Sums about eleven times larger than anything in training. Nothing crashes; the network just reads its inputs
            as something they aren’t, and its choices stop making sense.
          </>
        }
      />
      <Figure caption="What one step hears from its rivals, added up and averaged. Drag past the shaded range to leave what training covered.">
        <SumVsMean rivals={rivals} />
        <Controls>
          <Slider label="Rivals per step" value={rivals} min={2} max={99} onChange={setRivals} />
        </Controls>
      </Figure>
      <p>
        The course professor suspected exactly this; Henry set out to test it. He measured how far each model’s
        internal numbers shifted from 10 × 10 to 15 × 15: <strong>344%</strong> for the summing network (GIN), so far
        that the two had no overlap at all, against 56% for one that averages. He also found a second, smaller cause:
        longer job chains, which grow with the number of machines.
      </p>

      <h2>Two fixes</h2>
      <ul>
        <li>
          <strong>Average instead of add.</strong> Divide what the rivals say by how many there are. With 2 rivals or
          99, the step hears one average, and keeps its own state alongside rather than mixed in.
        </li>
        <li>
          <strong>Route through the machine.</strong> Give every machine a node of its own, like a status board at each
          station, and drop the step-to-step links. Switch the figure above to <em>Machine hubs</em>: each step now has
          at most three neighbours, whatever the size.
        </li>
      </ul>

      <h2>The decisions</h2>
      <Decision
        n={1}
        question="The plan was to train the standard GIN scheduler with a new method. GIN collapsed on larger shops. Now what?"
        options={[
          { label: 'Keep the plan, tune GIN', why: 'The trainer was the planned contribution; the encoder was a given.' },
          {
            label: 'Make the collapse the question',
            why: 'Why do these models lose what they learned when the shop grows, and what keeps it?',
            chosen: true,
          },
        ]}
      >
        <p>
          A method that scores well on one size and falls apart on the next isn’t much use to a factory, whose orders
          never come in one size. The report now calls the trainer “an implementation choice, not a research
          contribution”.
        </p>
      </Decision>

      <Decision
        n={2}
        question="How to train: with a critic (PPO), or without (GRPO)?"
        options={[
          { label: 'PPO', why: '34.4% error, 40 minutes. Its critic guesses poorly on other sizes.' },
          { label: 'GRPO + KL', why: '26.1%, 14 minutes.' },
          { label: 'GRPO-Clip', why: '26.9%, 14 minutes.' },
          { label: 'GRPO', why: '22.3%, 11 minutes. No critic: compare each schedule with its group.', chosen: true },
        ]}
      >
        <p>
          A scheduling reward only arrives when the last job finishes, which makes a critic’s running estimates noisy.
          GRPO skips the critic and scores each schedule against others sampled for the same shop. The cost, stated in
          the report: without clipping, 2 of 7 seeds collapsed.
        </p>
      </Decision>

      <Figure caption="Error of each encoder on the FT and LA benchmark sets, all trained the same way on 10 × 10. Lower is better.">
        <Bars
          better="lower"
          unit="%"
          decimals={1}
          bars={[
            { label: 'SAGE (averages)', value: 22.3, accent: true },
            { label: 'PNA', value: 32.13 },
            { label: 'GAT', value: 47.29 },
            { label: 'GCN', value: 53.2 },
            { label: 'GIN (adds)', value: 69.82 },
            { label: 'Best rule of thumb', value: 20.65, muted: true, note: 'most work remaining first' },
          ]}
        />
      </Figure>

      <Decision
        n={3}
        question="Can a normalising layer rescue the summing network, instead of changing it?"
        options={[
          { label: 'Sum + LayerNorm', why: '30.8% on the training size, 139.0% on larger ones.' },
          { label: 'Mean, mixed into own state', why: '50.0%, then 43.6%.' },
          { label: 'Mean, kept beside own state', why: '16.4%, then 22.3%.', chosen: true },
        ]}
      >
        <p>
          Normalising after the sum looked fine on the size it trained on and failed on every other. The problem had to
          be fixed where the numbers are made.
        </p>
      </Decision>

      <Decision
        n={4}
        question="Which saved model counts as the result?"
        options={[
          {
            label: 'The best training rollout',
            why: 'Picks lucky moments: one seed’s “best” scored 146%, its final model 26.6%.',
          },
          {
            label: 'Greedy runs on 100 fixed shops, every 20 epochs',
            why: 'Slower, and the reported error rose from 28.2% to 29.7%.',
            chosen: true,
          },
        ]}
      >
        <p>
          The honest number was the worse one. Every result on this page comes from models chosen on held-out shops,
          over five seeds.
        </p>
      </Decision>

      <h2>The results</h2>
      <p>
        The five-seed experiment crossed the two fixes, on graphs with machine hubs: keep the rival links or route only
        through the hubs, and add or average. Each cell is the average error over all eight larger Taillard sizes.
      </p>
      <Factorial />
      <p>
        Either fix alone reaches about 26%; together they don’t stack. Two roads to the same ceiling. Averaging on the
        plain graph, without hubs, gets 29.7%.
      </p>

      <Figure caption="Average error over the eight larger Taillard sizes (15 × 15 to 100 × 20), trained on 10 × 10 only. Lower is better.">
        <Bars
          better="lower"
          unit="%"
          decimals={1}
          bars={[
            { label: 'Hubs + attention (best)', value: 25.71, accent: true, note: '± 0.30 over 5 seeds' },
            { label: 'L2D (published)', value: 25.46, muted: true },
            { label: 'Best rule per instance', value: 27.53 },
            { label: 'Most operations remaining', value: 28.32, note: 'a rule of thumb' },
            { label: 'Averaging, plain graph', value: 29.72 },
          ]}
        />
      </Figure>

      <h2>Where it stands</h2>
      <ul>
        <li>
          <strong>Level with L2D,</strong> the standard published model (25.7% vs 25.5%), with about a third of its
          training time, on different hardware.
        </li>
        <li>
          <strong>Only 1.5 to 2 points better than the best rule of thumb.</strong> The gain is in not collapsing, not
          yet in beating simple rules by much.
        </li>
        <li>
          <strong>About 10 points behind the strongest learned scheduler</strong> (ScheduleNet, 16.1%).
        </li>
      </ul>
    </CaseStudy>
  )
}

// The 2 × 2 experiment as a grid that fills in when seen: darker is worse
const CELLS = [
  { row: 'Rival links kept', col: 'Add', value: 29.2 },
  { row: 'Rival links kept', col: 'Average', value: 25.88 },
  { row: 'Hubs only', col: 'Add', value: 26.21 },
  { row: 'Hubs only', col: 'Average', value: 26.04 },
]

function Factorial() {
  const { ref, seen } = useSeen<HTMLDivElement>(0.5)
  return (
    <div ref={ref} className="not-prose my-10">
      <div className="grid grid-cols-[minmax(6rem,9rem)_1fr_1fr] gap-2 text-center">
        <span />
        {['Add', 'Average'].map((col) => (
          <span key={col} className="font-mono text-[0.875rem] uppercase tracking-widest text-zinc-faded">
            {col}
          </span>
        ))}
        {['Rival links kept', 'Hubs only'].map((row, r) => (
          <div key={row} className="contents">
            <span className="flex items-center justify-end pr-2 text-right font-mono text-[0.8125rem] uppercase tracking-widest text-zinc-faded">
              {row}
            </span>
            {CELLS.filter((cell) => cell.row === row).map((cell, c) => {
              const worst = cell.value > 28
              return (
                <motion.div
                  key={cell.col}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={seen ? { opacity: 1, scale: 1 } : {}}
                  transition={{ duration: 0.5, delay: 0.15 + (r * 2 + c) * 0.15, ease: EASE }}
                  className={`flex flex-col items-center justify-center border py-6 ${
                    worst ? 'border-ink/40 bg-ink/10' : 'border-sage bg-sage/15'
                  }`}
                >
                  <span className={`font-serif text-4xl font-light tabular-nums ${worst ? 'text-ink' : 'text-sage'}`}>
                    {cell.value.toFixed(1)}%
                  </span>
                  <span className="mt-1 font-mono text-[0.8rem] uppercase tracking-widest text-zinc-400">
                    {worst ? 'neither fix' : cell.row === 'Hubs only' && cell.col === 'Average' ? 'both' : 'one fix'}
                  </span>
                </motion.div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
