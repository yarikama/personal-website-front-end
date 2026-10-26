import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Button, Choice, Controls, Figure } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import CopiesDiagram from './CopiesDiagram'
import { APP, RESTAURANT, write, type Copies } from './model'

const YES_NO = ['Yes', 'No'] as const
const CRASH = ['Finishes', 'Crashes after the database'] as const

const BEFORE: Copies = { database: 8, cache: 8, index: 8 }
const RAISED: Copies = { database: 9, cache: 8, index: 8 }
const FIXED: Copies = { database: 9, cache: 9, index: 9 }

// Where chapter 1 goes from here
const NEXT = [
  { slug: 'faults-and-failures', title: 'Faults and failures', about: 'Reliability: keep working when parts don’t' },
  { slug: 'describing-load', title: 'Describing load', about: 'Scalability: the numbers that drive your costs' },
  { slug: 'percentiles', title: 'Percentiles', about: 'Scalability: why the average describes nobody' },
  { slug: 'tail-latency-amplification', title: 'Tail latency amplification', about: 'Scalability: why rare slowness is common' },
  { slug: 'scaling-up-and-out', title: 'Scaling up and out', about: 'Scalability: a bigger machine or more machines' },
  { slug: 'maintainability', title: 'Maintainability', about: 'Easy to run, to understand and to change' },
]

export default function DataSystems() {
  const [copies, setCopies] = useState<Copies>(BEFORE)
  const [updateCache, setUpdateCache] = useState<(typeof YES_NO)[number]>('No')
  const [updateIndex, setUpdateIndex] = useState<(typeof YES_NO)[number]>('Yes')
  const [crash, setCrash] = useState<(typeof CRASH)[number]>(CRASH[0])

  const change = () =>
    setCopies((before) =>
      write(before, before.database + 1, {
        updateCache: updateCache === 'Yes',
        updateIndex: updateIndex === 'Yes',
        crash: crash === CRASH[1],
      })
    )

  return (
    <Article
      kicker="Data systems · Foundations"
      title="Data systems are built from parts"
      promise="When you put a database, a cache and a search index together, who keeps them in agreement?"
      takeaway={
        <>
          Put a database, a cache and a search index together and you’ve designed a <em>data system</em>. Keeping its
          copies in step is your job now.
        </>
      }
      sources={[
        {
          title: 'Designing Data-Intensive Applications',
          by: 'Martin Kleppmann, 2017',
          part: 'Chapter 1, “Thinking About Data Systems”',
          url: 'https://dataintensive.net/',
        },
      ]}
    >
      <Predict
        question="Your app saves a new price in the database. The cache still holds the old one. Who updates the cache?"
        options={[
          { label: 'The database, automatically' },
          { label: 'The cache notices by itself' },
          { label: 'Your application code', right: true },
          { label: 'Nobody needs to' },
        ]}
        reveal={
          <>
            Neither the database nor the cache knows the other exists. The code that put them together is the only
            thing that can keep them in agreement. A restaurant shows what that means.
          </>
        }
      />

      <h2>One price, three places</h2>

      <Steps
        say={[
          <>A restaurant keeps its prices in the kitchen ledger. That’s the <em>database</em>: the one true record.</>,
          <>
            Looking things up in the ledger is slow, so a board by the door shows today’s prices. That’s a{' '}
            <em>cache</em>: a fast copy.
          </>,
          <>
            Menus on every table let people find a dish by name. That’s a <em>search index</em>: another copy, arranged
            for searching.
          </>,
          <>The chef raises the soup to $9 in the ledger. Nobody touches the board or the menus. Customers see $8.</>,
          <>Keeping the copies in step isn’t the ledger’s job. It’s whoever runs the restaurant.</>,
          <>
            In your app, that’s your code. Combine a database, a cache and a search index, and you’ve built a new data
            system, with promises only you can keep.
          </>,
        ]}
      >
        {(step) => (
          <CopiesDiagram
            names={step === 5 ? APP : RESTAURANT}
            copies={step <= 2 ? BEFORE : step === 3 ? RAISED : FIXED}
            shown={step === 0 ? ['database'] : step === 1 ? ['database', 'cache'] : ['database', 'cache', 'index']}
            owner={step >= 4}
          />
        )}
      </Steps>

      <h2>The idea in one line</h2>
      <p>
        Every copy you add makes reads faster or more flexible, and adds one more thing to update on every write,
        which can be forgotten or fail halfway. Tools like these are often called <strong>data systems</strong>, and
        once you combine them behind your own API, you are a data system designer too: your API now promises things
        like “the board never shows a price older than the ledger”.
      </p>

      <h2>Try it</h2>
      <p>Choose what your code updates when the price changes, then change it.</p>
      <Figure caption="Forget a copy, or crash halfway, and that copy keeps the old price until something puts it right. Nothing in the database or the cache will notice on its own.">
        <CopiesDiagram
          names={APP}
          copies={copies}
          owner
          updates={{ cache: updateCache === 'Yes', index: updateIndex === 'Yes' }}
        />
        <Controls>
          <Choice label="Update the cache" options={YES_NO} value={updateCache} onChange={setUpdateCache} />
          <Choice label="Update the search index" options={YES_NO} value={updateIndex} onChange={setUpdateIndex} />
          <Choice label="Your code" options={CRASH} value={crash} onChange={setCrash} />
        </Controls>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button onClick={change}>Raise the price</Button>
          <Button onClick={() => setCopies(BEFORE)}>Start over</Button>
        </div>
      </Figure>

      <Predict
        kicker="Quick check"
        question="You put a cache in front of your database and promise users fresh prices. Which promise is now yours, not the database’s?"
        options={[
          { label: 'Data on disk survives a power cut' },
          { label: 'The cache never shows a price older than the database', right: true },
          { label: 'Queries are parsed correctly' },
          { label: 'Indexes make lookups fast' },
        ]}
        reveal={
          <>
            The database keeps its own promises about its own data. Whether the cache agrees with it is a promise
            about the combination, so it belongs to whoever combined them: you.
          </>
        }
      />

      <h2>What engineers worry about</h2>
      <p>
        Designing a data system raises the questions the rest of the book answers. Will the data stay correct when
        something goes wrong inside? Will it stay fast as it grows? Can people keep working on it? Those are the
        three concerns of chapter 1:
      </p>
      <ul className="not-prose my-8 flex flex-col divide-y divide-zinc-200 dark:divide-zinc-200/20 border-y border-zinc-200 dark:border-zinc-200/20">
        {NEXT.map((page) => (
          <li key={page.slug}>
            <Link to={`/learnings/${page.slug}`} className="group flex items-baseline justify-between gap-4 py-4">
              <span className="font-serif text-xl text-ink group-hover:text-sage transition-colors">{page.title}</span>
              <span className="text-right text-sm text-zinc-faded">{page.about}</span>
            </Link>
          </li>
        ))}
      </ul>

      <Predict
        kicker="Check yourself"
        question="Your code writes the new price to the database, then to the search index, and crashes in between. What does someone searching see?"
        options={[
          { label: 'The new price' },
          { label: 'The old price', right: true },
          { label: 'An error' },
          { label: 'No results' },
        ]}
        reveal={
          <>
            The index never got the new price, so it still answers with the old one, until something notices and puts
            it right. Making several writes act as one, or deriving the copies from the database’s own log of changes,
            are problems the later chapters take on.
          </>
        }
      />
    </Article>
  )
}
