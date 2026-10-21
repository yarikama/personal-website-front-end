import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { useFinePointer, usePrefersReducedMotion } from '../../hooks'

export interface PhotoLayer {
  src: string
  // How far (px) the layer drifts at the photo's edge; nearer layers drift more
  depth: number
  grayscale?: boolean
}

interface HeroPhotoProps {
  // Back to front. The last layer is the subject and carries the alt text.
  layers: PhotoLayer[]
  alt: string
  width: number
  height: number
  className?: string
}

// Every layer is scaled up so drifting never reveals the frame's edge. It must
// cover the largest depth at the smallest rendered width: 1 + 20px / (400px / 2).
const OVERSCAN = 1.1

const layerTransform = (x: number, y: number, depth: number) =>
  `translate(${x * depth}px, ${y * depth}px) scale(${OVERSCAN})`

// With a mouse: one loop through the parallax a moment after the photo
// appears, so visitors learn it follows the pointer. It waits for the name's
// nudge in the hero to finish, so the two never move at once.
const HINT_DELAY = 2200
const HINT_DURATION = 1600
const HINT_REACH = 0.6

// On touch screens there is no pointer to follow, so the layers drift slowly
// on their own; the two periods differ so the path never visibly repeats
const DRIFT_PERIOD_X = 9000
const DRIFT_PERIOD_Y = 13000
const DRIFT_REACH = 0.5

export default function HeroPhoto({ layers, alt, width, height, className = '' }: HeroPhotoProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const layerRefs = useRef<(HTMLElement | null)[]>([])
  const finePointer = useFinePointer()
  const reducedMotion = usePrefersReducedMotion()
  const parallaxEnabled = finePointer && !reducedMotion
  // Hidden until every layer has arrived (or failed), so the photo appears
  // whole at once instead of assembling layer by layer on a slow connection
  const [settled, setSettled] = useState(0)
  const settle = () => setSettled((n) => n + 1)
  const ready = settled >= layers.length
  // Once the visitor moves the mouse over the photo, the hint gives way
  const pointerMovedRef = useRef(false)

  // Write transforms straight to the DOM so mouse movement never re-renders
  const setParallax = (x: number, y: number) => {
    layerRefs.current.forEach((el, i) => {
      if (el) el.style.transform = layerTransform(x, y, layers[i].depth)
    })
  }
  const moveLayers = useEffectEvent(setParallax)

  useEffect(() => {
    if (!ready || reducedMotion) return
    let frame = 0

    if (finePointer) {
      const timer = setTimeout(() => {
        const start = performance.now()
        const step = (now: number) => {
          if (pointerMovedRef.current) return
          const t = Math.min((now - start) / HINT_DURATION, 1)
          // A loop whose reach swells and fades, so it starts and ends at rest
          const reach = Math.sin(Math.PI * t) * HINT_REACH
          if (t < 1) {
            moveLayers(Math.sin(2 * Math.PI * t) * reach, -Math.cos(2 * Math.PI * t) * reach * 0.6)
            frame = requestAnimationFrame(step)
          } else {
            moveLayers(0, 0)
            frame = 0
          }
        }
        frame = requestAnimationFrame(step)
      }, HINT_DELAY)
      return () => {
        clearTimeout(timer)
        cancelAnimationFrame(frame)
      }
    }

    // Drift only while the photo is on screen
    let visible = true
    const start = performance.now()
    const step = (now: number) => {
      frame = 0
      if (!visible) return
      const t = now - start
      moveLayers(
        Math.sin((2 * Math.PI * t) / DRIFT_PERIOD_X) * DRIFT_REACH,
        Math.sin((2 * Math.PI * t) / DRIFT_PERIOD_Y) * DRIFT_REACH * 0.7
      )
      frame = requestAnimationFrame(step)
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible && !frame) frame = requestAnimationFrame(step)
    })
    if (containerRef.current) observer.observe(containerRef.current)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [ready, reducedMotion, finePointer])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    pointerMovedRef.current = true
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    // Normalize to -1 to 1
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1
    setParallax(x, y)
  }

  const restTransform = { transform: layerTransform(0, 0, 0) }
  const background = layers.slice(0, -1)
  const subject = layers[layers.length - 1]

  return (
    <div
      ref={containerRef}
      className={`hero-photo-container ${className}`}
      style={{ visibility: ready ? undefined : 'hidden' }}
      onMouseMove={parallaxEnabled ? handleMouseMove : undefined}
      onMouseLeave={parallaxEnabled ? () => setParallax(0, 0) : undefined}
    >
      {background.map((layer, i) => (
        <img
          key={layer.src}
          ref={(el) => {
            layerRefs.current[i] = el
          }}
          src={layer.src}
          alt=""
          aria-hidden="true"
          width={width}
          height={height}
          fetchPriority="high"
          onLoad={settle}
          onError={settle}
          // The first layer sets the frame's size; the rest stack on top of it
          className={i === 0 ? 'hero-photo-bg' : 'hero-photo-fg'}
          style={{ ...restTransform, filter: layer.grayscale ? 'grayscale(1)' : undefined }}
          draggable={false}
        />
      ))}

      <img
        ref={(el) => {
          layerRefs.current[background.length] = el
        }}
        src={subject.src}
        alt={alt}
        width={width}
        height={height}
        fetchPriority="high"
        onLoad={settle}
        onError={settle}
        className="hero-photo-fg"
        style={restTransform}
        draggable={false}
      />
    </div>
  )
}
