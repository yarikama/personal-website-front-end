import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Controls, Figure, Numbers, Slider } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import LookAhead from './LookAhead'
import { chargedAt, chargeFirstRun, flipsAt, FULL, grabRun, LOW, score } from './model'
import Room from './Room'

// What the story tells, from the runs themselves
const GRAB = grabRun()
const CHARGE = chargeFirstRun()
const GRABBED = score(GRAB)
const CLEANED = score(CHARGE)
const LOW_PERCENT = Math.round((LOW / FULL) * 100)
// The frame where the greedy robot has taken all the dirt in reach
const GRABBED_AT = GRAB.findIndex((frame) => frame.score === GRABBED)
const CHARGED_AT = chargedAt(CHARGE)
const FLIP = flipsAt() ?? 0

export default function RewardAndValue() {
  const [horizon, setHorizon] = useState(2)

  return (
    <Article
      kicker="Reinforcement learning · Values"
      title="Reward versus value"
      promise="Why would a smart agent pick the move that feels worse right now?"
      takeaway={
        <>
          Reward is what’s good <em>now</em>; value is what’s good <em>from here on</em>. A good agent chooses by
          value.
        </>
      }
      sources={[
        {
          title: 'Reinforcement Learning: An Introduction',
          by: 'Richard S. Sutton and Andrew G. Barto, 2nd edition',
          part: 'Chapter 1, “Elements of Reinforcement Learning”',
          url: 'http://incompleteideas.net/book/the-book-2nd.html',
        },
      ]}
    >
      <Predict
        question={`A robot vacuum earns 1 point for each speck of dirt it picks up; charging earns nothing. Its battery is at ${LOW_PERCENT}%. If it always grabs the biggest reward it can get right now, what happens?`}
        options={[
          { label: 'It goes to charge' },
          { label: 'It runs flat and cleans less in total', right: true },
          { label: 'It stops and waits' },
          { label: 'It cleans the whole room' },
        ]}
        reveal={
          <>
            Charging pays nothing <em>right now</em>, so a robot that only looks at the next point never charges. It
            grabs the dirt within reach, runs flat, and that’s the end of its points.
          </>
        }
      />

      <h2>Two robots, one flat battery</h2>

      <Steps
        say={[
          <>Your robot vacuum earns 1 point for every speck of dirt it picks up. Charging earns nothing.</>,
          <>
            Its battery is at {LOW_PERCENT}%. The nearest dirt pays right now, so it goes for it: {GRABBED} points.
          </>,
          <>One more move and the battery is dead, far from the charger. Final score: {GRABBED}.</>,
          <>A second robot gives up those points and heads for the charger. 0 points so far.</>,
          <>Fully charged, it cleans the whole room: {CLEANED} points.</>,
          <>
            Each speck is a <strong className="font-normal">reward</strong>: what’s good right now. Being charged in a
            dirty room has <strong className="font-normal">value</strong>: all the reward still to come from there.
          </>,
        ]}
      >
        {(step) =>
          step === 0 ? (
            <Room key="start" run="grab" from={0} to={0} />
          ) : step === 1 ? (
            <Room key="grab" run="grab" from={0} to={GRABBED_AT} />
          ) : step === 2 ? (
            <Room key="dead" run="grab" from={GRABBED_AT} to={GRAB.length - 1} />
          ) : step === 3 ? (
            <Room key="to-charger" run="charge" from={0} to={CHARGED_AT} />
          ) : step === 4 ? (
            <Room key="clean" run="charge" from={CHARGED_AT} to={CHARGE.length - 1} />
          ) : (
            <Room key="explain" run="grab" from={0} to={0} explain />
          )
        }
      </Steps>

      <p>
        The first robot wasn’t stupid; it was short-sighted. It judged each move by the points that move paid. The
        second judged where each move <em>left</em> it, and a full battery next to a dirty room is a very good place
        to be, even though getting there paid nothing.
      </p>

      <h2>Value adds up the future</h2>
      <p>
        So the <strong>value</strong> of a situation is the total reward you can expect from there on: this step’s
        reward, plus the next one’s, plus the one after, and so on.
      </p>

      <Clip
        src="reward-and-value/value-adds-up"
        label={`Value is all the reward still to come: v of s equals R1 plus R2 plus R3 and so on. Grabbing the dirt adds up to ${GRABBED}; charging first to ${CLEANED}. Grouping everything after the first reward gives the value of the next place: v of s equals R1 plus v of s prime.`}
        caption="Add up what comes next and the charger wins. Then group the sum: everything after the first reward is the value of the next place."
      />

      <Numbers
        words
        items={[
          { label: 'Grab the dirt', value: `${GRABBED} points`, note: 'more reward now' },
          { label: 'Charge first', value: `${CLEANED} points`, note: 'more value' },
        ]}
      />

      <p>
        The last line of the clip is the one to keep: <strong>the value here is the next reward plus the value of
        where you land</strong>, the seed of{' '}
        <Link to="/learnings/bellman-equation">A square is worth its neighbours</Link>. So an agent doesn’t have to wait until the end to learn what a place is worth; it can
        check one step at a time. That is the trick behind{' '}
        <Link to="/learnings/temporal-difference-learning">temporal-difference learning</Link>.
      </p>

      <h2>See it: how far ahead you look</h2>
      <p>
        Here are the robot’s two choices as rewards, one box per step. An agent that adds up only the next few steps
        picks the dirt. Let it look further and watch the choice flip.
      </p>
      <Figure
        caption={`Looking 1 to ${FLIP - 1} steps ahead, the dirt wins. From ${FLIP} steps on, charging first does: the same rewards, judged by more of what follows them.`}
      >
        <LookAhead horizon={horizon} />
        <Controls>
          <Slider
            label="How far ahead it looks"
            value={horizon}
            min={1}
            max={10}
            onChange={setHorizon}
            format={(h) => `${h} ${h === 1 ? 'step' : 'steps'}`}
          />
        </Controls>
      </Figure>

      <h2>The four parts of an agent</h2>
      <p>The robot already has all four parts that nearly every reinforcement learning agent is built from:</p>
      <ul>
        <li>
          <strong>Policy: what it does in each situation.</strong> “Battery below 20%? Head to the charger.” The
          policy is the agent’s behaviour.
        </li>
        <li>
          <strong>Reward: the score the world hands out, step by step.</strong> One point per speck. It defines the
          goal, and the agent can’t change how it’s handed out.
        </li>
        <li>
          <strong>Value: how good it is to be here, counting what follows.</strong> Charged next to a dirty room:
          worth about {CLEANED}.
        </li>
        <li>
          <strong>Model (optional): its guess of what happens next.</strong> A floor map that says “turn left and the
          charger is four moves away” lets it plan before it acts.
        </li>
      </ul>

      <Predict
        kicker="Quick check"
        question="Which of these does the robot have to work out for itself?"
        options={[{ label: 'The rewards' }, { label: 'The values', right: true }, { label: 'Both' }, { label: 'Neither' }]}
        reveal={
          <>
            The world hands out rewards: the point arrives the moment the speck is picked up. Nobody hands out values;
            the agent has to estimate them from experience. Estimating values well is the heart of most reinforcement
            learning methods.
          </>
        }
      />

      <Predict
        kicker="Check yourself"
        question="In chess, capturing your opponent’s queen feels great. When is it a bad move?"
        options={[
          { label: 'Never: a queen is the strongest piece' },
          { label: 'When it takes many moves' },
          { label: 'When the position after it is losing', right: true },
          { label: 'Only early in the game' },
        ]}
        reveal={
          <>
            The capture is a big reward now; what matters is the value of where it leaves you. If taking the queen
            walks into checkmate, the position after it is worth almost nothing, however good the capture felt.
          </>
        }
      />
    </Article>
  )
}
