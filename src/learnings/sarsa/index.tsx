import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Figure, Numbers } from '../../components/explain/figure'
import { MOVES } from '../../components/explain/mdp'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import { chances, firstWithin, minutes, nudge, onward, score, SHORTEST, story, STORY, zoomStep } from '../../components/explain/gridLearning'
import Mornings from './Mornings'
import Trainer from './Trainer'

const fmt = (value: number) => score(value, 1)

// The worked numbers: a way scored −4, a minute's walk, and three ways onward
const OLD = -4
const ONWARD = [-2, -3, -8]
// Expected Sarsa's average over a corner whose ways score these
const NEXT_CORNER = [-2, -3, -6, -8]

export default function Sarsa() {
  const training = useMemo(() => story(), [])
  const zoom = zoomStep(training)
  const shortest = firstWithin(training.walks, SHORTEST)
  const first = minutes(training.walks[0])
  const now = training.walks[zoom.morning].steps[zoom.index]
  const then = training.walks[zoom.morning].steps[zoom.index + 1]
  const lastTen = training.walks.slice(-10).map(minutes)
  const worst = Math.max(...lastTen)
  const average = onward('expected', NEXT_CORNER, null, STORY.epsilon)
  const [bestChance, otherChance] = [Math.max(...chances(NEXT_CORNER, STORY.epsilon)), Math.min(...chances(NEXT_CORNER, STORY.epsilon))]

  return (
    <Article
      kicker="Reinforcement learning · Learning to act"
      title="Learning the way by walking it"
      promise="With no map, how do you learn the best way to go, one block at a time?"
      takeaway={
        <>
          Keep a score for every way out of every place, nudge it after each step toward what the step cost plus the
          score of the way you take <em>next</em>, and keep choosing by those scores, with a little randomness, while
          they improve.
        </>
      }
      sources={[
        {
          title: 'Reinforcement Learning: An Introduction',
          by: 'Richard S. Sutton and Andrew G. Barto, 2nd edition',
          part: 'Chapter 6, “Temporal-Difference Learning”, §6.4 “Sarsa: On-policy TD Control” and §6.6 “Expected Sarsa”',
          url: 'http://incompleteideas.net/book/the-book-2nd.html',
        },
        {
          title: 'COMP 442/552: Reinforcement Learning',
          by: 'Vaibhav Unhelkar, Rice University, Fall 2026',
          part: 'Lectures “From Planning to Learning” and “Value-based RL”',
        },
        {
          title: 'On-Line Q-Learning Using Connectionist Systems',
          by: 'G. A. Rummery and M. Niranjan, Cambridge University Engineering Department, 1994',
          part: 'Where the method first appeared',
        },
      ]}
    >
      <Predict
        question="Every morning you walk to the station in a new town, with no map, keeping a score for each way out of each corner. After a block, you nudge that way’s score toward the minute it cost plus a score for what comes next. At the next corner the best way scores −3, but this morning you turn at random, down a way scored −9. Which score goes into the nudge?"
        options={[
          { label: '−3, the best way from that corner' },
          { label: '−9, the way you really take', right: true },
          { label: 'Neither yet: wait until you reach the station' },
          { label: 'Whichever way you took there yesterday' },
        ]}
        reveal={
          <>
            −9. These scores are meant to describe the walking you really do, random turns and all, so the nudge counts
            the way you actually take next. One random turn drags the score down a little; over many mornings, such
            turns weigh in exactly as often as they happen. Counting the best way instead, whatever you then do, is a
            different method, <Link to="/learnings/q-learning">Q-learning</Link>.
          </>
        }
      />

      <h2>Mornings in a new town</h2>

      <Steps
        readable
        say={[
          <>You’ve moved to a new town, and every morning you walk from home to the station. You have no map.</>,
          <>At every corner you keep a score for each way out: north, east, south and west. They all start at 0.</>,
          <>
            On the first morning you wander. Every block costs a minute, and after each block you adjust the score of
            the way you just took. It takes you {first} minutes.
          </>,
          <>
            Here is one adjustment. You went {MOVES[now.action]} from the ringed corner, and next you’ll go{' '}
            {MOVES[then.action]}. The {MOVES[now.action]} score moves halfway toward −1 for the minute plus the score of
            the way you’re about to take.
          </>,
          <>
            Each morning you take the best-scored way, except one turn in ten, picked at random so that no way is
            written off after one bad try. The walks get shorter.
          </>,
          <>
            On morning {shortest} you walk it in {SHORTEST} minutes, the fewest there are. No one gave you a map: the
            scores led you there.
          </>,
          <>
            Each corner is a <strong>state</strong> s, each way an <strong>action</strong> a, and each score Q(s, a).
            One adjustment uses s, a, the reward r, the next s′ and the next a′, which gives the method its name:{' '}
            <strong>Sarsa</strong>.
          </>,
        ]}
      >
        {(step) => <Mornings key={step} step={step} training={training} zoom={zoom} shortest={shortest} />}
      </Steps>

      <p>
        A score for each way, not each corner, is what lets you choose with no map, for the reason given on{' '}
        <Link to="/learnings/monte-carlo-control">Average, switch, and keep trying</Link>.
      </p>

      <h2>The one line of math</h2>
      <p>
        In words: <strong>new score = old score + step × (reward + score of the next way − old score)</strong>. It is{' '}
        <Link to="/learnings/temporal-difference-learning">temporal-difference learning</Link>, aimed at a score per
        way instead of per place, and the next guess is the score of the way you really take next.
      </p>

      <Clip
        src="sarsa/sarsa-update"
        label="The TD rule for a state, V of s, becomes a rule for a state and action: Q of s, a becomes Q of s, a plus alpha times r plus gamma Q of s-prime, a-prime, minus Q of s, a. The five things it uses, s, a, r, s-prime and a-prime, spell Sarsa."
        caption="Replace the place’s score with the way’s, and the next place’s with the next way’s. Gamma, how much a later step counts, is 1 in the town: a minute later costs the same as a minute now."
      />

      <p>
        A way scored {OLD}, a step of 0.5, and a minute’s walk (−1), with three different scores for the way you take
        next:
      </p>
      <Numbers
        items={ONWARD.map((next) => {
          const after = nudge(OLD, -1, next, STORY)
          return {
            label: `Next way ${score(next)}`,
            value: fmt(after),
            note: after > OLD ? 'better than thought' : after < OLD ? 'worse than thought' : 'just as thought',
          }
        })}
      />
      <p>
        The bracket is the surprise. When the way you take next scores {ONWARD[1]}, a minute plus {Math.abs(ONWARD[1])}{' '}
        more is exactly the {Math.abs(OLD)} you expected, so nothing moves.
      </p>

      <h2>Choosing while you learn</h2>
      <p>
        Each corrected score is used at the very next corner, so judging the habit and improving it take turns step by
        step: <Link to="/learnings/generalized-policy-iteration">generalized policy iteration</Link> at its finest grain.
      </p>
      <p>
        One catch: if you always took the best-scored way, you would stop trying the others, and a way that went badly
        once would never get another chance. So the choosing stays{' '}
        <Link to="/learnings/exploration-and-exploitation">mostly greedy, sometimes random</Link>. Because Sarsa scores
        the ways you really take, random turns included, its scores describe that exploring habit, as the averages did
        on <Link to="/learnings/monte-carlo-control">Average, switch, and keep trying</Link>. Usually that hardly
        matters; on the next page it decides the route.
      </p>

      <h2>Walk it yourself</h2>
      <p>
        Here is the town again, learning from scratch. The arrows are the best-scored ways out of each corner, and the
        line is the last walk. Change how often it turns at random, or have it use the average of the next scores (see
        below).
      </p>
      <Figure readable caption="Bars are minutes per morning; the green ones took the shortest way, 8 minutes. With more random turns, the scores still find the shortest way, but the walks stay longer on average: exploring costs something every single morning.">
        <Trainer />
      </Figure>

      <h3>Expected Sarsa</h3>
      <p>
        The score of the way you take next depends on a random pick, and that luck makes the updates jumpy. Expected
        Sarsa doesn’t wait for the pick: it uses the average of the next corner’s scores, each weighted by how likely
        your habit is to choose it. If they score {NEXT_CORNER.join(', ')}, and you turn at random one time in ten, the
        best way is taken {Math.round(bestChance * 1000) / 10}% of the time and each of the others{' '}
        {Math.round(otherChance * 1000) / 10}%, so the average is {fmt(average)}. Same target on average, less noise, a
        little more arithmetic.
      </p>

      <Predict
        kicker="Quick check"
        question="A delivery robot learns its routes with Sarsa, turning at random now and then. Its scores swing: the same turn’s score goes up one evening and down the next, depending on which way the robot happened to pick after it. What steadies them without changing what they aim at?"
        options={[
          { label: 'Aim at the best next score instead' },
          { label: 'Aim at the next scores, averaged by how likely the robot is to pick each', right: true },
          { label: 'Never turn at random' },
          { label: 'Take bigger steps' },
        ]}
        reveal={
          <>
            Average them, as Expected Sarsa does. The swing is the luck of one random pick, and the weighted average is
            what that pick comes to on average, so the target stays put with the luck taken out. The best next score
            aims at a different habit, one that never turns at random; never turning stops the other ways being tried;
            and bigger steps only make each swing bigger.
          </>
        }
      />

      <h2>Making it work</h2>
      <ul>
        <li>
          <strong>Scores of 0 are <Link to="/learnings/optimistic-initial-values">optimistic</Link> when every step costs.</strong> A way you have tried has gone negative, so
          the untried ones look better and get tried. That is why the second morning in the town can be even longer
          than the first.
        </li>
        <li>
          <strong>Explore less as you learn.</strong> Random turns found the shortest way, and then kept costing
          minutes: in the story’s last ten mornings, one still took {worst}. Turn them down slowly, as on{' '}
          <Link to="/learnings/monte-carlo-control">Average, switch, and keep trying</Link>.
        </li>
        <li>
          <strong>Learn during the walk, not after it.</strong> Because Sarsa updates after every step, a walk going
          round in circles makes the circling ways look worse while you’re still in it, and you break out. A method that
          waited for the walk to end could wait for ever.
        </li>
        <li>
          <strong>Average when you can.</strong> Expected Sarsa costs a sum per step and gives steadier scores; it can
          take bigger steps without being thrown around by luck.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="A robot vacuum scores ‘turn left at the sofa’ at −6. The turn costs 1, and the move it picks next scores −4. With a step of 0.5, what is the new score for turning left at the sofa?"
        options={[{ label: '−6.5' }, { label: '−5.5', right: true }, { label: '−5' }, { label: '−4' }]}
        reveal={
          <>
            −6 + 0.5 × (−1 + (−4) − (−6)) = −6 + 0.5 × 1 = −5.5. The turn plus what follows comes to −5, a point better
            than the −6 it expected, and a step of 0.5 moves the score half of that point.
          </>
        }
      />
    </Article>
  )
}
