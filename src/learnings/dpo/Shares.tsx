import { pct, signed } from "./model";

export const WIDTH = 340;
const TOP = 30;
const ROW = 48;
const TRACK = 252; // the bars' track, from x = 0
const SCORE_X = WIDTH - 4;

export interface Record {
  won: number;
  lost: number;
}

// A few answers (dinners, replies), one row each: the name, a bar for how
// often it is chosen, a dashed outline for the reference's share, a sage
// tick for a target share, and on the right an optional score. In place of
// the bars, `records` draws each one's wins (filled dots) and losses
// (hollow). `scale` is the share a full track stands for.
export default function Shares({
  labels,
  shares,
  reference,
  target,
  scores,
  records,
  scale,
  head,
  scoreHead,
  foot,
  trained = false,
  label,
}: {
  labels: readonly string[];
  shares?: number[];
  reference?: number[];
  target?: number[];
  scores?: number[];
  records?: Record[];
  scale: number;
  head: string;
  scoreHead?: string;
  foot?: string;
  trained?: boolean;
  label: string;
}) {
  const track = scores ? TRACK : WIDTH;
  const width = (share: number) => (Math.min(share, scale) / scale) * track;
  const height = TOP + labels.length * ROW + (foot ? 22 : 4);
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height}`}
      className="w-full"
      role="img"
      aria-label={label}
    >
      <text
        x={0}
        y={12}
        className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest"
      >
        {head}
      </text>
      {scoreHead && (
        <text
          x={SCORE_X}
          y={12}
          textAnchor="end"
          className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest"
        >
          {scoreHead}
        </text>
      )}
      {labels.map((name, i) => {
        const y = TOP + i * ROW;
        const bar = { y: y + 10, h: 16 };
        return (
          <g key={name}>
            <text x={0} y={y} className="fill-ink font-mono text-[11px]">
              {name}
            </text>
            {shares && (
              <text
                x={track}
                y={y}
                textAnchor="end"
                className={`${trained ? "fill-sage-ink" : "fill-ink"} font-mono text-[11px] tabular-nums`}
              >
                {pct(shares[i])}
              </text>
            )}

            {/* The track */}
            {!records && (
              <rect
                x={0}
                y={bar.y}
                width={track}
                height={bar.h}
                rx={4}
                className="fill-none stroke-zinc-300 dark:stroke-zinc-200/25"
              />
            )}
            {shares && (
              <rect
                x={0}
                y={bar.y}
                width={width(shares[i])}
                height={bar.h}
                rx={4}
                className={trained ? "fill-sage" : "fill-ink"}
                fillOpacity={trained ? 0.85 : 0.55}
              />
            )}
            {reference && (
              <rect
                x={0}
                y={bar.y - 3}
                width={width(reference[i])}
                height={bar.h + 6}
                rx={5}
                className="fill-none stroke-ink"
                strokeOpacity={0.7}
                strokeWidth={1.25}
                strokeDasharray="3 3"
              />
            )}
            {target && (
              <line
                x1={width(target[i])}
                x2={width(target[i])}
                y1={bar.y - 6}
                y2={bar.y + bar.h + 6}
                className="stroke-sage"
                strokeWidth={2.5}
                strokeLinecap="round"
              />
            )}

            {records &&
              Array.from(
                { length: records[i].won + records[i].lost },
                (_, k) => (
                  <circle
                    key={k}
                    cx={6 + k * 15}
                    cy={bar.y + bar.h / 2}
                    r={5.5}
                    className={
                      k < records[i].won
                        ? "fill-ink stroke-ink"
                        : "fill-paper stroke-ink"
                    }
                    strokeOpacity={0.8}
                    strokeWidth={1.25}
                  />
                ),
              )}

            {scores && (
              <text
                x={SCORE_X}
                y={bar.y + bar.h / 2 + 5}
                textAnchor="end"
                className={`${trained ? "fill-sage-ink" : "fill-ink"} font-serif text-[16px] tabular-nums`}
              >
                {signed(scores[i])}
              </text>
            )}
          </g>
        );
      })}
      {foot && (
        <text
          x={0}
          y={height - 6}
          className="fill-zinc-faded font-mono text-[10px]"
        >
          {foot}
        </text>
      )}
    </svg>
  );
}
