import { memo, useEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from '../../hooks'
import { OWL_FRAMES, OWL_GRID, frameRuns, type OwlPose } from './owlSprites'

// What the chat is doing, which decides what the owl does: wander while
// nothing happens, watch the box while a question is typed, think until the
// first words arrive, nod along as they stream, and sleep when the home
// server could not answer.
export type OwlMood = 'idle' | 'look' | 'think' | 'nod' | 'sleep'

const SCALE = 2
const SIZE = OWL_GRID * SCALE
const WALK_SPEED = 22 // px per second
const STEP_MS = 180
const BLINK_EVERY_MS = 2600
const BLINK_MS = 140

const random = (min: number, max: number) => min + Math.random() * (max - min)

const Sprite = memo(function Sprite({ pose }: { pose: OwlPose }) {
  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${OWL_GRID} ${OWL_GRID}`}
      shapeRendering="crispEdges"
      className="block"
      data-pose={pose}
    >
      {frameRuns(OWL_FRAMES[pose]).map((run) => (
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
 * The pixel owl that lives on the line above the question box. Decorative:
 * hidden from screen readers, never in the way of a click.
 */
export default function AskOwl({ mood }: { mood: OwlMood }) {
  const reducedMotion = usePrefersReducedMotion()
  const trackRef = useRef<HTMLDivElement>(null)
  const owlRef = useRef<HTMLDivElement>(null)
  const moodRef = useRef(mood)
  const [pose, setPose] = useState<OwlPose>(STILL_POSE[mood])

  useEffect(() => {
    moodRef.current = mood
  }, [mood])

  // Walk, pause and blink, written straight to the DOM; only the pose goes
  // through state, a few times a second. Runs only while the owl is on screen.
  useEffect(() => {
    const track = trackRef.current
    const owl = owlRef.current
    if (reducedMotion || !track || !owl) return

    let frame = 0
    let last = 0
    let visible = false
    let x = 24
    let direction = 1
    let pauseUntil = 0
    let nextPause = performance.now() + random(4000, 8000)

    const tick = (now: number) => {
      frame = 0
      if (!visible) {
        last = 0
        return
      }
      const elapsed = last ? Math.min(now - last, 100) : 0
      last = now

      const current = moodRef.current
      const walking = current === 'idle' && now >= pauseUntil
      if (walking) {
        const max = Math.max(track.clientWidth - SIZE, 0)
        x += (direction * WALK_SPEED * elapsed) / 1000
        if (x <= 0) {
          x = 0
          direction = 1
        } else if (x >= max) {
          x = max
          direction = -1
        }
        if (now >= nextPause) {
          pauseUntil = now + random(1500, 3200)
          nextPause = pauseUntil + random(4000, 9000)
        }
      }
      owl.style.transform = `translateX(${x}px)`

      if (walking) setPose(Math.floor(now / STEP_MS) % 2 ? 'stepA' : 'stepB')
      else if (current === 'idle' || current === 'nod') setPose(now % BLINK_EVERY_MS < BLINK_MS ? 'blink' : 'stand')
      else setPose(STILL_POSE[current])

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

  const shown = reducedMotion ? STILL_POSE[mood] : pose

  return (
    <div
      ref={trackRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-4 bottom-full h-8 select-none"
    >
      <div
        ref={owlRef}
        className="absolute bottom-0 left-0"
        style={reducedMotion ? { transform: 'translateX(24px)' } : undefined}
      >
        {mood === 'think' && <span className="owl-thought">…</span>}
        {mood === 'sleep' && <span className="owl-zz">z</span>}
        <div className={mood === 'nod' ? 'owl-nod' : undefined}>
          <Sprite pose={shown} />
        </div>
      </div>
    </div>
  )
}
