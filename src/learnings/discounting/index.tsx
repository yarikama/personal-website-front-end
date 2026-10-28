import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Choice, Controls, Figure, Numbers, Readout } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import { fall, forever, GAMMA, GAMMAS, halfWithin, LONG, ROUTE_GAMMAS, SHORT, show } from './model'
import Routes from './Routes'
import Stream from './Stream'

export default function Discounting() {
  const [gamma, setGamma] = useState<(typeof GAMMAS)[number]>(GAMMA)
  const [routeGamma, setRouteGamma] = useState<(typeof ROUTE_GAMMAS)[number]>(1)
  const half = halfWithin(GAMMA)

  return (
    <Article
      kicker="Reinforcement learning · Markov decision processes"
      title="Sooner is worth more"
      promise="A job pays you a coin every day, for ever. How can something that never stops paying have a price?"
      takeaway={
        <>
          The return adds up every reward still to come, each step further off counted at <em>γ</em> times the one
          before, so even a task that never ends has a finite total, and γ sets how far ahead the agent cares.
        </>
      }
      sources={[
        {
          title: 'Reinforcement Learning: An Introduction',
          by: 'Richard S. Sutton and Andrew G. Barto, 2nd edition',
          part: 'Chapter 3, “Finite Markov Decision Processes”, §3.3 “Returns and Episodes” and §3.4 “Unified Notation for Episodic and Continuing Tasks”',
          url: 'http://incompleteideas.net/book/the-book-2nd.html',
        },
      ]}
    >
      <Predict
        question="A robot earns 1 point every step, for ever. It counts a point one step later as worth 0.9 of a point now, two steps later 0.9 × 0.9, and so on. What are all its future points worth now?"
        options={[{ label: 'Infinitely many' }, { label: 'About 0.9' }, { label: 'Exactly 10', right: true }, { label: 'About 100' }]}
        reveal={
          <>
            Exactly 10. The points never stop, but each is worth less than the last: 1, then 0.9, 0.81, 0.73, … Those
            shrink fast enough that the whole endless sum adds up to 1 ÷ (1 − 0.9) = 10.
          </>
        }
      />

      <h2>A coin a day</h2>

      <Steps
        readable
        say={[
          <>Someone offers you a coin every day, starting today and never stopping.</>,
          <>Added up plainly, the pile never stops growing: 40 coins after 40 days, 365 after a year, and on without end.</>,
          <>
            But a coin tomorrow is worth a little less than one in your hand: it might not come, and you can’t spend it
            yet. Say 0.9 of one.
          </>,
          <>Each day further off is worth 0.9 of the day before: 1, 0.9, 0.81, 0.73, and so on down.</>,
          <>
            Stack them up and the pile shoots up, then slows. Half its worth arrives in the first {half} days, and it
            never passes 10.
          </>,
          <>
            That pile is the <strong>return</strong>, G: all the reward still to come. The 0.9 is the{' '}
            <strong>discount rate</strong>, γ, and a reward of 1 every step for ever is worth 1 ÷ (1 − γ).
          </>,
        ]}
      >
        {(step) =>
          step === 0 ? (
            <Stream key="start" gamma={1} appear />
          ) : step === 1 ? (
            <Stream key="plain" gamma={1} />
          ) : step === 2 ? (
            <Stream key="shrink" gamma={GAMMA} from={1} top={12} />
          ) : step === 3 ? (
            <Stream key="labels" gamma={GAMMA} labels top={12} />
          ) : step === 4 ? (
            <Stream key="pile" gamma={GAMMA} appear top={12} />
          ) : (
            <Stream key="named" gamma={GAMMA} named top={12} />
          )
        }
      </Steps>

      <h2>The return, in one line</h2>
      <p>
        On <Link to="/learnings/reward-and-value">Reward versus value</Link>, value was all the reward still to come,
        added up. That sum is called the <strong>return</strong>. For a game that ends it is a plain sum, but for a task
        that runs for ever, like keeping a server cool or a robot charged, a plain sum can grow without limit, and
        “more than infinity” tells an agent nothing. So weigh each reward by how far off it is.
      </p>
      <Clip
        src="discounting/the-return"
        label="The return G t is R t plus 1, plus gamma R t plus 2, plus gamma squared R t plus 3, and so on. Everything after the first reward is gamma times the next return, so G t equals R t plus 1 plus gamma G t plus 1. With a reward of 1 every step, G equals 1 plus gamma G, so G equals 1 over 1 minus gamma: 10 when gamma is 0.9."
        caption="The sum folds into itself: everything after the first reward is the next step’s return, discounted once. That is how an endless sum gets a value."
      />
      <p>Here γ is between 0 and 1. A reward of 1 every step, for ever, is worth:</p>
      <Numbers
        items={[
          { label: 'γ = 0.5', value: show(forever(0.5)) },
          { label: 'γ = 0.9', value: show(forever(0.9)) },
          { label: 'γ = 0.99', value: show(forever(0.99)) },
        ]}
      />
      <p>
        So 1 ÷ (1 − γ) is also a rough sense of how far ahead an agent looks: about 2 steps at 0.5, 10 at 0.9, 100 at
        0.99. At γ = 0 only the very next reward counts, and the agent is as short-sighted as the robot vacuum that
        never charged.
      </p>

      <h2>How far ahead you care</h2>
      <Figure readable caption="The bars are each step’s reward of 1, as it is worth now; the line is their running total. A small γ cares about the next few steps and little else. Close to 1, a reward 40 steps away still counts for most of a reward now, and the total takes much longer to settle.">
        <Stream key={gamma} gamma={gamma} />
        <Controls>
          <Choice label="A step later counts" options={GAMMAS} value={gamma} onChange={setGamma} />
          <div className="flex gap-x-8">
            <Readout label="Worth now" value={show(forever(gamma))} accent />
            <Readout label="Half of it within" value={`${halfWithin(gamma)} ${halfWithin(gamma) === 1 ? 'step' : 'steps'}`} />
          </div>
        </Controls>
      </Figure>

      <h2>Tasks that end, and tasks that don’t</h2>
      <p>
        Some tasks break into rounds that end, called <strong>episodes</strong>: a game of chess, a run through a maze,
        one attempt to park. Others, called <strong>continuing tasks</strong>, just go on. To write both the same way,
        treat the end of an episode as a square you never leave and that pays 0 for ever after. The sum doesn’t change,
        and the one formula covers both. In an episode, the sum is finite anyway, so γ may be 1.
      </p>
      <Figure
        caption={
          <>
            With γ = 1 the two routes are worth exactly the same, 1, so nothing in the reward says to hurry. Any γ below
            1 makes the exit worth less the longer it takes, and the short way wins.
          </>
        }
      >
        <Routes gamma={routeGamma} />
        <Controls>
          <Choice label="A step later counts" options={ROUTE_GAMMAS} value={routeGamma} onChange={setRouteGamma} />
        </Controls>
      </Figure>

      <Predict
        kicker="Quick check"
        question="A maze robot gets +1 for getting out and 0 for every other move, with no discount (γ = 1). After lots of practice it still takes long, winding routes. Why?"
        options={[
          { label: 'It hasn’t practised enough' },
          { label: 'Every way out is worth the same 1', right: true },
          { label: 'Long routes explore more' },
          { label: 'γ = 1 makes the exit worth nothing' },
        ]}
        reveal={
          <>
            Without a discount, getting out in {SHORT} moves and in {LONG} moves both return exactly 1, so the robot has
            no reason to prefer the short way. Discount the reward, or charge −1 a move, and taking longer costs
            something.
          </>
        }
      />

      <h2>Choosing γ</h2>
      <ul>
        <li>
          <strong>A task that never ends needs γ below 1.</strong> Otherwise the return can be infinite, and every
          policy that earns anything at all looks the same.
        </li>
        <li>
          <strong>γ is how far ahead you care.</strong> Pick it so 1 ÷ (1 − γ) steps covers the consequences you care
          about: too small and the agent grabs what’s near, too close to 1 and it learns slowly, since far-off rewards
          are noisy.
        </li>
        <li>
          <strong>Discounting also means “sooner”.</strong> Even in a task that ends, γ below 1 makes the same reward
          worth more the earlier it comes, so the agent hurries.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question={`A balancing robot gets −1 when its pole falls and 0 on every other step, γ = 0.9, and the task never ends. One way of acting drops the pole after 10 steps, another after 30. Which has the higher return?`}
        options={[
          { label: 'Falling after 10 steps' },
          { label: 'Falling after 30 steps', right: true },
          { label: 'They are equal: one fall each' },
          { label: 'Neither: both are 0 until the fall' },
        ]}
        reveal={
          <>
            Falling after 30. A fall 10 steps off costs 0.9⁹ ≈ {show(-fall(10, 0.9))}; 30 steps off, only 0.9²⁹ ≈{' '}
            {show(-fall(30, 0.9))}. The later the −1, the less it counts, so pushing failure further away raises the
            return, and the robot learns to keep the pole up for as long as it can.
          </>
        }
      />
    </Article>
  )
}

