import { bitsUsed, pointer, type Insert, type LinearFile } from './model'

// A linear-hash file as it stands: a column per bucket, sixteen to a row,
// its own page on top and any overflow pages chained under it. Each dot is
// a record. The sage triangle is the split pointer; bucket numbers in ink
// read one bit more than those in grey.

const COLUMNS = 16
const PITCH = 45
const PAGE = { w: 37, h: 16 }
const LABEL_H = 12
const MARKER_H = 9
const CHAIN_GAP = 4
const SHOWN_OVERFLOW = 3
const ROW_H = LABEL_H + MARKER_H + PAGE.h + SHOWN_OVERFLOW * (PAGE.h + CHAIN_GAP) + 22
const WIDTH = COLUMNS * PITCH - (PITCH - PAGE.w)

export default function FileLab({ file, last, label }: { file: LinearFile; last: Insert | null; label: string }) {
  const rows = Math.max(1, Math.ceil(file.buckets.length / COLUMNS))
  const p = pointer(file)
  const split = last?.split ?? null
  const B = file.capacity
  const dotX = (x: number, k: number) => x + 6.5 + (k % B) * ((PAGE.w - 13) / (B - 1))

  return (
    <svg viewBox={`0 0 ${WIDTH} ${rows * ROW_H - 12}`} className="w-full" role="img" aria-label={label}>
      {file.buckets.map((keys, j) => {
        const x = (j % COLUMNS) * PITCH
        const top = Math.floor(j / COLUMNS) * ROW_H
        const pageY = top + LABEL_H + MARKER_H
        const pages = Math.max(1, Math.ceil(keys.length / B))
        const hidden = pages - 1 - SHOWN_OVERFLOW
        const moved = split !== null && (j === split.from || j === split.to)
        return (
          <g key={j}>
            <text
              x={x + PAGE.w / 2}
              y={top + 9}
              textAnchor="middle"
              className={`font-mono text-[10px] ${j === p ? 'fill-sage-ink' : bitsUsed(file, j) > file.bits ? 'fill-ink' : 'fill-zinc-faded'}`}
            >
              {j}
            </text>
            {j === p && <path d={`M${x + PAGE.w / 2 - 5},${top + LABEL_H + 1} l10,0 l-5,6 z`} className="fill-sage" />}
            {Array.from({ length: Math.min(pages, SHOWN_OVERFLOW + 1) }, (_, page) => {
              const y = pageY + page * (PAGE.h + CHAIN_GAP)
              return (
                <g key={page}>
                  {page > 0 && (
                    <line x1={x + PAGE.w / 2} x2={x + PAGE.w / 2} y1={y - CHAIN_GAP} y2={y} className="stroke-ink" strokeWidth={1.2} />
                  )}
                  <rect
                    x={x}
                    y={y}
                    width={PAGE.w}
                    height={PAGE.h}
                    rx={4}
                    className={page > 0 ? 'fill-paper stroke-ink' : moved ? 'fill-sage/15 stroke-sage' : 'fill-paper stroke-zinc-400'}
                    strokeWidth={page > 0 || moved ? 1.6 : 1.1}
                  />
                </g>
              )
            })}
            {keys.map((key, k) => {
              const page = Math.floor(k / B)
              if (page > SHOWN_OVERFLOW) return null
              const isLast = last !== null && key === last.key
              return (
                <circle
                  key={k}
                  cx={dotX(x, k)}
                  cy={pageY + page * (PAGE.h + CHAIN_GAP) + PAGE.h / 2}
                  r={isLast ? 4 : 3}
                  className={isLast ? 'fill-sage' : page > 0 ? 'fill-ink' : 'fill-zinc-400'}
                />
              )
            })}
            {hidden > 0 && (
              <text
                x={x + PAGE.w / 2}
                y={pageY + (SHOWN_OVERFLOW + 1) * (PAGE.h + CHAIN_GAP) + 8}
                textAnchor="middle"
                className="fill-ink font-mono text-[10px]"
              >
                +{hidden}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
