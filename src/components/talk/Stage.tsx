import { useLayoutEffect, useRef, useState } from 'react'
import { StepContext, sectionLabel, type SlideDef } from './talk'

// Slides are laid out on a fixed 16:9 canvas and scaled to fit, so they look
// the same on a laptop, a projector and a screen share
export const STAGE_WIDTH = 1600
export const STAGE_HEIGHT = 900

interface StageProps {
  slide: SlideDef
  index: number
  step: number
  total: number
  // Off for the presenter view's small previews
  animate?: boolean
  className?: string
}

// Renders one slide on the canvas, scaled to fill its box without cropping.
// The box needs a position and a size of its own: `absolute inset-0`, or
// `relative` with an aspect ratio.
export default function Stage({ slide, index, step, total, animate = true, className = '' }: StageProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)

  // Measure before paint, so the canvas never shows at the wrong size
  useLayoutEffect(() => {
    const box = boxRef.current
    if (!box) return
    const fit = () => setScale(Math.min(box.clientWidth / STAGE_WIDTH, box.clientHeight / STAGE_HEIGHT))
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(box)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={boxRef} className={`overflow-hidden ${className}`}>
      <div
        className="absolute left-1/2 top-1/2 bg-paper text-ink text-pretty overflow-hidden"
        style={{
          width: STAGE_WIDTH,
          height: STAGE_HEIGHT,
          transform: `translate(-50%, -50%) scale(${scale})`,
        }}
      >
        <StepContext.Provider value={step}>
          {/* Keyed by slide, so each new slide plays its entrance once */}
          <div key={index} className={`absolute inset-0 px-28 pt-24 pb-28 ${animate ? 'animate-slide-enter' : ''}`}>
            {slide.render()}
          </div>
        </StepContext.Provider>

        {!slide.bare && (
          <>
            <div className="absolute bottom-10 left-28 right-28 flex justify-between font-mono text-[15px] text-zinc-400 uppercase tracking-widest">
              <span>{sectionLabel(slide.section)}</span>
              <span>
                {index + 1} / {total}
              </span>
            </div>
            <div
              className="absolute bottom-0 left-0 h-[3px] bg-sage transition-[width] duration-500 ease-elegant"
              style={{ width: `${((index + 1) / total) * 100}%` }}
              aria-hidden="true"
            />
          </>
        )}
      </div>
    </div>
  )
}
