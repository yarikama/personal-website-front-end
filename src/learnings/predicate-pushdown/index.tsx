import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import BirthdayGrid, { type Scene } from './BirthdayGrid'
import {
  ANSWER,
  CUSTOMER,
  FRIENDS_LEFT,
  GIFTS_LEFT,
  GUESS,
  GUESS_DAYS,
  GUESS_PRODUCT,
  HOUSTON,
  HOUSTON_ORDERS,
  LAB_NUMBERS,
  ORDERS,
  ORDERS_COLUMNS,
  ORDERS_EACH,
  PRODUCT,
  PUSHED_BIGGEST,
  ROW_BYTES,
  STORY,
  TEA_SHARE,
  TEAS,
} from './model'
import PushLab from './PushLab'

const n = (x: number) => x.toLocaleString('en-US')
const SCENES: Scene[] = ['lists', 'rules', 'late', 'friends', 'gifts', 'early', 'plan']
const TRILLION = `${GUESS_PRODUCT / 1e12} trillion`

export default function PredicatePushdown() {
  return (
    <Article
      kicker="Inside a database · Query optimization"
      title="Predicate pushdown"
      promise="The first plan a database builds for your query gives the right answer, and could take a year to run. What can it rearrange without changing that answer?"
      takeaway={
        <>
          Split the WHERE at its ANDs and move each clause down to the <em>lowest operator that has every column it reads</em>:
          filters run before joins, a clause over two tables becomes their join condition, and the answer never changes.
        </>
      }
      sources={[
        {
          title: 'COMP 530: Database System Implementation',
          by: 'Chris Jermaine, Rice University, Fall 2025',
          part: 'Lecture notes “Query optimization and compilation”: the canonical plan, the transformation rules for selections and joins, and optimization as a search',
        },
        {
          title: 'Database System Implementation',
          by: 'Hector Garcia-Molina, Jeffrey D. Ullman and Jennifer Widom, 2000',
          part: 'Section 7.2, “Algebraic Laws for Improving Query Plans”: laws for selection and projection, and pushing selections',
        },
        {
          title: 'PostgreSQL documentation',
          by: 'The PostgreSQL Global Development Group',
          part: '“Using EXPLAIN”',
          url: 'https://www.postgresql.org/docs/current/using-explain.html',
        },
      ]}
    >
      <Predict
        question={`CUSTOMER has ${n(GUESS.customers)} rows, ORDERS ${n(GUESS.orders)} and PRODUCT ${n(GUESS.products)}. A query asks which Houston customers bought tea. The first plan pairs every row of every table, then applies the WHERE. How many rows does the pairing make?`}
        options={[
          { label: 'About a million' },
          { label: `About ${n(GUESS.customers + GUESS.orders + GUESS.products)}` },
          { label: 'About 10 billion' },
          { label: TRILLION, right: true },
        ]}
        reveal={
          <>
            {TRILLION}: {n(GUESS.customers)} × {n(GUESS.orders)} × {n(GUESS.products)}. Pairing multiplies the sizes; it
            never adds them. At {3 * ROW_BYTES} bytes a row that is 3 petabytes, and writing it once at 100 MB/s would take{' '}
            {Math.round(GUESS_DAYS)} days. Yet the answer is a few hundred rows, and a plan that filters first never holds
            more than {n(PUSHED_BIGGEST)} on the way. Buying birthday presents shows how.
          </>
        }
      />

      <h2>Presents for six friends</h2>

      <Steps
        say={[
          <>
            You’re buying birthday presents: {STORY.friends} friends, a shop with {STORY.gifts} gifts, and you want every
            friend-and-gift pair worth buying.
          </>,
          <>A pair is worth it if the friend’s birthday is this month, the gift costs under $30, and it suits the friend’s hobby.</>,
          <>
            Taken literally, you write a card for all {STORY.friends} × {STORY.gifts} = {STORY.cards} pairs, then test each
            card: {STORY.answerLate} survive.
          </>,
          <>
            But the birthday rule reads only the friend, so check the friends first: {STORY.friends} become{' '}
            {FRIENDS_LEFT}, and a crossed-out row never gets a card.
          </>,
          <>
            The price rule reads only the gift: {STORY.gifts} gifts become {GIFTS_LEFT}.
          </>,
          <>
            Now write cards only where both are left, {FRIENDS_LEFT} × {GIFTS_LEFT} = {STORY.earlyCards}, and the hobby rule,
            the one that needs both, keeps the same {STORY.answerEarly}.
          </>,
          <>
            That was a query plan: the lists are tables, the grid is their product, each rule is a clause of the WHERE, and
            two of the clauses moved below the product.
          </>,
        ]}
      >
        {(step) => <BirthdayGrid key={step} scene={SCENES[step]} />}
      </Steps>

      <h2>Move each clause down</h2>
      <p>
        A database’s first plan is the tree from <Link to="/learnings/relational-algebra">relational algebra</Link>: a
        product of every table in FROM, the whole WHERE as one filter over it, the SELECT on top. The optimizer rewrites that
        tree with rules that never change the answer. First it cuts the WHERE into an AND of clauses, each of which may be
        an OR of comparisons, a shape called <strong>conjunctive normal form</strong> (CNF). A row must pass every clause, so
        they can be tested in any order and in different places. Each one then goes by a single test:
      </p>
      <p className="text-center font-serif text-2xl">
        A clause can move onto an input if every column it reads comes from that input.
      </p>
      <p>
        Over a product of R and S, a clause that reads only R goes onto R, and one that reads only S goes onto S. One that
        reads both stays at the product as its condition, and a product with a condition is a join: × becomes ⋈. Repeat at
        every level and each clause sinks to the lowest node that has all its columns. This is{' '}
        <strong>predicate pushdown</strong>. It is safe because a row a clause throws out at the top would have been thrown
        out in every pair it joined; testing it first only skips making those pairs.
      </p>

      <Clip
        src="predicate-pushdown/push-down"
        label="The plan for the presents: a filter on birthday, price under 30 and same hobby, over FRIEND times GIFT, with 48 rows at the product. Each clause says what it reads: FRIEND, GIFT, or both. The birthday clause slides down onto FRIEND, which then hands up 3 rows, and the price clause onto GIFT, 4 rows. The hobby clause turns the product into a join on same hobby, which makes 12 rows instead of 48, and the same 3 pairs come out."
        caption="Each clause slides down until it reaches the one table it reads; the clause that reads both stops at the product and turns it into a join."
      />

      <p>
        Back to the guess, with its WHERE written out: <code>c.city = 'Houston'</code>, <code>p.kind = 'tea'</code>,{' '}
        <code>o.cust = c.id</code> and <code>o.prod = p.id</code>. Say {HOUSTON} customers live in Houston, {TEAS} products are
        teas, each customer has {ORDERS_EACH} orders, and orders spread evenly over the products.
      </p>
      <ul>
        <li>
          <code>c.city = 'Houston'</code> reads only CUSTOMER, so it goes onto CUSTOMER: {n(GUESS.customers)} rows become{' '}
          {HOUSTON}.
        </li>
        <li>
          <code>p.kind = 'tea'</code> reads only PRODUCT: {n(GUESS.products)} rows become {TEAS}.
        </li>
        <li>
          <code>o.cust = c.id</code> reads CUSTOMER and ORDERS, so it becomes their join’s condition: the {HOUSTON} customers
          meet only their own orders, {n(HOUSTON_ORDERS)} rows.
        </li>
        <li>
          <code>o.prod = p.id</code> reads ORDERS and PRODUCT: the next join keeps the 1 order in {1 / TEA_SHARE} that is for
          a tea, {ANSWER} rows.
        </li>
      </ul>

      <Numbers
        items={[
          { label: 'pairs first', value: TRILLION, note: 'rows before the filter' },
          { label: 'filters first', value: n(PUSHED_BIGGEST), note: 'rows at most, on the way' },
          { label: 'the answer', value: n(ANSWER), note: 'rows, either way' },
        ]}
      />

      <p>
        Now add <code>(o.qty &gt; 10 ∨ p.price &lt; 5)</code>: a big order, or a cheap product. Each half reads one table, but
        the clause as a whole reads ORDERS and PRODUCT, so it has to wait at their join. Sending <code>o.qty &gt; 10</code>{' '}
        onto ORDERS and <code>p.price &lt; 5</code> onto PRODUCT would demand both, an AND, and lose a 2-unit order of a $3
        tea that the OR accepts. An OR inside one table, like <code>(p.kind = 'tea' ∨ p.kind = 'coffee')</code>, goes down
        whole.
      </p>
      <p>
        Columns move down too. Above any node, a column is needed only if the SELECT or a clause still waiting higher up
        reads it, and every other column can be dropped right there. Once the join on <code>o.cust = c.id</code> is done,
        nothing above carries <code>o.cust</code>. Narrower rows pack more to a 4 KB page, which leaves the operators above fewer pages
        to move, and pages are the cost that <Link to="/learnings/disk-access-cost">counts on disk</Link>.
      </p>
      <p>
        How many rows a filter keeps is estimated from statistics (<Link to="/learnings/size-estimation">size
        estimation</Link>); which tables to join first (<Link to="/learnings/join-order">join order</Link>) and how each ⋈
        runs (<Link to="/learnings/join-algorithms">join algorithms</Link>) are choices of their own. Every rewrite here keeps
        the answer, so the optimizer can search the plans they reach for the cheapest.
      </p>

      <h2>Push it yourself</h2>
      <p>
        A small shop, run for real: {CUSTOMER.rows.length} customers, {ORDERS.rows.length} orders and{' '}
        {PRODUCT.rows.length} products. The query asks which Houston customers bought tea or coffee, in an order of more than
        2 or of a product under $5, and lists their names and the products. Press a clause to push it down and see where it
        lands.
      </p>
      <Figure
        caption={
          <>
            Each line is an operator, with its inputs under it, one step in; the numbers are the rows and columns it hands up.
            Pushed all the way, the biggest result in between falls from {n(LAB_NUMBERS.canonicalBiggest)} rows to{' '}
            {LAB_NUMBERS.pushedBiggest}, and the answer stays the same {LAB_NUMBERS.answer} rows. The OR on o.qty and p.price
            never gets below the top join, because it reads both ORDERS and PRODUCT.
          </>
        }
      >
        <PushLab />
      </Figure>

      <Predict
        kicker="Quick check"
        question="CUSTOMER and ORDERS are joined on o.cust = c.id. Which of these has to stay at the join?"
        options={[
          { label: "c.city = 'Austin' ∨ c.city = 'Dallas'" },
          { label: 'o.qty > 2' },
          { label: "c.vip = 'yes' ∨ o.price > 100", right: true },
          { label: "c.city = 'Austin' ∧ o.qty > 2" },
        ]}
        reveal={
          <>
            The VIP-or-price clause reads both tables, and a row on either side can pass on the other half alone, so neither
            table can rule anything out by itself. The city test is an OR too, but it reads only CUSTOMER, so it goes down
            whole. The last is not one clause but two, joined by AND, and each goes onto its own table.
          </>
        }
      />

      <h2>What to do about it</h2>
      <ul>
        <li>
          <strong>Read where each condition landed.</strong> In PostgreSQL’s <code>EXPLAIN</code>, a <code>Filter</code>{' '}
          line under a scan is a clause pushed onto that table; a <code>Join Filter</code> or <code>Hash Cond</code> line is
          one held at a join.
        </li>
        <li>
          <strong>Name the columns you need.</strong> <code>SELECT *</code> makes every column of every table ride up through
          every join; a short list lets each scan drop the rest.
        </li>
        <li>
          <strong>Keep an OR to one table when you can.</strong> An OR that spans two tables waits for their join, and
          everything under it runs unfiltered by it.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question={`ORDERS has ${ORDERS_COLUMNS} columns: id, cust, prod, qty, price, date, status, note. The query is SELECT c.name, o.qty FROM customer c, orders o WHERE o.cust = c.id AND o.status = 'open' AND (c.vip = 'yes' OR o.price > 100). With every clause pushed and every unneeded column dropped, which columns of ORDERS go up into the join?`}
        options={[
          { label: 'cust, qty' },
          { label: 'cust, qty, price', right: true },
          { label: 'cust, qty, price, status' },
          { label: `All ${ORDERS_COLUMNS}` },
        ]}
        reveal={
          <>
            cust, qty and price. The status test goes onto ORDERS, so status is used up before the join. The join needs cust
            for its condition, the SELECT needs qty, and the OR, which reads both tables, waits at the join and needs price
            there. Nothing above the scan reads the other five.
          </>
        }
      />
    </Article>
  )
}
