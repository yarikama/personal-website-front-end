import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Choice, Controls, Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Detour from './Detour'
import { expectedMax, MARKETS, markets, mean, RUNS, STALLS, story, TRUCKS } from './model'
import Trucks from './Trucks'

const ODDS = [2, 8, 50]

export default function MaximizationBias() {
  const market = useMemo(() => story(), [])
  const { one, two } = useMemo(() => markets(MARKETS, TRUCKS, 1), [])
  const favourite = market.first[market.favourite].toFixed(1)
  const again = market.second[market.favourite].toFixed(1)
  const oneMean = mean(one).toFixed(1)
  const twoMean = mean(two).toFixed(1)
  const [stalls, setStalls] = useState<(typeof STALLS)[number]>(10)

  return (
    <Article
      kicker="Reinforcement learning · Learning to act"
      title="The lucky favourite"
      promise="If every option is equally good, why does the best-looking one look better than it is, and what does that do to a learner?"
      takeaway={
        <>
          The best-looking of several noisy estimates is <em>overrated</em> on average. To know what the winner is
          really worth, judge it with data that played no part in picking it.
        </>
      }
      sources={[
        {
          title: 'Reinforcement Learning: An Introduction',
          by: 'Richard S. Sutton and Andrew G. Barto, 2nd edition',
          part: 'Chapter 6, “Temporal-Difference Learning”, §6.7 “Maximization Bias and Double Learning”',
          url: 'http://incompleteideas.net/book/the-book-2nd.html',
        },
        {
          title: 'COMP 442/552: Reinforcement Learning',
          by: 'Vaibhav Unhelkar, Rice University, Fall 2026',
          part: 'Lecture “Q Learning with Function Approximation”, on its limitations and Double Q-learning',
        },
        {
          title: 'Double Q-learning',
          by: 'Hado van Hasselt, Advances in Neural Information Processing Systems 23 (NeurIPS), 2010',
          part: 'Where the two-table method was introduced',
          url: 'https://papers.nips.cc/paper/2010/hash/091d584fced301b442654dd8c23b3fc9-Abstract.html',
        },
        {
          title: 'Deep Reinforcement Learning with Double Q-learning',
          by: 'Hado van Hasselt, Arthur Guez and David Silver, AAAI, 2016',
          part: 'The same fix for deep Q-networks',
          url: 'https://arxiv.org/abs/1509.06461',
        },
        {
          title: 'The Optimizer’s Curse: Skepticism and Postdecision Surprise in Decision Analysis',
          by: 'James E. Smith and Robert L. Winkler, Management Science, 2006',
          part: 'The same effect in everyday decisions',
          url: 'https://doi.org/10.1287/mnsc.1050.0451',
        },
      ]}
    >
      <Predict
        question={`A weekend market has ${TRUCKS} food trucks, all truly as good as each other: 7 out of 10. You eat one meal at each (a single meal is the truck’s 7, give or take about a point) and pick a favourite. On average, what did your favourite’s meal score?`}
        options={[
          { label: 'About 7, like all of them' },
          { label: 'About 7.3' },
          { label: `About ${oneMean}`, right: true },
          { label: 'About 9.8' },
        ]}
        reveal={
          <>
            About {oneMean}. Each meal’s score is fair on its own, but the favourite is the truck whose one meal came out
            highest, so it is usually the luckiest truck, not a better one. All {TRUCKS} are a 7.
          </>
        }
      />

      <h2>A market of equals</h2>

      <Steps
        readable
        say={[
          <>
            A weekend market has {TRUCKS} food trucks. You can’t know it, but every one of them is a 7 out of 10.
          </>,
          <>You eat one meal at each. Any single meal is a truck’s usual, give or take, so the scores scatter.</>,
          <>Your favourite is the truck with the top score, {favourite}. That’s the one you tell your friends about.</>,
          <>
            You go back, and it scores {again}. It didn’t get worse. It won by having one lucky meal, and luck doesn’t
            come back on request.
          </>,
          <>
            Across {MARKETS.toLocaleString('en')} markets like this one, your favourite’s first score averages {oneMean},
            though every truck in every market is a 7.
          </>,
          <>
            Your friend keeps two notebooks, with one meal in each. She picks her favourite from the first, but quotes its
            score from the second. Over the same markets, that averages {twoMean}.
          </>,
          <>
            In Q-learning, the trucks are the moves from the next state and their scores are estimates, Q(s′, a). Its
            target uses the highest of them: your favourite’s score, too high on average. That is{' '}
            <strong>maximization bias</strong>.
          </>,
        ]}
      >
        {(step) => <Trucks key={step} step={step} story={market} one={one} two={two} />}
      </Steps>

      <h2>The best of noisy guesses</h2>
      <p>
        Every score above is fair: right on average. Taking the highest is not a fair way to pick one, though. It picks
        whichever score the noise pushed up the most. Put another way, the average of the highest estimate is at least the
        highest true value, and above it whenever there is noise. How far above depends on the noise and on how many
        options compete. With noise of about a point, the favourite is overrated by:
      </p>
      <Numbers
        items={ODDS.map((n) => ({
          label: `${n} options`,
          value: `+${expectedMax(n).toFixed(2)}`,
        }))}
      />
      <p>More options give more chances for one of them to get lucky, though the bias grows slowly.</p>

      <h2>How it misleads a learner</h2>
      <p>
        <Link to="/learnings/q-learning">Q-learning</Link> scores a move by its reward plus the best score among the
        next moves. Early on, those scores are just a few noisy samples each, so the best of them is overrated, and the
        move that leads there is overrated with it. The error then travels backward, like any value does, to the moves
        before.
      </p>
      <p>
        Here it is on the way home. At a fork you can go straight home, worth 0, or detour through the night market,
        where every stall’s snack is a little worse than going home on average, −0.1, but varies a lot from night to
        night. The right choice is home. Pick how many stalls there are:
      </p>
      <Figure
        readable
        caption={
          <>
            Each line is the share of {RUNS.toLocaleString('en')} learners that took the detour that evening.
            The dashed line is how often random picks alone send a learner there. With several stalls, Q-learning heads
            for the market most evenings at first: the luckiest stall makes it look worth the trip. With one stall
            there is no best to pick, and both learners behave.
          </>
        }
      >
        <Detour stalls={stalls} />
        <Controls>
          <Choice label="Stalls at the market" options={STALLS} value={stalls} onChange={setStalls} />
        </Controls>
      </Figure>

      <h2>Two notebooks: Double Q-learning</h2>
      <p>
        Your friend’s trick works because the second notebook had no say in the pick. Its score for the favourite is
        just another fair meal. <strong>Double Q-learning</strong> does the same with two tables of scores. After each
        step a coin decides which table learns. That table picks the best next move by its own scores, and the other
        table says what that move is worth.
      </p>
      <Clip
        src="maximization-bias/double-target"
        label="The Q-learning target, r plus gamma times max over a of Q of s-prime, a, is the same as r plus gamma times Q of s-prime at the argmax over a of Q of s-prime, a: one table picks the move and scores it. Double Q-learning splits the two jobs: r plus gamma times Q2 of s-prime at the argmax over a of Q1 of s-prime, a. Q1 picks, Q2 judges."
        caption="The max hides two jobs: picking the best move and saying what it’s worth. Give each job its own table, and the judge’s errors no longer side with the pick."
      />
      <p>
        To choose moves, it adds up both tables. Each table learns from only about half the steps, which is the price.
        It can also come out a little low, when the pick wasn’t truly the best move, but a small underestimate rarely
        lures a learner anywhere.
      </p>

      <Predict
        kicker="Quick check"
        question="Double Q-learning picks the best next move with one table and scores it with the other. Why does that remove the bias?"
        options={[
          { label: 'The second table is more accurate' },
          { label: 'The second table’s errors had no part in the pick', right: true },
          { label: 'Two tables halve the noise' },
          { label: 'It explores more' },
        ]}
        reveal={
          <>
            The bias comes from picking and scoring with the same noisy numbers: the pick goes to whichever error was
            biggest. The second table’s error for that move is as likely low as high, so on average its score is fair.
          </>
        }
      />

      <h2>What to do about it</h2>
      <ul>
        <li>
          <strong>Pick with one sample, judge with another.</strong> That is Double Q-learning, and in deep
          reinforcement learning, Double DQN: the network being trained picks the move, and an older copy of it scores
          that move.
        </li>
        <li>
          <strong>More data per option shrinks it.</strong> The bias is as big as the noise. A score built from twenty
          meals has much less noise than one built from a single meal.
        </li>
        <li>
          <strong>Expect the winner to disappoint.</strong> Whenever you pick the best of many noisy measurements, such
          as test results, interviews or last year’s top funds, discount the winner’s number. Decision analysts call it
          the optimizer’s curse.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="A team tests 20 versions of a sign-up page for a week, then launches the one with the highest sign-up rate. After launch, its rate is most likely…"
        options={[
          { label: 'Higher than in the test' },
          { label: 'The same as in the test' },
          { label: 'Lower than in the test', right: true },
          { label: 'Impossible to say' },
        ]}
        reveal={
          <>
            Lower. The winner was picked by the same week of data that measured it, so its rate includes whatever luck
            it had that week. Twenty contenders is plenty of chances for one to look better than it is. A fresh week, or
            data held back from the pick, gives a fair number.
          </>
        }
      />
    </Article>
  )
}
