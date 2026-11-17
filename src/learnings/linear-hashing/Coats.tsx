import { lerp, usePlay } from '../../components/explain/useLoop'
import { binary, bitsUsed, pointer, recordCount, type Frame, type LinearFile, type Moment } from './model'

// The coat check: pigeonholes of two, a basket under any hole that gets a
// third, and a marker under the hole that splits next. The same drawing,
// relabelled, is the hash file: holes are buckets, tickets hashed keys,
// baskets overflow pages, the marker the split pointer.

const DIGITS = 4
const COLUMNS = 8
const PITCH = 78
const HOLE_W = 64
const TICKET = { w: 52, h: 20 }
const GAP = 5
const WIDTH = COLUMNS * PITCH - (PITCH - HOLE_W) + 8
const TOP_Y = 2
const LABEL_Y = 48
const HOLE_Y = 56
const HOLE_H = 2 * TICKET.h + 3 * GAP
const BASKET_Y = HOLE_Y + HOLE_H + 10
// The story never puts more than one coat in a basket
const BASKET_H = TICKET.h + 2 * GAP
const MARKER_Y = BASKET_Y + BASKET_H + 34
const HEIGHT = MARKER_Y + 26

const colX = (j: number) => 4 + j * PITCH

// The label a hole carries: its number in the bits it reads
const suffix = (file: LinearFile, j: number) => binary(j, bitsUsed(file, j))

const WORDS = {
  story: {
    // The file's words also give each bucket its number
    numbered: false,
    marker: 'next',
    basket: 'basket',
    tally: (file: LinearFile) => `${recordCount(file)} coats · room for ${file.buckets.length * file.capacity}`,
    say: (m: Moment, before: LinearFile, after: LinearFile) => {
      if (m.kind === 'start') return `${after.buckets.length} holes of 2`
      if (m.kind === 'put') {
        const code = binary(m.key, DIGITS)
        return m.overflow ? `Coat ${code}: hole ${suffix(after, m.bucket)} is full, so into its basket` : `Coat ${code} → hole ${suffix(after, m.bucket)}`
      }
      if (m.kind === 'split') {
        return `Over ¾ full: new hole ${suffix(after, m.to)}, split from hole ${suffix(before, m.from)}${m.emptied ? '; its basket empties' : ''}`
      }
      return `Ticket ${binary(m.key, DIGITS)}: hole ${binary(m.key, after.bits)} is behind the marker, so read one more digit: ${suffix(after, m.bucket)}`
    },
  },
  file: {
    numbered: true,
    marker: 'pointer p',
    basket: 'overflow',
    tally: (file: LinearFile) => `n = ${recordCount(file)} · N·B = ${file.buckets.length * file.capacity}`,
    say: (m: Moment, before: LinearFile, after: LinearFile) => {
      if (m.kind === 'start') return `${after.buckets.length} buckets, B = 2`
      if (m.kind === 'put') return `Insert ${binary(m.key, DIGITS)} → bucket ${m.bucket}${m.overflow ? ', on an overflow page' : ''}`
      if (m.kind === 'split') return `Fill over 75%: split bucket ${m.from} into ${m.from} and ${m.to}`
      return `Find ${binary(m.key, DIGITS)}: bucket ${m.bucket}`
    },
  },
}

interface Spot {
  x: number
  y: number
  bucket: number
}

function spots(file: LinearFile): Map<number, Spot> {
  const at = new Map<number, Spot>()
  file.buckets.forEach((keys, j) =>
    keys.forEach((key, k) => {
      const y = k < file.capacity ? HOLE_Y + GAP + k * (TICKET.h + GAP) : BASKET_Y + GAP + (k - file.capacity) * (TICKET.h + GAP)
      at.set(key, { x: colX(j) + (HOLE_W - TICKET.w) / 2, y, bucket: j })
    }),
  )
  return at
}

const ease = (t: number) => t * t * (3 - 2 * t)

function Ticket({ x, y, code, used, tone }: { x: number; y: number; code: string; used: number; tone: 'plain' | 'watch' | 'over' }) {
  const box = tone === 'watch' ? 'fill-paper stroke-sage' : tone === 'over' ? 'fill-paper stroke-ink' : 'fill-paper stroke-zinc-400'
  return (
    <g>
      <rect x={x} y={y} width={TICKET.w} height={TICKET.h} rx={5} className={box} strokeWidth={tone === 'plain' ? 1.2 : 2} />
      <text x={x + TICKET.w / 2} y={y + TICKET.h / 2 + 4} textAnchor="middle" className="font-mono text-[11px]">
        <tspan className="fill-zinc-faded">{code.slice(0, code.length - used)}</tspan>
        <tspan className="fill-sage-ink">{code.slice(code.length - used)}</tspan>
      </text>
    </g>
  )
}

