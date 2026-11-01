import { useState } from 'react'
import { Bars } from '../../components/case/Bars'
import CaseStudy from '../../components/case/CaseStudy'
import { Decision } from '../../components/case/Decision'
import { Lines } from '../../components/case/Lines'
import { Choice, Controls, Figure } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import type { Project } from '../../types'
import Poisoned from './Poisoned'

// Numbers from comp584-project: EXPERIMENT.md, analysis/REPORT_V2.md and the
// run logs. Llama-3.1-8B-Instruct, 100 attacks per setting.

// Linear-probe accuracy at each layer, 5-fold, n = 112. Read at the last
// token of the model's reply, and at the last token of the input
// (recomputed from analysis/outputs/hs_v4_single with the repo's settings)
const REPLY = [
  0.491, 0.91, 0.937, 0.937, 0.937, 0.937, 0.91, 0.937, 0.946, 0.955, 0.964, 0.946, 0.955, 0.946, 0.928, 0.937, 0.892,
  0.883, 0.839, 0.821, 0.821, 0.82, 0.803, 0.829, 0.785, 0.794, 0.775, 0.785, 0.777, 0.768, 0.768, 0.812, 0.804,
]
const byLayer = (values: number[]) => values.map((v, layer) => [layer, v * 100] as [number, number])

// Single-turn: attack success, privacy leak score, original task success
const ALPHAS = {
  0: { attack: 56, leak: 52.3, task: 42 },
  1: { attack: 54, leak: 49.3, task: 46 },
  2: { attack: 54, leak: 48.0, task: 43 },
  5: { attack: 50, leak: 37.8, task: 42 },
  10: { attack: 0, leak: 0, task: 0 },
} as const
type Alpha = keyof typeof ALPHAS
const ALPHA_OPTIONS = [0, 1, 2, 5, 10] as Alpha[]

