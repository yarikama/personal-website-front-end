import { useState, useEffect, useRef } from 'react'
import Section from '../layout/Section'
import TechTable from '../ui/TechTable'
import { techStack } from '../../data/techStack'
import { usePrefersReducedMotion } from '../../hooks'

const LLAMAINDEX_PRS = 14

const education = [
  {
    school: 'Rice University',
    logo: '/rice-logo.png',
    gpa: 'GPA 4.0/4.0',
    degree: 'M.C.S., Computer Science — 2025-2026 (Expected Dec.)',
    detail: 'Database Implementation, Web Development, Big Data & ML',
  },
  {
    school: 'National Yang Ming Chiao Tung University',
    logo: '/NYCU-logo.png',
    gpa: 'GPA 4.07/4.3',
    degree: 'B.S., Industrial Engineering + CS Minor — 2020-2024',
    detail: 'CS Minor GPA 4.13/4.3 · AI Capstone, Operating System, System Administration',
  },
]

const honors: { title: string; detail: string; rank: string; url?: string }[] = [
  {
    title: 'Presidential Hackathon Winner',
    detail: 'Urban noise agent: structured-output LLM pipeline and tool calling',
    rank: 'Top 5 · 2024',
    url: 'https://english.president.gov.tw/News/6881',
  },
  {
    title: '23rd Golden Peak Award',
    detail: 'Outstanding Commercial Product, MaiAgent AI Platform',
    rank: '2025',
    url: 'https://lifenews.com.tw/334346',
  },
  {
    title: 'Atona Case Competition Finalist',
    detail: 'National enterprise transformation competition',
    rank: 'Top 1%',
  },
  {
    title: 'AI Workshop Outstanding Award',
    detail: 'Multi-Agent RAG tutoring system, NYCU CS',
    rank: 'Top 3/50',
  },
]

function Eyebrow({ children }: { children: string }) {
  return <p className="font-mono text-sm text-zinc-400 uppercase tracking-widest">{children}</p>
}

function Badge({ children, className = 'text-sm' }: { children: string; className?: string }) {
  return (
    <span className={`font-mono text-sage rounded-md border border-sage/40 px-1.5 py-0.5 whitespace-nowrap ${className}`}>
      {children}
    </span>
  )
}

// Current focus on the front; flips to the previous focus on hover, click or Enter
function FocusCard() {
  const [isFlipped, setIsFlipped] = useState(false)

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isFlipped}
      aria-describedby="previous-focus"
      className="cursor-pointer"
      style={{ perspective: '1000px' }}
      // Hover flips for mouse users only; touch and keyboard users toggle
      onPointerEnter={(e) => e.pointerType === 'mouse' && setIsFlipped(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setIsFlipped(false)}
      onClick={() => setIsFlipped((flipped) => !flipped)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setIsFlipped((flipped) => !flipped)
        }
      }}
    >
      {/* Both faces share one grid cell, so the card is as tall as the longer one */}
      <div
        className="grid transition-transform duration-700"
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateX(180deg)' : 'rotateX(0deg)',
        }}
      >
        <div
          className="col-start-1 row-start-1 p-6 rounded-2xl bg-paper-dark dark:bg-zinc-200/5"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <p className="font-mono text-sm text-zinc-faded uppercase tracking-widest mb-3">Current Focus</p>
          <p className="text-base md:text-lg text-zinc-faded leading-relaxed">
            <span className="text-sage font-medium">Agentic Developer Tooling</span> for failure triage,{' '}
            <span className="text-sage font-medium">Efficient Multimodal Inference</span> via token pruning, and{' '}
            <span className="text-sage font-medium">Database Internals</span> from storage to query optimization.
          </p>
        </div>

        {/* Read out through aria-describedby */}
        <div
          aria-hidden="true"
          className="col-start-1 row-start-1 p-6 rounded-2xl bg-sage text-paper"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateX(180deg)' }}
        >
          <p className="font-mono text-xs text-paper/70 uppercase tracking-widest mb-3">Previous Focus</p>
          <p id="previous-focus" className="text-base md:text-lg leading-relaxed">
            Building <span className="font-semibold">Production-Ready Generative AI</span> and{' '}
            <span className="font-semibold">RAG Systems</span>, alongside{' '}
            <span className="font-semibold">Data-Intensive Backend Systems</span> that scale.
          </p>
        </div>
      </div>
    </div>
  )
}

