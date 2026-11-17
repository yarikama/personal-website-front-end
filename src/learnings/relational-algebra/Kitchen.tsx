import { usePlay } from '../../components/explain/useLoop'
import { START, STATIONS, TREE, type Card, type Node, type Shape, type StationName, type Tray } from './story'

const WIDTH = 360
const HEIGHT = 380
const PAD = 8
const CARD_H = 22
const PITCH = 26
const GAP = 8
// Where the trays go: the station's output above it, its input below,
// so rows flow upward as they do in a query plan
const OUT_Y = 24
const STATION_Y = 178
const STATION_H = 34
const IN_Y = 248

const label = 'fill-zinc-faded font-mono text-[11px] uppercase tracking-widest'
const header = 'flex min-h-[1.5rem] flex-wrap items-baseline justify-between gap-4 font-mono text-[0.875rem] uppercase tracking-widest'

type Tone = 'plain' | 'now' | 'dropped'

function Glyph({ shape, x, y, now }: { shape: Shape; x: number; y: number; now: boolean }) {
  const fill = now ? 'fill-paper' : 'fill-ink'
  return shape === 'long' ? (
    <rect x={x} y={y - 1.5} width={13} height={3} rx={1.5} className={fill} />
  ) : (
    <rect x={x + 3.5} y={y - 3} width={6} height={6} rx={1.5} className={fill} />
  )
}

function CardView({ card, x, y, width, tone }: { card: Card; x: number; y: number; width: number; tone: Tone }) {
  const now = tone === 'now'
  return (
    <g transform={`translate(${x},${y})`} opacity={tone === 'dropped' ? 0.35 : 1}>
      <rect
        width={width}
        height={CARD_H}
        rx={6}
        className={now ? 'fill-sage stroke-sage' : 'fill-paper stroke-ink'}
        strokeWidth={1}
        strokeDasharray={tone === 'dropped' ? '3 3' : undefined}
      />
      <text x={8} y={CARD_H / 2 + 4} className={`font-mono text-[11px] ${now ? 'fill-paper' : 'fill-ink'}`}>
        {card.text}
      </text>
      {card.shapes.map((shape, i) => (
        <Glyph key={i} shape={shape} x={width - 6 - (card.shapes.length - i) * 16 + 3} y={CARD_H / 2} now={now} />
      ))}
    </g>
  )
}

// A tray of cards in `columns` columns, from (x, y); `tone` says how to
// draw each card, null to leave it out
function TrayView({
  tray,
  x,
  y,
  width,
  columns,
  tone,
}: {
  tray: Tray
  x: number
  y: number
  width: number
  columns: number
  tone: (i: number) => Tone | null
}) {
  const cardWidth = (width - (columns - 1) * GAP) / columns
  return (
    <g>
      <text x={x} y={y - 8} className={label}>
        {tray.label}
      </text>
      {tray.cards.map((card, i) => {
        const t = tone(i)
        if (t === null) return null
        return (
          <CardView
            key={i}
            card={card}
            x={x + (i % columns) * (cardWidth + GAP)}
            y={y + Math.floor(i / columns) * PITCH}
            width={cardWidth}
            tone={t}
          />
        )
      })}
    </g>
  )
}

const columnsFor = (tray: Tray) => (tray.cards.length > 4 ? 2 : 1)

// Where each input tray sits: side by side when there are two
function inputPlaces(inputs: Tray[]) {
  const half = (WIDTH - 2 * PAD - GAP * 2) / 2
  return inputs.length === 1
    ? [{ x: PAD, width: WIDTH - 2 * PAD }]
    : inputs.map((_, i) => ({ x: PAD + i * (half + GAP * 2), width: half }))
}

// An arrow up from (x, from) to (toX, to), its head at the top
function Arrow({ x, from, to, toX = x }: { x: number; from: number; to: number; toX?: number }) {
  const angle = Math.atan2(to - from, toX - x)
  const head = (turn: number) => `${toX - 6 * Math.cos(angle + turn)},${to - 6 * Math.sin(angle + turn)}`
  return (
    <g className="stroke-zinc-300 dark:stroke-zinc-200/25" strokeWidth={1.5} fill="none" strokeLinecap="round">
      <line x1={x} y1={from} x2={toX} y2={to} />
      <polyline points={`${head(0.5)} ${toX},${to} ${head(-0.5)}`} />
    </g>
  )
}

function Legend() {
  return (
    <span className="flex items-center gap-3 text-zinc-faded">
      <svg width="13" height="8" aria-hidden>
        <rect y={2.5} width={13} height={3} rx={1.5} className="fill-ink" />
      </svg>
      long
      <svg width="8" height="8" aria-hidden>
        <rect x={1} y={1} width={6} height={6} rx={1.5} className="fill-ink" />
      </svg>
      short
    </span>
  )
}

// Real milliseconds a card takes, by station
const PACE: Record<StationName, number> = { veg: 800, pair: 480, fit: 560, prep: 800 }

