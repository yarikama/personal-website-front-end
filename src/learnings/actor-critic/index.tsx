import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Button, Choice, Controls, Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import { FISH, percent } from '../../components/explain/lunchHill'
import Train from '../../components/explain/HillTraining'
import Judge, { LEGS } from './Judge'
import { curve, pushes, STARTS, story, STORY_BETA, STORY_LUNCHES, type Start } from './model'

const LEARNERS = 200
const RACE_LUNCHES = 300
const RACE_ALPHA = 0.2
const EARLY = 30

// Worked out once: REINFORCE, and the critic from each start
const curves = new Map<string, number[]>()
function race(method: 'REINFORCE' | Start) {
  let found = curves.get(method)
  if (!found) {
    found = curve(method, LEARNERS, RACE_LUNCHES, RACE_ALPHA, 2)
    curves.set(method, found)
  }
  return found
}

const one = (value: number) => value.toFixed(1)
const signed = (value: number) => `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(1)}`

export default function ActorCritic() {
  // The story's walks, and the numbers it tells, from its run
  const walks = useMemo(() => story(), [])
  const [first, second, third, last] = walks[0].steps
  const end = walks.at(-1)!
  const recent = walks.slice(-30).filter((walk) => walk.stall === FISH).length
  // One lunch at the noodle bar, judged both ways
  const noodles = pushes(9, 5, 4.6)

  const [start, setStart] = useState<Start>('From earlier walks')
  const [replays, setReplays] = useState(0)
  const reinforce = race('REINFORCE')
  const critic = race(start)
  const knowing = race('From earlier walks')

  return (
    <Article
      kicker="Reinforcement learning · Policy gradients"
      title="A critic at every step"
      promise="Why wait until the end to find out whether a move was any good?"
      takeaway={
        <>
          Judge each move the moment it is made, by how much better things look one step later. Each push carries
          less luck, as long as the <em>critic</em> doing the judging is roughly right.
        </>
      }
      sources={[
        {
          title: 'Reinforcement Learning: An Introduction',
          by: 'Richard S. Sutton and Andrew G. Barto, 2nd edition',
          part: 'Chapter 13, “Policy Gradient Methods”, §13.5 “Actor–Critic Methods”',
          url: 'http://incompleteideas.net/book/the-book-2nd.html',
        },
        {
          title: 'Neuronlike Adaptive Elements That Can Solve Difficult Learning Control Problems',
          by: 'Andrew G. Barto, Richard S. Sutton and Charles W. Anderson, IEEE Transactions on Systems, Man, and Cybernetics, 1983',
          part: 'An early actor–critic, balancing a pole on a cart',
          url: 'https://ieeexplore.ieee.org/document/6313077',
        },
        {
          title: 'COMP 442/552: Reinforcement Learning',
          by: 'Vaibhav Unhelkar, Rice University, Fall 2026',
          part: 'Lecture “Hybrid (Value and Policy-based) Bandit Algorithms”',
        },
      ]}
    >
      <Predict
        question="Back on the hill. At the top you turn left, onto the side with the poorer stalls. The rest of the walk goes well, and lunch is a lucky 8. If something judged each turn as you took it, what would it say about that first left?"
        options={[
          { label: 'Good: lunch was great' },
          { label: 'Bad, straight away', right: true },
          { label: 'Good, straight away' },
          { label: 'Nothing until lunch' },
        ]}
        reveal={
          <>
            Bad, the moment you take it: the lunches you can expect from the left side are worse than from the top. The
            lucky 8 comes three turns later and is credited to the last turn, the one that led to it. REINFORCE, waiting
            for the end, would have called that left a success.
          </>
        }
      />

      <h2>A verdict at every turn</h2>

      <Steps
        readable
        say={[
          <>
            The same hill and the same even habits. But now you also have a feel for each fork, from walks before: the
            lunch you expect if you carry on from there.
          </>,
          <>
            At the top you expect {one(first.here)}. You turn left, and from there you expect {one(first.there)}: that
            turn cost you {one(-first.delta)}, so your habit of going left at the top weakens, right away.
          </>,
          <>
            Then right, and right again: {one(second.here)} to {one(second.there)}, then {one(third.here)} to{' '}
            {one(third.there)}. Each turn gained, so each habit strengthens as you take it.
          </>,
          <>
            One more right, to the dumpling stall, and a lucky {last.reward} where you expected {one(last.here)}. Only
            that last turn gets the {signed(last.delta)}; the left at the top keeps its verdict.
          </>,
          <>
            Your feel learns from the same verdicts: each fork you passed moves a fifth of the way toward what you
            found after it. The top drops from {one(first.here)} to {one(walks[0].feel[first.fork])}.
          </>,
          <>
            {STORY_LUNCHES} lunches on, {recent} of your last 30 end at the fish stall, and your feel for the top has
            risen to {one(end.feel[first.fork])}: it has learned to expect the fish.
          </>,
          <>
            This is an <strong>actor–critic</strong>. Your habits are the actor; your feel is the critic, a value
            V(s); and each verdict, reward + V(next) − V(here), is the <strong>TD error</strong> δ.
          </>,
        ]}
      >
        {(step) =>
          step === 0 ? (
            <Judge key="start" walks={walks} from={0} to={0} pace={1000} />
          ) : step === 1 ? (
            <Judge key="left" walks={walks} from={0} to={2} pace={1100} />
          ) : step === 2 ? (
            <Judge key="rights" walks={walks} from={2} to={4} pace={1100} />
          ) : step === 3 ? (
            <Judge key="lunch" walks={walks} from={4} to={LEGS} pace={1400} />
          ) : step === 4 ? (
            <Judge key="feel" walks={walks} from={LEGS} to={LEGS} pace={1000} settled />
          ) : step === 5 ? (
            <Judge key="months" walks={walks} from={LEGS} to={STORY_LUNCHES * LEGS} pace={12} />
          ) : (
            <Judge key="named" walks={walks} from={STORY_LUNCHES * LEGS} to={STORY_LUNCHES * LEGS} pace={12} named />
          )
        }
      </Steps>

      <p>
        On <Link to="/learnings/reinforce">the last page</Link>, every turn waited for lunch and took the whole
        rating as its credit, luck and all. Here each turn is judged by how much better things look one step later.
        Luck at the stall reaches only the turn that led there, and nothing waits for the walk to end.
      </p>

      <h2>From your usual to a critic</h2>
      <p>
        Start with a single choice, as on <Link to="/learnings/gradient-bandits">the bandit page</Link>: each push
        there was today’s reward minus your usual. Keep a running score for each option as well, and push by the
        chosen option’s score minus your usual instead. Say the noodle bar usually rates 5, your usual is 4.6, and
        today it served a 9:
      </p>
      <Numbers
        items={[
          { label: 'Push from today', value: signed(noodles.raw), note: '9 − 4.6' },
          { label: 'Push from the critic', value: signed(noodles.critic), note: '5 − 4.6' },
          { label: 'The luck left out', value: one(noodles.raw - noodles.critic), note: '9 − 5' },
        ]}
      />
      <p>
        A lucky day no longer reads as big news, so the pushes wobble less. The price is <em>bias</em>: the score is
        a guess, and while it is wrong, every push from it is wrong the same way.
      </p>

      <h2>The one line of math</h2>
      <p>
        With more than one step, the critic scores places instead of options. The verdict on a move is{' '}
        <strong>what it paid + what you now expect − what you expected before</strong>: δ = r + γV(s′) − V(s), with γ
        the <Link to="/learnings/discounting">discount</Link> (1 on a four-turn walk). It stands in for REINFORCE’s
        return minus baseline, and both halves learn from it.
      </p>
      <Clip
        src="actor-critic/return-to-td-error"
        label="REINFORCE's push uses the return minus a baseline. The return is replaced by the reward plus gamma times the critic's value of the next state, and the baseline by the value of this state: together, the TD error delta. The actor's preferences move by alpha times delta times grad log pi, the critic's value by beta times delta. At the top of the hill: 0 plus 3.75 minus 4.56 is minus 0.81."
        caption={
          <>
            The rest of the walk, G, is replaced by the critic’s guess of it one step on. That guess is quieter than a
            whole walk’s luck, and it is ready right away.
          </>
        }
      />
      <p>
        That is the same verdict as <Link to="/learnings/temporal-difference-learning">temporal-difference
        learning</Link>, put to a second use: it corrects the critic’s guess, by a step β ({STORY_BETA} here), and
        steers the actor, by its own step α.
      </p>

      <h2>A good critic, and a bad one</h2>
      <p>
        {LEARNERS} people learn the hill both ways, with a step of {RACE_ALPHA} for the habits. Change where the
        critic starts.
      </p>
      <Figure
        readable
        caption={
          <>
            A critic that starts out about right gets {percent(knowing[EARLY - 1])} to the fish stall by lunch{' '}
            {EARLY}, against {percent(reinforce[EARLY - 1])} for REINFORCE with the usual. One that starts at 5
            everywhere holds them back until it has learned; one that starts at 0 leads most of them astray for good.
          </>
        }
      >
        <Train
          key={`${start} ${replays}`}
          lines={[
            { name: 'Critic', values: critic, accent: true },
            { name: 'Usual', values: reinforce, accent: false },
          ]}
          label={`The chance of ending at the fish stall, lunch by lunch, averaged over ${LEARNERS} people: actor–critic with the critic starting ${start.toLowerCase()}, and REINFORCE with the usual as baseline`}
        />
        <Controls>
          <Choice label="Critic starts" options={STARTS} value={start} onChange={setStart} />
          <Button onClick={() => setReplays((n) => n + 1)}>Play again</Button>
        </Controls>
      </Figure>

      <Predict
        kicker="Quick check"
        question="A new critic guesses 0 for every fork, and every lunch rates above 0. Which turns does the actor learn to favour at first?"
        options={[
          { label: 'Toward forks it has walked', right: true },
          { label: 'Toward the best stall' },
          { label: 'None, until the critic knows' },
          { label: 'Toward forks it hasn’t tried' },
        ]}
        reveal={
          <>
            Only forks it has walked through have had their guess raised above 0. A turn into one of those looks like a
            gain; a turn toward an untried fork, still at 0, looks like a loss. So it digs into its first habits, and
            the critic never hears about the forks it stops visiting. That is bias, not noise: more walks don’t wash
            it out.
          </>
        }
      />

      <h2>Putting it to work</h2>
      <ul>
        <li>
          <strong>Let the critic learn faster than the actor.</strong> The actor is only as good as the verdicts it
          gets, so give the critic the bigger step, or a head start before the actor listens.
        </li>
        <li>
          <strong>Start the critic somewhere sensible.</strong> A guess of 0 for everything, when every reward is
          positive, makes the unknown look bad and the familiar look good.
        </li>
        <li>
          <strong>Reach for it when episodes are long or never end.</strong> It learns after every step, so it needs
          no end to wait for.
        </li>
        <li>
          <strong>Mix and match the halves.</strong> The critic can score actions instead of places, and the actor
          can be a network that names one action outright: that is <Link to="/learnings/ddpg">DDPG</Link>, next.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="A thermostat learns all year round: every 10 minutes it heats, cools or holds, and gets a comfort score. There is no end of an episode. Why use an actor–critic rather than REINFORCE?"
        options={[
          { label: 'REINFORCE has nothing to wait for', right: true },
          { label: 'REINFORCE can’t handle three actions' },
          { label: 'A critic removes all bias' },
          { label: 'A critic explores for it' },
        ]}
        reveal={
          <>
            REINFORCE’s credit is the return that followed, which is known only once an episode ends, and this one never
            does. A critic turns each 10 minutes into a verdict, comfort now plus the critic’s view of what comes next,
            minus what it expected, so it can learn as it goes. The critic adds some bias, not less; and exploring is
            still the actor’s chances’ job.
          </>
        }
      />
    </Article>
  )
}
