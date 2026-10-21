import { useEffect, useRef } from 'react'
import Container from '../layout/Container'
import HeroPhoto from '../ui/HeroPhoto'
import FlipText from '../ui/FlipText'

const BAR_MAX_HEIGHT = 22

// Scale (0-1) of scroll-indicator bar `i` for a hero scroll progress of 0-1
function barScale(i: number, progress: number) {
  const waveCenter = progress * 9
  const waveHeight = Math.max(0, 1 - Math.abs(i - waveCenter) * 0.4)
  return (8 + waveHeight * 14) / BAR_MAX_HEIGHT
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
              <p className="text-2xl md:text-3xl text-zinc-faded leading-relaxed font-light">
                Building AI systems, and the infrastructure behind them.
              </p>

              <p className="mt-4 text-lg text-zinc-faded leading-relaxed">
                Software engineer across GenAI and backend, from RAG architectures and
                agentic workflows to the pipelines and test infrastructure that keep them running.
              </p>
            </div>

            <div className="mt-12 flex flex-wrap gap-4">
              <a
                href="https://english.president.gov.tw/News/6881"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-stretch border border-sage/40 hover:border-sage transition-colors duration-300"
              >
                <span className="font-mono text-sm text-sage uppercase tracking-widest px-4 py-2">
                  2024 Presidential Hackathon Winner
                </span>
                <span className="flex items-center justify-center overflow-hidden w-0 group-hover:w-10 group-hover:px-3 group-focus-visible:w-10 group-focus-visible:px-3 bg-sage text-paper transition-[width,padding] duration-300">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 13L13 1M13 1H5M13 1V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </a>
              <a
                href="https://lifenews.com.tw/334346"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-stretch border border-zinc-200 dark:border-zinc-200/30 hover:border-sage transition-colors duration-300"
              >
                <span className="font-mono text-sm text-zinc-400 group-hover:text-sage group-focus-visible:text-sage uppercase tracking-widest px-4 py-2 transition-colors duration-300">
                  Golden Peak Award 2025
                </span>
                <span className="flex items-center justify-center overflow-hidden w-0 group-hover:w-10 group-hover:px-3 group-focus-visible:w-10 group-focus-visible:px-3 bg-sage text-paper transition-[width,padding] duration-300">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 13L13 1M13 1H5M13 1V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </a>
              <span className="font-mono text-sm text-zinc-400 uppercase tracking-widest px-4 py-2 border border-zinc-200 dark:border-zinc-200/30">
                Dean's List × 2
              </span>
            </div>
          </div>

          {/* Right: Interactive photo */}
          <div className="lg:justify-self-end">
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
