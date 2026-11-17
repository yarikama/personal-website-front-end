import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Button, Choice, Controls, Figure, Numbers, Readout } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Coats from './Coats'
import FileLab from './FileLab'
import {
  binary,
  CHECK,
  CHECK_BITS,
  CHECK_POINTER,
  FIRST,
  GUESS,
  GUESS_BITS,
  GUESS_POINTER,
  lab,
  LAB,
  LAB_LIMIT,
  LIMITS,
  LAST,
  lowBits,
  REBUILD,
  rebuildSeconds,
  recordCount,
  RETURNING,
  STORY,
  STORY_END,
  STORY_STEPS,
  STREAM,
  TRIP_MS,
  WORKED,
  type Insert,
} from './model'

type Limit = (typeof LIMITS)[number]

const START = 24
const code = (key: number) => binary(key, 4)

// The story's numbers, from the frames it plays
const SEVEN = recordCount(STORY_STEPS[1][1].file)
const ROOM = STORY_STEPS[1][1].file.buckets.length * STORY.capacity

// The lab's numbers with every key in, as the prose quotes them
const FULL = lab(STREAM, LAB_LIMIT)
const LOW = lab(STREAM, LIMITS[0])
const HIGH = lab(STREAM, LIMITS[LIMITS.length - 1])

const pages = (n: number) => `${n} page${n === 1 ? '' : 's'}`
const perLookup = (n: number) => n.toFixed(2)

// What the last insert did, in words
function said(last: Insert | null, limit: number): string {
  if (!last) return 'An empty file: one bucket'
  const { key, bits, pointer, bucket } = last
  const low = lowBits(key, bits)
  const where =
    bits === 0
      ? 'one bucket, so bucket 0'
      : low < pointer
        ? `last ${bits} bits ${binary(low, bits)} = ${low}, below p = ${pointer}, so ${bits + 1} bits: bucket ${bucket}`
        : `last ${bits} bits ${binary(low, bits)} = ${low}, not below p = ${pointer}: bucket ${bucket}`
  const spill = last.overflow ? ', on an overflow page' : ''
  const split = last.split
    ? `. Over ${limit}% full: bucket ${last.split.from} split into ${last.split.from} and ${last.split.to}`
    : ''
  return `Key ${key}: ${where}${spill}${split}`
}

