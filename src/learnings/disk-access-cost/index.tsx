import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Choice, Controls, Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import DiskTime from './DiskTime'
import { Race, Stacks } from './Library'
import {
  appendMs,
  BOOK_MINUTES,
  DISK,
  fetchBooks,
  formatBytes,
  formatMinutes,
  formatMs,
  GB,
  GUESS,
  inOneRunMs,
  inPlaceMs,
  KB,
  MB,
  pageSizeSpeedup,
  positionMs,
  rotationMs,
  scatteredMs,
  times,
  transferMs,
  TRIP_MINUTES,
  type Slot,
} from './model'

// The story's three errands: one book; ten books on ten different shelves;
// ten books side by side on one shelf
const ONE: Slot[] = [{ shelf: 1, at: 12 }]
const SCATTERED: Slot[] = [
  { shelf: 0, at: 3 },
  { shelf: 2, at: 15 },
  { shelf: 1, at: 7 },
  { shelf: 0, at: 18 },
  { shelf: 2, at: 2 },
  { shelf: 1, at: 13 },
  { shelf: 0, at: 9 },
  { shelf: 2, at: 10 },
  { shelf: 1, at: 1 },
  { shelf: 0, at: 14 },
]
const RUN: Slot[] = Array.from({ length: 10 }, (_, i) => ({ shelf: 0, at: 5 + i }))

const PAGE_SIZES = [4 * KB, 16 * KB, 64 * KB, 256 * KB, MB] as const
const AMOUNTS = [4 * MB, 100 * MB, GB] as const

// The story's numbers, from the model: the library's minutes are the
// disk's milliseconds
const scatteredTen = fetchBooks(SCATTERED).at(-1)!.done
const runTen = fetchBooks(RUN).at(-1)!.done
const guessScattered = scatteredMs(GUESS.pages, GUESS.pageBytes)
const guessRun = inOneRunMs(GUESS.pages, GUESS.pageBytes)
const guessRatio = times(guessScattered / guessRun)
const guessDays = Math.round(guessScattered / 60 / 24)

