import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Many from './Many'
import {
  COIN,
  FRIEND,
  legRatio,
  ONE_TRIP,
  ordinary,
  plain,
  PLAY_RUNS,
  PLAY_SHOWN,
  PLAY_TRIPS,
  ratio,
  reachesStart,
  spread,
  step,
  STORY_COUNT,
  STORY_RUN,
  STORY_TRIPS,
  tailsOf,
  TRUE,
  tripMinutes,
  weighted,
  WEIGHTED_ON_AVERAGE,
  type Running,
} from './model'
import Story from './Story'
import Tails from './Tails'

const fixed = (value: number, digits = 1) => value.toFixed(digits)
const percent = (share: number) => `${Math.round(share * 100)}%`

// The numbers the prose tells, all from the model
const HEAVY = ratio(STORY_TRIPS[1], COIN)
const MAIN = legRatio('main', COIN)
const SIDE = legRatio('side', COIN)
const AT_TEN = { ordinary: STORY_RUN.ordinary[9], weighted: STORY_RUN.weighted[9] }
const MISS = spread(COIN, 3).miss
const INCREMENTAL = STORY_TRIPS.slice(0, 3).reduce<{ state: Running; after: { weight: number; share: number; estimate: number }[] }>(
  ({ state, after }, trip) => {
    const weight = ratio(trip, COIN)
    const next = step(state, tripMinutes(trip), weight)
    return { state: next, after: [...after, { weight, share: weight / next.weight, estimate: next.estimate }] }
  },
  { state: { estimate: 0, weight: 0 }, after: [] }
).after
const LONG = tailsOf(100, 0.1)
const SHORT = tailsOf(10, 0.1)

