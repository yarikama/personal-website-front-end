import { useEffect, useRef } from 'react'
import Container from '../layout/Container'
import HeroPhoto from '../ui/HeroPhoto'
import HeroBackdrop from '../ui/HeroBackdrop'
import FlipText from '../ui/FlipText'

const BAR_MAX_HEIGHT = 22

// Scale (0-1) of scroll-indicator bar `i` for a hero scroll progress of 0-1
function barScale(i: number, progress: number) {
  const waveCenter = progress * 9
  const waveHeight = Math.max(0, 1 - Math.abs(i - waveCenter) * 0.4)
  return (8 + waveHeight * 14) / BAR_MAX_HEIGHT
}

const AWARD_LABEL = 'font-mono text-sm uppercase tracking-widest px-4 py-2'

// An award badge that, on hover, a wave of sage washes over from the left,
// then pushes the arrow open on the right
function AwardLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="liquid-trigger group flex items-stretch border border-sage/40 hover:border-sage transition-colors duration-300"
    >
      <span className="relative overflow-hidden">
        <span className={`block text-sage ${AWARD_LABEL}`}>{children}</span>
        <span aria-hidden="true" className="liquid-foam" />
        <span aria-hidden="true" className="liquid-fill">
          <span className="liquid-fill-body">
            <span className={`liquid-fill-text flex items-center text-paper ${AWARD_LABEL}`}>{children}</span>
          </span>
        </span>
      </span>
      {/* Opens as the wave reaches it, closes at once */}
      <span className="flex items-center justify-center overflow-hidden w-0 group-hover:w-10 group-hover:px-3 group-focus-visible:w-10 group-focus-visible:px-3 bg-sage text-paper transition-[width,padding] duration-300 group-hover:delay-[350ms] group-focus-visible:delay-[350ms]">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 13L13 1M13 1H5M13 1V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    </a>
  )
}

export default function Hero() {
  const barRefs = useRef<(HTMLDivElement | null)[]>([])

  // Drive the bars from scroll without re-rendering the hero
  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const progress = Math.min(window.scrollY / window.innerHeight, 1)
      barRefs.current.forEach((bar, i) => {
        if (bar) bar.style.transform = `scaleY(${barScale(i, progress)})`
      })
    }
    const handleScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      cancelAnimationFrame(frame)
    }
  }, [])

  const renderBar = (i: number) => (
    <div
      key={i}
      ref={(el) => {
        barRefs.current[i] = el
      }}
      className="w-1 bg-sage origin-bottom transition-transform duration-100"
      style={{ height: `${BAR_MAX_HEIGHT}px`, transform: `scaleY(${barScale(i, 0)})` }}
    />
  )

  return (
    <section className="min-h-dvh flex items-center relative overflow-hidden">
      <Container>
        <div className="py-32 md:py-40 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text content */}
          <div>
            <h1 className="font-serif font-light tracking-tight leading-[0.9] text-[clamp(4rem,12vw,10rem)] lg:text-[clamp(3rem,8vw,7rem)]">
              {/* Each word nudges once on load, so visitors learn it flips to Chinese */}
              <FlipText front="Henry" back="恒睿" hintDelay={900} />
              <br />
              <FlipText front="Hsu" back="許" className="italic" backClassName="not-italic" hintDelay={1050} />
            </h1>

            <div className="mt-12 md:mt-16">
              {/* Syne shows its character from semibold up, and runs wide there,
                  so it is set a step smaller than the old tagline */}
              <p className="font-syne font-semibold text-xl md:text-[1.75rem] tracking-[-0.01em] text-zinc-faded leading-snug">
                Building AI systems, and the infrastructure behind them.
              </p>

              <p className="mt-4 text-lg text-zinc-faded leading-relaxed">
                Software engineer across GenAI and backend, from RAG architectures and
                agentic workflows to the pipelines and test infrastructure that keep them running.
              </p>
            </div>

            <div className="mt-12 flex flex-wrap gap-4">
              <AwardLink href="https://english.president.gov.tw/News/6881">
                2024 Presidential Hackathon Winner
              </AwardLink>
              <AwardLink href="https://lifenews.com.tw/334346">Golden Peak Award 2025</AwardLink>
              <span className="font-mono text-sm text-zinc-400 uppercase tracking-widest px-4 py-2 border border-zinc-200 dark:border-zinc-200/30">
                Dean's List × 2
              </span>
            </div>
          </div>

          {/* Right: Interactive photo */}
          <div className="lg:justify-self-end relative w-full max-w-[400px] lg:max-w-[480px] mx-auto">
            <HeroBackdrop />
            <HeroPhoto
              // Split from one photo, far to near: sky and street, the bridge,
              // the buildings on either side, the crowd (in black and white so
              // Henry stands out), then Henry
              layers={[
                { src: '/hero/sky.webp', depth: 3 },
                { src: '/hero/bridge.webp', depth: 7 },
                { src: '/hero/buildings.webp', depth: 12 },
                { src: '/hero/people.webp', depth: 17, grayscale: true },
                { src: '/hero/henry.webp', depth: 20 },
              ]}
              alt="Henry Hsu"
              width={960}
              height={1280}
              className="hero-photo-blob w-full max-w-[400px] lg:max-w-[480px] mx-auto"
            />
          </div>
        </div>
      </Container>

      <div className="absolute bottom-12 left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-4">
          <div className="flex items-end gap-1">{[0, 1, 2, 3, 4].map(renderBar)}</div>
          <div className="font-mono text-sm text-zinc-400 uppercase tracking-widest">
            Scroll to explore
          </div>
          <div className="flex items-end gap-1">{[5, 6, 7, 8, 9].map(renderBar)}</div>
        </div>
      </div>
    </section>
  )
}
