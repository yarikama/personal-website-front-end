import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import Board from '../../components/explain/Board'
import { Clip } from '../../components/explain/Clip'
import { Choice, Controls, Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Walk from '../../components/explain/Walk'
import Best from './Best'
import { best, bestMoves, GAMMA, GAMMAS, headsForB, loop, signed, SIZES, spinnerA, SQUARE, story, WORLD } from './model'

export default function OptimalPolicies() {
  const visits = useMemo(() => story(), [])
  const values = best()
  const a = signed(values[SQUARE.a])
  const a_ = signed(values[SQUARE.a_])
  const above = signed(values[WORLD.at({ x: 1, y: 3 })])
  const looped = signed(loop(10, 5, GAMMA))
  const towardB = { low: headsForB(0.5).length, mid: headsForB(0.9).length }

  const [gamma, setGamma] = useState<(typeof GAMMAS)[number]>(GAMMA)
  const [square, setSquare] = useState(SQUARE.a_)

  return (
    <Article
      kicker="Reinforcement learning · Markov decision processes"
      title="The best from here"
      promise="If you knew what every place is worth when played perfectly, how far ahead would you still have to think?"
      takeaway={
        <>
          The best values obey the same one-step rule with the <em>best</em> move in place of the average, and once you
          have them, looking one step ahead is all the planning you need.
        </>
      }
      sources={[
        {
          title: 'Reinforcement Learning: An Introduction',
          by: 'Richard S. Sutton and Andrew G. Barto, 2nd edition',
          part: 'Chapter 3, “Finite Markov Decision Processes”, §3.6 “Optimal Policies and Optimal Value Functions” and §3.7 “Optimality and Approximation”',
          url: 'http://incompleteideas.net/book/the-book-2nd.html',
        },
      ]}
    >
      <Predict
        question={`Back to the board from the last page, where leaving the gold square A pays 10 and drops you on A′ at the bottom. With a spinner choosing, A was worth ${signed(spinnerA())}. Now you choose every move. What is A worth?`}
        options={[
          { label: 'Still about 9' },
          { label: 'Exactly 10' },
          { label: 'About 24', right: true },
          { label: 'Infinite' },
        ]}
        reveal={
          <>
            About {looped}. From A′ you can walk straight back up to A in four moves and collect again: 10 coins every
            five turns, for ever. Each lap counts for less than the one before (0.9 a turn), so the endless stream adds
            up to a finite {looped}.
          </>
        }
      />

      <h2>No more spinner</h2>

      <Steps
        say={[
          <>It’s the same board, but the spinner is gone: now you pick every move.</>,
          <>From A′, the best you can do is walk straight up to A, four moves, and take the 10 coins again.</>,
          <>
            Round and round: 10 coins every five turns, for ever. Counted at 0.9 a turn, that stream is worth{' '}
            {looped}.
          </>,
          <>
            Every square gets its best worth the same way: the reward of its best move, plus 0.9 of the best worth of
            where that move lands. Working the numbers out is{' '}
            <Link to="/learnings/value-iteration" className="text-sage hover:underline">
              Improve as you go
            </Link>
            .
          </>,
          <>
            With those numbers, choosing is easy. From any square, compare the four moves one step ahead, and take the
            one whose reward plus 0.9 of the next square’s worth is highest.
          </>,
          <>
            These are the <strong>optimal values</strong>, v*; following the arrows is an <strong>optimal policy</strong>
            , π*; and “worth is the best of reward plus 0.9 of the next worth” is the{' '}
            <strong>Bellman optimality equation</strong>.
          </>,
        ]}
      >
        {(step) =>
          step === 0 ? (
            <Board key="board" world={WORLD} label="The board with its two gold squares and where they send you" jumps />
          ) : step === 1 ? (
            <Walk key="back" world={WORLD} visits={visits} from={0} to={5} jumps says="you go" />
          ) : step === 2 ? (
            <Walk key="round" world={WORLD} visits={visits} from={5} to={15} jumps says="you go" pace={600} />
          ) : (
            <Board
              key={step === 3 ? 'best' : step === 4 ? 'arrows' : 'named'}
              world={WORLD}
              label={step === 3 ? 'Every square’s best worth' : 'Every square’s best worth, with arrows for the best moves'}
              values={values}
              shade
              arrows={step === 3 ? null : bestMoves()}
            />
          )
        }
      </Steps>

      <h2>From the average to the best</h2>
      <p>
        On <Link to="/learnings/bellman-equation">A square is worth its neighbours</Link>, a square’s value was the
        average of its moves, weighted by how often the policy picks each. Playing as well as possible, you don’t
        average over your own choices: you take the best one. Only the world’s chances are still averaged.
      </p>
      <Clip
        src="optimal-policies/average-to-best"
        label={`The Bellman equation for a policy averages over its moves. Replace the policy's average with the best move, max over a, and you get the Bellman optimality equation: v star of s equals the max over a of the sum over next states and rewards of p of s prime and r given s and a, times r plus gamma v star of s prime. For A prime: the move north is worth 0 plus 0.9 times ${above}, which is ${a_}, the best of the four. For A: 10 plus 0.9 times ${a_} is ${a}. The best policy picks, in each state, the move that reaches the max.`}
        caption="One symbol changes: the average over the policy’s moves becomes the best move. The arrows are whichever moves reach that best."
      />
      <Numbers
        items={[
          { label: 'A′: north, 0.9 × ' + above, value: a_ },
          { label: 'A: 10 + 0.9 × A′', value: a },
          { label: 'A, as a loop: 10 ÷ (1 − 0.9⁵)', value: looped },
        ]}
      />
      <p>
        Here is the useful part. Looking one step ahead is usually short-sighted, the way grabbing the nearest reward
        is. But v* already counts everything that can follow, so a one-step look at v* is a look all the way ahead. If
        you also keep a number for each move, the optimal <strong>action value</strong> q*(s, a), you don’t even need
        that step: take the move with the highest number, without knowing where it leads.
      </p>

      <h2>Every square’s best move</h2>
      <p>
        Pick a square to see its four moves, the best in green. Then change how much a turn later counts, and watch where
        the arrows lead.
      </p>
      <Figure
        caption={
          <>
            At 0.9, only the square beside B heads there; every other arrow leads to A, whose 10 coins are worth a walk.
            At 0.5, a coin five turns away is worth 1/32 of one now, so {towardB.low} squares settle for B’s nearby
            5 instead. Change the discount and the best policy changes with it.
          </>
        }
      >
        <Best gamma={gamma} square={square} onPick={setSquare} />
        <Controls>
          <Choice label="A turn later counts" options={GAMMAS} value={gamma} onChange={setGamma} />
        </Controls>
      </Figure>

      <Predict
        kicker="Quick check"
        question="Suppose you had q*(s, a), the best worth of each move from each square. What could you then do without?"
        options={[
          { label: 'The rewards' },
          { label: 'Knowing where each move leads', right: true },
          { label: 'The discount' },
          { label: 'Nothing: you need it all' },
        ]}
        reveal={
          <>
            With v*, you still look one step ahead, so you need to know where each move lands and what it pays. q* has
            done that look for you: each move’s number already includes its reward and everything after it. Just take
            the highest.
          </>
        }
      />

      <h2>Why not always solve it?</h2>
      <p>
        On a board of 25 squares, solving the optimality equation takes a blink. It needs three things that real
        problems seldom give: the full rules of the world, states that carry everything that matters, and enough
        computing to sweep every state again and again.
      </p>
      <Numbers items={SIZES} />
      <p>
        Backgammon’s rules are short and its positions are complete, but there are far too many to sweep. So in practice
        you settle for approximately optimal: spend effort on the states that actually come up, and learn values from
        experience rather than from the rules. Most of reinforcement learning is ways of doing that.
      </p>
      <ul>
        <li>
          <strong>Optimal is defined by the values.</strong> One policy is at least as good as another if it is worth at
          least as much from every state. There is always one that beats or ties every other, and every such policy
          shares the same v* and q*.
        </li>
        <li>
          <strong>Choose from good values, and the choosing is easy.</strong> The hard work is in the values; once they
          are right, a one-step look picks the move.
        </li>
        <li>
          <strong>Close is often enough.</strong> A player that is wrong about positions no good opponent ever reaches
          loses little. Spend accuracy where play actually goes.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="A map app knows, for every junction, the fewest minutes to your destination. You reach a junction with four roads. How should it choose?"
        options={[
          { label: 'Plan every route again from here' },
          { label: 'Take the shortest road out' },
          { label: 'Take the road with least: its minutes plus the minutes left from where it ends', right: true },
          { label: 'Take the road toward the destination' },
        ]}
        reveal={
          <>
            The minutes-left numbers are its v*: they already count every turn after the next junction. So a one-step
            look, each road’s own time plus the best time from where it leads, picks the best road. The shortest road
            can lead into traffic; pointing toward the destination can lead to a dead end.
          </>
        }
      />
    </Article>
  )
}
