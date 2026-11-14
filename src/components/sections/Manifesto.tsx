import { useEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from '../../hooks'
import { ARM_MIN_WIDTH, needleAt, recordGaps, recordRadius, wheelRadius } from './manifestoRecord'

const stories = [
  {
    text: 'Customer Obsession',
    subtext: 'Grew users from 3K to 20K',
    story: 'At MaiAgent, I upgraded chatbots into AI agents with memory systems, tool APIs, and MCP Client integration, growing partners by 120% across CTBC Bank, MSI, HPE, and iGroup. I integrated Cohere and BGE rerankers as a customer-selectable feature, lifting RAG Precision@5 on large documents by 30%.',
  },
  {
    text: 'Build to Scale',
    subtext: 'RAG system: 3M → 20M+ text chunks',
    story: 'Rebuilt the indexing pipeline on asyncio and Celery with RDB / vector DB synchronization, parsing 3.5x faster while scaling from 3M to 20M+ text chunks. A WebSocket and Redis pub/sub layer pushed parsing status and agent state to the frontend in real time.',
  },
  {
    text: 'Optimize Relentlessly',
    subtext: '67%+ fewer LLM tokens, 140+ APIs optimized',
    story: 'Cut LLM token usage by 67%+ while upgrading chatbots into agents. Optimized 140+ RESTful APIs through SQL query refactoring, connection pooling, and Django caching, making 13 high-traffic APIs 27.7% faster and eliminating N+1 queries.',
  },
  {
    text: 'Test From Zero',
    subtext: '0 → 67% coverage, 400+ suites onboarded at Google',
    story: 'At MaiAgent, I introduced pytest and a GitHub Actions pipeline to a codebase with no tests, reaching 67% coverage and cutting production hotfixes by 90%. At Google, I built three integration test infrastructures from a zero baseline, onboarding 400+ test suites across 200+ smart home device types.',
  },
]

// A card counts as settled, and gets its nudge, once the wheel is within this
// share of a step of bringing it to rest at the bottom
const SETTLED_STEPS = 0.15

// The stories sit around the rim of a large wheel whose center is far above
// the screen, so only its bottom arc shows. The wheel is drawn as a vinyl
// record (manifestoRecord.ts), and scrolling turns it clockwise: the current
// story rolls off to the left along the arc, tilting with it, as the next
// rolls in from the right and settles at the bottom. Neighbours peek in
// faintly at the sides.
const STEP_ANGLE = 30
const NEIGHBOUR_OPACITY = 0.2

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

// Which story is at the bottom of the wheel at section progress 0-1, as a
// fraction between stories while turning. Each story's share of the scroll
// holds it still for the first half, then turns to the next; the last holds.
function wheelPosition(progress: number) {
  const scaled = Math.min(progress * stories.length, stories.length - 1)
  const index = Math.floor(scaled)
  if (index >= stories.length - 1) return stories.length - 1
  const turn = Math.max(0, (scaled - index - 0.5) / 0.5)
  return index + easeInOut(turn)
}

// Opacity and transform of card `index` with the wheel at `position`
function cardFrame(index: number, position: number) {
  const steps = index - position
  const distance = Math.abs(steps)
  const opacity = distance < 1 ? 1 - distance * (1 - NEIGHBOUR_OPACITY) : Math.max(0, NEIGHBOUR_OPACITY * (2 - distance))
  const radius = wheelRadius(window.innerWidth)
  return {
    opacity,
    // Turning about the wheel's center, not the card's own
    transformOrigin: `50% calc(50% - ${radius}px)`,
    transform: `rotate(${-steps * STEP_ANGLE}deg)`,
  }
}

// The record's box and turn with the wheel at `position`: centred on the
// wheel's centre, turning with the stories so they ride on it
function recordFrame(position: number) {
  const width = window.innerWidth
  const radius = wheelRadius(width)
  const rim = recordRadius(width)
  return {
    width: `${2 * rim}px`,
    height: `${2 * rim}px`,
    left: `calc(50% - ${rim}px)`,
    top: `calc(50% - ${radius + rim}px)`,
    transform: `rotate(${-position * STEP_ANGLE}deg)`,
  }
}

interface StoryCardProps {
  story: (typeof stories)[number]
  index: number
  isFlipped: boolean
  shouldNudge: boolean
  onNudgeEnd: () => void
  onHoverChange: (hovered: boolean) => void
  onToggle: () => void
}

function StoryCard({ story, index, isFlipped, shouldNudge, onNudgeEnd, onHoverChange, onToggle }: StoryCardProps) {
  const storyId = `manifesto-story-${index}`
  const [firstWord, ...rest] = story.text.split(' ')

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isFlipped}
      aria-describedby={storyId}
      className="cursor-pointer w-full max-w-5xl py-24 px-2 md:px-12"
      style={{ perspective: '1000px' }}
      // Hover flips for mouse users only; touch users tap instead
      onPointerEnter={(e) => e.pointerType === 'mouse' && onHoverChange(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && onHoverChange(false)}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onToggle()
        }
      }}
    >
      <div
        className={`relative transition-transform duration-700 ${shouldNudge ? 'animate-nudge' : ''}`}
        onAnimationEnd={onNudgeEnd}
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateX(180deg)' : 'rotateX(0deg)',
        }}
      >
        {/* Front - Title */}
        <div className="flex flex-col items-center text-center" style={{ backfaceVisibility: 'hidden' }}>
          <h2 className="font-serif text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-light tracking-tight leading-none text-[#ece9e2]">
            {firstWord}
            <br />
            {rest.join(' ')}
          </h2>
          <p className="mt-8 font-mono text-sm md:text-base text-[#9fc0bb] uppercase tracking-widest">
            {story.subtext}
          </p>
        </div>

        {/* Back - Story (read out through aria-describedby, not as the button name) */}
        <div
          aria-hidden="true"
          className="absolute inset-0 flex flex-col items-center justify-center text-center px-4"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateX(180deg)' }}
        >
          <p className="font-mono text-xs text-[#9fc0bb] uppercase tracking-widest mb-6">{story.text}</p>
          <p id={storyId} className="font-serif text-base md:text-xl lg:text-2xl text-[#a1a1aa] leading-relaxed max-w-2xl">
            {story.story}
          </p>
        </div>
      </div>
    </div>
  )
}

