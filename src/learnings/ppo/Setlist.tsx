import { lerp, usePlay } from '../../components/explain/useLoop'
import { EPSILON, EVEN, ratio, REWORKS, shares, SONGS, stopped, STORY_NOTES, STORY_USUAL, type Prefs } from './model'

const WIDTH = 560
const HEIGHT = 330
const LEFT = 20
const COLUMN = (WIDTH - 2 * LEFT) / SONGS.length
const BAR = 54
// The bars: a share of 0 at BASE, of TOP_SHARE at BASE − TALL
const BASE = 256
const TALL = 168
const TOP_SHARE = 0.8
const TIPS_Y = 54

const cx = (song: number) => LEFT + COLUMN * (song + 0.5)
const y = (share: number) => BASE - (Math.min(share, TOP_SHARE) / TOP_SHARE) * TALL
const pct = (share: number) => `${Math.round(100 * share)}%`
const dollars = (value: number) => `$${value.toFixed(2)}`

// The setlist partway through the reworks: between rework k and k + 1, the
// shares in a line
function sharesAt(setlists: Prefs[], at: number) {
  const k = Math.min(Math.floor(at), setlists.length - 1)
  const next = Math.min(k + 1, setlists.length - 1)
  const a = shares(setlists[k])
  const b = shares(setlists[next])
  return a.map((s, song) => lerp(s, b[song], at - k))
}

export type Show = 'even' | 'notes' | 'one' | 'reworks' | 'end' | 'held' | 'named'

