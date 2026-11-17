import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Choice, Controls, Figure, Numbers, Readout, Slider } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import LogView from './LogView'
import {
  CHECK_LOG,
  CHECKPOINTING,
  duration,
  EARLY_CUT,
  FUZZY,
  GUESS,
  LAB,
  LONG_HELD,
  labCrash,
  labHistory,
  LOG_MB_PER_S,
  PLAIN,
  QUIET,
  READ_MB_PER_S,
  SCHEMES,
  schemeOf,
  show,
  STORY,
  STORY_TICKS,
  WORK,
  WORKED,
  type Checkpointing,
  type SchemeName,
  type WorkName,
} from './model'
import Rules from './Rules'

export default function Checkpoints() {
  const [checkpointing, setCheckpointing] = useState<Checkpointing>('Nonquiescent')
  const [scheme, setScheme] = useState<SchemeName>('Undo')
  const [work, setWork] = useState<WorkName>('Short')
  const [tick, setTick] = useState(190)
  const history = labHistory(checkpointing, scheme, work)
  const run = labCrash(history, schemeOf(scheme), tick)

  return (
    <Article
      kicker="Inside a database · Transactions"
      title="Where recovery can stop"
      promise="After a crash, a database reads its log backwards to put things right. If it has been running for a month, does it have to read the whole month?"
      takeaway={
        <>
          A checkpoint is a promise in the log that everything before it is settled, so recovery stops there and the
          older log can go. The <em>nonquiescent</em> kind makes that promise without stopping new work.
        </>
      }
      sources={[
        {
          title: 'COMP 530: Database System Implementation',
          by: 'Chris Jermaine, Rice University, Fall 2025',
          part: 'Lecture notes on logging and recovery: quiescent and nonquiescent checkpoints for undo, redo and undo/redo logs, and log truncation',
        },
        {
          title: 'Database System Implementation',
          by: 'Hector Garcia-Molina, Jeffrey D. Ullman and Jennifer Widom, 2000',
          part: 'Chapter 8, “Coping with System Failures”: checkpointing an undo log, nonquiescent checkpointing, and checkpoints for redo and undo/redo logs',
        },
        {
          title:
            'ARIES: A Transaction Recovery Method Supporting Fine-Granularity Locking and Partial Rollbacks Using Write-Ahead Logging',
          by: 'C. Mohan, Don Haderle, Bruce Lindsay, Hamid Pirahesh and Peter Schwarz, ACM Transactions on Database Systems, 1992',
          part: 'Fuzzy checkpoints: the transaction table and the dirty page table',
          url: 'https://doi.org/10.1145/128765.128770',
        },
        {
          title: 'PostgreSQL Documentation',
          by: 'The PostgreSQL Global Development Group',
          part: '“WAL Configuration”: checkpoint_timeout, 5 minutes by default',
          url: 'https://www.postgresql.org/docs/current/wal-configuration.html',
        },
      ]}
    >
      <Predict
        question={`A database has run for ${GUESS.days} days, writing to its log the whole time, and none of its transactions lasts more than a second. Then it crashes. With nothing else in the log to go on, how far back must recovery read?`}
        options={[
          { label: 'The last second' },
          { label: 'The last minute' },
          { label: 'The last day' },
          { label: `All ${GUESS.days} days`, right: true },
        ]}
        reveal={
          <>
            All of it. The log says what happened, but nothing in it promises that a transaction from day 3 ever
            finished. At {LOG_MB_PER_S} MB of log a second, read back at the {READ_MB_PER_S} MB/s of a disk, that is
            about {duration(WORKED[0].seconds)} of reading before the database can open. A café shows the fix.
          </>
        }
      />

      <h2>A line across the notebook</h2>

      <Steps
        readable
        say={[
          <>You run a café and keep a notebook: a line when an order starts, one for each step, one when it’s served.</>,
          <>
            The power cuts out. To bin every half-made order you read back from the last line, and nothing lets you stop
            before the first: all {STORY.plain.read} lines.
          </>,
          <>So now and then you stop taking orders, finish the open ones, and draw a line across: nothing above it is open.</>,
          <>
            At the next power cut you read back only to the line, {STORY.quiet.read} lines, and the pages above it can be
            torn out. But new orders waited while you cleared the counter.
          </>,
          <>
            Better: note which orders are open (C and D) and keep taking new ones. Once C and D are served, write “end”.
            Now a read-back stops at the note: {STORY.fuzzy.read} lines.
          </>,
          <>
            If the power cuts before “end”, read back to where C began, the oldest order on the note: {STORY.early.read}{' '}
            lines. Anything older was served before you wrote it.
          </>,
          <>
            The notebook is a database’s log and an order is a transaction. The line is a checkpoint, the note and its
            “end” are &lt;START CKPT&gt; and &lt;END CKPT&gt;, and tearing out pages is truncating the log.
          </>,
        ]}
      >
        {(step) =>
          step === 0 ? (
            <LogView key="plain-fill" log={PLAIN.log} ticks={STORY_TICKS} words="cafe" fill crashed={false} />
          ) : step === 1 ? (
            <LogView key="plain-scan" log={PLAIN.log} ticks={STORY_TICKS} words="cafe" />
          ) : step === 2 ? (
            <LogView
              key="quiet-fill"
              log={QUIET.log}
              frozen={QUIET.frozen}
              ticks={STORY_TICKS}
              words="cafe"
              fill
              crashed={false}
            />
          ) : step === 3 ? (
            <LogView key="quiet-scan" log={QUIET.log} frozen={QUIET.frozen} ticks={STORY_TICKS} words="cafe" />
          ) : step === 4 ? (
            <LogView key="fuzzy" log={FUZZY.log} ticks={STORY_TICKS} words="cafe" fill pace={120} />
          ) : step === 5 ? (
            <LogView key="early" log={FUZZY.log} cut={EARLY_CUT} ticks={STORY_TICKS} words="cafe" />
          ) : (
            <LogView key="reveal" log={FUZZY.log} ticks={STORY_TICKS} words="db" still />
          )
        }
      </Steps>

      <h2>Where recovery may stop</h2>
      <p>
        That line is a <strong>checkpoint</strong>: a record in the log promising that everything before it is
        settled. Recovery with an undo log (see <Link to="/learnings/undo-redo-logging">undo and redo logging</Link>)
        reads back from the end, undoing every transaction that never committed, so it can stop wherever no unfinished
        transaction can begin any earlier. The kind that turns new work away and waits is a{' '}
        <strong>quiescent</strong> checkpoint, written &lt;CKPT&gt;. The note is a <strong>nonquiescent</strong> one:
        &lt;START CKPT (T3, T4)&gt; lists the transactions open as it begins, and &lt;END CKPT&gt; follows once they
        have all finished.
      </p>

      <Figure caption="Find the last checkpoint record before the crash, then read back as far as the middle column says. An unfinished checkpoint still helps an undo log: any transaction open at the crash is on its list or began after it.">
        <Rules />
      </Figure>

      <p>
        How long recovery takes to read is the log written since that stop, divided by how fast the disk reads it
        back. With {LOG_MB_PER_S} MB of log a second, a {READ_MB_PER_S} MB/s disk and a crash just before the next
        checkpoint:
      </p>
      <Numbers words items={WORKED.map((w) => ({ label: w.label, value: duration(w.seconds), note: w.note }))} />
      <p>
        And once &lt;END CKPT&gt; is on disk, nothing before its &lt;START CKPT&gt; will be read again, so the log can
        be cut there. That cut, <strong>truncating</strong> the log, is what stops it growing forever.
      </p>

      <h2>With an undo/redo log</h2>
      <p>
        An undo/redo log also redoes committed changes that were still in memory, so its checkpoint must promise more.
        Its &lt;END CKPT&gt; comes once every page that was dirty at &lt;START CKPT&gt; is on disk, whoever wrote it.
        That never waits for a transaction to finish, but recovery still reads back to the &lt;START&gt; of each one on
        the list, in case it needs undoing. A crash before &lt;END CKPT&gt; breaks the promise: work committed ahead of
        the checkpoint may still sit only in memory. So recovery ignores the unfinished checkpoint and goes back to the
        last complete one.
      </p>

      <h2>See it on a busy log</h2>
      <p>
        {LAB.ticks} ticks of a database running a few transactions at once, with a checkpoint due every {LAB.every}.
        Move the crash, change the checkpoint, and add one transaction that runs for most of the day.
      </p>
      <Figure
        caption={`Bars are transactions, ink when still open at the crash; sage lines are checkpoints, dashed where a nonquiescent one starts; shaded bands are where a quiescent one held new work back. Under them is the log: recovery reads the sage squares, and the outlined ones can be deleted. With the long transaction, a quiescent checkpoint holds new work back for ${LONG_HELD} of ${LAB.ticks} ticks. Every setting and every crash point recovers the same database as reading the whole log would.`}
      >
        <LogView
          log={run.log}
          ticks={LAB.ticks}
          scheme={schemeOf(scheme)}
          frozen={history.frozen}
          crashAt={tick}
          words="db"
          still
          dense
        />
        <div className="mt-5 flex flex-wrap gap-x-10 gap-y-4">
          <Readout label="Recovery reads" value={`${run.log.length - run.stop} of ${run.log.length}`} accent />
          <Readout label="Can delete" value={run.deletable} />
          <Readout label="New work held back" value={`${run.heldBack} ticks`} />
        </div>
        <Controls>
          <Choice label="Checkpoint" options={CHECKPOINTING} value={checkpointing} onChange={setCheckpointing} />
          <Choice label="Log" options={SCHEMES} value={scheme} onChange={setScheme} />
          <Choice label="Transactions" options={WORK} value={work} onChange={setWork} />
          <Slider label="Crash at tick" value={tick} min={1} max={LAB.ticks} onChange={setTick} />
        </Controls>
      </Figure>

      <Predict
        kicker="Quick check"
        question="A shop’s database runs short orders all day, plus one report that updates rows for 40 minutes. A quiescent checkpoint falls due a minute after the report starts. What happens?"
        options={[
          { label: 'It skips the report' },
          { label: 'Orders wait 39 minutes', right: true },
          { label: 'The report is aborted' },
          { label: 'Nothing: it’s instant' },
        ]}
        reveal={
          <>
            New orders wait. A quiescent checkpoint lets nothing start until every running transaction has finished,
            and the report has 39 minutes to go. A nonquiescent one would list the report and let orders carry on.
          </>
        }
      />

      <h2>What engineers do about it</h2>
      <ul>
        <li>
          <strong>Checkpoint on a timer.</strong> A restart reads about one interval of log, so pick the interval from
          the restart you can live with. PostgreSQL’s <code>checkpoint_timeout</code> is 5 minutes by default.
        </li>
        <li>
          <strong>Never stop the world.</strong> Real systems checkpoint without pausing. The fuzzy checkpoints of
          ARIES, the design most databases follow, just record the open transactions and the dirty pages, and let the
          pages reach the disk in their own time.
        </li>
        <li>
          <strong>Keep transactions short.</strong> An open transaction holds the log back: recovery may have to read
          back to its &lt;START&gt;, and nothing after that point can be deleted.
        </li>
        <li>
          <strong>Delete only after &lt;END CKPT&gt;.</strong> Until the end is on disk, the checkpoint has promised
          nothing.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question={
          <>
            An undo/redo log crashes in the middle of its second checkpoint. Where does recovery start reading?
            <span className="mt-4 block font-mono text-sm leading-relaxed text-zinc-faded">
              {CHECK_LOG.map((r, i) => (
                <span key={i} className="block whitespace-pre">
                  {String(i + 1).padStart(2, ' ')} {show(r)}
                </span>
              ))}
            </span>
          </>
        }
        options={[{ label: 'Record 11' }, { label: 'Record 9' }, { label: 'Record 4', right: true }, { label: 'Record 1' }]}
        reveal={
          <>
            Record 4. The checkpoint at record 11 never ended, so nothing says the pages dirty then reached the disk:
            T2 committed at record 8, and its Y = 4 may still be only in memory. Stopping where T3 began, at record 9,
            would never redo it. The last complete checkpoint, records 5 to 7, does promise that everything before
            record 5 is on disk, and T2, on its list, began at record 4.
          </>
        }
      />
    </Article>
  )
}
