import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { usePrefersReducedMotion } from '../../hooks'
import { blobPath, type BlobShape } from '../../lib/blob'

// The border each print sits in, from the site's palette (index.css)
type Frame = 'paper' | 'sand' | 'mist' | 'sage' | 'forest'

interface Photo {
  slug: string
  alt: string
  // Written on the print's bottom border; stock shots carry none
  caption?: string
  landscape?: boolean
  frame: Frame
  // Along the track: left edge and photo height in track units (--u, about
  // 1vh), top as a share of the stage, and a tilt in degrees. The border
  // adds about a tenth to the height; whole prints stay above about 92% so
  // they clear the fixed footer bar.
  x: number
  y: number
  h: number
  tilt: number
  // Drift against the pan, so overlapping photos read as layers: below 1
  // trails behind, above 1 runs ahead
  depth: number
}

// Henry's own photos, plus two stock shots of code from Unsplash (free under
// the Unsplash License): code-lamp by Harshit Katiyar
// (unsplash.com/photos/5sLNGV2EFRM) and code-keyboard by Vishnu Kalanad
// (unsplash.com/photos/evzHeMgbKOg). A collage laid along one long strip,
// some photos tilted and overlapping; the plane wing comes last and largest,
// just before Ask.
const PHOTOS: Photo[] = [
  {
    slug: 'sequoia',
    alt: 'Henry with his arms spread between two giant sequoias',
    caption: 'Sequoia National Park, CA',
    frame: 'paper',
    x: 6, y: 10, h: 75, tilt: -2, depth: 0.9,
  },
  {
    slug: 'grand-canyon',
    alt: 'Henry smiling at the rim of the Grand Canyon under a cloudy sky',
    caption: 'Grand Canyon, AZ',
    frame: 'sand',
    x: 56, y: 36, h: 52, tilt: 4, depth: 1.15,
  },
  {
    slug: 'code-lamp',
    alt: 'Code in a dark editor on a monitor, lit by a lamp',
    landscape: true,
    frame: 'forest',
    x: 98, y: 11, h: 36, tilt: -3, depth: 1,
  },
  {
    slug: 'kingman',
    alt: 'Henry outside the Kingman visitor center, a Route 66 shield painted on the road',
    caption: 'Route 66, Kingman, AZ',
    frame: 'mist',
    x: 116, y: 40, h: 48, tilt: 2, depth: 1.1,
  },
  {
    slug: 'central-park',
    alt: 'Henry in a winter jacket by a frozen pond in Central Park, snow on the trees',
    caption: 'Central Park, New York',
    frame: 'paper',
    x: 158, y: 12, h: 72, tilt: -1.5, depth: 0.9,
  },
  {
    slug: 'sedona',
    alt: 'Henry on a red dirt trail in Sedona, hands on his head, Courthouse Butte behind',
    caption: 'Sedona, AZ',
    frame: 'sage',
    x: 204, y: 36, h: 50, tilt: 5, depth: 1.15,
  },
  {
    slug: 'code-keyboard',
    alt: 'Lines of code on a laptop screen above its keyboard',
    landscape: true,
    frame: 'sand',
    x: 250, y: 12, h: 38, tilt: -4, depth: 1,
  },
  {
    slug: 'san-francisco',
    alt: 'A cable car climbing California Street in San Francisco, the Bay Bridge at the far end',
    caption: 'California Street, San Francisco',
    frame: 'mist',
    x: 262, y: 44, h: 44, tilt: 3, depth: 1.1,
  },
  {
    slug: 'over-the-southwest',
    alt: 'A plane wing over desert canyons seen from the window',
    caption: 'Somewhere over the Southwest',
    frame: 'paper',
    x: 306, y: 6, h: 78, tilt: -1, depth: 0.95,
  },
]

// Track length in units: the last photo's right edge plus a margin
const TRACK_UNITS = 385
// How far a photo drifts over the whole pan per unit of depth away from 1
// (px): at depth 1.15 that is about 85px ahead
const DRIFT = 560
// The backdrop pans at this share of the photos' speed, so it sits well
// behind them
const BACKDROP_DEPTH = 0.6

