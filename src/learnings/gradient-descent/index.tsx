import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Controls, Figure, Numbers, Readout, Slider } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Bowl from './Bowl'
import {
  afterStrides,
  bestRate,
  bestStep,
  bestSteps,
  CHECK_L,
  DEFAULT_LOG_STEP,
  DEFAULT_STRETCH,
  descend,
  factor,
  largestStep,
  LOG_STEP_RANGE,
  MAX_STEPS,
  rate2d,
  STRETCH_RANGE,
  STRIDE_SIZES,
  STRIDES,
  TOLERANCE,
  VALLEY_L,
  VALLEY_START,
  WORKED_STRETCH,
} from './model'
import Valley from './Valley'

const two = (value: number) => value.toFixed(2)
const step = (logStep: number) => {
  const eta = 10 ** logStep
  return eta < 0.1 ? eta.toPrecision(2) : eta.toFixed(eta < 1 ? 3 : 2)
}
const signed = (value: number) => `${value < 0 ? '−' : ''}${Math.abs(value).toFixed(1)}`
const times = (value: number) => `×${signed(value)}`

const [TIMID, EXACT, BOUNCY, WILD] = STRIDE_SIZES
const WORKED = [TIMID, BOUNCY, WILD] as const

export default function GradientDescent() {
  const [stretch, setStretch] = useState<number>(DEFAULT_STRETCH)
  const [logStep, setLogStep] = useState<number>(DEFAULT_LOG_STEP)
  const eta = 10 ** logStep
  const descent = descend(eta, stretch)
  const rate = rate2d(eta, stretch)

  return (
    <Article
      kicker="Machine learning · Fitting a model"
      title="Gradient descent"
      promise="When no formula gives a model its best weights, it walks downhill to them. How long should each step be, and why does a longer one sometimes never arrive?"
      takeaway={
        <>
          Step against the gradient, w ← w − η∇f(w): below 2/L every step shrinks the error by a fixed factor, past it
          every step grows it, and a stretched bowl, a large <em>condition number</em>, makes even the best step slow.
        </>
      }
      sources={[
        {
          title: 'COMP 642: Machine Learning',
          by: 'Vivek Boominathan, Rice University, Spring 2026',
          part: 'Lecture notes, Week 3, convex optimization: “Gradient descent” and “Convergence for quadratic functions”',
        },
        {
          title: 'The Elements of Statistical Learning',
          by: 'Trevor Hastie, Robert Tibshirani and Jerome Friedman, 2nd edition, 2009',
          part: 'Section 10.10, steepest descent; Section 11.4, the learning rate; Section 11.5.3, “Scaling of the Inputs”',
          url: 'https://hastie.su.domains/ElemStatLearn/',
        },
        {
          title: 'Convex Optimization',
          by: 'Stephen Boyd and Lieven Vandenberghe, Cambridge University Press, 2004',
          part: 'Section 9.3, the gradient method on strongly convex functions and the condition number',
          url: 'https://web.stanford.edu/~boyd/cvxbook/',
        },
        {
          title: 'Handbook of Convergence Theorems for (Stochastic) Gradient Methods',
          by: 'Guillaume Garrigos and Robert M. Gower, 2023',
          part: 'Gradient descent on smooth convex functions: the 1/t bound with step 1/L',
          url: 'https://arxiv.org/abs/2301.11235',
        },
      ]}
    >
      <Predict
        question={
          <>
            A ball sits on the curve w², {VALLEY_START} out from the bottom. Each step moves it downhill by a step size
            × the slope there (the slope of w² is 2w). After {STRIDES} steps, which step size leaves it closest to the
            bottom?
          </>
        }
        options={STRIDE_SIZES.map((eta) => ({ label: String(eta), right: eta === EXACT }))}
        reveal={
          <>
            {EXACT}: its first step lands exactly on the bottom. {BOUNCY} ends no closer than {TIMID}, both{' '}
            {two(afterStrides(TIMID))} away, and {WILD} ends {afterStrides(WILD).toFixed(0)} away, further than it began.
            Past a point a longer step is not faster. A walk in the fog shows why.
          </>
        }
      />

      <h2>Back in the fog</h2>

      <Steps
        readable
        say={[
          <>
            You’re back in the fog from the convexity page, this time in a plain bowl of a valley with one bottom,{' '}
            {VALLEY_START} metres out. All you can feel is how steeply the ground tilts under your boots.
          </>,
          <>
            So you stride downhill, each stride {TIMID} of how steep it feels, long where it’s steep and short where it’s
            gentle. After {STRIDES} strides you are still {two(afterStrides(TIMID))} m away.
          </>,
          <>Stride {EXACT} of the steepness instead, and your very first stride lands on the bottom.</>,
          <>
            At {BOUNCY} you overshoot onto the far slope, then back, crossing the bottom every stride: after {STRIDES}{' '}
            you are {two(afterStrides(BOUNCY))} m away, no better than the timid walk.
          </>,
          <>
            At {WILD} you land higher on the far slope than you started, where it’s steeper, so the next stride is longer
            still: after {STRIDES} you are {afterStrides(WILD).toFixed(0)} m out.
          </>,
          <>
            The valley is a model’s loss, where you stand is its weight, the slope underfoot is the{' '}
            <strong>gradient</strong>, and the share you stride is the <strong>step size</strong> η, or learning rate.
            Walking like this is <strong>gradient descent</strong>.
          </>,
        ]}
      >
        {(at) =>
          at === 0 ? (
            <Valley key="intro" show="intro" />
          ) : at === 1 ? (
            <Valley key="timid" show="walk" eta={TIMID} />
          ) : at === 2 ? (
            <Valley key="exact" show="walk" eta={EXACT} strides={1} />
          ) : at === 3 ? (
            <Valley key="bouncy" show="walk" eta={BOUNCY} />
          ) : at === 4 ? (
            <Valley key="wild" show="walk" eta={WILD} />
          ) : (
            <Valley key="named" show="named" eta={BOUNCY} strides={2} />
          )
        }
      </Steps>

      <p>
        Why walk when you could look the answer up? <Link to="/learnings/least-squares">Least squares</Link> has a
        formula, but it solves a system with a row and a column per feature, about n³ sums for n features: hopeless at a
        hundred thousand. <Link to="/learnings/logistic-regression">Logistic regression</Link> has no formula at all. A
        gradient costs one pass over the data, so a model takes many cheap steps instead of one dear one.{' '}
        <Link to="/learnings/gradient-bandits">Gradient bandits</Link> climb their preferences with the same move.
      </p>

      <h2>The one line of math</h2>
      <p>
        In words: new weight = old weight − step size × the slope there. In symbols, w ← w − η∇f(w), where the gradient
        ∇f is the slope along every weight at once. On a bowl whose slope grows by L for each unit you move out (L ={' '}
        {VALLEY_L} for w²), the slope at w is L·w, so a step takes w to (1 − ηL)·w. Every step multiplies the distance to
        the bottom by the same factor, 1 − ηL:
      </p>
      <Numbers
        words
        items={WORKED.map((eta) => {
          const f = factor(eta, VALLEY_L)
          return {
            label: `η = ${eta}`,
            value: times(f),
            note: f > 0 ? 'creeps in' : Math.abs(f) < 1 ? 'flips side, shrinks' : 'flips side, grows',
          }
        })}
      />
      <p>
        Smaller than 1 in size, the walk settles; negative, it bounces across; past −1, it climbs out. So it settles
        exactly when η is under 2/L, and η = 1/L lands in one step.
      </p>
      <Clip
        src="gradient-descent/shrink-or-grow"
        label="The rule in words, new equals old minus step times slope, becomes w t plus 1 equals w t minus eta times L w t, which gathers into 1 minus eta L, times w t. On a number line, eta L of 0.2 gives a factor of 0.8, inside the band from minus 1 to 1; 1.8 gives minus 0.8, also inside; 2.2 gives minus 1.2, outside. The walk settles exactly when eta is under 2 over L."
        caption="One step multiplies the distance by 1 − ηL. Inside the band from −1 to 1 the walk closes in; outside it, each step is bigger than the last."
      />
      <p>
        A loss whose slope changes by at most L per unit anywhere is called <strong>L-smooth</strong>, and the bowl’s
        rule carries over: steps under 2/L go downhill. At η = 1/L, on a{' '}
        <Link to="/learnings/convexity">convex</Link> loss, the gap to the best loss after t steps is at most L ×
        (starting distance)² ÷ 2t. That is slow: ten times closer costs ten times the steps. If the curvature is also at
        least some m &gt; 0 everywhere, the loss is strongly convex and the distance shrinks by a fixed factor each step,
        as on the bowl: every extra digit of accuracy costs the same number of steps.
      </p>

      <h2>A long, narrow valley</h2>
      <p>
        A model has many weights, and its bowl is rarely round. Below, the loss is ½(x² + κy²): curvature 1 along one
        weight, κ along the other. That ratio, steepest curvature over flattest, is the <strong>condition number</strong>{' '}
        κ. Pick a stretch and a step size.
      </p>
      <Figure
        readable
        caption={
          <>
            Contour lines of the loss, with the bottom at the hollow dot; the sage path is gradient descent from the
            filled dot. Stretch the bowl and the path zig-zags across the narrow valley while it inches along it. Past
            2/κ it flies out.
          </>
        }
      >
        <Bowl descent={descent} kappa={stretch} />
        <div className="mt-4 grid grid-cols-3 gap-4">
          <Readout
            label={`Steps to within ${TOLERANCE}`}
            value={descent.steps ?? (descent.outcome === 'diverges' ? 'Diverges' : `Over ${MAX_STEPS.toLocaleString('en-US')}`)}
            accent
          />
          <Readout label="Error × each step" value={rate.toFixed(3)} />
          <Readout label="Settles below" value={largestStep(stretch).toPrecision(2)} />
        </div>
        <Controls>
          <Slider label="Stretch κ" value={stretch} min={STRETCH_RANGE[0]} max={STRETCH_RANGE[1]} onChange={setStretch} />
          <Slider
            label="Step size η"
            value={logStep}
            min={LOG_STEP_RANGE[0]}
            max={LOG_STEP_RANGE[1]}
            step={0.05}
            onChange={setLogStep}
            format={step}
          />
        </Controls>
      </Figure>
      <p>
        The step must stay under 2/κ for the steep weight, and a step that small barely moves the flat one. The best
        fixed step, 2/(1 + κ), shrinks the error by (κ − 1)/(κ + 1) each step: from the start above to within{' '}
        {TOLERANCE}, a round bowl takes {bestSteps(WORKED_STRETCH[0])} step, a {WORKED_STRETCH[1]}× stretch{' '}
        {bestSteps(WORKED_STRETCH[1])} at η = {bestStep(WORKED_STRETCH[1]).toFixed(3)}, and a {WORKED_STRETCH[2]}×
        stretch {bestSteps(WORKED_STRETCH[2])}, at {bestRate(WORKED_STRETCH[2]).toFixed(2)} a step. The steps grow with κ.
        Nearly duplicate features stretch the bowl, the same thing that makes least-squares weights wobble, and{' '}
        <Link to="/learnings/ridge-regression">ridge regression</Link> steadies both.
      </p>

      <Predict
        kicker="Quick check"
        question="A house-price model uses floor area in square feet (500 to 5,000) and the number of bedrooms (1 to 5). Gradient descent zig-zags for thousands of steps, and any larger step blows up. What helps most?"
        options={[
          { label: 'A larger step size' },
          { label: 'Rescale both features to similar ranges', right: true },
          { label: 'Start from different weights' },
          { label: 'Run it for more steps' },
        ]}
        reveal={
          <>
            Rescale. The loss is far more curved along the floor-area weight, whose feature is a thousand times larger,
            so the bowl is a narrow valley: the step must suit that steep direction, and it then crawls along the
            bedrooms one. With both features on a similar scale the bowl is nearly round, and one step size suits both.
            A larger step only blows up sooner; more steps pay the same slow price.
          </>
        }
      />

      <h2>Making it work</h2>
      <ul>
        <li>
          <strong>Scale the features.</strong> Subtract each feature’s mean and divide by its spread, so the bowl is
          close to round and one step size suits every weight.
        </li>
        <li>
          <strong>Try step sizes on a log scale.</strong> 0.001, 0.01, 0.1, 1: keep the largest at which the loss falls
          steadily. A loss that climbs, or turns into NaN, means the step is past 2/L.
        </li>
        <li>
          <strong>Stop when progress stalls.</strong> When the gradient is tiny, or the loss has fallen by less than a
          set tolerance over many steps, more steps buy little.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question={`A bowl-shaped loss has curvature ${CHECK_L}: its slope grows by ${CHECK_L} for each unit you move out. Which is the largest of these step sizes that still settles at the bottom?`}
        options={[{ label: '0.01' }, { label: '0.04', right: true }, { label: '0.06' }, { label: '0.1' }]}
        reveal={
          <>
            0.04. The limit is 2/{CHECK_L} = {largestStep(CHECK_L)}. At 0.04 each step multiplies the distance by 1 −
            0.04 × {CHECK_L} = {signed(factor(0.04, CHECK_L))}: it bounces, but closes in. At 0.06 the factor is{' '}
            {signed(factor(0.06, CHECK_L))}, and it climbs out. 0.01 settles too, by {signed(factor(0.01, CHECK_L))}{' '}
            a step from one side: just as fast, but not the largest.
          </>
        }
      />
    </Article>
  )
}
