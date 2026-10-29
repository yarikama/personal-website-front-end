import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Choice, Controls, Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import { LADDERS, ROLL, signed, SNAKES, SPOTS, state, type Order } from '../../components/explain/ladders'
import Deltas from './Deltas'
import Game from './Game'
import Labelled from '../../components/explain/Labelled'
import { evaluation, faces, FOCUS, ORDER_NAMES, ORDERS, PASSES, shrink, story, THETA, THETAS, truth } from './model'
import Sweeping from '../../components/explain/Sweeping'
import Track from '../../components/explain/LaddersTrack'

export default function PolicyEvaluation() {
  // The story's game and sweeps, and the numbers they tell
  const game = useMemo(() => story(), [])
  const ladders = game.filter((turn) => turn.reached in LADDERS).length
  const snakes = game.filter((turn) => turn.reached in SNAKES).length
  const values = truth()
  const start = signed(values[state(1)])
  const last = PASSES.length - 1
  const near = 27
  const nearPass = (k: number) => signed(PASSES[k].values[state(near)], 2)
  const landed = faces()
  const off = evaluation(THETA, 'copies').error
  const down = evaluation(THETA, 'down').sweeps
  const pace = 1 - shrink(PASSES)

  const [theta, setTheta] = useState<(typeof THETAS)[number]>(THETA)
  const [order, setOrder] = useState<Order>('copies')

  return (
    <Article
      kicker="Reinforcement learning · Planning"
      title="Judging a way of playing"
      promise="You know every rule of a game and exactly how you play it. How can you tell how long you’ll take from every square without playing a single game?"
      takeaway={
        <>
          When you know the rules, a policy’s values follow from one step: <em>sweep</em> that one-step average over
          every state, again and again, until the biggest change is small.
        </>
      }
      sources={[
        {
          title: 'Reinforcement Learning: An Introduction',
          by: 'Richard S. Sutton and Andrew G. Barto, 2nd edition',
          part: 'Chapter 4, “Dynamic Programming”, §4.1 “Policy Evaluation (Prediction)”',
          url: 'http://incompleteideas.net/book/the-book-2nd.html',
        },
        {
          title: 'COMP 442/552: Reinforcement Learning',
          by: 'Vaibhav Unhelkar, Rice University, Fall 2026',
          part: 'Policy and Value Functions',
        },
      ]}
    >
      <Predict
        question="Snakes and ladders, where every turn counts −1. To find each square’s value, you start every square at 0, then sweep: set each to −1 plus the average of the squares the die can send it to. After three sweeps, what does square 1 say?"
        options={[
          { label: `${start}, its true value` },
          { label: '−3.0', right: true },
          { label: '0.0: nothing has reached it' },
          { label: '−1.0' },
        ]}
        reveal={
          <>
            −3.0. Each sweep sees one turn further ahead, and no game from square 1 ends in under three turns, so after
            three sweeps all it knows is “at least three more”. Its true value, {start}, takes {last} sweeps to come
            within {THETA}.
          </>
        }
      />

      <h2>Turns to go</h2>

      <Steps
        say={[
          <>You’re playing snakes and ladders, and like everyone you simply roll the die each turn.</>,
          <>
            This game took {game.length} turns: {ladders} ladders, then the same snake {snakes} times. The next could
            take twice as long; one game is luck.
          </>,
          <>
            But you know the rules. From square {FOCUS}, the die sends you to one of six squares, 1 time in 6 each, and
            a 2 lands on the snake that drops you to 5.
          </>,
          <>
            So square {FOCUS}’s value is −1 for the turn plus the average of those six squares’ values, and every square
            you can stand on has an equation like it: {SPOTS.length} equations, {SPOTS.length} unknowns, each leaning on
            the others.
          </>,
          <>
            Rather than solve them all at once, start every square at 0 and sweep: set each to −1 plus the average of
            where its roll lands. After one sweep, every square says −1.
          </>,
          <>
            Each sweep looks one turn further ahead, and the changes shrink. At sweep {last}, the biggest change falls
            below {THETA}, and you stop.
          </>,
          <>
            Your habit is a <strong>policy</strong>, π; the numbers are its <strong>values</strong>, v<sub>π</sub>; and
            sweeping its Bellman equation until the biggest change is small is{' '}
            <strong>iterative policy evaluation</strong>.
          </>,
        ]}
      >
        {(step) =>
          step === 0 ? (
            <Game key="start" turns={game} from={0} to={3} />
          ) : step === 1 ? (
            <Game key="rest" turns={game} from={3} to={game.length} pace={750} />
          ) : step === 2 ? (
            <Labelled key="focus" left={`Square ${FOCUS} · a roll`} right="1 in 6 each">
              <Track
                label={`Square ${FOCUS} and the six squares a roll can send it to`}
                focus={{ square: FOCUS, move: ROLL }}
              />
            </Labelled>
          ) : step === 3 ? (
            <Labelled key="equations" left={`${SPOTS.length} squares`} right={`${SPOTS.length} unknowns`}>
              <Track
                label={`Every square's value unknown; square ${FOCUS}'s depends on six others`}
                focus={{ square: FOCUS, move: ROLL }}
                unknown
              />
              <p className="mt-3 text-center font-mono text-[0.8rem] text-zinc-faded">
                v({FOCUS}) = −1 + ⅙ [ {landed.map((sq) => `v(${sq})`).join(' + ')} ]
              </p>
            </Labelled>
          ) : step === 4 ? (
            <Sweeping
              key="first"
              passes={PASSES}
              from={0}
              to={1}
              pace={1200}
              label="Every square after the first sweep: −1"
            />
          ) : step === 5 ? (
            <Sweeping
              key="all"
              passes={PASSES}
              from={1}
              to={last}
              pace={260}
              theta={THETA}
              label="Every square's value, sweep by sweep"
            />
          ) : (
            <Labelled
              key="named"
              left="v_π, always rolling"
              right={`square 1: ${signed(PASSES[last].values[state(1)], 2)}`}
            >
              <Track label="Every square's value when always rolling" values={PASSES[last].values} shade />
            </Labelled>
          )
        }
      </Steps>

      <h2>From an equation to an instruction</h2>
      <p>
        On <Link to="/learnings/bellman-equation">A square is worth its neighbours</Link>, the Bellman equation said how
        a policy’s values must fit together. Here it becomes something to do: read the right-hand side with the numbers
        you have now, write the result on the left, and keep track of the largest change you made. That largest change,
        Δ, is how you know when to stop.
      </p>
      <Clip
        src="policy-evaluation/equation-to-sweep"
        label={`The Bellman equation for a policy, v pi of s equals the sum over actions of pi of a given s times the sum over next states and rewards of p times r plus gamma v pi of s prime, holds for every state: as many equations as states. Turn the equals sign into an arrow and it becomes an update: V of s gets the right-hand side computed from the current V. Square ${near}: −1, then −1 plus the average of −1, −1, 0, 0, 0, 0, which is ${nearPass(2)}. Delta is the biggest change in a sweep; repeat until delta is below theta.`}
        caption="One sign changes. The equals, a fact about the true values, becomes an arrow, an instruction to improve the ones you have. Δ watches how much a sweep still moves."
      />
      <p>
        Square {near}, three from the end, settles fastest: of its six rolls, one lands on the snake, one stops a square
        short, and four finish. Its value, sweep by sweep:
      </p>
      <Numbers
        items={[
          { label: 'Sweep 1', value: nearPass(1) },
          { label: 'Sweep 2: −1 + ⅙(−1 −1)', value: nearPass(2) },
          { label: `Sweep ${last}`, value: nearPass(last) },
        ]}
      />
      <p>
        Why sweep, when the equations could be solved outright? They are linear, so a solver gets them exactly, but its
        work grows with the cube of the number of states: nothing for {SPOTS.length} squares, hopeless for a million. A
        sweep costs one look at every landing of every state, and you can stop at the accuracy you need.
      </p>

      <h2>When to stop</h2>
      <p>
        Here is the biggest change in each sweep, on a scale where each line down is ten times smaller. Try a stricter
        θ, and the other ways of sweeping: <strong>two copies</strong> computes a whole sweep from the last one’s
        numbers; <strong>in place</strong> writes each new value over the old at once, so later squares in the same
        sweep read it, going up from square 1 or down from the finish.
      </p>
      <Figure
        readable
        caption={
          <>
            The biggest change falls by about {Math.round(pace * 100)}% a sweep, a straight line on this scale. In place
            is faster, and going down from the finish fastest ({down} sweeps for θ = {THETA}): each square reads squares
            nearer the end that this sweep already brought up to date, so news from the finish travels all the way back
            in one sweep.
          </>
        }
      >
        <Deltas theta={theta} order={order} />
        <Controls>
          <Choice label="Stop below θ" options={THETAS} value={theta} onChange={setTheta} />
          <Choice label="Sweep" options={ORDERS} value={order} onChange={setOrder} format={(way) => ORDER_NAMES[way]} />
        </Controls>
      </Figure>

      <Predict
        kicker="Quick check"
        question={`With two copies, the sweeps stop once the biggest change is under ${THETA}. Is every square then within ${THETA} of its true value?`}
        options={[
          { label: 'Yes: that’s what θ means' },
          { label: 'No: it can be several times further', right: true },
          { label: 'No: it can be anywhere' },
          { label: 'Only the squares near the end' },
        ]}
        reveal={
          <>
            No. Δ is the size of the last step, not the distance left. The steps still to come shrink by about{' '}
            {Math.round(pace * 100)}% each, and together they add up to several of the last one: when it stops, one
            square is still {off.toFixed(3)} away. Pick θ smaller than the error you can live with.
          </>
        }
      />

      <h2>Doing it well</h2>
      <ul>
        <li>
          <strong>Solve small, sweep big.</strong> For a few hundred states, a linear solver gives the exact answer.
          Beyond that, sweeps win: each costs one pass over every state’s landings, and you choose how close to get.
        </li>
        <li>
          <strong>Stop on the biggest change, with room to spare.</strong> Δ under θ means the values have nearly
          stopped moving, not that they are within θ of the truth.
        </li>
        <li>
          <strong>Update in place, in a good order.</strong> One array is half the memory of two, and fresh numbers
          spread faster. Sweeping from where the rewards are, here the finish, back towards the start is fastest of all.
        </li>
        <li>
          <strong>Start from a good guess.</strong> Any starting numbers work. Start near the answer, as the{' '}
          <Link to="/learnings/policy-iteration">next page</Link> does with values from a similar policy, and fewer
          sweeps are needed.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="A delivery robot’s planner evaluates its routing rule on a map of 2,000 spots by sweeping. The biggest change halves with every sweep, and it is 0.4 now. About how many more sweeps until it is under 0.001?"
        options={[
          { label: 'About 9', right: true },
          { label: 'About 400' },
          { label: 'About 2,000' },
          { label: 'It never gets there' },
        ]}
        reveal={
          <>
            About 9. Halving nine times divides by 512, and 0.4 ÷ 512 is under 0.001. The map’s size sets what each
            sweep costs, not how many you need: that depends on how fast the changes shrink.
          </>
        }
      />
    </Article>
  )
}
