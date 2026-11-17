import { lerp, usePlay } from '../../components/explain/useLoop'
import { ASKER, clarity, FRIENDS, HANDOFFS, pct, TABLE } from './model'

export type Show = 'row' | 'faded' | 'room' | 'ask' | 'listen' | 'blend' | 'named'

const WIDTH = 340
const HEIGHT = 300
const R = 13
// The row: friends side by side; the table: friends round it
const rowAt = (i: number) => ({ x: 42 + i * 64, y: 196 })
const TABLE_AT = { x: 170, y: 150, r: 92 }
const roomAt = (i: number) => {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / FRIENDS.length
  return { x: TABLE_AT.x + TABLE_AT.r * Math.cos(angle), y: TABLE_AT.y + TABLE_AT.r * Math.sin(angle) }
}
// The sheet passed down the row
const SHEET = { w: 92, line: 14, top: 60 }

const ORDER: Show[] = ['row', 'faded', 'room', 'ask', 'listen', 'blend', 'named']
const from = (show: Show, first: Show) => ORDER.indexOf(show) >= ORDER.indexOf(first)

const dee = FRIENDS[ASKER]

// The story's five friends: first in a row passing one sheet along (each
// copy fades the lines already on it), then round one table, where Dee asks
// a question and listens to each friend by how well their tag fits it.
// `show` picks what plays; give it a `key` per step so each plays from the
// start.
export default function Meeting({ show }: { show: Show }) {
  const span = show === 'row' ? HANDOFFS : show === 'room' || show === 'listen' || show === 'blend' ? 1 : 0
  const pace = show === 'row' ? 1100 : 1000
  const played = usePlay(span, pace)

  const inRow = show === 'row' || show === 'faded'
  // How far from the row to the table
  const moved = inRow ? 0 : show === 'room' ? played : 1
  const at = (i: number) => {
    const a = rowAt(i)
    const b = roomAt(i)
    const t = moved * moved * (3 - 2 * moved)
    return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) }
  }
  // Who holds the sheet, and how far it has gone
  const holding = show === 'row' ? played : HANDOFFS
  const holder = Math.min(HANDOFFS, Math.floor(holding))
  const passing = lerp(rowAt(holder).x, rowAt(Math.min(HANDOFFS, holder + 1)).x, holding - holder)
  const sheetX = Math.max(SHEET.w / 2 + 4, Math.min(WIDTH - SHEET.w / 2 - 4, passing))

  const tags = from(show, 'ask')
  const named = show === 'named'
  const listened = show === 'listen' ? played : from(show, 'listen') ? 1 : 0
  const everyone = show === 'blend' ? played : named ? 1 : 0

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full sm:w-3/5 shrink-0"
        role="img"
        aria-label={
          inRow
            ? 'Five friends in a row hand one sheet along; the first friend’s line fades with every copy.'
            : `Five friends round one table. Dee listens to each by how well their tag fits her question: ${FRIENDS.map(
                (f, j) => `${f.name} ${pct(TABLE[ASKER][j])}`,
              ).join(', ')}.`
        }
      >
        {/* The row: each handoff, numbered */}
        {inRow &&
          FRIENDS.slice(1).map((_, k) => {
            const a = rowAt(k)
            const b = rowAt(k + 1)
            const done = holding >= k + 1
            return (
              <g key={k}>
                <line
                  x1={a.x + R + 4}
                  x2={b.x - R - 4}
                  y1={a.y}
                  y2={b.y}
                  className={done ? 'stroke-ink' : 'stroke-zinc-300 dark:stroke-zinc-200/25'}
                  strokeOpacity={done ? 0.5 : 1}
                  strokeWidth={1.5}
                />
                <text x={(a.x + b.x) / 2} y={a.y - 8} textAnchor="middle" className="fill-zinc-faded font-mono text-[10px]">
                  {k + 1}
                </text>
              </g>
            )
          })}
        {inRow && (
          <g>
            <rect
              x={sheetX - SHEET.w / 2}
              y={SHEET.top}
              width={SHEET.w}
              height={FRIENDS.length * SHEET.line + 10}
              rx={4}
              className="fill-paper stroke-ink"
              strokeOpacity={0.5}
            />
            {FRIENDS.map((f, k) => {
              if (k > holder) return null
              const copies = (show === 'row' ? holding : HANDOFFS) - k
              return (
                <g key={f.name}>
                  <text
                    x={sheetX - SHEET.w / 2 + 8}
                    y={SHEET.top + 16 + k * SHEET.line}
                    className={`${k === 0 ? 'fill-sage-ink' : 'fill-ink'} font-mono text-[10px]`}
                  >
                    {f.name}
                  </text>
                  {/* Where the line was written, however faint it is now */}
                  <rect
                    x={sheetX - SHEET.w / 2 + 36}
                    y={SHEET.top + 9 + k * SHEET.line}
                    width={SHEET.w - 44}
                    height={5}
                    rx={2.5}
                    className="fill-none stroke-ink"
                    strokeOpacity={0.3}
                    strokeWidth={0.75}
                  />
                  <rect
                    x={sheetX - SHEET.w / 2 + 36}
                    y={SHEET.top + 9 + k * SHEET.line}
                    width={SHEET.w - 44}
                    height={5}
                    rx={2.5}
                    className={k === 0 ? 'fill-sage' : 'fill-ink'}
                    fillOpacity={clarity(Math.max(0, copies))}
                  />
                </g>
              )
            })}
            <text x={sheetX} y={SHEET.top - 8} textAnchor="middle" className="fill-ink font-mono text-[10px] uppercase tracking-widest">
              Sheet
            </text>
          </g>
        )}

        {/* The table */}
        {!inRow && (
          <circle
            cx={TABLE_AT.x}
            cy={TABLE_AT.y}
            r={TABLE_AT.r - 34}
            className="fill-paper stroke-zinc-300 dark:stroke-zinc-200/25"
            strokeWidth={1.5}
            opacity={moved}
          />
        )}
        {/* Everyone can hear everyone */}
        {show === 'room' &&
          FRIENDS.flatMap((_, i) =>
            FRIENDS.slice(i + 1).map((__, k) => {
              const j = i + 1 + k
              return (
                <line
                  key={`${i}-${j}`}
                  x1={at(i).x}
                  y1={at(i).y}
                  x2={at(j).x}
                  y2={at(j).y}
                  className="stroke-ink"
                  strokeOpacity={0.3 * played}
                  strokeWidth={1.2}
                />
              )
            }),
          )}
        {/* Everyone else listening, at the same time */}
        {everyone > 0 &&
          FRIENDS.flatMap((_, i) =>
            i === ASKER
              ? []
              : FRIENDS.map((__, j) =>
                  i === j ? null : (
                    <line
                      key={`${i}-${j}`}
                      x1={at(i).x}
                      y1={at(i).y}
                      x2={at(j).x}
                      y2={at(j).y}
                      className="stroke-ink"
                      strokeOpacity={0.18 * everyone}
                      strokeWidth={1 + 8 * TABLE[i][j]}
                      strokeLinecap="round"
                    />
                  ),
                ),
          )}
        {/* Dee listening */}
        {listened > 0 &&
          FRIENDS.map((f, j) => {
            if (j === ASKER) return null
            const a = at(ASKER)
            const b = at(j)
            return (
              <line
                key={f.name}
                x1={a.x}
                y1={a.y}
                x2={lerp(a.x, b.x, listened)}
                y2={lerp(a.y, b.y, listened)}
                className="stroke-sage"
                strokeWidth={1 + 16 * TABLE[ASKER][j]}
                strokeLinecap="round"
              />
            )
          })}

        {/* The friends */}
        {FRIENDS.map((f, i) => {
          const p = at(i)
          const asking = !inRow && i === ASKER && tags
          // Labels sit outside the table, or under the row
          const below = inRow || p.y > TABLE_AT.y + 10
          const ly = below ? p.y + R + 14 : p.y - R - 20
          return (
            <g key={f.name}>
              <circle cx={p.x} cy={p.y} r={R} className={asking ? 'fill-ink' : 'fill-sage'} />
              <text x={p.x} y={ly} textAnchor="middle" className="fill-ink font-mono text-[11px]">
                {named ? `word ${i + 1}` : f.name}
                {!named && listened >= 1 && i !== ASKER ? ` ${pct(TABLE[ASKER][i])}` : ''}
              </text>
              {tags && (
                <text x={p.x} y={ly + 13} textAnchor="middle" className="fill-sage-ink font-mono text-[10px]">
                  {named ? 'key' : f.tag}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      <Panel show={show} holding={holding} />
    </div>
  )
}

// What the drawing's moment says, in words beside it
function Panel({ show, holding }: { show: Show; holding: number }) {
  const heading =
    show === 'row' || show === 'faded'
      ? 'The sheet'
      : show === 'room'
        ? 'One table'
        : show === 'ask'
          ? `${dee.name} asks`
          : show === 'listen'
            ? `How much ${dee.name} listens`
            : show === 'blend'
              ? `${dee.name}’s new notes`
              : 'The same thing, named'
  return (
    <div className="w-full sm:w-2/5 font-mono text-[0.8125rem] leading-snug">
      <p className="mb-3 uppercase tracking-widest text-zinc-faded">{heading}</p>
      {(show === 'row' || show === 'faded') && (
        <ul className="space-y-2">
          {FRIENDS.map((f, k) => {
            if (k > Math.floor(holding)) return null
            const copies = Math.max(0, Math.floor(holding) - k)
            return (
              <li key={f.name}>
                <span className="text-ink">{f.name}</span>
                <span className="text-zinc-faded">
                  {' '}
                  · copied {copies}×{show === 'faded' && k === 0 ? `, 1/${Math.round(1 / clarity(copies))} as clear` : ''}
                </span>
              </li>
            )
          })}
          {show === 'faded' && (
            <li className="pt-2 text-ink">
              {FRIENDS[HANDOFFS].name} waited {HANDOFFS} handoffs.
            </li>
          )}
        </ul>
      )}
      {show === 'room' && <p className="text-ink">Everyone hears everyone, in one round. Nobody waits.</p>}
      {show === 'ask' && (
        <>
          <p className="text-ink">“{dee.question}”</p>
          <ul className="mt-3 space-y-1">
            {FRIENDS.map((f) => (
              <li key={f.name}>
                <span className="text-ink">{f.name}</span>
                <span className="text-zinc-faded"> · tag: {f.tag}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {(show === 'listen' || show === 'blend') && (
        <ul className="space-y-2">
          {FRIENDS.map((f, k) => (
            <li key={f.name}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-ink">
                  {pct(TABLE[ASKER][k])} {show === 'listen' ? f.name : `“${f.note}”`}
                </span>
                {show === 'listen' && <span className="text-zinc-faded">{f.tag}</span>}
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-sage" style={{ width: `${100 * TABLE[ASKER][k]}%` }} />
            </li>
          ))}
          {show === 'blend' && <li className="pt-1 text-zinc-faded">Everyone else does the same, at the same time.</li>}
        </ul>
      )}
      {show === 'named' && (
        <ul className="space-y-1.5">
          <li>
            <span className="text-ink">a friend</span>
            <span className="text-zinc-faded"> → a word</span>
          </li>
          <li>
            <span className="text-ink">the question</span>
            <span className="text-zinc-faded"> → its query</span>
          </li>
          <li>
            <span className="text-ink">a tag</span>
            <span className="text-zinc-faded"> → a key</span>
          </li>
          <li>
            <span className="text-ink">what they say</span>
            <span className="text-zinc-faded"> → a value</span>
          </li>
          <li>
            <span className="text-ink">the new notes</span>
            <span className="text-zinc-faded"> → the word’s new vector</span>
          </li>
          <li>
            <span className="text-ink">the round</span>
            <span className="text-zinc-faded"> → self-attention</span>
          </li>
        </ul>
      )}
    </div>
  )
}
