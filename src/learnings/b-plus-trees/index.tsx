import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Catalogue from './Catalogue'
import {
  BILLION,
  CATALOGUE,
  FANOUT,
  formatCount,
  formatMB,
  GUESS,
  halvings,
  LAB_N,
  levels,
  levelSizes,
  MAX_KEYS,
  pagedBinarySearch,
  PAGE_BYTES,
  RANDOM_READ_MS,
  RANGE_CHECK,
  rangePages,
  SIZES,
  STRING_FANOUT,
  STRING_KEY_BYTES,
  TYPICAL_FANOUT,
  upperPages,
} from './model'
import TreeLab from './TreeLab'

const GUESS_LEVELS = levels(GUESS.rows, GUESS.perPage)
const SIZE_NAMES = ['A million rows', 'A billion rows', 'A trillion rows']

// A billion rows at the fill random inserts leave
const BILLION_SIZES = levelSizes(BILLION, TYPICAL_FANOUT)
const BILLION_LEVELS = BILLION_SIZES.length
const UPPER = upperPages(BILLION, TYPICAL_FANOUT)

// Check yourself: 10,000 keys in a row
const RANGE_LEAVES = Math.ceil(RANGE_CHECK.matches / TYPICAL_FANOUT)
const RANGE_PAGES = rangePages(RANGE_CHECK.matches, BILLION_LEVELS, TYPICAL_FANOUT)

