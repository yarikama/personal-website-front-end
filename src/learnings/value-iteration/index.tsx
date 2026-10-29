import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Controls, Figure, Numbers, Slider } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import { signed, SPOTS, steps } from '../../components/explain/ladders'
import Labelled from '../../components/explain/Labelled'
import Sweeping from '../../components/explain/Sweeping'
import Track from '../../components/explain/LaddersTrack'
import {
  EVERY_MOVE,
  FINAL,
  generalizedCost,
  options,
  PASSES,
  PLANS,
  policyIterationCost,
  settledAt,
  switchedAt,
  THETA,
  valueIterationCost,
} from './model'
import Sweep from './Sweep'

const list = (squares: number[]) =>
  squares.length === 1 ? String(squares[0]) : `${squares.slice(0, -1).join(', ')} and ${squares.at(-1)}`

export default function ValueIteration() {
  // The story's sweeps, and the numbers they tell
  const last = PASSES.length - 1
  const settled = settledAt()
  const early = 3
  const stepping = steps(PLANS[early])
  const focus = 7
  const [roll, step] = options(last, focus).map((value) => signed(value, 2))
  const vi = valueIterationCost()
  const pi = policyIterationCost()
  const few = generalizedCost(3)
  const n = (value: number) => value.toLocaleString('en')

  const [sweep, setSweep] = useState(5)

  return (
    <Article
      kicker="Reinforcement learning · Planning"
      title="Improve as you go"
      promise="Policy iteration judges each way of playing to the end before it changes anything. How much of that judging can you skip?"
      takeaway={
        <>
          Put the improvement inside the sweep: give every state the value of its <em>best</em> move, repeat until the
          values stop moving, then read the best moves off once.
        </>
      }
      sources={[
        {
          title: 'Reinforcement Learning: An Introduction',
          by: 'Richard S. Sutton and Andrew G. Barto, 2nd edition',
          part: 'Chapter 4, “Dynamic Programming”, §4.4 “Value Iteration” and §4.7 “Efficiency of Dynamic Programming”',
          url: 'http://incompleteideas.net/book/the-book-2nd.html',
        },
        {
          title: 'COMP 442/552: Reinforcement Learning',
          by: 'Vaibhav Unhelkar, Rice University, Fall 2026',
          part: 'MDP Planning under Uncertainty: Policy and Value Iteration',
        },
      ]}
    >
      <Predict
        question={`On the board where you may roll or step, policy iteration judged four ways of playing for ${pi.sweeps} sweeps in all. Suppose you judge each way for a single sweep, switch to the moves that look best, sweep once more, and so on. Do you still find the best way to play?`}
        options={[
          { label: 'No: the values never settle' },
          { label: `Yes, in about ${vi.sweeps} sweeps`, right: true },
          { label: 'Yes, but in thousands of sweeps' },
          { label: 'Only from a good habit' },
        ]}
        reveal={
          <>
            Yes, in {vi.sweeps}. A switch only needs the values to rank the moves, and a single sweep, started from the
            last one’s numbers, keeps them close enough. Fewer sweeps than policy iteration, though each one looks at
            both moves on every square.
          </>
        }
      />

      <h2>One sweep at a time</h2>

      <Steps
        say={[
          <>
            Back on the board where each turn you may roll or step. This time there is no habit to judge: every square
            starts at 0.
          </>,
          <>
            In each sweep, give a square −1 plus the better of its two moves: the roll’s average landing, or the step’s
            one square. After one sweep, every square says −1, whichever move you take.
          </>,
          <>
            Taking the better move inside the sweep is judging for one sweep and improving at once. By sweep {early},
            squares {list(stepping)} already step.
          </>,
          <>The moves settle first: after sweep {settled}, no square’s better move changes again.</>,
          <>
            The numbers keep moving until sweep {last}, when the biggest change falls under {THETA}.
          </>,
          <>
            Read the better move off each square once: it’s the best play policy iteration found, for {vi.sweeps} sweeps
            instead of {pi.sweeps}.
          </>,
          <>
            A sweep with the best move in place of the policy’s average is the{' '}
            <strong>Bellman optimality backup</strong>; sweeping it until the biggest change is small, then reading off
            the best moves, is <strong>value iteration</strong>.
          </>,
        ]}
      >
        {(step) =>
          step === 0 ? (
            <Labelled key="zeros" left="Sweep 0" right="no habit">
              <Track label="The board, every square at 0" values={PASSES[0].values} />
            </Labelled>
          ) : step === 1 ? (
            <Sweeping
              key="first"
              passes={PASSES}
              plans={PLANS}
              from={0}
              to={1}
              pace={1200}
              label="Every square after one sweep: −1"
            />
          ) : step === 2 ? (
            <Sweeping
              key="early"
              passes={PASSES}
              plans={PLANS}
              from={1}
              to={early}
              pace={900}
              rung={switchedAt(early)}
              label="The first squares to prefer stepping"
            />
          ) : step === 3 ? (
            <Sweeping
              key="moves"
              passes={PASSES}
              plans={PLANS}
              from={early}
              to={settled}
              pace={600}
              rung={switchedAt(settled)}
              label="The moves settling, sweep by sweep"
            />
          ) : step === 4 ? (
            <Sweeping
              key="values"
              passes={PASSES}
              plans={PLANS}
              from={settled}
              to={last}
              pace={420}
              theta={THETA}
              label="The values settling after the moves"
            />
          ) : (
            <Labelled key={step === 5 ? 'best' : 'named'} left="Read off once" right={`${vi.sweeps} sweeps`}>
              <Track
                label="The best play, read off the settled values"
                values={PASSES[last].values}
                shade
                plan={FINAL}
              />
            </Labelled>
          )
        }
      </Steps>

      <h2>The average becomes a max</h2>
      <p>
        <Link to="/learnings/policy-evaluation">Judging a way of playing</Link> swept the average over the policy’s
        moves. <Link to="/learnings/policy-iteration">Better, then best</Link> then switched each state to its best
        move. Do both in one sweep: the policy you would switch to puts all its weight on the best move, so its average
        is simply the best move’s worth.
      </p>
      <Clip
        src="value-iteration/greedy-into-sweep"
        label={`The policy evaluation sweep: V of s gets the sum over a of pi of a given s, times the sum over next states and rewards of p times r plus gamma V of s prime. Let pi be greedy on the current V, all its weight on the best action. The weighted sum becomes the max over a. That is the value iteration update. Square ${focus}: roll ${roll}, step ${step}, so V of ${focus} is ${step}. When delta is below theta, read off pi of s as the arg max over a.`}
        caption="Make the policy the greedy one and its average collapses to a max. The improvement is no longer a separate step; the argmax is needed only once, at the end."
      />
      <p>On square {focus}, once the values have settled:</p>
      <Numbers
        items={[
          { label: 'Roll: −1 + average of six', value: roll },
          { label: 'Step: −1 + v(16)', value: step },
          { label: `v(${focus}), the better`, value: step },
        ]}
      />
      <p>
        This is the optimality equation from <Link to="/learnings/optimal-policies">The best from here</Link>, turned
        into an instruction, just as policy evaluation turned the policy’s equation into one.
      </p>

      <h2>Sweep by sweep</h2>
      <p>Move through the sweeps. The rings mark squares whose better move that sweep changed.</p>
      <Figure
        caption={
          <>
            The values climb for {last} sweeps; the moves are right from sweep {settled}. Each sweep looks at every move
            of every square: {SPOTS.length} squares × (6 landings for a roll + 1 for a step) = {EVERY_MOVE} landings.
          </>
        }
      >
        <Sweep sweep={sweep} />
        <Controls>
          <Slider label="Sweep" value={sweep} min={0} max={last} onChange={setSweep} />
        </Controls>
      </Figure>

      <Predict
        kicker="Quick check"
        question={`At sweep ${settled}, every square already has its best move, but the values are still moving. Are they the values of playing those moves?`}
        options={[
          { label: 'Yes, exactly' },
          { label: 'No: they are still on their way', right: true },
          { label: 'No: they are always rolling’s values' },
          { label: 'Yes, once rounded' },
        ]}
        reveal={
          <>
            No. After {settled} sweeps from zero, each value is the best you could do if the game stopped after{' '}
            {settled} turns, so it is less negative than even the best play’s true value. The values are on their way,
            good enough to rank the moves before they are good enough to trust as numbers.
          </>
        }
      />

      <h2>Which to use</h2>
      <p>
        In general, a sweep looks at every state, every action, and every state that action can lead to: up to |S| × |A|
        × |S| landings. Here are the three ways from these pages, counted in landings looked at:
      </p>
      <Numbers
        items={[
          { label: 'Value iteration', value: n(vi.landings), note: `${vi.sweeps} sweeps` },
          {
            label: 'Policy iteration',
            value: n(pi.landings),
            note: `${pi.sweeps} sweeps, ${pi.improvements} improvements`,
          },
          { label: 'Judge 3, then improve', value: n(few.landings), note: `${few.sweeps} sweeps` },
        ]}
      />
      <ul>
        <li>
          <strong>Value iteration is the simplest.</strong> One loop and one max: a good default when sweeps are cheap
          and you have no policy to start from.
        </li>
        <li>
          <strong>Policy iteration takes few, costly rounds.</strong> It pays off when judging is cheap next to
          improving, as when there are many actions to compare, or when you start from a policy that is nearly right.
        </li>
        <li>
          <strong>In between is often cheapest.</strong> A few sweeps of judging between improvements came out ahead
          here, and that is what most practical planners do.
        </li>
        <li>
          <strong>The moves settle before the numbers.</strong> If all you need is how to act, the moves are usually
          right well before the values stop moving; stopping on a modest θ is enough.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="A warehouse robot has 10,000 spots, 4 moves from each, and a move can end on 3 different spots (it sometimes slips). How many landings does one sweep of value iteration look at?"
        options={[
          { label: '40,000' },
          { label: '120,000', right: true },
          { label: '100 million' },
          { label: '400 million' },
        ]}
        reveal={
          <>
            120,000: 10,000 spots × 4 moves × 3 landings. |S| × |A| × |S|, 400 million, is the worst case, when any move
            can land anywhere. Real problems usually have a few landings per move, which is what makes sweeping big
            state spaces possible.
          </>
        }
      />
    </Article>
  )
}
