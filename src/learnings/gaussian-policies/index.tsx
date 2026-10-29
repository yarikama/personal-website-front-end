import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Button, Choice, Controls, Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Kitchen from './Kitchen'
import { kitchen, recentRating, SCRIPT, SPREADS, START, story, STORY_EVENINGS, WORKED, worked, type KitchenEvening, type Spread } from './model'
import Salt from './Salt'

const SPREAD_NAMES = Object.keys(SPREADS) as Spread[]

// Worked out once: the story's evenings, and the kitchen with each way of
// setting the spread
const EVENINGS = story()
const runs = new Map<Spread, KitchenEvening[]>()
function runOf(spread: Spread) {
  let found = runs.get(spread)
  if (!found) {
    found = kitchen(spread)
    runs.set(spread, found)
  }
  return found
}

const one = (value: number) => value.toFixed(1)
const two = (value: number) => value.toFixed(2)
const signed = (value: number) => `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(1)}`

export default function GaussianPolicies() {
  // The numbers the story tells, from its run
  const [first, second, third] = EVENINGS
  const end = EVENINGS.at(-1)!
  const spreads = EVENINGS.map((e) => e.after.spread)
  const widest = Math.max(...spreads)
  const widestAt = spreads.indexOf(widest) + 1
  // Three tries against a habit of 4 ± 1 and a usual of 6
  const tries = worked()
  // The kitchen, each way, at the end
  const learned = runOf('Learned').at(-1)!.habits
  const wideMug = recentRating(runOf('Kept wide'), 'mug')
  const learnedMug = recentRating(runOf('Learned'), 'mug')
  const narrowMug = recentRating(runOf('Kept narrow'), 'mug')

  const [spread, setSpread] = useState<Spread>('Learned')
  const [replays, setReplays] = useState(0)

  return (
    <Article
      kicker="Reinforcement learning · Policy gradients"
      title="A centre and a spread"
      promise="When an action can be any amount at all, how does a policy try things out, and how does it learn how much to try?"
      takeaway={
        <>
          Draw each action from a centre and a spread, and push both by how each try compared with usual: the centre
          moves toward what worked, and the <em>spread</em> learns how widely to keep trying, wider while good results
          come from far out and narrower once they come from close in.
        </>
      }
      sources={[
        {
          title: 'Reinforcement Learning: An Introduction',
          by: 'Richard S. Sutton and Andrew G. Barto, 2nd edition',
          part: 'Chapter 13, “Policy Gradient Methods”, §13.7 “Policy Parameterization for Continuous Actions”',
          url: 'http://incompleteideas.net/book/the-book-2nd.html',
        },
        {
          title: 'Simple Statistical Gradient-Following Algorithms for Connectionist Reinforcement Learning',
          by: 'Ronald J. Williams, Machine Learning, 1992',
          part: 'REINFORCE for units that draw from a normal distribution and learn its mean and standard deviation',
          url: 'https://link.springer.com/article/10.1007/BF00992696',
        },
        {
          title: 'COMP 442/552: Reinforcement Learning',
          by: 'Vaibhav Unhelkar, Rice University, Fall 2026',
          part: 'Lecture “REINFORCE”',
        },
      ]}
    >
      <Predict
        question="Your soup has been bland for weeks: the best amount of salt is far more than you usually put in. From now on, each bowl teaches you two things: where to centre your salting, and how widely to vary it. At first, what happens to how widely you vary it?"
        options={[
          { label: 'It narrows straight away' },
          { label: 'It widens, then narrows', right: true },
          { label: 'It stays about the same' },
          { label: 'It narrows, then widens' },
        ]}
        reveal={
          <>
            It widens first. While you are far off, the only bowls that taste better are the ones that happen to land
            far out on the salty side, and each of those says: go out that far more often. Once the centre has
            arrived, the good bowls are the ones close in, and the spread tightens.
          </>
        }
      />

      <h2>Salt to taste</h2>

      <Steps
        readable
        say={[
          <>You make soup most evenings and salt it by hand: not a set number of pinches, but any amount at all.</>,
          <>
            Your habit has a centre, {START.centre} pinches, and a spread, half a pinch: most evenings land within half
            a pinch of {START.centre}, a few further out.
          </>,
          <>
            Evening 1: {one(first.pinches)} pinches, a bland {one(first.rating)}. With nothing to compare it with,
            that is your usual, and the habit stays put.
          </>,
          <>
            Evening 2: {one(second.pinches)}, far out on the salty side, rates {one(second.rating)}, better than your
            usual: the centre moves toward it, to {two(second.after.centre)}, and since a far-out try paid off, the
            spread widens, to {two(second.after.spread)}.
          </>,
          <>
            Evening 3: {one(third.pinches)}, far out on the bland side, rates {one(third.rating)}, worse than usual:
            the centre steps away from it, and since a far-out try let you down, the spread narrows, to{' '}
            {two(third.after.spread)}.
          </>,
          <>
            {STORY_EVENINGS} evenings on, the centre is at {one(end.after.centre)}. The spread grew to {two(widest)} by
            evening {widestAt}, while the good bowls kept landing far out, then shrank to {two(end.after.spread)} once
            you got there.
          </>,
          <>
            This is a <strong>Gaussian policy</strong>: the habit is a normal distribution π(a|s), its centre the mean
            μ, its spread the standard deviation σ. Each evening’s salt is a sample a, and μ and σ both learn.
          </>,
        ]}
      >
        {(step) =>
          step === 0 ? (
            <Salt key="any" evenings={EVENINGS} show="any" pace={4000} />
          ) : step === 1 ? (
            <Salt key="habit" evenings={EVENINGS} show="habit" pace={280} />
          ) : step <= SCRIPT.length + 1 ? (
            <Salt key={`evening-${step}`} evenings={EVENINGS} show="evenings" from={step - 2} to={step - 1} pace={4200} />
          ) : step === 5 ? (
            <Salt key="months" evenings={EVENINGS} show="evenings" from={SCRIPT.length} to={STORY_EVENINGS} pace={50} />
          ) : (
            <Salt key="named" evenings={EVENINGS} show="evenings" from={STORY_EVENINGS} to={STORY_EVENINGS} pace={50} named />
          )
        }
      </Steps>

      <p>
        Nothing in that figure keeps a score for each amount: there are infinitely many, and you would never taste
        most of them twice. The policy is two numbers, and a try anywhere on the axis teaches both. With a few
        choices, a policy was a set of chances, one for each, from the <Link to="/learnings/gradient-bandits">softmax</Link>;
        a smooth amount needs a smooth curve instead.
      </p>

      <h2>The one line of math</h2>
      <p>
        The push is the <Link to="/learnings/reinforce">REINFORCE</Link> one: how much better than usual the try
        turned out, times the slope of log π at what you did. For a bell curve, that slope has a part for each
        number, and in words they say:
      </p>
      <ul>
        <li>
          <strong>The centre moves toward a try that beat your usual</strong>, in proportion to how far from the centre
          it was, divided by the spread squared: (r − b)(a − μ)/σ².
        </li>
        <li>
          <strong>The spread widens when a try more than one spread out beat your usual, and narrows when one within a
          spread did</strong>: (r − b)((a − μ)²/σ² − 1). A try that did worse than usual turns both around.
        </li>
      </ul>
      <p>
        With a habit of {WORKED.habit.centre} ± {WORKED.habit.spread} and a usual of {WORKED.usual}, three evenings
        push like this, each then times a small step α:
      </p>
      <Numbers
        words
        items={tries.map((t) => ({
          label: `${t.pinches} pinches, rated ${t.rating}`,
          value: t.logSpread > 0 ? 'wider' : 'narrower',
          note: `centre ${signed(t.centre)}, spread ${signed(t.logSpread)}`,
        }))}
      />
      <Clip
        src="gaussian-policies/bell-to-push"
        label="The bell curve pi of a equals one over sigma root two pi, times e to the minus a minus mu squared over two sigma squared. Its log, with sigma written as e to the rho, is minus rho minus a minus mu squared over two sigma squared, plus a constant. Its slope along mu is a minus mu over sigma squared; along rho, a minus mu squared over sigma squared, minus one. Times r minus b, these are the two pushes. With mu 4, sigma 1, b 6, and a try at 6 rated 8: the centre's push is plus 4, the spread's plus 6."
        caption="Take the log of the bell curve and ask how it changes with each number. The centre’s slope points toward the try; the spread’s turns positive once the try is more than one spread out."
      />
      <p>
        Notice that the push goes to ρ, the log of the spread, with σ = e<sup>ρ</sup>. A spread has to stay above
        zero, and every ρ, however negative, gives one that does. A push straight on σ could carry it through zero
        to a bell with no width at all. On ρ, a push shrinks or grows the spread by a share of itself instead.
      </p>
      <p>
        There is another way to handle a continuous action: <Link to="/learnings/ddpg">DDPG</Link> names one action
        outright and adds noise from outside. Here the noise is part of the policy, and it is learned.
      </p>

      <h2>Where precision pays</h2>
      <p>
        Now one cook in two situations, the state s. A mug of soup wants a pinch or two, and one too many spoils it;
        a big pot wants six, and forgives a pinch either way. The habit has a centre and a spread for each, μ(s) and
        σ(s), and the evenings alternate at random. Change how the spread is set.
      </p>
      <Figure
        readable
        caption={
          <>
            Dashed: how each amount would taste. Learned, the mug’s spread closes to {two(learned.mug.spread)} while
            the pot’s stays at {two(learned.pot.spread)}: in the pot, a near miss tastes about as good, so nothing
            pushes it in. Kept wide, the mug is often spoiled (rated {one(wideMug)}, against {one(learnedMug)}); kept
            narrow, no evening lands salty enough to learn from, and the mug stays at {one(narrowMug)}.
          </>
        }
      >
        <Kitchen key={`${spread} ${replays}`} run={runOf(spread)} spread={spread} />
        <Controls>
          <Choice label="Spread" options={SPREAD_NAMES} value={spread} onChange={setSpread} />
          <Button onClick={() => setReplays((n) => n + 1)}>Play again</Button>
        </Controls>
      </Figure>
      <p>
        So the exploring depends on the state: the policy stays loose where trying around is cheap, or where it has
        not yet found its footing, and grows precise where small errors cost. Nobody sets that by hand; the same
        ratings that move the centres teach it.
      </p>

      <Predict
        kicker="Quick check"
        question="Your habit is 5 pinches ± 0.5. One evening you put in 4.9 pinches, and it rates worse than usual. Which way does the push go?"
        options={[
          { label: 'Centre toward 4.9, spread narrower' },
          { label: 'Centre away from 4.9, spread wider', right: true },
          { label: 'Centre away from 4.9, spread narrower' },
          { label: 'Only the centre moves' },
        ]}
        reveal={
          <>
            4.9 is well within one spread of the centre, and it did worse than usual: staying close in is not paying,
            so the spread widens a little, and the centre steps away from 4.9, up. Both pushes are small, since 4.9 is
            so near the centre; it is many evenings together that move the habit.
          </>
        }
      />

      <h2>Putting it to work</h2>
      <ul>
        <li>
          <strong>Learn the log of the spread.</strong> Have the network output μ and log σ. Every output is then a
          valid spread, and a step changes it by a share, not an amount.
        </li>
        <li>
          <strong>Start wide enough to reach.</strong> If the good actions are many spreads from where you start,
          almost no try lands near them, and there is nothing to learn from: the mug kept narrow never got anywhere.
        </li>
        <li>
          <strong>Watch the step as the spread closes.</strong> The centre’s push is divided by σ², so the same rating
          moves a narrow habit much further. A smaller step, or a floor under the spread, keeps it from leaping.
        </li>
        <li>
          <strong>Give each part of the action its own pair.</strong> A robot arm with six motors gets six centres and
          six spreads, and draws each motor’s command from its own bell.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="A robot learns how hard to squeeze, with a centre and a spread, when it picks up eggs and when it picks up cardboard boxes. After training, its squeeze on eggs barely varies; on boxes it still varies a lot. What does that tell you?"
        options={[
          { label: 'Boxes are still unlearned' },
          { label: 'Boxes forgive a loose squeeze', right: true },
          { label: 'Its step is too big' },
          { label: 'It needs one spread for both' },
        ]}
        reveal={
          <>
            A box holds across a wide range of squeezes, so tries off the centre do about as well as tries on it, and
            little pushes its spread in. An egg cracks or slips at small errors, so close-in tries keep beating far-out
            ones, and its spread closes. That is the spread doing its job: loose where trying around is cheap, tight
            where precision pays.
          </>
        }
      />
    </Article>
  )
}
