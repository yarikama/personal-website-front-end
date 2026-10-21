import { useEffect, useState } from 'react'
import { usePrefersReducedMotion } from '../../hooks'

interface FlipTextProps {
  front: string
  back: string
  className?: string
  backClassName?: string
  // Nudge once on its own this many ms after mount, to show that it flips
  hintDelay?: number
}

export default function FlipText({ front, back, className = '', backClassName = '', hintDelay }: FlipTextProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [isNudging, setIsNudging] = useState(false)
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    if (hintDelay === undefined || reducedMotion) return
    const timer = setTimeout(() => setIsNudging(true), hintDelay)
    return () => clearTimeout(timer)
  }, [hintDelay, reducedMotion])

  return (
    <span
      className={`inline-block cursor-pointer ${className}`}
      style={{ perspective: '1000px' }}
      onMouseEnter={() => setIsFlipped(true)}
      onMouseLeave={() => setIsFlipped(false)}
    >
      <span
        className={`inline-block transition-transform duration-700 ease-out ${isNudging ? 'animate-nudge' : ''}`}
        onAnimationEnd={() => setIsNudging(false)}
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateX(180deg)' : 'rotateX(0deg)',
        }}
      >
        {/* Front - English */}
        <span
          className="inline-block"
          style={{
            backfaceVisibility: 'hidden',
          }}
        >
          {front}
        </span>

        {/* Back - Chinese */}
        <span
          className={`absolute left-0 top-0 inline-block ${backClassName}`}
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateX(180deg)',
            fontFamily: 'var(--font-serif-tc)',
          }}
        >
          {back}
        </span>
      </span>
    </span>
  )
}
