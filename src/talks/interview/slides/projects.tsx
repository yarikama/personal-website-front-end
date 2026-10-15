import { ChartScatter, Crosshair, Globe, KeyRound, Route, ScanSearch, Search, Waypoints, Wrench } from 'lucide-react'
import { tieEnd } from '../../../lib/text'
import { IndexTradeoffBars, PivotScatter, PoisoningBars } from '../figures'
import { Credit, Decision, Flow, Lead, Reveal, SlideLayout, Stat } from '../../../components/talk/primitives'
import { TalkOutline } from './outline'
import type { SlideDef } from '../../../components/talk/talk'

// Two projects, told like the work stories. Facts and their limits follow
// resume_latex/content/bank/projects/: tool-schema-poisoning-defense.tex and
// agentic-hybrid-rag.tex (the CONSTRAINTS blocks there are binding).

export const projects: SlideDef[] = [
  {
    id: 'outline-projects',
    title: 'Outline: projects',
    section: 'projects',
    notes: ['Now two projects. Same shape: why, break it down, trade-off, result.'],
    render: () => <TalkOutline active="projects" />,
  },

  // Defending LLM agents against tool-schema poisoning
  {
    id: 'poisoning-why',
    title: 'Tool-schema poisoning: why',
    section: 'projects',
    notes: [
      'Agents call tools they did not write, and they trust the tool’s own description of what to send it.',
      'We reproduced an attack from prior work: deceptive parameter descriptions lead a function-calling agent to fill private data into an attacker’s tool.',
      'Baseline on Llama 3.1-8B over 100 attacks: 56% attack success, 52% privacy leakage.',
      'If asked how leakage is measured: the mean string similarity between the private values and what the attacker’s tool received. Not a share of tasks.',
      'If asked about the measurement: the upstream ReAct agent forced the attacker’s tool into every step. Replacing it with native function calling took gpt-5.4-nano from 86% to 49% attack success, before any defense.',
    ],
    render: () => (
      <SlideLayout
        eyebrow="Tool-schema poisoning · Why" kind="why"
        headline={
          <>
            Poisoned tool schemas make agents <em>leak</em> private data.
          </>
        }
      >
        <Lead>
          Agents trust tool metadata to decide what to send. We reproduced an attack where deceptive parameter
          descriptions lead a function-calling agent to fill private data into an attacker&rsquo;s tool.
        </Lead>
        <div className="mt-12 grid grid-cols-3 gap-12">
          <Stat value="56%" label="Attack success" detail="Llama 3.1-8B, 100 attacks" />
          <Stat value="52%" label="Privacy leakage" detail="Private data reaching the attacker’s tool" />
        </div>
        <div className="mt-12">
          <Credit
            team="Rice COMP 584 · 4-person team · Apr - May 2026"
            mine="the function-calling agent, the prompt-wrapper baseline, inference fixes, hidden-state probing, and the steering defense with its strength sweep."
          />
        </div>
      </SlideLayout>
    ),
  },
  {
    id: 'poisoning-breakdown',
    title: 'Tool-schema poisoning: break it down',
    section: 'projects',
    steps: 4,
    notes: [
      'First principles: what has to go wrong for data to leak? The agent has to call the attacker’s tool, and it has to fill private data into it.',
      'Those are separate failures. A defense can cut what gets filled without changing whether the tool gets called, so attack success alone misjudges a defense.',
      'Then: where does the leak show up in the model? I probed hidden states at five token positions across every layer.',
      'At layer 10, at the end of the generated tool call, a linear probe separates leaking from safe runs at 96%, matching an MLP probe. At the last input token it cannot.',
      'A linear split means one direction may be enough to steer along. The steering run is the causal test.',
      'If asked: 96% is 5-fold cross-validated accuracy on 112 runs, 56 per class.',
      'If asked about the stack: before any steering run I fixed four bugs in the Llama inference path (tool schemas never reaching the chat template, an attention mask hiding every turn separator, a follow-up call polluting the captured hidden states, a parser dropping nested JSON), then re-ran the baselines.',
    ],
    render: () => (
      <SlideLayout eyebrow="Tool-schema poisoning · Break it down" kind="breakdown" headline="A leak is two failures, so it needs two measures.">
        <Flow
          reveal
          hotAt={2}
          items={[
            {
              label: 'Call · attack success',
              text: 'The agent chooses the attacker’s tool',
              icon: <Wrench size={40} strokeWidth={1.25} aria-hidden="true" />,
            },
            {
              label: 'Fill · privacy leakage',
              text: 'It puts private values into that tool’s arguments',
              icon: <KeyRound size={40} strokeWidth={1.25} aria-hidden="true" />,
              hot: true,
            },
          ]}
        />
        <Reveal at={3}>
          <Lead className="mt-12 text-ink-light">
            A defense can cut one without the other, so I track both, plus task success.
          </Lead>
        </Reveal>
        <Reveal at={4} className="mt-12">
          <p className="flex items-center gap-2.5 font-mono text-[15px] text-sage uppercase tracking-widest">
            <ScanSearch size={20} strokeWidth={1.5} aria-hidden="true" />
            Where it shows up
          </p>
          <p className="mt-3 text-[23px] leading-snug text-ink-light">
            A linear probe separates leaking from safe runs at layer 10, at the end of the tool call:{' '}
            <span className="text-sage font-medium">96%</span>, as good as an MLP. One direction in the hidden
            states tracks the leak.
          </p>
        </Reveal>
      </SlideLayout>
    ),
  },
  {
    id: 'poisoning-tradeoff',
    title: 'Tool-schema poisoning: trade-off',
    section: 'projects',
    steps: 1,
    notes: [
      'Prompt level: a system prompt that makes the agent read every parameter description and leave out private data. It cut leakage, but raised attack success 6pp and lowered task success 6pp.',
      'Inside the model: add the mean difference between safe and leaking hidden states at layer 10 during inference. No fine-tuning and no extra prompt tokens; under a KV cache only the newest token is steered.',
      'The cost: it needs the hidden states, and the strength window is narrow. 5 helped; 10 and above broke the model, 0% task success.',
      'Why a mean difference: the linear probe matched the MLP probe, so a direction is enough, and a difference of class means needs no training.',
    ],
    render: () => (
      <SlideLayout eyebrow="Tool-schema poisoning · Trade-off" kind="tradeoff" headline="Defend in the prompt, or inside the model?">
        <div className="space-y-10">
          <Decision
            question="Where does the defense live?"
            options={[
              {
                name: 'Prompt wrapper',
                gains: ['Works through the system prompt alone'],
                costs: ['Extra prompt tokens on every call', 'Attack success up 6pp, task success down 6pp'],
              },
              {
                name: 'Activation steering',
                chosen: true,
                gains: ['No fine-tuning, no extra prompt tokens', 'Task success unchanged'],
                costs: ['Needs the model’s hidden states', 'Narrow window: strength 5 works, 10 breaks the model'],
              },
            ]}
          />
          <Reveal at={1}>
            <Decision
              question="What to steer along?"
              options={[
                {
                  name: 'A learned boundary',
                  gains: ['Can fit a nonlinear split'],
                  costs: ['Training, and no single direction to add'],
                },
                {
                  name: 'Mean difference',
                  chosen: true,
                  gains: ['Linear probe matched the MLP', 'Needs no training'],
                  costs: ['Strength tuned per model'],
                },
              ]}
            />
          </Reveal>
        </div>
      </SlideLayout>
    ),
  },
  {
    id: 'poisoning-result',
    title: 'Tool-schema poisoning: result',
    section: 'projects',
    steps: 1,
    notes: [
      'First the wrapper against the baseline: it cut leakage from 52.3% to 38.6%, but attack success went up to 62% and task success fell to 36%.',
      'Then steering: leakage 37.8%, about the same cut, while attack success fell to 50% and task success held at 42%.',
      'Stacking both did not help: 0.4pp better leakage than steering alone, and the wrapper’s side effects came back.',
      'If asked: steering was evaluated single-turn only, so I make no multi-turn claim. Each number is one seed of 100 attacks.',
    ],
    render: () => (
      <SlideLayout
        eyebrow="Tool-schema poisoning · Result" kind="result"
        headline={
          <>
            Steering cut leakage <em>without</em> the wrapper&rsquo;s side effects.
          </>
        }
      >
        <PoisoningBars steeringAt={1} />
        <p className="mt-6 font-mono text-[15px] text-zinc-400 uppercase tracking-widest">
          Single-turn runs, Llama 3.1-8B, 100 attacks each
        </p>
      </SlideLayout>
    ),
  },

  // Agentic Hybrid RAG
  {
    id: 'rag-why',
    title: 'Agentic Hybrid RAG: why',
    section: 'projects',
    notes: [
      'The problem: global questions. “What are the main themes across these documents?” An agent with plain vector RAG could not answer them: top-k retrieval returns the closest few passages, and a global question needs the whole corpus.',
      'Microsoft’s GraphRAG can answer them, but it works through the graph layer by layer with map-reduce, which is costly, and it can still miss information.',
      'A 2-person project with a public repo. My part is on the slide.',
    ],
    render: () => (
      <SlideLayout
        eyebrow="Agentic Hybrid RAG · Why" kind="why"
        headline={
          <>
            Top-k cannot answer a question about the <em>whole</em> corpus.
          </>
        }
      >
        <Flow
          arrows={false}
          items={[
            {
              label: 'Specific question',
              text: 'Top-k retrieval finds the few closest passages',
              icon: <Search size={40} strokeWidth={1.25} aria-hidden="true" />,
            },
            {
              label: 'Global question',
              text: '“What are the main themes?” needs the whole corpus',
              icon: <Globe size={40} strokeWidth={1.25} aria-hidden="true" />,
              hot: true,
            },
          ]}
        />
        <Lead className="mt-10">
          Microsoft&rsquo;s GraphRAG can answer it, but it map-reduces through the graph layer by layer, which is costly
          and can still miss information.
        </Lead>
        <div className="mt-10">
          <Credit
            team="2-person project · Jul 2024 - Jan 2025 · github.com/yarikama/Agentic-Advanced-RAG"
            mine="the routing graph, the retrieval paths, the knowledge-graph pipeline, the evaluation harness and the clustering-based indexing."
          />
        </div>
      </SlideLayout>
    ),
  },
  {
    id: 'rag-breakdown',
    title: 'Agentic Hybrid RAG: break it down',
    section: 'projects',
    steps: 3,
    notes: [
      'First principles: what does a global answer need? The breadth of the corpus, not every chunk in it.',
      'So cluster the vector store with K-means and DBSCAN: that is the cloud on the left.',
      'Keep each cluster’s pivotal chunks, and build GraphRAG from those alone. A small sample, condensed, but it spans every cluster. The picture is an illustration, not the real data.',
      'At query time, a CrewAI agent inside a LangGraph state graph scores each question’s breadth. Broad questions go to global search over the community summaries; specific ones to local entity and relationship search in Cypher.',
      'Both paths then run Milvus dense+sparse hybrid search, seeded with the graph step’s candidate answers, and rerank with Cohere. When the graph finds nothing, HyDE.',
    ],
    render: () => (
      <SlideLayout eyebrow="Agentic Hybrid RAG · Break it down" kind="breakdown" headline="A global answer needs breadth, not every chunk.">
        <div className="grid grid-cols-[38rem_1fr] gap-16 items-start">
          <PivotScatter pivotAt={1} graphAt={2} />
          <ol className="space-y-7 pt-2">
            {[
              { at: 0, label: 'Cluster', text: 'K-means and DBSCAN over the vector store', icon: ChartScatter },
              { at: 1, label: 'Pivot', text: 'Keep each cluster’s pivotal chunks', icon: Crosshair },
              {
                at: 2,
                label: 'Small graph',
                text: 'GraphRAG built from the pivots: fewer chunks, the same breadth',
                icon: Waypoints,
              },
            ].map((item) => (
              <li key={item.label}>
                <Reveal at={item.at}>
                  <p className="flex items-center gap-2.5 font-mono text-[15px] text-sage uppercase tracking-widest">
                    <item.icon size={20} strokeWidth={1.5} aria-hidden="true" />
                    {item.label}
                  </p>
                  <p className="mt-2 text-[23px] leading-snug text-ink-light">{item.text}</p>
                </Reveal>
              </li>
            ))}
            <li>
              <Reveal at={3}>
                <p className="flex items-center gap-2.5 font-mono text-[15px] text-zinc-400 uppercase tracking-widest">
                  <Route size={20} strokeWidth={1.5} aria-hidden="true" />
                  At query time
                </p>
                <p className="mt-2 text-[19px] leading-snug text-zinc-faded">
                  {tieEnd(
                    'An agent judges each question’s breadth: broad goes to global search over community summaries, specific to local entity search. Both then run Milvus hybrid search.'
                  )}
                </p>
              </Reveal>
            </li>
          </ol>
        </div>
      </SlideLayout>
    ),
  },
  {
    id: 'rag-tradeoff',
    title: 'Agentic Hybrid RAG: trade-off',
    section: 'projects',
    steps: 1,
    notes: [
      'Building the graph costs LLM tokens for every chunk that goes in. Clustering the vector store with K-means and DBSCAN and indexing only each cluster’s pivotal chunks saved 35% of indexing tokens, for 2.56% worse RAGAS scores.',
      'Graph or vector: picking one store per question is cheaper, but a wrong route skips the store that holds the answer. Running both on every path pays for two searches and keeps the exact passages.',
    ],
    render: () => (
      <SlideLayout eyebrow="Agentic Hybrid RAG · Trade-off" kind="tradeoff" headline="What goes into the graph, and which stores to query.">
        <div className="space-y-10">
          <Decision
            question="What goes into the graph?"
            options={[
              {
                name: 'The whole corpus',
                gains: ['Full coverage'],
                costs: ['LLM tokens for every chunk'],
              },
              {
                name: 'A clustered sample',
                chosen: true,
                gains: ['K-means and DBSCAN pick pivotal chunks: 35% fewer indexing tokens'],
                costs: ['2.56% worse RAGAS scores'],
              },
            ]}
          />
          <Reveal at={1}>
            <Decision
              question="Graph or vector?"
              options={[
                {
                  name: 'One store per question',
                  gains: ['Cheaper per question'],
                  costs: ['A wrong route skips the store with the answer'],
                },
                {
                  name: 'Graph, then vector',
                  chosen: true,
                  gains: ['Neighbourhood from the graph, exact passages from the vectors'],
                  costs: ['Every question pays for both searches'],
                },
              ]}
            />
          </Reveal>
        </div>
      </SlideLayout>
    ),
  },
  {
    id: 'rag-result',
    title: 'Agentic Hybrid RAG: result',
    section: 'projects',
    notes: [
      '88.2% MAR@10 on multi-hop questions, with HyDE.',
      'RAGAS on 50 MultiHop-RAG questions: faithfulness 0.87, context recall 0.85.',
      '35% fewer indexing tokens for 2.56% worse RAGAS.',
      'If asked: these are levels from one run, not an improvement over a vector-only baseline. It is a project, not production.',
    ],
    render: () => (
      <SlideLayout
        eyebrow="Agentic Hybrid RAG · Result" kind="result"
        headline={
          <>
            Strong multi-hop retrieval, and a <em>cheaper</em> graph to build.
          </>
        }
      >
        <div className="grid grid-cols-[1fr_38rem] gap-16 items-start">
          <div className="space-y-10">
            <Stat value="88.2%" label="MAR@10" detail="Multi-hop questions, with HyDE" />
            <Stat value="0.87" label="RAGAS faithfulness" detail="50 MultiHop-RAG questions" />
          </div>
          <div>
            <p className="font-mono text-[15px] text-zinc-400 uppercase tracking-widest mb-6">
              Clustered sample, against the whole corpus
            </p>
            <IndexTradeoffBars />
          </div>
        </div>
      </SlideLayout>
    ),
  },
]
