import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Clinic, { type Show } from './Clinic'
import Lab from './Lab'
import {
  BEST,
  chanceOf,
  chanceOfTruth,
  constantLoss,
  CONSTANTS,
  CUTOFF,
  cutoffWrong,
  degrees,
  GENTLE,
  GUESS_RATIO,
  GUESS_SURE,
  GUESS_UNSURE,
  halfwayOf,
  HARDEST,
  LAB_SIZE,
  logLoss,
  ODD,
  PATIENTS,
  pct,
  pullOf,
  PULLS,
  signed,
  SPAM_SHARE,
  STEEP,
  surpriseOf,
  totalLoss,
  TRUE,
  two,
  WORKED,
} from './model'

const STEPS: Show[] = ['patients', 'cutoff', 'curve', 'surprise', 'steep', 'search', 'named']

// Worked out once from the sixteen patients
const GENTLE_TOTAL = totalLoss(GENTLE, PATIENTS)
const STEEP_TOTAL = totalLoss(STEEP, PATIENTS)
const FLAT_TOTAL = totalLoss({ w: 0, b: 0 }, PATIENTS)
const BEST_TOTAL = totalLoss(BEST, PATIENTS)
const SURE_COST = logLoss(0, GUESS_SURE)
const UNSURE_COST = logLoss(0, GUESS_UNSURE)
const VERY_SURE = 0.99
const VERY_SURE_RATIO = logLoss(0, VERY_SURE) / UNSURE_COST

