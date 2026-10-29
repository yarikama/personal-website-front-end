import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Curves from './Curves'
import {
  BIKE,
  BIKE_ANSWERS,
  BUS,
  CURVE_RUNS,
  MISSES,
  modelNumbers,
  NOTEBOOKS,
  solveSteps,
  spreadOf,
  STATION,
  STORY_MC,
  STORY_NOTEBOOKS,
  STORY_TD,
  tdNumbers,
  trueValues,
} from './model'
import Notes from './Notes'
import Replay from './Replay'

const BIKE_TRUE = trueValues('own')[BIKE]
const SPREAD = {
  mc: Math.round(spreadOf(BIKE_ANSWERS.map((a) => a.mc), BIKE_TRUE)),
  td: Math.round(spreadOf(BIKE_ANSWERS.map((a) => a.td), BIKE_TRUE)),
}
const miss = (value: number) => Math.round(value)
const BIG = 10_000
const power = (n: number) => (
  <>
    10<sup>{Math.round(Math.log10(n))}</sup>
  </>
)

export default function CertaintyEquivalence() {
  return (
    <Article
      kicker="Reinforcement learning · Values"
      title="Same notes, two answers"
      promise="Replay the same few episodes until the values stop changing, and Monte Carlo and TD still disagree. Which one should you believe?"
      takeaway={
        <>
          Replayed until they settle, Monte Carlo fits the returns it saw, and TD(0) solves the model the data
          suggests as if that model were <em>certain</em>: the better bet whenever where you are is all that shapes
          what comes next.
        </>
      }
      sources={[
        {
          title: 'Reinforcement Learning: An Introduction',
          by: 'Richard S. Sutton and Andrew G. Barto, 2nd edition',
          part: 'Chapter 6, §6.2 “Advantages of TD Prediction Methods” and §6.3 “Optimality of TD(0)”',
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
        question={`A friend’s notes on six trips to work: four by bus, which took ${STORY_MC[BUS]} minutes on average, and two by bike, which took ${STORY_MC[BIKE]} each. Both ways lead to the same station, where she takes whichever train comes first, and the trains don’t care how she got there. Which way is likely faster?`}
        options={[
          { label: 'The bus, by 12 min' },
          { label: 'The bus, by 3 min' },
          { label: 'The bike, by 3 min', right: true },
          { label: 'They tie' },
        ]}
        reveal={
          <>
            The bike, by about 3 minutes. It got her to the station in 12 minutes, the bus in 15. The rest of the gap
            was the train: both bike days met the slow one. If the trains don’t care how you came, that was the
            station’s luck, not the bike’s. The story below works it out.
          </>
        }
      />

      <h2>Two ways to read a notebook</h2>

      <Steps
        readable
        say={[
          <>A friend kept notes on her last six trips to work: bus or bike to the station, then whichever train came first, fast or slow.</>,
          <>
            Average each way’s whole trips and the bus wins: {STORY_MC[BUS]} minutes, against {STORY_MC[BIKE]} for the
            bike.
          </>,
          <>But look closer: the bike reached the station 3 minutes sooner, and then both bike days met the slow train.</>,
          <>
            The trains don’t care how she arrived, so count all six: the fast one came 3 times in 6, and from the
            station on she needed {STORY_TD[STATION]} minutes on average.
          </>,
          <>
            So the bike takes 12 + {STORY_TD[STATION]} = {STORY_TD[BIKE]} minutes and the bus 15 + {STORY_TD[STATION]}{' '}
            = {STORY_TD[BUS]}. Now the bike wins.
          </>,
          <>
            Ask {STORY_NOTEBOOKS} friends for ten trips each. The bike’s whole-trip average misses the true{' '}
            {BIKE_TRUE} minutes by about {SPREAD.mc}; leg plus station, by about {SPREAD.td}.
          </>,
          <>
            Each place is a <em>state</em>, each trip an <em>episode</em>, the notes a <em>batch</em>. Averaging whole
            trips is batch Monte Carlo; a leg plus the value of where it leads is batch TD(0).
          </>,
        ]}
      >
        {(step) => <Notes key={step} step={step} />}
      </Steps>

      <p>
        You have met both readers. <Link to="/learnings/monte-carlo-prediction">Monte Carlo</Link> moves a value
        toward everything that followed it, to the end. <Link to="/learnings/temporal-difference-learning">TD(0)</Link>{' '}
        moves it toward the next reward plus the next state’s value. Neither needs a model of the world, only
        experience. Given endless fresh trips, both find the true values. Given one small notebook, read until
        nothing moves, they stop at different numbers.
      </p>

      <h2>The one line of math</h2>
      <p>
        In words: <strong>Monte Carlo makes a state worth the average of what followed it in the batch</strong>.{' '}
        <strong>
          TD(0) makes it worth its average next reward, plus the values of the states it led to, in the shares the
          batch shows
        </strong>
        . The story’s notebook, both ways:
      </p>
      <Numbers
        items={[
          { label: 'Bus', value: `${STORY_MC[BUS]} · ${STORY_TD[BUS]}`, note: 'MC · TD' },
          { label: 'Bike', value: `${STORY_MC[BIKE]} · ${STORY_TD[BIKE]}`, note: 'MC · TD' },
          { label: 'Station', value: `${STORY_MC[STATION]} · ${STORY_TD[STATION]}`, note: 'the same' },
        ]}
      />
      <p>
        The station gets one answer from both, since after it there is only the ride. The answers part where a later
        state is shared by different paths.
      </p>
      <p>
        Each answer is best by its own yardstick. Monte Carlo’s {STORY_MC[BIKE]} fits the bike’s own trips as
        closely as any number can: no other has a smaller squared error against them. TD’s {STORY_TD[BIKE]} is the
        answer of a model. Count how often each state led to each other state, average the reward of each move, then
        work out the values as if that model were exactly how the world works. Acting as if your estimated model were
        known for sure is called <strong>certainty equivalence</strong>, and TD’s answer is the{' '}
        <strong>certainty-equivalence estimate</strong>.
      </p>
      <Clip
        src="certainty-equivalence/from-counts"
        label="The six trips counted: after the station, the fast train 3 times in 6 and the slow one 3 in 6; the rides take 10 and 30 minutes; the bus leg 15 and the bike leg 12. The counts drop into the station’s value: three sixths times 10 plus three sixths times 30 is 20. Then the bike is 12 plus the station’s value, 32, and the bus 15 plus it, 35."
        caption="Count, average, then solve as if the counts were the truth. The bike’s two slow trains are just two of the station’s six."
      />

      <h2>Replay the notes</h2>
      <p>
        Neither learner works these out directly. Each reads the notes again and again. On every pass it computes the
        nudge for every move with its values held still, adds the nudges up, and applies the total once. This is{' '}
        <strong>batch updating</strong>: with a small enough step, each method stops at its own answer. Here is a new
        notebook of ten trips, and every guess starts at 25 minutes.
      </p>
      <Figure
        readable
        caption="Each pass moves both dots, and they come to rest in different places: Monte Carlo on the average of each way’s own trips, TD(0) on its leg plus the station pooled over every trip. The rings mark where each will settle; the dashed line is the truth. Then make the fast train wait for the bus."
      >
        <Replay />
      </Figure>
      <p>
        When the trains come by chance, over {NOTEBOOKS.toLocaleString('en-US')} notebooks, TD’s bus and bike
        numbers miss the truth by about {miss(MISSES.own.td)} minutes and Monte Carlo’s by about{' '}
        {miss(MISSES.own.mc)}. TD wins because each bike trip borrows from every train in the notes, not only the few
        that followed a bike ride. That works when where you are tells you all that matters about what comes next:
        the <Link to="/learnings/markov-property">Markov property</Link>.
      </p>
      <p>
        Time the bus to meet the fast train, and that stops being true. The notes still say only “station”, but how you got there
        now changes what comes next, and pooling mixes the bus riders’ luck into the bike’s. Now TD misses by about{' '}
        {miss(MISSES.timed.td)} minutes and Monte Carlo by about {miss(MISSES.timed.mc)}: the bike’s own trips were
        telling the truth.
      </p>

      <Predict
        kicker="Quick check"
        question="A theme park logs how much longer guests stay after each ride. Every route ends at the Ferris wheel, but guests coming off the water ride are soaked and leave soon after, and the log doesn’t say who is wet. For the water ride, which settled answer do you trust?"
        options={[
          { label: 'Batch TD(0)' },
          { label: 'Batch Monte Carlo', right: true },
          { label: 'Either: they agree' },
          { label: 'Neither' },
        ]}
        reveal={
          <>
            Batch Monte Carlo. TD would value the water ride by the Ferris wheel’s pooled future, mostly dry guests
            who stay on. Being soaked is the part of the past the state leaves out, and only the water riders’ own
            returns carry it.
          </>
        }
      />

      <h2>Online, too</h2>
      <p>
        Without a notebook to replay, both learners can update as trips happen. TD can do it sooner, after every
        leg, with no wait for the end. Here both learn the same trips once each, starting from 25 minutes
        everywhere, averaged over {CURVE_RUNS} runs:
      </p>
      <Figure
        readable
        caption="TD’s line stays under Monte Carlo’s at every step size tried. A bigger step learns sooner and then wobbles more; Monte Carlo wobbles most, since each of its targets carries a whole trip’s luck.">
        <Curves />
      </Figure>
      <p>
        No one has proved that TD always gets there first, but on noisy tasks like this one it usually does. Even
        online, it heads roughly for the certainty-equivalence answer, without ever building the model.
      </p>

      <h2>Making it work</h2>
      <ul>
        <li>
          <strong>Trust TD when the state says it all.</strong> If what comes next depends only on where you are,
          pooling every visit to a later state beats averaging each state’s few episodes of its own.
        </li>
        <li>
          <strong>When the past matters, put it in the state.</strong> “Station, came by bus” is a different state
          from “station, came by bike”. Or use longer returns: <Link to="/learnings/n-step-returns">Walk a few
          steps, then guess</Link> sets the dial between the two methods.
        </li>
        <li>
          <strong>Let TD do the solving.</strong> Building the model means a table of n × n shares, and solving it
          directly takes about n³ steps. TD keeps one number per state and gets there in small steps. For{' '}
          {BIG.toLocaleString('en-US')} states:
        </li>
      </ul>
      <Numbers
        items={[
          { label: 'Model table', value: power(modelNumbers(BIG)), note: 'numbers, n²' },
          { label: 'Solving it', value: power(solveSteps(BIG)), note: 'steps, n³' },
          { label: 'TD', value: power(tdNumbers(BIG)), note: 'numbers, n' },
        ]}
      />
      <p>
        Building a model is not wasted effort everywhere, though. Learning one on purpose and planning with it is the
        idea behind model-based methods: more memory, in exchange for getting more out of every experience.
      </p>

      <Predict
        kicker="Check yourself"
        question="Ten trips in your fishing log passed the Lake: six went on to the North shore, where they caught 2 fish on average, and four to the South shore, 6 on average. One of the ten started at the Creek, walked to the Lake, then the North shore, and caught 1. Replayed until it settles, what is the Creek worth by batch TD(0) and by batch Monte Carlo?"
        options={[
          { label: '3.6 and 1', right: true },
          { label: '4 and 1' },
          { label: '2 and 1' },
          { label: '1 and 3.6' },
        ]}
        reveal={
          <>
            TD builds the model: the Lake led North 6 times in 10 and South 4 in 10, so it is worth 0.6 × 2 + 0.4 × 6
            = 3.6, and the Creek, one fishless walk before it, is worth 3.6 too. Monte Carlo has one Creek trip, which
            caught 1. A plain 4 forgets that the Lake goes North more often; 2 follows the Creek’s own path instead of
            the Lake’s shares.
          </>
        }
      />
    </Article>
  )
}
