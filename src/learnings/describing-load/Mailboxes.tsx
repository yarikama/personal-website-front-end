import { motion } from 'motion/react'
import { lerp, useLoop, within } from '../../components/explain/useLoop'
import { pullWork, pushWork, short, TWITTER_2012 } from './model'

const WIDTH = 640
const HEIGHT = 300
const WRITER_X = 110
const READER_X = 520
const writers = [0, 1, 2, 3, 4].map((i) => ({ x: WRITER_X, y: 50 + i * 50 }))
const readers = [0, 1, 2, 3, 4, 5].map((j) => ({ x: READER_X, y: 40 + j * 44 }))
const CELEBRITY = { x: 130, y: 150 }

type Point = { x: number; y: number }

// A dot on its way from `a` to `b` and back again, `t` from 0 to 1
function roundTrip(a: Point, b: Point, t: number): Point {
  const go = t < 0.5
  const s = go ? t * 2 : (t - 0.5) * 2
  return { x: go ? lerp(a.x, b.x, s) : lerp(b.x, a.x, s), y: go ? lerp(a.y, b.y, s) : lerp(b.y, a.y, s) }
}

function Label({ x, y, children, anchor = 'middle' }: { x: number; y: number; children: string; anchor?: 'start' | 'middle' | 'end' }) {
  return (
    <text x={x} y={y} textAnchor={anchor} className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
      {children}
    </text>
  )
}

// The friends who post (at `posters`) and their followers' timelines
function People({ posters = writers }: { posters?: Point[] }) {
  return (
    <>
      <Label x={WRITER_X} y={22}>Friends who post</Label>
      {posters.map((w, i) => (
        <circle key={i} cx={w.x} cy={w.y} r={9} className="fill-paper stroke-ink" />
      ))}
      <Label x={READER_X} y={18}>Followers’ timelines</Label>
      {readers.map((r, j) => (
        <rect key={j} x={r.x - 14} y={r.y - 11} width={28} height={22} className="fill-paper stroke-ink" />
      ))}
    </>
  )
}

const Faint = ({ a, b, dashed = false }: { a: Point; b: Point; dashed?: boolean }) => (
  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="stroke-zinc-300 dark:stroke-zinc-200/20" strokeDasharray={dashed ? '4 4' : undefined} />
)

// Fetch on read: readers go round every friend they follow, each time they look
function Pull({ who, phase }: { who: number[]; phase: number }) {
  return (
    <>
      {who.flatMap((j) => writers.map((w, i) => <Faint key={`l${j}-${i}`} a={readers[j]} b={w} />))}
      <People />
      {who.flatMap((j) =>
        writers.map((w, i) => {
          const at = roundTrip(readers[j], w, (phase + j * 0.13 + i * 0.04) % 1)
          return <circle key={`d${j}-${i}`} cx={at.x} cy={at.y} r={3.5} className="fill-sage" />
        })
      )}
    </>
  )
}

// Deliver on post: each friend's new post goes out to every follower once
function Push({ from, phase }: { from: Point[]; phase: number }) {
  return (
    <>
      {from.flatMap((w, i) => readers.map((r, j) => <Faint key={`l${i}-${j}`} a={w} b={r} />))}
      <People posters={from} />
      {from.flatMap((w, i) => {
        const t = within(phase, i / from.length, i / from.length + 0.35)
        return t === null
          ? []
          : readers.map((r, j) => <circle key={`d${i}-${j}`} cx={lerp(w.x, r.x, t)} cy={lerp(w.y, r.y, t)} r={3.5} className="fill-sage" />)
      })}
    </>
  )
}

function Compare() {
  const { postsPerSecond, readsPerSecond, followers } = TWITTER_2012
  const pull = pullWork(readsPerSecond, followers)
  const push = pushWork(postsPerSecond, followers)
  const bars = [
    { name: 'Fetch on read', note: `${short(readsPerSecond)} opens × ${followers} followed`, value: pull },
    { name: 'Deliver on post', note: `${short(postsPerSecond)} posts × ${followers} followers`, value: push },
  ]
  return (
    <>
      {bars.map((bar, i) => {
        const y = 70 + i * 110
        const width = Math.max(4, (bar.value / pull) * 480)
        return (
          <g key={bar.name}>
            <Label x={60} y={y - 14} anchor="start">{bar.name}</Label>
            <motion.rect x={60} y={y} height={34} initial={{ width: 0 }} animate={{ width }} transition={{ duration: 0.8 }} className={i === 0 ? 'fill-ink' : 'fill-sage'} />
            <text x={60 + width + 10} y={y + 23} className="fill-ink font-serif text-[22px]">
              {short(bar.value)}/s
            </text>
            <Label x={60} y={y + 52} anchor="start">{bar.note}</Label>
          </g>
        )
      })}
    </>
  )
}

// One celebrity post, delivered to 31 million timelines: each dot is 100k
function Celebrity({ phase }: { phase: number }) {
  const dots = 310
  const lit = Math.floor(Math.min(1, phase * 1.4) * dots)
  return (
    <>
      <circle cx={CELEBRITY.x} cy={CELEBRITY.y} r={30} className="fill-ink" />
      <Label x={CELEBRITY.x} y={CELEBRITY.y + 50}>One post</Label>
      {Array.from({ length: dots }, (_, k) => (
        <circle
          key={k}
          cx={300 + (k % 20) * 16}
          cy={30 + Math.floor(k / 20) * 16}
          r={4.5}
          className={k < lit ? 'fill-sage' : 'fill-zinc-300 dark:fill-zinc-200/20'}
        />
      ))}
      <text x={CELEBRITY.x} y={CELEBRITY.y - 50} textAnchor="middle" className="fill-ink font-serif text-[22px]">
        {short(lit * 100_000)}
      </text>
      <Label x={CELEBRITY.x} y={CELEBRITY.y - 34}>Deliveries</Label>
    </>
  )
}

// Both: ordinary friends deliver on post; the celebrity is fetched on read
function Hybrid({ phase }: { phase: number }) {
  const ordinary = writers.slice(0, 4)
  const star = { x: WRITER_X, y: 262 }
  return (
    <>
      {readers.map((r, j) => (
        <Faint key={`c${j}`} a={r} b={star} dashed />
      ))}
      <Push from={ordinary} phase={phase} />
      <circle cx={star.x} cy={star.y} r={14} className="fill-ink" />
      <Label x={star.x} y={star.y + 30}>Celebrity: fetched on read</Label>
      {readers.map((r, j) => {
        const at = roundTrip(r, star, (phase + j * 0.16) % 1)
        return <circle key={`p${j}`} cx={at.x} cy={at.y} r={3} className="fill-ink" />
      })}
    </>
  )
}

// The story's figure, one picture per step
export default function Mailboxes({ step }: { step: number }) {
  const phase = useLoop(step >= 4 ? 3600 : 2600)
  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Posts going between friends and their followers’ timelines">
      {step === 0 && <Pull who={[2]} phase={phase} />}
      {step === 1 && <Pull who={[0, 1, 2, 3, 4, 5]} phase={phase} />}
      {step === 2 && <Push from={writers} phase={phase} />}
      {step === 3 && <Compare />}
      {step === 4 && <Celebrity phase={phase} />}
      {step === 5 && <Hybrid phase={phase} />}
    </svg>
  )
}
