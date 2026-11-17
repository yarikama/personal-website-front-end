import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Button, Controls, Figure, Numbers, Slider } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Estimates from './Estimates'
import {
  andError,
  CARS,
  CARS_ACTUAL,
  CARS_ESTIMATE,
  CITY,
  CITY_SIZE,
  COLOURS,
  COLOURS_BY_MIN,
  COLOURS_JOIN,
  CUSTOMERS,
  formatRows,
  GUESS_JOIN,
  HOSTS,
  lab,
  LAB_R,
  LAB_S,
  NEIGHBOURS,
  ORDERS,
  PLAN_ERROR,
  PLAN_STEPS,
  STEP_ERROR,
  STORY,
  TWO_RANGES,
} from './model'
import Party from './Party'

const n = (x: number) => formatRows(x)

export default function SizeEstimation() {
  const [distinct, setDistinct] = useState(20)
  const [correlation, setCorrelation] = useState(0)
  const [seed, setSeed] = useState(1)
  const rows = lab(distinct, correlation / 10, seed)

  return (
    <Article
      kicker="Inside a database · Query optimization"
      title="Estimating result sizes"
      promise="To pick a plan, a database has to know how many rows each step will produce, before it runs any of them. How can it?"
      takeaway={
        <>
          An optimizer guesses each result’s size from row counts and distinct values: a = c keeps 1/V of the rows, and a
          join divides T(R)·T(S) by the larger V. The guesses assume columns are <em>independent</em>, and where they are
          not, the error multiplies up the plan.
        </>
      }
      sources={[
        {
          title: 'COMP 530: Database System Implementation',
          by: 'Chris Jermaine, Rice University, Fall 2025',
          part: 'Lectures “Intro to compilation and optimization” and “Exhaustive optimization algorithm pseudo-code”, and Assignment 7: a plan priced by the sizes of its intermediate results',
        },
        {
          title: 'Database System Implementation',
          by: 'Hector Garcia-Molina, Jeffrey D. Ullman and Jennifer Widom, 2000',
          part: 'Chapter 7, “The Query Compiler”, section 7.4, “Estimating the Cost of Operations”',
        },
        {
          title: 'PostgreSQL Documentation',
          by: 'The PostgreSQL Global Development Group',
          part: '“Statistics Used by the Planner”: most common values, histograms and extended statistics',
          url: 'https://www.postgresql.org/docs/current/planner-stats.html',
        },
        {
          title: 'How Good Are Query Optimizers, Really?',
          by: 'Viktor Leis, Andrey Gubichev, Atanas Mirchev, Peter Boncz, Alfons Kemper and Thomas Neumann, PVLDB 9(3), 2015',
          part: 'How estimation errors grow with the number of joins',
          url: 'https://www.vldb.org/pvldb/vol9/p204-leis.pdf',
        },
      ]}
    >
      <Predict
        question={`A shop’s database has ${n(ORDERS)} orders and ${n(CUSTOMERS)} customers. Join them on customer id: how many rows come out?`}
        options={[{ label: '10,000,000' }, { label: '11,000' }, { label: n(GUESS_JOIN), right: true }, { label: '1,000' }]}
        reveal={
          <>
            {n(GUESS_JOIN)}: every order belongs to one customer, so each order pairs with exactly one row. An optimizer has
            to reach that number before running anything, without knowing which column is a key. It gets there from four
            counts, the way you might guess at a party.
          </>
        }
      />

      <h2>Guessing at a party</h2>

      <Steps
        readable
        say={[
          <>You’re at a party of {HOSTS}, and you want to know how many guests were born in March without asking around.</>,
          <>
            Birthdays spread fairly evenly over the year, so you guess 1 in 12 of the room, {STORY.marchGuess}; you ask, and
            it is {STORY.march}.
          </>,
          <>
            Next door there are {NEIGHBOURS} more, so each of your guests should find about {NEIGHBOURS} ÷ 12 of them born in
            the same month: {STORY.pairsGuess} pairs in all, and counting finds {STORY.pairs}.
          </>,
          <>
            Now guess how many of your guests were born in March and are Pisces: 1 in 12 of 1 in 12 of the room, under half
            a person.
          </>,
          <>
            There are {STORY.pisces}, because most March birthdays fall under Pisces: the two facts go together, and
            multiplying their odds came out {Math.round(STORY.pisces / STORY.piscesGuess)} times too low.
          </>,
          <>
            A database guesses the same way: the party is a table R of T(R) = {HOSTS} rows, birth month a column with V = 12
            distinct values, and the pairs are a join.
          </>,
        ]}
      >
        {(step) =>
          step === 0 ? (
            <Party key="room" scene="room" />
          ) : step === 1 ? (
            <Party key="months" scene="months" />
          ) : step === 2 ? (
            <Party key="pairs" scene="pairs" />
          ) : step === 3 ? (
            <Party key="pisces-guess" scene="pisces-guess" />
          ) : step === 4 ? (
            <Party key="pisces" scene="pisces" />
          ) : (
            <Party key="reveal" scene="reveal" />
          )
        }
      </Steps>

      <h2>Two numbers per table</h2>
      <p>
        An optimizer can’t run every plan to find the cheapest, so it prices each one by how many rows its steps will
        produce; in the course’s optimizer the price is just those sizes added up. For each table it keeps two counts:
        T(R), the rows, and V(R, a), the distinct values in column a. Every size above the tables is guessed from them.
      </p>
      <p>
        <strong>One value.</strong> If a column’s values are spread evenly (the uniformity assumption), a = c keeps one row
        in V: T(R)/V(R, a). The share a condition keeps is its selectivity. A range such as a &lt; c gives V nothing to work
        with, so the textbook guesses a third of the rows, and a ≠ c keeps all but one row in V.
      </p>
      <p>
        <strong>Two conditions.</strong> Treat them as unrelated (independence) and multiply their selectivities for AND.
        For OR, take away the rows that fail both: T(R)·(1 − (1 − s₁)(1 − s₂)).
      </p>
      <p>
        <strong>A join on Y.</strong> A row of R meets the rows of S that share its Y value, T(S)/V(S, Y) of them, provided
        its value is in S at all. The rule assumes it is whenever S has at least as many distinct values (containment of
        value sets), and turns round when R has more. Either way, T(R)·T(S) is divided by the larger of V(R, Y) and V(S,
        Y).
      </p>

      <Clip
        src="size-estimation/join-size"
        label="One row of R matches T of S over V of S, Y rows, if its Y value is in S, as when V of R is at most V of S. All the rows of R match T of R times T of S over V of S, Y. The other way round, divide by V of R, Y. Either way, divide by the larger: T of R times T of S over the max of the two V's. With 10,000 orders, 1,000 customers and 800 of them having ordered: 10,000 times 1,000 over 1,000 is 10,000. Dividing by the smaller would give 12,500, more rows than orders."
        caption="Each row of the side with fewer values meets its value’s share of the other side. Dividing by the smaller V would promise more rows than there are orders."
      />

      <Numbers
        items={[
          { label: 'One city', value: n(CITY_SIZE), note: `${n(CITY.rows)} ÷ ${CITY.cities}` },
          { label: 'Two ranges', value: n(TWO_RANGES), note: 'TPC-H lineitem ÷ 3 ÷ 3' },
          { label: 'Orders ⋈ customers', value: n(GUESS_JOIN), note: `${n(ORDERS)} × ${n(CUSTOMERS)} ÷ ${n(CUSTOMERS)}` },
        ]}
      />
      <p>
        This is <strong>size estimation</strong>, or cardinality estimation. (The two ranges are on TPC-H’s lineitem
        table, where the course’s own optimizer reports exactly {n(TWO_RANGES)}.) Each result gets statistics of its own for
        the step above: after a = c, V(a) is 1; after a join on Y, V(Y) is the smaller of the two; a join on two columns
        divides once per column; other columns keep their V (preservation of value sets), but never more than the new T.
        <Link to="/learnings/predicate-pushdown">Pushing selections down</Link> and{' '}
        <Link to="/learnings/join-order">choosing the join order</Link> both weigh plans by these sizes.
      </p>
      <p>
        Since every estimate stands on the ones below it, errors multiply: {PLAN_STEPS} steps each {STEP_ERROR} times off
        leave the top {n(PLAN_ERROR)} times off. Tested on real data, real optimizers’ estimates are routinely 10 times off
        or worse, and further off the more joins a query has.
      </p>

      <h2>Watch independence break</h2>
      <p>
        Two tables made from a seed: R has {n(LAB_R)} rows and S has {n(LAB_S)}, with columns a and b holding V values
        each, spread evenly. Correlation is the share of rows where b copies a, as a country follows from a city. The
        guesses use T and V measured on the rows.
      </p>
      <Figure
        readable
        caption={
          <>
            Outlined bars are the guesses and sage bars the counts, on a log scale. At correlation 0 they agree up to
            chance. Raise it and the AND and the two-column join fall short, by V times once b always copies a, while one
            value and the join on a alone never notice.
          </>
        }
      >
        <Estimates rows={rows} />
        <Controls>
          <Slider label="Distinct values V" value={distinct} min={2} max={100} onChange={setDistinct} />
          <Slider
            label="Correlation"
            value={correlation}
            min={0}
            max={10}
            onChange={setCorrelation}
            format={(c) => `${c * 10}%`}
          />
          <Button onClick={() => setSeed((s) => s + 1)}>New rows</Button>
        </Controls>
      </Figure>

      <Predict
        kicker="Quick check"
        question={`${n(CARS.rows)} used cars come in ${CARS.makes} makes and ${CARS.models} models, spread evenly. For make = 'Toyota' AND model = 'Corolla' the optimizer multiplies 1/${CARS.makes} by 1/${CARS.models} and expects ${n(CARS_ESTIMATE)} rows. About how many are there?`}
        options={[
          { label: `About ${n(CARS_ESTIMATE)}` },
          { label: `About ${n(CARS_ACTUAL)}`, right: true },
          { label: 'About 25,000' },
          { label: 'None' },
        ]}
        reveal={
          <>
            About {n(CARS_ACTUAL)}, one model’s share of {n(CARS.rows)}. Every Corolla is a Toyota, so once the model is
            fixed the make removes nothing, and multiplying both fractions counts the same narrowing twice. The guess is{' '}
            {andError(CARS.makes, 1)} times too small: the number of makes.
          </>
        }
      />

      <h2>What databases do about it</h2>
      <ul>
        <li>
          <strong>Keep the statistics fresh.</strong> A guess is only as good as its T and V. PostgreSQL’s{' '}
          <code>ANALYZE</code> samples each table for them; autovacuum reruns it as rows change, but run it yourself after
          a bulk load.
        </li>
        <li>
          <strong>Say which columns go together.</strong> Single-column statistics can’t see that a city settles its
          country. PostgreSQL’s <code>CREATE STATISTICS</code> on (city, country) records it, and the planner stops
          multiplying.
        </li>
        <li>
          <strong>Let histograms handle skew.</strong> Uniformity fails when a few values hold most of the rows, so real
          systems keep the most common values and a histogram of the rest instead of assuming 1/V.
        </li>
        <li>
          <strong>Compare guesses with counts.</strong> <code>EXPLAIN ANALYZE</code> prints each step’s estimated rows
          beside the actual ones; the lowest step where they part by 10 times is where the plan went wrong.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question={`Table R has ${n(COLOURS.rowsR)} rows whose colour takes ${COLOURS.distinctR} values; table S has ${n(COLOURS.rowsS)} rows in ${COLOURS.distinctS} colours. About how many rows does R ⋈ S on colour give?`}
        options={[
          { label: n(COLOURS_BY_MIN) },
          { label: n(COLOURS_JOIN), right: true },
          { label: '6,000,000' },
          { label: '5,000' },
        ]}
        reveal={
          <>
            {n(COLOURS_JOIN)}. S has more colours, so R’s {COLOURS.distinctR} are assumed to be among its{' '}
            {COLOURS.distinctS}. Each row of R then meets {n(COLOURS.rowsS)} ÷ {COLOURS.distinctS} ={' '}
            {COLOURS.rowsS / COLOURS.distinctS} rows of S, and {n(COLOURS.rowsR)} × {COLOURS.rowsS / COLOURS.distinctS} ={' '}
            {n(COLOURS_JOIN)}. Dividing by the smaller {COLOURS.distinctR} spreads S’s rows over R’s colours instead of its
            own. 6,000,000 is every pair, and 5,000 the two tables added.
          </>
        }
      />
    </Article>
  )
}
