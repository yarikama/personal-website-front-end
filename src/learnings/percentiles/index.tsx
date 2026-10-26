import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Controls, Figure, Numbers, Slider } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import CoffeeLine from './CoffeeLine'
import ResponseBars from './ResponseBars'

export default function Percentiles() {
  const [slowest, setSlowest] = useState(3000)

  return (
    <Article
      kicker="Data systems · Scalability"
      title="Percentiles"
      promise="Why is the average response time the wrong number to watch?"
      takeaway={
        <>
          The average describes <em>nobody</em>. The median is the typical experience; the high percentiles are the
          bad ones, and those are the ones people remember.
        </>
      }
      sources={[
        {
          title: 'Designing Data-Intensive Applications',
          by: 'Martin Kleppmann, 2017',
          part: 'Chapter 1, “Describing Performance”',
          url: 'https://dataintensive.net/',
        },
      ]}
    >
      <Predict
        question="A server answers 99 requests in 50 ms and one in 5 seconds. What is its average response time?"
        options={[{ label: '50 ms' }, { label: 'About 100 ms', right: true }, { label: 'About 500 ms' }, { label: 'About 2.5 s' }]}
        reveal={
          <>
            (99 × 50 + 5,000) ÷ 100 ≈ 100 ms. That’s twice what 99 users got, and fifty times better than what the
            last one got. The average describes nobody. Here’s a coffee shop that shows what to look at instead.
          </>
        }
      />

      <h2>Waiting for coffee</h2>

      <Steps
        say={[
          <>You time how long 10 customers wait for their coffee.</>,
          <>Nine of them wait about 2 minutes. One waits 20, because the machine jammed.</>,
          <>
            The average wait is 3.8 minutes. Not one customer waited 3.8 minutes.
          </>,
          <>
            Line them up from shortest wait to longest. The one in the middle waited 2 minutes: that’s the{' '}
            <em>median</em>, what a typical customer saw.
          </>,
          <>
            The end of the line holds the bad experiences. 9 in 10 waited 2.4 minutes or less, the{' '}
            <em>90th percentile</em>, and the slowest waited 20.
          </>,
          <>
            Your server is the coffee shop and every request a customer. Engineers watch p50 for the typical request,
            and p95, p99 and p99.9 for the bad ones.
          </>,
        ]}
      >
        {(step) => <CoffeeLine step={step} />}
      </Steps>

      <h2>The one line of math</h2>
      <p>
        Sort the response times. The <strong>pth percentile</strong> is the one p% of the way along: p% of requests
        were at least that fast. Out of 1,000 requests:
      </p>
      <Numbers
        items={[
          { label: 'p50 · median', value: '500th', note: 'the typical one' },
          { label: 'p99', value: '990th', note: '1 in 100 slower' },
          { label: 'p99.9', value: '999th', note: '1 in 1,000 slower' },
        ]}
      />
      <p>
        The slow end is called the <strong>tail</strong>, and its percentiles the <strong>tail latencies</strong>.
      </p>

      <h2>See it in a real system</h2>
      <p>A hundred requests to one server. Make the slowest one slower and watch which lines move.</p>
      <Figure caption="The average climbs with one slow request; the median and p99 stay put. One request shouldn’t change how you see the other 99.">
        <ResponseBars slowest={slowest} />
        <Controls>
          <Slider
            label="The slowest request takes"
            value={slowest}
            min={100}
            max={5000}
            step={100}
            onChange={setSlowest}
            format={(ms) => `${ms.toLocaleString('en-US')} ms`}
          />
        </Controls>
      </Figure>

      <Predict
        kicker="Quick check"
        question="Your dashboard shows p50 = 80 ms and p99 = 2 s. What does the p99 tell you?"
        options={[
          { label: '1 in 100 requests takes 2 s or more', right: true },
          { label: 'The average request takes 2 s' },
          { label: '99 requests took 2 s' },
          { label: 'The server was down 1% of the time' },
        ]}
        reveal={
          <>
            99% of requests are faster than 2 s, so 1 in 100 takes that long or longer. If a page makes many
            requests, that 1 in 100 lands on most pages: see{' '}
            <Link to="/learnings/tail-latency-amplification" className="text-sage">
              tail latency amplification
            </Link>
            .
          </>
        }
      />

      <h2>What engineers do with it</h2>
      <ul>
        <li>
          <strong>Report the median and the tail, never just the average.</strong> p50 says what most people get;
          p99 and p99.9 say how bad it gets. Amazon, for one, sets its internal targets at p99.9, because its slowest
          requests tend to come from the customers with the most data: its best customers.
        </li>
        <li>
          <strong>Time requests from the caller’s side.</strong> One slow request holds up the ones queued behind
          it, and the server’s own clock never sees that wait.
        </li>
        <li>
          <strong>Don’t average percentiles.</strong> The average of two servers’ p99s isn’t the p99 of both. Add up
          the raw counts (histograms) first, then take the percentile.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="A checkout page should load in under 1 second for 95% of users. Which number goes on the dashboard?"
        options={[
          { label: 'Average under 1 s' },
          { label: 'p50 under 1 s' },
          { label: 'p95 under 1 s', right: true },
          { label: 'Slowest under 1 s' },
        ]}
        reveal={
          <>
            p95 under 1 s means 95 in 100 checkouts load faster than a second. The average could sit under a second
            while 1 user in 5 waits far longer, and “slowest” is one unlucky request you can never fully control.
          </>
        }
      />
    </Article>
  )
}
