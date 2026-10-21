import { memo, useEffect, useRef, useState, type RefObject } from 'react'
import { usePrefersReducedMotion } from '../../hooks'
import { OWL_FRAMES, OWL_GRID, OWL_PALETTES, frameRuns, type OwlColour, type OwlPose } from './owlSprites'

// What the chat is doing, which decides what the owls do: wander while
// nothing happens, watch the box while a question is typed, think until the
// first words arrive, nod along as they stream, and sleep when the home
// server could not answer.
export type OwlMood = 'idle' | 'look' | 'think' | 'nod' | 'sleep'

// Marks an answer frame as somewhere the owls can perch
export const OWL_PERCH = 'data-owl-perch'

const SCALE = 2
const SIZE = OWL_GRID * SCALE
const STEP_MS = 180
const BLINK_EVERY_MS = 2600
const BLINK_MS = 140
// How far in from a surface's ends the owls keep
const INSET = 16
// The closest the two come before they stop or turn away from each other
const GAP = 6
// When they meet they stop for a word, then go their ways; the next meeting
// within the cooldown only turns them back
const CHAT_MS = 3200
const CHAT_COOLDOWN_MS = 15000
const TALK_MS = 220
// A flight to a new surface goes round the conversation, never across it: out
// to a lane beside the column (on whichever side is nearer), up or down the
// lane, then in to land. Its speed, bounds on its length, how far the owls
// rise as they take off, how far the lane sits from the column, how much later
// the second owl sets off, and how fast the wings beat.
const FLIGHT_SPEED = 0.25 // px per ms
const FLIGHT_MIN_MS = 1600
const FLIGHT_MAX_MS = 3200
const FLIGHT_LIFT = 10
const LANE_GAP = 12
const FLIGHT_STAGGER_MS = 220
// One wing beat: up, level, down, level
const FLAP_MS = 140
const FLAP: OwlPose[] = ['flyUp', 'flyMid', 'flyDown', 'flyMid']
// How far the open wings reach past the body on each side
const WING_REACH = 4 * SCALE

interface OwlSpec {
  colour: OwlColour
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
  { colour: 'sage', speed: 22, offset: 0, thinks: true, inChat: 'listen' },
  { colour: 'brown', speed: 16, offset: 1100, thinks: false, inChat: 'talk' },
]
// Where each lands on a surface, from its left end
const LANDING = [8, 8 + SIZE + 40]

const random = (min: number, max: number) => min + Math.random() * (max - min)
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)

interface Point {
  x: number
  y: number
}

// The point a fraction `t` of the way along a path of straight legs
function along(path: Point[], t: number): Point {
  const legs = path.slice(1).map((p, i) => Math.hypot(p.x - path[i].x, p.y - path[i].y))
  let left = t * legs.reduce((sum, leg) => sum + leg, 0)
  for (let i = 0; i < legs.length; i++) {
    if (left <= legs[i] || i === legs.length - 1) {
      const k = legs[i] ? Math.min(left / legs[i], 1) : 1
      return { x: path[i].x + (path[i + 1].x - path[i].x) * k, y: path[i].y + (path[i + 1].y - path[i].y) * k }
    }
    left -= legs[i]
  }
  return path[path.length - 1]
}

