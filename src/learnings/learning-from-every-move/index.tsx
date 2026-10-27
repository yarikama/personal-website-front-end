import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import { BLUNDER, chance, GAME, race } from './model'
import OneGame from './OneGame'
import RaceChart from './RaceChart'

// The figure's run: chosen to land near what twelve runs average (see
// model.test.ts), about 17 losses in 100 for the result learner after
// 1,000 games and about 4 for the value learner, from an even start
const SEED = 5
const BUDGET = 2000

const percent = (share: number) => `${Math.round(share * 100)}%`

export default function LearningFromEveryMove() {
  const run = useMemo(() => race(SEED, BUDGET), [])
  const before = percent(chance(GAME[BLUNDER - 1]))

  return (
    <Article
      kicker="Reinforcement learning · Values"
      title="Learning from every move"
      promise="If you can just keep the strategies that win, why bother scoring every position?"
      takeaway={
        <>
          Learning only from the final score credits every move alike. A <em>value function</em> scores each
          position, so every move teaches something.
        </>
      }
      sources={[
        {
          title: 'Reinforcement Learning: An Introduction',
          by: 'Richard S. Sutton and Andrew G. Barto, 2nd edition',
          part: 'Chapter 1, “Limitations and Scope” and “An Extended Example: Tic-Tac-Toe”',
          url: 'http://incompleteideas.net/book/the-book-2nd.html',
        },
      ]}
    >
      <Predict
        question="Two players each get 1,000 games of tic-tac-toe to improve. One keeps whichever strategy won more games. The other scores every position as it plays. Who plays better afterwards?"
        options={[
          { label: 'The one keeping winners' },
          { label: 'About the same' },
          { label: 'The one scoring positions', right: true },
          { label: 'Neither improves' },
        ]}
        reveal={
          <>
            The one scoring positions, by a lot: it loses about 4 games in 100, the other about 17. Both saw the same
            number of games; one learned far more from each. Here is one game that shows why.
          </>
        }
      />

      <h2>A win with a blunder in it</h2>

      <Steps
        say={[
          <>You play a game of tic-tac-toe, as X, and you win.</>,
          <>But your third move left your opponent a winning square, and they missed it.</>,
          <>
            If you learn only from the result, every move gets the same credit: you won, so keep all of it, the blunder
            too.
          </>,
          <>Worse, your strategy also says what to do in positions this game never reached, and those get the credit too.</>,
          <>
            Score each position as you go instead, and the blunder stands out: your chance of winning fell from{' '}
            {before} to nothing the moment you made it.
          </>,
          <>
            Learning from final results alone is what <em>evolutionary methods</em> do. Scoring every position is
            learning a <em>value function</em>.
          </>,
        ]}
      >
        {(step) => <OneGame key={step} step={step} />}
      </Steps>

      <h2>Why scoring wins</h2>
      <p>
        A player who learns only from results treats a strategy as one thing. It changes a few moves, plays some games
        with each version, counts the wins, and keeps whichever won more. Nothing is learned <em>during</em> a game. It is
        how evolution works: animals that do well leave more young, but no animal learns from its own life. Hence the
        name, <strong>evolutionary methods</strong>.
      </p>
      <p>
        The trouble is how little a result says. Fifty games give fifty numbers about a whole strategy, and a lucky
        streak looks just like a better strategy. Which move made the difference is never known, so a good change can be thrown
        out along with a bad one.
      </p>
      <p>
        A player that learns a <strong>value function</strong> keeps a score for every position: its chance of winning
        from there. After each move, it nudges the score of the position it left toward the score of the one it reached,
        as in <Link to="/learnings/temporal-difference-learning">temporal-difference learning</Link>. A game of four moves
        gives four lessons, each about one position, and the blunder gets the blame it deserves.
      </p>
      <p>Against the same opponent, with the same number of games, averaged over twelve runs:</p>
      <Numbers
        items={[
          { label: 'Before learning', value: '27', note: 'lost of 100' },
          { label: 'Results only', value: '17', note: 'lost of 100 after 1,000 games' },
          { label: 'Value function', value: '4', note: 'lost of 100 after 1,000 games' },
        ]}
      />

      <h2>Watch them learn</h2>
      <p>
        Both learners start from a random strategy and play the same opponent, which takes a win when it sees one and
        otherwise plays anywhere. Every 50 games, each plays 300 more without trying anything new, to measure how well it
        plays.
      </p>
      <Figure caption="The value learner drops to a handful of losses in 100 within a few hundred games. The result learner improves, then barely moves: with only win counts to go on, telling a better strategy from a lucky one takes far more games than it gets.">
        <RaceChart run={run} />
      </Figure>

      <Predict
        kicker="Quick check"
        question="Your strategy won 7 of its last 10 games, up from 5. Which of your moves made the difference?"
        options={[
          { label: 'The first move' },
          { label: 'The last move' },
          { label: 'All of them equally' },
          { label: 'The results can’t say', right: true },
        ]}
        reveal={
          <>
            A count of wins is one number for the whole strategy. It can’t point at a move, and over ten games it may
            just be luck. Scores per position are what tell moves apart.
          </>
        }
      />

      <h2>When results alone are enough</h2>
      <ul>
        <li>
          <strong>There are only a few strategies to try.</strong> If you can test every one of them, you don’t need to
          know why the best one wins.
        </li>
        <li>
          <strong>You can’t see the position clearly.</strong> A score per position is only as good as your view of the
          position; a whole strategy can still be judged by how its games end.
        </li>
        <li>
          <strong>Games are cheap.</strong> With a fast simulator and millions of games to spare, wasting most of what
          each game says matters less.
        </li>
        <li>
          <strong>In between: policy gradient methods.</strong> They also tune a strategy directly, but adjust it while it
          plays, using each step rather than only how the game ended.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="A basketball team wins 101 to 99, though one play gave away an easy basket. What does a coach who only looks at final scores decide about that play?"
        options={[
          { label: 'Drop it: it gave away points' },
          { label: 'Keep it: the team won', right: true },
          { label: 'Practise it more than others' },
          { label: 'Review that play alone' },
        ]}
        reveal={
          <>
            Keep it, along with everything else the team did that night: the win is all that coach looks at. A coach
            who reviews each play, asking whether it made scoring more or less likely, would catch it at once.
          </>
        }
      />
    </Article>
  )
}
