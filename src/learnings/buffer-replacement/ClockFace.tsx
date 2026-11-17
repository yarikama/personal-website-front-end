import { usePlay } from '../../components/explain/useLoop'
import { hits, type Access } from './model'

const WIDTH = 420
const HEIGHT = 292
const CENTER = { x: 210, y: 146 }
const RADIUS = 104
const BOX = { w: 64, h: 50 }
const HAND = 58

// Time, in units of PACE, an access takes: a beat to show the request, and
// a little more for each frame the hand moves past
const PACE = 520
const BEAT = 1
const PER_MOVE = 0.55
const durations = (run: Access[]) => run.map((a) => BEAT + 0.4 + PER_MOVE * a.moves)

const angleOf = (position: number, frames: number) => (position / frames) * Math.PI * 2 - Math.PI / 2
const at = (position: number, frames: number, r: number) => ({
  x: CENTER.x + Math.cos(angleOf(position, frames)) * r,
  y: CENTER.y + Math.sin(angleOf(position, frames)) * r,
})

// Clock on a short trace: the frames sit round a circle, each with its page
// and one bit (a filled dot: used since the hand last came by). A hit only
// fills the dot. A miss sends the hand round: a filled dot is emptied and
// passed over, and the first page with an empty dot is replaced. It plays
// once; give it a `key` to play again.
export default function ClockFace({ run, frames }: { run: Access[]; frames: number }) {
  const lengths = durations(run)
  const total = lengths.reduce((sum, d) => sum + d, 0)
  const played = usePlay(total, PACE)

  // Which access is playing, and how far into it
  let current = 0
  let u = played
  while (current < run.length && u >= lengths[current]) {
    u -= lengths[current]
    current++
  }
  const access = run[current]
  const empty = {
    slots: Array.from({ length: frames }, () => null as number | null),
    bits: Array.from({ length: frames }, () => false),
    hand: 0,
  }
  const before = current > 0 ? run[current - 1] : empty
  const shownUpTo = access ? current : run.length

  let slots = before.slots
  let bits = before.bits
  let hand = before.hand
  let swapped = false
  if (access) {
    // After the beat, the hand moves; frames it passes lose their bit, and
    // when it reaches the victim the new page goes in
    const progress = Math.max(0, Math.min(access.moves, (u - BEAT) / PER_MOVE))
    if (access.hit) {
      if (u >= BEAT * 0.5) bits = access.bits
    } else {
      hand = before.hand + progress
      const passed = Math.floor(progress)
      bits = before.bits.map((bit, i) => {
        const steps = (i - before.hand + frames) % frames
        // Swept over once (or twice, round the whole circle): cleared
        return bit && !(steps < passed && steps < access.moves - 1)
      })
      if (progress >= access.moves - 1) {
        swapped = true
        slots = access.slots
        bits = bits.map((bit, i) => (i === access.frame ? true : bit))
      }
    }
  } else {
    slots = run[run.length - 1].slots
    bits = run[run.length - 1].bits
    hand = run[run.length - 1].hand
  }

  const tip = at(hand, frames, HAND)
  const doneHits = hits(run, 0, shownUpTo) + (access?.hit && u >= BEAT * 0.5 ? 1 : 0)
  const doneMisses = shownUpTo - hits(run, 0, shownUpTo) + (access && !access.hit && swapped ? 1 : 0)

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mx-auto w-full max-w-[28rem]"
        role="img"
        aria-label={`Clock with ${frames} frames on the pages ${run.map((a) => a.page).join(', ')}: ${hits(run)} hits`}
      >
        <circle cx={CENTER.x} cy={CENTER.y} r={RADIUS} className="fill-none stroke-zinc-300 dark:stroke-zinc-200/25" strokeDasharray="3 5" />
        <line x1={CENTER.x} y1={CENTER.y} x2={tip.x} y2={tip.y} className="stroke-ink" strokeWidth={3} strokeLinecap="round" />
        <circle cx={CENTER.x} cy={CENTER.y} r={5} className="fill-ink" />

        {access && (
          <g>
            <text x={CENTER.x} y={CENTER.y + 34} textAnchor="middle" className="fill-ink font-mono text-[11px] uppercase tracking-widest">
              Page {access.page}
            </text>
            <text
              x={CENTER.x}
              y={CENTER.y + 50}
              textAnchor="middle"
              className={`${access.hit ? 'fill-sage-ink' : 'fill-ink'} font-mono text-[11px] uppercase tracking-widest`}
            >
              {access.hit ? 'hit' : 'miss'}
            </text>
          </g>
        )}

        {Array.from({ length: frames }, (_, i) => {
          const c = at(i, frames, RADIUS)
          const page = slots[i]
          const fresh = access && i === access.frame && (access.hit ? u >= BEAT * 0.5 : swapped)
          return (
            <g key={i}>
              <rect
                x={c.x - BOX.w / 2}
                y={c.y - BOX.h / 2}
                width={BOX.w}
                height={BOX.h}
                rx={8}
                className={
                  page === null
                    ? 'fill-paper stroke-zinc-300 dark:stroke-zinc-200/25'
                    : fresh
                      ? access.hit
                        ? 'fill-sage/20 stroke-sage'
                        : 'fill-paper stroke-ink'
                      : 'fill-paper stroke-zinc-400'
                }
                strokeWidth={fresh ? 2 : 1.2}
                strokeDasharray={page === null ? '3 4' : undefined}
              />
              {page !== null && (
                <>
                  <text x={c.x - 8} y={c.y + 4} textAnchor="middle" className="fill-ink font-mono text-[12px]">
                    P{page}
                  </text>
                  <circle
                    cx={c.x + 16}
                    cy={c.y}
                    r={5.5}
                    className={bits[i] ? 'fill-sage stroke-sage' : 'fill-paper stroke-zinc-400'}
                    strokeWidth={1.5}
                  />
                </>
              )}
            </g>
          )
        })}

      </svg>
      <p className="mt-2 text-center font-mono text-[0.875rem] uppercase tracking-widest text-zinc-faded">
        {doneHits} hits · {doneMisses} misses{access ? '' : ' · done'}
      </p>
      <div className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-2 font-mono text-[0.875rem] uppercase tracking-widest text-zinc-faded">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-sage" aria-hidden /> Bit set: used since the hand passed
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full border-[1.5px] border-zinc-400" aria-hidden /> Bit clear: next to go
        </span>
      </div>
    </div>
  )
}
