import { usePlay } from '../../components/explain/useLoop'
import { lanes, ORDER, stopPoint, truncatable, type Rec, type Scheme } from './model'

// Story words or system words for the same drawing: the reveal relabels it
const WORDS = {
  cafe: {
    tx: (tx: number) => ORDER(tx),
    ckpt: 'line across',
    startCkpt: (list: number[]) => `note: ${list.map(ORDER).join(', ')} open`,
    endCkpt: 'end',
    crash: 'power cut',
    wait: 'new orders wait',
    unit: 'lines',
    writing: (n: number) => `Line ${n}`,
    reading: 'Reading back',
    read: (n: number) => `read back ${n}`,
    gone: (n: number) => `tear out ${n}`,
  },
  db: {
    tx: (tx: number) => `T${tx}`,
    ckpt: '<CKPT>',
    startCkpt: (list: number[]) => `<START CKPT (${list.map((tx) => `T${tx}`).join(', ')})>`,
    endCkpt: '<END CKPT>',
    crash: 'crash',
    wait: 'new transactions wait',
    unit: 'records',
    writing: (n: number) => `Record ${n}`,
    reading: 'Recovery scans back',
    read: (n: number) => `recovery reads ${n}`,
    gone: (n: number) => `truncate ${n}`,
  },
}

const WIDTH = 600
const PAD = 6
const MARK_Y = 17
const TOP = 56

