import { Fragment, type ReactNode } from 'react'
import {
  ArrowRight,
  Check,
  Circle,
  CircleHelp,
  MessagesSquare,
  Scale,
  Split,
  Target,
  type LucideIcon,
} from 'lucide-react'
import { tieEnd } from '../../lib/text'
import { useStep, useTalk } from './talk'

// Plain text keeps its last words together; anything else passes through
const tied = (node: ReactNode) => (typeof node === 'string' ? tieEnd(node) : node)

// Building blocks for slides, in the site's type and colour. Every slide makes
// one point: the headline states it, everything under it is the evidence.

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="font-mono text-[15px] text-zinc-400 uppercase tracking-widest">{children}</p>
}

// Use <em> inside for the italic emphasis the site uses in its titles
export function Headline({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <h2
      className={`font-serif font-light text-[64px] leading-[1.08] tracking-tight lining-nums pb-1 [&_em]:italic ${className}`}
    >
      {children}
    </h2>
  )
}

export function Lead({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`text-[26px] leading-relaxed text-zinc-faded ${className}`}>{tied(children)}</p>
}

// The four steps every story walks through, each with a fixed icon, so the
// audience can tell where in a story they are at a glance
export type StoryStep = 'why' | 'breakdown' | 'tradeoff' | 'result'

const STEP_ICONS: Record<StoryStep, LucideIcon> = {
  why: CircleHelp,
  breakdown: Split,
  tradeoff: Scale,
  result: Target,
}

// Eyebrow and headline on top; the slide's evidence fills the rest
export function SlideLayout({
  eyebrow,
  headline,
  kind,
  children,
}: {
  eyebrow: ReactNode
  headline: ReactNode
  kind?: StoryStep
  children?: ReactNode
}) {
  const StepIcon = kind ? STEP_ICONS[kind] : null
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3">
        {StepIcon && <StepIcon size={20} strokeWidth={1.5} className="text-zinc-400" aria-hidden="true" />}
        <Eyebrow>{eyebrow}</Eyebrow>
      </div>
      <Headline className="mt-5">{headline}</Headline>
      <div className="flex-1 min-h-0 pt-14">{children}</div>
    </div>
  )
}

// Hidden until the slide reaches step `at`. It keeps its space while hidden,
// so nothing moves when it appears.
export function Reveal({ at, children, className = '' }: { at: number; children: ReactNode; className?: string }) {
  const shown = useStep() >= at
  return (
    <div
      className={`transition-[opacity,translate] duration-700 ease-elegant ${
        shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      } ${className}`}
      aria-hidden={!shown}
    >
      {children}
    </div>
  )
}

// Something only Henry can answer. Replace each one before the talk; the
// dashed box is meant to be impossible to miss.
export function Ask({ children, guess, className = '' }: { children: ReactNode; guess?: ReactNode; className?: string }) {
  return (
    <div className={`border border-dashed border-sage px-6 py-4 bg-sage/5 ${className}`}>
      <p className="font-mono text-[13px] text-sage uppercase tracking-widest">To fill in</p>
      <p className="mt-1 text-[20px] leading-snug text-ink">{children}</p>
      {guess && <p className="mt-2 text-[17px] leading-snug text-zinc-faded">My guess: {guess}</p>}
    </div>
  )
}

export function Stat({ value, label, detail }: { value: ReactNode; label: string; detail?: ReactNode }) {
  return (
    <div>
      <p className="font-serif font-light text-[104px] leading-none tracking-tight text-sage lining-nums whitespace-nowrap">{value}</p>
      <p className="mt-6 font-mono text-[15px] text-zinc-400 uppercase tracking-widest">{label}</p>
      {detail && <p className="mt-2 text-[19px] leading-snug text-zinc-faded">{tied(detail)}</p>}
    </div>
  )
}

