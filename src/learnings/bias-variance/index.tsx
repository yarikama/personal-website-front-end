import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Choice, Controls, Figure, Numbers, Readout, Slider } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Archery from './Archery'
import Errors from './Errors'
import Fits from './Fits'
import {
  aim,
  bestDegree,
  FLEXIBLE,
  MIDDLE,
  POINTS,
  PRECISE,
  PRECISE_TERMS,
  scatter,
  SIGMA,
  SIMPLE,
  SIZES,
  TERMS,
  two,
  WORKED,
  type Size,
} from './model'

const off = (degree: number) => two(Math.hypot(...aim(degree)))
const three = (value: number) => value.toFixed(3)

export default function BiasVariance() {
  const [line, cubic, wild] = WORKED
  const best = bestDegree(TERMS[10])
  const preciseBest = bestDegree(PRECISE_TERMS)

  const [degree, setDegree] = useState<number>(MIDDLE)
  const [size, setSize] = useState<Size>(10)
  const terms = TERMS[size]
  const now = terms[degree]

  return (
    <Article
      kicker="Machine learning · Fitting a model"
      title="Bias and variance"
      promise="The more flexible a model, the better it fits the data you have. Why doesn’t it keep getting better on the data you don’t have yet?"
      takeaway={
        <>
          Error on new points is bias² plus variance plus noise. More flexibility trades the first for the second, so
          choose it where their <em>sum</em> is lowest, measured on data the fit never saw.
        </>
      }
      sources={[
        {
          title: 'COMP 642: Machine Learning',
          by: 'Vivek Boominathan, Rice University, Spring 2026',
          part: 'Lecture notes, Week 2, Regression: “Bias-Variance tradeoff”',
        },
        {
          title: 'The Elements of Statistical Learning',
          by: 'Trevor Hastie, Robert Tibshirani and Jerome Friedman, 2nd edition, 2009',
          part: '§2.9 “Model Selection and the Bias–Variance Tradeoff”, §7.3 “The Bias–Variance Decomposition” and §7.10 “Cross-Validation”',
          url: 'https://hastie.su.domains/ElemStatLearn/',
        },
      ]}
    >
      <Predict
        question={
          <>
            You have {POINTS} noisy points from a smooth curve, and fit three polynomials to them by{' '}
            <Link to="/learnings/least-squares">least squares</Link>: a straight line, a cubic (degree 3), and degree 9,
            which passes through every point. Which predicts new points from the same curve best?
          </>
        }
        options={[{ label: 'The line' }, { label: 'The cubic', right: true }, { label: 'Degree 9' }, { label: 'All about the same' }]}
        reveal={
          <>
            The cubic. Over many samples its squared error on new points averages {two(cubic.test)}, against{' '}
            {two(line.test)} for the line and {two(wild.test)} for degree 9, which has no error at all on its own points.
            An archery range shows why.
          </>
        }
      />

      <h2>Twenty archers</h2>

      <Steps
        say={[
          <>Twenty archers each shoot one arrow at the same target, each from their own spot on a gusty field, all with stiff, heavy bows.</>,
          <>
            The arrows land close together, but up and to the left of the bull’s-eye every time: the bow itself pulls
            there, wherever its archer stands.
          </>,
          <>Swap in light, twitchy bows: now the arrows centre on the bull’s-eye, but each flies wherever its own gust sends it.</>,
          <>A bow in between lands close to the middle, and closer together than the twitchy one.</>,
          <>Even a perfect shot misses a little, because the target itself sways in the wind, and no bow can fix that.</>,
          <>
            Each archer is a sample of {POINTS} noisy points from one curve, the stiff bow a straight line fitted to it,
            and each arrow lands at how far its line misses the curve at two spots.
          </>,
          <>The twitchy bow is the degree-9 curve: right on average, but each one swings far off between its points.</>,
        ]}
      >
        {(step) =>
          step === 0 ? (
            <Archery key="stiff" degree={SIMPLE} show="shots" />
          ) : step === 1 ? (
            <Archery key="stiff-aim" degree={SIMPLE} show="aim" />
          ) : step === 2 ? (
            <Archery key="twitchy" degree={FLEXIBLE} show="scatter" />
          ) : step === 3 ? (
            <Archery key="between" degree={MIDDLE} show="scatter" />
          ) : step === 4 ? (
            <Archery key="sway" degree={MIDDLE} show="noise" />
          ) : step === 5 ? (
            <Archery key="line" degree={SIMPLE} show="curves" />
          ) : (
            <Archery key="nine" degree={FLEXIBLE} show="curves" />
          )
        }
      </Steps>

      <p>
        The stiff bow’s arrows land {off(SIMPLE)} from the bull’s-eye on average and scatter only {two(scatter(SIMPLE))}{' '}
        around their own centre; the twitchy bow’s land {off(FLEXIBLE)} off on average and scatter {two(scatter(FLEXIBLE))}.
        A straight line can’t bend to follow the curve, whatever sample it gets. Degree 9 bends to follow every point,
        noise included, so each new sample drags it somewhere new.
      </p>

      <h2>The one line of math</h2>
      <p>
        Score a model by its squared miss on a new point, averaged over new points and over every sample it could have
        been fitted to. That score splits exactly into three parts: how far the <em>average</em> fit sits from the true
        curve, squared; how far each fit strays from that average, squared and averaged; and the noise in the new point,
        which no model can predict. The first is the <strong>bias²</strong>, the second the <strong>variance</strong>,
        and the third the <strong>irreducible error</strong>. Here, the noise has a spread of {SIGMA}, so it costs{' '}
        {two(SIGMA ** 2)} at every degree:
      </p>
      <Numbers
        items={WORKED.map((w) => ({
          label: `Degree ${w.degree}`,
          value: two(w.test),
          note: `${two(w.bias2)} + ${two(w.variance)} + ${two(w.noise)}`,
        }))}
      />
      <p>
        The line loses to bias, degree 9 to variance, and the cubic keeps both small. Average degree 9’s fits and you get
        the curve almost exactly; it is the single fit you actually have that is far off.
      </p>
      <Clip
        src="bias-variance/three-parts"
        label="The average squared miss on a new point, E of y minus f-hat squared, written in words and then in symbols: it equals the average fit f-bar minus the truth f, squared, plus the average of f-hat minus f-bar squared, plus sigma squared. Braces name the three terms bias squared, variance and noise. For degree 1 the numbers are 0.33 = 0.22 + 0.02 + 0.09; for degree 9, 0.68 = 0.00 + 0.59 + 0.09."
        caption="Add and subtract the average fit inside the square, and the cross terms average to zero: what is left is the three parts, each squared on its own."
      />

      <h2>Turn the dial</h2>
      <p>
        The same twenty samples, fitted at any degree. On the left, the fits; on the right, the error at every degree,
        averaged over all possible samples, with your degree marked.
      </p>
      <Figure
        readable
        caption={
          <>
            Sage: the average fit and bias²; dashed sage: variance. Training error (dashed ink) falls at every degree, to
            zero at 9, while the error on new points (solid ink) bottoms out at degree {best} with {POINTS} points and
            climbs after it.
          </>
        }
      >
        <div className="grid items-start gap-6 sm:grid-cols-2">
          <Fits size={size} degree={degree} />
          <Errors terms={terms} degree={degree} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Readout label="New points" value={two(now.test)} accent />
          <Readout label="Bias²" value={two(now.bias2)} />
          <Readout label="Variance" value={two(now.variance)} />
          <Readout label="Training" value={two(now.train)} />
        </div>
        <Controls>
          <Slider label="Degree" value={degree} min={0} max={9} onChange={setDegree} />
          <Choice label="Points per sample" options={SIZES} value={size} onChange={setSize} />
        </Controls>
      </Figure>
      <p>
        Each extra term can only bend a fit closer to the points it was given, so training error never rises. Error on
        new points falls while the extra bends follow the curve, then rises once they follow the noise. Training error
        is no guide to that turn: at degree 9 it is perfect.
      </p>

      <Predict
        kicker="Quick check"
        question="A model makes almost no error on its training points but large errors on new ones. Which part is most likely to blame?"
        options={[{ label: 'Bias²' }, { label: 'Variance', right: true }, { label: 'Noise' }, { label: 'Too few training passes' }]}
        reveal={
          <>
            Variance. Fitting its own points that closely means it fitted their noise too, and another sample would have
            given a different fit. Large bias would show on the training points as well, and noise raises both errors
            alike.
          </>
        }
      />

      <h2>What to do about it</h2>
      <ul>
        <li>
          <strong>Choose the flexibility on data the fit never saw.</strong> Keep some points back and score each degree
          on them. Or, with k-fold cross-validation, split the data into k parts, score each part with a fit to the
          others, and average the scores.
        </li>
        <li>
          <strong>Get more data.</strong> More points pin each fit down, so the variance falls; the bias stays where the
          model’s shape puts it. Try 20 points in the figure: degree 9’s variance drops from{' '}
          {two(TERMS[10][FLEXIBLE].variance)} to {two(TERMS[20][FLEXIBLE].variance)}.
        </li>
        <li>
          <strong>Hold a flexible model back.</strong> <Link to="/learnings/ridge-regression">Ridge regression</Link>{' '}
          charges for large coefficients, giving up a little bias for much less variance.
        </li>
        <li>
          <strong>Average many fits.</strong> Fits that wobble differently cancel out, which is what random forests
          do with trees.
        </li>
      </ul>
      <p>
        The same trade-off turns up wherever something is estimated from a sample, as in reinforcement learning’s{' '}
        <Link to="/learnings/n-step-returns">n-step returns</Link> and{' '}
        <Link to="/learnings/certainty-equivalence">certainty equivalence</Link>.
      </p>

      <Predict
        kicker="Check yourself"
        question={`Same ${POINTS} points, same curve, but your instrument now measures three times as precisely: the noise’s spread is ${PRECISE} instead of ${SIGMA}. Which degree should you now pick?`}
        options={[
          { label: 'Lower, like 1' },
          { label: 'Still 3' },
          { label: `Higher, like ${preciseBest}`, right: true },
          { label: 'Any: noise is irreducible' },
        ]}
        reveal={
          <>
            Higher. Variance comes from fits chasing the noise, so it falls nine-fold with it, while the bias stays put.
            With variance cheap, degree {preciseBest}’s extra bends pay off: {three(PRECISE_TERMS[preciseBest].test)} on new
            points, against {three(PRECISE_TERMS[MIDDLE].test)} for the cubic.
          </>
        }
      />
    </Article>
  )
}