export default function ImportanceSampling() {
  return (
    <Article
      kicker="Reinforcement learning · Learning to act"
      title="Learning from someone else’s trips"
      promise="If every trip you can learn from was made by someone who acts differently from you, can you still tell how your own way would do?"
      takeaway={
        <>
          To judge one way of acting from episodes of another, weight each return by how much likelier{' '}
          <em>your</em> way was to make its moves, a product of chance ratios that needs no model; dividing by the total
          weight instead of the count trades a bias that fades for far less noise.
        </>
      }
      sources={[
        {
          title: 'Reinforcement Learning: An Introduction',
          by: 'Richard S. Sutton and Andrew G. Barto, 2nd edition',
          part: 'Chapter 5, “Monte Carlo Methods”, §5.5 “Off-policy Prediction via Importance Sampling”, §5.6 “Incremental Implementation” and §5.7 “Off-policy Monte Carlo Control”',
          url: 'http://incompleteideas.net/book/the-book-2nd.html',
        },
      ]}
    >
      <Predict
        question="Your friend kept a log of their commutes, flipping a coin at each of three junctions: main road or side street. You take the main road 4 times in 5. To judge your own commute from their log, how much should one of their all-main-road trips count?"
        options={[
          { label: 'Once: a trip is a trip' },
          { label: `${fixed(MAIN)} times` },
          { label: 'About 4 times', right: true },
          { label: 'About 8 times' },
        ]}
        reveal={
          <>
            About 4: {fixed(HEAVY, 2)}. You would make those three turns 0.8 × 0.8 × 0.8 = 51% of the time; your friend,
            0.5 × 0.5 × 0.5 = 12.5%. That trip is {fixed(HEAVY, 1)} times as typical of you as of them. A trip down three
            side streets is the reverse: 0.8% of your trips, 12.5% of theirs, so it counts 0.06.
          </>
        }
      />

      <h2>Weigh each trip</h2>

      <Steps
        readable
        say={[
          <>
            You want to know how long your commute takes, the way you drive it: at each of three junctions, the main
            road 4 times in 5, otherwise the side street.
          </>,
          <>
            All you have is a friend’s log, and your friend flips a coin at every junction, so the log’s plain average,{' '}
            {fixed(plain(STORY_TRIPS))} minutes, is how long <em>their</em> commute takes.
          </>,
          <>
            So give each trip a weight: your chance of each turn it made over your friend’s, multiplied. A main road
            counts {fixed(MAIN)}, a side street {fixed(SIDE)}.
          </>,
          <>
            Trip 2 hit a jam and still weighs {fixed(HEAVY, 2)}: a road jams as often whoever drives it, so the jam never
            enters the weight.
          </>,
          <>
            Now divide the weighted minutes by the 5 trips, and you get {fixed(ordinary(STORY_TRIPS, COIN))}; divide
            them by the total weight instead, and you get {fixed(weighted(STORY_TRIPS, COIN))}.
          </>,
          <>
            Over {STORY_COUNT.toLocaleString('en-US')} trips, both close in on your true {TRUE} minutes. But after 10
            trips, the first said {fixed(AT_TEN.ordinary)} and the second {fixed(AT_TEN.weighted)}.
          </>,
          <>
            Your habit is the <strong>target policy</strong> π, your friend’s the <strong>behaviour policy</strong> b,
            and the two averages are <strong>ordinary</strong> and <strong>weighted importance sampling</strong>.
          </>,
        ]}
      >
        {(at) => <Story key={at} step={at} />}
      </Steps>

      <p>
        Acting by one habit while learning about another is called <em>off-policy</em> learning. Here it is done
        with whole trips, the way <Link to="/learnings/monte-carlo-prediction">Monte Carlo</Link> learns.
      </p>

      <h2>The one line of math</h2>
      <p>
        In words: <strong>a trip’s weight = the product, over its moves, of your chance of that move ÷ your friend’s
        chance of it</strong>. That weight is the <strong>importance-sampling ratio</strong>, ρ. Ordinary importance
        sampling adds up weight × minutes and divides by the number of trips; weighted importance sampling divides the
        same sum by the total weight. The five trips of the story:
      </p>
      <Numbers
        items={[
          { label: 'Plain average', value: fixed(plain(STORY_TRIPS)), note: 'your friend’s way' },
          { label: 'Ordinary', value: fixed(ordinary(STORY_TRIPS, COIN)), note: '214.0 ÷ 5 trips' },
          { label: 'Weighted', value: fixed(weighted(STORY_TRIPS, COIN)), note: '214.0 ÷ 5.89 weight' },
        ]}
      />
      <Clip
        src="importance-sampling/ratio-cancels"
        label="The chance of a trip if you drive it: pi of A0 given S0, times the road's chance p of S1 given S0 and A0, times pi of A1 given S1, and so on. Below it, the same trip if your friend drives: b in place of pi, the same road's chances. Divided, every road term appears above and below and cancels, leaving rho, the product over the moves of pi over b. For trip 1, main, main, side: 0.8 over 0.5, times 0.8 over 0.5, times 0.2 over 0.5, is 1.6 times 1.6 times 0.4, about 1.02."
        caption="The roads’ chances, jams and all, are the same whoever drives, so they cancel. What is left needs only the two habits, never a model of the roads."
      />
      <p>
        That is why the weight needs no map: you must know both habits’ chances for each move, and nothing about where
        moves lead. It does need one thing, called <strong>coverage</strong>: your friend must sometimes make every move
        you might. A turn you take and they never do never shows up in the log, and no weighting can conjure it.
      </p>

      <h2>Right on average, or steady</h2>
      <p>
        After a single trip, ordinary importance sampling can say anything from {fixed(ONE_TRIP.low)} minutes to{' '}
        {Math.round(ONE_TRIP.high)}, yet averaged over every first trip it might have been, it is exactly {TRUE}: it is{' '}
        <strong>unbiased</strong>. Weighted importance sampling, after one trip, says that trip’s minutes, whatever its
        weight. Those average {FRIEND}, your friend’s commute: it is <strong>biased</strong>. After two trips its
        average is already {fixed(WEIGHTED_ON_AVERAGE.two)}, and the bias fades as the log grows. Meanwhile it never
        says a time no real trip took, and it swings far less: over many logs of {STORY_COUNT.toLocaleString('en-US')}{' '}
        trips, ordinary typically misses by {fixed(MISS.ordinary)} minutes and weighted by {fixed(MISS.weighted)}. In
        practice, weighted is the one to use.
      </p>

      <h2>Make your friend wilder</h2>
      <p>
        Each line is one friend’s log, its estimate after every trip. Move your friend’s habit away from yours, or make
        the commute longer, and watch the weights grow.
      </p>
      <Figure
        readable
        caption={`Each panel shows ${PLAY_SHOWN} logs; the misses are typical over ${PLAY_RUNS} logs of ${PLAY_TRIPS.toLocaleString('en-US')} trips. Weights multiply, one factor per junction, so a friend unlike you or a longer commute makes a few rare trips enormous and the rest nearly weightless. Ordinary sampling then sits low until a heavy trip turns up and throws it high; weighted sampling stays among real trip times, though it too grows rough. With trips that can loop for ever, the ordinary spread can even be infinite.`}
      >
        <Many />
      </Figure>

      <Predict
        kicker="Quick check"
        question="Your friend takes the main road at only 1 junction in 10. Your ordinary estimate from 1,000 of their trips says 61 minutes, though no commute can take more than 60. What happened?"
        options={[
          { label: 'The weights were worked out wrong' },
          { label: 'A rare all-main-road trip got a huge weight', right: true },
          { label: 'Your friend hit more jams' },
          { label: 'The estimate is biased' },
        ]}
        reveal={
          <>
            Each main road weighs 0.8 ÷ 0.1 = 8, so a trip down three of them weighs 512. A single such trip of 24
            minutes adds 512 × 24 ÷ 1,000 ≈ 12 minutes to the estimate on its own. Ordinary sampling divides by the
            trips, not by the weight, so nothing holds it among real trip times. It is still unbiased: on average over
            many logs it is right.
          </>
        }
      />

      <h2>One trip at a time</h2>
      <p>
        You need not keep the log. Keep the estimate V and the total weight so far, C. With each trip of weight W and
        minutes G: <strong>C ← C + W, then V ← V + (W ÷ C)(G − V)</strong>. A heavy trip moves V a long way, a light one
        hardly at all. The story’s first three trips:
      </p>
      <Numbers
        items={INCREMENTAL.map(({ weight, share, estimate }, i) => ({
          label: `Trip ${i + 1}`,
          value: fixed(estimate),
          note: `W ÷ C = ${share === 1 ? '1' : fixed(share, 2)}${i === 1 ? `, W = ${fixed(weight, 2)}` : ''}`,
        }))}
      />

      <h2>Learning to act off-policy</h2>
      <p>
        To find the best way rather than judge one, make the target <em>greedy</em>: always the move with the best score
        Q(s, a), as on <Link to="/learnings/monte-carlo-control">the page before</Link>. Let the behaviour keep
        exploring, so that every move keeps a chance. The target’s chance of its own move is 1, and of any other 0. So,
        reading an episode back from its end, each greedy move multiplies the weight by 1 ÷ b, and the first exploring
        move you meet makes the weight of everything before it zero. Only the tail after the last exploring move
        teaches; that move’s own score learns too, since it asks only what followed.
      </p>
      <Figure readable caption="Each strip is an episode, start on the left; ticks are moves the explorer made that the greedy target would not. Green is the part that updates any score. Long episodes leave their early moves almost never learned about.">
        <Tails />
      </Figure>
      <p>
        Exploring one move in ten, an episode of 10 moves teaches {percent(SHORT.taught)} of its moves; one of 100,
        only {percent(LONG.taught)}, and its first move in {fixed(reachesStart(100, 0.1) * 100, 2)}% of episodes.
        That slowness is one reason to learn from each step instead. Q-learning is off-policy too, but needs no
        weights: it scores the move just made by one real step and then the <em>best</em> score at the next state,
        which is what the greedy target would do. No move the explorer chose after that step enters the update, so
        there is nothing to reweight.
      </p>

      <h2>Making it work</h2>
      <ul>
        <li>
          <strong>Log the chances, not only the choices.</strong> The weight needs the behaviour’s chance of each move
          it made. Old logs that kept only what was done can’t be reweighted.
        </li>
        <li>
          <strong>Keep the behaviour close to the target.</strong> Weights multiply move by move, so a habit far from
          yours, or a long episode, gives a few huge weights and many tiny ones, and little to learn from.
        </li>
        <li>
          <strong>Divide by the weight.</strong> Weighted sampling’s bias fades with data, and its noise is far lower.
          Ordinary sampling is for when being right on average matters more than any one answer.
        </li>
        <li>
          <strong>For long episodes, bootstrap.</strong> When episodes run long, learn from each step, as{' '}
          <Link to="/learnings/q-learning">Q-learning</Link> does, instead of waiting for whole returns.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="A shop’s app logged 10,000 visits under a rule that shows a coupon to half its visitors. You want to judge a new rule that would show it to 9 in 10. One logged visitor saw no coupon and spent $40. What does that visit add to the ordinary estimate’s total, before you divide by 10,000?"
        options={[{ label: '$40' }, { label: '$8', right: true }, { label: '$72' }, { label: '$0' }]}
        reveal={
          <>
            $8. The new rule skips the coupon 1 time in 10, the old one 1 time in 2, so the visit weighs 0.1 ÷ 0.5 = 0.2,
            and 0.2 × $40 = $8. A visitor who did see a coupon would count 0.9 ÷ 0.5 = 1.8 times: the new rule would
            meet people like them more often.
          </>
        }
      />
    </Article>
  )
}
