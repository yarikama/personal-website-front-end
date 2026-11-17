import { and, not, or, short, TRUTHS, type Truth } from './model'

const CELL = 34
const GAP = 34
const TOP = 26
const TABLE = CELL * 4
const WIDTH = TABLE * 2 + CELL * 2 + GAP * 2
const HEIGHT = TOP + CELL * 4 + 4

// One answer: sage where an UNKNOWN went in and a sure answer still came
// out, dashed where the answer is UNKNOWN
function Answer({ x, y, value, unsureIn }: { x: number; y: number; value: Truth; unsureIn: boolean }) {
  const settled = unsureIn && value !== 'UNKNOWN'
  return (
    <g>
      <rect
        x={x + 3}
        y={y + 3}
        width={CELL - 6}
        height={CELL - 6}
        rx={7}
        className={
          settled ? 'fill-sage/20 stroke-sage' : value === 'UNKNOWN' ? 'fill-none stroke-zinc-400' : 'fill-paper stroke-zinc-300 dark:stroke-zinc-200/25'
        }
        strokeWidth={settled ? 1.6 : 1.1}
        strokeDasharray={value === 'UNKNOWN' ? '3 3' : undefined}
      />
      <text
        x={x + CELL / 2}
        y={y + CELL / 2 + 4}
        textAnchor="middle"
        className={`${settled ? 'fill-ink font-semibold' : value === 'UNKNOWN' ? 'fill-zinc-faded' : 'fill-ink'} font-mono text-[12px]`}
      >
        {short(value)}
      </text>
    </g>
  )
}

const Head = ({ x, y, t }: { x: number; y: number; t: Truth | string }) => (
  <text x={x + CELL / 2} y={y + CELL / 2 + 4} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px]">
    {TRUTHS.includes(t as Truth) ? short(t as Truth) : t}
  </text>
)

function Table({ x, name, op }: { x: number; name: string; op: (a: Truth, b: Truth) => Truth }) {
  return (
    <g>
      <text x={x + TABLE / 2} y={12} textAnchor="middle" className="fill-ink font-mono text-[11px] uppercase tracking-widest">
        {name}
      </text>
      {TRUTHS.map((q, j) => (
        <Head key={q} x={x + CELL * (j + 1)} y={TOP} t={q} />
      ))}
      {TRUTHS.map((p, i) => (
        <g key={p}>
          <Head x={x} y={TOP + CELL * (i + 1)} t={p} />
          {TRUTHS.map((q, j) => (
            <Answer
              key={q}
              x={x + CELL * (j + 1)}
              y={TOP + CELL * (i + 1)}
              value={op(p, q)}
              unsureIn={p === 'UNKNOWN' || q === 'UNKNOWN'}
            />
          ))}
        </g>
      ))}
    </g>
  )
}

// AND, OR and NOT over TRUE, FALSE and UNKNOWN (T, F, U): row by column
export default function TruthTables() {
  const notX = TABLE * 2 + GAP * 2
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="mx-auto w-full max-w-[30rem]"
      role="img"
      aria-label="Truth tables. AND: TRUE AND UNKNOWN is UNKNOWN, FALSE AND UNKNOWN is FALSE, UNKNOWN AND UNKNOWN is UNKNOWN. OR: TRUE OR UNKNOWN is TRUE, FALSE OR UNKNOWN is UNKNOWN, UNKNOWN OR UNKNOWN is UNKNOWN. NOT UNKNOWN is UNKNOWN."
    >
      <Table x={0} name="AND" op={and} />
      <Table x={TABLE + GAP} name="OR" op={or} />
      <text x={notX + CELL} y={12} textAnchor="middle" className="fill-ink font-mono text-[11px] uppercase tracking-widest">
        NOT
      </text>
      {TRUTHS.map((p, i) => (
        <g key={p}>
          <Head x={notX} y={TOP + CELL * (i + 1)} t={p} />
          <Answer x={notX + CELL} y={TOP + CELL * (i + 1)} value={not(p)} unsureIn={false} />
        </g>
      ))}
    </svg>
  )
}
