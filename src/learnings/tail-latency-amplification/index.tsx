import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Choice, Controls, Figure, Numbers, Slider } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { seeded } from '../../components/explain/random'
import { Steps } from '../../components/explain/Steps'
import { ManyDinners, OneDinner } from './Dinner'
import FanOut from './FanOut'
import { percent, slowChance, slowPages } from './model'

const SLOWNESS = [0.001, 0.01, 0.05] as const

// The story's two evenings, in minutes after seven: everyone on time, then
// one friend 41 minutes late
const ON_TIME = [3, 5, 2, 7]
const ONE_LATE = [3, 5, 41, 7]

export default function TailLatencyAmplification() {
  // The story's hundred dinners. Seeded so the story always tells the same
  // numbers, and chosen to land on what the arithmetic says: 4 and 63
  const fewGuests = useMemo(() => slowPages(seeded(3), 0.01, 4, 100), [])
  const manyGuests = useMemo(() => slowPages(seeded(10), 0.01, 100, 100), [])
  const waitedFew = fewGuests.filter(Boolean).length
  const waitedMany = manyGuests.filter(Boolean).length

  const [calls, setCalls] = useState(10)
  const [slowness, setSlowness] = useState<(typeof SLOWNESS)[number]>(0.01)

  return (
    <Article
      kicker="Data systems · Scalability"
      title="Tail latency amplification"
      promise="Why do pages get slow when every server behind them is fast almost all the time?"
      takeaway={
        <>
          A page is as slow as the <em>slowest</em> server it waits on. The more servers it waits on, the more
          often one of them is having a bad moment.
        </>
      }
      sources={[
        {
          title: 'Designing Data-Intensive Applications',
          by: 'Martin Kleppmann, 2017',
          part: 'Chapter 1, “Describing Performance” and “Percentiles in Practice”',
          url: 'https://dataintensive.net/',
        },
        {
          title: 'The Tail at Scale',
          by: 'Jeffrey Dean and Luiz André Barroso, Communications of the ACM, 2013',
          part: 'Where hedged requests come from',
          url: 'https://research.google/pubs/the-tail-at-scale/',
        },
      ]}
    >
      <Predict
        question="A web page asks 100 servers for data. Each server is slow only 1 time in 100. How many pages are slow?"
        options={[{ label: 'About 1%' }, { label: 'About 10%' }, { label: 'About 63%', right: true }, { label: 'Nearly all' }]}
        reveal={<>About 63 in 100. It feels wrong, so here is a dinner that shows why.</>}
      />

      <h2>Waiting for the last friend</h2>

      <Steps
        say={[
          <>You’re having dinner with 4 friends. Each of them is late only 1 time in 100.</>,
          <>
            Dinner starts when the <em>last</em> person sits down. Tonight one friend is 41 minutes late, and
            everyone waits.
          </>,
          <>That’s rare. Out of 100 dinners with 4 friends, only {waitedFew} wait for someone.</>,
          <>
            Now invite 100 friends to every dinner, each just as punctual. {waitedMany} of 100 dinners wait. Nobody got
            worse; there are just more people to wait for.
          </>,
          <>
            That dinner is your web page. Each friend is a server the page asks for data, and the page can’t
            appear until the last one answers.
          </>,
        ]}
      >
        {(step) =>
          step === 0 ? (
            <OneDinner key="on-time" arrivals={ON_TIME} />
          ) : step === 1 ? (
            <OneDinner key="one-late" arrivals={ONE_LATE} />
          ) : step === 2 ? (
            <ManyDinners waited={fewGuests} unit="dinner" />
          ) : (
            <ManyDinners waited={manyGuests} unit={step === 3 ? 'dinner' : 'page'} />
          )
        }
      </Steps>

      <h2>The one line of math</h2>
      <p>
        A dinner starts on time only if <strong>every</strong> friend is on time. Each one is, 99 times in 100, so
        all of them are 0.99 × 0.99 × … once for each friend:
      </p>
      <Numbers
        items={[1, 10, 100].map((n) => ({
          label: `${n} ${n === 1 ? 'server' : 'servers'}`,
          value: percent(slowChance(0.01, n)),
          note: 'of pages slow',
        }))}
      />
      <p>
        So a server’s rare bad moment, its slowest 1% of answers, becomes most users’ everyday experience. Engineers
        call that slowest 1% the server’s <strong>tail</strong> (its <Link to="/learnings/percentiles">p99</Link>),
        and this effect <strong>tail latency amplification</strong>.
      </p>

      <h2>See it in a real system</h2>
      <p>The same thing with timings: send a page, and watch it wait for its slowest call.</p>
      <Figure caption="Each line is one call to a server. The page can only answer the user once the last line comes back.">
        <FanOut calls={calls} slowness={slowness} />
        <Controls>
          <Slider label="Servers per page" value={calls} min={1} max={100} onChange={setCalls} />
          <Choice label="Each server slow" options={SLOWNESS} value={slowness} onChange={setSlowness} format={percent} />
        </Controls>
      </Figure>

      <Predict
        kicker="Quick check"
        question="A page asks 50 servers, each slow 1 time in 100, and too many pages are slow. Which change helps most?"
        options={[
          { label: 'Make every server’s usual answer twice as fast' },
          { label: 'Ask 5 servers per page instead of 50', right: true },
          { label: 'Split each call across two smaller servers' },
          { label: 'Nothing: each server is rarely slow' },
        ]}
        reveal={
          <>
            Fewer calls. With 50 calls, about 40 pages in 100 meet a slow server; with 5, about 5 in 100. A faster usual
            answer leaves each server’s rare bad moments where they were, and the page still waits for them. Splitting
            each call doubles the chances to wait.
          </>
        }
      />

      <h2>What engineers do about it</h2>
      <ul>
        <li>
          <strong>Watch the p99, not the average.</strong> The average hides exactly the bad moments that pages end
          up waiting for.
        </li>
        <li>
          <strong>Ask fewer servers per page.</strong> Every server you drop is one less chance to wait.
        </li>
        <li>
          <strong>Don’t wait forever for a straggler.</strong> If one answer is late, ask a copy of that server the
          same thing and take whichever answers first.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="A page asks 10 servers. Each is slow only 1 time in 1,000. About how many pages are slow?"
        options={[{ label: '0.1%' }, { label: 'About 1%', right: true }, { label: '10%' }, { label: '63%' }]}
        reveal={
          <>
            About 1 in 100: ten servers, each with a 1-in-1,000 chance, add up to roughly ten times the chance. Small
            per server, but ten times what you might expect.
          </>
        }
      />
    </Article>
  )
}