export default function LinearHashing() {
  const [keys, setKeys] = useState<number[]>(() => STREAM.slice(0, START))
  const [limit, setLimit] = useState<Limit>(LAB_LIMIT)
  const [typed, setTyped] = useState('')
  const [refused, setRefused] = useState<string | null>(null)

  const run = lab(keys, limit)
  const full = keys.length >= LAB.most
  const next = STREAM.find((k) => !keys.includes(k))
  const add = (n: number) => {
    const fresh = STREAM.filter((k) => !keys.includes(k)).slice(0, Math.min(n, LAB.most - keys.length))
    setKeys([...keys, ...fresh])
    setRefused(null)
  }
  const addTyped = () => {
    const key = Number(typed)
    if (typed.trim() === '' || !Number.isInteger(key) || key < 0 || key >= 2 ** 16) {
      setRefused('A key here is a whole number from 0 to 65535')
    } else if (keys.includes(key)) {
      setRefused(`Key ${key} is in the file already`)
    } else if (!full) {
      setKeys([...keys, key])
      setRefused(null)
      setTyped('')
    }
  }

  return (
    <Article
      kicker="Inside a database · Indexes"
      title="Linear hashing"
      promise="A hash index on disk has to keep growing as rows pour in. How can it grow without ever stopping to rebuild, and without its lookups slowing down?"
      takeaway={
        <>
          Linear hashing adds buckets singly, in an order fixed in advance, so the bucket that splits is the one at the pointer,{' '}
          <em>not</em> the one that overflowed: overflow pages hold the extra until the pointer comes round, and two
          numbers do the work of a directory.
        </>
      }
      sources={[
        {
          title: 'COMP 530: Database System Implementation',
          by: 'Chris Jermaine, Rice University, Fall 2025',
          part: 'Lecture notes 5, “Dynamic (extendible) hashing”, and 6, “Linear Hashing”',
        },
        {
          title: 'Database System Implementation',
          by: 'Hector Garcia-Molina, Jeffrey D. Ullman and Jennifer Widom, 2000',
          part: 'Chapter 4, “Index Structures”: hash tables, extensible hash tables and linear hash tables',
        },
        {
          title: 'Linear Hashing: A New Tool for File and Table Addressing',
          by: 'Witold Litwin, VLDB 1980',
        },
      ]}
    >
      <Predict
        question={`A hash file on disk keeps its records in ${GUESS.buckets} buckets, numbered 0 to ${GUESS.buckets - 1}, and it grows by adding a single bucket whenever it needs room. The last bucket it split was bucket ${GUESS_POINTER - 1}. Now a record arrives for bucket ${GUESS.full}, which is full, and the file decides to grow. Which bucket does linear hashing split?`}
        options={[
          { label: `Bucket ${GUESS.full}, the full one` },
          { label: 'The fullest bucket' },
          { label: `Bucket ${GUESS_POINTER}`, right: true },
          { label: `All ${GUESS.buckets}, into ${2 * GUESS.buckets}` },
        ]}
        reveal={
          <>
            Bucket {GUESS_POINTER}, the next one in line. Linear hashing splits its buckets in a fixed order, 0, 1, 2 and
            on, whichever bucket overflowed. The record for bucket {GUESS.full} waits on an extra page chained to it
            until the line gets there. It sounds backwards; a coat check shows why it works.
          </>
        }
      />

      <h2>One new pigeonhole at a time</h2>

      <Steps
        readable
        say={[
          <>
            You run a coat check with four pigeonholes that hold two coats each, and a coat goes in the hole whose label
            matches the last two digits of its ticket.
          </>,
          <>Coat {code(FIRST)} belongs in hole 10, but hole 10 is full, so the coat goes in a basket hung under it.</>,
          <>
            {SEVEN} coats in room for {ROOM} is over three quarters, so you add a hole, and split the first in line, 00,
            not 10: the coat ending in 100 moves over.
          </>,
          <>
            A guest hands you ticket {code(RETURNING)}: hole 00 is behind the marker, so it has split, and you read one
            more digit to find hole 100.
          </>,
          <>
            Each time the room gets too full, the hole at the marker splits: 01, then 10, whose basket finally empties,
            while 11 fills up and gets a basket of its own.
          </>,
          <>
            Coat {code(LAST)} brings hole 11’s turn, its basket empties too, and with {STORY_END.buckets.length} holes
            all read by three digits, the marker starts again at the front.
          </>,
          <>
            The holes are buckets, one disk page each; a ticket is a key’s hash value in binary; a basket is an overflow
            page; and the marker is the split pointer.
          </>,
        ]}
      >
        {(step) => (
          <Coats key={step} frames={STORY_STEPS[step]} words={step === STORY_STEPS.length - 1 ? 'file' : 'story'} />
        )}
      </Steps>

      <h2>The one line of math</h2>
      <p>
        Two numbers say where every key lives: i, how many of a hash’s last bits every bucket reads, and p, the split
        pointer. A round starts with 2<sup>i</sup> buckets and p at 0, and each split adds one bucket and moves p on one,
        so p is just the number of buckets past 2<sup>i</sup>. To find a key, take the last i bits of its hash. If that
        number is below p, its bucket has split this round, so take i + 1 bits instead:
      </p>
      <p className="text-center">
        bucket = h mod 2<sup>i</sup>, or h mod 2<sup>i+1</sup> if the first is below p
      </p>
      <p>
        The guess’s file has {GUESS.buckets} buckets, so i = {GUESS_BITS} and p = {GUESS_POINTER}:
      </p>
      <Numbers
        items={WORKED.map((w) => ({
          label: `hash ${w.hash} = ${w.hash.toString(2)}`,
          value: `bucket ${w.bucket}`,
          note: w.more
            ? `${binary(w.low, GUESS_BITS)} is below ${GUESS_POINTER}: read ${binary(w.bucket, GUESS_BITS + 1)}`
            : `${binary(w.low, GUESS_BITS)} = ${w.low}, not below ${GUESS_POINTER}`,
        }))}
      />
      <p>
        The file grows when it gets too full: when its records over the room its buckets’ own pages have, n / (N·B),
        pass a limit, often {LAB_LIMIT}%. Then it splits bucket p, whichever bucket overflowed, by moving the keys whose
        next bit is 1 into a new bucket 2<sup>i</sup> higher. When p reaches 2<sup>i</sup>, i goes up by one and p goes
        back to 0. This is <strong>linear hashing</strong>, from Witold Litwin in 1980. The file grows by one page at a
        time, and it needs no table of where the buckets are, because i and p say it all.
      </p>

      <h2>Why not split the full bucket?</h2>
      <p>
        A <strong>static</strong> hash file picks its number of buckets once. Plan small and chains of overflow pages
        grow, each one another trip of about {TRIP_MS} ms (see{' '}
        <Link to="/learnings/disk-access-cost">what a disk read costs</Link>); plan big and most pages sit empty. Growing
        it means rehashing everything at once: reading and writing a {REBUILD.bytes / 1e9} GB file takes{' '}
        {rebuildSeconds(REBUILD.bytes, REBUILD.bytesPerSecond)} seconds even at a steady {REBUILD.bytesPerSecond / 1e6}{' '}
        MB/s, and inserts wait the whole time.
      </p>
      <p>
        <strong>Extendible hashing</strong> does split exactly the full bucket, so it needs no overflow pages. To find
        buckets it keeps a <strong>directory</strong>, one entry for each value of the last d bits, and when the full
        bucket already reads all d bits, the directory doubles. One crowded corner of the hash space can double it again
        and again: in the file below, {LAB.most} random keys leave it with {FULL.extendible.directory} entries for{' '}
        {FULL.extendible.pages} buckets. Linear hashing gives up the directory and accepts overflow pages instead, but
        only until the pointer reaches them.
      </p>

      <h2>Watch a file grow</h2>
      <Figure
        readable
        caption="Each column is a bucket: its own page on top, any overflow pages chained under it in ink. Each dot is a record, the newest one sage. The sage triangle marks the split pointer; bucket numbers in ink read one bit more than the faded ones, and the shaded pair is the last split. A full bucket away from the pointer keeps its chain until the pointer comes round."
      >
        <p className="font-mono text-[0.875rem] uppercase tracking-widest text-ink">{said(run.last, limit)}</p>
        <div className="mt-4">
          <FileLab
            file={run.file}
            last={run.last}
            label={`${keys.length} keys in ${run.file.buckets.length} buckets with ${run.linear.overflow} overflow pages`}
          />
        </div>
        <div className="mt-5 flex flex-wrap gap-x-10 gap-y-4">
          <Readout label="Keys" value={keys.length} />
          <Readout label="Buckets" value={run.file.buckets.length} />
          <Readout label="Overflow pages" value={run.linear.overflow} />
          <Readout label="Pages per lookup" value={perLookup(run.linear.lookup)} accent />
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[30rem] text-left font-mono text-[0.875rem]">
            <thead className="uppercase tracking-widest text-zinc-faded">
              <tr>
                <th className="pb-2 pr-3 font-normal">Same keys in</th>
                <th className="pb-2 pr-3 font-normal">Pages on disk</th>
                <th className="pb-2 pr-3 font-normal">Pages per lookup</th>
                <th className="pb-2 font-normal">In memory</th>
              </tr>
            </thead>
            <tbody className="tabular-nums text-ink">
              <tr>
                <td className="py-1 pr-3 text-sage-ink">Linear</td>
                <td className="py-1 pr-3">{run.linear.pages}</td>
                <td className="py-1 pr-3">{perLookup(run.linear.lookup)}</td>
                <td className="py-1">i and p</td>
              </tr>
              <tr>
                <td className="py-1 pr-3">Static, {LAB.staticBuckets} buckets</td>
                <td className="py-1 pr-3">{run.static.pages}</td>
                <td className="py-1 pr-3">{perLookup(run.static.lookup)}</td>
                <td className="py-1">the bucket count</td>
              </tr>
              <tr>
                <td className="py-1 pr-3">Extendible</td>
                <td className="py-1 pr-3">{run.extendible.pages}</td>
                <td className="py-1 pr-3">{perLookup(run.extendible.lookup)}</td>
                <td className="py-1">{run.extendible.directory} directory entries</td>
              </tr>
            </tbody>
          </table>
        </div>
        <Controls>
          <Button onClick={() => add(1)} disabled={full}>
            Add key {next ?? ''}
          </Button>
          <Button onClick={() => add(10)} disabled={full}>
            Add 10
          </Button>
          <Button
            onClick={() => {
              setKeys([])
              setRefused(null)
            }}
          >
            Empty it
          </Button>
          <Choice label="Fill limit" options={LIMITS} value={limit} onChange={setLimit} format={(n) => `${n}%`} />
          <div className="flex items-end gap-2">
            <label className="flex flex-col gap-2">
              <span className="font-mono text-[0.875rem] uppercase tracking-widest text-zinc-faded">Your key</span>
              <input
                inputMode="numeric"
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') addTyped()
                }}
                placeholder="0 to 65535"
                className="w-32 rounded-xl border border-zinc-300 bg-transparent px-3 py-1.5 font-mono text-[0.875rem] text-ink dark:border-zinc-200/20"
              />
            </label>
            <Button onClick={addTyped} disabled={full}>
              Insert
            </Button>
          </div>
        </Controls>
        <p className="mt-3 min-h-[1.25rem] font-mono text-[0.875rem] text-zinc-faded">
          {refused ?? (full ? `The lab holds ${LAB.most} keys; empty it to start again.` : ' ')}
        </p>
      </Figure>
      <p>
        Here a key is its own hash, as in the course’s examples. Type 0, 16, 32 and 48: until bucket 0 reads five bits,
        all four land in it, and no split can pull them apart.
      </p>

      <Predict
        kicker="Quick check"
        question={`You lower the fill limit from ${LAB_LIMIT}% to ${LIMITS[0]}%. What changes?`}
        options={[
          { label: 'More buckets, fewer overflow pages', right: true },
          { label: 'Fewer buckets, more overflow pages' },
          { label: 'Lookups need a directory' },
          { label: 'Splits follow the full bucket' },
        ]}
        reveal={
          <>
            More buckets, fewer overflow pages. A lower limit splits sooner, so each bucket’s page has room to spare and
            fewer keys spill over; the price is disk space. With all {LAB.most} keys, {LIMITS[0]}% gives{' '}
            {LOW.file.buckets.length} buckets and {pages(LOW.linear.overflow)} of overflow, {LIMITS[LIMITS.length - 1]}%
            gives {HIGH.file.buckets.length} buckets and {HIGH.linear.overflow}. The order of splits never changes.
          </>
        }
      />

      <h2>Using it well</h2>
      <ul>
        <li>
          <strong>Set the limit by what reads can afford.</strong> Around {LAB_LIMIT}% keeps lookups near one page while
          leaving about a fifth of each page empty; lower it for faster reads, raise it to save disk.
        </li>
        <li>
          <strong>Use a hash that spreads keys.</strong> A split only separates keys whose next bit differs, so keys
          that share their last bits stay in one chain however often their bucket splits. Under extendible hashing the
          same keys blow up the directory.
        </li>
        <li>
          <strong>Reach for a B+ tree when you need ranges.</strong> A hash scatters neighbouring keys on purpose, so a
          range query reads every bucket; a <Link to="/learnings/b-plus-trees">B+ tree</Link> keeps them in order.
        </li>
        <li>
          <strong>Shrink the same way.</strong> When the file empties out, fold the newest bucket into the one it was
          split from and move p back one.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question={`A linear-hash file has ${CHECK.buckets} buckets, and bucket ${CHECK.full} has just overflowed. Which bucket splits next?`}
        options={[
          { label: `Bucket ${CHECK.full}` },
          { label: 'Bucket 0' },
          { label: `Bucket ${CHECK_POINTER}`, right: true },
          { label: `Bucket ${CHECK.buckets}` },
        ]}
        reveal={
          <>
            Bucket {CHECK_POINTER}. {CHECK.buckets} buckets is {2 ** CHECK_BITS} plus {CHECK_POINTER}, so i ={' '}
            {CHECK_BITS} and buckets 0 to {CHECK_POINTER - 1} have already split this round: p = {CHECK_POINTER}. Bucket{' '}
            {CHECK.full} keeps its overflow page; it splits next round, after buckets 0 to {CHECK.full - 1}. Bucket{' '}
            {CHECK.buckets} is the one the split will add.
          </>
        }
      />
    </Article>
  )
}
