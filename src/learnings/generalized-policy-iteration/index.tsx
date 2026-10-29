import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import { ALWAYS_ROLL, signed, state } from '../../components/explain/ladders'
import Labelled from '../../components/explain/Labelled'
import Track from '../../components/explain/LaddersTrack'
import Family from './Family'
import Grains from './Grains'
import { Board, Owed, Playback, Stretch } from './Notebook'
import { offText, PER_SWEEP, restingOn, run, story, storyRounds } from './model'

const list = (squares: number[]) =>
  squares.length === 1 ? String(squares[0]) : `${squares.slice(0, -1).join(', ')} and ${squares.at(-1)}`

const sweepOf = (updates: number) => Math.round(updates / PER_SWEEP)

export default function GeneralizedPolicyIteration() {
  // The story's run, judging until settled between improvements, and the
  // numbers it tells
  const told = story()
  const { moments } = told
  const rounds = storyRounds()
  const [first, second] = rounds
  const settled = moments[first.before]
  const switched = moments[first.after]
  const refixed = moments[second.before]
  const end = moments.at(-1)!
  const jumps = rounds.map((round) => offText(moments[round.after].off))
  const start = signed(end.values[state(1)], 2)

  // The finest grain, one square at a time
  const fine = run('square')
  const fineSweeps = sweepOf(fine.updates)
  const fineMoves = fine.moments.reduce((sum, m) => sum + m.switched.length, 0)

  // Where both rest, on one square
  const focus = 12
  const rest = restingOn(focus)
  const [roll, step, value] = [rest.roll, rest.step, rest.value].map((v) => signed(v, 2))

  return (
    <Article
      kicker="Reinforcement learning · Planning"
      title="Two pulls, one answer"
      promise="Improving a way of playing leaves its values out of date, and bringing the values up to date can make the play look wrong again. Where do two jobs that keep undoing each other end up?"
      takeaway={
        <>
          Evaluation pulls the values toward the policy and improvement pulls the policy toward the values; at any
          grain, as long as both keep reaching every state, the one place where both can rest is the <em>best</em>{' '}
          policy and its values.
        </>
      }
      sources={[
        {
          title: 'Reinforcement Learning: An Introduction',
          by: 'Richard S. Sutton and Andrew G. Barto, 2nd edition',
          part: 'Chapter 4, “Dynamic Programming”, §4.6 “Generalized Policy Iteration” and §4.8 “Summary”',
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
        question="On the board where you may roll or step, you update the value of a single square, then at once give that one square whichever move its new numbers favour, then go on to another square, in a shuffled order. No square’s value is ever finished before a move changes. Where does that end?"
        options={[
          { label: 'Nowhere: the moves keep flipping' },
          { label: 'On a good play, but not the best' },
          { label: 'On the best play, as policy iteration does', right: true },
          { label: 'Only if the values start right' },
        ]}
        reveal={
          <>
            On the best play. It stumbles at first, switching {fineMoves} moves in all, some of them back again, but
            after {fineSweeps} sweeps’ worth of single-square updates it rests on exactly the play that policy iteration
            found. Neither job ever has to finish: what matters is where both of them stop.
          </>
        }
      />

      <h2>A notebook and a player</h2>

      <Steps
        readable
        say={[
          <>
            You and a friend play the board as a team: she keeps a notebook of how many turns each square takes the way
            you play now, and you pick each square’s move.
          </>,
          <>
            She works through the notebook until it fits your play, {sweepOf(settled.updates)} passes, and then it says
            stepping would be quicker on squares {list(settled.unhappy)}.
          </>,
          <>
            So you step there; but now the notebook describes a way you no longer play, and it is off by{' '}
            {offText(switched.off)} turns.
          </>,
          <>
            She brings it up to date, and the new numbers make squares {list(refixed.unhappy)} want to step: each of you
            keeps spoiling the other’s work.
          </>,
          <>
            Yet there is less to spoil each time: right after your switches, the notebook is off by {jumps.join(', then ')}{' '}
            turns.
          </>,
          <>
            After {rounds.length} rounds of switching, the notebook fits your play and your play fits the notebook, so
            neither of you has anything left to do: it is the best play, {start.replace('−', '')} turns from square 1.
          </>,
          <>
            Her pull is <strong>policy evaluation</strong>, yours is <strong>policy improvement</strong>, and letting
            the two take turns, at any grain, until neither moves is <strong>generalized policy iteration</strong>.
          </>,
        ]}
      >
        {(step) =>
          step === 0 ? (
            <Labelled key="start" left="Notebook: all 0" right="you: roll everywhere">
              <Track label="The board: every square's number at 0, and rolling everywhere" values={moments[0].values} plan={ALWAYS_ROLL} />
            </Labelled>
          ) : step === 1 ? (
            <Stretch
              key="judge"
              run={told}
              from={0}
              to={first.before}
              pace={110}
              left={(m) => (
                <>
                  Her pass <span className="text-ink tabular-nums">{sweepOf(m.updates)}</span>
                </>
              )}
              label="The notebook catching up with always rolling; ringed squares would rather step"
            />
          ) : step === 2 ? (
            <Labelled key="switch" left="You switch" right={<Owed moment={switched} />}>
              <Board
                moment={switched}
                rung={switched.switched}
                label={`Squares ${list(switched.switched)} switch to stepping; the notebook no longer fits`}
              />
            </Labelled>
          ) : step === 3 ? (
            <Stretch
              key="again"
              run={told}
              from={first.after}
              to={second.before}
              pace={130}
              left={(m) => (
                <>
                  Her pass <span className="text-ink tabular-nums">{sweepOf(m.updates)}</span>
                </>
              )}
              label="The notebook catching up with the new play; ringed squares would rather switch"
            />
          ) : step === 4 ? (
            <Playback key="gaps" run={told} pace={90} left="Still to do" right={`${rounds.length} rounds`} />
          ) : (
            <Labelled
              key={step === 5 ? 'best' : 'named'}
              left={step === 5 ? 'Nothing left to do' : 'Both pulls at rest'}
              right={<Owed moment={end} />}
            >
              <Board moment={end} label="The best play and its values: the notebook fits, and no square wants to switch" />
            </Labelled>
          )
        }
      </Steps>

      <h2>Where both rest</h2>
      <p>
        Each job has its own way of being done. The notebook is done when a pass changes nothing: every square’s number
        is already −1 plus the average of where its move lands. That is the play’s own Bellman equation from{' '}
        <Link to="/learnings/policy-evaluation">Judging a way of playing</Link>, and it has one solution, so the numbers
        are the play’s true values. The player is done when no square wants to switch: every square’s move is the better
        of the two by those numbers.
      </p>
      <p>
        Put the two together. Each square’s number is −1 plus its own move’s average, and its own move is the better one,
        so each number is −1 plus the <em>better</em> move’s average. That is the optimality equation from{' '}
        <Link to="/learnings/optimal-policies">The best from here</Link>, and only the best values satisfy it. Nothing
        else can stop both jobs at once.
      </p>
      <Clip
        src="generalized-policy-iteration/both-rest"
        label={`Evaluation is at rest: V of s equals the sum over s prime and r of p of s prime, r given s and pi of s, times r plus gamma V of s prime, so V is v pi. Improvement is at rest: pi of s is the arg max over a of the same sum. Substitute the arg max into the first equation and V of s becomes the max over a of the sum: the Bellman optimality equation. So V is v star and pi is optimal. Square ${focus}: roll ${roll}, step ${step}, the max is ${value}.`}
        caption="Two stopping conditions, one for each pull. Replace the policy’s move by the argmax it already is, and the policy’s equation turns into the optimality equation."
      />
      <p>On square {focus}, where both have come to rest:</p>
      <Numbers
        items={[
          { label: 'Roll: −1 + average of six', value: roll },
          { label: 'Step: −1 + v(13)', value: step },
          { label: `v(${focus}), the better`, value: value },
        ]}
      />

      <h2>Any grain</h2>
      <p>
        The story judged until the notebook settled before every switch. It need not. Pick how much judging comes
        between improvements: one square at a time, in a shuffled order, a single sweep, three, or until settled. The
        board plays the run, and underneath, the two jobs’ unfinished work: how far the values are from the current
        play’s own values (in green, on a scale where each line down is ten times smaller), and how many squares would
        rather take the other move (in black).
      </p>
      <Figure
        readable
        caption={
          <>
            Judging until settled shows the tug most plainly: green falls while the friend judges and jumps at a switch;
            black climbs while she judges and drops at a switch. At finer grains the pulls trade places so fast that the
            jumps shrink to flickers, and every grain ends with both at zero, on the same best play. One square at a
            time starts wildly: squares not yet updated still say 0, so stepping onto them looks free.
          </>
        }
      >
        <Grains />
      </Figure>

      <Predict
        kicker="Quick check"
        question={`Right after the first round of switching in the story, no square wants the other move. Is that play the best?`}
        options={[
          { label: 'Yes: no square wants to switch' },
          { label: 'No: the values don’t fit the play yet', right: true },
          { label: 'Yes, if the values are close' },
          { label: 'Only on squares that switched' },
        ]}
        reveal={
          <>
            No. Right after a switch, every move is the better one by definition, but the numbers it was judged by
            describe the play before it, and are off by {offText(switched.off)} turns. Only when the numbers also fit
            the play does the optimality equation hold. One job at rest proves nothing; it takes both.
          </>
        }
      />

      <h2>Almost everything is this</h2>
      <p>
        Planning sweeps every state with the rules in hand. Learning from experience can’t, so it judges from samples and
        improves a little at a time: a nudge toward one step’s reward instead of a full backup, a mostly greedy choice
        instead of a full switch. The two pulls stay. Here are the methods on this site, each split into its halves.
      </p>
      <Figure
        caption={
          <>
            Each row is a value being pulled toward what its policy earns, and a policy being pulled toward what the
            values favour. <Link to="/learnings/n-step-returns" className="text-sage hover:underline">
              Walk a few steps, then guess
            </Link> changes only the
            judging half: how many real rewards to wait for before trusting a guess.
          </>
        }
      >
        <Family />
      </Figure>
      <p>
        With samples, the guarantee from the board weakens: a pull can overshoot, and with a network standing in for
        the table, as on <Link to="/learnings/deep-q-networks">Deep Q-networks</Link>, the two can even run away
        together. But the frame still tells you what each part of a method is for, and what to check when it misbehaves.
      </p>

      <h2>Using it</h2>
      <ul>
        <li>
          <strong>Name the two halves.</strong> Meeting a new method, ask what pulls its values toward its policy and
          what pulls its policy toward its values. Most of the method is those two answers and how they take turns.
        </li>
        <li>
          <strong>Neither half has to finish.</strong> Any grain rests at the same place, so pick it by what each half
          costs, as <Link to="/learnings/value-iteration">Improve as you go</Link> did.
        </li>
        <li>
          <strong>Keep touching every state.</strong> A state that judging never visits keeps a stale number, and
          improving trusts it. Planning sweeps every state; a learner has to{' '}
          <Link to="/learnings/monte-carlo-control">keep exploring</Link> for the same reason.
        </li>
        <li>
          <strong>Stop on both.</strong> Check that the values have stopped moving <em>and</em> that no move would switch.
          Either one alone, as the quick check showed, proves nothing about the best.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="A warehouse robot plans its picking rule on the fly: it updates the value of one shelf, then at once switches that shelf to whichever pick looks best, then moves on to another shelf, round and round every shelf. After a while no value changes and no shelf would switch. Is its rule the best?"
        options={[
          { label: 'Not unless it judged each rule to the end' },
          { label: 'Yes, it’s the best rule', right: true },
          { label: 'Can’t tell: so fine a grain can rest on a worse rule' },
          { label: 'Only if it started from a good rule' },
        ]}
        reveal={
          <>
            Yes. The grain only changes the road there. Values that no longer move fit the rule, and a rule that no
            longer switches is the best move by those values; with both true at once, the optimality equation holds,
            and nothing beats the rule.
          </>
        }
      />
    </Article>
  )
}
