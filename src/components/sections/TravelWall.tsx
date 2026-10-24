import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { usePrefersReducedMotion } from '../../hooks'

// The border each print sits in, from the site's palette (index.css)
type Frame = 'paper' | 'sand' | 'mist' | 'sage' | 'forest'

// Width over height for each shape a photo comes in
const RATIOS = { portrait: 3 / 4, landscape: 4 / 3, wide: 16 / 9 }
type Shape = keyof typeof RATIOS

interface Photo {
  slug: string
  alt: string
  // Written on the print's bottom border
  caption?: string
  // Portrait unless given
  shape?: Shape
  frame: Frame
  // Along the track: left edge and photo height in track units (--u, about
  // 1vh), top as a share of the stage, and a tilt in degrees. The border
  // adds about a tenth to the height. Prints alternate high and low: the
  // high ones may tuck a little under the fixed header, and the low ones end
  // about 90% down, clear of the fixed footer.
  x: number
  y: number
  h: number
  tilt: number
  // Drift against the pan, so overlapping photos read as layers: below 1
  // trails behind, above 1 runs ahead
  depth: number
}

// Henry's own photos, plus one stock shot of code from Unsplash (free under
// the Unsplash License): code-lamp by Harshit Katiyar
// (unsplash.com/photos/5sLNGV2EFRM). A collage laid along one long strip,
// zigzagging high and low, some tilted and overlapping: it sets off from
// Taoyuan airport with family, and ends on the plane wing, largest, just
// before Ask. Every even-numbered print sits high and every odd one low,
// which is also the way each pops in and out (see the pan below).
const PHOTOS: Photo[] = [
  {
    slug: 'taoyuan-airport',
    alt: 'Henry with his family under the departures board at Taiwan Taoyuan International Airport',
    caption: 'Taoyuan International Airport',
    shape: 'wide',
    frame: 'mist',
    x: 6, y: 10, h: 46, tilt: -2, depth: 1,
  },
  {
    slug: 'sequoia',
    alt: 'Henry with his arms spread between two giant sequoias',
    caption: 'Sequoia National Park, CA',
    frame: 'paper',
    x: 76, y: 26, h: 56, tilt: 2, depth: 1.1,
  },
  {
    slug: 'grand-canyon',
    alt: 'Henry sitting on the stone wall at the rim of the Grand Canyon, the canyon lit behind him',
    caption: 'Grand Canyon, AZ',
    frame: 'sand',
    x: 108, y: 8, h: 52, tilt: -3, depth: 0.9,
  },
  {
    slug: 'code-lamp',
    alt: 'Code in a dark editor on a monitor, lit by a lamp',
    caption: 'Late night coding',
    shape: 'landscape',
    frame: 'forest',
    x: 137, y: 45, h: 36, tilt: 3, depth: 1.1,
  },
  {
    slug: 'google-tpke',
    alt: 'Henry beside a Google "G" made of coloured moss on a wall of wooden slats',
    caption: 'Google TPKE',
    frame: 'sage',
    x: 175, y: 8, h: 54, tilt: -2, depth: 0.9,
  },
  {
    slug: 'kingman',
    alt: 'Henry outside the Kingman visitor center, a Route 66 shield painted on the road',
    caption: 'Route 66, Kingman, AZ',
    frame: 'mist',
    x: 205, y: 32, h: 50, tilt: 2, depth: 1.1,
  },
  {
    slug: 'central-park',
    alt: 'Henry in a winter jacket by a frozen pond in Central Park, snow on the trees',
    caption: 'Central Park, New York',
    frame: 'paper',
    x: 232, y: 8, h: 56, tilt: -1.5, depth: 0.9,
  },
  {
    slug: 'rice',
    alt: 'Henry, mouth open in mock surprise, in a long brick-arched cloister at Rice University',
    caption: 'Rice University, Houston',
    frame: 'sand',
    x: 264, y: 30, h: 52, tilt: 3, depth: 1.1,
  },
  {
    slug: 'sedona',
    alt: 'Henry on a red dirt trail in Sedona, hands on his head, Courthouse Butte behind',
    caption: 'Sedona, AZ',
    frame: 'sage',
    x: 293, y: 8, h: 50, tilt: -4, depth: 0.9,
  },
  {
    slug: 'san-francisco',
    alt: 'A cable car climbing California Street in San Francisco, the Bay Bridge at the far end',
    caption: 'California Street, San Francisco',
    frame: 'mist',
    x: 320, y: 32, h: 50, tilt: 3, depth: 1.1,
  },
  {
    slug: 'over-the-southwest',
    alt: 'A plane wing over desert canyons seen from the window',
    caption: 'Somewhere over the Southwest',
    frame: 'paper',
    x: 350, y: 12, h: 66, tilt: -1, depth: 1,
  },
]

