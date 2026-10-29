import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Choice, Controls, Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Cart from './Cart'
import {
  BEST,
  DAYS,
  dollars,
  EPSILON,
  GAPS,
  MACHINES,
  randomCost,
  STARTS,
  story,
  TAKINGS,
  YEAR,
  type Start,
} from './model'
import Testbed from './Testbed'

export default function Regret() {
  // The story's two carts, and the numbers they tell
  const { you, friend } = useMemo(() => story(), [])
  const end = you[DAYS - 1]
  const hers = friend[DAYS - 1]
  const daily = dollars(randomCost())
  const yours = dollars(end.regret)
  const herRegret = dollars(hers.regret)
  const sum = (day: typeof end) => `${GAPS[1]} × ${day.visits[1]} + ${GAPS[2]} × ${day.visits[2]}`
  const perDay = (day: typeof end) => dollars(BEST - day.regret / DAYS)

  const [start, setStart] = useState<Start>(0)

  return (
    <Article
      kicker="Reinforcement learning · Bandits"
      title="Counting what you missed"
      promise="Two learners end up knowing exactly how good every option is. Why does one of them keep falling further behind?"
      takeaway={
        <>
          Judge a learner by its <em>regret</em>, the gap times the pulls of every worse arm: if it grows in a straight
          line, the learner never stops paying for exploring, however well it knows its arms.
        </>
      }
      sources={[
        {
          title: 'Reinforcement Learning: An Introduction',
          by: 'Richard S. Sutton and Andrew G. Barto, 2nd edition',
          part: 'Chapter 2, “Multi-armed Bandits”, §2.7 “Upper-Confidence-Bound Action Selection”',
          url: 'http://incompleteideas.net/book/the-book-2nd.html',
        },
        {
          title: 'Finite-time Analysis of the Multiarmed Bandit Problem',
          by: 'Peter Auer, Nicolò Cesa-Bianchi and Paul Fischer, Machine Learning 47, 2002',
          url: 'https://link.springer.com/article/10.1023/A:1013689704352',
        },
        {
          title: 'COMP 442/552: Reinforcement Learning',
          by: 'Vaibhav Unhelkar, Rice University, Fall 2026',
          part: 'Value-based Algorithms for Solving Multi-Armed Bandits, and its addendum',
        },
      ]}
    >
      <Predict
        question="A street vendor picks one of three corners each day: the best so far, except 1 day in 10, when she picks at random to keep learning. After ten years she knows exactly what every corner takes on average. What about her takings?"
        options={[
          { label: 'They match the best corner’s' },
          { label: 'They stay below it, by the same amount, for ever', right: true },
          { label: 'They keep creeping up to it' },
          { label: 'They sink to an average corner’s' },
        ]}
        reveal={
          <>
            They stay below. Knowing the corners doesn’t stop the dice: 1 day in 10 still goes to a random corner, often
            a worse one, in the eleventh year as in the first. Her estimates have settled; her behaviour never will.
          </>
        }
      />

      <h2>Three corners</h2>

      <Steps
        say={[
          <>
            You sell ice cream from a cart, and each morning you pick one of three corners: the Park, the Station or the
            Market.
          </>,
          <>
            Unknown to you, an average day takes ${TAKINGS[0]} at the Park, ${TAKINGS[1]} at the Station and $
            {TAKINGS[2]} at the Market, give or take $80.
          </>,
          <>
            So a day at the Station costs you ${GAPS[1]} against the Park, on average, and a day at the Market $
            {GAPS[2]}. Add those up and you have what not knowing has cost you.
          </>,
          <>
            You go to your best corner so far, except 1 day in {Math.round(1 / EPSILON)}, when you pick one at random to
            keep learning.
          </>,
          <>
            Within a year your averages are close to the truth, and they stay close. Yet the cost climbs on, about{' '}
            {daily} a day, all from the random days.
          </>,
          <>
            Your friend sells from the same corners, but goes where her average plus its doubt is highest. Her cost
            climbs fast, then flattens: {herRegret} in three years, against your {yours}.
          </>,
          <>
            That cost is <strong>regret</strong>: for each worse corner, its gap times the days spent there. Yours grows
            in a straight line, <strong>linear</strong> regret; hers bends ever flatter, <strong>sublinear</strong>.
          </>,
        ]}
      >
        {(step) =>
          step === 0 ? (
            <Cart key="try" days={you} from={0} to={3} pace={900} />
          ) : step === 1 ? (
            <Cart key="truth" days={you} from={3} to={3} pace={1} truth />
          ) : step === 2 ? (
            <Cart key="cost" days={you} from={3} to={60} pace={110} truth />
          ) : step === 3 ? (
            <Cart key="year" days={you} from={60} to={YEAR} pace={14} truth />
          ) : step === 4 ? (
            <Cart key="years" days={you} from={YEAR} to={DAYS} pace={5} span={DAYS} truth averages />
          ) : step === 5 ? (
            <Cart
              key="friend"
              days={friend}
              who="Your friend"
              other={{ days: you, who: 'you', upTo: DAYS }}
              from={0}
              to={DAYS}
              pace={4}
              span={DAYS}
              truth
            />
          ) : (
            <Cart
              key="named"
              days={friend}
              who="Your friend"
              other={{ days: you, who: 'you', upTo: DAYS }}
              from={DAYS}
              to={DAYS}
              pace={1}
              span={DAYS}
              truth
            />
          )
        }
      </Steps>

      <h2>Gap times pulls</h2>
      <p>
        Regret compares you with someone who knew the best corner from day one. You can’t see it day by day, since the
        best corner has bad days too, but on average each day elsewhere costs that corner’s gap, so the total is simple
        bookkeeping:
      </p>
      <Clip
        src="regret/gap-times-pulls"
        label={`Regret after T steps: T times the best mean, minus the expected rewards you collected. Grouped by arm, it is the sum over arms of the gap, delta a, times the expected number of pulls of a. Your three years: 60 times ${end.visits[1]} plus 180 times ${end.visits[2]}, ${yours}. Divide by T: the average reward is the best mean minus regret over T. If regret grows like T, the average stays below the best; if it grows slower than T, the average closes in on the best.`}
        caption="Regret splits into one term per worse arm: how much worse it is, times how often you pulled it. Divided by the days, it is how far your average day falls short of the best."
      />
      <Numbers
        items={[
          { label: `You: ${sum(end)}`, value: yours, note: `average day ${perDay(end)}` },
          { label: `Friend: ${sum(hers)}`, value: herRegret, note: `average day ${perDay(hers)}` },
          { label: 'Random days, once you know', value: daily, note: '0.1 × average gap of $80, a day' },
        ]}
      />
      <p>
        Exploring at random costs ε times the average gap every day, for good, so your regret keeps a slope of about{' '}
        {daily} and your average day stays about that far below ${BEST}. Your friend explores only where she is still
        unsure, and as she grows sure she explores ever less: her regret grows like the logarithm of time, the kind of
        curve from <Link to="/learnings/upper-confidence-bound">The benefit of the doubt</Link>. Regret that grows
        slower than time means the average day closes in on the best one.
      </p>

      <h2>Four ways to explore</h2>
      <p>
        Now the ten-armed testbed from the earlier pages, {MACHINES} machines averaged, 2,000 pulls each: never
        exploring, exploring 1 time in 10, exploring with chance 10/t so it fades as pulls add up, and UCB. Then make
        every starting estimate a gloomy −5, far below any arm.
      </p>
      <Figure
        readable
        caption={
          <>
            With ε = 0.1 the regret is a straight line, and its average reward levels off below the best arm’s, at about
            (1 − ε) of the best plus ε of an average arm. Fading ε and UCB bend over, and their averages keep closing
            in. Start at −5 and greedy never recovers; random exploring recovers, slowly; UCB is untouched, since it
            tries every arm once before anything else.
          </>
        }
      >
        <Testbed start={start} />
        <Controls>
          <Choice
            label="Every estimate starts at"
            options={STARTS}
            value={start}
            onChange={setStart}
            format={(value) => (value < 0 ? `−${-value}` : String(value))}
          />
        </Controls>
      </Figure>

      <Predict
        kicker="Quick check"
        question="With every estimate starting at −5, pure greedy never recovers. Why?"
        options={[
          { label: 'Its estimates never settle' },
          { label: 'The first arm it tries beats −5, so it never tries another', right: true },
          { label: 'At −5 it explores for ever' },
          { label: 'Its rewards are below −5' },
        ]}
        reveal={
          <>
            Every arm pays far more than −5, so whichever arm greedy happens to pull first now looks better than every
            untried one, which still say −5. It never pulls another, and never learns otherwise. Random exploring
            eventually tries the rest; UCB tries each arm once before trusting any estimate.
          </>
        }
      />

      <h2>What to do about it</h2>
      <ul>
        <li>
          <strong>Measure regret, not just estimates.</strong> Estimates that settle say nothing about what you keep
          paying. Plot the regret, or the average reward against the best, and look at the slope.
        </li>
        <li>
          <strong>Let exploring fade, or aim it.</strong> A fixed ε pays the same price for ever. Shrink ε as you learn,
          or explore by doubt as UCB does, and the price shrinks too.
        </li>
        <li>
          <strong>Mind where estimates start.</strong> A gloomy start traps a greedy learner on its first try; a hopeful
          one, as in <Link to="/learnings/optimistic-initial-values">Optimism explores</Link>, makes it look around.
        </li>
        <li>
          <strong>Logarithmic is as good as it gets.</strong> No learner can beat regret that grows with the logarithm
          of time on every problem; UCB reaches that, which is why it is the yardstick.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="A news site shows one of four headlines to each visitor: the best so far, or a random one with chance 0.05. Its click estimates are accurate after 100,000 visitors. How much regret will visitors 900,000 to 1,000,000 add, compared with visitors 100,000 to 200,000?"
        options={[
          { label: 'Almost none' },
          { label: 'About the same', right: true },
          { label: 'About a tenth as much' },
          { label: 'Ten times as much' },
        ]}
        reveal={
          <>
            About the same. With its estimates settled, every 100,000 visitors bring about 5,000 random headlines, and
            each of those costs the average gap. Fixed ε means linear regret: the same loss for every stretch of the
            same length, for ever.
          </>
        }
      />
    </Article>
  )
}