export default function DiskAccessCost() {
  const [pageBytes, setPageBytes] = useState<(typeof PAGE_SIZES)[number]>(4 * KB)
  const [bytes, setBytes] = useState<(typeof AMOUNTS)[number]>(100 * MB)

  return (
    <Article
      kicker="Inside a database · Storage"
      title="Getting there costs more than reading"
      promise="Why does a database move data in big pages, and care so much about where each row sits on the disk?"
      takeaway={
        <>
          On a disk, every read pays a fixed toll to get the head to the data and almost nothing for the bytes
          themselves. So a database reads in big pages and keeps what is read together <em>side by side</em>, turning
          many trips into one.
        </>
      }
      sources={[
        {
          title: 'COMP 530: Database System Implementation',
          by: 'Chris Jermaine, Rice University, Fall 2025',
          part: 'Lecture 1, “Intro to DB systems and persistent storage”, and lecture 2 on large pages and locality',
        },
        {
          title: 'Database System Implementation',
          by: 'Hector Garcia-Molina, Jeffrey D. Ullman and Jennifer Widom, 2000',
          part: 'Chapter 2, “Data Storage”',
        },
      ]}
    >
      <Predict
        question="A disk reads 1,000 pages of 4 KB scattered all over it. Then it reads the same 4 MB stored in one unbroken run. How much slower is the scattered read?"
        options={[{ label: 'About the same' }, { label: 'About 2×' }, { label: 'About 10×' }, { label: 'Over 100×', right: true }]}
        reveal={
          <>
            About {guessRatio} slower: {formatMs(guessScattered)} against {formatMs(guessRun)}, for exactly the same
            bytes. Nearly all of the difference is in getting to the data, not in reading it. A library shows why.
          </>
        }
      />

      <h2>The clerk in the stacks</h2>

      <Steps
        readable
        say={[
          <>
            You’re in a library where only the clerk may go into the stacks. A trip to the right shelf takes about{' '}
            {formatMinutes(TRIP_MINUTES)}; lifting a book off it takes {formatMinutes(BOOK_MINUTES)}.
          </>,
          <>You ask for 10 books that sit on 10 different shelves. That’s 10 trips: {formatMinutes(scatteredTen)}.</>,
          <>Now ask for 10 books that sit side by side. One trip, then a few seconds a book: {formatMinutes(runTen)}.</>,
          <>
            Make it 1,000 books. Scattered, that’s 1,000 trips, about {guessDays} days. Side by side, it’s{' '}
            {formatMinutes(guessRun)}.
          </>,
          <>
            That library is a hard disk. The clerk is its read head, a trip is {formatMs(positionMs())}, and a book is a
            4 KB page: the very numbers you guessed.
          </>,
        ]}
      >
        {(step) =>
          step === 0 ? (
            <Stacks key="one" books={ONE} />
          ) : step === 1 ? (
            <Stacks key="scattered" books={SCATTERED} />
          ) : step === 2 ? (
            <Stacks key="run" books={RUN} />
          ) : (
            <Race key={step === 3 ? 'library' : 'disk'} disk={step === 4} />
          )
        }
      </Steps>

      <h2>The one line of math</h2>
      <p>
        A disk is a stack of platters spinning under an arm that carries the read head. To read a page, the arm swings
        to the right ring of the platter, the head waits for the page to spin round to it, and only then do the bytes
        flow. In words: <strong>time = move the arm + wait for the spin + read</strong>. On the disk used in Rice’s
        COMP 530, for a 4 KB page:
      </p>
      <Numbers
        items={[
          { label: 'Move the arm', value: `${DISK.seekMs} ms`, note: 'seek' },
          { label: 'Wait for the spin', value: `${rotationMs(DISK.rpm)} ms`, note: 'half a turn at 10,000 RPM' },
          { label: 'Read 4 KB', value: formatMs(transferMs(4 * KB)), note: 'transfer at 100 MB/s' },
        ]}
      />
      <p>
        The first two are the trip, about 6 ms; the third is the book. Scattered pages pay the trip every time, so
        1,000 of them cost 1,000 × 6.04 ms. Pages in one run pay it once and then stream: 6 ms + 1,000 × 0.04 ms. The
        first pattern is called <strong>random I/O</strong> and the second <strong>sequential I/O</strong>, and the gap
        between them is the reason database storage looks the way it does.
      </p>

      <Clip
        src="disk-access-cost/access-time"
        label="Time equals seek plus rotation plus transfer. For one 4 KB page that is 3 ms plus 3 ms plus 0.04 ms, 6.04 ms, of which 6 ms is getting there. For 1,000 scattered pages, 1,000 times 6.04 ms is 6,040 ms. For 1,000 pages in one run, 6 ms plus 1,000 times 0.04 ms is 46 ms."
        caption="Where the 1,000 lands is the whole story: scattered, it multiplies the trip; in one run, only the reading."
      />

      <p>
        A solid-state drive (SSD) has no arm and nothing spinning: it reaches any page in about a tenth of a
        millisecond and can work on many requests at once, so scattered reads hurt far less there. But it still reads
        and writes whole pages, and every request still makes a round trip that is slow next to memory, so big pages
        and keeping related data together still pay off, by less.
      </p>

      <h2>Try it with real sizes</h2>
      <p>Pick how much data to read and how big each page is.</p>
      <Figure
        readable
        caption="With small pages, the scattered bar is almost all trip. Bigger pages mean fewer trips for the same data, so scattered reads catch up with one run."
      >
        <DiskTime bytes={bytes} pageBytes={pageBytes} />
        <Controls>
          <Choice label="Data to read" options={AMOUNTS} value={bytes} onChange={setBytes} format={formatBytes} />
          <Choice label="Page size" options={PAGE_SIZES} value={pageBytes} onChange={setPageBytes} format={formatBytes} />
        </Controls>
      </Figure>

      <Predict
        kicker="Quick check"
        question="A database reads 80 MB as 8 KB pages scattered over the disk. It switches to 64 KB pages, still scattered. About how much faster is the read?"
        options={[
          { label: 'No faster' },
          { label: `About ${times(pageSizeSpeedup(80 * MB, 8 * KB, 64 * KB))}`, right: true },
          { label: 'About 64×' },
          { label: 'Slower' },
        ]}
        reveal={
          <>
            About 7 times. The same data now fits in 8 times fewer pages, so 8 times fewer trips; each read carries more
            bytes, but that costs 0.64 ms instead of 0.08 ms, small next to the 6 ms trip. It isn’t 64× because the page
            only grew 8 times, and it isn’t slower because the trip, not the reading, was the cost.
          </>
        }
      />

      <h2>What databases do about it</h2>
      <ul>
        <li>
          <strong>Read and write in big pages.</strong> A trip costs the same whatever you carry back, so carry a lot: a
          database moves whole pages (8 KB in PostgreSQL, 16 KB in MySQL), never a single row.
        </li>
        <li>
          <strong>Keep together what is used together.</strong> Rows that a query reads together go on the same page or
          on neighbouring pages. This is called <strong>locality</strong>.
        </li>
        <li>
          <strong>Read in the order things sit.</strong> When a job will touch many pages, visit them front to back, so
          the head streams instead of jumping.
        </li>
        <li>
          <strong>Batch the trips you can’t avoid.</strong> Gather writes in memory and send them out together, and keep
          pages you will need again in memory (that is a <Link to="/learnings/buffer-replacement">buffer pool’s</Link>{' '}
          job), since the cheapest trip is the one you skip.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="A program saves 10,000 small changes of 100 bytes each. One way rewrites each change into the 4 KB page its record lives on, scattered over the disk. The other adds every change to the end of one log file. About how long does each way take?"
        options={[
          { label: '0.4 s and 0.1 s' },
          { label: `${formatMs(inPlaceMs())} and ${formatMs(appendMs())}`, right: true },
          { label: '1 min and 1 min' },
          { label: '6 s and 6 s' },
        ]}
        reveal={
          <>
            About {formatMs(inPlaceMs())} in place and {formatMs(appendMs())} appended. In place, every change is a
            trip: 10,000 × 6.04 ms. Appended, the changes sit one after another, so it is one trip and then 1 MB of
            writing at 100 MB/s, 6 + 10 ms. The same 10,000 changes, a few thousand times apart, which is why databases
            write changes to a log first.
          </>
        }
      />
    </Article>
  )
}
