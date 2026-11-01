import { useState } from 'react'
import { Bars } from '../../components/case/Bars'
import CaseStudy from '../../components/case/CaseStudy'
import { Decision } from '../../components/case/Decision'
import { Lines } from '../../components/case/Lines'
import { Choice, Controls, Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import type { Project } from '../../types'
import Patches from './Patches'

// Accuracy with 25%, 50% and 75% of the image patches kept, N = 100 per
// cell (report/PAPIT.tex Table 1, recomputed from outputs/distill100k_attn_L8_*.csv)
const RESULTS = {
  TextVQA: { unpruned: 36.7, random: [23.7, 30.7, 32.0], clip: [20.0, 28.3, 31.7], distill: [36.0, 36.0, 33.3] },
  'VQA v2': { unpruned: 83.3, random: [81.7, 81.0, 82.0], clip: [72.3, 80.3, 82.7], distill: [79.3, 83.3, 85.0] },
  GQA: { unpruned: 57.0, random: [52.0, 52.0, 55.0], clip: [55.0, 52.0, 50.0], distill: [53.0, 56.0, 55.0] },
} as const
type Benchmark = keyof typeof RESULTS
const BENCHMARKS = Object.keys(RESULTS) as Benchmark[]
const KEPT = [25, 50, 75]
const line = (values: readonly number[]) => values.map((v, i) => [KEPT[i], v] as [number, number])

const RANGE: Record<Benchmark, { min: number; max: number; ticks: number[] }> = {
  TextVQA: { min: 15, max: 40, ticks: [20, 25, 30, 35, 40] },
  'VQA v2': { min: 70, max: 87, ticks: [70, 75, 80, 85] },
  GQA: { min: 48, max: 60, ticks: [50, 55, 60] },
}

export default function Papit({ project }: { project: Project }) {
  const [benchmark, setBenchmark] = useState<Benchmark>('TextVQA')
  const r = RESULTS[benchmark]

  return (
    <CaseStudy
      project={project}
      pitch="An image model reads every patch of a photo, even the ones the question doesn’t need. A tiny scorer guesses which ones the model will ignore, and drops them before the expensive part."
      team={
        <>
          A Rice COMP 646 project with Chao Hsuan Ho and Kerstin Sun. Henry’s part: the alignment diagnostic, the
          attention oracle, the distilled scorer and its latency benchmark, and the write-up.
        </>
      }
      problem="LLaVA turns every photo into 576 tokens, and its language model spends most of its attention on them, though a question usually needs fewer than half."
      did="Showed that the obvious shortcut (keep what CLIP finds salient) doesn’t track what the language model uses, then trained a 1.3M-parameter scorer to imitate the language model’s own attention."
      result="Keeping a quarter of the patches, it nearly matched the full model on TextVQA (36.0 vs 36.7), 12.3 points above random pruning."
      stats={[
        { value: 36.0, decimals: 1, label: 'TextVQA, ¼ of patches', note: 'full image: 36.7' },
        { value: 12.3, decimals: 1, prefix: '+', label: 'points over random', note: 'same quarter kept' },
        { value: 0.43, decimals: 2, suffix: ' ms', label: 'to score an image', note: 'the scorer’s own pass' },
      ]}
      learned={
        <>
          The most accurate signal isn’t always the best one to learn from. Layer 16 picked better patches; layer 8
          was easier to imitate, and the imitation is what runs.
        </>
      }
    >
      <h2>Why fewer patches is a big deal</h2>
      <Predict
        question="LLaVA keeps only 1 in 4 image patches. How much of its attention work is left?"
        options={[{ label: 'About 75%' }, { label: 'About 25%' }, { label: 'About 10%', right: true }, { label: 'About 1%' }]}
        reveal={
          <>
            About a tenth. In attention every token looks at every other token, so the work grows with the{' '}
            <em>square</em> of their number. A question of about 50 tokens plus 576 patches is 626 tokens; with 144
            patches it is 194, and (194 ÷ 626)² ≈ 0.096.
          </>
        }
      />
      <p>
        So the question isn’t whether to drop patches, it’s <strong>which</strong>. Drop the wrong quarter and the
        model answers confidently from what’s left.
      </p>

      <Steps
        say={[
          <>LLaVA cuts every photo into a 24 × 24 grid: 576 patches, each one a token its language model has to read.</>,
          <>
            Keep a quarter at random and you keep a little of everything, but the brand label is mostly gone. The model
            answers “Canon”.
          </>,
          <>
            Keep what CLIP, the image encoder, finds salient: the camera as a whole. The small label still loses out.
            “Polaroid”.
          </>,
          <>
            Henry’s scorer learned where the language model itself looks, and keeps the label. “Dakota”, which is right.
          </>,
        ]}
      >
        {(step) => <Patches step={step} />}
      </Steps>
      <p className="text-sm">
        The photo and its patches are drawn for illustration; the answers are the models’ real ones on this TextVQA
        question, with 25% of patches kept.
      </p>

      <h2>The decisions</h2>
      <p>
        The team’s first scorer, PAPIT-CLIP, used CLIP’s own idea of what matters: it heats up on the object the
        question names, and on paper that should be enough. Its best version only matched random pruning.
      </p>

      <Decision
        n={1}
        question="The CLIP scorer only ties with random. Tune it more, or find out why?"
        options={[
          { label: 'Keep tuning the CLIP scorer', why: 'Three variants were already tried; the best one matched random.' },
          {
            label: 'Measure whether CLIP’s picks match the LLM’s',
            why: 'Compare, patch by patch, what CLIP rates highly with what the language model attends to.',
            chosen: true,
          },
        ]}
      >
        <p>
          Henry ran an alignment check on 100 questions from each of three benchmarks. The correlation between the two
          rankings was <strong>about zero on all three</strong> (between −0.02 and +0.01). Their top 10% of patches
          overlapped less than two random picks would. No amount of tuning makes a signal track something it doesn’t
          see.
        </p>
      </Decision>

      <Decision
        n={2}
        question="Then is there a good signal anywhere?"
        options={[
          { label: 'Give up on smart pruning', why: 'Random is a strong baseline; maybe it can’t be beaten.' },
          {
            label: 'Ask the LLM itself, as an oracle',
            why: 'Run the model once, read its attention to the patches, prune, then answer. Too slow to use; a test of what’s possible.',
            chosen: true,
          },
        ]}
      >
        <p>
          The oracle beat random when it read the middle layers (8 to 24), and not at layer 2, the layer an earlier
          method (FastV) uses, nor at the last. So a good signal exists, but only in the language model, and reading it
          costs a whole extra pass.
        </p>
      </Decision>

      <Figure caption="Accuracy on 100 GQA questions with 25% of patches kept, choosing patches by the attention of each LLM layer (the oracle).">
        <Bars
          decimals={0}
          unit="%"
          max={65}
          bars={[
            { label: 'Full image', value: 58, muted: true },
            { label: 'Random', value: 53 },
            { label: 'Layer 2', value: 49 },
            { label: 'Layer 8', value: 58 },
            { label: 'Layer 16', value: 61, accent: true },
            { label: 'Layer 24', value: 60 },
            { label: 'Last layer (31)', value: 50 },
          ]}
        />
      </Figure>

      <Decision
        n={3}
        question="Which layer should a small, fast scorer learn to imitate?"
        options={[
          { label: 'Layer 16', why: 'The best oracle. Imitated: +2.4 points over random on average.' },
          { label: 'Layer 24', why: 'Imitated: +2.1.' },
          { label: 'Attention rollout', why: 'All layers combined. Imitated: 5.4 points worse than random.' },
          { label: 'Layer 8', why: 'A weaker oracle, but the easiest to imitate. Imitated: +3.0.', chosen: true },
        ]}
      >
        <p>
          Henry chose by what the <strong>imitation</strong> scored downstream, across all nine benchmark-and-ratio
          cells, not by which oracle looked best. Layer 8’s pattern was the simplest to learn (the lowest error in
          training), and that mattered more than being the sharpest signal.
        </p>
      </Decision>

      <Decision
        n={4}
        question="How big does the scorer need to be?"
        options={[
          { label: 'Bilinear, 0.92M', why: 'Too simple: validation error 0.43.' },
          { label: '2-layer MLP, 0.59M', why: 'Validation error 0.12.' },
          { label: 'Cross-attention, 1.58M', why: 'Validation error 0.089.' },
          { label: '4-layer MLP, 1.28M', why: 'Validation error 0.087: the best, and smaller than cross-attention.', chosen: true },
        ]}
      >
        <p>
          The scorer sees each patch’s features next to the question’s embedding and gives one score per patch. It is
          trained to match the language model’s layer-8 attention, and only it is trained: CLIP and the language model
          stay frozen. Pruning happens before the patches reach the language model, so the dropped ones cost nothing
          there.
        </p>
      </Decision>

      <h2>The results</h2>
      <Figure caption="Accuracy as more patches are kept (100 questions per point). The dashed line is the full image.">
        <Lines
          key={benchmark}
          series={[
            { name: 'Full image', points: line([r.unpruned, r.unpruned, r.unpruned]), dashed: true, muted: true },
            { name: 'Random', points: line(r.random) },
            { name: 'PAPIT-CLIP', points: line(r.clip), warm: true },
            { name: 'Distilled (L8)', points: line(r.distill), accent: true },
          ]}
          x={{ min: 25, max: 75, ticks: KEPT, format: (v) => `${v}%` }}
          y={RANGE[benchmark]}
          xLabel="Patches kept"
          yLabel="Accuracy"
          mark={benchmark === 'TextVQA' ? { x: 25, y: 36.0, label: '36.0' } : undefined}
        />
        <Controls>
          <Choice label="Benchmark" options={BENCHMARKS} value={benchmark} onChange={setBenchmark} />
        </Controls>
      </Figure>
      <p>
        The gap is widest where it matters most: TextVQA, where answers hide in small text, and the smallest budget. At
        a quarter of the patches the distilled scorer reads the label that random and CLIP pruning cut away.
      </p>

      <Numbers
        items={[
          { label: 'Scorer', value: '0.43 ms', note: 'per image' },
          { label: 'CLIP + GradCAM', value: '65 ms', note: 'its own backward pass' },
          { label: 'Oracle', value: '216 ms', note: 'an extra LLM pass' },
        ]}
        words
      />
      <p>
        The scorer reuses image features LLaVA computes anyway, so its own cost is one small forward pass. The tenfold
        saving in attention is the formula above, not a timed run.
      </p>

      <h2>What it doesn’t show yet</h2>
      <ul>
        <li>
          <strong>Small samples.</strong> 100 questions per cell; the +12.3 is about 2.5 standard errors, worth
          repeating at 500 or more.
        </li>
        <li>
          <strong>One model.</strong> Only LLaVA-1.5-7B; LLaVA-1.6 and Qwen2.5-VL are next.
        </li>
        <li>
          <strong>No end-to-end timing.</strong> The saving is computed for attention; the whole pipeline wasn’t timed.
        </li>
      </ul>
    </CaseStudy>
  )
}
