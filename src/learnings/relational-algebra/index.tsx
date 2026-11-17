import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Kitchen from './Kitchen'
import { GUESS, GUESS_ROWS, joinRange, STUDENT, TAKES, TRAYS } from './model'
import PlanLab from './PlanLab'

const n = (x: number) => x.toLocaleString('en-US')
const [, MOST] = joinRange(STUDENT.rows.length, TAKES.rows.length)
const SCENES = ['start', 'veg', 'pair', 'fit', 'prep', 'tree', 'plan'] as const

export default function RelationalAlgebra() {
  return (
    <Article
      kicker="Inside a database · Relational queries"
      title="Relational algebra"
      promise="You tell a database what you want and never how to find it. So what does it actually run?"
      takeaway={
        <>
          A relation is a set of rows with no pointers, and every operator turns relations into a relation, so any query
          is a <em>tree of operators</em>: the plan the database runs, and can rearrange.
        </>
      }
      sources={[
        {
          title: 'COMP 530: Database System Implementation',
          by: 'Chris Jermaine, Rice University, Fall 2025',
          part: '“Relational Databases” 1 and 3: the relational model and the relational algebra; parsing SQL into a plan',
        },
        {
          title: 'Database System Implementation',
          by: 'Hector Garcia-Molina, Jeffrey D. Ullman and Jennifer Widom, 2000',
          part: 'Section 6.1, “An Algebra for Queries”, and section 7.3, “From Parse Trees to Logical Query Plans”',
        },
        {
          title: 'A Relational Model of Data for Large Shared Data Banks',
          by: 'E. F. Codd, Communications of the ACM 13(6), 1970',
          url: 'https://doi.org/10.1145/362384.362685',
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
        question={`A table of ${n(GUESS.students)} students and a table of ${GUESS.courses} courses. Pair every student with every course, before any filter. How many rows?`}
        options={[
          { label: n(GUESS.students) },
          { label: n(GUESS.students + GUESS.courses) },
          { label: 'It depends on who takes what' },
          { label: n(GUESS_ROWS), right: true },
        ]}
        reveal={
          <>
            {n(GUESS_ROWS)}. Pairing everything with everything never looks at the data: each of the {n(GUESS.students)}{' '}
            students is glued to each of the {GUESS.courses} courses. Picking out the pairs where a student really takes
            the course is a separate step on top, a filter. Small steps like these, stacked, are all a database runs. A
            kitchen shows how.
          </>
        }
      />

      <h2>A kitchen of stations</h2>

      <Steps
        say={[
          <>
            You run a kitchen with two trays: {TRAYS.pasta.rows.length} pastas, long or short, and{' '}
            {TRAYS.sauce.rows.length} sauces, each made to cling to one of those shapes.
          </>,
          <>
            One station takes the sauce tray, keeps the vegetarian sauces, and hands back a tray: {TRAYS.sauce.rows.length}{' '}
            in, {TRAYS.veg.rows.length} out.
          </>,
          <>
            The next takes two trays and pairs every pasta with every sauce: {TRAYS.pasta.rows.length} ×{' '}
            {TRAYS.veg.rows.length} = {TRAYS.pairs.rows.length} plates, sensible or not.
          </>,
          <>
            A filter station, the same kind as the first, keeps the {TRAYS.fitting.rows.length} plates where the sauce
            suits the pasta’s shape.
          </>,
          <>
            The last copies down only each plate’s sauce, and tomato, on two plates, is written once:{' '}
            {TRAYS.fitting.rows.length} in, {TRAYS.prep.rows.length} out.
          </>,
          <>No station cares where its tray came from, so they plug together into whatever line tonight’s question needs.</>,
          <>
            That is a database: each tray is a relation, each station an operator, and the line of them is the query plan
            it runs.
          </>,
        ]}
      >
        {(step) => <Kitchen key={step} scene={SCENES[step]} />}
      </Steps>

      <h2>Rows, and no pointers</h2>
      <p>
        Before 1970, databases kept records linked by pointers, and a program answered a question by walking them: from
        a customer to its first order, then on to the next one. Move the records or add an index, and those programs had
        to be rewritten. E. F. Codd’s <strong>relational model</strong> dropped the pointers. Data sit in{' '}
        <strong>relations</strong>: a relation is a set of rows that share the same columns, with no order, no repeats,
        and nothing in one row aiming at another. A query names the rows it wants and the database picks the way to them,
        so the storage underneath can change while every query keeps working.
      </p>

      <h2>The operators</h2>
      <p>
        Each operator takes relations and hands back a relation. That is called <strong>closure</strong>, and it is why
        they stack. <strong>Selection</strong> σ<sub>B</sub>(R) keeps the rows of R where condition B holds.{' '}
        <strong>Projection</strong> π<sub>A</sub>(R) keeps only the columns A; the result is a set, so rows that end up
        the same become one. The <strong>product</strong> R × S glues every row of R to every row of S, |R| · |S| rows
        in all. Union ∪, intersection ∩ and difference − work as for any sets, on two relations with the same columns.
        Then the one line to keep:
      </p>
      <p className="text-center font-serif text-2xl">
        R ⋈<sub>B</sub> S = σ<sub>B</sub>(R × S)
      </p>
      <p>
        A <strong>join</strong> is a selection over a product: pair everything, keep the pairs that match. The kitchen
        did exactly this in two stations. Its numbers:
      </p>

      <Numbers
        items={[
          { label: 'σ vegetarian', value: `${TRAYS.sauce.rows.length} → ${TRAYS.veg.rows.length}`, note: 'rows dropped' },
          {
            label: 'pastas × sauces',
            value: `${TRAYS.pasta.rows.length} × ${TRAYS.veg.rows.length} = ${TRAYS.pairs.rows.length}`,
            note: 'every pair',
          },
          { label: 'π sauce', value: `${TRAYS.fitting.rows.length} → ${TRAYS.prep.rows.length}`, note: 'repeats merged' },
        ]}
      />

      <p>
        This is <strong>relational algebra</strong>, and SQL turns into it. The first tree a database builds from a query
        reads the clauses inside out: FROM becomes a product, WHERE a selection over it, SELECT a projection on top.
      </p>

      <Clip
        src="relational-algebra/sql-to-plan"
        label="The query SELECT sauce FROM pastas, sauces WHERE shape equals fits. FROM becomes PASTAS times SAUCES, WHERE wraps it in a selection on shape equals fits, and SELECT wraps that in a projection on sauce. The selection over the product is then rewritten as a join of PASTAS and SAUCES on shape equals fits."
        caption="Each clause becomes one operator. The selection over the product is the join, written the long way."
      />

      <p>
        That tree pairs before it filters, while the kitchen dropped the meat sauce first. Both give the same answer, and
        that freedom to pick among equal trees is what an optimizer works with.
      </p>

      <h2>Build a plan</h2>
      <p>
        Two tables from a school: STUDENT, five students and their year, and TAKES, seven rows of who takes which course.
        Every box is one operator and the rows it hands up.
      </p>
      <Figure caption="The ringed box is the answer. With × the year-2 students are paired with every course, so all three courses come back; with ⋈, or σ over ×, only the pairs where the names agree survive, and the answer is Math and CS.">
        <PlanLab />
      </Figure>

      <Predict
        kicker="Quick check"
        question={`STUDENT has ${STUDENT.rows.length} rows and TAKES has ${TAKES.rows.length}. You join them on a condition you haven’t seen. How many rows can come out?`}
        options={[
          { label: `Exactly ${TAKES.rows.length}` },
          { label: `Exactly ${STUDENT.rows.length + TAKES.rows.length}` },
          { label: `Exactly ${MOST}` },
          { label: `Anywhere from 0 to ${MOST}`, right: true },
        ]}
        reveal={
          <>
            A join is a selection over the {MOST}-row product, so it keeps some of those pairs: none if the condition never
            holds, all {MOST} if it always does. Joined on names, as in the lab, it gives {TAKES.rows.length}, but only
            because each TAKES row names one student; the operator itself promises nothing more.
          </>
        }
      />

      <h2>What to do with it</h2>
      <ul>
        <li>
          <strong>Ask for rows, not a path.</strong> A relation has no order, so never count on rows coming back in the
          order you put them in; say ORDER BY when order matters.
        </li>
        <li>
          <strong>Read the tree.</strong> PostgreSQL’s <code>EXPLAIN</code> prints the plan it chose, one operator per
          line, indented under the one it feeds, each with the rows it expects.
        </li>
        <li>
          <strong>Link every table you list.</strong> Two tables in FROM with no condition joining them make a product,
          |R| · |S| rows, like the {n(GUESS_ROWS)} of the guess.
        </li>
        <li>
          <strong>Leave the shape to the database.</strong> Write the query plainly; picking the cheapest of the equal
          trees is the optimizer’s job.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="A library runs SELECT title FROM book, loan WHERE book.id = loan.book AND year = 2026. Call that WHERE condition B. Which tree does the database build first, read from the bottom up?"
        options={[
          { label: 'BOOK × LOAN, keep title, then filter by B' },
          { label: 'BOOK × LOAN, filter by B, then keep title', right: true },
          { label: 'Filter LOAN by B, pair it with BOOK, keep title' },
          { label: 'BOOK × LOAN, then filter by B' },
        ]}
        reveal={
          <>
            Inside out: FROM makes the product, WHERE filters it, SELECT keeps title last. Keeping title first throws away
            book.id, loan.book and year, which B needs. LOAN alone has no book.id, so B can’t be tested on it. And with no
            projection the answer has all five columns, not just the titles.
          </>
        }
      />
    </Article>
  )
}
