import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Choice, Controls, Figure, Slider } from '../../components/explain/figure'
import ChanceChart from './ChanceChart'
import FanOut from './FanOut'
import { neededPercentile, percent, percentileName, slowChance } from './model'

const SLOWNESS = [0.001, 0.01, 0.05] as const

export default function TailLatencyAmplification() {
  // Both figures share these, so moving one moves the other
  const [calls, setCalls] = useState(10)
  const [slowness, setSlowness] = useState<(typeof SLOWNESS)[number]>(0.01)

  const settings = (
    <Controls>
      <Slider label="Calls per page" value={calls} min={1} max={100} onChange={setCalls} />
      <Choice label="Each call slow" options={SLOWNESS} value={slowness} onChange={setSlowness} format={percent} />
    </Controls>
  )

  return (
    <Article
      kicker="Data systems · Scalability"
      title="Tail latency amplification"
      takeaway={
        <>
          A page that waits on many calls is as slow as the <em>slowest</em> of them, so a call that is rarely
          slow makes pages that are often slow.
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
      <h2>One page, many calls</h2>
      <p>
        Behind one page there are often dozens of requests: the profile from one service, recommendations from
        another, then prices, stock and ads. They go out in parallel, so it is tempting to think the page takes as
        long as a typical call. It takes as long as the <strong>slowest</strong> one, because it cannot be sent until
        every answer is in.
      </p>
      <p>
        Each backend below usually answers in 20 to 80 ms. Now and then a call takes most of a second instead: a
        garbage collection pause, a lost packet that has to be sent again, a disk busy with something else. Send a
        page and watch it wait.
      </p>

      <Figure
        caption={
          <>
            Each line is one call. Most come back almost at once, and the page waits for the last. Raise the number
            of calls, send a hundred, and slow pages stop being rare.
          </>
        }
      >
        <FanOut calls={calls} slowness={slowness} />
        {settings}
      </Figure>

      <h2>The arithmetic</h2>
      <p>
        If each call is slow with chance <em>p</em>, a page of <em>n</em> calls is fast only when every one of them
        is: that happens with chance (1 − <em>p</em>)<sup>n</sup>. So the page is slow with chance 1 − (1 −{' '}
        <em>p</em>)<sup>n</sup>, which climbs fast.
      </p>

      <Figure
        caption={
          <>
            With {calls} {calls === 1 ? 'call' : 'calls'}, each slow {percent(slowness)} of the time,{' '}
            <strong className="text-ink font-medium">{percent(slowChance(slowness, calls))}</strong> of pages are
            slow. To keep 99% of them fast, each call would have to be fast at{' '}
            <strong className="text-ink font-medium">{percentileName(neededPercentile(0.01, calls))}</strong>.
          </>
        }
      >
        <ChanceChart calls={calls} slowness={slowness} options={SLOWNESS} />
        {settings}
      </Figure>

      <p>
        Take a backend that is slow 1% of the time: its p99 is slow. Ten calls to it make one page in ten slow; a
        hundred make nearly two in three. Turned around, a page of a hundred calls only stays fast for 99% of users
        if every backend is fast at p99.99. <strong>A backend&rsquo;s rare tail becomes the user&rsquo;s everyday
        experience.</strong>
      </p>

      <h2>What it changes</h2>
      <ul>
        <li>
          <strong>Watch each backend&rsquo;s tail, not its average.</strong> In a fan-out, its p99 and p99.9 are what
          users feel. An average hides them entirely.
        </li>
        <li>
          <strong>Time calls from the caller&rsquo;s side.</strong> A backend&rsquo;s own timer misses the time a
          request spent queued in front of it, behind slower ones.
        </li>
        <li>
          <strong>Make fewer calls, or stop waiting for stragglers.</strong> Fetch less per page, or hedge: if a call
          has not answered within about the backend&rsquo;s p95, send the same request to another replica and take
          whichever answers first. That costs a few percent more requests and cuts most of the tail.
        </li>
      </ul>

      <h2>Where it comes back</h2>
      <p>
        Spreading data over many machines turns a query into a fan-out to every machine that holds part of it, so
        this is the price of every scatter-gather read. It is also why the rest of the book keeps measuring
        performance in percentiles. See the whole <Link to="/learnings?node=tail-latency-amplification">map</Link>{' '}
        for what leads here and what follows.
      </p>
    </Article>
  )
}
