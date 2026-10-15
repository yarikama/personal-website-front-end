import { useState, type ReactNode } from 'react'
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Bot,
  ClipboardCheck,
  Database,
  FileText,
  IterationCw,
  Layers,
  PanelsTopLeft,
  Plug,
  Search,
  X,
  type LucideIcon,
} from 'lucide-react'
import { tieEnd } from '../../lib/text'
import { useStep } from '../../components/talk/talk'

// Everything built or led at MaiAgent, as one map that follows a file from
// upload to a cited answer. The parts appear in that order, one per step.
// Clicking a part opens its details, for the questions afterwards; the map
// reads fine without them. Facts follow src/data/experience.ts.

type PartId = 'ingest' | 'data' | 'retrieval' | 'agent' | 'eval'

const DETAILS: Record<PartId, { title: string; side: 'left' | 'right'; points: string[] }> = {
  ingest: {
    title: 'Ingest',
    side: 'right',
    points: [
      'Files are parsed into documents, then chunks; every citation points back to its chunk',
      'Rebuilt the indexing pipeline on asyncio and Celery: 3.5x faster parsing, from 3M to 20M+ chunks',
      'Parsing status pushed to the UI live, over WebSocket and Redis pub/sub',
    ],
  },
  data: {
    title: 'Data',
    side: 'right',
    points: [
      'Relational and vector databases kept in sync',
      'Tags and permissions per knowledge base, for clients like CTBC Bank, MSI and HPE',
      'Retrieval filtered by metadata and by permission',
    ],
  },
  retrieval: {
    title: 'Retrieval',
    side: 'right',
    points: [
      'Dense and sparse embeddings, fused with reciprocal rank fusion (RRF)',
      'Cohere and BGE rerankers, selectable per customer: +30% Precision@5 on large documents',
      'Several chunk split strategies',
    ],
  },
  agent: {
    title: 'Agent',
    side: 'left',
    points: [
      'Tools: an MCP client, client APIs from a JSON schema at runtime, and a custom RAG tool',
      'Function calling when the model has it, a ReAct agent when it does not',
      'Async workflow: the agent can ask a human, call another agent, or keep going',
      'Memory: short, mid and long term, one set per conversation',
      'Canvas agent: render signals and citations to the frontend over Redis and WebSocket',
    ],
  },
  eval: {
    title: 'Eval',
    side: 'left',
    points: [
      'RAGAS for retrieval and answer quality',
      'DeepEval for the agent: task completion and tool correctness',
      'A GitHub Actions CI with pytest unit and E2E tests: 67% coverage from zero',
    ],
  },
}

const fade = 'transition-opacity duration-700 ease-elegant'

