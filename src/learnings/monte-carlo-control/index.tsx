import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Figure, Numbers } from '../../components/explain/figure'
import { state, STEP } from '../../components/explain/ladders'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Learner from './Learner'
import { BEST, BEST_TURNS, bestFor, differ, fromStart, GAMES, list, RANDOM, ROLLING, stepsOn, STORY } from './model'
import Story from './Story'

const turns = (n: number) => n.toFixed(1)
const count = (n: number) => n.toLocaleString('en-US')
const percent = (p: number) => `${Math.round(p * 100)}%`

// The square the worked numbers are about: a step from it reaches a ladder
const FOCUS = 7
// The most random moves the play figure offers
const WILD = 1 / 3

export default function MonteCarloControl() {
  const { greedy, starts, random } = STORY()
  const first = greedy.games[0].length
  const learned = starts.plans[GAMES]
  const found = random.plans[GAMES]
  const [roll, step] = starts.tables[GAMES][state(FOCUS)]
  const wildPlan = bestFor(WILD)
  const wildDiffer = differ(wildPlan, BEST)
  const epsilon = RANDOM.epsilon

  return (
    <Article
      kicker="Reinforcement learning · Learning to act"
      title="Average, switch, and keep trying"
      promise="If you learn how to play only from games you finish, always taking the move that has done best so far, will you find the best way to play?"
      takeaway={
        <>
          Average what followed each move in each state, switch to the better average after every episode, and{' '}
          <em>keep every move in play</em>, by random starts or random moves, or the moves you never make never get the
          chance to prove you wrong.
        </>
      }
      sources={[
        {
          title: 'Reinforcement Learning: An Introduction',
          by: 'Richard S. Sutton and Andrew G. Barto, 2nd edition',
          part: 'Chapter 5, “Monte Carlo Methods”, §5.3 “Monte Carlo Control” and §5.4 “Monte Carlo Control without Exploring Starts”',
          url: 'http://incompleteideas.net/book/the-book-2nd.html',
        },
        {
          title: 'COMP 442/552: Reinforcement Learning',
          by: 'Vaibhav Unhelkar, Rice University, Fall 2026',
          part: 'Lectures “From Planning to Learning” and “Policy Evaluation using Data”',
        },
      ]}
    >
      <Predict
        question={`On the roll-or-step board, rolling everywhere takes ${turns(ROLLING)} turns a game and the best play ${turns(BEST_TURNS)}. You start out rolling everywhere, keep the average turns that followed each move on each square, and after every game switch each square to the move with the better average (a move you have never made has no average yet). Where are you after ${count(GAMES)} games?`}
        options={[
          { label: `At the best play, ${turns(BEST_TURNS)} turns` },
          { label: 'About 8 turns, partway there' },
          { label: `Still at ${turns(ROLLING)}`, right: true },
          { label: `Worse than ${turns(ROLLING)}` },
        ]}
        reveal={
          <>
            Still at {turns(ROLLING)}. A square’s step average fills only when you step there, and you step only where
            the step average is better. Rolling never loses to a blank, so {count(GAMES)} games teach you everything
            about rolling and nothing at all about stepping.
          </>
        }
      />

      <h2>A board under a cloth</h2>

      <Steps
        readable
        say={[
          <>
            It’s the board from <Link to="/learnings/policy-iteration">Better, then best</Link>, where each turn you roll
            or step one square, but the ladders and snakes are covered: you find out where a move leads only by making
            it.
          </>,
          <>
            Knowing a square takes 8 more turns wouldn’t tell you whether to roll or step there, so each square keeps
            two averages: the turns that followed a roll (the die) and those that followed a step (+1).
          </>,
          <>
            You play by habit, rolling everywhere. This game took {first} turns, and at the finish each roll you made
            gets the turns that followed it.
          </>,
          <>
            After every game, each square switches to its better average. But you never step, so no step ever gets an
            average: after {count(GAMES)} games you still roll everywhere, {turns(fromStart(greedy.plans[GAMES]))} turns
            a game.
          </>,
          <>
            So start each game on a random square, with a random first move. Now every move gets made, and after{' '}
            {count(GAMES)} games the plan steps on squares {list(stepsOn(learned))}: {turns(fromStart(learned))} turns,
            the best there is.
          </>,
          <>
            If you can’t choose where games start, make a random move one turn in {Math.round(1 / epsilon)} instead.
            The plan finds the steps from square 1 too, {turns(fromStart(found))} turns, but while you keep the random
            moves a game takes {turns(fromStart(found, epsilon))}.
          </>,
          <>
            Lift the cloth: every step leads to the foot of a ladder. Each square is a <strong>state</strong>, each
            move an <strong>action</strong>, each average its <strong>action value</strong> Q(s, a), and averaging then
            switching, game after game, is <strong>Monte Carlo control</strong>.
          </>,
        ]}
      >
        {(step) => <Story key={step} step={step} />}
      </Steps>

      <p>
        Why two averages and not one? On <Link to="/learnings/monte-carlo-prediction">Play it out, then average</Link>,
        one average per square was enough, because nothing had to be chosen. To pick a move by a square’s value alone,
        you would compare where each move lands, and that needs the board’s rules, the very thing the cloth hides. An
        average per move has already counted where the move went, so choosing is just taking the smaller number.
      </p>

      <h2>The one line of math</h2>
      <p>
        In words: after each game, <strong>every move you made moves its average toward the turns that followed it</strong>
        , then <strong>every square takes the move with the better average</strong>. Counting each turn as a reward of
        −1, Q(s, a) is minus those turns, and the second half is the greedy choice, π(s) = argmax<sub>a</sub> Q(s, a).
        Square {FOCUS} after the {count(GAMES)} games with random starts:
      </p>
      <Numbers
        items={[
          { label: `Square ${FOCUS}: roll`, value: turns(-roll.mean), note: `${roll.count} games` },
          { label: 'Step', value: turns(-step.mean), note: `${step.count} games` },
          { label: 'The plan', value: learned[state(FOCUS)] === STEP ? 'step' : 'roll', note: 'fewer turns' },
        ]}
      />
      <p>
        The averaging is the running average from Monte Carlo prediction; what is new is that the plan changes as the
        averages do. You never judge one plan in full before improving it: each game nudges the averages, and the plan
        follows at once. Judging and improving take turns at the grain of single episodes, which makes this{' '}
        <Link to="/learnings/generalized-policy-iteration">generalized policy iteration</Link>.{' '}
        <Link to="/learnings/sarsa">Sarsa</Link> runs the same loop, but corrects a score after every step from the next
        score, where Monte Carlo waits for the game to end and uses only what really happened.
      </p>

      <h2>Two ways to keep trying</h2>
      <p>
        Greedy play is the trouble. A plan that always makes the same move on a square only ever learns about that move,
        so a better one can stay unseen for ever. Something has to keep the other moves in play.
      </p>
      <p>
        <strong>Exploring starts</strong> begin each episode from a random state with a random first action, so every
        pair gets games however the plan plays. It is easy in a simulation and rarely possible in the world: you can’t
        start a real robot halfway through a fall.
      </p>
      <p>
        <strong>ε-greedy</strong> play keeps the starts as they are and{' '}
        <Link to="/learnings/exploration-and-exploitation">makes a random move a fraction ε of the time</Link>, so every
        action always has some chance. With two moves and ε = {epsilon}:
      </p>
      <Numbers
        items={[
          { label: 'Random move', value: percent(epsilon), note: 'either move' },
          { label: 'Better move', value: percent(1 - epsilon / 2), note: `${percent(1 - epsilon)} + ${percent(epsilon / 2)}` },
          { label: 'The other', value: percent(epsilon / 2), note: 'never zero' },
        ]}
      />
      <p>
        A plan that never lets any action’s chance fall to zero is called <strong>ε-soft</strong>, and switching to the
        ε-greedy version of the better average never makes an ε-soft plan worse: improvement still works.
      </p>

      <h2>The price of exploring</h2>
      <p>
        The averages describe the games you really play, random moves included. So what ε-greedy control finds is the{' '}
        <em>best ε-soft plan</em>: the best way to play for someone who will keep making random moves. On this board,
        the best play with one random move in {Math.round(1 / epsilon)} still takes {turns(fromStart(BEST, epsilon))}{' '}
        turns, against {turns(BEST_TURNS)} without. At one in {Math.round(1 / WILD)}, the best plan itself changes: it
        rolls on square {list(wildDiffer)}, if only by a hair: the steps from there need three in a row to reach the
        ladder, and random moves often break the run. Shrink ε as you learn, and the
        price shrinks with it.
      </p>
      <p>
        The other way out is to explore with one plan while learning about another, the greedy one. That is{' '}
        <strong>off-policy</strong> learning, and doing it from whole episodes takes a correction for the difference
        between the two plans: <Link to="/learnings/importance-sampling">importance sampling</Link>, the next page.
      </p>

      <h2>Learn it yourself</h2>
      <p>
        The board again, uncovered for you, but not for the learner, learning from scratch. Each game starts where you
        choose, with random moves as often as you choose. It plays {count(300)} games by itself.
      </p>
      <Figure
        readable
        caption="Dashed squares are not yet on the best move. Starting on square 1 with no random moves, the steps stay blank and the plan never leaves always rolling. Turn on random starts or random moves and the steps fill in; the green line, what the plan takes from square 1, falls toward the best play, while the grey one, the plan with its random moves, stays above it."
      >
        <Learner />
      </Figure>

      <Predict
        kicker="Quick check"
        question={`You learn with one random move in ${Math.round(1 / epsilon)}, and the averages have settled. What does each square’s step average now tell you?`}
        options={[
          { label: 'The turns after a step, if you then played perfectly' },
          { label: `The turns after a step, if you keep making one random move in ${Math.round(1 / epsilon)}`, right: true },
          { label: 'The turns after a step, if you then rolled everywhere' },
          { label: 'Nothing, until you stop the random moves' },
        ]}
        reveal={
          <>
            The averages come from the games you play, and those include your random moves, so they describe the
            exploring plan. That is why ε-greedy control finds the best plan for someone who keeps exploring, which can
            differ from the best plan, and why its games cost more than the best play.
          </>
        }
      />

      <h2>Making it work</h2>
      <ul>
        <li>
          <strong>Never let a move go untried.</strong> Pure greedy play only learns about the moves it already makes.
          Random starts or random moves keep the others in play.
        </li>
        <li>
          <strong>Random starts where you can, random moves where you can’t.</strong> A simulator can drop you anywhere;
          the real world starts where it starts.
        </li>
        <li>
          <strong>Make sure games end.</strong> Nothing is learned until an episode finishes. A plan that steps on both
          18 and 27 here would go round a snake for ever, so cap long episodes, or use a method that learns during them,
          like Sarsa.
        </li>
        <li>
          <strong>Explore less over time.</strong> Random moves found the steps, then kept costing turns. Turning ε down
          slowly, never to zero too soon, lets the plan settle on the truly best play.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="A smart thermostat learns when to heat a real house. Each day is an episode that starts from whatever the night left, and its plan so far has never heated before 6 a.m. What keeps it learning whether it should?"
        options={[
          { label: 'Keep following its best plan: the data will show it' },
          { label: 'Start each day from a random temperature and setting' },
          { label: 'Now and then, pick a setting at random', right: true },
          { label: 'Average more days before changing the plan' },
        ]}
        reveal={
          <>
            Random settings now and then. Following its plan, it never heats early, so it never learns what early
            heating is worth, however many days it averages. It can’t choose how a real morning starts, so random starts
            are out; an occasional random setting keeps every choice in play, at the price of a few odd mornings.
          </>
        }
      />
    </Article>
  )
}
