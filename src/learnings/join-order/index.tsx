import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import JoinLab from './JoinLab'
import MemoTable from './MemoTable'
import {
  bushyCount,
  CHAIN,
  CHAIN_PLANS,
  cost,
  dpSplitCount,
  formatRows,
  leftDeepCount,
  maskOf,
  SHOP,
  SHOP_BRUTE,
  SHOP_DP,
  SHOP_GREEDY,
  SHOP_LINKED,
  size,
  TRIP,
  TRIP_PLANS,
} from './model'
import Trip, { type TripScene } from './Trip'

const n = formatRows
const [FH, CF, CH] = TRIP_PLANS
const SCENES: TripScene[] = ['lists', 'rule', 'fh', 'cf', 'pairs', 'triple', 'system']

// "17.6 billion" for the ten-table count
const billions = (x: number) => `${(x / 1e9).toFixed(1)} billion`

// Greedy's first join in the shop: the smallest result there is
const GREEDY_FIRST = size(SHOP, maskOf(SHOP_GREEDY.steps[0]))

// Check yourself: the chain's sizes and the four plans' costs
const chain = (mask: number) => n(size(CHAIN, mask))
const PLAN_COST = {
  greedy: cost(CHAIN, CHAIN_PLANS.greedy),
  best: cost(CHAIN, CHAIN_PLANS.best),
  leftFirst: cost(CHAIN, CHAIN_PLANS.leftFirst),
  pairs: cost(CHAIN, CHAIN_PLANS.pairs),
}

