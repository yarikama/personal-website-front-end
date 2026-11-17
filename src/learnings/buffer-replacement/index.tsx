import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Button, Choice, Controls, Figure, Numbers, Readout, Slider } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import ClockFace from './ClockFace'
import Desk from './Desk'
import {
  CLOCK_FRAMES,
  CLOCK_RUN,
  GUESS,
  HOT_PAGES,
  hits,
  labRun,
  LAB_SHOWN,
  PATTERNS,
  percent,
  POLICIES,
  SCAN_PAGES,
  STORY,
  STORY_LRU,
  STORY_MRU,
  WORKED,
  type Pattern,
} from './model'
import PoolLab from './PoolLab'

type Policy = (typeof POLICIES)[number]

const READS = STORY.pages * STORY.passes

export default function BufferReplacement() {
  const lruHits = hits(STORY_LRU)
  const mruHits = hits(STORY_MRU)

  const [pattern, setPattern] = useState<Pattern>('Repeated scan')
  const [policy, setPolicy] = useState<Policy>('LRU')
  const [frames, setFrames] = useState(40)
  const [clockRuns, setClockRuns] = useState(0)
  const run = labRun(pattern, frames, policy)

  return (
    <Article
      kicker="Inside a database · Storage"
      title="Making room in memory"
      promise="A database can keep only so many pages of its tables in memory. When it needs room for one more, which page should it give up?"
      takeaway={
        <>
          A full buffer pool has to bet on which page will be needed last. LRU’s bet pays off when work comes back to
          recent pages, but a scan looping over a file just bigger than the pool makes it miss on <em>every</em> read.
        </>
      }
      sources={[
        {
          title: 'COMP 530: Database System Implementation',
          by: 'Chris Jermaine, Rice University, Fall 2025',
          part: 'Lecture notes on buffering (“Memory Management in DBs”): the buffer pool, eviction policies, Clock and pinning',
        },
        {
          title: 'Database System Implementation',
          by: 'Hector Garcia-Molina, Jeffrey D. Ullman and Jennifer Widom, 2000',
          part: 'The query-execution chapter, “Buffer Management”: replacement strategies and pinned blocks',
        },
      ]}
    >
      <Predict
        question={`A database has room in memory for ${GUESS.frames} pages. A query reads an ${GUESS.pages}-page file from start to end, over and over. Whenever memory is full, it throws out the page it used longest ago. What share of the reads find their page already in memory?`}
        options={[{ label: 'About 90%' }, { label: 'About 50%' }, { label: 'About 10%' }, { label: 'None', right: true }]}
        reveal={
          <>
            None, on every pass. Memory holds all but one page of the file, yet it never helps. One page too many is
            enough, and a desk shows why.
          </>
        }
      />

      <h2>The book you just put back</h2>

      <Steps
        readable
        say={[
          <>
            You’re reading a {STORY.pages}-volume series in order. Your desk has room for {STORY.frames} books; the rest
            wait on a shelf across the room.
          </>,
          <>Volume {STORY.pages} needs a place, so you return the book you touched longest ago: volume 1.</>,
          <>Then you start the series again, at volume 1, the book you just returned. Fetching it sends volume 2 back.</>,
          <>
            And so on: every book you return is the next one you need. Three times through, that’s {READS - lruHits} trips
            to the shelf and {lruHits === 0 ? 'not one book' : `${lruHits} books`} found on the desk.
          </>,
          <>
            Flip the rule: return the book you touched most recently. Most of the desk stays put while one place keeps
            changing, so {mruHits} of the {READS} reads find their book waiting.
          </>,
          <>
            The desk is memory, the shelf is the disk, each volume is a page. Returning the oldest book is the rule
            called LRU; returning the newest is MRU.
          </>,
        ]}
      >
        {(step) =>
          step === 0 ? (
            <Desk key="fill" run={STORY_LRU} pages={STORY.pages} frames={STORY.frames} from={0} to={4} words="desk" />
          ) : step === 1 ? (
            <Desk key="first" run={STORY_LRU} pages={STORY.pages} frames={STORY.frames} from={4} to={5} words="desk" pace={1100} />
          ) : step === 2 ? (
            <Desk key="again" run={STORY_LRU} pages={STORY.pages} frames={STORY.frames} from={5} to={6} words="desk" pace={1100} />
          ) : step === 3 ? (
            <Desk key="rest" run={STORY_LRU} pages={STORY.pages} frames={STORY.frames} from={6} to={READS} words="desk" />
          ) : step === 4 ? (
            <Desk key="mru" run={STORY_MRU} pages={STORY.pages} frames={STORY.frames} from={0} to={READS} words="desk" pace={480} />
          ) : (
            <Desk key="reveal" run={STORY_MRU} pages={STORY.pages} frames={STORY.frames} from={READS} to={READS} words="pool" />
          )
        }
      </Steps>

      <h2>The one line of math</h2>
      <p>
        Under LRU, the page a scan needs next is always the one it used longest ago, which is exactly the page that
        just left. So with M frames and a file of N pages, if N is bigger than M, no read ever hits. Under MRU, the page
        thrown out is the one the scan has just finished with, so most of the file stays put and each miss swaps out a single page. After
        the first pass, the share of reads that hit is (M − 1) / (N − 1), a little under M / N. With 10 frames:
      </p>
      <Numbers
        items={WORKED.map((w) => ({
          label: `${w.pages}-page file`,
          value: percent(w.mru),
          note: `hit under MRU, ${percent(w.lru)} under LRU`,
        }))}
      />
      <p>
        A miss is a read from disk, tens of thousands of times slower than memory (see{' '}
        <Link to="/learnings/disk-access-cost">why a disk read costs so much</Link>), so 0% against 90% is the gap
        between a query that runs from memory and one that waits on the disk for every page. The pages in memory are
        the <strong>buffer pool</strong>, the rule for what to throw out is its <strong>replacement policy</strong>,
        and a loop that defeats LRU this way is called <strong>sequential flooding</strong>.
      </p>

      <h2>Why LRU is still the default</h2>
      <p>
        Most work is not one big loop. It comes back to a few pages again and again: the top of an index, a small
        table joined on every query, the rows people are looking at right now. What was touched a moment ago tends to be
        wanted again shortly, and LRU keeps exactly those, while MRU throws them out first.
      </p>
      <p>
        Exact LRU has a running cost, though. It keeps the pages in order of last use, so every hit, the commonest
        thing a pool does, has to move a page to the front of a shared list. <strong>Clock</strong> keeps one bit per
        frame instead, and a hand that only moves on a miss:
      </p>

      <Figure caption="A hit only sets its frame’s bit. On a miss the hand goes round: a page whose bit is set loses the bit and is passed over once, its second chance; the first page with a clear bit is replaced. Page 2 is hit, so the next sweep spares it and evicts page 3.">
        <ClockFace key={clockRuns} run={CLOCK_RUN} frames={CLOCK_FRAMES} />
        <Controls>
          <Button onClick={() => setClockRuns((n) => n + 1)}>Play again</Button>
        </Controls>
      </Figure>

      <p>
        A page used between two visits of the hand gets its bit back and survives, so Clock keeps roughly what LRU
        keeps for the price of writing one bit per hit. Other policies tweak the same bet: FIFO evicts the page loaded
        earliest however busy it is, and LRU-2 ranks pages by their second-to-last use, so a page a scan touched once
        leaves first. And one rule beats every policy: a page someone is reading or changing right now is{' '}
        <strong>pinned</strong>, its pin count says how many users hold it, and nothing evicts it until that count is
        back to zero.
      </p>

      <h2>See it in a real pool</h2>
      <p>
        Three patterns over a few thousand reads: a {SCAN_PAGES}-page file scanned over and over, random reads where
        four in five go to {HOT_PAGES} hot pages, and the scan and the hot reads taking turns.
      </p>
      <Figure
        caption={`Each cell is one read once the pool has filled, the first ${LAB_SHOWN} of them: sage found its page in the pool, ink went to disk. The scan floods LRU and Clock until the whole file fits; on the hot set MRU throws out the best pages; mixed, the scan keeps pushing hot pages out of an LRU pool.`}
      >
        <PoolLab run={run} label={`${pattern}, ${frames} frames, ${policy}: ${percent(run.rate)} of reads hit`} />
        <div className="mt-5 flex flex-wrap gap-x-10 gap-y-4">
          <Readout label={`${policy} hit rate`} value={percent(run.rate)} accent />
          {POLICIES.filter((other) => other !== policy).map((other) => (
            <Readout key={other} label={other} value={percent(labRun(pattern, frames, other).rate)} />
          ))}
        </div>
        <Controls>
          <Choice label="Pattern" options={PATTERNS} value={pattern} onChange={setPattern} />
          <Choice label="Policy" options={POLICIES} value={policy} onChange={setPolicy} />
          <Slider label="Pool size" value={frames} min={5} max={70} step={5} onChange={setFrames} format={(n) => `${n} frames`} />
        </Controls>
      </Figure>

      <Predict
        kicker="Quick check"
        question="For which of these is LRU the wrong choice?"
        options={[
          { label: 'An index’s top pages, read on every lookup' },
          { label: 'A small table joined on every query' },
          { label: 'A 600-page file scanned over and over through 500 frames', right: true },
          { label: 'Shopping carts re-read within seconds' },
        ]}
        reveal={
          <>
            The loop. It is just bigger than the pool, so LRU evicts each page shortly before the scan comes back to it,
            and every read misses. The others reuse a page soon after using it, which is exactly the bet LRU makes.
          </>
        }
      />

      <h2>What engineers do about it</h2>
      <ul>
        <li>
          <strong>Match the policy to the pattern.</strong> LRU or Clock for everyday reuse. When the query engine knows
          it will loop over a file bigger than the pool, as a nested-loop join does with its inner table, it can tell
          the pool to evict that file’s pages newest first.
        </li>
        <li>
          <strong>Keep big scans out of everyone’s way.</strong> Give a large scan a small ring of frames of its own, or
          let its pages go first, so one report can’t flush the pages every other query relies on.
        </li>
        <li>
          <strong>Pin a page only while you use it.</strong> Each pinned page is a frame the policy can’t reclaim; leak
          pins and the pool shrinks until a miss finds nothing it is allowed to evict.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question={`Back to ${GUESS.frames} frames, an ${GUESS.pages}-page file and LRU. Now the scan turns round at each end: start to end, then end to start, and so on. About what share of reads hit after the first pass?`}
        options={[{ label: 'None, still' }, { label: 'About 50%' }, { label: 'About 90%', right: true }, { label: 'All of them' }]}
        reveal={
          <>
            About 90%: 10 of 11 reads a pass. Turning round, the next page is the one just read, which LRU keeps. The
            only page gone is the one at the far end, touched longest ago, so each pass misses once.
          </>
        }
      />
    </Article>
  )
}
