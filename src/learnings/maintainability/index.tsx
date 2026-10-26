import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Choice, Controls, Figure, Numbers, Slider } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Connections from './Connections'
import House from './House'
import { everyPair, throughOne } from './model'

const WIRING = ['Every part to every other', 'Through one interface'] as const

export default function Maintainability() {
  const [parts, setParts] = useState(10)
  const [wiring, setWiring] = useState<(typeof WIRING)[number]>(WIRING[0])

  return (
    <Article
      kicker="Data systems · Maintainability"
      title="Maintainability"
      promise="Why does most of the cost of software come after it ships, and what keeps that cost down?"
      takeaway={
        <>
          Most of a system’s cost is <em>living with it</em>. Make it easy to run, easy to understand and easy to
          change.
        </>
      }
      sources={[
        {
          title: 'Designing Data-Intensive Applications',
          by: 'Martin Kleppmann, 2017',
          part: 'Chapter 1, “Maintainability”',
          url: 'https://dataintensive.net/',
        },
        {
          title: 'Out of the Tar Pit',
          by: 'Ben Moseley and Peter Marks, 2006',
          part: 'Where accidental complexity is defined',
          url: 'https://curtclifton.net/papers/MoseleyMarks06a.pdf',
        },
      ]}
    >
      <Predict
        question="Over a piece of software’s life, where does most of its cost go?"
        options={[
          { label: 'Writing the first version' },
          { label: 'Keeping it running and changing it', right: true },
          { label: 'Paying for servers' },
          { label: 'Testing before launch' },
        ]}
        reveal={
          <>
            Fixing bugs, keeping it running, finding out why it failed, moving it to new platforms, adapting it to new
            needs: the long part comes after launch. A house shows what makes that part bearable.
          </>
        }
      />

      <h2>Living in a house</h2>

      <Steps
        say={[
          <>Building a house takes about a year. Living in it takes thirty.</>,
          <>
            Someone has to keep it running: notice the boiler failing before it breaks, and fix it without moving out.
            That’s <em>operability</em>.
          </>,
          <>
            A new electrician has to understand the wiring. If every socket is wired to every other, every repair is
            risky. That’s <em>complexity</em>.
          </>,
          <>Run every wire to one labelled panel, and the same house becomes simple to work on.</>,
          <>
            Families grow. A house built to take a new room without knocking down walls is <em>evolvable</em>.
          </>,
          <>
            Software is the house. Whether people can keep working on it comes down to the same three things: easy to
            run, easy to understand, easy to change.
          </>,
        ]}
      >
        {(step) => <House step={step} />}
      </Steps>

      <h2>The one line of math</h2>
      <p>
        When every part of a system talks directly to every other, the connections someone has to understand grow
        with the square of the parts. Put one interface between them, and they grow only as fast as the parts:
      </p>
      <Numbers
        items={[5, 10, 30].map((n) => ({
          label: `${n} parts`,
          value: `${everyPair(n)} → ${throughOne(n)}`,
          note: 'connections',
        }))}
      />
      <p>
        That interface is an <strong>abstraction</strong>: a simple front hiding a lot of detail, the way SQL hides how
        a database stores things on disk. Complexity the problem itself doesn’t need, that only comes from how it was
        built, is <strong>accidental complexity</strong>, and abstractions are the best tool for removing it.
      </p>

      <h2>Try it</h2>
      <Figure caption="Add parts and watch the wiring. Every part to every other turns into a tangle long before the system is big; through one interface, it stays a ring.">
        <Connections parts={parts} through={wiring === WIRING[1]} />
        <Controls>
          <Slider label="Parts" value={parts} min={2} max={30} onChange={setParts} />
          <Choice label="Wiring" options={WIRING} value={wiring} onChange={setWiring} />
        </Controls>
      </Figure>

      <Predict
        kicker="Quick check"
        question="Which of these is accidental complexity in a payroll system?"
        options={[
          { label: 'The tax rules it must follow' },
          { label: 'Paying people in several currencies' },
          { label: 'Three date formats, and nobody knows why', right: true },
          { label: 'Different rules in each country' },
        ]}
        reveal={
          <>
            Tax rules, currencies and countries are the problem itself: essential complexity, which no design can
            remove. Three date formats for no reason come only from how the system was built, so a better design
            could take them away.
          </>
        }
      />

      <h2>What engineers do</h2>
      <ul>
        <li>
          <strong>For operability:</strong> good monitoring, automation, machines that can be taken down without the
          service noticing, clear documentation, sensible defaults that can be overridden, and behaviour without
          surprises.
        </li>
        <li>
          <strong>For simplicity:</strong> find the accidental complexity and hide what remains behind good
          abstractions.
        </li>
        <li>
          <strong>For evolvability:</strong> keep it simple, because simple systems are the easy ones to change. Moving
          Twitter’s timelines from{' '}
          <Link to="/learnings/describing-load" className="text-sage">
            collecting on read to delivering on post
          </Link>{' '}
          is the kind of change a system should be able to take.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="Your team’s service can only be restarted by one engineer who knows the steps by heart. Which property is weakest?"
        options={[
          { label: 'Operability', right: true },
          { label: 'Simplicity' },
          { label: 'Evolvability' },
          { label: 'Scalability' },
        ]}
        reveal={
          <>
            Keeping it running depends on one person’s memory. Good operability means routine tasks are easy and
            written down, so knowledge of the system survives people coming and going.
          </>
        }
      />
    </Article>
  )
}
