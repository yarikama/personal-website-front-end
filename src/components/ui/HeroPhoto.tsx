import { useRef, useState } from 'react'
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

  // Write transforms straight to the DOM so mouse movement never re-renders
  const setParallax = (x: number, y: number) => {
    layerRefs.current.forEach((el, i) => {
      if (el) el.style.transform = layerTransform(x, y, layers[i].depth)
    })
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
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
      style={{ visibility: settled < layers.length ? 'hidden' : undefined }}
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
