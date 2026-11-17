import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Choice, Controls, Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import KernelLab from './KernelLab'
import {
  BEST_STRAIGHT,
  COSTS,
  CUT,
  DATASETS,
  KERNELS,
  LAB_C,
  labFit,
  SIGMAS,
  SPAM_PAIRS,
  SPAM_WORDS,
  type Dataset,
  type KernelName,
  type Sigma,
} from './model'
import Tablecloth, { type Show } from './Tablecloth'

const STEPS: Show[] = ['flat', 'cuts', 'lift', 'knife', 'above', 'named']

const pct = (share: number) => `${Math.round(100 * share)}%`
const SUPERSCRIPT = '⁰¹²³⁴⁵⁶⁷⁸⁹'
// 42634215112710 → 4.3 × 10¹³; smaller counts with thousands separators
function count(n: number) {
  if (n < 1e7) return n.toLocaleString('en-US')
  const power = Math.floor(Math.log10(n))
  const digits = [...String(power)].map((d) => SUPERSCRIPT[Number(d)]).join('')
  return `${(n / 10 ** power).toFixed(1)} × 10${digits}`
}

// The lab's numbers the page quotes
const TINY = labFit('Rings', 'Gaussian', 0.05)
const WIDE = labFit('Rings', 'Gaussian', 3)
const JUST = labFit('Rings', 'Gaussian', 0.5)
const HUGE = COSTS[2]
const PAIRS_MILLIONS = Math.round(SPAM_PAIRS / 1e6)
const WORDS = SPAM_WORDS.toLocaleString('en-US')

