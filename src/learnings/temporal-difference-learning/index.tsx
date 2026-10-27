import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Backup from './Backup'
import { Drive } from './Drive'
import { nudge } from './model'
import Trainer from './Trainer'

export default function TemporalDifferenceLearning() {
  return (
    <Article
      kicker="Reinforcement learning · Values"
      title="Temporal-difference learning"
      promise="How can you tell whether a move was good before the game is over?"
      takeaway={
        <>
          Move each guess a step toward the <em>next</em> guess. Then you learn while the game is still going, not
          only once it ends.
        </>
      }
      sources={[
        {
          title: 'Reinforcement Learning: An Introduction',
          by: 'Richard S. Sutton and Andrew G. Barto, 2nd edition',
          part: 'Chapter 1, “An Extended Example: Tic-Tac-Toe”',
          url: 'http://incompleteideas.net/book/the-book-2nd.html',
        },
        {
          title: 'Learning to Predict by the Methods of Temporal Differences',
          by: 'Richard S. Sutton, Machine Learning, 1988',
          part: 'Where the method was first set out',
          url: 'https://link.springer.com/article/10.1007/BF00115009',
        },
        {
          title: 'Temporal Difference Learning and TD-Gammon',
          by: 'Gerald Tesauro, Communications of the ACM, 1995',
          part: 'The same rule, learning backgammon',
          url: 'https://dl.acm.org/doi/10.1145/203330.203343',
        },
      ]}
    >
      <Predict
        question="You expect the drive to the airport to take 40 minutes. Ten minutes in, you hit a jam, and now you expect 60 in total. When should you fix your first guess?"
        options={[
          { label: 'Only once I arrive' },
          { label: 'Right now', right: true },
          { label: 'Never, it’s one trip' },
          { label: 'Only if I miss the flight' },
        ]}
        reveal={
          <>
            Right now. Your new guess has seen the jam and your old one hadn’t, so it already knows more. Waiting until
            you arrive throws that away. Learning from your next guess, without waiting for the final answer, is the
            whole idea of this page.
          </>
        }
      />

      <h2>A guess corrected by a guess</h2>

      <Steps
        say={[
          <>You set off for the airport and guess the whole trip will take 40 minutes.</>,
          <>Ten minutes in, you hit a jam. Now you think the trip will take 60.</>,
          <>You don’t need to arrive to see that 40 was too low. The jam already told you.</>,
          <>So you move the old guess part of the way toward the new one, here halfway, and keep driving.</>,
          <>
            That’s the method. Each moment is a <em>state</em>, your guess there is its <em>value</em>, and the next
            moment’s guess corrects the one before it.
          </>,
        ]}
      >
        {(step) => <Drive key={step} step={step} />}
      </Steps>

      <p>
        In a game, a guess is your chance of winning from this position. You never wait for the final whistle to
        learn. Every move gives you a slightly better-informed guess, and that guess teaches the one before it.
      </p>

      <h2>The one line of math</h2>
      <p>
        In words: <strong>new guess = old guess + step × (next guess − old guess)</strong>. The part in brackets is
        how surprised you are. The step, written α (alpha), is how much of that surprise you act on.
      </p>

      <Clip
        src="temporal-difference-learning/td-update"
        label="The rule written in words, then in symbols: V of s becomes V of s plus alpha times V of s-prime minus V of s. With 0.5, 0.9 and a step of 0.1, the old guess moves from 0.5 to 0.54 on a line from 0 to 1."
        caption="The bracket is the surprise: how much better the next position looks than this one did. A step of 0.1 acts on a tenth of it."
      />

      <p>The same surprise, with three step sizes, for a position you guessed at 0.5 when the next one looks like 0.9:</p>
      <Numbers
        items={[0.1, 0.5, 1].map((step) => ({
          label: `α = ${step}`,
          value: nudge(0.5, 0.9, step).toFixed(2),
          note: step === 1 ? 'forgets the old guess' : step === 0.1 ? 'a careful nudge' : 'halfway',
        }))}
      />
      <p>
        This is <strong>temporal-difference learning</strong>, or TD learning. The name is the bracket: a difference
        between two guesses made at different times. Rearranged, it says something you already do:
      </p>

      <Clip
        src="temporal-difference-learning/td-blend"
        label="Opening the bracket gives V of s becomes one minus alpha times V of s, plus alpha times V of s-prime: keep 90 percent of your guess and take 10 percent of the next. Beside it, the running average Q becomes Q plus one over n times R minus Q has the same shape; one aims at the next guess, the other at what happened."
        caption="Keep most of what you thought, take a little from what you see next. It is the running average from exploring restaurants, aimed at a guess instead of at what happened."
      />
      <p>
        That last line connects this page to <Link to="/learnings/exploration-and-exploitation">keeping a running
        average</Link>. An average moves toward what actually happened. TD moves toward a guess that is one step
        closer to the end.
      </p>

      <h2>How a win travels backward</h2>
      <p>
        Here is one winning game of tic-tac-toe, played again and again. Every position starts at a guess of 0.5, and
        after each move the position before it is nudged halfway toward it:
      </p>
      <Figure caption="After the first game, only the last position knows the game can be won. Each game after that, the news reaches one move further back, until the opening move knows it leads to a win.">
        <Backup />
      </Figure>
      <p>
        Nobody told the opening move that it was good. The win at the end flowed back to it, one guess at a time,
        through the positions in between.
      </p>

      <h2>Watch it learn tic-tac-toe</h2>
      <p>
        Now the real thing. The learner keeps a table with one guess for every board it has seen, all starting at
        0.5. It usually plays the move whose board has the best guess. One time in ten it plays at random, to{' '}
        <Link to="/learnings/exploration-and-exploitation">explore</Link>. After every move, it nudges its last guess
        toward the new one. A win counts as 1, and a loss or a draw as 0.
      </p>
      <p>
        Its opponent takes a win when it has one and blocks yours when it must. Beyond that it plays anywhere. The
        only way to beat it is to set up two threats at once, and nobody tells the learner that.
      </p>
      <Figure caption="The line is how often it won, in blocks of 100 games, still making a random move one time in ten. “Playing its best” turns those off. The grid is what it now thinks of each first move.">
        <Trainer />
      </Figure>
      <p>
        Before it trains, it wins about 1 game in 6. After 3,000 games, playing its best, it wins about 9 in 10, and
        it has settled on a corner as its first move. It got there without a model of the opponent and without
        searching ahead: only guesses, corrected by later guesses.
      </p>

      <Predict
        kicker="Quick check"
        question="After a move, the next guess minus the old guess is positive. What does that tell the learner?"
        options={[
          { label: 'The move was a mistake' },
          { label: 'The old position was better than it thought', right: true },
          { label: 'The game is over' },
          { label: 'It should explore more' },
        ]}
        reveal={
          <>
            The position it moved to looks better than it expected, so the old position, which led there, was worth
            more than it thought. Its guess goes up. A negative surprise brings it down.
          </>
        }
      />

      <h2>Making it work</h2>
      <ul>
        <li>
          <strong>Pick the step with care.</strong> A big step lets one lucky game swing a guess; a small one is
          steadier but takes longer to get there. Shrinking the step over time lets the guesses settle on the true
          chances of winning.
        </li>
        <li>
          <strong>Keep exploring.</strong> Positions the learner never visits never get better guesses, so a few
          random moves are the cost of finding better ones.
        </li>
        <li>
          <strong>Generalize when there are too many positions.</strong> Backgammon has about 10<sup>20</sup>{' '}
          positions, far too many for a table. Gerald Tesauro’s TD-Gammon used this same rule with a neural network
          that guesses from similar positions, and it learned to play at the level of the best humans.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="You guessed your commute takes 30 minutes. Ten minutes in, you now expect 35 in total. With a step of 0.5, what is your new guess for the trip as seen from the start?"
        options={[{ label: '30' }, { label: '32.5', right: true }, { label: '35' }, { label: '25' }]}
        reveal={
          <>
            30 + 0.5 × (35 − 30) = 32.5. The surprise is 5 minutes, and a step of 0.5 acts on half of it. A step of 1
            would have jumped straight to 35.
          </>
        }
      />
    </Article>
  )
}