function Chip({ children, accent = false, small = false }: { children: ReactNode; accent?: boolean; small?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border leading-tight whitespace-nowrap ${
        small ? 'px-2 py-0.5 text-[14px]' : 'px-2.5 py-1 text-[16px]'
      } ${accent ? 'border-sage/60 text-sage' : 'border-zinc-200 dark:border-zinc-200/40 text-ink-light'}`}
    >
      {children}
    </span>
  )
}

function Label({ icon: Icon, children, small = false }: { icon: LucideIcon; children: string; small?: boolean }) {
  return (
    <span
      className={`flex items-center gap-2 font-mono uppercase tracking-widest text-zinc-400 ${
        small ? 'text-[13px]' : 'text-[14px]'
      }`}
    >
      <Icon size={small ? 16 : 18} strokeWidth={1.5} className="text-sage" aria-hidden="true" />
      {children}
    </span>
  )
}

const Arrow = ({ size = 18 }: { size?: number }) => (
  <ArrowRight size={size} strokeWidth={1.5} className="shrink-0 text-zinc-400" aria-hidden="true" />
)

export default function PlatformMap() {
  const step = useStep()
  const [focus, setFocus] = useState<PartId | null>(null)
  const shown: Record<PartId, boolean> = {
    ingest: true,
    data: true,
    retrieval: step >= 1,
    agent: step >= 2,
    eval: step >= 3,
  }

  // One clickable part of the map; the others dim while one is open
  const part = (id: PartId, className: string, children: ReactNode, row = false) => (
    <button
      type="button"
      onClick={() => setFocus(focus === id ? null : id)}
      aria-expanded={focus === id}
      aria-label={`${DETAILS[id].title}: show details`}
      className={`text-left rounded-xl border bg-paper p-4 flex ${row ? 'flex-row items-center gap-6' : 'flex-col justify-start'} transition-[opacity,border-color] duration-700 ease-elegant ${
        focus === id ? 'border-sage' : 'border-zinc-300 dark:border-zinc-300/60'
      } ${shown[id] ? (focus && focus !== id ? 'opacity-35' : 'opacity-100') : 'opacity-0 pointer-events-none'} ${className}`}
    >
      {children}
    </button>
  )

  const open = focus ? DETAILS[focus] : null

  return (
    <div className="relative rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-300/60 px-6 pt-4 pb-6">
      <p className="font-mono text-[13px] text-zinc-400 uppercase tracking-widest">MaiAgent platform</p>

      <div className="relative mt-3 grid grid-cols-[19rem_2.5rem_26rem_2.5rem_1fr] grid-rows-[14.5rem_5.5rem] gap-y-4">
        {part(
          'ingest',
          'col-start-1 row-start-1',
          <>
            <Label icon={FileText}>Ingest</Label>
            <span className="mt-6 flex items-center gap-2">
              <Chip>File</Chip>
              <Arrow />
              <Chip>Parse</Chip>
              <Arrow />
              <Chip>Chunk</Chip>
            </span>
            <span className="mt-6 block text-[16px] leading-snug text-zinc-faded">
              {tieEnd('Each chunk keeps its source, so answers can cite it')}
            </span>
          </>
        )}

        <span className={`col-start-2 row-start-1 flex items-center justify-center ${fade} ${shown.retrieval ? 'opacity-100' : 'opacity-0'}`}>
          <Arrow size={22} />
        </span>

        {part(
          'retrieval',
          'col-start-3 row-start-1',
          <>
            <Label icon={Search}>Retrieval</Label>
            <span className="mt-5 flex items-center gap-2">
              <span className="flex flex-col gap-2">
                <Chip>Dense</Chip>
                <Chip>Sparse</Chip>
              </span>
              <Arrow />
              <Chip>RRF</Chip>
              <Arrow />
              <Chip>Reranker</Chip>
            </span>
            <span className="mt-5 flex">
              <Chip>Split strategies</Chip>
            </span>
          </>
        )}

        <span className={`col-start-4 row-start-1 flex items-center justify-center ${fade} ${shown.agent ? 'opacity-100' : 'opacity-0'}`}>
          <Arrow size={22} />
        </span>

        {part(
          'agent',
          'col-start-5 row-start-1 row-span-2',
          <>
            <Label icon={Bot}>Agent</Label>
            <span className="mt-3 grid grid-cols-2 grid-rows-2 gap-2.5 flex-1 min-h-0">
              <span className="block rounded-lg border border-sage/50 p-3">
                <Label icon={Plug} small>
                  Tools
                </Label>
                <span className="mt-2 flex flex-wrap gap-1.5">
                  <Chip accent small>MCP</Chip>
                  <Chip accent small>JSON-schema APIs</Chip>
                  <Chip accent small>RAG tool</Chip>
                </span>
              </span>
              <span className="block rounded-lg border border-zinc-200 dark:border-zinc-200/40 p-3">
                <Label icon={IterationCw} small>
                  Workflow
                </Label>
                <span className="mt-2 block text-[15px] leading-snug text-ink-light">
                  {tieEnd('Async loop: ask a human, call an agent, or continue')}
                </span>
              </span>
              <span className="block rounded-lg border border-sage/50 p-3">
                <Label icon={Layers} small>
                  Memory
                </Label>
                <span className="mt-2 flex flex-wrap gap-1.5">
                  <Chip accent small>Short</Chip>
                  <Chip accent small>Mid</Chip>
                  <Chip accent small>Long</Chip>
                </span>
              </span>
              <span className="block rounded-lg border border-zinc-200 dark:border-zinc-200/40 p-3">
                <Label icon={PanelsTopLeft} small>
                  Canvas agent
                </Label>
                <span className="mt-2 block text-[15px] leading-snug text-ink-light">
                  {tieEnd('Live render signals over Redis and WebSocket')}
                </span>
              </span>
            </span>
            <span className="mt-3 flex items-center gap-2 text-[16px] text-sage">
              <Arrow />
              An answer, citing the chunks it used
            </span>
          </>
        )}

        {part(
          'data',
          'col-start-1 col-span-3 row-start-2',
          <>
            <Label icon={Database}>Data</Label>
            <span className="flex flex-wrap gap-2">
              <Chip>Relational + vector, in sync</Chip>
              <Chip>Filtering</Chip>
              <Chip>Permissions</Chip>
            </span>
          </>,
          true
        )}

        {/* Chunks are stored; retrieval reads them back through the filters */}
        <span className="absolute left-[9.5rem] top-[14.5rem] -translate-x-1/2 h-4 flex items-center" aria-hidden="true">
          <ArrowDown size={16} strokeWidth={1.5} className="text-zinc-400" />
        </span>
        <span
          className={`absolute left-[34.5rem] top-[14.5rem] -translate-x-1/2 h-4 flex items-center ${fade} ${
            shown.retrieval ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden="true"
        >
          <ArrowUp size={16} strokeWidth={1.5} className="text-zinc-400" />
        </span>
      </div>

      {part(
        'eval',
        'mt-4 w-full',
        <>
          <Label icon={ClipboardCheck}>Eval</Label>
          <span className="flex flex-wrap gap-2">
            <Chip>RAGAS: retrieval and answers</Chip>
            <Chip>DeepEval: task completion, tool correctness</Chip>
          </span>
          <span className="ml-auto text-[16px] text-zinc-faded">Wraps every part above</span>
        </>,
        true
      )}

      {open && (
        <div
          className={`absolute top-12 ${open.side === 'right' ? 'right-6' : 'left-6'} w-[34rem] rounded-xl border border-sage bg-paper p-6 shadow-lg`}
          role="region"
          aria-label={`${open.title} details`}
        >
          <div className="flex items-start justify-between gap-4">
            <p className="font-serif text-[32px] leading-tight text-ink">{open.title}</p>
            <button
              type="button"
              onClick={() => setFocus(null)}
              aria-label="Close details"
              className="p-1 text-zinc-400 hover:text-sage transition-colors duration-300"
            >
              <X size={20} strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>
          <ul className="mt-3 space-y-2.5 text-[18px] leading-snug text-ink-light list-disc pl-5 marker:text-sage">
            {open.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
