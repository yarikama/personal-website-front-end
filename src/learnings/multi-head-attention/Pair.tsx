import { usePlay } from '../../components/explain/useLoop'

const WIDTH = 470
const HEIGHT = 150
const LEFT = 64
const CELL = 42
const ROWS = { you: 34, them: 74, match: 116 }
// ms a question
const PACE = 420

// Two people's answers to an eight-question quiz, and the tally: +1 for
// every answer they share, −1 for every one they don't, counted a question
// at a time.
export default function Pair({ you, them }: { you: number[]; them: number[] }) {
  const counted = Math.floor(usePlay(you.length, PACE))
  const running = you.slice(0, counted).reduce((sum, a, i) => sum + a * them[i], 0)
  const tallyX = LEFT + you.length * CELL + 8

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="mx-auto w-full max-w-[36rem]"
      role="img"
      aria-label={`Two people's answers to ${you.length} yes or no questions. They share ${
        you.filter((a, i) => a === them[i]).length
      } answers and differ on the rest, so their tally is ${you.reduce((s, a, i) => s + a * them[i], 0)}.`}
    >
      {(
        [
          ['You', ROWS.you],
          ['Them', ROWS.them],
          ['Match', ROWS.match],
        ] as const
      ).map(([name, y]) => (
        <text key={name} x={LEFT - 14} y={y + 4} textAnchor="end" className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
          {name}
        </text>
      ))}
      {you.map((a, i) => {
        const x = LEFT + i * CELL + CELL / 2
        const shown = i < counted
        const same = a === them[i]
        return (
          <g key={i}>
            {[
              [a, ROWS.you],
              [them[i], ROWS.them],
            ].map(([answer, y]) => (
              <g key={y}>
                <circle
                  cx={x}
                  cy={y}
                  r={13}
                  className={answer === 1 ? 'fill-ink stroke-ink' : 'fill-paper stroke-zinc-400'}
                  fillOpacity={answer === 1 ? 0.8 : 1}
                  strokeWidth={1.5}
                />
                <text
                  x={x}
                  y={y + 4}
                  textAnchor="middle"
                  className={`font-mono text-[11px] ${answer === 1 ? 'fill-paper' : 'fill-ink'}`}
                >
                  {answer === 1 ? 'Y' : 'N'}
                </text>
              </g>
            ))}
            {shown && (
              <text
                x={x}
                y={ROWS.match + 4}
                textAnchor="middle"
                className={`font-mono text-[11px] tabular-nums ${same ? 'fill-sage-ink' : 'fill-ink'}`}
              >
                {same ? '+1' : '−1'}
              </text>
            )}
          </g>
        )
      })}
      <text x={tallyX} y={ROWS.match - 22} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
        Tally
      </text>
      <text x={tallyX} y={ROWS.match + 6} className="fill-ink font-mono text-[18px] tabular-nums">
        {running > 0 ? `+${running}` : running < 0 ? `−${-running}` : '0'}
      </text>
    </svg>
  )
}
