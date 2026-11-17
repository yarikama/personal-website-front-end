import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Choice, Controls, Figure, Numbers, Slider } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Cookbook, { type Scene } from './Cookbook'
import CostCurves from './CostCurves'
import {
  arranged,
  BOOK,
  bookCrossover,
  byIndex,
  count,
  crossover,
  crossoverRows,
  formatMs,
  formatPercent,
  formatSeconds,
  GUESS_S,
  HEIGHT,
  lastEnd,
  leafing,
  matching,
  MONTH_S,
  pagesOf,
  randomReadMs,
  rowsPerPage,
  SELECTIVITIES,
  TABLE,
  timeMs,
  times,
  WIDE,
  WIDE_S,
  WORKED,
  type Measure,
} from './model'

const SCENES: Scene[] = ['pointers', 'two', 'all', 'leaf', 'arranged', 'table', 'indexes']
const MEASURES: readonly Measure[] = ['time', 'reads']

// The numbers the page tells, from the model
const scanMs = timeMs('scan', TABLE, GUESS_S)
const guessIndexMs = timeMs('unclustered', TABLE, GUESS_S)
const crossTime = crossover(TABLE, 'time')
const crossReads = crossover(TABLE, 'reads')
const monthUnclustered = timeMs('unclustered', TABLE, MONTH_S)
const monthClustered = timeMs('clustered', TABLE, MONTH_S)
const monthPages = Math.ceil(matching(TABLE, MONTH_S) / rowsPerPage(TABLE))
const oneRowMs = (HEIGHT + 1) * randomReadMs()
const wideScan = timeMs('scan', WIDE, WIDE_S)
const wideIndex = timeMs('unclustered', WIDE, WIDE_S)
const narrowLoss = timeMs('unclustered', TABLE, WIDE_S) / timeMs('scan', TABLE, WIDE_S)