export default function KernelTrick() {
  const [dataset, setDataset] = useState<Dataset>('Rings')
  const [kernel, setKernel] = useState<KernelName>('Straight')
  const [sigma, setSigma] = useState<Sigma>(0.5)

  return (
    <Article
      kicker="Machine learning · Linear classifiers"
      title="The kernel trick"
      promise="A classifier that only draws straight lines can’t split a ring from the blob inside it. How can it learn a curved boundary without paying for millions of extra features?"
      takeaway={
        <>
          Methods like the SVM touch the data only through inner products, so a <em>kernel</em> k(x, x′) that gives
          φ(x)·φ(x′) directly lets them draw a straight boundary in a huge feature space, a curved one in yours, for the
          price of comparing points.
        </>
      }
      sources={[
        {
          title: 'COMP 642: Machine Learning',
          by: 'Vivek Boominathan, Rice University, Spring 2026',
          part: 'Week 6 lecture notes, SVMs and kernels: linear estimators, the representer theorem, nonlinear features and kernels, the SVM with a Gaussian kernel; Week 4-2, the SVM’s dual',
        },
        {
          title: 'The Elements of Statistical Learning',
          by: 'Trevor Hastie, Robert Tibshirani and Jerome Friedman, 2nd edition, 2009',
          part: 'Section 5.8, Regularization and Reproducing Kernel Hilbert Spaces; Section 12.3, Support Vector Machines and Kernels',
          url: 'https://hastie.su.domains/ElemStatLearn/',
        },
        {
          title: 'Understanding Machine Learning: From Theory to Algorithms',
          by: 'Shai Shalev-Shwartz and Shai Ben-David, Cambridge University Press, 2014',
          part: 'Chapter 16, Kernel Methods: the representer theorem',
          url: 'https://www.cs.huji.ac.il/~shais/UnderstandingMachineLearning/',
        },
      ]}
    >
      <Predict
        question="Grapes sit in the middle of a tablecloth with a ring of cherries around them. You may give every fruit one extra number, then split them with a single flat cut through the bigger space. Which number works?"
        options={[
          { label: 'None: nothing flat can cut a ring from its middle' },
          { label: 'x₁ + x₂, its two coordinates added' },
          { label: 'x₁² + x₂², its squared distance from the centre', right: true },
          { label: '10 × x₁, one coordinate stretched' },
        ]}
        reveal={
          <>
            Its squared distance from the centre. Every grape is near the centre, so its new number is small, and every
            cherry’s is large: a flat cut at one value in between splits them, and on the cloth that cut is a circle. A
            sum or a stretched coordinate is still a straight line in disguise.
          </>
        }
      />

      <h2>Lift the tablecloth</h2>

      <Steps
        readable
        say={[
          <>Grapes sit in the middle of a round tablecloth, with a ring of cherries around them.</>,
          <>
            Split them with one straight cut: wherever it goes, it leaves at least {BEST_STRAIGHT} fruits on the wrong
            side, no better than calling them all cherries.
          </>,
          <>Now pinch the cloth in the middle and lift: each fruit rises by how near the middle it lies.</>,
          <>A flat knife, held level, slides between them: grapes above, cherries below.</>,
          <>Lay the cloth back down, and where the knife met it is a circle round the grapes.</>,
          <>
            The lift is a <strong>feature map</strong> φ that gives each point a new number from x₁² + x₂², and a flat
            cut in the bigger space is a curve on the table: the circle x₁² + x₂² = {CUT.toFixed(2)}.
          </>,
        ]}
      >
        {(step) => <Tablecloth key={step} show={STEPS[step]} />}
      </Steps>

      <p>
        One extra number was enough because we knew the shape. Without knowing it, you add every product of the inputs
        up to some degree, and the count explodes: {HUGE.inputs} inputs have {count(HUGE.features)} products of degree{' '}
        {HUGE.degree}. Nobody builds those.
      </p>

      <h2>Only inner products</h2>
      <p>
        The way out is that these methods never need the features themselves. For{' '}
        <Link to="/learnings/least-squares">least squares</Link> with a{' '}
        <Link to="/learnings/ridge-regression">ridge penalty</Link>,{' '}
        <Link to="/learnings/logistic-regression">logistic regression</Link> and the SVM, the best weights are a weighted
        sum of the training points’ own features, w = Σ αᵢ φ(xᵢ): the <strong>representer theorem</strong>. Any part
        of w at right angles to every training point changes none of their scores and only makes w
        longer, which the penalty charges for, so the best w has none. A point’s score w·φ(x) is then Σ αᵢ φ(xᵢ)·φ(x),
        and training needs only the same inner products between training points. The{' '}
        <Link to="/learnings/max-margin">widest street’s</Link> dual problem says it too: the data enter it only as dot
        products.
      </p>

      <h2>The one line of math</h2>
      <p>
        In words: a new point’s score is a vote of the training points, each counted with its weight αᵢ and with how
        alike it is to the new point.
      </p>
      <p className="text-center font-serif text-2xl text-ink">f(x) = Σᵢ αᵢ k(xᵢ, x), where k(x, x′) = φ(x)·φ(x′)</p>
      <p>
        A <strong>kernel</strong> k computes that inner product straight from x and x′, without building φ. The simplest
        is (x·x′)²: one dot product, squared, and it equals the inner product of every degree-2 product.
      </p>
      <Clip
        src="kernel-trick/square-expand"
        label="The square of x dot x prime, opened up: x1 squared times x1 prime squared, plus root 2 x1 x2 times root 2 x1 prime x2 prime, plus x2 squared times x2 prime squared. That is the inner product of phi of x, the vector x1 squared, root 2 x1 x2, x2 squared, with phi of x prime. With x = (1, 2) and x prime = (3, 1): the kernel gives (1 times 3 plus 2 times 1) squared = 25, and the features give 9 + 12 + 4 = 25."
        caption="Open the square and each term splits into a piece of x times the same piece of x′. Both routes give 25; the kernel took two multiplications."
      />
      <p>The same holds for (x·x′)ᵈ and every product of degree d. Building the features, against one dot product:</p>
      <Numbers
        items={COSTS.map((c) => ({
          label: `${c.inputs} inputs, degree ${c.degree}`,
          value: count(c.features),
          note: `features, or ${c.inputs} products`,
        }))}
      />

      <h2>The Gaussian kernel</h2>
      <p>
        The usual choice is the Gaussian, k(x, x′) = exp(−‖x − x′‖² / 2σ²). It reads as a similarity: 1
        for a point with itself, falling towards 0 as points move apart, and σ is the distance over which it fades.
        Write the exponential as a series and there are products of every degree inside it, so its φ is infinite, yet k
        costs one distance. Not every similarity will do: k must be an inner product somewhere, which holds exactly when
        every table of its values is positive semidefinite (Mercer’s condition). Squared distance fails.
      </p>

      <h2>Try it</h2>
      <p>A kernel SVM, trained only on kernel values. Pick the data, the kernel and, for the Gaussian, σ.</p>
      <Figure
        caption={
          <>
            Shaded: where it says sage. The straight kernel can’t bend; degree 2 draws ovals and other curves of
            degree 2, enough for the rings but not the moons; the Gaussian bends to anything. On the rings, σ = {SIGMAS[0]} gets every training point
            but {pct(TINY.test)} of new ones, σ = {SIGMAS[3]} gets {pct(WIDE.test)}, and σ = {SIGMAS[2]} gets{' '}
            {pct(JUST.test)}. Each kernel carries a + 1, a constant feature; C = {LAB_C}.
          </>
        }
      >
        <KernelLab dataset={dataset} kernel={kernel} sigma={sigma} />
        <Controls>
          <Choice label="Data" options={DATASETS} value={dataset} onChange={setDataset} />
          <Choice label="Kernel" options={KERNELS} value={kernel} onChange={setKernel} />
          {kernel === 'Gaussian' && <Choice label="σ" options={SIGMAS} value={sigma} onChange={setSigma} />}
        </Controls>
      </Figure>

      <Predict
        kicker="Quick check"
        question={`A Gaussian-kernel classifier gets ${pct(TINY.train)} of its training points right but ${pct(TINY.test)} of new ones, and its region is a scatter of small islands. What should you change?`}
        options={[
          { label: 'Shrink σ so it fits more tightly' },
          { label: 'Raise σ so each point’s vote reaches further', right: true },
          { label: 'Switch to the straight kernel' },
          { label: 'Add more training rounds' },
        ]}
        reveal={
          <>
            Raise σ. With σ tiny, a training point is alike only to points almost on top of it, so the classifier copies
            its nearest training point, noise and all: an island round each. A wider σ lets neighbours vote together;
            too wide and the boundary flattens towards a straight line. It is the{' '}
            <Link to="/learnings/bias-variance">bias–variance</Link> dial. A straight kernel can’t draw the ring at all.
          </>
        }
      />

      <h2>Making it work</h2>
      <ul>
        <li>
          <strong>Choose σ and C on held-out data.</strong> Fit on part, score on the rest, over a grid such as 0.01,
          0.1, 1, 10 for each, where C is the <Link to="/learnings/soft-margin">soft margin’s</Link> price on slack.
          Scale the inputs first, so one unit doesn’t swamp the distance.
        </li>
        <li>
          <strong>Count the cost in points.</strong> Training fills an n × n table of kernel values: 10,000 points make
          100 million entries, a million points a trillion. Kernels suit thousands of points; at millions, use a
          straight model on chosen features or an approximation.
        </li>
        <li>
          <strong>Watch how many points it leans on.</strong> A prediction sums over the points with αᵢ ≠ 0, for an SVM
          only its support vectors. A tiny σ leans on nearly all of them.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question={`A spam filter reads ${WORDS} word counts per email, and you want every pair of words as a feature, about ${PAIRS_MILLIONS} million. With the kernel (x·x′)², what does comparing a new email with one training email cost?`}
        options={[
          { label: `About ${PAIRS_MILLIONS} million multiplications, one per pair` },
          { label: `About ${WORDS} multiplications, then one squaring`, right: true },
          { label: `About ${2 * PAIRS_MILLIONS} million, each pair counted both ways` },
          { label: 'Nothing: it was all worked out in training' },
        ]}
        reveal={
          <>
            One dot product of the two count vectors, then a square: the {PAIRS_MILLIONS} million pair products are
            folded inside it. A new email has never been compared with anything, so training could not do it in advance,
            and scoring it repeats this once for every training email with a weight: the cost grows with the training
            set, not with the features.
          </>
        }
      />
    </Article>
  )
}