// The story's setlist: a bar for each song's share, the weekend's tips over
// them, and, with the limit, a band a fifth either side of where each song
// was that weekend. `show` picks what plays: the even start, the notes
// coming in, one rework, all thirty (without the limit), their end, all
// thirty with it, and the same named. Give it a `key` per step.
export default function Setlist({ show, setlists }: { show: Show; setlists: Prefs[] }) {
  const span = show === 'notes' ? STORY_NOTES.length : show === 'one' ? 1 : show === 'reworks' || show === 'held' ? REWORKS : 0
  const pace = show === 'notes' ? 260 : show === 'one' ? 1600 : 170
  const played = usePlay(span, pace)

  const at = show === 'one' ? played : show === 'reworks' || show === 'held' ? played : show === 'end' || show === 'named' ? REWORKS : 0
  const now = show === 'even' || show === 'notes' ? shares(EVEN) : sharesAt(setlists, at)
  const prefs = show === 'even' || show === 'notes' ? EVEN : setlists[Math.min(Math.round(at), setlists.length - 1)]
  const limited = show === 'held' || show === 'named'
  const named = show === 'named'
  const noted = show === 'notes' ? Math.floor(played) + (played >= span ? 0 : 1) : STORY_NOTES.length
  const ratios = show === 'reworks' || show === 'end' || limited

  // Which way each song is moving, during the one rework
  const before = shares(EVEN)
  const after = shares(setlists[1])

  const title =
    show === 'even' ? 'Your setlist' : show === 'notes' ? 'The weekend' : show === 'one' ? 'One rework' : `Rework ${Math.min(REWORKS, Math.floor(at))} of ${REWORKS}`
  const note =
    show === 'even'
      ? 'a quarter of the time each'
      : show === 'notes'
        ? `usual tip ${dollars(STORY_USUAL)} · sage beat it`
        : limited
          ? named
            ? 'band: ratio 0.8 to 1.2 · notes past it go quiet'
            : 'band: a fifth either side · notes past it stop'
          : show === 'one'
            ? 'dashed: that weekend · beat usual ▲ · fell short ▼'
            : 'each note counts × how much more you now play its song'

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 font-mono text-[0.875rem] uppercase tracking-widest text-zinc-faded">
        <span className="shrink-0">{title}</span>
        {show !== 'even' && (
          <span className="text-right">
            {named ? 'Baseline' : 'Usual'} <span className="text-ink tabular-nums">{dollars(STORY_USUAL)}</span>
          </span>
        )}
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-2 w-full"
        role="img"
        aria-label={`The setlist: ${SONGS.map((s, i) => `${s} ${pct(now[i])}`).join(', ')}${limited ? ', with a band a fifth either side of a quarter' : ''}`}
      >
        {show !== 'even' && (
          <text x={LEFT} y={TIPS_Y - 26} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
            {named ? 'the batch' : 'the weekend’s tips'}
          </text>
        )}
        {SONGS.map((song, i) => {
          const share = now[i]
          const notes = STORY_NOTES.map((n, index) => ({ ...n, index })).filter((n) => n.song === i)
          const r = now[i] / before[i]
          const way = Math.sign(after[i] - before[i])
          return (
            <g key={song}>
              {/* The weekend's tips for this song */}
              {show !== 'even' && (
                <text x={cx(i)} y={TIPS_Y} textAnchor="middle" className="font-mono text-[15px] tabular-nums">
                  {notes.map((n, k) => {
                    const shown = n.index < noted
                    const quiet = limited && stopped(ratio(prefs, n), n.surprise, EPSILON)
                    return (
                      <tspan
                        key={k}
                        dx={k ? 8 : 0}
                        opacity={shown ? (quiet ? 0.25 : 1) : 0}
                        className={n.surprise > 0 ? 'fill-sage' : 'fill-ink'}
                        textDecoration={quiet ? 'line-through' : undefined}
                      >
                        {n.tip}
                      </tspan>
                    )
                  })}
                </text>
              )}

              {/* A fifth either side of where it was */}
              {limited && (
                <g>
                  <rect
                    x={cx(i) - BAR / 2 - 8}
                    width={BAR + 16}
                    y={y(before[i] * (1 + EPSILON))}
                    height={y(before[i] * (1 - EPSILON)) - y(before[i] * (1 + EPSILON))}
                    className="fill-zinc-400"
                    opacity={0.18}
                  />
                  {[1 + EPSILON, 1 - EPSILON].map((k) => (
                    <line
                      key={k}
                      x1={cx(i) - BAR / 2 - 8}
                      x2={cx(i) + BAR / 2 + 8}
                      y1={y(before[i] * k)}
                      y2={y(before[i] * k)}
                      className="stroke-zinc-400"
                      strokeWidth={1}
                    />
                  ))}
                </g>
              )}

              {/* The share */}
              <rect x={cx(i) - BAR / 2} width={BAR} y={y(share)} height={BASE - y(share)} className={i === 3 ? 'fill-sage/70' : 'fill-zinc-400/60'} />
              <line x1={cx(i) - BAR / 2 - 10} x2={cx(i) + BAR / 2 + 10} y1={y(before[i])} y2={y(before[i])} className="stroke-ink" strokeDasharray="3 3" strokeWidth={1} opacity={show === 'even' ? 0 : 0.6} />
              <text
                x={cx(i)}
                y={Math.min(y(share), limited ? y(before[i] * (1 + EPSILON)) : y(share)) - 8}
                textAnchor="middle"
                className="fill-ink font-mono text-[13px] tabular-nums"
              >
                {pct(share)}
              </text>
              {show === 'one' && played > 0.15 && way !== 0 && (
                <text x={cx(i) + BAR / 2 + 12} y={y(share) + 14} className={`font-mono text-[14px] ${way > 0 ? 'fill-sage' : 'fill-ink'}`}>
                  {way > 0 ? '▲' : '▼'}
                </text>
              )}

              {/* The song, and how much more you now play it */}
              <text x={cx(i)} y={BASE + 22} textAnchor="middle" className={`font-mono text-[12px] uppercase tracking-widest ${i === 3 ? 'fill-sage' : 'fill-zinc-faded'}`}>
                {song}
              </text>
              {ratios && (
                <text x={cx(i)} y={BASE + 42} textAnchor="middle" className="fill-zinc-faded font-mono text-[12px] tabular-nums">
                  {named ? `ratio ${r.toFixed(2)}` : `×${r.toFixed(2)}`}
                </text>
              )}
            </g>
          )
        })}
        <line x1={LEFT} x2={WIDTH - LEFT} y1={BASE} y2={BASE} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
      </svg>
      <p className="mt-1 min-h-[3em] sm:min-h-[1.5em] text-center font-mono text-[0.875rem] uppercase tracking-widest text-zinc-faded">{note}</p>
    </div>
  )
}
