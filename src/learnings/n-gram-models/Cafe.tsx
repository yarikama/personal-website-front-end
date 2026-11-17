import { usePlay } from '../../components/explain/useLoop'
import Hops from './Hops'
import { tokenName, WIDTH } from './layout'
import {
  AFTER_WATCH,
  BIGRAM,
  END,
  hops,
  NEW,
  ORDERS,
  prefixes,
  START,
  vocabulary,
  WATCH,
  WATCH_COUNT,
  watchSpots,
  words,
} from './model'

export type Show = 'orders' | 'whole' | 'next' | 'tally' | 'chain' | 'named'

const ROW = 21
const TOP = 14
const HEIGHT = TOP + ORDERS.length * ROW
// Overpass Mono at 11px: about 6.6px a letter, and a gap between words
const LETTER = 6.6
const GAP = 7

// Each order as the barista reads it: a start, its words, an end
const ROWS = ORDERS.map((order) => [START, ...words(order), END])
const NEW_HOPS = hops(BIGRAM, NEW)
const PREFIXES = prefixes(NEW)

type Mark = 'lit' | 'context' | 'next' | null

// How each story step lights the orders, `played` along its animation
function marking(show: Show, played: number) {
  // Rows in grey, tokens boxed
  let faded: (row: number) => boolean = () => false
  let mark: (row: number, token: number) => Mark = () => null
  let visible: number = ORDERS.length

  if (show === 'orders') {
    visible = Math.ceil(played)
  } else if (show === 'whole' || show === 'next') {
    const k = show === 'next' ? PREFIXES.length : Math.min(PREFIXES.length, Math.floor(played) + 1)
    const { matching } = PREFIXES[k - 1]
    const matches = (row: number) => matching.includes(ORDERS[row])
    faded = (row) => !matches(row)
    mark = (row, token) =>
      matches(row) && token >= 1 && token <= k ? 'lit' : show === 'next' && matches(row) && token === k + 1 ? 'next' : null
  } else if (show === 'tally') {
    const k = Math.floor(played)
    mark = (row, token) =>
      watchSpots.some((spot, i) => i < k && spot.order === row && (token === spot.word + 1 || token === spot.word + 2))
        ? 'lit'
        : null
  } else if (show === 'chain' && played < NEW_HOPS.length) {
    const hop = NEW_HOPS[Math.floor(played)]
    const before = hop.context[0]
    mark = (row, token) => {
      const tokens = ROWS[row]
      if (tokens[token] === before && token < tokens.length - 1) return tokens[token + 1] === hop.next ? 'lit' : 'context'
      if (token > 0 && tokens[token - 1] === before && tokens[token] === hop.next) return 'lit'
      return null
    }
  }
  return { faded, mark, visible }
}

// The twelve orders, one a line, lit as the step says
function Orders({ show, played }: { show: Show; played: number }) {
  const named = show === 'named'
  const { faded, mark, visible } = marking(show, played)
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      role="img"
      aria-label={`The café’s ${ORDERS.length} orders, each from a start to an end: ${ORDERS.join('; ')}`}
    >
      {ROWS.map((tokens, row) => {
        if (row >= visible) return null
        const y = TOP + row * ROW
        let x = 0
        return (
          <g key={row}>
            {tokens.map((token, i) => {
              const text = tokenName(token, named)
              const width = text.length * LETTER
              const at = x
              x += width + GAP
              const m = mark(row, i)
              const edge = token === START || token === END
              return (
                <g key={i}>
                  {m === 'lit' && (
                    <rect x={at - 3} y={y - 11} width={width + 6} height={16} rx={4} className="fill-sage" fillOpacity={0.35} />
                  )}
                  {m === 'context' && (
                    <rect
                      x={at - 3}
                      y={y - 11}
                      width={width + 6}
                      height={16}
                      rx={4}
                      className="fill-none stroke-sage"
                      strokeWidth={1.2}
                    />
                  )}
                  {m === 'next' && (
                    <rect
                      x={at - 3}
                      y={y - 11}
                      width={width + 6}
                      height={16}
                      rx={4}
                      className="fill-none stroke-ink"
                      strokeWidth={1.2}
                    />
                  )}
                  <text
                    x={at}
                    y={y + 1}
                    className={`font-mono text-[11px] ${faded(row) || (edge && !m) ? 'fill-zinc-faded' : 'fill-ink'}`}
                  >
                    {text}
                  </text>
                </g>
              )
            })}
          </g>
        )
      })}
    </svg>
  )
}

const PANEL_HEIGHT = HEIGHT
const BAR_X = 148
const BAR_W = 112

