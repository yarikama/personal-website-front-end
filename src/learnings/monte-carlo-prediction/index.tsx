import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import { GUESS_GAMES, learnAll, STORY_AFTER, STORY_COUNT, STORY_GAMES, STORY_MORE, TRUE } from './model'
import Play from './Play'
import Story from './Story'

// The start square over the story's first three games: each game's count
// (every game starts there once), and the average after it
const START_COUNTS = [...STORY_GAMES, STORY_MORE[0]].map((game) => game.length - 1)
const START_AVERAGES = [STORY_GAMES.slice(0, 1), STORY_GAMES, [...STORY_GAMES, STORY_MORE[0]]].map((games) => learnAll(games)[1].mean)

export default function MonteCarloPrediction() {
  const final = STORY_AFTER[STORY_AFTER.length - 1]
  const start = final[1]
  const rare = final[2]
  return (
    <Article
      kicker="Reinforcement learning · Values"
      title="Play it out, then average"
      promise="If you can’t work out where each move leads, how can you tell what a position is worth?"
      takeaway={
        <>
          Play each episode to the end and move a state’s value toward the return that <em>actually followed</em> it:
          no model and no other state’s guess, but a wait until the end and many visits to every state.
        </>
      }
      sources={[
        {
          title: 'Reinforcement Learning: An Introduction',
          by: 'Richard S. Sutton and Andrew G. Barto, 2nd edition',
          part: 'Chapter 5, “Monte Carlo Methods”, §5.1 “Monte Carlo Prediction” and §5.2 “Monte Carlo Estimation of Action Values”',
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
        question="On a small snakes-and-ladders board, a game from the first square takes 2 turns at best and 20 or more at worst. You play and average the turns. How many games until your average is typically within half a turn of the true number?"
        options={[
          { label: 'About 5' },
          { label: 'About 15' },
          { label: `About ${GUESS_GAMES}`, right: true },
          { label: 'About 5,000' },
        ]}
        reveal={
          <>
            About {GUESS_GAMES}. One game’s count swings by about 4 turns either way, and an average of n games
            swings √n times less: 4.1 ÷ √{GUESS_GAMES} ≈ 0.5. That is for the first square, which every game starts on.
            A square you stand on in one game out of six needs six times as many games.
          </>
        }
      />

      <h2>Count the turns that were left</h2>

      <Steps
        say={[
          <>You’re playing snakes and ladders on a small board, and you wonder how many more turns a game takes from each square.</>,
          <>Instead of working it out from the odds of every roll, you just play a game and note each square you stand on.</>,
          <>
            Only at the finish can you count back: 1 turn was left from square 18, 2 from 12, and so on, back to 6 from
            the start. Square 7 came up twice, so it gets two counts.
          </>,
          <>Play again, and each square you stand on gets a new count. Each keeps the average of all its counts: the start square now says {START_AVERAGES[1]}.</>,
          <>
            After {STORY_COUNT} more games, the start square, stood on in every game, says {start.mean.toFixed(1)}; the
            truth is {TRUE[1].toFixed(1)}. Square 2, reached only by rolling a 1 first, has {rare.count} counts and still
            says {rare.mean.toFixed(1)}, against {TRUE[2].toFixed(1)}.
          </>,
          <>
            That’s the method. Each square is a <em>state</em>, the dice are the <em>policy</em>, the turns left are the{' '}
            <em>return</em>, and the average is the state’s <em>value</em>, V(s).
          </>,
        ]}
      >
        {(step) => <Story key={step} step={step} />}
      </Steps>

      <p>
        You knew the board’s rules all along, and could have worked the answer out from them, as on{' '}
        <Link to="/learnings/bellman-equation">a square is worth its neighbours</Link>. But that takes the odds of every
        move, and in most problems nobody has them, or there are far too many states to work through. Playing needs
        neither: only games, and the patience to finish them.
      </p>

      <h2>The one line of math</h2>
      <p>
        In words: <strong>new average = old average + (1 ÷ n) × (this game’s count − old average)</strong>. It is the{' '}
        <Link to="/learnings/exploration-and-exploitation">running average</Link> again, now aimed at the return: all
        that followed a visit, to the very end. The start square over the story’s first three games:
      </p>
      <Numbers
        items={START_COUNTS.map((count, game) => ({
          label: `Game ${game + 1}`,
          value: START_AVERAGES[game].toFixed(1),
          note: `${count} turns left`,
        }))}
      />
      <Clip
        src="monte-carlo-prediction/returns-from-the-end"
        label="A game of six turns drawn as six squares in a row, each with a question mark. At the finish, the turns left are counted back from the end: 1, 2, 3, 4, 5, 6. Then the update: V of s becomes V of s plus alpha times G minus V of s. With the start square in its second game: 6 plus one half times 5 minus 6 is 5.5."
        caption="No square’s count exists until the game is over: the return is built from the end backward. Then each square moves toward its own count."
      />
      <p>
        With a step α in place of 1 ÷ n, it reads V(s) ← V(s) + α[G − V(s)], where G is the return after the visit. A
        fixed α leans on recent games, which helps when the game itself changes. This is{' '}
        <strong>Monte Carlo prediction</strong>, named after the casino: it learns from chance, played out. Set it
        beside <Link to="/learnings/temporal-difference-learning">temporal-difference learning</Link>, which moves a
        guess toward the next guess at once. Monte Carlo waits for the end, and never uses another state’s guess.
      </p>

      <h2>Play it yourself</h2>
      <p>
        When a snake sends you back to a square you have stood on, that square gets two counts from one game.{' '}
        <strong>Every-visit</strong> Monte Carlo keeps both; <strong>first-visit</strong> keeps only the first. Both
        home in on the true values.
      </p>
      <Figure
        readable
        caption="Each game changes only the squares it stood on, outlined. The shade is how many counts a square has: the pale ones, like 2 and 6, wobble longest. Switch the count on the same games, then compare with the true values, worked out from the rules the averages never saw."
      >
        <Play />
      </Figure>

      <Predict
        kicker="Quick check"
        question="Your averages say square 11 takes 5.7 more turns and square 13 takes 4.5. You have stood on square 12 only twice, and both times needed 8 more turns. What does Monte Carlo say square 12 is worth?"
        options={[
          { label: 'About 5.1' },
          { label: '8', right: true },
          { label: 'Nothing yet' },
          { label: '5.7' },
        ]}
        reveal={
          <>
            8: the average of its own two counts. Each square learns only from the games that stood on it, and its
            neighbours’ numbers never enter. That keeps it honest, since no other guess can mislead it, but a square
            with two counts is as rough as two games.
          </>
        }
      />

      <h2>Making it work</h2>
      <ul>
        <li>
          <strong>Only for tasks that end.</strong> Nothing is learned until an episode is over, so long episodes mean
          long waits, and a task that never ends gives nothing to average.
        </li>
        <li>
          <strong>Visit everything, many times.</strong> Each state is its own little average. Start some episodes in
          rarely visited states, or <Link to="/learnings/monte-carlo-control">keep exploring</Link>, or those values
          stay rough however well their neighbours are known.
        </li>
        <li>
          <strong>To choose, average per move.</strong> Choosing with no model takes an average for each move in each
          state, Q(s, a), for the reason on <Link to="/learnings/monte-carlo-control">Average, switch, and keep
          trying</Link>; then every pair needs its own visits.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="Square 6 comes up in two games. In the first you stand on it twice, with 9 and then 4 turns left; in the second once, with 5 left. What do first-visit and every-visit averages say?"
        options={[
          { label: '7 and 6', right: true },
          { label: '6 and 7' },
          { label: '6 and 6' },
          { label: '9 and 4' },
        ]}
        reveal={
          <>
            First visit keeps one count per game, 9 and 5, so (9 + 5) ÷ 2 = 7. Every visit keeps all three, so (9 + 4 +
            5) ÷ 3 = 6. They differ on a few games and agree after many.
          </>
        }
      />
    </Article>
  )
}
