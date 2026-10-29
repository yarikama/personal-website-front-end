import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Choice, Controls, Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import { ALWAYS_ROLL, signed, SPOTS, state, STEP, WAYS } from '../../components/explain/ladders'
import Labelled from '../../components/explain/Labelled'
import Sweeping from '../../components/explain/Sweeping'
import Track from '../../components/explain/LaddersTrack'
import { judged, JUDGE, options, ROUNDS, type Judge } from '../../components/explain/planning'
import Rounds from './Rounds'

const list = (squares: number[]) =>
  squares.length === 1 ? String(squares[0]) : `${squares.slice(0, -1).join(', ')} and ${squares.at(-1)}`

export default function PolicyIteration() {
  // The story's rounds, and the numbers they tell
  const rounds = ROUNDS()
  const [first, second] = rounds
  const final = rounds.at(-1)!
  const judging = rounds.map((round) => round.passes.length - 1)
  const total = judging.reduce((sum, n) => sum + n, 0)
  const later = rounds.slice(1, -1).map((round) => list(round.switched))
  const focus = 7
  const [roll, step] = options(first, focus).map((value) => signed(value, 2))
  const after = signed(second.values[state(focus)], 2)
  const start = signed(first.values[state(1)], 2)
  const end = signed(final.values[state(1)], 2)
  const ways = WAYS.toLocaleString('en')
  const quick = judged(3)

  const [judge, setJudge] = useState<Judge>('settled')

  return (
    <Article
      kicker="Reinforcement learning · Planning"
      title="Better, then best"
      promise={`On a board where every square offers two moves, there are ${ways} ways to play. How do you find the best without trying them all?`}
      takeaway={
        <>
          Judge a way of playing, then switch every state to the move that looks best by those values: the new way is
          never worse, and repeating this <em>stops on the best</em>, usually after only a few rounds.
        </>
      }
      sources={[
        {
          title: 'Reinforcement Learning: An Introduction',
          by: 'Richard S. Sutton and Andrew G. Barto, 2nd edition',
          part: 'Chapter 4, “Dynamic Programming”, §4.2 “Policy Improvement”, §4.3 “Policy Iteration” and §4.6 “Generalized Policy Iteration”',
          url: 'http://incompleteideas.net/book/the-book-2nd.html',
        },
        {
          title: 'COMP 442/552: Reinforcement Learning',
          by: 'Vaibhav Unhelkar, Rice University, Fall 2026',
          part: 'MDP Planning under Uncertainty: Policy and Value Iteration',
        },
      ]}
    >
      <Predict
        question={`Snakes and ladders, but on each of its ${SPOTS.length} squares you may roll or step one square: ${ways} ways to play. You judge one way, switch every square to the move that looks best by those numbers, judge again, and so on. How many ways do you judge before nothing switches?`}
        options={[
          { label: 'Millions' },
          { label: `About ${SPOTS.length}, one per square` },
          { label: String(rounds.length), right: true },
          { label: 'It never stops' },
        ]}
        reveal={
          <>
            {rounds.length}. Each switch uses everything the last judging learned, so the first round already fixes the
            biggest mistakes, and every later way of playing is at least as good as the one before. Out of {ways}, you
            look at {rounds.length}.
          </>
        }
      />

      <h2>A step or a roll</h2>

      <Steps
        say={[
          <>
            It’s the board from the last page, with one new rule: each turn you may roll the die, or step forward one
            square.
          </>,
          <>
            Start from your habit, always rolling, and work out its values by sweeping, as on the last page: square 1 is
            worth {start}.
          </>,
          <>
            Now ask on each square: if I stepped just this once, and rolled after, would I do better? On square {focus},
            a step lands on the ladder for sure: {step}, against {roll} for rolling.
          </>,
          <>
            Switch wherever the one-off step wins: squares {list(first.switched)}, each just below a ladder. That is a
            new way of playing.
          </>,
          <>
            The new way is no worse on any square, so judge it and ask again. Squares {later.join(', then ')} switch
            next.
          </>,
          <>
            In round {rounds.length}, no square wants to switch. From square 1 you now need {end.replace('−', '')} turns
            instead of {start.replace('−', '')}, and of {ways} ways to play you judged {rounds.length}.
          </>,
          <>
            Working out the values is <strong>policy evaluation</strong>; switching each state to its best one-step move
            is <strong>policy improvement</strong>; taking turns until nothing switches is{' '}
            <strong>policy iteration</strong>.
          </>,
        ]}
      >
        {(step) =>
          step === 0 ? (
            <Labelled key="board" left="Your habit" right="roll everywhere">
              <Track label="The board, where every square offers a roll or a step" plan={ALWAYS_ROLL} />
            </Labelled>
          ) : step === 1 ? (
            <Sweeping
              key="judge"
              passes={first.passes}
              plan={first.plan}
              pace={70}
              label="Always rolling, judged sweep by sweep"
            />
          ) : step === 2 ? (
            <Labelled key="ask" left={`Square ${focus} · step ${step}`} right={`roll ${roll}`}>
              <Track
                label={`Square ${focus}: a step lands on the ladder at 8`}
                values={first.values}
                shade
                plan={first.plan}
                focus={{ square: focus, move: STEP }}
              />
            </Labelled>
          ) : step === 3 ? (
            <Labelled key="switch" left="Round 1 · improve" right={`${first.switched.length} switch`}>
              <Track
                label="The squares that switch to stepping"
                values={first.values}
                shade
                plan={first.next}
                rung={first.switched}
              />
            </Labelled>
          ) : step === 4 ? (
            <Sweeping
              key="again"
              passes={second.passes}
              plan={second.plan}
              rung={second.switched}
              pace={110}
              label="The new way of playing, judged; then the squares that switch next"
            />
          ) : (
            <Labelled
              key={step === 5 ? 'best' : 'named'}
              left={`Round ${rounds.length} · nothing switches`}
              right={`square 1: ${end}`}
            >
              <Track label="The best way to play, and its values" values={final.values} shade plan={final.plan} />
            </Labelled>
          )
        }
      </Steps>

      <h2>Why switching is safe</h2>
      <p>
        The question on each square was narrow: change only the first move, then play as before. Its answer needs no new
        judging, just a look one step ahead with the values you have, which is the action value q<sub>π</sub>(s, a) from{' '}
        <Link to="/learnings/bellman-equation">A square is worth its neighbours</Link>. Take, on every square, the move
        whose q is highest:
      </p>
      <Clip
        src="policy-iteration/evaluate-improve"
        label={`q pi of s, a: the sum over next states and rewards of p times r plus gamma v pi of s prime. The new policy pi prime of s is the arg max over a of q pi of s, a. Square ${focus}: roll ${roll}, step ${step}, so step. The policy improvement theorem: v pi prime of s is at least v pi of s for every s. Then the loop: pi zero, evaluate, v pi zero, improve, pi one, and so on until pi star and v star.`}
        caption="Look one step ahead with the old values, take the best move everywhere, and the new policy is at least as good everywhere. Then judge it and look again."
      />
      <Numbers
        items={[
          { label: `Square ${focus}: roll, then as before`, value: roll },
          { label: 'Step, then as before', value: step },
          { label: 'Step every time it’s there', value: after },
        ]}
      />
      <p>
        One step from square {focus}, then rolling as before, is worth {step}. Stepping there every time is worth more
        still, {after}, because the other switched squares help too. That is the{' '}
        <strong>policy improvement theorem</strong>: if a change looks at least as good one step ahead on every square,
        the whole new way of playing is at least as good on every square. When nothing looks better, the values already
        satisfy the <Link to="/learnings/optimal-policies">optimality equation</Link>, so the play is the best.
      </p>

      <h2>Judging less</h2>
      <p>
        Most of the work is the judging: {judging.join(' + ')} = {total} sweeps, against {rounds.length} improvements.
        But a switch only needs the values to rank the moves, not to be exact. Here is square 1’s value through the
        whole run, judging until settled, for 3 sweeps, or for just 1 between improvements.
      </p>
      <Figure
        readable
        caption={
          <>
            Every way ends on the same best play. Judging until settled spends {total} sweeps; 3 sweeps between
            improvements gets there in {quick.sweeps}. The values never have to be right for a policy that is about to
            change. Dots mark the improvements that switched a square.
          </>
        }
      >
        <Rounds judge={judge} />
        <Controls>
          <Choice
            label="Judge between improvements"
            options={JUDGE}
            value={judge}
            onChange={setJudge}
            format={(way) => (way === 'settled' ? 'until settled' : `${way} sweep${way === 1 ? '' : 's'}`)}
          />
        </Controls>
      </Figure>

      <Predict
        kicker="Quick check"
        question="Judging each way of playing until it settles, could a later round leave some square worse off than an earlier one?"
        options={[
          { label: 'Yes, if a square switches back' },
          { label: 'No: each round is at least as good on every square', right: true },
          { label: 'Only squares near a snake' },
          { label: 'Yes, for a round or two' },
        ]}
        reveal={
          <>
            No. Each switch is to a move that looks at least as good one step ahead with exact values, and the policy
            improvement theorem carries that to every square. A square never switches back unless the two moves are
            tied, which is why you switch only for a strictly better move.
          </>
        }
      />

      <h2>Using it</h2>
      <ul>
        <li>
          <strong>Don’t search, improve.</strong> Trying every policy costs one evaluation for each of |A|<sup>|S|</sup>
          . Policy iteration needs one per round, and rounds are few.
        </li>
        <li>
          <strong>Switch only for something strictly better.</strong> Between two equally good moves, keep the one you
          have, or the plan can swap back and forth for ever.
        </li>
        <li>
          <strong>Start each judging from the last values.</strong> One way of playing is close to the next, so its
          values are a good first guess: the rounds here took {judging.join(', ')} sweeps.
        </li>
        <li>
          <strong>Judge just enough.</strong> A few sweeps between improvements reach the same best play for less work.
          Letting judging and improving take turns at any grain is <strong>generalized policy iteration</strong>, and
          almost every method in reinforcement learning is a version of it.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="A warehouse planner improves its picking rule after only two sweeps of judging each time, so the values never settle in between. What happens?"
        options={[
          { label: 'It ends on a worse rule' },
          { label: 'It still reaches the best rule, often for less work', right: true },
          { label: 'It never stops switching' },
          { label: 'It must try every rule' },
        ]}
        reveal={
          <>
            It still gets there. The values keep moving towards the current rule’s, and the rule keeps moving towards
            what the values favour; once neither moves, the rule is the best. Stopping judging early only skips
            precision that the next switch would have thrown away.
          </>
        }
      />
    </Article>
  )
}
