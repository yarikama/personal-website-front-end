import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import {
  BEST,
  BEST_LOSS,
  catchUp,
  DAYS,
  EVERY,
  FRIDGE,
  MONDAY,
  PAIRS,
  pairsFor,
  race,
  RUNS,
  SHELVES,
  shelvesFor,
  STORY_DAY,
  storyRuns,
  tried,
  TUESDAY,
} from './model'
import Race from './Race'
import Stall from './Stall'

const SIZES = [6, FRIDGE, 100]
const one = (lost: number) => lost.toFixed(1)
const two = (lost: number) => lost.toFixed(2)

export default function Afterstates() {
  const runs = storyRuns()
  const curves = race()
  const best = BEST.policy[0]
  const open = MONDAY.left + MONDAY.bought
  const triedBy = tried(runs.pairs.counts[STORY_DAY])
  const at = STORY_DAY / EVERY
  const caught = catchUp(STORY_DAY)

  return (
    <Article
      kicker="Reinforcement learning · Learning to act"
      title="Where your move leaves you"
      promise="When you know exactly what your move does, but not what the world will do next, what is worth keeping a score for?"
      takeaway={
        <>
          When a move’s immediate result is known, score the <em>afterstate</em>, where the move leaves you before the
          world answers. Every way of getting there shares that one score, so each experience teaches all of them.
        </>
      }
      sources={[
        {
          title: 'Reinforcement Learning: An Introduction',
          by: 'Richard S. Sutton and Andrew G. Barto, 2nd edition',
          part: 'Chapter 6, “Temporal-Difference Learning”, “Games, Afterstates, and Other Special Cases”; Chapter 1, “An Extended Example: Tic-Tac-Toe”',
          url: 'http://incompleteideas.net/book/the-book-2nd.html',
        },
        {
          title: 'Temporal Difference Learning and TD-Gammon',
          by: 'Gerald Tesauro, Communications of the ACM, 1995',
          part: 'Choosing a move by scoring the position each way of playing the dice would leave',
          url: 'https://dl.acm.org/doi/10.1145/203330.203343',
        },
        {
          title: 'Approximate Dynamic Programming: Solving the Curses of Dimensionality',
          by: 'Warren B. Powell, 2nd edition, Wiley, 2011',
          part: 'The post-decision state, the same idea in operations research',
        },
      ]}
    >
      <Predict
        question={`On Monday you have ${MONDAY.left} bottle of juice left and buy ${MONDAY.bought}. On Tuesday you have ${TUESDAY.left} left and buy ${TUESDAY.bought}. Your notebook keeps a score for each pair of bottles left and bottles bought. How much does Monday’s trade teach the score you’ll use on Tuesday?`}
        options={[
          { label: `All of it: both open with ${open}` },
          { label: 'About half' },
          { label: 'Nothing at all', right: true },
          { label: 'Only if it rains' },
        ]}
        reveal={
          <>
            Nothing. Monday’s pair and Tuesday’s pair are different lines, and each day writes only its own. Yet if you
            picked “all of it”, your instinct is sound: both days open with the same {open} bottles, and the day ahead
            can’t tell how they got there. A notebook built on that instinct learns about{' '}
            {Math.round(catchUp(STORY_DAY) / STORY_DAY)} times as fast at this stall. That is this page.
          </>
        }
      />

      <h2>Two mornings, one shelf</h2>

      <Steps
        readable
        say={[
          <>
            You sell fresh juice at a market stall, from a fridge with room for {FRIDGE} bottles. On Monday morning,{' '}
            {MONDAY.left} is left from yesterday.
          </>,
          <>
            You know exactly what topping up does, {MONDAY.left} left and {MONDAY.bought} bought makes {open}, but not
            what the day will do: how many people want a bottle, and how many leftovers go off overnight.
          </>,
          <>
            On Tuesday you have {TUESDAY.left} left and buy {TUESDAY.bought}: a different morning, a different choice,
            and again you open with {open}.
          </>,
          <>
            On Monday {MONDAY.wanted} people want a bottle and {MONDAY.missed} go without. A notebook with a line for
            each pair writes that into Monday’s line alone; Tuesday’s line still knows nothing.
          </>,
          <>
            The day can’t tell how the {open} got there, though. Keep one score for each shelf you could open with, and
            Monday’s lesson already counts for Tuesday’s choice.
          </>,
          <>
            After {STORY_DAY} days, the pair notebook has tried {triedBy} of its {PAIRS} lines and its picks (the dots)
            are all over the place. The shelf notebook has tried all {SHELVES}, and already tops up to {best}, the best
            there is.
          </>,
          <>
            The bottles left are the state s and what you buy is the action a, so the pair notebook is Q(s, a). The
            shelf you open with, after your move and before the day answers it, is an <strong>afterstate</strong>.
          </>,
        ]}
      >
        {(step) => <Stall key={step} step={step} />}
      </Steps>

      <h2>Score where your move leaves you</h2>
      <p>
        On <Link to="/learnings/monte-carlo-control">Average, switch, and keep trying</Link>, a score for each square
        wasn’t enough: without the rules you couldn’t tell where each move would take you, so you kept a score for every
        move on every square instead. At the stall you know half the rules. The day is a mystery, but where your choice leaves the
        fridge is plain arithmetic. So split each step in two, the part you know and the part you don’t, and learn only
        the second.
      </p>
      <p>
        In words: <strong>to choose, work out the afterstate each move would give you and take the move whose afterstate
        scores best; once the world has answered, move that afterstate’s score toward what it cost plus the best
        afterstate you can reach next.</strong> In symbols, you pick the a that makes V(after(s, a)) largest, and after
        the day you update V(after) ← V(after) + α × (r + γ × best V(after′) − V(after)): the same{' '}
        <Link to="/learnings/temporal-difference-learning">temporal-difference</Link> update as ever, aimed at a
        different thing.
      </p>
      <p>How many scores each notebook needs, for fridges of three sizes:</p>
      <Numbers
        items={SIZES.map((size) => ({
          label: `${size} bottles`,
          value: (
            <>
              {pairsFor(size).toLocaleString('en')} <span className="text-zinc-400">vs</span> {shelvesFor(size)}
            </>
          ),
          note: 'pairs vs shelves',
        }))}
      />
      <p>
        The pairs grow with the square of the fridge, since every amount left meets every amount you could open with.
        The shelves grow only with the fridge itself. Operations researchers, who use the same trick for stock and
        fleets, call the afterstate the <em>post-decision state</em>.
      </p>

      <h2>Every way there shares the lesson</h2>
      <p>
        Fewer scores is half the gain. The other half is where experience goes. A morning that opens with {best} teaches
        the score for {best}, whether you had none left or six. Both notebooks learn from one day at a time, so the
        shelf notebook’s scores get, on average, {PAIRS / SHELVES} times as many lessons each.
      </p>
      <p>
        Here are {RUNS} stallholders of each kind, {DAYS} days each. Both stock a random amount one day in ten, and both
        learn the same way, toward the day’s losses plus the best score on offer tomorrow, as{' '}
        <Link to="/learnings/q-learning">Q-learning</Link> does. Every score starts at 0, which is{' '}
        <Link to="/learnings/optimistic-initial-values">hopeful</Link> when a day can only lose bottles, so each untried amount gets its turn.
      </p>
      <Figure
        readable
        caption={
          <>
            The lines are what each kind would lose a day if it stopped trying random amounts, averaged over {RUNS}{' '}
            of each; the dashed line is the best way to stock, topping up to {best}, which loses {two(BEST_LOSS)}. Above
            are one notebook of each kind on the day shown. A cell darkens as it learns, and the shelf notebook darkens a
            whole column at a time.
          </>
        }
      >
        <Race />
      </Figure>
      <p>
        After {STORY_DAY} days, the shelf notebooks lose about {one(curves.shelf[at])} bottle a day, the pair notebooks
        about {one(curves.pairs[at])}. The pair notebooks need about {caught} days to do as well, {Math.round(caught / STORY_DAY)}{' '}
        times as long, and even after {DAYS} they still lose a little more: {two(curves.pairs.at(-1)!)} a day to{' '}
        {two(curves.shelf.at(-1)!)}.
      </p>

      <h2>Still the same loop</h2>
      <p>
        Nothing else about learning changes. The scores are judged against the way you stock, and the way you stock
        follows the scores: the two pulls of <Link to="/learnings/generalized-policy-iteration">generalized policy
        iteration</Link>, with a score per afterstate where there used to be a score per move. You still have to keep
        trying other amounts, and you still choose how to count those tries. The stallholders above aim at the best
        shelf for tomorrow, whatever they will really stock, which is off-policy, like Q-learning. Aim at the shelf you
        will really pick, random days included, and you have the on-policy version, like{' '}
        <Link to="/learnings/sarsa">Sarsa</Link>.
      </p>

      <h2>You’ve met one already</h2>
      <p>
        Think back to the tic-tac-toe player on <Link to="/learnings/temporal-difference-learning">Temporal-difference
        learning</Link> and <Link to="/learnings/learning-from-every-move">Learning from every move</Link>. It kept a
        guess for each board as it stood just after its own move, before the opponent replied, and it played the move
        whose board it liked best. That was an afterstate learner all along. Two different positions and moves that
        left the same board shared one guess, which is part of why it learned so fast. TD-Gammon played backgammon the
        same way: for each way of playing its dice, it scored the position that would result.
      </p>

      <Predict
        kicker="Quick check"
        question="Afterstates need the immediate result of your move to be known. Which of these can’t use them as they are?"
        options={[
          { label: 'Choosing a chess move' },
          { label: 'Sending a job to a server' },
          { label: 'Ordering stock for a shop' },
          { label: 'Kicking a ball in a gusty wind', right: true },
        ]}
        reveal={
          <>
            The kick. Where the ball ends up is already uncertain the moment you kick it, so there is no fixed “after” to
            score. A chess move puts a piece exactly where you say, a job lands on the server you picked, and an order
            fills the shelf by a known amount: the uncertainty only starts afterwards.
          </>
        }
      />

      <h2>Where it fits</h2>
      <ul>
        <li>
          <strong>Look for the half you can write down.</strong> Placing a piece, assigning a job, seating a guest,
          ordering stock: if you can say exactly where the move leaves things before anything random happens, score
          that.
        </li>
        <li>
          <strong>Make the afterstate hold everything the future needs.</strong> It must decide what happens next on its
          own. If bottles bought today arrived only tomorrow, “{open} on the shelf” would no longer be the whole story.
        </li>
        <li>
          <strong>Keep Q(s, a) when the move itself is a gamble.</strong> If the move’s own result is uncertain, there
          is no single afterstate to score, and a score per move is the honest choice.
        </li>
        <li>
          <strong>Use it with any learner.</strong> Off-policy or on-policy, a table or a network: TD-Gammon scored its
          afterstates with a neural network, since backgammon has far too many for a table. That kind of network is{' '}
          <Link to="/learnings/deep-q-networks">next</Link>.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="A scheduler sends each incoming job to one of four servers. New jobs and finished jobs don’t care how the servers got busy. What should an afterstate learner keep a score for?"
        options={[
          { label: 'Each pair of situation and server picked' },
          { label: 'Which servers are busy before the job arrives' },
          { label: 'Which servers are busy right after the job is placed', right: true },
          { label: 'How long each job will take' },
        ]}
        reveal={
          <>
            Which servers are busy right after the job is placed. That is where the scheduler’s move leaves things, before
            the world adds or finishes jobs. Many different situations and choices end in the same busy pattern, and they
            all share its score. The pattern before the job arrives is the ordinary state, and scoring pairs is what an
            afterstate learner avoids.
          </>
        }
      />
    </Article>
  )
}
