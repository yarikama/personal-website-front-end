import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Lab from './Lab'
import { acrossSplit, final, GOOD, LAB_K, plusPlusBound, restarts, rounds, rowsSplit, STUCK, WORKED, workedRounds } from './model'
import Park from './Park'

const one = (value: number) => value.toFixed(1)
const short = (value: number) => String(Number(value.toFixed(2)))

export default function KMeans() {
  // The numbers the story tells, from its two runs
  const firstWalk = GOOD[1].cost!
  const afterMove = GOOD[2].cost!
  const goodEnd = final(GOOD)
  const stuckEnd = final(STUCK)
  // The worked example, round by round
  const worked = workedRounds()
  // The lab, a hundred runs from each start at its own k, and the best for each k
  const lab = restarts(LAB_K.start)
  const best = (k: number) => restarts(k).best

  return (
    <Article
      kicker="Machine learning · Unsupervised learning"
      title="k-means clustering"
      promise="With points but no labels, how do you sort them into groups, and why can the obvious method settle on the wrong ones?"
      takeaway={
        <>
          k-means alternates two steps, send each point to its nearest centre and move each centre to the mean of its
          points; neither can raise the objective, so it always stops, but only at a <em>local</em> optimum that
          depends on where it started.
        </>
      }
      sources={[
        {
          title: 'COMP 642: Machine Learning',
          by: 'Vivek Boominathan, Rice University, Spring 2026',
          part: 'Lecture notes, Week 8, §11 “k-means clustering” and §11.2 “k-means++”',
        },
        {
          title: 'The Elements of Statistical Learning',
          by: 'Trevor Hastie, Robert Tibshirani and Jerome Friedman, 2nd edition, 2009',
          part: 'Chapter 14, “Unsupervised Learning”, §14.3.6 “K-means”',
          url: 'https://hastie.su.domains/ElemStatLearn/',
        },
        {
          title: 'k-means++: The Advantages of Careful Seeding',
          by: 'David Arthur and Sergei Vassilvitskii, ACM-SIAM Symposium on Discrete Algorithms, 2007',
          part: 'The seeding, and Theorem 3.1, its 8(ln k + 2) bound',
          url: 'https://dl.acm.org/doi/10.5555/1283383.1283494',
        },
        {
          title: 'Least Squares Quantization in PCM',
          by: 'Stuart P. Lloyd, IEEE Transactions on Information Theory, 1982',
          part: 'Where the two alternating steps come from',
          url: 'https://doi.org/10.1109/TIT.1982.1056489',
        },
      ]}
    >
      <Predict
        question="Three clear crowds of points, three centres. Two centres start inside the same crowd; the third starts between the other two crowds. You repeat: every point joins its nearest centre, then every centre moves to the middle of its points. What happens?"
        options={[
          { label: 'They find the three crowds' },
          { label: 'They find them, but slowly' },
          { label: 'One crowd stays split, two stay merged', right: true },
          { label: 'The centres never settle' },
        ]}
        reveal={
          <>
            It gets stuck. Every point in the shared crowd is nearer to one of its two centres than to the far one, so
            they keep half each, and the third centre goes on serving both other crowds from the gap between them. No
            single step makes things better, so the repeating stops there. A park shows it.
          </>
        }
      />

      <h2>Food trucks in a park</h2>

      <Steps
        readable
        say={[
          <>Picnickers are spread over a park in three loose crowds, and you have three food trucks to park among them.</>,
          <>
            Everyone walks to the nearest truck. Score it by adding up each walk squared, so one long walk costs more
            than two short ones: {one(firstWalk)}.
          </>,
          <>Each truck then drives to the middle of the people it served, and the score drops to {one(afterMove)}.</>,
          <>
            Repeat: people switch to whichever truck is now nearer, the trucks move again, and after {rounds(GOOD)}{' '}
            rounds nobody switches. The score has fallen to {one(goodEnd)}.
          </>,
          <>
            Start over with two trucks in the left crowd. They share it, the third serves both other crowds from the
            gap between them, and nobody ever switches: {one(stuckEnd)}, {one(stuckEnd / goodEnd)} times worse.
          </>,
          <>
            That routine is <strong>k-means</strong>: the picnickers are data points, the trucks are k centres, each
            truck’s customers are a cluster, and the walking score is the objective.
          </>,
        ]}
      >
        {(step) =>
          step === 0 ? (
            <Park key="parked" trace={GOOD} from={0} to={0} pace={1000} />
          ) : step === 1 ? (
            <Park key="walk" trace={GOOD} from={0} to={1} pace={2200} />
          ) : step === 2 ? (
            <Park key="drive" trace={GOOD} from={1} to={2} pace={2200} />
          ) : step === 3 ? (
            <Park key="repeat" trace={GOOD} from={2} to={GOOD.length - 1} pace={800} />
          ) : step === 4 ? (
            <Park key="stuck" trace={STUCK} from={0} to={STUCK.length - 1} pace={1600} />
          ) : (
            <Park key="named" trace={GOOD} from={GOOD.length - 1} to={GOOD.length - 1} pace={1000} named />
          )
        }
      </Steps>

      <p>
        Nobody told the trucks where the crowds were. They only measured distances. That is what makes this{' '}
        <strong>unsupervised learning</strong>: there are points, but no labels saying which group each belongs to.
        The two-step routine is called <strong>Lloyd’s algorithm</strong>.
      </p>

      <h2>The one line of math</h2>
      <p>
        In words: for every point, take its distance to its own centre, square it, and add them all up. k-means looks
        for the k centres, and the split of points among them, that make this total smallest. With μ<sub>c(x)</sub>{' '}
        for the centre that point x is with:
      </p>
      <p className="text-center font-serif text-2xl text-ink">
        J = Σ<sub>x</sub> ‖x − μ<sub>c(x)</sub>‖²
      </p>
      <p>Each of the two steps can only lower J, or leave it where it was:</p>
      <ul>
        <li>
          <strong>Assigning</strong> lets each point pick the smallest of its k distances, so no point’s term can grow.
        </li>
        <li>
          <strong>Moving a centre to the mean</strong> is the cheapest place for it: a centre a distance d away from
          its points’ mean pays an extra d² for every one of those points.
        </li>
      </ul>
      <p>
        There are only finitely many ways to split the points into k groups, and a total that never rises cannot keep
        falling through finitely many values, so the rounds stop. Six points on a line, at 1, 3, 4, 8, 9 and 10, with
        two centres that both start on the left, at 1 and 3: assigned, J = {WORKED[1].cost}. Then:
      </p>
      <Numbers
        items={worked.map((r) => ({
          label: `Round ${r.round}`,
          value: short(r.cost),
          note: `centres ${r.centres.map(short).join(' and ')}`,
        }))}
      />
      <Clip
        src="k-means/lloyd-rounds"
        label="The objective in words, add up over every point its distance to its centre squared, turns into J equals the sum over x of the squared distance from x to its centre. Then six points on a line, at 1, 3, 4, 8, 9 and 10, and two centres starting at 1 and 3. Each round the points take the colour of their nearest centre and the centres move to the means: J goes from 111 to 38.8, 22.75 and 6.67."
        caption="Watch J after every half-step: each assignment lowers it, and so does each move. In round 2 the point at 3 switches sides; in round 3 the point at 4 does, and then nothing moves."
      />
      <p>
        But stopping is not the same as winning. The rounds stop at a grouping that no single step can improve, a{' '}
        <strong>local optimum</strong>, and from a bad start that can be far from the best, like the stuck park at{' '}
        {one(stuckEnd / goodEnd)} times the score of the good one.
      </p>

      <h2>A better start: k-means++</h2>
      <p>
        So the start matters. <strong>k-means++</strong> takes a random point as the first centre. Each next centre is
        a point drawn with chance in proportion to its squared distance from the nearest centre chosen so far. A crowd
        with no centre yet is far from all of them and holds most of that chance; a point already chosen sits at
        distance zero and can’t be drawn again. Drawing, instead of always taking the farthest point, keeps one stray
        point from claiming a centre of its own.
      </p>
      <p>
        Arthur and Vassilvitskii proved that these starts alone, before a single round, score on average within a
        factor 8(ln k + 2) of the best possible, about {Math.round(plusPlusBound(3))} for k = 3, a bound that grows
        only like log k. The rounds after can only lower it.
      </p>

      <h2>Run it yourself</h2>
      <p>Five crowds of different sizes. Step through a run, try a new start, and switch how the centres start.</p>
      <Figure
        readable
        caption={
          <>
            Each line joins a point to its centre. At k = {LAB_K.start}, {lab.reached.Random} of 100 runs from random
            starts end at the best grouping (J = {one(lab.best)}); from k-means++ starts, {lab.reached['k-means++']}{' '}
            do, and their average ends at {one(lab.average['k-means++'])} against {one(lab.average.Random)}. The
            triangle marks where this run ended.
          </>
        }
      >
        <Lab />
      </Figure>

      <Predict
        kicker="Quick check"
        question="A teammate runs k-means once with k = 5. It stops at J = 480. “It converged, so 480 is the best you can do with 5 groups.” What do you say?"
        options={[
          { label: 'Right: it only stops at the best' },
          { label: 'Not necessarily: it stopped where no step helps', right: true },
          { label: 'It stopped too early: run more rounds' },
          { label: 'Right, if it started with k-means++' },
        ]}
        reveal={
          <>
            Converged only means no single step lowers J any more, a local optimum. More rounds from the same place
            change nothing. Other starts may end lower, and even k-means++ only makes a bad end unlikely, not
            impossible: in the lab, {100 - lab.reached['k-means++']} of its 100 runs missed the best.
          </>
        }
      />

      <h2>Using it well</h2>
      <ul>
        <li>
          <strong>Run it from several starts and keep the lowest J.</strong> Each run is cheap, and a stuck run gives
          itself away with a higher score.
        </li>
        <li>
          <strong>Start with k-means++.</strong> It makes stuck starts rare for one pass over the data per centre.
        </li>
        <li>
          <strong>Put features on the same scale.</strong> Distance adds up every feature, so income in dollars would
          drown out age in years. Standardise each feature first.
        </li>
        <li>
          <strong>Pick k at the elbow.</strong> The best J always falls as k grows, down to zero when every point is
          its own cluster, so look for where it stops falling fast: in the lab, {one(best(4))} at k = 4,{' '}
          {one(best(5))} at 5, then only {one(best(6))} at 6.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="Two queues stand side by side, 1 metre apart, each 40 metres long. You run k-means with k = 2 from many starts and keep the best. Which two groups does it find?"
        options={[
          { label: 'One queue each' },
          { label: 'A front half and a back half', right: true },
          { label: 'One person, and everyone else' },
          { label: 'Different groups every time' },
        ]}
        reveal={
          <>
            It cuts across both queues. With a queue each, people stand up to 20 metres from their centre; cut in the
            middle, nobody is more than about 10 metres away, and squaring rewards that: J is{' '}
            {Math.round(rowsSplit() / acrossSplit())} times lower. k-means favours round groups of similar spread. For
            long or oddly shaped groups, a model that learns each group’s shape, like a{' '}
            <Link to="/learnings/gaussian-mixtures">mixture of Gaussians</Link>, fits better.
          </>
        }
      />
    </Article>
  )
}