const Sprite = memo(function Sprite({ pose, colour }: { pose: OwlPose; colour: OwlColour }) {
  const rows = OWL_FRAMES[pose]
  // Wider frames (open wings) spread evenly either side of the body
  const columns = rows[0].length
  return (
    <svg
      width={columns * SCALE}
      height={SIZE}
      viewBox={`0 0 ${columns} ${OWL_GRID}`}
      shapeRendering="crispEdges"
      className="block max-w-none"
      style={{ marginLeft: ((OWL_GRID - columns) / 2) * SCALE }}
      data-pose={pose}
    >
      {frameRuns(rows, OWL_PALETTES[colour]).map((run) => (
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

interface Surface {
  key: Element
  left: number
  width: number
  // The line they stand on, measured from the top of the chat
  y: number
  // Scrolled out of the conversation's view
  hidden: boolean
}

interface AskOwlProps {
  mood: OwlMood
  // The conversation, whose latest answer they perch on
  logRef: RefObject<HTMLDivElement | null>
  // The question box, on whose top edge they wait before the first question
  formRef: RefObject<HTMLFormElement | null>
}

/**
 * The pixel owls of the page's chat. They wait on the line above the question
 * box; with each question they fly to its answer and stay on it. Decorative:
 * hidden from screen readers, never in the way of a click.
 */
export default function AskOwl({ mood, logRef, formRef }: AskOwlProps) {
  const reducedMotion = usePrefersReducedMotion()
  const layerRef = useRef<HTMLDivElement>(null)
  const owlRefs = useRef<(HTMLDivElement | null)[]>([])
  const moodRef = useRef(mood)
  const [poses, setPoses] = useState<OwlPose[]>(() => OWLS.map(() => STILL_POSE[mood]))

  useEffect(() => {
    moodRef.current = mood
  }, [mood])

  // Every frame: find the surface (the latest answer, or the question box),
  // walk, talk or fly, and write the positions straight to the DOM. Only the
  // poses go through state, a few times a second. Runs while the chat is on
  // screen; with reduced motion they keep still and move from surface to
  // surface without flying.
  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return
    const motion = !reducedMotion

    const surface = (): Surface | null => {
      const log = logRef.current
      const form = formRef.current
      if (!log || !form) return null
      const base = layer.getBoundingClientRect()
      const perches = log.querySelectorAll(`[${OWL_PERCH}]`)
      const perch = perches[perches.length - 1]
      const target = perch ?? form
      const rect = target.getBoundingClientRect()
      const view = log.getBoundingClientRect()
      return {
        key: target,
        left: rect.left - base.left + INSET,
        width: Math.max(rect.width - 2 * INSET, SIZE),
        y: rect.top - base.top,
        hidden: !!perch && (rect.top > view.bottom || rect.top < view.top - SIZE),
      }
    }

    // The x of the lanes either side of the conversation's column
    const lanes = () => {
      const column = logRef.current?.firstElementChild
      if (!column) return null
      const base = layer.getBoundingClientRect()
      const rect = column.getBoundingClientRect()
      // Room for the open wings, against the column and the chat's edges
      const clamp = (x: number) => Math.min(Math.max(x, WING_REACH), base.width - SIZE - WING_REACH)
      return {
        left: clamp(rect.left - base.left - SIZE - LANE_GAP - WING_REACH),
        right: clamp(rect.right - base.left + LANE_GAP + WING_REACH),
      }
    }

    // Take off, out to the lane, along it, and in to land
    const route = (from: Point, to: Point, lane: number | undefined): Point[] =>
      lane === undefined
        ? [from, to]
        : [from, { x: lane, y: from.y - FLIGHT_LIFT }, { x: lane, y: to.y - FLIGHT_LIFT }, to]

    let frame = 0
    let last = 0
    let visible = false
    let shown = OWLS.map(() => STILL_POSE[moodRef.current])
    let chatUntil = 0
    let nextChat = 0
    let surfaceKey: Element | null = null
    let flight: { start: number; from: Point[]; side: 'left' | 'right'; duration: number } | null = null
    const positions: Point[] = OWLS.map(() => ({ x: 0, y: 0 }))
    const walkers = OWLS.map((_, i) => ({
      x: LANDING[i],
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

      const s = surface()
      if (!s) {
        frame = requestAnimationFrame(tick)
        return
      }
      const max = Math.max(s.width - SIZE, 0)

      const lane = lanes()

      // A new surface: fly there from wherever they are, round the side of
      // the conversation nearer to them, and land apart
      if (s.key !== surfaceKey) {
        if (surfaceKey && motion) {
          const from = positions.map((p) => ({ ...p }))
          const middle = from.reduce((sum, p) => sum + p.x, 0) / from.length
          const side = !lane || Math.abs(middle - lane.left) <= Math.abs(middle - lane.right) ? 'left' : 'right'
          const path = route(from[0], { x: s.left + LANDING[0], y: s.y }, lane?.[side])
          const length = path.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - path[i].x, p.y - path[i].y), 0)
          const duration = Math.min(Math.max(length / FLIGHT_SPEED, FLIGHT_MIN_MS), FLIGHT_MAX_MS)
          flight = { start: now, from, side, duration }
        }
        surfaceKey = s.key
        walkers.forEach((w, i) => {
          w.x = Math.min(LANDING[i], max)
          w.direction = i % 2 ? -1 : 1
          w.pauseUntil = 0
        })
        chatUntil = 0
      }
      const progress = OWLS.map((_, i) =>
        flight ? Math.min(Math.max((now - flight.start - i * FLIGHT_STAGGER_MS) / flight.duration, 0), 1) : 1
      )
      const flying = progress.map((t) => t < 1)
      if (flight && !flying.some(Boolean)) flight = null

      const current = moodRef.current
      let chatting = motion && !flight && current === 'idle' && now < chatUntil
      const walking = walkers.map((w, i) => {
        if (!motion || flight || current !== 'idle' || chatting || now < w.pauseUntil) return false
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
        if (motion && !flight && current === 'idle' && !chatting && now >= nextChat) {
          chatting = true
          chatUntil = now + CHAT_MS
          nextChat = chatUntil + CHAT_COOLDOWN_MS
        }
        if (left.direction > 0) left.direction = -1
        if (right.direction < 0) right.direction = 1
        left.x = Math.max(0, left.x - overlap / 2)
        right.x = Math.min(max, left.x + SIZE + GAP)
      }

      walkers.forEach((w, i) => {
        const to = { x: s.left + w.x, y: s.y }
        const p = positions[i]
        if (flight && flying[i]) {
          // The route is worked out afresh each frame: the answer it lands on
          // moves as the box opens out and the conversation scrolls
          const at = along(route(flight.from[i], to, lane?.[flight.side]), easeInOut(progress[i]))
          p.x = at.x
          p.y = at.y
        } else {
          p.x = to.x
          p.y = to.y
        }
        const el = owlRefs.current[i]
        if (!el) return
        el.style.transform = `translate(${p.x}px, ${p.y - SIZE}px)`
        el.style.visibility = s.hidden && !flying[i] ? 'hidden' : 'visible'
      })

      const next = walkers.map((_, i): OwlPose => {
        const t = now + OWLS[i].offset
        if (!motion) return STILL_POSE[current]
        if (flying[i]) return FLAP[Math.floor(t / FLAP_MS) % FLAP.length]
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
    observer.observe(layer)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [reducedMotion, logRef, formRef])

  return (
    <div
      ref={layerRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
    >
      {OWLS.map((owl, i) => {
        const pose = reducedMotion ? STILL_POSE[mood] : poses[i]
        const perched = !pose.startsWith('fly')
        const delay = { animationDelay: `${-owl.offset}ms` }
        return (
          <div
            key={owl.colour}
            ref={(el) => {
              owlRefs.current[i] = el
            }}
            className="absolute left-0 top-0"
          >
            {perched && mood === 'think' && owl.thinks && <span className="owl-thought">…</span>}
            {perched && mood === 'sleep' && (
              <span className="owl-zz" style={delay}>
                z
              </span>
            )}
            {mood === 'idle' && pose.startsWith('talk') && <span className="owl-greeting">howdy</span>}
            <div className={perched && mood === 'nod' ? 'owl-nod' : undefined} style={delay}>
              <Sprite pose={pose} colour={owl.colour} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
