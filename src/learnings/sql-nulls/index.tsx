import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import { AGGREGATES, CUSTOMERS, EITHER_WAY, GUESS, ORDERS, PRODUCTS, WORKED } from './model'
import NullLab from './NullLab'
import RsvpGrid from './RsvpGrid'
import TruthTables from './TruthTables'

const names = (list: string[]) => `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`
const [ana, ben, cal] = CUSTOMERS.map((c) => c.name)

export default function SqlNulls() {
  return (
    <Article
      kicker="Inside a database · Relational queries"
      title="Yes, no and unknown"
      promise="SQL lets a value be missing. What does a query do when it has to compare something with a value nobody knows?"
      takeaway={
        <>
          A comparison with NULL is neither true nor false but <em>unknown</em>, and WHERE keeps only rows that are
          true, so a single NULL in a NOT IN list leaves the query with nothing.
        </>
      }
      sources={[
        {
          title: 'COMP 530: Database System Implementation',
          by: 'Chris Jermaine, Rice University, Fall 2025',
          part: 'SQL lectures (“SQL Three”): NULL values and three-valued logic; aggregates and subqueries in WHERE',
        },
        {
          title: 'Database Systems: The Complete Book',
          by: 'Hector Garcia-Molina, Jeffrey D. Ullman and Jennifer Widom, 2nd edition, 2008',
          part: 'Chapter 6, “Null Values and Comparisons Involving NULL” and “The Truth-Value UNKNOWN”',
        },
        {
          title: 'PostgreSQL Documentation',
          by: 'The PostgreSQL Global Development Group',
          part: '§9.1 Logical Operators, §9.2 Comparison Functions and Operators, §9.21 Aggregate Functions and §9.24 Subquery Expressions (NOT IN)',
          url: 'https://www.postgresql.org/docs/current/functions-subquery.html',
        },
      ]}
    >
      <Predict
        question={
          <>
            A shop has {CUSTOMERS.length} customers, ids 1 to {CUSTOMERS.length}. Its orders table has {ORDERS.length}{' '}
            orders: one from customer 1, one from customer 3, and one whose customer_id was never filled in, so it is
            NULL. How many names does{' '}
            <code className="text-xl">SELECT name FROM customers WHERE id NOT IN (SELECT customer_id FROM orders)</code>{' '}
            return?
          </>
        }
        options={[
          { label: `Three: ${names(GUESS.notExists)}` },
          { label: 'Two' },
          { label: 'All five' },
          { label: 'None', right: true },
        ]}
        reveal={
          <>
            None. The query reads like “the customers who never ordered”, and three of them never did, but the one order
            with no customer spoils the answer for everyone. A stack of party invitations shows why.
          </>
        }
      />

      <h2>The smudged card</h2>

      <Steps
        readable
        say={[
          <>
            You’re checking replies to a party: three RSVP cards, from {ana}, from {cal}, and one the rain has smudged
            past reading.
          </>,
          <>Did {ana} not reply? Her card is right there, so no. One sure “no” settles it, whatever the smudge says.</>,
          <>
            Did {ben} not reply? He isn’t {ana} or {cal}, but the smudged card could be his, so you can’t honestly say
            yes.
          </>,
          <>The others go the same way: every friend without a readable card ends at the smudge with a shrug.</>,
          <>Your host wants only the names you’re sure of. You aren’t sure of anyone, so you hand back an empty list.</>,
          <>
            The cards are the orders table, the smudge is NULL, a shrug is the answer UNKNOWN, and the host is WHERE,
            which keeps a row only when its test comes out TRUE.
          </>,
        ]}
      >
        {(step) =>
          step === 0 ? (
            <RsvpGrid key="cards" from={0} to={0} kept="hidden" words="story" />
          ) : step === 1 ? (
            <RsvpGrid key="ana" from={0} to={1} kept="hidden" words="story" />
          ) : step === 2 ? (
            <RsvpGrid key="ben" from={1} to={2} kept="hidden" words="story" />
          ) : step === 3 ? (
            <RsvpGrid key="rest" from={2} to={5} kept="hidden" words="story" />
          ) : step === 4 ? (
            <RsvpGrid key="list" from={5} to={5} kept="play" words="story" />
          ) : (
            <RsvpGrid key="reveal" from={5} to={5} kept="shown" words="sql" />
          )
        }
      </Steps>

      <h2>A third answer</h2>
      <p>
        “Not in the list” means “different from every value in it”, so <code>5 NOT IN (1, 3, NULL)</code> is{' '}
        <code>5 &lt;&gt; 1 AND 5 &lt;&gt; 3 AND 5 &lt;&gt; NULL</code>, where <code>&lt;&gt;</code> is SQL’s ≠. The last
        test has no answer. NULL marks a value nobody recorded, and 5 may or may not differ from it, so SQL gives it a
        third truth value, <strong>UNKNOWN</strong>.
      </p>

      <Clip
        src="sql-nulls/not-in-unfolds"
        label="5 NOT IN (1, 3, NULL) opens into 5 not equal to 1 AND 5 not equal to 3 AND 5 not equal to NULL. The comparisons become TRUE AND TRUE AND UNKNOWN, which is UNKNOWN, so WHERE leaves Eli out. For Ana, id 1, it is FALSE AND TRUE AND UNKNOWN, which is FALSE."
        caption="NOT IN is a chain of ≠ joined by AND. Two sure TRUEs can’t outweigh one UNKNOWN, while a single FALSE settles Ana’s row however the NULL reads."
      />

      <p>
        How AND, OR and NOT handle UNKNOWN comes from one rule: read it as “could be either”, try both, and if both
        give the same result, that is the result; if not, it stays UNKNOWN. Three worked lines:
      </p>
      <Numbers words items={WORKED.map((w) => ({ label: w.label, value: w.value }))} />
      <p>
        This is <strong>three-valued logic</strong>, and its whole truth table is small:
      </p>

      <Figure caption="Row AND column, for TRUE, FALSE and UNKNOWN (T, F, U). Sage cells had an UNKNOWN going in and still came out sure; dashed cells came out UNKNOWN. Nothing turns UNKNOWN into TRUE except an OR with a TRUE.">
        <TruthTables />
      </Figure>

      <p>
        The rule that does the damage is WHERE’s: it keeps a row only when its condition is TRUE, and drops FALSE and
        UNKNOWN alike. With a NULL in the list, every customer’s NOT IN is FALSE or UNKNOWN, so none survive.
      </p>

      <h2>The query that means what it says</h2>
      <p>
        <code>NOT EXISTS (SELECT * FROM orders o WHERE o.customer_id = c.id)</code> asks something else: is there an
        order whose customer is this one? For Eli, the NULL order’s test is UNKNOWN, and a test that isn’t TRUE is
        simply not a match. No match, so NOT EXISTS is TRUE. EXISTS only ever answers TRUE or FALSE, and the same tables
        give {names(GUESS.notExists)}. When neither side holds a NULL, the two queries always agree; one NULL is enough
        to silence NOT IN. (The double NOT EXISTS of <Link to="/learnings/for-all-queries">“for all” queries</Link>{' '}
        relies on the same behaviour.)
      </p>
      <p>The same logic sets two more traps:</p>
      <ul>
        <li>
          <code>stars = NULL</code> is never TRUE, not even for a missing value: NULL against anything, NULL included, is
          UNKNOWN. <code>stars IS NULL</code> is the one test that looks at NULL itself.
        </li>
        <li>
          <code>stars = 5 OR stars &lt;&gt; 5</code> sounds like everyone, yet keeps {EITHER_WAY.length} of{' '}
          {CUSTOMERS.length}: a missing review gives UNKNOWN OR UNKNOWN. For the same reason <code>NOT (…)</code> does
          not return the rows a condition dropped.
        </li>
      </ul>
      <p>
        Aggregates go the other way and skip NULLs. <code>COUNT(*)</code> counts rows ({AGGREGATES.rows}),{' '}
        <code>COUNT(stars)</code> counts values ({AGGREGATES.values}), and <code>AVG(stars)</code> averages the{' '}
        {AGGREGATES.values} reviews to {AGGREGATES.average}; counting a missing review as 0 would give{' '}
        {AGGREGATES.asZero}.
      </p>

      <h2>Try it</h2>
      <Figure caption="Pick a condition, then click a stars or customer_id value to change it; NULL comes after 5. Sage rows came out TRUE and are kept; dashed ones are UNKNOWN and dropped just like FALSE. Clear the NULL from orders and NOT IN agrees with NOT EXISTS again.">
        <NullLab />
      </Figure>

      <Predict
        kicker="Quick check"
        question="orders.customer_id may be NULL. Which WHERE clause returns exactly the customers who never ordered?"
        options={[
          { label: 'id NOT IN (SELECT customer_id FROM orders)' },
          { label: 'NOT (id IN (SELECT customer_id FROM orders))' },
          { label: 'NOT EXISTS (SELECT * FROM orders o WHERE o.customer_id = c.id)', right: true },
          { label: 'id NOT IN (SELECT customer_id FROM orders WHERE customer_id = NULL)' },
        ]}
        reveal={
          <>
            NOT EXISTS, which only asks whether a matching order exists, and a NULL never matches. The first two are the
            same query: IN gives UNKNOWN for anyone without a sure match, and NOT keeps it UNKNOWN. The last subquery
            keeps no orders, since <code>= NULL</code> is never TRUE, so it returns every customer.
          </>
        }
      />

      <h2>What to do about it</h2>
      <ul>
        <li>
          <strong>Prefer NOT EXISTS to NOT IN</strong> whenever the subquery’s column can be NULL, or add{' '}
          <code>WHERE customer_id IS NOT NULL</code> inside the subquery.
        </li>
        <li>
          <strong>Test for missing with IS NULL</strong>, never <code>= NULL</code>, and add <code>OR x IS NULL</code>{' '}
          when the missing rows should be caught too.
        </li>
        <li>
          <strong>Decide what missing means.</strong> If it should count as 0, write <code>COALESCE(stars, 0)</code>; if
          a value can never be missing, declare the column <code>NOT NULL</code> and the question goes away.
        </li>
        <li>
          <strong>Watch outer joins.</strong> A left outer join fills the unmatched side with NULLs, so a WHERE test on
          that side drops the very rows the outer join kept. Put the test in <code>ON</code> instead.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question={`A products table has ${PRODUCTS.rows} rows: ${PRODUCTS.over} with a discount over 10, ${PRODUCTS.notOver} with a discount of 10 or less, and ${PRODUCTS.missing} with no discount recorded. How many rows does WHERE NOT (discount > 10) keep?`}
        options={[
          { label: `${PRODUCTS.notOver + PRODUCTS.missing}` },
          { label: `${PRODUCTS.notOver}`, right: true },
          { label: `${PRODUCTS.rows}` },
          { label: '0' },
        ]}
        reveal={
          <>
            {PRODUCTS.notOver}. For the {PRODUCTS.missing} rows with no discount, <code>discount &gt; 10</code> is
            UNKNOWN, and NOT UNKNOWN is still UNKNOWN, so WHERE drops them. NOT swaps TRUE and FALSE; it never turns a
            missing value into a yes.
          </>
        }
      />
    </Article>
  )
}