export interface FlowItem {
  label: string
  text: ReactNode
  // Where the cost is; drawn in the accent colour
  hot?: boolean
  // Drawn above the item; the arrows then point from icon to icon
  icon?: ReactNode
}

// A process broken into its parts, left to right. With `reveal`, item i
// appears at step i + 1, and the hot items light up at step `hotAt`. Turn
// `arrows` off when the items are compared rather than steps in order.
export function Flow({
  items,
  reveal = false,
  hotAt = 0,
  arrows = true,
}: {
  items: FlowItem[]
  reveal?: boolean
  hotAt?: number
  arrows?: boolean
}) {
  const step = useStep()
  const lit = step >= hotAt
  const hasIcons = items.some((item) => item.icon)
  return (
    <div className="flex items-start">
      {items.map((item, i) => {
        const hot = item.hot && lit
        return (
          <Fragment key={item.label}>
            {i > 0 &&
              (arrows ? (
                <Reveal at={reveal ? i + 1 : 0} className={`shrink-0 px-5 ${hasIcons ? 'pt-2.5' : 'pt-7'}`}>
                  <ArrowRight size={28} strokeWidth={1.25} className="text-zinc-400" aria-hidden="true" />
                </Reveal>
              ) : (
                <div className="shrink-0 w-16" aria-hidden="true" />
              ))}
            <Reveal at={reveal ? i + 1 : 0} className="flex-1 min-w-0">
              {item.icon && <div className="mb-6 text-sage">{item.icon}</div>}
              <div
                className={`border-t-2 pt-6 transition-colors duration-700 ease-elegant ${
                  hot ? 'border-sage' : 'border-zinc-300 dark:border-zinc-300/60'
                }`}
              >
                <p
                  className={`font-mono text-[15px] uppercase tracking-widest transition-colors duration-700 ease-elegant ${
                    hot ? 'text-sage' : 'text-zinc-400'
                  }`}
                >
                  {item.label}
                </p>
                <p className="mt-3 text-[23px] leading-snug text-ink-light">{tied(item.text)}</p>
              </div>
            </Reveal>
          </Fragment>
        )
      })}
    </div>
  )
}

export interface Option {
  name: string
  gains: string[]
  costs: string[]
  chosen?: boolean
}

