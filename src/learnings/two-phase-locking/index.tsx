import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import House from './House'
import Lab from './Lab'
import LockCount from './LockCount'
import { percent, RANDOM, RANDOM_RUNS, RULES, START, STORY_2PL, STORY_LOOSE, STORY_STUCK } from './model'

const LOOSE_ENDS = STORY_LOOSE.turnEnds
const STUCK_END = STORY_STUCK.events.length

export default function TwoPhaseLocking() {
  return (
    <Article
      kicker="Inside a database · Transactions"
      title="Two-phase locking"
      promise="A lock keeps two transactions from changing the same row at the same moment. Is that enough to keep their combined result correct, and if it isn’t, what rule is?"
      takeaway={
        <>
          Take every lock before giving any back, and transactions can only mix in ways that equal running them one at a
          time, in order of their lock points. Hold write locks until <em>commit</em> as well, and nobody ever reads work
          that might still be undone.
        </>
      }
      sources={[
        {
          title: 'COMP 530: Database System Implementation',
          by: 'Chris Jermaine, Rice University, Fall 2025',
          part: 'Lecture notes on logging and recovery: a committed transaction that read uncommitted data, and locks held until commit',
        },
        {
          title: 'Database System Implementation',
          by: 'Hector Garcia-Molina, Jeffrey D. Ullman and Jennifer Widom, 2000',
          part: 'The concurrency-control chapter (“Enforcing Serializability by Locks”, “Locking Systems With Several Lock Modes”) and “More About Transaction Management” (cascading rollback, strict locking, deadlocks)',
        },
        {
          title: 'PostgreSQL Documentation',
          by: 'The PostgreSQL Global Development Group',
          part: 'Section 13.3, “Explicit Locking”: row-level locks and deadlocks',
          url: 'https://www.postgresql.org/docs/current/explicit-locking.html',
        },
      ]}
    >
      <Predict
        question="Two bank jobs run at once. Each locks an account before touching it and unlocks it as soon as it has finished with that account, and neither ever ignores a lock. Can they still leave a result that running them one after the other never could?"
        options={[
          { label: 'No: no account is ever touched by both at once' },
          { label: 'Only if one of them crashes' },
          { label: 'Only if they wait for each other forever' },
          { label: 'Yes, quite easily', right: true },
        ]}
        reveal={
          <>
            Yes. A lock keeps two jobs off one account at the same moment, but nothing stops them from taking turns
            across two accounts in an order that mixes their work. A house with one key per room shows how.
          </>
        }
      />

      <h2>Keys to a shared house</h2>

      <Steps
        readable
        say={[
          <>
            You and Sam each want the kitchen and the bathroom repainted in your own colour, and each room has one key,
            on a hook in the hall.
          </>,
          <>You take the kitchen key, paint, and hang the key back before going for the bathroom’s.</>,
          <>In that gap Sam takes the kitchen key, paints over your kitchen, then does the bathroom too.</>,
          <>
            Then you paint the bathroom: two rooms that don’t match, which neither of you working alone would have left.
          </>,
          <>
            New rule: take every key you’ll need before hanging any back. Now Sam waits at the hook, and the rooms end up
            matching.
          </>,
          <>But if you hold the kitchen key and Sam holds the bathroom’s, each of you waits for the other, forever.</>,
          <>
            The house is a database: rooms are rows, keys are locks, painting is a write. The rule is called two-phase
            locking, and the freeze is a deadlock.
          </>,
        ]}
      >
        {(step) =>
          step === 0 ? (
            <House key="start" run={STORY_LOOSE} from={0} to={0} words="story" />
          ) : step === 1 ? (
            <House key="kitchen" run={STORY_LOOSE} from={0} to={LOOSE_ENDS[0]} words="story" />
          ) : step === 2 ? (
            <House key="sam" run={STORY_LOOSE} from={LOOSE_ENDS[0]} to={LOOSE_ENDS[3]} words="story" />
          ) : step === 3 ? (
            <House key="bathroom" run={STORY_LOOSE} from={LOOSE_ENDS[3]} to={STORY_LOOSE.events.length} words="story" />
          ) : step === 4 ? (
            <House key="rule" run={STORY_2PL} from={0} to={STORY_2PL.events.length} words="story" pace={700} />
          ) : step === 5 ? (
            <House key="stuck" run={STORY_STUCK} from={0} to={STUCK_END} words="story" />
          ) : (
            <House key="reveal" run={STORY_STUCK} from={STUCK_END} to={STUCK_END} words="db" />
          )
        }
      </Steps>

      <h2>Lock everything, then let go</h2>
      <p>
        A database could let transactions run however they like and check afterwards whether their conflicts form a
        cycle, the test on <Link to="/learnings/serializability">the serializability page</Link>. By then, though, the
        bad schedule has already changed the data. So it stops cycles from forming in the first place, with locks. A
        transaction takes a <strong>shared lock</strong> on a row to read it, and any number of readers can share one; it
        takes an <strong>exclusive lock</strong> to write, and then the row is its alone.
      </p>
      <p>
        The house showed that locks fail when a transaction hands one back and takes another later. The rule that fixes
        it is <strong>two-phase locking</strong> (2PL): in every transaction, every lock comes before every unlock. Its
        count of locks only climbs, the growing phase, and then only falls, the shrinking phase.
      </p>

      <Figure caption="One transaction updating A, B and C in turn, under each rule, with time running left to right. Under locks alone the count goes up and down, and the ink dots are locks taken after giving one back. Under 2PL every lock (sage) comes before the first release. Strict 2PL also keeps them all until commit.">
        <LockCount />
      </Figure>

      <p>
        The moment a transaction takes its last lock is its <strong>lock point</strong>, lp(T) for short. Mix any number
        of 2PL transactions, and the result equals running them one at a time in order of their lock points:
      </p>

      <Clip
        src="two-phase-locking/lock-point-order"
        label="If Ti and Tj both use X, Ti first, and one of them writes: Ti must unlock X before Tj can lock it. Ti releases no lock until its lock point, and Tj has all its locks by its own. So lp of Ti is at most Ti's unlock, which comes before Tj's lock, which is at most lp of Tj: Ti's lock point comes first. Every conflict points forward in lock-point order, so there is no cycle, and the serial order is the order of lock points."
        caption="Two conflicting steps force their transactions’ lock points into the same order. Arrows that all point forward in time can never come back round into a cycle."
      />

      <p>
        To watch it hold, take two transactions, one adding 100 to A and B and one doubling both, starting from A = B ={' '}
        {START.A}. Either order one at a time keeps A = B. Played under {RANDOM_RUNS.toLocaleString('en-US')} random
        timings, the share that came out matching no serial order:
      </p>
      <Numbers
        items={RULES.map((rule) => ({
          label: rule,
          value: percent(RANDOM[rule].notSerializable, RANDOM[rule].runs),
          note: 'not serializable',
        }))}
      />

      <h2>What 2PL doesn’t fix</h2>
      <p>
        <strong>Deadlock.</strong> Transactions under 2PL hold on to their locks while they wait, which is how you and Sam
        froze. The database keeps a <strong>waits-for graph</strong>, an arrow from each waiting transaction to the one
        holding what it wants. A cycle there is a deadlock, and the lock manager breaks it by rolling one transaction back
        so it can start again. Some systems simply give up on a lock after a timeout.
      </p>
      <p>
        <strong>Dirty reads.</strong> Plain 2PL lets a transaction release a lock once it has all it needs, before it
        commits. Another transaction can then read a value that may still be undone, a <strong>dirty read</strong>, the
        trouble that recovery runs into on <Link to="/learnings/undo-redo-logging">the undo and redo logging page</Link>.
        Should the writer abort, the reader is left holding a number that was, officially, never there, so it must abort too, and so must
        anyone who read from the reader: a <strong>cascading abort</strong>. If the reader has already committed, nothing
        can put it right. <strong>Strict 2PL</strong> closes the gap: a transaction hangs on to every exclusive lock until
        it has committed or aborted, so nobody sees its unfinished work. In the random runs above, plain 2PL let a dirty read
        through in {percent(RANDOM['2PL'].dirty, RANDOM['2PL'].runs)} of them, and strict 2PL in{' '}
        {RANDOM['Strict 2PL'].dirty === 0 ? 'none' : percent(RANDOM['Strict 2PL'].dirty, RANDOM['Strict 2PL'].runs)}.
        Strict 2PL is what lock-based databases run.
      </p>

      <h2>Run the lock manager</h2>
      <p>
        Pick when the second transaction arrives and which rule the lock manager enforces, then step through it event by
        event.
      </p>

      <Lab />

      <Predict
        kicker="Quick check"
        question="Under plain 2PL, a transaction has locked A and B. It is finished with A for good, and will lock C later. When may it release A?"
        options={[
          { label: 'Right away: it’s done with A' },
          { label: 'As soon as it has locked C', right: true },
          { label: 'Only when it commits' },
          { label: 'Only after releasing B' },
        ]}
        reveal={
          <>
            Once it has locked C. Releasing A now and locking C later puts a lock after an unlock, the gap Sam slipped
            through. Holding A until commit is allowed but not required under plain 2PL; strict 2PL requires it only if
            A was written.
          </>
        }
      />

      <h2>What engineers do about it</h2>
      <ul>
        <li>
          <strong>Keep transactions short.</strong> A write lock lasts until commit, so a transaction that waits on a
          person or a network call keeps everyone queued behind it waiting too.
        </li>
        <li>
          <strong>Take locks in one fixed order.</strong> If every transaction locks the kitchen before the bathroom (rows
          in key order, say), nobody can hold the second while waiting for the first, so no cycle can form.
        </li>
        <li>
          <strong>Let the database lock, and retry.</strong> Don’t build locking into the application. Pick the
          isolation level you need, and when the database rolls you back to break a deadlock, run the transaction again.
          PostgreSQL, for one, keeps a row lock until the transaction ends and aborts one side of any deadlock it finds.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="Under plain 2PL, T1 writes A, takes its last lock and releases A. T2 reads A, writes B, takes its last lock and releases B. T3 reads B. Then T1 aborts. Which transactions have to be rolled back?"
        options={[
          { label: 'Only T1' },
          { label: 'T1 and T2' },
          { label: 'T1, T2 and T3', right: true },
          { label: 'T1 and T3' },
        ]}
        reveal={
          <>
            All three. T2 used T1’s A, which is being undone, so the B it wrote came from a value that never existed, and
            T3 read that B. One abort runs down every chain of dirty reads. Under strict 2PL, T2 would have waited for T1
            to finish, and nothing would cascade.
          </>
        }
      />
    </Article>
  )
}