// Plays `frames` in order, a key's ticket sliding from where it was to where
// it is next; a ticket new in a frame drops in from above its hole. Give it a
// `key` to play again.
export default function Coats({ frames, words, pace = 1300 }: { frames: Frame[]; words: keyof typeof WORDS; pace?: number }) {
  const say = WORDS[words]
  const span = frames.length - 1
  const played = usePlay(span, pace)
  const i = Math.min(Math.floor(played), Math.max(0, span - 1))
  const from = frames[i]
  const to = frames[Math.min(i + 1, span)]
  const t = span === 0 ? 1 : ease(Math.min(1, played - i))
  const shown = t > 0 ? to : from

  const a = spots(from.file)
  const b = spots(to.file)
  const moment = shown.moment
  const watched = moment.kind === 'put' || moment.kind === 'find' ? moment.key : null

  const p0 = pointer(from.file)
  const p1 = pointer(to.file)
  const markerX = lerp(colX(p0), colX(p1), t) + HOLE_W / 2

  const status = say.say(moment, from.file, shown.file)

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 font-mono text-[0.875rem] uppercase tracking-widest">
        <span className="text-ink">{status}</span>
        <span className="text-zinc-faded">{say.tally(shown.file)}</span>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mx-auto mt-3 w-full" role="img" aria-label={`${status}. ${say.tally(shown.file)}.`}>
        {/* Room for the holes still to come */}
        {Array.from({ length: COLUMNS - shown.file.buckets.length }, (_, k) => (
          <rect
            key={k}
            x={colX(shown.file.buckets.length + k)}
            y={HOLE_Y}
            width={HOLE_W}
            height={HOLE_H}
            rx={8}
            className="fill-none stroke-zinc-300 dark:stroke-zinc-200/25"
            strokeDasharray="3 4"
          />
        ))}
        {shown.file.buckets.map((keys, j) => (
          <g key={j}>
            <text
              x={colX(j) + HOLE_W / 2}
              y={LABEL_Y}
              textAnchor="middle"
              className={`font-mono text-[11px] ${j === pointer(shown.file) ? 'fill-sage-ink' : 'fill-zinc-faded'}`}
            >
              {suffix(shown.file, j)}
            </text>
            {say.numbered && (
              <text x={colX(j) + HOLE_W / 2} y={LABEL_Y - 16} textAnchor="middle" className="fill-zinc-faded font-mono text-[10px]">
                {j}
              </text>
            )}
            <rect x={colX(j)} y={HOLE_Y} width={HOLE_W} height={HOLE_H} rx={8} className="fill-paper stroke-zinc-400" strokeWidth={1.2} />
            {keys.length > shown.file.capacity && (
              <g>
                <rect
                  x={colX(j)}
                  y={BASKET_Y}
                  width={HOLE_W}
                  height={BASKET_H}
                  rx={8}
                  className="fill-none stroke-ink"
                  strokeWidth={1.2}
                  strokeDasharray="4 4"
                />
                <text x={colX(j) + HOLE_W / 2} y={BASKET_Y + BASKET_H + 13} textAnchor="middle" className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
                  {say.basket}
                </text>
              </g>
            )}
          </g>
        ))}

        {[...b.entries()].map(([key, end]) => {
          const start = a.get(key) ?? { x: end.x, y: TOP_Y, bucket: end.bucket }
          const x = lerp(start.x, end.x, t)
          const y = lerp(start.y, end.y, t)
          const place = t < 0.5 ? start : end
          const file = t < 0.5 ? from.file : shown.file
          const inBasket = y >= BASKET_Y
          const used = place.bucket < file.buckets.length ? bitsUsed(file, place.bucket) : file.bits
          return (
            <Ticket
              key={key}
              x={x}
              y={y}
              code={binary(key, DIGITS)}
              used={used}
              tone={key === watched ? 'watch' : inBasket ? 'over' : 'plain'}
            />
          )
        })}

        <path d={`M${markerX - 7},${MARKER_Y} l7,-9 l7,9 z`} className="fill-sage" />
        <text x={markerX} y={MARKER_Y + 16} textAnchor="middle" className="fill-sage-ink font-mono text-[10px] uppercase tracking-widest">
          {say.marker}
        </text>
      </svg>
    </div>
  )
}