export default function LogisticRegression() {
  return (
    <Article
      kicker="Machine learning · Linear classifiers"
      title="Logistic regression"
      promise="A yes-or-no question often deserves the answer “probably”. How does a model learn to give a chance instead of a verdict, and how do you tell a good chance from a bad one?"
      takeaway={
        <>
          Logistic regression squashes a weighted sum through the sigmoid into a chance, and picks the weights that make
          what happened most likely: the least total <em>log loss</em>, ln(1 ÷ the chance given to the truth), whose
          slope is just Σ (chance − label) × features.
        </>
      }
      sources={[
        {
          title: 'COMP 642: Machine Learning',
          by: 'Vivek Boominathan, Rice University, Spring 2026',
          part: 'Lecture notes, week 4: logistic regression, maximum likelihood, the gradient and convexity of the log loss, and softmax regression',
        },
        {
          title: 'The Elements of Statistical Learning',
          by: 'Trevor Hastie, Robert Tibshirani and Jerome Friedman, 2nd edition, 2009',
          part: 'Section 4.4, logistic regression, and 4.4.1, fitting it by maximum likelihood',
          url: 'https://hastie.su.domains/ElemStatLearn/',
        },
      ]}
    >
      <Predict
        question={
          <>
            Your spam filter flags two emails: it is {pct(GUESS_SURE)} sure of the first, {pct(GUESS_UNSURE)} of the
            second. Both turn out to be fine. Under the score logistic regression trains with, how many times as much is
            the first mistake charged?
          </>
        }
        options={[
          { label: '1.5 times' },
          { label: `${GUESS_RATIO.toFixed(1)} times`, right: true },
          { label: '4 times' },
          { label: 'The same' },
        ]}
        reveal={
          <>
            About {GUESS_RATIO.toFixed(1)} times. The charge is the surprise, ln(1 ÷ the chance given to what really
            happened): the first gave a fine email {pct(1 - GUESS_SURE)}, a surprise of {two(SURE_COST)}; the second
            gave it {pct(1 - GUESS_UNSURE)}, {two(UNSURE_COST)}. At {pct(VERY_SURE)} sure it would be{' '}
            {two(logLoss(0, VERY_SURE))}, {Math.round(VERY_SURE_RATIO)} times as much: unearned certainty gets dearer the
            further you push it.
          </>
        }
      />

      <h2>A doctor in flu season</h2>

      <Steps
        readable
        say={[
          <>
            You’re a doctor in flu season. For each of {PATIENTS.length} patients you noted a temperature, and a test
            later said flu (filled dots, along the top) or not (hollow, along the bottom).
          </>,
          <>
            A rule, “flu from {degrees(CUTOFF)} up”, gets {cutoffWrong(PATIENTS)} of them wrong, and it calls 37.9°
            exactly as healthy as 36.2°: it has no way to say “maybe”.
          </>,
          <>
            So give each temperature a chance of flu instead: a curve that climbs smoothly from near 0 to near 1, through
            50% at {degrees(halfwayOf(GENTLE))}.
          </>,
          <>
            Judge it by how surprised it was by each patient: the less chance it gave what happened, the longer the gap
            and the taller the bar. The {degrees(ODD.temp)} flu patient got {pct(chanceOfTruth(GENTLE, ODD))}, a surprise
            of {two(surpriseOf(GENTLE, ODD))}.
          </>,
          <>
            Make the curve nearly as steep as the rule and the total jumps from {two(GENTLE_TOTAL)} to{' '}
            {two(STEEP_TOTAL)}: that patient alone now got under 1%, a surprise of {two(surpriseOf(STEEP, ODD))}.
          </>,
          <>
            Start instead from a flat 50% for everyone, a total of {two(FLAT_TOTAL)}, and nudge the curve steeper and
            sideways while the total falls. It stops at {two(BEST_TOTAL)}, crossing 50% at {degrees(halfwayOf(BEST))}.
          </>,
          <>
            Temperature is the <strong>feature</strong> x, w·x + b the <strong>score</strong>, the S-curve the{' '}
            <strong>sigmoid</strong> σ, the total surprise the <strong>log loss</strong>. The curve with the least is{' '}
            <strong>logistic regression</strong>.
          </>,
        ]}
      >
        {(step) => <Clinic key={step} show={STEPS[step]} />}
      </Steps>

      <p>
        A straight line through the 0s and 1s, the fit <Link to="/learnings/least-squares">least squares</Link> would
        give, can’t be read as a chance: it runs below 0 and above 1, and an easy flu case at 41° drags it. The S-curve
        stays between 0 and 1, and a patient it is already sure about barely moves it.
      </p>

      <h2>The one line of math</h2>
      <p>
        In words: score each case with a weighted sum, then squash the score into a chance with the sigmoid, σ(z) = 1 ÷
        (1 + e<sup>−z</sup>): 0 becomes 50%, large scores nearly 1, very negative ones nearly 0. The chance the curve
        gave everything you saw is the <strong>likelihood</strong>. Making it largest is making −ln of it smallest, and
        that is the total surprise: the log loss, or <strong>cross-entropy</strong>.
      </p>
      <Clip
        src="logistic-regression/log-loss"
        label="The likelihood L of w is a product over patients of p i to the y i times 1 minus p i to the 1 minus y i: p i if the patient had flu, 1 minus p i if not. Taking the log turns the product into a sum of y i ln p i plus 1 minus y i times ln of 1 minus p i. Flipping the sign gives minus ln L as a sum of y i ln 1 over p i plus 1 minus y i times ln 1 over 1 minus p i: the surprise at each patient, the log loss or cross-entropy. For the 37.4 degree flu patient, y is 1 and p is 0.20, so the surprise is ln of 1 over 0.20, which is 1.61."
        caption="The chance of everything you saw is a product; its log is a sum, and its negative is the total surprise. For each patient only one of the two terms is switched on."
      />
      <p>
        Unlike least squares, no formula gives the best weights, but the slope is simple: each case pulls with its
        chance minus its label (1 for flu, 0 for none), times its features, and{' '}
        <Link to="/learnings/gradient-descent">gradient descent</Link> follows the pulls downhill. Three patients under
        the best curve, with their chance of flu:
      </p>
      <Numbers
        words
        items={WORKED.map((p) => {
          const chance = chanceOf(BEST, p.temp)
          return {
            label: `${degrees(p.temp)}, ${p.flu ? 'flu' : 'no flu'}`,
            value: pct(chance),
            note: `surprise ${two(surpriseOf(BEST, p))} · pull ${signed(pullOf(chance, p.flu))}`,
          }
        })}
      />
      <p>
        The sure, right patient hardly pulls; the two the curve gets wrong pull hardest, in opposite directions, and at
        the best curve the pulls balance. Each surprise bends upward in its score, and the score is linear in the
        weights, so the log loss is <Link to="/learnings/convexity">convex</Link>: one bowl, and the walk can only stop at
        its bottom.
      </p>

      <h2>Fit it yourself</h2>
      <p>
        {LAB_SIZE} patients drawn from a true curve that crosses 50% at {degrees(halfwayOf(TRUE))} with a steepness of{' '}
        {TRUE.w} per °C. Set a curve by hand, or let gradient descent fit one from wherever yours is.
      </p>
      <Figure
        readable
        caption={
          <>
            Filled dots had flu, hollow ones didn’t. Each ink gap runs from a patient to the sage curve, and the bar under
            it is that patient’s surprise. The dashed line, where the curve crosses 50%, is the{' '}
            <strong>decision boundary</strong>. Choose no overlap and press Fit again and again: the boundary stays put
            while the steepness keeps climbing, since a steeper curve is always a little less surprised.
          </>
        }
      >
        <Lab />
      </Figure>

      <Predict
        kicker="Quick check"
        question="A spam filter’s current chances for four emails, every one on the right side of 50%, with features of the same size. Which pulls hardest on the next gradient-descent step?"
        options={PULLS.map((e) => ({ label: e.name, right: e === HARDEST }))}
        reveal={
          <>
            The fine email at {pct(HARDEST.chance)}. Each pull is the chance minus the label:{' '}
            {PULLS.map((e) => `${e.chance.toFixed(2)} − ${e.spam ? 1 : 0} = ${signed(pullOf(e.chance, e.spam))}`).join(
              ', '
            )}
            . Being on the right side of 50% doesn’t stop the pull; only being right and sure does.
          </>
        }
      />

      <h2>Making it work</h2>
      <ul>
        <li>
          <strong>Scale the features.</strong> Measure each from its mean in units of its spread, as temperature here is
          measured from 38°, so one step size suits every weight.
        </li>
        <li>
          <strong>Add a penalty.</strong> λ‖w‖² on top of the log loss, as in{' '}
          <Link to="/learnings/ridge-regression">ridge regression</Link>, keeps the weights modest when features are many
          or alike.
        </li>
        <li>
          <strong>Watch for a clean split.</strong> When a boundary separates the classes perfectly, the weights grow
          without end. The penalty stops that; if a clean split is what you want,{' '}
          <Link to="/learnings/max-margin">the widest margin</Link> picks one on purpose.
        </li>
        <li>
          <strong>Choose the threshold last.</strong> 50% is only a default. If a missed flu case costs far more than an
          extra test, test from 20%.
        </li>
      </ul>
      <p>
        With more classes, say the digits 0 to 9, each class gets its own score, and <strong>softmax</strong>, e to each
        score over the sum of e to all of them, turns the scores into chances that add up to 1. With two classes it is
        the sigmoid again.
      </p>

      <Predict
        kicker="Check yourself"
        question={`A filter must give every email the same chance of spam, and ${pct(SPAM_SHARE)} of your email is spam. Which chance gives the lowest log loss?`}
        options={CONSTANTS.map((q) => ({
          label: q === 0 ? `0%: right ${pct(1 - SPAM_SHARE)} of the time` : pct(q),
          right: q === SPAM_SHARE,
        }))}
        reveal={
          <>
            {pct(SPAM_SHARE)}. Saying 0% is infinitely surprised by the first spam. Per email, {pct(SPAM_SHARE)} costs{' '}
            {two(constantLoss(SPAM_SHARE))}, 50% {two(constantLoss(0.5))} and 70% {two(constantLoss(0.7))}. The lowest
            sits at the share that really happens, which is why log loss tends to give chances you can take at face
            value.
          </>
        }
      />
    </Article>
  )
}
