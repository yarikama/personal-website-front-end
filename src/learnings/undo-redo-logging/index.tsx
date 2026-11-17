import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Button, Choice, Controls, Figure, Numbers, Readout, Slider } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import { Recovery, Timeline } from './CrashLab'
import Ledger from './Ledger'
import {
  broken,
  crashAfter,
  INITIAL,
  LAB,
  LAB_START,
  money,
  QUIZ_AFTER,
  QUIZ_DISK,
  QUIZ_LOG,
  recordText,
  rightCrashes,
  SCHEMES,
  STORY,
  STORY_NUMBERS,
  T2_VALUE,
  TRANSFER,
  type Scheme,
} from './model'

const RECORDS = [
  { label: 'Undo', value: `old: ${INITIAL.A}`, note: `<T1, A, ${INITIAL.A}>` },
  { label: 'Redo', value: `new: ${TRANSFER.A}`, note: `<T1, A, ${TRANSFER.A}>` },
  { label: 'Undo/redo', value: 'both', note: `<T1, A, ${INITIAL.A}, ${TRANSFER.A}>` },
]

const RULES = [
  {
    scheme: 'Undo',
    keeps: 'old values',
    when: 'after its record (U1); all of them before COMMIT (U2)',
    recovery: 'undo the uncommitted, newest record first',
  },
  {
    scheme: 'Redo',
    keeps: 'new values',
    when: 'only after its record and COMMIT (R1)',
    recovery: 'redo the committed, oldest record first',
  },
  {
    scheme: 'Undo/redo',
    keeps: 'both',
    when: 'any time after its record (UR1)',
    recovery: 'redo the committed, then undo the rest',
  },
]

const quizLog = QUIZ_LOG.map(recordText).join(' ')

