import { LAB_TRUE, RESAMPLES, type Lab } from "./model";

const WIDTH = 420;
const HEIGHT = 380;
const PLANE = { left: 64, top: 16, size: 320 };
const LOW = -5;
const HIGH = 7;
const UNIT = PLANE.size / (HIGH - LOW);
const inside = (w: number) => w >= LOW && w <= HIGH;
const clamp = (w: number) => Math.max(LOW, Math.min(HIGH, w));
const px = (w: number) => PLANE.left + (clamp(w) - LOW) * UNIT;
const py = (w: number) => PLANE.top + PLANE.size - (clamp(w) - LOW) * UNIT;
const SUM = LAB_TRUE[0] + LAB_TRUE[1];

// The weights least squares or ridge fits on each of the resamples, as
// dots in the plane of w₁ and w₂, with the true weights ringed. Dots past
// the edge sit on it.
export default function Cloud({ lab, lambda }: { lab: Lab; lambda: number }) {
  const beyond = lab.weights.filter(
    ([w1, w2]) => !inside(w1) || !inside(w2),
  ).length;
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="mx-auto w-full max-w-[28rem]"
      role="img"
      aria-label={`${RESAMPLES} fits of the two weights${lambda ? ` with ridge, lambda ${lambda}` : " by least squares"}: they average ${lab.mean[0].toFixed(2)} and ${lab.mean[1].toFixed(2)}, and w1 spreads by ${lab.spreadW1.toFixed(2)}`}
    >
      <line
        x1={px(0)}
        x2={px(0)}
        y1={py(HIGH)}
        y2={py(LOW)}
        className="stroke-zinc-300 dark:stroke-zinc-200/25"
      />
      <line
        x1={px(LOW)}
        x2={px(HIGH)}
        y1={py(0)}
        y2={py(0)}
        className="stroke-zinc-300 dark:stroke-zinc-200/25"
      />
      {[-4, -2, 0, 2, 4, 6].map((w) => (
        <g key={w} className="fill-zinc-faded font-mono text-[11px]">
          <text x={px(w)} y={py(LOW) + 18} textAnchor="middle">
            {w < 0 ? `−${-w}` : w}
          </text>
          <text x={px(LOW) - 8} y={py(w) + 4} textAnchor="end">
            {w < 0 ? `−${-w}` : w}
          </text>
        </g>
      ))}
      <text
        x={px((LOW + HIGH) / 2)}
        y={HEIGHT - 4}
        textAnchor="middle"
        className="fill-zinc-faded font-mono text-[11px]"
      >
        w₁
      </text>
      <text
        x={16}
        y={py((LOW + HIGH) / 2) + 4}
        textAnchor="middle"
        className="fill-zinc-faded font-mono text-[11px]"
      >
        w₂
      </text>

      <line
        x1={px(SUM - HIGH)}
        y1={py(HIGH)}
        x2={px(HIGH)}
        y2={py(SUM - HIGH)}
        className="stroke-zinc-400"
        strokeDasharray="4 4"
        strokeWidth={1.5}
      />
      <text
        x={px(HIGH) - 4}
        y={py(HIGH) + 14}
        textAnchor="end"
        className="fill-zinc-faded font-mono text-[11px]"
      >
        dashed: w₁ + w₂ = {SUM}
      </text>

      {lab.weights.map(([w1, w2], i) => (
        <circle
          key={i}
          cx={px(w1)}
          cy={py(w2)}
          r={2.8}
          className="fill-sage"
          opacity={0.6}
        />
      ))}
      <circle
        cx={px(LAB_TRUE[0])}
        cy={py(LAB_TRUE[1])}
        r={7}
        className="fill-none stroke-ink"
        strokeWidth={1.5}
      />
      <text
        x={px(LAB_TRUE[0]) + 10}
        y={py(LAB_TRUE[1]) - 10}
        className="fill-ink font-mono text-[11px]"
      >
        true
      </text>
      {beyond > 0 && (
        <text
          x={px(LOW) + 6}
          y={py(LOW) - 8}
          className="fill-ink font-mono text-[11px]"
        >
          {beyond} past the edge
        </text>
      )}
    </svg>
  );
}
