import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Button, Choice, Controls, Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Lab from './Lab'
import {
  CHECK,
  CHECK_FULL,
  CHECK_PARAMS,
  CHECK_SQUARE,
  D,
  FULL,
  GUESS_RANK,
  HOURS,
  LAB,
  loraParams,
  loraShare,
  METHODS,
  N,
  PAPER,
  percent,
  ROOMS,
  STARTS,
  STORY,
  thousands,
  WORKED,
  type Method,
  type Start,
} from './model'
import Schedule, { type Show } from './Schedule'

// What the story's figure shows at each step
const SCENES: Show[] = ['table', 'every', 'shape', 'note', 'zero', 'merged', 'named']
const millions = (n: number) => `${(n / 1e6).toFixed(1)} million`

export default function Lora() {
  const [method, setMethod] = useState<Method>('Rank 2')
  const [start, setStart] = useState<Start>('B at zero')
  const [replays, setReplays] = useState(0)

  return (
    <Article
      kicker="Natural language processing · Post-training"
      title="Learn the change, not the model"
      promise="Fine-tuning a language model trains every one of its billions of weights and saves a whole new copy for each job. How can training a tiny fraction of them do the same work?"
      takeaway={
        <>
          Freeze the pretrained weights and learn only the change, as a thin B times a thin A: a rank-r change to a
          d × d table costs 2dr numbers instead of d², starts at zero, and folds back into the weights when training
          ends. That is <em>LoRA</em>.
        </>
      }
      sources={[
        {
          title: 'COMP 646: Deep Learning for Vision and Language',
          by: 'Vicente Ordóñez-Román, Rice University, Spring 2026',
          part: 'Post-training for LLMs and VLMs: efficient fine-tuning with LoRA',
        },
        {
          title: 'Dive into Deep Learning',
          by: 'Aston Zhang, Zachary C. Lipton, Mu Li and Alexander J. Smola',
          part: '§14.2 “Fine-Tuning”',
          url: 'https://d2l.ai/chapter_computer-vision/fine-tuning.html',
        },
        {
          title: 'LoRA: Low-Rank Adaptation of Large Language Models',
          by: 'Edward J. Hu, Yelong Shen, Phillip Wallis, Zeyuan Allen-Zhu, Yuanzhi Li, Shean Wang, Lu Wang and Weizhu Chen, 2021',
          part: '§4 (the method, its start at zero and the merge), §4.2 (GPT-3 memory and checkpoint sizes), §7.2 (how small r can be)',
          url: 'https://arxiv.org/abs/2106.09685',
        },
      ]}
    >
      <Predict
        question={`One table of weights inside a language model is ${thousands(D)} × ${thousands(D)}: ${millions(FULL)} numbers. Fine-tuning it for a new job usually trains all of them. How many does it really need to train to do about as well?`}
        options={[
          { label: `All ${millions(FULL)}` },
          { label: 'About half' },
          { label: 'About a tenth' },
          { label: 'Under 1%', right: true },
        ]}
        reveal={
          <>
            Under 1%. At rank {GUESS_RANK}, LoRA trains {thousands(loraParams(D, D, GUESS_RANK))} numbers for that table,{' '}
            {percent(loraShare(D, D, GUESS_RANK))} of it, and on GPT-3 LoRA did about as well as training everything. The trick is to learn only the change, in a shape
            that takes few numbers to write. A house shows how.
          </>
        }
      />

      <h2>A note beside the schedule</h2>

      <Steps
        readable
        say={[
          <>
            Your heating runs on a printed schedule: a temperature for each of {ROOMS.length} rooms at each of{' '}
            {HOURS.length} hours, {STORY.settings} settings.
          </>,
          <>Winter comes with a new baby, and the evenings need to be warmer. You could rethink all {STORY.settings} settings, one at a time.</>,
          <>But the change you want has a simple shape: how much warmer each room should be, times how much each hour gets.</>,
          <>
            So you write just those two lists, {ROOMS.length} + {HOURS.length} = {STORY.note} numbers, on a note beside
            the printed schedule, and the thermostat adds the two.
          </>,
          <>You start the room list at zero, so at first the note changes nothing; then you tune it, and the house warms a little at a time.</>,
          <>Once it is right, you copy the note into the schedule, and the thermostat reads one table again, as quickly as before.</>,
          <>
            The schedule is one weight matrix W of a language model, frozen; the room list is B, the hour list A, and
            the note their product BA. This is <strong>LoRA</strong>, low-rank adaptation.
          </>,
        ]}
      >
        {(step) => <Schedule key={step} show={SCENES[step]} />}
      </Steps>

      <p>
        <strong>Fine-tuning</strong> means taking a <Link to="/learnings/pretraining-objectives">pretrained</Link>{' '}
        model and training it further on examples of the job you want. Done in full, every weight gets a gradient and
        the optimizer keeps extra numbers for each: fine-tuning GPT-3 that way took {PAPER.vramFull} of GPU memory, and
        each job saved its own {PAPER.checkpointFull} copy.
      </p>
      <p>
        A table that is one list times another has <strong>rank</strong> 1, and a sum of r such products has rank at most r:
        the same squeeze <Link to="/learnings/lsa">latent semantic analysis</Link> applies to a word table and{' '}
        <Link to="/learnings/matrix-completion">matrix completion</Link> to film ratings, aimed here at the change
        rather than the data. LoRA bets that the change fine-tuning makes is low rank, even though the weights are not.
        Its authors found rank 1 enough to adapt GPT-3’s attention to two benchmark tasks.
      </p>

      <h2>The one line of math</h2>
      <p>
        In words: a layer’s output is the frozen table times the input, plus the input squeezed down to r numbers by A
        and spread back out by B. In symbols, h = Wx + BAx, where W is d × d, B is d × r and A is r × d. Only A and B
        train, d × r + r × d = 2dr numbers against d² for W. For d = {thousands(D)}:
      </p>
      <Numbers
        items={WORKED.map((w) => ({
          label: `r = ${w.r}`,
          value: thousands(w.params),
          note: `${percent(w.share)} of W`,
        }))}
      />
      <p>
        The share is 2r ÷ d, so the bigger the layer, the smaller it gets. B starts at zero, so BA is zero and
        training begins from exactly the pretrained model, like the blank room list. A starts with small random
        numbers; the lab shows why. When training ends, BA is just another d × d table:
      </p>
      <Clip
        src="lora/merge"
        label="h equals W x plus B A x. Both terms multiply the same x, so take it out: h equals W plus B A, in brackets, times x. The bracket is one d by d table, like W. Add it in once when training ends, W prime equals W plus B A, and the layer is h equals W prime x: one multiply per layer, as before."
        caption="Both terms multiply the same input, so the change folds into the weights: once merged, the layer costs nothing extra to run."
      />

      <h2>Watch a layer learn</h2>
      <p>
        A {N} × {N} layer needs a change of rank 2 for its new job. Train all {LAB.cells} of its numbers, or B and A
        at rank 1, 2 or 4. Each step of <Link to="/learnings/gradient-descent">gradient descent</Link> shrinks the gap
        between the change learned and the change needed.
      </p>
      <Figure
        readable
        caption={
          <>
            Sage cells raise a weight and ink cells lower it, fuller for a bigger change. The sage line is the method you
            chose, the faint lines the others. Rank 2 learns the whole change with {LAB.rankTwoParams} numbers; rank 1
            stalls with {percent(LAB.rankOneFloor)} missed, the part one pair of lists cannot write.
          </>
        }
      >
        <Lab key={`${method} ${start} ${replays}`} method={method} start={start} />
        <Controls>
          <Choice label="Train" options={METHODS} value={method} onChange={setMethod} />
          <Choice label="Start" options={STARTS} value={start} onChange={setStart} />
          <Button onClick={() => setReplays((n) => n + 1)}>Train again</Button>
        </Controls>
      </Figure>

      <Predict
        kicker="Quick check"
        question="In the lab, set Start to “Both at zero”. Why does the rank-2 run never move?"
        options={[
          { label: 'Rank 2 is too small for this change' },
          { label: 'Each factor’s push is scaled by the other, which is zero', right: true },
          { label: 'The steps are too small to see' },
          { label: 'A zero change is already the best one' },
        ]}
        reveal={
          <>
            The push on B is the gap times A, and the push on A is B times the gap. With both at zero, both pushes are
            zero at every step, so nothing changes. Zeroing only B keeps the first output equal to the pretrained model
            while A’s random numbers give B a push from the very first step.
          </>
        }
      />

      <h2>Using it well</h2>
      <ul>
        <li>
          <strong>Adapt the attention tables first.</strong> The paper put LoRA on the query and value tables of each{' '}
          <Link to="/learnings/self-attention">self-attention</Link> layer and froze everything else.
        </li>
        <li>
          <strong>Start with a small rank.</strong> Ranks of 4 to 16 are common. A task far from the pretraining text, such as a
          new language, may need more. The paper also scales BA by a constant over r, so trying another r needs little
          retuning.
        </li>
        <li>
          <strong>Merge for one job, swap for many.</strong> At rank {PAPER.checkpointRank} on the query and value
          tables, a GPT-3 adapter is {PAPER.checkpointLora}, so one base model and 100 adapters take{' '}
          {PAPER.hundredLora} instead of {PAPER.hundredFull}.
        </li>
        <li>
          <strong>The memory is the win.</strong> Frozen weights need no gradients and no optimizer state: training
          GPT-3 this way took {PAPER.vramLora} instead of {PAPER.vramFull}. It is why later steps of post-training, like
          <Link to="/learnings/instruction-tuning">instruction tuning</Link>, fit on modest hardware.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question={`A feed-forward table in the same model is ${thousands(CHECK.rows)} rows by ${thousands(CHECK.columns)} columns, not square. With LoRA at rank ${CHECK.r}, about how many numbers does it train?`}
        options={[
          { label: thousands(CHECK_SQUARE) },
          { label: `About ${Math.round(CHECK_PARAMS / 1000)},000`, right: true },
          { label: 'About 360,000' },
          { label: `About ${Math.round(CHECK_FULL / 1e6)} million` },
        ]}
        reveal={
          <>
            {CHECK.r} × ({thousands(CHECK.rows)} + {thousands(CHECK.columns)}) = {thousands(CHECK_PARAMS)}. B has a row
            for each of the {thousands(CHECK.rows)} outputs and A a column for each of the {thousands(CHECK.columns)}{' '}
            inputs, so any table costs r × (rows + columns): here {percent(CHECK_PARAMS / CHECK_FULL)} of its{' '}
            {Math.round(CHECK_FULL / 1e6)} million weights. {thousands(CHECK_SQUARE)} is what you get by treating it as
            square.
          </>
        }
      />
    </Article>
  )
}
