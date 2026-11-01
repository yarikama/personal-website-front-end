import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { ArrowUpRight, CircleHelp, Hammer, Target } from 'lucide-react'
import type { Project } from '../../types'
import MagazineLine from '../ui/MagazineLine'
import { EASE, useCountUp, useSeen } from './motion'

export interface Stat {
  // Counted up from 0 when it comes into view
  value: number
  decimals?: number
  prefix?: string
  suffix?: string
  // What the number is, in a few words
  label: string
  // Where it comes from, or what it is compared with
  note?: string
}

interface CaseStudyProps {
  project: Project
  // What the project is, in one plain sentence anyone can follow
  pitch: ReactNode
  // The page in thirty seconds, for a reader who stops here
  problem: ReactNode
  did: ReactNode
  result: ReactNode
  stats: Stat[]
  // The one thing Henry took away, shown at the end
  learned: ReactNode
  // Who else did it, and what was Henry's part, for team projects
  team?: ReactNode
  children: ReactNode
}

// A project's own page: what it is and what came of it up top, for a reader
// with thirty seconds; then the story in chapters, with the decisions in
// it and why they went the way they did. Text in the body is styled like a
// note; figures opt out of that styling themselves.
export default function CaseStudy({ project, pitch, problem, did, result, stats, learned, team, children }: CaseStudyProps) {
  return (
    <article>
      <header className="mb-14">
        <span className="font-mono text-sm text-zinc-400 uppercase tracking-widest">
          {project.category.label} · {project.year}
        </span>
        <h1 className="font-serif text-4xl md:text-5xl font-light tracking-tight mt-4 mb-8">{project.title}</h1>
        <p className="font-serif text-2xl font-light leading-snug text-zinc-faded">{pitch}</p>
        {team && <p className="mt-6 text-sm leading-relaxed text-zinc-faded border-l border-zinc-300 dark:border-zinc-200/30 pl-4">{team}</p>}
      </header>

      <Stats stats={stats} />
      <InShort problem={problem} did={did} result={result} />

      <div
        className="prose prose-zinc dark:prose-invert max-w-none
          prose-headings:font-serif prose-headings:font-light
          prose-h2:text-3xl prose-h2:mt-20 prose-h2:mb-4
          prose-h3:text-2xl prose-h3:mt-10
          prose-p:text-zinc-faded prose-p:leading-relaxed
          prose-li:text-zinc-faded
          prose-strong:text-ink prose-strong:font-medium
          prose-a:text-sage prose-a:no-underline hover:prose-a:underline"
      >
        {children}
      </div>

      <div className="mt-20 border-l-2 border-sage pl-5">
        <span className="font-mono text-[0.875rem] uppercase tracking-widest text-sage">What I took away</span>
        <p className="mt-2 font-serif text-2xl font-light leading-snug">{learned}</p>
      </div>

      <MagazineLine className="mt-16 mb-8" />
      <Built project={project} />
    </article>
  )
}

function Stats({ stats }: { stats: Stat[] }) {
  const { ref, seen } = useSeen<HTMLDListElement>(0.5)
  return (
    <dl
      ref={ref}
      className="not-prose grid grid-cols-1 sm:grid-cols-3 border-y border-zinc-200 dark:border-zinc-200/20 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200 dark:divide-zinc-200/20"
    >
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 12 }}
          animate={seen ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: i * 0.12, ease: EASE }}
          className="px-4 py-6 sm:text-center"
        >
          <dd className="font-serif text-5xl font-light tabular-nums text-ink">
            <StatValue stat={stat} go={seen} />
          </dd>
          <dt className="mt-2 font-mono text-[0.875rem] uppercase tracking-widest text-zinc-faded">{stat.label}</dt>
          {stat.note && <p className="mt-1 text-sm text-zinc-400">{stat.note}</p>}
        </motion.div>
      ))}
    </dl>
  )
}

function StatValue({ stat, go }: { stat: Stat; go: boolean }) {
  const value = useCountUp(stat.value, go)
  return (
    <>
      {stat.prefix}
      {value.toFixed(stat.decimals ?? 0)}
      {stat.suffix && <span className="text-3xl text-zinc-faded">{stat.suffix}</span>}
    </>
  )
}

const ROWS = [
  { key: 'problem', label: 'The problem', icon: CircleHelp },
  { key: 'did', label: 'What I did', icon: Hammer },
  { key: 'result', label: 'What came of it', icon: Target },
] as const

function InShort(props: { problem: ReactNode; did: ReactNode; result: ReactNode }) {
  const { ref, seen } = useSeen<HTMLDivElement>(0.3)
  return (
    <section ref={ref} aria-label="In thirty seconds" className="not-prose mt-10 mb-6">
      <span className="font-mono text-[0.875rem] uppercase tracking-widest text-sage">In thirty seconds</span>
      <ol className="mt-4 flex flex-col">
        {ROWS.map(({ key, label, icon: Icon }, i) => (
          <motion.li
            key={key}
            initial={{ opacity: 0, x: -12 }}
            animate={seen ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.15 + i * 0.15, ease: EASE }}
            className="grid grid-cols-[2rem_1fr] gap-x-3 border-t border-zinc-200 dark:border-zinc-200/20 py-4"
          >
            <Icon size={18} className="mt-1 text-sage" aria-hidden />
            <div>
              <p className="font-mono text-[0.875rem] uppercase tracking-widest text-zinc-400">{label}</p>
              <p className="mt-1 text-lg leading-relaxed text-ink">{props[key]}</p>
            </div>
          </motion.li>
        ))}
      </ol>
    </section>
  )
}

// What it was built with, and where to see more
export function Built({ project }: { project: Project }) {
  const links = [
    project.github && { href: project.github, label: 'Code' },
    project.link && project.link !== project.github && { href: project.link, label: 'Link' },
  ].filter(Boolean) as { href: string; label: string }[]
  return (
    <footer className="flex flex-col gap-6">
      <div>
        <h2 className="font-mono text-[0.875rem] uppercase tracking-widest text-zinc-400 mb-3">Built with</h2>
        <ul className="flex flex-wrap gap-2">
          {project.tags.map((tag) => (
            <li
              key={tag}
              className="border border-zinc-200 dark:border-zinc-200/20 px-2.5 py-1 font-mono text-[0.8125rem] uppercase tracking-widest text-zinc-faded"
            >
              {tag}
            </li>
          ))}
        </ul>
      </div>
      {links.length > 0 && (
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono text-xs uppercase tracking-widest text-sage hover:text-ink transition-colors"
            >
              {link.label} <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          ))}
        </div>
      )}
    </footer>
  )
}
