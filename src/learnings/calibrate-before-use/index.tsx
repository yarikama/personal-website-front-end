import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Lab from './Lab'
import {
  blankHappy,
  calibratedHappy,
  PAPER,
  pct,
  pct1,
  pHappy,
  QUICK,
  QUICK_AFTER,
  RANGE_AFTER,
  RANGE_BEFORE,
  REVIEWS,
  rightAfter,
  rightBefore,
  STORY,
  TOPIC_AFTER,
  TOPIC_ARTICLE,
  TOPIC_BLANK,
  TOPIC_SCORES,
  TOPICS,
  two,
  WORKED,
} from './model'
import Story, { type Scene } from './Story'

const SCENES: Scene[] = ['mixed', 'happyLast', 'allHappy', 'blank', 'calibrate', 'named']
const N = REVIEWS.length
const MISREAD = REVIEWS.find((r) => r.happy && r.evidence < 0)!
const LEAN_LAST = blankHappy(STORY.happyLast)

export default function CalibrateBeforeUse() {
  return (
    <Article
      kicker="Natural language processing · Large language models"
      title="Calibrate before use"
      promise="Show a language model the same few labelled examples in a different order, and its accuracy can fall from very good to a coin toss. Where does that swing come from, and can you take it out without any more labelled data?"
      takeaway={
        <>
          A few-shot model leans toward the labels its prompt shows most and shows last. Ask it about an empty input
          like “N/A” to measure the lean, then <em>divide it out</em> of every answer.
        </>
      }
      sources={[
        {
          title: 'COMP 584: Natural Language Processing',
          by: 'Hanjie Chen, Rice University, Spring 2026',
          part: 'Prompting and in-context learning: variance, majority label and recency bias, calibrate before use',
        },
        {
          title: 'Speech and Language Processing',
          by: 'Daniel Jurafsky and James H. Martin, 3rd edition draft',
          part: 'Chapter 1, “Introduction”, §1.7, “Inference”: few-shot prompting with demonstrations',
          url: 'https://web.stanford.edu/~jurafsky/slp3/',
        },
        {
          title: 'Calibrate Before Use: Improving Few-Shot Performance of Language Models',
          by: 'Tony Z. Zhao, Eric Wallace, Shi Feng, Dan Klein and Sameer Singh, ICML 2021',
          part: 'Sections 4 and 5, Tables 1 to 3; every GPT-3 number on this page',
          url: 'https://arxiv.org/abs/2102.09690',
        },
      ]}
    >
      <Predict
        question={
          <>
            GPT-3 (2.7 billion parameters) sees two labelled movie reviews, one negative and one positive, before each
            test review, and gets {pct1(PAPER.ordered)} of the test reviews right. You swap the two examples’ order.
            What happens?
          </>
        }
        options={[
          { label: 'Nothing much: the same two examples carry the same information' },
          { label: 'It drops a point or two' },
          { label: `It falls to ${pct1(PAPER.reversed)}, about a coin toss`, right: true },
          { label: 'It improves, since the positive example now comes first' },
        ]}
        reveal={
          <>
            It falls to {pct1(PAPER.reversed)}. Nothing about the examples changed except their order. Much of a swing
            like this comes from the model leaning toward one label whatever the input says, and the order sets the
            lean. Here is that lean, slowed down.
          </>
        }
      />

      <h2>A helper sorting reviews</h2>

      <Steps
        readable
        say={[
          <>
            You run a café, and ask a helper to sort {N} new reviews into happy and unhappy. You first show them four
            you sorted yourself, and they get {rightBefore(STORY.mixed)} right.
          </>,
          <>
            Next day, the same four cards in a new order, the two happy ones last. Every score slides toward happy, and
            only {rightBefore(STORY.happyLast)} are right.
          </>,
          <>
            Swap the two unhappy cards for happy ones and the scores slide further: {rightBefore(STORY.allHappy)} of {N}.
          </>,
          <>
            The reviews never changed; the helper’s lean did. To measure it, hand them a blank card. With nothing to read,
            they still call it {pct(blankHappy(STORY.allHappy))} happy.
          </>,
          <>
            So judge every review against the blank card instead of against 50%: slide each score back by the blank
            card’s lean, and {rightAfter(STORY.allHappy)} of {N} are right again.
          </>,
          <>
            The helper is a language model, the sorted cards are the demonstrations in its prompt, and the blank card is
            the input “N/A”.
          </>,
        ]}
      >
        {(step) => <Story key={step} scene={SCENES[step]} />}
      </Steps>

      <h2>Two leans, and a third</h2>
      <p>
        What you watched has names. The helper leaned toward the label it saw most often, <strong>majority label
        bias</strong>, and toward the label it saw last, <strong>recency bias</strong>. Zhao and colleagues found both in
        GPT-3 on a balanced sentiment test. Three Positive examples followed by one Negative made nearly{' '}
        {pct(PAPER.pppnNegative)} of its answers Negative: the last example outvoted the other three. A third,{' '}
        <strong>common token bias</strong>, favours label words the model met often in its training text: on a
        topic task with equal numbers of each class, GPT-3 chose “book” {PAPER.bookOverArtist} times as often as
        “artist”. How a prompt, its demonstrations and its label words turn a language model into a classifier is
        on <Link to="/learnings/in-context-learning">in-context learning</Link>; what matters here is that all three
        leans push every answer the same way, whatever the input says.
      </p>

      <h2>The one line of math</h2>
      <p>
        In words: for each label, divide the chance the model gives it for this input by the chance it gave the same
        label for “N/A”, then pick the biggest. That is <strong>contextual calibration</strong>:
      </p>
      <p className="text-center font-serif text-xl">calibrated score of a label = p(label | input) ÷ p(label | “N/A”)</p>
      <p>
        The paper writes it as a weight matrix W = diag(p̂<sub>cf</sub>)<sup>−1</sup> applied to the label
        probabilities p̂, with no bias term (b = 0). “N/A” itself comes out at exactly even odds, since each of its
        chances is divided by itself. After the happy-last cards the blank card scores {pct(LEAN_LAST)} happy, so a
        review has to beat {pct(LEAN_LAST)}, not 50%, to count as happy:
      </p>
      <Numbers
        words
        items={WORKED.map((r) => ({
          label: r.text.replace(/\.$/, ''),
          value: `${pct(pHappy(STORY.happyLast, r))} → ${pct(calibratedHappy(STORY.happyLast, r))}`,
          note: r.happy ? 'a happy review' : 'an unhappy one',
        }))}
      />
      <Clip
        src="calibrate-before-use/divide-out-the-lean"
        label="Contextual calibration with two labels, unhappy and happy. The blank input N/A scores 0.22 and 0.78, so W is the diagonal matrix of 1 over 0.22 and 1 over 0.78, and b is zero. W times the blank's own chances is 1 and 1: even odds. For the review Too loud to talk, the model gives 0.41 and 0.59; W times that is 1.86 and 0.76, which rescale to 0.71 and 0.29, so the review is called unhappy."
        caption="Divide each label’s chance by the blank input’s. The blank becomes 1 and 1, even odds; a review that scored 59% happy, under the blank’s 78%, turns out unhappy."
      />
      <p>
        (The paper sets this up as Platt scaling, a softmax over W p̂ + b; to pick a label only the division matters.)
        In this toy the blank card catches the lean exactly, because the lean is the same for every review. A real model
        is less tidy, but the gain is large: with four SST-2 examples, GPT-3 2.7B’s mean accuracy rose from{' '}
        {pct1(PAPER.sst4Before)} to {pct1(PAPER.sst4After)}, and across tasks the gain reached {PAPER.bestGain} points.
      </p>

      <h2>Try every prompt</h2>
      <Figure
        readable
        caption={
          <>
            Pick each demonstration’s label. As is, the count swings from {RANGE_BEFORE[0]} to {RANGE_BEFORE[1]} of {N}{' '}
            with the prompt, worst where “N/A” leans furthest; calibrated, every prompt gets{' '}
            {RANGE_AFTER[0] === RANGE_AFTER[1] ? RANGE_AFTER[0] : `${RANGE_AFTER[0]} to ${RANGE_AFTER[1]}`}. The one it
            still misses is “{MISREAD.text}”, which the model misreads whatever the prompt.
          </>
        }
      >
        <Lab />
      </Figure>

      <Predict
        kicker="Quick check"
        question={
          <>
            After your prompt, the model scores “N/A” {pct(QUICK.blank)} Positive. A test review scores{' '}
            {pct(QUICK.review)} Positive. What should calibration call it?
          </>
        }
        options={[
          { label: `Positive: ${pct(QUICK.review)} is above 50%` },
          { label: 'Negative: it is less Positive than an empty input', right: true },
          { label: 'Positive, only less sure' },
          { label: 'You can’t tell without labelled examples' },
        ]}
        reveal={
          <>
            Negative, at about {pct(QUICK_AFTER)} Positive. Positive: {two(QUICK.review)} ÷ {two(QUICK.blank)} ={' '}
            {two(QUICK.review / QUICK.blank)}; Negative: {two(1 - QUICK.review)} ÷ {two(1 - QUICK.blank)} ={' '}
            {two((1 - QUICK.review) / (1 - QUICK.blank))}. The model gives {pct(QUICK.blank)} to an input with nothing in
            it, so {pct(QUICK.review)} means this review pulled it toward Negative. No labels needed: the blank is one
            extra query.
          </>
        }
      />

      <h2>What to do about it</h2>
      <ul>
        <li>
          <strong>Calibrate every prompt.</strong> One extra query per prompt, not per input, and a division per answer.
          The paper averaged three blanks, “N/A”, “[MASK]” and the empty string, since which blank you pick moves the
          result a little.
        </li>
        <li>
          <strong>Balance and shuffle the demonstrations.</strong> Equal numbers of each label, and no run of one label
          at the end, keep the lean small before you correct it.
        </li>
        <li>
          <strong>Still compare prompts if you have a few labels.</strong> Calibration narrows the gap between good and
          bad prompts without closing it, and it cannot fix an input the model misreads.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question={
          <>
            A model sorts news into {TOPICS.join(', ')}. For “N/A” it gives {TOPIC_BLANK.map(pct).join(', ')}. For an
            article it gives {TOPIC_ARTICLE.map(pct).join(', ')}. What does calibration pick?
          </>
        }
        options={[
          { label: 'Sports, the highest chance' },
          { label: 'Business' },
          { label: 'Tech', right: true },
          { label: 'A tie between Sports and Tech' },
        ]}
        reveal={
          <>
            Tech. Divide each by the blank’s: {TOPICS.map((t, i) => `${t} ${two(TOPIC_SCORES[i])}`).join(', ')}. Sports
            led only because the model leans Sports for everything; Tech is the one label this article raised above its
            baseline. Rescaled, Tech gets {pct(TOPIC_AFTER[2])}.
          </>
        }
      />
    </Article>
  )
}