// Small, faint shapes in the hero's palette scattered along the backdrop, in
// the same units as the track (100 tall), at varied heights; a few overlap
// in pairs so they deepen where they meet, as on the blob card behind the
// hero photo. Colours index the --hero-stripe palette.
const BACKDROP_BLOBS: (BlobShape & { color: number })[] = [
  { cx: 14, cy: 20, rx: 20, ry: 15, rotate: -12, phase: [0.4, 2.1], color: 4 },
  { cx: 40, cy: 84, rx: 18, ry: 13, rotate: 10, phase: [2.6, 0.9], color: 2 },
  { cx: 52, cy: 72, rx: 14, ry: 11, rotate: -20, phase: [5.3, 1.7], color: 5 },
  { cx: 78, cy: 12, rx: 16, ry: 12, rotate: 18, phase: [4.1, 3.3], color: 1 },
  { cx: 100, cy: 56, rx: 22, ry: 16, rotate: -8, phase: [1.2, 5.0], color: 2 },
  { cx: 128, cy: 88, rx: 17, ry: 12, rotate: 4, phase: [3.0, 4.4], color: 4 },
  { cx: 150, cy: 26, rx: 19, ry: 14, rotate: 14, phase: [0.9, 2.8], color: 5 },
  { cx: 162, cy: 16, rx: 13, ry: 10, rotate: -6, phase: [4.7, 0.3], color: 3 },
  { cx: 190, cy: 78, rx: 21, ry: 15, rotate: 6, phase: [2.2, 1.1], color: 1 },
  { cx: 220, cy: 40, rx: 15, ry: 12, rotate: -16, phase: [3.6, 4.9], color: 2 },
  { cx: 246, cy: 90, rx: 18, ry: 12, rotate: 12, phase: [1.7, 3.8], color: 4 },
  { cx: 258, cy: 80, rx: 13, ry: 10, rotate: -4, phase: [5.9, 0.6], color: 5 },
  { cx: 284, cy: 18, rx: 20, ry: 14, rotate: 8, phase: [0.2, 5.4], color: 1 },
  { cx: 312, cy: 62, rx: 16, ry: 12, rotate: -14, phase: [2.9, 2.0], color: 2 },
  { cx: 344, cy: 88, rx: 19, ry: 13, rotate: 16, phase: [4.4, 1.4], color: 3 },
  { cx: 370, cy: 30, rx: 17, ry: 13, rotate: -10, phase: [1.0, 3.1], color: 4 },
]
const BACKDROP_PATHS = BACKDROP_BLOBS.map((blob) => ({ d: blobPath(blob), color: blob.color }))

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

function placement(photo: Photo) {
  return {
    '--x': photo.x,
    '--y': `${photo.y}%`,
    '--h': photo.h,
    '--aspect': photo.landscape ? '4 / 3' : '3 / 4',
    '--ratio': photo.landscape ? 4 / 3 : 3 / 4,
    '--tilt': `${photo.tilt}deg`,
  } as CSSProperties
}

function TravelPhoto({ photo, innerRef }: { photo: Photo; innerRef?: (el: HTMLDivElement | null) => void }) {
  const widths = [480, 960, 1440]
  return (
    <div className="travel-photo group" style={placement(photo)}>
      <div ref={innerRef}>
        <figure className={`travel-photo-card travel-print-${photo.frame} m-0`}>
          <div className="travel-frame">
            <img
              src={`/travel/${photo.slug}-960.webp`}
              srcSet={widths.map((w) => `/travel/${photo.slug}-${w}.webp ${w}w`).join(', ')}
              sizes={`${Math.round(photo.h * (photo.landscape ? 4 / 3 : 3 / 4))}vh`}
              width={960}
              height={photo.landscape ? 720 : 1280}
              alt={photo.alt}
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          </div>
          {/* The thick bottom border, with or without a note on it */}
          {photo.caption ? (
            <figcaption className="travel-print-note">{photo.caption}</figcaption>
          ) : (
            <div aria-hidden="true" className="travel-print-note">&nbsp;</div>
          )}
        </figure>
      </div>
    </div>
  )
}

