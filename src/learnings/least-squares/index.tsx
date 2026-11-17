import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Candidates from './Candidates'
import Lab from './Lab'
import {
  absoluteTotal,
  BEST,
  count,
  dollars,
  FIVE_SMALL,
  FLAT,
  misses,
  ODD,
  ONE_BIG,
  priceAt,
  SALES,
  squaredTotal,
  sumOfMisses,
  sumOfSquares,
  THROUGH_FOUR,
  YOUR_AGE,
} from './model'
import Shadow from './Shadow'
import Story, { type Show } from './Story'

const STEPS: Show[] = ['sales', 'try', 'square', 'search', 'best', 'lean', 'named']

// Worked out once from the five sales
const FOUR_MISS = misses(SALES, THROUGH_FOUR)[ODD]
const BEST_MISSES = misses(SALES, BEST)
const BEST_TOTAL = sumOfSquares(SALES, BEST)
const FOUR_TOTAL = sumOfSquares(SALES, THROUGH_FOUR)
const FLAT_TOTAL = sumOfSquares(SALES, FLAT)
const FOUR_COST = BEST_MISSES.reduce((sum, m, i) => (i === ODD ? sum : sum + m * m), 0)
const ODD_SAVED = FOUR_MISS ** 2 - BEST_MISSES[ODD] ** 2

const whole = (value: number) => Math.round(value) + 0
const signed = (value: number) => (whole(value) < 0 ? `−${-whole(value)}` : `${whole(value)}`)
// "36 − 108 − 288 + 360"
const sumText = (values: number[]) =>
  values.map((v, i) => (i === 0 ? signed(v) : `${whole(v) < 0 ? '−' : '+'} ${Math.abs(whole(v))}`)).join(' ')