export default function IndexOrScan() {
  const [at, setAt] = useState(SELECTIVITIES.indexOf(GUESS_S))
  const [measure, setMeasure] = useState<Measure>('time')
  const s = SELECTIVITIES[at]

  return (
    <Article
      kicker="Inside a database · Indexes"
      title="The index that points everywhere"
      promise="To find some rows, should a database follow an index or read the whole table?"
      takeaway={
        <>
          An index that points to rows scattered over the table pays a random read for every row it finds, so past a
          tiny share of the table a plain scan wins. Only a <em>clustered</em> index, with its rows stored together,
          stays fast for big answers.
        </>
      }
      sources={[
        {
          title: 'COMP 530: Database System Implementation',
          by: 'Chris Jermaine, Rice University, Fall 2025',
          part: 'The lecture on indexing (primary, clustering and secondary indexes), and the optimization lecture’s table scan versus index lookup',
        },
        {
          title: 'Database System Implementation',
          by: 'Hector Garcia-Molina, Jeffrey D. Ullman and Jennifer Widom, 2000',
          part: 'Chapter 4, “Index Structures”, and section 6.7, “Index-Based Algorithms”',
        },
        {
          title: 'PostgreSQL Documentation',
          by: 'The PostgreSQL Global Development Group',
          part: '“Planner Cost Constants” (random_page_cost), and bitmap and index-only scans',
          url: 'https://www.postgresql.org/docs/current/runtime-config-query.html',
        },
      ]}
    >
      <Predict
        question="A table holds 10 million orders of 100 bytes, 1 GB on disk. A query wants the 5% with an amount between $20 and $25. There is an index on the amount, but the rows are stored in no particular order of it. Which is faster: the index, or reading the whole table?"
        options={[
          { label: 'The index, about 20× faster' },
          { label: 'About the same' },
          { label: 'The scan, about 3× faster' },
          { label: 'The scan, about 300× faster', right: true },
        ]}
        reveal={
          <>
            The scan, by about {times(guessIndexMs / scanMs)}. Reading the whole gigabyte front to back takes about{' '}
            {formatMs(scanMs)}. The index fetches {count(matching(TABLE, GUESS_S))} rows one at a time, each from
            somewhere else on the disk, for about {formatMs(guessIndexMs)}. A cookbook shows why.
          </>
        }
      />

      <h2>Chicken for a crowd</h2>

      <Steps
        readable
        say={[
          <>
            You want every chicken recipe in a {BOOK.pages}-page cookbook, and the index at the back lists all{' '}
            {BOOK.dishes} chicken dishes, A to Z, each with its page.
          </>,
          <>
            Fetch two of them: flip to the index, read a page number, find the page. That’s about {BOOK.huntS} s a
            dish, {formatSeconds(lastEnd(byIndex(2)))} for both.
          </>,
          <>
            Now all {BOOK.dishes}: each dish is another hunt from the index to a page somewhere else in the book, and
            the hunts add up to {formatSeconds(lastEnd(byIndex(BOOK.dishes)))}.
          </>,
          <>
            Or ignore the index and leaf through all {BOOK.pages} pages at {BOOK.glanceS} s a glance:{' '}
            {formatSeconds(lastEnd(leafing()))}, and past about {Math.round(bookCrossover())} dishes leafing wins.
          </>,
          <>
            A second cookbook is arranged by main ingredient, so its {BOOK.dishes} chicken recipes fill one chapter:
            one hunt, then {BOOK.dishes} glances, {formatSeconds(lastEnd(arranged()))}.
          </>,
          <>
            The cookbook is a table on disk: a recipe is a row, a page is a 4 KB page, a hunt is a 6 ms random read
            and a glance 0.04 ms, a gap of 150 times where the book’s was 15.
          </>,
          <>
            The list at the back is an index, a small table of (key, pointer) entries; its pointers scatter, so it is
            an unclustered index, the arranged book has a clustered one, and leafing is a full table scan.
          </>,
        ]}
      >
        {(step) => <Cookbook key={SCENES[step]} scene={SCENES[step]} />}
      </Steps>

      <h2>Three ways to pay</h2>
      <p>
        An <strong>index</strong> is just another table, kept small: each entry holds a value of the column it covers
        (the <em>key</em>) and a pointer to the page where that row lives. Finding a key in it takes a short walk down a
        few index pages (how few is the subject of <Link to="/learnings/b-plus-trees">B+-trees</Link>). What it costs
        after that depends on where the pointers go.
      </p>
      <p>
        If the table is stored in key order, the index is <strong>clustered</strong>: the matching rows sit side by
        side, so they come back in one run of pages. If the table is stored in some other order, the index is{' '}
        <strong>unclustered</strong> (the course calls it secondary): every match can sit on a different page, and each
        page costs its own trip. A table can be stored in only one order, so it has at most one clustered index, and
        as many unclustered ones as you like.
      </p>
      <p>
        In words: <strong>a scan reads every page in one run; a clustered index walks down, then reads only the
        matching pages in one run; an unclustered index walks down, then makes a trip for every matching row.</strong>{' '}
        With B(R) pages, T(R) rows, a share <em>s</em> of the rows matching (the query’s <em>selectivity</em>) and{' '}
        <em>h</em> index pages on the way down, the scan reads B(R) pages, the clustered index about h + s·B(R), and the
        unclustered one up to h + s·T(R), and only that last one pays a 6 ms trip for each (
        <Link to="/learnings/disk-access-cost">why a trip costs so much</Link>).
      </p>

      <Clip
        src="index-or-scan/three-costs"
        label="Three costs for 10 million rows on 250,000 pages, at 5% matching. Scan: B of R, 250,000 pages in one run, about 10 seconds. Unclustered index: h plus s times T of R, 3 plus 0.05 times 10 million, 500,003 random reads at 6.04 ms each, about 50 minutes. Clustered index: h plus s times B of R, 3 plus 0.05 times 250,000, 12,503 pages, about half a second."
        caption="The same 5% in each formula: only the unclustered index multiplies it by the rows instead of the pages, and pays a trip for each."
      />

      <p>
        On the 10-million-row table ({count(pagesOf(TABLE))} pages, h = {HEIGHT}), the scan always takes{' '}
        {formatMs(scanMs)}. The unclustered index, and under it the clustered one, as the share of rows grows:
      </p>
      <Numbers
        items={WORKED.map((share) => ({
          label: `${count(matching(TABLE, share))} rows`,
          value: formatMs(timeMs('unclustered', TABLE, share)),
          note: `clustered ${formatMs(timeMs('clustered', TABLE, share))}`,
        }))}
      />
      <p>
        The unclustered index pays off while its trips cost less than the scan: {formatMs(scanMs)} ÷{' '}
        {randomReadMs().toFixed(2)} ms is about {count(crossoverRows(TABLE, 'time') + HEIGHT)} reads, or{' '}
        {count(crossoverRows(TABLE, 'time'))} rows after the walk down, just {formatPercent(crossTime)} of the table.
        That point is the <strong>crossover</strong>; past it the scan wins, by more and more. The clustered index has
        no such point to speak of: it reads only pages that hold matches, so at worst it costs the scan plus its walk.
      </p>
      <p>
        Counting page reads alone, as the textbook formulas do, puts the crossover where the matches reach one row per
        page: 1 in {rowsPerPage(TABLE)}, or {formatPercent(crossReads)}. Timing them moves it about{' '}
        {times(crossReads / crossTime)} earlier, because the scan’s reads come in one run and the index’s don’t.
      </p>

      <h2>Slide the share of rows</h2>
      <Figure
        readable
        caption="Both axes grow tenfold a step. The ink line, the unclustered index, climbs with every matching row and crosses the flat sage line, the scan, at the marked crossover. The dashed clustered line stays under the scan almost all the way. Switch to page reads to see the textbook’s count."
      >
        <CostCurves s={s} measure={measure} />
        <Controls>
          <Slider
            label="Rows matched"
            value={at}
            min={0}
            max={SELECTIVITIES.length - 1}
            onChange={setAt}
            format={(i) => formatPercent(SELECTIVITIES[i])}
          />
          <Choice
            label="Measure"
            options={MEASURES}
            value={measure}
            onChange={setMeasure}
            format={(m) => (m === 'time' ? 'Time' : 'Page reads')}
          />
        </Controls>
      </Figure>

      <Predict
        kicker="Quick check"
        question="An orders table of 10 million rows gets two queries all day: one order by its id, and monthly reports that read every order in a date range, about 3% of the table each. Which column should the table be clustered on?"
        options={[
          { label: 'The id: it is asked for most often' },
          { label: 'The order date', right: true },
          { label: 'Either: an unclustered index does as well' },
          { label: 'Neither: scan for both' },
        ]}
        reveal={
          <>
            The date. An id lookup matches one row, so even an unclustered index finds it in about{' '}
            {formatMs(oneRowMs)}: the walk down and one page. A month’s report matches{' '}
            {count(matching(TABLE, MONTH_S))} rows. Unclustered, that is a trip each, about{' '}
            {formatMs(monthUnclustered)}; clustered on the date, those rows fill {count(monthPages)} pages side by side
            and come back in about {formatMs(monthClustered)}. The one clustered index belongs to the query that reads
            many rows.
          </>
        }
      />

      <h2>What databases do about it</h2>
      <ul>
        <li>
          <strong>Cluster on the column you read in ranges.</strong> Dates, prices, anything queries ask for a slice
          of. Keys looked up one at a time do fine with an unclustered index.
        </li>
        <li>
          <strong>Put the answer in the index.</strong> If the index’s entries carry every column a query needs, the
          database answers from the index and never follows a pointer. That is a <em>covering</em> index; PostgreSQL
          calls the plan an index-only scan.
        </li>
        <li>
          <strong>Sort the pointers before fetching.</strong> Collect the matching pointers, sort them by page, and read
          each page once, front to back. PostgreSQL does this in a bitmap heap scan, which never reads more pages than
          the scan would.
        </li>
        <li>
          <strong>Let the optimizer choose.</strong> It guesses how many rows will match from statistics it keeps on
          each column and prices both plans. PostgreSQL,
          expecting many random reads to hit its cache, prices a random page at 4 times a sequential one by default.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question={`The same 10 million rows, but each is 1 KB, so only ${rowsPerPage(WIDE)} fit on a page. A query matches 0.1% of them, ${count(matching(WIDE, WIDE_S))} rows, through an unclustered index. Index or scan?`}
        options={[
          { label: `The scan, about ${times(narrowLoss)} faster` },
          { label: `The index, about ${(wideScan / wideIndex).toFixed(1)}× faster`, right: true },
          { label: 'The scan, about 300× faster' },
          { label: 'A tie: row size changes both alike' },
        ]}
        reveal={
          <>
            The index, {formatMs(wideIndex)} against {formatMs(wideScan)}. The scan reads every page, and rows 10 times
            wider fill 10 times as many: {count(pagesOf(WIDE))} pages. The index still pays one trip per matching row,
            whatever the rows weigh. With 100-byte rows the same query lost {times(narrowLoss)} to 1; wide rows push the
            crossover 10 times later, to {formatPercent(crossover(WIDE, 'time'))}.
          </>
        }
      />
    </Article>
  )
}