// The shapes, scaled to cover their box and anchored at its left edge
function TravelBackdrop({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${TRACK_UNITS} 100`}
      preserveAspectRatio="xMinYMid slice"
      className={`travel-backdrop ${className}`}
    >
      {BACKDROP_PATHS.map(({ d, color }) => (
        <path key={d} d={d} className="travel-backdrop-blob" style={{ fill: `var(--hero-stripe-${color})` }} />
      ))}
    </svg>
  )
}

// A collage of travel photos between the hero and Ask. The section pins to
// the screen and scrolling down pans the strip to the left, so the visitor
// travels right through it; overlapping photos drift at slightly different
// speeds so they read as layers, over faint shapes in the hero's palette
// that pans slower still. With reduced motion it is a plain strip
// the visitor can swipe or scroll sideways.
export default function TravelWall() {
  const reducedMotion = usePrefersReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const driftRefs = useRef<(HTMLDivElement | null)[]>([])
  const backdropRef = useRef<HTMLDivElement>(null)
  // How far the strip pans, in px: its width less the screen's
  const [distance, setDistance] = useState(0)

  useEffect(() => {
    if (reducedMotion || !trackRef.current) return
    const track = trackRef.current
    const measure = () => setDistance(Math.max(0, track.offsetWidth - window.innerWidth))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(track)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [reducedMotion])

  // Drive the pan from scroll, writing straight to the DOM, and only while
  // the section is on screen
  useEffect(() => {
    if (reducedMotion || !sectionRef.current || !trackRef.current) return
    const section = sectionRef.current
    const track = trackRef.current
    let frame = 0
    const update = () => {
      frame = 0
      const rect = section.getBoundingClientRect()
      const pinned = section.offsetHeight - window.innerHeight
      const progress = pinned > 0 ? clamp01(-rect.top / pinned) : 0
      track.style.transform = `translateX(${-progress * distance}px)`
      driftRefs.current.forEach((el, i) => {
        if (el) el.style.transform = `translateX(${(1 - PHOTOS[i].depth) * progress * DRIFT}px)`
      })
      if (backdropRef.current) {
        backdropRef.current.style.transform = `translateX(${-progress * distance * BACKDROP_DEPTH}px)`
      }
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        window.addEventListener('scroll', onScroll, { passive: true })
        update()
      } else {
        window.removeEventListener('scroll', onScroll)
      }
    })
    observer.observe(section)
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [reducedMotion, distance])

  if (reducedMotion) {
    return (
      <section aria-label="Travel photos" className="travel-strip overflow-x-auto overscroll-x-contain">
        <div className="travel-track" style={{ '--track': TRACK_UNITS } as CSSProperties}>
          <TravelBackdrop className="absolute inset-0 h-full w-full" />
          {PHOTOS.map((photo) => (
            <TravelPhoto key={photo.slug} photo={photo} />
          ))}
        </div>
      </section>
    )
  }

  return (
    <section
      ref={sectionRef}
      aria-label="Travel photos"
      className="relative"
      // A screen of height to pin in, plus as much scroll as the strip pans
      style={{ height: `calc(100dvh + ${distance}px)` }}
    >
      <div className="sticky top-0 h-dvh overflow-hidden flex items-center">
        {/* As wide as the strip, which covers the screen through its own,
            slower pan */}
        <div
          ref={backdropRef}
          className="absolute inset-y-0 left-0 will-change-transform"
          style={{ width: `${TRACK_UNITS}vh`, maxWidth: 'none' }}
        >
          <TravelBackdrop className="h-full w-full" />
        </div>
        <div
          ref={trackRef}
          className="travel-track will-change-transform"
          style={{ '--track': TRACK_UNITS } as CSSProperties}
        >
          {PHOTOS.map((photo, i) => (
            <TravelPhoto
              key={photo.slug}
              photo={photo}
              innerRef={(el) => {
                driftRefs.current[i] = el
              }}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

