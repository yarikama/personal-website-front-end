import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import {
  CHECK,
  functionalMargin,
  gap,
  HOUSES,
  INSIDE,
  KERB_HOUSES,
  LAB_SEED,
  labPoints,
  maxMargin,
  metres,
  norm,
  perceptron,
  plain,
  ROAD_A,
  ROAD_B,
  ROAD_C,
  ROADS,
  width,
  WITH_INSIDE,
} from './model'
import Plain, { type Show } from './Plain'
import StreetLab from './StreetLab'

const STEPS: Show[] = ['villages', 'roads', 'A', 'B', 'C', 'knock', 'named']

// Worked out once: the lab's first points, the widest street through them,
// and the line the perceptron stops at
const LAB = labPoints(LAB_SEED)
const LAB_WIDTH = width(maxMargin(LAB)!)
const LAB_PERCEPTRON = 2 * gap(perceptron(LAB)!, LAB)

export default function MaxMargin() {
  return (
    <Article
      kicker="Machine learning · Linear classifiers"
      title="Maximum margin"
      promise="Many straight lines can split two classes without a single mistake. Which one should you trust with points you haven’t seen, and which training points decide it?"
      takeaway={
        <>
          Of all the lines that separate two classes, the hard-margin SVM takes the one with the widest empty street,
          2/‖w‖ wide, by making ‖w‖ as small as it can while every point keeps y(w·x + b) ≥ 1. Only the points on the
          street’s edges, the <em>support vectors</em>, decide where it goes.
        </>
      }
      sources={[
        {
          title: 'COMP 642: Machine Learning',
          by: 'Vivek Boominathan, Rice University, Spring 2026',
          part: 'Lecture notes, week 4-2: support vector machines, the perceptron and hard-margin SVMs',
        },
        {
          title: 'The Elements of Statistical Learning',
          by: 'Trevor Hastie, Robert Tibshirani and Jerome Friedman, 2nd edition, 2009',
          part: 'Section 4.5.2, “Optimal Separating Hyperplanes”',
          url: 'https://hastie.su.domains/ElemStatLearn/',
        },
        {
          title: 'Understanding Machine Learning: From Theory to Algorithms',
          by: 'Shai Shalev-Shwartz and Shai Ben-David, Cambridge University Press, 2014',
          part: 'Section 15.1, “Margin and Hard-SVM”',
          url: 'https://www.cs.huji.ac.il/~shais/UnderstandingMachineLearning/',
        },
        {
          title: 'scikit-learn user guide',
          by: 'scikit-learn developers',
          part: '“Support Vector Machines”: SVC and its LIBSVM solver',
          url: 'https://scikit-learn.org/stable/modules/svm.html',
        },
      ]}
    >
      <Figure caption="Two classes: sage dots and ink squares. The sage line splits them with as much room on each side as it can get. The ringed dot is the furthest sage dot from it.">
        <Plain show="guess" />
      </Figure>

      <Predict
        question="Delete the ringed dot and draw the line again by the same rule. What does the line do?"
        options={[
          { label: 'Shifts toward where the dot was' },
          { label: 'Tilts a little' },
          { label: 'Shifts away from it' },
          { label: 'Doesn’t move at all', right: true },
        ]}
        reveal={
          <>
            It doesn’t move. The line answers only to the {KERB_HOUSES.length} points nearest to it; every other point
            could be deleted, or pushed further back, and it would stay exactly where it is. A{' '}
            <Link to="/learnings/least-squares">least-squares</Link> line is the opposite: every point pulls on it.
          </>
        }
      />

      <h2>A road between two villages</h2>

      <Steps
        say={[
          <>Two villages face each other across a plain, sage houses to the east and ink houses to the west.</>,
          <>The council wants one straight road between them, and many straight roads keep every house on its own village’s side.</>,
          <>
            Widen road A evenly on both sides until an edge touches a house: it stops at {metres(width(ROAD_A))},
            because it passes {metres(gap(ROAD_A, HOUSES))} from a sage house.
          </>,
          <>Road B has a better angle but sits too far east, so it stops at {metres(width(ROAD_B))}.</>,
          <>
            Road C is centred and tilted just right and reaches {metres(width(ROAD_C))}: no straight road between the
            villages has more room.
          </>,
          <>Only three houses touch C’s edges; knock down any other house and C doesn’t move a metre.</>,
          <>
            The houses are training points, the villages two classes, C’s centre line the boundary w·x + b = 0, its edges
            w·x + b = ±1, and the three houses on them the <strong>support vectors</strong>: road C is the{' '}
            <strong>hard-margin support vector machine</strong>.
          </>,
        ]}
      >
        {(step) => <Plain key={step} show={STEPS[step]} />}
      </Steps>

      <p>
        Why insist on the widest road? Each house is an example you trained on, and the examples you haven’t seen yet
        will land near the old ones. Road A passes {metres(gap(ROAD_A, HOUSES))} from a sage house, so a new sage house
        built {metres(gap(ROAD_A, HOUSES) + 1)} from it, toward the road, ends up on the ink side. Road C keeps{' '}
        {metres(gap(ROAD_C, HOUSES))} of empty ground on each side, so a new house has to stray more than twice as far
        before C gets it wrong. The <Link to="/learnings/perceptron">perceptron</Link> stops at the first road with no
        house on the wrong side, which could be A as easily as C; the widest street is one answer you can name.
      </p>

      <h2>The one line of math</h2>
      <p>
        In words: a point’s distance from the line is |w·x + b| divided by the length of w. Scaling w and b together
        leaves the line where it is, so choose the scale at which the nearest points give exactly +1 and −1. Each edge
        is then 1/‖w‖ from the centre, and the street is 2/‖w‖ wide. A wider street means a shorter w, so the widest
        street is: make ‖w‖² as small as possible while every point keeps y(w·x + b) ≥ 1, where y is +1 for one class
        and −1 for the other. The three roads, each scaled that way:
      </p>
      <Numbers
        items={ROADS.map((road) => ({
          label: `Road ${road.name}`,
          value: metres(width(road.line)),
          note: `‖w‖ = ${plain(norm(road.line), 3)}`,
        }))}
      />
      <Clip
        src="max-margin/street-width"
        label="The distance from a point to the line is the absolute value of w dot x plus b, over the length of w. Scale w and b so the nearest points give plus 1 and minus 1: the street's edges are w dot x plus b equals plus 1 and minus 1, and its width is 2 over the length of w. The widest street is the smallest w: minimise one half of the length of w squared, with y i times w dot x i plus b at least 1 for every point. Road C: w is 0.08, 0.06, its length 0.1, and the width 2 over 0.1, 20 metres."
        caption="Fix the scale by the nearest points, and the street’s width is 2/‖w‖. Widening the street and shrinking w are the same job."
      />
      <p>
        That job is a <strong>quadratic program</strong>: a bowl-shaped cost with straight-line limits, so it has one
        best answer and no false bottoms (why that holds is <Link to="/learnings/convexity">convexity</Link>), and
        standard solvers find it exactly. It also explains the guess. A point outside the street has room to spare: its
        limit is not pressing on anything, so deleting it or pushing it back changes nothing. Only the points on the
        edges press, and the answer can be written from them alone, which is where{' '}
        <Link to="/learnings/kernel-trick">kernels</Link> start.
      </p>

      <h2>Try it</h2>
      <Figure caption="Drag any dot or square, or tab to one and use the arrow keys. The sage band is the widest street, the ringed marks are the points it rests on, and the dashed ink line is where the perceptron stopped on the same points. A point that isn’t ringed can go anywhere outside the band without moving it; drag one into the band and the street gives way, across the line and there is no street at all.">
        <StreetLab />
      </Figure>
      <p>
        The perceptron’s line separates the points too, but nothing tells it to keep its distance: on the first drawing it
        passes so close that its street would be {metres(LAB_PERCEPTRON)} wide, against {metres(LAB_WIDTH)} for the
        widest.
      </p>

      <Predict
        kicker="Quick check"
        question={`A new sage house is built at (${INSIDE.x}, ${INSIDE.y}), inside road C’s street but on the sage side of its centre line. The council finds the widest road again. What happens?`}
        options={[
          { label: 'Nothing: the house is on its own side' },
          { label: 'The road narrows and shifts', right: true },
          { label: 'The road gets wider' },
          { label: 'No straight road works now' },
        ]}
        reveal={
          <>
            It narrows, to {metres(width(WITH_INSIDE))}, and tilts so the new house sits on its edge. Being on the right
            side is not enough: every point must stand at least on its edge, y(w·x + b) ≥ 1, and this house scores{' '}
            {plain(functionalMargin(ROAD_C, INSIDE))}. A road still exists, because the villages can still be split by a
            straight line.
          </>
        }
      />

      <h2>Using it well</h2>
      <ul>
        <li>
          <strong>Put features on one scale first.</strong> The street is measured in the units of the axes, so a
          feature in metres beside one in kilometres decides the widest street by units alone. Standardise each feature
          before fitting.
        </li>
        <li>
          <strong>Look at the support vectors.</strong> They are the borderline cases, and the line answers to nothing
          else, so one mislabelled point on an edge moves the whole line. They are the first examples to check by hand.
        </li>
        <li>
          <strong>Don’t demand a hard margin from messy data.</strong> One point on the wrong side and there is no
          solution at all, and real classes usually overlap. A{' '}
          <Link to="/learnings/soft-margin">soft margin</Link> lets a few points into the street at a price, and{' '}
          <Link to="/learnings/kernel-trick">kernels</Link> bend the boundary when no straight one fits.
        </li>
        <li>
          <strong>Use a solver.</strong> Libraries solve the quadratic program for you; scikit-learn’s SVC with a
          linear kernel runs LIBSVM, and a very large soft-margin penalty makes it behave as a hard margin.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="Three points: one of class −1 at (0, 0), and two of class +1 at (4, 0) and (6, 3). What is ‖w‖ for the hard-margin SVM?"
        options={[{ label: '0.25' }, { label: '0.5', right: true }, { label: '2' }, { label: '4' }]}
        reveal={
          <>
            {plain(norm(CHECK))}. The closest pair across the classes is (0, 0) and (4, 0), so the widest street runs
            halfway between them along x = 2 and is {plain(width(CHECK))} wide; (6, 3) stands further back and has no
            say. The width is 2/‖w‖, so ‖w‖ = 2/{plain(width(CHECK))} = {plain(norm(CHECK))}: w = (0.5, 0) and b = −1 put
            (0, 0) at −1 and (4, 0) at +1. Answer 2 is the margin on each side, and 4 the whole width.
          </>
        }
      />
    </Article>
  )
}
