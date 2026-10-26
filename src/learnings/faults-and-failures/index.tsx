import { useState } from 'react'
import Article from '../../components/explain/Article'
import { Controls, Figure, Numbers, Slider } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import DiskYear from './DiskYear'
import Fleet from './Fleet'
import { deathsPerDay } from './model'

const DISKS = [100, 1_000, 10_000, 100_000]

export default function FaultsAndFailures() {
  const [scale, setScale] = useState(2)
  const [years, setYears] = useState(30)
  const disks = DISKS[scale]

  return (
    <Article
      kicker="Data systems · Reliability"
      title="Faults and failures"
      promise="How do you build a system that keeps working when its parts don’t?"
      takeaway={
        <>
          Faults are certain; failures are optional. Spares handle faults that hit one part at a time. Faults that hit{' '}
          <em>everything at once</em>, bugs and human mistakes, need testing, gradual rollouts and a fast way back.
        </>
      }
      sources={[
        {
          title: 'Designing Data-Intensive Applications',
          by: 'Martin Kleppmann, 2017',
          part: 'Chapter 1, “Reliability”',
          url: 'https://dataintensive.net/',
        },
      ]}
    >
      <Predict
        question="A hard disk lasts 10 to 50 years on average. You run 10,000 of them. How often does one die?"
        options={[{ label: 'Once a decade' }, { label: 'Once a year' }, { label: 'About once a day', right: true }, { label: 'Almost never' }]}
        reveal={
          <>
            10,000 disks that each last about 30 years lose 10,000 ÷ (30 × 365) ≈ one a day. At scale, broken hardware
            isn’t an accident; it’s the weather. So how does anything keep working? A delivery van shows how.
          </>
        }
      />

      <h2>A fleet of vans</h2>

      <Steps
        say={[
          <>Your delivery van gets a flat tire. One part stopped working: that’s a <em>fault</em>.</>,
          <>
            You fit the spare and the parcels still arrive on time. The delivery worked, so there was no{' '}
            <em>failure</em>.
          </>,
          <>Run 100 vans and flats become routine, somewhere most days. With spares, no customer ever notices.</>,
          <>
            Then a bad batch of tires, fitted to every van, splits on the same cold morning. Every spare is from that
            batch. Nothing arrives.
          </>,
          <>
            Or someone loads the wrong delivery list into every van. Nothing is broken, yet everything goes to the
            wrong place.
          </>,
          <>
            Servers are vans. A dead disk is a flat; a copy on another machine is the spare. A bug that crashes every
            server on the same input is the bad batch, and a wrong setting pushed everywhere is the wrong list.
          </>,
        ]}
      >
        {(step) => <Fleet step={step} />}
      </Steps>

      <h2>Three kinds of fault</h2>
      <p>
        A <strong>fault</strong> is one part going wrong; a <strong>failure</strong> is the whole system stopping
        doing its job. You can’t make faults impossible, so you stop them turning into failures. How depends on
        whether faults come one at a time or all at once:
      </p>
      <Numbers
        words
        items={[
          { label: 'Hardware', value: 'One at a time', note: 'random, independent' },
          { label: 'Software', value: 'All at once', note: 'same bug, every copy' },
          { label: 'Human', value: 'All at once', note: 'one change, everywhere' },
        ]}
      />
      <p>
        Hardware faults are random and independent, so spares and copies cover them. Bugs and mistakes are{' '}
        <strong>correlated</strong>: they hit every copy together, so more copies don’t help. In one study of large
        internet services, mistakes in configuration by operators caused more outages than anything else, while
        hardware played a part in only 10 to 25% of them.
      </p>

      <h2>See it at your scale</h2>
      <p>A year of disks dying, one square a day. Change how many you run and how long each lasts.</p>
      <Figure caption="With 100 disks, a death is a rare event. With 10,000, there’s one most days; with 100,000, about ten a day. At some size, replacing disks is just a routine job.">
        <DiskYear disks={disks} years={years} />
        <Controls>
          <Slider
            label="Disks"
            value={scale}
            min={0}
            max={DISKS.length - 1}
            onChange={setScale}
            format={(i) => DISKS[i].toLocaleString('en-US')}
          />
          <Slider label="Average life" value={years} min={10} max={50} onChange={setYears} format={(y) => `${y} years`} />
        </Controls>
      </Figure>
      <p>
        At {disks.toLocaleString('en-US')} disks that last {years} years, that’s{' '}
        {deathsPerDay(disks, years) < 1
          ? `one every ${Math.round(1 / deathsPerDay(disks, years))} days`
          : `${deathsPerDay(disks, years).toFixed(1)} a day`}
        .
      </p>

      <Predict
        kicker="Quick check"
        question="A bug crashes your server whenever it gets a date of 29 February. You run 3 copies for safety. What happens on 29 February?"
        options={[
          { label: 'One crashes, two carry on' },
          { label: 'All three crash', right: true },
          { label: 'Nothing: copies prevent it' },
          { label: 'They take turns crashing' },
        ]}
        reveal={
          <>
            Every copy runs the same code, so every copy meets the same date and crashes. Copies protect you from
            independent faults, not from correlated ones. (Bugs like this are real: a leap second in 2012 hung many
            Linux servers at the same moment.)
          </>
        }
      />

      <h2>What engineers do about it</h2>
      <ul>
        <li>
          <strong>For hardware, keep spares.</strong> Disks in pairs, two power supplies, and, more and more, whole
          machines that can be lost without the service noticing. That also lets you patch one machine at a time.
        </li>
        <li>
          <strong>For software, distrust your assumptions.</strong> Test thoroughly, isolate processes so one crash
          doesn’t take others with it, let crashed processes restart, and watch production for numbers that don’t
          add up.
        </li>
        <li>
          <strong>For humans, make mistakes cheap.</strong> Make the right thing easy, practise in a sandbox with real
          data, roll changes out to a few machines first, and keep a quick way to undo them.
        </li>
        <li>
          <strong>Break things on purpose.</strong> Netflix’s Chaos Monkey switches machines off at random, so the
          spares are tested every day rather than on the worst day.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="An engineer ships a setting with a typo, and every server starts rejecting logins. What would have helped most?"
        options={[
          { label: 'More servers' },
          { label: 'Faster disks' },
          { label: 'Rolling out to a few servers first, with a quick undo', right: true },
          { label: 'A second data centre' },
        ]}
        reveal={
          <>
            It’s a human fault, and correlated: the same setting went everywhere. More copies would all have the typo.
            Rolling out to a few servers first would have caught it on those few, and a quick undo shortens the
            outage.
          </>
        }
      />
    </Article>
  )
}
