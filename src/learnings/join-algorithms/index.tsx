import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Controls, Figure, Numbers, Slider } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Costs from './Costs'
import Limits from './Limits'
import {
  CHECK,
  cheapest,
  chunks,
  EXAMPLE,
  formatCount,
  graceIos,
  hybridIos,
  MEMORY_SIZES,
  nestedLoopIos,
  partitionPages,
  runCount,
  sortedMergeIos,
  sortMergeIos,
  TABLE_SIZES,
} from './model'
import Stapling from './Stapling'
import { BOXES, END, INVOICES, ROOM, SLIPS, TRIPS } from './story'

const n = formatCount
const { r, s, m } = EXAMPLE

// The guess: block nested loop on the course's example
const GUESS = nestedLoopIos(r, s, m)

// The same join with three sizes of memory, and what wins at each
const BY_MEMORY = [
  { memory: 11, wins: 'nested loop only' },
  { memory: 101, wins: 'hybrid hash' },
  { memory: 501, wins: 'one pass' },
].map((row) => ({ ...row, least: cheapest(r, s, row.memory) }))

export default function JoinAlgorithms() {
  const [big, setBig] = useState(TABLE_SIZES.indexOf(r))
  const [small, setSmall] = useState(TABLE_SIZES.indexOf(s))
  const [memory, setMemory] = useState(MEMORY_SIZES.indexOf(m))
  // S is the smaller table: moving R below it brings S down too, and the other way round
  const chooseBig = (i: number) => {
    setBig(i)
    if (small > i) setSmall(i)
  }
  const chooseSmall = (i: number) => {
    setSmall(i)
    if (i > big) setBig(i)
  }

  return (
    <Article
      kicker="Inside a database · Query optimization"
      title="Join algorithms"
      promise="The same join of the same two tables can cost fifteen hundred page reads or fifty thousand. What decides which?"
      takeaway={
        <>
          A join reads each table once if the smaller one fits in memory; past that, <em>partitioning</em> or sorting
          reads every page three times, up to about M² pages, while a nested loop rereads the larger table once per
          memoryful of the smaller.
        </>
      }
      sources={[
        {
          title: 'COMP 530: Database System Implementation',
          by: 'Chris Jermaine, Rice University, Fall 2025',
          part: 'Physical query execution; Assignment 6 (ScanJoin and SortMergeJoin) and Assignment 8 (running plans)',
        },
        {
          title: 'Database System Implementation',
          by: 'Hector Garcia-Molina, Jeffrey D. Ullman and Jennifer Widom, 2000',
          part: 'Chapter 6, “Query Execution”: nested-loop joins, and two-pass algorithms based on sorting and on hashing',
        },
        {
          title: 'PostgreSQL documentation',
          by: 'The PostgreSQL Global Development Group',
          part: '“Resource Consumption” (work_mem) and “Using EXPLAIN”',
          url: 'https://www.postgresql.org/docs/current/runtime-config-resource.html',
        },
      ]}
    >
      <Predict
        question={`Table R has ${n(r)} pages, table S has ${n(s)}, and the join may use ${n(m)} pages of memory. A block nested loop join holds as much of S as it can and reads R past it. How many page I/Os?`}
        options={[
          { label: n(r + s) },
          { label: n(GUESS), right: true },
          { label: n(nestedLoopIos(r, s, 11)) },
          { label: n(r * s) },
        ]}
        reveal={
          <>
            {n(GUESS)}. S goes through memory in {chunks(s, m)} chunks of {n(m - 1)} pages, and each chunk reads all{' '}
            {n(r)} pages of R: {n(s)} + {chunks(s, m)} × {n(r)}. Matching every page of R against every page of S would
            be {n(r * s)}. Reading each page once, {n(r + s)}, needs all of S in memory, and S is five times too big. A
            pile of paperwork shows the other ways.
          </>
        }
      />

      <h2>Stapling slips to invoices</h2>

      <Steps
        readable
        say={[
          <>
            You have {INVOICES.length} invoices and {SLIPS.length} shipping slips to staple together by order number,
            and a table with room for only {ROOM} sheets.
          </>,
          <>
            Lay {ROOM - 1} slips on the table and go through all {INVOICES.length} invoices one at a time, then swap in
            the other {ROOM - 1} and go through them all again.
          </>,
          <>
            A table with room for all {SLIPS.length} slips, laid out by last digit, would need one trip: each invoice
            has one place to look.
          </>,
          <>
            Yours holds {ROOM}, so first deal both piles into {BOXES} boxes by last digit, slips and invoices by the
            same rule.
          </>,
          <>Then take one box at a time: its slips fit on the table, and its invoices can only match slips in the same box.</>,
          <>Or sort both piles by order number and walk down them side by side, so each slip meets its invoice on the way.</>,
          <>
            The table is memory, M = {ROOM} pages, and each sheet a page: the piles are tables R and S on disk, the
            boxes are partitions, and every pick-up or put-down is a page I/O.
          </>,
        ]}
      >
        {(step) =>
          step === 0 ? (
            <Stapling key="start" scene="start" />
          ) : step === 1 ? (
            <Stapling key="nested" scene="nested" />
          ) : step === 2 ? (
            <Stapling key="onePass" scene="onePass" />
          ) : step === 3 ? (
            <Stapling key="partition" scene="partition" />
          ) : step === 4 ? (
            <Stapling key="boxJoin" scene="boxJoin" />
          ) : step === 5 ? (
            <Stapling key="sort" scene="sort" />
          ) : (
            <Stapling key="system" scene="boxJoin" system />
          )
        }
      </Steps>

      <h2>What each way costs</h2>
      <p>
        Count page I/Os, each a trip to disk (see <Link to="/learnings/disk-access-cost">what a disk read costs</Link>).
        B(R) and B(S) are the tables’ pages, S the smaller, and M the pages of the{' '}
        <Link to="/learnings/buffer-replacement">buffer pool</Link> the join may use. The join’s own output isn’t
        counted, since the next operator usually takes rows as they come (pipelining); the course’s MyDB writes every
        intermediate result to disk and pays for it.
      </p>
      <p>
        The story’s first way is a <strong>block nested loop</strong>: S once, M − 1 pages at a time, and all of R once
        per chunk, B(S) + B(R)·B(S)/(M − 1). It runs with any memory and any join condition; going one record at a time
        instead could cost T(R)·T(S) reads. The big table is a <strong>one-pass hash join</strong>: a hash table on S,
        R streamed past once, B(R) + B(S). Nothing reads less, but it needs B(S) ≤ M − 1.
      </p>
      <p>
        The boxes are a <strong>Grace hash join</strong>: read both tables, write them back as M − 1 partitions by the
        same hash function, then read each pair of partitions together, 3(B(R) + B(S)). It works while a partition of
        S, about B(S)/(M − 1) pages, fits in memory, so S can reach about M² pages. Sorting is a{' '}
        <strong>sort-merge join</strong>: write sorted runs of both tables, then merge every run at once and join the
        rows as they come out, also 3(B(R) + B(S)). Here the runs of <em>both</em> tables share memory, so B(R) + B(S)
        can reach about M², the limit of <Link to="/learnings/external-merge-sort">external merge sort</Link>. With more
        runs than that, each table is sorted in full first, for 5(B(R) + B(S)).
      </p>

      <Clip
        src="join-algorithms/three-trips"
        label={`Block nested loop: read S once, plus one read of R for each chunk of M minus 1 pages of S. With B(R) = ${n(r)}, B(S) = ${n(s)} and M = ${n(m)}, that is ${n(s)} plus ${chunks(s, m)} times ${n(r)}, ${n(GUESS)}. Grace hash join: read both, write both, read both, 3 times ${n(r + s)}, ${n(graceIos(r, s, m)!)}.`}
        caption="The nested loop’s bill grows with how many chunks S takes; partitioning’s stays at three trips a page."
      />

      <p>
        The story went the other way, {END.nested.reads} pick-ups against {END.boxJoin.reads + END.boxJoin.writes},
        because {TRIPS} trips through the invoices are cheap. Memory decides. The cheapest join of R ({n(r)} pages) and
        S ({n(s)}):
      </p>
      <Numbers
        items={BY_MEMORY.map(({ memory, least, wins }) => ({ label: `M = ${n(memory)}`, value: n(least), note: wins }))}
      />
      <p>
        At {n(m)} pages Grace and sort-merge tie at {n(graceIos(r, s, m)!)}; the <strong>hybrid hash join</strong> beats
        them by keeping part of S in memory while it partitions, so that share is never written or read back: about
        (B(R) + B(S))(3 − 2M/B(S)), here {n(hybridIos(r, s, m)!)}.
      </p>

      <h2>Try other sizes</h2>
      <p>
        Bars count in units of reading both tables once. Shrink memory until S stops fitting, then until its partitions
        don’t.
      </p>
      <Figure
        readable
        caption="The sage bar is the cheapest. Hashing needs only the smaller table under about M² (the solid mark); sort-merge needs both together there (the dashed mark)."
      >
        <Costs r={TABLE_SIZES[big]} s={TABLE_SIZES[small]} m={MEMORY_SIZES[memory]} />
        <div className="mt-8">
          <Limits r={TABLE_SIZES[big]} s={TABLE_SIZES[small]} m={MEMORY_SIZES[memory]} />
        </div>
        <Controls>
          <Slider
            label="B(R), larger"
            value={big}
            min={0}
            max={TABLE_SIZES.length - 1}
            onChange={chooseBig}
            format={(i) => n(TABLE_SIZES[i])}
          />
          <Slider
            label="B(S), smaller"
            value={small}
            min={0}
            max={TABLE_SIZES.length - 1}
            onChange={chooseSmall}
            format={(i) => n(TABLE_SIZES[i])}
          />
          <Slider
            label="M, memory"
            value={memory}
            min={0}
            max={MEMORY_SIZES.length - 1}
            onChange={setMemory}
            format={(i) => n(MEMORY_SIZES[i])}
          />
        </Controls>
      </Figure>

      <Predict
        kicker="Quick check"
        question={`Same tables (${n(r)} and ${n(s)} pages, ${n(m)} pages of memory), but both arrive already sorted on the join key. Which join reads least?`}
        options={[
          { label: `Block nested loop, ${n(nestedLoopIos(r, s, m))}` },
          { label: `Grace hash, ${n(graceIos(r, s, m)!)}` },
          { label: `Hybrid hash, about ${n(hybridIos(r, s, m)!)}` },
          { label: `Sort-merge, ${n(sortedMergeIos(r, s))}`, right: true },
        ]}
        reveal={
          <>
            Sort-merge. Its first two trips only made sorted runs; with the tables already in order, the merge alone is
            left, one read of each page, {n(sortedMergeIos(r, s))} in all, with a page per table of memory. None of the
            hash joins can use the order they were given.
          </>
        }
      />

      <h2>Choosing a join</h2>
      <ul>
        <li>
          <strong>Give the join room.</strong> A little more memory can turn three trips into one. In PostgreSQL that
          memory is <code>work_mem</code>, and <code>EXPLAIN ANALYZE</code> shows a hash with more than one batch when it
          had to partition.
        </li>
        <li>
          <strong>Hash the smaller table.</strong> Only it has to fit, so it goes in memory and the larger streams past.
          The course’s MyDB keeps a margin: its one-pass scan join runs only while the smaller table is at most half the
          buffer pool, and sort-merge otherwise.
        </li>
        <li>
          <strong>Sort when the order is free or wanted.</strong> Inputs sorted by an index or an earlier step skip to
          the merge, and an <code>ORDER BY</code> on the join key gets its sort for nothing. <code>GROUP BY</code> uses
          the same tools: a hash table in one pass if the groups fit, about three trips a page if not.
        </li>
      </ul>
      <p>
        Which two tables to join first is a separate choice, the <Link to="/learnings/join-order">join order</Link>.
      </p>

      <Predict
        kicker="Check yourself"
        question={`Now R has ${n(CHECK.r)} pages, S has ${n(CHECK.s)}, and memory is ${CHECK.m} pages. Which join can still read every page just three times?`}
        options={[{ label: 'Grace hash', right: true }, { label: 'Sort-merge' }, { label: 'Both' }, { label: 'Neither' }]}
        reveal={
          <>
            Grace hash, for {n(graceIos(CHECK.r, CHECK.s, CHECK.m)!)}: S splits into {CHECK.m - 1} partitions of about{' '}
            {partitionPages(CHECK.s, CHECK.m)} pages, and each fits in memory. Sort-merge makes{' '}
            {runCount(CHECK.r, CHECK.m)} runs of R and {runCount(CHECK.s, CHECK.m)} of S, far more than the{' '}
            {CHECK.m - 1} it can merge at once
            {sortMergeIos(CHECK.r, CHECK.s, CHECK.m) === null ? ', and sorting R on its own takes three passes' : ''}.
            Hashing needs only the smaller table under about M²; sorting needs both together.
          </>
        }
      />
    </Article>
  )
}
