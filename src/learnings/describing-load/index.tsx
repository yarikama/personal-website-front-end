import { useState } from 'react'
import Article from '../../components/explain/Article'
import { Controls, Figure, Numbers, Slider } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import LoadCalculator from './LoadCalculator'
import Mailboxes from './Mailboxes'
import { pullWork, pushWork, short, TWITTER_2012 } from './model'

const { postsPerSecond, readsPerSecond, followers, biggestAccount } = TWITTER_2012

export default function DescribingLoad() {
  const [posts, setPosts] = useState(postsPerSecond)
  const [reads, setReads] = useState(readsPerSecond)
  const [averageFollowers, setAverageFollowers] = useState(followers)
  const [biggest, setBiggest] = useState(biggestAccount)

  return (
    <Article
      kicker="Data systems · Scalability"
      title="Describing load"
      promise="How did Twitter make home timelines fast, and why could one celebrity’s post undo it?"
      takeaway={
        <>
          Describe load with the few numbers that drive your costs. For Twitter it wasn’t posts per second; it was{' '}
          <em>how many people each post had to reach</em>.
        </>
      }
      sources={[
        {
          title: 'Designing Data-Intensive Applications',
          by: 'Martin Kleppmann, 2017',
          part: 'Chapter 1, “Describing Load”',
          url: 'https://dataintensive.net/',
        },
        {
          title: 'Timelines at Scale',
          by: 'Raffi Krikorian, QCon San Francisco, 2012',
          part: 'Where Twitter’s numbers come from',
          url: 'https://www.infoq.com/presentations/Twitter-Timeline-Scalability/',
        },
      ]}
    >
      <Predict
        question="In 2012 Twitter got 4.6k new posts a second and 300k timeline opens a second. Where should the work of building timelines happen?"
        options={[
          { label: 'When someone opens the app' },
          { label: 'When someone posts', right: true },
          { label: 'Split evenly' },
          { label: 'It doesn’t matter' },
        ]}
        reveal={
          <>
            Opens outnumber posts 65 to 1, so do the work once per post, not once per open. That’s what Twitter did,
            until one kind of user broke it. Here’s the post office version.
          </>
        }
      />

      <h2>The post office</h2>

      <Steps
        say={[
          <>You follow 5 friends. Each time you open the app, it goes round all 5 and collects their new posts.</>,
          <>
            Everyone does the same, all day. The same friends get visited again and again, for posts that have barely
            changed.
          </>,
          <>
            Flip it round: when a friend posts, a copy goes straight into each follower’s mailbox. Opening the app
            just reads your own mailbox.
          </>,
          <>
            People open far more than they post. At Twitter’s 2012 load, collecting on every open costs{' '}
            {short(pullWork(readsPerSecond, followers))} lookups a second; delivering on every post,{' '}
            {short(pushWork(postsPerSecond, followers))} writes.
          </>,
          <>
            Then someone with {short(biggestAccount)} followers posts. One post becomes {short(biggestAccount)}{' '}
            mailbox deliveries, and it has to happen within seconds.
          </>,
          <>
            So Twitter mixed the two: deliver most people’s posts ahead of time, and fetch the few celebrities’ posts
            when you open the app.
          </>,
        ]}
      >
        {(step) => <Mailboxes step={step} />}
      </Steps>

      <h2>The one line of math</h2>
      <p>
        Each way does the same work, just at a different moment. Delivering costs posts × followers; collecting costs
        opens × accounts followed. At Twitter’s 2012 numbers:
      </p>
      <Numbers
        items={[
          { label: 'Collect on open', value: short(pullWork(readsPerSecond, followers)), note: 'lookups a second' },
          { label: 'Deliver on post', value: short(pushWork(postsPerSecond, followers)), note: 'writes a second' },
          { label: 'One celebrity post', value: short(biggestAccount), note: 'writes, at once' },
        ]}
      />
      <p>
        The numbers that decide your costs are your <strong>load parameters</strong>. Twitter’s most important one
        wasn’t a rate at all: it was how many followers each post had, the <strong>fan-out</strong>.
      </p>

      <h2>Try your own load</h2>
      <p>Change the load and watch which way wins. Push the followers up and see the gap close.</p>
      <Figure caption="Delivering wins while people open far more than they post; collecting wins when they post far more than they open. Either way, the biggest account’s post is the moment that hurts: all its writes land at once.">
        <LoadCalculator posts={posts} reads={reads} followers={averageFollowers} biggest={biggest} />
        <Controls>
          <Slider label="Posts a second" value={posts} min={100} max={50_000} step={100} onChange={setPosts} format={short} />
          <Slider label="Opens a second" value={reads} min={1_000} max={1_000_000} step={1_000} onChange={setReads} format={short} />
          <Slider label="Average followers" value={averageFollowers} min={1} max={1_000} onChange={setAverageFollowers} />
          <Slider
            label="Biggest account"
            value={biggest}
            min={100_000}
            max={100_000_000}
            step={100_000}
            onChange={setBiggest}
            format={short}
          />
        </Controls>
      </Figure>

      <Predict
        kicker="Quick check"
        question="A logging service writes 1 million events a second. One dashboard reads them a few times a minute. When should it do the work?"
        options={[
          { label: 'When writing: prepare every view' },
          { label: 'When reading: compute on demand', right: true },
          { label: 'Both, to be safe' },
          { label: 'Never: skip the dashboard' },
        ]}
        reveal={
          <>
            Here writes outnumber reads by millions to one. Preparing a view on every write would be work almost
            nobody looks at, so store the events and compute when someone asks. Same reasoning as Twitter, opposite
            answer, because the load parameters are the other way round.
          </>
        }
      />

      <h2>What engineers do with it</h2>
      <ul>
        <li>
          <strong>Name your load parameters before you scale.</strong> Requests a second, reads to writes, people
          online at once, how often the cache has the answer: whichever few numbers drive your costs.
        </li>
        <li>
          <strong>Look at the spread, not the average.</strong> An average of 75 followers hides the account with 31
          million.
        </li>
        <li>
          <strong>Treat the outliers differently.</strong> One rule for most of the load, another for the few cases
          that would break it.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="In a group chat app, every message goes to everyone in the group. Which number most decides what one message costs?"
        options={[
          { label: 'Messages a second' },
          { label: 'How many people are in the group', right: true },
          { label: 'How many servers there are' },
          { label: 'How long the message is' },
        ]}
        reveal={
          <>
            Group size is this app’s fan-out: a message to a group of 5,000 is 5,000 deliveries. Messages a second
            tells you how often you pay; group size tells you how much.
          </>
        }
      />
    </Article>
  )
}
