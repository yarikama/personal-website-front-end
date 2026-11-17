import { usePlay } from '../../components/explain/useLoop'
import { CALLS, DINNER, inMind, LUNCH, onNote, pct, STOPS, STORY_NEXT, STORY_WORDS } from './model'

export type Show = 'start' | 'head' | 'note' | 'calls' | 'lunch' | 'dinner' | 'named'

// Rows down the day, one a stop; time runs down the page so the figure
// stays tall and narrow on a phone
const WIDTH = 460
const TOP = 46
const ROW = 34
const HEIGHT = TOP + STOPS.length * ROW + 34
const LABEL = 92
const HEAD = 104
const NOTE = 232
const BAR = 76
const BAR_H = 14
const GATE_X = [372, 408, 444]
const GATE = 16
// ms a row, for the lane that is playing
const PACE = 420

const rowY = (k: number) => TOP + k * ROW

// The story's figure: a message carried through a day in your head and on a
// note, and the three calls made at each stop. Give it a `key` per step so
// each step plays from the start.
export default function Day({ show }: { show: Show }) {
  const playing = show === 'head' || show === 'note' || show === 'calls'
  const played = usePlay(playing ? STOPS.length : 0, PACE)
  // How many rows of each lane are drawn
  const headRows = show === 'start' ? 1 : show === 'head' ? played : STOPS.length
  const noteRows = show === 'start' || show === 'head' ? 0 : show === 'note' ? played : STOPS.length
  const gateRows = show === 'calls' ? played : show === 'lunch' || show === 'dinner' || show === 'named' ? STOPS.length : 0
  const named = show === 'named'
  const lit = show === 'start' ? 0 : show === 'lunch' ? LUNCH : show === 'dinner' || show === 'named' ? DINNER : null

  type Header = { text: string; x: number; lane: boolean }
  const headers: Header[] = [{ text: named ? 'Plain RNN' : 'In mind', x: HEAD, lane: true }]
  if (noteRows > 0 || show === 'note') headers.push({ text: named ? 'LSTM cell' : 'On paper', x: NOTE, lane: true })
  if (gateRows > 0 || show === 'calls')
    (['keep', 'write', 'read'] as const).forEach((name, j) =>
      headers.push({ text: named ? ['f', 'i', 'o'][j] : name, x: GATE_X[j], lane: false }),
    )

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="mx-auto w-full max-w-[34rem]"
      role="img"
      aria-label={
        named
          ? 'Seven words read by a plain RNN, whose memory of the subject halves at every word, and by an LSTM, whose cell keeps it whole'
          : 'A message carried through seven stops of a day, fading in your head and kept whole on a note'
      }
    >
      {headers.map(({ text, x, lane }) => (
        <text
          key={x}
          x={x}
          y={22}
          textAnchor={lane ? 'start' : 'middle'}
          className={`fill-zinc-faded font-mono text-[11px] ${lane ? 'uppercase tracking-widest' : ''}`}
        >
          {text}
        </text>
      ))}

      {STOPS.map((stop, k) => {
        const y = rowY(k)
        const mid = y + ROW / 2
        const on = lit === k
        const textTone = on ? 'fill-ink' : 'fill-zinc-faded'
        const head = Math.min(1, Math.max(0, headRows - k))
        const note = Math.min(1, Math.max(0, noteRows - k))
        const gate = Math.min(1, Math.max(0, gateRows - k))
        return (
          <g key={stop}>
            {on && <rect x={0} y={y + 2} width={WIDTH} height={ROW - 4} rx={8} className="fill-sage" fillOpacity={0.18} />}
            <text x={LABEL - 6} y={mid + 4} textAnchor="end" className={`font-mono text-[11px] ${textTone}`}>
              {named ? STORY_WORDS[k] : stop}
            </text>

            {/* In mind: the message, a share of it clear */}
            <rect x={HEAD} y={mid - BAR_H / 2} width={BAR} height={BAR_H} rx={3} className="fill-none stroke-zinc-300" />
            {head > 0 && (
              <>
                <rect
                  x={HEAD}
                  y={mid - BAR_H / 2}
                  width={Math.max(1.5, BAR * inMind[k] * head)}
                  height={BAR_H}
                  rx={3}
                  className="fill-ink"
                  fillOpacity={0.55}
                />
                <text x={HEAD + BAR + 6} y={mid + 4} className={`font-mono text-[11px] tabular-nums ${on ? 'fill-ink' : 'fill-zinc-faded'}`}>
                  {pct(inMind[k])}
                </text>
              </>
            )}

            {/* On paper: the note, untouched by the day */}
            {(noteRows > 0 || show === 'note') && (
              <rect x={NOTE} y={mid - BAR_H / 2} width={BAR} height={BAR_H} rx={3} className="fill-none stroke-zinc-300" />
            )}
            {note > 0 && (
              <>
                <rect x={NOTE} y={mid - BAR_H / 2} width={BAR * onNote[k] * note} height={BAR_H} rx={3} className="fill-sage" />
                <text x={NOTE + BAR + 6} y={mid + 4} className={`font-mono text-[11px] tabular-nums ${on ? 'fill-ink' : 'fill-zinc-faded'}`}>
                  {pct(onNote[k])}
                </text>
              </>
            )}

            {/* The three calls: a filled square for yes */}
            {gate > 0 &&
              (['f', 'i', 'o'] as const).map((g, j) => {
                const yes = CALLS[k][g] === 1
                return (
                  <rect
                    key={g}
                    x={GATE_X[j] - GATE / 2}
                    y={mid - GATE / 2}
                    width={GATE}
                    height={GATE}
                    rx={4}
                    className={yes ? (g === 'o' ? 'fill-sage' : 'fill-ink') : 'fill-paper stroke-zinc-400'}
                    fillOpacity={yes ? gate * (g === 'o' ? 1 : 0.8) : 1}
                    strokeWidth={1.25}
                  />
                )
              })}
          </g>
        )
      })}

      {(show === 'dinner' || named) && (
        <text x={LABEL - 6} y={HEIGHT - 10} className="fill-ink font-mono text-[11px]" textAnchor="start">
          {named ? `Next word → ${STORY_NEXT}` : 'Tell Mum → keys under the mat'}
        </text>
      )}
    </svg>
  )
}