// Words over bars: what the barista is counting at this step
function Bars({
  title,
  rows,
  most,
  foot,
  label,
}: {
  title: string
  rows: { name: string; count: number }[]
  most: number
  foot?: string[]
  label: string
}) {
  return (
    <svg viewBox={`0 0 ${WIDTH} ${PANEL_HEIGHT}`} className="w-full" role="img" aria-label={label}>
      <text x={0} y={14} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
        {title}
      </text>
      {rows.map((r, i) => {
        const y = 44 + i * 28
        return (
          <g key={r.name}>
            <text x={0} y={y + 4} className="fill-ink font-mono text-[11px]">
              {r.name}
            </text>
            <rect x={BAR_X} y={y - 6} width={BAR_W} height={12} rx={3} className="fill-zinc-200 dark:fill-zinc-300" />
            <rect x={BAR_X} y={y - 6} width={(BAR_W * r.count) / most} height={12} rx={3} className="fill-sage" />
            <text x={WIDTH} y={y + 4} textAnchor="end" className="fill-ink font-mono text-[11px] tabular-nums">
              {r.count}
            </text>
          </g>
        )
      })}
      {foot?.map((line, i) => (
        <text key={i} x={0} y={44 + rows.length * 28 + 14 + i * 20} className="fill-ink font-mono text-[11px]">
          {line}
        </text>
      ))}
    </svg>
  )
}

// What the barista knows so far, beside the orders
function Panel({ show, played }: { show: Show; played: number }) {
  if (show === 'orders') {
    const vocab = vocabulary(ORDERS)
    return (
      <svg
        viewBox={`0 0 ${WIDTH} ${PANEL_HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`${Math.ceil(played)} orders so far, using ${vocab.length} different words`}
      >
        <text x={0} y={40} className="fill-ink font-serif text-[34px] font-light">
          {Math.ceil(played)} orders
        </text>
        <text x={0} y={74} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
          {vocab.length} different words
        </text>
        {vocab.map((word, i) => (
          <text key={word} x={(i % 3) * 100} y={104 + Math.floor(i / 3) * 22} className="fill-ink font-mono text-[11px]">
            {word}
          </text>
        ))}
      </svg>
    )
  }
  if (show === 'whole' || show === 'next') {
    const k = show === 'next' ? PREFIXES.length : Math.min(PREFIXES.length, Math.floor(played) + 1)
    const last = PREFIXES[PREFIXES.length - 1]
    return (
      <Bars
        title="Orders that began…"
        rows={PREFIXES.slice(0, k).map((p) => ({ name: `“${p.start.join(' ')}”`, count: p.matching.length }))}
        most={ORDERS.length}
        foot={
          show === 'next'
            ? [`then came: ${last.next.join(', ')}`, `“milk”: ${last.next.filter((w) => w === 'milk').length} of ${last.matching.length}`]
            : undefined
        }
        label={`Of ${ORDERS.length} orders, ${PREFIXES.slice(0, k)
          .map((p) => `${p.matching.length} began “${p.start.join(' ')}”`)
          .join(', ')}.`}
      />
    )
  }
  if (show === 'tally') {
    const k = Math.floor(played)
    const seen = watchSpots.slice(0, k).map((spot) => words(ORDERS[spot.order])[spot.word + 1] ?? END)
    const rows = AFTER_WATCH.map((r) => ({ name: r.next, count: seen.filter((w) => w === r.next).length }))
    return (
      <Bars
        title={`After “${WATCH}” came…`}
        rows={rows}
        most={WATCH_COUNT}
        foot={k >= WATCH_COUNT ? [`“${WATCH}” came ${WATCH_COUNT} times`, `milk: ${rows[0].count} of ${WATCH_COUNT}`] : [`“${WATCH}” so far: ${k}`]}
        label={`After “${WATCH}” came ${rows.map((r) => `${r.name} ${r.count}`).join(', ')}, of ${k} so far.`}
      />
    )
  }
  return (
    <Hops
      hops={NEW_HOPS}
      shown={show === 'named' ? Infinity : played}
      named={show === 'named'}
      label={`“${NEW}”, hop by hop: ${NEW_HOPS.map((h) => `${h.count} of ${h.of}`).join(', ')}; multiplied, 3 in 64.`}
    />
  )
}

// How long each step plays: in units of its animation, and ms a unit
const PLAY: Record<Show, [number, number]> = {
  orders: [ORDERS.length, 180],
  whole: [PREFIXES.length, 1100],
  next: [1, 1],
  tally: [watchSpots.length, 600],
  chain: [NEW_HOPS.length, 1100],
  named: [1, 1],
}

// The story's figure: the orders on one side, what is counted on the other.
// It plays when shown; give it a key to play again.
export default function Cafe({ show }: { show: Show }) {
  const [span, pace] = PLAY[show]
  const played = usePlay(span, pace)
  return (
    <div className="grid gap-6 sm:grid-cols-2 sm:gap-8">
      <Orders show={show} played={played} />
      <Panel show={show} played={played} />
    </div>
  )
}