// One station at work, played once; give it a `key` per step
function StationScene({ name }: { name: StationName }) {
  const station = STATIONS[name]
  const played = usePlay(station.moves.length, PACE[name])
  const at = Math.floor(played)
  const current = station.moves[at]
  // The output cards made so far, the one being made included
  const made = new Set(station.moves.slice(0, at + 1).flatMap((move) => (move.to === null ? [] : [move.to])))

  const inputTone = (tray: number) => (i: number): Tone => {
    if (current?.from.some(([t, c]) => t === tray && c === i)) return 'now'
    const seen = station.moves.findIndex((move) => move.from.some(([t, c]) => t === tray && c === i))
    return seen < at && station.moves[seen].to === null ? 'dropped' : 'plain'
  }
  const outputTone = (i: number): Tone | null => (!made.has(i) ? null : current?.to === i ? 'now' : 'plain')
  const places = inputPlaces(station.inputs)
  const kept = made.size
  const looked = Math.min(at + (current ? 1 : 0), station.moves.length)

  return (
    <div>
      <div className={header}>
        <span className="tabular-nums text-ink">
          {name === 'pair' ? `${kept} plates so far` : `${looked} in · ${kept} out`}
        </span>
        {name !== 'prep' && <Legend />}
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mx-auto mt-2 w-full max-w-[26rem]"
        role="img"
        aria-label={`A kitchen station, “${station.name}”, taking a tray from below and handing a tray up`}
      >
        <TrayView tray={station.output} x={PAD} y={OUT_Y} width={WIDTH - 2 * PAD} columns={columnsFor(station.output)} tone={outputTone} />
        <Arrow x={WIDTH / 2} from={STATION_Y - 4} to={STATION_Y - 22} />
        <rect
          x={WIDTH / 2 - 130}
          y={STATION_Y}
          width={260}
          height={STATION_H}
          rx={STATION_H / 2}
          className="fill-sage/10 stroke-sage"
          strokeWidth={1.5}
        />
        <text x={WIDTH / 2} y={STATION_Y + STATION_H / 2 + 4} textAnchor="middle" className="fill-ink font-mono text-[11px]">
          {station.name}
        </text>
        {places.map((place, t) => (
          <g key={t}>
            <Arrow x={place.x + place.width / 2} from={IN_Y - 24} to={STATION_Y + STATION_H} />
            <TrayView
              tray={station.inputs[t]}
              x={place.x}
              y={IN_Y}
              width={place.width}
              columns={columnsFor(station.inputs[t])}
              tone={inputTone(t)}
            />
          </g>
        ))}
      </svg>
    </div>
  )
}

// The two trays the kitchen starts from
function StartScene() {
  const places = inputPlaces(START)
  return (
    <div>
      <div className={header}>
        <span className="tabular-nums text-ink">
          {START[0].cards.length} pastas · {START[1].cards.length} sauces
        </span>
        <Legend />
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mx-auto mt-2 w-full max-w-[26rem]"
        role="img"
        aria-label="Two trays: three pastas, each long or short, and four sauces, each fitting long or short pasta"
      >
        {START.map((tray, t) => (
          <TrayView key={t} tray={tray} x={places[t].x} y={IN_Y} width={places[t].width} columns={1} tone={() => 'plain'} />
        ))}
      </svg>
    </div>
  )
}

// The tree, laid out top down: level and x for each node
const NODE_W = 156
const NODE_H = 40
const LEVEL_Y = [26, 96, 166, 236, 306]

interface Placed {
  node: Node
  x: number
  y: number
  parent: { x: number; y: number } | null
}

function place(node: Node, x: number, level: number, parent: Placed['parent'], out: Placed[]) {
  const y = LEVEL_Y[level]
  out.push({ node, x, y, parent })
  if (node.inputs.length === 1) place(node.inputs[0], x, level + 1, { x, y }, out)
  else node.inputs.forEach((input, i) => place(input, i === 0 ? x - 88 : x + 88, level + 1, { x, y }, out))
  return out
}

const PLACED = place(TREE, WIDTH / 2, 0, null, [])

// The whole line as one tree; `system` names it as a database does
function TreeScene({ system }: { system: boolean }) {
  return (
    <div>
      <div className={header}>
        <span className="text-ink">{system ? 'A query plan' : 'Tonight’s line of stations'}</span>
        <span className={system ? 'text-sage-ink' : 'text-zinc-faded'}>{system ? 'rows flow up' : 'trays flow up'}</span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mx-auto mt-2 w-full max-w-[26rem]"
        role="img"
        aria-label={
          system
            ? 'A query plan: tables PASTA and SAUCE at the bottom, then select, product, select and project, each with its row count'
            : 'The kitchen stations as a tree, trays at the bottom and the prep list at the top, each with how many cards it hands up'
        }
      >
        {PLACED.map((p, i) => {
          if (!p.parent) return null
          // Into the parent's underside, not past its end
          const reach = NODE_W / 2 - 24
          const toX = p.parent.x + Math.max(-reach, Math.min(reach, p.x - p.parent.x))
          return <Arrow key={`a${i}`} x={p.x} from={p.y - 2} to={p.parent.y + NODE_H + 2} toX={toX} />
        })}
        {PLACED.map((p, i) => {
          const leaf = p.node.inputs.length === 0
          return (
            <g key={i} transform={`translate(${p.x - NODE_W / 2},${p.y})`}>
              <rect
                width={NODE_W}
                height={NODE_H}
                rx={leaf ? 8 : NODE_H / 2}
                className={leaf ? 'fill-paper stroke-ink' : 'fill-sage/10 stroke-sage'}
                strokeWidth={1.2}
              />
              <text x={NODE_W / 2} y={16} textAnchor="middle" className="fill-ink font-mono text-[11px]">
                {system ? p.node.system : p.node.kitchen}
              </text>
              <text x={NODE_W / 2} y={31} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px]">
                {system ? `${p.node.rows} rows` : `${p.node.rows} on the tray`}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export type Scene = 'start' | StationName | 'tree' | 'plan'

// The kitchen story, one scene of it; give it a `key` per step
export default function Kitchen({ scene }: { scene: Scene }) {
  if (scene === 'start') return <StartScene />
  if (scene === 'tree' || scene === 'plan') return <TreeScene system={scene === 'plan'} />
  return <StationScene name={scene} />
}