export default function LeastSquares() {
  return (
    <Article
      kicker="Machine learning · Fitting a model"
      title="Least squares"
      promise="Given a handful of examples, which straight line predicts best, and how do you find it without trying every line?"
      takeaway={
        <>
          Least squares picks the weights whose <em>squared</em> misses add up to the least. One set of equations, XᵀXw
          = Xᵀy, gives them, and leaves the misses at a right angle to every feature.
        </>
      }
      sources={[
        {
          title: 'COMP 642: Machine Learning',
          by: 'Vivek Boominathan, Rice University, Spring 2026',
          part: 'Lecture notes, week 2: linear regression and least squares estimation',
        },
        {
          title: 'The Elements of Statistical Learning',
          by: 'Trevor Hastie, Robert Tibshirani and Jerome Friedman, 2nd edition, 2009',
          part: 'Section 3.2, linear regression models and least squares, and its geometric picture',
          url: 'https://hastie.su.domains/ElemStatLearn/',
        },
      ]}
    >
      <Figure caption="Five used bikes like yours, by age and price. Four sold on one straight pattern; the hollow dot, a five-year-old, sold for $180 more than that pattern says.">
        <Candidates />
      </Figure>

      <Predict
        question="Least squares draws the line whose misses, each squared, add up to the least. Which of the four is it?"
        options={[
          { label: 'A · through the four' },
          { label: 'B · flatter, toward the odd one', right: true },
          { label: 'C · the four’s tilt, raised' },
          { label: 'D · flat at the average' },
        ]}
        reveal={
          <>
            B. Line A misses only one sale, but by {dollars(FOUR_MISS)}, and {count(FOUR_MISS)} squared is{' '}
            {count(FOUR_TOTAL)}: more than B’s five misses squared and added, {count(BEST_TOTAL)}. Even flat D beats A.
            Add up plain misses instead and A would win, {dollars(sumOfMisses(SALES, THROUGH_FOUR))} to B’s{' '}
            {dollars(sumOfMisses(SALES, BEST))}. Squaring is what pulls the line toward the odd sale.
          </>
        }
      />

      <h2>Pricing your bike</h2>

      <Steps
        say={[
          <>You’re selling your {YOUR_AGE}-year-old bike, and you’ve watched five bikes like it sell.</>,
          <>
            Try a rule: start at {dollars(THROUGH_FOUR.start)} and take off {dollars(-THROUGH_FOUR.perYear)} a year. It
            hits four sales and misses the five-year-old by {dollars(FOUR_MISS)}.
          </>,
          <>
            Score the rule by squaring each miss: {dollars(FOUR_MISS)} off scores {count(FOUR_TOTAL)}, the area of a
            square with {dollars(FOUR_MISS)} sides.
          </>,
          <>Now tilt and slide the line, and watch the squares: some grow, some shrink, and their total moves.</>,
          <>
            The total can’t get below {count(BEST_TOTAL)}, reached at {dollars(BEST.start)} less{' '}
            {dollars(-BEST.perYear)} a year, which prices your bike at {dollars(priceAt(BEST, YOUR_AGE))}.
          </>,
          <>
            Leaning toward the odd sale costs the other four {count(FOUR_COST)} between them, but shrinks the odd sale’s
            square by {count(ODD_SAVED)}, so the lean pays.
          </>,
          <>
            Age is the <strong>feature</strong>, price the <strong>target</strong>, {dollars(BEST.start)} and{' '}
            {dollars(BEST.perYear)} the <strong>weights</strong>, each gap a <strong>residual</strong>. The line with
            the least total of squares is <strong>least squares</strong>.
          </>,
        ]}
      >
        {(step) => <Story key={step} show={STEPS[step]} />}
      </Steps>

      <p>
        Why square the misses instead of just adding them? You have seen the first reason: a miss twice as big costs
        four times as much, so the line won’t leave any sale far off to please the rest. The second is that the total,
        as the weights change, is a smooth bowl with one bottom, so there is exactly one best line and a way to find it
        (why a bowl has no other low point is the subject of <Link to="/learnings/convexity">convexity</Link>).
      </p>

      <h2>The one line of math</h2>
      <p>
        In words: pick weights w, a starting price and a price per year. For every sale, take the actual price minus the
        predicted one, square it, and add these up: L(w) = Σ (yᵢ − xᵢ · w)². Least squares is the w with the smallest L.
        For three of the guess’s lines:
      </p>
      <Numbers
        items={[
          {
            label: 'A · through four',
            value: count(FOUR_TOTAL),
            note: 'one big miss',
          },
          {
            label: 'D · flat',
            value: count(FLAT_TOTAL),
            note: 'five middling',
          },
          {
            label: 'B · least squares',
            value: count(BEST_TOTAL),
            note: 'the bottom',
          },
        ]}
      />
      <p>
        You don’t have to try lines to find the bottom. At the bottom of a bowl the ground is level every way you step,
        so nudging any one weight leaves L unchanged. Write that down once per weight and you get as many equations as
        weights, the <strong>normal equations</strong> XᵀXw = Xᵀy, where X has a row per sale (a 1 for the starting
        price, then the age) and y lists the prices.
      </p>
      <Clip
        src="least-squares/normal-equations"
        label="The total of squared misses, L of w, equals the sum over sales of y i minus x i dot w, squared, which is the squared length of y minus X w. At the bottom its slope is zero: minus 2 X transpose times y minus X w equals 0. The part y minus X w is the leftover misses, at a right angle to every feature column. Rearranged, X transpose X w equals X transpose y, the normal equations. For the five bikes: the matrix 5, 15, 15, 55 times b and m equals 1880 and 5400, so b is 448 dollars and m is minus 24 dollars a year."
        caption="Set the slope of the total to zero and the normal equations fall out. For the five bikes they are two equations in two unknowns."
      />
      <p>
        The middle line of that derivation says something you can check by hand: multiply the leftover misses by any
        feature and add them up, and you get zero. The bikes’ misses, {BEST_MISSES.map(signed).join(', ')}, add to 0,
        and times their ages they add to {sumText(BEST_MISSES.map((m, i) => m * SALES[i].age))} = 0.
      </p>
      <p>
        That is the fit seen as a <strong>projection</strong>. Treat the five prices as one point in a space with a
        direction for each sale. Every choice of weights puts the predictions somewhere on a flat sheet: everything a
        starting price and a price per year can make. The closest spot on the sheet is right below the prices, and the
        leftover from there up to the prices meets the sheet at a right angle.
      </p>
      <Figure caption="Drawn in three directions; the bikes need five, one per sale. The sage guess slides over the sheet until it sits right below the prices: the shortest leftover is the one at a right angle to the sheet.">
        <Shadow />
      </Figure>
      <p>
        With more features, say age and kilometres ridden, the line becomes a flat plane through a cloud of points, w
        gets one weight per feature, and nothing else changes: the same equations with a wider X. When there are too
        many weights to solve them directly, <Link to="/learnings/gradient-descent">gradient descent</Link> walks down
        the same bowl instead.
      </p>

      <h2>Try it</h2>
      <Figure caption="Drag a sale, tap the chart to add one, or add an odd sale far out; the sage line is always the least-squares line for what is there. However you move things, the two sums under the numbers stay at 0.">
        <Lab />
      </Figure>

      <Predict
        kicker="Quick check"
        question={`Line P misses one sale by $${ONE_BIG.by} and fits the rest exactly. Line Q misses each of ${FIVE_SMALL.misses} sales by $${FIVE_SMALL.by}. Which does least squares prefer?`}
        options={[
          { label: 'P: it misses only one sale' },
          { label: 'P: its misses add to less' },
          { label: 'Q: its squares add to less', right: true },
          { label: 'They tie' },
        ]}
        reveal={
          <>
            Q. P scores {count(squaredTotal(ONE_BIG))}; Q scores {FIVE_SMALL.misses} × {count(FIVE_SMALL.by ** 2)} ={' '}
            {count(squaredTotal(FIVE_SMALL))}. Counted in plain dollars P wins, {dollars(absoluteTotal(ONE_BIG))} to{' '}
            {dollars(absoluteTotal(FIVE_SMALL))}, but squaring makes one big miss cost more than several small ones.
          </>
        }
      />

      <h2>Using it well</h2>
      <ul>
        <li>
          <strong>Look at the misses, not just the total.</strong> Plot each residual against each feature. If they
          bend, above the line at both ends and below it in the middle, a straight line is the wrong shape, and no fit
          will fix that.
        </li>
        <li>
          <strong>Find the biggest squares.</strong> One price typed as $4,000 instead of $400 drags every prediction.
          Check the largest residuals before you trust the line; if wild values are real and common, a loss that grows
          more slowly, such as plain absolute misses, holds the line steadier.
        </li>
        <li>
          <strong>Keep many more examples than weights.</strong> With as many weights as examples, some line passes
          through every point, even pure noise: a perfect fit that predicts nothing. That is the trade-off of{' '}
          <Link to="/learnings/bias-variance">bias and variance</Link>.
        </li>
        <li>
          <strong>Solve, don’t invert.</strong> Use a least-squares solver (numpy’s <code>lstsq</code>) rather than
          computing the inverse of XᵀX. When two features nearly copy each other the answer turns shaky, which is what{' '}
          <Link to="/learnings/ridge-regression">ridge regression</Link> is for; and if you fit by gradient descent, put
          features on similar scales first.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="A least-squares fit predicts a flat’s rent from its floor area and its distance to the station, plus a starting rent. Multiply each flat’s miss by its floor area and add them up. What do you get?"
        options={[
          { label: 'Zero', right: true },
          { label: 'The sum of squared misses' },
          { label: 'More, for bigger flats' },
          { label: 'Depends on the fit' },
        ]}
        reveal={
          <>
            Zero. The normal equations hold for every feature column, floor area included, so the misses weighted by
            area cancel exactly, however good or poor the fit. The same goes for distance, and for the column of 1s: the
            misses themselves add to zero.
          </>
        }
      />
    </Article>
  )
}