export default function UndoRedoLogging() {
  const [scheme, setScheme] = useState<Scheme>(LAB_START.scheme)
  const [order, setOrder] = useState(0)
  const [crash, setCrash] = useState(LAB_START.crash)
  const [replays, setReplays] = useState(0)

  const orders = LAB[scheme]
  const { name, events } = orders[Math.min(order, orders.length - 1)]
  const k = Math.min(crash, events.length)
  const result = crashAfter(events, k, scheme, INITIAL)
  const broke = broken(events, scheme, INITIAL)
  const rightAt = rightCrashes(events, scheme, INITIAL)

  const pickScheme = (next: Scheme) => {
    setScheme(next)
    setOrder(0)
    setCrash((c) => Math.min(c, LAB[next][0].events.length))
  }
  const pickOrder = (next: string) => {
    const i = orders.findIndex((o) => o.name === next)
    setOrder(i)
    setCrash((c) => Math.min(c, orders[i].events.length))
  }

  return (
    <Article
      kicker="Inside a database · Transactions"
      title="Write it down first"
      promise="A transfer changes two balances on disk, and the power can fail between the two writes. How does a database come back with the money moved or not moved, and never half-way?"
      takeaway={
        <>
          Before a change reaches the disk, a log record that can undo or redo it must already be there: that is{' '}
          <em>write-ahead logging</em>. Undo logs force changes out before COMMIT, redo logs hold them back until after,
          and undo/redo logs let the buffer pool write whenever it likes.
        </>
      }
      sources={[
        {
          title: 'COMP 530: Database System Implementation',
          by: 'Chris Jermaine, Rice University, Fall 2025',
          part: 'Lecture notes on logging (“Concurrency Control & Recovery”): transactions, undo, redo and undo/redo logging and their recovery',
        },
        {
          title: 'Database System Implementation',
          by: 'Hector Garcia-Molina, Jeffrey D. Ullman and Jennifer Widom, 2000',
          part: 'Chapter 8, “Coping with System Failures”: undo logging, redo logging and undo/redo logging',
        },
        {
          title: 'ARIES: A Transaction Recovery Method Supporting Fine-Granularity Locking and Partial Rollbacks Using Write-Ahead Logging',
          by: 'C. Mohan, Don Haderle, Bruce Lindsay, Hamid Pirahesh and Peter Schwarz, ACM TODS, 1992',
          part: 'Steal and no-force buffer management under write-ahead logging',
          url: 'https://doi.org/10.1145/128765.128770',
        },
      ]}
    >
      <Predict
        question={`A bank moves ${money(TRANSFER.amount)} from account A (${money(INITIAL.A)}) to account B (${money(INITIAL.B)}). The database writes A’s new balance to disk, then crashes before writing B’s. It keeps no log. After the restart, what does the bank see?`}
        options={[
          { label: `A ${INITIAL.A}, B ${INITIAL.B}` },
          { label: `A ${TRANSFER.A}, B ${TRANSFER.B}` },
          { label: `A ${TRANSFER.A}, B ${INITIAL.B}`, right: true },
          { label: 'It refuses to start' },
        ]}
        reveal={
          <>
            A {TRANSFER.A} and B {INITIAL.B}: {money(TRANSFER.amount)} has vanished. The disk holds whatever reached it,
            and nothing on it says a transfer was half done, so the restarted database can’t tell this from real
            balances. It needs a note, and the note has to come first.
          </>
        }
      />

      <h2>The ledger and the notebook</h2>

      <Steps
        say={[
          <>
            You keep a club’s ledger in pen. To move {money(TRANSFER.amount)} from Trips to Food, you work out both new
            totals on a scratch pad.
          </>,
          <>You copy them into the ledger when you get round to it, Trips first.</>,
          <>
            The fire alarm goes: the scratch pad is lost, and the ledger adds up to {money(STORY_NUMBERS.halfDone)}{' '}
            instead of {money(STORY_NUMBERS.before)}.
          </>,
          <>
            So you keep a notebook: before inking a line you jot its old number there, and you write “done” only once
            every line is inked.
          </>,
          <>
            Cut off again, you see a job with no “done”, so you put its old numbers back, newest note first: Trips{' '}
            {STORY_NUMBERS.undone.A}, Food {STORY_NUMBERS.undone.B}.
          </>,
          <>
            Or you jot the new numbers and “done” before inking anything; cut off, you copy every job marked done into
            the ledger and skip the rest.
          </>,
          <>
            The ledger is the disk, the scratch pad is memory, the notebook is the log, and “done” is a COMMIT record.
          </>,
        ]}
      >
        {(step) => (
          <Ledger
            key={step}
            frames={STORY[step]}
            words={step === 6 ? 'system' : 'story'}
            pace={step === 2 || step === 6 ? 900 : 1100}
          />
        )}
      </Steps>

      <h2>Write the note first</h2>
      <p>
        Both notebooks keep one rule: the record of a change is on disk before the change is. That rule is called{' '}
        <strong>write-ahead logging</strong>, and the records make up the <strong>log</strong>, a file only ever
        appended to, which is cheap (see{' '}
        <Link to="/learnings/disk-access-cost">why a disk read costs so much</Link>). A <strong>transaction</strong>,
        like the transfer, has committed once its COMMIT record is on disk, and not a moment before. What each update
        record holds decides the rest. For WRITE(A, {TRANSFER.A}), which changes A from {INITIAL.A}:
      </p>
      <Numbers words items={RECORDS} />
      <p>
        An old value lets recovery take a change back; a new value lets it make the change again. Each choice comes with
        its own rule about when a change may reach the disk:
      </p>
      <div className="not-prose my-8 overflow-x-auto">
        <table className="w-full min-w-[34rem] text-left text-[0.95rem] leading-snug">
          <thead className="font-mono text-[0.8125rem] uppercase tracking-widest text-zinc-faded">
            <tr>
              <th className="pb-3 pr-4 font-normal">Scheme</th>
              <th className="pb-3 pr-4 font-normal">Log keeps</th>
              <th className="pb-3 pr-4 font-normal">A change may reach disk</th>
              <th className="pb-3 font-normal">Recovery</th>
            </tr>
          </thead>
          <tbody className="text-ink">
            {RULES.map((r) => (
              <tr key={r.scheme}>
                <td className="py-2 pr-4 font-mono text-[0.875rem] text-sage-ink">{r.scheme}</td>
                <td className="py-2 pr-4">{r.keeps}</td>
                <td className="py-2 pr-4">{r.when}</td>
                <td className="py-2">{r.recovery}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Undo walks backwards so that if a transaction changed A twice, its oldest note is applied last; redo walks
        forwards so the newest value wins. Recovery can run twice, or crash halfway and start over, and still write the
        same values. When it is done, it logs an ABORT for each transaction it wiped out.
      </p>

      <h2>Why real systems log both</h2>
      <p>
        Each rule ties the <Link to="/learnings/buffer-replacement">buffer pool’s</Link> hands. Writing out a page that
        holds uncommitted changes is a <strong>steal</strong>; making all of a transaction’s pages reach the disk at
        commit is a <strong>force</strong>. Undo logging steals but forces: every commit waits for its pages to be
        written, hot ones included. Redo logging never forces but can’t steal, so a long transaction’s pages sit in
        memory until it ends. Undo/redo logging is steal and no-force: the pool writes pages whenever its own policy
        says, for the price of bigger records. That is why real systems log both; ARIES, the recovery method behind DB2
        and SQL Server, is undo/redo logging with refinements.
      </p>

      <h2>Crash it yourself</h2>
      <p>
        T1 moves {money(TRANSFER.amount)} from A to B while T2 adds {money(T2_VALUE - INITIAL.C)} of interest to C.
        Pick a scheme and an order, then pick any step to crash after.
      </p>

      <Figure caption="Rows after the crash never happened. Memory and the log tail are lost, so recovery has only the disk and the log on disk; sage marks the record it is reading. Kept to its rules, every scheme is right at every crash point. In an order that breaks a rule, the marked row is where it breaks, and a crash soon after it leaves a balance wrong.">
        <div className="grid gap-6 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
          <Timeline events={events} crash={k} broke={broke} onCrash={setCrash} />
          <Recovery key={`${scheme}-${name}-${k}-${replays}`} crash={result} broke={broke && broke.at < k ? broke : null} />
        </div>
        <div className="mt-5 flex flex-wrap gap-x-10 gap-y-4">
          <Readout
            label="Crash points recovered right"
            value={`${rightAt} of ${events.length + 1}`}
            accent={rightAt === events.length + 1}
          />
        </div>
        <Controls>
          <Choice label="Scheme" options={SCHEMES} value={scheme} onChange={pickScheme} />
          <Choice label="Order" options={orders.map((o) => o.name)} value={name} onChange={pickOrder} />
          <Slider label="Crash after step" value={k} min={0} max={events.length} onChange={setCrash} />
          <Button onClick={() => setReplays((n) => n + 1)}>Replay recovery</Button>
        </Controls>
      </Figure>

      <Predict
        kicker="Quick check"
        question="A database uses redo logging. One transaction has been changing pages for an hour without committing, and the buffer pool is full of its pages. What may the pool do with them?"
        options={[
          { label: 'Write them out once their records are on disk' },
          { label: 'Write them out; recovery redoes them anyway' },
          { label: 'Keep them in memory until it commits', right: true },
          { label: 'Write them out, and roll back if it aborts' },
        ]}
        reveal={
          <>
            Keep them. A redo log holds only new values, so if one of those pages reached the disk and the transaction
            then died or aborted, nothing would say what to put back, and flushing the records first doesn’t change
            that. Hence rule R1: no page before its COMMIT is on disk. Pages stuck in memory are redo logging’s weak
            spot, and a reason to log old values too.
          </>
        }
      />

      <h2>What engineers do about it</h2>
      <ul>
        <li>
          <strong>Flush COMMIT before saying “done”.</strong> A user told “saved” while the COMMIT record is still in
          memory can lose the change in a crash. To keep this cheap, many transactions’ COMMIT records share one log
          write, which is called group commit.
        </li>
        <li>
          <strong>Give the log a disk of its own.</strong> Appends then never wait behind page writes, and if the data’s
          disk dies, a backup plus the log rebuilds it.
        </li>
        <li>
          <strong>Let locks protect the undo.</strong> Putting old values back is only safe if no other transaction
          read the new ones before the commit, which holding locks until commit guarantees (see{' '}
          <Link to="/learnings/two-phase-locking">two-phase locking</Link>).
        </li>
        <li>
          <strong>Trim the log.</strong> Left alone it grows forever and recovery reads all of it;{' '}
          <Link to="/learnings/checkpoints">checkpoints</Link> mark how far back it needs to look.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question={`A shop’s database uses undo/redo logging. At a crash, the log on disk reads ${quizLog}, and the disk holds stock ${QUIZ_DISK.stock} and price ${QUIZ_DISK.price}. After recovery, what do they read?`}
        options={[
          { label: `stock ${QUIZ_DISK.stock}, price ${QUIZ_DISK.price}` },
          { label: `stock ${QUIZ_AFTER.stock}, price ${QUIZ_DISK.price}` },
          { label: `stock ${QUIZ_DISK.stock}, price ${QUIZ_AFTER.price}` },
          { label: `stock ${QUIZ_AFTER.stock}, price ${QUIZ_AFTER.price}`, right: true },
        ]}
        reveal={
          <>
            Stock {QUIZ_AFTER.stock}, price {QUIZ_AFTER.price}. T’s COMMIT is on disk, so T committed; its new stock
            never left memory, and the redo pass writes it. U never committed, but the pool had already stolen its page
            with price {QUIZ_DISK.price}, so the undo pass puts back {QUIZ_AFTER.price}. Neither of the other schemes
            could leave this disk: undo logging would have forced stock out before T’s COMMIT, and redo logging would
            have kept price in memory.
          </>
        }
      />
    </Article>
  )
}