// Track length in units: room past the plane for the pan to end with it in
// the middle of a wide screen
const TRACK_UNITS = 456
// How far a photo drifts over the whole pan per unit of depth away from 1
// (px): at depth 1.15 that is about 85px ahead
const DRIFT = 560
// The backdrop pans at this share of the photos' speed, so it sits well
// behind them
const BACKDROP_DEPTH = 0.6
// The photo nearest the middle of the screen comes up to full colour, along
// with any other whose centre is within this share of the screen's width
// either side of it
const FOCUS_BAND = 0.15
// Photos pop in and out on their own side, the high ones above the screen
// and the low ones below it: they are fully in place while their centre is
// within this share of the half-screen either side of the middle, and fully
// away at the screen's edge and beyond
const SETTLED = 0.45
const AWAY = 1.05

const smoothstep = (t: number) => t * t * (3 - 2 * t)

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

function placement(photo: Photo) {
  return {
    '--x': photo.x,
    '--y': `${photo.y}%`,
    '--h': photo.h,
    '--ratio': RATIOS[photo.shape ?? 'portrait'],
    '--tilt': `${photo.tilt}deg`,
  } as CSSProperties
}

function TravelPhoto({ photo, innerRef }: { photo: Photo; innerRef?: (el: HTMLDivElement | null) => void }) {
  const widths = [480, 960, 1440]
  const ratio = RATIOS[photo.shape ?? 'portrait']
  return (
    <div className="travel-photo group" style={placement(photo)}>
      <div ref={innerRef}>
        <figure className={`travel-photo-card travel-print-${photo.frame} m-0`}>
          <div className="travel-frame">
            <img
              src={`/travel/${photo.slug}-960.webp`}
              srcSet={widths.map((w) => `/travel/${photo.slug}-${w}.webp ${w}w`).join(', ')}
              sizes={`${Math.round(photo.h * ratio)}vh`}
              width={960}
              height={Math.round(960 / ratio)}
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

// A collage of travel photos between the hero and Ask. The section pins to
// the screen and scrolling down pans the strip to the left, so the visitor
// travels right through it; photos pop in and out alternately above and
// below, and drift at slightly different speeds so overlapping ones
// read as layers, on a sheet of faint notebook squares that
// pans slower still. With reduced motion it is a plain strip
// the visitor can swipe or scroll sideways.
export default function TravelWall() {
  const reducedMotion = usePrefersReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const driftRefs = useRef<(HTMLDivElement | null)[]>([])
  const backdropRef = useRef<HTMLDivElement>(null)
  // How far the strip pans, in px: until the last photo, the plane, is in
  // the middle of the screen, whatever its shape
  const [distance, setDistance] = useState(0)

  useEffect(() => {
    if (reducedMotion || !trackRef.current) return
    const track = trackRef.current
    const measure = () => {
      const last = track.lastElementChild as HTMLElement | null
      const end = last ? last.offsetLeft + last.offsetWidth / 2 : track.offsetWidth
      setDistance(Math.max(0, Math.round(end - window.innerWidth / 2)))
    }
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
      if (backdropRef.current) {
        backdropRef.current.style.transform = `translateX(${-progress * distance * BACKDROP_DEPTH}px)`
      }
      // Where each photo's slot is now, measured on the untransformed slot so
      // the photo's own movement doesn't feed back into it: -1 at the screen's
      // left edge, 0 in the middle, 1 at its right edge
      const middle = window.innerWidth / 2
      const positions = driftRefs.current.map((el) => {
        const slot = el?.parentElement?.getBoundingClientRect()
        return slot ? (slot.left + slot.width / 2 - middle) / middle : Infinity
      })
      driftRefs.current.forEach((el, i) => {
        if (!el) return
        const at = positions[i]
        const away = smoothstep(clamp01((Math.abs(at) - SETTLED) / (AWAY - SETTLED)))
        // Arriving from the right and leaving to the left, each on its own
        // side: high prints above, low prints below, shrinking as they go
        const side = at > 0 ? 1 : -1
        const vertical = i % 2 === 0 ? -1 : 1
        const drift = (1 - PHOTOS[i].depth) * progress * DRIFT
        el.style.transform =
          `translate(${drift + side * away * window.innerWidth * 0.08}px, ${vertical * away * window.innerHeight * 0.45}px) ` +
          `rotate(${side * vertical * away * 8}deg) scale(${1 - away * 0.15})`
        el.style.opacity = String(1 - away * 0.85)
      })
      // The photo passing the middle of the screen comes up to full colour, as
      // a hovered one does, so there is always one in colour
      const offsets = positions.map((at) => Math.abs(at) * middle)
      const nearest = Math.min(...offsets)
      driftRefs.current.forEach((el, i) => {
        const inFocus = offsets[i] === nearest || offsets[i] < window.innerWidth * FOCUS_BAND
        el?.classList.toggle('travel-photo-focus', inFocus)
      })
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
        <div className="travel-track travel-grid" style={{ '--track': TRACK_UNITS } as CSSProperties}>
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
          aria-hidden="true"
          className="travel-grid absolute inset-y-0 left-0 will-change-transform"
          style={{ width: `${TRACK_UNITS}vh`, maxWidth: 'none' }}
        />
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