// A log as transactions over time: a bar per transaction from its start to
// its commit (ink while still open), its updates as dots, checkpoints as
// sage lines, and under them the log itself, one square per record. After a
// crash, recovery's backward scan sweeps the squares it reads in sage, and
// the records it will never need again are left as outlines.
// The story plays it: `fill` writes the records one by one, then a crash
// sends the scan back. `still` draws the end at once, for the lab.
export default function LogView({
  log,
  cut = log.length,
  ticks,
  scheme = 'undo',
  frozen = [],
  crashAt,
  words,
  fill = false,
  crashed = true,
  still = false,
  dense = false,
  pace = 140,
}: {
  log: readonly Rec[]
  // Records written when the crash comes
  cut?: number
  // The span of time drawn, in ticks
  ticks: number
  scheme?: Scheme
  frozen?: readonly { from: number; to: number }[]
  // The tick of the crash; by default, just after the last record written
  crashAt?: number
  words: keyof typeof WORDS
  fill?: boolean
  crashed?: boolean
  still?: boolean
  dense?: boolean
  pace?: number
}) {
  const say = WORDS[words]
  const written = log.slice(0, cut)
  const stop = stopPoint(written, scheme)
  const deletable = truncatable(written, scheme)
  const crashTick = crashAt ?? (cut > 0 ? written[cut - 1].t + 1 : 0)
  const stopTick = stop < cut ? written[stop].t : crashTick

  // The timeline: writing the records, a beat, then the scan going back
  const fillUnits = fill ? cut : 0
  const scanUnits = crashed ? crashTick - stopTick : 0
  const span = fillUnits + (crashed ? 1 + scanUnits : 0)
  const played = usePlay(span, pace)
  const at = still ? span : played
  const shown = fill ? Math.min(cut, Math.floor(at)) : cut
  const crashShown = crashed && at >= fillUnits
  const scanned = crashShown ? Math.min(scanUnits, Math.max(0, at - fillUnits - 1)) : 0
  const head = crashTick - scanned
  const done = crashed && at >= span

  const cw = (WIDTH - 2 * PAD) / ticks
  const x = (t: number) => PAD + t * cw
  const laneOf = lanes(log)
  const rows = Math.max(1, ...[...laneOf.values()].map((r) => r + 1))
  const lanesY = dense ? 14 : TOP
  const laneH = dense ? 15 : 28
  const barH = dense ? 9 : 18
  const tapeY = lanesY + rows * laneH + (dense ? 6 : 8)
  const cellH = dense ? 12 : 16
  const arrowY = tapeY + cellH + 16
  const height = arrowY + (dense ? 8 : 22)
  const gap = Math.min(2, cw * 0.25)

  const visible = written.slice(0, shown)
  const nowTick = fill && shown < cut ? (visible.at(-1)?.t ?? -1) + 1 : crashTick
  const commitAt = new Map<number, number>()
  for (const r of visible) if (r.kind === 'commit') commitAt.set(r.tx, r.t)

  const bars = visible.flatMap((r) => (r.kind === 'start' ? [r.tx] : []))
  const marks = visible.filter((r) => r.kind === 'ckpt' || r.kind === 'startCkpt' || r.kind === 'endCkpt')
  const bottom = tapeY + cellH

  // The status line over the drawing
  const status = !crashShown
    ? say.writing(shown)
    : done
      ? `${say.read(cut - stop)} of ${cut} ${say.unit}${deletable > 0 ? ` · ${say.gone(deletable)}` : ''}`
      : say.reading

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 font-mono text-[0.875rem] uppercase tracking-widest">
        <span className="text-zinc-faded">{crashShown ? say.crash : say.writing(shown)}</span>
        <span className={done ? 'text-sage-ink' : 'text-ink'}>{crashShown ? status : ' '}</span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        className="mt-3 w-full"
        role="img"
        aria-label={`A log of ${cut} ${say.unit}${crashed ? `; after the ${say.crash}, ${say.read(cut - stop)} and ${say.gone(deletable)}` : ''}`}
      >
        {/* Stretches when new work waited for a quiescent checkpoint */}
        {frozen
          .filter((f) => f.from < nowTick)
          .map((f) => (
            <g key={f.from}>
              <rect
                x={x(f.from)}
                y={lanesY - 6}
                width={Math.max(cw, x(Math.min(f.to, nowTick)) - x(f.from))}
                height={bottom - lanesY + 6}
                rx={4}
                className="fill-zinc-400/20"
              />
              {!dense && (
                <text
                  x={x(f.to) - 6}
                  y={MARK_Y + 21}
                  textAnchor="end"
                  className="fill-zinc-faded font-mono text-[11px]"
                >
                  {say.wait}
                </text>
              )}
            </g>
          ))}

        {/* Transactions */}
        {bars.map((tx) => {
          const start = visible.find((r) => r.kind === 'start' && r.tx === tx)!.t
          const end = commitAt.get(tx)
          const open = end === undefined
          const right = open ? (crashShown ? x(crashTick) : x(nowTick)) : x(end + 1) - gap
          const y = lanesY + (laneOf.get(tx) ?? 0) * laneH
          const dots = visible.filter((r) => r.kind === 'update' && r.tx === tx)
          return (
            <g key={tx}>
              <rect
                x={x(start) + gap / 2}
                y={y}
                width={Math.max(1, right - x(start) - gap / 2)}
                height={barH}
                rx={barH / 2}
                className={open ? 'fill-ink/10 stroke-ink' : 'fill-zinc-400/15 stroke-zinc-400'}
                strokeWidth={open ? 1.6 : 1}
              />
              {!dense &&
                dots.map((r) => (
                  <circle key={r.t} cx={x(r.t + 0.5)} cy={y + barH / 2} r={2.6} className={open ? 'fill-ink' : 'fill-zinc-400'} />
                ))}
              {!dense && (
                <text
                  x={x(start) + 5}
                  y={y + barH / 2 + 4}
                  className={`${open ? 'fill-ink' : 'fill-zinc-faded'} font-mono text-[11px]`}
                >
                  {say.tx(tx)}
                </text>
              )}
            </g>
          )
        })}

        {/* Checkpoints */}
        {marks.map((r) => {
          const mx = x(r.t + 0.5)
          const label = r.kind === 'ckpt' ? say.ckpt : r.kind === 'startCkpt' ? say.startCkpt(r.list) : say.endCkpt
          return (
            <g key={r.t}>
              <line
                x1={mx}
                x2={mx}
                y1={lanesY - 8}
                y2={bottom}
                className="stroke-sage"
                strokeWidth={2}
                strokeDasharray={r.kind === 'startCkpt' ? '4 3' : undefined}
              />
              {!dense && (
                <text
                  x={r.kind === 'startCkpt' ? mx - 4 : mx + 4}
                  y={MARK_Y}
                  textAnchor={r.kind === 'startCkpt' ? 'end' : 'start'}
                  className="fill-sage-ink font-mono text-[11px]"
                >
                  {label}
                </text>
              )}
            </g>
          )
        })}

        {/* The log, one square a record; on a dense log, what can go is
            one outlined stretch */}
        {dense && done && deletable > 0 && (
          <rect
            x={x(0)}
            y={tapeY - 2}
            width={x(written[deletable].t) - x(0)}
            height={cellH + 4}
            rx={4}
            className="fill-none stroke-zinc-400"
            strokeDasharray="3 3"
          />
        )}
        {visible.map((r, i) => {
          const gone = done && i < deletable
          const read = crashShown && i >= stop && r.t >= head
          return (
            <rect
              key={i}
              x={x(r.t) + gap / 2}
              y={tapeY}
              width={cw - gap}
              height={cellH}
              rx={Math.min(3, cw / 4)}
              className={
                gone
                  ? dense
                    ? 'fill-zinc-400/25 stroke-none'
                    : 'fill-none stroke-zinc-400'
                  : read
                    ? 'fill-sage stroke-sage'
                    : r.kind === 'start' || r.kind === 'update' || r.kind === 'commit'
                      ? 'fill-zinc-400/50 stroke-none'
                      : 'fill-sage/40 stroke-none'
              }
              strokeWidth={1}
              strokeDasharray={gone && !dense ? '2 2' : undefined}
            />
          )
        })}

        {/* The crash, and recovery's scan back from it */}
        {crashShown && (
          <g>
            <line x1={x(crashTick)} x2={x(crashTick)} y1={lanesY - 8} y2={bottom + 4} className="stroke-ink" strokeWidth={2} />
            {!dense && (
              <text x={x(crashTick) - 4} y={MARK_Y + 21} textAnchor="end" className="fill-ink font-mono text-[11px]">
                {say.crash}
              </text>
            )}
            {scanned > 0 && (
              <g className="stroke-sage fill-sage">
                <line x1={x(crashTick)} x2={x(head) + 5} y1={arrowY} y2={arrowY} strokeWidth={2} />
                <path d={`M${x(head)},${arrowY} l7,-4.5 l0,9 z`} className="stroke-none" />
              </g>
            )}
            {done && !dense && (
              <text
                x={(x(stopTick) + x(crashTick)) / 2}
                y={arrowY + 16}
                textAnchor="middle"
                className="fill-sage-ink font-mono text-[11px]"
              >
                {say.read(cut - stop)}
              </text>
            )}
            {done && !dense && deletable > 0 && (
              <text
                x={(x(0) + x(written[deletable].t)) / 2}
                y={arrowY + 16}
                textAnchor="middle"
                className="fill-zinc-faded font-mono text-[11px]"
              >
                {say.gone(deletable)}
              </text>
            )}
          </g>
        )}
      </svg>
    </div>
  )
}
