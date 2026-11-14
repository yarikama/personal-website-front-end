import { useEffect, useRef, useState } from 'react'
import Container from '../layout/Container'
import { experience } from '../../data/experience'
import { useMediaQuery, usePrefersReducedMotion } from '../../hooks'
import type { ExperienceEntry, ExperienceHighlight } from '../../types'

// Right-hand text dial: one panel per role, turning around a horizontal axis
const DIAL_STEP = 50
const PANEL_HEIGHT = 560
const DIAL_RADIUS = PANEL_HEIGHT / 2 / Math.tan(((DIAL_STEP / 2) * Math.PI) / 180)

// Left-hand line: every role is a stop on one vertical line, spaced this far apart
const STOP_GAP = 240

// Keep the pinned block clear of the fixed site header
const NAV_CLEARANCE = 88

// Every role in page order, remembering which company it belongs to
const stops = experience.flatMap((entry, companyIndex) =>
  entry.roles.map((role) => ({ entry, role, companyIndex }))
)

// Render **figure** spans as highlighted text
function renderHighlighted(text: string) {
  return text.split(/\*\*(.+?)\*\*/).map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="text-sage font-semibold">
        {part}
      </span>
    ) : (
      part
    )
  )
}

function clamp01(x: number) {
  return Math.min(1, Math.max(0, x))
}

function smoothstep(x: number) {
  const t = clamp01(x)
  return t * t * (3 - 2 * t)
}

function LogoTile({ entry, size }: { entry: ExperienceEntry; size: 'md' | 'lg' }) {
  return (
    <a
      href={entry.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`
        relative z-10 shrink-0 flex items-center justify-center bg-white
        border border-zinc-200 dark:border-transparent shadow-sm
        transition-transform duration-300 hover:-translate-y-0.5
        ${size === 'lg' ? 'w-20 h-20 rounded-2xl p-4' : 'w-14 h-14 rounded-xl p-3'}
      `}
    >
      <img src={entry.logo} alt={entry.company} width={48} height={48} className="w-full h-full object-contain" />
    </a>
  )
}

function HighlightItem({ item }: { item: ExperienceHighlight }) {
  return (
    <li>
      <p className="font-mono text-xs text-zinc-400 uppercase tracking-widest mb-1">{item.label}</p>
      <p className="text-sm text-zinc-faded leading-relaxed">{renderHighlighted(item.text)}</p>
    </li>
  )
}

// A stop on the line: the company's logo, full size for its first role and one
// size down for later roles at the same company. The tile's paper-coloured ring
// cuts the line where the logo sits.
function LineStop({ stop, isFirstRole }: { stop: (typeof stops)[number]; isFirstRole: boolean }) {
  return (
    <div className={`${isFirstRole ? 'rounded-2xl' : 'rounded-xl'} ring-12 ring-paper`}>
      <LogoTile entry={stop.entry} size={isFirstRole ? 'lg' : 'md'} />
    </div>
  )
}

// One role's text, as it sits on the dial
function RolePanel({ stop }: { stop: (typeof stops)[number] }) {
  const { entry, role } = stop
  return (
    <div className="h-full flex flex-col justify-center bg-paper">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <p className="font-serif text-3xl font-light tracking-tight text-ink">{entry.company}</p>
        {entry.tagline && (
          <p className="font-mono text-xs text-sage uppercase tracking-widest">{entry.tagline}</p>
        )}
        <p className="font-mono text-xs text-zinc-400 uppercase tracking-widest">{entry.location}</p>
      </div>
      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="font-serif text-2xl text-ink">{role.title}</h3>
        <span className="font-mono text-sm text-zinc-400">{role.period}</span>
      </div>
      <ul className="mt-6 space-y-5">
        {role.highlights.map((item) => (
          <HighlightItem key={item.label} item={item} />
        ))}
      </ul>
    </div>
  )
}

function SectionTitle() {
  return (
    <div>
      <span className="font-mono text-sm text-zinc-400 uppercase tracking-widest">Experience</span>
      <h2 className="font-serif text-4xl md:text-5xl font-light mt-4 tracking-tight">
        Where I've Shipped
      </h2>
    </div>
  )
}

