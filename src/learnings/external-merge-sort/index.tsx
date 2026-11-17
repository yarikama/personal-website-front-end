import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Choice, Controls, Figure, Numbers, Slider } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Desk from './Desk'
import {
  DATA_SIZES,
  formatBytes,
  GB,
  MB,
  MEMORY_SIZES,
  PAGE_BYTES,
  pagesIn,
  passes,
  runChain,
  runCount,
  twoPassLimit,
} from './model'
import Passes from './Passes'
import { DESK, DONE, PAPERS } from './story'

// The guess: 100 GB with 1 GB of memory
const GUESS_RUNS = runCount(pagesIn(100 * GB), pagesIn(GB))
const twoPassBytes = (memory: number) => formatBytes(twoPassLimit(pagesIn(memory)) * PAGE_BYTES)

// Check yourself: 1 GB with 1 MB of memory
const SMALL = runChain(pagesIn(GB), pagesIn(MB))
const SMALL_PASSES = passes(pagesIn(GB), pagesIn(MB))

const RESULT = ['written', 'handed on'] as const

export default function ExternalMergeSort() {
  const [data, setData] = useState(DATA_SIZES.indexOf(100 * GB))
  const [memory, setMemory] = useState(MEMORY_SIZES.indexOf(GB))
  const [result, setResult] = useState<(typeof RESULT)[number]>('written')

  return (
    <Article
      kicker="Inside a database · Storage"
      title="External merge sort"
      promise="A table is a hundred times bigger than the memory you have to sort it in. How many times do you have to read it?"
      takeaway={
        <>
          Sort memory-sized runs, then merge them all at once: with M pages of memory, two passes sort about M² pages,
          so memory only has to grow with the <em>square root</em> of the data.
        </>
      }
      sources={[
        {
          title: 'COMP 530: Database System Implementation',
          by: 'Chris Jermaine, Rice University, Fall 2025',
          part: 'Lecture 5, “Organizing Records Into Pages and Files”: sorted files and TPMMS',
        },
        {
          title: 'Database System Implementation',
          by: 'Hector Garcia-Molina, Jeffrey D. Ullman and Jennifer Widom, 2000',
          part: 'Chapter 2, “Data Storage”',
        },
      ]}
    >
      <Predict
        question="You have 1 GB of memory and 100 GB of data in 4 KB pages. How many times does sorting it read every page from disk?"
        options={[{ label: 'Once' }, { label: 'Twice', right: true }, { label: 'About 7 times' }, { label: 'About 100 times' }]}
        reveal={
          <>
            Twice. The first read cuts the data into {GUESS_RUNS} sorted pieces of 1 GB; the second merges all{' '}
            {GUESS_RUNS} together in one go, because memory has room for a page of each. With the same 1 GB, those two
            reads would sort about {twoPassBytes(GB)}. A desk shows why.
          </>
        }
      />

      <h2>Sorting on a small desk</h2>

      <Steps
        readable
        say={[
          <>
            You have {PAPERS.length} exam papers to put in order of student ID, and your desk has room for only {DESK}{' '}
            at a time.
          </>,
          <>So you take {DESK}, sort them on the desk, and set them down as a sorted stack, three times over.</>,
          <>Now lay the top paper of each stack on the desk: the smallest of all {PAPERS.length} has to be one of these three.</>,
          <>
            Move the smallest through the free spot to the finished pile, slide the next paper of its stack into its place,
            and repeat.
          </>,
          <>
            Done: each paper was picked up {DONE.reads / PAPERS.length} times and put down {DONE.writes / PAPERS.length}{' '}
            times, and the desk never held more than {DESK}.
          </>,
          <>A 13th paper would start a fourth stack, and four tops plus the free spot don’t fit on a desk of {DESK}.</>,
          <>
            The desk is the database’s memory, M = {DESK} pages: each paper is a page on disk, each stack a sorted run, and
            the free spot the page that output goes through.
          </>,
        ]}
      >
        {(step) =>
          step === 0 ? (
            <Desk key="start" scene="start" />
          ) : step === 1 ? (
            <Desk key="sort" scene="sort" />
          ) : step === 2 ? (
            <Desk key="tops" scene="tops" />
          ) : step === 3 ? (
            <Desk key="merge" scene="merge" />
          ) : step === 4 ? (
            <Desk key="done" scene="done" />
          ) : step === 5 ? (
            <Desk key="overflow" scene="overflow" />
          ) : (
            <Desk key="system" scene="merge" system />
          )
        }
      </Steps>

      <h2>The one line of math</h2>
      <p>
        A pass reads every page once and writes it once, and those page trips are the cost that counts (see{' '}
        <Link to="/learnings/disk-access-cost">what a disk read costs</Link>). Say the data is B pages and the sort may
        use M pages of the <Link to="/learnings/buffer-replacement">buffer pool</Link>. The first pass makes runs of M
        pages, so there are B/M of them. The second pass needs a page of memory for every run plus one for output, so it
        works as long as B/M is at most M − 1. Multiply through by M: B ≤ M(M − 1), which is about M².
      </p>

      <Clip
        src="external-merge-sort/merge-limit"
        label="Runs equals data over memory, B over M. The merge needs one page per run plus one output page, so B over M plus 1 is at most M, which gives B at most M times M minus 1, about M squared. With M equal to 262,144 pages, one gigabyte, B can be up to about 256 terabytes."
        caption="The number of runs has to fit in memory, with a page to spare for output. That is the whole limit, and it grows with the square of memory."
      />

      <Numbers
        items={[
          { label: `${DESK} pages of memory`, value: `${twoPassLimit(DESK)} pages`, note: 'the desk' },
          { label: '4 MB of memory', value: twoPassBytes(4 * MB), note: 'in two passes' },
          { label: '1 GB of memory', value: twoPassBytes(GB), note: 'in two passes' },
        ]}
      />
      <p>
        Memory 256 times bigger sorts 65,536 times more data. Turned around, sorting B pages in two passes needs only about
        √B pages of memory. This is the <strong>two-phase multiway merge sort</strong> (TPMMS), the usual way a database
        sorts data that does not fit in memory, an <strong>external sort</strong>. Every page gets two reads and two writes,
        4B page I/Os in all, or 3B when the next step takes the records as they come out of the merge instead of having
        them written back.
      </p>

      <h2>Try real sizes</h2>
      <p>
        Pages are 4 KB here, and sizes count in powers of 2. Turn the memory down until the data needs a third pass: the
        merge then goes in rounds of M − 1 runs, and every round reads and writes everything once more.
      </p>
      <Figure caption="Each band is the sizes one number of passes can sort. With 1 GB of memory, the two-pass band runs from 1 GB to about 256 TB.">
        <Passes data={DATA_SIZES[data]} memory={MEMORY_SIZES[memory]} written={result === 'written'} />
        <Controls>
          <Slider
            label="Data"
            value={data}
            min={0}
            max={DATA_SIZES.length - 1}
            onChange={setData}
            format={(i) => formatBytes(DATA_SIZES[i])}
          />
          <Slider
            label="Memory"
            value={memory}
            min={0}
            max={MEMORY_SIZES.length - 1}
            onChange={setMemory}
            format={(i) => formatBytes(MEMORY_SIZES[i])}
          />
          <Choice label="Sorted result" options={RESULT} value={result} onChange={setResult} />
        </Controls>
      </Figure>

      <Predict
        kicker="Quick check"
        question="A nightly sort just fits in two passes. Next year the table is 4 times bigger. To keep two passes, its memory has to grow about…"
        options={[{ label: 'Not at all' }, { label: '2 times', right: true }, { label: '4 times' }, { label: '16 times' }]}
        reveal={
          <>
            Two passes reach about M² pages, so 4 times the data needs √4 = 2 times the memory. Growing memory 4 times
            would cover 16 times the data. Not growing it at all adds a third pass, another full read and write.
          </>
        }
      />

      <h2>What databases do with it</h2>
      <ul>
        <li>
          <strong>Give a sort room for one merge.</strong> About √B pages is enough for two passes, and less costs a whole
          extra pass. In PostgreSQL that memory is <code>work_mem</code>, and <code>EXPLAIN ANALYZE</code> reports{' '}
          <code>external merge</code> when a sort spilled to disk.
        </li>
        <li>
          <strong>Don’t write what the next step will read.</strong> When the records go straight into a join or a
          grouping that wants them in order, the last write disappears: 3B instead of 4B. Joins that sort reuse these same
          two passes.
        </li>
        <li>
          <strong>Read each run in bigger bites.</strong> The merge hops from run to run, a page at a time; on a spinning
          disk each hop is a seek. Giving each run a few pages per read trades a little fan-in for longer reads.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="You have only 1 MB of memory (256 pages of 4 KB) to sort 1 GB. How many passes over the data?"
        options={[{ label: '2' }, { label: String(SMALL_PASSES), right: true }, { label: '4' }, { label: '1,024' }]}
        reveal={
          <>
            {SMALL_PASSES}. The first pass makes {SMALL[0].toLocaleString('en-US')} runs, but memory has room for only
            255 of them plus an output page. One merge pass brings them down to {SMALL[1]} runs, and a second to one, so
            three passes in all, 6B page I/Os with the result written.
          </>
        }
      />
    </Article>
  )
}
