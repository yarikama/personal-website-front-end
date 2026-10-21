import { memo, useEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from '../../hooks'
import { OWL_FRAMES, OWL_GRID, OWL_PALETTES, frameRuns, type OwlColour, type OwlPose } from './owlSprites'

// What the chat is doing, which decides what the owls do: wander while
// nothing happens, watch the box while a question is typed, think until the
// first words arrive, nod along as they stream, and sleep when the home
// server could not answer.
export type OwlMood = 'idle' | 'look' | 'think' | 'nod' | 'sleep'

const SCALE = 2
const SIZE = OWL_GRID * SCALE
const STEP_MS = 180
const BLINK_EVERY_MS = 2600
const BLINK_MS = 140
// The closest the two come before they stop or turn away from each other
const GAP = 6
// When they meet they stop for a word, then go their ways; the next meeting
// within the cooldown only turns them back
const CHAT_MS = 3200
const CHAT_COOLDOWN_MS = 15000
const TALK_MS = 220

interface OwlSpec {
  colour: OwlColour
  start: number // px from the left of the line
  speed: number // px per second
  // Offsets so the two never blink, step or nod in time with each other
  offset: number // ms
  // Only the owl that answers shows a thought
  thinks: boolean
  // Its part when they meet: the one on the right turns to talk, wing up
  inChat: 'listen' | 'talk'
}

// Left to right; they keep that order, turning back when they meet
const OWLS: OwlSpec[] = [
  { colour: 'sage', start: 24, speed: 22, offset: 0, thinks: true, inChat: 'listen' },
  { colour: 'brown', start: 24 + SIZE + 56, speed: 16, offset: 1100, thinks: false, inChat: 'talk' },
]

const random = (min: number, max: number) => min + Math.random() * (max - min)

const Sprite = memo(function Sprite({ pose, colour }: { pose: OwlPose; colour: OwlColour }) {
  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${OWL_GRID} ${OWL_GRID}`}
      shapeRendering="crispEdges"
      className="block"
      data-pose={pose}
    >
      {frameRuns(OWL_FRAMES[pose], OWL_PALETTES[colour]).map((run) => (
        <rect
          key={`${run.x}-${run.y}`}
          x={run.x}
          y={run.y}
          width={run.width}
          height={1}
          style={{ fill: run.colour }}
        />
      ))}
    </svg>
  )
})

const STILL_POSE: Record<OwlMood, OwlPose> = {
  idle: 'stand',
  look: 'look',
  think: 'think',
  nod: 'stand',
  sleep: 'sleep',
}

/**
 * The pixel owls that live on the line above the question box. Decorative:
 * hidden from screen readers, never in the way of a click.
 */
export default function AskOwl({ mood }: { mood: OwlMood }) {
  const reducedMotion = usePrefersReducedMotion()
  const trackRef = useRef<HTMLDivElement>(null)
  const owlRefs = useRef<(HTMLDivElement | null)[]>([])
  const moodRef = useRef(mood)
  const [poses, setPoses] = useState<OwlPose[]>(() => OWLS.map(() => STILL_POSE[mood]))

  useEffect(() => {
    moodRef.current = mood
  }, [mood])

  // Walk, pause and blink, written straight to the DOM; only the poses go
  // through state, a few times a second. Runs only while the line is on screen.
  useEffect(() => {
    const track = trackRef.current
    if (reducedMotion || !track) return

    let frame = 0
    let last = 0
    let visible = false
    let shown = OWLS.map(() => STILL_POSE[moodRef.current])
    let chatUntil = 0
    let nextChat = 0
    const walkers = OWLS.map((owl, i) => ({
      x: owl.start,
      direction: i % 2 ? -1 : 1,
      pauseUntil: 0,
      nextPause: performance.now() + random(3000, 8000),
    }))

    const tick = (now: number) => {
      frame = 0
      if (!visible) {
        last = 0
        return
      }
      const elapsed = last ? Math.min(now - last, 100) : 0
      last = now

      const current = moodRef.current
      const max = Math.max(track.clientWidth - SIZE, 0)
      let chatting = current === 'idle' && now < chatUntil
      const walking = walkers.map((w, i) => {
        if (current !== 'idle' || chatting || now < w.pauseUntil) return false
        w.x += (w.direction * OWLS[i].speed * elapsed) / 1000
        if (w.x <= 0) {
          w.x = 0
          w.direction = 1
        } else if (w.x >= max) {
          w.x = max
          w.direction = -1
        }
        if (now >= w.nextPause) {
          w.pauseUntil = now + random(1500, 3200)
          w.nextPause = w.pauseUntil + random(4000, 9000)
        }
        return true
      })

      // Neighbours that come too close stop for a word (unless they spoke a
      // moment ago), then turn away from each other; they are eased apart so
      // they never stand inside one another
      for (let i = 1; i < walkers.length; i++) {
        const left = walkers[i - 1]
        const right = walkers[i]
        const overlap = SIZE + GAP - (right.x - left.x)
        if (overlap <= 0) continue
        if (current === 'idle' && !chatting && now >= nextChat) {
          chatting = true
          chatUntil = now + CHAT_MS
          nextChat = chatUntil + CHAT_COOLDOWN_MS
        }
        if (left.direction > 0) left.direction = -1
        if (right.direction < 0) right.direction = 1
        left.x = Math.max(0, left.x - overlap / 2)
        right.x = Math.min(max, left.x + SIZE + GAP)
      }

      const next = walkers.map((w, i) => {
        owlRefs.current[i]?.style.setProperty('transform', `translateX(${w.x}px)`)
        const t = now + OWLS[i].offset
        if (chatting) {
          if (OWLS[i].inChat === 'talk') return Math.floor(t / TALK_MS) % 2 ? 'talkOpen' : 'talk'
          return t % BLINK_EVERY_MS < BLINK_MS ? 'blink' : 'listen'
        }
        if (walking[i]) return Math.floor(t / STEP_MS) % 2 ? 'stepA' : 'stepB'
        if (current === 'idle' || current === 'nod') return t % BLINK_EVERY_MS < BLINK_MS ? 'blink' : 'stand'
        return STILL_POSE[current]
      })
      if (next.some((pose, i) => pose !== shown[i])) {
        shown = next
        setPoses(next)
      }

      frame = requestAnimationFrame(tick)
    }

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible && !frame) frame = requestAnimationFrame(tick)
    })
    observer.observe(track)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [reducedMotion])

  return (
    <div
      ref={trackRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-4 bottom-full h-8 select-none"
    >
      {OWLS.map((owl, i) => {
        const delay = { animationDelay: `${-owl.offset}ms` }
        return (
          <div
            key={owl.colour}
            ref={(el) => {
              owlRefs.current[i] = el
            }}
            className="absolute bottom-0 left-0"
            style={reducedMotion ? { transform: `translateX(${owl.start}px)` } : undefined}
          >
            {mood === 'think' && owl.thinks && <span className="owl-thought">…</span>}
            {mood === 'idle' && poses[i].startsWith('talk') && <span className="owl-greeting">howdy</span>}
            {mood === 'sleep' && (
              <span className="owl-zz" style={delay}>
                z
              </span>
            )}
            <div className={mood === 'nod' ? 'owl-nod' : undefined} style={delay}>
              <Sprite pose={reducedMotion ? STILL_POSE[mood] : poses[i]} colour={owl.colour} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