// LlamaIndex contributions; the PR count ticks up from zero on hover
function OpenSourceCard() {
  const [isHovered, setIsHovered] = useState(false)
  const [prCount, setPrCount] = useState(0)
  const animationRef = useRef<number | null>(null)
  const reduceMotion = usePrefersReducedMotion()

  useEffect(() => {
    if (isHovered && reduceMotion) {
      // Jump straight to the final count instead of animating it
      setPrCount(LLAMAINDEX_PRS)
    } else if (isHovered) {
      const duration = 800
      const startTime = performance.now()

      const animate = (currentTime: number) => {
        const progress = Math.min((currentTime - startTime) / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3) // ease-out
        setPrCount(Math.round(eased * LLAMAINDEX_PRS))
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate)
        }
      }

      animationRef.current = requestAnimationFrame(animate)
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      setPrCount(0)
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isHovered, reduceMotion])

  return (
    <div
      className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-200/20 cursor-pointer transition-colors duration-300 hover:border-sage"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <p className="font-mono text-sm text-zinc-faded uppercase tracking-widest mb-4">Open Source Contributions</p>
      <div className="flex justify-between items-center mb-1">
        <span className="font-mono text-sm text-ink">LlamaIndex</span>
        <span className="font-mono text-sm text-zinc-faded">
          {isHovered ? prCount : LLAMAINDEX_PRS} PRs merged
        </span>
      </div>
      <div className="h-1 bg-zinc-200 dark:bg-zinc-200/20 rounded-full overflow-hidden">
        <div
          className="h-full bg-sage rounded-full"
          style={{
            width: isHovered ? `${(prCount / LLAMAINDEX_PRS) * 100}%` : '100%',
            transition: prCount > 0 ? 'width 50ms' : 'none',
          }}
        />
      </div>
      <p className="text-sm md:text-base text-zinc-faded mt-3 leading-relaxed">
        AWS Bedrock, Claude, Elasticsearch, Cohere, OpenAI, MCP Client, AI Agent Workflow
      </p>
    </div>
  )
}

// What I work with, where I trained, and what I'm digging into now
export default function Toolkit() {
  return (
    <Section id="skills">
      <span className="font-mono text-sm text-zinc-400 uppercase tracking-widest">Toolkit</span>
      <h2 className="font-serif text-4xl md:text-5xl font-light mt-4 tracking-tight">
        Tools of the Trade
      </h2>

      <div className="mt-12 grid lg:grid-cols-2 gap-16 lg:gap-20">
        <div>
          <Eyebrow>Skill Set</Eyebrow>
          <TechTable data={techStack} className="mt-6" />
        </div>

        <div className="space-y-12">
          <div className="space-y-6">
            <OpenSourceCard />
            <FocusCard />
          </div>

          <div className="space-y-4">
            <Eyebrow>Honors</Eyebrow>
            <ul className="space-y-5">
              {honors.map((honor) => (
                <li key={honor.title} className="flex items-baseline justify-between gap-4">
                  <div>
                    {honor.url ? (
                      <a
                        href={honor.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lg text-ink font-medium underline decoration-sage/40 underline-offset-4 hover:text-sage transition-colors duration-200"
                      >
                        {honor.title}
                      </a>
                    ) : (
                      <p className="text-lg text-ink font-medium">{honor.title}</p>
                    )}
                    <p className="text-sm md:text-base text-zinc-faded mt-1 leading-relaxed">{honor.detail}</p>
                  </div>
                  <Badge>{honor.rank}</Badge>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Education runs the full width below, one school per column */}
      <div className="mt-20">
        <Eyebrow>Education</Eyebrow>
        <div className="mt-6 grid md:grid-cols-2 gap-10 lg:gap-20">
          {education.map((school) => (
            <div key={school.school} className="flex items-start gap-4">
              <img
                src={school.logo}
                alt=""
                width={48}
                height={48}
                loading="lazy"
                decoding="async"
                className="w-12 h-12 object-contain"
              />
              <div>
                {/* The GPA wraps under a long school name rather than shrinking it */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="text-lg text-ink font-medium">{school.school}</p>
                  <Badge>{school.gpa}</Badge>
                </div>
                <p className="mt-1 text-base text-zinc-faded">{school.degree}</p>
                <p className="text-sm md:text-base text-zinc-faded mt-1">{school.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  )
}
