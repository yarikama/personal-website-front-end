import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Button, Choice, Controls, Figure, Numbers, Readout } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { seeded } from '../../components/explain/random'
import { Steps } from '../../components/explain/Steps'
import Columns from './Columns'
import {
  BILL,
  binary,
  BITS,
  DEAD_DISK,
  DISK_BITS,
  DISK_IOPS,
  extraSpace,
  FRIENDS,
  KEEPER,
  LAYOUTS,
  percent,
  SHARES,
  smallWrites,
  traffic,
  withParity,
  WORKED,
  writesPerSecond,
  type Layout,
} from './model'
import WriteTraffic from './WriteTraffic'

const PEOPLE = [...FRIENDS, KEEPER]
const BILL_ROW = [[...SHARES, BILL]]
const BIT_ROW = [withParity(BITS)]
const DISK_ROWS = DISK_BITS.map(withParity)
const DISKS = ['D1', 'D2', 'D3', 'D4', 'Parity']

const dollars = (value: number) => `$${value}`
// The keeper's total less everyone else's; or, for the keeper, the sum
const subtract = (row: number[], lost: number) =>
  lost === row.length - 1
    ? `${row.slice(0, -1).join(' + ')} = $${row[lost]}`
    : `$${row.at(-1)} − ${row
        .slice(0, -1)
        .filter((_, i) => i !== lost)
        .join(' − ')} = $${row[lost]}`
// The XOR of everyone else's, the keeper's first
const xorOthers = (row: number[], lost: number) =>
  `${[row.at(-1)!, ...row.slice(0, -1)].filter((_, i) => i !== (lost + 1) % row.length).join(' ⊕ ')} = ${row[lost]}`

// The real system's settings, and a stream of small writes for each
const DATA_DISKS = [2, 4, 6] as const
type DataDisks = (typeof DATA_DISKS)[number]
const WRITES = 48
// Over n + 1 stripes, so RAID 5's parity takes one turn round every disk
const STREAMS = new Map(DATA_DISKS.map((n) => [n, smallWrites(seeded(11), n, n + 1, WRITES)]))

