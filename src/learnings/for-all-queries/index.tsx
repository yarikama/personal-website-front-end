import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Code } from '../../components/explain/Code'
import { Button, Choice, Controls, Figure, Numbers, Readout } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import LikesLab from './LikesLab'
import {
  bruteForce,
  CLASS,
  GAPS,
  GUESS,
  LAB,
  mistaken,
  named,
  ON_LIST,
  QUESTIONS,
  TICKS,
  toggleGood,
  toggleLike,
  WORKED,
  type Question,
} from './model'
import Roll, { type RollStage } from './Roll'

const STAGES: RollStage[] = ['class', 'ticks', 'hunt', 'crossed', 'list', 'reveal']

const ASK: Record<Question, string> = { all: 'All good', only: 'Only good', some: 'Some good' }

// The guess's world in words
const likesOf = (x: number) => GUESS.items.filter((_, y) => GUESS.likes[x][y])
const BAD_IN_GUESS = GUESS.items.filter((_, y) => !GUESS.good[y])
const RIGHT_IN_GUESS = bruteForce(GUESS, 'only')
const MISTAKE_IN_GUESS = mistaken(GUESS)

const BEN_TICKS = TICKS('Ben')
const [BEN_GAP, CY_GAP] = GAPS

export default function ForAllQueries() {
  const [world, setWorld] = useState(LAB)
  const [question, setQuestion] = useState<Question>('only')

  return (
    <Article
      kicker="Inside a database · Relational queries"
      title="All means none missing"
      promise="SQL can ask whether a matching row exists, but it has no word for “every”. So how do you ask for the people who like every good café, or only good ones?"
      takeaway={
        <>
          SQL and relational algebra can’t say “for all”, so you ask for <em>no counterexample</em> instead: a double
          NOT EXISTS, or everyone minus the ones who have one.
        </>
      }
      sources={[
        {
          title: 'COMP 530: Database System Implementation',
          by: 'Chris Jermaine, Rice University, Fall 2025',
          part: 'Lectures on the relational model (first-order logic, the ∀/∃ duality, relational calculus and algebra) and on SQL (subqueries, the double NOT EXISTS, SOME and ALL)',
        },
        {
          title: 'Database System Implementation',
          by: 'Hector Garcia-Molina, Jeffrey D. Ullman and Jennifer Widom, 2000',
          part: 'Chapter 6, “Query Execution”: the algebra for queries',
        },
      ]}
    >
      <p>
        A table of who likes which café, and a list of the bad cafés. Here is a first try at “the people who like only
        good cafés”:
      </p>
      <Code
        label="SQL query"
        code={`
          SELECT DISTINCT l.person
          FROM likes l
          WHERE l.cafe NOT IN (SELECT cafe FROM bad)
        `}
        caption="Keep each like whose café isn’t on the bad list, and return who it belongs to."
      />

      <Predict
        question={`${GUESS.people
          .map((p, x) => `${p} likes ${likesOf(x).join(' and ')}`)
          .join('; ')}. ${BAD_IN_GUESS[0]} is the only bad café. Who does the query return?`}
        options={[
          { label: named(RIGHT_IN_GUESS) },
          { label: named(MISTAKE_IN_GUESS), right: true },
          { label: named(GUESS.people) },
          { label: 'No one' },
        ]}
        reveal={
          <>
            {named(MISTAKE_IN_GUESS)}. The WHERE looks at one row at a time, and Ana’s row for Bean passes, so she’s in
            even though she also likes Dove. The query answers “likes at least one good café”. Only{' '}
            {named(RIGHT_IN_GUESS)} likes only good ones, and seeing that takes all of a person’s rows at once.
          </>
        }
      />

      <h2>One missing homework</h2>

      <Steps
        readable
        say={[
          <>
            You teach {CLASS.people.length} students and set {CLASS.items.length} homeworks, and you want the ones who
            handed in every one.
          </>,
          <>
            A tick tells you one homework came in, nothing more: Ben has {BEN_TICKS} ticks and still missed one.
          </>,
          <>So you hunt for the opposite instead: along each row, look for one homework that’s missing.</>,
          <>
            {BEN_GAP.person} is missing {BEN_GAP.item} and {CY_GAP.person} {CY_GAP.item}. One gap crosses a student off,
            however many ticks they have.
          </>,
          <>
            {named(ON_LIST)} have no gap, so they’re your list: the whole class minus anyone with a gap.
          </>,
          <>
            Each student is an x, each homework a y, a tick is P(x, y), and a gap is a counterexample: “every y” is “no y
            missing”.
          </>,
        ]}
      >
        {(step) => <Roll key={STAGES[step]} stage={STAGES[step]} />}
      </Steps>

      <h2>The one line of math</h2>
      <p>
        In words: x has a property for every y exactly when there is no y for which x lacks it. A y that breaks it is a{' '}
        <strong>counterexample</strong>, and “for all” is “no counterexample”. In logic, ∀ reads “for all” and ∃ “there
        exists”, and the rule is
      </p>
      <p className="text-center font-serif text-2xl text-ink">∀y P(x, y) ≡ ¬∃y ¬P(x, y)</p>

      <Clip
        src="for-all-queries/none-missing"
        label="The sentence 'Ana handed in every homework' becomes 'there is no homework Ana did not hand in': the word every turns into a no and a not. Each phrase becomes a symbol: for all h, P of Ana and h, is equivalent to not there exists h, not P of Ana and h. Then each negation becomes a NOT EXISTS in SQL: NOT EXISTS a homework h where NOT EXISTS a row saying Ana handed in h. For all equals no counterexample."
        caption="“Every” comes apart into a “no” and a “not”, and each of those becomes one NOT EXISTS."
      />

      <p>Three students, counted by their gaps:</p>
      <Numbers
        words
        items={WORKED.map((w) => ({
          label: w.name,
          value: `${w.missing} missing`,
          note: `${w.set === 0 ? 'none' : w.set} set: ${w.in ? 'on the list' : 'off'}`,
        }))}
      />
      <p>
        Dan is the odd one. His class hasn’t set anything yet, so there is nothing he could have missed, and he passes.
        A claim about every member of an empty set is <strong>vacuously true</strong>: no member exists to break it.
        It is the logic working as written, but it surprises people when a query for students who did every homework
        returns the whole class on the first day of term.
      </p>

      <h2>Two shapes, in algebra and in SQL</h2>
      <p>
        Relational algebra has no ∀ either, only the operators of{' '}
        <Link to="/learnings/relational-algebra">relational algebra</Link>. You build “all” from them in three moves:
        pair every student with every homework, take away the pairs that were handed in, which leaves exactly the gaps,
        and project to the students who own one. The answer is everyone minus those:
      </p>
      <p className="text-center font-serif text-xl text-ink">
        π<sub>student</sub>(Students) − π<sub>student</sub>((Students × Homeworks) − HandedIn)
      </p>
      <p>
        SQL has NOT EXISTS, true when a subquery finds no row, and the same idea is two of them, one inside the other.
        Read it from the inside out: the innermost query looks for the row saying this student handed in this homework;
        NOT EXISTS of it means the homework is a gap; the outer NOT EXISTS asks that no homework be one.
      </p>
      <Code
        label="SQL query for students who handed in every homework"
        code={`
          SELECT s.name
          FROM students s
          WHERE NOT EXISTS (
            SELECT 1 FROM homeworks h
            WHERE NOT EXISTS (
              SELECT 1 FROM handed_in d
              WHERE d.student = s.name
                AND d.hw = h.id))
        `}
      />
      <p>
        “Only” is the other shape. “Ana likes only good cafés” means every café she likes is good, so a counterexample
        is a bad café she likes. That one is a row that is there, not a row that is missing, so a single NOT EXISTS
        finds it, and in algebra the answer is People − π<sub>person</sub>(Likes ⋈ Bad).
      </p>
      <Code
        label="SQL query for people who like only good cafés"
        code={`
          SELECT p.name
          FROM people p
          WHERE NOT EXISTS (
            SELECT 1 FROM likes l
            WHERE l.person = p.name
              AND l.cafe IN (SELECT cafe FROM bad))
        `}
      />
      <p>
        The query in the guess decided one row at a time, and a test on one row can only ever answer “some”. “All” and
        “only” are about every row a person has, and subtracting the counterexamples is how you look at them all.
      </p>

      <h2>Try it on a grid</h2>
      <p>
        Five people, five cafés. Tap a box to change who likes what, or a café’s label to swap good and bad, and switch
        between the three questions.
      </p>
      <Figure
        readable
        caption="A ring in ink is the counterexample that keeps a person out: a good café they skip under “all”, a bad one they like under “only”. A ring in sage is the good café that lets them into “some”, the question the guess’s query really asks. Eve likes nothing, so “only” lets her in with nothing to break it; mark every café bad and “all” lets everyone in."
      >
        <LikesLab
          world={world}
          question={question}
          onLike={(x, y) => setWorld((w) => toggleLike(w, x, y))}
          onGood={(y) => setWorld((w) => toggleGood(w, y))}
        />
        <div className="mt-5 flex flex-wrap gap-x-10 gap-y-4">
          {QUESTIONS.map((q) => (
            <Readout key={q} label={ASK[q]} value={named(bruteForce(world, q))} accent={q === question} />
          ))}
        </div>
        <Controls>
          <Choice label="Ask for" options={QUESTIONS} value={question} onChange={setQuestion} format={(q) => ASK[q]} />
          <Button onClick={() => setWorld(LAB)}>Reset</Button>
        </Controls>
      </Figure>

      <Predict
        kicker="Quick check"
        question="Which of these needs two NOT EXISTS, one inside the other?"
        options={[
          { label: 'People who like a bad café' },
          { label: 'People who like no bad café' },
          { label: 'People who like every good café', right: true },
          { label: 'People who like only good cafés' },
        ]}
        reveal={
          <>
            Every good café. Its counterexample is a good café the person doesn’t like, a missing row, and finding a
            missing row takes a NOT EXISTS of its own. “No bad café” and “only good cafés” are the same question, whose
            counterexample is a like of a bad café, a row that’s there: one NOT EXISTS. “A bad café” needs only EXISTS.
          </>
        }
      />

      <h2>What to do about it</h2>
      <ul>
        <li>
          <strong>Name what would rule a person out.</strong> Before writing the query, finish the sentence “x is out if
          there is a …”. That is the counterexample: wrap it in NOT EXISTS, or subtract whoever has one.
        </li>
        <li>
          <strong>Test on a mixed row.</strong> The one-row mistake shows only on someone with a good café and a bad one,
          like Ana in the guess. A test table where everyone is all good or all bad lets the wrong query pass.
        </li>
        <li>
          <strong>Decide what an empty row means.</strong> Someone who likes nothing passes “only”, and everyone passes
          “all” of an empty set. Take your candidates from the table that should hold them, all people or only people
          with a like, on purpose.
        </li>
        <li>
          <strong>Prefer NOT EXISTS to NOT IN.</strong> NOT IN stops matching anything once its subquery returns a
          NULL; <Link to="/learnings/sql-nulls">NULLs in SQL</Link> shows why.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="A gym wants the members who have only ever been to morning classes. Which of these finds them?"
        options={[
          { label: 'Members who went to a morning class' },
          { label: 'Members minus those who went to a class not in the morning', right: true },
          { label: 'Members who went to a class not in the evening' },
          { label: 'Members minus those who went to a morning class' },
        ]}
        reveal={
          <>
            Everyone minus the counterexamples, and a counterexample here is a visit to a class that isn’t in the
            morning. The first and third keep anyone with one good visit, the guess’s mistake; the last subtracts the
            wrong visits. Note that a member who has never been to a class is in the answer, with nothing to break it.
          </>
        }
      />
    </Article>
  )
}