// One decision: the question on the left, the options side by side, the one
// taken marked. Options not taken are muted.
export function Decision({ question, options }: { question: ReactNode; options: Option[] }) {
  return (
    <div className="grid grid-cols-[17rem_1fr_1fr] gap-10">
      <p className="font-serif text-[30px] leading-tight text-ink">{question}</p>
      {options.map((option) => (
        <div
          key={option.name}
          className={`border-t-2 pt-4 ${
            option.chosen ? 'border-sage' : 'border-zinc-300 dark:border-zinc-300/60 text-zinc-faded'
          }`}
        >
          <p className="flex items-baseline justify-between gap-4">
            <span className="font-serif text-[30px] leading-tight">{option.name}</span>
            {option.chosen && (
              <span className="flex items-center gap-1.5 font-mono text-[13px] text-sage uppercase tracking-widest">
                <Check size={16} strokeWidth={2} aria-hidden="true" />
                Chosen
              </span>
            )}
          </p>
          <ul className="mt-3 space-y-1.5 text-[18px] leading-snug">
            {option.gains.map((gain) => (
              <li key={`+${gain}`}>
                <span className="font-mono text-sage mr-2">+</span>
                {tieEnd(gain)}
              </li>
            ))}
            {option.costs.map((cost) => (
              <li key={`-${cost}`}>
                <span className="font-mono text-zinc-400 mr-2">-</span>
                {tieEnd(cost)}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

export interface Entry {
  logo: string
  title: string
  place: string
  // A role or honour that goes with it, one line
  note?: string
  period: string
}

// Who built a project and which part was mine: a mono line, then one sentence
export function Credit({ team, mine }: { team: string; mine: string }) {
  return (
    <div>
      <p className="font-mono text-[15px] leading-relaxed text-zinc-400 uppercase tracking-widest">{team}</p>
      <p className="mt-2 text-[19px] leading-snug text-zinc-faded">My part: {tieEnd(mine)}</p>
    </div>
  )
}

// An honour, styled like the badges under the name in the home page hero
export function Badge({ children, accent = false }: { children: ReactNode; accent?: boolean }) {
  return (
    <span
      className={`font-mono text-[14px] uppercase tracking-widest px-4 py-2 border whitespace-nowrap ${
        accent ? 'text-sage border-sage/40' : 'text-zinc-400 border-zinc-200 dark:border-zinc-200/30'
      }`}
    >
      {children}
    </span>
  )
}

// A titled list of schools or roles, each with its logo, as on a resume
export function Entries({ heading, items }: { heading: string; items: Entry[] }) {
  return (
    <div>
      <Eyebrow>{heading}</Eyebrow>
      <ul className="mt-8 space-y-10">
        {items.map((item) => (
          <li key={item.title} className="grid grid-cols-[4rem_1fr] gap-6">
            <div className="w-16 h-16 rounded-xl p-3 bg-white border border-zinc-200 dark:border-transparent shadow-sm flex items-center justify-center">
              <img src={item.logo} alt="" width={40} height={40} className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="font-serif text-[32px] leading-tight text-ink">{item.title}</p>
              <p className="mt-1 text-[20px] leading-snug text-zinc-faded">{item.place}</p>
              {item.note && <p className="mt-1 text-[18px] leading-snug text-ink-light">{item.note}</p>}
              <p className="mt-2 font-mono text-[15px] text-zinc-400 uppercase tracking-widest">{item.period}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

// The talk's parts with their minutes. Shown at the start and again between
// parts, with the part about to begin highlighted. `after` names what follows
// the last part, such as the Q&A.
export function Outline({ active, headline, after }: { active?: string; headline: ReactNode; after?: string }) {
  const { sections } = useTalk()
  return (
    <div className="h-full grid grid-cols-[1fr_36rem] gap-16 items-center">
      <div>
        <Eyebrow>Outline</Eyebrow>
        <Headline className="mt-5">{headline}</Headline>
      </div>
      <ol>
        {sections.map((section) => {
          const current = section.id === active
          const Icon = section.icon ?? Circle
          return (
            <li
              key={section.id}
              className={`flex items-baseline justify-between gap-8 py-5 border-b border-zinc-300 dark:border-zinc-300/60 transition-colors duration-700 ${
                current || !active ? 'text-ink' : 'text-zinc-400'
              }`}
            >
              <span className="flex items-center gap-5">
                <Icon
                  size={30}
                  strokeWidth={1.25}
                  className={current ? 'text-sage' : 'text-zinc-400'}
                  aria-hidden="true"
                />
                <span className={`font-serif text-[44px] leading-tight font-light ${current ? 'italic' : ''}`}>
                  {section.label}
                </span>
              </span>
              <span className={`font-mono text-[17px] tracking-widest ${current ? 'text-sage' : 'text-zinc-400'}`}>
                {section.minutes} MIN
              </span>
            </li>
          )
        })}
        {after && (
          <li className="flex items-center gap-5 pt-5 text-zinc-400">
            <MessagesSquare size={30} strokeWidth={1.25} aria-hidden="true" />
            <span className="font-serif text-[44px] leading-tight font-light">{after}</span>
          </li>
        )}
      </ol>
    </div>
  )
}

export interface Contact {
  icon: ReactNode
  label: string
}

// Ways to reach me, one row, each with its icon
export function Contacts({ items }: { items: Contact[] }) {
  return (
    <ul className="flex flex-wrap gap-x-10 gap-y-3 font-mono text-[16px] text-zinc-faded">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2.5">
          <span className="text-sage">{item.icon}</span>
          {item.label}
        </li>
      ))}
    </ul>
  )
}
