import { Activity, ClipboardCheck, IterationCw, Layers, Plug } from 'lucide-react'
import { tieEnd } from '../../../lib/text'
import { Reveal, SlideLayout } from '../../../components/talk/primitives'
import type { SlideDef } from '../../../components/talk/talk'

const contacts = [
  ['Site', 'yarikama.com'],
  ['Email', 'hsuhengjui@gmail.com'],
  ['LinkedIn', 'linkedin.com/in/yarikama'],
  ['GitHub', 'github.com/yarikama'],
]

// The five things the Agentic Tooling team owns, in the job description's own
// words, each matched to work already shown in the talk
const layers = [
  {
    area: 'Orchestration',
    icon: IterationCw,
    claim: 'One agent loop for any model',
    evidence: 'MaiAgent: function calling, else ReAct. An async loop with a human in it when needed.',
  },
  {
    area: 'Tool ecosystem',
    icon: Plug,
    claim: 'Client tools, and how tools get abused',
    evidence: 'MaiAgent: JSON schema to Pydantic at runtime. The poisoning defense.',
  },
  {
    area: 'Session and memory',
    icon: Layers,
    claim: 'Memory with a bounded cost',
    evidence: 'MaiAgent: short, mid and long term, instead of 1 + 2 + ... + N.',
  },
  {
    area: 'Observability',
    icon: Activity,
    claim: 'Failures explained where engineers look',
    evidence: 'Google: past success rates tell a device from a service. The report lands on the ticket.',
  },
  {
    area: 'Evaluation',
    icon: ClipboardCheck,
    claim: 'Tests and metrics that gate a change',
    evidence: 'Google: 402+ cases, and an eval of the agent’s skill choice and report. Poisoning: three metrics.',
  },
]

export const closing: SlideDef[] = [
  {
    id: 'bring',
    title: "What I'd bring",
    section: 'close',
    steps: layers.length,
    notes: [
      'Your job description lists five things the team owns. Each maps to something you just saw.',
      'Orchestration: model-agnostic tool calling and the async agent loop at MaiAgent.',
      'Tool ecosystem: clients plugging in their own APIs at MaiAgent, and the poisoning project on how tool metadata gets abused and defended.',
      'Session and memory: the three-tier memory, with a bounded cost per conversation.',
      'Observability: at Google, the agent reads past success rates to tell a broken device from a broken service, and the report lands on the ticket. A pasted ticket reproduces itself. Developer tools whose customers are other engineers.',
      'Evaluation: 402+ cases from one source of truth at Google, plus an eval of the triage agent: right skill, error URL, likely cause. Your job description names skills explicitly. And three separate metrics in the poisoning project.',
    ],
    render: () => (
      <SlideLayout eyebrow="What I'd bring" headline="The five layers your team owns, and my work on each.">
        <ol>
          {layers.map((item, i) => (
            <li key={item.area}>
              <Reveal
                at={i + 1}
                className={`grid grid-cols-[15rem_1fr_32rem] gap-10 items-baseline py-3 ${
                  i < layers.length - 1 ? 'border-b border-zinc-200 dark:border-zinc-200/30' : ''
                }`}
              >
                <p className="flex items-center gap-2.5 font-mono text-[15px] text-sage uppercase tracking-widest">
                  <item.icon size={20} strokeWidth={1.5} aria-hidden="true" />
                  {item.area}
                </p>
                <p className="font-serif text-[32px] leading-tight text-ink">{item.claim}</p>
                <p className="font-mono text-[15px] leading-relaxed text-zinc-faded">{tieEnd(item.evidence)}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </SlideLayout>
    ),
  },
  {
    id: 'thanks',
    title: 'Thank you',
    section: 'close',
    bare: true,
    notes: ['Thank you. Happy to go deeper on any of these, or anything else.'],
    render: () => (
      <div className="h-full flex flex-col justify-center">
        <h2 className="font-serif font-light tracking-tight leading-[0.95] text-[150px]">
          Thank <em className="italic">you</em>.
        </h2>
        <p className="mt-10 text-[34px] font-light text-zinc-faded">Questions?</p>
        <dl className="mt-20 grid grid-cols-4 gap-10">
          {contacts.map(([label, value]) => (
            <div key={label}>
              <dt className="font-mono text-[15px] text-zinc-400 uppercase tracking-widest">{label}</dt>
              <dd className="mt-2 font-mono text-[19px] text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    ),
  },
]
