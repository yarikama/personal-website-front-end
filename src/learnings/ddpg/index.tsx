import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Button, Choice, Controls, Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Learner from './Learner'
import { climb, combinations, learn, missedBy, NOISES, PEAK, slope, STORY, type Noise } from './model'
import Shower from './Shower'

const NOISE_NAMES = Object.keys(NOISES) as Noise[]
const tries = (n: number) => (n >= 1e9 ? `10${toSuperscript(Math.round(Math.log10(n)))}` : n.toLocaleString('en-US'))
const toSuperscript = (n: number) => [...String(n)].map((d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)]).join('')

export default function Ddpg() {
  const habits = climb(4)
  const [noise, setNoise] = useState<Noise>('Large')
  const [replays, setReplays] = useState(0)
  const ends = useMemo(
    () => ({ none: missedBy(learn(NOISES.None).at(-1)!.theta), large: missedBy(learn(NOISES.Large).at(-1)!.theta) }),
    []
  )

  return (
    <Article
      kicker="Reinforcement learning · Deep RL"
      title="Continuous actions"
      promise="A robot arm can push with any force at all. How can Q-learning pick the best push when there are infinitely many to choose from?"
      takeaway={
        <>
          When actions are continuous, train a second network, the <em>actor</em>, to find the max for you: it climbs the
          critic’s slope, and noise on its actions keeps that slope honest.
        </>
      }
      sources={[
        {
          title: 'Continuous control with deep reinforcement learning',
          by: 'Timothy P. Lillicrap et al., ICLR, 2016',
          part: 'The DDPG algorithm: actor, critic, target networks for both, and exploration noise',
          url: 'https://arxiv.org/abs/1509.02971',
        },
        {
          title: 'Deterministic Policy Gradient Algorithms',
          by: 'David Silver et al., ICML, 2014',
          part: 'Climbing the critic’s slope with a deterministic policy',
          url: 'https://proceedings.mlr.press/v32/silver14.html',
        },
        {
          title: 'Reinforcement Learning: An Introduction',
          by: 'Richard S. Sutton and Andrew G. Barto, 2nd edition',
          part: 'Chapter 13, “Policy Gradient Methods”, §13.5 “Actor–Critic Methods” and §13.7 “Policy Parameterization for Continuous Actions”',
          url: 'http://incompleteideas.net/book/the-book-2nd.html',
        },
        {
          title: 'COMP 442/552: Reinforcement Learning',
          by: 'Vaibhav Unhelkar, Rice University, Fall 2026',
          part: 'Deep Deterministic Policy Gradient',
        },
      ]}
    >
      <Predict
        question="Every update, a deep Q-network looks for the best move at the next state. A robot arm has 6 joints. If you try 100 settings for each joint, how many guesses is that, for each sample in each update?"
        options={[
          { label: '600' },
          { label: '60,000' },
          { label: 'A million' },
          { label: 'A trillion', right: true },
        ]}
        reveal={
          <>
            A trillion, 100 to the power 6. A move is a setting for every joint at once, so each joint’s 100 multiply.
            And 100 settings is still coarse: the arm could push with anything in between. Searching is out; this page
            is about what replaces it.
          </>
        }
      />

      <h2>A dial, not a switch</h2>

      <Steps
        readable
        say={[
          <>Your shower has a dial, not two taps: any setting from 0, cold, to 100, hot.</>,
          <>To find the best by trying every setting, you’d be there all morning, and between any two there’s another.</>,
          <>So you keep a habit instead: on a cold morning like this one, the dial goes to {STORY.habit}.</>,
          <>
            From past showers you also have a feel for how each setting would go, and right at your habit it says: a bit
            hotter would be better.
          </>,
          <>
            So each morning you nudge the habit uphill on that feel, {habits.slice(0, 4).join(', ')}, closing in on{' '}
            {PEAK} without trying every setting.
          </>,
          <>And now and then you set it a touch off your habit, to keep your feel for nearby settings true.</>,
          <>
            That is <strong>DDPG</strong>, deep deterministic policy gradient. The habit is the <em>actor</em> μ(s), the
            feel is the <em>critic</em> Q(s, a), and the nudge follows the critic’s slope at the actor’s setting.
          </>,
        ]}
      >
        {(step) => <Shower key={step} step={step} />}
      </Steps>

      <p>
        A <Link to="/learnings/deep-q-networks">deep Q-network</Link> gives one guess for each of a handful of joystick
        moves, and its target takes the largest. A torque, a steering angle or a dial is a number, and the moves
        multiply with every joint:
      </p>
      <Numbers
        items={[1, 2, 6].map((joints) => ({
          label: joints === 1 ? '1 joint' : `${joints} joints`,
          value: tries(combinations(100, joints)),
          note: 'tries per target',
        }))}
      />

      <h2>The one line of math</h2>
      <p>
        In words: <strong>the best guess at the next state = the critic’s guess at the setting the actor picks
        there</strong>. Taking a max is the same as evaluating at the place where the max is. Nobody can search for
        that place every update, so a network learns to point at it.
      </p>
      <Clip
        src="ddpg/max-to-actor"
        label="The deep Q-network's target, r plus gamma times the max over a-prime of Q of s-prime and a-prime, is rewritten as Q at the argmax of Q. The argmax is replaced by mu of s-prime, the actor's choice. With target copies of both networks, the target becomes r plus gamma times Q with weights w-minus of s-prime and mu with weights theta-minus of s-prime."
        caption="The max becomes Q at the argmax, and the argmax becomes the actor. Both get frozen copies, as in DQN."
      />
      <p>
        And the actor learns by moving its setting up the critic’s slope: <strong>new habit = habit + step × how much
        better a slightly higher setting would feel</strong>. From the story, with a step of {STORY.step}:
      </p>
      <Numbers
        words
        items={habits.slice(0, 3).map((habit, i) => ({
          label: `Morning ${i + 1}`,
          value: `${habit} → ${habits[i + 1]}`,
          note: `slope ${slope(habit).toFixed(2)}`,
        }))}
      />
      <p>
        The slope halves as the habit nears the top, so the steps shrink by themselves. A real actor has weights, not a
        single number; the chain rule passes the slope back through them:
      </p>
      <Clip
        src="ddpg/actor-update"
        label="The actor's weights theta move by a step times the critic's slope along the action, at the actor's own action, times how the action moves with theta. With a slope of 1.6 and a step of 0.25 the setting moves from 30 to 50."
        caption="The critic says which way is better; the actor’s own gradient says which weights move the setting that way."
      />

      <p>
        This is an <Link to="/learnings/actor-critic">actor–critic</Link>, with one difference from{' '}
        <Link to="/learnings/reinforce">REINFORCE</Link> and its kin: the actor is <em>deterministic</em>. It names one
        setting rather than rolling dice over settings, so its update needs no average over what it might have done,
        only the critic’s slope. That lets it learn from a replay buffer of old moves, as DQN does, with target copies
        of both networks. The price is that it never explores by itself: noise has to be added to what it does.
      </p>

      <h2>Every kind of morning</h2>
      <p>
        Now the whole thing, on mornings from mild to freezing. The actor is a line: how hot to go, for how cold the
        morning is. It starts the wrong way round. The critic learns from a notebook of past showers, and after each
        shower both learn from a handful picked at random.
      </p>
      <Figure
        readable
        caption="Across: the morning; up: the setting. The solid line is the actor’s habit, the dashed line the best setting, the shading the critic’s guess (darker is better), the dots its latest tries. Without noise, the critic only ever sees the habit’s own settings, so its slope across settings is never tested, and the habit stalls. With noise, it sees what nearby settings feel like, and the habit finds the best line.">
        <Learner key={`${noise} ${replays}`} noise={NOISES[noise]} />
        <Controls>
          <Choice label="Exploration noise" options={NOISE_NAMES} value={noise} onChange={setNoise} />
          <Button onClick={() => setReplays((n) => n + 1)}>Play again</Button>
        </Controls>
      </Figure>
      <p>
        After 800 showers, the habit is {ends.large.toFixed(1)} settings off the best on average with large noise, and{' '}
        {ends.none.toFixed(1)} off with none. Lillicrap and colleagues used the same recipe, with larger networks, on more
        than 20 simulated physics tasks: swinging up a pole on a cart, reaching with an arm, walking, driving, some of
        them learned straight from pixels.
      </p>

      <Predict
        kicker="Quick check"
        question="A DDPG robot is trained with no exploration noise. Its critic fits every move it made almost perfectly. Why can its actor still end up far from the best action?"
        options={[
          { label: 'The critic’s slope is untested', right: true },
          { label: 'The actor is deterministic' },
          { label: 'There is no replay' },
          { label: 'The rewards are too small' },
        ]}
        reveal={
          <>
            The critic only knows the actions the actor took. Fitting those well says nothing about actions a little to
            either side, yet that slope is exactly what the actor climbs. Noise puts nearby actions in the notebook, so
            the slope is learned rather than guessed.
          </>
        }
      />

      <h2>Making it work</h2>
      <ul>
        <li>
          <strong>Copy slowly.</strong> DDPG blends each target copy a thousandth of the way toward its network every
          update, rather than copying every few thousand, so both targets drift instead of jumping.
        </li>
        <li>
          <strong>Use noise with momentum.</strong> A random push that changes every step mostly cancels out on a heavy
          arm. Noise that drifts, keeping its direction for a while, actually moves it somewhere new.
        </li>
        <li>
          <strong>Bound the actor.</strong> End it with a squashing function so it can only name settings the motor
          can deliver; outside that range the critic has never been taught anything.
        </li>
        <li>
          <strong>Put inputs on one scale.</strong> Joint angles, speeds and forces come in different units, and one
          step size has to suit them all.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="A drone has 4 rotors, each with any speed. A team splits each rotor’s speed into 21 levels and uses a deep Q-network. How many outputs does its network need?"
        options={[{ label: '4' }, { label: '21' }, { label: '84' }, { label: '194,481', right: true }]}
        reveal={
          <>
            A move sets all four rotors at once, so every combination is its own move: 21 to the power 4 is{' '}
            {combinations(21, 4).toLocaleString('en-US')}, each with its own guess, and the target needs the largest.
            A DDPG actor outputs just 4 numbers, at any precision, and the critic takes them as input.
          </>
        }
      />
    </Article>
  )
}
