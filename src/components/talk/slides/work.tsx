import {
  Blocks,
  Bot,
  CircleX,
  History,
  IterationCw,
  Layers,
  Lightbulb,
  Link,
  ListChecks,
  MessageSquare,
  Plug,
  Ticket,
} from 'lucide-react'
import { CaseGrid, ContextWindow, FailurePatterns, MemoryCostCurve, TestArchitecture } from '../figures'
import PlatformMap from '../PlatformMap'
import { Decision, Flow, Lead, Outline, Reveal, SlideLayout, Stat } from '../primitives'
import type { SlideDef } from '../talk'

// One story per company, each told in the four steps from the method slide.
// Figures come from src/data/experience.ts; anything else is marked to fill in.

export const work: SlideDef[] = [
  {
    id: 'outline-work',
    title: 'Outline: work',
    section: 'work',
    notes: ['Two stories from work, one from each company.'],
    render: () => <Outline active="work" />,
  },

  // Google: one source of truth for integration tests, then agents on top
  {
    id: 'google-why',
    title: 'Google: why',
    section: 'work',
    notes: [
      'I joined Google Home EngProd, on the Virtual Home team. Our job: build infrastructure that speeds up development for the Google Home testing team.',
      'Integration tests needed hard-coded, device-specific Java for every device type. They covered at most 15 cases.',
      'Every new device type meant someone writing more Java before it had any integration coverage.',
    ],
    render: () => (
      <SlideLayout
        eyebrow="Google · Why" kind="why"
        headline={
          <>
            Every device type needed a <em>hand-written</em> integration test.
          </>
        }
      >
        <Lead>
          On Google Home EngProd&rsquo;s Virtual Home team, I built test infrastructure to speed up development for
          the Google Home testing team. Integration tests were hard-coded, device-specific Java.
        </Lead>
        <div className="mt-12 grid grid-cols-3 gap-12">
          <Stat value="15" label="Cases covered, at most" detail="Each one hard-coded in Java" />
        </div>
      </SlideLayout>
    ),
  },
  {
    id: 'google-breakdown',
    title: 'Google: break it down',
    section: 'work',
    steps: 2,
    notes: [
      'First principles: what is an integration test case made of? A description of the case, and code that runs it.',
      'Before: the e2e tests already described every case in a protobuf. Integration tests described the same cases again, by hand, in Java per device. At most 15 cases.',
      'After: one set of protobufs, read by the e2e tests and by three integration infrastructures, one per service: tenancy, home connection, device setup. 402+ cases.',
      'The cost was the duplicate definition, not the testing. Remove it, and coverage follows the protobufs for free.',
    ],
    render: () => (
      <SlideLayout eyebrow="Google · Break it down" kind="breakdown" headline="The test cases already existed. They were written twice.">
        <TestArchitecture afterAt={1} />
        <Reveal at={2}>
          <Lead className="mt-10 text-ink-light">
            Remove the second definition, and integration coverage follows the protobufs for free.
          </Lead>
        </Reveal>
      </SlideLayout>
    ),
  },
  {
    id: 'google-tradeoff',
    title: 'Google: trade-off',
    section: 'work',
    notes: [
      'Option one: keep writing device-specific Java. Full control per device, but new code for every type, and it had reached at most 15 cases.',
      'Option two, chosen: the infrastructure reads the e2e protobufs directly, so one definition drives both e2e and integration tests.',
      'The one real cost: a few fine-grained, complex tests need extra logic the protobuf cannot express. Those edge cases are rare.',
      'And I did not remove the old architecture. It still runs alongside, so nothing was given up.',
    ],
    render: () => (
      <SlideLayout eyebrow="Google · Trade-off" kind="tradeoff" headline="Where should a test case live?">
        <Decision
          question="One case, defined where?"
          options={[
            {
              name: 'Device-specific Java',
              gains: ['Full control over each device'],
              costs: ['New code for every device type', 'At most 15 cases covered'],
            },
            {
              name: 'E2E protobufs',
              chosen: true,
              gains: ['One source of truth for e2e and integration', 'Every existing case covered at once'],
              costs: ['A few complex tests need extra logic'],
            },
          ]}
        />
        <Lead className="mt-14 text-ink-light">
          Those edge cases are rare, and the old Java path still runs alongside, so nothing was given up.
        </Lead>
      </SlideLayout>
    ),
  },
  {
    id: 'google-agent',
    title: 'Google: the triage agent',
    section: 'work',
    steps: 1,
    notes: [
      'With 402+ cases running on a schedule, failures come in faster than people can read them. So I built a triage agent on top.',
      'First principles: the first question about any failure is whether one device broke or the whole service broke.',
      'The integration runs give us history, so the agent reads past success rates: one device dropping alone is a device issue; every device dropping at once is a service issue.',
      'Then it picks the skill for that kind of failure, and posts a report on the ticket with the URL to the error details and a likely cause.',
      'The pictures are an illustration of the two patterns, not real data.',
    ],
    render: () => (
      <SlideLayout
        eyebrow="Google · The agent"
        kind="breakdown"
        headline={
          <>
            Past success rates tell a broken device from a broken <em>service</em>.
          </>
        }
      >
        <div className="max-w-[46rem]">
          <FailurePatterns />
        </div>
        <Reveal at={1} className="mt-8">
          <Flow
            items={[
              {
                label: 'Failed run',
                text: 'A scheduled integration run goes red',
                icon: <CircleX size={36} strokeWidth={1.25} aria-hidden="true" />,
              },
              {
                label: 'Past success rates',
                text: 'One device dropping, or every device at once?',
                icon: <History size={36} strokeWidth={1.25} aria-hidden="true" />,
                hot: true,
              },
              {
                label: 'Skill',
                text: 'Picks the skill for that kind of failure',
                icon: <Blocks size={36} strokeWidth={1.25} aria-hidden="true" />,
              },
              {
                label: 'Report',
                text: 'On the ticket: the error URL and a likely cause',
                icon: <Ticket size={36} strokeWidth={1.25} aria-hidden="true" />,
              },
            ]}
          />
        </Reveal>
      </SlideLayout>
    ),
  },
  {
    id: 'google-agent-eval',
    title: 'Google: evaluating the agent',
    section: 'work',
    notes: [
      'An agent that triages tests needs tests of its own, so I added an eval for the agent.',
      'It checks three things: did the agent pick the right skill, does the report give the URL to the error details, and does it name a likely cause.',
      'Those are the three things an engineer needs from the report, so they are what the eval checks.',
    ],
    render: () => (
      <SlideLayout
        eyebrow="Google · Agent eval"
        headline={
          <>
            An agent that triages tests needs <em>tests</em> of its own.
          </>
        }
      >
        <Flow
          arrows={false}
          items={[
            {
              label: 'Right skill',
              text: 'Did it pick the right skill for this failure?',
              icon: <ListChecks size={44} strokeWidth={1.25} aria-hidden="true" />,
              hot: true,
            },
            {
              label: 'Error URL',
              text: 'Does the report link to the error details?',
              icon: <Link size={44} strokeWidth={1.25} aria-hidden="true" />,
            },
            {
              label: 'Likely cause',
              text: 'Does it name a likely cause?',
              icon: <Lightbulb size={44} strokeWidth={1.25} aria-hidden="true" />,
            },
          ]}
        />
        <Lead className="mt-16 text-ink-light">
          These are the three things an engineer needs from a triage report, so they are what the agent is checked on.
        </Lead>
      </SlideLayout>
    ),
  },
  {
    id: 'google-result',
    title: 'Google: result',
    section: 'work',
    notes: [
      'Three integration test infrastructures, one per service: multi-tenancy, home connection setup and device setup. Java and Python, all reading the e2e protobufs.',
      '402+ cases at once, up from at most 15: 200+ devices, plus multi-device placement and multi-tenant cases.',
      'Then the agent on top: it reads past success rates, picks a skill, and posts a report with the error URL and a likely cause on each failure ticket. 20+ minutes saved per issue.',
      'And NLP reproduction: paste a ticket, and the agent reproduces the failure on its own against virtual devices, instead of waiting on cloud runs. 85% less manual reproduction time.',
      'Shipped, and adopted by the team.',
      'If asked how 20+ minutes was measured: manual timings of narrowing down a failure, sampled from coworkers. 20+ minutes is the median.',
      'If asked about quality: the infrastructure itself has 90%+ unit test coverage.',
    ],
    render: () => (
      <SlideLayout
        eyebrow="Google · Result" kind="result"
        headline={
          <>
            One definition, 402+ cases, then <em>agents</em> on top.
          </>
        }
      >
        <div className="grid grid-cols-[auto_1fr] gap-20">
          <CaseGrid total={402} before={15} />
          <div className="space-y-10">
            <Stat value="20+ min" label="Saved per failure" detail="Triage agent posts the root cause on the ticket" />
            <Stat value="85%" label="Less reproduction time" detail="Paste a ticket; the agent reproduces it. Adopted by the team." />
          </div>
        </div>
        <p className="mt-8 font-mono text-[15px] text-zinc-400 uppercase tracking-widest">
          3 infrastructures, one per service: tenancy, home connection, device setup
        </p>
      </SlideLayout>
    ),
  },

  // MaiAgent: from chatbots to agents
  {
    id: 'maiagent-why',
    title: 'MaiAgent: why',
    section: 'work',
    notes: [
      'MaiAgent is a 10-person B2B GenAI startup. Clients include CTBC Bank, MSI, HPE and iGroup.',
      'Our chatbots answered questions. Clients wanted assistants that could work with their own systems.',
      'As GenAI team lead, I turned the chatbots into agents that clients deploy with their own APIs and tools.',
    ],
    render: () => (
      <SlideLayout
        eyebrow="MaiAgent · Why" kind="why"
        headline={
          <>
            Clients needed agents that <em>act</em> through their own APIs.
          </>
        }
      >
        <Lead>
          MaiAgent is a 10-person B2B GenAI startup serving clients like CTBC Bank, MSI and HPE. As GenAI team lead,
          I turned our chatbots into agents that clients deploy with their own APIs and tools.
        </Lead>
        <div className="mt-14">
          <Flow
            items={[
              {
                label: 'Chatbot',
                text: 'Answers questions',
                icon: <MessageSquare size={44} strokeWidth={1.25} aria-hidden="true" />,
              },
              {
                label: 'Agent',
                text: 'Calls the client’s own APIs and tools to get work done',
                icon: <Bot size={44} strokeWidth={1.25} aria-hidden="true" />,
                hot: true,
              },
            ]}
          />
        </div>
      </SlideLayout>
    ),
  },
  {
    id: 'maiagent-platform',
    title: 'MaiAgent: the platform',
    section: 'work',
    steps: 3,
    notes: [
      'This is everything I built or led at MaiAgent, following one file from upload to a cited answer.',
      'Ingest: files are parsed into documents, then chunks. Each chunk keeps its source, which is what the citations point back to.',
      'Data: relational and vector databases in sync, with metadata filtering and permissions per knowledge base.',
      'Retrieval: dense and sparse embeddings fused with RRF, then a reranker, over several chunk split strategies.',
      'Agent: tools, the async workflow, memory, and the canvas agent as one example of what runs on it. Memory and tools get the next slides.',
      'Eval wraps all of it: RAGAS for retrieval and answers, DeepEval for task completion and tool correctness.',
      'In the Q&A, click any block on the map to open its details and numbers.',
    ],
    render: () => (
      <SlideLayout
        eyebrow="MaiAgent · The platform"
        headline={
          <>
            From an uploaded file to a <em>cited</em> answer.
          </>
        }
      >
        <PlatformMap />
      </SlideLayout>
    ),
  },
  {
    id: 'maiagent-breakdown',
    title: 'MaiAgent: break it down',
    section: 'work',
    steps: 4,
    notes: [
      'First principles: what does an agent add to a chatbot? Something to remember with, something to act with, and a loop that decides what to do next.',
      'Tools: our own tool APIs and an MCP client, and clients can pass their own APIs at runtime.',
      'The loop is an async workflow. Inside it, the agent decides whether to ask a human, call another agent, or take the next step itself.',
      'Every part ends up in the prompt, and the prompt is what we pay for. Of these terms, history is the one that grows with every turn.',
    ],
    render: () => (
      <SlideLayout eyebrow="MaiAgent · Break it down" kind="breakdown" headline="An agent is a chatbot plus memory, tools and a loop.">
        <Flow
          reveal
          items={[
            {
              label: 'Memory',
              text: 'Short, mid and long term, one set per conversation',
              icon: <Layers size={44} strokeWidth={1.25} aria-hidden="true" />,
            },
            {
              label: 'Tools',
              text: 'Our tool APIs and MCP, plus clients’ own APIs at runtime',
              icon: <Plug size={44} strokeWidth={1.25} aria-hidden="true" />,
            },
            {
              label: 'Loop',
              text: 'An async workflow: the agent decides to ask a human, call another agent, or take the next step',
              icon: <IterationCw size={44} strokeWidth={1.25} aria-hidden="true" />,
            },
          ]}
        />
        <Reveal at={4} className="mt-14">
          <p className="font-mono text-[24px] leading-relaxed text-ink-light">
            tokens per turn = system prompt + <span className="text-sage">history</span> + retrieved context + tool
            definitions
          </p>
          <p className="mt-3 text-[21px] text-zinc-faded">History is the term that grows with every turn.</p>
        </Reveal>
      </SlideLayout>
    ),
  },
  {
    id: 'maiagent-memory',
    title: 'MaiAgent: trade-off, memory',
    section: 'work',
    steps: 2,
    notes: [
      'The existing design, not mine: on every turn, pull every message in the conversation and have an LLM summarize them one by one. Over a conversation that costs 1 + 2 + ... + N: the grey curve.',
      'Mine condenses each message once, so the work grows in a straight line, and the gap widens with every turn. That is why 67% is a rough number: longer conversations save more. This is a picture of the shapes, not measured data.',
      'How: three tiers, one set per conversation. Short term keeps the most recent messages, up to 20% of the context window.',
      'When it overflows, the oldest messages are pushed into a buffer, which condenses each one together with its running history into a fixed-length summary, in the background, so the user never waits and the buffer never grows.',
      'Messages pushed out of short term also go into a vector database, and relevant ones are recalled into 10% of the window.',
      'The cost: more moving parts, a buffer, a background job and a vector store per conversation. The conversations felt better, too.',
    ],
    render: () => (
      <SlideLayout eyebrow="MaiAgent · Trade-off" kind="tradeoff" headline="Condense each message once, not on every turn.">
        <div className="grid grid-cols-[1fr_24rem] gap-16 items-start">
          <MemoryCostCurve newAt={1} />
          <Reveal at={2}>
            <ContextWindow />
          </Reveal>
        </div>
        <Reveal at={2}>
          <p className="mt-6 text-[20px] text-zinc-faded">
            <span className="font-mono text-[15px] text-zinc-400 uppercase tracking-widest mr-3">The cost</span>
            More moving parts: a buffer, a background job and a vector store per conversation.
          </p>
        </Reveal>
      </SlideLayout>
    ),
  },
  {
    id: 'maiagent-tools',
    title: 'MaiAgent: trade-off, tools',
    section: 'work',
    steps: 1,
    notes: [
      'If the model supports function calling, we use the function-calling API; if not, a ReAct agent. So any model a client picks can use tools.',
      'On top of that, clients pass a JSON schema at runtime and we build a Pydantic model from it, so when they deploy an agent they can plug in their own APIs.',
      'The cost: it is the riskier feature. A schema from outside is a way to inject instructions into the agent.',
      'That class of risk, tool metadata steering an agent, is exactly what the tool-schema poisoning project later in this talk looks at.',
    ],
    render: () => (
      <SlideLayout
        eyebrow="MaiAgent · Trade-off" kind="tradeoff"
        headline={
          <>
            Clients bring their own APIs, <em>at runtime</em>.
          </>
        }
      >
        <div className="space-y-10">
          <Decision
            question="How does the model call tools?"
            options={[
              {
                name: 'Function calling only',
                gains: ['Structured, reliable calls'],
                costs: ['Models without it cannot use tools'],
              },
              {
                name: 'Function calling, else ReAct',
                chosen: true,
                gains: ['Every model can use tools'],
                costs: ['Two calling paths to maintain'],
              },
            ]}
          />
          <Reveal at={1}>
            <Decision
              question="Where do tools come from?"
              options={[
                {
                  name: 'Tools we build in',
                  gains: ['We control every call'],
                  costs: ['Engineering work for every client system'],
                },
                {
                  name: 'Client JSON schema',
                  chosen: true,
                  gains: ['A Pydantic model built at runtime, so clients plug in their own APIs'],
                  costs: ['A new injection path into the agent'],
                },
              ]}
            />
          </Reveal>
        </div>
      </SlideLayout>
    ),
  },
  {
    id: 'maiagent-result',
    title: 'MaiAgent: result',
    section: 'work',
    notes: [
      'Partners grew 120%. Users went from 3K to 20K.',
      '67% is a rough figure. With larger context windows the saving is far bigger, because the old cost grew with the square of the conversation length.',
      'Then I added a canvas agent: Redis and WebSocket carry its render signals to the frontend, with citations.',
      "And CTBC Bank's customer-facing service agent: I designed its agentic workflow with the bank's product owners and engineers, and it shipped to production.",
    ],
    render: () => (
      <SlideLayout
        eyebrow="MaiAgent · Result" kind="result"
        headline={
          <>
            More clients, more users, <em>far fewer</em> tokens.
          </>
        }
      >
        <div className="grid grid-cols-3 gap-12">
          <Stat value="+120%" label="Partners" detail="CTBC Bank, MSI, HPE, iGroup" />
          <Stat value="20K" label="Users" detail="Up from 3K" />
          <Stat value="67%+" label="Fewer LLM tokens" detail="A rough figure; the saving grows with longer context" />
        </div>
        <Lead className="mt-12">
          Then a canvas agent that streams render signals and citations to the frontend over Redis and WebSocket.
          CTBC Bank&rsquo;s customer-facing service agent shipped to production.
        </Lead>
      </SlideLayout>
    ),
  },
]
