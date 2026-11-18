import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Button, Choice, Controls, Figure, Numbers, Readout } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Lab from './Lab'
import {
  DEEPSEEKMATH,
  FIRST_DRAW,
  GROUP,
  GUESS_RATIO,
  partial,
  PARTIAL,
  QUESTIONS,
  R1,
  sample,
  signed,
  STORY,
  storyRight,
  storyScored,
  WORKED,
} from './model'
import Sheets, { type Show } from './Sheets'

const SHOWS: Show[] = ['book', 'tries', 'checked', 'compared', 'hard', 'easy', 'named']
const NAMES = QUESTIONS.map((q) => q.name)
// The answer in the lab's first group whose working is wrong but passes
const LUCKY = sample(1, FIRST_DRAW).answers.findIndex((a) => a.kind === 'lucky') + 1

export default function Rlvr() {
  const [first, hard] = storyScored
  const [question, setQuestion] = useState(NAMES[1])
  const [draw, setDraw] = useState(FIRST_DRAW)
  const q = NAMES.indexOf(question)
  const group = sample(q, draw)

  return (
    <Article
      kicker="Natural language processing · Post-training"
      title="Answers you can check"
      promise="Nobody can write out the ideal reasoning for a million maths problems, or grade a million long answers by hand. So what does a reasoning model learn to reason from?"
      takeaway={
        <>
          Where a program can check the answer, sample a group of answers to each question, score each one against
          the key, and push each by how far it beats its own group’s average: the group is the <em>baseline</em>, and no
          human judge or critic is needed.
        </>
      }
      sources={[
        {
          title: 'COMP 646: Deep Learning for Vision and Language',
          by: 'Vicente Ordóñez-Román, Rice University, Spring 2026',
          part: 'Lecture “Post-Training for LLMs and VLMs: Thinking/Reasoning Models”: reasoning models, reinforcement learning with verifiable rewards, GRPO and DeepSeek-R1',
        },
        {
          title: 'DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models',
          by: 'Zhihong Shao et al., 2024',
          part: 'Section 4, “Reinforcement Learning”: Group Relative Policy Optimization and its group-normalized advantage',
          url: 'https://arxiv.org/abs/2402.03300',
        },
        {
          title: 'DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning',
          by: 'DeepSeek-AI, 2025',
          part: 'DeepSeek-R1-Zero: GRPO with rule-based accuracy and format rewards, its AIME 2024 results, and how its answers grew',
          url: 'https://arxiv.org/abs/2501.12948',
        },
        {
          title: 'Tülu 3: Pushing Frontiers in Open Language Model Post-Training',
          by: 'Nathan Lambert et al., 2024',
          part: 'Where the name reinforcement learning with verifiable rewards (RLVR) comes from',
          url: 'https://arxiv.org/abs/2411.15124',
        },
      ]}
    >
      <Predict
        question="You try two maths problems eight times each and check every try against the answer key. On problem A, seven of your eight tries are right; on problem B, only one is. Each right try scores 1. Compared with a right try on A, how much should the right try on B count?"
        options={[
          { label: 'The same: both scored 1' },
          { label: 'About twice as much' },
          { label: `About ${GUESS_RATIO.toFixed(0)} times as much`, right: true },
          { label: 'Less: it was probably luck' },
        ]}
        reveal={
          <>
            About {GUESS_RATIO.toFixed(0)} times as much. On A, getting it right is what you usually do, so a right try
            beats your average by only a little. On B, the one right try is the only one that found the way, and it
            beats your average by far: that is the try worth learning from.
          </>
        }
      />

      <h2>Answers at the back of the book</h2>

      <Steps
        readable
        say={[
          <>You’re training for a maths contest from a book that prints only the final answers, at the back.</>,
          <>You try problem 1 eight times on scrap paper, a little differently each time, and get eight answers.</>,
          <>
            The back of the book says {STORY[0].key}: {storyRight[0]} of your {GROUP} sheets match it.
          </>,
          <>
            Your average is {storyRight[0]} in {GROUP}, so each right sheet beats it by a little (
            {signed(first.advantages[0])}), and the wrong one falls far below ({signed(first.advantages[3])}): that slip
            is the lesson.
          </>,
          <>
            Problem 2 is hard: only {storyRight[1]} sheet in {GROUP} is right, and it beats your average by{' '}
            {signed(hard.advantages[4])}, {GUESS_RATIO.toFixed(0)} times as much.
          </>,
          <>Problem 3 is easy: every sheet is right, each is exactly average, and comparing them teaches nothing.</>,
          <>
            You’re a language model, each sheet a sampled answer with its chain of thought, the back of the book a{' '}
            <strong>verifier</strong>, and each bar the answer’s <strong>group-relative advantage</strong>.
          </>,
        ]}
      >
        {(step) => <Sheets key={SHOWS[step]} show={SHOWS[step]} />}
      </Steps>

      <h2>A reward a program can give</h2>
      <p>
        Learning from preferences needs a judge: people ranking answers, or a reward model fitted to their rankings
        (see <Link to="/learnings/dpo">DPO</Link>). For a maths problem with a known answer, or code with unit tests, a
        few lines of code can judge instead: take the final answer, compare it with the key, score 1 or 0. Training on
        that is <strong>reinforcement learning with verifiable rewards</strong>, or RLVR, a name Lambert and
        colleagues gave it in their Tülu 3 recipe. The checker never reads the working, can’t be talked round, and
        costs almost nothing to run a million times.
      </p>

      <Predict
        kicker="Quick check"
        question="Which of these could you train with RLVR, with no human judge and no reward model?"
        options={[
          { label: 'Explaining a proof clearly' },
          { label: 'Translating a poem' },
          { label: 'Filling in a Sudoku', right: true },
          { label: 'Summarizing a meeting' },
        ]}
        reveal={
          <>
            The Sudoku. A short program can tell whether a filled grid keeps every rule, so the reward is exact. A clear
            explanation, a good translation or a fair summary each has many right answers and no key to compare with;
            those still need people’s judgement, or a model trained on it.
          </>
        }
      />

      <h2>The one line of math</h2>
      <p>
        In words: an answer’s advantage is its score minus the group’s average score, divided by how spread out the
        group’s scores are (their standard deviation). In a group of {GROUP}, a right answer gets:
      </p>
      <Numbers
        items={WORKED.map((w) => ({
          label: `${w.k} of ${GROUP} right`,
          value: signed(w.right),
          note: `a wrong one ${signed(w.wrong)}`,
        }))}
      />
      <p>
        A rare success is news; a common one isn’t. A group’s advantages always add up to zero, so the wrong answers
        are pushed down by as much as the right ones are pushed up. Some code divides by {GROUP - 1} rather than{' '}
        {GROUP} when it works out the spread, which changes the sizes a little but never the signs or the order.
      </p>
      <Clip
        src="rlvr/scores-to-advantages"
        label="Eight answers to one question, scored by the checker: seven 1s and one 0. Subtract the group's mean, 0.875: each right answer is now 0.125 and the wrong one minus 0.875. Divide by the group's spread, 0.331: each right answer gets plus 0.38 and the wrong one minus 2.65. The advantage A sub i is r sub i minus mu, over sigma."
        caption="Subtracting the mean says who beat the group; dividing by the spread puts every question’s pushes on the same scale, however hard it is."
      />

      <h2>From advantage to update</h2>
      <p>
        Each answer then gets the push from <Link to="/learnings/reinforce">REINFORCE</Link>: every token of it becomes
        likelier in proportion to its advantage, or less likely if the advantage is negative. The group’s average is
        the baseline. That is <strong>Group Relative Policy Optimization</strong>, GRPO, from Shao and colleagues’
        DeepSeekMath. <Link to="/learnings/ppo">PPO</Link> gets its baseline from a critic, a second network about as
        large as the model, trained to guess how well each answer will go; GRPO lets the other answers to the same
        question stand in, and saves the memory. It keeps PPO’s clip on how far one batch can move the model, and the
        pull back towards the model it started from that RLHF uses. DeepSeekMath still scored its answers with a
        reward model, {DEEPSEEKMATH.group} per question; DeepSeek-R1 paired GRPO with plain checks.
      </p>

      <h2>Sample a group</h2>
      <Figure
        caption={
          <>
            Each row is one sampled answer; the checker reads only its last number. Sage bars are above the group’s
            average, ink bars below. In the first group, answer {LUCKY}’s working is wrong, yet it passes. Sample “
            {QUESTIONS[0].name}” until every answer is right, then try “{QUESTIONS[3].name}”.
          </>
        }
      >
        <Lab q={q} group={group} />
        <div className="mt-6 grid grid-cols-3 gap-4">
          <Readout label="Passed" value={`${group.right} of ${GROUP}`} accent />
          <Readout label="Mean" value={group.mean.toFixed(2)} />
          <Readout label="Spread" value={group.spread.toFixed(2)} />
        </div>
        <Controls>
          <Choice
            label="Question"
            options={NAMES}
            value={question}
            onChange={(name) => {
              setQuestion(name)
              setDraw(FIRST_DRAW)
            }}
          />
          <Button onClick={() => setDraw((d) => d + 1)}>Sample again</Button>
        </Controls>
      </Figure>
      <p>
        Two things show up. A lucky guess with broken working earns the same as sound reasoning, since the checker
        only reads the end; but luck rarely repeats from question to question and sound working does, so over many
        questions it is the working that gets reinforced. And on a question the model nearly always gets right, or
        nearly never, most groups come out all the same and teach nothing.
      </p>

      <h2>Where long reasoning comes from</h2>
      <p>
        DeepSeek-R1-Zero started from a base model and was trained this way on maths and code, {R1.group} answers to
        each question, rewarded for a right answer and for putting its thinking between the right tags. Nobody showed
        it how to reason. Its pass rate on the AIME 2024 contest climbed from {R1.start}% to {R1.end}%, and to{' '}
        {R1.vote}% with a majority vote over samples, the self-consistency of{' '}
        <Link to="/learnings/chain-of-thought">chain of thought</Link>. Its answers grew by themselves, to thousands of
        tokens of working, and it began to stop mid-answer and recheck, writing “wait”. Nothing paid it for length;
        thinking longer was how it got more answers right.
      </p>

      <h2>Using it</h2>
      <ul>
        <li>
          <strong>Check only what a program can check.</strong> A number against a key, code against tests, a required
          format. Open-ended answers still need a judge.
        </li>
        <li>
          <strong>Prefer a rule to a learned judge.</strong> DeepSeek-R1’s authors kept neural reward models out because
          a long run learns to fool them. A sloppy rule can be fooled too (one that accepts any number in the answer
          pays for listing numbers), so check what yours really pays for, as on{' '}
          <Link to="/learnings/designing-rewards">Reward what you want</Link>.
        </li>
        <li>
          <strong>Sample enough answers per question.</strong> DeepSeekMath took {DEEPSEEKMATH.group} and R1{' '}
          {R1.group}: the average of a handful is a shaky baseline.
        </li>
        <li>
          <strong>Start from readable answers.</strong> R1-Zero’s chains were hard to read and mixed languages; the
          released R1 was first fine-tuned on a small set of readable worked answers, then trained the same way.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question={`A coding model is scored by the share of unit tests each answer passes. Four answers to one task score ${PARTIAL.join(', ')}. What advantage does each ${PARTIAL[0]} answer get?`}
        options={[
          { label: signed(PARTIAL[0] - partial.mean) },
          { label: signed(PARTIAL[0]) },
          { label: signed(partial.advantages[0]), right: true },
          { label: '0: they all nearly pass' },
        ]}
        reveal={
          <>
            {signed(partial.advantages[0])}. The average is {partial.mean.toFixed(2)}, so each {PARTIAL[0]} beats it by
            only {(PARTIAL[0] - partial.mean).toFixed(2)}, but the spread is just {partial.spread.toFixed(2)}, and
            dividing by it makes that small gap a full-sized push. GRPO cares about the order within a group, not how
            far apart the scores are, so a tiny difference, even noise, counts as much as a big one.
          </>
        }
      />
    </Article>
  )
}
