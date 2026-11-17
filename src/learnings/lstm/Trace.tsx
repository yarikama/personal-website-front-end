import { usePlay } from '../../components/explain/useLoop'
import type { Token, Trace as TraceData } from './model'

const WIDTH = 470
const TOP = 52
const ROW = 22
const LABEL = 78
// Each lane is a signed bar about its middle: right for "are", left for "is"
const PLAIN = 150
const CELL = 290
const HALF = 56
const BAR_H = 11
const GATE_X = [378, 414, 450]
// ms a word
const PACE = 140

// A gate's value, short: "1", ".99", ".05"
const short = (x: number) => String(Number(x.toFixed(2))).replace(/^0\./, '.')

// A sentence read word by word by a plain recurrent unit and an LSTM unit:
// each one's state after the word, and the LSTM's three gates. Give it a
// `key` per sentence and setting, so it reads again from the start.
export default function Trace({ tokens, data }: { tokens: Token[]; data: TraceData }) {
  const read = usePlay(tokens.length, PACE)
  const height = TOP + (tokens.length + 1) * ROW + 6

  const lane = (centre: number, value: number, shown: number, y: number) => (
    <>
      <line x1={centre} x2={centre} y1={y - ROW / 2 + 2} y2={y + ROW / 2 - 2} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
      {shown > 0 && Math.abs(value) > 0.005 && (
        <rect
          x={value >= 0 ? centre : centre + HALF * value * shown}
          y={y - BAR_H / 2}
          width={Math.max(1, HALF * Math.abs(value) * shown)}
          height={BAR_H}
          rx={2}
          className={value >= 0 ? 'fill-sage' : 'fill-ink'}
          fillOpacity={value >= 0 ? 1 : 0.6}
        />
      )}
    </>
  )

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height}`}
      className="mx-auto w-full max-w-[36rem]"
      role="img"
      aria-label={`The sentence “${tokens.map((t) => t.word).join(' ')}”, read by a plain RNN and an LSTM, with each one's lean towards “are” or “is” after every word`}
    >
      {(
        [
          ['Plain RNN', PLAIN],
          ['LSTM cell', CELL],
        ] as const
      ).map(([name, x]) => (
        <g key={name}>
          <text x={x} y={18} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
            {name}
          </text>
          <text x={x - 6} y={36} textAnchor="end" className="fill-zinc-faded font-mono text-[11px]">
            ← is
          </text>
          <text x={x + 6} y={36} className="fill-zinc-faded font-mono text-[11px]">
            are →
          </text>
        </g>
      ))}
      {(['f', 'i', 'o'] as const).map((g, j) => (
        <text key={g} x={GATE_X[j]} y={36} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px]">
          {g}
        </text>
      ))}

      {tokens.map((token, k) => {
        const y = TOP + k * ROW + ROW / 2
        const shown = Math.min(1, Math.max(0, read - k))
        const gates = data.gates[k]
        const noun = token.role !== 'word'
        return (
          <g key={k}>
            <text
              x={LABEL}
              y={y + 4}
              textAnchor="end"
              className={`font-mono text-[11px] ${shown > 0 ? (noun ? 'fill-ink' : 'fill-zinc-faded') : 'fill-zinc-faded'}`}
              fontWeight={token.role === 'subject' ? 700 : undefined}
            >
              {token.word}
            </text>
            {lane(PLAIN, data.plain[k], shown, y)}
            {lane(CELL, data.cell[k], shown, y)}
            {shown > 0 &&
              (['f', 'i', 'o'] as const).map((g, j) => (
                <text
                  key={g}
                  x={GATE_X[j]}
                  y={y + 4}
                  textAnchor="middle"
                  className={`font-mono text-[11px] tabular-nums ${gates[g] >= 0.5 ? 'fill-ink' : 'fill-zinc-faded'}`}
                >
                  {short(gates[g])}
                </text>
              ))}
          </g>
        )
      })}

      {/* The slot the verb goes in */}
      <text
        x={LABEL}
        y={TOP + tokens.length * ROW + ROW / 2 + 4}
        textAnchor="end"
        className={`font-mono text-[11px] ${read >= tokens.length ? 'fill-sage-ink' : 'fill-zinc-faded'}`}
      >
        {read >= tokens.length ? data.verb : '___'}
      </text>
    </svg>
  )
}
