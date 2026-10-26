import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Controls, Figure, Numbers, Slider } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Bakery from './Bakery'
import CostCurves from './CostCurves'
import { BIGGEST, crossover } from './model'

export default function ScalingUpAndOut() {
  const [load, setLoad] = useState(2)

  return (
    <Article
      kicker="Data systems · Scalability"
      title="Scaling up and scaling out"
      promise="When your app gets ten times the users, do you buy a bigger machine or more machines?"
      takeaway={
        <>
          Scale up while it’s simple; scale out what holds <em>no data</em> first. Every architecture is built for a
          particular load, so expect to rethink it each time the load grows tenfold.
        </>
      }
      sources={[
        {
          title: 'Designing Data-Intensive Applications',
          by: 'Martin Kleppmann, 2017',
          part: 'Chapter 1, “Approaches for Coping with Load”',
          url: 'https://dataintensive.net/',
        },
      ]}
    >
      <Predict
        question="Your database runs on one machine at 80% CPU. Traffic doubles next month. What’s usually the simplest fix?"
        options={[
          { label: 'Rewrite it to run on many machines' },
          { label: 'Move it to a bigger machine', right: true },
          { label: 'Add a cache in front of everything' },
          { label: 'Wait and see' },
        ]}
        reveal={
          <>
            Usually, yes: a bigger machine changes nothing about how the database works. Spreading data over many
            machines adds a great deal of complexity, so the long-standing advice is to grow a database on one machine
            until that becomes impossible or too expensive. A bakery shows where that line is.
          </>
        }
      />

      <h2>A growing bakery</h2>

      <Steps
        say={[
          <>Your bakery bakes in one oven. Word gets around, and the line of customers doubles.</>,
          <>
            The easy fix: buy a bigger oven. Same shop, same recipes, twice the bread. That’s <em>scaling up</em>.
          </>,
          <>Keep growing, and ovens stop coming any bigger, while the biggest cost many times the small ones.</>,
          <>
            So open a second shop. Small ovens are cheap again, but now someone has to keep the recipes the same and
            decide which shop takes which order. That’s <em>scaling out</em>.
          </>,
          <>
            Taking orders is easy to copy into every shop. What’s hard is the one pantry of flour they all draw from.
          </>,
          <>
            Your app is the bakery. Web servers that keep nothing between requests are the counters: add as many as
            you like. The database is the pantry.
          </>,
        ]}
      >
        {(step) => <Bakery step={step} />}
      </Steps>

      <h2>The trade-off, in three numbers</h2>
      <p>
        One machine twice as powerful usually costs more than twice as much, and there is a biggest one. Many small
        machines cost in proportion, plus the fixed work of making them act as one. In the shapes below:
      </p>
      <Numbers
        items={[
          { label: 'Bigger machine wins', value: `< ${crossover()}×`, note: 'today’s load' },
          { label: 'More machines win', value: `> ${crossover()}×`, note: 'today’s load' },
          { label: 'No machine big enough', value: `> ${BIGGEST}×`, note: 'today’s load' },
        ]}
      />
      <p>
        The real numbers depend on your hardware and your software, but the shape holds: up is cheaper at first,
        out is cheaper later, and only out keeps going.
      </p>

      <h2>Try it</h2>
      <Figure caption="Illustrative shapes, not prices. Drag the load up and watch where the cheaper way changes, and where scaling up stops being possible at all.">
        <CostCurves load={load} />
        <Controls>
          <Slider label="Load" value={load} min={1} max={30} step={0.5} onChange={setLoad} format={(l) => `${l}× today`} />
        </Controls>
      </Figure>

      <Predict
        kicker="Quick check"
        question="Two systems each move 100 MB a second. One handles 100,000 tiny requests a second; the other, three 2 GB uploads a minute. Same architecture?"
        options={[
          { label: 'Yes: same throughput' },
          { label: 'No: different load parameters', right: true },
          { label: 'Only with the same database' },
          { label: 'Only in the cloud' },
        ]}
        reveal={
          <>
            The same bytes a second, but one is bound by handling requests and the other by moving and storing huge
            files. There’s no architecture that scales for every load: each is built around its own{' '}
            <Link to="/learnings/describing-load" className="text-sage">
              load parameters
            </Link>
            .
          </>
        }
      />

      <h2>What engineers do</h2>
      <ul>
        <li>
          <strong>Scale up while it’s simple.</strong> One capable machine is easier to run than many. An early
          product gains more from shipping features than from scaling for traffic it doesn’t have yet.
        </li>
        <li>
          <strong>Scale out the parts that keep nothing first.</strong> Servers that hold no data between requests
          can be copied freely. Data is the hard part, and much of the rest of the book is about it.
        </li>
        <li>
          <strong>Choose elastic or manual on purpose.</strong> Adding machines automatically suits load that swings
          without warning; adding them by hand is simpler and has fewer surprises.
        </li>
        <li>
          <strong>Expect to rethink at every tenfold.</strong> An architecture that suits one load rarely suits ten
          times it.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="Your web servers keep nothing between requests; your database keeps all the data. Traffic triples. Which is easier to scale out?"
        options={[
          { label: 'The web servers', right: true },
          { label: 'The database' },
          { label: 'Both are as easy' },
          { label: 'Neither can be' },
        ]}
        reveal={
          <>
            Copies of a server that holds nothing are interchangeable: put a few more behind the load balancer. Every
            copy of the database has to agree on the data, and that’s where the hard problems are.
          </>
        }
      />
    </Article>
  )
}
