import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Crate, { type Show } from './Crate'
import Lab from './Lab'
import { CHECK, GUESS, guess, messyCrate, storyCrate, storyMoments, visits, worked } from './model'

// Worked out once: the guess's thousand avocados, the story's two crates
// and their looks, and the three worked crates
const GUESSED = guess()
const TIDY = storyCrate()
const TIDY_VISITS = visits(TIDY.data, TIDY.run)
const MESSY = messyCrate()
const MESSY_ROUNDS = 8
const MESSY_VISITS = visits(MESSY.data, MESSY.run, MESSY_ROUNDS)
const MOMENTS = storyMoments(TIDY.data, TIDY.run)
const WORKED = worked()
const SHOWS: Show[] = ['intro', 'calls', 'mistake', 'run', 'messy', 'named']

const count = (value: number) => Math.round(value).toLocaleString('en-US')

export default function Perceptron() {
  const guessMistakes = GUESSED.run.mistakes.length
  const guessBound = Math.floor(GUESSED.bound)
  const tidyMistakes = TIDY.run.mistakes.length
  const n = TIDY.data.length
  const messyWrong = Math.round(MESSY_VISITS.filter((v) => v.wrong).length / MESSY_ROUNDS)

  return (
    <Article
      kicker="Machine learning · Linear classifiers"
      title="The perceptron"
      promise="A perceptron changes its rule only when it gets an example wrong. Does it ever stop getting them wrong, and how many mistakes does that take?"
      takeaway={
        <>
          On every mistake add y x to the weights, and otherwise do nothing: if some line splits the data with a gap γ,
          inside a radius R, that costs at most (R/γ)² mistakes <em>however many points</em> there are, and if no line
          splits it, the rule never settles.
        </>
      }
      sources={[
        {
          title: 'COMP 642: Machine Learning',
          by: 'Vivek Boominathan, Rice University, Spring 2026',
          part: 'Lecture notes, Week 4-2, support vector machines: hyperplane classifiers and “The perceptron algorithm”',
        },
        {
          title: 'The Elements of Statistical Learning',
          by: 'Trevor Hastie, Robert Tibshirani and Jerome Friedman, 2nd edition, 2009',
          part: 'Section 4.5.1, “Rosenblatt’s Perceptron Learning Algorithm”',
          url: 'https://hastie.su.domains/ElemStatLearn/',
        },
        {
          title: 'Understanding Machine Learning: From Theory to Algorithms',
          by: 'Shai Shalev-Shwartz and Shai Ben-David, Cambridge University Press, 2014',
          part: 'Section 9.1.2, the perceptron for halfspaces, and its mistake bound (Theorem 9.1)',
          url: 'https://www.cs.huji.ac.il/~shais/UnderstandingMachineLearning/',
        },
        {
          title: 'The perceptron: a probabilistic model for information storage and organization in the brain',
          by: 'Frank Rosenblatt, Psychological Review 65(6), 1958',
          part: 'The perceptron itself',
          url: 'https://doi.org/10.1037/h0042519',
        },
        {
          title: 'On convergence proofs on perceptrons',
          by: 'Albert B. J. Novikoff, Symposium on the Mathematical Theory of Automata, 1962',
          part: 'The (R/γ)² bound on mistakes',
        },
        {
          title: 'Large margin classification using the perceptron algorithm',
          by: 'Yoav Freund and Robert E. Schapire, Machine Learning 37, 1999',
          part: 'The voted and averaged perceptron, for data no line splits',
          url: 'https://doi.org/10.1023/A:1007662407062',
        },
      ]}
    >
      <Predict
        question={
          <>
            A program sorts {count(GUESS.n)} avocados into ripe and not ripe with a straight-line rule. It looks at them
            one at a time, round and round, and changes its rule only when it calls one wrong. Some straight line does
            split them, with a clear gap. How many wrong calls does it make before it never makes another?
          </>
        }
        options={[
          { label: 'Fewer than 50', right: true },
          { label: 'Several hundred' },
          { label: `At least ${count(GUESS.n)}: one per avocado` },
          { label: 'It never stops: there’s always another' },
        ]}
        reveal={
          <>
            It made {guessMistakes}, and before it started, a one-line formula said it could make no more than{' '}
            {guessBound}. That limit has no {count(GUESS.n)} in it: a million avocados from the same pile would get the
            same one. Here is how it learns.
          </>
        }
      />

      <h2>Learning to call an avocado</h2>

      <Steps
        readable
        say={[
          <>
            You’ve started at a greengrocer, sorting avocados into ripe and not yet by how much softer and darker each
            one is than a usual one.
          </>,
          <>
            Your rule is a straight line through the middle: whatever lands on the shaded side you call ripe. Customers
            cut theirs open and tell you whether you were right.
          </>,
          <>
            Right, and you change nothing. Wrong, and you turn the line toward the avocado you missed: this unripe one
            sat on the ripe side, so the line swings until it’s out.
          </>,
          <>
            Start over with no rule and practise on these {n}, round and round. You make {tidyMistakes} wrong calls in
            your first {TIDY.run.passes - 1} rounds; in round {TIDY.run.passes} every call is right, and the line never
            moves again.
          </>,
          <>
            Next week’s crate is messier: some soft, dark ones aren’t ripe yet, and no straight line through the middle
            splits them. Round after round, about {messyWrong} calls in {n} go wrong, and the line never stops swinging.
          </>,
          <>
            Each avocado is a point x, ripe or not is its label y, +1 or −1, and your line is set by an arrow of weights
            w: you call sign(w · x). Turning toward a miss is w ← w + y x. That is the <strong>perceptron</strong>.
          </>,
        ]}
      >
        {(step) => (
          <Crate
            key={step}
            show={SHOWS[step]}
            tidy={TIDY}
            tidyVisits={TIDY_VISITS}
            messy={MESSY}
            messyVisits={MESSY_VISITS}
            calls={MOMENTS.calls}
            mistake={MOMENTS.mistake}
          />
        )}
      </Steps>

      <p>
        A rule like this, a line with one class on each side, is a <strong>linear classifier</strong>.{' '}
        <Link to="/learnings/logistic-regression">Logistic regression</Link> draws the same kind of line but turns w · x
        into a probability and learns a little from every point; the perceptron reads only the sign, and learns only
        from its errors. A line that misses the middle needs a threshold too: give every point one more coordinate,
        always 1, and the threshold becomes one more weight.
      </p>

      <h2>The one line of math</h2>
      <p>
        In words: when the rule calls a point wrong, add the point to the weights if its label is +1, and subtract it
        if −1. In symbols, if y (w · x) ≤ 0, then w ← w + y x. That raises y (w · x) for the point by |x|², so it moves
        toward its own side, though one nudge need not carry it all the way. From w = 0, the weights are always the
        missed positives added up, minus the missed negatives.
      </p>
      <p>
        Now say some line through the middle splits the data, and the nearest point sits a distance γ from it: the{' '}
        <strong>margin</strong>. Let R be how far the farthest point is from the middle. Then the perceptron makes at
        most <strong>(R/γ)²</strong> mistakes, in any order, over any number of rounds, whatever the number of points.
        Three crates of {WORKED[0].data.length} points each:
      </p>
      <Numbers
        words
        items={WORKED.map((c) => ({
          label: c.name,
          value: Number.isFinite(c.bound) ? `≤ ${count(Math.floor(c.bound))}` : 'no limit',
          note: c.run.settled
            ? `R ${c.r.toFixed(2)}, γ ${c.gamma.toFixed(3)} · made ${c.run.mistakes.length}`
            : `${count(c.run.mistakes.length)} in ${count(c.run.passes)} rounds`,
        }))}
      />
      <p>
        Halve the gap and the limit grows four times. It is a worst case, and real runs come in far under it. Push the
        groups into each other and there is no γ, so no limit: the rule keeps turning for as long as you let it. Why
        the mistakes must run out, built up step by step:
      </p>
      <Clip
        src="perceptron/mistake-bound"
        label="Suppose a unit arrow w star splits the data with every point at least gamma on its own side, and every point within R of the middle. On each mistake w becomes w plus y x. Along w star, w gains at least gamma, so after k mistakes w dot w star is at least k gamma. Its squared length gains at most R squared, because the cross term 2 y w dot x is not positive on a mistake, so after k mistakes it is at most k R squared. A shadow is never longer than the arrow, so k gamma is at most root k times R, which gives k at most R over gamma, squared."
        caption="Each mistake pushes w at least γ further along the splitting line’s arrow, but its length grows only like √k. Steady progress against slow growth: the mistakes have to stop by k = (R/γ)²."
      />
      <p>
        This is Novikoff’s theorem, from 1962. It promises <em>a</em> line that gets every point right, not which one:
        the order of the points decides, and the line can end up hugging one group. Choosing the line with the widest
        gap on purpose is the <Link to="/learnings/max-margin">maximum-margin classifier</Link>.
      </p>

      <h2>Run it yourself</h2>
      <p>A hundred points from the same oval. Pull the groups apart or push them together, then let it learn.</p>
      <Figure
        readable
        caption={
          <>
            Filled sage points are +1 and open ones −1; a thin ring marks a point the line calls wrong right now, and a
            heavy ink ring the latest mistake. The dashed circle has radius R, and the dashed lines mark the widest empty
            strip a line through the middle could sit in, 2γ across. Shrink the gap to watch the limit climb, and push
            the groups together to watch it never settle.
          </>
        }
      >
        <Lab />
      </Figure>

      <Predict
        kicker="Quick check"
        question={
          <>
            A crate has R = {CHECK.r} and a gap γ = {CHECK.gamma}, so the perceptron makes at most {CHECK.before}{' '}
            mistakes. Which change can raise that limit to {CHECK.after}?
          </>
        }
        options={[
          { label: 'Ten times as many avocados from the same pile' },
          { label: `Halve the gap, to γ = ${CHECK.gamma / 2}`, right: true },
          { label: 'Go round the crate four times as often' },
          { label: 'Shuffle the order every round' },
        ]}
        reveal={
          <>
            Halving the gap: ({CHECK.r}/{CHECK.gamma / 2})² = {CHECK.after}. The limit has no count of points in it, and
            it already covers every round together, in any order; only R and γ move it, and γ is squared.
          </>
        }
      />

      <h2>Using it well</h2>
      <ul>
        <li>
          <strong>Shuffle every round.</strong> Which line it ends on depends on the order, and a sorted crate, all the
          ripe ones first, drags the line hard one way and then the other.
        </li>
        <li>
          <strong>Centre the features.</strong> R is measured from the middle, so points that all sit far from zero, or
          one feature in much bigger units than the rest, swell R without widening the gap.
        </li>
        <li>
          <strong>On messy data, don’t wait for it to settle.</strong> Cap the rounds and keep the average of w over
          every step, the <strong>averaged perceptron</strong>, which wobbles far less than the last w; or use a method
          built for overlap, like logistic regression or a <Link to="/learnings/soft-margin">soft margin</Link>.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="You score how much softer and darker than usual each avocado is. A colleague scores the same avocados on a scale ten times finer, so every coordinate is ten times yours. Going through them in the same order, how many mistakes does their perceptron make?"
        options={[
          { label: 'Ten times as many' },
          { label: 'A hundred times as many' },
          { label: 'The same number', right: true },
          { label: 'Ten times fewer' },
        ]}
        reveal={
          <>
            The same. Their weights are always ten times yours, so every w · x has the same sign and every call
            matches. The bound agrees: R and γ both grow tenfold, and (R/γ)² stays put.
          </>
        }
      />
    </Article>
  )
}
