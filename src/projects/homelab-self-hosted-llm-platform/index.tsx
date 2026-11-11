import { Link } from 'react-router-dom'
import { Bars } from '../../components/case/Bars'
import CaseStudy from '../../components/case/CaseStudy'
import { Decision } from '../../components/case/Decision'
import { Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import type { Project } from '../../types'
import GpuMemory from './GpuMemory'
import RequestFlow from './RequestFlow'

// Every number here is from the homelab repo's write-ups (docs/03–17) and
// manifests (apps/llm, infra/gpu, apps/website-db).
export default function Homelab({ project }: { project: Project }) {
  return (
    <CaseStudy
      project={project}
      pitch="This website, its database, its monitoring and two AI models all run on one laptop in Henry’s home, with nothing on it open to the internet."
      problem="The site’s API ran on Google Cloud Run and its database on a free Neon plan in Virginia. Henry wanted to learn to run production himself, and to add two AI models without a monthly bill."
      did="Moved the API and the database onto one laptop running Kubernetes, ran everything in the cluster from Git, and fit two language models onto its single 8 GB graphics card."
      result="The API got faster (median 428 → 182 ms), both models fit with 0.4 GB to spare, and a restore drill proved the backups come back."
      stats={[
        { value: 2, label: 'language models', note: 'on one 8 GB laptop GPU' },
        { value: 182, suffix: ' ms', label: 'median API response', note: 'was 428 ms' },
        { value: 0, label: 'ports open to the internet', note: 'visitors come in through a tunnel' },
      ]}
      learned={
        <>
          Sharing a GPU is a memory problem more than a scheduling one. Taking turns is easy; the work is deciding how
          many megabytes each model may ever hold, and proving it with a measurement.
        </>
      }
    >
      <h2>What happens when you visit</h2>
      <p>
        Before the decisions, the shape of the thing. Follow one request, say a question to the Ask chat on this site,
        from your browser to the laptop and back.
      </p>
      <Steps
        say={[
          <>You ask the site a question. Your browser sends it to api.yarikama.com.</>,
          <>
            It reaches <strong>Cloudflare</strong> first, which handles encryption and turns away floods of traffic.
            Henry’s home has no door open to the street.
          </>,
          <>
            Instead, the laptop called Cloudflare first and kept the line open: a <strong>tunnel</strong>. Your request
            rides into the house along that line.
          </>,
          <>Inside, the API, running on Kubernetes (k3s), reads Henry’s projects from Postgres on the same machine.</>,
          <>
            For the Ask chat, it hands your question to a 4-billion-parameter model on the GPU, and streams the answer
            back a few words at a time.
          </>,
          <>
            Meanwhile, every change to the database is shipped off to Cloudflare R2 storage, so the data outlives the
            laptop.
          </>,
        ]}
      >
        {(step) => <RequestFlow step={step} />}
      </Steps>

      <h2>Two models, one graphics card</h2>
      <p>
        The site has two AI features. When Henry writes a note, a small model (0.8B parameters) suggests the next
        words. When you use Ask, a larger one (4B, compressed to 4 bits) answers questions about his work. The laptop
        has one GPU with 8 GB of memory.
      </p>
      <p>
        Think of the GPU as a kitchen with one counter. Two cooks can take turns at the stove, but taking turns does
        nothing about counter space: if one cook spreads out, the other has nowhere to put a plate, and drops it. On a
        GPU, the plate dropping is a crash.
      </p>

      <Decision
        n={1}
        question="How should two models share one 8 GB GPU?"
        options={[
          { label: 'Split the card in hardware (MIG)', why: 'The RTX 4060 doesn’t support it.' },
          { label: 'NVIDIA MPS', why: 'Splits memory evenly, 4 GB each: too little for the chat model.' },
          { label: 'HAMi', why: 'Made for jobs that truly run at once, and a compatibility risk with vLLM.' },
          {
            label: 'vLLM sleep mode',
            why: 'Parks the weights in about 5 GB of system RAM, and Kubernetes can’t see the memory it frees.',
          },
          {
            label: 'Time-slicing, hand-set budgets, priorities',
            why: 'Two slices of one card; a fixed memory budget for each model; a rule for who steps aside.',
            chosen: true,
          },
        ]}
      >
        <p>
          Time-slicing lets both models sit on the card, but it <strong>doesn’t isolate memory</strong>. So Henry
          measured each model and gave it a fixed share: 31% of the card for autocomplete, 65% for the chat model,
          together under 95%.
        </p>
        <p>
          Priorities settle the rest. A batch job outranks autocomplete, which outranks the chat. All three are set below
          zero on purpose: anything without a class sits at zero, so a batch job can push a model aside but never the
          database.
        </p>
      </Decision>

      <Steps
        say={[
          <>About 7.6 GB of the card is usable. Each model needs its weights, plus a cache for the text it is working on.</>,
          <>
            Autocomplete takes 2.3 GB: 1.68 GB of weights and a 0.42 GB cache, enough for about 19,000 tokens of text.
          </>,
          <>The chat model takes 4.9 GB: 3.28 GB of weights and a 1.04 GB cache. Together 7.2 GB, with 0.4 GB spare.</>,
          <>
            The catch: started together, each model measured free memory <em>while the other was loading</em>, found
            none, and crashed. The fix was to give each cache a fixed size instead of “whatever is free”.
          </>,
          <>
            When a batch job needs the whole card, Kubernetes moves the models off by priority. In a drill, the job
            had the card 3 seconds after it asked.
          </>,
          <>When the job finished, the model came back by itself and was answering again 2 minutes 10 seconds later.</>,
        ]}
      >
        {(step) => <GpuMemory step={step} />}
      </Steps>

      <Decision
        n={2}
        question="Which model should answer visitors’ questions?"
        options={[
          { label: 'Qwen3.5-2B (FP8)', why: 'Invented facts, such as a job at Google Singapore.' },
          {
            label: 'Qwen3-4B (4-bit)',
            why: 'Got his university wrong, answered Chinese questions in English 15% of the time, and ran out of room past 12k tokens.',
          },
          { label: 'Qwen3.5-4B (4-bit)', why: 'Accurate on the test set, and fits a 24k-token context.', chosen: true },
        ]}
      >
        <p>
          Henry tested all three on the same 40 questions about his work. The deciding detail was memory per token of
          text: <strong>147 KB for Qwen3 against 32 KB for Qwen3.5</strong>. The same 1 GB cache holds over four times
          as much conversation.
        </p>
      </Decision>

      <Decision
        n={3}
        question="How does the chat model find the right facts about Henry?"
        options={[
          { label: 'Vector search (RAG)', why: 'Can miss the one page that answers the question.' },
          { label: 'Keyword search', why: 'Fails when the question and the page are in different languages.' },
          { label: 'Let the model search', why: 'More to attack, and 3–5× slower.' },
          {
            label: 'Put the whole site in the prompt',
            why: 'It is only about 8,000 tokens. Nothing can be missed.',
            chosen: true,
          },
        ]}
      >
        <p>
          Search makes sense when the library is big. This one fits on a few pages, so the model reads all of it every
          time. Reading it once and keeping the result (prefix caching) makes that cheap: the first word of an answer
          arrives in <strong>3.93 s</strong> cold, and <strong>0.17 s</strong> once cached.
        </p>
      </Decision>

      <h2>Moving the database home</h2>
      <Predict
        question="The API already ran on the laptop at Henry’s home; the database was a cloud service in Virginia. Henry moved the database onto the laptop too. What happened to the API’s speed?"
        options={[
          { label: 'Slower: a laptop is no data centre' },
          { label: 'About the same' },
          { label: 'Over twice as fast', right: true },
          { label: 'Ten times as fast' },
        ]}
        reveal={
          <>
            The median response went from 428 ms to 182 ms. Each database query had been crossing the country and back,
            about 57 ms a trip, and a request makes several. It is a chef whose fridge was in another city.
          </>
        }
      />
      <Figure caption="Median response of one API endpoint, measured from Henry’s Mac through Cloudflare, before and after the database move.">
        <Bars
          better="lower"
          unit=" ms"
          bars={[
            { label: 'Database in Virginia', value: 428 },
            { label: 'Database on the laptop', value: 182, accent: true },
          ]}
        />
      </Figure>

      <Decision
        n={4}
        question="How should Postgres run, with only one machine?"
        options={[
          { label: 'A hand-written StatefulSet', why: 'Simple, but no way back to a moment before a mistake.' },
          { label: 'CloudNativePG with a replica', why: 'A copy on the same disk dies with the disk.' },
          {
            label: 'CloudNativePG, one instance, backups to R2',
            why: 'Every change shipped off-site; restore to any moment in the last 30 days.',
            chosen: true,
          },
        ]}
      >
        <p>
          The operator costs about 300 MB of memory and buys <strong>point-in-time recovery</strong>. A second copy on
          the same laptop would add little, so durability comes from off-site storage instead.
        </p>
        <p>
          Before switching the site over, he ran a restore drill: build a fresh database from the backups alone, and
          check it. In his notes: a backup you haven’t restored isn’t a backup. All 7 tables matched, including a
          marker row that could only have come back through the change log.
        </p>
      </Decision>

      <Numbers
        items={[
          { label: 'Database move', value: '0 errors', note: '68 of 68 requests' },
          { label: 'Merge to live', value: '292 s', note: 'through Git and Argo CD' },
          { label: 'Real restore', value: '2 min 17 s', note: 'of downtime, later' },
        ]}
        words
      />

      <h2>What broke, and what it taught</h2>
      <ul>
        <li>
          <strong>The first request after five quiet minutes failed, and looked like a CORS error.</strong> The cloud
          database had closed idle connections; the error page carried no CORS headers, so the browser blamed the wrong
          thing. The fix was to test a connection before using it. His note: curl retries, a visitor only gets one try.
        </li>
        <li>
          <strong>Projects came back in a different order after the move.</strong> The query had no ORDER BY, and the
          restore had changed how rows sat on disk. An order nobody asked for is an order nobody promised.
        </li>
        <li>
          <strong>A kernel update stopped Postgres for about 12 minutes.</strong> A security-module bug blocked
          processes from signalling each other. He pinned the kernel and wrote it up.
        </li>
      </ul>
      <p>
        Prometheus watches the inside and sends alerts by email. Two outside services notice when the laptop goes
        quiet altogether, as one did when a power flicker took the home Wi-Fi down for 14 minutes.
      </p>
      <p>
        Three lab notes go further: how <Link to="/notes/two-llms-on-one-8gb-laptop-gpu">the two models share one
        GPU</Link>, <Link to="/notes/why-my-portfolio-chatbot-uses-cag-not-rag">why the chat reads the whole site
        instead of searching it</Link>, and how <Link to="/notes/gitops-and-disaster-recovery-on-single-node-k3s">the
        cluster runs from Git and came back in a restore drill</Link>.
      </p>
    </CaseStudy>
  )
}