// Reduced-motion version: every story laid out statically, nothing hidden behind a flip
function StaticManifesto() {
  return (
    <div className="py-[var(--section-spacing)] px-6">
      <div className="max-w-3xl mx-auto space-y-20">
        {stories.map((story) => (
          <div key={story.text} className="text-center">
            <h2 className="font-serif text-5xl md:text-7xl font-light tracking-tight leading-none">
              {story.text}
            </h2>
            <p className="mt-6 font-mono text-sm text-sage uppercase tracking-widest">{story.subtext}</p>
            <p className="mt-6 font-serif text-lg md:text-xl text-zinc-faded leading-relaxed">{story.story}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function ScrollManifesto() {
  const containerRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const stageRef = useRef<HTMLDivElement>(null)
  const recordRef = useRef<HTMLDivElement>(null)
  const sheenRef = useRef<HTMLDivElement>(null)
  const armRef = useRef<SVGGElement>(null)
  const armRodRef = useRef<SVGRectElement>(null)
  const [activeCard, setActiveCard] = useState(-1)
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)
  const [pinnedCard, setPinnedCard] = useState<number | null>(null)
  const [nudgingCard, setNudgingCard] = useState<number | null>(null)
  // Cards that have had their nudge; read only from the scroll handler
  const nudgedCards = useRef(new Set<number>())

  // Drive every card and the square straight from scroll; only the active
  // card index goes through state, and it changes once per story
  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const scrollable = containerRef.current.offsetHeight - window.innerHeight
      const progress = Math.max(0, Math.min(1, -rect.top / scrollable))

      const position = wheelPosition(progress)
      const active = Math.round(position)
      const settled = Math.abs(position - active) < SETTLED_STEPS ? active : -1
      cardRefs.current.forEach((card, i) => {
        if (card) Object.assign(card.style, cardFrame(i, position))
      })
      const record = recordRef.current
      if (record) {
        Object.assign(record.style, recordFrame(position))
        const gaps = recordGaps(window.innerWidth)
        record.style.setProperty('--gap-outer', `${gaps.outer}px`)
        record.style.setProperty('--gap-inner', `${gaps.inner}px`)
      }
      // The light stays put while the record turns under it
      if (sheenRef.current) Object.assign(sheenRef.current.style, recordFrame(0))
      const stage = stageRef.current
      if (stage && armRef.current && armRodRef.current && stage.clientWidth >= ARM_MIN_WIDTH) {
        const needle = needleAt(progress, stage.clientWidth, stage.clientHeight)
        armRef.current.setAttribute('transform', `translate(${needle.x} ${needle.y}) rotate(${needle.angle})`)
        armRodRef.current.setAttribute('width', String(needle.length))
      }
      setActiveCard(active)
      // Nudge each card once, when it has fully risen into view
      if (settled >= 0 && !nudgedCards.current.has(settled)) {
        setNudgingCard((nudging) => nudging ?? settled)
      }
    }
    const handleScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    // The wheel's radius follows the viewport width
    window.addEventListener('resize', handleScroll)
    update()
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
      cancelAnimationFrame(frame)
    }
  }, [])

  const endNudge = (index: number) => {
    nudgedCards.current.add(index)
    setNudgingCard(null)
  }

  // A card pinned open by tap or keyboard closes when you scroll to another one
  useEffect(() => {
    setPinnedCard((pinned) => (pinned === activeCard ? pinned : null))
  }, [activeCard])

  const flippedCard = hoveredCard ?? pinnedCard

  return (
    <div ref={containerRef} className="relative" style={{ height: `${stories.length * 100}dvh` }}>
      <div ref={stageRef} className="sticky top-0 h-dvh flex items-center justify-center overflow-hidden">
        <div ref={recordRef} className="manifesto-record absolute rounded-full" style={recordFrame(0)} aria-hidden="true" />
        <div ref={sheenRef} className="manifesto-sheen absolute rounded-full pointer-events-none" style={recordFrame(0)} aria-hidden="true" />
        {stories.map((story, index) => {
          const isActive = index === activeCard
          return (
            <div
              key={story.text}
              ref={(el) => {
                cardRefs.current[index] = el
              }}
              className="absolute inset-0 flex items-center justify-center px-6"
              style={{ ...cardFrame(index, 0), transition: 'opacity 0.1s ease-out' }}
              // Hide cards that are off-screen from clicks, keyboard and screen readers
              inert={!isActive}
            >
              <StoryCard
                story={story}
                index={index}
                isFlipped={flippedCard === index}
                shouldNudge={nudgingCard === index}
                onNudgeEnd={() => endNudge(index)}
                onHoverChange={(hovered) => setHoveredCard(hovered ? index : null)}
                onToggle={() => setPinnedCard((pinned) => (pinned === index ? null : index))}
              />
            </div>
          )
        })}

        {/* The tonearm: its pivot is off the right edge, so only the arm and
            headshell reach in. Where the stylus sits shows how far through
            the section the reader is. */}
        <svg
          className="absolute inset-0 h-full w-full overflow-visible pointer-events-none hidden min-[1100px]:block"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="tonearm-metal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#e4e4e0" />
              <stop offset="0.55" stopColor="#9a9a96" />
              <stop offset="1" stopColor="#6e6e6a" />
            </linearGradient>
          </defs>
          <g ref={armRef}>
            <rect ref={armRodRef} x="0" y="-4" height="8" rx="4" fill="url(#tonearm-metal)" />
            <rect x="-22" y="-13" width="44" height="26" rx="4" fill="#1e1e1e" stroke="#8d8d8a" strokeWidth="1.5" />
            <rect x="-16" y="-7" width="20" height="14" rx="2" fill="#b33a2a" />
            <rect x="10" y="-15" width="26" height="4" rx="2" fill="url(#tonearm-metal)" />
            <circle cx="-6" cy="0" r="2.2" fill="#e4e4e0" />
          </g>
        </svg>
      </div>
    </div>
  )
}

export default function Manifesto() {
  return usePrefersReducedMotion() ? <StaticManifesto /> : <ScrollManifesto />
}
