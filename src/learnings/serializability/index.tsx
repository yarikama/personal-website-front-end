import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Kitchen from './Kitchen'
import {
  AT_ONCE,
  AT_ONCE_APART,
  BANK_INTERLEAVINGS,
  BANK_PASSING,
  BANK_START,
  CARD_START,
  CHECK,
  COOKS,
  COOKS_APART,
  GUESS,
  GUESS_INTERLEAVED,
  GUESS_SERIAL,
  notation,
  QUICK,
  run,
  TAKING_TURNS,
  total,
  verdict,
  WORKED,
} from './model'
import ScheduleLab from './ScheduleLab'

const turns = run(COOKS, TAKING_TURNS, CARD_START)
const atOnce = run(COOKS, AT_ONCE, CARD_START)
const worked = WORKED.map((p) => ({ ...p, final: run(p.txs, p.ops, BANK_START).final, verdict: verdict(p.txs, p.ops) }))
const missing = total(worked[0].final) - total(worked[2].final)

export default function Serializability() {
  return (
    <Article
      kicker="Inside a database · Transactions"
      title="As if one at a time"
      promise="A database runs many transactions at once to stay fast. How can it tell whether the way their steps interleave gives a result it can trust?"
      takeaway={
        <>
          An interleaving is safe when it has the same effect as some one-at-a-time order. Draw an arrow for each{' '}
          <em>conflict</em>: if the arrows never form a cycle, they spell out that order.
        </>
      }
      sources={[
        {
          title: 'COMP 530: Database System Implementation',
          by: 'Chris Jermaine, Rice University, Fall 2025',
          part: 'Logging, recovery and concurrency control: schedules, conflicts and serializability',
        },
        {
          title: 'Database System Implementation',
          by: 'Hector Garcia-Molina, Jeffrey D. Ullman and Jennifer Widom, 2000',
          part: 'The concurrency-control chapter, “Serial and Serializable Schedules” and “Conflict-Serializability”',
        },
        {
          title: 'PostgreSQL Documentation',
          by: 'The PostgreSQL Global Development Group',
          part: 'Chapter 13, “Transaction Isolation”: Read Committed as the default, and Serializable Snapshot Isolation',
          url: 'https://www.postgresql.org/docs/current/transaction-iso.html',
        },
      ]}
    >
      <Predict
        question={`An account holds $${GUESS.balance}. Two people each deposit $${GUESS.deposit} at the same moment: both deposits read the balance, then both write back their new total. What does the account hold afterwards?`}
        options={[
          { label: `$${GUESS_SERIAL}` },
          { label: `$${GUESS_INTERLEAVED}`, right: true },
          { label: `$${GUESS.balance}` },
          { label: `$${GUESS_SERIAL + GUESS.deposit}` },
        ]}
        reveal={
          <>
            ${GUESS_INTERLEAVED}. Both deposits read ${GUESS.balance}, so both wrote ${GUESS_INTERLEAVED}, and the second
            write wiped out the first. Running one deposit and then the other, in either order, gives ${GUESS_SERIAL}. A
            kitchen shows what went wrong.
          </>
        }
      />

      <h2>One card, two cooks</h2>

      <Steps
        readable
        say={[
          <>
            You and a friend cook from one recipe card that says {CARD_START.S} tsp of salt, and each of you decides the
            soup needs a teaspoon more.
          </>,
          <>
            Take turns and it works: you read {turns.values[0]} and write {turns.values[1]}, then your friend reads{' '}
            {turns.values[2]} and writes {turns.values[3]}.
          </>,
          <>Now you both look at the card at the same moment, and each of you sees {atOnce.values[0]}.</>,
          <>
            You write {atOnce.values[2]}; your friend, still thinking {atOnce.values[1]}, writes {atOnce.values[3]} as
            well. One teaspoon is gone.
          </>,
          <>
            Had your friend been fixing the pepper card instead, the same timing would be harmless: each card gets its
            teaspoon.
          </>,
          <>
            So trouble needs two cooks on one card, with at least one of them writing on it. Two looks at the same card
            never clash.
          </>,
          <>
            Each cook is a transaction, a card is a data item, looking is a read and writing on it is a write. A pair
            that clashes is a <strong>conflict</strong>.
          </>,
        ]}
      >
        {(step) =>
          step === 0 ? (
            <Kitchen key="card" txs={COOKS} ops={TAKING_TURNS} start={CARD_START} items={['S']} from={0} to={0} words="kitchen" />
          ) : step === 1 ? (
            <Kitchen
              key="turns"
              txs={COOKS}
              ops={TAKING_TURNS}
              start={CARD_START}
              items={['S']}
              from={0}
              to={4}
              words="kitchen"
              note={`${turns.final.S} tsp: both counted`}
            />
          ) : step === 2 ? (
            <Kitchen key="look" txs={COOKS} ops={AT_ONCE} start={CARD_START} items={['S']} from={0} to={2} words="kitchen" />
          ) : step === 3 ? (
            <Kitchen
              key="lost"
              txs={COOKS}
              ops={AT_ONCE}
              start={CARD_START}
              items={['S']}
              from={2}
              to={4}
              words="kitchen"
              note={`${atOnce.final.S} tsp: one teaspoon lost`}
            />
          ) : step === 4 ? (
            <Kitchen
              key="apart"
              txs={COOKS_APART}
              ops={AT_ONCE_APART}
              start={CARD_START}
              items={['S', 'P']}
              from={0}
              to={4}
              words="kitchen"
              note="each card got its teaspoon"
            />
          ) : (
            <Kitchen
              key="links"
              txs={COOKS}
              ops={AT_ONCE}
              start={CARD_START}
              items={['S']}
              from={4}
              to={4}
              words={step === 5 ? 'kitchen' : 'db'}
              links
            />
          )
        }
      </Steps>

      <h2>Only conflicts fix the order</h2>
      <p>
        The order a database actually runs the steps in is a <strong>schedule</strong>. Running each transaction from
        start to finish before the next begins is a <strong>serial</strong> schedule: always correct, but slow, since a
        transaction waiting on the disk holds up everyone behind it. An interleaved schedule is{' '}
        <strong>serializable</strong> when it has the same effect as some serial one. The two deposits fail this: no
        one-at-a-time order ends at ${GUESS_INTERLEAVED}. That failure is called a <strong>lost update</strong>.
      </p>
      <p>
        Trying every serial order on every possible starting value is no way to vet a schedule as it runs. Conflicts
        give a shortcut. Two neighbouring steps from different transactions that don’t conflict can trade places without
        changing anything. A conflicting pair can’t, so it pins an order: whichever transaction’s step comes first must
        come first in the serial order you swap your way to. Draw that as an arrow, and the arrows make the{' '}
        <strong>precedence graph</strong>:
      </p>
      <p className="text-center font-serif text-xl">
        T<sub>i</sub> → T<sub>j</sub> &nbsp;when a step of T<sub>i</sub> comes before a conflicting step of T
        <sub>j</sub>
      </p>
      <p>
        If the arrows never loop back, some order of the transactions puts every arrow forward (a{' '}
        <strong>topological order</strong>), and running them whole in that order gives the same result: the schedule
        is <strong>conflict-serializable</strong>. If they form a cycle, no order can honour them all. Take a transfer
        T1 that moves $50 from account A to B, and T2 that adds 10% interest to both, with $100 in each. Writing r for a
        read and w for a write, numbered by transaction:
      </p>
      <ul>
        {worked.map((p) => (
          <li key={p.name}>
            {p.name}: <code>{notation(p.txs, p.ops)}</code>
          </li>
        ))}
      </ul>
      <Numbers
        words
        items={worked.map((p) => ({
          label: p.name,
          value: p.verdict.order ? 'T1 → T2' : 'T1 ⇄ T2',
          note: `A ${p.final.A} · B ${p.final.B}`,
        }))}
      />
      <p>
        Mixed interleaves the two, but on both accounts T1 gets there first, so every arrow agrees and the balances
        match T1 then T2. Crossed lets the interest reach B before the transfer does: arrows both ways, and ${missing}{' '}
        goes missing, the interest on the $50 that was in neither account when each was paid.
      </p>

      <h2>Rearrange a schedule</h2>
      <p>
        Here are the transfer and the interest, with an audit T3 that adds up both accounts into C. Of the{' '}
        {BANK_INTERLEAVINGS} ways to interleave the first two, {BANK_PASSING} pass the test, and every one of the other{' '}
        {BANK_INTERLEAVINGS - BANK_PASSING} leaves balances no serial order gives.
      </p>
      <Figure
        readable
        caption="Each line joins a conflicting pair, with its arrow on the later step; the graph gathers them into one arrow per pair of transactions, labelled with the items. Sage arrows agree on an order, ink ones lie on a cycle. The table runs this schedule and every serial order from A = B = 100 and C = 0; another order can match by luck of those numbers, but the graph’s order matches from any start. Select a step and move it with Earlier and Later, or the arrow keys; it can only pass another transaction’s step."
      >
        <ScheduleLab />
      </Figure>

      <Predict
        kicker="Quick check"
        question={`T1 copies A into B and T2 copies B into A. Is ${notation(QUICK.txs, QUICK.ops)} conflict-serializable?`}
        options={[
          { label: 'Yes: no item is written twice' },
          { label: 'Yes: same as T1, T2' },
          { label: 'No: there is a cycle', right: true },
          { label: 'Yes: every read comes first' },
        ]}
        reveal={
          <>
            No. r1(A) comes before w2(A), so T1 → T2; r2(B) comes before w1(B), so T2 → T1. In either serial order the
            second transaction would read what the first wrote; here each read the old value, which no serial order
            allows. Steps can conflict without writing the same item twice.
          </>
        }
      />

      <h2>What to do about it</h2>
      <ul>
        <li>
          <strong>Let the database keep the order.</strong> Its scheduler keeps schedules safe, most often by making
          transactions wait for each other with locks (see{' '}
          <Link to="/learnings/two-phase-locking">two-phase locking</Link>), so don’t try to arrange the timing yourself
          in application code.
        </li>
        <li>
          <strong>Know which guarantee you asked for.</strong> SQL offers weaker isolation levels that let some
          non-serializable schedules through, and many databases start at one: PostgreSQL’s default, Read Committed,
          does. Its SERIALIZABLE level uses a different technique, Serializable Snapshot Isolation, which watches for
          dangerous patterns of conflicts instead of making reads wait.
        </li>
        <li>
          <strong>Be ready to retry.</strong> At SERIALIZABLE the database may cancel a transaction with a serialization
          failure rather than let it close a cycle; run it again.
        </li>
        <li>
          <strong>Do the arithmetic inside one statement.</strong>{' '}
          <code>UPDATE accounts SET balance = balance + 50</code> reads and writes inside the database, so two deposits
          can’t both start from the old balance as they did in the guess.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question={`Three transactions run ${notation(CHECK.txs, CHECK.ops)}. Which serial order has the same effect?`}
        options={[
          { label: 'T3, T2, T1' },
          { label: 'T1, T2, T3' },
          { label: 'T2, T1, T3', right: true },
          { label: 'None: a cycle' },
        ]}
        reveal={
          <>
            T2, T1, T3. w2(A) before r1(A) gives T2 → T1, and w1(B) before r3(B) gives T1 → T3, so only one order puts
            both arrows forward. T3 starts first, but its read of C conflicts with nothing, so it pins nothing; only its
            read of B does, and that comes after T1’s write.
          </>
        }
      />
    </Article>
  )
}
