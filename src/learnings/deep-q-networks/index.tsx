import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Button, Choice, Controls, Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Knobs from './Knobs'
import Lake from './Lake'
import { chase, frozen, gap, screensPowerOfTen, SETTLED_K, SHARES, START_K, STORY, type Aim, type Share } from './model'

const AIMS = ['Moving', 'Frozen copy'] as const
const SHARE_NAMES = Object.keys(SHARES) as Share[]

export default function DeepQNetworks() {
  const chased = gap(chase(10).at(-1)!, chase(10).at(-1)!)
  const held = gap(frozen(10).at(-1)!, START_K)
  const start = gap(START_K, START_K)
  const screens = Math.floor(screensPowerOfTen()).toLocaleString('en-US')

  const [aim, setAim] = useState<(typeof AIMS)[number]>('Frozen copy')
  const [share, setShare] = useState<Share>('1 in 10')
  const [replays, setReplays] = useState(0)
  const aimOf: Aim = aim === 'Moving' ? 'moving' : 'frozen'

  return (
    <Article
      kicker="Reinforcement learning · Deep RL"
      title="Deep Q-networks"
      promise="An Atari game can show more screens than any table could hold. What goes wrong when a network learns the values instead, and what keeps it steady?"
      takeaway={
        <>
          A network lets Q-learning cope with more states than any table, but it chases its own tail unless it learns
          from a <em>shuffled memory</em> and aims at a <em>frozen copy</em> of itself.
        </>
      }
      sources={[
        {
          title: 'Human-level control through deep reinforcement learning',
          by: 'Volodymyr Mnih et al., Nature, 2015',
          part: 'The DQN agent, its replay memory and target network, and its results on 49 Atari games',
          url: 'https://www.nature.com/articles/nature14236',
        },
        {
          title: 'Reinforcement Learning: An Introduction',
          by: 'Richard S. Sutton and Andrew G. Barto, 2nd edition',
          part: 'Chapter 9, “On-policy Prediction with Approximation”, §9.1–9.3; Chapter 11, “Off-policy Methods with Approximation”, §11.3 “The Deadly Triad”; Chapter 16, §16.5 “Human-level Video Game Play”',
          url: 'http://incompleteideas.net/book/the-book-2nd.html',
        },
        {
          title: 'COMP 442/552: Reinforcement Learning',
          by: 'Vaibhav Unhelkar, Rice University, Fall 2026',
          part: 'Q Learning with Function Approximation',
        },
      ]}
    >
      <Predict
        question="You swap Q-learning’s table for a network, and train it on each move as it happens, aiming at its own guess for the next move just as Q-learning does. What tends to happen?"
        options={[
          { label: 'It learns just as well' },
          { label: 'It learns faster' },
          { label: 'Its guesses can run away', right: true },
          { label: 'It stops learning' },
        ]}
        reveal={
          <>
            They can run away. Nudging a network to fix one guess moves its other guesses too, including the guess for
            the next move, and that guess is what it was aiming at. So the target moves every time it does. The story
            below shows how that goes wrong, and the two changes that tamed it.
          </>
        }
      />

      <h2>A rule instead of a table</h2>

      <Steps
        readable
        say={[
          <>
            There are far too many corners in town to remember the drive home from each, so you keep one rule of thumb:
            k minutes for every mile from home, as the crow flies, with k at {START_K}.
          </>,
          <>From the pier, half a mile out, the only road runs round the lake: 4 minutes to the far shore, which is a mile out.</>,
          <>So the pier should take 4 minutes plus your guess from the far shore, 4 + 4 = 8, not the 2 your rule says.</>,
          <>
            You turn k up to close the gap, but that lifts the far shore’s guess twice as fast: after ten nudges the gap
            has grown from {start} to {chased.toFixed(1)} minutes.
          </>,
          <>
            Start again, but first copy k onto a sticky note and aim at 4 plus the note’s guess. The target holds at 8,
            and the pier’s guess climbs to meet it.
          </>,
          <>
            Then learn from a notebook of past drives picked at random, the far shore’s 6-minute drives home among them,
            and refresh the note now and then. k settles at {STORY.mixed.at(-1)!.toFixed(1)}.
          </>,
          <>
            That is a <strong>deep Q-network</strong>. The rule is a neural network, k is its weights, the sticky note is
            a frozen <em>target network</em>, and the notebook is a <em>replay buffer</em>.
          </>,
        ]}
      >
        {(step) => <Lake key={step} step={step} />}
      </Steps>

      <p>
        <Link to="/learnings/q-learning">Q-learning</Link> keeps one number for every place and move. An Atari screen
        is 210 by 160 pixels, each in one of 128 colours, which makes about 10<sup>{screens}</sup> possible screens. No
        table comes close. A network can stand in for one: it reads the screen and gives back a guess for each move,
        and similar screens get similar guesses without each being seen. That sharing is the point, and it is also the
        trouble. Like turning k, every nudge to the network moves its guesses for other screens, the next one included.
      </p>

      <h2>The one line of math</h2>
      <p>
        In words: <strong>new weights = weights + step × (target − guess) × how much the guess moves with each
        weight</strong>. The target is the reward plus the discounted best guess at the next state, the same as in
        Q-learning, but read off the frozen copy rather than the network being trained.
      </p>

      <Clip
        src="deep-q-networks/dqn-target"
        label="Q-learning's target, r plus gamma times the max over a-prime of Q of s-prime and a-prime, gets the network's weights w. The update moves w toward the target, but the target's own w is the one being changed, so it is replaced by w-minus, a copy refreshed every K updates. Each sample is drawn at random from the replay buffer."
        caption="The only change from Q-learning is whose weights make the target: a copy that stands still for K updates."
      />

      <p>The pier from the story, starting {start} minutes short of its target, with a step of 0.4:</p>
      <Numbers
        items={[
          { label: 'Start', value: start.toFixed(1), note: 'minutes short' },
          { label: 'Live target', value: chased.toFixed(1), note: 'after ten nudges' },
          { label: 'Copy', value: held.toFixed(1), note: 'after ten nudges' },
        ]}
      />
      <p>
        Each nudge on the live target widens the gap by a tenth; on the copy it closes by a tenth. That is the whole
        difference a target network makes, one update at a time.
      </p>

      <h2>Two knobs, and when they run away</h2>
      <p>
        One knob can’t be right at both places: the lake makes the pier slow though it is close. In the story it
        settled at {SETTLED_K.toFixed(1)}, the best single compromise. Give the rule a second knob, a correction used
        only at the far shore, and it can be exactly right: 10 minutes from the pier, 6 from the far shore. What’s left
        is whether learning gets there.
      </p>
      <p>
        Below, it learns from a notebook of drives, a handful at random each update. You choose how the pier’s target
        is made, and how many of the drives in the notebook start at the far shore. A notebook can be lopsided because
        it holds whatever you happened to drive, not a fair sample of the trips your guesses are about.
      </p>
      <Figure
        readable
        caption="Sage is the pier’s guess, ink the far shore’s, dashed their true drives. With 1 drive in 10 from the far shore, a moving target runs off the chart while a copy, refreshed every 50 updates, settles. With none, both run away.">
        <Knobs key={`${aim} ${share} ${replays}`} aim={aimOf} share={share} />
        <Controls>
          <Choice label="Pier’s target" options={AIMS} value={aim} onChange={setAim} />
          <Choice label="Far-shore drives" options={SHARE_NAMES} value={share} onChange={setShare} />
          <Button onClick={() => setReplays((n) => n + 1)}>Play again</Button>
        </Controls>
      </Figure>
      <p>
        DeepMind’s DQN did this at scale. Its network read the last four frames, shrunk to 84 by 84 grey pixels, and
        gave one guess for each of up to 18 joystick moves. It kept the last million frames in its replay memory,
        learned from batches of 32 at random, and refreshed its target network every 10,000 updates. Trained afresh on
        each of 49 Atari games, with the same design and settings for all of them, it beat earlier learning methods on
        43 and reached three quarters of a professional tester’s score on 29.
      </p>

      <Predict
        kicker="Quick check"
        question="A DQN’s guesses climb game after game, far above any score the game can give. Which change is most likely to help?"
        options={[
          { label: 'Copy the target every update' },
          { label: 'Copy the target less often', right: true },
          { label: 'Learn only from the newest move' },
          { label: 'Use a bigger step' },
        ]}
        reveal={
          <>
            Copying less often holds the target still for longer, so each nudge can’t drag it along. Copying every
            update is the moving target again; learning only from the newest move throws away the shuffled memory; a
            bigger step makes the chase faster.
          </>
        }
      />

      <h2>Still no guarantee</h2>
      <p>
        With no far-shore drives, even the copy ran away: each refresh carried the pier’s error into the target, and
        nothing pulled the far shore back. Three things were at work together. <strong>A rule shared between
        places</strong>, so fixing one moves another. <strong>Targets built from your own guesses</strong> (this is
        called bootstrapping). And <strong>data that isn’t the trips being judged</strong>, which is called
        off-policy learning, and Q-learning always is. Sutton and Barto call the three the <em>deadly triad</em>: any
        two are safe, all three can diverge. Replay and a target network make that rare in practice; they don’t rule
        it out.
      </p>

      <h2>Making it work</h2>
      <ul>
        <li>
          <strong>Shuffle the past.</strong> Moves a sixtieth of a second apart look nearly the same. Learning from
          them in order is like studying one chapter all week. A random handful from a big memory looks like the whole
          game, and each move gets reused many times.
        </li>
        <li>
          <strong>Hold the target still.</strong> Refresh the copy every few thousand updates, or blend it toward the
          network by a sliver each update. Either way it should change more slowly than the network it guides.
        </li>
        <li>
          <strong>Keep each step small.</strong> DQN clipped rewards to between −1 and 1 and capped how far a single
          error could push, so one surprising frame could not swing the weights.
        </li>
        <li>
          <strong>Run it more than once.</strong> Which moves get tried and which get replayed are both left to chance,
          so two runs of the same settings can end far apart. Judge a change over several seeds.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="A warehouse robot learns Q-values with a network from a year of logs of people driving it. It uses bootstrapped targets, a replay buffer and a target network. Is it sure to settle?"
        options={[
          { label: 'Yes: the target network sees to it' },
          { label: 'Yes: the replay buffer sees to it' },
          { label: 'No: it can still run away', right: true },
          { label: 'No: networks never settle' },
        ]}
        reveal={
          <>
            It has all three of the deadly triad: a network shared across states, targets made from its own guesses, and
            data from people rather than from the policy it is learning. Replay and a frozen copy make running away
            less likely, as the 1-in-10 notebook showed, but the empty notebook showed they can’t promise it.
          </>
        }
      />
    </Article>
  )
}
