import { Fragment, useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import Section from '../layout/Section'
import MagazineLine from '../ui/MagazineLine'
import AskChat from '../ask/AskChat'
import { useAskChat, usePrefersReducedMotion } from '../../hooks'

const TITLE = 'Ask About'
const TITLE_END = 'Me'

interface TitleFrame {
  // How long after the previous frame this one shows
  after: number
  // Characters typed so far, across "Ask About" and then "Me"
  typed: number
}

// The title types out behind a cursor, as if being generated: "Ask About",
// a beat as if thinking, then "Me". The cursor stays after "Me", blinking,
// like a prompt waiting for the visitor's question.
const TITLE_FRAMES: TitleFrame[] = (() => {
  const frames: TitleFrame[] = [{ after: 0, typed: 0 }]
  const total = TITLE.length + TITLE_END.length
  for (let typed = 1; typed <= total; typed++) {
    // A short wait first, as before a response starts, and a longer one
    // before "Me"; otherwise uneven keystrokes, which read as typing rather
    // than a ticker
    const after = typed === 1 ? 450 : typed === TITLE.length + 1 ? 650 : 70 + ((typed * 7) % 4) * 18
    frames.push({ after, typed })
  }
  return frames
})()

function Cursor() {
  return (
    <span aria-hidden="true" className="relative inline-block w-0">
      <span className="ask-cursor" />
    </span>
  )
}

// Plays once, when the header comes into view; with reduced motion the title
// is simply there, cursor and all. The whole title is in the page throughout, only hidden,
// so the layout never shifts and screen readers get it whole.
function AskHeader() {
  const ref = useRef<HTMLDivElement>(null)
  const reducedMotion = usePrefersReducedMotion()
  const [started, setStarted] = useState(false)
  const [frameIndex, setFrameIndex] = useState(0)
  const frame = TITLE_FRAMES[reducedMotion ? TITLE_FRAMES.length - 1 : frameIndex]

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true)
          observer.disconnect()
        }
      },
      { threshold: 0.6 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!started || reducedMotion) return
    const timers: number[] = []
    let at = 0
    TITLE_FRAMES.forEach((f, i) => {
      at += f.after
      timers.push(window.setTimeout(() => setFrameIndex(i), at))
    })
    return () => timers.forEach(clearTimeout)
  }, [started, reducedMotion])

  return (
    <div ref={ref} className="mb-12">
      <span className="font-mono text-sm text-zinc-400 uppercase tracking-widest">Ask</span>
      <h2 className="font-serif text-4xl md:text-5xl font-light mt-4 tracking-tight">
        {frame.typed === 0 && <Cursor />}
        {TITLE.split('').map((char, i) => (
          <Fragment key={i}>
            <span className={i < frame.typed ? 'opacity-100' : 'opacity-0'}>{char}</span>
            {i === frame.typed - 1 && <Cursor />}
          </Fragment>
        ))}
        <br />
        <span className="italic">
          {TITLE_END.split('').map((char, i) => {
            const at = TITLE.length + i
            return (
              <Fragment key={i}>
                <span className={at < frame.typed ? 'opacity-100' : 'opacity-0'}>{char}</span>
                {at === frame.typed - 1 && <Cursor />}
              </Fragment>
            )
          })}
        </span>
      </h2>
      <p className="mt-4 text-zinc-faded max-w-3xl">
        A small language model on my home server answers from the projects and notes on this
        site and my resume, with sources. It can be wrong, so check the links.
      </p>
    </div>
  )
}

// Leads on from the chat to the story below. The first story card only
// fades in after a screen of scrolling, and without this the page looked as
// if it ended at the chat. The line draws down once it comes into view.
function OnToAbout() {
  const ref = useRef<HTMLAnchorElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <a
      ref={ref}
      href="#about"
      className="group mt-24 mx-auto flex w-fit flex-col items-center text-center"
    >
      <span
        aria-hidden="true"
        className="block h-24 w-px bg-gradient-to-b from-transparent to-sage/70 origin-top
          transition-transform duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
        style={{ transform: isVisible ? 'scaleY(1)' : 'scaleY(0)' }}
      />
      <span
        className={`mt-6 font-mono text-sm text-zinc-400 uppercase tracking-widest
          group-hover:text-sage group-focus-visible:text-sage
          transition-[opacity,color] duration-700 delay-300 motion-reduce:transition-none
          ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        About me
      </span>
      <span
        className={`mt-3 font-serif text-3xl md:text-4xl font-light tracking-tight
          transition-opacity duration-700 delay-500 motion-reduce:transition-none
          ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        How I <span className="italic">Work</span>
      </span>
      <ChevronDown
        aria-hidden="true"
        className={`mt-6 h-5 w-5 text-sage motion-safe:animate-bounce
          transition-opacity duration-700 delay-700 motion-reduce:transition-none
          ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      />
    </a>
  )
}

export default function Ask() {
  // The chat box starts at the width of the text above it and opens out to
  // nearly the width of the window with the first question. Only the width: a
  // taller box would push down whatever the visitor is reading further down
  // the page when they ask from the floating chat.
  const opened = useAskChat().turns.length > 0

  return (
    <Section id="ask">
      <AskHeader />
      <MagazineLine className="mb-8" />

      {/* Centred on the page rather than in the text column, so it can open
          out past the column's edges: from the column's full width up to
          88rem, and never closer than 1.5rem to the window's edges. */}
      <AskChat
        className={`relative left-1/2 -translate-x-1/2 w-[calc(100vw-3rem)] h-[min(70vh,36rem)]
          rounded-3xl border border-zinc-200 dark:border-zinc-700
          transition-[max-width] duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none
          ${opened ? 'max-w-[88rem]' : 'max-w-full'}`}
      />

      <OnToAbout />
    </Section>
  )
}
