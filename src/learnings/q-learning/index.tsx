import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Choice, Controls, Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import { EDGE, EPSILONS, FAR, MORNINGS, RUNS, settled, story, WET, wetMornings } from './model'
import Race from './Race'
import River from './River'

// A corner on the edge: what its four ways score, river included
const NEXT = { east: -5, north: -7, west: -7, south: WET }

export default function QLearning() {
  const { you, friend } = useMemo(() => story(), [])
  const yourWet = wetMornings(you)
  const herWet = wetMornings(friend)
  const yours = settled(you).length - 1
  const hers = settled(friend).length - 1
  const [epsilon, setEpsilon] = useState<(typeof EPSILONS)[number]>(0.1)
  const best = Math.max(...Object.values(NEXT))

  return (
    <Article
      kicker="Reinforcement learning · Learning to act"
      title="Learning the best while still exploring"
      promise="Can you learn the best way to act while you’re still trying things at random, and what does it cost you?"
      takeaway={
        <>
          Sarsa learns what the way you <em>actually</em> act is worth. Q-learning backs up the best next move, so it
          learns what acting <em>perfectly</em> would be worth, even while you explore, and pays for it while you do.
        </>
      }
      sources={[
        {
          title: 'Reinforcement Learning: An Introduction',
          by: 'Richard S. Sutton and Andrew G. Barto, 2nd edition',
          part: 'Chapter 6, “Temporal-Difference Learning”, §6.5 “Q-learning: Off-policy TD Control”, with Example 6.6, “Cliff Walking”',
          url: 'http://incompleteideas.net/book/the-book-2nd.html',
        },
        {
          title: 'COMP 442/552: Reinforcement Learning',
          by: 'Vaibhav Unhelkar, Rice University, Fall 2026',
          part: 'Lecture “Value-based RL”',
        },
        {
          title: 'Learning from Delayed Rewards',
          by: 'Christopher J. C. H. Watkins, PhD thesis, University of Cambridge, 1989',
          part: 'Where Q-learning was introduced',
          url: 'https://www.cs.rhul.ac.uk/~chrisw/new_thesis.pdf',
        },
        {
          title: 'Q-learning',
          by: 'Christopher J. C. H. Watkins and Peter Dayan, Machine Learning, 1992',
          part: 'The proof that it finds the best values',
          url: 'https://link.springer.com/article/10.1007/BF00992698',
        },
      ]}
    >
      <Predict
        question="You and a friend learn the same walk to the station, along a river with no railing. Both of you still step a random way one block in ten. You score each way by what really follows it; she scores each way by the best that could follow. Who falls in the river more often?"
        options={[
          { label: 'You' },
          { label: 'Your friend', right: true },
          { label: 'About the same' },
          { label: 'Neither, once you’ve learned' },
        ]}
        reveal={
          <>
            Your friend: {herWet} wet mornings in {MORNINGS}, to your {yourWet}. Her scores say the path along the edge
            is best, and it is, for someone who never steps at random. But she still does, so she keeps walking a single
            slip from the water.
          </>
        }
      />

      <h2>Two ways to the station</h2>

      <Steps
        readable
        say={[
          <>
            Your walk to the station runs beside a river with no railing. Right along the edge it takes {EDGE} minutes;
            along the far street, {FAR}.
          </>,
          <>
            You both keep exploring: one block in ten, you step a random way. On the edge, one of those ways is the
            river, and a wet morning is the worst morning there is.
          </>,
          <>
            You score each way by what really happens next, random steps included. The edge’s scores sink with every
            soaking, and you learn to take the far street.
          </>,
          <>
            Your friend scores each way by the best way on from where it lands, as if she will never step at random
            again. By her scores, the edge is the way to go.
          </>,
          <>
            Over {MORNINGS} mornings you get wet {yourWet} times. She gets wet {herWet} times: walking the edge, she
            never stops slipping in.
          </>,
          <>
            Then you both stop stepping at random. Now her edge takes {hers} minutes and your far street {yours}, and
            nobody gets wet.
          </>,
          <>
            You learned what your own habit is worth: that is <strong>Sarsa</strong>, an <strong>on-policy</strong>{' '}
            method. She follows one habit and learns what another, the best one, is worth: that is{' '}
            <strong>Q-learning</strong>, an <strong>off-policy</strong> method.
          </>,
        ]}
      >
        {(step) => <River key={step} step={step} you={you} friend={friend} />}
      </Steps>

      <h2>One symbol changes</h2>
      <p>
        <Link to="/learnings/sarsa">Sarsa</Link> nudges a way’s score toward the reward plus the score of the way you
        take next. Q-learning swaps that last part for the score of the <em>best</em> way next, whichever way you then
        take: <strong>new score = old score + step × (reward + best next score − old score)</strong>.
      </p>
      <Clip
        src="q-learning/max-target"
        label="The Sarsa update, Q of s, a plus alpha times r plus gamma Q of s-prime, a-prime minus Q of s, a. The term Q of s-prime, a-prime is replaced by the max over a of Q of s-prime, a. At an edge corner whose ways score minus 5, minus 7, minus 7 and minus 100 for the river, Sarsa's target is minus 6 or minus 101 depending on the step it takes; Q-learning's is minus 6 either way."
        caption="Sarsa looks at the way you will take next; Q-learning looks at the best way there is. On the edge, that is the difference between counting the river and ignoring it."
      />
      <p>
        Take a step onto an edge corner whose ways score {NEXT.east} east, {NEXT.north} north, {NEXT.west} west, and{' '}
        {WET} south, into the river. The step itself costs −1. What the update aims at:
      </p>
      <Numbers
        items={[
          { label: 'Sarsa, you go east', value: `${-1 + NEXT.east}`.replace('-', '−'), note: 'the usual morning' },
          { label: 'Sarsa, you slip south', value: `${-1 + NEXT.south}`.replace('-', '−'), note: 'the river counts' },
          { label: 'Q-learning, either', value: `${-1 + best}`.replace('-', '−'), note: 'only the best counts' },
        ]}
      />
      <p>
        Sarsa’s scores average in the river once in a while, as often as you really slip, so the edge looks worse than
        it would be if you never slipped. Q-learning’s never do. Its scores head for the best values there are, q*, the
        ones from <Link to="/learnings/optimal-policies">The best from here</Link>, no matter how it wanders while it
        learns, as long as every way keeps getting tried.
      </p>

      <h2>Following one habit, learning another</h2>
      <p>
        The habit you act by, random steps and all, is the <strong>behaviour policy</strong>. The habit whose values
        you’re learning is the <strong>target policy</strong>. In Sarsa they are the same habit: on-policy. In
        Q-learning they differ: the target is the greedy habit, always the best-scored way, while the behaviour keeps
        exploring. That split is what lets an off-policy learner learn from experience it didn’t choose: old walks,
        another person’s walks, a log of what some earlier program did.
      </p>

      <h2>Both, on average</h2>
      <p>
        One pair of walkers is a story. Here are {RUNS} learners of each kind, {MORNINGS} mornings each, stepping at
        random as often as you choose. A morning scores minus its minutes, and {WET} if it ends in the river.
      </p>
      <Figure readable caption="Q-learning’s scores are right about the edge, and its mornings are worse: its route keeps it one random step from the river. Step at random more often, and the gap grows; less often, and it shrinks, since the edge then rarely costs anything.">
        <Race epsilon={epsilon} />
        <Controls>
          <Choice label="Random steps" options={EPSILONS} value={epsilon} onChange={setEpsilon} format={(e) => `1 in ${Math.round(1 / e)}`} />
        </Controls>
      </Figure>

      <Predict
        kicker="Quick check"
        question="Why is Q-learning called off-policy?"
        options={[
          { label: 'It switches its policy off to learn' },
          { label: 'It learns the best habit’s values while acting by an exploring one', right: true },
          { label: 'It needs no rewards' },
          { label: 'It never explores' },
        ]}
        reveal={
          <>
            The max in its update always assumes the best next move, whatever move is really made. So the values it
            learns belong to the greedy habit, while the moves it makes come from a different, exploring one.
          </>
        }
      />

      <h2>Which to use</h2>
      <ul>
        <li>
          <strong>If the exploring never stops, count it.</strong> A learner that will always take some random moves,
          or that learns on real hardware where a fall breaks something, does better with Sarsa’s caution: its scores
          describe what will really happen.
        </li>
        <li>
          <strong>Explore less over time, slowly, and they agree.</strong> As the random steps fade toward none, the
          habit Sarsa scores becomes the greedy one, and its scores head for the best values too. The fade has to be
          slow: stop exploring too soon and the edge keeps the bad name it earned, since nobody walks it again to
          clear it.
        </li>
        <li>
          <strong>Learn from anyone’s experience.</strong> Off-policy learning can reuse old walks, logs, or a person
          showing the way, as long as every way is tried often enough.
        </li>
        <li>
          <strong>Watch the max.</strong> Taking the best of several scores that are still noisy tends to pick one
          that is too high. That is the subject of <Link to="/learnings/maximization-bias">the next page</Link>.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="A warehouse robot learns its routes on the real floor, and it will always try a random move now and then. Its shortest route passes the top of a staircase. Which learner suits it better?"
        options={[
          { label: 'Q-learning: it finds the shortest route' },
          { label: 'Sarsa: its scores count its own random moves', right: true },
          { label: 'Either: they learn the same route' },
          { label: 'Neither can learn near stairs' },
        ]}
        reveal={
          <>
            Sarsa. Q-learning would learn the shortest route, the one past the stairs, and keep falling down them on its
            random moves. Sarsa scores the robot as it really behaves, random moves included, so it keeps its distance
            from the stairs for as long as it keeps exploring.
          </>
        }
      />
    </Article>
  )
}
