import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Button, Choice, Controls, Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Lunches from './Lunches'
import { curve, expected, FISH, fresh, gradient, percent, PLACES, RIGHT, SCRIPT, story, STORY_LUNCHES, TOP, TURNS, worth } from '../../components/explain/lunchHill'
import Spread, { DOTS } from './Spread'
import Train from '../../components/explain/HillTraining'

const BASELINES = ['Your usual', 'None'] as const
const EACH = [1, 10] as const
const ALPHAS = [0.05, 0.1, 0.2] as const
const LEARNERS = 200
const TRAIN_LUNCHES = 300
const stepOf = (alpha: number) => `α = ${alpha}`
const walksOf = (n: number) => (n === 1 ? '1 walk' : `${n} walks`)
const turnsOf = (turns: number[]) => turns.map((turn) => TURNS[turn]).join(', ')

// Worked out once for each step size, on the same people
const curves = new Map<number, { usual: number[]; none: number[] }>()
function train(alpha: number) {
  let found = curves.get(alpha)
  if (!found) {
    found = { usual: curve(LEARNERS, TRAIN_LUNCHES, alpha, true, 1), none: curve(LEARNERS, TRAIN_LUNCHES, alpha, false, 1) }
    curves.set(alpha, found)
  }
  return found
}

export default function Reinforce() {
  // The story's lunches, and the numbers it tells, from its run
  const days = useMemo(() => story(), [])
  const [monday, tuesday, wednesday] = days
  const recent = days.slice(-30).filter((day) => day.stall === FISH).length
  // The top fork at even habits: what each turn is worth, and the slope
  const even = fresh()
  const { q, v } = worth(even)
  const slope = gradient(even)[TOP][RIGHT]

  const [baseline, setBaseline] = useState<(typeof BASELINES)[number]>('Your usual')
  const [each, setEach] = useState<(typeof EACH)[number]>(1)
  const [alpha, setAlpha] = useState<(typeof ALPHAS)[number]>(0.1)
  const [replays, setReplays] = useState(0)
  const trained = train(alpha)
  const standard = train(0.1)

  return (
    <Article
      kicker="Reinforcement learning · Policy gradients"
      title="Learning the policy itself"
      promise="How do you get better at a string of choices when you only find out at the end how they went?"
      takeaway={
        <>
          After each episode, make every move you made more likely in proportion to how much better than{' '}
          <em>usual</em> it turned out. One episode says little, but on average that is a step uphill.
        </>
      }
      sources={[
        {
          title: 'Reinforcement Learning: An Introduction',
          by: 'Richard S. Sutton and Andrew G. Barto, 2nd edition',
          part: 'Chapter 13, “Policy Gradient Methods”, §13.1 “Policy Approximation and its Advantages”, §13.2 “The Policy Gradient Theorem”, §13.3 “REINFORCE: Monte Carlo Policy Gradient” and §13.4 “REINFORCE with Baseline”',
          url: 'http://incompleteideas.net/book/the-book-2nd.html',
        },
        {
          title: 'Simple Statistical Gradient-Following Algorithms for Connectionist Reinforcement Learning',
          by: 'Ronald J. Williams, Machine Learning, 1992',
          part: 'Where REINFORCE was first set out',
          url: 'https://link.springer.com/article/10.1007/BF00992696',
        },
        {
          title: 'COMP 442/552: Reinforcement Learning',
          by: 'Vaibhav Unhelkar, Rice University, Fall 2026',
          part: 'Lecture “Policy Gradients”',
        },
      ]}
    >
      <Predict
        question="You make four turns on a walk and only find out at the end how it went. One of today’s turns was a mistake, yet the walk still ended better than usual. When you learn from it, what happens to your habit of making that turn?"
        options={[
          { label: 'It weakens' },
          { label: 'It strengthens, like the rest', right: true },
          { label: 'It stays the same' },
          { label: 'It strengthens most' },
        ]}
        reveal={
          <>
            It strengthens. All you learn is how the whole walk went, and nothing in that says which turn earned it, so
            every turn you took gets the same credit. The mistake is sorted out over many walks: it turns up behind poor
            endings more often than behind good ones, so on balance it loses.
          </>
        }
      />

      <h2>Lunch at the bottom of the hill</h2>

      <Steps
        readable
        say={[
          <>
            Every day you walk down from your office to the harbour for lunch. The lanes fork four times, and at every
            fork your habits for left and right start out equal.
          </>,
          <>
            Monday: {turnsOf(monday.turns)}, to {PLACES[monday.stall]}. Lunch rates a {monday.score}; with nothing to compare it with, that is your usual, and no habit moves.
          </>,
          <>
            Tuesday: {turnsOf(tuesday.turns)}, to {PLACES[tuesday.stall]}, a {tuesday.score}.
            That is worse than your usual {tuesday.usual.toFixed(1)}, so every turn you took weakens a little.
          </>,
          <>
            Wednesday: {turnsOf(wednesday.turns)}, to {PLACES[wednesday.stall]}, an {wednesday.score}, well above your usual{' '}
            {wednesday.usual.toFixed(0)}. Every turn strengthens, even the left that kept you from the fish.
          </>,
          <>
            {STORY_LUNCHES} lunches on, {recent} of your last 30 end at the fish stall. Right turns kept showing up
            behind good lunches, and left turns behind poor ones.
          </>,
          <>
            This is <strong>REINFORCE</strong>. A fork is a state s, a turn an action a, a habit a preference h(s, a),
            the rating the <strong>return</strong> G, and your usual a <strong>baseline</strong> b.
          </>,
        ]}
      >
        {(step) =>
          step === 0 ? (
            <Lunches key="start" days={days} from={0} to={0} pace={1000} />
          ) : step <= SCRIPT.length ? (
            <Lunches key={`lunch-${step}`} days={days} from={step - 1} to={step} pace={4200} />
          ) : step === 4 ? (
            <Lunches key="months" days={days} from={SCRIPT.length} to={STORY_LUNCHES} pace={60} />
          ) : (
            <Lunches key="named" days={days} from={STORY_LUNCHES} to={STORY_LUNCHES} pace={60} named />
          )
        }
      </Steps>

      <p>
        Nothing in that figure gives a fork or a stall a score. The lane widths are the policy, and you change them
        directly. Each push is the rule from <Link to="/learnings/gradient-bandits">Preferences, not values</Link>,
        used at every fork you passed, with the lunch’s rating as the reward.
      </p>

      <h2>Two roads to a policy</h2>
      <p>
        The methods before this one, up to <Link to="/learnings/deep-q-networks">deep Q-networks</Link>, learn values
        first: what each move is worth, and then the best-looking move. Policy-gradient methods leave the values out
        and tune the policy’s own numbers. Since the policy is a set of chances, it explores without being told to: a
        turn you seldom take still comes up now and then, until the habits harden.
      </p>

      <h2>Which way is uphill?</h2>
      <p>
        What you want is the lunch you can expect, written J. Every habit is a dial, and you want to turn each one in
        the direction that raises J. The snag: turning a dial changes what you do at that fork, and also which forks
        you reach afterwards. The <strong>policy gradient theorem</strong> says the second part never needs working
        out. The slope is: for each fork, how often you reach it, times, for each turn there, how good that turn is
        times how fast the dial moves its chance.
      </p>
      <Clip
        src="reinforce/theorem-to-samples"
        label="The policy gradient theorem: the slope of J is proportional to a sum over states of how often you are in each, times a sum over actions of q times the slope of pi. The sum over states becomes an average over the states you visit; multiplying and dividing by pi turns the sum over actions into an average over the action you take, with grad pi over pi, which is grad log pi. The return that followed stands in for q. So one step of REINFORCE is theta plus alpha times G times grad log pi; with a baseline, G minus b."
        caption="Sums you could only work out with a model of the world become averages over what you actually do, and an average can be estimated from samples. One walk gives one sample."
      />
      <p>At the top fork, with even habits, the numbers are:</p>
      <Numbers
        items={[
          { label: 'Right, then even odds', value: q[TOP][RIGHT].toFixed(2), note: 'the lunch to expect' },
          { label: 'Left, then even odds', value: q[TOP][1 - RIGHT].toFixed(2), note: 'the lunch to expect' },
          { label: 'Slope for right', value: `+${slope.toFixed(2)}`, note: `½ × (${q[TOP][RIGHT].toFixed(2)} − ${v[TOP].toFixed(2)})` },
        ]}
      />
      <p>
        Nobody hands you those q values. But a walk’s own rating, times its turn’s ∇ log π (1 − π for the turn taken,
        −π for the other), is a sample whose average is exactly that slope. Stepping along it after every walk is
        REINFORCE, set out by Ronald Williams in 1992.
      </p>

      <h2>One walk is a noisy guess</h2>
      <p>Here are {DOTS} estimates of the top fork’s slope for right, each from a single walk at even habits.</p>
      <Figure
        readable
        caption={
          <>
            Each dot is one estimate. Their average lands near the true slope either way; subtracting your usual (
            {expected(even).toFixed(1)}) pulls the dots in to less than half the spread, and averaging over ten walks
            pulls them in again.
          </>
        }
      >
        <Spread key={`${baseline} ${each}`} baseline={baseline === 'Your usual'} each={each} />
        <Controls>
          <Choice label="Baseline" options={BASELINES} value={baseline} onChange={setBaseline} />
          <Choice label="Each estimate from" options={EACH} value={each} onChange={setEach} format={walksOf} />
        </Controls>
      </Figure>
      <p>
        Why can the usual go in without moving the average? It doesn’t depend on which turn you took, and ∇ log π
        averages to zero over the turns you might take: the same reason as on{' '}
        <Link to="/learnings/gradient-bandits">the bandit page</Link>. Any baseline that
        ignores the action is fair. The best ones follow how good a lunch you can expect from the fork you’re at,
        v(s), which is where the next page picks up.
      </p>

      <Predict
        kicker="Quick check"
        question={`One walk’s estimate of the top fork’s slope comes out at +2.3. The true slope is ${slope.toFixed(1)}. What does that tell you?`}
        options={[
          { label: 'Nothing is wrong: one walk is noisy', right: true },
          { label: 'The baseline is wrong' },
          { label: 'The step is too big' },
          { label: 'The theorem fails here' },
        ]}
        reveal={
          <>
            A single walk’s estimate is right only on average. One lucky lunch can land it far from the slope; many
            walks, or a good baseline, are what bring it in. That is why REINFORCE takes small steps.
          </>
        }
      />

      <h2>Watch it learn</h2>
      <p>Now {LEARNERS} people learn the hill at once, each from their own lunches.</p>
      <Figure
        readable
        caption={
          <>
            The chance of ending at the fish stall, averaged over {LEARNERS} people. With the usual as a baseline,{' '}
            {percent(standard.usual[STORY_LUNCHES - 1])} are there by lunch {STORY_LUNCHES} at α = 0.1. Without it,
            every lunch rates above 0, so every walk pushes all its turns up, and many lock onto the first stall that
            served them well: {percent(standard.none[STORY_LUNCHES - 1])}.
          </>
        }
      >
        <Train
          key={`${alpha} ${replays}`}
          lines={[
            { name: 'Usual', values: trained.usual, accent: true },
            { name: 'None', values: trained.none, accent: false },
          ]}
          label={`The chance of ending at the fish stall, lunch by lunch, averaged over ${LEARNERS} people learning with and without a baseline`}
        />
        <Controls>
          <Choice label="Step size" options={ALPHAS} value={alpha} onChange={setAlpha} format={stepOf} />
          <Button onClick={() => setReplays((n) => n + 1)}>Play again</Button>
        </Controls>
      </Figure>

      <h2>Putting it to work</h2>
      <ul>
        <li>
          <strong>Subtract a baseline.</strong> Your usual return, or better, what you expect from the state you’re
          in. It never changes where learning heads, only how much each step wobbles.
        </li>
        <li>
          <strong>Take small steps, over many episodes.</strong> Each episode’s push is mostly noise; it is the sum of
          many that climbs.
        </li>
        <li>
          <strong>Let the chances explore.</strong> Start with even preferences and let them harden slowly; a policy
          that is certain too soon stops trying the moves it hasn’t learned about.
        </li>
        <li>
          <strong>Use any policy you can differentiate.</strong> A table of habits here; a neural network that turns a
          camera image into motor commands, or a language model choosing words, works the same way.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="A robot learns to stack blocks by REINFORCE. Each try is 50 moves, and it learns only at the end whether the stack stood (1) or fell (0). It succeeds about 3 times in 10. Which baseline makes its learning steadiest?"
        options={[
          { label: '0' },
          { label: '0.3', right: true },
          { label: '1' },
          { label: 'One per move' },
        ]}
        reveal={
          <>
            0.3, its usual success rate: a stack that stands pushes its 50 moves up by 0.7, one that falls pushes them
            down by 0.3, and the two balance. 0 or 1 lead to the same place on average but wobble more. A baseline that
            changes with the move taken would no longer average out, and could lead it the wrong way.
          </>
        }
      />
    </Article>
  )
}
