import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import {
  BLAMED,
  CHECK,
  CHECK_OPTIONS,
  checkSlope,
  FIRST_ALL_RIGHT,
  FLAGGED,
  NOT,
  pct,
  signed,
  STORY_ROUNDS,
  STORY_START,
  two,
  WORKED,
  WORKED_HELPER,
  WORKED_WEIGHT,
} from './model'
import Plane from './Plane'
import Team, { type Show } from './Team'

const STEPS: Show[] = ['tally', 'sweep', 'helpers', 'team', 'blame', 'train', 'named']

// The worked numbers: the story's random start, on the review it blames
const helper = WORKED_HELPER + 1
const trust = STORY_START.v[WORKED_HELPER]
const flag = WORKED.pass.z[WORKED_HELPER]
const flagSlope = flag * (1 - flag)
const notCount = BLAMED.counts[NOT]

// Check yourself, the right answer second: [count left out, right, sign
// flipped, slope left out]
const CHECK_ORDER = [1, 0, 3, 2]

export default function NeuralNetworks() {
  return (
    <Article
      kicker="Natural language processing · Words as numbers"
      title="Neural networks"
      promise="One weighted sum of word counts can’t learn that “not” turns the next word round. What does a hidden layer add, and how does a network learn weights that nobody gave it answers for?"
      takeaway={
        <>
          A neural network stacks logistic regressions, so its hidden layer learns its own features and the boundary
          can bend; <em>backpropagation</em> trains it with the chain rule, handing each layer’s blame down to the one
          below.
        </>
      }
      sources={[
        {
          title: 'COMP 584: Natural Language Processing',
          by: 'Hanjie Chen, Rice University, Spring 2026',
          part: 'Text Classification (2): from logistic regression to neural networks, learning them with the chain rule, and neural text classifiers',
        },
        {
          title: 'Speech and Language Processing',
          by: 'Daniel Jurafsky and James H. Martin, 3rd edition draft',
          part: 'Chapter 6, Neural Networks: the XOR problem, feedforward networks, embeddings as a classifier’s input, and training by backward differentiation',
          url: 'https://web.stanford.edu/~jurafsky/slp3/',
        },
        {
          title: 'Learning representations by back-propagating errors',
          by: 'David E. Rumelhart, Geoffrey E. Hinton and Ronald J. Williams, Nature 323, 1986',
          part: 'Backpropagation',
          url: 'https://www.nature.com/articles/323533a0',
        },
      ]}
    >
      <Predict
        question="Four reviews: “good” and “not boring” are happy, “not good” and “boring” are not. Logistic regression on the word counts may give each word any weight it likes. At best, how many of the four can it call right?"
        options={[{ label: 'All 4' }, { label: '3', right: true }, { label: '2' }, { label: '1' }]}
        reveal={
          <>
            Three. Between them, the two happy reviews hold exactly the words of the two unhappy ones (“good”, “not”,
            “boring”), so their scores add up to the same total, whatever the weights. Two scores above zero and two below
            can’t share a sum.
          </>
        }
      />

      <h2>Hiring helpers</h2>

      <Steps
        readable
        say={[
          <>You sort a café’s reviews with a tally: each word is worth some points, and above zero means a happy customer.</>,
          <>
            “good” and “boring” are easy. But whatever “not” is worth, “not good” and “not boring” can’t both land
            right: 3 of 4 at best.
          </>,
          <>
            So you hire two helpers, each with a tally of their own, turned into a flag: how sure they are, from 0 to 1.
            Ana watches for “good” without “not”, Ben for “not” with “boring”.
          </>,
          <>You stop reading words and tally the two flags instead: either one up means happy. All four come out right.</>,
          <>
            Real helpers start from random tallies, and nobody tells them what to flag. When you’re wrong, each takes a
            share of your blame, scaled by how much you listen to it.
          </>,
          <>
            Each helper hands its share on to the words in that review, and every tally shifts a little. After{' '}
            {FIRST_ALL_RIGHT} rounds all four are right; by {STORY_ROUNDS}, one helper flags “{FLAGGED[0][0]}” and the
            other “{FLAGGED[1][0]}”: Ben’s and Ana’s jobs, found untold.
          </>,
          <>
            The words are the <strong>input layer</strong>, the helpers a <strong>hidden layer</strong> of small logistic
            regressions, you the <strong>output</strong>. Handing blame back is <strong>backpropagation</strong>: this is
            a <strong>neural network</strong>.
          </>,
        ]}
      >
        {(step) => <Team key={step} show={STEPS[step]} />}
      </Steps>

      <h2>The one line of math</h2>
      <p>
        In words: each helper squashes a weighted sum of the word counts x into a flag between 0 and 1 with the sigmoid
        σ, and the output squashes a weighted sum of the flags:
      </p>
      <p className="text-center text-2xl">p = σ( v · σ(W x + b) + c )</p>
      <p>
        W holds one row of word weights per helper, v how far you trust each one. The network gives a chance, so it
        learns like <Link to="/learnings/logistic-regression">logistic regression</Link>: a review costs ln(1 ÷ the
        chance given to its true label). For networks this is usually written as the <strong>cross-entropy</strong>,
        −Σ q ln p between the true labels q and the chances p; q puts all its weight on the true label, so only that
        term is left.
      </p>
      <p>
        <Link to="/learnings/gradient-descent">Gradient descent</Link> needs the slope of that cost for every weight.
        The chain rule gives it: multiply the slopes along the path from the cost back to the weight. Every path starts
        at the output, so work backwards and reuse what you have.
      </p>
      <Clip
        src="neural-networks/backprop"
        label="The forward pass: a equals W x plus b, z equals sigma of a, s equals v dot z plus c, p equals sigma of s, and the loss is minus ln of the chance given to the true label. Going back, the slope of the loss with respect to s is p minus y, the output's blame. The slope for v k is that blame times z k. Helper k's blame is the output's blame times v k times z k times 1 minus z k. The slope for the weight from word j to helper k is helper k's blame times x j. Each line reuses the blame from the line before. Then the story's random start, on not boring: delta is 0.30 minus 1, or minus 0.70; helper 1's delta is minus 0.70 times minus 0.47 times 0.24, or plus 0.08; and the slope for the weight from not to helper 1 is plus 0.08 times 1, or plus 0.08."
        caption="Going back through the network, each layer’s blame is the one above it times one more slope. Nothing is worked out twice."
      />
      <p>
        The blame at the output is just p − y, the chance minus the label. A helper’s share is that times your trust in
        it times its flag’s slope, σ(1 − σ); a word weight’s slope is the helper’s share times the word’s count. The
        story’s random start, on “{BLAMED.text}”:
      </p>
      <Numbers
        items={[
          { label: 'Your blame', value: signed(WORKED.blame), note: `p ${two(WORKED.pass.p)} − y 1` },
          {
            label: `Helper ${helper}’s share`,
            value: signed(WORKED.shares[WORKED_HELPER]),
            note: `× trust ${signed(trust)} × ${two(flagSlope)}`,
          },
          { label: `“not” → helper ${helper}`, value: signed(WORKED_WEIGHT), note: `× count ${notCount}` },
        ]}
      />
      <p>
        Working out each layer’s blame once and handing it down is <strong>backpropagation</strong>. One backward sweep
        costs about as much as the forward one, however many weights there are, and that is what makes networks with
        millions of weights trainable. A word with count 0 gets a slope of 0: a review only moves its own words’ weights.
      </p>

      <Predict
        kicker="Quick check"
        question="Ana and Ben report their raw tallies instead of a flag from 0 to 1, and you still weigh what they report. At best, how many of the four reviews can you call right?"
        options={[{ label: 'All 4' }, { label: '3', right: true }, { label: '2' }, { label: 'None' }]}
        reveal={
          <>
            Three, no better than one tally. A weighted sum of weighted sums is one weighted sum, with its own points per
            word, and no tally gets all four. The squash is what helps: Ana’s flag sits at 0 however far below zero her
            tally goes, so “not good” can’t drag your score anywhere. That is what lets the boundary bend.
          </>
        }
      />

      <h2>The first layer is a table of word vectors</h2>
      <p>
        Multiply W by a review’s <Link to="/learnings/bag-of-words">word counts</Link> and you add up W’s columns, one
        per word in the review, once each time it appears. So each column is a short list of numbers standing for a
        word, a <strong>word embedding</strong>, and the hidden layer sees a review as the sum of its words’ embeddings.
        With two helpers, each embedding is an arrow in a plane.
      </p>
      <Figure
        readable
        caption={
          <>
            Each word is an arrow: how much it adds to each helper’s tally. A review starts at the dashed ring (the
            helpers’ starts) and adds its words’ arrows; filled dots are happy reviews, hollow ones not. Sage shading is
            how sure you are of happy there, and the ink line is 50%. Press Train: the words push the reviews apart, and
            the line bends to split them. Some starts get stuck; try New start.
          </>
        }
      >
        <Plane />
      </Figure>
      <p>
        <Link to="/learnings/kernel-trick">The kernel trick</Link> bends a boundary with features you choose; a hidden
        layer learns its own. Real text classifiers do this with thousands of words and hundreds of helpers, and skip
        the long count vector: each word is looked up by its number in the vocabulary and its column added, with short
        texts in a batch padded by a token whose vector stays zero. That sum of embeddings with logistic regression on
        top is a <strong>neural text classifier</strong>. Its embeddings only learn what this one task needs;{' '}
        <Link to="/learnings/skip-gram">skip-gram</Link> learns them from plain text instead.
      </p>

      <h2>Making it work</h2>
      <ul>
        <li>
          <strong>Start from small random weights.</strong> Helpers that start alike get the same blame on every review
          and stay twins forever; a little randomness lets them take different jobs.
        </li>
        <li>
          <strong>Let the library run the chain rule.</strong> PyTorch and its kin record the forward pass and run
          backpropagation for you (<code>loss.backward()</code>), so a new layer needs no new derivatives.
        </li>
        <li>
          <strong>Prefer ReLU in deep stacks.</strong> The sigmoid’s slope is at most ¼, so blame shrinks at every
          sigmoid it passes back through; ReLU, max(0, z), passes it on whole wherever it is on.
        </li>
        <li>
          <strong>Try another start.</strong> As the plane shows, a small network can get stuck; another seed, or a few
          more helpers than strictly needed, usually gets out.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question={`Your blame on a review is ${signed(CHECK.blame, 1)}. You trust Ana ${CHECK.trust}, her flag is at ${pct(CHECK.flag)}, and the review says “good” ${CHECK.count} times. What is the slope for the weight from “good” to Ana?`}
        options={CHECK_ORDER.map((i) => ({ label: signed(CHECK_OPTIONS[i], 1), right: i === 0 }))}
        reveal={
          <>
            {signed(checkSlope(), 1)}: blame {signed(CHECK.blame, 1)} × trust {CHECK.trust} × her flag’s slope,{' '}
            {CHECK.flag} × {1 - CHECK.flag} = {CHECK.flag * (1 - CHECK.flag)}, × the count {CHECK.count}. Leave out the
            count and you get {signed(CHECK_OPTIONS[1], 1)}; leave out her slope and you get {signed(CHECK_OPTIONS[2], 1)}.
            It is negative, so gradient descent raises the weight: more “good” means a surer Ana and, since you trust her,
            a happier call.
          </>
        }
      />
    </Article>
  )
}
