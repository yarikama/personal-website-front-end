import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Button, Choice, Controls, Figure, Numbers, Slider } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Components from './Components'
import Lab from './Lab'
import {
  ALONG,
  BODY_COMPONENTS,
  CHECK_VALUES,
  cloud,
  covariance,
  eigen2,
  END,
  explained,
  FRONT,
  LOAF_TOTAL,
  loafKept,
  MEASURES,
  PEOPLE,
  SCALES,
  WORKED,
  type Scale,
} from './model'
import Shadows, { type Show } from './Shadows'

const one = (value: number) => value.toFixed(1)
const pct = (share: number) => `${Math.round(100 * share)}%`

// What the story's figure shows at each step
const STEPS: Show[] = ['scene', 'front', 'end', 'round', 'missed', 'named']

// The numbers the story tells, from its loaf
const FRONT_SPREAD = one(loafKept(FRONT))
const END_SPREAD = one(loafKept(END))
const BEST_SPREAD = one(loafKept(ALONG))
const BODY_SHARES = explained(BODY_COMPONENTS.Standardised.values)
const CHECK_TOTAL = CHECK_VALUES.reduce((a, b) => a + b, 0)
const CHECK_SHARES = explained(CHECK_VALUES)

export default function Pca() {
  const [stretch, setStretch] = useState(3)
  const [tilt, setTilt] = useState(30)
  const [angle, setAngle] = useState(0)
  const [scale, setScale] = useState<Scale>('Standardised')
  const [keep, setKeep] = useState(2)
  const points = cloud(stretch, tilt)
  const best = eigen2(covariance(points)).angle

  return (
    <Article
      kicker="Machine learning · Unsupervised learning"
      title="The longest shadow"
      promise="When every data point carries more numbers than you can keep, which few numbers lose the least?"
      takeaway={
        <>
          Centre the data and turn a line until the points’ shadows on it spread the most: that direction, the top
          eigenvector of the covariance, is the first <em>principal component</em>, and keeping the top few loses only
          the variance along the rest.
        </>
      }
      sources={[
        {
          title: 'COMP 642: Machine Learning',
          by: 'Vivek Boominathan, Rice University, Spring 2026',
          part: 'Lecture notes, week 9, §13 “Principal component analysis”',
        },
        {
          title: 'The Elements of Statistical Learning',
          by: 'Trevor Hastie, Robert Tibshirani and Jerome Friedman, 2nd edition, 2009',
          part: 'Chapter 14, §14.5.1 “Principal Components”',
          url: 'https://hastie.su.domains/ElemStatLearn/',
        },
      ]}
    >
      <Predict
        question="Points lie in a long, thin cloud tilted at 45°. You may store only one number per point. Storing each point’s x coordinate keeps half of how the points differ. How much can the best single number keep?"
        options={[
          { label: 'Also half: one number is one number' },
          { label: 'About 60%' },
          { label: 'About 90%', right: true },
          { label: 'All of it' },
        ]}
        reveal={
          <>
            About 90%. The x axis meets the cloud at a slant, so it sees only part of its length. A number measured
            along the cloud itself sees nearly all of it; only the cloud’s thin width is lost.
          </>
        }
      />

      <h2>A loaf and a lamp</h2>

      <Steps
        readable
        say={[
          <>
            You want to show a friend a long loaf dotted with seeds, but all you can send is its shadow: a lamp on one
            side, a card on the other.
          </>,
          <>Light it from the front, and the seeds’ shadows spread out across the card: a spread of {FRONT_SPREAD}.</>,
          <>Walk round to the end of the loaf, and the shadows pile into a blob: a spread of just {END_SPREAD}.</>,
          <>Keep walking: the spread rises and falls, and it peaks at {BEST_SPREAD} when the card runs along the loaf.</>,
          <>
            A shadow misses how far each seed sits off the line through the middle, and at every angle the spread kept
            and the spread missed add up to the same {LOAF_TOTAL}.
          </>,
          <>
            That is <strong>principal component analysis</strong>: each seed is a data point x, the card’s direction a
            unit vector u, the shadows its projections, their spread the variance along u, and the longest shadow’s
            direction the first principal component.
          </>,
        ]}
      >
        {(step) => <Shadows key={step} show={STEPS[step]} />}
      </Steps>

      <p>
        The best number was neither x nor y but the loaf’s own length. Data with many features is often like that:
        height, arm span and leg length rise and fall together, so most of how people differ lies along one diagonal
        direction through all three.
      </p>

      <h2>The one line of math</h2>
      <p>
        Spread here means the average squared distance of the shadows from the middle, their <strong>variance</strong>,
        so first move the points so their mean sits at the origin. Then collect how much each feature varies, and how
        much each pair varies together, into the <strong>covariance matrix</strong> Σ: for the loaf, 5 along x, 5
        along y, and 4 for how x and y rise together. In words: the variance along a unit direction u is u
        sandwiched around Σ, uᵀΣu. The u that makes it largest is Σ’s top <strong>eigenvector</strong>, the direction
        Σ stretches without turning, and the largest variance is its <strong>eigenvalue</strong>.
      </p>
      <Numbers
        items={WORKED.map((w) => ({
          label: `u at ${w.angle}°`,
          value: one(w.kept),
          note: `kept · ${one(w.missed)} missed`,
        }))}
      />
      <Clip
        src="pca/variance-along"
        label="The spread of the shadows along u, one over n times the sum of x i transpose u squared, equals u transpose sigma u. With sigma equal to 5, 4, 4, 5 and u equal to cos theta, sin theta, it multiplies out to 5 plus 4 sine 2 theta. It is largest at 45 degrees, where sigma u equals 9 u: the top eigenvector, eigenvalue 9. Kept, 5 plus 4 sine 2 theta, plus missed, 5 minus 4 sine 2 theta, is always 10; at 45 degrees, 9 plus 1."
        caption="Multiply out uᵀΣu for the loaf and it is 5 + 4 sin 2θ: at its top, Σ only stretches u. What is missed rises exactly as what is kept falls."
      />
      <p>
        The second principal component is the best direction at right angles to the first, the third the best at
        right angles to both, and so on: they are the eigenvectors of Σ in order of eigenvalue, and each eigenvalue is
        the variance its direction carries. Keep the top k and describe each point by its k shadows. No other k
        directions do better: the squared error of the rebuilt points is the sum of the eigenvalues you dropped.
      </p>

      <h2>Turn it yourself</h2>
      <p>Stretch and tilt a cloud of {points.length} points, then turn the solid line by dragging on the drawing.</p>
      <Figure
        caption={
          <>
            Each point’s shadow, in sage, sits where its gap meets the solid line. Kept and missed always add to the
            total, and kept peaks on the dashed first principal component. That comes from the points, not the tilt
            slider, so the two can differ by a few degrees: a sample is never perfectly shaped.
          </>
        }
      >
        <Lab points={points} angle={angle} onAngle={setAngle} />
        <Controls>
          <Slider label="Stretch" value={stretch} min={1} max={3.5} step={0.1} onChange={setStretch} format={(s) => `${s.toFixed(1)}×`} />
          <Slider label="Tilt" value={tilt} min={0} max={179} onChange={setTilt} format={(t) => `${t}°`} />
          <Slider label="Your line" value={angle} min={0} max={179} onChange={setAngle} format={(a) => `${a}°`} />
          <Button onClick={() => setAngle(Math.round(best) % 180)}>Snap to PC 1</Button>
        </Controls>
      </Figure>

      <p>
        Past two features you cannot draw the cloud, but you can draw how much each component carries. Here are six
        measurements of {PEOPLE} made-up people ({MEASURES.join(', ').toLowerCase()}), driven underneath by two things:
        overall size and build.
      </p>
      <Figure
        caption={
          <>
            Standardised, two components keep {pct(BODY_SHARES[1].cumulative)}: the first weighs all six together
            (size), the second sets weight and waist against the rest (build). Leave the units as measured, with
            weight logged in grams, and the first component is weight alone, simply because its numbers are biggest.
          </>
        }
      >
        <Components values={BODY_COMPONENTS[scale].values} keep={keep} error={scale === 'Standardised'} />
        <Controls>
          <Slider label="Components kept" value={keep} min={1} max={MEASURES.length} onChange={setKeep} />
          <Choice label="Units" options={SCALES} value={scale} onChange={setScale} />
        </Controls>
      </Figure>

      <Predict
        kicker="Quick check"
        question="In the lab, set the stretch to 1×, so the cloud is round. Which direction does PCA pick, and what is it worth?"
        options={[
          { label: 'The old tilt, as before' },
          { label: 'The x axis, by default' },
          { label: 'Some direction, worth about half', right: true },
          { label: 'Whichever has most points' },
        ]}
        reveal={
          <>
            Some direction, set by the sample’s small accidents, and it keeps only about half of the variance, as does
            every other. When the eigenvalues are nearly equal there is no long direction to find, and the components
            mean little.
          </>
        }
      />

      <h2>Using it well</h2>
      <ul>
        <li>
          <strong>Centre first, and usually standardise.</strong> Uncentred, the first component points toward the
          mean instead of along the spread. In mixed units, the feature with the biggest numbers wins, as the grams
          did.
        </li>
        <li>
          <strong>Choose k by the variance kept.</strong> Add components until the running total reaches what you
          need, often 90 to 95%, or stop where the bars flatten out.
        </li>
        <li>
          <strong>It finds straight lines only.</strong> Points on a ring have no single long direction, so PCA keeps
          both coordinates. And it never looks at labels: a thin direction can still be the one that matters.
        </li>
      </ul>
      <p>
        <Link to="/learnings/k-means">k-means</Link> sums data up by a few points; PCA sums it up by a few directions.
        Keeping the top few directions of a whole table is also how{' '}
        <Link to="/learnings/matrix-completion">matrix completion</Link> fills in the ratings nobody gave.
      </p>

      <Predict
        kicker="Check yourself"
        question={`A dataset has four features, and its covariance’s eigenvalues are ${CHECK_VALUES.join(', ')}. How many components do you need to keep at least 90% of the variance?`}
        options={[{ label: '1' }, { label: '2' }, { label: '3', right: true }, { label: 'All 4' }]}
        reveal={
          <>
            Three. The total is {CHECK_TOTAL}, and the running shares are{' '}
            {CHECK_SHARES.map((s) => pct(s.cumulative)).join(', ')}: two stop short at {pct(CHECK_SHARES[1].cumulative)},
            three reach {pct(CHECK_SHARES[2].cumulative)}. The error left is the dropped eigenvalue, {CHECK_VALUES[3]}.
          </>
        }
      />
    </Article>
  )
}
