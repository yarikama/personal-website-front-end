import { useEffect, useRef, useState } from 'react'
import { useAnimationFrame } from 'motion/react'
import { Button, Readout } from '../../components/explain/figure'
import { seeded } from '../../components/explain/random'
import { usePrefersReducedMotion } from '../../hooks'
import { samplePage, slowChance, SLOW_MS } from './model'

// The drawing, in SVG units
const WIDTH = 640
const HEIGHT = 330
const USER = { x: 36, y: 120 }
const APP = { x: 170, y: 120 }
const BACKENDS_X = 470
const BACKENDS_TOP = 16
const BACKENDS_BOTTOM = 224
const AXIS_Y = 290
const AXIS_LEFT = 36
const AXIS_RIGHT = 604
const AXIS_MS = 1000
// Real milliseconds per simulated one: slow enough to watch a 900 ms call
const PLAYBACK = 2.5
// The answer's trip from the app back to the user, in simulated ms
const REPLY_MS = 120

const atTime = (ms: number) => AXIS_LEFT + (Math.min(ms, AXIS_MS) / AXIS_MS) * (AXIS_RIGHT - AXIS_LEFT)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

interface FanOutProps {
  calls: number
  slowness: number
}

// One page's request fanning out to `calls` backends, each slow with chance
// `slowness`. Send one to watch it, or a hundred to count.
export default function FanOut({ calls, slowness }: FanOutProps) {
  const reducedMotion = usePrefersReducedMotion()
  const random = useRef(seeded(7))
  const [page, setPage] = useState<number[] | null>(null)
  // Simulated ms since the page's calls went out
  const [now, setNow] = useState(0)
  const started = useRef<number | null>(null)
  const [counted, setCounted] = useState({ pages: 0, slow: 0 })

  // A new setting starts the count again
  useEffect(() => {
    setCounted({ pages: 0, slow: 0 })
    setPage(null)
    started.current = null
  }, [calls, slowness])

  const slowest = page ? Math.max(...page) : 0
  const finished = page !== null && now >= slowest + REPLY_MS

  useAnimationFrame((time) => {
    if (started.current === null || !page) return
    const elapsed = (time - started.current) / PLAYBACK
    setNow(elapsed)
    if (elapsed >= slowest + REPLY_MS) started.current = null
  })

  const count = (pages: number[][]) =>
    setCounted((before) => ({
      pages: before.pages + pages.length,
      slow: before.slow + pages.filter((one) => Math.max(...one) > SLOW_MS).length,
    }))

  const send = () => {
    const next = samplePage(random.current, slowness, calls)
    setPage(next)
    count([next])
    if (reducedMotion) {
      setNow(Infinity)
    } else {
      setNow(0)
      started.current = performance.now()
    }
  }

  const sendMany = () => {
    const pages = Array.from({ length: 100 }, () => samplePage(random.current, slowness, calls))
    count(pages)
    setPage(pages[pages.length - 1])
    started.current = null
    setNow(Infinity)
  }

  const spacing = (BACKENDS_BOTTOM - BACKENDS_TOP) / calls
  const radius = Math.max(1.6, Math.min(6, spacing * 0.35))
  const backends = Array.from({ length: calls }, (_, i) => ({ x: BACKENDS_X, y: BACKENDS_TOP + spacing * (i + 0.5) }))
  const pageMs = page ? Math.min(now, slowest) : 0
  const pageSlow = slowest > SLOW_MS

  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={`One page waiting on ${calls} backend calls`}>
        {/* Calls out to the backends */}
        {backends.map((backend, i) => {
          const ms = page?.[i]
          const waiting = ms !== undefined && now < ms
          const late = waiting && now > SLOW_MS
          return (
            <line
              key={`line-${i}`}
              x1={APP.x}
              y1={APP.y}
              x2={backend.x}
              y2={backend.y}
              className={late ? 'stroke-ink' : 'stroke-zinc-300 dark:stroke-zinc-200/25'}
              strokeWidth={late ? 1.2 : 0.8}
            />
          )
        })}
        <line x1={USER.x} y1={USER.y} x2={APP.x} y2={APP.y} className="stroke-zinc-300 dark:stroke-zinc-200/25" />

        {/* The backends: filled once they have answered */}
        {backends.map((backend, i) => {
          const ms = page?.[i]
          const answered = ms !== undefined && now >= ms
          const slow = ms !== undefined && ms > SLOW_MS
          return (
            <circle
              key={`backend-${i}`}
              cx={backend.x}
              cy={backend.y}
              r={slow && answered ? radius * 1.4 : radius}
              className={answered ? (slow ? 'fill-ink' : 'fill-sage') : 'fill-paper stroke-zinc-400'}
              strokeWidth={1}
            />
          )
        })}

        {/* Each call in flight: out to its backend, then back */}
        {page &&
          backends.map((backend, i) => {
            const ms = page[i]
            // A page sent before the number of calls changed has none here
            if (ms === undefined || now >= ms) return null
            const half = ms / 2
            const out = now < half
            const t = out ? now / half : (now - half) / half
            const x = out ? lerp(APP.x, backend.x, t) : lerp(backend.x, APP.x, t)
            const y = out ? lerp(APP.y, backend.y, t) : lerp(backend.y, APP.y, t)
            const late = now > SLOW_MS
            return <circle key={`pulse-${i}`} cx={x} cy={y} r={late ? 3.2 : 2.4} className={late ? 'fill-ink' : 'fill-sage'} />
          })}

        {/* The answer going back to the user, once the last call is in */}
        {page && now >= slowest && !finished && (
          <circle
            cx={lerp(APP.x, USER.x, (now - slowest) / REPLY_MS)}
            cy={APP.y}
            r={3.2}
            className={pageSlow ? 'fill-ink' : 'fill-sage'}
          />
        )}

        <circle cx={USER.x} cy={USER.y} r={8} className={finished ? (pageSlow ? 'fill-ink' : 'fill-sage') : 'fill-paper stroke-ink'} />
        <text x={USER.x} y={USER.y + 26} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
          User
        </text>
        <rect x={APP.x - 30} y={APP.y - 16} width={60} height={32} className="fill-paper stroke-ink" />
        <text x={APP.x} y={APP.y + 4} textAnchor="middle" className="fill-ink font-mono text-[11px] uppercase tracking-widest">
          Page
        </text>
        <text x={BACKENDS_X + 18} y={APP.y + 4} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
          {calls} {calls === 1 ? 'backend' : 'backends'}
        </text>

        {/* When each call answered, on one time axis */}
        <line x1={AXIS_LEFT} y1={AXIS_Y} x2={AXIS_RIGHT} y2={AXIS_Y} className="stroke-zinc-400" />
        {[0, 250, 500, 750, 1000].map((ms) => (
          <text key={ms} x={atTime(ms)} y={AXIS_Y + 18} textAnchor="middle" className="fill-zinc-400 font-mono text-[10px]">
            {ms} ms
          </text>
        ))}
        <line x1={atTime(SLOW_MS)} y1={AXIS_Y - 34} x2={atTime(SLOW_MS)} y2={AXIS_Y} className="stroke-zinc-400" strokeDasharray="3 3" />
        <text x={atTime(SLOW_MS) + 5} y={AXIS_Y - 26} className="fill-zinc-400 font-mono text-[10px] uppercase tracking-widest">
          Slow
        </text>
        {page?.map((ms, i) =>
          now >= ms ? (
            <line
              key={`tick-${i}`}
              x1={atTime(ms)}
              y1={AXIS_Y - 12}
              x2={atTime(ms)}
              y2={AXIS_Y}
              className={ms > SLOW_MS ? 'stroke-ink' : 'stroke-sage'}
              strokeWidth={ms > SLOW_MS ? 2 : 1}
            />
          ) : null
        )}
        {page && (
          <g transform={`translate(${atTime(pageMs)},0)`}>
            <line y1={AXIS_Y - 44} y2={AXIS_Y} className={pageSlow && now >= slowest ? 'stroke-ink' : 'stroke-sage'} strokeWidth={2} />
            <text y={AXIS_Y - 50} textAnchor="middle" className="fill-ink font-mono text-[10px] uppercase tracking-widest">
              Page
            </text>
          </g>
        )}
      </svg>

      <div className="mt-5 flex flex-wrap gap-3">
        <Button onClick={send}>Send a request</Button>
        <Button onClick={sendMany}>Send 100</Button>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-4">
        <Readout label="This page" value={page ? `${Math.round(pageMs)} ms` : '–'} accent={!!page && now >= slowest && !pageSlow} />
        <Readout
          label={`Slow, of ${counted.pages}`}
          value={counted.pages ? `${Math.round((100 * counted.slow) / counted.pages)}%` : '–'}
        />
        <Readout label="Expected" value={`${Math.round(100 * slowChance(slowness, calls))}%`} accent />
      </div>
    </div>
  )
}