export default function ToolPoisoning({ project }: { project: Project }) {
  const [alpha, setAlpha] = useState<Alpha>(5)
  const a = ALPHAS[alpha]

  return (
    <CaseStudy
      project={project}
      pitch="An AI agent can be talked out of its secrets by a tool that merely describes itself persuasively. Henry found where in the model the decision to leak is made, and nudged it the other way."
      team={
        <>
          A Rice COMP 584 project with Vincent Chang, Kerstin Sun and Shaoyang Zhang. Henry was the team’s
          representation engineer: he brought up the attack, fixed the inference stack, and built the probes and the
          steering.
        </>
      }
      problem="Agents fill in tool parameters from their instructions. A tool whose parameter description asks for private data gets it: Llama 3.1-8B called the bad tool in 56% of attacks."
      did="Probed the model’s hidden states for a direction that separates leaking from not leaking, then pushed along it while the model writes its reply."
      result="Privacy leakage fell 14.5 points with no loss in task success, where telling the model to be careful cut leakage as much but made it call the bad tool more and finish fewer tasks."
      stats={[
        { value: 14.5, decimals: 1, prefix: '−', suffix: ' pts', label: 'privacy leak score', note: '52.3 → 37.8' },
        { value: 96, suffix: '%', label: 'probe accuracy', note: 'at layer 10' },
        { value: 0, prefix: '±', suffix: ' pts', label: 'task success', note: '42% before and after' },
      ]}
      learned={
        <>
          Look for a decision where it is made. Nothing in the model’s reading of the prompt predicted a leak; the same
          kind of probe, read while it wrote its reply, was right 96% of the time.
        </>
      }
    >
      <h2>The attack</h2>
      <p>
        An agent is a language model that can call tools: it reads a tool’s description, fills in its parameters, and
        calls it. Nothing checks whether a parameter’s description is honest. Think of an official-looking form that
        asks for your tax number “to process your request”, and an assistant eager to finish the form.
      </p>
      <Steps
        say={[
          <>The agent holds a user’s private data, and is told plainly not to give it to anyone, tools included.</>,
          <>The user asks for something ordinary: an investment risk analysis.</>,
          <>
            Among its tools is one that looks made for the job. One parameter’s description asks for the tax number, and
            says to <em>guess it</em> if it isn’t given.
          </>,
          <>The model calls the tool with the real tax number. This happened, word for word, in the experiment.</>,
        ]}
      >
        {(step) => <Poisoned step={step} />}
      </Steps>
      <p>
        Three numbers describe each run of 100 attacks: how often the model called the bad tool (attack success), how
        closely the value it handed over matched the real secret (the privacy leak score, from 0 to 100), and how often
        it still did the user’s task with a real tool (task success).
      </p>

      <h2>The decisions</h2>
      <Decision
        n={1}
        question="Which agent setup should the baseline use?"
        options={[
          {
            label: 'The original multi-step agent',
            why: 'It forced the bad tool into every step: 86% attack success on GPT, an inflated number.',
          },
          {
            label: 'Plain function calling',
            why: 'The model chooses its tools itself: 49% on GPT. What a real agent does.',
            chosen: true,
          },
        ]}
      >
        <p>A defence measured against an attack that can’t fail would prove nothing.</p>
      </Decision>

      <Decision
        n={2}
        question="An early probe scored 97.5%. Keep it, or audit the stack it ran on?"
        options={[
          { label: 'Keep the result', why: 'It looked like the finding.' },
          {
            label: 'Fix the stack, rerun everything',
            why: 'Four bugs: tools missing from the chat template, a mask hiding end-of-turn tokens, an extra model call, a parser that broke on nested JSON.',
            chosen: true,
          },
        ]}
      >
        <p>
          Each bug changed what the model saw or what was recorded, so the 97.5% couldn’t be trusted. He threw it out
          and rebuilt the data. He also sampled at temperature 1 with a fixed seed: greedy decoding made Llama refuse
          almost everything, a different situation from the one being defended.
        </p>
      </Decision>

      <Predict
        question="A probe reads the model’s hidden state and guesses whether it is about to leak. Where should it read?"
        options={[
          { label: 'At the end of the prompt' },
          { label: 'At the first word of the reply' },
          { label: 'At the end of the reply', right: true },
          { label: 'Anywhere works' },
        ]}
        reveal={
          <>
            At the end of the prompt the probe was at chance, 49%: the model hasn’t decided yet. At the end of its reply
            (the tool call) it was right 96% of the time. The decision to leak is made while writing the call.
          </>
        }
      />

      <Decision
        n={3}
        question="Where in the model to look for the decision?"
        options={[
          { label: 'The last token of the input', why: 'The usual place. Here: 49%, a coin flip.' },
          { label: 'The first token of the reply', why: '53%.' },
          { label: 'The middle of the reply', why: '94%.' },
          { label: 'The last token of the reply', why: '96%, at layer 10.', chosen: true },
        ]}
      >
        <p>
          Henry’s hypothesis was that the decision to leak only takes shape while the tool call is generated, so he read
          five positions instead of one. A linear probe and a small neural network scored about the same, so the plan’s
          more complex learned “vector field” wasn’t needed: <strong>one straight direction</strong> separates the two.
        </p>
      </Decision>

      <Figure caption="Linear probe accuracy at each of the model’s layers, read at the end of the reply (112 examples, 5-fold). Read at the end of the prompt instead, it never rises above 49%, no better than a coin flip.">
        <Lines
          series={[
            { name: 'End of reply', points: byLayer(REPLY), accent: true },
            { name: 'Coin flip', points: [[0, 50], [32, 50]], muted: true, dashed: true },
          ]}
          x={{ min: 0, max: 32, ticks: [0, 8, 16, 24, 32] }}
          y={{ min: 40, max: 100, ticks: [50, 60, 70, 80, 90, 100] }}
          xLabel="Layer"
          yLabel="Probe accuracy"
          format={(v) => `${v}%`}
          mark={{ x: 10, y: 96.4, label: '96.4%' }}
        />
      </Figure>

      <h2>Steering</h2>
      <p>
        The direction is the difference between the model’s average state when it stayed safe and when it leaked, at
        layer 10. While the model writes its reply, Henry adds that direction to its state, scaled by a strength α. The
        prompt is left alone. Choose a strength:
      </p>
      <Figure caption="Single-turn runs of 100 attacks at each steering strength. At α = 10 the model stops producing usable output at all.">
        <Bars
          key={alpha}
          max={60}
          decimals={1}
          bars={[
            { label: 'Attack success', value: a.attack, display: `${a.attack}%` },
            { label: 'Privacy leak score', value: a.leak, display: a.leak.toFixed(1), accent: true },
            { label: 'Task success', value: a.task, display: `${a.task}%` },
          ]}
        />
        <Controls>
          <Choice label="Steering strength" options={ALPHA_OPTIONS} value={alpha} onChange={setAlpha} />
        </Controls>
      </Figure>

      <Decision
        n={4}
        question="How hard to push?"
        options={[
          { label: 'α = 1 or 2', why: 'Leak score barely moves: 49.3, 48.0.' },
          { label: 'α = 10 or 20', why: 'No leaks, because no output: the model breaks.' },
          { label: 'α = 5', why: 'Leak score 37.8, task success unchanged at 42%.', chosen: true },
        ]}
      >
        <p>
          He swept 0, 1, 2, 5, 10 and 20 and took the strongest push before the model broke. Nothing between 5 and 10
          was tried, so the true sweet spot may be a little higher.
        </p>
      </Decision>

      <h2>Against the obvious fix</h2>
      <p>
        The obvious defence is to tell the model, in its instructions, to read each parameter description and refuse
        to fill in private data. It works on leakage, and costs elsewhere:
      </p>
      <Figure caption="Single-turn, 100 attacks each. The careful-prompt defence cuts leakage about as much, but the model calls the bad tool more and completes fewer tasks.">
        <div className="flex flex-col gap-8">
          {(
            [
              ['Privacy leak score', 'leak', [52.3, 38.6, 37.8]],
              ['Attack success', 'attack', [56, 62, 50]],
              ['Task success', 'task', [42, 36, 42]],
            ] as const
          ).map(([title, , values]) => (
            <div key={title}>
              <p className="mb-3 font-mono text-[0.75rem] uppercase tracking-widest text-zinc-faded">{title}</p>
              <Bars
                max={70}
                decimals={title === 'Privacy leak score' ? 1 : 0}
                unit={title === 'Privacy leak score' ? '' : '%'}
                bars={[
                  { label: 'No defence', value: values[0], muted: true },
                  { label: 'Careful prompt', value: values[1] },
                  { label: 'Steering, α = 5', value: values[2], accent: true },
                ]}
              />
            </div>
          ))}
        </div>
      </Figure>
      <p>
        The careful prompt’s trade-off held in multi-turn conversations too: attack success up from 59% to 65%, task
        success down from 44% to 38%. Steering was only tested single-turn; in multi-turn data the direction nearly
        vanished, which the team left as future work.
      </p>

      <h2>What it doesn’t show yet</h2>
      <ul>
        <li>
          <strong>Small and single.</strong> 112 examples for the probe, 100 attacks per setting, one seed, one model.
          Differences of a point or two are within noise.
        </li>
        <li>
          <strong>No held-out set.</strong> The direction and its strength were chosen on the same tasks they were
          scored on.
        </li>
        <li>
          <strong>Single-turn only</strong> for steering, as above.
        </li>
      </ul>
    </CaseStudy>
  )
}