// Desktop: on the left, one vertical line carries every company's logo and is
// pulled along as you scroll so the current role sits level with the text. On
// the right, each role's text sits on a dial that turns like a wheel.
function ExperienceDrum() {
  const containerRef = useRef<HTMLDivElement>(null)
  const pinnedRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const stopRefs = useRef<(HTMLDivElement | null)[]>([])
  const dialRef = useRef<HTMLDivElement>(null)
  const panelRefs = useRef<(HTMLDivElement | null)[]>([])
  const [frontStop, setFrontStop] = useState(0)
  const turns = stops.length - 1

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      if (!containerRef.current || !pinnedRef.current) return
      // The title and the dial pin together, centred in the space under the
      // site header; the turn runs from the moment they pin until the
      // container carries them away
      const pinnedHeight = pinnedRef.current.offsetHeight
      const pinTop = Math.max(
        NAV_CLEARANCE,
        NAV_CLEARANCE + (window.innerHeight - NAV_CLEARANCE - pinnedHeight) / 2
      )
      const top = `${pinTop}px`
      if (pinnedRef.current.style.top !== top) pinnedRef.current.style.top = top
      const rect = containerRef.current.getBoundingClientRect()
      const scrollable = containerRef.current.offsetHeight - pinnedHeight
      const raw = clamp01((pinTop - rect.top) / scrollable) * turns
      // Rest on each role for a moment, then turn to the next
      const segment = Math.min(Math.floor(raw), turns - 1)
      const position = segment + smoothstep((raw - segment - 0.25) / 0.5)

      // Text dial
      const dialAngle = position * DIAL_STEP
      if (dialRef.current) {
        dialRef.current.style.transform = `translateZ(${-DIAL_RADIUS}px) rotateX(${dialAngle}deg)`
      }
      panelRefs.current.forEach((panel, i) => {
        if (!panel) return
        const facing = Math.cos(((dialAngle - i * DIAL_STEP) * Math.PI) / 180)
        panel.style.opacity = String(clamp01((facing - 0.55) / 0.45))
      })

      // Line: pull the track so the current stop sits at the vertical centre,
      // and let stops fade and shrink the further they are from it
      if (trackRef.current) {
        trackRef.current.style.transform = `translateY(${PANEL_HEIGHT / 2 - position * STOP_GAP}px)`
      }
      stopRefs.current.forEach((stop, i) => {
        if (!stop) return
        const distance = Math.min(Math.abs(position - i), 1)
        stop.style.opacity = String(1 - 0.65 * distance)
        stop.style.transform = `translate(-50%, -50%) scale(${1 - 0.2 * distance})`
      })

      setFrontStop(Math.round(position))
    }
    const handleScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll)
    update()
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
      cancelAnimationFrame(frame)
    }
  }, [turns])

  return (
    <div ref={containerRef} className="relative">
      {/* Title and dial stay pinned as one block, so the title is always
          above the line while the roles turn */}
      <div ref={pinnedRef} className="sticky" style={{ top: NAV_CLEARANCE }}>
        <Container>
          <SectionTitle />
          <div className="mt-10 grid grid-cols-[320px_1fr] gap-16 items-center">
            {/* One line, every company's logo on it; edges fade out */}
            <div
              className="relative overflow-hidden"
              style={{
                height: `${PANEL_HEIGHT}px`,
                maskImage: 'linear-gradient(to bottom, transparent, black 18%, black 82%, transparent)',
              }}
            >
              <div
                ref={trackRef}
                className="absolute left-1/2 top-0 w-0"
                style={{ transform: `translateY(${PANEL_HEIGHT / 2}px)` }}
              >
                <div
                  className="absolute left-0 w-px bg-sage/60"
                  style={{ top: -PANEL_HEIGHT, height: turns * STOP_GAP + 2 * PANEL_HEIGHT }}
                  aria-hidden="true"
                />
                {stops.map((stop, i) => (
                  <div
                    key={`${stop.entry.company}-${stop.role.title}`}
                    ref={(el) => {
                      stopRefs.current[i] = el
                    }}
                    className="absolute left-0"
                    style={{ top: i * STOP_GAP, transform: 'translate(-50%, -50%)' }}
                  >
                    <LineStop stop={stop} isFirstRole={i === 0 || stops[i - 1].entry !== stop.entry} />
                  </div>
                ))}
              </div>
            </div>

            {/* Role text dial; roles turning away fade out at its edges
                instead of spilling over the title */}
            <div
              className="relative"
              style={{
                height: `${PANEL_HEIGHT}px`,
                perspective: '1600px',
                maskImage: 'linear-gradient(to bottom, transparent, black 4%, black 96%, transparent)',
              }}
            >
              <div
                ref={dialRef}
                className="absolute inset-0"
                style={{ transformStyle: 'preserve-3d', transform: `translateZ(${-DIAL_RADIUS}px)` }}
              >
                {stops.map((stop, i) => (
                  <div
                    key={`${stop.entry.company}-${stop.role.title}`}
                    ref={(el) => {
                      panelRefs.current[i] = el
                    }}
                    className="absolute inset-0"
                    style={{
                      transform: `rotateX(${-i * DIAL_STEP}deg) translateZ(${DIAL_RADIUS}px)`,
                      backfaceVisibility: 'hidden',
                    }}
                    // Only the role facing you is read out and focusable
                    inert={i !== frontStop}
                  >
                    <RolePanel stop={stop} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </div>
      {/* Scroll distance for the turns */}
      <div style={{ height: `${turns * 90}dvh` }} aria-hidden="true" />
    </div>
  )
}

// Mobile, short screens and reduced motion: the same single line, laid out flat,
// with each company's logo sitting on it and its roles listed below, latest first
function ExperienceTimeline() {
  return (
    <Container>
      <div>
        {experience.map((entry, companyIndex) => (
          <div key={entry.company}>
            <div className="flex items-center gap-5">
              <LogoTile entry={entry} size="md" />
              <div>
                <p className="font-serif text-3xl font-light tracking-tight text-ink">{entry.company}</p>
                {entry.tagline && (
                  <p className="mt-1 font-mono text-xs text-sage uppercase tracking-widest">{entry.tagline}</p>
                )}
                <p className="mt-1 font-mono text-xs text-zinc-400 uppercase tracking-widest">{entry.location}</p>
              </div>
            </div>

            {/* One line runs through every logo: it drops from this logo and
                carries on down to the next company's logo */}
            <div
              className={`relative ml-7 pl-10 pt-8 space-y-10 border-l border-sage/50 ${
                companyIndex < experience.length - 1 ? 'pb-16' : ''
              }`}
            >
              {entry.roles.map((role) => (
                <div key={role.title} className="relative">
                  <span
                    className="absolute -left-[calc(2.5rem+6.5px)] top-2 w-3 h-3 rounded-full bg-sage ring-4 ring-paper"
                    aria-hidden="true"
                  />
                  <h3 className="font-serif text-xl md:text-2xl text-ink">{role.title}</h3>
                  <p className="mt-1 font-mono text-sm text-zinc-400">{role.period}</p>
                  <ul className="mt-5 space-y-5">
                    {role.highlights.map((item) => (
                      <HighlightItem key={item.label} item={item} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Container>
  )
}

export default function Experience() {
  const reduceMotion = usePrefersReducedMotion()
  // The pinned title and dial need about 680px under the site header;
  // smaller screens get the flat timeline
  const roomyScreen = useMediaQuery('(min-width: 1024px) and (min-height: 780px)')
  const useDrum = roomyScreen && !reduceMotion

  return (
    <section id="experience" className="pt-[var(--section-spacing)]">
      {useDrum ? (
        <ExperienceDrum />
      ) : (
        <div className="pb-[var(--section-spacing)]">
          <Container className="mb-12">
            <SectionTitle />
          </Container>
          <ExperienceTimeline />
        </div>
      )}
    </section>
  )
}
