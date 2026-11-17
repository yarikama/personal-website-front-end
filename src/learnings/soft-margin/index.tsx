import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Lab from './Lab'
import Losses from './Losses'
import { formatC, hinge, LAB, LAB_SHOWN, QUIZ_C, QUIZ_COST, QUIZ_T, STORY, WORKED } from './model'
import Villages, { type Show } from './Villages'

const STEPS: Show[] = ['first', 'near', 'none', 'soft', 'tolls', 'sweep', 'named']
const n = STORY.numbers
const two = (value: number) => value.toFixed(2)
const minus = (value: number) => (value < 0 ? `−${-value}` : String(value))
const [LOW, MID, HIGH] = LAB_SHOWN

export default function SoftMargin() {
  return (
    <Article
      kicker="Machine learning · Linear classifiers"
      title="Soft margins"
      promise="Real classes overlap, and one mislabelled point can wreck the widest street or rule it out. How does a support vector machine let a few points break the rule, and what should they pay?"
      takeaway={
        <>
          A soft margin lets a point sit inside the street or past it for a price, its hinge loss max(0, 1 − y·f(x)), and{' '}
          <em>C</em> sets how dear that price is: a large C bends the street around every point, a small one keeps it
          wide and calm.
        </>
      }
      sources={[
        {
          title: 'COMP 642: Machine Learning',
          by: 'Vivek Boominathan, Rice University, Spring 2026',
          part: 'Week 4 lecture notes, Support vector machines: soft-margin SVMs and the hinge-loss form',
        },
        {
          title: 'The Elements of Statistical Learning',
          by: 'Trevor Hastie, Robert Tibshirani and Jerome Friedman, 2nd edition, 2009',
          part: 'Section 12.2, the support vector classifier when the classes overlap, and Section 12.3.2, the SVM as a penalisation method, with the hinge beside other losses',
          url: 'https://hastie.su.domains/ElemStatLearn/',
        },
        {
          title: 'Support-Vector Networks',
          by: 'Corinna Cortes and Vladimir Vapnik, Machine Learning 20, 1995',
          part: 'The soft margin, introduced',
          url: 'https://link.springer.com/article/10.1007/BF00994018',
        },
        {
          title: 'Sequential Minimal Optimization: A Fast Algorithm for Training Support Vector Machines',
          by: 'John C. Platt, Microsoft Research technical report MSR-TR-98-14, 1998',
          part: 'The two-weight step the lab’s solver takes',
          url: 'https://www.microsoft.com/en-us/research/publication/sequential-minimal-optimization-a-fast-algorithm-for-training-support-vector-machines/',
        },
        {
          title: 'LIBSVM: A Library for Support Vector Machines',
          by: 'Chih-Chung Chang and Chih-Jen Lin, ACM Transactions on Intelligent Systems and Technology, 2011',
          part: 'Which pair of weights to move, and how b is found, as the lab does it',
          url: 'https://www.csie.ntu.edu.tw/~cjlin/libsvm/',
        },
        {
          title: 'A Practical Guide to Support Vector Classification',
          by: 'Chih-Wei Hsu, Chih-Chung Chang and Chih-Jen Lin, National Taiwan University',
          part: 'Scaling the features, and searching for C on a grid of powers',
          url: 'https://www.csie.ntu.edu.tw/~cjlin/papers/guide/guide.pdf',
        },
      ]}
    >
      <Predict
        question="Two groups of points have a wide, empty street between them. One more point arrives, labelled with the first group but sitting deep inside the second. What does the widest-street rule do with it?"
        options={[
          { label: 'Ignores it' },
          { label: 'Tilts a little' },
          { label: 'Swings hard to fit it' },
          { label: 'Finds no street at all', right: true },
        ]}
        reveal={
          <>
            It finds none. The widest-street rule, the hard-margin SVM, wants every point outside the street on its own
            side, and no straight line can put that point there, so the problem has no answer. Even a point near the gap,
            not across it, can swing the street a long way, as the story shows.
          </>
        }
      />

      <h2>A house on the wrong side</h2>

      <Steps
        readable
        say={[
          <>
            Two villages share a valley, and the road between them runs as far from every house as it can: {n.firstWide}{' '}
            metres wide.
          </>,
          <>
            A West family builds near the road, still on West’s side, and the widest road that clears every house turns{' '}
            {n.turned}° and shrinks to {n.squeezedWide} metres.
          </>,
          <>
            Then a West family builds deep inside East, and now no straight road keeps every house on its own side: the
            rule has no answer.
          </>,
          <>
            So you relax it: a house may sit on the road, or past it, if it pays a toll, and the road runs the way it
            first did again, {n.softWide} metres wide.
          </>,
          <>
            The toll is how far past its own edge of the road a house sits, counting the middle as 1: {two(n.tolls[0])}{' '}
            and {two(n.tolls[2])} for houses on the road, {two(n.tolls[3])} for the one across the middle, nothing for the
            rest.
          </>,
          <>
            You set the price of each unit: charge a lot and only {n.highPaying} houses pay, but the road shrinks to{' '}
            {n.highWide} metres and turns {n.highTurned}° toward the odd ones; charge little and it widens to {n.lowWide},
            with {n.lowPaying} paying.
          </>,
          <>
            The houses are data points, the road is a support vector machine’s street, each toll is a point’s{' '}
            <strong>slack</strong> ξ, and the price is <strong>C</strong>: this is the <strong>soft-margin SVM</strong>.
          </>,
        ]}
      >
        {(step) => <Villages key={step} show={STEPS[step]} />}
      </Steps>

      <p>
        The <Link to="/learnings/max-margin">widest street</Link> treats every point as a promise: stay outside the
        street, on your side. Real data break that promise, through a mistyped label or a patient who looks like the
        other group, and one broken promise drags the street a long way or leaves none. Corinna Cortes and Vladimir
        Vapnik’s fix, in 1995, was to put a price on breaking it.
      </p>

      <h2>The one line of math</h2>
      <p>
        In words: a point’s cost is how far it falls short of the edge of the street on its own side, counting that edge
        as 0 and the centre line as 1, and nothing if it is clear. Write the score as f(x) = w·x + b and the label as y =
        +1 or −1, so that y·f(x) is 1 or more exactly when the point is clear of the street:
      </p>
      <p className="text-center font-serif text-2xl text-ink">hinge loss = max(0, 1 − y·f(x))</p>
      <p>
        The soft-margin SVM picks the w and b that make ½‖w‖² + C × the sum of the hinge losses as small as possible. The
        first part is small when the street is wide, since its width is 2/‖w‖; the second is the bill for tolls. Three
        points:
      </p>
      <Numbers
        items={WORKED.map((w) => ({
          label: w.place,
          value: String(Number(hinge(w.t).toFixed(2))),
          note: `y·f(x) = ${minus(w.t)}`,
        }))}
      />
      <p>
        A point’s slack ξ and its hinge loss are the same number: any slack that covers the shortfall is allowed, but
        each unit costs C, so the best line pays exactly the shortfall. Write ξ out and only the hinge is left:
      </p>
      <Clip
        src="soft-margin/slack-to-hinge"
        label="The rule y i times f of x i is at least 1 minus xi i, with xi i at least 0. Turned round, xi i is at least 1 minus y i f of x i and at least 0, so at least the max of 0 and 1 minus y i f of x i. Since each unit costs C, xi i equals that max. Put into the objective, one half the squared norm of w plus C times the sum of the xi i becomes one half the squared norm of w plus C times the sum of the hinge losses: the first part asks for a wide street, the second is the hinge loss."
        caption="Two rules on the slack become one: at least 0, and at least the shortfall. Paying C a unit, the best line takes the least it may, and the constraints drop out."
      />
      <p>
        Counting mistakes would be the honest bill, but a count is flat almost everywhere, so it never tells the line
        which way to move. <Link to="/learnings/logistic-regression">Logistic regression</Link>’s log loss is a smooth
        cousin of the hinge that never quite reaches zero, so every point keeps a little pull. The hinge is exactly zero
        once a point is clear of the street: points far from it have no say at all.
      </p>
      <Figure caption="Each loss against y·f(x), how far a point sits on its own side. The sage hinge lies on or above the ink count of mistakes everywhere, so the slacks add up to at least the number of training errors. The dashed log loss is scaled to cost 1 on the line, like the others. The hollow dots are the three worked points.">
        <Losses />
      </Figure>

      <h2>See it on real data</h2>
      <p>
        Here two classes overlap, as real ones do, and one filled point sits among the hollow ones. Drag it, and move C.
      </p>
      <Figure
        readable
        caption={
          <>
            The sage band is the street. Each ink stroke runs from a point to the edge of the street on its own side, and
            its length is that point’s slack. The dotted line is where the line would be without your point: at C ={' '}
            {formatC(MID.C)} your point turns it {Math.round(MID.turned)}°, at C = {formatC(HIGH.C)} {Math.round(HIGH.turned)}°,
            and at C = {formatC(LOW.C)} only {Math.round(LOW.turned)}°, though then {LOW.violations} of the{' '}
            {LAB.length + 1} points sit in the street.
          </>
        }
      >
        <Lab />
      </Figure>
      <p>
        The lab solves the problem’s dual, as LIBSVM does: each point gets a weight between 0 and C, and the points
        enter only through inner products x·x′. A point clear of the street weighs 0 and one that pays weighs the full
        C, so C caps how hard any one point can pull. Inner products are all the{' '}
        <Link to="/learnings/kernel-trick">kernel trick</Link> needs to let the street curve.
      </p>

      <Predict
        kicker="Quick check"
        question="Your SVM gets 99% of its training data right but only 81% of new data. Its street is narrow and bends around a few points whose labels you doubt. Which way do you move C?"
        options={[
          { label: 'Raise C' },
          { label: 'Lower C', right: true },
          { label: 'Set C to 0' },
          { label: 'Leave C alone' },
        ]}
        reveal={
          <>
            Lower it. A big C makes every unit of slack dear, so the line twists to keep those doubtful points on their
            side, and the twist fits noise. A smaller C lets them pay instead, and the street widens and settles. C = 0
            goes too far: slack is then free, and the widest street of all, w = 0, separates nothing.
          </>
        }
      />

      <h2>Making it work</h2>
      <ul>
        <li>
          <strong>Choose C on held-out data.</strong> Try 0.01, 0.1, 1, 10 and 100, and keep the best validation or
          cross-validation score: training error always prefers a bigger C.
        </li>
        <li>
          <strong>Scale the features first.</strong> The street’s width is measured in the features’ own units, so a
          feature in thousands swamps one in fractions, and the same C means something different on each scale.
          Standardise every feature, then search for C.
        </li>
        <li>
          <strong>Count who pays.</strong> If most training points sit in the street even with a large C, no straight
          street suits the classes, and a curved one may.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question={`With C = ${QUIZ_C}, a point sits on the wrong side of the line, with y·f(x) = ${minus(QUIZ_T)}. What does it add to the quantity the SVM makes small?`}
        options={[{ label: '0' }, { label: '1' }, { label: String(hinge(QUIZ_T)) }, { label: String(QUIZ_COST), right: true }]}
        reveal={
          <>
            {QUIZ_COST}. Its hinge loss is 1 − ({minus(QUIZ_T)}) = {hinge(QUIZ_T)}: the whole unit from its edge of the
            street to the line, plus the half unit past it. Each unit costs C = {QUIZ_C}. An answer of 1 counts the
            mistake, as the 0-1 loss would; {hinge(QUIZ_T)} forgets the price.
          </>
        }
      />
    </Article>
  )
}
