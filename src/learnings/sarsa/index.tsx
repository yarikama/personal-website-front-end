import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Figure, Numbers } from '../../components/explain/figure'
import { MOVES } from '../../components/explain/mdp'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import { chances, firstWithin, minutes, nudge, onward, score, SHORTEST, story, STORY, zoomStep } from './model'
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
      promise="With no map, how do you learn the best way to go, and when should you start acting on what you’ve learned?"
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
          part: 'Chapter 6, “Temporal-Difference Learning”, §6.4 “Sarsa: On-policy TD Control” and §6.6 “Expected Sarsa”; Chapter 4, §4.6 “Generalized Policy Iteration”',
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
        question="Every morning you walk to the station in a new town, with no map, scoring each way out of each corner by how it went. How long should you keep one fixed way of choosing before you switch to using the new scores?"
        options={[
          { label: 'A month, to judge it fairly' },
          { label: 'Until the scores settle' },
          { label: 'One morning' },
          { label: 'Not at all: use each new score at the next corner', right: true },
        ]}
        reveal={
          <>
            Not at all. With a map, you could work out exactly what one fixed habit is worth, then improve it, then work
            the new one out again. Learning from experience can do a sliver of both at every step: one score gets
            corrected, and the very next choice already uses it. The choices and the scores improve together, and still
            end up at the best way.
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

      <h2>Why a score for every way</h2>
      <p>
        On <Link to="/learnings/optimal-policies">The best from here</Link>, a score for each place was enough to
        choose by, as long as you could look one step ahead: you knew where every move would land. Without a map you
        don’t. A corner’s score can’t tell you which way out leads to the better corner. A score for each way can, as it
        already counts where that way goes. So learning without a model keeps Q(s, a), one number per state and action,
        and the best way out is simply the one with the highest number.
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

      <h2>Score a little, improve a little</h2>
      <p>
        With a map, finding the best habit takes two big jobs, done in turn: work out what your current habit is worth
        everywhere, then switch to the best choices by those values, and repeat until nothing changes. Sarsa does both
        jobs a sliver at a time. Each step corrects one score, and the next choice already follows the corrected scores.
        The scores chase the habit and the habit chases the scores, and together they settle on the best. This pattern
        is called <strong>generalized policy iteration</strong>, and almost every method in reinforcement learning is a
        version of it.
      </p>
      <p>
        One catch: if you always took the best-scored way, you would stop trying the others, and a way that went badly
        once would never get another chance. So the choosing stays{' '}
        <Link to="/learnings/exploration-and-exploitation">mostly greedy, sometimes random</Link>. Because Sarsa scores
        the ways you really take, random turns included, its scores describe that exploring habit. Usually that hardly
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
        question="Without a map, why keep a score for each way out of a corner, instead of one score for each corner?"
        options={[
          { label: 'Ways are fewer than corners' },
          { label: 'A corner’s score can’t pick a way without knowing where each way leads', right: true },
          { label: 'Corner scores never settle' },
          { label: 'It explores more' },
        ]}
        reveal={
          <>
            To choose a way by corner scores, you’d compare the corners each way leads to, and knowing where ways lead
            is the map you don’t have. A way’s own score has already counted where it goes, so the best way is just the
            highest number.
          </>
        }
      />

      <h2>Making it work</h2>
      <ul>
        <li>
          <strong>Scores of 0 are optimistic when every step costs.</strong> A way you have tried has gone negative, so
          the untried ones look better and get tried. That is why the second morning in the town can be even longer
          than the first.
        </li>
        <li>
          <strong>Explore less as you learn.</strong> Random turns found the shortest way, and then kept costing
          minutes: in the story’s last ten mornings, one still took {worst}. Turning at random less and less often lets
          the habit settle on the truly best way.
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