export default function BPlusTrees() {
  return (
    <Article
      kicker="Inside a database · Indexes"
      title="B+-trees"
      promise="A table holds a billion rows on disk. How does its index find any one of them in a handful of reads, and keep doing so while rows pour in?"
      takeaway={
        <>
          A B+-tree is a sorted tree whose nodes are whole disk pages, so every step picks one of hundreds of children:
          its height is the logarithm of the rows in base <em>fanout</em>, four levels for a billion, and because it only
          grows at the root, every row stays exactly that deep.
        </>
      }
      sources={[
        {
          title: 'COMP 530: Database System Implementation',
          by: 'Chris Jermaine, Rice University, Fall 2025',
          part: 'Lecture on indexing: indexes as tables of (key, block) pairs, and the B+-tree',
        },
        {
          title: 'Database System Implementation',
          by: 'Hector Garcia-Molina, Jeffrey D. Ullman and Jennifer Widom, 2000',
          part: 'Chapter 4, “Index Structures”, section 4.3, “B-Trees”',
        },
        {
          title: 'On random 2–3 trees',
          by: 'Andrew Chi-Chih Yao, Acta Informatica 9, 1978',
          part: 'Nodes about ln 2 ≈ 69% full under random inserts',
          url: 'https://doi.org/10.1007/BF00289075',
        },
        {
          title: 'PostgreSQL documentation',
          by: 'The PostgreSQL Global Development Group',
          part: 'CREATE INDEX, “fillfactor”',
          url: 'https://www.postgresql.org/docs/current/sql-createindex.html',
        },
      ]}
    >
      <Predict
        question="A table has a billion rows. Its index lives on disk in pages that each hold about 500 keys. To find one row, how many index pages does the database read?"
        options={[{ label: '1' }, { label: String(GUESS_LEVELS), right: true }, { label: 'About 30' }, { label: 'About 500' }]}
        reveal={
          <>
            {GUESS_LEVELS}. Halving a billion down to one takes {halvings(BILLION)} steps, but a page here picks one of
            about 500 ways on, not one of two. Three such picks reach 125 million rows, too few; four reach 62.5 billion. A
            library shows how.
          </>
        }
      />

      <h2>The card catalogue</h2>

      <Steps
        readable
        say={[
          <>You want one card, Moby-Dick, from a library catalogue of a billion cards filed by title.</>,
          <>
            Opening the pile in the middle and keeping the half that holds it, again and again, takes {halvings(BILLION)}{' '}
            looks.
          </>,
          <>
            Instead, a sign by the door names the first title in each of the {CATALOGUE[0]} cabinets, and one look sends you
            to cabinet M.
          </>,
          <>Cabinet M has {CATALOGUE[1]} drawers, each labelled with its first title, so a second look picks one.</>,
          <>Inside are {CATALOGUE[2]} dividers, and a third look picks the one your card sits behind.</>,
          <>
            Behind it stand {CATALOGUE[3]} cards, and the fourth look finds yours: each look chose among hundreds, not
            between two.
          </>,
          <>
            The catalogue is a B+-tree: each set of labels is one disk page of keys, the cards are its leaves, and the
            hundreds to choose from are its fanout.
          </>,
        ]}
      >
        {(step) =>
          step === 0 ? (
            <Catalogue key="start" scene="start" />
          ) : step === 1 ? (
            <Catalogue key="halve" scene="halve" />
          ) : step < 6 ? (
            <Catalogue key={`look-${step}`} scene="look" looks={step - 1} />
          ) : (
            <Catalogue key="system" scene="look" looks={CATALOGUE.length} system />
          )
        }
      </Steps>

      <h2>The one line of math</h2>
      <p>
        Every node of the tree is one page, and a page read is the cost that counts (see{' '}
        <Link to="/learnings/disk-access-cost">what a disk read costs</Link>). A {PAGE_BYTES / 1024} KB page of 4-byte keys
        and 4-byte page numbers has room for {MAX_KEYS} keys and {FANOUT} pointers to the pages below. That number of
        children is the <strong>fanout</strong>, F. One level reaches F pages, two reach F², and h levels reach Fʰ. So
        the height is the smallest h with Fʰ at least the number of rows N: <strong>h = ⌈log_F N⌉</strong>.
      </p>

      <Clip
        src="b-plus-trees/levels"
        label="Fanout is the page size over the size of a key and a pointer: F equals 4096 over 8, which is 512. Each level multiplies the rows reached by F, so F to the h must be at least N, which gives h equals the ceiling of log base F of N. For a billion rows, log base 512 of ten to the ninth is about 3.3, so 4 levels. Halving would take the ceiling of log base 2 of ten to the ninth, 30 steps."
        caption="Binary search and a B+-tree both take a logarithm. The tree’s base is 512 instead of 2, which cuts the number of steps by a factor of nine."
      />

      <Numbers
        items={SIZES.map((rows, i) => ({
          label: SIZE_NAMES[i],
          value: `${levels(rows, FANOUT)} pages`,
          note: `halving: ${halvings(rows)}`,
        }))}
      />
      <p>
        A thousand times more rows adds one level, where halving adds ten steps. Even binary search over a sorted list of
        the keys, reading a whole page of {MAX_KEYS} at each step, needs {pagedBinarySearch(BILLION)} reads for a billion.
        Pages are seldom full: random inserts leave them about 69% full, a fanout near {TYPICAL_FANOUT}, and even at half
        full the answers stay 3, 4 and 5.
      </p>
      <p>
        Better still, most of those reads never reach the disk. At that fill, a billion rows sit in{' '}
        {formatCount(BILLION_SIZES[0])} leaves, under {formatCount(BILLION_SIZES[1])} pages, then {BILLION_SIZES[2]}, then
        the root. The top three levels are {formatCount(UPPER)} pages, about {formatMB(UPPER * PAGE_BYTES)}, and every
        lookup passes through them, so the <Link to="/learnings/buffer-replacement">buffer pool</Link> keeps them. A
        lookup then costs one real read, the leaf: about {RANDOM_READ_MS} ms instead of{' '}
        {BILLION_LEVELS * RANDOM_READ_MS}.
      </p>

      <h2>Watch one grow</h2>
      <p>
        Here a page has room for only {LAB_N} keys, so you can watch what happens when one fills. A new key goes into the
        leaf where a search for it ends. A leaf with one key too many splits in two, and the first key of the right half
        is copied into the parent as a new signpost. If that overfills the parent, it splits too, around its middle key,
        which moves up. When the root splits, a new root goes on top, and that is the one way the tree ever gains height. Leaves are linked
        left to right, so a range search goes down once and then walks sideways.
      </p>
      <Figure
        readable
        caption="Each box is a page. Pages outlined in sage are the ones the search reads, and a tinted page was just made by a split. The arrows chain the leaves for range searches to walk."
      >
        <TreeLab />
      </Figure>
      <p>
        Deletes run the other way: a page that falls below half full borrows a key from a neighbour or merges with it,
        and a root down to a single child steps aside for it. Plenty of systems skip the merging and let pages run emptier, since a table
        that shrank will usually grow again.
      </p>

      <Predict
        kicker="Quick check"
        question="Order numbers only ever go up, so every new key lands in the rightmost leaf and every split happens on the right edge. After a year of orders, how deep is the leftmost leaf compared with the rightmost?"
        options={[
          { label: 'The same depth', right: true },
          { label: 'One level shallower' },
          { label: 'Many levels shallower' },
          { label: 'Deeper' },
        ]}
        reveal={
          <>
            The same. A split adds a page beside the full one, on the same level, and the only new level is a new root,
            which sits above every leaf at once. What sorted keys do cost is space: each split leaves a half-full page
            behind, which no later key will ever join.
          </>
        }
      />

      <h2>What databases do with it</h2>
      <ul>
        <li>
          <strong>Keep keys short.</strong> Fanout is the page size over the size of a key and a pointer: 4-byte keys give{' '}
          {FANOUT} children a page, {STRING_KEY_BYTES}-byte strings only {STRING_FANOUT}. Real systems trim the signposts
          in interior pages to just enough characters to tell the two sides apart.
        </li>
        <li>
          <strong>Build big indexes in bulk.</strong> Sort the keys first, with an{' '}
          <Link to="/learnings/external-merge-sort">external merge sort</Link>, then fill leaves left to right and build
          each level above out of the smallest key on each page beneath it. Every page is written once, full and in order.
        </li>
        <li>
          <strong>Leave some room.</strong> A page packed full splits at the next insert. PostgreSQL fills B-tree pages to
          90% by default when it builds an index (its <code>fillfactor</code>), so later inserts have space.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question={`A query wants ${formatCount(RANGE_CHECK.matches)} consecutive keys from a billion-row B+-tree, ${BILLION_LEVELS} levels tall, whose leaves hold about ${TYPICAL_FANOUT} keys each. About how many index pages does it read?`}
        options={[
          { label: String(BILLION_LEVELS) },
          { label: 'About 30', right: true },
          { label: `About ${formatCount(RANGE_CHECK.matches)}` },
          { label: `About ${formatCount(RANGE_CHECK.matches * BILLION_LEVELS)}` },
        ]}
        reveal={
          <>
            About {RANGE_PAGES}: {BILLION_LEVELS - 1} pages down to the leaf holding the first key, then {RANGE_LEAVES}{' '}
            leaves side by side along the chain. Looking each key up on its own would read{' '}
            {formatCount(RANGE_CHECK.matches * BILLION_LEVELS)} pages; {BILLION_LEVELS} is only the way to the first one.
          </>
        }
      />
    </Article>
  )
}
