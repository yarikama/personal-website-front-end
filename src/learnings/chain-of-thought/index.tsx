import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Chains, { type Show } from './Chains'
import {
  ANSWERS,
  BLURTED,
  CHECK,
  checkRight,
  P_RIGHT,
  PALM,
  percent,
  PRIOR_SUPERVISED,
  RIGHT,
  SELF_CONSISTENCY,
  STORY_K,
  storySingleRight,
  storyTally,
  storyVoteRight,
  TRAP,
  trapRight,
  worked,
  WORKED_STEPS,
  ZERO_SHOT,
} from './model'
import Scale from './Scale'
import VoteLab from './VoteLab'

const SHOWS: Show[] = ['blurt', 'worked', 'many', 'tally', 'scale', 'named']
const storyWrong = STORY_K - storyTally[0]
const wrongKinds = storyTally.slice(1).filter((n) => n > 0).length
const mostWrong = Math.max(...storyTally.slice(1))
// The check's numbers: the share of chains on each wrong number, and the
// votes the right answer and each wrong number expect
const checkEach = (1 - CHECK.p) / CHECK.spread
const expected = (share: number) => Number((share * CHECK.k).toFixed(1))

export default function ChainOfThought() {
  return (
    <Article
      kicker="Natural language processing · Large language models"
      title="Chain of thought"
      promise="A large language model fails most grade-school word problems when it answers straight away. What lets the same model, unchanged, solve most of them?"
      takeaway={
        <>
          A large model that writes its steps before the answer can solve problems it cannot answer at once; sample
          several chains and take the most common answer, because right chains <em>agree</em> while slips scatter.
        </>
      }
      sources={[
        {
          title: 'COMP 584: Natural Language Processing',
          by: 'Hanjie Chen, Rice University, Spring 2026',
          part: 'Prompting and In-context Learning: chain-of-thought prompting, zero-shot chain of thought and self-consistency; LLM Agents and Reasoning, on spending compute at test time',
        },
        {
          title: 'Chain-of-Thought Prompting Elicits Reasoning in Large Language Models',
          by: 'Jason Wei et al., NeurIPS, 2022',
          part: 'Few-shot chain of thought, and Table 2: GSM8K by model size, standard prompting against chain of thought',
          url: 'https://arxiv.org/abs/2201.11903',
        },
        {
          title: 'Large Language Models are Zero-Shot Reasoners',
          by: 'Takeshi Kojima et al., NeurIPS, 2022',
          part: '“Let’s think step by step”, and the second prompt that pulls out the answer; text-davinci-002 on GSM8K',
          url: 'https://arxiv.org/abs/2205.11916',
        },
        {
          title: 'Self-Consistency Improves Chain of Thought Reasoning in Language Models',
          by: 'Xuezhi Wang et al., ICLR, 2023',
          part: 'Sampling 40 chains and taking the most common answer; Table 2, PaLM 540B on GSM8K',
          url: 'https://arxiv.org/abs/2203.11171',
        },
      ]}
    >
      <Predict
        question={`PaLM, a 540-billion-parameter language model, solves ${Math.round(PALM.standard)} in 100 grade-school word problems when the worked examples in its prompt go straight to the answer. You change only the examples: now they show their steps first, so the model writes steps too. How many does it solve?`}
        options={[
          { label: `About ${Math.round(PALM.standard)}` },
          { label: 'About 25' },
          { label: `About ${Math.round(PALM.cot)}`, right: true },
          { label: 'About 95' },
        ]}
        reveal={
          <>
            About {Math.round(PALM.cot)} in 100 ({PALM.cot}%): three times as many, from the same model. Only what it
            writes before the answer changed. A phone call shows why that matters.
          </>
        }
      />

      <h2>A sheet of paper</h2>

      <Steps
        readable
        say={[
          <>
            You read a friend a word problem over the phone and ask for the answer at once. They say {BLURTED}, and
            they’re wrong.
          </>,
          <>
            Now they may write first: {WORKED_STEPS.length} easy sums, one a line, and they reach {RIGHT}. The paper
            holds what they would otherwise juggle in their head.
          </>,
          <>
            Pens slip, though. You ask the same question on {STORY_K} days, and only {storyTally[0]} of the {STORY_K}{' '}
            sheets end on {RIGHT}.
          </>,
          <>
            But the {storyWrong} wrong sheets slip in different ways and land on {wrongKinds} different numbers, none
            more than {mostWrong === 2 ? 'twice' : `${mostWrong} times`}. The most common answer is {RIGHT}.
          </>,
          <>
            Try it on 100 problems: one sheet is right {storySingleRight} times, and the most common answer of {STORY_K}{' '}
            sheets {storyVoteRight} times.
          </>,
          <>
            Your friend is a large language model, each sheet a <strong>chain of thought</strong> it writes before
            answering, each day a new sample, and the vote is called <strong>self-consistency</strong>.
          </>,
        ]}
      >
        {(step) => <Chains key={SHOWS[step]} show={SHOWS[step]} />}
      </Steps>

      <h2>How a model shows its work</h2>
      <p>
        Wei and colleagues got a model to write its steps by showing it some. A few-shot prompt (see{' '}
        <Link to="/learnings/in-context-learning">in-context learning</Link>) holds worked examples whose answers
        spell out the arithmetic before “The answer is”, and the model copies the habit on the new question. That
        alone took PaLM 540B from {PALM.standard}% of the GSM8K word problems to {PALM.cot}%, past the{' '}
        {PRIOR_SUPERVISED}% of a GPT-3 fine-tuned on thousands of solved problems and paired with a checker.
      </p>
      <p>
        Why should writing help? A language model does the same amount of computation for every token it writes, so
        answering at once, the whole problem must fit into one token’s worth. Each written step buys another round,
        and its result sits in the text for the next step to read. The paper does the remembering.
      </p>
      <p>
        Kojima and colleagues then found the examples optional. End the question with “Let’s think step by step.” and
        a large model writes steps on its own: text-davinci-002 went from {ZERO_SHOT.gsm8k.plain}% to{' '}
        {ZERO_SHOT.gsm8k.cot}% on GSM8K. A second prompt, “Therefore, the answer (arabic numerals) is”, then pulls a
        clean number out of the free-form steps.
      </p>

      <h2>Only big models gain</h2>
      <Figure
        readable
        caption={
          <>
            GSM8K problems solved by each model Wei and colleagues tried (GPT-3 rows: their InstructGPT models). Hollow
            dot: answering at once; sage dot: chain of thought first.
          </>
        }
      >
        <Scale />
      </Figure>
      <p>
        Below about 10 billion parameters, models write fluent steps that don’t follow from each other, and do slightly
        worse. The gain appears only past tens of billions, so chain of thought is called <strong>emergent</strong>:
        unlike the loss, which falls smoothly with size (see <Link to="/learnings/scaling-laws">scaling laws</Link>),
        the ability is absent and then suddenly there.
      </p>

      <h2>The one line of math: the vote</h2>
      <p>
        In words: the vote is right when the right answer collects more chains than any single wrong answer does. It
        doesn’t need most chains to be right. For the story’s friend, right {percent(P_RIGHT)} of the time with slips
        spread over {ANSWERS.length - 1} wrong numbers, counting every way the chains can fall gives:
      </p>
      <Numbers
        items={worked.map((w) => ({
          label: `${w.k} ${w.k === 1 ? 'chain' : 'chains'}`,
          value: percent(w.right),
          note: 'vote right',
        }))}
      />
      <p>
        Right chains agree because there is one right answer however you get there; slips scatter. To get different
        chains at all, the model must sample its words with a temperature (see{' '}
        <Link to="/learnings/sampling-decoding">sampling the next word</Link>): always taking the likeliest word
        writes the same chain every time. Wang and colleagues sampled {SELF_CONSISTENCY.paths} chains at temperature{' '}
        {SELF_CONSISTENCY.temperature} and kept only their final answers, taking PaLM 540B from{' '}
        {SELF_CONSISTENCY.greedy}% to {SELF_CONSISTENCY.vote}% on GSM8K.
      </p>

      <h2>Run the vote</h2>
      <Figure
        readable
        caption={
          <>
            The sage curve is how often the vote is right, worked out exactly; the dashed line is one chain. Set the
            wrong answers to 1, so every slip lands on the same number, and push a chain below 50%.
          </>
        }
      >
        <VoteLab />
      </Figure>

      <Predict
        kicker="Quick check"
        question={`A model’s chains are right ${percent(TRAP.p)} of the time, but every wrong chain makes the same slip and lands on the same number. You vote over ${TRAP.k} chains. How often is the vote right?`}
        options={[
          { label: 'About 98%' },
          { label: 'About 60%' },
          { label: `About ${percent(TRAP.p)}` },
          { label: `About ${percent(trapRight)}`, right: true },
        ]}
        reveal={
          <>
            About {percent(trapRight)}. With only one wrong answer, it gets {percent(1 - TRAP.p)} of the chains, so the
            more chains you count, the surer the wrong answer wins. Voting helps only when the right answer is more
            common than every single wrong one.
          </>
        }
      />

      <h2>Using it</h2>
      <ul>
        <li>
          <strong>Save it for large models and many-step problems.</strong> Small models and one-step questions gain
          little or nothing.
        </li>
        <li>
          <strong>Vote when answers can be compared.</strong> A number or a choice can be counted; two essays can’t.
          Each chain costs a full answer, so {SELF_CONSISTENCY.paths} chains cost {SELF_CONSISTENCY.paths} times as
          much.
        </li>
        <li>
          <strong>Read agreement as confidence.</strong> Wang and colleagues found the vote more often right when more
          chains agreed with it; a split vote is the model not knowing.
        </li>
      </ul>
      <p>
        Both buy accuracy with computation at answer time instead of a bigger model: a chain is one call that writes
        more, self-consistency is many calls and a count, and search methods such as Tree of Thoughts let a program
        branch, score and back up.
      </p>

      <Predict
        kicker="Check yourself"
        question={`A smaller model’s chains are right only ${percent(CHECK.p)} of the time, and its wrong chains spread evenly over ${CHECK.spread} different numbers. You vote over ${CHECK.k} chains. How often is the vote right?`}
        options={[
          { label: `About ${percent(CHECK.p)}` },
          { label: 'About 50%' },
          { label: `About ${percent(checkRight)}`, right: true },
          { label: 'Every time' },
        ]}
        reveal={
          <>
            About {percent(checkRight)}. Each wrong number gets only {(checkEach * 100).toFixed(1)}% of the chains, so
            in {CHECK.k} chains the right answer expects {expected(CHECK.p)} votes and each wrong number{' '}
            {expected(checkEach)}. The right answer usually leads although three chains in four are wrong, but now and
            then a wrong number gets lucky.
          </>
        }
      />
    </Article>
  )
}
