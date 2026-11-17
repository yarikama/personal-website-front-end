import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Copies, { type Show } from './Copies'
import Lab from './Lab'
import {
  at,
  BAD_BY_WIDTH,
  box,
  closeness,
  distance,
  DRAWS,
  FEW,
  MANY,
  NOT_GOOD_ENDLESS,
  pct,
  PLAIN_QUALITY,
  points,
  SENTENCES,
  STORY,
  STORY_COUNT,
  STORY_ENDLESS,
  STORY_QUALITY,
  STORY_RUN,
  two,
  without,
  WORKED_KEPT,
  WRONG_FEW,
  WRONG_MANY,
} from './model'

const STEPS: Show[] = ['whole', 'single', 'random', 'say', 'fit', 'named']

const n = STORY.length
const NOT = at(STORY, 'not')
const BAD = at(STORY, 'bad')
const NOT_GOOD = SENTENCES['not good']
const quote = (words: readonly string[]) => `“${words.join(' ')}”`
const [NARROW, , WIDE] = BAD_BY_WIDTH

export default function Lime() {
  return (
    <Article
      kicker="Natural language processing · Words as numbers"
      title="LIME"
      promise="A classifier calls a review positive and can’t tell you why. Without opening it up, how do you find out which words did it?"
      takeaway={
        <>
          LIME explains one prediction by covering words at random, asking the model about every copy, and fitting a
          straight line that listens most to the copies nearest the original: its weight per word is a{' '}
          <em>local</em> explanation, only as good as its fit and its number of copies.
        </>
      }
      sources={[
        {
          title: 'COMP 584: Natural Language Processing',
          by: 'Hanjie Chen, Rice University, Spring 2026',
          part: 'Interpretability, robustness and fairness: global and local explanations, and LIME',
        },
        {
          title: '“Why Should I Trust You?”: Explaining the Predictions of Any Classifier',
          by: 'Marco Tulio Ribeiro, Sameer Singh and Carlos Guestrin, KDD 2016',
          part: 'Section 3: interpretable representations, sampling around an instance, the kernel, and sparse linear explanations; section 3.5, the newsgroup example',
          url: 'https://arxiv.org/abs/1602.04938',
        },
      ]}
    >
      <Predict
        question={
          <>
            A sentiment classifier is {pct(box(STORY))} sure {quote(STORY)} is positive. You may only show it edited
            copies of the review and read its answers. Which word will end up with the most credit for the thumbs-up?
          </>
        }
        options={[
          { label: '“acting”' },
          { label: '“not”', right: true },
          { label: '“bad”' },
          { label: 'They split it evenly' },
        ]}
        reveal={
          <>
            “not”. Without it the review reads {quote(without(STORY, 'not'))}, and the classifier drops to{' '}
            {pct(box(without(STORY, 'not')))}. Without “bad” it only falls to {pct(box(without(STORY, 'bad')))}, and in
            copies that have lost “not”, “bad” pulls the other way. Here is how to get there from answers alone.
          </>
        }
      />

      <h2>Covering words</h2>

      <Steps
        readable
        say={[
          <>
            You show a friend a one-line review, {quote(STORY)}, and they’re {pct(box(STORY))} sure it’s a thumbs-up.
            Asked why, they shrug.
          </>,
          <>
            So you cover one word at a time with your thumb: without “not” they say {pct(box(without(STORY, 'not')))}, without
            “bad” {pct(box(without(STORY, 'bad')))}, and without “the” still {pct(box(without(STORY, 'the')))}.
          </>,
          <>
            One at a time misses words that act together, so you cover random handfuls instead: {STORY_COUNT}{' '}
            copies, each with your friend’s answer.
          </>,
          <>
            A copy with one word left is hardly your review any more, so each copy gets a say, the sage dot, by how much
            of the review survives: {two(closeness(4, n))} for four words of five, {two(closeness(1, n))} for one.
          </>,
          <>
            Now find a base and one credit per word so that the base plus the credits of the words a copy keeps lands
            near each answer, loud copies counting most: “not” gets {points(STORY_RUN.line.credit[NOT])} points, “bad”{' '}
            {points(STORY_RUN.line.credit[BAD])}, the rest about nothing.
          </>,
          <>
            Your friend is a <strong>black-box classifier</strong>, each copy a <strong>perturbed sample</strong>, the
            say a <strong>kernel</strong>, and the credits are <strong>LIME</strong>’s explanation of this one
            prediction.
          </>,
        ]}
      >
        {(step) => <Copies key={step} show={STEPS[step]} />}
      </Steps>

      <p>
        The box here is a tiny <Link to="/learnings/neural-networks">neural network</Link>: it adds up a vector for each
        word and passes the sum through a hidden layer, one of whose units fires only when “not” meets a complaint. It
        never sees words, only vectors; the explanation speaks in words kept or covered, the same 0s and 1s as a{' '}
        <Link to="/learnings/bag-of-words">bag of words</Link>. That split is the trick: whatever the model reads, the
        reader gets something they can check.
      </p>
      <p>
        The name says what it does. <strong>LIME</strong>, Local Interpretable Model-agnostic Explanations (Ribeiro,
        Singh and Guestrin, 2016), is <em>local</em> because it explains one prediction from copies near it,{' '}
        <em>interpretable</em> because the answer is a credit per word, and <em>model-agnostic</em> because it only
        asks the box for answers.
      </p>

      <h2>The one line of math</h2>
      <p>
        In words: choose the base and credits that make the misses, squared and weighted by each copy’s say, as small
        as possible. A copy’s say falls off with its distance from the review, the cosine distance between their 0/1
        word vectors, which for a copy keeping k of n words is 1 − √(k ÷ n).
      </p>
      <Clip
        src="lime/weighted-fit"
        label="The loss L is a sum over copies z of pi of z times the square of f of z minus g of z prime. f of z is the box's answer for the copy, g of z prime is the line's guess: a base plus the credit of each word the copy keeps. pi of z, the copy's say, is e to the minus distance squared over sigma squared. For a copy keeping 4 of 5 words, the distance is 0.11 and the say 0.91."
        caption="The box’s answer, the line’s guess, and how much the copy counts: each miss is squared and weighted by the copy’s say before it is added up."
      />
      <p>With a width σ of 0.35, three copies of the five-word review:</p>
      <Numbers
        items={WORKED_KEPT.map((k) => ({
          label: `${k} of ${n} words kept`,
          value: two(closeness(k, n)),
          note: `distance ${two(distance(k, n))}`,
        }))}
      />
      <p>
        Finding the credits is a weighted <Link to="/learnings/least-squares">least-squares</Link> fit. The paper also
        caps an explanation at K words, chosen with the Lasso, which matters for a long document more than for five
        words.
      </p>

      <h2>Explain it yourself</h2>
      <p>
        The same box and the same recipe, run live. Start with {STORY_COUNT} copies and press Draw again a few times;
        then slide up to a few hundred.
      </p>
      <Figure
        readable
        caption={
          <>
            Each bar is a word’s credit from this draw: sage toward thumbs-up, ink toward thumbs-down. The ink tick is
            what endless copies would give. Cover words above to compare what the box says about that copy with what the
            line says. “Line fits box” is how much of the box’s answers, say-weighted, the line explains.
          </>
        }
      >
        <Lab />
      </Figure>

      <Predict
        kicker="Quick check"
        question={
          <>
            The same box calls {quote(NOT_GOOD)} {pct(box(NOT_GOOD))} likely positive. With endless copies, what credit
            does LIME give “not” there?
          </>
        }
        options={[
          { label: `${points(STORY_ENDLESS.credit[NOT])}, as in “not bad”` },
          { label: 'About 0' },
          { label: points(NOT_GOOD_ENDLESS.credit[at(NOT_GOOD, 'not')]), right: true },
          { label: 'None: it only explains positives' },
        ]}
        reveal={
          <>
            {points(NOT_GOOD_ENDLESS.credit[at(NOT_GOOD, 'not')])}: here covering “not” turns the review into praise.
            The credit belongs to the word in this sentence, not to the word. A model whose words interact has no single
            weight per word to report, which is why LIME explains one prediction at a time.
          </>
        }
      />

      <h2>Before you trust an explanation</h2>
      <ul>
        <li>
          <strong>Draw plenty of copies, then draw again.</strong> Of {DRAWS} runs with {FEW} copies, {WRONG_FEW} put a
          word other than “not” on top; of {DRAWS} with {MANY}, {WRONG_MANY}. If a fresh draw reorders the top words,
          the explanation isn’t settled.
        </li>
        <li>
          <strong>Read the fit before the credits.</strong> Even with endless copies the line explains only{' '}
          {pct(STORY_QUALITY)} of the box’s answers on “not bad”, since a sum of credits can’t say “these two together”.
          On “a clever plot but slow and boring”, whose words each push one way, it explains {pct(PLAIN_QUALITY)}.
        </li>
        <li>
          <strong>Say what near means.</strong> The width σ decides how fast a copy’s say falls off. At{' '}
          {NARROW.width}, “bad” earns {points(NARROW.credit)}; at {WIDE.width}, {points(WIDE.credit)}. Neither is wrong:
          they answer different questions.
        </li>
        <li>
          <strong>Remember what covering does.</strong> {quote(without(STORY, 'bad'))} is a sentence nobody writes, and
          a trained classifier has seen nothing like it. Its answer there is a guess, and the credits are built from
          such guesses.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="A classifier sorts newsgroup posts into Christianity and atheism, 94% right on held-out posts. LIME keeps crediting “Posting”, “Host” and “Re”, words from the email headers. What should you conclude?"
        options={[
          { label: 'It’s accurate: trust it' },
          { label: 'It leans on a quirk of the data', right: true },
          { label: 'LIME has broken down' },
          { label: 'Headers carry religion' },
        ]}
        reveal={
          <>
            A quirk. In the paper’s data, “Posting” appeared in 22% of training posts, 99% of them atheist: a shortcut
            that held on test posts from the same source and would fail on any other. The accuracy said trust it; a
            handful of explanations said why not.
          </>
        }
      />
    </Article>
  )
}