export default function RaidParity() {
  const [layout, setLayout] = useState<Layout>('RAID 4')
  const [n, setN] = useState<DataDisks>(4)
  const [replays, setReplays] = useState(0)
  const blocks = STREAMS.get(n)!
  const counts = traffic(layout, n, blocks)
  const busiest = Math.max(...counts) / counts.reduce((a, b) => a + b, 0)

  return (
    <Article
      kicker="Inside a database · Storage"
      title="One disk that can rebuild any other"
      promise="A database spreads its data over four disks. How much extra disk does it need so that losing any one of them loses nothing?"
      takeaway={
        <>
          One extra disk holding the <em>XOR</em> of the others can rebuild any one of them, for 1/N more space instead
          of a full copy. The price is that every write must fix the parity too, so spread the parity over all the
          disks.
        </>
      }
      sources={[
        {
          title: 'COMP 530: Database System Implementation',
          by: 'Chris Jermaine, Rice University, Fall 2025',
          part: 'Lecture 2, storage failures and RAID levels 1, 4, 5 and 6',
        },
        {
          title: 'Database System Implementation',
          by: 'Hector Garcia-Molina, Jeffrey D. Ullman and Jennifer Widom, 2000',
          part: 'Chapter 2, “Data Storage”',
        },
      ]}
    >
      <Predict
        question="Your data fills 4 disks. How many extra disks do you need so that any one of the 4 can die without losing a byte?"
        options={[{ label: '4, a copy of each' }, { label: '3' }, { label: '2' }, { label: '1', right: true }]}
        reveal={
          <>
            One. Not a copy of anything, just one disk that knows a little about all the others. A dinner bill shows how
            that can be enough.
          </>
        }
      />

      <h2>Who forgot their share</h2>

      <Steps
        say={[
          <>Four friends split a ${BILL} bill, and each remembers only their own share.</>,
          <>A fifth friend, {KEEPER}, remembers nobody’s share, only the total.</>,
          <>
            Next morning {FRIENDS[2]} has forgotten his. {KEEPER}’s total, less everyone else’s, gives it back.
          </>,
          <>It works whoever forgets, {KEEPER} included: the four just add their shares up again.</>,
          <>Now make each share a single bit, 0 or 1, and let {KEEPER} keep only whether the 1s are odd (1) or even (0).</>,
          <>
            {FRIENDS[1]} forgets his bit; everyone else’s 1s, {KEEPER}’s too, come to an even count, so his was 0. This
            odd-or-even sum, adding with no carry, is called XOR and written ⊕.
          </>,
          <>
            The friends are disks D1 to D4, and {KEEPER} is one extra disk holding each row’s odd-or-even, its{' '}
            <em>parity</em>. When D3 dies, every bit on it comes back the same way.
          </>,
        ]}
      >
        {(step) =>
          step === 0 ? (
            <Columns key="shares" names={PEOPLE} rows={BILL_ROW} keeper={false} format={dollars} />
          ) : step === 1 ? (
            <Columns key="total" names={PEOPLE} rows={BILL_ROW} note="the total" format={dollars} />
          ) : step === 2 ? (
            <Columns key="cal" names={PEOPLE} rows={BILL_ROW} note="the total" format={dollars} lost={2} sum={subtract} />
          ) : step === 3 ? (
            <Columns key="pat" names={PEOPLE} rows={BILL_ROW} note="the total" format={dollars} lost={4} sum={subtract} />
          ) : step === 4 ? (
            <Columns key="bits" names={PEOPLE} rows={BIT_ROW} note="odd or even" />
          ) : step === 5 ? (
            <Columns key="ben" names={PEOPLE} rows={BIT_ROW} note="odd or even" lost={1} sum={xorOthers} />
          ) : (
            <Columns key="disks" names={DISKS} rows={DISK_ROWS} lost={DEAD_DISK} lostWord="dead" sum={xorOthers} />
          )
        }
      </Steps>

      <h2>The one line of math</h2>
      <p>
        With ⊕ for XOR and N data disks, the parity disk holds P = D<sub>1</sub> ⊕ D<sub>2</sub> ⊕ … ⊕ D
        <sub>N</sub>. To get a lost disk back, XOR everything that survived: D<sub>k</sub> = P ⊕ (all the other D’s).
        That works because XOR undoes itself: x ⊕ x = 0, so each surviving disk cancels its own share out of P and
        leaves only the missing one. A disk holds blocks, not single bits, so this runs on every bit of every block at
        once:
      </p>
      <Numbers
        items={WORKED.map((w) => ({
          label: `${w.data.map((d, i) => (i === w.lost ? '?' : binary(d, w.bits))).join(' ')} · P ${binary(w.parity, w.bits)}`,
          value: binary(w.rebuilt, w.bits),
          note: [w.parity, ...w.data.filter((_, i) => i !== w.lost)].map((d) => binary(d, w.bits)).join(' ⊕ '),
        }))}
      />
      <p>
        That odd-or-even bit is the row’s <strong>parity</strong>, and disks arranged to survive losing one are{' '}
        <strong>RAID</strong>, a redundant array of independent disks. With the parity on a disk of its own, as here,
        it is <strong>RAID 4</strong>. The plain alternative, <strong>RAID 1</strong>, mirrors: a full second copy of
        every disk. Both survive any one disk dying, but for four disks of data mirroring buys four more and parity
        buys one, 100% extra space against 25%. With N data disks, parity costs 1/N.
      </p>
      <p>
        A database counts on this. The machinery that brings it back after a crash plans for the machine losing what
        was in memory, not for a disk losing what was written, and in a big enough fleet{' '}
        <Link to="/learnings/faults-and-failures">a dead disk is routine</Link>. So the storage under the database
        keeps that promise for it.
      </p>

      <h2>The price: every write</h2>
      <p>
        Parity has to stay true. Change one block on disk 1 and its row’s parity is now wrong. You could read the
        row’s other data blocks and XOR them all again, but XOR offers a shortcut: take the old data off the old
        parity, then put the new data on.
      </p>
      <Clip
        src="raid-parity/parity-update"
        label="The old parity is the old data XOR R, where R stands for every other disk in the row, and the new parity is the new data XOR R. XORing the old parity with the old data cancels the old data, leaving R. Putting that in place of R gives: new parity equals old parity XOR old data XOR new data. With four-bit blocks, 0011 XOR 0110 XOR 1111 is 1010. A write reads the old data and old parity and writes the new data and new parity: four disk operations however many disks there are."
        caption="The rest of the row never needs to be read: the old parity already carries it. With the blocks from above, disk 1 changing from 0110 to 1111 turns the parity from 0011 into 1010."
      />
      <p>
        So one small write costs four disk operations whatever N is: read the old data and old parity, write the new
        data and new parity. Each is a random access that pays a seek, the cost that makes databases{' '}
        <Link to="/learnings/disk-access-cost">read in large pages</Link>. And in RAID 4, two of the four land on the
        parity disk every time, whichever data disk was written.
      </p>

      <h2>Where the writes land</h2>
      <p>Pick a layout and how many disks of data, and watch a stream of small writes to random blocks.</p>
      <Figure
        readable
        caption={
          <>
            Each row is a stripe: one block on each disk. Sage is data being written; the filled P is parity being read and
            rewritten. RAID 4’s parity disk does half of all the work. RAID 5 moves each stripe’s parity to a different
            disk, and the work spreads. Writes a second assume each disk manages {DISK_IOPS} random operations a second.
          </>
        }
      >
        <WriteTraffic key={`${layout} ${n} ${replays}`} layout={layout} n={n} blocks={blocks} />
        <div className="mt-4 grid grid-cols-3 gap-4">
          <Readout label="Extra space" value={`+${percent(extraSpace(layout, n))}`} />
          <Readout label="Busiest disk’s share" value={percent(busiest)} />
          <Readout label="Small writes a second" value={Math.round(writesPerSecond(layout, n))} accent />
        </div>
        <Controls>
          <Choice label="Layout" options={LAYOUTS} value={layout} onChange={setLayout} />
          <Choice label="Data disks" options={DATA_DISKS} value={n} onChange={setN} />
          <Button onClick={() => setReplays((r) => r + 1)}>Play again</Button>
        </Controls>
      </Figure>
      <p>
        The parity disk in RAID 4 does two operations for every write in the array, so the array keeps up with half
        of one disk’s rate, {writesPerSecond('RAID 4', 4)} writes a second here, however many data disks you add.{' '}
        <strong>RAID 5</strong> fixes this with placement alone: stripe i keeps its parity on disk i mod (N + 1), so
        every disk holds some parity and some data, and the four operations of each write spread over all of them.
        Same space, same protection, and with four data disks {writesPerSecond('RAID 5', 4)} writes a second instead
        of {writesPerSecond('RAID 4', 4)}.
      </p>

      <Predict
        kicker="Quick check"
        question="A RAID 4 array with 8 data disks can’t keep up with its small writes. You add 8 more data disks and keep one parity disk. What happens to the small writes it can take each second?"
        options={[
          { label: 'About double' },
          { label: 'Up by half' },
          { label: 'About the same', right: true },
          { label: 'Down by half' },
        ]}
        reveal={
          <>
            About the same. Every small write still reads and rewrites the one parity disk, so that disk caps the array
            at half its own rate, with 8 data disks or 16. The new disks sit mostly idle. Rotating the parity (RAID 5)
            is what lets more disks mean more writes.
          </>
        }
      />

      <h2>What engineers do about it</h2>
      <ul>
        <li>
          <strong>Rotate the parity.</strong> RAID 5 costs the same space as RAID 4 and spreads the parity work, so
          a dedicated parity disk is rare in practice.
        </li>
        <li>
          <strong>Write whole stripes when you can.</strong> If a write covers every data block in a stripe, its
          parity comes straight from the new data with nothing to read first. Systems that gather writes and lay them
          down a stripe at a time skip the four-operation cost.
        </li>
        <li>
          <strong>Mirror what is written most.</strong> Busy data with many small random writes suits RAID 1: two
          operations a write instead of four, paid for in space.
        </li>
        <li>
          <strong>Keep backups anyway.</strong> RAID rebuilds a dead disk. A dropped table, a bug that writes
          garbage, or a fire reaches every disk at once, parity included.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="A RAID 5 array of 8 disks loses one. Rebuilding its replacement means reading every other disk end to end, which takes a day. Halfway through, a second disk dies. What happens?"
        options={[
          { label: 'Nothing: parity covers it' },
          { label: 'The rebuild starts over' },
          { label: 'Some data is lost', right: true },
          { label: 'Only parity is lost' },
        ]}
        reveal={
          <>
            Every stripe not yet rebuilt now has two blocks missing and one parity to find them from. It is the bill
            with {FRIENDS[1]} and {FRIENDS[2]} both forgetting: ${BILL} − {SHARES[0]} − {SHARES[3]} = $
            {BILL - SHARES[0] - SHARES[3]} gives their sum, not who owes what. So rebuild time matters: the longer
            the window, the likelier a second loss, and disks bought together tend to fail together. That is why{' '}
            <strong>RAID 6</strong> keeps a second, differently computed check in every stripe: two equations for two
            unknowns, so any two disks can die.
          </>
        }
      />
    </Article>
  )
}