export default function JoinOrder() {
  return (
    <Article
      kicker="Inside a database · Query optimization"
      title="Join order"
      promise="A query joins seven tables, and the order it joins them in can change the work a thousandfold. How does a database find the best order without trying them all?"
      takeaway={
        <>
          Whatever plan builds the join of a set of tables, the rows are the same, so an optimizer plans each set once,
          smallest first: <em>dynamic programming over subsets</em> finds the best of {n(bushyCount(7))} seven-table join
          trees in {n(dpSplitCount(7))} splits.
        </>
      }
      sources={[
        {
          title: 'COMP 530: Database System Implementation',
          by: 'Chris Jermaine, Rice University, Fall 2025',
          part: 'Query optimization: logical optimization as search, memoization, and the exhaustive enumeration algorithm; Assignment 7, “Optimization”',
        },
        {
          title: 'Database System Implementation',
          by: 'Hector Garcia-Molina, Jeffrey D. Ullman and Jennifer Widom, 2000',
          part: 'Section 7.6, “Choosing an Order for Joins”',
        },
        {
          title: 'Access Path Selection in a Relational Database Management System',
          by: 'P. Griffiths Selinger, M. M. Astrahan, D. D. Chamberlin, R. A. Lorie and T. G. Price, SIGMOD 1979',
          part: 'Dynamic programming over join orders, and interesting orders, in System R',
          url: 'https://doi.org/10.1145/582095.582099',
        },
        {
          title: 'PostgreSQL documentation',
          by: 'The PostgreSQL Global Development Group',
          part: '“Query Planning” settings: geqo_threshold and join_collapse_limit',
          url: 'https://www.postgresql.org/docs/current/runtime-config-query.html',
        },
        {
          title: 'PostgreSQL documentation',
          by: 'The PostgreSQL Global Development Group',
          part: '“Genetic Query Optimizer”',
          url: 'https://www.postgresql.org/docs/current/geqo.html',
        },
      ]}
    >
      <Predict
        question="A query joins 7 tables, two inputs at a time. Either input of a join may be a table or the result of earlier joins. How many different join trees are there?"
        options={[{ label: '42' }, { label: n(leftDeepCount(7)) }, { label: n(bushyCount(7)), right: true }, { label: 'About 10 million' }]}
        reveal={
          <>
            {n(bushyCount(7))}. Adding the tables one at a time already gives 7! = {n(leftDeepCount(7))} orders, and letting
            both inputs be earlier results multiplies that by {bushyCount(7) / leftDeepCount(7)} shapes of tree. No
            database prices them all. A weekend trip shows what it does instead.
          </>
        }
      />

      <h2>A weekend from three lists</h2>

      <Steps
        readable
        say={[
          <>
            You’re planning a weekend away from three lists: {TRIP.concerts.length} concerts, {TRIP.flights.length}{' '}
            flights and {TRIP.rooms.length} hotel rooms.
          </>,
          <>
            A trip is a concert, a flight into its city that day and a room in that city; you match two lists first,
            copying each match onto a sheet, then match the sheet with the third.
          </>,
          <>
            Flights with rooms first: {FH.pairLines} pairs go on the sheet, and only {FH.trips} of them meet a concert.
          </>,
          <>
            Concerts with flights first: {CF.pairLines} pairs, then the same {CF.trips} trips, {CF.lines} lines written
            instead of {FH.lines}.
          </>,
          <>
            Before adding a third list, you note on a card how long each pair’s sheet is: {CF.pairLines}, {CH.pairLines}{' '}
            and {FH.pairLines} lines.
          </>,
          <>
            The best way to do all three is then a card plus one more list: three sums, and {CF.lines} wins without matching
            any pair again.
          </>,
          <>
            That is a query optimizer: each list is a table, each sheet an intermediate result, each line a row, and the
            cards are its memo table, one entry per set of tables.
          </>,
        ]}
      >
        {(step) => <Trip key={step} scene={SCENES[step]} />}
      </Steps>

      <h2>Too many orders to try</h2>
      <p>
        The course this page follows prices a plan by adding up the rows its joins produce: the sheets of the story. The
        sizes are estimates (see <Link to="/learnings/size-estimation">estimating result sizes</Link>), and the final
        result is the same in every order, so only the joins in between tell plans apart. If each join adds one table to
        what you have, a <strong>left-deep</strong> tree, a plan is an order of the n tables, and there are n! of them. If
        both inputs may be earlier results, a <strong>bushy</strong> tree, there are (2n − 2)! / (n − 1)!.
      </p>
      <p>
        The cards are the way out. Any plan for a set of tables builds the same rows, so everything above it costs the
        same whichever plan built them. The best plan for the whole query must then use the best plan for every set
        inside it. That is the <strong>principle of optimality</strong>, and it allows{' '}
        <strong>dynamic programming over subsets</strong>: fill a table with the cheapest plan for every set of tables,
        pairs first, and price each set by every split into a left and a right part, both already in the table.
      </p>
      <p className="text-center font-serif text-xl">best(S) = min over splits of best(left) + best(right) + rows(S)</p>
      <p>IBM’s System R optimizer worked this way in 1979. Counting its splits takes one trick.</p>

      <Clip
        src="join-order/split-count"
        label="Every split of every set of tables: each of the n tables goes left, right or out, 3 to the n ways. Take away the 2 to the n with nothing on the left and the 2 to the n with nothing on the right, and add back the one way with nothing on either side, which was taken away twice: 3 to the n, minus 2 to the n plus 1, plus 1. For 7 tables, 2,187 minus 256 plus 1 is 1,932 splits, against 665,280 trees."
        caption="Each table goes left, right or out of the set, and a split needs something on both sides. The work grows like 3ⁿ; the trees grow much faster."
      />

      <Numbers
        items={[4, 7, 10].map((k) => ({
          label: `${k} tables`,
          value: k === 10 ? billions(bushyCount(k)) : n(bushyCount(k)),
          note: `trees · ${n(dpSplitCount(k))} splits`,
        }))}
      />
      <p>
        From six tables on, there are fewer splits than even left-deep orders: {n(dpSplitCount(7))} against{' '}
        {n(leftDeepCount(7))} at seven.
      </p>

      <h2>Plan a real query</h2>
      <p>
        A shop’s query joins five tables, each already filtered: customers of one market segment, suppliers in one
        country. Each line is a join condition, marked with what its size estimate divides by. Pick two pieces to join,
        then two more, until one is left.
      </p>
      <Figure
        readable
        caption={`Sage lines are conditions inside a piece you have built. The best plan produces ${n(SHOP_DP.cost)} rows. The ${SHOP_LINKED.trees} plans with no cross product run up to ${n(SHOP_LINKED.worst)}, and the worst of all ${n(SHOP_BRUTE.trees)} trees to ${Math.round(SHOP_BRUTE.worstCost / 1e6)} million.`}
      >
        <JoinLab />
      </Figure>
      <p>
        A quicker rule is <strong>greedy</strong>: always join the two pieces whose result is smallest. Here its first move
        is CUSTOMER × SUPPLIER, {n(GREEDY_FIRST)} rows with no condition between them, smaller than any real join, and it
        drags them through ORDERS: {n(SHOP_GREEDY.cost)} in all, {(SHOP_GREEDY.cost / SHOP_DP.cost).toFixed(1)} times the
        best. Keeping the k best partial plans instead of one (a beam search) misses less often, but still promises
        nothing. Dynamic programming fills its table for the same query below.
      </p>
      <Figure caption="Each card holds the cheapest plan for its set of tables, as rows produced. Pricing a set’s splits only looks up two cards already filled, so nothing is planned twice. The sage cards are the ones the best plan is built from.">
        <MemoTable />
      </Figure>

      <h2>Where the shortcut breaks</h2>
      <p>
        The principle needs a subplan to affect the rest only through its rows. Count real work instead of rows and that
        fails: a <Link to="/learnings/join-algorithms">sort-merge join</Link> hands its rows up sorted, and sorted input can
        make the next join cheaper, so a dearer subplan can win overall. System R therefore kept, for each set of tables,
        the cheapest plan plus the cheapest for each <strong>interesting order</strong>, a sort order some later step can
        use.
      </p>

      <Predict
        kicker="Quick check"
        question="A database counts real work. For ORDERS ⋈ LINEITEM, plan X costs 900 units; plan Y costs 1,000 but hands its rows up sorted on the key the next join uses. What should the memo table keep for that set?"
        options={[
          { label: 'Only X, the cheapest: the principle of optimality says so' },
          { label: 'Only Y: sorted rows are always worth it' },
          { label: 'Both: the cheapest plan, and the cheapest sorted on that key', right: true },
          { label: 'Neither: plan the set again every time it is used' },
        ]}
        reveal={
          <>
            Both. Whether Y’s order saves more than 100 units depends on the join above, which the table can’t see yet, so
            it keeps one plan per useful order and lets the step above choose. Keeping only X applies the principle where
            it no longer holds; keeping only Y pays 100 extra when nothing above wants the order; planning again gives up
            the table.
          </>
        }
      />

      <h2>What databases do with it</h2>
      <ul>
        <li>
          <strong>Keep statistics fresh.</strong> The search is exact only for the sizes it is given; with stale counts it
          finds the best plan for data you no longer have. In PostgreSQL, <code>ANALYZE</code> refreshes them.
        </li>
        <li>
          <strong>Cap the search for huge joins.</strong> PostgreSQL searches near-exhaustively below{' '}
          <code>geqo_threshold</code> (12 tables by default) and switches to a genetic search, GEQO, at or above it, while{' '}
          <code>join_collapse_limit</code> (8) bounds how many explicit JOINs it will reorder.
        </li>
        <li>
          <strong>Force an order rarely.</strong> A hint, or <code>join_collapse_limit = 1</code>, freezes today’s order
          while the data keeps changing. Fix the estimate that misled the optimizer first.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question={`Four tables in a chain, A–B–C–D. Their joins give A⋈B ${chain(0b0011)} rows, B⋈C ${chain(0b0110)}, C⋈D ${chain(0b1100)}, A⋈B⋈C ${chain(0b0111)}, B⋈C⋈D ${chain(0b1110)}, and all four ${chain(0b1111)}. Leaving out cross products, which plan produces the fewest rows in all?`}
        options={[
          { label: 'C ⋈ D first, the smallest join, then B, then A' },
          { label: 'B ⋈ C first, then A, then D', right: true },
          { label: 'A ⋈ B first, then C, then D' },
          { label: 'A ⋈ B and C ⋈ D, then the two together' },
        ]}
        reveal={
          <>
            B ⋈ C, then A, then D: {chain(0b0110)} + {chain(0b0111)} + {chain(0b1111)} = {PLAN_COST.best}. Starting from
            the smallest join, as greedy does, costs {chain(0b1100)} + {chain(0b1110)} + {chain(0b1111)} ={' '}
            {PLAN_COST.greedy}: C ⋈ D grows when B joins it, while B ⋈ C shrinks once A does. A ⋈ B first costs{' '}
            {PLAN_COST.leftFirst}, and the two pairs {PLAN_COST.pairs}. The cheapest first step need not start the
            cheapest plan.
          </>
        }
      />
    </Article>
  )
}
