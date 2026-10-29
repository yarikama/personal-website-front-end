import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import Board from '../../components/explain/Board'
import { Clip } from '../../components/explain/Clip'
import { Choice, Controls, Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import Walk from '../../components/explain/Walk'
import { Steps } from '../../components/explain/Steps'
import Lean from './Lean'
import { firstBump, firstJump, GAMMA, GAMMAS, signed, SQUARE, story, WORLD, worth } from './model'

export default function BellmanEquation() {
  const visits = useMemo(() => story(), [])
  const bump = firstBump(visits)
  const jump = firstJump(visits)
  const values = worth()
  const a = signed(values[SQUARE.a])
  const a_ = signed(values[SQUARE.a_])
  const b = signed(values[SQUARE.b])
  const b_ = signed(values[SQUARE.b_])

  const [gamma, setGamma] = useState<(typeof GAMMAS)[number]>(GAMMA)
  const [square, setSquare] = useState(SQUARE.a_)

  return (
    <Article
      kicker="Reinforcement learning · Markov decision processes"
      title="A square is worth its neighbours"
      promise="When every move is left to chance, how can you say what a place is worth?"
      takeaway={
        <>
          A state’s value is the <em>average</em>, over everything that can happen next, of the reward plus the
          discounted value of where you land: each value leans on its neighbours’.
        </>
      }
      sources={[
        {
          title: 'Reinforcement Learning: An Introduction',
          by: 'Richard S. Sutton and Andrew G. Barto, 2nd edition',
          part: 'Chapter 3, “Finite Markov Decision Processes”, §3.5 “Policies and Value Functions”',
          url: 'http://incompleteideas.net/book/the-book-2nd.html',
        },
      ]}
    >
      <Predict
        question="On a board game, a spinner moves you one square a turn. Every move off a gold square pays 10 coins and sends you to a square by the bottom edge, where walking into the edge costs a coin. Counting each turn later at 0.9 of the one before, what is standing on the gold square worth?"
        options={[
          { label: 'More than 10' },
          { label: 'Exactly 10' },
          { label: 'Less than 10', right: true },
          { label: 'Nothing: it’s random' },
        ]}
        reveal={
          <>
            Less: about {a}. The 10 coins are certain, but they come with a ticket to a square where the spinner keeps
            walking you into the edge. Its worth is the 10 <em>plus</em> what the landing square is worth, and that is
            below zero.
          </>
        }
      />

      <h2>A game of chance</h2>

      <Steps
        say={[
          <>
            You play a board game where each turn a spinner sends you one square north, east, south or west. Sent into
            the edge, you stay put and pay a coin.
          </>,
          <>From the gold square A, any move pays 10 coins and flings you down to A′.</>,
          <>
            So what is standing on A worth? Its 10 coins, plus what A′ is worth one turn later, counted at 0.9.
          </>,
          <>
            And A′? The spinner picks each move 1 time in 4, so A′ is worth the average of its four moves: what each
            pays, plus 0.9 of where it lands.
          </>,
          <>
            Every square leans on its neighbours like that, and just one set of numbers fits them all at once.
          </>,
          <>
            A is worth {a}, short of its 10 coins, because A′ sits on the bottom edge and is worth {a_}. B pays only 5,
            yet is worth {b}: B′ is worth {b_}, near both gold squares.
          </>,
          <>
            The spinner is a <strong>policy</strong>, π; a square’s worth is its <strong>value</strong>, v<sub>π</sub>
            (s); and “worth is the average of reward plus 0.9 of the next worth” is the{' '}
            <strong>Bellman equation</strong>.
          </>,
        ]}
      >
        {(step) =>
          step === 0 ? (
            <Walk world={WORLD} key="walk" visits={visits} from={0} to={bump + 1} />
          ) : step === 1 ? (
            <Walk world={WORLD} key="jump" visits={visits} from={bump + 1} to={jump + 1} jumps />
          ) : step === 2 ? (
            <Board key="a" world={WORLD} label="Square A, and A′ where its move lands" focus={SQUARE.a} jumps />
          ) : step === 3 ? (
            <Board key="a-" world={WORLD} label="Square A′ and its four moves" focus={SQUARE.a_} />
          ) : (
            <Board
              key={step === 4 ? 'fit' : step === 5 ? 'values' : 'named'}
              world={WORLD}
              label="What every square is worth with the spinner"
              values={values}
              shade
              faded={step === 5 ? WORLD.names.flatMap((_, s) => (Object.values(SQUARE).includes(s) ? [] : [s])) : []}
            />
          )
        }
      </Steps>

      <h2>The equation, in words first</h2>
      <p>
        <Link to="/learnings/reward-and-value">Reward versus value</Link> ended on one line: the value here is the next
        reward plus the value of where you land. That works when you know what happens next. Here you don’t: the
        spinner chooses, and the edge may bounce you back. So take every way the next turn can go, work out reward plus
        discounted value for each, and average them by how likely each is.
      </p>
      <Clip
        src="bellman-equation/average-of-next"
        label={`The worth of a square is the average, over the moves, of what a move pays plus 0.9 times the worth where it lands. In symbols: v pi of s equals the sum over actions of pi of a given s, times the sum over next states and rewards of p of s prime and r given s and a, times r plus gamma v pi of s prime. For A prime: the four moves are worth −0.4, −1.1, −2.2 and −1.7, which average ${a_}. For A: 10 plus 0.9 times ${a_} is ${a}.`}
        caption="Words, then symbols, then numbers. The two sums are the two kinds of chance: which move the policy picks, and how the world answers it."
      />
      <p>
        The policy’s chances, π(a|s), say how often each move is picked; the world’s, p(s′, r|s, a), say where a move
        can lead and what it pays. On this board the world is plain, each move having one outcome, so only the spinner
        is left to chance. The numbers for A and its landing square:
      </p>
      <Numbers
        items={[
          { label: 'A′, the average of four', value: a_ },
          { label: 'A: 10 + 0.9 × A′', value: a },
          { label: 'B: 5 + 0.9 × B′', value: b },
        ]}
      />
      <p>
        The equation doesn’t say how to find the values; it says how they must fit together. There is just one set of
        numbers, one per square, that fits for this spinner. Finding it is{' '}
        <Link to="/learnings/policy-evaluation">Judging a way of playing</Link>.
      </p>

      <h2>Check any square</h2>
      <p>
        Pick a square to see its four moves. Whatever you pick, the average of its moves comes back as its own number.
        Then change how much a later turn counts.
      </p>
      <Figure caption="Every square’s number is the average of its four moves, so each value is held in place by its neighbours. At 0.5, the future barely counts and values hug what the next move pays; at 0.99, A and B lift the whole board, and the edges still pull it down.">
        <Lean gamma={gamma} square={square} onPick={setSquare} />
        <Controls>
          <Choice label="A turn later counts" options={GAMMAS} value={gamma} onChange={setGamma} />
        </Controls>
      </Figure>

      <Predict
        kicker="Quick check"
        question={`B pays 5 when you leave it, yet with the spinner it is worth ${b}. Why more than 5?`}
        options={[
          { label: 'B pays 5 every turn' },
          { label: 'B′ is worth more than zero', right: true },
          { label: 'The edges pay out' },
          { label: 'Discounting adds to it' },
        ]}
        reveal={
          <>
            B’s value is its 5 plus 0.9 of B′’s. B′ sits in the middle, away from the costly edges and a few squares from
            both gold squares, so it is worth a little more than nothing ({b_}), and it lifts B above its 5.
          </>
        }
      />

      <h2>What to take from it</h2>
      <ul>
        <li>
          <strong>A value belongs to a way of acting.</strong> These numbers are for the spinner. Play differently and
          every square is worth something else, which is why it is written v<sub>π</sub>, with the policy in it.
        </li>
        <li>
          <strong>Average over what can happen.</strong> When the next step is uncertain, a state is worth the
          probability-weighted mix of its next steps, not the best of them and not the likeliest one.
        </li>
        <li>
          <strong>Moves have values too.</strong> The worth of one move followed by the policy, the rows in the figure,
          is the action value q<sub>π</sub>(s, a). The square’s value is their average under π.
        </li>
        <li>
          <strong>One step is enough to check.</strong> You never need to follow a game to its end to test a value:
          compare it with its neighbours’. Methods like{' '}
          <Link to="/learnings/temporal-difference-learning">temporal-difference learning</Link> learn by exactly that
          check.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="Swap the fair spinner for one that, on every square, mostly points you towards A. What happens to A′’s value?"
        options={[
          { label: 'It goes up', right: true },
          { label: 'It goes down' },
          { label: 'Nothing: the board is the same' },
          { label: 'It becomes exactly 10' },
        ]}
        reveal={
          <>
            It goes up. The board and its rewards are unchanged, but the value is for a policy: from A′ you now head
            back to A and its 10 coins more often, and bump into the bottom edge less. Change π and every v<sub>π</sub>
            changes with it.
          </>
        }
      />
    </Article>
  )
}

