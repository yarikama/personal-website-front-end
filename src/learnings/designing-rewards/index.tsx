import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Choice, Controls, Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Courier from './Courier'
import { circling, courier, DISTANCE, MOVES_SHOWN, one, points, SCHEMES, START, trip, walking, type Scheme } from './model'
import Toys from './Toys'

export default function DesigningRewards() {
  const [scheme, setScheme] = useState<Scheme>('Delivery only')
  const hinted = courier('Delivery + checkpoint')
  const atStart = one(hinted.values[hinted.world.at(START)])
  const loopPoints = points(trip('Delivery + checkpoint'))

  return (
    <Article
      kicker="Reinforcement learning · Markov decision processes"
      title="Reward what you want"
      promise="You pay a robot for every piece of rubbish it puts in the bin. What could go wrong?"
      takeaway={
        <>
          An agent chases exactly the reward it is given, so reward <em>what</em> you want achieved, never how you think
          it should get there.
        </>
      }
      sources={[
        {
          title: 'Reinforcement Learning: An Introduction',
          by: 'Richard S. Sutton and Andrew G. Barto, 2nd edition',
          part: 'Chapter 3, “Finite Markov Decision Processes”, §3.2 “Goals and Rewards”',
          url: 'http://incompleteideas.net/book/the-book-2nd.html',
        },
      ]}
    >
      <Predict
        question="A cleaning robot gets +1 every time it drops a piece of rubbish into the bin, and nothing else. Given plenty of time to learn, what does it end up doing?"
        options={[
          { label: 'Cleaning the room fast' },
          { label: 'Tipping the bin out and refilling it', right: true },
          { label: 'Stopping once the room is clean' },
          { label: 'Leaving the big pieces' },
        ]}
        reveal={
          <>
            Once the room is clean, there is no more reward to be had, unless the robot makes more rubbish to put away.
            Tipping out the bin and refilling it pays +1 a piece, for ever. You asked for a clean room; you paid for
            rubbish going into a bin.
          </>
        }
      />

      <h2>A coin per toy</h2>

      <Steps
        say={[
          <>You promise your little brother a coin for every toy he puts back on the shelf.</>,
          <>By bedtime the floor is clear, and he has earned 6 coins. It works.</>,
          <>
            The next evening, he tips the shelf onto the floor himself, tidies it again, and does it once more: 18
            coins.
          </>,
          <>
            He isn’t being naughty. He does exactly what you pay for: putting toys away. A tidy room was only what you
            meant.
          </>,
          <>
            So pay him one coin if the room is tidy at bedtime. Tipping the shelf out now earns nothing, and the room
            stays tidy.
          </>,
          <>
            Your brother is the <strong>agent</strong> and the coins are its <strong>reward</strong>. An agent tries to
            collect as much reward as it can over time, so the reward has to say what you actually want.
          </>,
        ]}
      >
        {(step) =>
          step === 0 ? (
            <Toys key="tidy" evening="tidy" />
          ) : step === 1 ? (
            <Toys key="tidied" evening="tidied" />
          ) : step === 2 ? (
            <Toys key="tip" evening="tip" />
          ) : step === 3 ? (
            <Toys key="tip-again" evening="tip" />
          ) : step === 4 ? (
            <Toys key="bedtime" evening="bedtime" />
          ) : (
            <Toys key="named" evening="tidied" named />
          )
        }
      </Steps>

      <h2>The reward is the goal</h2>
      <p>
        In reinforcement learning, everything you want from an agent has to be said through one number per step, the
        reward. The agent’s goal is the most total reward over time, not the most right now: the idea from{' '}
        <Link to="/learnings/reward-and-value">Reward versus value</Link>. That turns out to be enough to describe a
        surprising range of goals. A robot learning to walk can be paid for each step of forward progress; a game player,
        +1 for a win and −1 for a loss.
      </p>
      <p>
        But the agent will find any way to collect reward that the world allows, including ones you didn’t foresee.
        Rewarding a step you expect along the way, as a hint, is the classic mistake: the hint becomes the goal.
      </p>

      <h2>A hint that backfires</h2>
      <p>
        A courier robot crosses a yard. Delivering the parcel at the far corner pays 10 and ends the trip. To help it
        along, you add a checkpoint near the start that pays 1 each time the robot rolls onto it. Below, each square
        shows what it is worth when the robot plays as well as it can, with a reward one move later counted at 0.9 (
        <Link to="/learnings/discounting">why, on the next page</Link>), and the arrows are its best moves.
      </p>
      <Figure
        caption={
          <>
            Delivery only: every arrow leads to the goal. Add the checkpoint, and the squares near it point back to it:
            rolling on and off it pays 1 every other move, for ever, which is worth more than a parcel {DISTANCE} moves
            away. The robot never delivers.
          </>
        }
      >
        <Courier key={scheme} scheme={scheme} />
        <Controls>
          <Choice label="The reward" options={SCHEMES} value={scheme} onChange={setScheme} />
        </Controls>
      </Figure>

      <Clip
        src="designing-rewards/hint-beats-goal"
        label={`From the start, delivering means ${DISTANCE} moves and then 10: 0.9 to the power ${DISTANCE - 1} times 10 is ${one(walking(DISTANCE))}. Circling the checkpoint means 1 every other move for ever: 1 plus 0.81 plus 0.81 squared and so on is ${one(circling())}, and one move away from the start that is 0.9 times ${one(circling())}, ${atStart}. Circling wins.`}
        caption="The arithmetic the robot does for you. A small reward repeated for ever outweighs a big one far away."
      />
      <Numbers
        items={[
          { label: 'Deliver', value: one(walking(DISTANCE)), note: `10 after ${DISTANCE} moves` },
          { label: 'Circle the checkpoint', value: atStart, note: '1 every other move' },
          { label: `Points in ${MOVES_SHOWN} moves`, value: String(loopPoints), note: 'and no delivery' },
        ]}
      />

      <Predict
        kicker="Quick check"
        question="A chess program is given +1 for every piece of its opponent’s it captures. What will it learn?"
        options={[
          { label: 'To win more often' },
          { label: 'To capture, even when it loses the game', right: true },
          { label: 'To defend its own pieces' },
          { label: 'Nothing: captures are too rare' },
        ]}
        reveal={
          <>
            It learns to capture: that is what it is paid for. Captures usually help win, so it may even play decently,
            but when grabbing a piece walks into checkmate, it grabs. Reward chess for winning, and let the agent work
            out that captures help.
          </>
        }
      />

      <h2>Setting rewards</h2>
      <ul>
        <li>
          <strong>Reward the outcome.</strong> Pay for the parcel delivered, the game won, the room tidy at bedtime,
          not for steps you believe lead there.
        </li>
        <li>
          <strong>Say how in other ways.</strong> To pass on what you know about how, use the agent’s starting policy
          or its starting values, not the reward.
        </li>
        <li>
          <strong>Charge for time if time matters.</strong> −1 per step until the job is done is a clean way to ask for
          speed.
        </li>
        <li>
          <strong>Keep the reward out of the agent’s hands.</strong> The reward comes from outside the agent, from its
          world; an agent that could set its own would simply set it high.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="A support chatbot is rewarded for keeping conversations short, so customers aren’t kept waiting. What might it learn?"
        options={[
          { label: 'To answer more clearly' },
          { label: 'To end chats fast, solved or not', right: true },
          { label: 'To ask fewer questions, but solve every problem' },
          { label: 'To ask more questions first' },
        ]}
        reveal={
          <>
            Short chats are what it is paid for, and the quickest way to a short chat is to wrap it up, whether or not
            the problem is fixed. Reward what you want, a solved problem, perhaps with a small cost per minute, and
            short chats follow.
          </>
        }
      />
    </Article>
  )
}
